const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * GET /api/players/:id
 * Get a player's public data
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: player, error } = await supabase
      .from('players')
      .select(`
        id,
        twitter_handle,
        school_id,
        community_tag,
        profile_image,
        mana,
        lifetime_points,
        seasonal_points,
        created_at,
        last_cast_at,
        is_active
      `)
      .eq('id', id)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(player);

  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

/**
 * GET /api/players/:id/casts
 * Get a player's cast history
 */
router.get('/:id/casts', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const { data: casts, error } = await supabase
      .from('casts')
      .select('*')
      .eq('player_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch casts' });
    }

    res.json(casts || []);

  } catch (error) {
    console.error('Error fetching casts:', error);
    res.status(500).json({ error: 'Failed to fetch casts' });
  }
});

/**
 * GET /api/players/by-twitter/:twitter_id
 * Get a player by their Twitter ID
 */
router.get('/by-twitter/:twitter_id', async (req, res) => {
  try {
    const { twitter_id } = req.params;

    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('twitter_id', twitter_id)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(player);

  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

module.exports = router;