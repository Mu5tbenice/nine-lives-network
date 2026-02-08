const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Territory Control System
 * Reads from territory_actions table (website attacks/defends)
 * Determines daily winners and updates zone ownership
 */

/**
 * Calculate influence for a zone based on today's territory_actions
 * Returns { schoolId: { power, percentage, playerCount } }
 */
async function calculateZoneInfluence(zoneId, gameDay) {
  try {
    var day = gameDay || new Date().toISOString().split('T')[0];

    var { data: actions, error } = await supabase
      .from('territory_actions')
      .select('player_id, school_id, action_type')
      .eq('zone_id', zoneId)
      .eq('game_day', day);

    if (error) {
      console.error('Error fetching actions for zone', zoneId, error);
      return {};
    }

    if (!actions || actions.length === 0) {
      return {};
    }

    // Aggregate power by school (attack=2, defend=1)
    var schools = {};
    actions.forEach(function(a) {
      if (!schools[a.school_id]) {
        schools[a.school_id] = { power: 0, players: {} };
      }
      schools[a.school_id].power += (a.action_type === 'attack' ? 2 : 1);
      schools[a.school_id].players[a.player_id] = true;
    });

    // Calculate total power
    var totalPower = 0;
    Object.values(schools).forEach(function(s) { totalPower += s.power; });

    if (totalPower === 0) return {};

    // Calculate percentages
    var result = {};
    Object.keys(schools).forEach(function(sid) {
      result[sid] = {
        power: schools[sid].power,
        percentage: Math.round((schools[sid].power / totalPower) * 100),
        playerCount: Object.keys(schools[sid].players).length
      };
    });

    return result;

  } catch (error) {
    console.error('Error calculating zone influence:', error);
    return {};
  }
}

/**
 * Update zone_control table for a specific zone
 */
async function updateZoneControlTable(zoneId) {
  try {
    var influence = await calculateZoneInfluence(zoneId);

    if (Object.keys(influence).length === 0) {
      return { updated: false, reason: 'No actions today' };
    }

    // Clear existing control for this zone
    await supabaseAdmin
      .from('zone_control')
      .delete()
      .eq('zone_id', zoneId);

    // Insert new control data
    var insertData = [];
    Object.keys(influence).forEach(function(sid) {
      insertData.push({
        zone_id: zoneId,
        school_id: parseInt(sid),
        control_percentage: influence[sid].percentage,
        updated_at: new Date().toISOString()
      });
    });

    var { error } = await supabaseAdmin
      .from('zone_control')
      .insert(insertData);

    if (error) {
      console.error('Error updating zone control:', error);
      return { updated: false, error: error };
    }

    return { updated: true, influence: influence };

  } catch (error) {
    console.error('Error in updateZoneControlTable:', error);
    return { updated: false, error: error };
  }
}

/**
 * Update zone control for ALL zones with activity today
 */
async function updateAllZoneControl() {
  try {
    var today = new Date().toISOString().split('T')[0];

    // Get all zones that have actions today
    var { data: activeZones, error } = await supabase
      .from('territory_actions')
      .select('zone_id')
      .eq('game_day', today);

    if (error || !activeZones) return;

    // Get unique zone IDs
    var zoneIds = {};
    activeZones.forEach(function(a) { zoneIds[a.zone_id] = true; });

    var updated = 0;
    for (var zoneId of Object.keys(zoneIds)) {
      var result = await updateZoneControlTable(parseInt(zoneId));
      if (result.updated) updated++;
    }

    console.log('Updated zone control for ' + updated + ' zones');
    return updated;

  } catch (error) {
    console.error('Error updating all zone control:', error);
    return 0;
  }
}

/**
 * Determine winner for a zone on a given day
 * Winner = school with highest influence percentage
 */
async function determineDailyWinner(zoneId, gameDay) {
  try {
    var influence = await calculateZoneInfluence(zoneId, gameDay);

    if (Object.keys(influence).length === 0) {
      return { winner: null, reason: 'No participation' };
    }

    // Find school with highest percentage
    var winnerId = null;
    var highestPct = 0;

    Object.keys(influence).forEach(function(sid) {
      if (influence[sid].percentage > highestPct) {
        highestPct = influence[sid].percentage;
        winnerId = parseInt(sid);
      }
    });

    return {
      winner: {
        school_id: winnerId,
        percentage: highestPct,
        power: influence[winnerId] ? influence[winnerId].power : 0,
        playerCount: influence[winnerId] ? influence[winnerId].playerCount : 0
      },
      allResults: influence
    };

  } catch (error) {
    console.error('Error determining winner:', error);
    return { winner: null, error: error };
  }
}

/**
 * Award bonus points to winning school's participants
 */
