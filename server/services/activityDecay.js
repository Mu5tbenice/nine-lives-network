const supabase = require('../config/supabaseAdmin');

/**
 * Activity Decay System
 * Penalizes inactive players to keep leaderboards competitive
 */

/**
 * Check all players for inactivity and apply penalties
 * - 3+ days inactive: -5% seasonal points
 * - 7+ days inactive: Mark as inactive (hidden from main leaderboards)
 */
async function processActivityDecay() {
  console.log('🔄 Processing activity decay...');

  const now = new Date();
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    // Get all active players
    const { data: players, error } = await supabase
      .from('players')
      .select('id, twitter_handle, seasonal_points, last_cast_at, is_active')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching players:', error);
      return { processed: 0, penalties: 0, deactivated: 0 };
    }

    let penalties = 0;
    let deactivated = 0;

    for (const player of players) {
      const lastCast = player.last_cast_at
        ? new Date(player.last_cast_at)
        : null;

      // Skip players who have never cast (new players get grace period)
      if (!lastCast) continue;

      // 7+ days inactive: Mark as inactive
      if (lastCast < sevenDaysAgo) {
        await supabase
          .from('players')
          .update({ is_active: false })
          .eq('id', player.id);

        console.log(`⚠️ @${player.twitter_handle} marked inactive (7+ days)`);
        deactivated++;
      }
      // 3-7 days inactive: -5% points penalty
      else if (lastCast < threeDaysAgo) {
        const penalty = Math.floor((player.seasonal_points || 0) * 0.05);
        if (penalty > 0) {
          await supabase
            .from('players')
            .update({
              seasonal_points: (player.seasonal_points || 0) - penalty,
            })
            .eq('id', player.id);

          console.log(
            `📉 @${player.twitter_handle} -${penalty} points (3+ days inactive)`,
          );
          penalties++;
        }
      }
    }

    console.log(
      `✅ Activity decay complete: ${penalties} penalties, ${deactivated} deactivated`,
    );
    return { processed: players.length, penalties, deactivated };
  } catch (error) {
    console.error('Error in activity decay:', error);
    return { processed: 0, penalties: 0, deactivated: 0, error };
  }
}

/**
 * Reactivate a player (when they cast again after being inactive)
 */
async function reactivatePlayer(playerId) {
  try {
    const { error } = await supabase
      .from('players')
      .update({ is_active: true })
      .eq('id', playerId);

    if (!error) {
      console.log(`✅ Player ${playerId} reactivated`);
    }
    return !error;
  } catch (error) {
    console.error('Error reactivating player:', error);
    return false;
  }
}

/**
 * Get inactive players (for admin review)
 */
async function getInactivePlayers() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, twitter_handle, school_id, seasonal_points, last_cast_at')
      .eq('is_active', false)
      .order('last_cast_at', { ascending: false });

    return data || [];
  } catch (error) {
    console.error('Error getting inactive players:', error);
    return [];
  }
}

module.exports = {
  processActivityDecay,
  reactivatePlayer,
  getInactivePlayers,
};
