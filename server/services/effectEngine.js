// ═══════════════════════════════════════════════════════
// server/services/effectsEngine.js
// Combat V2 — Effects Engine (39 Effects)
// Source: 9LV_EFFECTS_V2_LOCKED.md
//
// This engine processes all card effects during combat.
// It does NOT run the combat loop itself — the combat
// engine (combatEngine.js) calls into this.
// ═══════════════════════════════════════════════════════

const { applySharpness } = require('./statCalculation');

// ─── EFFECT DEFINITIONS ────────────────────────────────
// Every effect in the game, with its config.
// The combat engine reads this to know how to process each effect.

const EFFECTS = {

  // ══════════ ATTACK (5) ══════════
  BURN: {
    category: 'attack',
    trigger: 'on-attack',
    stackable: true,
    maxStacks: 3,
    binary: false,
    targeting: 'attack-target',       // applied to whoever you auto-attacked
    description: 'Extra fire damage per attack',
  },
  CHAIN: {
    category: 'attack',
    trigger: 'on-attack',
    stackable: false,
    binary: true,
    targeting: 'attack-target-plus-random',  // hit target + 1 random extra enemy
    description: 'Auto-attack hits 2 enemies',
  },
  EXECUTE: {
    category: 'attack',
    trigger: 'on-attack',
    stackable: false,
    binary: true,
    targeting: 'attack-target',
    description: '+50% damage to enemies below 30% HP',
  },
  SURGE: {
    category: 'attack',
    trigger: 'passive',
    stackable: false,
    binary: true,
    targeting: 'self',
    description: '+50% ATK, +25% damage taken (permanent)',
  },
  PIERCE: {
    category: 'attack',
    trigger: 'on-attack',
    stackable: false,
    binary: true,
    targeting: 'attack-target',
    description: 'Ignores WARD and BARRIER',
  },

  // ══════════ DEFENSE (5) ══════════
  HEAL: {
    category: 'defense',
    trigger: 'on-attack',
    stackable: true,
    maxStacks: 3,
    binary: false,
    targeting: 'lowest-hp-ally',
    description: 'Heal lowest HP ally (including self) per attack',
  },
  WARD: {
    category: 'defense',
    trigger: 'timed',
    stackable: false,
    binary: true,
    targeting: 'self',
    description: 'Block next hit (0 damage), consumed on trigger',
  },
  ANCHOR: {
    category: 'defense',
    trigger: 'timed',
    stackable: false,
    binary: true,
    targeting: 'self',
    description: "Can't drop below 1 HP during window",
  },
  THORNS: {
    category: 'defense',
    trigger: 'passive',
    stackable: true,
    maxStacks: 3,
    binary: false,
    baseValue: 15,
    targeting: 'attacker-reflect',    // whoever hits you takes damage back
    description: 'Reflect 15 damage to attacker per hit taken',
  },
  BARRIER: {
    category: 'defense',
    trigger: 'passive',
    stackable: false,
    binary: false,
    targeting: 'self',
    description: 'Absorb X total damage. One shield, gone when broken.',
  },

  // ══════════ CONTROL (8) ══════════
  SILENCE: {
    category: 'control',
    trigger: 'timed',
    stackable: false,
    binary: true,
    targeting: 'highest-atk-enemy',
    description: "Target's card effects don't trigger",
  },
  HEX: {
    category: 'control',
    trigger: 'timed',
    stackable: true,
    maxStacks: 3,
    binary: false,
    baseValue: 10,                    // -10 ATK per stack
    targeting: 'attack-target',
    description: '-10 ATK per stack, stacks x3 (-30 max)',
  },
  WEAKEN: {
    category: 'control',
    trigger: 'timed',
    stackable: false,
    binary: true,
    targeting: 'attack-target',
    description: 'Target deals half damage',
  },
  DRAIN: {
    category: 'control',
    trigger: 'on-attack',
    stackable: false,
    binary: false,
    targeting: 'attack-target',
    description: 'Heal self for 5% of damage dealt to target',
  },
  FEAST: {
    category: 'control',
    trigger: 'on-ko',
    stackable: false,
    binary: false,
    targeting: 'zone-any-enemy-ko',   // triggers on any enemy death on zone
    description: "Heal 15% of dead enemy's max HP",
  },
  SLOW: {
    category: 'control',
    trigger: 'timed',
    stackable: true,
    maxStacks: 3,
    binary: false,
    baseValue: 15,                    // -15 SPD per stack
    targeting: 'attack-target',
    description: '-15 SPD for 10 seconds',
  },
  TETHER: {
    category: 'control',
    trigger: 'timed',
    stackable: false,
    binary: true,
    targeting: 'attack-target',
    description: 'Link to target, share all damage 50/50',
  },
  MARK: {
    category: 'control',
    trigger: 'timed',
    stackable: false,
    binary: true,
    targeting: 'highest-hp-enemy',
    description: '+25% damage taken from all sources',
  },

  // ══════════ TEMPO (5) ══════════
  HASTE: {
    category: 'tempo',
    trigger: 'timed',
    stackable: true,
    maxStacks: 3,
    binary: false,
    baseValue: 10,                    // +10 SPD
    targeting: 'self',
    description: '+10 SPD for 10 seconds',
  },
  SWIFT: {
    category: 'tempo',
    trigger: 'deploy',
    stackable: false,
    binary: true,
    targeting: 'self',
    description: 'All card effects trigger at 2x strength for first 10s after deploy',
  },
  DODGE: {
    category: 'tempo',
    trigger: 'passive-cooldown',
    stackable: false,
    binary: true,
    cooldown: 10,                     // 10s cooldown between triggers
    duration: 3,                      // 3s invulnerable after taking a hit
    targeting: 'self',
    description: '100% evasion for 3s after hit. 10s cooldown.',
  },
  PHASE: {
    category: 'tempo',
    trigger: 'on-attack',
    stackable: false,
    binary: true,
    duration: 3,                      // 3s untargetable after attack
    targeting: 'self',
    description: 'After attacking, untargetable for 3s. Cannot attack while phased.',
  },
  STEALTH: {
    category: 'tempo',
    trigger: 'timed',
    stackable: false,
    binary: true,
    targeting: 'self',
    description: "Can't be single-targeted (still takes AOE/CHAIN)",
  },

  // ══════════ ATTRITION (3) ══════════
  POISON: {
    category: 'attrition',
    trigger: 'on-attack',
    stackable: true,
    maxStacks: 3,
    binary: false,
    baseValue: 3,                     // +3 damage per 3s for 12s
    dotInterval: 3,                   // ticks every 3 seconds
    dotDuration: 12,                  // lasts 12 seconds
    targeting: 'attack-target',
    description: '+3 damage per 3s for 12s, stacks x3',
  },
  CORRODE: {
    category: 'attrition',
    trigger: 'passive',
    stackable: false,
    binary: false,
    baseValue: 1,                     // -1 max HP per 10s
    auraInterval: 10,                 // ticks every 10 seconds
    targeting: 'all-enemies',
    description: '-1 max HP to all enemies every 10s. Permanent until midnight.',
  },
  INFECT: {
    category: 'attrition',
    trigger: 'on-ko',
    stackable: false,
    binary: false,
    targeting: 'all-enemies',         // on self KO, spread POISON to all enemies
    description: 'When KO\'d, all enemies get POISON',
  },

  // ══════════ TEAM (6) ══════════
  AMPLIFY: {
    category: 'team',
    trigger: 'on-attack',
    stackable: false,
    binary: true,
    targeting: 'next-ally-attack',
    description: "Next ally to attack gets +50% effect strength",
  },
  INSPIRE: {
    category: 'team',
    trigger: 'timed',
    stackable: true,
    maxStacks: 3,
    binary: false,
    baseValue: 3,                     // +3 ATK and +3 SPD
    targeting: 'all-allies',
    description: 'All allies on zone gain +3 ATK and +3 SPD',
  },
  BLESS: {
    category: 'team',
    trigger: 'on-attack',
    stackable: true,
    maxStacks: 3,
    binary: false,
    baseValue: 5,                     // +5 HP
    targeting: 'three-lowest-hp-allies',
    description: 'Heal the 3 lowest HP allies per attack',
  },
  TAUNT: {
    category: 'team',
    trigger: 'timed',
    stackable: false,
    binary: true,
    targeting: 'self',                // applied to self, forces enemies to hit you
    description: 'All enemies must attack this Nine',
  },
  SHATTER: {
    category: 'team',
    trigger: 'on-ko',
    stackable: false,
    binary: false,
    targeting: 'all-enemies',         // on self KO, damage all enemies
    description: 'On death, deal 10% of your max HP as damage to all enemies',
  },
  REFLECT: {
    category: 'team',
    trigger: 'timed',
    stackable: false,
    binary: true,
    targeting: 'self',                // bounces next hit back
    description: 'Next incoming hit bounces back at full damage, consumed on trigger',
  },

  // ══════════ UTILITY (2) ══════════
  CLEANSE: {
    category: 'utility',
    trigger: 'on-attack',
    stackable: false,
    binary: true,
    targeting: 'self',
    debuffsCleared: ['BURN', 'POISON', 'HEX', 'WEAKEN', 'SLOW', 'SILENCE', 'TETHER', 'MARK'],
    description: 'Remove all debuffs from self on attack',
  },
  OVERCHARGE: {
    category: 'utility',
    trigger: 'passive',
    stackable: false,
    binary: true,
    targeting: 'self',
    description: 'All card effects fire 2x per attack. -2% sharpness per snapshot instead of -1%.',
  },

  // ══════════ WILD (4) ══════════
  MIRROR: {
    category: 'wild',
    trigger: 'passive-cooldown',
    stackable: false,
    binary: true,
    cooldown: 10,                     // 10s cooldown
    maxBounces: 2,                    // max 2 bounces (MIRROR vs MIRROR)
    targeting: 'attacker-reflect',
    description: 'When hit by an effect, copy that effect back to attacker. 10s cooldown.',
  },
  PARASITE: {
    category: 'wild',
    trigger: 'on-attack',
    stackable: false,
    binary: false,
    baseValue: 3,                     // +3 HP per host attack
    targeting: 'attack-target',       // attaches to your target
    description: 'Attach to target. Heal 3 HP every time host attacks. Removed by CLEANSE.',
  },
  RESURRECT: {
    category: 'wild',
    trigger: 'on-ko',
    stackable: false,
    binary: true,
    cooldown: 300,                    // 5 minute cooldown
    revivePercent: 30,                // revive at 30% HP
    targeting: 'self',
    description: 'On KO, revive at 30% HP. 5-min cooldown. Skips zone cooldown.',
  },
  GRAVITY: {
    category: 'wild',
    trigger: 'deploy',
    stackable: false,
    binary: true,
    damageReduction: 0.5,             // 50% reduced incoming damage
    targeting: 'all-enemies',         // all enemies hit you once
    description: 'On deploy, all enemies hit you once. Incoming damage reduced 50%.',
  },
};


