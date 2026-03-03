// ═══════════════════════════════════════════════════════
// server/services/combatEngine.js
// Combat V2 — Continuous Real-Time Combat Engine
// Source: 9LV_COMBAT_V2_LOCKED.md Section 8
//
// How it works:
// - Server tick every 2 seconds
// - Each Nine has individual attack timer based on SPD
// - Auto-attacks lowest HP enemy
// - Effects process via effectsEngine.js
// - 15-minute snapshots score zone control
// - All events broadcast via Socket.io
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const {
  calculateNineStats,
  calculateAttackInterval,
  calculateDamage,
  rollCrit,
} = require('./statCalculation');
const {
  EffectTracker,
  resolveAttackEffects,
  resolveKOEffects,
  resolveDeployEffects,
  getIncomingDamageModifiers,
  getActiveStatModifiers,
  getEquippedEffects,
  EFFECTS,
} = require('./effectsEngine');
const { addPoints } = require('./pointsService');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── CONFIG ────────────────────────────────────────────

const TICK_INTERVAL_MS = 2000;          // 2 second server tick
const SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const KO_COOLDOWN_MS = 60 * 1000;       // 1 minute KO cooldown per zone
const MAX_ZONE_POP = 50;                // max Nines per zone
const SHARPNESS_LOSS_PER_SNAPSHOT = 1;  // -1% per snapshot

// Zone scoring points (from V5 Section 21)
const ZONE_POINTS = {
  SURVIVE_SNAPSHOT: 3,   // +3 per snapshot survived (player), +2 (guild)
  WIN_SNAPSHOT: 5,       // +5 for winning guild snapshot (player), +3 (guild)
  KO_ENEMY: 10,          // +10 for knocking someone out (player), +5 (guild)
  FLIP_ZONE: 15,         // +15 for flipping a zone (player), +8 (guild)
  HOLD_FULL_DAY: 25,     // +25 for holding a zone all day
};

// ─── ZONE STATE ────────────────────────────────────────
// In-memory state for each active zone

class ZoneState {
  constructor(zoneId) {
    this.zoneId = zoneId;
    this.nines = new Map();           // nineId → NineCombatState
    this.effectTracker = new EffectTracker();
    this.lastSnapshotAt = Date.now();
    this.snapshotCount = 0;
    this.controllingGuild = null;
    this.koCooldowns = new Map();     // playerId → expiresAt (per zone)
  }
}

// Combat state for a single Nine on a zone
class NineCombatState {
  constructor(data) {
    this.id = data.playerId;
    this.nineId = data.nineId;
    this.name = data.name;
    this.guildTag = data.guildTag;
    this.houseSlug = data.houseSlug;

    // Stats (calculated from house + cards + items)
    this.stats = data.stats;          // { atk, hp, spd, def, luck }
    this.maxHp = data.stats.hp;
    this.hp = data.stats.hp;          // current HP

    // Attack timing
    this.attackInterval = calculateAttackInterval(data.stats.spd);
    this.lastAttackAt = Date.now();   // starts ready to attack
    this.nextAttackAt = Date.now() + this.attackInterval * 1000;

    // Card data (for effect processing)
    this.cards = data.cards || [];

    // Flags
    this.isAlive = true;
    this.deployedAt = Date.now();
  }
}

// ─── ENGINE STATE ──────────────────────────────────────

const zones = new Map();              // zoneId → ZoneState
let tickTimer = null;
let snapshotTimer = null;
let engineRunning = false;
let lastTickAt = Date.now();

// ─── MAIN TICK LOOP ────────────────────────────────────
// Runs every 2 seconds. For each zone:
// 1. Check each Nine's attack timer
// 2. If timer elapsed → resolve attack + effects
// 3. Check KOs
// 4. Process DOTs (POISON, CORRODE, BURN ticks)
// 5. Cleanup expired effects
// 6. Broadcast state changes

