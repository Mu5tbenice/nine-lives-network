/**
 * Spell Routes
 * Mounted at /api/spells in index.js
 *
 * Public:
 *   GET /                    — all spells
 *   GET /rotation/:house     — daily rotation for a house
 *
 * Admin (requires x-admin-key header):
 *   POST   /                 — create a spell
 *   PUT    /:id              — update a spell
 *   DELETE /:id              — delete a spell
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/spells
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('spells')
      .select('*')
      .order('house')
      .order('name');
    if (error) throw error;

    // Fix image URLs — convert filenames to full Supabase Storage URLs
    const fixed = (data || []).map((spell) => {
      if (spell.image_url && spell.image_url.indexOf('http') !== 0) {
        const { data: urlData } = supabase.storage
          .from('spell-images')
          .getPublicUrl(spell.image_url);
        spell.image_url = urlData.publicUrl;
      }
      return spell;
    });

    res.json(fixed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/spells/rotation/:house
router.get('/rotation/:house', async (req, res) => {
  try {
    const house = req.params.house.toLowerCase();

    const { data: universals, error: uErr } = await supabase
      .from('spells')
      .select('*')
      .eq('house', 'universal')
      .eq('is_active', true);
    if (uErr) throw uErr;

    const { data: houseSpells, error: hErr } = await supabase
      .from('spells')
      .select('*')
      .eq('house', house)
      .eq('is_active', true)
      .order('name');
    if (hErr) throw hErr;

    const today = new Date();
    let seed =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate();
    function rng(s) {
      return (s * 1103515245 + 12345) & 0x7fffffff;
    }

    const pool = [...(houseSpells || [])];
    const picked = [];
    let s = seed;
    while (picked.length < 2 && pool.length > 0) {
      s = rng(s);
      const idx = (s >>> 0) % pool.length;
      picked.push(pool.splice(idx, 1)[0]);
    }

    // Fix image URLs for all spell arrays
    function fixImageUrls(spells) {
      return (spells || []).map((spell) => {
        if (spell.image_url && spell.image_url.indexOf('http') !== 0) {
          const { data: urlData } = supabase.storage
            .from('spell-images')
            .getPublicUrl(spell.image_url);
          spell.image_url = urlData.publicUrl;
        }
        return spell;
      });
    }

    res.json({
      always: fixImageUrls(universals),
      rotation: fixImageUrls(picked),
      all_house_spells: fixImageUrls(houseSpells),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/spells
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      house,
      spell_type,
      base_effect,
      bonus_effects,
      flavor_text,
      motto,
      is_active,
      image_url,
    } = req.body;
    const finalSlug =
      slug ||
      (name || 'spell')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const { data, error } = await supabase
      .from('spells')
      .insert({
        name: name || 'New Spell',
        slug: finalSlug,
        house: (house || 'universal').toLowerCase(),
        spell_type: spell_type || 'attack',
        base_effect: base_effect || '',
        bonus_effects: bonus_effects || [],
        flavor_text: flavor_text || null,
        motto: motto || null,
        is_active: is_active !== false,
        image_url: image_url || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ spell: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/spells/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const updates = {};
    const allowed = [
      'name',
      'slug',
      'house',
      'spell_type',
      'base_effect',
      'bonus_effects',
      'flavor_text',
      'motto',
      'is_active',
      'image_url',
      'in_pack_pool',
      'base_atk',
      'base_hp',
      'base_spd',
      'base_def',
      'base_luck',
      'rarity_weights',
    ];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (updates.name && !updates.slug) {
      updates.slug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    const { data, error } = await supabase
      .from('spells')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ spell: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/spells/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('spells')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