// ─── RARITY → TIMED EFFECT DURATION ────────────────────
// Source: Effects V2 — Stacking Rules section

const RARITY_DURATIONS = {
  common: 8,
  uncommon: 9,
  rare: 10,
  epic: 11,
  legendary: 12,
};

function getTimedDuration(rarity) {
  return RARITY_DURATIONS[rarity] || 10;
}


// ─── STACKING DIMINISHING RETURNS ──────────────────────
// 1st stack: 100%, 2nd: 75%, 3rd: 50%, cap: 3

function getStackMultiplier(stackNumber) {
  if (stackNumber <= 1) return 1.0;
  if (stackNumber === 2) return 0.75;
  if (stackNumber === 3) return 0.50;
  return 0; // over cap
}

function calculateStackedValue(baseValue, currentStacks) {
  const nextStack = currentStacks + 1;
  if (nextStack > 3) return 0; // already at cap
  return Math.floor(baseValue * getStackMultiplier(nextStack));
}


// ─── DEBUFF CLASSIFICATION ─────────────────────────────

const DEBUFFS = new Set([
  'BURN', 'POISON', 'HEX', 'WEAKEN', 'SLOW',
  'SILENCE', 'TETHER', 'MARK', 'CORRODE',
]);

const BUFFS = new Set([
  'WARD', 'ANCHOR', 'HASTE', 'STEALTH', 'TAUNT',
  'REFLECT', 'INSPIRE', 'SWIFT', 'DODGE', 'PHASE',
  'BARRIER', 'AMPLIFY',
]);

