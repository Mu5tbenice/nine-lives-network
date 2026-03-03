// ═══════════════════════════════════════════════════════
// services/combatEngineV2.js
// V2 Continuous Combat — 2-second ticks, 15-min snapshots
// Source of truth: 9LV_COMBAT_V2_LOCKED.md
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════

const TICK_INTERVAL_MS   = 2000;          // Server tick every 2 seconds
const SNAPSHOT_INTERVAL   = 15 * 60 * 1000; // 15 minutes
const KO_COOLDOWN_MS     = 60 * 1000;     // 1-minute zone cooldown
const SHARPNESS_LOSS     = 1;             // -1% per snapshot
const MIN_DAMAGE         = 1;
const LONE_WOLF_ATK_MULT = 1.5;

// Effect durations by rarity (milliseconds)
const EFFECT_DURATION = {
  common:    8000,
  uncommon:  9000,
  rare:      10000,
  epic:      11000,
  legendary: 12000,
};

// Rarity stat multipliers (Legendary = 2x Common)
// Spells table stores Common base stats; these scale up by rarity
const RARITY_MULTIPLIER = {
  common:    1.0,
  uncommon:  1.2,
  rare:      1.42,
  epic:      1.69,
  legendary: 2.0,
};

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════

// Per-zone combat state
// zoneState[zoneId] = { nines: Map<nineId, NineState>, lastSnapshot: timestamp }
const zoneState = {};
let nextSnapshotAt = 0;
let tickTimer = null;
let isRunning = false;

// ═══════════════════════════════════════
// COMBAT FORMULAS
// ═══════════════════════════════════════

/** Attack interval based on SPD: max(2.0, 10.5 - SPD × 0.12) seconds */
function getAttackInterval(spd) {
  return Math.max(2.0, 10.5 - spd * 0.12);
}

/** Damage per hit: ATK² / (ATK + DEF), minimum 1 */
function calcDamage(atk, def) {
  const denom = atk + def;
  if (denom <= 0) return MIN_DAMAGE;
  return Math.max(MIN_DAMAGE, Math.round((atk * atk) / denom));
}

/** Crit check: LUCK/100 chance, 2x damage */
function rollCrit(luck) {
  return Math.random() * 100 < luck;
}

/** Sharpness effectiveness: effective = base × (0.5 + sharpness/200) */
function applySharpness(baseVal, sharpness) {
  const pct = Math.max(0, Math.min(100, sharpness || 100));
  return Math.round(baseVal * (0.5 + pct / 200));
}

// ═══════════════════════════════════════
// NINE STATE OBJECT
// ═══════════════════════════════════════

function createNineState(deployment, cards, house) {
  // Pure addition: house + card1 + card2 + card3
  let totalAtk  = house.base_atk  || 0;
  let totalHp   = house.base_hp   || 0;
  let totalSpd  = house.base_spd  || 0;
  let totalDef  = house.base_def  || 0;
  let totalLuck = house.base_luck || 0;

  // Collect all effects from cards
  const effects = [];

  for (const card of cards) {
    const sharp = card.sharpness ?? 100;
    const rarity = (card.rarity || card.spell?.rarity || 'common').toLowerCase();
    const mult = RARITY_MULTIPLIER[rarity] || 1.0;

    // Scale base stats by rarity, then apply sharpness
    totalAtk  += applySharpness(Math.round((card.spell?.base_atk  || 0) * mult), sharp);
    totalHp   += applySharpness(Math.round((card.spell?.base_hp   || 0) * mult), sharp);
    totalSpd  += applySharpness(Math.round((card.spell?.base_spd  || 0) * mult), sharp);
    totalDef  += applySharpness(Math.round((card.spell?.base_def  || 0) * mult), sharp);
    totalLuck += applySharpness(Math.round((card.spell?.base_luck || 0) * mult), sharp);

    // Parse effects
    const bonusEffects = card.spell?.bonus_effects || [];
    const parsed = Array.isArray(bonusEffects) ? bonusEffects : 
      (typeof bonusEffects === 'string' ? JSON.parse(bonusEffects || '[]') : []);
    for (const eff of parsed) {
      effects.push({
        tag: eff.tag || '',
        desc: eff.desc || '',
        rarity: card.spell?.rarity || 'common',
        cardId: card.id,
      });
    }
  }

  // Lone wolf bonus
  const isLoneWolf = !deployment.guild_tag;
  if (isLoneWolf) {
    totalAtk = Math.round(totalAtk * LONE_WOLF_ATK_MULT);
  }

  const attackInterval = getAttackInterval(totalSpd);

  return {
    id: deployment.player_id,
    nineId: deployment.nine_id,
    deploymentId: deployment.id,
    name: deployment.player_name || `Nine #${deployment.player_id}`,
    house: house.slug || house.name?.toLowerCase() || 'unknown',
    guild: deployment.guild_tag || 'Lone Wolf',
    guildId: deployment.guild_tag || null,
    isLoneWolf,

    // Stats
    atk: totalAtk,
    maxHp: totalHp,
    currentHp: totalHp,
    spd: totalSpd,
    def: totalDef,
    luck: totalLuck,

    // Combat timing
    attackInterval,                          // seconds between attacks
    nextAttackAt: Date.now() + attackInterval * 1000, // first attack timestamp

    // Effects
    effects,                                 // from cards
    activeBuffs: [],                         // timed effects currently running
    barrierHp: 0,                            // BARRIER remaining HP
    wardActive: false,                       // WARD one-shot shield
    anchorActive: false,                     // ANCHOR can't die
    silenced: false,                         // SILENCE suppresses effects

    // KO tracking
    isAlive: true,
    koAt: 0,                                 // timestamp when KO'd (for respawn cooldown)
  };
}

