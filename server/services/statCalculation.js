// ═══════════════════════════════════════════════════════
// server/services/statCalculation.js
// Combat V2 — Pure Addition Stat Calculation
// Source: 9LV_COMBAT_V2_LOCKED.md
//
// FORMULA: total = house + card1 + card2 + card3 + all equipped items
// No multipliers. No percentages. Just addition.
//
// UPDATED March 2026 — Fixed to match real DB schema:
//   houses table: base_atk, base_hp, base_spd, base_def, base_luck
//   player_cards table (not player_spells)
//   Items via player_nines.equipped_* slugs (not player_items.is_equipped)
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');

// ─── COMBAT FORMULAS ───────────────────────────────────

/**
 * Calculate attack interval from total SPD
 * Source: Combat V2 Section 2
 * @param {number} totalSpd - Combined SPD stat
 * @returns {number} seconds between attacks (min 2.0)
 */
function calculateAttackInterval(totalSpd) {
  return Math.max(2.0, 10.5 - totalSpd * 0.12);
}

/**
 * Calculate damage per hit
 * Source: Combat V2 Section 2
 * Formula: ATK² / (ATK + DEF)
 * @param {number} attackerAtk - Attacker's total ATK
 * @param {number} defenderDef - Defender's total DEF
 * @returns {number} damage dealt (minimum 1)
 */
function calculateDamage(attackerAtk, defenderDef) {
  if (attackerAtk + defenderDef <= 0) return 1;
  return Math.max(1, Math.floor((attackerAtk * attackerAtk) / (attackerAtk + defenderDef)));
}

/**
 * Roll for critical hit
 * Source: Combat V2 Section 2
 * Formula: LUCK / 100 = crit chance. Crits deal 2x damage.
 * @param {number} totalLuck - Combined LUCK stat
 * @returns {boolean} true if crit
 */
function rollCrit(totalLuck) {
  return Math.random() < (totalLuck / 100);
}

// ─── SHARPNESS ─────────────────────────────────────────

/**
 * Apply sharpness to a single stat value
 * Source: Game Design V5 Section 8
 * Formula: effective = base × (0.5 + sharpness / 200)
 * At 100% = full value, at 0% = half value
 * @param {number} baseStat - Card's base stat value
 * @param {number} sharpness - 0 to 100
 * @returns {number} effective stat (rounded to integer)
 */
function applySharpness(baseStat, sharpness) {
  if (!baseStat) return 0;
  const pct = Math.max(0, Math.min(100, sharpness || 100));
  return Math.round(baseStat * (0.5 + pct / 200));
}

// ─── MAIN STAT CALCULATOR ──────────────────────────────

/**
 * Calculate total stats for a Nine on a specific zone
 * Adds: house base + 3 zone cards (with sharpness) + all equipped items
 *
 * @param {number} playerId - Player ID
 * @param {number|null} zoneId - Zone ID (null = base stats + items only, no cards)
 * @returns {object} { atk, hp, spd, def, luck, breakdown, attackInterval, cards, items }
 */