function isDebuff(effectName) {
  return DEBUFFS.has(effectName);
}

function isBuff(effectName) {
  return BUFFS.has(effectName);
}


// ─── ACTIVE EFFECT TRACKER ─────────────────────────────
// In-memory tracker for all active effects on all Nines.
// Structure: Map<nineId, Array<ActiveEffect>>
//
// ActiveEffect shape:
// {
//   effect: 'BURN',
//   sourceNineId: 'abc',       // who applied it
//   appliedAt: timestamp,
//   expiresAt: timestamp,       // for timed effects
//   stacks: 1,
//   value: 5,                   // the numeric value (after sharpness + stacking)
//   consumed: false,            // for WARD/REFLECT (one-shot effects)
//   data: {}                    // extra data (PARASITE host, TETHER link, etc.)
// }

class EffectTracker {
  constructor() {
    this.activeEffects = new Map();   // nineId → ActiveEffect[]
    this.cooldowns = new Map();       // nineId:effectName → expiresAt
    this.parasiteLinks = new Map();   // nineId → hostNineId
    this.tetherLinks = new Map();     // nineId → linkedNineId
    this.amplifyReady = new Map();    // nineId → { multiplier, expiresAt }
    this.corrodeTimers = new Map();   // nineId → lastTickAt
    this.barrierHP = new Map();       // nineId → remaining barrier HP
  }

  // Get all active effects on a Nine
  getEffects(nineId) {
    return this.activeEffects.get(nineId) || [];
  }

  // Check if a Nine has a specific active effect
  hasEffect(nineId, effectName) {
    const effects = this.getEffects(nineId);
    return effects.some(e => e.effect === effectName && !e.consumed);
  }

  // Count stacks of a numeric effect
  getStacks(nineId, effectName) {
    const effects = this.getEffects(nineId);
    return effects.filter(e => e.effect === effectName && !e.consumed).length;
  }

  // Get total value of a stacked effect (with diminishing returns already applied)
  getStackedValue(nineId, effectName) {
    const effects = this.getEffects(nineId);
    const matching = effects.filter(e => e.effect === effectName && !e.consumed);
    return matching.reduce((sum, e) => sum + (e.value || 0), 0);
  }

  // Apply a new effect to a Nine
  applyEffect(nineId, effectName, sourceNineId, value, rarity, now, extraData) {
    const def = EFFECTS[effectName];
    if (!def) return null;

    if (!this.activeEffects.has(nineId)) {
      this.activeEffects.set(nineId, []);
    }
    const effects = this.activeEffects.get(nineId);

    // Binary effects: don't stack, just refresh duration
    if (def.binary && !def.stackable) {
      const existing = effects.find(e => e.effect === effectName && !e.consumed);
      if (existing) {
        // Refresh duration for timed effects
        if (def.trigger === 'timed' || def.trigger === 'deploy') {
          existing.expiresAt = now + getTimedDuration(rarity || 'rare') * 1000;
          existing.sourceNineId = sourceNineId;
        }
        return existing;
      }
    }

    // Stackable effects: check cap
    if (def.stackable) {
      const currentStacks = this.getStacks(nineId, effectName);
      if (currentStacks >= (def.maxStacks || 3)) {
        return null; // at cap, can't add more
      }
      // Apply diminishing returns to value
      value = calculateStackedValue(value || def.baseValue || 0, currentStacks);
    }

    // Calculate expiry for timed effects
    let expiresAt = null;
    if (def.trigger === 'timed' || def.trigger === 'deploy') {
      expiresAt = now + getTimedDuration(rarity || 'rare') * 1000;
    }
    // DODGE and PHASE have fixed short durations
    if (effectName === 'DODGE') {
      expiresAt = now + (def.duration || 3) * 1000;
    }
    if (effectName === 'PHASE') {
      expiresAt = now + (def.duration || 3) * 1000;
    }
    // POISON has its own duration
    if (effectName === 'POISON') {
      expiresAt = now + (def.dotDuration || 12) * 1000;
    }

    const activeEffect = {
      effect: effectName,
      sourceNineId,
      appliedAt: now,
      expiresAt,
      stacks: 1,
      value: value || 0,
      consumed: false,
      rarity: rarity || 'rare',
      data: extraData || {},
    };

    effects.push(activeEffect);
    return activeEffect;
  }