// ═══════════════════════════════════════
// TARGETING
// ═══════════════════════════════════════

function getEnemies(zoneNines, nine) {
  return [...zoneNines.values()].filter(n => 
    n.isAlive && n.guild !== nine.guild && n.id !== nine.id
  );
}

function getAllies(zoneNines, nine) {
  return [...zoneNines.values()].filter(n => 
    n.isAlive && n.guild === nine.guild && n.id !== nine.id
  );
}

/** Lowest HP enemy (default auto-attack target) */
function targetLowestHp(enemies) {
  if (!enemies.length) return null;
  return enemies.reduce((low, e) => e.currentHp < low.currentHp ? e : low, enemies[0]);
}

/** Highest ATK enemy (for SILENCE) */
function targetHighestAtk(enemies) {
  if (!enemies.length) return null;
  return enemies.reduce((hi, e) => e.atk > hi.atk ? e : hi, enemies[0]);
}

/** Highest HP enemy (for MARK) */
function targetHighestHp(enemies) {
  if (!enemies.length) return null;
  return enemies.reduce((hi, e) => e.currentHp > hi.currentHp ? e : hi, enemies[0]);
}

/** Lowest HP allies (for BLESS — heal 3 lowest) */
function lowestHpAllies(allies, count) {
  return [...allies].sort((a, b) => a.currentHp - b.currentHp).slice(0, count);
}

// ═══════════════════════════════════════
// DAMAGE / HEAL HELPERS
// ═══════════════════════════════════════

function dealDamage(target, amount, source) {
  if (!target.isAlive) return 0;

  // WARD check — blocks one hit completely
  if (target.wardActive) {
    target.wardActive = false;
    return 0; // blocked
  }

  // BARRIER check — absorbs damage
  if (target.barrierHp > 0) {
    if (amount <= target.barrierHp) {
      target.barrierHp -= amount;
      return 0;
    }
    amount -= target.barrierHp;
    target.barrierHp = 0;
  }

  // ANCHOR check — can't drop below 1 HP
  if (target.anchorActive) {
    target.currentHp = Math.max(1, target.currentHp - amount);
  } else {
    target.currentHp = Math.max(0, target.currentHp - amount);
  }

  return amount;
}

function healTarget(target, amount) {
  if (!target.isAlive) return 0;
  const before = target.currentHp;
  target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
  return target.currentHp - before;
}

// ═══════════════════════════════════════
// EFFECT PROCESSING
// ═══════════════════════════════════════

/** Parse effect tag to get name and value, e.g. "BURN +5" → { name: "BURN", value: 5 } */
function parseEffect(tag) {
  const match = tag.match(/^([A-Z]+)\s*\+?(\d+)?$/);
  if (!match) return { name: tag.toUpperCase().trim(), value: 0 };
  return { name: match[1], value: parseInt(match[2]) || 0 };
}

/** Get effect duration in ms based on rarity */
function getEffectDuration(rarity) {
  return EFFECT_DURATION[rarity] || EFFECT_DURATION.common;
}

