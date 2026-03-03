// ═══════════════════════════════════════════════════════
// server/services/duelEngine.js
// Duel V2 — Team Battle Lobbies (1v1, 3v3, 5v5)
//
// Flow:
// 1. Player creates a lobby (picks mode: 1v1/3v3/5v5)
// 2. Players join Team A or Team B
// 3. Each player picks 3 cards from their collection
// 4. When both teams full + all cards picked → fight begins
// 5. V2 combat runs (same formulas as zones)
// 6. No respawns — last team standing wins
// 7. Elo updated, points/XP awarded
//
// No sharpness loss. Cards fight at current sharpness.
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const {
  calculateDamage,
  calculateAttackInterval,
  rollCrit,
  applySharpness,
} = require('./statCalculation');
const {
  EffectTracker,
  resolveAttackEffects,
  resolveKOEffects,
  getIncomingDamageModifiers,
  getActiveStatModifiers,
  getEquippedEffects,
} = require('./effectsEngine');
const { addPoints } = require('./pointsService');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── CONFIG ────────────────────────────────────────────

const MODES = {
  '1v1': { teamSize: 1, label: '1v1 Duel' },
  '3v3': { teamSize: 3, label: '3v3 Team Battle' },
  '5v5': { teamSize: 5, label: '5v5 War' },
};

const CARDS_PER_PLAYER = 3;
const TICK_INTERVAL_MS = 500;           // Duels tick faster (0.5s) for excitement
const MAX_DUEL_DURATION_MS = 120000;    // 2 min max — prevent infinite loops
const LOBBY_TIMEOUT_MS = 300000;        // 5 min lobby timeout

const DUEL_POINTS = {
  WIN: 8,
  LOSE: 2,
  WIN_STREAK_BONUS: 5,    // 3+ win streak
  PERFECT_BONUS: 5,       // Win without losing anyone
};

const DUEL_XP = {
  WIN: 4,
  LOSE: 1,
};

// Base Elo
const ELO_BASE = 1000;
const ELO_K_FACTOR = 32;

// ─── LOBBY STORAGE ─────────────────────────────────────
// In-memory. Lobbies are short-lived (5 min max).

const lobbies = new Map();        // lobbyId → Lobby
const activeDuels = new Map();    // duelId → DuelState
const playerLobby = new Map();    // playerId → lobbyId (quick lookup)

class Lobby {
  constructor(id, creatorId, mode) {
    this.id = id;
    this.mode = mode;                           // '1v1', '3v3', '5v5'
    this.teamSize = MODES[mode].teamSize;
    this.createdAt = Date.now();
    this.creatorId = creatorId;
    this.status = 'waiting';                    // waiting → ready → fighting → complete

    // Teams: { playerId → { name, houseSlug, cards: [], ready: false } }
    this.teamA = new Map();
    this.teamB = new Map();
  }

  get teamACount() { return this.teamA.size; }
  get teamBCount() { return this.teamB.size; }
  get isFull() { return this.teamACount >= this.teamSize && this.teamBCount >= this.teamSize; }

  get allReady() {
    if (!this.isFull) return false;
    for (const p of this.teamA.values()) { if (!p.ready) return false; }
    for (const p of this.teamB.values()) { if (!p.ready) return false; }
    return true;
  }

  getPlayerTeam(playerId) {
    if (this.teamA.has(playerId)) return 'A';
    if (this.teamB.has(playerId)) return 'B';
    return null;
  }

  toJSON() {
    return {
      id: this.id,
      mode: this.mode,
      teamSize: this.teamSize,
      status: this.status,
      createdAt: this.createdAt,
      teamA: Array.from(this.teamA.entries()).map(([id, p]) => ({
        playerId: id, name: p.name, house: p.houseSlug, ready: p.ready,
        cardCount: (p.cards || []).length,
      })),
      teamB: Array.from(this.teamB.entries()).map(([id, p]) => ({
        playerId: id, name: p.name, house: p.houseSlug, ready: p.ready,
        cardCount: (p.cards || []).length,
      })),
    };
  }
}

// ─── LOBBY MANAGEMENT ──────────────────────────────────

