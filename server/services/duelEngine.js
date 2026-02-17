// ═══════════════════════════════════════════════════════
// server/services/duelEngine.js
// V3 Quick Duels — Real-Time 1v1 Nine Battles
//
// How it works:
//   1. Player A challenges Player B
//   2. Player B accepts → both Nines enter at full HP
//   3. Each round: both pick a card (30 sec timer)
//   4. Cards reveal simultaneously
//   5. ATK damage applied + effects fire
//   6. First Nine to 0 HP loses
//   7. Cards NOT consumed (no durability cost)
//
// Why it's fun:
//   - House stats matter (Smoulders = glass cannon, Stonebark = wall)
//   - Card effects matter (BURN stacks, HEAL survives, SILENCE shuts down)
//   - Reading your opponent (will they attack or defend?)
//   - Your Nine's identity carries over from zone battles
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── In-memory state ──
const activeDuels = new Map();       // duel_id → duel state
const pendingChallenges = new Map(); // challenge_id → challenge info
const playerSockets = new Map();     // player_id → socket

// ── CONSTANTS ──
const ROUND_TIMEOUT_MS = 30000;      // 30 seconds per round
const CHALLENGE_EXPIRE_MS = 120000;  // 2 minutes to accept
const MAX_ROUNDS = 10;               // safety cap (most duels end in 3-6)

// ── EFFECT LOGIC FOR DUELS ──
// Simplified from zone combat — no persistent ticks, just per-round
const DUEL_EFFECTS = {
  // Damage effects (hit opponent)
  BURN:    { damage: 3, message: 'burned' },
  POISON:  { damage: 2, message: 'poisoned' },
  DRAIN:   { damage: 2, selfHeal: 2, message: 'drained' },
  SIPHON:  { damage: 1, selfHeal: 1, message: 'siphoned' },
  LEECH:   { damage: 2, selfHeal: 1, message: 'leeched' },
  DOOM:    { damage: 5, message: 'doomed' },

  // Healing effects (help yourself)
  HEAL:    { selfHeal: 3, message: 'healed' },
  BLESS:   { selfHeal: 2, atkBoost: 1, message: 'blessed' },
  INSPIRE: { selfHeal: 2, message: 'inspired' },
  CLEANSE: { selfHeal: 1, removeDebuffs: true, message: 'cleansed' },

  // Offensive debuffs (weaken opponent)
  SILENCE: { oppEffectsBlocked: true, message: 'silenced' },
  HEX:     { oppAtkReduce: 2, message: 'hexed' },
  WEAKEN:  { oppAtkReduce: 3, message: 'weakened' },
  FEAR:    { oppAtkReduce: 4, message: 'feared' },
  STUN:    { oppSkipAttack: true, message: 'stunned' },

  // Defensive buffs (protect yourself)
  WARD:    { shield: 3, message: 'warded' },
  BARRIER: { shield: 5, message: 'barriered' },
  ANCHOR:  { damageReduce: 2, message: 'anchored' },
  THORNS:  { reflect: 2, message: 'thorned' },
  REFLECT: { reflectPct: 50, message: 'reflecting' },

  // Offensive buffs (boost yourself)
  AMPLIFY: { atkBoost: 2, message: 'amplified' },
  SURGE:   { atkBoost: 3, message: 'surging' },
  CRIT:    { critChance: 50, message: 'crit ready' },
  HASTE:   { extraAttack: true, message: 'hasted' },
};

// ═══════════════════════════════════════════
// Socket management
// ═══════════════════════════════════════════
function registerSocket(playerId, socket) {
  playerSockets.set(String(playerId), socket);
}

function unregisterSocket(playerId) {
  playerSockets.delete(String(playerId));
  // If player disconnects during duel, they forfeit after timeout
}

function getSocket(playerId) {
  return playerSockets.get(String(playerId));
}

function emitToPlayer(playerId, event, data) {
  const socket = getSocket(playerId);
  if (socket) socket.emit(event, data);
}

