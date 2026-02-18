// server/services/nineSystem.js
// Handles creating and managing player Nines

const supabase = require('../config/supabase');

// Base stats per house (from V3 Game Design doc section 5)
const HOUSE_BASE_STATS = {
  1: { name: 'Smoulders',   atk: 8, hp: 18, spd: 6, def: 1, luck: 3 },
  2: { name: 'Darktide',    atk: 6, hp: 22, spd: 5, def: 3, luck: 4 },
  3: { name: 'Stonebark',   atk: 4, hp: 28, spd: 3, def: 6, luck: 1 },
  4: { name: 'Ashenvale',   atk: 5, hp: 20, spd: 8, def: 2, luck: 6 },
  5: { name: 'Stormrage',   atk: 9, hp: 16, spd: 7, def: 1, luck: 3 },
  6: { name: 'Nighthollow', atk: 7, hp: 20, spd: 5, def: 3, luck: 5 },
  7: { name: 'Dawnbringer', atk: 5, hp: 24, spd: 4, def: 5, luck: 2 },
  8: { name: 'Manastorm',   atk: 6, hp: 20, spd: 6, def: 3, luck: 3 },
  9: { name: 'Plaguemire',  atk: 6, hp: 22, spd: 4, def: 3, luck: 3 },
};

/**
 * Create a Nine for a player based on their house.
 * Called during registration after house selection.
 */
async function createNine(playerId, houseId, name = null) {
  const stats = HOUSE_BASE_STATS[houseId];
  if (!stats) {
    throw new Error(`Invalid house ID: ${houseId}`);
  }

  // Check if player already has a Nine
  const { data: existing } = await supabase
    .from('player_nines')
    .select('id')
    .eq('player_id', playerId)
    .single();

  if (existing) {
    console.log(`Player ${playerId} already has a Nine (id: ${existing.id})`);
    return existing;
  }

  const { data, error } = await supabase
    .from('player_nines')
    .insert({
      player_id: playerId,
      house_id: houseId,
      name: name,
      base_atk: stats.atk,
      base_hp: stats.hp,
      base_spd: stats.spd,
      base_def: stats.def,
      base_luck: stats.luck,
      current_hp: stats.hp,
      is_ko: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating Nine:', error);
    throw error;
  }

  console.log(`Created Nine for player ${playerId}: ${stats.name} (${stats.atk}/${stats.hp}/${stats.spd})`);
  return data;
}

/**
 * Get a player's Nine with full stats.
 */
async function getNine(playerId) {
  const { data, error } = await supabase
    .from('player_nines')
    .select('*, schools:house_id(name, element)')
    .eq('player_id', playerId)
    .single();

  if (error) {
    console.error('Error fetching Nine:', error);
    return null;
  }

  return data;
}

/**
 * Heal a Nine to full HP (used on deploy, midnight reset, etc.)
 */
async function healNine(nineId) {
  // First get the Nine's base HP
  const { data: nine } = await supabase
    .from('player_nines')
    .select('base_hp')
    .eq('id', nineId)
    .single();

  if (!nine) return null;

  const { data, error } = await supabase
    .from('player_nines')
    .update({ current_hp: nine.base_hp, is_ko: false })
    .eq('id', nineId)
    .select()
    .single();

  if (error) {
    console.error('Error healing Nine:', error);
    return null;
  }

  return data;
}

/**
 * Deal damage to a Nine. Returns updated Nine.
 * If HP reaches 0, sets is_ko = true.
 */
async function damageNine(nineId, amount) {
  const { data: nine } = await supabase
    .from('player_nines')
    .select('current_hp')
    .eq('id', nineId)
    .single();

  if (!nine) return null;

  const newHp = Math.max(0, nine.current_hp - amount);
  const isKo = newHp <= 0;

  const { data, error } = await supabase
    .from('player_nines')
    .update({ current_hp: newHp, is_ko: isKo })
    .eq('id', nineId)
    .select()
    .single();

  if (error) {
    console.error('Error damaging Nine:', error);
    return null;
  }

  return data;
}

/**
 * Midnight reset: heal all Nines to full HP and clear KO status.
 */
async function midnightResetAllNines() {
  // Get all nines with their base HP
  const { data: nines, error: fetchError } = await supabase
    .from('player_nines')
    .select('id, base_hp');

  if (fetchError) {
    console.error('Error fetching nines for reset:', fetchError);
    return;
  }

  // Update each nine to full HP
  for (const nine of nines) {
    await supabase
      .from('player_nines')
      .update({ current_hp: nine.base_hp, is_ko: false })
      .eq('id', nine.id);
  }

  console.log(`Midnight reset: healed ${nines.length} Nines to full HP`);
}

module.exports = {
  HOUSE_BASE_STATS,
  createNine,
  getNine,
  healNine,
  damageNine,
  midnightResetAllNines,
};