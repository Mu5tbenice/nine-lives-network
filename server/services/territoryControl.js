// ═══════════════════════════════════════════════════════
// server/services/territoryControl.js
// Midnight Banking + Territory Control System
// Called by scheduler at 00:00 UTC
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const effectEngine = require('./effectEngine');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const ZONE_CAPTURE_BONUS = 15;
const ZONE_HELD_BONUS = 5;
const DECAY_PERCENT = 40; // 40% decay overnight

// ═══════════════════════════════════
// MIDNIGHT BANKING (main entry point)
// Called once at 00:00 UTC
// ═══════════════════════════════════

async function midnightBanking() {
  console.log('\n════════════════════════════════════');
  console.log('  MIDNIGHT BANKING — ' + new Date().toISOString());
  console.log('════════════════════════════════════\n');

  const today = new Date().toISOString().split('T')[0];

  // Yesterday's date (the day we're processing)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  try {
    // STEP 1: Snapshot current influence
    console.log('[1/7] Saving influence snapshot...');
    await snapshotInfluence(yesterdayStr);

    // STEP 2: Process end-of-day zone flags (POISON, CORRODE)
    console.log('[2/7] Processing zone flags...');
    await processZoneFlags(yesterdayStr);

    // STEP 3: Determine winners + flip zones
    console.log('[3/7] Determining zone winners...');
    const results = await processZoneWinners(yesterdayStr);

    // STEP 4: Award bonuses (capture, held territory)
    console.log('[4/7] Awarding bonuses...');
    await awardBonuses(results, yesterdayStr);

    // STEP 5: Apply decay (reduce influence by ~40%)
    console.log('[5/7] Applying overnight decay...');
    await applyDecay();

    // STEP 6: Reset daily state
    console.log('[6/7] Resetting daily state...');
    await resetDaily();

    // STEP 7: Clear zone flags
    console.log('[7/7] Clearing zone flags...');
    await effectEngine.clearAllDailyFlags();

    console.log('\n════════════════════════════════════');
    console.log('  MIDNIGHT BANKING COMPLETE');
    console.log('  Processed: ' + results.length + ' zones');
    console.log('════════════════════════════════════\n');

    return { success: true, processed: results.length, results };
  } catch (error) {
    console.error('MIDNIGHT BANKING ERROR:', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════
// STEP 1: SNAPSHOT INFLUENCE
// Save current state to zone_influence_history
// ═══════════════════════════════════

async function snapshotInfluence(gameDay) {
  try {
    const influence = await getAllZoneInfluence(gameDay);
    const inserts = [];

    for (const [zoneId, schools] of Object.entries(influence)) {
      for (const [schoolId, data] of Object.entries(schools)) {
        inserts.push({
          zone_id: parseInt(zoneId),
          school_id: parseInt(schoolId),
          influence_pct: data.percentage,
          snapshot_time: new Date().toISOString(),
        });
      }
    }

    if (inserts.length > 0) {
      await supabaseAdmin.from('zone_influence_history').insert(inserts);
      console.log('  Saved ' + inserts.length + ' influence snapshots');
    }
  } catch (e) {
    console.error('  Snapshot error:', e.message);
  }
}

// ═══════════════════════════════════
// STEP 2: PROCESS ZONE FLAGS
// Apply POISON, CORRODE at end of day
// ═══════════════════════════════════

async function processZoneFlags(gameDay) {
  try {
    const dayStr = gameDay || new Date().toISOString().split('T')[0];
    const zoneStates = await effectEngine.getAllZoneFlagsForDate(dayStr);

    for (const state of zoneStates) {
      const flags = state.flags || {};
      const zoneId = state.zone_id;

      // POISON: leading house loses X%
      if (flags.poison) {
        const pct = flags.poison.pct || 2;
        const leader = await getLeadingHouse(zoneId, gameDay);
        if (leader) {
          await reduceInfluence(zoneId, leader.school_id, pct);
          console.log(
            '  Zone ' +
              zoneId +
              ': POISON -' +
              pct +
              '% from house ' +
              leader.school_id,
          );
        }
      }

      // CORRODE: all houses lose X%
      if (flags.corrode) {
        const pct = flags.corrode.pct || 3;
        await reduceAllInfluence(zoneId, pct);
        console.log(
          '  Zone ' + zoneId + ': CORRODE -' + pct + '% from all houses',
        );
      }
    }
  } catch (e) {
    console.error('  processZoneFlags error:', e.message);
  }
}

// ═══════════════════════════════════
// STEP 3: DETERMINE WINNERS + FLIP
// ═══════════════════════════════════

async function processZoneWinners(gameDay) {
  const results = [];

  try {
    const influence = await getAllZoneInfluence(gameDay);

    for (const [zoneId, schools] of Object.entries(influence)) {
      // Find highest influence house
      let winnerId = null;
      let highestPct = 0;

      for (const [schoolId, data] of Object.entries(schools)) {
        if (data.percentage > highestPct) {
          highestPct = data.percentage;
          winnerId = parseInt(schoolId);
        }
      }

      if (winnerId && highestPct > 0) {
        // Get current controller
        const { data: zone } = await supabase
          .from('zones')
          .select('controlling_school_id, days_held')
          .eq('id', parseInt(zoneId))
          .single();

        const prevController = zone ? zone.controlling_school_id : null;
        const isFlip = prevController !== winnerId;
        const daysHeld = isFlip ? 1 : ((zone ? zone.days_held : 0) || 0) + 1;

        // Update zone
        await supabaseAdmin
          .from('zones')
          .update({
            controlling_school_id: winnerId,
            days_held: daysHeld,
            last_captured_at: isFlip ? new Date().toISOString() : undefined,
          })
          .eq('id', parseInt(zoneId));

        if (isFlip) {
          console.log(
            '  Zone ' +
              zoneId +
              ': FLIPPED to house ' +
              winnerId +
              ' (' +
              highestPct +
              '%)',
          );
        } else {
          console.log(
            '  Zone ' +
              zoneId +
              ': HELD by house ' +
              winnerId +
              ' (day ' +
              daysHeld +
              ')',
          );
        }

        results.push({
          zone_id: parseInt(zoneId),
          winner_school_id: winnerId,
          percentage: highestPct,
          flipped: isFlip,
          days_held: daysHeld,
          prev_controller: prevController,
        });
      }
    }
  } catch (e) {
    console.error('  processZoneWinners error:', e.message);
  }

  return results;
}

// ═══════════════════════════════════
// STEP 4: AWARD BONUSES
// ═══════════════════════════════════

async function awardBonuses(results, gameDay) {
  try {
    for (const r of results) {
      // +15 pts to all participants from winning house
      const { data: actions } = await supabase
        .from('territory_actions')
        .select('player_id')
        .eq('zone_id', r.zone_id)
        .eq('school_id', r.winner_school_id)
        .eq('game_day', gameDay);

      if (!actions || actions.length === 0) continue;

      // Unique player IDs
      const playerIds = [...new Set(actions.map((a) => a.player_id))];

      for (const pid of playerIds) {
        // Zone capture bonus
        let bonus = ZONE_CAPTURE_BONUS;

        // Zone held 3+ days = extra passive bonus
        if (r.days_held >= 3) {
          bonus += ZONE_HELD_BONUS;
        }

        const { data: player } = await supabase
          .from('players')
          .select('seasonal_points, lifetime_points')
          .eq('id', pid)
          .single();

        if (player) {
          await supabaseAdmin
            .from('players')
            .update({
              seasonal_points: (player.seasonal_points || 0) + bonus,
              lifetime_points: (player.lifetime_points || 0) + bonus,
            })
            .eq('id', pid);
        }
      }

      console.log(
        '  Zone ' +
          r.zone_id +
          ': +' +
          ZONE_CAPTURE_BONUS +
          ' pts to ' +
          playerIds.length +
          ' players',
      );
    }
  } catch (e) {
    console.error('  awardBonuses error:', e.message);
  }
}

// ═══════════════════════════════════
// STEP 5: APPLY DECAY
// Reduce all zone_control by ~40%
// ═══════════════════════════════════

async function applyDecay() {
  try {
    const { data: controls } = await supabase.from('zone_control').select('*');

    if (!controls || controls.length === 0) return;

    let updated = 0;
    for (const c of controls) {
      const decayed = Math.round(
        c.control_percentage * (1 - DECAY_PERCENT / 100),
      );
      if (decayed <= 0) {
        await supabaseAdmin.from('zone_control').delete().eq('id', c.id);
      } else {
        await supabaseAdmin
          .from('zone_control')
          .update({
            control_percentage: decayed,
            updated_at: new Date().toISOString(),
          })
          .eq('id', c.id);
      }
      updated++;
    }

    console.log(
      '  Decayed ' +
        updated +
        ' zone_control entries by ' +
        DECAY_PERCENT +
        '%',
    );

    // Also decay community influence
    const { data: commControls } = await supabase
      .from('zone_community_control')
      .select('*');

    let commUpdated = 0;
    if (commControls) {
      for (const c of commControls) {
        const decayed = Math.round(
          c.control_percentage * (1 - DECAY_PERCENT / 100),
        );
        if (decayed <= 0) {
          await supabaseAdmin
            .from('zone_community_control')
            .delete()
            .eq('id', c.id);
        } else {
          await supabaseAdmin
            .from('zone_community_control')
            .update({
              control_percentage: decayed,
              updated_at: new Date().toISOString(),
            })
            .eq('id', c.id);
        }
        commUpdated++;
      }
    }
    console.log(
      '  Decayed ' +
        commUpdated +
        ' community_control entries by ' +
        DECAY_PERCENT +
        '%',
    );
  } catch (e) {
    console.error('  applyDecay error:', e.message);
  }
}

// ═══════════════════════════════════
// STEP 6: RESET DAILY STATE
// Mana → 7, streaks, objectives
// ═══════════════════════════════════

async function resetDaily() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Update streaks
    // Players who acted yesterday: increment streak
    const { data: activePlayers } = await supabase
      .from('territory_actions')
      .select('player_id')
      .eq('game_day', yesterdayStr);

    const activeIds = activePlayers
      ? [...new Set(activePlayers.map((a) => a.player_id))]
      : [];

    if (activeIds.length > 0) {
      for (const pid of activeIds) {
        const { data: p } = await supabase
          .from('players')
          .select('streak')
          .eq('id', pid)
          .single();
        if (p) {
          await supabaseAdmin
            .from('players')
            .update({ streak: (p.streak || 0) + 1 })
            .eq('id', pid);
        }
      }
      console.log(
        '  Incremented streak for ' + activeIds.length + ' active players',
      );
    }

    // Players who did NOT act yesterday: reset streak to 0
    if (activeIds.length > 0) {
      await supabaseAdmin
        .from('players')
        .update({ streak: 0 })
        .eq('is_active', true)
        .not('id', 'in', '(' + activeIds.join(',') + ')');
    }

    // Clear objective flag
    await supabaseAdmin
      .from('zones')
      .update({ is_current_objective: false })
      .eq('is_current_objective', true);

    console.log('  Cleared daily objective');
  } catch (e) {
    console.error('  resetDaily error:', e.message);
  }
}

