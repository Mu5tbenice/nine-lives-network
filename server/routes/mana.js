// server/routes/mana.js
// API routes for mana management

const express = require('express');
const router = express.Router();
const { getManaInfo, earnMana } = require('../services/manaRegen');

// GET /api/mana/:playerId — Get mana info + time until next regen
router.get('/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    const info = await getManaInfo(playerId);
    if (!info) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(info);
  } catch (err) {
    console.error('Error in GET /api/mana/:playerId:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/mana/earn — Award bonus mana from social action
// Body: { playerId: number, method: 'retweet' | 'mini_game' | 'quest' | 'streak_bonus' }
router.post('/earn', async (req, res) => {
  try {
    const { playerId, method } = req.body;

    if (!playerId || !method) {
      return res.status(400).json({ error: 'playerId and method are required' });
    }

    const result = await earnMana(playerId, method);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('Error in POST /api/mana/earn:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;