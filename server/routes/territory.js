const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /api/territory/action
router.post('/action', async (req, res) => {
  try {
    const { player_id, zone_id, action_type } = req.body;

    if (!player_id || !zone_id || !['attack', 'defend'].includes(action_type)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', player_id)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.mana < 1) {
      return res.status(400).json({ error: 'Not enough mana', message: 'You need at least 1 mana' });
    }

    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('id', zone_id)
      .single();

    if (zone?.zone_type === 'home' && action_type === 'attack') {
      return res.status(400).json({ error: 'Cannot attack home zones' });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: existingAction } = await supabase
      .from('territory_actions')
      .select('*')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('game_day', today)
      .single();

    if (existingAction) {
      return res.status(400).json({ error: 'Already acted on this zone today' });
    }

    // Deduct mana
    await supabase
      .from('players')
      .update({ mana: player.mana - 1 })
      .eq('id', player_id);

    // Record action
    const { data: action, error: actionError } = await supabase
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
      await supabase.from('players').update({ mana: player.mana }).eq('id', player_id);
      return res.status(500).json({ error: 'Failed to record action' });
    }

    // Award points
    const pointsEarned = 5;
    await supabase
      .from('players')
      .update({ 
        seasonal_points: player.seasonal_points + pointsEarned,
        lifetime_points: player.lifetime_points + pointsEarned
      })
      .eq('id', player_id);

    res.json({ 
      success: true, 
      action,
      points_earned: pointsEarned,
      mana_remaining: player.mana - 1
    });

  } catch (error) {
    console.error('Territory action error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/territory/actions/today
router.get('/actions/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: actions, error } = await supabase
      .from('territory_actions')
      .select(`
        *,
        player:players(id, twitter_handle, profile_image, school_id)
      `)
      .eq('game_day', today)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch actions' });
    }

    const byZone = {};
    actions.forEach(a => {
      if (!byZone[a.zone_id]) byZone[a.zone_id] = [];
      byZone[a.zone_id].push(a);
    });

    res.json(byZone);

  } catch (error) {
    console.error('Territory actions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;