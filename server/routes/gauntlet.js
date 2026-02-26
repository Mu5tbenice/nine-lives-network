// ═══════════════════════════════════════════════════════
// server/routes/gauntlet.js
// V3 Gauntlet — Solo PvE Routes
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const gauntletEngine = require('../services/gauntletEngine');
const { addXP, XP_REWARDS } = require('../services/xp-engine');

// POST /api/gauntlet/start — Start a run (1 mana)
// Body: { player_id }
router.post('/start', async (req, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) return res.status(400).json({ error: 'player_id required' });
    const result = await gauntletEngine.startRun(player_id);
    res.json(result);
  } catch (err) {
    console.error('Gauntlet start error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/gauntlet/fight — Fight current floor
// Body: { run_id, player_id, card_id }
router.post('/fight', async (req, res) => {
  try {
    const { run_id, player_id, card_id } = req.body;
    if (!run_id || !player_id || !card_id) {
      return res.status(400).json({ error: 'run_id, player_id, and card_id required' });
    }
    const result = await gauntletEngine.fightFloor(run_id, player_id, card_id);

    // V5: Award XP for clearing a floor
    if (result && result.victory) {
      await addXP(parseInt(player_id), XP_REWARDS.gauntlet_floor, 'gauntlet_floor').catch(() => {});
    }

    res.json(result);
  } catch (err) {
    console.error('Gauntlet fight error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/gauntlet/active/:playerId — Current run status
router.get('/active/:playerId', async (req, res) => {
  try {
    const run = await gauntletEngine.getActiveRun(parseInt(req.params.playerId));
    res.json({ active: !!run && run.status === 'active', run: run || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/gauntlet/history/:playerId — Past runs + best floor
router.get('/history/:playerId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await gauntletEngine.getHistory(parseInt(req.params.playerId), limit);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;