// ═══════════════════════════════════════════
// server/routes/items.js
// Items catalog, player inventory, equip/unequip
// ═══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

const VALID_SLOTS = ['fur','expression','headwear','outfit','weapon','familiar','trinket'];

// ── GET /api/items — Full item catalog ──
router.get('/', async (req, res) => {
  try {
    const { slot, rarity } = req.query;
    let query = supabase.from('items').select('*').eq('is_active', true).order('slot').order('rarity');
    if (slot) query = query.eq('slot', slot);
    if (rarity) query = query.eq('rarity', rarity);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    console.error('Items catalog error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// ── GET /api/items/starters — Starter items only ──
router.get('/starters', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('is_starter', true)
      .eq('is_active', true)
      .order('slot');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch starter items' });
  }
});

// ── GET /api/items/inventory/:player_id — Player's owned items ──
router.get('/inventory/:player_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('player_items')
      .select('*, item:item_id(*)')
      .eq('player_id', req.params.player_id)
      .order('acquired_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// ── GET /api/items/equipped/:player_id — What's currently equipped ──
router.get('/equipped/:player_id', async (req, res) => {
  try {
    const { data: nine, error } = await supabase
      .from('player_nines')
      .select('equipped_fur, equipped_expression, equipped_headwear, equipped_outfit, equipped_weapon, equipped_familiar, equipped_trinket_1, equipped_trinket_2, base_atk, base_hp, base_spd, base_def, base_luck, house_id, name')
      .eq('player_id', req.params.player_id)
      .single();
    if (error) return res.status(404).json({ error: 'Nine not found' });

    // Fetch equipped item details
    const slugs = [
      nine.equipped_fur, nine.equipped_expression, nine.equipped_headwear,
      nine.equipped_outfit, nine.equipped_weapon, nine.equipped_familiar,
      nine.equipped_trinket_1, nine.equipped_trinket_2
    ].filter(Boolean);

    let equippedItems = [];
    if (slugs.length > 0) {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .in('slug', slugs);
      equippedItems = items || [];
    }

    // Calculate total stats
    let totalAtk = nine.base_atk, totalHp = nine.base_hp, totalSpd = nine.base_spd;
    let totalDef = nine.base_def || 2, totalLuck = nine.base_luck || 2;
    equippedItems.forEach(item => {
      totalAtk += item.bonus_atk || 0;
      totalHp += item.bonus_hp || 0;
      totalSpd += item.bonus_spd || 0;
      totalDef += item.bonus_def || 0;
      totalLuck += item.bonus_luck || 0;
    });

    res.json({
      nine: {
        name: nine.name,
        house_id: nine.house_id,
        base: { atk: nine.base_atk, hp: nine.base_hp, spd: nine.base_spd, def: nine.base_def || 2, luck: nine.base_luck || 2 },
        total: { atk: totalAtk, hp: totalHp, spd: totalSpd, def: totalDef, luck: totalLuck },
      },
      equipped: {
        fur: nine.equipped_fur,
        expression: nine.equipped_expression,
        headwear: nine.equipped_headwear,
        outfit: nine.equipped_outfit,
        weapon: nine.equipped_weapon,
        familiar: nine.equipped_familiar,
        trinket_1: nine.equipped_trinket_1,
        trinket_2: nine.equipped_trinket_2,
      },
      items: equippedItems,
    });
  } catch (err) {
    console.error('Equipped fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch equipped items' });
  }
});

// ── POST /api/items/equip — Equip an item ──
router.post('/equip', express.json(), async (req, res) => {
  try {
    const { player_id, item_slug } = req.body;
    if (!player_id || !item_slug) return res.status(400).json({ error: 'player_id and item_slug required' });

    // Verify item exists
    const { data: item } = await supabase.from('items').select('*').eq('slug', item_slug).single();
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Verify player owns this item
    const { data: owned } = await supabase
      .from('player_items')
      .select('id')
      .eq('player_id', player_id)
      .eq('item_id', item.id)
      .single();
    if (!owned) return res.status(403).json({ error: 'You don\'t own this item' });

    // Determine which column to update
    let column;
    if (item.slot === 'trinket') {
      // Check trinket_1 first, then trinket_2
      const { data: nine } = await supabase
        .from('player_nines')
        .select('equipped_trinket_1, equipped_trinket_2')
        .eq('player_id', player_id)
        .single();
      if (!nine.equipped_trinket_1 || nine.equipped_trinket_1 === item_slug) {
        column = 'equipped_trinket_1';
      } else {
        column = 'equipped_trinket_2';
      }
    } else {
      column = 'equipped_' + item.slot;
    }

    // Update the Nine
    const { data: updated, error } = await supabase
      .from('player_nines')
      .update({ [column]: item_slug })
      .eq('player_id', player_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, slot: item.slot, item_slug });

  } catch (err) {
    console.error('Equip error:', err);
    res.status(500).json({ error: 'Failed to equip item' });
  }
});

// ── POST /api/items/unequip — Remove an item from a slot ──
router.post('/unequip', express.json(), async (req, res) => {
  try {
    const { player_id, slot } = req.body;
    if (!player_id || !slot) return res.status(400).json({ error: 'player_id and slot required' });

    const column = slot.startsWith('trinket') ? 'equipped_' + slot : 'equipped_' + slot;
    const { error } = await supabase
      .from('player_nines')
      .update({ [column]: null })
      .eq('player_id', player_id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, slot, unequipped: true });

  } catch (err) {
    res.status(500).json({ error: 'Failed to unequip' });
  }
});

// ── POST /api/items/grant-starters — Give a player all starter items ──
router.post('/grant-starters', express.json(), async (req, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) return res.status(400).json({ error: 'player_id required' });

    // Get all starter items
    const { data: starters } = await supabase
      .from('items')
      .select('id')
      .eq('is_starter', true)
      .eq('is_active', true);

    if (!starters || starters.length === 0) return res.json({ success: true, granted: 0 });

    // Insert, skip duplicates
    const rows = starters.map(item => ({
      player_id: parseInt(player_id),
      item_id: item.id,
      source: 'starter',
    }));

    const { data, error } = await supabase
      .from('player_items')
      .upsert(rows, { onConflict: 'player_id,item_id', ignoreDuplicates: true })
      .select();

    res.json({ success: true, granted: data?.length || 0 });

  } catch (err) {
    console.error('Grant starters error:', err);
    res.status(500).json({ error: 'Failed to grant starter items' });
  }
});

module.exports = router;