async function tick() {
  const now = Date.now();
  lastTickAt = now;

  for (const [zoneId, zone] of zones) {
    if (zone.nines.size === 0) continue;

    const tickEvents = [];

    // Collect alive Nines grouped by guild
    const aliveNines = [];
    for (const [nineId, nine] of zone.nines) {
      if (nine.isAlive && nine.hp > 0) {
        aliveNines.push(nine);
      }
    }

    if (aliveNines.length === 0) continue;

    // ── Process each Nine's attack ──
    for (const attacker of aliveNines) {
      if (!attacker.isAlive || attacker.hp <= 0) continue;

      // Check if PHASED (can't attack while phased)
      if (zone.effectTracker.hasEffect(attacker.id, 'PHASE')) continue;

      // Check if attack timer has elapsed
      if (now < attacker.nextAttackAt) continue;

      // ── This Nine attacks! ──

      // Get stat modifiers from active effects
      const mods = getActiveStatModifiers(attacker.id, zone.effectTracker);
      let effectiveAtk = attacker.stats.atk + (mods.atk || 0);
      let effectiveSpd = attacker.stats.spd + (mods.spd || 0);

      // SURGE: +50% ATK
      if (mods._surgeActive) {
        effectiveAtk = Math.floor(effectiveAtk * 1.5);
      }

      // Find target: lowest HP enemy (or TAUNT target)
      const enemies = aliveNines.filter(n =>
        n.id !== attacker.id &&
        n.guildTag !== attacker.guildTag &&
        n.isAlive && n.hp > 0
      );

      if (enemies.length === 0) continue; // no enemies on this zone

      let target = null;

      // Check for TAUNT — forced targeting
      const taunter = enemies.find(e => zone.effectTracker.hasEffect(e.id, 'TAUNT'));
      if (taunter) {
        target = taunter;
      } else {
        // Check for STEALTH — filter out stealthed enemies
        const targetable = enemies.filter(e => !zone.effectTracker.hasEffect(e.id, 'STEALTH'));
        if (targetable.length > 0) {
          // Target lowest HP
          targetable.sort((a, b) => a.hp - b.hp);
          target = targetable[0];
        } else {
          // All stealthed — can't attack anyone
          continue;
        }
      }

      // ── Calculate damage ──
      const defenderMods = getActiveStatModifiers(target.id, zone.effectTracker);
      const effectiveDef = target.stats.def + (defenderMods.def || 0);

      let damage = calculateDamage(effectiveAtk, effectiveDef);

      // WEAKEN on attacker: 50% damage
      if (mods._weakened) {
        damage = Math.floor(damage * 0.5);
      }

      // EXECUTE: +50% damage if target below 30% HP
      const attackerEffects = getEquippedEffects(attacker);
      if (attackerEffects.some(e => e.name === 'EXECUTE') && target.hp < target.maxHp * 0.3) {
        damage = Math.floor(damage * 1.5);
      }

      // Crit check
      const isCrit = rollCrit(attacker.stats.luck);
      if (isCrit) {
        damage *= 2;
      }

      // ── Process incoming damage modifiers on target ──
      const hasPierce = attackerEffects.some(e => e.name === 'PIERCE');
      const dmgResult = getIncomingDamageModifiers(
        target.id, attacker.id, damage, hasPierce, zone.effectTracker, now
      );
      damage = dmgResult.finalDamage;
      tickEvents.push(...dmgResult.events);

      // MARK on target: +25% already handled in getIncomingDamageModifiers

      // ── Apply damage to target ──
      if (damage > 0 && !dmgResult.blocked) {
        // ANCHOR check: can't drop below 1 HP
        if (zone.effectTracker.hasEffect(target.id, 'ANCHOR')) {
          target.hp = Math.max(1, target.hp - damage);
        } else {
          target.hp -= damage;
        }

        // DRAIN: heal attacker for 5% of damage dealt
        if (attackerEffects.some(e => e.name === 'DRAIN')) {
          const drainHeal = Math.max(1, Math.floor(damage * 0.05));
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + drainHeal);
          tickEvents.push({
            type: 'effect_heal',
            source: attacker.id,
            target: attacker.id,
            effect: 'DRAIN',
            value: drainHeal,
          });
        }

        tickEvents.push({
          type: 'attack',
          source: attacker.id,
          target: target.id,
          damage,
          isCrit,
          targetHp: target.hp,
          targetMaxHp: target.maxHp,
        });
      }

      // ── Apply reflected damage to attacker ──
      if (dmgResult.reflected > 0) {
        attacker.hp -= dmgResult.reflected;
        tickEvents.push({
          type: 'reflected_damage',
          source: target.id,
          target: attacker.id,
          damage: dmgResult.reflected,
        });
      }

      // ── CHAIN: hit a second target ──
      if (attackerEffects.some(e => e.name === 'CHAIN')) {
        const otherEnemies = enemies.filter(e => e.id !== target.id && e.hp > 0);
        if (otherEnemies.length > 0) {
          const chainTarget = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
          const chainDamage = Math.floor(damage * 0.75); // chain does 75% damage
          chainTarget.hp -= chainDamage;
          tickEvents.push({
            type: 'chain_attack',
            source: attacker.id,
            target: chainTarget.id,
            damage: chainDamage,
            targetHp: chainTarget.hp,
          });
        }
      }

      // ── Resolve card effects (BURN, HEAL, SILENCE, etc.) ──
      const zoneContext = {
        allies: aliveNines.filter(n => n.guildTag === attacker.guildTag && n.id !== attacker.id && n.hp > 0),
        enemies: enemies,
      };
      const effectEvents = resolveAttackEffects(attacker, target, zoneContext, zone.effectTracker, now);
      tickEvents.push(...effectEvents);

      // ── Apply HEAL events ──
      for (const evt of effectEvents) {
        if (evt.type === 'effect_heal' && evt.target && evt.value) {
          const healTarget = zone.nines.get(evt.target);
          if (healTarget && healTarget.isAlive) {
            healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + evt.value);
          }
        }
      }

      // ── PARASITE tick: heal parasite owner when host attacks ──
      for (const [parasiteOwner, hostId] of zone.effectTracker.parasiteLinks) {
        if (hostId === attacker.id) {
          const owner = zone.nines.get(parasiteOwner);
          if (owner && owner.isAlive) {
            owner.hp = Math.min(owner.maxHp, owner.hp + 3);
            tickEvents.push({
              type: 'effect_heal',
              source: parasiteOwner,
              target: parasiteOwner,
              effect: 'PARASITE',
              value: 3,
            });
          }
        }
      }

      // ── Reset attack timer ──
      const newInterval = calculateAttackInterval(effectiveSpd);
      attacker.attackInterval = newInterval;
      attacker.lastAttackAt = now;
      attacker.nextAttackAt = now + newInterval * 1000;
    }

    // ── Process DOTs (POISON, BURN ticks) ──
    for (const [nineId, nine] of zone.nines) {
      if (!nine.isAlive || nine.hp <= 0) continue;

      const effects = zone.effectTracker.getEffects(nineId);

      // POISON: +X damage per 3 seconds
      const poisonEffects = effects.filter(e => e.effect === 'POISON' && !e.consumed);
      for (const poison of poisonEffects) {
        const interval = (EFFECTS.POISON.dotInterval || 3) * 1000;
        const lastTick = poison.data.lastDotTick || poison.appliedAt;
        if (now - lastTick >= interval) {
          nine.hp -= poison.value;
          poison.data.lastDotTick = now;
          tickEvents.push({
            type: 'dot_damage',
            target: nineId,
            effect: 'POISON',
            damage: poison.value,
            targetHp: nine.hp,
          });
        }
      }

      // BURN: damage applied on attack (already handled in resolveAttackEffects)
      // BURN ticks as extra damage per attacker's attack — tracked by effectsEngine
      const burnEffects = effects.filter(e => e.effect === 'BURN' && !e.consumed);
      for (const burn of burnEffects) {
        // BURN ticks every 2 seconds (each server tick)
        const lastTick = burn.data.lastBurnTick || burn.appliedAt;
        if (now - lastTick >= 2000) {
          nine.hp -= burn.value;
          burn.data.lastBurnTick = now;
          tickEvents.push({
            type: 'dot_damage',
            target: nineId,
            effect: 'BURN',
            damage: burn.value,
            targetHp: nine.hp,
          });
        }
      }

      // CORRODE aura: -1 max HP to all enemies every 10 seconds
      if (getEquippedEffects(nine).some(e => e.name === 'CORRODE') && nine.isAlive) {
        const lastCorrode = zone.effectTracker.corrodeTimers.get(nineId) || 0;
        if (now - lastCorrode >= 10000) {
          zone.effectTracker.corrodeTimers.set(nineId, now);
          const enemies = aliveNines.filter(n => n.guildTag !== nine.guildTag && n.hp > 0);
          for (const enemy of enemies) {
            enemy.maxHp = Math.max(1, enemy.maxHp - 1);
            if (enemy.hp > enemy.maxHp) enemy.hp = enemy.maxHp;
            tickEvents.push({
              type: 'effect_trigger',
              source: nineId,
              target: enemy.id,
              effect: 'CORRODE',
              value: 1,
            });
          }
        }
      }
    }

    // ── Check for KOs ──
    for (const [nineId, nine] of zone.nines) {
      if (!nine.isAlive) continue;
      if (nine.hp > 0) continue;

      // This Nine is KO'd
      nine.isAlive = false;
      nine.hp = 0;

      // Resolve KO effects (SHATTER, INFECT, RESURRECT, FEAST)
      const zoneContext = {
        enemies: aliveNines.filter(n => n.guildTag !== nine.guildTag && n.hp > 0),
        allies: aliveNines.filter(n => n.guildTag === nine.guildTag && n.id !== nineId && n.hp > 0),
      };
      const koEvents = resolveKOEffects(nine, null, zoneContext, zone.effectTracker, now);
      tickEvents.push(...koEvents);

      // Check for RESURRECT
      const resEvent = koEvents.find(e => e.type === 'effect_resurrect');
      if (resEvent) {
        nine.isAlive = true;
        nine.hp = resEvent.value;
        tickEvents.push({
          type: 'resurrect',
          target: nineId,
          hp: resEvent.value,
        });
      } else {
        // Apply SHATTER damage to enemies
        const shatterEvent = koEvents.find(e => e.type === 'effect_aoe_damage' && e.effect === 'SHATTER');
        if (shatterEvent) {
          for (const enemyId of shatterEvent.targets) {
            const enemy = zone.nines.get(enemyId);
            if (enemy && enemy.isAlive) {
              enemy.hp -= shatterEvent.value;
            }
          }
        }

        // Apply FEAST heals
        for (const evt of koEvents) {
          if (evt.type === 'effect_heal' && evt.effect === 'FEAST') {
            const healer = zone.nines.get(evt.target);
            if (healer && healer.isAlive) {
              healer.hp = Math.min(healer.maxHp, healer.hp + evt.value);
            }
          }
        }

        // Set KO cooldown for this zone
        zone.koCooldowns.set(nineId, now + KO_COOLDOWN_MS);

        // Clear effects
        zone.effectTracker.clearAllEffects(nineId);

        // Update database
        try {
          await supabaseAdmin
            .from('zone_deployments')
            .update({ is_active: false, ko_at: new Date().toISOString() })
            .eq('player_id', nineId)
            .eq('zone_id', zoneId)
            .eq('is_active', true);
        } catch (e) {
          console.error(`KO DB update error for ${nineId}:`, e.message);
        }

        // Award KO points to killer (if we tracked one)
        // For now, KO points go to whoever last attacked this Nine
        tickEvents.push({
          type: 'ko',
          target: nineId,
          targetName: nine.name,
          targetGuild: nine.guildTag,
          zone_id: zoneId,
        });
      }
    }

    // ── Cleanup expired effects ──
    zone.effectTracker.cleanupExpired(now);

    // ── Broadcast tick events to arena viewers ──
    if (tickEvents.length > 0 && global.__arenaSocket) {
      global.__arenaSocket._broadcastToZone(zoneId, 'arena:tick', {
        zone_id: zoneId,
        tick_at: now,
        events: tickEvents,
        // Send condensed HP state for all Nines
        nines: Array.from(zone.nines.values()).map(n => ({
          id: n.id,
          name: n.name,
          guild: n.guildTag,
          house: n.houseSlug,
          hp: n.hp,
          maxHp: n.maxHp,
          isAlive: n.isAlive,
          nextAttackAt: n.nextAttackAt,
          activeEffects: zone.effectTracker.getEffects(n.id).map(e => ({
            effect: e.effect,
            expiresAt: e.expiresAt,
            value: e.value,
            stacks: e.stacks,
          })),
        })),
      });
    }
  }
}


