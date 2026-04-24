// ═══════════════════════════════════════════════════════
// server/routes/packs.js
// Pack opening, inventory, hand management, and collection APIs
// V5 UPDATE: inventory endpoint now returns daily_claimed status
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const packSystem = require('../services/packSystem');

// ══════════════════════════════════════
// PACK INVENTORY ENDPOINTS (NEW)
// ══════════════════════════════════════

// ── GET UNOPENED PACKS ──
// GET /api/packs/inventory/:player_id
router.get('/inventory/:player_id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.player_id);
    const packs = await packSystem.getPackInventory(playerId);
    const summary = {};
    packs.forEach((p) => {
      if (!summary[p.pack_type]) {
        summary[p.pack_type] = { count: 0, packs: [] };
      }
      summary[p.pack_type].count++;
      summary[p.pack_type].packs.push(p);
    });

    // Check if daily pack was already claimed today
    const dailyClaimed = await packSystem.isDailyClaimedToday(playerId);

    return res.json({
      success: true,
      total: packs.length,
      packs: packs,
      summary: summary,
      daily_claimed: dailyClaimed,
    });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CLAIM DAILY PACK (adds to inventory) ──
// POST /api/packs/claim-daily
// Body: { player_id }
router.post('/claim-daily', async (req, res) => {
  try {
    const { player_id } = req.body || {};
    if (!player_id)
      return res.status(400).json({ error: 'player_id required' });

    const result = await packSystem.grantDailyPack(player_id);
    if (!result.success) {
      return res.json({
        success: false,
        already_granted: result.already_granted || false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      pack: result.pack,
      message: 'Daily pack added to your inventory!',
    });
  } catch (err) {
    console.error('Claim daily error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── OPEN A PACK FROM INVENTORY ──
// POST /api/packs/inventory/open
// Body: { player_id, pack_inventory_id }
router.post('/inventory/open', async (req, res) => {
  try {
    const { player_id, pack_inventory_id } = req.body || {};
    if (!player_id || !pack_inventory_id) {
      return res
        .status(400)
        .json({ error: 'player_id and pack_inventory_id required' });
    }

    const result = await packSystem.openPackFromInventory(
      player_id,
      pack_inventory_id,
    );
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      pack_type: result.pack_type,
      source: result.source,
      cards: result.cards,
    });
  } catch (err) {
    console.error('Open inventory pack error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GRANT A PACK (admin/system use) ──
// POST /api/packs/grant
// Body: { player_id, pack_type, source, pack_data }
router.post('/grant', async (req, res) => {
  try {
    const { player_id, pack_type, source, pack_data } = req.body || {};
    if (!player_id)
      return res.status(400).json({ error: 'player_id required' });

    const result = await packSystem.grantPack(
      player_id,
      pack_type || 'reward',
      source || 'admin_grant',
      pack_data || null,
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, pack: result.pack });
  } catch (err) {
    console.error('Grant pack error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════
// EXISTING ENDPOINTS (unchanged)
// ══════════════════════════════════════

// ── OPEN TODAY'S DAILY PACK (legacy — auto-opens) ──
// POST /api/packs/open
// Body: { player_id }
router.post('/open', async (req, res) => {
  try {
    const { player_id } = req.body || {};
    if (!player_id)
      return res.status(400).json({ error: 'player_id required' });

    const result = await packSystem.generateDailyPack(player_id);
    if (!result.success && result.pack) {
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
      return res.json({
        success: true,
        hand: null,
        message: 'No pack opened today',
      });
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
    const supabase = require('../config/supabaseAdmin');
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
// GET /api/packs/collection/:player_id?rarity=rare&house=smoulders&type=attack
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
// GET /api/packs/collection/:player_id/stats
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
