// ═══════════════════════════════════════════════════════
// server/services/pointsService.js
// Nine Lives Network — Central Points Service
//
// THE one function everything calls to award points.
// Uses supabaseAdmin (service role) so RLS never blocks it.
//
// Usage:
//   const { addPoints } = require('./pointsService');
//   await addPoints(playerId, 10, 'zone_ko', 'Knocked out @StoneKing on Ember Wastes');
//
// ═══════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Also need the regular client for reads
const supabase = require('../config/supabase');

// V5: Drop Ticket integration — earn tickets when Chronicle awards points
let dropTicketEngine = null;
try {
  dropTicketEngine = require('./dropTicketEngine');
} catch (e) {
  /* not loaded yet */
}

const CHRONICLE_SOURCES = [
  'chronicle_reply',
  'chronicle_named',
  'chronicle_wildcard',
];

/**
 * Add points to a player. This is the ONLY function that should
 * ever modify seasonal_points or lifetime_points.
 *
 * @param {number} playerId - The player's ID
 * @param {number} amount - Points to add (always positive)
 * @param {string} source - Category tag: 'zone_deploy', 'zone_survive', 'zone_ko',
 *                          'zone_flip', 'zone_control', 'chronicle_reply', 'chronicle_named',
 *                          'chronicle_wildcard', 'midnight_bonus', etc.
 * @param {string} [description] - Optional human-readable description
 * @returns {object} { success, new_seasonal, new_lifetime }
 */
async function addPoints(playerId, amount, source, description) {
  if (!playerId || !amount || amount <= 0) {
    return { success: false, error: 'Invalid playerId or amount' };
  }

  try {
    // Step 1: Get current points
    const { data: player, error: fetchErr } = await supabase
      .from('players')
      .select('seasonal_points, lifetime_points')
      .eq('id', playerId)
      .single();

    if (fetchErr || !player) {
      console.error(
        `[Points] Player ${playerId} not found:`,
        fetchErr?.message,
      );
      return { success: false, error: 'Player not found' };
    }

    const newSeasonal = (player.seasonal_points || 0) + amount;
    const newLifetime = (player.lifetime_points || 0) + amount;

    // Step 2: Update player points (using admin client — bypasses RLS)
    const { error: updateErr } = await supabaseAdmin
      .from('players')
      .update({
        seasonal_points: newSeasonal,
        lifetime_points: newLifetime,
      })
      .eq('id', playerId);

    if (updateErr) {
      console.error(
        `[Points] Update failed for ${playerId}:`,
        updateErr.message,
      );
      return { success: false, error: updateErr.message };
    }

    // Step 3: Log it (non-blocking — don't fail if table doesn't exist yet)
    try {
      await supabaseAdmin.from('point_log').insert({
        player_id: playerId,
        amount: amount,
        source: source,
        description: description || null,
      });
    } catch (logErr) {
      // point_log table might not exist yet — that's OK
    }

    // Step 4: V5 — Auto-earn Drop Ticket for Chronicle participation
    if (dropTicketEngine && CHRONICLE_SOURCES.includes(source)) {
      try {
        await dropTicketEngine.earnTicket(playerId, source);
      } catch (ticketErr) {
        // Non-blocking — don't fail points award if tickets fail
      }
    }

    return {
      success: true,
      new_seasonal: newSeasonal,
      new_lifetime: newLifetime,
    };
  } catch (err) {
    console.error(`[Points] Error for player ${playerId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Batch add points to multiple players at once.
 * Used for zone control bonuses, wildcard endings, etc.
 *
 * @param {number[]} playerIds - Array of player IDs
 * @param {number} amount - Points per player
 * @param {string} source - Category tag
 * @param {string} [description] - Optional description
 * @returns {object} { success, count }
 */
async function addPointsBatch(playerIds, amount, source, description) {
  if (!playerIds || playerIds.length === 0 || !amount || amount <= 0) {
    return { success: false, count: 0 };
  }

  const uniqueIds = [...new Set(playerIds)];
  let count = 0;

  for (const pid of uniqueIds) {
    const result = await addPoints(pid, amount, source, description);
    if (result.success) count++;
  }

  return { success: true, count };
}

module.exports = { addPoints, addPointsBatch };
