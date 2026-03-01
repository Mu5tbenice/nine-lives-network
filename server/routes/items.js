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

// ── POST /api/items/equip — Equip item(s) ──
// Supports two modes:
//   Single: { player_id, item_slug }
//   Builder bulk: { player_id, equipment: {fur:'id',...}, images: {fur:'FILE.png',...} }
router.post('/equip', express.json(), async (req, res) => {
  try {
    const { player_id, item_slug, equipment, images } = req.body;
    if (!player_id) return res.status(400).json({ error: 'player_id required' });

    // ── BUILDER BULK MODE ──
    if (equipment && typeof equipment === 'object') {
      const update = {};
      const SLOT_COLUMNS = {
        fur: 'equipped_fur',
        expression: 'equipped_expression',
        headwear: 'equipped_headwear',
        outfit: 'equipped_outfit',
        weapon: 'equipped_weapon',
        familiar: 'equipped_familiar',
        trinket1: 'equipped_trinket_1',
        trinket2: 'equipped_trinket_2',
      };

      // Map builder slot IDs to DB columns
      Object.keys(equipment).forEach(slot => {
        const col = SLOT_COLUMNS[slot];
        if (col) {
          const val = equipment[slot];
          update[col] = (val && val !== 'none') ? val : null;
        }
      });

      // Build equipped_images from filenames for arena rendering
      if (images && typeof images === 'object') {
        const imageMap = {};
        Object.keys(images).forEach(slot => {
          if (images[slot]) {
            imageMap[slot] = '/assets/nine/' + slot + '/' + images[slot];
          }
        });
        update.equipped_images = imageMap;
      }

      const { error } = await supabase
        .from('player_nines')
        .update(update)
        .eq('player_id', player_id);

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, mode: 'bulk', slots_updated: Object.keys(update).length });
    }

    // ── SINGLE ITEM MODE (inventory system) ──
    if (!item_slug) return res.status(400).json({ error: 'item_slug or equipment object required' });

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

// ── POST /api/items/drop — Award a random item to player ──
// Body: { player_id, source, slot (optional) }
router.post('/drop', express.json(), async (req, res) => {
  try {
    const { player_id, source, slot } = req.body;
    if (!player_id) return res.status(400).json({ error: 'player_id required' });

    // Roll rarity: common 40%, uncommon 30%, rare 20%, epic 8%, legendary 2%
    const roll = Math.random() * 100;
    let rarity;
    if (roll < 40) rarity = 'common';
    else if (roll < 70) rarity = 'uncommon';
    else if (roll < 90) rarity = 'rare';
    else if (roll < 98) rarity = 'epic';
    else rarity = 'legendary';

    // Pick a random item of that rarity (optionally from specific slot)
    let query = supabase.from('items').select('*').eq('rarity', rarity).eq('is_active', true);
    if (slot) query = query.eq('slot', slot);
    const { data: candidates } = await query;

    if (!candidates || candidates.length === 0) {
      // Fallback to any rarity
      const { data: fallback } = await supabase.from('items').select('*').eq('is_active', true);
      if (!fallback || fallback.length === 0) return res.status(500).json({ error: 'No items available' });
      const item = fallback[Math.floor(Math.random() * fallback.length)];
      const { data: granted } = await supabase.from('player_items').insert({ player_id: parseInt(player_id), item_id: item.id, source: source || 'drop' }).select('*, item:item_id(*)').single();
      return res.json({ success: true, item, player_item: granted });
    }

    const item = candidates[Math.floor(Math.random() * candidates.length)];
    const { data: granted, error } = await supabase
      .from('player_items')
      .insert({ player_id: parseInt(player_id), item_id: item.id, source: source || 'drop' })
      .select('*, item:item_id(*)')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, item, player_item: granted, rarity });

  } catch (err) {
    console.error('Item drop error:', err);
    res.status(500).json({ error: 'Failed to drop item' });
  }
});

// ── POST /api/items/craft — Sacrifice 5 cards for 1 random item ──
// Body: { player_id, card_ids: [id, id, id, id, id] }
router.post('/craft', express.json(), async (req, res) => {
  try {
    const { player_id, card_ids } = req.body;
    if (!player_id || !card_ids || card_ids.length < 5) {
      return res.status(400).json({ error: 'player_id and 5 card_ids required' });
    }

    // Verify player owns all 5 cards and they're not deployed
    const { data: cards, error: cardErr } = await supabase
      .from('player_cards')
      .select('id')
      .eq('player_id', player_id)
      .in('id', card_ids.slice(0, 5));

    if (!cards || cards.length < 5) {
      return res.status(400).json({ error: 'You need 5 owned cards to craft' });
    }

    // Check none are deployed
    const { data: deployed } = await supabase
      .from('zone_card_slots')
      .select('card_id')
      .in('card_id', card_ids.slice(0, 5))
      .eq('is_active', true);

    if (deployed && deployed.length > 0) {
      return res.status(400).json({ error: 'Cannot sacrifice deployed cards. Withdraw them first.' });
    }

    // Delete the 5 cards
    const { error: delErr } = await supabase
      .from('player_cards')
      .delete()
      .in('id', card_ids.slice(0, 5));

    if (delErr) return res.status(500).json({ error: 'Failed to consume cards' });

    // Roll a random item (better odds than normal drop)
    const roll = Math.random() * 100;
    let rarity;
    if (roll < 25) rarity = 'common';
    else if (roll < 55) rarity = 'uncommon';
    else if (roll < 80) rarity = 'rare';
    else if (roll < 95) rarity = 'epic';
    else rarity = 'legendary';

    const { data: candidates } = await supabase.from('items').select('*').eq('rarity', rarity).eq('is_active', true);
    const item = candidates && candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : null;

    if (!item) return res.status(500).json({ error: 'No items available for craft' });

    const { data: granted } = await supabase
      .from('player_items')
      .insert({ player_id: parseInt(player_id), item_id: item.id, source: 'craft' })
      .select('*, item:item_id(*)')
      .single();

    res.json({ success: true, item, player_item: granted, rarity, cards_consumed: 5 });

  } catch (err) {
    console.error('Item craft error:', err);
    res.status(500).json({ error: 'Failed to craft item' });
  }
});

module.exports = router;