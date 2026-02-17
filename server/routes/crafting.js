// server/routes/crafting.js
// API routes for card crafting and recharging

const express = require('express');
const router = express.Router();
const { rechargeCard } = require('../services/cardDurability');
const supabase = require('../config/supabase');

// POST /api/crafting/recharge — Recharge a card using fuel cards
// Body: { targetCardId: number, fuelCardIds: number[] }
router.post('/recharge', async (req, res) => {
  try {
    const { targetCardId, fuelCardIds } = req.body;

    if (!targetCardId || !fuelCardIds || !Array.isArray(fuelCardIds)) {
      return res.status(400).json({ error: 'targetCardId and fuelCardIds array required' });
    }

    const result = await rechargeCard(targetCardId, fuelCardIds);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('Error in POST /api/crafting/recharge:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/crafting/fuse — Fuse 3 cards of same rarity into 1 of next rarity
// Body: { cardIds: number[] } (exactly 3 cards, same rarity)
router.post('/fuse', async (req, res) => {
  try {
    const { cardIds } = req.body;

    if (!cardIds || !Array.isArray(cardIds) || cardIds.length !== 3) {
      return res.status(400).json({ error: 'Exactly 3 cardIds required' });
    }

    // Get the 3 cards
    const { data: cards, error: fetchError } = await supabase
      .from('player_cards')
      .select('id, spell_id, rarity, player_id')
      .in('id', cardIds);

    if (fetchError || !cards || cards.length !== 3) {
      return res.status(400).json({ error: 'Could not find all 3 cards' });
    }

    // All must belong to same player
    const playerId = cards[0].player_id;
    if (!cards.every(c => c.player_id === playerId)) {
      return res.status(400).json({ error: 'All cards must belong to same player' });
    }

    // All must be same rarity
    const rarity = cards[0].rarity;
    if (!cards.every(c => c.rarity === rarity)) {
      return res.status(400).json({ error: 'All 3 cards must be the same rarity' });
    }

    // Can't fuse legendary (already max rarity)
    if (rarity === 'legendary') {
      return res.status(400).json({ error: 'Cannot fuse Legendary cards (already max rarity)' });
    }

    // Determine next rarity
    const RARITY_UPGRADE = {
      common: 'uncommon',
      uncommon: 'rare',
      rare: 'epic',
      epic: 'legendary',
    };
    const newRarity = RARITY_UPGRADE[rarity];

    // Determine durability for new card
    const CHARGES = { common: 5, uncommon: 8, rare: 12, epic: 18, legendary: 30 };
    const newCharges = CHARGES[newRarity];

    // Pick a random spell_id from the 3 fuel cards (the result is one of the input spells, upgraded)
    const randomSpellId = cards[Math.floor(Math.random() * 3)].spell_id;

    // Delete the 3 fuel cards
    const { error: deleteError } = await supabase
      .from('player_cards')
      .delete()
      .in('id', cardIds);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to consume cards' });
    }

    // Create the new upgraded card
    const { data: newCard, error: insertError } = await supabase
      .from('player_cards')
      .insert({
        player_id: playerId,
        spell_id: randomSpellId,
        rarity: newRarity,
        current_charges: newCharges,
        max_charges: newCharges,
        is_exhausted: false,
        source: 'craft',
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create new card' });
    }

    res.json({
      success: true,
      consumed: cardIds,
      newCard: newCard,
      message: `Fused 3 ${rarity} cards into 1 ${newRarity}!`,
    });
  } catch (err) {
    console.error('Error in POST /api/crafting/fuse:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/crafting/can-fuse/:playerId — Check what the player can fuse
router.get('/can-fuse/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);

    const { data: cards } = await supabase
      .from('player_cards')
      .select('rarity')
      .eq('player_id', playerId);

    if (!cards) return res.json({ fusable: [] });

    // Count cards by rarity
    const counts = {};
    cards.forEach(c => {
      counts[c.rarity] = (counts[c.rarity] || 0) + 1;
    });

    // Can fuse if 3+ of same rarity (except legendary)
    const fusable = Object.entries(counts)
      .filter(([rarity, count]) => count >= 3 && rarity !== 'legendary')
      .map(([rarity, count]) => ({
        rarity,
        available: count,
        canFuse: Math.floor(count / 3),
      }));

    res.json({ fusable });
  } catch (err) {
    console.error('Error in GET /api/crafting/can-fuse:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;