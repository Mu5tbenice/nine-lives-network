const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

// Admin client for writes
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ═══════════════════════════════════════════
// POST /api/territory/action
// Attack or defend a zone (costs 1 mana)
// ═══════════════════════════════════════════
router.post('/action', async (req, res) => {
  try {
    const { player_id, zone_id, action_type } = req.body;

    // Validate input
    if (!player_id || !zone_id || !['attack', 'defend'].includes(action_type)) {
      return res.status(400).json({ error: 'Invalid request. Need player_id, zone_id, and action_type (attack/defend).' });
    }

    // Get player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', player_id)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.mana < 1) {
      return res.status(400).json({ error: 'Not enough mana', mana_remaining: player.mana });
    }

    // Get zone
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('*')
      .eq('id', zone_id)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Check if already acted on this zone today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAction } = await supabase
      .from('territory_actions')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('game_day', today)
      .single();

    if (existingAction) {
      return res.status(400).json({ error: 'Already acted on this zone today' });
    }

    // Deduct mana
    await supabaseAdmin
      .from('players')
      .update({ mana: player.mana - 1 })
      .eq('id', player_id);

    // Record action
    const { data: action, error: actionError } = await supabaseAdmin
      .from('territory_actions')
      .insert({
        player_id,
        zone_id,
        school_id: player.school_id,
        action_type,
        power_contributed: 1,
        source: 'website',
        game_day: today
      })
      .select()
      .single();

    if (actionError) {
      // Refund mana on failure
      await supabaseAdmin.from('players').update({ mana: player.mana }).eq('id', player_id);
      console.error('Territory action insert error:', actionError);
      return res.status(500).json({ error: 'Failed to record action' });
    }

    // Calculate points: base 8, ×1.5 if objective zone
    var basePoints = 8;
    var multiplier = zone.is_current_objective ? 1.5 : 1.0;
    var pointsEarned = Math.round(basePoints * multiplier);

    // Update player points
    await supabaseAdmin
      .from('players')
      .update({
        seasonal_points: (player.seasonal_points || 0) + pointsEarned,
        lifetime_points: (player.lifetime_points || 0) + pointsEarned
      })
      .eq('id', player_id);

    // Update zone influence
    await updateZoneInfluence(zone_id, player.school_id, action_type);

    res.json({
      success: true,
      action,
      points_earned: pointsEarned,
      mana_remaining: player.mana - 1,
      is_objective: zone.is_current_objective,
      multiplier: multiplier
    });

  } catch (error) {
    console.error('Territory action error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/territory/actions/today
// All actions grouped by zone for today
// ═══════════════════════════════════════════
router.get('/actions/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: actions, error } = await supabase
      .from('territory_actions')
      .select('*, player:players(id, twitter_handle, profile_image, school_id)')
      .eq('game_day', today)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch actions error:', error);
      return res.status(500).json({ error: 'Failed to fetch actions' });
    }

    // Group by zone
    var byZone = {};
    if (actions) {
      actions.forEach(function(a) {
        if (!byZone[a.zone_id]) byZone[a.zone_id] = [];
        byZone[a.zone_id].push(a);
      });
    }

    res.json(byZone);

  } catch (error) {
    console.error('Territory actions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/territory/influence
// Current influence % per house per zone (today)
// ═══════════════════════════════════════════
router.get('/influence', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: actions, error } = await supabase
      .from('territory_actions')
      .select('zone_id, school_id, action_type')
      .eq('game_day', today);

    if (error) {
      console.error('Influence fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch influence data' });
    }

    // Calculate influence per zone
    var zones = {};
    if (actions) {
      actions.forEach(function(a) {
        if (!zones[a.zone_id]) zones[a.zone_id] = {};
        if (!zones[a.zone_id][a.school_id]) zones[a.zone_id][a.school_id] = 0;
        // Attacks add 2 influence, defends add 1
        zones[a.zone_id][a.school_id] += (a.action_type === 'attack' ? 2 : 1);
      });
    }

    // Convert to percentages
    var result = {};
    Object.keys(zones).forEach(function(zoneId) {
      var schools = zones[zoneId];
      var total = 0;
      Object.values(schools).forEach(function(v) { total += v; });

      result[zoneId] = {};
      Object.keys(schools).forEach(function(schoolId) {
        result[zoneId][schoolId] = Math.round((schools[schoolId] / total) * 100);
      });
    });

    res.json(result);

  } catch (error) {
    console.error('Influence error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/territory/zone/:id
// Detailed info for a single zone today
// ═══════════════════════════════════════════
router.get('/zone/:id', async (req, res) => {
  try {
    var zoneId = parseInt(req.params.id);
    var today = new Date().toISOString().split('T')[0];

    // Get zone
    var { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('*')
      .eq('id', zoneId)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Get today's actions for this zone
    var { data: actions, error: actionsError } = await supabase
      .from('territory_actions')
      .select('*, player:players(id, twitter_handle, profile_image, school_id)')
      .eq('zone_id', zoneId)
      .eq('game_day', today)
      .order('created_at', { ascending: false });

    if (actionsError) actions = [];

    // Calculate influence
    var influence = {};
    var totalPower = 0;
    if (actions) {
      actions.forEach(function(a) {
        if (!influence[a.school_id]) influence[a.school_id] = 0;
        influence[a.school_id] += (a.action_type === 'attack' ? 2 : 1);
        totalPower += (a.action_type === 'attack' ? 2 : 1);
      });
    }

    // Convert to percentages
    var influencePct = {};
    Object.keys(influence).forEach(function(schoolId) {
      influencePct[schoolId] = totalPower > 0 ? Math.round((influence[schoolId] / totalPower) * 100) : 0;
    });

    res.json({
      zone: zone,
      actions: actions || [],
      influence: influencePct,
      total_actions: (actions || []).length,
      total_power: totalPower
    });

  } catch (error) {
    console.error('Zone detail error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// HELPER: Update zone influence in zone_control
// ═══════════════════════════════════════════
async function updateZoneInfluence(zoneId, schoolId, actionType) {
  try {
    var power = actionType === 'attack' ? 2 : 1;

    var { data: existing } = await supabase
      .from('zone_control')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('school_id', schoolId)
      .single();

    if (existing) {
      await supabaseAdmin
        .from('zone_control')
        .update({ control_percentage: existing.control_percentage + power })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('zone_control')
        .insert({
          zone_id: zoneId,
          school_id: schoolId,
          control_percentage: power
        });
    }
  } catch (error) {
    console.error('Update zone influence error:', error);
  }
}

module.exports = router;