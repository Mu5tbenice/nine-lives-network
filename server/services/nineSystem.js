// server/services/nineSystem.js
// Handles creating and managing player Nines
//
// UPDATED March 2026 — Removed hardcoded house stats.
// Now reads from houses table (single source of truth).

const supabase = require('../config/supabase');

/**
 * Create a Nine for a player based on their house.
 * Called during registration after house selection.
 * Stats come from the houses table — never hardcoded.
 */
async function createNine(playerId, houseId, name = null) {
  // Get house stats from DB (single source of truth)
  const { data: house, error: houseErr } = await supabase
    .from('houses')
    .select('name, base_atk, base_hp, base_spd, base_def, base_luck')
    .eq('id', houseId)
    .single();

  if (houseErr || !house) {
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
      base_atk:  house.base_atk,
      base_hp:   house.base_hp,
      base_spd:  house.base_spd,
      base_def:  house.base_def,
      base_luck: house.base_luck,
      current_hp: house.base_hp,
      is_ko: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating Nine:', error);
    throw error;
  }

  console.log(`Created Nine for player ${playerId}: ${house.name} (ATK:${house.base_atk} HP:${house.base_hp} SPD:${house.base_spd})`);
  return data;
}

/**
 * Get a player's Nine with full stats.
 */
async function getNine(playerId) {
  const { data, error } = await supabase
    .from('player_nines')
    .select('*, houses:house_id(name, slug, base_atk, base_hp, base_spd, base_def, base_luck, role)')
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
 * Uses house base_hp from houses table as the true max.
 */
async function healNine(nineId) {
  // Get the Nine's house to find true max HP
  const { data: nine } = await supabase
    .from('player_nines')
    .select('house_id')
    .eq('id', nineId)
    .single();

  if (!nine) return null;

  const { data: house } = await supabase
    .from('houses')
    .select('base_hp')
    .eq('id', nine.house_id)
    .single();

  if (!house) return null;

  const { data, error } = await supabase
    .from('player_nines')
    .update({ current_hp: house.base_hp, is_ko: false })
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
 * Midnight reset: heal all Nines to full HP based on their house base_hp.
 */
async function midnightResetAllNines() {
  // Join player_nines with houses to get true base_hp for each
  const { data: nines, error: fetchError } = await supabase
    .from('player_nines')
    .select('id, house_id, houses:house_id(base_hp)');

  if (fetchError) {
    console.error('Error fetching nines for reset:', fetchError);
    return;
  }

  for (const nine of nines) {
    const maxHp = nine.houses?.base_hp || 100;
    await supabase
      .from('player_nines')
      .update({ current_hp: maxHp, is_ko: false })
      .eq('id', nine.id);
  }

  console.log(`Midnight reset: healed ${nines.length} Nines to full HP`);
}

module.exports = {
  createNine,
  getNine,
  healNine,
  damageNine,
  midnightResetAllNines,
};