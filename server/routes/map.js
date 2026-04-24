// ═══════════════════════════════════════════════════════
// server/routes/map.js
// Zone data API — mounted at /api/zones in index.js
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseAdmin');

// GET /api/zones — list all zones
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('id');

    if (error) {
      console.error('Zones fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch zones' });
    }

    res.json(data || []);
  } catch (e) {
    console.error('Zones error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/zones/:id — single zone detail
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('id', parseInt(req.params.id))
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    res.json(data);
  } catch (e) {
    console.error('Zone detail error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