/** Process all effects for a Nine's attack */
function processEffects(nine, target, zoneNines, events) {
  if (nine.silenced) return; // SILENCE suppresses all effects

  const enemies = getEnemies(zoneNines, nine);
  const allies = getAllies(zoneNines, nine);

  for (const eff of nine.effects) {
    const { name, value } = parseEffect(eff.tag);
    const duration = getEffectDuration(eff.rarity);

    switch (name) {

      // ── ATTACK EFFECTS ──

      case 'BURN': {
        const dmg = dealDamage(target, value || 3, nine);
        if (dmg > 0) {
          events.push({ type: 'attack', source: nine.id, target: target.id,
            damage: dmg, element: 'fire', effect: 'BURN', targetHp: target.currentHp });
        }
        break;
      }

      case 'CHAIN': {
        // Hit a second random enemy
        const others = enemies.filter(e => e.id !== target.id);
        if (others.length > 0) {
          const second = others[Math.floor(Math.random() * others.length)];
          const chainDmg = calcDamage(nine.atk, second.def);
          const actual = dealDamage(second, chainDmg, nine);
          if (actual > 0) {
            events.push({ type: 'effect_chain', source: nine.id, target: second.id,
              damage: actual, targetHp: second.currentHp });
          }
        }
        break;
      }

      case 'EXECUTE': {
        // +50% damage to enemies below 30% HP
        if (target.currentHp > 0 && target.currentHp / target.maxHp < 0.3) {
          const bonusDmg = Math.round(calcDamage(nine.atk, target.def) * 0.5);
          const actual = dealDamage(target, bonusDmg, nine);
          if (actual > 0) {
            events.push({ type: 'attack', source: nine.id, target: target.id,
              damage: actual, effect: 'EXECUTE', targetHp: target.currentHp });
          }
        }
        break;
      }

      case 'PIERCE': {
        // Handled in main attack — bypasses WARD and BARRIER
        // (flag checked in main attack loop)
        break;
      }

      // ── DEFENSE EFFECTS ──

      case 'HEAL': {
        const healTarget1 = [...allies, nine]
          .filter(a => a.isAlive)
          .sort((a, b) => a.currentHp - b.currentHp)[0];
        if (healTarget1) {
          const healed = healTarget(healTarget1, value || 15);
          if (healed > 0) {
            events.push({ type: 'effect_heal', source: nine.id, target: healTarget1.id,
              amount: healed, targetHp: healTarget1.currentHp });
          }
        }
        break;
      }

      case 'WARD': {
        if (!nine.wardActive) {
          nine.wardActive = true;
          // Auto-expire after duration
          setTimeout(() => { nine.wardActive = false; }, duration);
          events.push({ type: 'effect_ward', source: nine.id, target: nine.id, duration });
        }
        break;
      }

      case 'ANCHOR': {
        if (!nine.anchorActive) {
          nine.anchorActive = true;
          setTimeout(() => { nine.anchorActive = false; }, duration);
          events.push({ type: 'effect_anchor', source: nine.id, target: nine.id, duration });
        }
        break;
      }

      case 'THORNS': {
        // Passive: handled when this Nine takes damage (see dealDamageWithThorns)
        // We just mark it on the Nine
        nine._hasThorns = value || 15;
        break;
      }

      case 'BARRIER': {
        if (nine.barrierHp <= 0) {
          nine.barrierHp = value || 40;
          events.push({ type: 'effect_barrier', source: nine.id, target: nine.id,
            amount: nine.barrierHp });
        }
        break;
      }

      // ── CONTROL EFFECTS ──

      case 'SILENCE': {
        const silenceTarget = targetHighestAtk(enemies);
        if (silenceTarget && !silenceTarget.silenced) {
          silenceTarget.silenced = true;
          setTimeout(() => { silenceTarget.silenced = false; }, duration);
          events.push({ type: 'effect_silence', source: nine.id, target: silenceTarget.id, duration });
        }
        break;
      }

      case 'HEX': {
        // -10 ATK per stack, max 3
        if (target._hexStacks === undefined) target._hexStacks = 0;
        if (target._hexStacks < 3) {
          target._hexStacks++;
          target.atk = Math.max(0, target.atk - 10);
          setTimeout(() => {
            target._hexStacks = Math.max(0, (target._hexStacks || 0) - 1);
            target.atk += 10; // restore
          }, duration);
          events.push({ type: 'effect_hex', source: nine.id, target: target.id,
            stacks: target._hexStacks });
        }
        break;
      }

      case 'WEAKEN': {
        if (!target._weakened) {
          target._weakened = true;
          const origAtk = target.atk;
          target.atk = Math.round(target.atk * 0.5);
          setTimeout(() => {
            target.atk = origAtk;
            target._weakened = false;
          }, duration);
          events.push({ type: 'effect_weaken', source: nine.id, target: target.id, duration });
        }
        break;
      }

      case 'DRAIN': {
        // 5% of damage dealt → heal self
        const drainPct = 0.05;
        // Use last damage dealt (tracked on Nine)
        const drainAmount = Math.round((nine._lastDamageDealt || 0) * drainPct);
        if (drainAmount > 0) {
          const healed = healTarget(nine, drainAmount);
          if (healed > 0) {
            events.push({ type: 'effect_drain', source: nine.id, target: nine.id, amount: healed });
          }
        }
        break;
      }

      case 'FEAST': {
        // Handled on KO events — mark this Nine as having FEAST
        nine._hasFeast = true;
        break;
      }

      case 'SLOW': {
        if (!target._slowed) {
          target._slowed = true;
          target.spd = Math.max(0, target.spd - 15);
          target.attackInterval = getAttackInterval(target.spd);
          setTimeout(() => {
            target.spd += 15;
            target.attackInterval = getAttackInterval(target.spd);
            target._slowed = false;
          }, duration);
          events.push({ type: 'effect_slow', source: nine.id, target: target.id, duration });
        }
        break;
      }

      case 'MARK': {
        const markTarget = targetHighestHp(enemies);
        if (markTarget && !markTarget._marked) {
          markTarget._marked = true;
          setTimeout(() => { markTarget._marked = false; }, duration);
          events.push({ type: 'effect_mark', source: nine.id, target: markTarget.id, duration });
        }
        break;
      }

      // ── TEMPO EFFECTS ──

      case 'HASTE': {
        if (!nine._hasted) {
          nine._hasted = true;
          nine.spd += 10;
          nine.attackInterval = getAttackInterval(nine.spd);
          setTimeout(() => {
            nine.spd -= 10;
            nine.attackInterval = getAttackInterval(nine.spd);
            nine._hasted = false;
          }, duration);
          events.push({ type: 'effect_haste', source: nine.id, target: nine.id, duration });
        }
        break;
      }

      case 'STEALTH': {
        if (!nine._stealthed) {
          nine._stealthed = true;
          setTimeout(() => { nine._stealthed = false; }, duration);
          events.push({ type: 'effect_stealth', source: nine.id, target: nine.id, duration });
        }
        break;
      }

      // ── ATTRITION EFFECTS ──

      case 'POISON': {
        // DOT: +3 per 3s for 12s, stacks x3
        if (target._poisonStacks === undefined) target._poisonStacks = 0;
        if (target._poisonStacks < 3) {
          target._poisonStacks++;
          const poisonVal = value || 3;
          const poisonInterval = setInterval(() => {
            if (!target.isAlive) { clearInterval(poisonInterval); return; }
            const dmg = dealDamage(target, poisonVal, nine);
            if (dmg > 0) {
              broadcast(target._zoneId, 'arena:tick', [{
                type: 'dot_damage', source: nine.id, target: target.id,
                damage: dmg, effect: 'POISON', targetHp: target.currentHp
              }]);
            }
          }, 3000);
          // Clear after 12s
          setTimeout(() => {
            clearInterval(poisonInterval);
            target._poisonStacks = Math.max(0, (target._poisonStacks || 0) - 1);
          }, 12000);
          events.push({ type: 'effect_poison', source: nine.id, target: target.id,
            stacks: target._poisonStacks });
        }
        break;
      }

      case 'CORRODE': {
        // Passive aura: -1 max HP to all enemies every 10s (permanent)
        // Set up once, runs while Nine is alive
        if (!nine._corrodeActive) {
          nine._corrodeActive = true;
          nine._corrodeTimer = setInterval(() => {
            if (!nine.isAlive) { clearInterval(nine._corrodeTimer); nine._corrodeActive = false; return; }
            const currentEnemies = getEnemies(zoneNines, nine);
            for (const enemy of currentEnemies) {
              enemy.maxHp = Math.max(1, enemy.maxHp - 1);
              enemy.currentHp = Math.min(enemy.currentHp, enemy.maxHp);
            }
          }, 10000);
        }
        break;
      }

      // ── TEAM EFFECTS ──

      case 'INSPIRE': {
        // +3 ATK, +3 SPD to all allies for 10s
        const allAllies = [...allies, nine].filter(a => a.isAlive);
        for (const ally of allAllies) {
          if (!ally._inspired) {
            ally._inspired = true;
            ally.atk += 3;
            ally.spd += 3;
            ally.attackInterval = getAttackInterval(ally.spd);
            setTimeout(() => {
              ally.atk -= 3;
              ally.spd -= 3;
              ally.attackInterval = getAttackInterval(ally.spd);
              ally._inspired = false;
            }, duration);
          }
        }
        events.push({ type: 'effect_inspire', source: nine.id, target: nine.id });
        break;
      }

      case 'BLESS': {
        // Heal 3 lowest HP allies per attack
        const blessTargets = lowestHpAllies([...allies, nine].filter(a => a.isAlive), 3);
        for (const bt of blessTargets) {
          const healed = healTarget(bt, value || 5);
          if (healed > 0) {
            events.push({ type: 'effect_bless', source: nine.id, target: bt.id,
              amount: healed, targetHp: bt.currentHp });
          }
        }
        break;
      }

      case 'TAUNT': {
        if (!nine._taunting) {
          nine._taunting = true;
          setTimeout(() => { nine._taunting = false; }, duration);
          events.push({ type: 'effect_taunt', source: nine.id, target: nine.id, duration });
        }
        break;
      }

      case 'REFLECT': {
        if (!nine._reflectActive) {
          nine._reflectActive = true;
          setTimeout(() => { nine._reflectActive = false; }, duration);
          events.push({ type: 'effect_reflect', source: nine.id, target: nine.id, duration });
        }
        break;
      }

      case 'CLEANSE': {
        // Remove all debuffs
        nine.silenced = false;
        nine._weakened = false;
        nine._slowed = false;
        nine._marked = false;
        nine._poisonStacks = 0;
        if (nine._hexStacks) {
          nine.atk += nine._hexStacks * 10;
          nine._hexStacks = 0;
        }
        events.push({ type: 'effect_cleanse', source: nine.id, target: nine.id });
        break;
      }

      // ── WILD EFFECTS ──

      case 'RESURRECT': {
        // Handled on KO — mark this Nine as having RESURRECT
        nine._hasResurrect = true;
        break;
      }

      // Catch-all for unimplemented effects
      default: {
        // SURGE, SWIFT, DODGE, PHASE, TETHER, AMPLIFY, SHATTER, INFECT,
        // OVERCHARGE, MIRROR, PARASITE, GRAVITY — to be implemented
        // For now just emit a generic event so the arena viewer sees something
        if (name && name !== 'SURGE') {
          events.push({ type: `effect_${name.toLowerCase()}`, source: nine.id, target: target?.id || nine.id });
        }
        break;
      }
    }
  }

  // SURGE is passive — always active, handled at stat calc time
  // (already +50% ATK, +25% damage taken baked into createNineState for future)
}

