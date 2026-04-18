// ═══════════════════════════════════════════════════════
// server/routes/crafting.js
// V3 Crafting & Recharging Routes
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const craftingEngine = require('../services/craftingEngine');

// POST /api/crafting/fuse — Fuse 3 cards into 1 higher rarity
// Body: { player_id, card_ids: [id1, id2, id3] }
router.post('/fuse', async (req, res) => {
  try {
    const { player_id, card_ids } = req.body;
    if (!player_id || !card_ids)
      return res.status(400).json({ error: 'player_id and card_ids required' });
    const result = await craftingEngine.fuseCards(player_id, card_ids);
    res.json(result);
  } catch (err) {
    console.error('Fuse error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/crafting/recharge — Feed cards to restore charges
// Body: { player_id, target_card_id, fuel_card_ids: [id1, id2...] }
router.post('/recharge', async (req, res) => {
  try {
    const { player_id, target_card_id, fuel_card_ids } = req.body;
    if (!player_id || !target_card_id || !fuel_card_ids) {
      return res.status(400).json({
        error: 'player_id, target_card_id, and fuel_card_ids required',
      });
    }
    const result = await craftingEngine.rechargeCard(
      player_id,
      target_card_id,
      fuel_card_ids,
    );
    res.json(result);
  } catch (err) {
    console.error('Recharge error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/crafting/fuseable/:playerId — What can be fused
router.get('/fuseable/:playerId', async (req, res) => {
  try {
    const result = await craftingEngine.getCanFuse(
      parseInt(req.params.playerId),
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/crafting/rechargeable/:playerId — What needs recharging
router.get('/rechargeable/:playerId', async (req, res) => {
  try {
    const result = await craftingEngine.getCanRecharge(
      parseInt(req.params.playerId),
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
