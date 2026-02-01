const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * POST /api/duels/challenge
 * Send a duel challenge to another player
 */
router.post('/challenge', async (req, res) => {
  try {
    const { challenger_id, target_id } = req.body;

    if (!challenger_id || !target_id) {
      return res.status(400).json({ error: 'Missing challenger_id or target_id' });
    }

    if (challenger_id === target_id) {
      return res.status(400).json({ error: 'Cannot challenge yourself' });
    }

    // Get challenger
    const { data: challenger, error: challengerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', challenger_id)
      .single();

    if (challengerError || !challenger) {
      return res.status(404).json({ error: 'Challenger not found' });
    }

    // Check lives
    const challengerLives = challenger.lives !== undefined ? challenger.lives : 3;
    if (challengerLives < 1) {
      return res.status(400).json({ error: 'No lives remaining', message: 'You need at least 1 life to duel' });
    }

    // Get target
    const { data: target, error: targetError } = await supabase
      .from('players')
      .select('*')
      .eq('id', target_id)
      .single();

    if (targetError || !target) {
      return res.status(404).json({ error: 'Target player not found' });
    }

    // Check for existing pending duel between these players
    const { data: existingDuel } = await supabase
      .from('duels')
      .select('*')
      .eq('challenger_id', challenger_id)
      .eq('target_id', target_id)
      .eq('status', 'pending')
      .single();

    if (existingDuel) {
      return res.status(400).json({ error: 'You already have a pending challenge to this player' });
    }

    // Create duel challenge
    const { data: duel, error: duelError } = await supabase
      .from('duels')
      .insert({
        challenger_id,
        target_id,
        challenger_school_id: challenger.school_id,
        target_school_id: target.school_id,
        status: 'pending'
      })
      .select()
      .single();

    if (duelError) {
      console.error('Duel creation error:', duelError);
      return res.status(500).json({ error: 'Failed to create duel challenge' });
    }

    res.json({
      success: true,
      duel,
      message: `Challenge sent to @${target.twitter_handle}`
    });

  } catch (error) {
    console.error('Challenge error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/duels/accept
 * Accept a duel challenge and resolve it
 */
router.post('/accept', async (req, res) => {
  try {
    const { duel_id, player_id } = req.body;

    if (!duel_id || !player_id) {
      return res.status(400).json({ error: 'Missing duel_id or player_id' });
    }

    // Get the duel
    const { data: duel, error: duelError } = await supabase
      .from('duels')
      .select('*')
      .eq('id', duel_id)
      .eq('status', 'pending')
      .single();

    if (duelError || !duel) {
      return res.status(404).json({ error: 'Duel not found or already resolved' });
    }

    // Verify the player is the target
    if (duel.target_id !== parseInt(player_id)) {
      return res.status(403).json({ error: 'You are not the target of this duel' });
    }

    // Get both players
    const { data: challenger } = await supabase
      .from('players')
      .select('*')
      .eq('id', duel.challenger_id)
      .single();

    const { data: target } = await supabase
      .from('players')
      .select('*')
      .eq('id', duel.target_id)
      .single();

    if (!challenger || !target) {
      return res.status(404).json({ error: 'Players not found' });
    }

    // Check both have lives
    const challengerLives = challenger.lives !== undefined ? challenger.lives : 3;
    const targetLives = target.lives !== undefined ? target.lives : 3;

    if (challengerLives < 1) {
      // Cancel duel - challenger ran out of lives
      await supabase.from('duels').update({ status: 'cancelled' }).eq('id', duel_id);
      return res.status(400).json({ error: 'Challenger has no lives remaining' });
    }

    if (targetLives < 1) {
      return res.status(400).json({ error: 'You have no lives remaining' });
    }

    // RESOLVE DUEL - 50/50 random (Season 0)
    const challengerWins = Math.random() < 0.5;
    const winner = challengerWins ? challenger : target;
    const loser = challengerWins ? target : challenger;

    const pointsChange = 10;

    // Update duel record
    const { error: updateDuelError } = await supabase
      .from('duels')
      .update({
        status: 'completed',
        winner_id: winner.id,
        loser_id: loser.id,
        points_won: pointsChange,
        points_lost: pointsChange,
        resolved_at: new Date().toISOString()
      })
      .eq('id', duel_id);

    if (updateDuelError) {
      console.error('Update duel error:', updateDuelError);
      return res.status(500).json({ error: 'Failed to resolve duel' });
    }

    // Deduct lives from both players
    await supabase
      .from('players')
      .update({ lives: challengerLives - 1 })
      .eq('id', challenger.id);

    await supabase
      .from('players')
      .update({ lives: targetLives - 1 })
      .eq('id', target.id);

    // Update winner points and wins
    const winnerWins = (winner.duel_wins || 0) + 1;
    await supabase
      .from('players')
      .update({
        seasonal_points: (winner.seasonal_points || 0) + pointsChange,
        lifetime_points: (winner.lifetime_points || 0) + pointsChange,
        duel_wins: winnerWins
      })
      .eq('id', winner.id);

    // Update loser points and losses
    const loserLosses = (loser.duel_losses || 0) + 1;
    const newSeasonalPoints = Math.max(0, (loser.seasonal_points || 0) - pointsChange);
    await supabase
      .from('players')
      .update({
        seasonal_points: newSeasonalPoints,
        lifetime_points: Math.max(0, (loser.lifetime_points || 0) - pointsChange),
        duel_losses: loserLosses
      })
      .eq('id', loser.id);

    res.json({
      success: true,
      result: {
        winner_id: winner.id,
        winner_name: winner.twitter_handle,
        winner_school_id: winner.school_id,
        loser_id: loser.id,
        loser_name: loser.twitter_handle,
        loser_school_id: loser.school_id,
        points_change: pointsChange,
        you_won: winner.id === parseInt(player_id)
      }
    });

  } catch (error) {
    console.error('Accept duel error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/duels/decline
 * Decline a duel challenge
 */
router.post('/decline', async (req, res) => {
  try {
    const { duel_id, player_id } = req.body;

    if (!duel_id || !player_id) {
      return res.status(400).json({ error: 'Missing duel_id or player_id' });
    }

    // Get the duel
    const { data: duel, error: duelError } = await supabase
      .from('duels')
      .select('*')
      .eq('id', duel_id)
      .eq('status', 'pending')
      .single();

    if (duelError || !duel) {
      return res.status(404).json({ error: 'Duel not found or already resolved' });
    }

    // Verify the player is the target
    if (duel.target_id !== parseInt(player_id)) {
      return res.status(403).json({ error: 'You are not the target of this duel' });
    }

    // Update duel to declined
    await supabase
      .from('duels')
      .update({ status: 'declined', resolved_at: new Date().toISOString() })
      .eq('id', duel_id);

    res.json({ success: true, message: 'Duel declined' });

  } catch (error) {
    console.error('Decline duel error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/duels/pending/:player_id
 * Get pending duel challenges for a player (where they are the target)
 */
router.get('/pending/:player_id', async (req, res) => {
  try {
    const { player_id } = req.params;

    const { data: duels, error } = await supabase
      .from('duels')
      .select(`
        *,
        challenger:players!duels_challenger_id_fkey(id, twitter_handle, profile_image, school_id)
      `)
      .eq('target_id', player_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Pending duels error:', error);
      return res.status(500).json({ error: 'Failed to fetch pending duels' });
    }

    // Format for frontend
    const formatted = (duels || []).map(d => ({
      id: d.id,
      challenger_id: d.challenger_id,
      challenger_name: d.challenger?.twitter_handle,
      challenger_school_id: d.challenger_school_id,
      challenger_image: d.challenger?.profile_image,
      created_at: d.created_at
    }));

    res.json(formatted);

  } catch (error) {
    console.error('Pending duels error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/duels/history
 * Get recent duel history (all completed duels)
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const { data: duels, error } = await supabase
      .from('duels')
      .select(`
        *,
        winner:players!duels_winner_id_fkey(id, twitter_handle, profile_image, school_id),
        loser:players!duels_loser_id_fkey(id, twitter_handle, profile_image, school_id)
      `)
      .eq('status', 'completed')
      .order('resolved_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Duel history error:', error);
      return res.status(500).json({ error: 'Failed to fetch duel history' });
    }

    // Format for frontend
    const formatted = (duels || []).map(d => ({
      id: d.id,
      winner_id: d.winner_id,
      winner_name: d.winner?.twitter_handle,
      winner_school_id: d.winner?.school_id,
      winner_image: d.winner?.profile_image,
      loser_id: d.loser_id,
      loser_name: d.loser?.twitter_handle,
      loser_school_id: d.loser?.school_id,
      loser_image: d.loser?.profile_image,
      points_won: d.points_won,
      created_at: d.resolved_at
    }));

    res.json(formatted);

  } catch (error) {
    console.error('Duel history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/duels/player/:player_id
 * Get a player's duel history
 */
router.get('/player/:player_id', async (req, res) => {
  try {
    const { player_id } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const { data: duels, error } = await supabase
      .from('duels')
      .select(`
        *,
        challenger:players!duels_challenger_id_fkey(id, twitter_handle, school_id),
        target:players!duels_target_id_fkey(id, twitter_handle, school_id)
      `)
      .or(`challenger_id.eq.${player_id},target_id.eq.${player_id}`)
      .eq('status', 'completed')
      .order('resolved_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Player duel history error:', error);
      return res.status(500).json({ error: 'Failed to fetch duel history' });
    }

    res.json(duels || []);

  } catch (error) {
    console.error('Player duel history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