// ═══════════════════════════════════════
// BROADCAST HELPER
// ═══════════════════════════════════════

function broadcast(zoneId, event, data) {
  try {
    if (global.__arenaSocket) {
      global.__arenaSocket._broadcastToZone(zoneId, event, data);
    }
  } catch (e) {
    // Socket broadcast is non-critical
  }
}

// ═══════════════════════════════════════
// LOAD ZONE STATE FROM DATABASE
// ═══════════════════════════════════════

async function loadZoneState(zoneId) {
  // Get all active deployments on this zone
  const { data: deployments, error } = await supabase
    .from('zone_deployments')
    .select(`
      id, player_id, nine_id, zone_id, guild_tag, is_active, is_mercenary,
      player:player_id(twitter_handle, guild_tag)
    `)
    .eq('zone_id', zoneId)
    .eq('is_active', true);

  if (error || !deployments?.length) return new Map();

  const nines = new Map();

  for (const dep of deployments) {
    // Get Nine's house
    const { data: nine } = await supabase
      .from('nines')
      .select('id, name, house_key, level')
      .eq('player_id', dep.player_id)
      .single();

    if (!nine) continue;

    // Get house stats
    const { data: house } = await supabase
      .from('houses')
      .select('*')
      .or(`slug.eq.${nine.house_key},name.ilike.%${nine.house_key}%`)
      .single();

    if (!house) continue;

    // Get equipped cards for this deployment
    const { data: slots } = await supabase
      .from('zone_card_slots')
      .select(`
        card_id,
        card:card_id(
          id, sharpness, rarity,
          spell:spell_id(name, spell_type, house, rarity, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects)
        )
      `)
      .eq('deployment_id', dep.id)
      .eq('is_active', true);

    const cards = (slots || []).map(s => s.card).filter(Boolean);

    // Build deployment with player name
    const depWithName = {
      ...dep,
      player_name: nine.name || dep.player?.twitter_handle || `Nine #${dep.player_id}`,
      guild_tag: dep.guild_tag || dep.player?.guild_tag || null,
    };

    const nineState = createNineState(depWithName, cards, house);
    nineState._zoneId = zoneId; // for broadcast reference
    nines.set(dep.player_id, nineState);
  }

  return nines;
}

