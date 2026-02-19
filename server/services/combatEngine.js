// ═══════════════════════════════════════════════════════
// server/services/combatEngine.js
// V3 Combat Engine — 15-Minute Cycle Resolution
//
// Every 15 minutes, ALL zones with active deployments
// run a combat cycle:
//   Phase 1: Card effects resolve (SPD order)
//   Phase 2: Auto-attack (each Nine hits lowest HP enemy)
//   Phase 3: Effects tick (POISON, BURN, HEAL, etc.)
//   Phase 4: Knockout check (0 HP = removed)
//   Phase 5: Power calculation (surviving HP = zone control)
//   Step 6:  Durability tick (cards lose 1 charge)
//   Step 7:  Log the cycle
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const { useCharge } = require('./cardDurability');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── REGION BONUSES ──
// Guild controlling 2/3 zones in a region gets these bonuses
const REGION_BONUSES = {
  1: { name: 'Ember Wastes',      bonus: 'atk',     value: 2 },    // +2 ATK
  2: { name: 'Darktide Depths',   bonus: 'drain',   value: 1 },    // steal 1 HP/cycle
  3: { name: 'Stonebark Wilds',   bonus: 'hp',      value: 4 },    // +4 HP
  4: { name: 'Ashenvale Peaks',   bonus: 'spd',     value: 2 },    // +2 SPD
  5: { name: 'Stormrage Spire',   bonus: 'crit',    value: 15 },   // 15% crit chance
  6: { name: 'Nighthollow Shade', bonus: 'silence',  value: 20 },  // 20% silence enemy cards
  7: { name: 'Dawnbringer Rise',  bonus: 'heal',    value: 2 },    // +2 HP passive heal
  8: { name: 'Manastorm Nexus',   bonus: 'amplify', value: 25 },   // +25% effect strength
  9: { name: 'Plaguemire Bog',    bonus: 'poison',  value: 1 },    // 1 poison/cycle on enemies
};

// ── EFFECT HANDLERS ──
// Each effect returns { damage, heal, status } applied to target/self
const EFFECT_HANDLERS = {
  BURN:    (value) => ({ damage: value || 3, type: 'fire' }),
  POISON:  (value) => ({ damage: value || 2, type: 'poison', ticks: true }),
  HEAL:    (value) => ({ heal: value || 3 }),
  WARD:    ()      => ({ status: 'shielded', absorb: 3 }),
  SILENCE: ()      => ({ status: 'silenced' }),
  HEX:     ()      => ({ status: 'hexed', atkReduction: 2 }),
  DRAIN:   (value) => ({ damage: value || 2, heal: value || 2 }),
  SIPHON:  (value) => ({ damage: value || 1, heal: value || 1 }),
  WEAKEN:  (value) => ({ status: 'weakened', atkReduction: value || 3 }),
  BLESS:   (value) => ({ heal: value || 2, status: 'blessed' }),
  AMPLIFY: ()      => ({ status: 'amplified', atkBoost: 2 }),
  INSPIRE: ()      => ({ status: 'inspired', teamHeal: 1 }),
  ANCHOR:  ()      => ({ status: 'anchored', damageReduction: 2 }),
  THORNS:  (value) => ({ status: 'thorns', reflectDamage: value || 2 }),
  CRIT:    ()      => ({ status: 'crit_ready' }),
  SURGE:   ()      => ({ status: 'surging', atkBoost: 3 }),
  HASTE:   ()      => ({ status: 'hasted', extraAttack: true }),
  LEECH:   (value) => ({ damage: value || 2, heal: Math.floor((value || 2) / 2) }),
  STUN:    ()      => ({ status: 'stunned' }),
  FEAR:    ()      => ({ status: 'feared', atkReduction: 4 }),
  DOOM:    ()      => ({ status: 'doomed', tickDamage: 5, delay: 2 }),
  REFLECT: ()      => ({ status: 'reflecting', reflectPct: 50 }),
  CLEANSE: ()      => ({ status: 'cleansed' }),
  BARRIER: (value) => ({ status: 'barrier', absorb: value || 5 }),
};

