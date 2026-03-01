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
//   Step 7b: Broadcast to arena socket (live viewers)
//   Step 8:  POINTS — award season points
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const { useCharge } = require('./cardDurability');
const { addPoints } = require('./pointsService');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── V5: Fetch equipped item stat bonuses for a player ──
async function getEquippedItemBonuses(playerId) {
  try {
    const { data: nine } = await supabase
      .from('player_nines')
      .select('equipped_fur, equipped_expression, equipped_headwear, equipped_outfit, equipped_weapon, equipped_familiar')
      .eq('player_id', playerId)
      .single();
    if (!nine) return { atk: 0, hp: 0, spd: 0, def: 0, luck: 0 };

    const slugs = [
      nine.equipped_fur, nine.equipped_expression, nine.equipped_headwear,
      nine.equipped_outfit, nine.equipped_weapon, nine.equipped_familiar
    ].filter(Boolean);

    if (slugs.length === 0) return { atk: 0, hp: 0, spd: 0, def: 0, luck: 0 };

    const { data: items } = await supabase.from('items').select('bonus_atk, bonus_hp, bonus_spd, bonus_def, bonus_luck').in('slug', slugs);
    if (!items) return { atk: 0, hp: 0, spd: 0, def: 0, luck: 0 };

    return items.reduce((sum, item) => ({
      atk: sum.atk + (item.bonus_atk || 0),
      hp: sum.hp + (item.bonus_hp || 0),
      spd: sum.spd + (item.bonus_spd || 0),
      def: sum.def + (item.bonus_def || 0),
      luck: sum.luck + (item.bonus_luck || 0),
    }), { atk: 0, hp: 0, spd: 0, def: 0, luck: 0 });
  } catch (err) {
    console.error('[Combat] Item bonus fetch error:', err.message);
    return { atk: 0, hp: 0, spd: 0, def: 0, luck: 0 };
  }
}

