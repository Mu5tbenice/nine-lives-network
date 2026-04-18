// ═══════════════════════════════════════════════════════════
// server/services/nineStats.js
// SINGLE SOURCE OF TRUTH for Nine stat calculations
//
// V2 Formula: total = house + items + deployed_cards
// Every page should call this instead of doing its own math.
// ═══════════════════════════════════════════════════════════

const supabase = require('../config/supabase');

/**
 * Calculate complete stats for a player's Nine.
 *
 * Returns: {
 *   house:  { atk, hp, spd, def, luck },   ← from houses table
 *   items:  { atk, hp, spd, def, luck },   ← sum of equipped items
 *   cards:  { atk, hp, spd, def, luck },   ← sum of deployed cards
 *   total:  { atk, hp, spd, def, luck },   ← house + items + cards
 *   meta:   { nine_name, house_name, house_slug, house_color, ... }
 * }
 */
async function calculateStats(playerId) {
  // ── 1. Get the Nine + house in one query ──
  const { data: nine, error: nineErr } = await supabase
    .from('player_nines')
    .select(
      `
      name, house_id,
      equipped_fur, equipped_expression, equipped_headwear,
      equipped_outfit, equipped_weapon, equipped_familiar,
      equipped_trinket_1, equipped_trinket_2,
      equipped_images
    `,
    )
    .eq('player_id', playerId)
    .single();

  if (nineErr || !nine) {
    return { error: 'Nine not found for player ' + playerId };
  }

  // ── 2. Get house base stats (ALWAYS from houses table) ──
  const { data: house, error: houseErr } = await supabase
    .from('houses')
    .select('name, slug, base_atk, base_hp, base_spd, base_def, base_luck')
    .eq('id', nine.house_id)
    .single();

  if (houseErr || !house) {
    return { error: 'House not found for house_id ' + nine.house_id };
  }

  const houseStats = {
    atk: house.base_atk || 0,
    hp: house.base_hp || 0,
    spd: house.base_spd || 0,
    def: house.base_def || 0,
    luck: house.base_luck || 0,
  };

  // ── 3. Get equipped item stats ──
  const slugs = [
    nine.equipped_fur,
    nine.equipped_expression,
    nine.equipped_headwear,
    nine.equipped_outfit,
    nine.equipped_weapon,
    nine.equipped_familiar,
    nine.equipped_trinket_1,
    nine.equipped_trinket_2,
  ].filter(Boolean);

  const itemStats = { atk: 0, hp: 0, spd: 0, def: 0, luck: 0 };
  let equippedItems = [];

  if (slugs.length > 0) {
    const { data: items } = await supabase
      .from('items')
      .select(
        'name, slug, slot, rarity, bonus_atk, bonus_hp, bonus_spd, bonus_def, bonus_luck',
      )
      .in('slug', slugs);

    equippedItems = items || [];
    equippedItems.forEach((item) => {
      itemStats.atk += item.bonus_atk || 0;
      itemStats.hp += item.bonus_hp || 0;
      itemStats.spd += item.bonus_spd || 0;
      itemStats.def += item.bonus_def || 0;
      itemStats.luck += item.bonus_luck || 0;
    });
  }

  // ── 4. Get deployed card stats (if deployed to a zone) ──
  const cardStats = { atk: 0, hp: 0, spd: 0, def: 0, luck: 0 };
  let deployedCards = [];

  const { data: deployment } = await supabase
    .from('zone_deployments')
    .select('id, zone_id')
    .eq('player_id', playerId)
    .eq('is_active', true)
    .single();

  if (deployment) {
    const { data: cardSlots } = await supabase
      .from('zone_card_slots')
      .select('card_id, slot_number')
      .eq('deployment_id', deployment.id)
      .eq('is_active', true);

    if (cardSlots && cardSlots.length > 0) {
      const cardIds = cardSlots.map((s) => s.card_id);

      // Get spell stats from player_cards → spells
      const { data: playerCards } = await supabase
        .from('player_cards')
        .select(
          'id, spell_id, spells:spell_id(name, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects, spell_type, rarity, house)',
        )
        .in('id', cardIds);

      if (playerCards) {
        deployedCards = playerCards.map((pc) => pc.spells).filter(Boolean);
        deployedCards.forEach((spell) => {
          cardStats.atk += spell.base_atk || 0;
          cardStats.hp += spell.base_hp || 0;
          cardStats.spd += spell.base_spd || 0;
          cardStats.def += spell.base_def || 0;
          cardStats.luck += spell.base_luck || 0;
        });
      }
    }
  }

  // ── 5. Total = house + items + cards ──
  const total = {
    atk: houseStats.atk + itemStats.atk + cardStats.atk,
    hp: houseStats.hp + itemStats.hp + cardStats.hp,
    spd: houseStats.spd + itemStats.spd + cardStats.spd,
    def: houseStats.def + itemStats.def + cardStats.def,
    luck: houseStats.luck + itemStats.luck + cardStats.luck,
  };

  return {
    house: houseStats,
    items: itemStats,
    cards: cardStats,
    total: total,
    meta: {
      nine_name: nine.name,
      house_name: house.name,
      house_slug: house.slug,
      equipped_images: nine.equipped_images || {},
    },
    details: {
      equipped_items: equippedItems,
      deployed_cards: deployedCards,
      zone_id: deployment ? deployment.zone_id : null,
    },
  };
}

module.exports = { calculateStats };