// ═══════════════════════════════════════
// MAIN TICK — runs every 2 seconds
// ═══════════════════════════════════════

async function tick() {
  const now = Date.now();

  // Get all active zones
  const { data: zones } = await supabase
    .from('zones')
    .select('id')
    .eq('is_active', true);

  if (!zones?.length) return;

  for (const zone of zones) {
    const zoneId = zone.id;

    // Initialize zone state if needed
    if (!zoneState[zoneId]) {
      zoneState[zoneId] = {
        nines: await loadZoneState(zoneId),
        lastSnapshot: now,
        lastReload: now,
      };
    }

    // Reload zone state every 60s to pick up new deploys/withdrawals
    if (now - (zoneState[zoneId].lastReload || 0) > 60000) {
      const freshNines = await loadZoneState(zoneId);

      // Merge: keep HP of existing Nines, add new ones, remove withdrawn ones
      const oldNines = zoneState[zoneId].nines;
      for (const [id, fresh] of freshNines) {
        if (oldNines.has(id)) {
          // Keep combat state, just update name/guild if changed
          const old = oldNines.get(id);
          old.name = fresh.name;
          old.guild = fresh.guild;
        } else {
          // New deployment
          freshNines.get(id)._zoneId = zoneId;
          oldNines.set(id, fresh);
        }
      }
      // Remove Nines no longer deployed
      for (const [id] of oldNines) {
        if (!freshNines.has(id)) {
          oldNines.delete(id);
        }
      }
      zoneState[zoneId].lastReload = now;
    }

    const nines = zoneState[zoneId].nines;
    if (nines.size < 2) continue; // Need at least 2 Nines for combat

    // Check if there are at least 2 different guilds
    const guilds = new Set([...nines.values()].filter(n => n.isAlive).map(n => n.guild));
    if (guilds.size < 2) continue; // Need opposing guilds

    // ── Process attacks for Nines whose timer has elapsed ──
    const tickEvents = [];

    for (const [nineId, nine] of nines) {
      if (!nine.isAlive) continue;
      if (now < nine.nextAttackAt) continue;

      // Reset attack timer
      nine.nextAttackAt = now + nine.attackInterval * 1000;

      // Find target — check for TAUNT first
      const enemies = getEnemies(nines, nine);
      if (!enemies.length) continue;

      // TAUNT: if any enemy is taunting, must target them
      let target;
      const taunter = enemies.find(e => e._taunting && e.isAlive);

      // STEALTH: filter out stealthed enemies (unless taunting)
      const targetable = enemies.filter(e => !e._stealthed || e._taunting);
      if (taunter) {
        target = taunter;
      } else if (targetable.length > 0) {
        target = targetLowestHp(targetable);
      } else {
        continue; // All enemies stealthed
      }

      // Check for PIERCE — bypasses WARD and BARRIER
      const hasPierce = nine.effects.some(e => parseEffect(e.tag).name === 'PIERCE');

      // Calculate damage
      let damage = calcDamage(nine.atk, target.def);
      const isCrit = rollCrit(nine.luck);
      if (isCrit) damage *= 2;

      // MARK bonus: +25% damage
      if (target._marked) damage = Math.round(damage * 1.25);

      // Apply damage (PIERCE skips WARD/BARRIER)
      let actualDamage;
      if (hasPierce) {
        // Bypass shields
        if (nine.anchorActive) {
          target.currentHp = Math.max(1, target.currentHp - damage);
        } else {
          target.currentHp = Math.max(0, target.currentHp - damage);
        }
        actualDamage = damage;
      } else {
        actualDamage = dealDamage(target, damage, nine);
      }

      nine._lastDamageDealt = actualDamage;

      // Emit attack event
      tickEvents.push({
        type: 'attack',
        source: nine.id,
        target: target.id,
        damage: actualDamage,
        isCrit,
        targetHp: target.currentHp,
        targetMaxHp: target.maxHp,
      });

      // THORNS: reflect damage back to attacker
      if (target._hasThorns && actualDamage > 0) {
        const thornsDmg = dealDamage(nine, target._hasThorns, target);
        if (thornsDmg > 0) {
          tickEvents.push({
            type: 'reflected_damage', source: target.id, target: nine.id,
            damage: thornsDmg, effect: 'THORNS', targetHp: nine.currentHp
          });
        }
      }

      // REFLECT: bounce full damage back
      if (target._reflectActive && actualDamage > 0) {
        target._reflectActive = false;
        const reflectDmg = dealDamage(nine, actualDamage, target);
        if (reflectDmg > 0) {
          tickEvents.push({
            type: 'reflected_damage', source: target.id, target: nine.id,
            damage: reflectDmg, effect: 'REFLECT', targetHp: nine.currentHp
          });
        }
      }

      // Process card effects
      processEffects(nine, target, nines, tickEvents);

      // ── KO CHECK on target ──
      if (target.currentHp <= 0 && target.isAlive) {
        // RESURRECT check
        if (target._hasResurrect && !target._resurrectUsed) {
          target._resurrectUsed = true;
          target.currentHp = Math.round(target.maxHp * 0.3);
          tickEvents.push({ type: 'effect_resurrect', source: target.id, target: target.id,
            targetHp: target.currentHp });
        } else {
          target.isAlive = false;
          target.koAt = now;

          tickEvents.push({ type: 'ko', source: nine.id, target: target.id });

          // FEAST: heal Nines with FEAST effect
          for (const [, n] of nines) {
            if (n.isAlive && n._hasFeast && n.guild !== target.guild) {
              const feastHeal = Math.round(target.maxHp * 0.15);
              const healed = healTarget(n, feastHeal);
              if (healed > 0) {
                tickEvents.push({ type: 'effect_heal', source: n.id, target: n.id,
                  amount: healed, effect: 'FEAST', targetHp: n.currentHp });
              }
            }
          }

          // SHATTER: on death, deal 10% max HP to all enemies
          if (target.effects.some(e => parseEffect(e.tag).name === 'SHATTER')) {
            const shatterDmg = Math.round(target.maxHp * 0.1);
            const shatterEnemies = getEnemies(nines, target);
            for (const se of shatterEnemies) {
              const dmg = dealDamage(se, shatterDmg, target);
              if (dmg > 0) {
                tickEvents.push({ type: 'attack', source: target.id, target: se.id,
                  damage: dmg, effect: 'SHATTER', targetHp: se.currentHp });
              }
            }
          }

          // INFECT: on KO, spread POISON to all enemies
          if (target.effects.some(e => parseEffect(e.tag).name === 'INFECT')) {
            const infectEnemies = getEnemies(nines, target);
            for (const ie of infectEnemies) {
              if ((ie._poisonStacks || 0) < 3) {
                ie._poisonStacks = (ie._poisonStacks || 0) + 1;
                tickEvents.push({ type: 'effect_poison', source: target.id, target: ie.id,
                  stacks: ie._poisonStacks, effect: 'INFECT' });
              }
            }
          }

          // Broadcast KO separately for arena viewer
          broadcast(zoneId, 'arena:ko', {
            nine_id: target.id,
            killed_by: nine.id,
            zone_id: zoneId,
          });

          // Mark deployment inactive in DB (async, non-blocking)
          supabaseAdmin
            .from('zone_deployments')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', target.deploymentId)
            .then(() => {})
            .catch(() => {});
        }
      }

      // ── KO CHECK on attacker (from THORNS/REFLECT) ──
      if (nine.currentHp <= 0 && nine.isAlive) {
        nine.isAlive = false;
        nine.koAt = now;
        tickEvents.push({ type: 'ko', source: target.id, target: nine.id });
        broadcast(zoneId, 'arena:ko', { nine_id: nine.id, killed_by: target.id, zone_id: zoneId });
        supabaseAdmin
          .from('zone_deployments')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', nine.deploymentId)
          .then(() => {}).catch(() => {});
      }
    }

    // Broadcast tick events
    if (tickEvents.length > 0) {
      broadcast(zoneId, 'arena:tick', tickEvents);
    }
  }

  // ── SNAPSHOT CHECK ──
  if (now >= nextSnapshotAt) {
    await processSnapshot();
    nextSnapshotAt = now + SNAPSHOT_INTERVAL;
  }
}

