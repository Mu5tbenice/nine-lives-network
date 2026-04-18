// server/services/cardDurability.js
// Handles card charge usage, exhaustion, and recharging

const supabase = require('../config/supabase');

// Durability charges by rarity
const CHARGES_BY_RARITY = {
  common: 5,
  uncommon: 8,
  rare: 12,
  epic: 18,
  legendary: 30,
};

// Rarity stat bonuses (applied on top of base ATK/HP)
const RARITY_BONUSES = {
  common: { atk: 0, hp: 0 },
  uncommon: { atk: 1, hp: 0 }, // +1 to ATK
  rare: { atk: 1, hp: 1 }, // +1 to both
  epic: { atk: 2, hp: 2 }, // +2 to both
  legendary: { atk: 3, hp: 3 }, // +3 to both
};

/**
 * Set durability on a newly pulled card.
 * Called during pack opening.
 */
function getMaxCharges(rarity) {
  return CHARGES_BY_RARITY[rarity] || 5;
}

/**
 * Get a card's effective ATK/HP (base + rarity bonus).
 */
function getEffectiveStats(baseAtk, baseHp, rarity) {
  const bonus = RARITY_BONUSES[rarity] || { atk: 0, hp: 0 };
  return {
    atk: baseAtk + bonus.atk,
    hp: baseHp + bonus.hp,
  };
}

/**
 * Use one charge from a card (called each combat cycle while card is active).
 * Returns the updated card, or null if card is now exhausted.
 */
async function useCharge(cardId) {
  // Get current card state
  const { data: card, error: fetchError } = await supabase
    .from('player_cards')
    .select('id, current_charges, max_charges, is_exhausted')
    .eq('id', cardId)
    .single();

  if (fetchError || !card) {
    console.error('Error fetching card for charge use:', fetchError);
    return null;
  }

  if (card.is_exhausted || card.current_charges <= 0) {
    console.log(`Card ${cardId} is already exhausted`);
    return null;
  }

  const newCharges = card.current_charges - 1;
  const isExhausted = newCharges <= 0;

  // Update the card
  const { data: updated, error: updateError } = await supabase
    .from('player_cards')
    .update({
      current_charges: newCharges,
      is_exhausted: isExhausted,
    })
    .eq('id', cardId)
    .select()
    .single();

  if (updateError) {
    console.error('Error using card charge:', updateError);
    return null;
  }

  // Log the charge usage
  await supabase.from('card_durability_log').insert({
    card_id: cardId,
    action_type: 'zone_cycle',
    charges_before: card.current_charges,
    charges_after: newCharges,
  });

  if (isExhausted) {
    console.log(`Card ${cardId} is now EXHAUSTED (0 charges remaining)`);
  }

  return updated;
}

/**
 * Recharge a card using fuel cards.
 * Method 1: 3 Commons fully recharge any card (fuel cards are consumed/deleted)
 * Method 2: 1 same-rarity card = full restore (fuel card is consumed/deleted)
 */
async function rechargeCard(targetCardId, fuelCardIds) {
  // Get the target card
  const { data: target } = await supabase
    .from('player_cards')
    .select('id, rarity, current_charges, max_charges, player_id')
    .eq('id', targetCardId)
    .single();

  if (!target) {
    return { success: false, error: 'Target card not found' };
  }

  if (target.current_charges >= target.max_charges) {
    return { success: false, error: 'Card already at full charges' };
  }

  // Get the fuel cards
  const { data: fuelCards } = await supabase
    .from('player_cards')
    .select('id, rarity, player_id')
    .in('id', fuelCardIds);

  if (!fuelCards || fuelCards.length === 0) {
    return { success: false, error: 'No fuel cards found' };
  }

  // Make sure all fuel cards belong to same player as target
  const allSamePlayer = fuelCards.every(
    (f) => f.player_id === target.player_id,
  );
  if (!allSamePlayer) {
    return {
      success: false,
      error: 'All cards must belong to the same player',
    };
  }

  // Make sure target is not one of the fuel cards
  if (fuelCardIds.includes(targetCardId)) {
    return { success: false, error: 'Cannot use target card as fuel' };
  }

  // Check recharge method
  let valid = false;

  // Method 1: 3 Common cards
  if (fuelCards.length === 3 && fuelCards.every((f) => f.rarity === 'common')) {
    valid = true;
  }

  // Method 2: 1 same-rarity card
  if (fuelCards.length === 1 && fuelCards[0].rarity === target.rarity) {
    valid = true;
  }

  if (!valid) {
    return {
      success: false,
      error: 'Invalid recharge: need 3 Commons OR 1 card of same rarity',
    };
  }

  // Delete fuel cards (they are consumed)
  const { error: deleteError } = await supabase
    .from('player_cards')
    .delete()
    .in('id', fuelCardIds);

  if (deleteError) {
    console.error('Error deleting fuel cards:', deleteError);
    return { success: false, error: 'Failed to consume fuel cards' };
  }

  // Restore target card to full charges
  const { data: updated, error: updateError } = await supabase
    .from('player_cards')
    .update({
      current_charges: target.max_charges,
      is_exhausted: false,
    })
    .eq('id', targetCardId)
    .select()
    .single();

  if (updateError) {
    console.error('Error recharging card:', updateError);
    return { success: false, error: 'Failed to recharge card' };
  }

  // Log the recharge
  await supabase.from('card_durability_log').insert({
    card_id: targetCardId,
    action_type: 'recharge',
    charges_before: target.current_charges,
    charges_after: target.max_charges,
  });

  console.log(
    `Card ${targetCardId} recharged: ${target.current_charges} → ${target.max_charges}`,
  );

  return {
    success: true,
    card: updated,
    fuelConsumed: fuelCardIds.length,
  };
}

module.exports = {
  CHARGES_BY_RARITY,
  RARITY_BONUSES,
  getMaxCharges,
  getEffectiveStats,
  useCharge,
  rechargeCard,
};