  // Remove expired effects (called each tick)
  cleanupExpired(now) {
    for (const [nineId, effects] of this.activeEffects) {
      this.activeEffects.set(
        nineId,
        effects.filter(e => {
          if (e.consumed) return false;
          if (e.expiresAt && e.expiresAt <= now) return false;
          return true;
        })
      );
    }
  }

  // Remove all effects from a Nine (on KO or withdraw)
  clearAllEffects(nineId) {
    this.activeEffects.delete(nineId);
    this.parasiteLinks.delete(nineId);
    this.tetherLinks.delete(nineId);
    this.amplifyReady.delete(nineId);
    this.corrodeTimers.delete(nineId);
    this.barrierHP.delete(nineId);

    // Also clear any effects this Nine was the SOURCE of on others
    for (const [targetId, effects] of this.activeEffects) {
      this.activeEffects.set(
        targetId,
        effects.filter(e => e.sourceNineId !== nineId)
      );
    }

    // Clear parasites where this Nine was the host
    for (const [parasiteOwner, hostId] of this.parasiteLinks) {
      if (hostId === nineId) {
        this.parasiteLinks.delete(parasiteOwner);
      }
    }

    // Clear tethers involving this Nine
    for (const [tetheredId, linkedId] of this.tetherLinks) {
      if (linkedId === nineId) {
        this.tetherLinks.delete(tetheredId);
      }
    }
  }

  // Check if an effect is on cooldown for a Nine
  isOnCooldown(nineId, effectName, now) {
    const key = `${nineId}:${effectName}`;
    const expiresAt = this.cooldowns.get(key);
    return expiresAt && expiresAt > now;
  }

  // Set a cooldown for an effect
  setCooldown(nineId, effectName, durationSeconds, now) {
    const key = `${nineId}:${effectName}`;
    this.cooldowns.set(key, now + durationSeconds * 1000);
  }

  // Initialize BARRIER shield HP
  initBarrier(nineId, amount) {
    this.barrierHP.set(nineId, amount);
  }

  // Damage the barrier, returns remaining damage after absorb
  damageBarrier(nineId, damage) {
    const remaining = this.barrierHP.get(nineId) || 0;
    if (remaining <= 0) return damage; // no barrier

    if (damage <= remaining) {
      this.barrierHP.set(nineId, remaining - damage);
      return 0; // all absorbed
    } else {
      this.barrierHP.set(nineId, 0);
      // Remove barrier effect
      const effects = this.getEffects(nineId);
      const barrier = effects.find(e => e.effect === 'BARRIER');
      if (barrier) barrier.consumed = true;
      return damage - remaining; // overflow damage
    }
  }
}


// ─── EFFECT RESOLVER ───────────────────────────────────
// Called by the combat engine when a Nine attacks.
// Returns a list of combat events for the arena viewer.

/**
 * Resolve all effects when an attacker Nine attacks
 *
 * @param {object} attacker - { id, stats, cards, houseSlug, ... }
 * @param {object} target - { id, stats, ... } (auto-attack target)
 * @param {object} zoneState - { nines: Map, allies: [], enemies: [] }
 * @param {EffectTracker} tracker - the active effects tracker
 * @param {number} now - current timestamp
 * @returns {Array} events - list of { type, source, target, effect, value, message }
 */
