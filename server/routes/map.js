const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Get all zones
router.get('/zones', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('id');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// Get zone control data
router.get('/zones/control', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('zone_control')
      .select('*');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching zone control:', error);
    res.status(500).json({ error: 'Failed to fetch zone control' });
  }
});

// Get single zone
router.get('/zones/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching zone:', error);
    res.status(500).json({ error: 'Failed to fetch zone' });
  }
});

module.exports = router;