// ═══════════════════════════════════════════
// Create a challenge
// ═══════════════════════════════════════════
async function createChallenge(challengerId, opponentId) {
  if (String(challengerId) === String(opponentId)) {
    return { success: false, error: 'Cannot duel yourself' };
  }

  // Check neither player is in an active duel
  for (const [, duel] of activeDuels) {
    if (duel.status !== 'active') continue;
    if (duel.p1.id == challengerId || duel.p2.id == challengerId) {
      return { success: false, error: 'You are already in a duel' };
    }
    if (duel.p1.id == opponentId || duel.p2.id == opponentId) {
      return { success: false, error: 'Opponent is already in a duel' };
    }
  }

  // Get both players + their Nines
  const { data: p1 } = await supabase
    .from('players')
    .select('id, twitter_handle, school_id')
    .eq('id', challengerId)
    .single();

  const { data: p2 } = await supabase
    .from('players')
    .select('id, twitter_handle, school_id')
    .eq('id', opponentId)
    .single();

  if (!p1 || !p2) return { success: false, error: 'Player not found' };

  const challengeId = 'ch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  const challenge = {
    id: challengeId,
    challenger: p1,
    opponent: p2,
    created_at: Date.now(),
    expires_at: Date.now() + CHALLENGE_EXPIRE_MS,
  };

  pendingChallenges.set(challengeId, challenge);

  // Notify opponent
  emitToPlayer(opponentId, 'duel:challenge', {
    challenge_id: challengeId,
    challenger: { handle: p1.twitter_handle, school_id: p1.school_id },
    expires_in_seconds: Math.floor(CHALLENGE_EXPIRE_MS / 1000),
  });

  // Auto-expire
  setTimeout(() => {
    if (pendingChallenges.has(challengeId)) {
      pendingChallenges.delete(challengeId);
      emitToPlayer(challengerId, 'duel:expired', { challenge_id: challengeId });
    }
  }, CHALLENGE_EXPIRE_MS);

  return { success: true, challenge_id: challengeId };
}

// ═══════════════════════════════════════════
// Accept challenge → start the duel
// ═══════════════════════════════════════════
async function acceptChallenge(challengeId, acceptingPlayerId) {
  const challenge = pendingChallenges.get(challengeId);
  if (!challenge) return { success: false, error: 'Challenge not found or expired' };
  if (challenge.opponent.id != acceptingPlayerId) return { success: false, error: 'Not your challenge' };
  if (Date.now() > challenge.expires_at) {
    pendingChallenges.delete(challengeId);
    return { success: false, error: 'Challenge expired' };
  }

  pendingChallenges.delete(challengeId);

  // Get both Nines
  const { data: nine1 } = await supabase
    .from('player_nines')
    .select('*')
    .eq('player_id', challenge.challenger.id)
    .single();

  const { data: nine2 } = await supabase
    .from('player_nines')
    .select('*')
    .eq('player_id', challenge.opponent.id)
    .single();

  if (!nine1 || !nine2) return { success: false, error: 'Both players need a Nine to duel' };

  const duelId = 'duel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  const duel = {
    id: duelId,
    status: 'active',
    current_round: 1,
    p1: {
      id: challenge.challenger.id,
      handle: challenge.challenger.twitter_handle,
      school_id: challenge.challenger.school_id,
      hp: nine1.base_hp,
      maxHp: nine1.base_hp,
      atk: nine1.base_atk,
      spd: nine1.base_spd,
      card: null,
      usedCards: [],
    },
    p2: {
      id: challenge.opponent.id,
      handle: challenge.opponent.twitter_handle,
      school_id: challenge.opponent.school_id,
      hp: nine2.base_hp,
      maxHp: nine2.base_hp,
      atk: nine2.base_atk,
      spd: nine2.base_spd,
      card: null,
      usedCards: [],
    },
    rounds: [],
    winner: null,
    started_at: Date.now(),
    round_deadline: Date.now() + ROUND_TIMEOUT_MS,
    roundTimer: null,
  };

  activeDuels.set(duelId, duel);

  // Notify both players
  const startData = {
    duel_id: duelId,
    round: 1,
    timeout_seconds: Math.floor(ROUND_TIMEOUT_MS / 1000),
  };

  emitToPlayer(duel.p1.id, 'duel:start', {
    ...startData,
    your_nine: { hp: duel.p1.hp, atk: duel.p1.atk, spd: duel.p1.spd },
    opponent: { handle: duel.p2.handle, school_id: duel.p2.school_id, hp: duel.p2.hp },
  });

  emitToPlayer(duel.p2.id, 'duel:start', {
    ...startData,
    your_nine: { hp: duel.p2.hp, atk: duel.p2.atk, spd: duel.p2.spd },
    opponent: { handle: duel.p1.handle, school_id: duel.p1.school_id, hp: duel.p1.hp },
  });

  // Start round timer
  startRoundTimer(duelId);

  return { success: true, duel_id: duelId };
}

