const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseAdmin');

// Bounds match the CHECK constraints in migration 004.
const HOUSES = new Set(['smoulders', 'darktide', 'stonebark', 'plaguemire']);
const MAX_TIME_SEC = 6 * 180 + 120; // 6 chapters × 3 min + a 2-min slack for boss fights
const MAX_LEVEL = 120;
const MAX_KILLS = 10000;

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * POST /api/survivors/runs
 * Record the outcome of a finished run. Open endpoint (v1: unauthenticated).
 *
 * Body: { house, time_sec, level, kills, chapter, won, display_name? }
 */
router.post('/runs', async (req, res) => {
  try {
    const body = req.body || {};
    const house = String(body.house || '').toLowerCase();
    const time_sec = toInt(body.time_sec);
    const level = toInt(body.level);
    const kills = toInt(body.kills);
    const chapter = toInt(body.chapter);
    const won = !!body.won;
    const display_name = typeof body.display_name === 'string'
      ? body.display_name.trim().slice(0, 24) || null
      : null;

    // Validation — cheap client-side-proofing.
    if (!HOUSES.has(house)) {
      return res.status(400).json({ error: 'invalid house' });
    }
    if (!Number.isFinite(time_sec) || time_sec < 0 || time_sec > MAX_TIME_SEC) {
      return res.status(400).json({ error: 'invalid time_sec' });
    }
    if (!Number.isFinite(level) || level < 1 || level > MAX_LEVEL) {
      return res.status(400).json({ error: 'invalid level' });
    }
    if (!Number.isFinite(kills) || kills < 0 || kills > MAX_KILLS) {
      return res.status(400).json({ error: 'invalid kills' });
    }
    if (!Number.isFinite(chapter) || chapter < 1 || chapter > 6) {
      return res.status(400).json({ error: 'invalid chapter' });
    }
    // Soft sanity: kills can't exceed ~10 per second sustained.
    if (kills > time_sec * 12 + 50) {
      return res.status(400).json({ error: 'implausible kills/time ratio' });
    }

    const { data, error } = await supabase
      .from('survivors_runs')
      .insert({ house, time_sec, level, kills, chapter, won, display_name })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('survivors insert error:', error);
      return res.status(500).json({ error: 'insert failed' });
    }

    res.json({ ok: true, id: data.id, created_at: data.created_at });
  } catch (err) {
    console.error('POST /api/survivors/runs:', err);
    res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/survivors/runs/top?limit=10&house=smoulders
 * Leaderboard — longest surviving runs first. Optionally filter by house.
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