function generateId() {
  return 'duel_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

/**
 * Create a new duel lobby
 * @param {string} creatorId - Player who creates
 * @param {string} mode - '1v1', '3v3', or '5v5'
 * @returns {object} { lobby }
 */
async function createLobby(creatorId, mode) {
  if (!MODES[mode]) {
    return { error: `Invalid mode. Use: ${Object.keys(MODES).join(', ')}` };
  }

  // Check player isn't already in a lobby
  if (playerLobby.has(creatorId)) {
    return { error: 'Already in a lobby. Leave it first.' };
  }

  const lobbyId = generateId();
  const lobby = new Lobby(lobbyId, creatorId, mode);
  lobbies.set(lobbyId, lobby);

  return { success: true, lobby: lobby.toJSON() };
}

/**
 * Join a lobby on a specific team
 * @param {string} lobbyId
 * @param {string} playerId
 * @param {string} team - 'A' or 'B'
 */
async function joinLobby(lobbyId, playerId, team) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return { error: 'Lobby not found' };
  if (lobby.status !== 'waiting') return { error: 'Lobby already started' };

  if (playerLobby.has(playerId)) {
    return { error: 'Already in a lobby. Leave it first.' };
  }

  const targetTeam = team === 'B' ? lobby.teamB : lobby.teamA;
  if (targetTeam.size >= lobby.teamSize) {
    return { error: `Team ${team} is full` };
  }

  // Get player info
  const { data: player } = await supabase
    .from('players')
    .select('twitter_handle, school_id')
    .eq('id', playerId)
    .single();

  if (!player) return { error: 'Player not found' };

  // Get house slug
  const { data: house } = await supabase
    .from('houses')
    .select('slug, name, atk, hp, spd, def, luck')
    .eq('id', player.school_id)
    .single();

  targetTeam.set(playerId, {
    name: player.twitter_handle || 'Unknown',
    houseSlug: house?.slug || 'unknown',
    house: house || {},
    cards: [],
    ready: false,
  });

  playerLobby.set(playerId, lobbyId);

  return { success: true, lobby: lobby.toJSON() };
}

/**
 * Leave a lobby
 */
function leaveLobby(playerId) {
  const lobbyId = playerLobby.get(playerId);
  if (!lobbyId) return { error: 'Not in a lobby' };

  const lobby = lobbies.get(lobbyId);
  if (!lobby) {
    playerLobby.delete(playerId);
    return { error: 'Lobby not found' };
  }

  if (lobby.status !== 'waiting') {
    return { error: 'Cannot leave — duel already started' };
  }

  lobby.teamA.delete(playerId);
  lobby.teamB.delete(playerId);
  playerLobby.delete(playerId);

  // If lobby is empty, delete it
  if (lobby.teamA.size === 0 && lobby.teamB.size === 0) {
    lobbies.delete(lobbyId);
    return { success: true, message: 'Left lobby (lobby closed — empty)' };
  }

  return { success: true, lobby: lobby.toJSON() };
}

/**
 * Pick 3 cards for the duel
 * @param {string} lobbyId
 * @param {string} playerId
 * @param {number[]} cardIds - Array of 3 player_cards IDs
 */
async function pickCards(lobbyId, playerId, cardIds) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return { error: 'Lobby not found' };
  if (lobby.status !== 'waiting') return { error: 'Lobby already started' };

  const team = lobby.getPlayerTeam(playerId);
  if (!team) return { error: 'Not in this lobby' };

  if (!cardIds || cardIds.length !== CARDS_PER_PLAYER) {
    return { error: `Pick exactly ${CARDS_PER_PLAYER} cards` };
  }

  // Verify cards belong to this player
  const { data: cards } = await supabase
    .from('player_cards')
    .select('id, spell_id, sharpness, spells(id, name, house, spell_type, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects, stat_pattern)')
    .in('id', cardIds)
    .eq('player_id', playerId);

  if (!cards || cards.length !== CARDS_PER_PLAYER) {
    return { error: 'One or more cards not found in your collection' };
  }

  const teamMap = team === 'A' ? lobby.teamA : lobby.teamB;
  const playerData = teamMap.get(playerId);
  playerData.cards = cards;
  playerData.ready = true;

  // Check if all players are ready
  const result = { success: true, lobby: lobby.toJSON() };

  if (lobby.allReady) {
    lobby.status = 'ready';
    result.allReady = true;
    result.message = 'All players ready — start the fight!';
  }

  return result;
}

// ─── OPEN LOBBIES ──────────────────────────────────────

/**
 * List open lobbies that players can join
 */
