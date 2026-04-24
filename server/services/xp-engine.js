/**
 * XP Engine — Nine Lives Network V5
 * Handles XP calculation, level-up logic, and zone unlock gating.
 */

const supabaseAdmin = require('../config/supabaseAdmin');

// ═══════════════════════════════════════
// XP CURVE — Total XP needed to REACH each level
// ═══════════════════════════════════════
const XP_CURVE = {
  1: 0,
  2: 50,
  3: 150,
  4: 300,
  5: 500,
  6: 750,
  7: 1050,
  8: 1400,
  9: 1800,
  10: 2300,
  11: 2900,
  12: 3500,
  13: 4200,
  14: 5000,
  15: 5900,
  16: 6300,
  17: 7200,
  18: 8200,
  19: 9000,
  20: 10000,
  21: 11200,
  22: 12500,
  23: 14000,
  24: 15000,
  25: 16000,
  26: 17500,
  27: 19000,
  28: 21000,
  29: 22500,
  30: 24000,
};

const MAX_LEVEL = 30;

// ═══════════════════════════════════════
// ZONE UNLOCK SCHEDULE
// ═══════════════════════════════════════
// Level → max zones a player can deploy to
const ZONE_UNLOCKS = {
  1: 1,
  5: 2,
  10: 3,
  15: 4,
  20: 5,
};

// ═══════════════════════════════════════
// ITEM SLOTS — All open from level 1
// Trinket slots (future) will be level-gated
// ═══════════════════════════════════════
const ITEM_SLOTS = [
  'weapon',
  'outfit',
  'headwear',
  'expression',
  'fur',
  'familiar',
];
const ITEM_SLOT_UNLOCKS = {}; // Reserved for future trinket slots

// ═══════════════════════════════════════
// XP REWARD VALUES
// ═══════════════════════════════════════
const XP_REWARDS = {
  zone_survive: 2,
  zone_win: 3,
  zone_ko: 5,
  zone_flip: 8,
  duel_win: 4,
  duel_lose: 1,
  daily_login: 5,
};

// ═══════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════

/**
 * Get level from total XP
 */
function getLevel(totalXP) {
  let level = 1;
  for (let l = 2; l <= MAX_LEVEL; l++) {
    if (totalXP >= XP_CURVE[l]) {
      level = l;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Get total XP needed to reach a given level
 */
function getXPForLevel(level) {
  if (level < 1) return 0;
  if (level > MAX_LEVEL) return XP_CURVE[MAX_LEVEL];
  return XP_CURVE[level] || 0;
}

/**
 * Get max zones a player can deploy to at their level
 */
function getMaxZones(level) {
  let maxZones = 1;
  for (const [reqLevel, zones] of Object.entries(ZONE_UNLOCKS)) {
    if (level >= parseInt(reqLevel)) {
      maxZones = zones;
    }
  }
  return maxZones;
}

/**
 * Get unlocked item slots at a given level (all open from level 1)
 */
function getUnlockedSlots(level) {
  return ITEM_SLOTS.map(function (slot) {
    return { slot, unlockedAt: 1 };
  });
}

/**
 * Get all unlocks info for a level (zones + next unlock)
 */
function getUnlocks(level) {
  const maxZones = getMaxZones(level);
  const slots = getUnlockedSlots(level);

  // Find next zone unlock
  let nextUnlock = null;
  const zoneLevels = Object.keys(ZONE_UNLOCKS)
    .map(Number)
    .sort((a, b) => a - b);

  for (const ul of zoneLevels) {
    if (ul > level) {
      nextUnlock = {
        level: ul,
        type: 'zone_slot',
        description: `Zone slot ${ZONE_UNLOCKS[ul]} unlocked`,
      };
      break;
    }
  }

  return { maxZones, slots, nextUnlock };
}

// ═══════════════════════════════════════
// MAIN FUNCTION: ADD XP
// ═══════════════════════════════════════

/**
 * Add XP to a player. Handles level-up detection.
 * @param {number} playerId
 * @param {number} amount - XP to add
 * @param {string} source - what action gave the XP (for logging)
 * @returns {{ newXP, newLevel, previousLevel, leveledUp, unlocksGained }}
 */
async function addXP(playerId, amount, source = 'unknown') {
  if (!playerId || amount <= 0) return null;

  try {
    // Get current XP/level
    let { data: row, error } = await supabaseAdmin
      .from('player_levels')
      .select('xp, level')
      .eq('player_id', playerId)
      .single();

    // If no row exists, create one
    if (!row) {
      const { data: newRow, error: insertErr } = await supabaseAdmin
        .from('player_levels')
        .insert({ player_id: playerId, xp: 0, level: 1 })
        .select('xp, level')
        .single();

      if (insertErr) {
        console.error(
          '[XP] Failed to create player_levels row:',
          insertErr.message,
        );
        return null;
      }
      row = newRow;
    }

    const previousLevel = row.level;
    const newXP = row.xp + amount;
    const newLevel = getLevel(newXP);
    const leveledUp = newLevel > previousLevel;

    // Update database
    const { error: updateErr } = await supabaseAdmin
      .from('player_levels')
      .update({
        xp: newXP,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', playerId);

    if (updateErr) {
      console.error('[XP] Failed to update:', updateErr.message);
      return null;
    }

    // Calculate any new unlocks gained from leveling up
    let unlocksGained = [];
    if (leveledUp) {
      for (let l = previousLevel + 1; l <= newLevel; l++) {
        if (ZONE_UNLOCKS[l]) {
          unlocksGained.push({
            type: 'zone_slot',
            level: l,
            description: `Zone slot ${ZONE_UNLOCKS[l]} unlocked!`,
          });
        }
      }

      console.log(
        `[XP] ${playerId} leveled up! ${previousLevel} → ${newLevel} (+${amount} XP from ${source})`,
      );

      // V5: Award a random item on level-up
      try {
        const roll = Math.random() * 100;
        let rarity;
        if (roll < 30) rarity = 'common';
        else if (roll < 60) rarity = 'uncommon';
        else if (roll < 85) rarity = 'rare';
        else if (roll < 96) rarity = 'epic';
        else rarity = 'legendary';

        const { data: candidates } = await supabaseAdmin
          .from('items')
          .select('id, name, rarity, slot')
          .eq('rarity', rarity)
          .eq('is_active', true);
        if (candidates && candidates.length > 0) {
          const item =
            candidates[Math.floor(Math.random() * candidates.length)];
          await supabaseAdmin.from('player_items').insert({
            player_id: playerId,
            item_id: item.id,
            source: 'level_up',
          });
          unlocksGained.push({
            type: 'item_drop',
            item: item,
            description: `Level up reward: ${item.name} (${item.rarity})!`,
          });
        }
      } catch (dropErr) {
        console.error('[XP] Level-up item drop failed:', dropErr.message);
      }
    }

    return {
      newXP,
      newLevel,
      previousLevel,
      leveledUp,
      unlocksGained,
    };
  } catch (err) {
    console.error('[XP] addXP error:', err.message);
    return null;
  }
}

module.exports = {
  addXP,
  getLevel,
  getXPForLevel,
  getMaxZones,
  getUnlockedSlots,
  getUnlocks,
  XP_REWARDS,
  XP_CURVE,
  ITEM_SLOTS,
  MAX_LEVEL,
};