function resolveAttackEffects(attacker, target, zoneState, tracker, now) {
  const events = [];
  const attackerEffects = getEquippedEffects(attacker);

  // Check if attacker is SILENCED — skip all effect processing
  if (tracker.hasEffect(attacker.id, 'SILENCE')) {
    events.push({
      type: 'effect_blocked',
      source: attacker.id,
      effect: 'SILENCE',
      message: `${attacker.name} is SILENCED — effects suppressed`,
    });
    return events;
  }

  // Check OVERCHARGE — effects fire twice
  const hasOvercharge = attackerEffects.some(e => e.name === 'OVERCHARGE');
  const fireCount = hasOvercharge ? 2 : 1;

  // Check SWIFT — 2x effect values in first 10s after deploy
  const hasSwift = tracker.hasEffect(attacker.id, 'SWIFT');
  const swiftMultiplier = hasSwift ? 2.0 : 1.0;

  // Check AMPLIFY buff from ally
  let amplifyMultiplier = 1.0;
  const amplifyBuff = tracker.amplifyReady.get(attacker.id);
  if (amplifyBuff && amplifyBuff.expiresAt > now) {
    amplifyMultiplier = 1.5;
    tracker.amplifyReady.delete(attacker.id); // consumed
    events.push({
      type: 'effect_trigger',
      source: attacker.id,
      effect: 'AMPLIFY',
      message: `${attacker.name} is AMPLIFIED — +50% effect strength`,
    });
  }

  const effectMultiplier = swiftMultiplier * amplifyMultiplier;

  for (let fireNum = 0; fireNum < fireCount; fireNum++) {
    for (const cardEffect of attackerEffects) {
      const def = EFFECTS[cardEffect.name];
      if (!def) continue;

      // Only process on-attack effects here
      if (def.trigger !== 'on-attack') continue;

      const effectValue = Math.floor((cardEffect.value || def.baseValue || 0) * effectMultiplier);

      switch (cardEffect.name) {

        case 'BURN': {
          tracker.applyEffect(target.id, 'BURN', attacker.id, effectValue, cardEffect.rarity, now);
          events.push({
            type: 'effect_apply',
            source: attacker.id,
            target: target.id,
            effect: 'BURN',
            value: effectValue,
            message: `BURN +${effectValue} applied`,
          });
          break;
        }

        case 'CHAIN': {
          // Find a second random enemy (not the primary target)
          const otherEnemies = zoneState.enemies.filter(e => e.id !== target.id && e.hp > 0);
          if (otherEnemies.length > 0) {
            const chainTarget = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
            events.push({
              type: 'effect_trigger',
              source: attacker.id,
              target: chainTarget.id,
              effect: 'CHAIN',
              message: `CHAIN hits ${chainTarget.name}`,
            });
          }
          break;
        }

        case 'EXECUTE': {
          const targetMaxHp = target.maxHp || target.stats.hp;
          if (target.hp < targetMaxHp * 0.3) {
            events.push({
              type: 'effect_trigger',
              source: attacker.id,
              target: target.id,
              effect: 'EXECUTE',
              value: 50,
              message: `EXECUTE — +50% damage (target below 30% HP)`,
            });
          }
          break;
        }

        case 'PIERCE': {
          events.push({
            type: 'effect_trigger',
            source: attacker.id,
            target: target.id,
            effect: 'PIERCE',
            message: 'PIERCE — ignoring WARD and BARRIER',
          });
          break;
        }

        case 'HEAL': {
          // Find lowest HP ally (including self)
          const allies = [attacker, ...zoneState.allies].filter(a => a.hp > 0);
          allies.sort((a, b) => a.hp - b.hp);
          const healTarget = allies[0];
          if (healTarget) {
            events.push({
              type: 'effect_heal',
              source: attacker.id,
              target: healTarget.id,
              effect: 'HEAL',
              value: effectValue,
              message: `HEAL +${effectValue} on ${healTarget.name}`,
            });
          }
          break;
        }

        case 'DRAIN': {
          // 5% of damage dealt — the actual damage value will be calculated by combat engine
          events.push({
            type: 'effect_trigger',
            source: attacker.id,
            target: target.id,
            effect: 'DRAIN',
            value: 5, // percentage
            message: 'DRAIN — heal 5% of damage dealt',
          });
          break;
        }

        case 'POISON': {
          tracker.applyEffect(target.id, 'POISON', attacker.id, effectValue, cardEffect.rarity, now);
          events.push({
            type: 'effect_apply',
            source: attacker.id,
            target: target.id,
            effect: 'POISON',
            value: effectValue,
            message: `POISON +${effectValue}/3s applied (12s)`,
          });
          break;
        }

        case 'SILENCE': {
          // Target highest ATK enemy
          const enemies = [...zoneState.enemies].filter(e => e.hp > 0);
          enemies.sort((a, b) => (b.stats?.atk || 0) - (a.stats?.atk || 0));
          const silenceTarget = enemies[0];
          if (silenceTarget) {
            tracker.applyEffect(silenceTarget.id, 'SILENCE', attacker.id, 0, cardEffect.rarity, now);
            events.push({
              type: 'effect_apply',
              source: attacker.id,
              target: silenceTarget.id,
              effect: 'SILENCE',
              message: `SILENCE on ${silenceTarget.name}`,
            });
          }
          break;
        }

        case 'HEX': {
          tracker.applyEffect(target.id, 'HEX', attacker.id, effectValue, cardEffect.rarity, now);
          events.push({
            type: 'effect_apply',
            source: attacker.id,
            target: target.id,
            effect: 'HEX',
            value: effectValue,
            message: `HEX -${effectValue} ATK applied`,
          });
          break;
        }

        case 'WEAKEN': {
          tracker.applyEffect(target.id, 'WEAKEN', attacker.id, 0, cardEffect.rarity, now);
          events.push({
            type: 'effect_apply',
            source: attacker.id,
            target: target.id,
            effect: 'WEAKEN',
            message: 'WEAKEN — target deals 50% damage',
          });
          break;
        }

        case 'SLOW': {
          tracker.applyEffect(target.id, 'SLOW', attacker.id, effectValue, cardEffect.rarity, now);
          events.push({
            type: 'effect_apply',
            source: attacker.id,
            target: target.id,
            effect: 'SLOW',
            value: effectValue,
            message: `SLOW -${effectValue} SPD applied`,
          });
          break;
        }

        case 'TETHER': {
          tracker.applyEffect(target.id, 'TETHER', attacker.id, 0, cardEffect.rarity, now);
          tracker.tetherLinks.set(attacker.id, target.id);
          events.push({
            type: 'effect_apply',
            source: attacker.id,
            target: target.id,
            effect: 'TETHER',
            message: `TETHER — damage shared 50/50`,
          });
          break;
        }

        case 'MARK': {
          // Target highest HP enemy
          const enemies = [...zoneState.enemies].filter(e => e.hp > 0);
          enemies.sort((a, b) => b.hp - a.hp);
          const markTarget = enemies[0];
          if (markTarget) {
            tracker.applyEffect(markTarget.id, 'MARK', attacker.id, 0, cardEffect.rarity, now);
            events.push({
              type: 'effect_apply',
              source: attacker.id,
              target: markTarget.id,
              effect: 'MARK',
              message: `MARK on ${markTarget.name} — +25% damage from all`,
            });
          }
          break;
        }

        case 'HASTE': {
          tracker.applyEffect(attacker.id, 'HASTE', attacker.id, effectValue, cardEffect.rarity, now);
          events.push({
            type: 'effect_apply',
            source: attacker.id,
            target: attacker.id,
            effect: 'HASTE',
            value: effectValue,
            message: `HASTE +${effectValue} SPD`,
          });
          break;
        }

        case 'BLESS': {
          // 3 lowest HP allies
          const allies = [...zoneState.allies, attacker].filter(a => a.hp > 0);
          allies.sort((a, b) => a.hp - b.hp);
          const blessTargets = allies.slice(0, 3);
          blessTargets.forEach(bt => {
            events.push({
              type: 'effect_heal',
              source: attacker.id,
              target: bt.id,
              effect: 'BLESS',
              value: effectValue,
              message: `BLESS +${effectValue} HP on ${bt.name}`,
            });
          });
          break;
        }

        case 'INSPIRE': {
          tracker.applyEffect(attacker.id, 'INSPIRE', attacker.id, effectValue, cardEffect.rarity, now);
          events.push({
            type: 'effect_apply',
            source: attacker.id,
            effect: 'INSPIRE',
            value: effectValue,
            message: `INSPIRE — all allies +${effectValue} ATK/SPD`,
          });
          break;
        }

        case 'AMPLIFY': {
          // Set the amplify buff for the next ally to attack
          // Combat engine checks tracker.amplifyReady when an ally attacks
          const allies = zoneState.allies.filter(a => a.hp > 0 && a.id !== attacker.id);
          if (allies.length > 0) {
            // Mark all allies as potential amplify targets — first to attack gets it
            allies.forEach(ally => {
              tracker.amplifyReady.set(ally.id, {
                multiplier: 1.5,
                expiresAt: now + 10000, // 10s window
                sourceId: attacker.id,
              });
            });
            events.push({
              type: 'effect_trigger',
              source: attacker.id,
              effect: 'AMPLIFY',
              message: 'AMPLIFY — next ally attack gets +50% effects',
            });
          }
          break;
        }

        case 'CLEANSE': {
          const cleared = [];
          const debuffsToRemove = EFFECTS.CLEANSE.debuffsCleared;
          debuffsToRemove.forEach(debuff => {
            if (tracker.hasEffect(attacker.id, debuff)) {
              const effects = tracker.getEffects(attacker.id);
              effects.forEach(e => {
                if (e.effect === debuff) e.consumed = true;
              });
              cleared.push(debuff);
            }
          });
          // Also clear PARASITE
          tracker.parasiteLinks.delete(attacker.id);
          if (cleared.length > 0) {
            events.push({
              type: 'effect_trigger',
              source: attacker.id,
              effect: 'CLEANSE',
              message: `CLEANSE — cleared ${cleared.join(', ')}`,
            });
          }
          break;
        }

        case 'PARASITE': {
          // Attach to attack target — only 1 host at a time
          const existingHost = tracker.parasiteLinks.get(attacker.id);
          if (!existingHost || existingHost === target.id) {
            tracker.parasiteLinks.set(attacker.id, target.id);
            events.push({
              type: 'effect_apply',
              source: attacker.id,
              target: target.id,
              effect: 'PARASITE',
              value: effectValue,
              message: `PARASITE attached — +${effectValue} HP per host attack`,
            });
          }
          break;
        }

        case 'PHASE': {
          // After attacking, enter phase (untargetable 3s, can't attack)
          tracker.applyEffect(attacker.id, 'PHASE', attacker.id, 0, cardEffect.rarity, now);
          events.push({
            type: 'effect_trigger',
            source: attacker.id,
            effect: 'PHASE',
            message: 'PHASE — untargetable for 3s',
          });
          break;
        }
      }
    }
  }

  // Apply timed effects that trigger on attack (WARD, ANCHOR, STEALTH, TAUNT, REFLECT)
  for (const cardEffect of attackerEffects) {
    const def = EFFECTS[cardEffect.name];
    if (!def || def.trigger !== 'timed') continue;

    // These self-buffs refresh on each attack
    if (['WARD', 'ANCHOR', 'STEALTH', 'TAUNT', 'REFLECT'].includes(cardEffect.name)) {
      if (!tracker.hasEffect(attacker.id, cardEffect.name)) {
        tracker.applyEffect(attacker.id, cardEffect.name, attacker.id, 0, cardEffect.rarity, now);
        events.push({
          type: 'effect_apply',
          source: attacker.id,
          target: attacker.id,
          effect: cardEffect.name,
          message: `${cardEffect.name} activated`,
        });
      }
    }
  }

  return events;
}