// ═══════════════════════════════════════
// SNAPSHOT — 15-minute zone control scoring
// ═══════════════════════════════════════

async function processSnapshot() {
  console.log('📸 Processing 15-minute snapshot...');

  for (const [zoneId, state] of Object.entries(zoneState)) {
    const nines = state.nines;
    if (nines.size === 0) continue;

    // Calculate guild HP totals
    const guildHp = {};
    for (const [, nine] of nines) {
      if (!nine.isAlive) continue;
      const guild = nine.guild || 'Lone Wolf';
      guildHp[guild] = (guildHp[guild] || 0) + nine.currentHp;
    }

    // Find winner (highest total HP)
    const sorted = Object.entries(guildHp).sort((a, b) => b[1] - a[1]);
    const winner = sorted.length > 0 ? sorted[0][0] : null;

    // Broadcast snapshot
    broadcast(zoneId, 'arena:snapshot', {
      zone_id: parseInt(zoneId),
      guild_power: guildHp,
      winner_guild: winner,
      next_snapshot_at: Date.now() + SNAPSHOT_INTERVAL,
      nines: [...nines.values()].map(n => ({
        id: n.id,
        guild: n.guild,
        current_hp: n.currentHp,
        max_hp: n.maxHp,
        is_alive: n.isAlive,
      })),
    });

    // Update zone control in DB
    if (winner) {
      try {
        await supabaseAdmin
          .from('zones')
          .update({ controlling_guild: winner, updated_at: new Date().toISOString() })
          .eq('id', parseInt(zoneId));
      } catch (e) {
        console.error(`Snapshot DB error zone ${zoneId}:`, e.message);
      }
    }

    // Degrade sharpness on all deployed cards
    try {
      const deploymentIds = [...nines.values()].map(n => n.deploymentId).filter(Boolean);
      if (deploymentIds.length > 0) {
        // Get all card slots for these deployments
        const { data: slots } = await supabase
          .from('zone_card_slots')
          .select('card_id')
          .in('deployment_id', deploymentIds)
          .eq('is_active', true);

        const cardIds = (slots || []).map(s => s.card_id).filter(Boolean);
        if (cardIds.length > 0) {
          // Reduce sharpness by 1%
          await supabaseAdmin.rpc('degrade_sharpness', { card_ids: cardIds, amount: SHARPNESS_LOSS });
        }
      }
    } catch (e) {
      // Sharpness degradation is non-critical
      console.error('Sharpness degrade error:', e.message);
    }

    console.log(`📸 Zone ${zoneId}: ${winner || 'no winner'} — ${JSON.stringify(guildHp)}`);
  }
}

