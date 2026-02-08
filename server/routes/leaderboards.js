const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * GET /api/leaderboards/players
 * Get top players by seasonal points
 */
router.get('/players', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const { data: players, error } = await supabase
      .from('players')
      .select('id, twitter_handle, school_id, community_tag, profile_image, seasonal_points, lifetime_points')
      .eq('is_active', true)
      .order('seasonal_points', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching players leaderboard:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    res.json(players || []);

  } catch (error) {
    console.error('Error in players leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboards/schools
 * Get schools ranked by total member points
 */
router.get('/schools', async (req, res) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('school_id, seasonal_points')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching school stats:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    const schoolStats = {};
    players.forEach(player => {
      if (!schoolStats[player.school_id]) {
        schoolStats[player.school_id] = { school_id: player.school_id, total_points: 0, member_count: 0 };
      }
      schoolStats[player.school_id].total_points += player.seasonal_points || 0;
      schoolStats[player.school_id].member_count += 1;
    });

    const sorted = Object.values(schoolStats).sort((a, b) => b.total_points - a.total_points);
    res.json(sorted);

  } catch (error) {
    console.error('Error in schools leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboards/communities
 * Get communities ranked by total member points (all-time seasonal)
 */
router.get('/communities', async (req, res) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('community_tag, seasonal_points')
      .eq('is_active', true)
      .not('community_tag', 'is', null);

    if (error) {
      console.error('Error fetching community stats:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    const communityStats = {};
    players.forEach(player => {
      if (!player.community_tag) return;
      const tag = player.community_tag.toUpperCase();
      if (!communityStats[tag]) {
        communityStats[tag] = { community_tag: player.community_tag, total_points: 0, member_count: 0 };
      }
      communityStats[tag].total_points += player.seasonal_points || 0;
      communityStats[tag].member_count += 1;
    });

    const sorted = Object.values(communityStats).sort((a, b) => b.total_points - a.total_points).slice(0, 50);
    res.json(sorted);

  } catch (error) {
    console.error('Error in communities leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboards/today
 * Today's points — communities, players, and houses
 * Pulls from territory_actions for today's game_day
 */
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get today's territory actions with player details
    const { data: actions, error } = await supabase
      .from('territory_actions')
      .select('player_id, school_id, power_contributed, player:players(id, twitter_handle, school_id, community_tag, profile_image)')
      .eq('game_day', today);

    if (error) {
      console.error('Error fetching today actions:', error);
      return res.status(500).json({ error: 'Failed to fetch today data' });
    }

    // Also get today's casts for tweet-based points
    const { data: casts, error: castsError } = await supabase
      .from('casts')
      .select('player_id, points_earned')
      .gte('created_at', today + 'T00:00:00.000Z')
      .lte('created_at', today + 'T23:59:59.999Z');

    // Build player points map (territory + casts)
    const playerPoints = {};
    const playerInfo = {};

    // Points from territory actions (8 pts each)
    if (actions) {
      actions.forEach(a => {
        if (!playerPoints[a.player_id]) playerPoints[a.player_id] = 0;
        playerPoints[a.player_id] += 8;
        if (a.player) playerInfo[a.player_id] = a.player;
      });
    }

    // Points from casts
    if (casts) {
      casts.forEach(c => {
        if (!playerPoints[c.player_id]) playerPoints[c.player_id] = 0;
        playerPoints[c.player_id] += (c.points_earned || 0);
      });
    }

    // Build community totals
    const communities = {};
    Object.keys(playerPoints).forEach(pid => {
      const info = playerInfo[pid];
      if (info && info.community_tag) {
        const tag = info.community_tag.toUpperCase();
        if (!communities[tag]) {
          communities[tag] = { community_tag: info.community_tag, today_points: 0, member_count: 0, members: [] };
        }
        communities[tag].today_points += playerPoints[pid];
        communities[tag].member_count += 1;
      }
    });

    // Build house totals
    const houses = {};
    Object.keys(playerPoints).forEach(pid => {
      const info = playerInfo[pid];
      if (info && info.school_id) {
        if (!houses[info.school_id]) {
          houses[info.school_id] = { school_id: info.school_id, today_points: 0, member_count: 0 };
        }
        houses[info.school_id].today_points += playerPoints[pid];
        houses[info.school_id].member_count += 1;
      }
    });

    // Build top players list
    const topPlayers = Object.keys(playerPoints)
      .map(pid => ({
        player_id: parseInt(pid),
        today_points: playerPoints[pid],
        twitter_handle: playerInfo[pid] ? playerInfo[pid].twitter_handle : null,
        school_id: playerInfo[pid] ? playerInfo[pid].school_id : null,
        community_tag: playerInfo[pid] ? playerInfo[pid].community_tag : null,
        profile_image: playerInfo[pid] ? playerInfo[pid].profile_image : null
      }))
      .sort((a, b) => b.today_points - a.today_points)
      .slice(0, 20);

    const sortedCommunities = Object.values(communities).sort((a, b) => b.today_points - a.today_points);
    const sortedHouses = Object.values(houses).sort((a, b) => b.today_points - a.today_points);

    res.json({
      date: today,
      communities: sortedCommunities,
      houses: sortedHouses,
      players: topPlayers
    });

  } catch (error) {
    console.error('Error in today leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch today data' });
  }
});

/**
 * GET /api/leaderboards/history
 * House AND community points per day for the last N days (for line charts)
 */
router.get('/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;

    // Get all territory actions with player community tag
    const { data: actions, error } = await supabase
      .from('territory_actions')
      .select('game_day, school_id, player:players(community_tag)')
      .order('game_day', { ascending: true });

    if (error) {
      console.error('Error fetching history:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    // Group by day — houses and communities
    const dayData = {};
    if (actions) {
      actions.forEach(a => {
        if (!a.game_day) return;
        if (!dayData[a.game_day]) dayData[a.game_day] = { houses: {}, communities: {} };

        // House points
        if (!dayData[a.game_day].houses[a.school_id]) dayData[a.game_day].houses[a.school_id] = 0;
        dayData[a.game_day].houses[a.school_id] += 8;

        // Community points
        const tag = a.player && a.player.community_tag ? a.player.community_tag.toUpperCase() : null;
        if (tag) {
          if (!dayData[a.game_day].communities[tag]) dayData[a.game_day].communities[tag] = 0;
          dayData[a.game_day].communities[tag] += 8;
        }
      });
    }

    // Convert to array sorted by date
    const history = Object.keys(dayData)
      .sort()
      .slice(-days)
      .map(day => ({
        date: day,
        houses: dayData[day].houses,
        communities: dayData[day].communities
      }));

    res.json(history);

  } catch (error) {
    console.error('Error in history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/leaderboards/player/:id/rank
 * Get a specific player's rank in each category
 */
router.get('/player/:id/rank', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, seasonal_points')
      .eq('is_active', true)
      .order('seasonal_points', { ascending: false });

    const individualRank = allPlayers.findIndex(p => p.id === parseInt(id)) + 1;

    const { data: schoolPlayers } = await supabase
      .from('players')
      .select('school_id, seasonal_points')
      .eq('is_active', true);

    const schoolStats = {};
    schoolPlayers.forEach(p => {
      if (!schoolStats[p.school_id]) schoolStats[p.school_id] = 0;
      schoolStats[p.school_id] += p.seasonal_points || 0;
    });

    const sortedSchools = Object.entries(schoolStats)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => parseInt(id));

    const schoolRank = sortedSchools.indexOf(player.school_id) + 1;

    let communityRank = null;
    if (player.community_tag) {
      const { data: communityPlayers } = await supabase
        .from('players')
        .select('community_tag, seasonal_points')
        .eq('is_active', true)
        .not('community_tag', 'is', null);

      const communityStats = {};
      communityPlayers.forEach(p => {
        if (!p.community_tag) return;
        const tag = p.community_tag.toUpperCase();
        if (!communityStats[tag]) communityStats[tag] = 0;
        communityStats[tag] += p.seasonal_points || 0;
      });

      const sortedCommunities = Object.entries(communityStats)
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);

      communityRank = sortedCommunities.indexOf(player.community_tag.toUpperCase()) + 1;
    }

    res.json({ individual: individualRank, school: schoolRank, community: communityRank });

  } catch (error) {
    console.error('Error getting player rank:', error);
    res.status(500).json({ error: 'Failed to get rank' });
  }
});

module.exports = router;