/**
 * Resolve effects when a Nine is knocked out
 * Handles: FEAST, INFECT, SHATTER, RESURRECT
 */
function resolveKOEffects(knockedOutNine, killer, zoneState, tracker, now) {
  const events = [];
  const koEffects = getEquippedEffects(knockedOutNine);

  // SHATTER — deal 10% max HP to all enemies
  if (koEffects.some(e => e.name === 'SHATTER')) {
    const damage = Math.floor((knockedOutNine.maxHp || knockedOutNine.stats.hp) * 0.10);
    events.push({
      type: 'effect_aoe_damage',
      source: knockedOutNine.id,
      effect: 'SHATTER',
      value: damage,
      targets: zoneState.enemies.filter(e => e.hp > 0).map(e => e.id),
      message: `SHATTER — ${damage} damage to all enemies`,
    });
  }

  // INFECT — spread POISON to all enemies
  if (koEffects.some(e => e.name === 'INFECT')) {
    const enemies = zoneState.enemies.filter(e => e.hp > 0);
    enemies.forEach(enemy => {
      tracker.applyEffect(enemy.id, 'POISON', knockedOutNine.id, 3, 'rare', now);
    });
    events.push({
      type: 'effect_aoe_apply',
      source: knockedOutNine.id,
      effect: 'INFECT',
      message: 'INFECT — POISON spread to all enemies',
    });
  }

  // RESURRECT — revive at 30% HP
  if (koEffects.some(e => e.name === 'RESURRECT')) {
    if (!tracker.isOnCooldown(knockedOutNine.id, 'RESURRECT', now)) {
      const reviveHp = Math.floor((knockedOutNine.maxHp || knockedOutNine.stats.hp) * 0.30);
      tracker.setCooldown(knockedOutNine.id, 'RESURRECT', 300, now); // 5 min cooldown
      events.push({
        type: 'effect_resurrect',
        source: knockedOutNine.id,
        effect: 'RESURRECT',
        value: reviveHp,
        message: `RESURRECT — revived at ${reviveHp} HP`,
      });
    }
  }

  // FEAST — all enemies with FEAST heal on this KO
  for (const enemy of zoneState.enemies) {
    if (enemy.hp <= 0) continue;
    const enemyEffects = getEquippedEffects(enemy);
    if (enemyEffects.some(e => e.name === 'FEAST')) {
      const healAmount = Math.floor((knockedOutNine.maxHp || knockedOutNine.stats.hp) * 0.15);
      events.push({
        type: 'effect_heal',
        source: enemy.id,
        target: enemy.id,
        effect: 'FEAST',
        value: healAmount,
        message: `FEAST — ${enemy.name} heals ${healAmount} HP`,
      });
    }
  }

  return events;
}