// ═══════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════

function startCombatEngine() {
  if (isRunning) return;
  isRunning = true;
  nextSnapshotAt = Date.now() + SNAPSHOT_INTERVAL;

  tickTimer = setInterval(async () => {
    try {
      await tick();
    } catch (e) {
      console.error('⚔️ Combat tick error:', e.message);
    }
  }, TICK_INTERVAL_MS);

  console.log('⚔️ V2 Combat Engine started — 2s ticks, 15-min snapshots');
}

function stopCombatEngine() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
  isRunning = false;
  console.log('⚔️ V2 Combat Engine stopped');
}

function getNextSnapshotAt() {
  return nextSnapshotAt || Date.now() + SNAPSHOT_INTERVAL;
}

// Legacy compat methods (used by index.js)
function getNextCycleAt() { return getNextSnapshotAt(); }
function getCycleIntervalMs() { return SNAPSHOT_INTERVAL; }

// Force reload a zone's state (for admin use)
async function reloadZone(zoneId) {
  zoneState[zoneId] = {
    nines: await loadZoneState(zoneId),
    lastSnapshot: Date.now(),
    lastReload: Date.now(),
  };
  return zoneState[zoneId].nines.size;
}

// Get zone combat status (for API)
function getZoneStatus(zoneId) {
  const state = zoneState[zoneId];
  if (!state) return { active: false, nines: 0 };

  const alive = [...state.nines.values()].filter(n => n.isAlive);
  const guilds = {};
  for (const n of alive) {
    guilds[n.guild] = (guilds[n.guild] || 0) + n.currentHp;
  }

  return {
    active: true,
    nines: state.nines.size,
    alive: alive.length,
    guilds,
    next_snapshot_at: nextSnapshotAt,
  };
}

module.exports = {
  startCombatEngine,
  stopCombatEngine,
  getNextSnapshotAt,
  getNextCycleAt,       // legacy compat
  getCycleIntervalMs,   // legacy compat
  reloadZone,
  getZoneStatus,
};