function listOpenLobbies() {
  const open = [];
  const now = Date.now();

  for (const [id, lobby] of lobbies) {
    // Cleanup expired lobbies
    if (now - lobby.createdAt > LOBBY_TIMEOUT_MS) {
      // Clean up player mappings
      for (const pid of lobby.teamA.keys()) playerLobby.delete(pid);
      for (const pid of lobby.teamB.keys()) playerLobby.delete(pid);
      lobbies.delete(id);
      continue;
    }

    if (lobby.status === 'waiting') {
      open.push(lobby.toJSON());
    }
  }

  return open;
}

// ─── FIGHT SIMULATION ──────────────────────────────────
// Runs the full V2 combat to completion (no respawns)

/**
 * Start and run a duel fight
 * Returns the full fight log for the arena viewer to replay
 */
async function startFight(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return { error: 'Lobby not found' };
  if (lobby.status !== 'ready') return { error: 'Lobby not ready — players still picking cards' };

  lobby.status = 'fighting';
  const duelId = generateId();

  // ── Build fighters ──
  const teamAFighters = [];
  const teamBFighters = [];

  for (const [playerId, pData] of lobby.teamA) {
    teamAFighters.push(buildFighter(playerId, pData, 'A'));
  }
  for (const [playerId, pData] of lobby.teamB) {
    teamBFighters.push(buildFighter(playerId, pData, 'B'));
  }

  const allFighters = [...teamAFighters, ...teamBFighters];

  // ── Run combat simulation ──
  const effectTracker = new EffectTracker();
  const fightLog = [];          // Array of tick events for replay
  let tickCount = 0;
  const maxTicks = MAX_DUEL_DURATION_MS / TICK_INTERVAL_MS;
  const startTime = Date.now();

  // Initialize barriers and passives
  for (const fighter of allFighters) {
    const allies = fighter.team === 'A' ? teamAFighters : teamBFighters;
    const enemies = fighter.team === 'A' ? teamBFighters : teamAFighters;
    const deployEvents = require('./effectsEngine').resolveDeployEffects(
      fighter,
      { allies: allies.filter(a => a.id !== fighter.id), enemies },
      effectTracker,
      startTime
    );
    if (deployEvents.length > 0) {
      fightLog.push({ tick: 0, events: deployEvents });
    }
  }

  // ── Tick loop ──
  while (tickCount < maxTicks) {
    tickCount++;
    const now = startTime + tickCount * TICK_INTERVAL_MS;
    const tickEvents = [];

    // Check if one team is wiped
    const teamAAlive = teamAFighters.filter(f => f.isAlive && f.hp > 0);
    const teamBAlive = teamBFighters.filter(f => f.isAlive && f.hp > 0);

    if (teamAAlive.length === 0 || teamBAlive.length === 0) break;

    // ── Process each fighter's attack ──
    for (const fighter of allFighters) {
      if (!fighter.isAlive || fighter.hp <= 0) continue;
      if (effectTracker.hasEffect(fighter.id, 'PHASE')) continue;

      // Check attack timer
      if (now < fighter.nextAttackAt) continue;

      // Get stat modifiers
      const mods = getActiveStatModifiers(fighter.id, effectTracker);
      let effectiveAtk = fighter.stats.atk + (mods.atk || 0);
      let effectiveSpd = fighter.stats.spd + (mods.spd || 0);
      if (mods._surgeActive) effectiveAtk = Math.floor(effectiveAtk * 1.5);

      // Find enemies
      const enemies = fighter.team === 'A' ? teamBAlive : teamAAlive;
      const allies = fighter.team === 'A' ? teamAAlive : teamBAlive;

      if (enemies.length === 0) continue;

      // Target selection
      let target = null;
      const taunter = enemies.find(e => effectTracker.hasEffect(e.id, 'TAUNT'));
      if (taunter) {
        target = taunter;
      } else {
        const targetable = enemies.filter(e => !effectTracker.hasEffect(e.id, 'STEALTH'));
        if (targetable.length === 0) continue;
        targetable.sort((a, b) => a.hp - b.hp);
        target = targetable[0];
      }

      // Calculate damage
      const defenderMods = getActiveStatModifiers(target.id, effectTracker);
      const effectiveDef = target.stats.def + (defenderMods.def || 0);
      let damage = calculateDamage(effectiveAtk, effectiveDef);

      if (mods._weakened) damage = Math.floor(damage * 0.5);

      // Execute check
      const fEffects = getEquippedEffects(fighter);
      if (fEffects.some(e => e.name === 'EXECUTE') && target.hp < target.maxHp * 0.3) {
        damage = Math.floor(damage * 1.5);
      }

      // Crit
      const isCrit = rollCrit(fighter.stats.luck);
      if (isCrit) damage *= 2;

      // Incoming damage modifiers
      const hasPierce = fEffects.some(e => e.name === 'PIERCE');
      const dmgResult = getIncomingDamageModifiers(target.id, fighter.id, damage, hasPierce, effectTracker, now);
      damage = dmgResult.finalDamage;
      tickEvents.push(...dmgResult.events);

      // Apply damage
      if (damage > 0 && !dmgResult.blocked) {
        if (effectTracker.hasEffect(target.id, 'ANCHOR')) {
          target.hp = Math.max(1, target.hp - damage);
        } else {
          target.hp -= damage;
        }

        // DRAIN
        if (fEffects.some(e => e.name === 'DRAIN')) {
          const drainHeal = Math.max(1, Math.floor(damage * 0.05));
          fighter.hp = Math.min(fighter.maxHp, fighter.hp + drainHeal);
        }

        tickEvents.push({
          type: 'attack',
          source: fighter.id,
          sourceName: fighter.name,
          target: target.id,
          targetName: target.name,
          damage,
          isCrit,
          targetHp: target.hp,
          targetMaxHp: target.maxHp,
        });
      }

      // Reflected damage
      if (dmgResult.reflected > 0) {
        fighter.hp -= dmgResult.reflected;
        tickEvents.push({
          type: 'reflected_damage',
          source: target.id,
          target: fighter.id,
          damage: dmgResult.reflected,
        });
      }

      // CHAIN
      if (fEffects.some(e => e.name === 'CHAIN')) {
        const otherEnemies = enemies.filter(e => e.id !== target.id && e.hp > 0);
        if (otherEnemies.length > 0) {
          const chainTarget = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
          const chainDmg = Math.floor(damage * 0.75);
          chainTarget.hp -= chainDmg;
          tickEvents.push({
            type: 'chain_attack',
            source: fighter.id,
            target: chainTarget.id,
            targetName: chainTarget.name,
            damage: chainDmg,
          });
        }
      }

      // Resolve card effects
      const zoneContext = {
        allies: allies.filter(a => a.id !== fighter.id && a.hp > 0),
        enemies: enemies.filter(e => e.hp > 0),
      };
      const effectEvents = resolveAttackEffects(fighter, target, zoneContext, effectTracker, now);
      tickEvents.push(...effectEvents);

      // Apply heal events
      for (const evt of effectEvents) {
        if (evt.type === 'effect_heal' && evt.target && evt.value) {
          const healTarget = allFighters.find(f => f.id === evt.target);
          if (healTarget && healTarget.isAlive) {
            healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + evt.value);
          }
        }
      }

      // Reset attack timer
      const newInterval = calculateAttackInterval(effectiveSpd);
      fighter.attackInterval = newInterval;
      fighter.lastAttackAt = now;
      fighter.nextAttackAt = now + newInterval * 1000;
    }

    // ── Process DOTs ──
    for (const fighter of allFighters) {
      if (!fighter.isAlive || fighter.hp <= 0) continue;

      const effects = effectTracker.getEffects(fighter.id);

      // POISON ticks
      const poisons = effects.filter(e => e.effect === 'POISON' && !e.consumed);
      for (const p of poisons) {
        const lastTick = p.data.lastDotTick || p.appliedAt;
        if (now - lastTick >= 3000) {
          fighter.hp -= p.value;
          p.data.lastDotTick = now;
          tickEvents.push({ type: 'dot_damage', target: fighter.id, effect: 'POISON', damage: p.value, targetHp: fighter.hp });
        }
      }

      // BURN ticks
      const burns = effects.filter(e => e.effect === 'BURN' && !e.consumed);
      for (const b of burns) {
        const lastTick = b.data.lastBurnTick || b.appliedAt;
        if (now - lastTick >= 2000) {
          fighter.hp -= b.value;
          b.data.lastBurnTick = now;
          tickEvents.push({ type: 'dot_damage', target: fighter.id, effect: 'BURN', damage: b.value, targetHp: fighter.hp });
        }
      }
    }

    // ── Check KOs ──
    for (const fighter of allFighters) {
      if (!fighter.isAlive) continue;
      if (fighter.hp > 0) continue;

      fighter.isAlive = false;
      fighter.hp = 0;

      const enemies = fighter.team === 'A'
        ? teamBFighters.filter(f => f.hp > 0)
        : teamAFighters.filter(f => f.hp > 0);

      const koEvents = resolveKOEffects(fighter, null, {
        enemies,
        allies: (fighter.team === 'A' ? teamAFighters : teamBFighters).filter(f => f.id !== fighter.id && f.hp > 0),
      }, effectTracker, now);
      tickEvents.push(...koEvents);

      // Apply SHATTER damage
      const shatterEvt = koEvents.find(e => e.type === 'effect_aoe_damage' && e.effect === 'SHATTER');
      if (shatterEvt) {
        for (const eid of shatterEvt.targets) {
          const e = allFighters.find(f => f.id === eid);
          if (e && e.isAlive) e.hp -= shatterEvt.value;
        }
      }

      // Apply FEAST heals
      for (const evt of koEvents) {
        if (evt.type === 'effect_heal' && evt.effect === 'FEAST') {
          const h = allFighters.find(f => f.id === evt.target);
          if (h && h.isAlive) h.hp = Math.min(h.maxHp, h.hp + evt.value);
        }
      }

      // RESURRECT in duels — allowed (no cooldown tracking needed for short fights)
      const resEvt = koEvents.find(e => e.type === 'effect_resurrect');
      if (resEvt) {
        fighter.isAlive = true;
        fighter.hp = resEvt.value;
      } else {
        effectTracker.clearAllEffects(fighter.id);
        tickEvents.push({
          type: 'ko',
          target: fighter.id,
          targetName: fighter.name,
          targetTeam: fighter.team,
        });
      }
    }

    // Cleanup expired effects
    effectTracker.cleanupExpired(now);

    // Record tick
    if (tickEvents.length > 0) {
      fightLog.push({
        tick: tickCount,
        time: tickCount * TICK_INTERVAL_MS,
        events: tickEvents,
        state: allFighters.map(f => ({
          id: f.id,
          name: f.name,
          team: f.team,
          hp: f.hp,
          maxHp: f.maxHp,
          isAlive: f.isAlive,
        })),
      });
    }
  }

  // ── Determine winner ──
  const teamASurvivors = teamAFighters.filter(f => f.isAlive && f.hp > 0);
  const teamBSurvivors = teamBFighters.filter(f => f.isAlive && f.hp > 0);

  let winner = null;
  if (teamASurvivors.length > 0 && teamBSurvivors.length === 0) {
    winner = 'A';
  } else if (teamBSurvivors.length > 0 && teamASurvivors.length === 0) {
    winner = 'B';
  } else if (teamASurvivors.length > 0 && teamBSurvivors.length > 0) {
    // Time ran out — team with more total HP wins
    const aHp = teamASurvivors.reduce((s, f) => s + f.hp, 0);
    const bHp = teamBSurvivors.reduce((s, f) => s + f.hp, 0);
    winner = aHp >= bHp ? 'A' : 'B';
  } else {
    winner = 'draw';
  }

  const isPerfect = winner !== 'draw' && (
    (winner === 'A' && teamAFighters.every(f => f.isAlive && f.hp > 0)) ||
    (winner === 'B' && teamBFighters.every(f => f.isAlive && f.hp > 0))
  );

  // ── Award points, XP, Elo ──
  const winnerTeam = winner === 'A' ? lobby.teamA : (winner === 'B' ? lobby.teamB : null);
  const loserTeam = winner === 'A' ? lobby.teamB : (winner === 'B' ? lobby.teamA : null);

  const results = [];

  if (winnerTeam) {
    for (const [pid] of winnerTeam) {
      let pts = DUEL_POINTS.WIN;
      if (isPerfect) pts += DUEL_POINTS.PERFECT_BONUS;

      try {
        await addPoints(pid, pts, 'duel_win', `Won ${lobby.mode} duel`);
        await updateElo(pid, true);
      } catch (e) { console.error('Duel points error:', e.message); }

      results.push({ playerId: pid, result: 'win', points: pts });
    }
  }

  if (loserTeam) {
    for (const [pid] of loserTeam) {
      try {
        await addPoints(pid, DUEL_POINTS.LOSE, 'duel_lose', `Lost ${lobby.mode} duel`);
        await updateElo(pid, false);
      } catch (e) { console.error('Duel points error:', e.message); }

      results.push({ playerId: pid, result: 'lose', points: DUEL_POINTS.LOSE });
    }
  }

  // ── Save to database ──
  try {
    await supabaseAdmin.from('duel_history').insert({
      duel_id: duelId,
      mode: lobby.mode,
      winner_team: winner,
      is_perfect: isPerfect,
      team_a: Array.from(lobby.teamA.keys()),
      team_b: Array.from(lobby.teamB.keys()),
      duration_ticks: tickCount,
      duration_ms: tickCount * TICK_INTERVAL_MS,
      fight_log: fightLog.length > 200 ? fightLog.slice(-200) : fightLog, // Cap log size
      results,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Duel history save error:', e.message);
  }

  // ── Cleanup lobby ──
  lobby.status = 'complete';
  for (const pid of lobby.teamA.keys()) playerLobby.delete(pid);
  for (const pid of lobby.teamB.keys()) playerLobby.delete(pid);
  lobbies.delete(lobbyId);

  return {
    success: true,
    duelId,
    mode: lobby.mode,
    winner,
    isPerfect,
    durationMs: tickCount * TICK_INTERVAL_MS,
    results,
    fightLog,
    finalState: allFighters.map(f => ({
      id: f.id,
      name: f.name,
      team: f.team,
      house: f.houseSlug,
      hp: f.hp,
      maxHp: f.maxHp,
      isAlive: f.isAlive,
    })),
  };
}


// ─── FIGHTER BUILDER ───────────────────────────────────

function buildFighter(playerId, pData, team) {
  const house = pData.house || {};
  const cards = pData.cards || [];

  // Calculate total stats: house + 3 cards + items
  // For duels: cards use current sharpness (no loss)
  const totals = {
    atk: house.atk || 0,
    hp: house.hp || 0,
    spd: house.spd || 0,
    def: house.def || 0,
    luck: house.luck || 0,
  };

  for (const card of cards) {
    const spell = card.spells || {};
    const sharp = card.sharpness != null ? card.sharpness : 100;

    totals.atk += applySharpness(spell.base_atk || 0, sharp);
    totals.hp += applySharpness(spell.base_hp || 0, sharp);
    totals.spd += applySharpness(spell.base_spd || 0, sharp);
    totals.def += applySharpness(spell.base_def || 0, sharp);
    totals.luck += applySharpness(spell.base_luck || 0, sharp);
  }

  const attackInterval = calculateAttackInterval(totals.spd);
  const startTime = Date.now();

  return {
    id: playerId,
    name: pData.name,
    team,
    houseSlug: pData.houseSlug,
    stats: totals,
    maxHp: totals.hp,
    hp: totals.hp,
    attackInterval,
    lastAttackAt: startTime,
    nextAttackAt: startTime + attackInterval * 1000,
    isAlive: true,
    cards: cards,   // For effect processing
  };
}


// ─── ELO ───────────────────────────────────────────────

async function getElo(playerId) {
  const { data } = await supabase
    .from('players')
    .select('duel_elo')
    .eq('id', playerId)
    .single();
  return data?.duel_elo || ELO_BASE;
}

async function updateElo(playerId, won) {
  try {
    const current = await getElo(playerId);
    // Simplified Elo — uses expected score against average
    const expected = 1 / (1 + Math.pow(10, (ELO_BASE - current) / 400));
    const actual = won ? 1 : 0;
    const newElo = Math.round(current + ELO_K_FACTOR * (actual - expected));

    await supabaseAdmin
      .from('players')
      .update({ duel_elo: Math.max(100, newElo) })
      .eq('id', playerId);

    return newElo;
  } catch (e) {
    console.error('Elo update error:', e.message);
    return null;
  }
}

// ─── EXPORTS ───────────────────────────────────────────

module.exports = {
  // Lobby management
  createLobby,
  joinLobby,
  leaveLobby,
  pickCards,
  listOpenLobbies,

  // Fight
  startFight,

  // Storage access (for routes/sockets)
  lobbies,
  activeDuels,
  playerLobby,

  // Config
  MODES,
  CARDS_PER_PLAYER,
};