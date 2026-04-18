/**
 * ═══════════════════════════════════════════════════════
 * routes/chronicle.js — Chronicle API
 * Nine Lives Network
 *
 * Serves today's chronicle data to the dashboard.
 * ═══════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();

let narrativeEngine = null;
try {
  narrativeEngine = require('../services/narrativeEngine');
} catch (e) {
  console.error(
    '⚠️ narrativeEngine not loaded for chronicle routes:',
    e.message,
  );
}

/**
 * GET /api/chronicle/today
 * Returns today's chronicle data for the dashboard.
 * Optional: ?player_id=123 to check if the player participated.
 */
router.get('/today', async (req, res) => {
  try {
    if (!narrativeEngine || !narrativeEngine.getTodayChronicle) {
      return res.json({
        active: false,
        title: null,
        acts: [],
        standings: {},
        player_participated: false,
        player_named: false,
        ending_type: null,
        status: 'unavailable',
      });
    }

    const playerId = req.query.player_id || null;
    const data = await narrativeEngine.getTodayChronicle(playerId);
    res.json(data);
  } catch (error) {
    console.error('[Chronicle API] /today error:', error.message);
    res.status(500).json({ error: 'Failed to load chronicle' });
  }
});

/**
 * GET /api/chronicle/history
 * Returns recent completed chronicles.
 * Optional: ?limit=7
 */
router.get('/history', async (req, res) => {
  try {
    if (!narrativeEngine || !narrativeEngine.getChronicleHistory) {
      return res.json([]);
    }

    const limit = parseInt(req.query.limit) || 7;
    const data = await narrativeEngine.getChronicleHistory(limit);
    res.json(data);
  } catch (error) {
    console.error('[Chronicle API] /history error:', error.message);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

module.exports = router;
