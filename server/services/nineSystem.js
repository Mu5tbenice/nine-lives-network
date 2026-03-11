// server/services/nineSystem.js
// Handles creating and managing player Nines
// V2: reads all stats from houses table (source of truth)

const supabase = require('../config/supabase');

/**
 * Create a Nine for a player based on their house.
 * Reads stats from houses table — no hardcoded values.
 */
async function createNine(playerId, houseId, name = null) {
  const { data: house, error: houseErr } = await supabase
    .from('houses')
    .select('name, atk, hp, spd, def, luck')
    .eq('id', houseId)
    .single();

  if (houseErr || !house) {
    throw new Error(`Invalid house ID: ${houseId}`);
  }

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
      base_atk: house.atk,
      base_hp: house.hp,
      base_spd: house.spd,
      base_def: house.def,
      base_luck: house.luck,
      current_hp: house.hp,
      is_ko: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating Nine:', error);
    throw error;
  }

  console.log(`Created Nine for player ${playerId}: ${house.name} (ATK ${house.atk} / HP ${house.hp} / SPD ${house.spd} / DEF ${house.def} / LUCK ${house.luck})`);
  return data;
}

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
 * Heal a Nine to full HP.
 * Reads HP from houses table — V2 source of truth.
 */
async function healNine(nineId) {
  const { data: nine } = await supabase
    .from('player_nines')
    .select('house_id')
    .eq('id', nineId)
    .single();

  if (!nine) return null;

  const { data: house } = await supabase
    .from('houses')
    .select('hp')
    .eq('id', nine.house_id)
    .single();

  const fullHp = house?.hp || 100;

  const { data, error } = await supabase
    .from('player_nines')
    .update({ current_hp: fullHp, base_hp: fullHp, is_ko: false })
    .eq('id', nineId)
    .select()
    .single();

  if (error) {
    console.error('Error healing Nine:', error);
    return null;
  }
  return data;
}

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
 * Midnight reset: heal all Nines to full HP from houses table.
 */
async function midnightResetAllNines() {
  const { data: nines, error: fetchError } = await supabase
    .from('player_nines')
    .select('id, house_id');

  if (fetchError) {
    console.error('Error fetching nines for reset:', fetchError);
    return;
  }

  const { data: houses } = await supabase
    .from('houses')
    .select('id, hp');

  const houseHpMap = {};
  if (houses) houses.forEach(h => { houseHpMap[h.id] = h.hp; });

  for (const nine of nines) {
    const fullHp = houseHpMap[nine.house_id] || 100;
    await supabase
      .from('player_nines')
      .update({ current_hp: fullHp, base_hp: fullHp, is_ko: false })
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