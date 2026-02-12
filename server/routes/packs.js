// ═══════════════════════════════════════════════════════
// server/routes/packs.js
// Pack opening, hand management, and collection APIs
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const packSystem = require('../services/packSystem');

// ── OPEN TODAY'S DAILY PACK ──
// POST /api/packs/open
// Body: { player_id }
router.post('/open', async (req, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) return res.status(400).json({ error: 'player_id required' });

    const result = await packSystem.generateDailyPack(player_id);

    if (!result.success && result.pack) {
      // Already opened — return existing pack
      return res.json({
        success: true,
        already_opened: true,
        pack: result.pack,
        cards: result.pack.cards,
      });
    }

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      already_opened: false,
      pack: result.pack,
      cards: result.cards,
    });
  } catch (err) {
    console.error('Pack open error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET TODAY'S HAND ──
// GET /api/packs/hand/:player_id
router.get('/hand/:player_id', async (req, res) => {
  try {
    const hand = await packSystem.getTodaysHand(req.params.player_id);
    if (!hand) {
      return res.json({ success: true, hand: null, message: 'No pack opened today' });
    }
    return res.json({ success: true, hand });
  } catch (err) {
    console.error('Get hand error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET PACK HISTORY ──
// GET /api/packs/history/:player_id?limit=10
router.get('/history/:player_id', async (req, res) => {
  try {
    const supabase = require('../config/supabase');
    const limit = parseInt(req.query.limit) || 10;

    const { data, error } = await supabase
      .from('card_packs')
      .select('*')
      .eq('player_id', req.params.player_id)
      .order('opened_at', { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    console.error('Pack history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET COLLECTION ──
// GET /api/collection/:player_id?rarity=rare&house=smoulders&type=attack
router.get('/collection/:player_id', async (req, res) => {
  try {
    const filters = {
      rarity: req.query.rarity || null,
      house: req.query.house || null,
      type: req.query.type || null,
    };
    const cards = await packSystem.getCollection(req.params.player_id, filters);
    return res.json({ success: true, cards, total: cards.length });
  } catch (err) {
    console.error('Collection error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET COLLECTION STATS ──
// GET /api/collection/:player_id/stats
router.get('/collection/:player_id/stats', async (req, res) => {
  try {
    const stats = await packSystem.getCollectionStats(req.params.player_id);
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('Collection stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;