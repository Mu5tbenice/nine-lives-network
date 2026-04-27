const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseAdmin');
const {
  validateSurvivorsRunBody,
  HOUSES,
} = require('./survivorsRunValidator');

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * POST /api/survivors/runs
 * Record the outcome of a finished run. Requires player_id (PR-A — §9.111).
 *
 * Body (PR-A schema):
 *   player_id, house, time_sec, level, kills, chapter, won, display_name?,
 *   seed?, score?, ended_reason?, cards_used?,
 *   crystals_earned?, crystals_spent_reroll?, crystals_spent_upgrade?,
 *   client_version?
 *
 * `score` from the client is currently accepted as a hint — PR-D adds the
 * server-side recompute and starts ignoring the client value. `seed` defaults
 * to a server-generated value when omitted.
 */
router.post('/runs', async (req, res) => {
  try {
    const validated = validateSurvivorsRunBody(req.body);
    if (!validated.ok) {
      return res.status(validated.status).json({ error: validated.error });
    }

    const { data, error } = await supabase
      .from('survivors_runs')
      .insert(validated.row)
      .select('id, created_at, seed')
      .single();

    if (error) {
      console.error('survivors insert error:', error);
      return res.status(500).json({ error: 'insert failed' });
    }

    res.json({ ok: true, id: data.id, created_at: data.created_at, seed: data.seed });
  } catch (err) {
    console.error('POST /api/survivors/runs:', err);
    res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/survivors/runs/top?limit=10&house=smoulders
 * Leaderboard — longest surviving runs first. Optionally filter by house.
 * (PR-D replaces this with kills-primary ranking + windowed views.)
 */
router.get('/runs/top', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, toInt(req.query.limit) || 10));
    let q = supabase
      .from('survivors_runs')
      .select('id, display_name, house, time_sec, level, kills, chapter, won, created_at')
      .order('time_sec', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (req.query.house) {
      const h = String(req.query.house).toLowerCase();
      if (HOUSES.has(h)) q = q.eq('house', h);
    }

    const { data, error } = await q;
    if (error) {
      console.error('survivors top error:', error);
      return res.status(500).json({ error: 'query failed' });
    }
    res.json(data || []);
  } catch (err) {
    console.error('GET /api/survivors/runs/top:', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
