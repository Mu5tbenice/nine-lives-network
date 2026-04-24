/**
 * Community Clashes Route
 * Mounted at /api/clashes in index.js
 *
 * Public:
 *   GET /  — returns active community clashes
 *
 * Admin (requires x-admin-key header):
 *   POST /        — create a clash
 *   PUT /:id      — update a clash
 *   DELETE /:id   — delete a clash
 */

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseAdmin');

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/clashes — public, returns active clashes
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('community_clashes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    // If table doesn't exist yet, return empty array
    console.error('Clashes load error:', e.message);
    res.json([]);
  }
});

// POST /api/clashes — admin creates a clash
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { team_a, team_b, zone_id, ends_at } = req.body;
    if (!team_a || !team_b) {
      return res.status(400).json({ error: 'team_a and team_b required' });
    }
    const { data, error } = await supabase
      .from('community_clashes')
      .insert({
        team_a: team_a, // { tag, color, points }
        team_b: team_b, // { tag, color, points }
        zone_id: zone_id || null,
        ends_at: ends_at || null,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, clash: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/clashes/:id — admin updates a clash
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = {};
    const allowed = ['team_a', 'team_b', 'zone_id', 'ends_at', 'is_active'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    const { data, error } = await supabase
      .from('community_clashes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, clash: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/clashes/:id — admin deletes a clash
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabase
      .from('community_clashes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
