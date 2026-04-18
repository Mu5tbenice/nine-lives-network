/**
 * raids.js — API routes for Narrative Raid data
 *
 * INSTRUCTIONS FOR SPENCER:
 * 1. Save this file to server/routes/raids.js
 * 2. In server/index.js, add:
 *      const raidsRoutes = require('./routes/raids');
 *      app.use('/api/raids', raidsRoutes);
 */

const express = require('express');
const router = express.Router();
const narrativeEngine = require('../services/narrativeEngine');
const supabase = require('../config/supabase');

/**
 * GET /api/raids/today
 * Returns today's active raid with standings.
 */
router.get('/today', async (req, res) => {
  try {
    const raid = await narrativeEngine.getTodayRaidData();

    if (!raid) {
      return res.json({ active: false, message: 'No raid today yet' });
    }

    // Format standings for frontend
    const standings = raid.standings || {};
    const communities = Object.entries(standings)
      .map(([tag, data]) => ({
        tag,
        unique_raiders: data.unique || 0,
      }))
      .sort((a, b) => b.unique_raiders - a.unique_raiders);

    res.json({
      active: raid.status !== 'complete',
      status: raid.status,
      title: raid.narrative_title,
      date: raid.raid_date,
      standings: communities,
      total_raiders: communities.reduce((sum, c) => sum + c.unique_raiders, 0),
      winner: raid.winner_community,
      winner_count: raid.winner_count,
      mvp: raid.mvp_twitter_handle,
      tweet_url: raid.tweet_1_id
        ? `https://twitter.com/9LVNetwork/status/${raid.tweet_1_id}`
        : null,
    });
  } catch (error) {
    console.error('[Raids API] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch raid data' });
  }
});

/**
 * GET /api/raids/history
 * Returns recent completed raids.
 */
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 7, 30);
    const history = await narrativeEngine.getRaidHistory(limit);

    const formatted = history.map((raid) => ({
      date: raid.raid_date,
      title: raid.narrative_title,
      winner: raid.winner_community,
      winner_count: raid.winner_count,
      total_raiders: raid.total_raiders,
      mvp: raid.mvp_twitter_handle,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[Raids API] History error:', error.message);
    res.status(500).json({ error: 'Failed to fetch raid history' });
  }
});

/**
 * GET /api/raids/leaderboard
 * Community raid wins leaderboard (all time).
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { data: raids } = await supabase
      .from('narrative_raids')
      .select('winner_community, winner_count, total_raiders')
      .eq('status', 'complete')
      .not('winner_community', 'is', null);

    // Aggregate wins per community
    const communityWins = {};
    for (const raid of raids || []) {
      const tag = raid.winner_community;
      if (!communityWins[tag]) {
        communityWins[tag] = { tag, wins: 0, total_raiders: 0 };
      }
      communityWins[tag].wins++;
      communityWins[tag].total_raiders += raid.total_raiders || 0;
    }

    const leaderboard = Object.values(communityWins).sort(
      (a, b) => b.wins - a.wins,
    );

    res.json(leaderboard);
  } catch (error) {
    console.error('[Raids API] Leaderboard error:', error.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