// ─── 15-MINUTE SNAPSHOT ────────────────────────────────
// Scores zone control, degrades sharpness, awards points

async function snapshot() {
  const now = Date.now();
  console.log(`📸 Zone snapshot at ${new Date(now).toISOString()}`);

  for (const [zoneId, zone] of zones) {
    if (zone.nines.size === 0) continue;

    zone.snapshotCount++;

    // ── Calculate guild HP totals ──
    const guildHP = {};
    const guildMembers = {};

    for (const [nineId, nine] of zone.nines) {
      if (!nine.isAlive || nine.hp <= 0) continue;

      const guild = nine.guildTag || 'lone_wolf';
      if (!guildHP[guild]) {
        guildHP[guild] = 0;
        guildMembers[guild] = [];
      }
      guildHP[guild] += nine.hp;
      guildMembers[guild].push(nineId);
    }

    // ── Determine winner ──
    let winningGuild = null;
    let highestHP = 0;
    for (const [guild, totalHp] of Object.entries(guildHP)) {
      if (totalHp > highestHP) {
        highestHP = totalHp;
        winningGuild = guild;
      }
    }

    // ── Check for zone flip ──
    const previousController = zone.controllingGuild;
    const isFlip = winningGuild && winningGuild !== previousController;
    zone.controllingGuild = winningGuild;

    // ── Award points ──
    for (const [nineId, nine] of zone.nines) {
      if (!nine.isAlive || nine.hp <= 0) continue;

      try {
        // Survive snapshot: +3 points
        await addPoints(nineId, ZONE_POINTS.SURVIVE_SNAPSHOT, 'zone_survive', `Survived snapshot on zone ${zoneId}`);

        // Winning guild members: +5 points
        if (nine.guildTag === winningGuild) {
          await addPoints(nineId, ZONE_POINTS.WIN_SNAPSHOT, 'zone_win', `Guild won snapshot on zone ${zoneId}`);
        }

        // Zone flip bonus: +15 points
        if (isFlip && nine.guildTag === winningGuild) {
          await addPoints(nineId, ZONE_POINTS.FLIP_ZONE, 'zone_flip', `Flipped zone ${zoneId}`);
        }
      } catch (e) {
        console.error(`Snapshot points error for ${nineId}:`, e.message);
      }
    }

    // ── Degrade sharpness for all deployed cards ──
    try {
      const playerIds = Array.from(zone.nines.keys());
      if (playerIds.length > 0) {
        // Get all active deployments on this zone
        const { data: deployments } = await supabase
          .from('zone_deployments')
          .select('id, player_id')
          .eq('zone_id', zoneId)
          .eq('is_active', true);

        if (deployments) {
          for (const dep of deployments) {
            // Get card slots for this deployment
            const { data: slots } = await supabase
              .from('zone_card_slots')
              .select('card_id')
              .eq('deployment_id', dep.id)
              .eq('is_active', true);

            if (slots) {
              const cardIds = slots.map(s => s.card_id).filter(Boolean);
              if (cardIds.length > 0) {
                // Check if Nine has OVERCHARGE (2x sharpness loss)
                const nine = zone.nines.get(dep.player_id);
                const hasOvercharge = nine ? getEquippedEffects(nine).some(e => e.name === 'OVERCHARGE') : false;
                const sharpnessLoss = hasOvercharge ? SHARPNESS_LOSS_PER_SNAPSHOT * 2 : SHARPNESS_LOSS_PER_SNAPSHOT;

                await supabaseAdmin.rpc('degrade_sharpness', {
                  card_ids: cardIds,
                  loss_amount: sharpnessLoss,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`Sharpness degradation error on zone ${zoneId}:`, e.message);
    }

    // ── Update zone control in database ──
    try {
      await supabaseAdmin
        .from('zones')
        .update({
          controlled_by: winningGuild,
          last_snapshot_at: new Date(now).toISOString(),
          snapshot_count: zone.snapshotCount,
        })
        .eq('id', zoneId);
    } catch (e) {
      console.error(`Zone control update error for zone ${zoneId}:`, e.message);
    }

    // ── Broadcast snapshot to arena viewers ──
    if (global.__arenaSocket) {
      global.__arenaSocket._broadcastToZone(zoneId, 'arena:snapshot', {
        zone_id: zoneId,
        snapshot_number: zone.snapshotCount,
        guild_hp: guildHP,
        winner: winningGuild,
        is_flip: isFlip,
        previous_controller: previousController,
        next_snapshot_at: now + SNAPSHOT_INTERVAL_MS,
      });
    }

    console.log(`  Zone ${zoneId}: ${winningGuild || 'no controller'} (${highestHP} HP)${isFlip ? ' ← FLIPPED!' : ''}`);
  }
}


// ─── LOAD ZONE STATE FROM DATABASE ─────────────────────
// On engine start, load all active deployments into memory

async function loadZoneState() {
  try {
    console.log('⚔️ Loading active zone deployments...');

    const { data: deployments, error } = await supabase
      .from('zone_deployments')
      .select(`
        id, player_id, nine_id, zone_id, guild_tag, current_hp, max_hp,
        player:player_id(twitter_handle, school_id),
        nine:nine_id(name, house_id)
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to load deployments:', error.message);
      return;
    }

    if (!deployments || deployments.length === 0) {
      console.log('⚔️ No active deployments found');
      return;
    }

    for (const dep of deployments) {
      const zoneId = dep.zone_id;

      // Create zone state if needed
      if (!zones.has(zoneId)) {
        zones.set(zoneId, new ZoneState(zoneId));
      }
      const zone = zones.get(zoneId);

      // Calculate full stats for this Nine on this zone
      try {
        const stats = await calculateNineStats(dep.player_id, zoneId);

        const nineCombat = new NineCombatState({
          playerId: dep.player_id,
          nineId: dep.nine_id,
          name: dep.nine?.name || dep.player?.twitter_handle || 'Unknown',
          guildTag: dep.guild_tag || 'Lone Wolf',
          houseSlug: dep.nine?.house_id ? getHouseSlug(dep.nine.house_id) : 'unknown',
          stats: {
            atk: stats.atk,
            hp: stats.hp,
            spd: stats.spd,
            def: stats.def,
            luck: stats.luck,
          },
          cards: stats.cards || [],
        });

        // Use stored HP if less than max (they were mid-fight)
        if (dep.current_hp && dep.current_hp < nineCombat.maxHp) {
          nineCombat.hp = dep.current_hp;
        }

        zone.nines.set(dep.player_id, nineCombat);

        // Resolve deploy effects
        const deployEvents = resolveDeployEffects(nineCombat, {
          allies: Array.from(zone.nines.values()).filter(n => n.guildTag === nineCombat.guildTag && n.id !== nineCombat.id),
          enemies: Array.from(zone.nines.values()).filter(n => n.guildTag !== nineCombat.guildTag),
        }, zone.effectTracker, Date.now());

      } catch (e) {
        console.error(`Failed to load Nine ${dep.player_id} on zone ${zoneId}:`, e.message);
      }
    }

    console.log(`⚔️ Loaded ${deployments.length} Nines across ${zones.size} zones`);

  } catch (e) {
    console.error('Zone state load error:', e.message);
  }
}


// ─── PUBLIC API: ADD/REMOVE NINES ──────────────────────
// Called by zones.js when players deploy/withdraw

async function addNineToZone(playerId, zoneId, nineData) {
  if (!zones.has(zoneId)) {
    zones.set(zoneId, new ZoneState(zoneId));
  }
  const zone = zones.get(zoneId);

  // Check KO cooldown
  const cooldownExpiry = zone.koCooldowns.get(playerId);
  if (cooldownExpiry && Date.now() < cooldownExpiry) {
    const remaining = Math.ceil((cooldownExpiry - Date.now()) / 1000);
    return { error: `KO cooldown: ${remaining}s remaining on this zone` };
  }

  // Check zone population
  const aliveCount = Array.from(zone.nines.values()).filter(n => n.isAlive).length;
  if (aliveCount >= MAX_ZONE_POP) {
    return { error: `Zone is full (${MAX_ZONE_POP} max)` };
  }

  // Calculate stats
  const stats = await calculateNineStats(playerId, zoneId);

  const nineCombat = new NineCombatState({
    playerId,
    nineId: nineData.nineId,
    name: nineData.name,
    guildTag: nineData.guildTag,
    houseSlug: nineData.houseSlug,
    stats: {
      atk: stats.atk,
      hp: stats.hp,
      spd: stats.spd,
      def: stats.def,
      luck: stats.luck,
    },
    cards: stats.cards || [],
  });

  zone.nines.set(playerId, nineCombat);

  // Resolve deploy effects (SWIFT, GRAVITY, BARRIER)
  const deployContext = {
    allies: Array.from(zone.nines.values()).filter(n => n.guildTag === nineCombat.guildTag && n.id !== playerId && n.isAlive),
    enemies: Array.from(zone.nines.values()).filter(n => n.guildTag !== nineCombat.guildTag && n.isAlive),
  };
  const deployEvents = resolveDeployEffects(nineCombat, deployContext, zone.effectTracker, Date.now());

  // Handle GRAVITY: all enemies hit this Nine once at 50% damage
  const gravityEvent = deployEvents.find(e => e.effect === 'GRAVITY');
  if (gravityEvent) {
    for (const enemy of deployContext.enemies) {
      if (!enemy.isAlive || enemy.hp <= 0) continue;
      const gravDamage = Math.floor(calculateDamage(enemy.stats.atk, nineCombat.stats.def) * 0.5);
      nineCombat.hp -= gravDamage;

      // THORNS from SWIFT+GRAVITY combo
      const thornsVal = zone.effectTracker.getStackedValue(nineCombat.id, 'THORNS');
      const effectiveThorns = zone.effectTracker.hasEffect(nineCombat.id, 'SWIFT') ? thornsVal * 2 : thornsVal;
      if (effectiveThorns > 0) {
        enemy.hp -= effectiveThorns;
      }
    }
    // ANCHOR prevents death from GRAVITY
    if (zone.effectTracker.hasEffect(nineCombat.id, 'ANCHOR')) {
      nineCombat.hp = Math.max(1, nineCombat.hp);
    }
  }

  // Broadcast deployment
  if (global.__arenaSocket) {
    global.__arenaSocket._broadcastToZone(zoneId, 'arena:nine_joined', {
      id: playerId,
      name: nineCombat.name,
      guild: nineCombat.guildTag,
      house: nineCombat.houseSlug,
      hp: nineCombat.hp,
      maxHp: nineCombat.maxHp,
      stats: nineCombat.stats,
      deployEvents,
    });
  }

  return { success: true, stats: nineCombat.stats, hp: nineCombat.hp };
}

function removeNineFromZone(playerId, zoneId) {
  const zone = zones.get(zoneId);
  if (!zone) return;

  zone.effectTracker.clearAllEffects(playerId);
  zone.nines.delete(playerId);

  // Broadcast withdrawal
  if (global.__arenaSocket) {
    global.__arenaSocket._broadcastToZone(zoneId, 'arena:nine_left', {
      id: playerId,
      zone_id: zoneId,
    });
  }
}


// ─── ENGINE CONTROL ────────────────────────────────────

async function startCombatEngine() {
  if (engineRunning) {
    console.log('⚔️ Combat engine already running');
    return;
  }

  console.log('⚔️ Starting Combat V2 engine...');
  console.log(`   Tick interval: ${TICK_INTERVAL_MS}ms`);
  console.log(`   Snapshot interval: ${SNAPSHOT_INTERVAL_MS / 1000}s`);

  // Load existing zone state
  await loadZoneState();

  // Start tick loop
  tickTimer = setInterval(async () => {
    try {
      await tick();
    } catch (e) {
      console.error('Tick error:', e.message);
    }
  }, TICK_INTERVAL_MS);

  // Start snapshot loop
  snapshotTimer = setInterval(async () => {
    try {
      await snapshot();
    } catch (e) {
      console.error('Snapshot error:', e.message);
    }
  }, SNAPSHOT_INTERVAL_MS);

  engineRunning = true;
  console.log('⚔️ Combat V2 engine running!');
}

function stopCombatEngine() {
  if (tickTimer) clearInterval(tickTimer);
  if (snapshotTimer) clearInterval(snapshotTimer);
  tickTimer = null;
  snapshotTimer = null;
  engineRunning = false;
  console.log('⚔️ Combat engine stopped');
}

// ─── HELPERS ───────────────────────────────────────────

const HOUSE_SLUGS = {
  1: 'smoulders', 2: 'darktide', 3: 'stonebark',
  4: 'ashenvale', 5: 'stormrage', 6: 'nighthollow',
  7: 'dawnbringer', 8: 'manastorm', 9: 'plaguemire',
};

function getHouseSlug(houseId) {
  return HOUSE_SLUGS[houseId] || 'unknown';
}

// ─── COMPATIBILITY METHODS ─────────────────────────────
// These match the old combat engine interface so index.js doesn't break

function getNextCycleAt() {
  // Return next snapshot time
  const elapsed = Date.now() - (Array.from(zones.values())[0]?.lastSnapshotAt || Date.now());
  return Date.now() + (SNAPSHOT_INTERVAL_MS - elapsed);
}

function getCycleIntervalMs() {
  return SNAPSHOT_INTERVAL_MS;
}

// ─── STATUS ────────────────────────────────────────────

function getEngineStatus() {
  const zoneStats = {};
  for (const [zoneId, zone] of zones) {
    const alive = Array.from(zone.nines.values()).filter(n => n.isAlive);
    zoneStats[zoneId] = {
      totalNines: zone.nines.size,
      aliveNines: alive.length,
      controlledBy: zone.controllingGuild,
      snapshotCount: zone.snapshotCount,
    };
  }

  return {
    running: engineRunning,
    tickIntervalMs: TICK_INTERVAL_MS,
    snapshotIntervalMs: SNAPSHOT_INTERVAL_MS,
    lastTickAt,
    activeZones: zones.size,
    zones: zoneStats,
  };
}


// ─── EXPORTS ───────────────────────────────────────────

module.exports = {
  // Engine control
  startCombatEngine,
  stopCombatEngine,
  getEngineStatus,

  // Zone management (called by zones.js routes)
  addNineToZone,
  removeNineFromZone,

  // Compatibility with old engine interface
  getNextCycleAt,
  getCycleIntervalMs,

  // Direct access (for admin/debug)
  zones,
  tick,
  snapshot,
};