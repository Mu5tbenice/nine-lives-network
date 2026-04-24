// ═══════════════════════════════════════════════════════
// server/routes/stats.js
// Combat V2 — Stat Calculation API
// Returns calculated Nine stats (house + cards + items)
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const {
  calculateNineStats,
  calculateBaseStats,
  calculateDamage,
  calculateAttackInterval,
} = require('../services/statCalculation');

// ═══════════════════════════════════════════
// GET /api/stats/:playerId
// Get base stats (house + items, no zone cards)
// Good for: profile page, loadout builder
// ═══════════════════════════════════════════
router.get('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId required' });
    }

    const stats = await calculateBaseStats(playerId);
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Stats calc error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
// GET /api/stats/:playerId/zone/:zoneId
// Get full combat stats (house + zone cards + items)
// Good for: zone detail page, arena viewer
// ═══════════════════════════════════════════
router.get('/:playerId/zone/:zoneId', async (req, res) => {
  try {
    const { playerId, zoneId } = req.params;
    if (!playerId || !zoneId) {
      return res.status(400).json({ error: 'playerId and zoneId required' });
    }

    const stats = await calculateNineStats(playerId, parseInt(zoneId));
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Zone stats calc error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
// POST /api/stats/preview
// Preview stats for a hypothetical loadout
// Body: { player_id, card_ids: [id1, id2, id3] }
// Good for: "Build Preview" feature before deploying
// ═══════════════════════════════════════════
router.post('/preview', async (req, res) => {
  try {
    const { player_id, card_ids } = req.body;
    if (!player_id) {
      return res.status(400).json({ error: 'player_id required' });
    }

    const supabase = require('../config/supabaseAdmin');

    // Get player's house
    const { data: player } = await supabase
      .from('players')
      .select('school_id')
      .eq('id', player_id)
      .single();

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const { data: house } = await supabase
      .from('houses')
      .select('atk, hp, spd, def, luck, name, slug')
      .eq('id', player.school_id)
      .single();

    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }

    // Start with house stats
    const totals = {
      atk: house.atk || 0,
      hp: house.hp || 0,
      spd: house.spd || 0,
      def: house.def || 0,
      luck: house.luck || 0,
    };

    // Add preview cards
    const cardBreakdown = [];
    if (card_ids && card_ids.length > 0) {
      const { data: cards } = await supabase
        .from('player_spells')
        .select(
          'id, sharpness, spells(name, base_atk, base_hp, base_spd, base_def, base_luck)',
        )
        .in('id', card_ids.slice(0, 3)); // Max 3 cards

      if (cards) {
        const { applySharpness } = require('../services/statCalculation');
        cards.forEach((card) => {
          const s = card.spells;
          if (!s) return;
          const sharp = card.sharpness != null ? card.sharpness : 100;
          const cs = {
            atk: applySharpness(s.base_atk || 0, sharp),
            hp: applySharpness(s.base_hp || 0, sharp),
            spd: applySharpness(s.base_spd || 0, sharp),
            def: applySharpness(s.base_def || 0, sharp),
            luck: applySharpness(s.base_luck || 0, sharp),
          };
          totals.atk += cs.atk;
          totals.hp += cs.hp;
          totals.spd += cs.spd;
          totals.def += cs.def;
          totals.luck += cs.luck;
          cardBreakdown.push({ name: s.name, sharpness: sharp, ...cs });
        });
      }
    }

    // Add equipped items (read from player_nines.equipped_* columns)
    const { data: nine } = await supabase
      .from('player_nines')
      .select(
        'equipped_fur, equipped_expression, equipped_headwear, equipped_outfit, equipped_weapon, equipped_familiar, equipped_trinket_1, equipped_trinket_2',
      )
      .eq('player_id', player_id)
      .single();

    const itemBreakdown = [];
    if (nine) {
      const slugs = [
        nine.equipped_fur,
        nine.equipped_expression,
        nine.equipped_headwear,
        nine.equipped_outfit,
        nine.equipped_weapon,
        nine.equipped_familiar,
        nine.equipped_trinket_1,
        nine.equipped_trinket_2,
      ]
        .filter(Boolean)
        .filter((s) => s !== 'none');

      if (slugs.length > 0) {
        const { data: items } = await supabase
          .from('items')
          .select(
            'name, slug, slot, bonus_atk, bonus_hp, bonus_spd, bonus_def, bonus_luck',
          )
          .in('slug', slugs);

        if (items) {
          items.forEach((item) => {
            totals.atk += item.bonus_atk || 0;
            totals.hp += item.bonus_hp || 0;
            totals.spd += item.bonus_spd || 0;
            totals.def += item.bonus_def || 0;
            totals.luck += item.bonus_luck || 0;
            itemBreakdown.push({
              name: item.name,
              slot: item.slot,
              atk: item.bonus_atk || 0,
              hp: item.bonus_hp || 0,
              spd: item.bonus_spd || 0,
              def: item.bonus_def || 0,
              luck: item.bonus_luck || 0,
            });
          });
        }
      }
    }

    // Calculate combat values
    const attackInterval = calculateAttackInterval(totals.spd);

    res.json({
      success: true,
      preview: {
        ...totals,
        attackInterval: Math.round(attackInterval * 100) / 100,
        critChance: Math.min(100, totals.luck),
        breakdown: {
          house: {
            name: house.name,
            atk: house.atk,
            hp: house.hp,
            spd: house.spd,
            def: house.def,
            luck: house.luck,
          },
          cards: cardBreakdown,
          items: itemBreakdown,
        },
      },
    });
  } catch (err) {
    console.error('Preview stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
