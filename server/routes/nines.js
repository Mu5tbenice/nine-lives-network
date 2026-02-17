// server/routes/nines.js
// API routes for player Nine management

const express = require('express');
const router = express.Router();
const { getNine } = require('../services/nineSystem');

// GET /api/nines/:playerId — Get a player's Nine with stats
router.get('/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    const nine = await getNine(playerId);
    if (!nine) {
      return res.status(404).json({ error: 'Nine not found for this player' });
    }

    res.json(nine);
  } catch (err) {
    console.error('Error in GET /api/nines/:playerId:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;