// ═══════════════════════════════════════════
// Decline a challenge
// ═══════════════════════════════════════════
function declineChallenge(challengeId, playerId) {
  const ch = pendingChallenges.get(challengeId);
  if (!ch || ch.opponent.id != playerId) return { success: false, error: 'Not found' };
  pendingChallenges.delete(challengeId);
  emitToPlayer(ch.challenger.id, 'duel:declined', { challenge_id: challengeId });
  return { success: true };
}

// ═══════════════════════════════════════════
// Submit a card for this round
// ═══════════════════════════════════════════
async function submitCard(duelId, playerId, cardId) {
  const duel = activeDuels.get(duelId);
  if (!duel) return { success: false, error: 'Duel not found' };
  if (duel.status !== 'active') return { success: false, error: 'Duel is over' };

  const isP1 = duel.p1.id == playerId;
  const isP2 = duel.p2.id == playerId;
  if (!isP1 && !isP2) return { success: false, error: 'Not in this duel' };

  const player = isP1 ? duel.p1 : duel.p2;

  if (player.card) return { success: false, error: 'Already submitted this round' };

  // Check card wasn't used in a previous round
  if (player.usedCards.includes(cardId)) {
    return { success: false, error: 'Card already used in this duel' };
  }

  // Get card data
  const { data: card } = await supabase
    .from('player_cards')
    .select('*, spell:spell_id(base_atk, base_hp, name, bonus_effects)')
    .eq('id', cardId)
    .eq('player_id', playerId)
    .single();

  if (!card) return { success: false, error: 'Card not found' };

  // Parse effects
  let effects = [];
  try {
    if (card.spell_effects) {
      effects = Array.isArray(card.spell_effects) ? card.spell_effects : JSON.parse(card.spell_effects);
    }
  } catch (e) { effects = []; }

  player.card = {
    card_id: card.id,
    name: card.spell_name || card.spell?.name || 'Unknown',
    atk: card.spell?.base_atk || 3,
    hp: card.spell?.base_hp || 2,
    rarity: card.rarity || 'common',
    house: card.spell_house || 'universal',
    type: card.spell_type || 'attack',
    effects: effects,
  };

  player.usedCards.push(cardId);

  // Tell opponent a card is locked in
  const oppId = isP1 ? duel.p2.id : duel.p1.id;
  emitToPlayer(oppId, 'duel:opponent_locked', {
    duel_id: duelId,
    round: duel.current_round,
  });

  // Both submitted? Resolve!
  if (duel.p1.card && duel.p2.card) {
    return await resolveRound(duelId);
  }

  return { success: true, message: 'Card locked in. Waiting for opponent...' };
}

