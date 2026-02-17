// server/services/manaRegen.js
// Handles hourly mana regeneration and social earn methods

const supabase = require('../config/supabase');

const MANA_CAP = 10;         // Max mana a player can hold
const REGEN_AMOUNT = 1;      // Mana gained per hour
const REGEN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Social earn amounts
const EARN_METHODS = {
  retweet: 1,       // RT the daily objective
  mini_game: 1,     // Complete a mini-game
  quest: 1,         // Complete a daily quest
  streak_bonus: 2,  // 7-day login streak
};

/**
 * Check and regenerate mana for ALL players.
 * Called by scheduler every 5 minutes.
 * Awards 1 mana per hour elapsed since last regen, up to cap.
 */
async function regenMana() {
  const now = new Date();

  // Get all players who are below max mana
  const { data: players, error } = await supabase
    .from('players')
    .select('id, mana, max_mana, last_mana_regen')
    .lt('mana', MANA_CAP);

  if (error) {
    console.error('Error fetching players for mana regen:', error);
    return;
  }

  if (!players || players.length === 0) return;

  let regenCount = 0;

  for (const player of players) {
    const lastRegen = new Date(player.last_mana_regen || now);
    const msElapsed = now.getTime() - lastRegen.getTime();
    const hoursElapsed = Math.floor(msElapsed / REGEN_INTERVAL_MS);

    if (hoursElapsed < 1) continue; // Not enough time passed

    const maxMana = player.max_mana || MANA_CAP;
    const currentMana = player.mana || 0;
    const manaToAdd = Math.min(hoursElapsed * REGEN_AMOUNT, maxMana - currentMana);

    if (manaToAdd <= 0) continue;

    const newMana = currentMana + manaToAdd;

    const { error: updateError } = await supabase
      .from('players')
      .update({
        mana: newMana,
        last_mana_regen: now.toISOString(),
      })
      .eq('id', player.id);

    if (!updateError) {
      regenCount++;
    }
  }

  if (regenCount > 0) {
    console.log(`Mana regen: ${regenCount} players received mana`);
  }
}

/**
 * Award bonus mana to a player from a social action.
 * Returns the updated mana value.
 */
async function earnMana(playerId, method) {
  const amount = EARN_METHODS[method];
  if (!amount) {
    return { success: false, error: `Unknown earn method: ${method}` };
  }

  // Get current mana
  const { data: player, error: fetchError } = await supabase
    .from('players')
    .select('mana, max_mana')
    .eq('id', playerId)
    .single();

  if (fetchError || !player) {
    return { success: false, error: 'Player not found' };
  }

  const maxMana = player.max_mana || MANA_CAP;
  if (player.mana >= maxMana) {
    return { success: false, error: 'Already at max mana', mana: player.mana };
  }

  const newMana = Math.min(player.mana + amount, maxMana);

  const { error: updateError } = await supabase
    .from('players')
    .update({ mana: newMana })
    .eq('id', playerId);

  if (updateError) {
    return { success: false, error: 'Failed to update mana' };
  }

  console.log(`Player ${playerId} earned ${amount} mana (${method}): ${player.mana} → ${newMana}`);

  return {
    success: true,
    mana: newMana,
    maxMana: maxMana,
    earned: amount,
    method: method,
  };
}

/**
 * Get mana info for a player, including time until next regen.
 */
async function getManaInfo(playerId) {
  const { data: player, error } = await supabase
    .from('players')
    .select('mana, max_mana, last_mana_regen')
    .eq('id', playerId)
    .single();

  if (error || !player) {
    return null;
  }

  const now = new Date();
  const lastRegen = new Date(player.last_mana_regen || now);
  const msElapsed = now.getTime() - lastRegen.getTime();
  const msUntilNext = Math.max(0, REGEN_INTERVAL_MS - (msElapsed % REGEN_INTERVAL_MS));

  const minutesUntilNext = Math.ceil(msUntilNext / 60000);

  return {
    mana: player.mana || 0,
    maxMana: player.max_mana || MANA_CAP,
    nextRegenInMinutes: minutesUntilNext,
    nextRegenAt: new Date(now.getTime() + msUntilNext).toISOString(),
    isFull: (player.mana || 0) >= (player.max_mana || MANA_CAP),
  };
}

/**
 * Spend mana for an action. Returns true if successful.
 */
async function spendMana(playerId, amount) {
  const { data: player, error: fetchError } = await supabase
    .from('players')
    .select('mana')
    .eq('id', playerId)
    .single();

  if (fetchError || !player) {
    return { success: false, error: 'Player not found' };
  }

  if (player.mana < amount) {
    return { success: false, error: 'Not enough mana', current: player.mana, needed: amount };
  }

  const newMana = player.mana - amount;

  const { error: updateError } = await supabase
    .from('players')
    .update({ mana: newMana })
    .eq('id', playerId);

  if (updateError) {
    return { success: false, error: 'Failed to spend mana' };
  }

  return { success: true, mana: newMana };
}

module.exports = {
  MANA_CAP,
  EARN_METHODS,
  regenMana,
  earnMana,
  getManaInfo,
  spendMana,
};