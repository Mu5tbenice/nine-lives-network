const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Get all zones
router.get('/', async (req, res) => {
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

// Get current objective zone with tweet info
router.get('/objective', async (req, res) => {
  try {
    const { data: zone, error } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (error || !zone) {
      return res.json({ zone: null, tweet_id: null });
    }

    res.json({
      zone: zone,
      tweet_id: zone.objective_tweet_id,
      tweet_url: zone.objective_tweet_id 
        ? `https://twitter.com/9LVNetwork/status/${zone.objective_tweet_id}`
        : null,
      posted_at: zone.objective_posted_at
    });
  } catch (error) {
    console.error('Error fetching objective:', error);
    res.status(500).json({ error: 'Failed to fetch objective' });
  }
});

// Get zone control data
router.get('/control', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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