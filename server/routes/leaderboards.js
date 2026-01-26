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
    // Get all players grouped by school
    const { data: players, error } = await supabase
      .from('players')
      .select('school_id, seasonal_points')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching school stats:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    // Aggregate by school
    const schoolStats = {};
    players.forEach(player => {
      if (!schoolStats[player.school_id]) {
        schoolStats[player.school_id] = {
          school_id: player.school_id,
          total_points: 0,
          member_count: 0
        };
      }
      schoolStats[player.school_id].total_points += player.seasonal_points || 0;
      schoolStats[player.school_id].member_count += 1;
    });

    // Convert to array and sort
    const sorted = Object.values(schoolStats)
      .sort((a, b) => b.total_points - a.total_points);

    res.json(sorted);

  } catch (error) {
    console.error('Error in schools leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboards/communities
 * Get communities ranked by total member points
 */
router.get('/communities', async (req, res) => {
  try {
    // Get all players with community tags
    const { data: players, error } = await supabase
      .from('players')
      .select('community_tag, seasonal_points')
      .eq('is_active', true)
      .not('community_tag', 'is', null);

    if (error) {
      console.error('Error fetching community stats:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    // Aggregate by community tag
    const communityStats = {};
    players.forEach(player => {
      if (!player.community_tag) return;

      const tag = player.community_tag.toUpperCase();
      if (!communityStats[tag]) {
        communityStats[tag] = {
          community_tag: player.community_tag,
          total_points: 0,
          member_count: 0
        };
      }
      communityStats[tag].total_points += player.seasonal_points || 0;
      communityStats[tag].member_count += 1;
    });

    // Convert to array and sort
    const sorted = Object.values(communityStats)
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 50);

    res.json(sorted);

  } catch (error) {
    console.error('Error in communities leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboards/player/:id/rank
 * Get a specific player's rank in each category
 */
router.get('/player/:id/rank', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get all players sorted by points to find rank
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, seasonal_points')
      .eq('is_active', true)
      .order('seasonal_points', { ascending: false });

    const individualRank = allPlayers.findIndex(p => p.id === parseInt(id)) + 1;

    // Get school rank
    const { data: schoolPlayers } = await supabase
      .from('players')
      .select('school_id, seasonal_points')
      .eq('is_active', true);

    const schoolStats = {};
    schoolPlayers.forEach(p => {
      if (!schoolStats[p.school_id]) {
        schoolStats[p.school_id] = 0;
      }
      schoolStats[p.school_id] += p.seasonal_points || 0;
    });

    const sortedSchools = Object.entries(schoolStats)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => parseInt(id));

    const schoolRank = sortedSchools.indexOf(player.school_id) + 1;

    // Get community rank (if applicable)
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
        if (!communityStats[tag]) {
          communityStats[tag] = 0;
        }
        communityStats[tag] += p.seasonal_points || 0;
      });

      const sortedCommunities = Object.entries(communityStats)
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);

      communityRank = sortedCommunities.indexOf(player.community_tag.toUpperCase()) + 1;
    }

    res.json({
      individual: individualRank,
      school: schoolRank,
      community: communityRank
    });

  } catch (error) {
    console.error('Error getting player rank:', error);
    res.status(500).json({ error: 'Failed to get rank' });
  }
});

module.exports = router;