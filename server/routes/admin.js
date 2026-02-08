const express = require('express');
const router = express.Router();
const twitterBot = require('../services/twitterBot');
const territoryControl = require('../services/territoryControl');
const activityDecay = require('../services/activityDecay');
const nermBot = require('../services/nermBot');
const supabase = require('../config/supabase');

// Simple admin key check (in production, use proper auth)
const checkAdminKey = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/admin/test-bot
 * Test the Twitter bot connection
 */
router.get('/test-bot', checkAdminKey, async (req, res) => {
  try {
    const user = await twitterBot.testConnection();
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(500).json({ error: 'Bot connection failed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/post-objective
 * Post the daily objective tweet
 */
router.post('/post-objective', checkAdminKey, async (req, res) => {
  try {
    const tweet = await twitterBot.postDailyObjective();
    if (tweet) {
      res.json({ success: true, tweet_id: tweet.id });
    } else {
      res.status(500).json({ error: 'Failed to post objective' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/post-results
 * Post the daily results tweet
 */
router.post('/post-results', checkAdminKey, async (req, res) => {
  try {
    const tweet = await twitterBot.postDailyResults();
    if (tweet) {
      res.json({ success: true, tweet_id: tweet.id });
    } else {
      res.status(500).json({ error: 'Failed to post results' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/process-casts
 * Process spell casts from Twitter mentions
 */
router.post('/process-casts', checkAdminKey, async (req, res) => {
  try {
    const casts = await twitterBot.processSpellCasts();
    res.json({ success: true, processed: casts.length, casts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/set-objective
 * Set a specific zone as the daily objective
 */
router.post('/set-objective', checkAdminKey, async (req, res) => {
  try {
    const { zone_id } = req.body;
    if (!zone_id) {
      return res.status(400).json({ error: 'zone_id required' });
    }

    const success = await twitterBot.setDailyObjective(zone_id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to set objective' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/rotate-objective
 * Rotate to a random neutral zone
 */
router.post('/rotate-objective', checkAdminKey, async (req, res) => {
  try {
    const success = await twitterBot.rotateObjective();
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to rotate objective' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/reset-mana
 * Reset all players' mana to full (daily reset)
 */
router.post('/reset-mana', checkAdminKey, async (req, res) => {
  try {
    const { error } = await supabase
      .from('players')
      .update({ mana: 5 })
      .eq('is_active', true);

    if (error) {
      return res.status(500).json({ error: 'Failed to reset mana' });
    }

    res.json({ success: true, message: 'All players mana reset to 5' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/stats
 * Get game statistics
 */
router.get('/stats', checkAdminKey, async (req, res) => {
  try {
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('is_active', true);

    const { data: casts } = await supabase
      .from('casts')
      .select('id');

    const { data: zones } = await supabase
      .from('zones')
      .select('id, name, is_current_objective');

    const currentObjective = zones?.find(z => z.is_current_objective);

    res.json({
      total_players: players?.length || 0,
      total_casts: casts?.length || 0,
      current_objective: currentObjective?.name || 'None set',
      zones: zones?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/spell-of-the-day
 * Award Spell of the Day bonus to a player (+50 points)
 */
router.post('/spell-of-the-day', checkAdminKey, async (req, res) => {
  try {
    const { player_id, cast_id, reason } = req.body;

    if (!player_id) {
      return res.status(400).json({ error: 'player_id required' });
    }

    const bonusPoints = 50;

    // Get the player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', player_id)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Update player points
    const { error: updateError } = await supabase
      .from('players')
      .update({
        seasonal_points: (player.seasonal_points || 0) + bonusPoints,
        lifetime_points: (player.lifetime_points || 0) + bonusPoints
      })
      .eq('id', player_id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to award bonus' });
    }

    // If cast_id provided, update the cast record too
    if (cast_id) {
      await supabase
        .from('casts')
        .update({
          points_earned: supabase.raw(`points_earned + ${bonusPoints}`)
        })
        .eq('id', cast_id);
    }

    console.log(`🏆 Spell of the Day awarded to @${player.twitter_handle}: +${bonusPoints} points. Reason: ${reason || 'No reason given'}`);

    res.json({ 
      success: true, 
      player: player.twitter_handle,
      bonus_awarded: bonusPoints,
      new_total: (player.seasonal_points || 0) + bonusPoints
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/recent-casts
 * Get recent casts for review (to pick Spell of the Day)
 */
router.get('/recent-casts', checkAdminKey, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const { data: casts, error } = await supabase
      .from('casts')
      .select(`
        id,
        spell_name,
        points_earned,
        tweet_id,
        created_at,
        player_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch casts' });
    }

    res.json(casts || []);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/zone-control/:zoneId
 * Get current control calculation for a zone
 */
router.get('/zone-control/:zoneId', checkAdminKey, async (req, res) => {
  try {
    const { zoneId } = req.params;
    const control = await territoryControl.calculateZoneControl(parseInt(zoneId));
    res.json({ zone_id: zoneId, control });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/update-zone-control/:zoneId
 * Manually trigger zone control update
 */
router.post('/update-zone-control/:zoneId', checkAdminKey, async (req, res) => {
  try {
    const { zoneId } = req.params;
    const result = await territoryControl.updateZoneControlTable(parseInt(zoneId));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/daily-winner/:zoneId
 * Get the daily winner for a zone
 */
router.get('/daily-winner/:zoneId', checkAdminKey, async (req, res) => {
  try {
    const { zoneId } = req.params;
    const result = await territoryControl.determineDailyWinner(parseInt(zoneId));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/end-of-day/:zoneId
 * Run full end-of-day processing for a zone
 */
router.post('/end-of-day/:zoneId', checkAdminKey, async (req, res) => {
  try {
    const { zoneId } = req.params;
    const result = await territoryControl.endOfDayProcessing(parseInt(zoneId));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/end-of-day-current
 * Run end-of-day processing for current objective zone
 */
router.post('/end-of-day-current', checkAdminKey, async (req, res) => {
  try {
    const zone = await territoryControl.getCurrentObjective();
    if (!zone) {
      return res.status(400).json({ error: 'No current objective zone' });
    }
    const result = await territoryControl.endOfDayProcessing(zone.id);
    res.json({ zone: zone.name, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/activity-decay
 * Run activity decay check manually
 */
router.post('/activity-decay', checkAdminKey, async (req, res) => {
  try {
    const result = await activityDecay.processActivityDecay();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/inactive-players
 * Get list of inactive players
 */
router.get('/inactive-players', checkAdminKey, async (req, res) => {
  try {
    const players = await activityDecay.getInactivePlayers();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/reactivate-player/:id
 * Reactivate an inactive player
 */
router.post('/reactivate-player/:id', checkAdminKey, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await activityDecay.reactivatePlayer(parseInt(id));
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/test-nerm
 * Test Nerm bot connection
 */
router.get('/test-nerm', checkAdminKey, async (req, res) => {
  try {
    const user = await nermBot.testConnection();
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(500).json({ error: 'Nerm connection failed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/nerm-status
 * Get Nerm's rate limit status
 */
router.get('/nerm-status', checkAdminKey, async (req, res) => {
  try {
    const status = nermBot.getRateLimitStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/nerm-post
 * Make Nerm post a custom message
 */
router.post('/nerm-post', checkAdminKey, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message required' });
    }
    const tweet = await nermBot.postAsNerm(message);
    if (tweet) {
      res.json({ success: true, tweet_id: tweet.id });
    } else {
      res.status(500).json({ error: 'Failed to post (rate limited?)' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/nerm-observation
 * Make Nerm post a daily observation
 */
router.post('/nerm-observation', checkAdminKey, async (req, res) => {
  try {
    const tweet = await nermBot.postDailyObservation();
    if (tweet) {
      res.json({ success: true, tweet_id: tweet.id });
    } else {
      res.status(500).json({ error: 'Failed to post (rate limited?)' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/nerm-roast
 * Make Nerm roast a specific player
 */
router.post('/nerm-roast', checkAdminKey, async (req, res) => {
  try {
    const { player, reason } = req.body;
    if (!player || !reason) {
      return res.status(400).json({ error: 'player and reason required' });
    }
    const tweet = await nermBot.roastPlayer(player, reason);
    if (tweet) {
      res.json({ success: true, tweet_id: tweet.id });
    } else {
      res.status(500).json({ error: 'Failed to post (rate limited?)' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/nerm-generate
 * Generate a custom Nerm response (doesn't post, just returns text)
 */
router.post('/nerm-generate', checkAdminKey, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt required' });
    }
    const response = await nermBot.generateCustomResponse(prompt);
    if (response) {
      res.json({ success: true, response });
    } else {
      res.status(500).json({ error: 'Failed to generate' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/zone/:id', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const zoneId = parseInt(req.params.id);
    const { name, description, image_url } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (image_url !== undefined) updates.image_url = image_url;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('zones')
      .update(updates)
      .eq('id', zoneId)
      .select()
      .single();

    if (error) {
      console.error('Error updating zone:', error);
      return res.status(500).json({ error: 'Failed to update zone' });
    }

    console.log(`Updated zone ${zoneId}:`, updates);
    res.json(data);
  } catch (error) {
    console.error('Error in zone update:', error);
    res.status(500).json({ error: 'Failed to update zone' });
  }
});
module.exports = router;