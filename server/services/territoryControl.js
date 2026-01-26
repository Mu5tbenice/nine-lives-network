const supabase = require('../config/supabase');

/**
 * Territory Control System
 * Handles zone control calculations, daily winners, and snapshots
 */

/**
 * Calculate control percentage for a zone based on casts today
 * Uses percentage of participating players per school (not raw points)
 */
async function calculateZoneControl(zoneId) {
  try {
    // Get today's start time (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get all casts for this zone today
    const { data: casts, error: castsError } = await supabase
      .from('casts')
      .select('player_id, points_earned')
      .eq('zone_id', zoneId)
      .gte('created_at', today.toISOString());

    if (castsError) {
      console.error('Error fetching casts:', castsError);
      return null;
    }

    if (!casts || casts.length === 0) {
      console.log('No casts today for zone', zoneId);
      return {};
    }

    // Get player school IDs separately
    const playerIds = [...new Set(casts.map(c => c.player_id))];
    const { data: players } = await supabase
      .from('players')
      .select('id, school_id')
      .in('id', playerIds);

    const playerSchoolMap = {};
    players?.forEach(p => { playerSchoolMap[p.id] = p.school_id; });

    // Aggregate points by school
    const schoolPoints = {};
    const schoolCasters = {}; // Track unique casters per school

    casts.forEach(cast => {
      const schoolId = playerSchoolMap[cast.player_id];
      if (!schoolId) return;

      if (!schoolPoints[schoolId]) {
        schoolPoints[schoolId] = 0;
        schoolCasters[schoolId] = new Set();
      }

      schoolPoints[schoolId] += cast.points_earned || 0;
      schoolCasters[schoolId].add(cast.player_id);
    });

    // Calculate total points
    const totalPoints = Object.values(schoolPoints).reduce((sum, p) => sum + p, 0);

    if (totalPoints === 0) return {};

    // Calculate percentage for each school
    const controlPercentages = {};
    for (const [schoolId, points] of Object.entries(schoolPoints)) {
      controlPercentages[schoolId] = {
        percentage: (points / totalPoints) * 100,
        points: points,
        casterCount: schoolCasters[schoolId].size
      };
    }

    return controlPercentages;

  } catch (error) {
    console.error('Error calculating zone control:', error);
    return null;
  }
}

/**
 * Update zone_control table with current percentages
 */
