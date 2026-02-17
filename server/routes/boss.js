// ═══════════════════════════════════════════════════════
// server/routes/boss.js
// V3 Weekly Boss — Guild PvE Raid Routes
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const bossEngine = require('../services/bossEngine');

// GET /api/boss/status — Current boss HP, phase, top contributors
router.get('/status', async (req, res) => {
  try {
    const status = await bossEngine.getBossStatus();
    res.json(status);
  } catch (err) {
    console.error('Boss status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/boss/deploy — Deploy to boss zone (1 mana)
// Body: { player_id, card_id (optional) }
router.post('/deploy', async (req, res) => {
  try {
    const { player_id, card_id } = req.body;
    if (!player_id) return res.status(400).json({ error: 'player_id required' });
    const result = await bossEngine.deployToBoss(player_id, card_id);
    res.json(result);
  } catch (err) {
    console.error('Boss deploy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/boss/swap-card — Change active card on boss
// Body: { player_id, card_id }
router.post('/swap-card', async (req, res) => {
  try {
    const { player_id, card_id } = req.body;
    if (!player_id || !card_id) return res.status(400).json({ error: 'player_id and card_id required' });
    const result = await bossEngine.swapCard(player_id, card_id);
    res.json(result);
  } catch (err) {
    console.error('Boss swap error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/boss/contributions/:playerId — Player's damage dealt
router.get('/contributions/:playerId', async (req, res) => {
  try {
    const result = await bossEngine.getPlayerContribution(parseInt(req.params.playerId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/boss/spawn — Admin: manually spawn boss
router.post('/spawn', async (req, res) => {
  try {
    const result = await bossEngine.spawnBoss();
    res.json(result);
  } catch (err) {
    console.error('Boss spawn error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;