async function calculateNineStats(playerId, zoneId) {

  // ── 1. Get the player's Nine ──
  const { data: nine, error: nineErr } = await supabase
    .from('player_nines')
    .select(`
      id, house_id, name,
      equipped_fur, equipped_expression, equipped_headwear,
      equipped_outfit, equipped_weapon, equipped_familiar,
      equipped_trinket_1, equipped_trinket_2
    `)
    .eq('player_id', playerId)
    .single();

  if (nineErr || !nine) {
    throw new Error('Nine not found for player ' + playerId);
  }

  // ── 2. Get house base stats (ALWAYS from houses table) ──
  const { data: house, error: houseErr } = await supabase
    .from('houses')
    .select('id, name, slug, base_atk, base_hp, base_spd, base_def, base_luck, role')
    .eq('id', nine.house_id)
    .single();

  if (houseErr || !house) {
    throw new Error('House not found for house_id ' + nine.house_id);
  }

  // Start with house base stats
  const houseStats = {
    atk:  house.base_atk  || 0,
    hp:   house.base_hp   || 0,
    spd:  house.base_spd  || 0,
    def:  house.base_def  || 0,
    luck: house.base_luck || 0,
  };

  const totals = { ...houseStats };

  // Track breakdown for UI display
  const breakdown = {
    house: { ...houseStats },
    cards: [],
    items: [],
  };

  // ── 3. Get zone cards (if zoneId provided) ──
  let cardDetails = [];

  if (zoneId) {
    // Find active deployment on this zone
    const { data: deployment } = await supabase
      .from('zone_deployments')
      .select('id')
      .eq('player_id', playerId)
      .eq('zone_id', zoneId)
      .eq('is_active', true)
      .single();

    if (deployment) {
      // Get card slots for this deployment
      const { data: slots } = await supabase
        .from('zone_card_slots')
        .select('card_id, slot_number')
        .eq('deployment_id', deployment.id)
        .eq('is_active', true)
        .order('slot_number');

      if (slots && slots.length > 0) {
        const cardIds = slots.map(s => s.card_id).filter(Boolean);

        if (cardIds.length > 0) {
          // Get the actual card instances from player_cards → spells
          const { data: cards } = await supabase
            .from('player_cards')
            .select('id, spell_id, sharpness, spells:spell_id(id, name, house, spell_type, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects)')
            .in('id', cardIds);

          if (cards) {
            cardDetails = cards;

            cards.forEach(card => {
              const spell = card.spells;
              if (!spell) return;

              const sharp = card.sharpness != null ? card.sharpness : 100;

              // Apply sharpness to each stat, then add
              const cardStats = {
                atk:  applySharpness(spell.base_atk  || 0, sharp),
                hp:   applySharpness(spell.base_hp   || 0, sharp),
                spd:  applySharpness(spell.base_spd  || 0, sharp),
                def:  applySharpness(spell.base_def  || 0, sharp),
                luck: applySharpness(spell.base_luck || 0, sharp),
              };

              totals.atk  += cardStats.atk;
              totals.hp   += cardStats.hp;
              totals.spd  += cardStats.spd;
              totals.def  += cardStats.def;
              totals.luck += cardStats.luck;

              breakdown.cards.push({
                id: card.id,
                name: spell.name,
                sharpness: sharp,
                ...cardStats,
              });
            });
          }
        }
      }
    }
  }

  // ── 4. Get equipped items via player_nines.equipped_* slugs ──
  const slugs = [
    nine.equipped_fur, nine.equipped_expression, nine.equipped_headwear,
    nine.equipped_outfit, nine.equipped_weapon, nine.equipped_familiar,
    nine.equipped_trinket_1, nine.equipped_trinket_2,
  ].filter(Boolean);

  let equippedItems = [];

  if (slugs.length > 0) {
    const { data: items } = await supabase
      .from('items')
      .select('id, name, slug, slot, rarity, bonus_atk, bonus_hp, bonus_spd, bonus_def, bonus_luck')
      .in('slug', slugs);

    if (items) {
      equippedItems = items;

      items.forEach(item => {
        const itemStats = {
          atk:  item.bonus_atk  || 0,
          hp:   item.bonus_hp   || 0,
          spd:  item.bonus_spd  || 0,
          def:  item.bonus_def  || 0,
          luck: item.bonus_luck || 0,
        };

        totals.atk  += itemStats.atk;
        totals.hp   += itemStats.hp;
        totals.spd  += itemStats.spd;
        totals.def  += itemStats.def;
        totals.luck += itemStats.luck;

        breakdown.items.push({
          id: item.id,
          name: item.name,
          slot: item.slot,
          rarity: item.rarity,
          ...itemStats,
        });
      });
    }
  }

  // ── 5. Calculate derived combat values ──
  const attackInterval = calculateAttackInterval(totals.spd);

  return {
    // Final totals
    atk:  totals.atk,
    hp:   totals.hp,
    spd:  totals.spd,
    def:  totals.def,
    luck: totals.luck,

    // Combat values
    attackInterval: Math.round(attackInterval * 100) / 100,
    critChance: Math.min(100, totals.luck),

    // Breakdown for UI
    breakdown,

    // Raw data for combat engine
    house: { id: house.id, name: house.name, slug: house.slug },
    cards: cardDetails,
    items: equippedItems,
  };
}


/**
 * Quick version: calculate stats without zone cards (for profile display)
 * Just house + items
 * @param {number} playerId
 * @returns {object} same shape as calculateNineStats
 */
async function calculateBaseStats(playerId) {
  return calculateNineStats(playerId, null);
}


// ─── EXPORTS ───────────────────────────────────────────

module.exports = {
  // Main calculator
  calculateNineStats,
  calculateBaseStats,

  // Combat formulas (used by combat engine)
  calculateAttackInterval,
  calculateDamage,
  rollCrit,
  applySharpness,
};