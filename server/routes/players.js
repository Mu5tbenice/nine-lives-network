const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * GET /api/players/:id
 * Get a player's public data (including lives and duel stats)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: player, error } = await supabase
      .from('players')
      .select(`
        id,
        twitter_handle,
        twitter_id,
        school_id,
        guild_tag,
        profile_image,
        mana,
        lives,
        lifetime_points,
        seasonal_points,
        duel_wins,
        duel_losses,
        created_at,
        last_cast_at,
        is_active
      `)
      .eq('id', id)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Default values for new columns if null
    player.lives = player.lives !== null ? player.lives : 3;
    player.duel_wins = player.duel_wins || 0;
    player.duel_losses = player.duel_losses || 0;

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
 * GET /api/players/:id/stats
 * Get a player's full stats including duel record
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get cast count
    const { count: castCount } = await supabase
      .from('casts')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', id);

    // Get territory action count
    const { count: actionCount } = await supabase
      .from('territory_actions')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', id);

    res.json({
      id: player.id,
      twitter_handle: player.twitter_handle,
      school_id: player.school_id,
      seasonal_points: player.seasonal_points || 0,
      lifetime_points: player.lifetime_points || 0,
      mana: player.mana !== null ? player.mana : 7,
      lives: player.lives !== null ? player.lives : 3,
      duel_wins: player.duel_wins || 0,
      duel_losses: player.duel_losses || 0,
      duel_win_rate: player.duel_wins + player.duel_losses > 0 
        ? Math.round((player.duel_wins / (player.duel_wins + player.duel_losses)) * 100) 
        : 0,
      total_casts: castCount || 0,
      total_territory_actions: actionCount || 0,
      member_since: player.created_at
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
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

    // Default values
    player.lives = player.lives !== null ? player.lives : 3;
    player.duel_wins = player.duel_wins || 0;
    player.duel_losses = player.duel_losses || 0;

    res.json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

/**
 * POST /api/players/complete-registration
 * Complete player registration after Twitter OAuth
 */
router.post('/complete-registration', async (req, res) => {
  try {
    const { twitter_id, twitter_handle, school_id, guild_tag, profile_image } = req.body;

    if (!twitter_id || !twitter_handle || !school_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if player already exists
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('twitter_id', twitter_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Player already registered', player_id: existing.id });
    }

    // Create new player with default lives
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        twitter_id,
        twitter_handle,
        school_id,
        guild_tag: guild_tag || null,
        profile_image: profile_image || null,
        mana: 7,
        lives: 3,
        seasonal_points: 0,
        lifetime_points: 0,
        duel_wins: 0,
        duel_losses: 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Failed to register player' });
    }

    res.json({ success: true, player });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register player' });
  }
});

module.exports = router;
