// ═══════════════════════════════════════════════════════
// server/services/craftingEngine.js
// V3 Crafting & Recharging System
//
// Two systems:
//   FUSE:     3 cards of same rarity → 1 card of next rarity
//   RECHARGE: Feed duplicate cards to restore charges
//
// Why this matters:
//   - Gives purpose to duplicate cards
//   - Creates pack demand (need fuel cards)
//   - Progression path (common → legendary over time)
//   - Exhausted cards on zones need recharging
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Rarity progression
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const CHARGES_BY_RARITY = {
  common: 5,
  uncommon: 8,
  rare: 12,
  epic: 18,
  legendary: 30,
};

// ═══════════════════════════════════════════
// FUSE: 3 cards of same rarity → 1 of next rarity
// All 3 must be same rarity. Result is random spell
// of the next rarity tier. Consumed cards are deleted.
// ═══════════════════════════════════════════
async function fuseCards(playerId, cardIds) {
  if (!cardIds || cardIds.length !== 3) {
    return { success: false, error: 'Exactly 3 card IDs required' };
  }

  // Get all 3 cards
  const { data: cards, error } = await supabase
    .from('player_cards')
    .select('*, spell:spell_id(name, base_atk, base_hp)')
    .in('id', cardIds)
    .eq('player_id', playerId);

  if (error || !cards || cards.length !== 3) {
    return {
      success: false,
      error: 'Could not find all 3 cards in your collection',
    };
  }

  // Check all same rarity
  const rarity = cards[0].rarity;
  if (!cards.every((c) => c.rarity === rarity)) {
    return { success: false, error: 'All 3 cards must be the same rarity' };
  }

  // Check none are currently deployed on zones or boss
  for (const card of cards) {
    const { data: activeSlot } = await supabase
      .from('zone_card_slots')
      .select('id')
      .eq('card_id', card.id)
      .eq('is_active', true)
      .single();

    if (activeSlot) {
      return {
        success: false,
        error: `Card "${card.spell_name}" is deployed on a zone. Remove it first.`,
      };
    }
  }

  // Check rarity can be upgraded
  const rarityIndex = RARITY_ORDER.indexOf(rarity);
  if (rarityIndex === -1 || rarityIndex >= RARITY_ORDER.length - 1) {
    return { success: false, error: 'Legendary cards cannot be fused further' };
  }

  const newRarity = RARITY_ORDER[rarityIndex + 1];
  const newCharges = CHARGES_BY_RARITY[newRarity];

  // Pick a random spell for the new card
  const { data: randomSpell } = await supabase
    .from('spells')
    .select('*')
    .limit(50);

  if (!randomSpell || randomSpell.length === 0) {
    return { success: false, error: 'No spells available' };
  }

  const spell = randomSpell[Math.floor(Math.random() * randomSpell.length)];

  // Delete the 3 consumed cards
  const { error: deleteErr } = await supabaseAdmin
    .from('player_cards')
    .delete()
    .in('id', cardIds)
    .eq('player_id', playerId);

  if (deleteErr) {
    console.error('[Crafting] Delete error:', deleteErr);
    return { success: false, error: 'Failed to consume cards' };
  }

  // Create the new upgraded card
  const { data: newCard, error: insertErr } = await supabaseAdmin
    .from('player_cards')
    .insert({
      player_id: playerId,
      spell_id: spell.id,
      spell_name: spell.name,
      spell_house: spell.school_id || spell.house,
      spell_type: spell.type,
      spell_tier: spell.tier,
      spell_effects: spell.bonus_effects || [],
      rarity: newRarity,
      current_charges: newCharges,
      max_charges: newCharges,
      is_exhausted: false,
      source: 'crafting_fuse',
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[Crafting] Insert error:', insertErr);
    return { success: false, error: 'Failed to create new card' };
  }

  // Log the craft
  await supabaseAdmin
    .from('card_durability_log')
    .insert({
      card_id: newCard.id,
      player_id: playerId,
      action: 'fuse',
      details: {
        consumed: cardIds,
        consumed_rarity: rarity,
        result_rarity: newRarity,
        result_spell: spell.name,
      },
    })
    .catch(() => {});

  return {
    success: true,
    consumed: cards.map((c) => ({
      id: c.id,
      name: c.spell_name,
      rarity: c.rarity,
    })),
    new_card: {
      id: newCard.id,
      name: spell.name,
      rarity: newRarity,
      charges: newCharges,
      atk: spell.base_atk,
      hp: spell.base_hp,
    },
    message: `Fused 3 ${rarity} cards → ${spell.name} (${newRarity})!`,
  };
}

// ═══════════════════════════════════════════
// RECHARGE: Feed cards to restore charges
//
// Options:
//   - 3 common cards = recharge any card to full
//   - 1 same-rarity duplicate = full recharge
//   - 1 lower-rarity card = partial recharge
// ═══════════════════════════════════════════
async function rechargeCard(playerId, targetCardId, fuelCardIds) {
  if (!targetCardId || !fuelCardIds || fuelCardIds.length === 0) {
    return {
      success: false,
      error: 'Target card and at least 1 fuel card required',
    };
  }

  if (fuelCardIds.includes(targetCardId)) {
    return { success: false, error: 'Cannot use the target card as fuel' };
  }

  // Get target card
  const { data: target } = await supabase
    .from('player_cards')
    .select('*')
    .eq('id', targetCardId)
    .eq('player_id', playerId)
    .single();

  if (!target) return { success: false, error: 'Target card not found' };
  if (target.current_charges >= target.max_charges) {
    return { success: false, error: 'Card is already fully charged' };
  }

  // Get fuel cards
  const { data: fuelCards } = await supabase
    .from('player_cards')
    .select('*')
    .in('id', fuelCardIds)
    .eq('player_id', playerId);

  if (!fuelCards || fuelCards.length !== fuelCardIds.length) {
    return { success: false, error: 'Could not find all fuel cards' };
  }

  // Check fuel cards aren't deployed
  for (const fuel of fuelCards) {
    const { data: activeSlot } = await supabase
      .from('zone_card_slots')
      .select('id')
      .eq('card_id', fuel.id)
      .eq('is_active', true)
      .single();

    if (activeSlot) {
      return {
        success: false,
        error: `Fuel card "${fuel.spell_name}" is deployed. Remove it first.`,
      };
    }
  }

  // Calculate recharge amount
  let rechargeAmount = 0;
  const targetRarityIndex = RARITY_ORDER.indexOf(target.rarity);

  // Option A: 3+ commons = full recharge
  const commonFuel = fuelCards.filter((f) => f.rarity === 'common');
  if (commonFuel.length >= 3) {
    rechargeAmount = target.max_charges;
  } else {
    // Option B: Calculate based on fuel rarity
    for (const fuel of fuelCards) {
      const fuelRarityIndex = RARITY_ORDER.indexOf(fuel.rarity);

      if (fuel.spell_id === target.spell_id && fuel.rarity === target.rarity) {
        // Same spell + same rarity = full recharge
        rechargeAmount = target.max_charges;
        break;
      } else if (fuelRarityIndex >= targetRarityIndex) {
        // Same or higher rarity = full recharge
        rechargeAmount = target.max_charges;
        break;
      } else {
        // Lower rarity = partial recharge (50% of max per card)
        rechargeAmount += Math.floor(target.max_charges * 0.5);
      }
    }
  }

  if (rechargeAmount === 0) {
    return {
      success: false,
      error: 'Fuel cards are not sufficient for recharging',
    };
  }

  // Cap at max charges
  const newCharges = Math.min(
    target.max_charges,
    target.current_charges + rechargeAmount,
  );

  // Delete fuel cards
  const { error: deleteErr } = await supabaseAdmin
    .from('player_cards')
    .delete()
    .in('id', fuelCardIds)
    .eq('player_id', playerId);

  if (deleteErr) {
    console.error('[Crafting] Fuel delete error:', deleteErr);
    return { success: false, error: 'Failed to consume fuel cards' };
  }

  // Update target card charges
  await supabaseAdmin
    .from('player_cards')
    .update({
      current_charges: newCharges,
      is_exhausted: false,
    })
    .eq('id', targetCardId);

  // Log
  await supabaseAdmin
    .from('card_durability_log')
    .insert({
      card_id: targetCardId,
      player_id: playerId,
      action: 'recharge',
      details: {
        fuel_consumed: fuelCardIds,
        charges_before: target.current_charges,
        charges_after: newCharges,
        full_recharge: newCharges === target.max_charges,
      },
    })
    .catch(() => {});

  return {
    success: true,
    card: {
      id: target.id,
      name: target.spell_name,
      charges_before: target.current_charges,
      charges_after: newCharges,
      max_charges: target.max_charges,
    },
    fuel_consumed: fuelCards.map((f) => ({
      id: f.id,
      name: f.spell_name,
      rarity: f.rarity,
    })),
    message: `Recharged ${target.spell_name}! ${target.current_charges} → ${newCharges}/${target.max_charges} charges`,
  };
}

// ═══════════════════════════════════════════
// Get fuseable cards (3+ of same rarity)
// ═══════════════════════════════════════════
async function getCanFuse(playerId) {
  const { data: cards } = await supabase
    .from('player_cards')
    .select('id, spell_name, spell_id, rarity, current_charges, max_charges')
    .eq('player_id', playerId)
    .neq('rarity', 'legendary')
    .order('rarity');

  if (!cards) return { fuseable: [] };

  // Group by rarity
  const byRarity = {};
  for (const card of cards) {
    if (!byRarity[card.rarity]) byRarity[card.rarity] = [];
    byRarity[card.rarity].push(card);
  }

  // Find rarities with 3+ cards
  const fuseable = [];
  for (const [rarity, rarityCards] of Object.entries(byRarity)) {
    if (rarityCards.length >= 3) {
      const nextRarity = RARITY_ORDER[RARITY_ORDER.indexOf(rarity) + 1];
      fuseable.push({
        rarity,
        count: rarityCards.length,
        fuses_available: Math.floor(rarityCards.length / 3),
        result_rarity: nextRarity,
        cards: rarityCards,
      });
    }
  }

  return { fuseable };
}

// ═══════════════════════════════════════════
// Get rechargeable cards (exhausted or low charge)
// ═══════════════════════════════════════════
async function getCanRecharge(playerId) {
  // Get exhausted or low-charge cards
  const { data: needsRecharge } = await supabase
    .from('player_cards')
    .select(
      'id, spell_name, rarity, current_charges, max_charges, is_exhausted',
    )
    .eq('player_id', playerId)
    .lt('current_charges', supabase.raw ? undefined : 999)
    .order('current_charges');

  // Filter to actually low cards
  const lowCards = (needsRecharge || []).filter(
    (c) => c.current_charges < c.max_charges,
  );

  // Get potential fuel (any cards not deployed)
  const { data: fuelCards } = await supabase
    .from('player_cards')
    .select('id, spell_name, spell_id, rarity, current_charges')
    .eq('player_id', playerId)
    .order('rarity');

  return {
    needs_recharge: lowCards,
    available_fuel: fuelCards || [],
  };
}

module.exports = {
  fuseCards,
  rechargeCard,
  getCanFuse,
  getCanRecharge,
  RARITY_ORDER,
  CHARGES_BY_RARITY,
};
