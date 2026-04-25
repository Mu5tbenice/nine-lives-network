const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseAdmin');

/**
 * GET /api/leaderboards/players
 * Top players by seasonal points.
 *
 * Returns per-player movement data:
 *   - points_today  — sum of point_log.amount for today (UTC)
 *   - rank          — position in today's ordering (1-indexed)
 *   - prev_rank     — position when sorted by (seasonal_points - points_today),
 *                     i.e. yesterday-equivalent ordering
 *   - rank_change   — prev_rank - rank (positive = climbed, negative = fell)
 *
 * Uses point_log to compute today's delta — `pointsService.addPoints` is the
 * canonical writer (all paths now route through it post-§9.1) so seasonal_points
 * minus today's log sum reconstructs yesterday's seasonal_points exactly.
 */
router.get('/players', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const { data: players, error } = await supabase
      .from('players')
      .select(
        'id, twitter_handle, school_id, guild_tag, profile_image, seasonal_points, lifetime_points, duel_wins, duel_losses, streak',
      )
      .eq('is_active', true)
      .order('seasonal_points', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching players leaderboard:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    const list = players || [];

    // Sum today's point_log per player (UTC day boundary).
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();
    const ids = list.map((p) => p.id);

    const todayMap = {};
    if (ids.length > 0) {
      const { data: todayLog, error: logErr } = await supabase
        .from('point_log')
        .select('player_id, amount')
        .gte('created_at', startIso)
        .in('player_id', ids);
      if (logErr) {
        console.error('Error fetching today point_log:', logErr);
        // Non-fatal — fall through with todayMap empty so all rank_change=0.
      } else {
        (todayLog || []).forEach((row) => {
          todayMap[row.player_id] =
            (todayMap[row.player_id] || 0) + (row.amount || 0);
        });
      }
    }

    // Build prev-rank ordering by sorting on (seasonal_points - points_today).
    // Two-stable sort: primary by yesterday-equivalent points desc, tiebreak by id.
    const prevSorted = list
      .map((p) => ({
        id: p.id,
        prev_pts: (p.seasonal_points || 0) - (todayMap[p.id] || 0),
      }))
      .sort((a, b) => b.prev_pts - a.prev_pts || a.id - b.id);
    const prevRankMap = {};
    prevSorted.forEach((row, idx) => {
      prevRankMap[row.id] = idx + 1;
    });

    // Build 7-day cumulative point history per player. Pull all point_log
    // rows for these players in the last 7 days, bucket by (player, UTC day),
    // then derive each player's daily-cumulative seasonal_points walking
    // backwards from current. Result is an 8-element array per player
    // (today + 7 prior days) used for the row sparkline.
    const sparkDays = 7;
    const sparkStart = new Date();
    sparkStart.setUTCHours(0, 0, 0, 0);
    sparkStart.setUTCDate(sparkStart.getUTCDate() - sparkDays);
    const historyMap = {};
    if (ids.length > 0) {
      const { data: histLog, error: histErr } = await supabase
        .from('point_log')
        .select('player_id, amount, created_at')
        .gte('created_at', sparkStart.toISOString())
        .in('player_id', ids);
      if (histErr) {
        console.error('Error fetching point_log history:', histErr);
        // Non-fatal — clients fall back to no sparkline.
      } else {
        // Index amounts by player_id → { 'YYYY-MM-DD': sumDelta }
        const byDay = {};
        (histLog || []).forEach((row) => {
          const day = row.created_at.slice(0, 10);
          if (!byDay[row.player_id]) byDay[row.player_id] = {};
          byDay[row.player_id][day] =
            (byDay[row.player_id][day] || 0) + (row.amount || 0);
        });
        // For each player, build cumulative array. Today's value = current
        // seasonal_points. Walk backwards: yesterday = today - today's delta,
        // day before = yesterday - yesterday's delta, etc.
        list.forEach((p) => {
          const dayDeltas = byDay[p.id] || {};
          const arr = new Array(sparkDays + 1);
          let running = p.seasonal_points || 0;
          arr[sparkDays] = running;
          for (let d = sparkDays - 1; d >= 0; d--) {
            const date = new Date();
            date.setUTCHours(0, 0, 0, 0);
            date.setUTCDate(date.getUTCDate() - (sparkDays - d));
            const key = date.toISOString().slice(0, 10);
            running -= dayDeltas[key] || 0;
            arr[d] = running;
          }
          historyMap[p.id] = arr;
        });
      }
    }

    const enriched = list.map((p, idx) => {
      const rank = idx + 1;
      const prev_rank = prevRankMap[p.id] || rank;
      return {
        ...p,
        rank,
        prev_rank,
        rank_change: prev_rank - rank, // positive = climbed
        points_today: todayMap[p.id] || 0,
        history: historyMap[p.id] || null,
      };
    });

    // ── Climber spotlight: biggest positive rank_change since yesterday.
    //    Tiebreaker: most points_today (real-action signal). Returns null
    //    when nobody moved up (e.g. fresh season or quiet day).
    let climber = null;
    enriched.forEach((p) => {
      if (p.rank_change <= 0) return;
      if (!climber) { climber = p; return; }
      if (p.rank_change > climber.rank_change) climber = p;
      else if (p.rank_change === climber.rank_change && p.points_today > climber.points_today) climber = p;
    });

    // ── me_row: if ?me=<player_id> is supplied AND that player isn't in
    //    the top-N already, fetch them separately and compute rank by
    //    counting players with strictly more seasonal_points. Lets a
    //    rank-87 player still see their YOU pin on the leaderboard.
    let me_row = null;
    const meId = parseInt(req.query.me, 10);
    if (meId && !enriched.some((p) => p.id === meId)) {
      const { data: meRows } = await supabase
        .from('players')
        .select('id, twitter_handle, school_id, guild_tag, profile_image, seasonal_points, lifetime_points, duel_wins, duel_losses, streak')
        .eq('id', meId)
        .eq('is_active', true)
        .limit(1);
      const meData = (meRows || [])[0];
      if (meData) {
        const { count } = await supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .gt('seasonal_points', meData.seasonal_points || 0);
        const rank = (count || 0) + 1;
        // Pull me's today-delta so prev_rank is computable.
        const { data: meTodayLog } = await supabase
          .from('point_log')
          .select('amount')
          .gte('created_at', startIso)
          .eq('player_id', meId);
        const meToday = (meTodayLog || []).reduce((s, r) => s + (r.amount || 0), 0);
        // For me_row, we don't have prev_rank against the full ladder
        // without a heavier query — skip rank_change for the standalone
        // path. The pin still renders correctly without an arrow.
        me_row = {
          ...meData,
          rank,
          prev_rank: rank,
          rank_change: 0,
          points_today: meToday,
          history: null,
        };
      }
    }

    res.json({ players: enriched, climber, me_row });
  } catch (error) {
    console.error('Error in players leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboards/schools
 * Houses ranked by total member points
 */
router.get('/schools', async (req, res) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('id, school_id, seasonal_points')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching school stats:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    const schoolStats = {};
    const playerToSchool = {};
    (players || []).forEach((player) => {
      if (!player.school_id) return;
      playerToSchool[player.id] = player.school_id;
      if (!schoolStats[player.school_id]) {
        schoolStats[player.school_id] = {
          school_id: player.school_id,
          total_points: 0,
          member_count: 0,
          points_today: 0,
        };
      }
      schoolStats[player.school_id].total_points += player.seasonal_points || 0;
      schoolStats[player.school_id].member_count += 1;
    });

    // Per-house "today's momentum" — sum of point_log deltas since UTC
    // midnight, joined back to player.school_id. Single bulk query.
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const playerIds = Object.keys(playerToSchool).map(Number);
    if (playerIds.length > 0) {
      const { data: todayLog, error: logErr } = await supabase
        .from('point_log')
        .select('player_id, amount')
        .gte('created_at', startOfDay.toISOString())
        .in('player_id', playerIds);
      if (!logErr) {
        (todayLog || []).forEach((row) => {
          const sid = playerToSchool[row.player_id];
          if (!sid || !schoolStats[sid]) return;
          schoolStats[sid].points_today += row.amount || 0;
        });
      }
    }

    const sorted = Object.values(schoolStats).sort(
      (a, b) => b.total_points - a.total_points,
    );
    res.json(sorted);
  } catch (error) {
    console.error('Error in schools leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboards/activity
 * Recent point_log events, joined with player handle/school. Powers the
 * pulse-of-the-game ticker on /leaderboards.html. Returns up to ?limit=20
 * by default, ordered most-recent-first.
 *
 * Why no real-time socket feed: this is a polled HTTP endpoint to keep
 * the leaderboard surface stateless. Refresh-on-tab-open is enough for
 * a "trader ticker" feel — sub-second freshness isn't required.
 */
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const { data: events, error } = await supabase
      .from('point_log')
      .select('id, player_id, amount, source, created_at')
      .gt('amount', 0) // skip 0/negative entries (cleanup writes)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching activity:', error);
      return res.status(500).json({ error: 'Failed to fetch activity' });
    }
    const ids = Array.from(new Set((events || []).map((e) => e.player_id)));
    let playerMap = {};
    if (ids.length) {
      const { data: players } = await supabase
        .from('players')
        .select('id, twitter_handle, school_id')
        .in('id', ids);
      (players || []).forEach((p) => { playerMap[p.id] = p; });
    }
    const enriched = (events || []).map((e) => ({
      id: e.id,
      player_id: e.player_id,
      twitter_handle: playerMap[e.player_id]?.twitter_handle || null,
      school_id: playerMap[e.player_id]?.school_id || null,
      amount: e.amount,
      source: e.source,
      created_at: e.created_at,
    }));
    res.json(enriched);
  } catch (error) {
    console.error('Error in activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

/**
 * GET /api/leaderboards/duels
 * Top duelists by win rate (min 5 duels to qualify)
 */
router.get('/duels', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const { data: players, error } = await supabase
      .from('players')
      .select(
        'id, twitter_handle, school_id, guild_tag, profile_image, duel_wins, duel_losses',
      )
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching duel leaderboard:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    // Filter players with at least 1 duel, sort by wins then win rate
    const qualified = (players || [])
      .filter((p) => (p.duel_wins || 0) + (p.duel_losses || 0) >= 1)
      .map((p) => ({
        ...p,
        total_duels: (p.duel_wins || 0) + (p.duel_losses || 0),
        win_rate: Math.round(
          ((p.duel_wins || 0) /
            ((p.duel_wins || 0) + (p.duel_losses || 0) || 1)) *
            100,
        ),
      }))
      .sort((a, b) => {
        if (b.duel_wins !== a.duel_wins)
          return (b.duel_wins || 0) - (a.duel_wins || 0);
        return b.win_rate - a.win_rate;
      })
      .slice(0, limit);

    res.json(qualified);
  } catch (error) {
    console.error('Error in duels leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboards/guilds
 * Guilds ranked by total member points
 */
router.get('/guilds', async (req, res) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('guild_tag, seasonal_points')
      .eq('is_active', true)
      .not('guild_tag', 'is', null);

    if (error) {
      console.error('Error fetching guild stats:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    const guildStats = {};
    (players || []).forEach((player) => {
      if (!player.guild_tag) return;
      const tag = player.guild_tag.toUpperCase();
      if (!guildStats[tag]) {
        guildStats[tag] = {
          guild_tag: player.guild_tag,
          total_points: 0,
          member_count: 0,
        };
      }
      guildStats[tag].total_points += player.seasonal_points || 0;
      guildStats[tag].member_count += 1;
    });

    const sorted = Object.values(guildStats)
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 50);
    res.json(sorted);
  } catch (error) {
    console.error('Error in guilds leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboards/clashes
 * All guild clash matchups with standings
 */
router.get('/clashes', async (req, res) => {
  try {
    const { data: clashes, error } = await supabase
      .from('guild_clashes')
      .select('*')
      .order('week', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching clashes:', error);
      return res.status(500).json({ error: 'Failed to fetch clashes' });
    }

    // Build round-robin standings from completed matches
    const standings = {};
    (clashes || []).forEach((c) => {
      if (c.status !== 'complete') return;
      [c.guild_a, c.guild_b].forEach((g) => {
        if (!standings[g])
          standings[g] = {
            name: g,
            color: g === c.guild_a ? c.color_a : c.color_b,
            w: 0,
            l: 0,
            pts: 0,
            total_scored: 0,
          };
      });
      if (c.score_a > c.score_b) {
        standings[c.guild_a].w += 1;
        standings[c.guild_a].pts += 3;
        standings[c.guild_b].l += 1;
      } else if (c.score_b > c.score_a) {
        standings[c.guild_b].w += 1;
        standings[c.guild_b].pts += 3;
        standings[c.guild_a].l += 1;
      } else {
        standings[c.guild_a].pts += 1;
        standings[c.guild_b].pts += 1;
      }
      standings[c.guild_a].total_scored += c.score_a || 0;
      standings[c.guild_b].total_scored += c.score_b || 0;
      // Keep latest color
      if (c.color_a) standings[c.guild_a].color = c.color_a;
      if (c.color_b) standings[c.guild_b].color = c.color_b;
    });

    const sortedStandings = Object.values(standings).sort(
      (a, b) => b.pts - a.pts || b.total_scored - a.total_scored,
    );

    res.json({
      matches: clashes || [],
      standings: sortedStandings,
    });
  } catch (error) {
    console.error('Error in clashes:', error);
    res.status(500).json({ error: 'Failed to fetch clashes' });
  }
});

/**
 * GET /api/leaderboards/history
 * House points per day for charts
 */
router.get('/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;

    const { data: actions, error } = await supabase
      .from('territory_actions')
      .select('game_day, school_id, player:players(guild_tag)')
      .order('game_day', { ascending: true });

    if (error) {
      console.error('Error fetching history:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    const dayData = {};
    if (actions) {
      actions.forEach((a) => {
        if (!a.game_day) return;
        if (!dayData[a.game_day])
          dayData[a.game_day] = { houses: {}, guilds: {} };

        if (a.school_id) {
          if (!dayData[a.game_day].houses[a.school_id])
            dayData[a.game_day].houses[a.school_id] = 0;
          dayData[a.game_day].houses[a.school_id] += 8;
        }

        const tag =
          a.player && a.player.guild_tag
            ? a.player.guild_tag.toUpperCase()
            : null;
        if (tag) {
          if (!dayData[a.game_day].guilds[tag])
            dayData[a.game_day].guilds[tag] = 0;
          dayData[a.game_day].guilds[tag] += 8;
        }
      });
    }

    const history = Object.keys(dayData)
      .sort()
      .slice(-days)
      .map((day) => ({
        date: day,
        houses: dayData[day].houses,
        guilds: dayData[day].guilds,
      }));

    res.json(history);
  } catch (error) {
    console.error('Error in history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/leaderboards/player/:id/rank
 * Specific player's rank
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

    const individualRank =
      (allPlayers || []).findIndex((p) => p.id === parseInt(id)) + 1;

    res.json({ individual: individualRank || null });
  } catch (error) {
    console.error('Error getting player rank:', error);
    res.status(500).json({ error: 'Failed to get rank' });
  }
});

module.exports = router;