// ═══════════════════════════════════
// HELPERS
// ═══════════════════════════════════

// Get influence breakdown for all zones on a given day
async function getAllZoneInfluence(gameDay) {
  const day = gameDay || new Date().toISOString().split('T')[0];
  const result = {};

  try {
    const { data: actions } = await supabase
      .from('territory_actions')
      .select('zone_id, school_id, action_type, total_power')
      .eq('game_day', day);

    if (!actions) return result;

    // Aggregate
    actions.forEach((a) => {
      if (!result[a.zone_id]) result[a.zone_id] = {};
      if (!result[a.zone_id][a.school_id]) {
        result[a.zone_id][a.school_id] = { power: 0, count: 0 };
      }
      // Use total_power if available, else fall back to simple counting
      const power = a.total_power || (a.action_type === 'attack' ? 2 : 1);
      result[a.zone_id][a.school_id].power += power;
      result[a.zone_id][a.school_id].count++;
    });

    // Calculate percentages
    for (const zoneId of Object.keys(result)) {
      let total = 0;
      for (const s of Object.values(result[zoneId])) total += s.power;
      for (const schoolId of Object.keys(result[zoneId])) {
        result[zoneId][schoolId].percentage =
          total > 0
            ? Math.round((result[zoneId][schoolId].power / total) * 100)
            : 0;
      }
    }
  } catch (e) {
    console.error('getAllZoneInfluence error:', e.message);
  }

  return result;
}

