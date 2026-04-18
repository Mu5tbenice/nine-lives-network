// ═══════════════════════════════════════════════════════
// server/routes/boss.js
// V3 Weekly Boss — Guild PvE Raid Routes
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const bossEngine = require('../services/bossEngine');
const { addXP, XP_REWARDS } = require('../services/xp-engine');
const supabase = require('../config/supabase');

// Helper: drop an item for a player
async function dropItem(playerId, source) {
  try {
    const roll = Math.random() * 100;
    let rarity;
    if (roll < 30) rarity = 'common';
    else if (roll < 60) rarity = 'uncommon';
    else if (roll < 85) rarity = 'rare';
    else if (roll < 96) rarity = 'epic';
    else rarity = 'legendary';

    const { data: candidates } = await supabase
      .from('items')
      .select('id, name, rarity, slot')
      .eq('rarity', rarity)
      .eq('is_active', true);
    if (!candidates || candidates.length === 0) return null;
    const item = candidates[Math.floor(Math.random() * candidates.length)];
    await supabase
      .from('player_items')
      .insert({ player_id: parseInt(playerId), item_id: item.id, source });
    return item;
  } catch (e) {
    return null;
  }
}

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
    if (!player_id)
      return res.status(400).json({ error: 'player_id required' });
    const result = await bossEngine.deployToBoss(player_id, card_id);

    // V5: Award XP for boss participation
    if (result && !result.error) {
      await addXP(
        parseInt(player_id),
        XP_REWARDS.boss_cycle,
        'boss_deploy',
      ).catch(() => {});

      // V5: 15% chance of item drop per boss participation
      if (Math.random() < 0.15) {
        const droppedItem = await dropItem(player_id, 'boss');
        if (droppedItem) result.item_drop = droppedItem;
      }
    }

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
    if (!player_id || !card_id)
      return res.status(400).json({ error: 'player_id and card_id required' });
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
    const result = await bossEngine.getPlayerContribution(
      parseInt(req.params.playerId),
    );
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