async function updateZoneControlTable(zoneId) {
  try {
    const controlData = await calculateZoneControl(zoneId);

    if (!controlData || Object.keys(controlData).length === 0) {
      return { updated: false, reason: 'No casts today' };
    }

    // Clear existing control for this zone
    await supabase
      .from('zone_control')
      .delete()
      .eq('zone_id', zoneId);

    // Insert new control data
    const insertData = Object.entries(controlData).map(([schoolId, data]) => ({
      zone_id: zoneId,
      school_id: parseInt(schoolId),
      control_percentage: data.percentage,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('zone_control')
      .insert(insertData);

    if (error) {
      console.error('Error updating zone control:', error);
      return { updated: false, error };
    }

    console.log(`Updated zone ${zoneId} control:`, controlData);
    return { updated: true, data: controlData };

  } catch (error) {
    console.error('Error in updateZoneControlTable:', error);
    return { updated: false, error };
  }
}

/**
 * Determine the daily winner for a zone
 */
async function determineDailyWinner(zoneId) {
  try {
    const controlData = await calculateZoneControl(zoneId);

    if (!controlData || Object.keys(controlData).length === 0) {
      return { winner: null, reason: 'No participation' };
    }

    // Find school with highest percentage
    let winnerId = null;
    let highestPercentage = 0;

    for (const [schoolId, data] of Object.entries(controlData)) {
      if (data.percentage > highestPercentage) {
        highestPercentage = data.percentage;
        winnerId = parseInt(schoolId);
      }
    }

    // Get school name
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', winnerId)
      .single();

    return {
      winner: {
        school_id: winnerId,
        school_name: school?.name || 'Unknown',
        percentage: highestPercentage
      },
      allResults: controlData
    };

  } catch (error) {
    console.error('Error determining winner:', error);
    return { winner: null, error };
  }
}

/**
 * Take a daily snapshot of zone control for history
 */
async function takeDailySnapshot(zoneId) {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const controlData = await calculateZoneControl(zoneId);
    const winner = await determineDailyWinner(zoneId);

    // Check if zone_history table exists, if not we'll just log
    const snapshot = {
      zone_id: zoneId,
      date: today.toISOString().split('T')[0],
      winner_school_id: winner.winner?.school_id || null,
      winner_percentage: winner.winner?.percentage || 0,
      control_data: controlData,
      total_casts: Object.values(controlData).reduce((sum, d) => sum + (d.casterCount || 0), 0)
    };

    console.log('Daily snapshot:', snapshot);

    // Try to insert into zone_history if it exists
    try {
      await supabase
        .from('zone_history')
        .insert(snapshot);
    } catch (e) {
      // Table might not exist, that's ok
      console.log('zone_history table not available, snapshot logged only');
    }

    return snapshot;

  } catch (error) {
    console.error('Error taking snapshot:', error);
    return null;
  }
}

/**
 * Get zone control history
 */
async function getZoneHistory(zoneId, days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('zone_history')
      .select('*')
      .eq('zone_id', zoneId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      // Table might not exist
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('Error getting zone history:', error);
    return [];
  }
}

/**
 * Award bonus points to winning school members
 */
async function awardWinnerBonuses(zoneId) {
  try {
    const winner = await determineDailyWinner(zoneId);

    if (!winner.winner) {
      console.log('No winner to award bonuses');
      return { awarded: false, reason: 'No winner' };
    }

    const winningSchoolId = winner.winner.school_id;
    const bonusPoints = 5; // +5 points to each participating member

    // Get today's start
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get all players from winning school who cast today
    const { data: casts } = await supabase
      .from('casts')
      .select('player_id, players(school_id)')
      .eq('zone_id', zoneId)
      .gte('created_at', today.toISOString());

    const winningCasters = new Set();
    casts?.forEach(cast => {
      if (cast.players?.school_id === winningSchoolId) {
        winningCasters.add(cast.player_id);
      }
    });

    if (winningCasters.size === 0) {
      return { awarded: false, reason: 'No casters from winning school' };
    }

    // Award bonus to each caster
    for (const playerId of winningCasters) {
      const { data: player } = await supabase
        .from('players')
        .select('seasonal_points, lifetime_points')
        .eq('id', playerId)
        .single();

      if (player) {
        await supabase
          .from('players')
          .update({
            seasonal_points: (player.seasonal_points || 0) + bonusPoints,
            lifetime_points: (player.lifetime_points || 0) + bonusPoints
          })
          .eq('id', playerId);
      }
    }

    console.log(`Awarded ${bonusPoints} bonus points to ${winningCasters.size} players from school ${winningSchoolId}`);

    return {
      awarded: true,
      school_id: winningSchoolId,
      school_name: winner.winner.school_name,
      players_awarded: winningCasters.size,
      points_each: bonusPoints
    };

  } catch (error) {
    console.error('Error awarding bonuses:', error);
    return { awarded: false, error };
  }
}

/**
 * Run end-of-day processing for a zone
 * - Calculate final control
 * - Determine winner
 * - Take snapshot
 * - Award bonuses
 */
async function endOfDayProcessing(zoneId) {
  console.log(`\n=== End of Day Processing for Zone ${zoneId} ===`);

  // Update final control percentages
  const controlUpdate = await updateZoneControlTable(zoneId);
  console.log('Control update:', controlUpdate);

  // Determine winner
  const winner = await determineDailyWinner(zoneId);
  console.log('Winner:', winner);

  // Take snapshot
  const snapshot = await takeDailySnapshot(zoneId);
  console.log('Snapshot:', snapshot);

  // Award bonuses
  const bonuses = await awardWinnerBonuses(zoneId);
  console.log('Bonuses:', bonuses);

  return {
    controlUpdate,
    winner,
    snapshot,
    bonuses
  };
}

/**
 * Get current objective zone
 */
async function getCurrentObjective() {
  const { data: zone } = await supabase
    .from('zones')
    .select('*')
    .eq('is_current_objective', true)
    .single();

  return zone;
}

module.exports = {
  calculateZoneControl,
  updateZoneControlTable,
  determineDailyWinner,
  takeDailySnapshot,
  getZoneHistory,
  awardWinnerBonuses,
  endOfDayProcessing,
  getCurrentObjective
};