// ═══════════════════════════════════════════
// Resolve a round — the fun part
// ═══════════════════════════════════════════
async function resolveRound(duelId) {
  const duel = activeDuels.get(duelId);
  if (!duel) return { success: false };

  // Clear round timer
  if (duel.roundTimer) clearTimeout(duel.roundTimer);

  const p1 = duel.p1;
  const p2 = duel.p2;
  const c1 = p1.card;
  const c2 = p2.card;

  // If someone didn't submit (timeout), they play with base stats only
  if (!c1) p1.card = { name: 'No card', atk: 0, hp: 0, effects: [], type: 'none', rarity: 'common', house: 'universal' };
  if (!c2) p2.card = { name: 'No card', atk: 0, hp: 0, effects: [], type: 'none', rarity: 'common', house: 'universal' };

  const roundLog = [];

  // Track modifiers for this round
  let p1AtkMod = 0, p2AtkMod = 0;
  let p1Shield = 0, p2Shield = 0;
  let p1DmgReduce = 0, p2DmgReduce = 0;
  let p1Reflect = 0, p2Reflect = 0;
  let p1SkipAtk = false, p2SkipAtk = false;
  let p1EffectsBlocked = false, p2EffectsBlocked = false;
  let p1ExtraAtk = false, p2ExtraAtk = false;
  let p1BonusDmg = 0, p2BonusDmg = 0;
  let p1Healing = 0, p2Healing = 0;

  // ── Determine speed order (higher SPD resolves effects first) ──
  const p1First = p1.spd >= p2.spd; // ties go to P1

  const first = p1First ? { p: p1, opp: p2, tag: 'p1' } : { p: p2, opp: p1, tag: 'p2' };
  const second = p1First ? { p: p2, opp: p1, tag: 'p2' } : { p: p1, opp: p2, tag: 'p1' };

  // ── Process effects in speed order ──
  for (const turn of [first, second]) {
    const myCard = turn.p.card;
    const isP1Turn = turn.tag === 'p1';
    const blocked = isP1Turn ? p1EffectsBlocked : p2EffectsBlocked;

    if (blocked) {
      roundLog.push(`${turn.p.handle}'s effects were SILENCED!`);
      continue;
    }

    for (const effectName of (myCard.effects || [])) {
      const effect = DUEL_EFFECTS[effectName];
      if (!effect) continue;

      // Damage to opponent
      if (effect.damage) {
        if (isP1Turn) p2BonusDmg += effect.damage;
        else p1BonusDmg += effect.damage;
        roundLog.push(`${turn.p.handle}'s ${effectName} deals ${effect.damage} damage!`);
      }

      // Self heal
      if (effect.selfHeal) {
        if (isP1Turn) p1Healing += effect.selfHeal;
        else p2Healing += effect.selfHeal;
        roundLog.push(`${turn.p.handle} ${effect.message} for ${effect.selfHeal} HP`);
      }

      // ATK boost
      if (effect.atkBoost) {
        if (isP1Turn) p1AtkMod += effect.atkBoost;
        else p2AtkMod += effect.atkBoost;
        roundLog.push(`${turn.p.handle} ${effect.message}! +${effect.atkBoost} ATK`);
      }

      // Shield
      if (effect.shield) {
        if (isP1Turn) p1Shield += effect.shield;
        else p2Shield += effect.shield;
        roundLog.push(`${turn.p.handle} ${effect.message}! Absorbs ${effect.shield} damage`);
      }

      // Damage reduction
      if (effect.damageReduce) {
        if (isP1Turn) p1DmgReduce += effect.damageReduce;
        else p2DmgReduce += effect.damageReduce;
      }

      // Reflect
      if (effect.reflect) {
        if (isP1Turn) p1Reflect += effect.reflect;
        else p2Reflect += effect.reflect;
      }
      if (effect.reflectPct) {
        if (isP1Turn) p1Reflect += 999; // flag for % based
        else p2Reflect += 999;
      }

      // Debuffs on opponent
      if (effect.oppEffectsBlocked) {
        if (isP1Turn) p2EffectsBlocked = true;
        else p1EffectsBlocked = true;
        roundLog.push(`${turn.opp.handle} was SILENCED!`);
      }
      if (effect.oppAtkReduce) {
        if (isP1Turn) p2AtkMod -= effect.oppAtkReduce;
        else p1AtkMod -= effect.oppAtkReduce;
        roundLog.push(`${turn.opp.handle} was ${effect.message}! -${effect.oppAtkReduce} ATK`);
      }
      if (effect.oppSkipAttack) {
        if (isP1Turn) p2SkipAtk = true;
        else p1SkipAtk = true;
        roundLog.push(`${turn.opp.handle} was STUNNED!`);
      }

      // Extra attack
      if (effect.extraAttack) {
        if (isP1Turn) p1ExtraAtk = true;
        else p2ExtraAtk = true;
      }

      // Crit chance
      if (effect.critChance && Math.random() * 100 < effect.critChance) {
        if (isP1Turn) p1AtkMod += Math.floor(p1.card.atk * 0.5);
        else p2AtkMod += Math.floor(p2.card.atk * 0.5);
        roundLog.push(`${turn.p.handle} lands a CRITICAL HIT!`);
      }
    }
  }

  // ── Apply attacks ──
  // P1 attacks P2
  if (!p1SkipAtk) {
    let p1TotalAtk = Math.max(0, (p1.atk + p1.card.atk + p1AtkMod));
    let p1Dmg = Math.max(0, p1TotalAtk - p2DmgReduce);

    // Shield absorb
    if (p2Shield > 0) {
      const absorbed = Math.min(p2Shield, p1Dmg);
      p1Dmg -= absorbed;
      roundLog.push(`${p2.handle}'s shield absorbs ${absorbed} damage`);
    }

    // Reflect
    if (p2Reflect > 0 && p2Reflect < 999) {
      const reflected = Math.min(p2Reflect, p1Dmg);
      p1.hp = Math.max(0, p1.hp - reflected);
      roundLog.push(`${p1.handle} takes ${reflected} reflected damage!`);
    }

    p2.hp = Math.max(0, p2.hp - p1Dmg);
    roundLog.push(`${p1.handle} hits ${p2.handle} for ${p1Dmg} damage (${p2.hp} HP left)`);

    // HASTE extra attack
    if (p1ExtraAtk) {
      const bonusHit = Math.floor(p1TotalAtk * 0.5);
      p2.hp = Math.max(0, p2.hp - bonusHit);
      roundLog.push(`${p1.handle} HASTE bonus hit for ${bonusHit}!`);
    }
  } else {
    roundLog.push(`${p1.handle} is STUNNED and can't attack!`);
  }

  // P2 attacks P1
  if (!p2SkipAtk) {
    let p2TotalAtk = Math.max(0, (p2.atk + p2.card.atk + p2AtkMod));
    let p2Dmg = Math.max(0, p2TotalAtk - p1DmgReduce);

    if (p1Shield > 0) {
      const absorbed = Math.min(p1Shield, p2Dmg);
      p2Dmg -= absorbed;
      roundLog.push(`${p1.handle}'s shield absorbs ${absorbed} damage`);
    }

    if (p1Reflect > 0 && p1Reflect < 999) {
      const reflected = Math.min(p1Reflect, p2Dmg);
      p2.hp = Math.max(0, p2.hp - reflected);
      roundLog.push(`${p2.handle} takes ${reflected} reflected damage!`);
    }

    p1.hp = Math.max(0, p1.hp - p2Dmg);
    roundLog.push(`${p2.handle} hits ${p1.handle} for ${p2Dmg} damage (${p1.hp} HP left)`);

    if (p2ExtraAtk) {
      const bonusHit = Math.floor(p2TotalAtk * 0.5);
      p1.hp = Math.max(0, p1.hp - bonusHit);
      roundLog.push(`${p2.handle} HASTE bonus hit for ${bonusHit}!`);
    }
  } else {
    roundLog.push(`${p2.handle} is STUNNED and can't attack!`);
  }

  // Apply bonus effect damage
  p2.hp = Math.max(0, p2.hp - p2BonusDmg);
  p1.hp = Math.max(0, p1.hp - p1BonusDmg);

  // Apply healing (capped at max HP)
  p1.hp = Math.min(p1.maxHp, p1.hp + p1Healing);
  p2.hp = Math.min(p2.maxHp, p2.hp + p2Healing);

  // ── Record round ──
  const roundResult = {
    round: duel.current_round,
    p1_card: { name: p1.card.name, atk: p1.card.atk, rarity: p1.card.rarity, effects: p1.card.effects },
    p2_card: { name: p2.card.name, atk: p2.card.atk, rarity: p2.card.rarity, effects: p2.card.effects },
    p1_hp_after: p1.hp,
    p2_hp_after: p2.hp,
    log: roundLog,
  };

  duel.rounds.push(roundResult);

  // ── Check for winner ──
  let gameOver = false;
  if (p1.hp <= 0 && p2.hp <= 0) {
    // Double KO — higher remaining HP wins, or it's a draw
    duel.winner = 'draw';
    gameOver = true;
  } else if (p1.hp <= 0) {
    duel.winner = p2.id;
    gameOver = true;
  } else if (p2.hp <= 0) {
    duel.winner = p1.id;
    gameOver = true;
  } else if (duel.current_round >= MAX_ROUNDS) {
    // Max rounds — higher HP wins
    duel.winner = p1.hp > p2.hp ? p1.id : p2.hp > p1.hp ? p2.id : 'draw';
    gameOver = true;
  }

  if (gameOver) {
    duel.status = 'finished';

    // Build result data
    const resultData = {
      duel_id: duelId,
      winner: duel.winner === 'draw' ? null : duel.winner,
      is_draw: duel.winner === 'draw',
      rounds: duel.rounds,
      final_hp: { p1: p1.hp, p2: p2.hp },
      round_result: roundResult,
    };

    // Notify both players
    emitToPlayer(p1.id, 'duel:finished', {
      ...resultData,
      you_won: duel.winner === p1.id,
      opponent: { handle: p2.handle, school_id: p2.school_id },
    });

    emitToPlayer(p2.id, 'duel:finished', {
      ...resultData,
      you_won: duel.winner === p2.id,
      opponent: { handle: p1.handle, school_id: p1.school_id },
    });

    // Save to database
    await saveDuelResult(duel);

    // Clean up after a delay
    setTimeout(() => activeDuels.delete(duelId), 60000);

    return { success: true, game_over: true, result: resultData };
  }

  // ── Next round ──
  duel.current_round++;
  p1.card = null;
  p2.card = null;
  duel.round_deadline = Date.now() + ROUND_TIMEOUT_MS;

  const nextRoundData = {
    duel_id: duelId,
    round: duel.current_round,
    timeout_seconds: Math.floor(ROUND_TIMEOUT_MS / 1000),
    round_result: roundResult,
  };

  emitToPlayer(p1.id, 'duel:next_round', {
    ...nextRoundData,
    your_hp: p1.hp,
    opponent_hp: p2.hp,
  });

  emitToPlayer(p2.id, 'duel:next_round', {
    ...nextRoundData,
    your_hp: p2.hp,
    opponent_hp: p1.hp,
  });

  startRoundTimer(duelId);

  return { success: true, game_over: false, round_result: roundResult };
}