// Get leading house on a zone for today
async function getLeadingHouse(zoneId, gameDay) {
  const influence = await getAllZoneInfluence(gameDay);
  const zoneInf = influence[zoneId];
  if (!zoneInf) return null;

  let leaderId = null;
  let highest = 0;
  for (const [schoolId, data] of Object.entries(zoneInf)) {
    if (data.percentage > highest) {
      highest = data.percentage;
      leaderId = parseInt(schoolId);
    }
  }
  return leaderId ? { school_id: leaderId, percentage: highest } : null;
}

// Reduce influence for a specific house on a zone
async function reduceInfluence(zoneId, schoolId, pct) {
  try {
    const { data } = await supabase
      .from('zone_control')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('school_id', schoolId)
      .single();

    if (data) {
      const reduced = Math.max(0, data.control_percentage - pct);
      await supabaseAdmin
        .from('zone_control')
        .update({ control_percentage: reduced })
        .eq('id', data.id);
    }
  } catch (e) {
    /* non-critical */
  }
}

// Reduce influence for all houses on a zone
async function reduceAllInfluence(zoneId, pct) {
  try {
    const { data } = await supabase
      .from('zone_control')
      .select('*')
      .eq('zone_id', zoneId);

    if (data) {
      for (const row of data) {
        const reduced = Math.max(0, row.control_percentage - pct);
        await supabaseAdmin
          .from('zone_control')
          .update({ control_percentage: reduced })
          .eq('id', row.id);
      }
    }
  } catch (e) {
    /* non-critical */
  }
}