async function awardWinnerBonuses(zoneId, gameDay) {
  try {
    var day = gameDay || new Date().toISOString().split('T')[0];
    var result = await determineDailyWinner(zoneId, day);

    if (!result.winner) {
      return { awarded: false, reason: 'No winner' };
    }

    var winningSchoolId = result.winner.school_id;
    var bonusPoints = 10; // +10 to each participant from winning school

    // Get all actions from winning school on this zone today
    var { data: actions } = await supabase
      .from('territory_actions')
      .select('player_id')
      .eq('zone_id', zoneId)
      .eq('school_id', winningSchoolId)
      .eq('game_day', day);

    if (!actions || actions.length === 0) {
      return { awarded: false, reason: 'No winning casters found' };
    }

    // Get unique player IDs
    var playerIds = {};
    actions.forEach(function(a) { playerIds[a.player_id] = true; });
    var uniqueIds = Object.keys(playerIds).map(Number);

    // Award bonus to each player
    for (var i = 0; i < uniqueIds.length; i++) {
      var pid = uniqueIds[i];
      var { data: player } = await supabase
        .from('players')
        .select('seasonal_points, lifetime_points')
        .eq('id', pid)
        .single();

      if (player) {
        await supabaseAdmin
          .from('players')
          .update({
            seasonal_points: (player.seasonal_points || 0) + bonusPoints,
            lifetime_points: (player.lifetime_points || 0) + bonusPoints
          })
          .eq('id', pid);
      }
    }

    console.log('Awarded ' + bonusPoints + ' bonus pts to ' + uniqueIds.length + ' players from school ' + winningSchoolId + ' on zone ' + zoneId);

    return {
      awarded: true,
      school_id: winningSchoolId,
      players_awarded: uniqueIds.length,
      points_each: bonusPoints
    };

  } catch (error) {
    console.error('Error awarding bonuses:', error);
    return { awarded: false, error: error };
  }
}

/**
 * END OF DAY PROCESSING
 * Called at midnight UTC
 * 1. Find all zones with activity today
 * 2. Determine winner for each
 * 3. Update controlling_school_id on zones table
 * 4. Award bonus points to winners
 * 5. Clear zone_control table for fresh start
 */
async function endOfDayProcessing() {
  console.log('\n=== END OF DAY TERRITORY PROCESSING ===');
  console.log('Time: ' + new Date().toISOString());

  try {
    var today = new Date().toISOString().split('T')[0];

    // Get all zones with actions today
    var { data: activeActions, error } = await supabase
      .from('territory_actions')
      .select('zone_id')
      .eq('game_day', today);

    if (error || !activeActions || activeActions.length === 0) {
      console.log('No territory actions today. Nothing to process.');
      return { processed: 0 };
    }

    // Get unique zone IDs
    var zoneIds = {};
    activeActions.forEach(function(a) { zoneIds[a.zone_id] = true; });
    var uniqueZones = Object.keys(zoneIds).map(Number);

    console.log('Processing ' + uniqueZones.length + ' zones with activity');

    var results = [];

    for (var i = 0; i < uniqueZones.length; i++) {
      var zoneId = uniqueZones[i];
      console.log('\n--- Zone ' + zoneId + ' ---');

      // Determine winner
      var winnerResult = await determineDailyWinner(zoneId, today);
      console.log('Winner:', JSON.stringify(winnerResult.winner));

      if (winnerResult.winner) {
        // Update controlling_school_id on zones table
        var { error: updateError } = await supabaseAdmin
          .from('zones')
          .update({
            controlling_school_id: winnerResult.winner.school_id,
            last_captured_at: new Date().toISOString()
          })
          .eq('id', zoneId);

        if (updateError) {
          console.error('Error updating zone control:', updateError);
        } else {
          console.log('Zone ' + zoneId + ' now controlled by school ' + winnerResult.winner.school_id);
        }

        // Award bonuses
        var bonusResult = await awardWinnerBonuses(zoneId, today);
        console.log('Bonuses:', JSON.stringify(bonusResult));

        results.push({
          zone_id: zoneId,
          winner: winnerResult.winner,
          bonuses: bonusResult
        });
      } else {
        console.log('No winner for zone ' + zoneId);
        results.push({ zone_id: zoneId, winner: null });
      }
    }

    // Clear zone_control table for fresh start tomorrow
    var { error: clearError } = await supabaseAdmin
      .from('zone_control')
      .delete()
      .gte('zone_id', 0);

    if (clearError) {
      console.error('Error clearing zone_control:', clearError);
    } else {
      console.log('\nCleared zone_control table for new day');
    }

    console.log('\n=== END OF DAY COMPLETE ===');
    console.log('Processed ' + results.length + ' zones');

    return { processed: results.length, results: results };

  } catch (error) {
    console.error('Error in end of day processing:', error);
    return { processed: 0, error: error.message };
  }
}

/**
 * Get current objective zone
 */
async function getCurrentObjective() {
  try {
    var { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    return zone;
  } catch (error) {
    return null;
  }
}

module.exports = {
  calculateZoneInfluence,
  updateZoneControlTable,
  updateAllZoneControl,
  determineDailyWinner,
  awardWinnerBonuses,
  endOfDayProcessing,
  getCurrentObjective
};