/**
 * Resolve deploy effects (SWIFT, GRAVITY)
 */
function resolveDeployEffects(deployedNine, zoneState, tracker, now) {
  const events = [];
  const nineEffects = getEquippedEffects(deployedNine);

  // SWIFT — 2x effects for first 10s
  if (nineEffects.some(e => e.name === 'SWIFT')) {
    tracker.applyEffect(deployedNine.id, 'SWIFT', deployedNine.id, 0, 'rare', now);
    events.push({
      type: 'effect_apply',
      source: deployedNine.id,
      effect: 'SWIFT',
      message: 'SWIFT — 2x effect strength for 10s',
    });
  }

  // GRAVITY — all enemies hit you once at 50% damage
  if (nineEffects.some(e => e.name === 'GRAVITY')) {
    const enemies = zoneState.enemies.filter(e => e.hp > 0);
    events.push({
      type: 'effect_gravity',
      source: deployedNine.id,
      effect: 'GRAVITY',
      targetCount: enemies.length,
      damageReduction: 0.5,
      message: `GRAVITY — ${enemies.length} enemies pulled in (50% damage)`,
    });
  }

  // Initialize BARRIER if equipped
  const barrierEffect = nineEffects.find(e => e.name === 'BARRIER');
  if (barrierEffect) {
    tracker.initBarrier(deployedNine.id, barrierEffect.value || 40);
    tracker.applyEffect(deployedNine.id, 'BARRIER', deployedNine.id, barrierEffect.value || 40, barrierEffect.rarity, now);
  }

  return events;
}


// ─── DAMAGE MODIFIERS ──────────────────────────────────
// Called by combat engine to modify damage before applying

/**
 * Get damage modifier for an incoming hit
 * Checks: WARD, BARRIER, REFLECT, DODGE, ANCHOR, SURGE, MARK, WEAKEN, TETHER
 *
 * @returns {object} { finalDamage, reflected, events, blocked, anchored }
 */
function getIncomingDamageModifiers(targetId, attackerId, baseDamage, hasPierce, tracker, now) {
  let damage = baseDamage;
  let reflected = 0;
  const events = [];
  let blocked = false;
  let anchored = false;

  // DODGE — 100% evasion for 3s
  if (tracker.hasEffect(targetId, 'DODGE')) {
    events.push({ type: 'effect_trigger', target: targetId, effect: 'DODGE', message: 'DODGE — evaded!' });
    return { finalDamage: 0, reflected: 0, events, blocked: true, anchored: false };
  }

  // WARD — block 1 hit (unless PIERCE)
  if (!hasPierce && tracker.hasEffect(targetId, 'WARD')) {
    const wardEffect = tracker.getEffects(targetId).find(e => e.effect === 'WARD' && !e.consumed);
    if (wardEffect) {
      wardEffect.consumed = true;
      events.push({ type: 'effect_trigger', target: targetId, effect: 'WARD', message: 'WARD — blocked!' });
      return { finalDamage: 0, reflected: 0, events, blocked: true, anchored: false };
    }
  }

  // REFLECT — bounce full damage back (unless PIERCE)
  if (!hasPierce && tracker.hasEffect(targetId, 'REFLECT')) {
    const reflectEffect = tracker.getEffects(targetId).find(e => e.effect === 'REFLECT' && !e.consumed);
    if (reflectEffect) {
      reflectEffect.consumed = true;
      reflected = damage;
      events.push({ type: 'effect_trigger', target: targetId, effect: 'REFLECT', value: damage, message: `REFLECT — ${damage} bounced back` });
      return { finalDamage: 0, reflected, events, blocked: true, anchored: false };
    }
  }

  // BARRIER — absorb damage (unless PIERCE)
  if (!hasPierce) {
    damage = tracker.damageBarrier(targetId, damage);
    if (damage < baseDamage) {
      events.push({ type: 'effect_trigger', target: targetId, effect: 'BARRIER', value: baseDamage - damage, message: `BARRIER absorbed ${baseDamage - damage}` });
    }
  }

  // MARK — +25% damage from all sources
  if (tracker.hasEffect(targetId, 'MARK')) {
    const bonus = Math.floor(damage * 0.25);
    damage += bonus;
    events.push({ type: 'effect_trigger', target: targetId, effect: 'MARK', value: bonus, message: `MARK — +${bonus} bonus damage` });
  }

  // SURGE on target — +25% damage taken
  if (tracker.hasEffect(targetId, 'SURGE')) {
    const bonus = Math.floor(damage * 0.25);
    damage += bonus;
  }

  // TETHER — split damage 50/50
  const tetheredTo = tracker.tetherLinks.get(targetId);
  if (tetheredTo) {
    const splitDamage = Math.floor(damage / 2);
    damage = splitDamage;
    events.push({ type: 'effect_trigger', target: targetId, effect: 'TETHER', value: splitDamage, message: `TETHER — ${splitDamage} shared with linked Nine` });
  }

  // THORNS — reflect flat damage back to attacker
  const thornsValue = tracker.getStackedValue(targetId, 'THORNS');
  if (thornsValue > 0) {
    reflected += thornsValue;
    events.push({ type: 'effect_trigger', target: targetId, effect: 'THORNS', value: thornsValue, message: `THORNS — ${thornsValue} reflected` });
  }

  // MIRROR — copy effect back (passive cooldown)
  if (tracker.hasEffect(targetId, 'MIRROR') && !tracker.isOnCooldown(targetId, 'MIRROR', now)) {
    tracker.setCooldown(targetId, 'MIRROR', 10, now);
    events.push({ type: 'effect_trigger', target: targetId, effect: 'MIRROR', message: 'MIRROR — copying effects back' });
  }

  // DODGE trigger — after taking a hit, gain 3s invulnerability (if DODGE is equipped but not active)
  const nineEffects = getEquippedEffects({ id: targetId }); // simplified — combat engine provides full data
  if (nineEffects.some && nineEffects.some(e => e.name === 'DODGE') && !tracker.isOnCooldown(targetId, 'DODGE', now)) {
    tracker.applyEffect(targetId, 'DODGE', targetId, 0, 'rare', now);
    tracker.setCooldown(targetId, 'DODGE', 10, now);
    events.push({ type: 'effect_apply', target: targetId, effect: 'DODGE', message: 'DODGE — 3s evasion activated' });
  }

  return { finalDamage: damage, reflected, events, blocked, anchored };
}