// Update zone control for a single zone (called by route every 5 min)
async function updateZoneControlTable(zoneId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const influence = await getAllZoneInfluence(today);
    const zoneInf = influence[zoneId];

    if (!zoneInf || Object.keys(zoneInf).length === 0) {
      return { updated: false, reason: 'No actions today' };
    }

    // Upsert each school's influence
    for (const [schoolId, data] of Object.entries(zoneInf)) {
      await supabaseAdmin.from('zone_control').upsert(
        {
          zone_id: zoneId,
          school_id: parseInt(schoolId),
          control_percentage: data.percentage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'zone_id,school_id' },
      );
    }

    return { updated: true };
  } catch (e) {
    console.error('updateZoneControlTable error:', e.message);
    return { updated: false, error: e.message };
  }
}

// Update all zones with activity today
async function updateAllZoneControl() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: actions } = await supabase
      .from('territory_actions')
      .select('zone_id')
      .eq('game_day', today);

    if (!actions) return 0;

    const zoneIds = [...new Set(actions.map((a) => a.zone_id))];
    let updated = 0;

    for (const zoneId of zoneIds) {
      const result = await updateZoneControlTable(zoneId);
      if (result.updated) updated++;
    }

    return updated;
  } catch (e) {
    console.error('updateAllZoneControl error:', e.message);
    return 0;
  }
}

// Get current objective zone
async function getCurrentObjective() {
  try {
    const { data } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();
    return data;
  } catch (e) {
    return null;
  }
}

// Set random objective zone for today
async function setRandomObjective() {
  try {
    // Clear old
    await supabaseAdmin
      .from('zones')
      .update({ is_current_objective: false })
      .eq('is_current_objective', true);

    // Pick random zone
    const { data: zones } = await supabase
      .from('zones')
      .select('id')
      .eq('zone_type', 'neutral');

    if (!zones || zones.length === 0) return null;

    const pick = zones[Math.floor(Math.random() * zones.length)];

    await supabaseAdmin
      .from('zones')
      .update({ is_current_objective: true })
      .eq('id', pick.id);

    console.log('[Objective] Set zone ' + pick.id + " as today's objective");
    return pick.id;
  } catch (e) {
    console.error('setRandomObjective error:', e.message);
    return null;
  }
}

module.exports = {
  midnightBanking,
  updateZoneControlTable,
  updateAllZoneControl,
  getCurrentObjective,
  setRandomObjective,
  getAllZoneInfluence,
  // Legacy export for backward compat
  endOfDayProcessing: midnightBanking,
};