// ═══════════════════════════════════════════
// Round timer — auto-resolve if someone doesn't pick
// ═══════════════════════════════════════════
function startRoundTimer(duelId) {
  const duel = activeDuels.get(duelId);
  if (!duel) return;

  if (duel.roundTimer) clearTimeout(duel.roundTimer);

  duel.roundTimer = setTimeout(async () => {
    const d = activeDuels.get(duelId);
    if (!d || d.status !== 'active') return;

    // Auto-resolve with whatever cards are submitted (or none)
    if (!d.p1.card) {
      emitToPlayer(d.p1.id, 'duel:timeout', { round: d.current_round });
    }
    if (!d.p2.card) {
      emitToPlayer(d.p2.id, 'duel:timeout', { round: d.current_round });
    }

    await resolveRound(duelId);
  }, ROUND_TIMEOUT_MS);
}

// ═══════════════════════════════════════════
// Save duel result to database
// ═══════════════════════════════════════════
async function saveDuelResult(duel) {
  try {
    await supabaseAdmin
      .from('duel_history')
      .insert({
        player1_id: duel.p1.id,
        player2_id: duel.p2.id,
        winner_id: duel.winner === 'draw' ? null : duel.winner,
        is_draw: duel.winner === 'draw',
        rounds_played: duel.rounds.length,
        round_data: duel.rounds,
        p1_hp_final: duel.p1.hp,
        p2_hp_final: duel.p2.hp,
      });
  } catch (err) {
    console.error('[Duel] Save error:', err.message);
  }
}

// ═══════════════════════════════════════════
// Get active duel for a player
// ═══════════════════════════════════════════
function getActiveDuel(playerId) {
  for (const [, duel] of activeDuels) {
    if (duel.status !== 'active') continue;
    if (duel.p1.id == playerId || duel.p2.id == playerId) {
      return duel;
    }
  }
  return null;
}

// ═══════════════════════════════════════════
// Get pending challenges for a player
// ═══════════════════════════════════════════
function getPendingChallenges(playerId) {
  const challenges = [];
  for (const [, ch] of pendingChallenges) {
    if (ch.opponent.id == playerId && Date.now() < ch.expires_at) {
      challenges.push(ch);
    }
  }
  return challenges;
}

// ═══════════════════════════════════════════
// Get duel history from DB
// ═══════════════════════════════════════════
async function getDuelHistory(playerId, limit = 20) {
  const { data } = await supabase
    .from('duel_history')
    .select('*')
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

module.exports = {
  registerSocket,
  unregisterSocket,
  createChallenge,
  acceptChallenge,
  declineChallenge,
  submitCard,
  getActiveDuel,
  getPendingChallenges,
  getDuelHistory,
};