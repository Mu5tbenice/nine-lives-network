/**
 * ═══════════════════════════════════════════════════════
 * routes/drop-tickets.js — Drop Ticket API
 * Nine Lives Network
 *
 * GET  /api/drop-tickets/:playerId     — ticket status (today + yesterday's results)
 * POST /api/drop-tickets/earn          — earn a ticket { player_id, source }
 * POST /api/drop-tickets/use-kit       — use sharpening kit { player_id, card_id }
 * POST /api/drop-tickets/process       — admin: trigger midnight roll manually
 * ═══════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();

let dropEngine = null;
try {
  dropEngine = require('../services/dropTicketEngine');
} catch (e) {
  console.error('⚠️ dropTicketEngine not loaded:', e.message);
}

/**
 * GET /api/drop-tickets/:playerId
 * Returns today's ticket count + yesterday's roll results
 */
router.get('/:playerId', async (req, res) => {
  try {
    if (!dropEngine)
      return res.json({
        today: { tickets_earned: 0, max_tickets: 6 },
        yesterday: null,
      });

    const playerId = parseInt(req.params.playerId);
    if (!playerId) return res.status(400).json({ error: 'Invalid player ID' });

    const status = await dropEngine.getTicketStatus(playerId);
    res.json(status);
  } catch (err) {
    console.error('[DropTickets API] Status error:', err.message);
    res.status(500).json({ error: 'Failed to get ticket status' });
  }
});

/**
 * POST /api/drop-tickets/earn
 * Body: { player_id, source }
 * source: 'chronicle_reply', 'chronicle_rt', 'daily_login'
 */
router.post('/earn', async (req, res) => {
  try {
    if (!dropEngine)
      return res.json({ success: false, error: 'Drop tickets unavailable' });

    const { player_id, source } = req.body;
    if (!player_id) return res.status(400).json({ error: 'Missing player_id' });

    const result = await dropEngine.earnTicket(player_id, source || 'unknown');
    res.json(result);
  } catch (err) {
    console.error('[DropTickets API] Earn error:', err.message);
    res.status(500).json({ error: 'Failed to earn ticket' });
  }
});

/**
 * POST /api/drop-tickets/use-kit
 * Body: { player_id, card_id }
 * Uses a sharpening kit to restore 50% sharpness
 */
router.post('/use-kit', async (req, res) => {
  try {
    if (!dropEngine)
      return res.json({ success: false, error: 'Drop tickets unavailable' });

    const { player_id, card_id } = req.body;
    if (!player_id || !card_id)
      return res.status(400).json({ error: 'Missing player_id or card_id' });

    const result = await dropEngine.useSharpeningKit(player_id, card_id);
    res.json(result);
  } catch (err) {
    console.error('[DropTickets API] Use kit error:', err.message);
    res.status(500).json({ error: 'Failed to use sharpening kit' });
  }
});

/**
 * POST /api/drop-tickets/process
 * Admin: manually trigger midnight roll processing
 */
router.post('/process', async (req, res) => {
  try {
    if (!dropEngine)
      return res.json({ success: false, error: 'Drop tickets unavailable' });

    const result = await dropEngine.processAllTickets();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[DropTickets API] Process error:', err.message);
    res.status(500).json({ error: 'Failed to process tickets' });
  }
});

module.exports = router;
