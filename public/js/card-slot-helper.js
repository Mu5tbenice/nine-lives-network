/* ═══════════════════════════════════════════════════════
   card-slot-helper.js — Builds mini card-slot HTML with v4 data attrs
   Used on: duels, gauntlet, boss (small selection tiles)

   Usage:  buildCardSlot(card, onclick)
   Returns HTML string for a card-slot div
   ═══════════════════════════════════════════════════════ */

var SLOT_TYPE_COLORS = {
  attack: '#e85a6a', defend: '#6ac8d8',
  support: '#6acd8a', manipulation: '#b088e8'
};
var SLOT_RARITY_COLORS = {
  common: '#888', uncommon: '#66dd66', rare: '#55bbff',
  epic: '#bb88ff', legendary: '#ffd700'
};

function buildCardSlot(c, onclick) {
  var house = (c.house || c.spell_house || c.school_id || 'universal').toString().toLowerCase();
  var type = (c.card_type || c.spell_type || 'attack').toLowerCase();
  var rarity = (c.rarity || 'common').toLowerCase();
  var atk = c.base_atk || c.atk || 0;
  var hp = c.base_hp || c.hp || 0;
  var name = c.name || c.spell_name || 'Unknown';
  var tc = SLOT_TYPE_COLORS[type] || '#9B8E7E';
  var rc = SLOT_RARITY_COLORS[rarity] || '#888';

  var h = '<div class="card-slot" data-house="' + house + '" data-rarity="' + rarity + '"';
  if (onclick) h += ' onclick="' + onclick + '"';
  h += '>';
  h += '<div class="card-name">' + esc(name) + '</div>';
  h += '<div class="card-type" style="color:' + tc + '">' + type.toUpperCase() + '</div>';
  h += '<div class="card-stats">';
  h += '<span class="card-stat stat-atk">⚔' + atk + '</span>';
  h += '<span class="card-stat stat-hp">♥' + hp + '</span>';
  h += '</div>';
  h += '<div class="card-rarity r-' + rarity + '" style="color:' + rc + '">' + rarity.toUpperCase() + '</div>';
  h += '</div>';
  return h;
}