// ═══════════════════════════════════════════
// MAIN: Run combat cycle across ALL zones
// Called by scheduler every 15 minutes
// ═══════════════════════════════════════════
async function runCombatCycle() {
  const startTime = Date.now();
  console.log(`[Combat] ⚔️ Starting combat cycle...`);

  try {
    // Get all zones with active deployments
    const { data: activeDeployments } = await supabase
      .from('zone_deployments')
      .select('zone_id')
      .eq('is_active', true);

    if (!activeDeployments || activeDeployments.length === 0) {
      console.log('[Combat] No active deployments — skipping cycle');
      return { zones_processed: 0 };
    }

    // Get unique zone IDs
    const zoneIds = [...new Set(activeDeployments.map(d => d.zone_id))];
    console.log(`[Combat] Processing ${zoneIds.length} active zones`);

    // Get region control data for bonuses
    const regionBonuses = await getRegionBonuses();

    let totalKnockouts = 0;
    let totalZonesProcessed = 0;

    // Process each zone
    for (const zoneId of zoneIds) {
      try {
        const result = await processZoneCombat(zoneId, regionBonuses);
        totalKnockouts += result.knockouts;
        totalZonesProcessed++;
      } catch (zoneErr) {
        console.error(`[Combat] Zone ${zoneId} error:`, zoneErr.message);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Combat] ✅ Cycle complete: ${totalZonesProcessed} zones, ${totalKnockouts} knockouts, ${elapsed}ms`);

    return {
      zones_processed: totalZonesProcessed,
      knockouts: totalKnockouts,
      elapsed_ms: elapsed,
    };

  } catch (err) {
    console.error('[Combat] Cycle failed:', err);
    return { error: err.message };
  }
}

// ═══════════════════════════════════════════
// Process combat for a single zone
// ═══════════════════════════════════════════
async function processZoneCombat(zoneId, regionBonuses) {
  // Get all active deployments on this zone with their cards
  const { data: deployments } = await supabase
    .from('zone_deployments')
    .select(`
      *,
      nine:nine_id(base_atk, base_hp, base_spd, house_id),
      player:player_id(twitter_handle, guild_tag, school_id),
      card_slots:zone_card_slots(
        card_id, is_active,
        card:card_id(
          spell_name, spell_house, spell_type, spell_tier, spell_effects, rarity,
          spell:spell_id(base_atk, base_hp, bonus_effects)
        )
      )
    `)
    .eq('zone_id', zoneId)
    .eq('is_active', true);

  if (!deployments || deployments.length < 1) {
    return { knockouts: 0 };
  }

  // Build combatant objects
  const combatants = deployments.map(d => {
    const activeSlot = (d.card_slots || []).find(s => s.is_active);
    const card = activeSlot?.card || null;
    const spell = card?.spell || null;

    // Base stats from Nine
    let atk = d.nine?.base_atk || 3;
    let hp = d.current_hp;
    let maxHp = d.max_hp || d.nine?.base_hp || 20;
    let spd = d.nine?.base_spd || 5;

    // Add card stats
    if (spell) {
      atk += spell.base_atk || 0;
      hp = hp; // Card HP doesn't add to current HP, it adds to max
      maxHp += spell.base_hp || 0;
    }

    // Parse card effects
    let effects = [];
    if (card?.spell_effects) {
      effects = Array.isArray(card.spell_effects) ? card.spell_effects : [];
    }

    return {
      deployment_id: d.id,
      player_id: d.player_id,
      nine_id: d.nine_id,
      zone_id: zoneId,
      guild_tag: d.guild_tag || d.player?.guild_tag || 'unaffiliated',
      twitter_handle: d.player?.twitter_handle || 'unknown',
      house_id: d.nine?.house_id || d.player?.school_id,
      atk,
      hp,
      maxHp,
      spd,
      effects,
      card_id: activeSlot?.card_id || null,
      card_name: card?.spell_name || null,
      card_rarity: card?.rarity || null,
      statuses: [],       // Applied this cycle
      damage_dealt: 0,
      damage_taken: 0,
      healing_done: 0,
      knocked_out: false,
    };
  });

  // Check if there are multiple guilds (combat only happens with opposition)
  const guilds = [...new Set(combatants.map(c => c.guild_tag))];

  // Apply region bonuses
  const zone = await getZoneRegion(zoneId);
  if (zone?.region_id && regionBonuses[zone.region_id]) {
    const bonusGuild = regionBonuses[zone.region_id];
    if (bonusGuild) {
      applyRegionBonus(combatants, zone.region_id, bonusGuild);
    }
  }

  // Sort by SPD (highest first) for effect resolution order
  combatants.sort((a, b) => b.spd - a.spd);

  const combatLog = [];

  // ── PHASE 1: Card Effects Resolve ──
  for (const c of combatants) {
    if (c.hp <= 0 || c.effects.length === 0) continue;

    // Check if silenced
    if (c.statuses.includes('silenced')) {
      combatLog.push({ phase: 'effects', actor: c.twitter_handle, result: 'SILENCED — effects blocked' });
      continue;
    }

    for (const effect of c.effects) {
      const handler = EFFECT_HANDLERS[effect];
      if (!handler) continue;

      const result = handler();

      // Offensive effects target enemies
      if (result.damage) {
        const enemies = combatants.filter(e => e.guild_tag !== c.guild_tag && e.hp > 0);
        if (enemies.length > 0) {
          // Target lowest HP enemy
          const target = enemies.reduce((min, e) => e.hp < min.hp ? e : min, enemies[0]);
          let dmg = result.damage;

          // Check ANCHOR damage reduction
          if (target.statuses.includes('anchored')) dmg = Math.max(1, dmg - 2);
          // Check WARD absorb
          if (target.statuses.includes('shielded')) { dmg = Math.max(0, dmg - 3); }

          target.hp = Math.max(0, target.hp - dmg);
          target.damage_taken += dmg;
          c.damage_dealt += dmg;

          combatLog.push({
            phase: 'effects', actor: c.twitter_handle, effect,
            target: target.twitter_handle, damage: dmg,
          });

          // DRAIN/SIPHON/LEECH: heal self
          if (result.heal) {
            c.hp = Math.min(c.maxHp, c.hp + result.heal);
            c.healing_done += result.heal;
          }
        }
      }

      // Healing effects target self or allies
      if (result.heal && !result.damage) {
        const allies = combatants.filter(a => a.guild_tag === c.guild_tag && a.hp > 0 && a.hp < a.maxHp);
        if (allies.length > 0) {
          // Heal lowest HP ally
          const target = allies.reduce((min, a) => a.hp < min.hp ? a : min, allies[0]);
          const healAmt = result.heal;
          target.hp = Math.min(target.maxHp, target.hp + healAmt);
          c.healing_done += healAmt;

          combatLog.push({
            phase: 'effects', actor: c.twitter_handle, effect,
            target: target.twitter_handle, heal: healAmt,
          });
        }
      }

      // Status effects on enemies
      if (result.status && (effect === 'SILENCE' || effect === 'HEX' || effect === 'STUN' || effect === 'FEAR' || effect === 'WEAKEN')) {
        const enemies = combatants.filter(e => e.guild_tag !== c.guild_tag && e.hp > 0);
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          target.statuses.push(result.status);
          if (result.atkReduction) target.atk = Math.max(1, target.atk - result.atkReduction);

          combatLog.push({
            phase: 'effects', actor: c.twitter_handle, effect,
            target: target.twitter_handle, status: result.status,
          });
        }
      }

      // Buff statuses on self
      if (result.status && (effect === 'AMPLIFY' || effect === 'SURGE' || effect === 'CRIT')) {
        c.statuses.push(result.status);
        if (result.atkBoost) c.atk += result.atkBoost;
      }

      // INSPIRE: heal all allies by 1
      if (result.teamHeal) {
        const allies = combatants.filter(a => a.guild_tag === c.guild_tag && a.hp > 0);
        allies.forEach(a => {
          a.hp = Math.min(a.maxHp, a.hp + result.teamHeal);
        });
      }
    }
  }

  // ── PHASE 2: Auto-Attack ──
  for (const c of combatants) {
    if (c.hp <= 0) continue;
    if (c.statuses.includes('stunned')) {
      combatLog.push({ phase: 'attack', actor: c.twitter_handle, result: 'STUNNED — cannot attack' });
      continue;
    }

    const enemies = combatants.filter(e => e.guild_tag !== c.guild_tag && e.hp > 0);
    if (enemies.length === 0) continue;

    // Target lowest HP enemy
    const target = enemies.reduce((min, e) => e.hp < min.hp ? e : min, enemies[0]);

    let damage = c.atk;

    // Crit check
    if (c.statuses.includes('crit_ready') && Math.random() < 0.5) {
      damage = Math.floor(damage * 1.5);
      combatLog.push({ phase: 'attack', actor: c.twitter_handle, result: 'CRIT!' });
    }

    // ANCHOR reduces damage
    if (target.statuses.includes('anchored')) damage = Math.max(1, damage - 2);

    // THORNS reflect
    if (target.statuses.includes('thorns')) {
      const reflected = 2;
      c.hp = Math.max(0, c.hp - reflected);
      c.damage_taken += reflected;
    }

    target.hp = Math.max(0, target.hp - damage);
    target.damage_taken += damage;
    c.damage_dealt += damage;

    combatLog.push({
      phase: 'attack', actor: c.twitter_handle,
      target: target.twitter_handle, damage,
      target_hp_remaining: target.hp,
    });

    // HASTE: extra attack
    if (c.statuses.includes('hasted') && enemies.filter(e => e.hp > 0).length > 0) {
      const target2 = enemies.filter(e => e.hp > 0).reduce((min, e) => e.hp < min.hp ? e : min, enemies.filter(e => e.hp > 0)[0]);
      const bonusDmg = Math.floor(c.atk * 0.5);
      target2.hp = Math.max(0, target2.hp - bonusDmg);
      target2.damage_taken += bonusDmg;
      c.damage_dealt += bonusDmg;
      combatLog.push({ phase: 'attack', actor: c.twitter_handle, target: target2.twitter_handle, damage: bonusDmg, note: 'HASTE bonus' });
    }
  }

  // ── PHASE 3: Effects Tick (ongoing) ──
  // Already handled inline during Phase 1

  // ── PHASE 4: Knockout Check ──
  let knockouts = 0;
  for (const c of combatants) {
    if (c.hp <= 0 && !c.knocked_out) {
      c.knocked_out = true;
      knockouts++;
      combatLog.push({ phase: 'knockout', player: c.twitter_handle, guild: c.guild_tag });
    }
  }

  // ── PHASE 5: Power Calculation ──
  const guildPower = {};
  for (const c of combatants) {
    if (c.hp <= 0) continue;
    if (!guildPower[c.guild_tag]) guildPower[c.guild_tag] = 0;
    guildPower[c.guild_tag] += c.hp;
  }

  // Find controlling guild (highest total HP)
  let controllingGuild = null;
  let maxPower = 0;
  for (const [guild, power] of Object.entries(guildPower)) {
    if (power > maxPower) {
      maxPower = power;
      controllingGuild = guild;
    }
  }

  // ── UPDATE DATABASE ──

  // Update HP for all combatants
  for (const c of combatants) {
    await supabaseAdmin
      .from('zone_deployments')
      .update({
        current_hp: Math.max(0, c.hp),
        is_active: c.hp > 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', c.deployment_id);
  }

  // ── STEP 6: Durability Tick ──
  // Each active card loses 1 charge
  for (const c of combatants) {
    if (c.card_id) {
      try {
        const chargeResult = await useCharge(c.card_id);
        if (chargeResult && chargeResult.exhausted) {
          // Card exhausted — remove from slot
          await supabaseAdmin
            .from('zone_card_slots')
            .update({ is_active: false })
            .eq('card_id', c.card_id)
            .eq('is_active', true);

          combatLog.push({
            phase: 'durability',
            player: c.twitter_handle,
            card: c.card_name,
            result: 'EXHAUSTED — removed from zone',
          });
        }
      } catch (chargeErr) {
        console.error(`[Combat] Charge error for card ${c.card_id}:`, chargeErr.message);
      }
    }
  }

  // Update zone control
  if (controllingGuild) {
    await supabaseAdmin
      .from('zone_control')
      .upsert({
        zone_id: zoneId,
        guild_tag: controllingGuild,
        total_hp: maxPower,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'zone_id' });
  }

  // ── STEP 7: Log the cycle ──
  // Get next cycle number for this zone
  const { count } = await supabase
    .from('combat_cycles')
    .select('id', { count: 'exact', head: true })
    .eq('zone_id', zoneId);

  await supabaseAdmin
    .from('combat_cycles')
    .insert({
      zone_id: zoneId,
      cycle_number: (count || 0) + 1,
      cycle_data: {
        combatants: combatants.map(c => ({
          player: c.twitter_handle,
          guild: c.guild_tag,
          hp_start: c.current_hp || 0,
          hp_end: Math.max(0, c.hp),
          atk: c.atk,
          damage_dealt: c.damage_dealt,
          damage_taken: c.damage_taken,
          healing_done: c.healing_done,
          card: c.card_name,
          knocked_out: c.knocked_out,
        })),
        guild_power: guildPower,
        controlling_guild: controllingGuild,
        knockouts,
        log: combatLog,
      },
    });

  return { knockouts, controlling_guild: controllingGuild, guild_power: guildPower };
}

// ═══════════════════════════════════════════
// Get zone's region ID
// ═══════════════════════════════════════════
async function getZoneRegion(zoneId) {
  const { data } = await supabase
    .from('zones')
    .select('region_id')
    .eq('id', zoneId)
    .single();
  return data;
}

// ═══════════════════════════════════════════
// Check which guilds control which regions
// Returns { regionId: guildTag } for regions
// where a guild holds 2/3 zones
// ═══════════════════════════════════════════
async function getRegionBonuses() {
  const bonuses = {};

  try {
    // Get zone control data
    const { data: controls } = await supabase
      .from('zone_control')
      .select('zone_id, guild_tag');

    if (!controls || controls.length === 0) return bonuses;

    // Get zone-to-region mapping
    const { data: zones } = await supabase
      .from('zones')
      .select('id, region_id');

    if (!zones) return bonuses;

    const zoneRegionMap = {};
    zones.forEach(z => { zoneRegionMap[z.id] = z.region_id; });

    // Count zones per guild per region
    const regionGuildCounts = {};
    controls.forEach(c => {
      const regionId = zoneRegionMap[c.zone_id];
      if (!regionId) return;
      if (!regionGuildCounts[regionId]) regionGuildCounts[regionId] = {};
      regionGuildCounts[regionId][c.guild_tag] = (regionGuildCounts[regionId][c.guild_tag] || 0) + 1;
    });

    // Find guilds controlling 2+ zones in a region
    for (const [regionId, guilds] of Object.entries(regionGuildCounts)) {
      for (const [guildTag, count] of Object.entries(guilds)) {
        if (count >= 2) {
          bonuses[regionId] = guildTag;
        }
      }
    }
  } catch (err) {
    console.error('[Combat] Region bonus check error:', err.message);
  }

  return bonuses;
}

// ═══════════════════════════════════════════
// Apply region bonus to combatants
// ═══════════════════════════════════════════
function applyRegionBonus(combatants, regionId, bonusGuild) {
  const bonus = REGION_BONUSES[regionId];
  if (!bonus) return;

  combatants.forEach(c => {
    if (c.guild_tag === bonusGuild) {
      // Allied bonus
      switch (bonus.bonus) {
        case 'atk':     c.atk += bonus.value; break;
        case 'hp':      c.maxHp += bonus.value; c.hp += bonus.value; break;
        case 'spd':     c.spd += bonus.value; break;
        case 'heal':    c.hp = Math.min(c.maxHp, c.hp + bonus.value); break;
        case 'crit':    c.statuses.push('crit_ready'); break;
        case 'amplify': c.atk = Math.floor(c.atk * (1 + bonus.value / 100)); break;
      }
    } else {
      // Enemy debuff (for poison/silence/drain regions)
      switch (bonus.bonus) {
        case 'poison':  c.hp = Math.max(0, c.hp - bonus.value); break;
        case 'silence':
          if (Math.random() * 100 < bonus.value) c.statuses.push('silenced');
          break;
        case 'drain':   c.hp = Math.max(0, c.hp - bonus.value); break;
      }
    }
  });
}

// ═══════════════════════════════════════════
// Check region control
// Returns which guild controls a specific region
// ═══════════════════════════════════════════
async function checkRegionControl(regionId) {
  const bonuses = await getRegionBonuses();
  return bonuses[regionId] || null;
}

module.exports = {
  runCombatCycle,
  processZoneCombat,
  checkRegionControl,
  getRegionBonuses,
  REGION_BONUSES,
};