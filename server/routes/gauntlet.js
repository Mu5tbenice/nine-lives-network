// ═══════════════════════════════════════════════════════
// server/routes/gauntlet.js
// V3 Gauntlet — Solo PvE Routes
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const gauntletEngine = require('../services/gauntletEngine');
const { addXP, XP_REWARDS } = require('../services/xp-engine');
const supabase = require('../config/supabase');

// Helper: drop an item for a player
async function dropItem(playerId, source) {
  try {
    const roll = Math.random() * 100;
    let rarity;
    if (roll < 40) rarity = 'common';
    else if (roll < 70) rarity = 'uncommon';
    else if (roll < 90) rarity = 'rare';
    else if (roll < 98) rarity = 'epic';
    else rarity = 'legendary';

    const { data: candidates } = await supabase.from('items').select('id, name, rarity, slot').eq('rarity', rarity).eq('is_active', true);
    if (!candidates || candidates.length === 0) return null;
    const item = candidates[Math.floor(Math.random() * candidates.length)];
    await supabase.from('player_items').insert({ player_id: parseInt(playerId), item_id: item.id, source });
    return item;
  } catch (e) { return null; }
}

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

      // V5: Item drops at milestone floors (10% chance at floor 5, 25% at 10, 50% at 15+)
      const floor = result.floor || result.current_floor || 0;
      let dropChance = 0;
      if (floor >= 15) dropChance = 0.5;
      else if (floor >= 10) dropChance = 0.25;
      else if (floor >= 5) dropChance = 0.1;

      if (dropChance > 0 && Math.random() < dropChance) {
        const droppedItem = await dropItem(player_id, 'gauntlet_floor_' + floor);
        if (droppedItem) result.item_drop = droppedItem;
      }
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