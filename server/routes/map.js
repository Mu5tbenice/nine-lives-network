const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * GET /api/zones
 * Get all zones with current control data
 */
router.get('/', async (req, res) => {
  try {
    // Get all zones
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('*');

    if (zonesError) {
      return res.status(500).json({ error: 'Failed to fetch zones' });
    }

    // Get zone control data
    const { data: control, error: controlError } = await supabase
      .from('zone_control')
      .select('*');

    if (controlError) {
      return res.status(500).json({ error: 'Failed to fetch zone control' });
    }

    // Merge control data into zones
    const zonesWithControl = zones.map(zone => ({
      ...zone,
      control: control
        .filter(c => c.zone_id === zone.id)
        .map(c => ({
          school_id: c.school_id,
          percentage: c.control_percentage
        }))
    }));

    res.json(zonesWithControl);

  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

/**
 * GET /api/zones/objective
 * Get current daily objective zone
 */
router.get('/objective', async (req, res) => {
  try {
    const { data: zone, error } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (error || !zone) {
      // Return default if none set
      const { data: defaultZone } = await supabase
        .from('zones')
        .select('*')
        .eq('zone_type', 'neutral')
        .limit(1)
        .single();

      return res.json(defaultZone || { id: 10, name: 'Crystal Crossroads' });
    }

    res.json(zone);

  } catch (error) {
    console.error('Error fetching objective:', error);
    res.status(500).json({ error: 'Failed to fetch objective' });
  }
});

/**
 * GET /api/zones/:id
 * Get detailed zone information
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get zone
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('*')
      .eq('id', id)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Get control data
    const { data: control, error: controlError } = await supabase
      .from('zone_control')
      .select(`
        school_id,
        control_percentage,
        schools (name, primary_color)
      `)
      .eq('zone_id', id)
      .order('control_percentage', { ascending: false });

    // Get recent casts in this zone
    const { data: recentCasts } = await supabase
      .from('casts')
      .select(`
        id,
        spell_name,
        created_at,
        players (twitter_handle, school_id)
      `)
      .eq('zone_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      ...zone,
      control: control || [],
      recent_activity: recentCasts || []
    });

  } catch (error) {
    console.error('Error fetching zone:', error);
    res.status(500).json({ error: 'Failed to fetch zone' });
  }
});

/**
 * GET /api/zones/:id/history
 * Get zone control history
 */
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days) || 7;

    // For now, return empty array - will be populated by daily snapshots
    res.json([]);

  } catch (error) {
    console.error('Error fetching zone history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;