// ─── STAT MODIFIERS FROM ACTIVE EFFECTS ────────────────
// Called by combat engine to adjust stats before attack calculation

/**
 * Get temporary stat modifiers from active effects
 * @returns {object} { atk, hp, spd, def, luck } — values to ADD to base stats
 */
function getActiveStatModifiers(nineId, tracker) {
  const mods = { atk: 0, hp: 0, spd: 0, def: 0, luck: 0 };

  // SURGE — +50% ATK (passive)
  if (tracker.hasEffect(nineId, 'SURGE')) {
    // The combat engine applies this as a multiplier to ATK
    // We flag it here so the engine knows to apply it
    mods._surgeActive = true;
  }

  // HEX — -10 ATK per stack
  const hexValue = tracker.getStackedValue(nineId, 'HEX');
  if (hexValue > 0) mods.atk -= hexValue;

  // WEAKEN — flag for combat engine (50% damage)
  if (tracker.hasEffect(nineId, 'WEAKEN')) {
    mods._weakened = true;
  }

  // SLOW — -15 SPD per stack
  const slowValue = tracker.getStackedValue(nineId, 'SLOW');
  if (slowValue > 0) mods.spd -= slowValue;

  // HASTE — +10 SPD per stack
  const hasteValue = tracker.getStackedValue(nineId, 'HASTE');
  if (hasteValue > 0) mods.spd += hasteValue;

  // INSPIRE — +3 ATK and +3 SPD per stack
  const inspireValue = tracker.getStackedValue(nineId, 'INSPIRE');
  if (inspireValue > 0) {
    mods.atk += inspireValue;
    mods.spd += inspireValue;
  }

  return mods;
}


// ─── HELPERS ───────────────────────────────────────────

/**
 * Extract effect names and values from a Nine's equipped cards
 * Reads from the bonus_effects field on each card
 *
 * @param {object} nine - Nine data with cards array
 * @returns {Array} [{ name: 'BURN', value: 5, rarity: 'rare' }, ...]
 */
function getEquippedEffects(nine) {
  if (!nine || !nine.cards) return [];

  const effects = [];

  for (const card of nine.cards) {
    const spell = card.spells || card;
    const rarity = card.rarity || spell.rarity || 'common';
    let bonusEffects = spell.bonus_effects || [];

    // Parse if it's a string
    if (typeof bonusEffects === 'string') {
      try { bonusEffects = JSON.parse(bonusEffects); } catch (e) { bonusEffects = []; }
    }

    for (const be of bonusEffects) {
      // Parse tag like "BURN +5" or "CHAIN" or "HEAL +15"
      const tag = (be.tag || '').trim();
      const parts = tag.split(/\s+/);
      const name = parts[0].toUpperCase();
      let value = 0;

      if (parts[1]) {
        value = parseInt(parts[1].replace('+', ''), 10) || 0;
      }

      // Apply sharpness to numeric effect values
      if (card.sharpness != null && card.sharpness < 100 && value > 0) {
        value = applySharpness(value, card.sharpness);
      }

      if (EFFECTS[name]) {
        effects.push({ name, value, rarity });
      }
    }
  }

  return effects;
}


// ─── EXPORTS ───────────────────────────────────────────

module.exports = {
  // Effect definitions (read-only config)
  EFFECTS,
  RARITY_DURATIONS,
  DEBUFFS,
  BUFFS,

  // Effect tracker (create one per zone)
  EffectTracker,

  // Resolvers (called by combat engine)
  resolveAttackEffects,
  resolveKOEffects,
  resolveDeployEffects,

  // Modifiers (called by combat engine during damage calc)
  getIncomingDamageModifiers,
  getActiveStatModifiers,

  // Helpers
  getEquippedEffects,
  getTimedDuration,
  calculateStackedValue,
  isDebuff,
  isBuff,
};