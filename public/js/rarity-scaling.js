// ═══════════════════════════════════════════════════════
// public/js/rarity-scaling.js
// V2 Rarity Stat Scaling — scales card base stats by rarity
// Load BEFORE card-v4.js so buildCardV4 gets correct numbers
// ═══════════════════════════════════════════════════════

// Spells table stores Common base values.
// Rarity multiplier scales them up (Legendary = 2x Common).
window.RARITY_MULTIPLIER = {
  common:    1.0,
  uncommon:  1.2,
  rare:      1.42,
  epic:      1.69,
  legendary: 2.0,
};

/**
 * Scale a card's base stats by its rarity.
 * Call this on card data BEFORE passing to buildCardV4().
 * Safe to call multiple times — tracks if already scaled.
 *
 * @param {Object} card - Card data with rarity and base_atk/hp/spd/def/luck
 * @returns {Object} Same card object with stats scaled
 */
window.scaleCardStats = function(card) {
  if (!card || card._rarityScaled) return card;

  const rarity = (card.rarity || 'common').toLowerCase();
  const mult = window.RARITY_MULTIPLIER[rarity] || 1.0;

  // Only scale if not common (common = 1.0x, no change needed)
  if (mult !== 1.0) {
    if (card.base_atk)  card.base_atk  = Math.round(card.base_atk * mult);
    if (card.base_hp)   card.base_hp   = Math.round(card.base_hp * mult);
    if (card.base_spd)  card.base_spd  = Math.round(card.base_spd * mult);
    if (card.base_def)  card.base_def  = Math.round(card.base_def * mult);
    if (card.base_luck) card.base_luck = Math.round(card.base_luck * mult);
  }

  card._rarityScaled = true;
  return card;
};

/**
 * Scale an array of cards. Convenience wrapper.
 * @param {Array} cards - Array of card objects
 * @returns {Array} Same array with all cards scaled
 */
window.scaleAllCards = function(cards) {
  if (!Array.isArray(cards)) return cards;
  return cards.map(c => window.scaleCardStats(c));
};