// ── POINTS VALUES (from Game Design V4, Section 19) ──
const COMBAT_POINTS = {
  SURVIVE_CYCLE: 3,     // +3 per cycle survived
  DEAL_KO: 10,          // +10 for knocking someone out
  GUILD_CONTROLS: 2,    // +2 if your guild controls zone at cycle end
  OBJECTIVE_MULT: 1.5,  // x1.5 on daily objective zone
};

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
// Each effect returns { damage, heal, status, ... } applied to target/self
const EFFECT_HANDLERS = {
  // ── Attack Effects ──
  BURN:      (value) => ({ damage: value || 3, type: 'fire' }),
  CHAIN:     ()      => ({ status: 'chaining' }),
  CRIT:      ()      => ({ status: 'crit_ready' }),
  SURGE:     ()      => ({ status: 'surging', atkBoost: 3 }),
  PIERCE:    ()      => ({ status: 'piercing' }),

  // ── Defense Effects ──
  HEAL:      (value) => ({ heal: value || 3 }),
  WARD:      ()      => ({ status: 'shielded', absorb: 3 }),
  ANCHOR:    ()      => ({ status: 'anchored', damageReduction: 2 }),
  THORNS:    (value) => ({ status: 'thorns', reflectDamage: value || 2 }),
  BARRIER:   (value) => ({ status: 'barrier', barrierHP: value || 5 }),

  // ── Manipulation Effects ──
  DRAIN:     (value) => ({ damage: value || 2, heal: value || 2 }),
  SIPHON:    (value) => ({ damage: value || 1, heal: value || 1 }),
  WEAKEN:    (value) => ({ status: 'weakened', atkReduction: value || 3 }),
  HEX:       ()      => ({ status: 'hexed', atkReduction: 2 }),
  SILENCE:   ()      => ({ status: 'silenced' }),

  // ── Utility Effects ──
  HASTE:     ()      => ({ status: 'hasted', extraAttack: true }),
  SWIFT:     ()      => ({ status: 'swift' }),
  DODGE:     ()      => ({ status: 'dodging', dodgeChance: 0.3 }),

  // ── Attrition Effects ──
  POISON:    (value) => ({ damage: value || 2, type: 'poison', ticks: true }),
  CORRODE:   ()      => ({ status: 'corroded' }),
  INFECT:    ()      => ({ status: 'infected' }),
  LEECH:     (value) => ({ damage: value || 2, heal: Math.floor((value || 2) / 2) }),

  // ── Support Effects ──
  BLESS:     (value) => ({ heal: value || 2, status: 'blessed' }),
  AMPLIFY:   ()      => ({ status: 'amplified', atkBoost: 2 }),
  INSPIRE:   ()      => ({ status: 'inspired', teamHeal: 1 }),

  // ── V5 New Effects ──
  SHATTER:   ()      => ({ status: 'shatter_ready' }),
  TETHER:    ()      => ({ status: 'tethering' }),
  REFLECT:   ()      => ({ status: 'reflecting' }),
  PHASE:     ()      => ({ status: 'phased' }),
  MARK:      ()      => ({ status: 'marking' }),
  CLEANSE:   ()      => ({ status: 'cleansed' }),
  OVERCHARGE:()      => ({ status: 'overcharged' }),
  SLOW:      ()      => ({ status: 'slowed', spdReduction: 3 }),
  TAUNT:     ()      => ({ status: 'taunting' }),
  STEALTH:   ()      => ({ status: 'stealthed' }),

  // ── Legacy / rare ──
  STUN:      ()      => ({ status: 'stunned' }),
  FEAR:      ()      => ({ status: 'feared', atkReduction: 4 }),
  DOOM:      ()      => ({ status: 'doomed', tickDamage: 5, delay: 2 }),
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
    let totalPointsAwarded = 0;

    // Process each zone
    for (const zoneId of zoneIds) {
      try {
        const result = await processZoneCombat(zoneId, regionBonuses);
        totalKnockouts += result.knockouts;
        totalPointsAwarded += result.points_awarded || 0;
        totalZonesProcessed++;
      } catch (zoneErr) {
        console.error(`[Combat] Zone ${zoneId} error:`, zoneErr.message);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Combat] ✅ Cycle complete: ${totalZonesProcessed} zones, ${totalKnockouts} knockouts, ${totalPointsAwarded} pts awarded, ${elapsed}ms`);

    return {
      zones_processed: totalZonesProcessed,
      knockouts: totalKnockouts,
      points_awarded: totalPointsAwarded,
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
    return { knockouts: 0, points_awarded: 0 };
  }

  // Build combatant objects (async for item bonus lookup)
  const combatants = [];
  for (const d of deployments) {
    const activeSlot = (d.card_slots || []).find(s => s.is_active);
    const card = activeSlot?.card || null;
    const spell = card?.spell || null;

    // Base stats from Nine
    let atk = d.nine?.base_atk || 3;
    let hp = d.current_hp;
    let maxHp = d.max_hp || d.nine?.base_hp || 20;
    let spd = d.nine?.base_spd || 5;
    let def = 0;
    let luck = 0;

    // Add card stats
    if (spell) {
      atk += spell.base_atk || 0;
      hp = hp; // Card HP doesn't add to current HP, it adds to max
      maxHp += spell.base_hp || 0;
    }

    // V5: Add equipped item stat bonuses
    const itemBonus = await getEquippedItemBonuses(d.player_id);
    atk += itemBonus.atk;
    maxHp += itemBonus.hp;
    spd += itemBonus.spd;
    def += itemBonus.def;
    luck += itemBonus.luck;

    // Parse card effects
    let effects = [];
    if (card?.spell_effects) {
      effects = Array.isArray(card.spell_effects) ? card.spell_effects : [];
    }

    // Lone Wolf bonus: solo players get 1.5x ATK
    const isLoneWolf = (d.guild_tag || "").startsWith("@");
    if (isLoneWolf) atk = Math.round(atk * 1.5);
    combatants.push({
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
      def,
      luck,
      effects,
      card_id: activeSlot?.card_id || null,
      card_name: card?.spell_name || null,
      card_rarity: card?.rarity || null,
      statuses: [],       // Applied this cycle
      barrierHP: 0,       // BARRIER shield HP
      tetheredTo: null,   // TETHER link to another combatant
      damage_dealt: 0,
      damage_taken: 0,
      healing_done: 0,
      knocked_out: false,
    });
  }

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

    // Check if silenced — all effects blocked
    if (c.statuses.includes('silenced')) {
      combatLog.push({ phase: 'effects', actor: c.twitter_handle, result: 'SILENCED — effects blocked' });
      continue;
    }

    // Check if phased — immune but can't act offensively (still get buffs/heals)
    const isPhased = c.statuses.includes('phased');

    for (const effect of c.effects) {
      const handler = EFFECT_HANDLERS[effect];
      if (!handler) continue;

      const result = handler();

      // ── Helper: pick enemy target ──
      const getEnemies = () => combatants.filter(e => e.guild_tag !== c.guild_tag && e.hp > 0);
      const getLowestHPEnemy = (enemies) => enemies.reduce((min, e) => e.hp < min.hp ? e : min, enemies[0]);
      const getMarkedEnemy = (enemies) => enemies.find(e => e.statuses.includes('marked')) || null;
      const getTauntingEnemy = (enemies) => enemies.find(e => e.statuses.includes('taunting')) || null;

      // ── Apply damage to a target (respects DEF, ANCHOR, WARD, BARRIER, DODGE, PHASE) ──
      const applyDamage = (target, baseDmg, attacker, isPiercing = false) => {
        let dmg = baseDmg;

        // DODGE: 30% chance to avoid all damage
        if (target.statuses.includes('dodging') && Math.random() < 0.3) {
          combatLog.push({ phase: 'effects', actor: target.twitter_handle, result: 'DODGED!' });
          return 0;
        }

        // PHASE: immune to all damage
        if (target.statuses.includes('phased')) {
          combatLog.push({ phase: 'effects', actor: target.twitter_handle, result: 'PHASED — immune' });
          return 0;
        }

        // DEF reduces effect damage (half value)
        if (target.def > 0) dmg = Math.max(1, dmg - Math.floor(target.def / 2));

        // ANCHOR damage reduction
        if (target.statuses.includes('anchored')) dmg = Math.max(1, dmg - 2);

        // WARD absorb (unless PIERCE)
        if (!isPiercing && target.statuses.includes('shielded')) dmg = Math.max(0, dmg - 3);

        // BARRIER absorb (separate from WARD)
        if (target.barrierHP && target.barrierHP > 0) {
          const absorbed = Math.min(dmg, target.barrierHP);
          target.barrierHP -= absorbed;
          dmg -= absorbed;
          if (target.barrierHP <= 0) {
            target.statuses = target.statuses.filter(s => s !== 'barrier');
            combatLog.push({ phase: 'effects', actor: target.twitter_handle, result: 'BARRIER broken!' });
          }
        }

        // MARK: +50% damage taken
        if (target.statuses.includes('marked')) dmg = Math.floor(dmg * 1.5);

        target.hp = Math.max(0, target.hp - dmg);
        target.damage_taken += dmg;
        attacker.damage_dealt += dmg;

        // REFLECT: return 50% of damage to attacker
        if (target.statuses.includes('reflecting') && dmg > 0) {
          const reflected = Math.floor(dmg * 0.5);
          attacker.hp = Math.max(0, attacker.hp - reflected);
          attacker.damage_taken += reflected;
          combatLog.push({ phase: 'effects', actor: target.twitter_handle, result: `REFLECT ${reflected} damage back` });
        }

        // TETHER: share 30% of damage with tether source
        if (target.tetheredTo && dmg > 0) {
          const sharedDmg = Math.floor(dmg * 0.3);
          const tSource = combatants.find(x => x.twitter_handle === target.tetheredTo && x.hp > 0);
          if (tSource) {
            tSource.hp = Math.max(0, tSource.hp - sharedDmg);
            tSource.damage_taken += sharedDmg;
            combatLog.push({ phase: 'effects', actor: target.twitter_handle, result: `TETHER — ${sharedDmg} shared to ${tSource.twitter_handle}` });
          }
        }

        return dmg;
      };

      // ────────────────────────────────────────
      // OFFENSIVE EFFECTS (damage-dealing)
      // ────────────────────────────────────────
      if (result.damage && !isPhased) {
        const enemies = getEnemies();
        if (enemies.length > 0) {
          const isPiercing = c.statuses.includes('piercing');

          // CHAIN: hit 2 targets instead of 1
          if (c.statuses.includes('chaining') && enemies.length > 1) {
            const sorted = [...enemies].sort((a, b) => a.hp - b.hp);
            for (let i = 0; i < Math.min(2, sorted.length); i++) {
              const dmg = applyDamage(sorted[i], result.damage, c, isPiercing);
              combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect, target: sorted[i].twitter_handle, damage: dmg, note: `CHAIN ${i+1}` });
            }
          } else {
            // Prefer MARKED target, else lowest HP
            const target = getMarkedEnemy(enemies) || getLowestHPEnemy(enemies);
            const dmg = applyDamage(target, result.damage, c, isPiercing);
            combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect, target: target.twitter_handle, damage: dmg });
          }

          // DRAIN/SIPHON/LEECH: heal self
          if (result.heal) {
            c.hp = Math.min(c.maxHp, c.hp + result.heal);
            c.healing_done += result.heal;
          }
        }
      }

      // ────────────────────────────────────────
      // HEALING EFFECTS (non-damage heals)
      // ────────────────────────────────────────
      if (result.heal && !result.damage) {
        const allies = combatants.filter(a => a.guild_tag === c.guild_tag && a.hp > 0 && a.hp < a.maxHp);
        if (allies.length > 0) {
          const target = allies.reduce((min, a) => a.hp < min.hp ? a : min, allies[0]);
          let healAmt = result.heal;

          // AMPLIFY: +50% heal from next ally effect
          if (target.statuses.includes('amplified')) {
            healAmt = Math.floor(healAmt * 1.5);
            target.statuses = target.statuses.filter(s => s !== 'amplified');
          }

          target.hp = Math.min(target.maxHp, target.hp + healAmt);
          c.healing_done += healAmt;

          combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect, target: target.twitter_handle, heal: healAmt });
        }
      }

      // ────────────────────────────────────────
      // DEBUFF EFFECTS (status on enemies)
      // ────────────────────────────────────────
      const DEBUFF_EFFECTS = ['SILENCE', 'HEX', 'STUN', 'FEAR', 'WEAKEN', 'SLOW', 'MARK', 'CORRODE', 'TETHER'];
      if (result.status && DEBUFF_EFFECTS.includes(effect) && !isPhased) {
        const enemies = getEnemies();
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          target.statuses.push(result.status);

          // ATK reduction (HEX, WEAKEN, FEAR)
          if (result.atkReduction) target.atk = Math.max(1, target.atk - result.atkReduction);

          // SPD reduction (SLOW)
          if (result.spdReduction) target.spd = Math.max(0, target.spd - result.spdReduction);

          // CORRODE: reduce max HP by 2 (permanent for this cycle)
          if (effect === 'CORRODE') {
            target.maxHp = Math.max(1, target.maxHp - 2);
            target.hp = Math.min(target.hp, target.maxHp);
          }

          // TETHER: link target back to caster (target shares damage)
          if (effect === 'TETHER') {
            target.tetheredTo = c.twitter_handle;
          }

          combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect, target: target.twitter_handle, status: result.status });
        }
      }

      // ────────────────────────────────────────
      // BUFF EFFECTS (status on self)
      // ────────────────────────────────────────
      const BUFF_EFFECTS = ['AMPLIFY', 'SURGE', 'CRIT', 'PIERCE', 'CHAIN', 'HASTE', 'DODGE', 'SWIFT', 'REFLECT', 'PHASE', 'BARRIER', 'OVERCHARGE', 'TAUNT', 'STEALTH', 'ANCHOR', 'THORNS', 'WARD'];
      if (result.status && BUFF_EFFECTS.includes(effect)) {
        c.statuses.push(result.status);
        if (result.atkBoost) c.atk += result.atkBoost;

        // BARRIER: set barrierHP on the combatant
        if (effect === 'BARRIER') {
          c.barrierHP = result.barrierHP || 5;
        }

        // OVERCHARGE: +50% ATK this cycle but take 20% of own HP as recoil
        if (effect === 'OVERCHARGE') {
          const boost = Math.floor(c.atk * 0.5);
          c.atk += boost;
          const recoil = Math.floor(c.maxHp * 0.2);
          c.hp = Math.max(1, c.hp - recoil);
          c.damage_taken += recoil;
          combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect, note: `+${boost} ATK, -${recoil} HP recoil` });
        }

        // STEALTH: can't be targeted this cycle (handled in Phase 2)
        if (effect === 'STEALTH') {
          combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect, result: 'STEALTHED — can\'t be targeted' });
        }

        // Log non-special buffs
        if (!['OVERCHARGE', 'STEALTH'].includes(effect)) {
          combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect, status: result.status });
        }
      }

      // ────────────────────────────────────────
      // CLEANSE: remove all debuffs from self
      // ────────────────────────────────────────
      if (effect === 'CLEANSE') {
        const debuffs = ['silenced', 'hexed', 'weakened', 'stunned', 'feared', 'slowed', 'marked', 'corroded', 'doomed'];
        const removed = c.statuses.filter(s => debuffs.includes(s));
        c.statuses = c.statuses.filter(s => !debuffs.includes(s));
        if (removed.length > 0) {
          combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect, result: `Cleansed: ${removed.join(', ')}` });
        }
      }

      // ────────────────────────────────────────
      // SHATTER: if target has WARD/BARRIER, destroy it and deal 4 bonus damage
      // ────────────────────────────────────────
      if (effect === 'SHATTER' && !isPhased) {
        const enemies = getEnemies();
        const shielded = enemies.filter(e => e.statuses.includes('shielded') || e.statuses.includes('barrier'));
        if (shielded.length > 0) {
          const target = shielded[0];
          target.statuses = target.statuses.filter(s => s !== 'shielded' && s !== 'barrier');
          target.barrierHP = 0;
          const shatterDmg = 4;
          target.hp = Math.max(0, target.hp - shatterDmg);
          target.damage_taken += shatterDmg;
          c.damage_dealt += shatterDmg;
          combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect, target: target.twitter_handle, damage: shatterDmg, note: 'Shield destroyed!' });
        }
      }

      // ────────────────────────────────────────
      // INSPIRE: heal ALL allies by 1 HP
      // ────────────────────────────────────────
      if (result.teamHeal) {
        const allies = combatants.filter(a => a.guild_tag === c.guild_tag && a.hp > 0);
        allies.forEach(a => {
          a.hp = Math.min(a.maxHp, a.hp + result.teamHeal);
        });
        c.healing_done += allies.length * result.teamHeal;
        combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect: 'INSPIRE', note: `Team heal +${result.teamHeal} to ${allies.length} allies` });
      }

      // ────────────────────────────────────────
      // INFECT: mark self as infected (spreads POISON on KO — handled in Phase 4)
      // ────────────────────────────────────────
      if (effect === 'INFECT') {
        c.statuses.push('infected');
      }

      // ────────────────────────────────────────
      // DOOM: mark enemy, 5 damage after 2 cycles (simplified: instant 5 dmg)
      // ────────────────────────────────────────
      if (effect === 'DOOM' && !isPhased) {
        const enemies = getEnemies();
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          target.statuses.push('doomed');
          const doomDmg = 5;
          target.hp = Math.max(0, target.hp - doomDmg);
          target.damage_taken += doomDmg;
          c.damage_dealt += doomDmg;
          combatLog.push({ phase: 'effects', actor: c.twitter_handle, effect, target: target.twitter_handle, damage: doomDmg, note: 'DOOMED!' });
        }
      }
    }
  }

  // ── PHASE 2: Auto-Attack ──
  for (const c of combatants) {
    if (c.hp <= 0) continue;

    // STUNNED: skip attack
    if (c.statuses.includes('stunned')) {
      combatLog.push({ phase: 'attack', actor: c.twitter_handle, result: 'STUNNED — cannot attack' });
      continue;
    }

    // PHASED: can't attack (but immune too)
    if (c.statuses.includes('phased')) {
      combatLog.push({ phase: 'attack', actor: c.twitter_handle, result: 'PHASED — cannot attack' });
      continue;
    }

    // SLOWED: 50% chance to skip attack
    if (c.statuses.includes('slowed') && Math.random() < 0.5) {
      combatLog.push({ phase: 'attack', actor: c.twitter_handle, result: 'SLOWED — attack delayed' });
      continue;
    }

    let enemies = combatants.filter(e => e.guild_tag !== c.guild_tag && e.hp > 0);
    if (enemies.length === 0) continue;

    // Filter out STEALTHED enemies (can't be targeted) unless they're the only ones
    const visible = enemies.filter(e => !e.statuses.includes('stealthed'));
    if (visible.length > 0) enemies = visible;

    // TAUNT: must target taunting enemy if one exists
    const taunter = enemies.find(e => e.statuses.includes('taunting'));
    // Prefer MARKED target
    const marked = enemies.find(e => e.statuses.includes('marked'));
    // Default: lowest HP
    const target = taunter || marked || enemies.reduce((min, e) => e.hp < min.hp ? e : min, enemies[0]);

    let damage = c.atk;

    // Crit check (base from crit_ready status, boosted by LUCK)
    const luckCritChance = (c.luck || 0) * 0.03; // 3% per LUCK point
    if (c.statuses.includes('crit_ready') && Math.random() < 0.5) {
      damage = Math.floor(damage * 1.5);
      combatLog.push({ phase: 'attack', actor: c.twitter_handle, result: 'CRIT!' });
    } else if (luckCritChance > 0 && Math.random() < luckCritChance) {
      damage = Math.floor(damage * 1.5);
      combatLog.push({ phase: 'attack', actor: c.twitter_handle, result: 'LUCKY CRIT!' });
    }

    // DODGE: 30% chance target avoids all damage
    if (target.statuses.includes('dodging') && Math.random() < 0.3) {
      combatLog.push({ phase: 'attack', actor: c.twitter_handle, target: target.twitter_handle, result: 'DODGED!' });
      continue;
    }

    // PIERCE: ignore WARD (but not BARRIER or DEF)
    const isPiercing = c.statuses.includes('piercing');

    // V5: DEF reduces incoming damage
    if (target.def > 0) damage = Math.max(1, damage - target.def);

    // ANCHOR reduces damage
    if (target.statuses.includes('anchored')) damage = Math.max(1, damage - 2);

    // WARD absorb (unless PIERCE)
    if (!isPiercing && target.statuses.includes('shielded')) damage = Math.max(0, damage - 3);

    // BARRIER absorb
    if (target.barrierHP && target.barrierHP > 0) {
      const absorbed = Math.min(damage, target.barrierHP);
      target.barrierHP -= absorbed;
      damage -= absorbed;
      if (target.barrierHP <= 0) {
        target.statuses = target.statuses.filter(s => s !== 'barrier');
        combatLog.push({ phase: 'attack', actor: target.twitter_handle, result: 'BARRIER broken!' });
      }
    }

    // MARK: +50% damage taken
    if (target.statuses.includes('marked')) damage = Math.floor(damage * 1.5);

    // THORNS reflect
    if (target.statuses.includes('thorns')) {
      const reflected = 2;
      c.hp = Math.max(0, c.hp - reflected);
      c.damage_taken += reflected;
      combatLog.push({ phase: 'attack', actor: target.twitter_handle, result: `THORNS — ${reflected} back to ${c.twitter_handle}` });
    }

    // REFLECT: return 50% of damage
    if (target.statuses.includes('reflecting') && damage > 0) {
      const reflected = Math.floor(damage * 0.5);
      c.hp = Math.max(0, c.hp - reflected);
      c.damage_taken += reflected;
      combatLog.push({ phase: 'attack', actor: target.twitter_handle, result: `REFLECT ${reflected} back to ${c.twitter_handle}` });
    }

    target.hp = Math.max(0, target.hp - damage);
    target.damage_taken += damage;
    c.damage_dealt += damage;

    combatLog.push({
      phase: 'attack', actor: c.twitter_handle,
      target: target.twitter_handle, damage,
      target_hp_remaining: target.hp,
    });

    // TETHER: share 30% of damage with tether source
    if (target.tetheredTo && damage > 0) {
      const sharedDmg = Math.floor(damage * 0.3);
      const tSource = combatants.find(x => x.twitter_handle === target.tetheredTo && x.hp > 0);
      if (tSource) {
        tSource.hp = Math.max(0, tSource.hp - sharedDmg);
        tSource.damage_taken += sharedDmg;
        combatLog.push({ phase: 'attack', note: `TETHER — ${sharedDmg} shared to ${tSource.twitter_handle}` });
      }
    }

    // HASTE: extra attack at 50% damage
    if (c.statuses.includes('hasted') && enemies.filter(e => e.hp > 0).length > 0) {
      const aliveEnemies = enemies.filter(e => e.hp > 0);
      const target2 = aliveEnemies.reduce((min, e) => e.hp < min.hp ? e : min, aliveEnemies[0]);
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
  const knockedOutPlayers = [];
  for (const c of combatants) {
    if (c.hp <= 0 && !c.knocked_out) {
      c.knocked_out = true;
      knockouts++;
      knockedOutPlayers.push(c);
      combatLog.push({ phase: 'knockout', player: c.twitter_handle, guild: c.guild_tag });

      // INFECT: on KO, spread POISON to nearby enemies
      if (c.statuses.includes('infected')) {
        const nearbyEnemies = combatants.filter(e => e.guild_tag !== c.guild_tag && e.hp > 0);
        nearbyEnemies.forEach(e => {
          const poisonDmg = 2;
          e.hp = Math.max(0, e.hp - poisonDmg);
          e.damage_taken += poisonDmg;
          combatLog.push({ phase: 'knockout', actor: c.twitter_handle, effect: 'INFECT', target: e.twitter_handle, damage: poisonDmg, note: 'POISON spread on death!' });
        });
      }
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

  // ══════════════════════════════════════════════════
  // STEP 7b: BROADCAST TO ARENA SOCKET (live viewers)
  // ══════════════════════════════════════════════════
  try {
    if (global.__arenaSocket && global.__arenaSocket._broadcastToZone) {
      const broadcast = global.__arenaSocket._broadcastToZone;
      const cycleNumber = (count || 0) + 1;

      // Round start — send all fighter HP states
      broadcast(zoneId, 'arena:round_start', {
        round_number: cycleNumber,
        nines: combatants.map(c => ({
          id: c.player_id,
          current_hp: Math.max(0, c.hp),
          max_hp: c.maxHp,
          alive: !c.knocked_out && c.hp > 0,
        })),
      });

      // Convert combat log to arena events the frontend understands
      const arenaEvents = combatLog.map(log => {
        const findId = (handle) => {
          const found = combatants.find(c => c.twitter_handle === handle);
          return found ? found.player_id : null;
        };

        if (log.phase === 'attack' && log.target && log.damage !== undefined) {
          return {
            type: 'attack',
            from: findId(log.actor),
            to: findId(log.target),
            damage: log.damage,
            crit: (log.result || '').includes('CRIT'),
          };
        }
        if (log.phase === 'attack' && (log.result || '').includes('DODGED')) {
          return { type: 'dodge', nine_id: findId(log.target || log.actor) };
        }
        if (log.phase === 'effects' && log.heal) {
          return { type: 'heal', nine_id: findId(log.target || log.actor), amount: log.heal, new_hp: null };
        }
        if (log.phase === 'effects' && log.effect) {
          return { type: 'effect', effect_type: log.effect, target_id: findId(log.target || log.actor) };
        }
        if (log.phase === 'effects' && log.damage) {
          return {
            type: 'attack',
            from: findId(log.actor),
            to: findId(log.target),
            damage: log.damage,
            crit: false,
          };
        }
        if (log.phase === 'knockout') {
          return { type: 'ko', nine_id: findId(log.player) };
        }
        return null;
      }).filter(Boolean);

      // Send all events as a batch
      if (arenaEvents.length > 0) {
        broadcast(zoneId, 'arena:events', { events: arenaEvents });
      }

      // Round end — winner and scores
      broadcast(zoneId, 'arena:round_end', {
        round_number: cycleNumber,
        winner_guild: controllingGuild,
        guild_scores: guildPower,
      });

      // Cycle end notification
      broadcast(zoneId, 'arena:cycle_end', { zone_id: zoneId, cycle: cycleNumber });
    }
  } catch (socketErr) {
    // Socket broadcast is non-critical — don't break combat
    console.error('[Combat] Socket broadcast error:', socketErr.message);
  }

  // ══════════════════════════════════════════════════
  // STEP 8: AWARD POINTS (NEW — Season Scoring V4)
  // ══════════════════════════════════════════════════
  let pointsAwarded = 0;

  // Only award points if there was actual combat (2+ guilds)
  if (guilds.length >= 2) {
    // Check if this is the daily objective zone (x1.5 multiplier)
    let isObjective = false;
    try {
      const { data: zoneData } = await supabase
        .from('zones')
        .select('is_current_objective')
        .eq('id', zoneId)
        .single();
      isObjective = zoneData?.is_current_objective || false;
    } catch (e) { /* non-critical */ }

    const mult = isObjective ? COMBAT_POINTS.OBJECTIVE_MULT : 1;

    // 8a: +3 per survivor (survived a combat cycle)
    for (const c of combatants) {
      if (!c.knocked_out && c.hp > 0) {
        const pts = Math.round(COMBAT_POINTS.SURVIVE_CYCLE * mult);
        await addPoints(c.player_id, pts, 'zone_survive', `Survived cycle on zone ${zoneId}`);
        pointsAwarded += pts;
      }
    }

    // 8b: +10 per KO (awarded to all surviving enemies of each KO'd player)
    for (const ko of knockedOutPlayers) {
      const killers = combatants.filter(c => c.guild_tag !== ko.guild_tag && !c.knocked_out && c.hp > 0);
      if (killers.length > 0) {
        // Give full KO points to the top damage dealer, half to others
        const topKiller = killers.reduce((best, c) => c.damage_dealt > best.damage_dealt ? c : best, killers[0]);
        const pts = Math.round(COMBAT_POINTS.DEAL_KO * mult);
        await addPoints(topKiller.player_id, pts, 'zone_ko', `KO'd @${ko.twitter_handle} on zone ${zoneId}`);
        pointsAwarded += pts;
      }
    }

    // 8c: +2 to all members of the controlling guild on this zone
    if (controllingGuild) {
      const controllers = combatants.filter(c => c.guild_tag === controllingGuild && !c.knocked_out && c.hp > 0);
      for (const c of controllers) {
        const pts = Math.round(COMBAT_POINTS.GUILD_CONTROLS * mult);
        await addPoints(c.player_id, pts, 'zone_control', `Guild controls zone ${zoneId}`);
        pointsAwarded += pts;
      }
    }
  }

  return { knockouts, controlling_guild: controllingGuild, guild_power: guildPower, points_awarded: pointsAwarded };
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