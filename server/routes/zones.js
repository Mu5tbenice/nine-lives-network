// ═══════════════════════════════════════════════════════
// server/routes/zones.js
// V5 Zone Deployment + 3-Card Loadout System
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const { getNine, healNine } = require('../services/nineSystem');
const { addPoints } = require('../services/pointsService');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// V5: Max cards per zone deployment
const MAX_CARDS_PER_ZONE = 3;

// V5 Zone points (from Game Design V5, Section 21)
const ZONE_POINTS = {
  DEPLOY: 5,       // +5 for deploying to a zone
  FLIP_ZONE: 15,   // +15 for flipping a zone to your guild
};

// ═══════════════════════════════════════════
// POST /api/zones/deploy
// Deploy your Nine to a zone (V2: FREE — no mana cost)
// Body: { player_id, zone_id, card_ids?: [id1, id2, id3] }
// ═══════════════════════════════════════════
router.post('/deploy', async (req, res) => {
  try {
    const { player_id, zone_id, card_ids } = req.body;

    if (!player_id || !zone_id) {
      return res.status(400).json({ error: 'player_id and zone_id required' });
    }

    // Get player's Nine
    const nine = await getNine(player_id);
    if (!nine) {
      return res.status(404).json({ error: 'No Nine found — complete registration first' });
    }

    // Check if already deployed on this zone
    const { data: existingDeploy } = await supabase
      .from('zone_deployments')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .single();

    if (existingDeploy) {
      return res.status(400).json({ error: 'Already deployed on this zone' });
    }

    // V5: Check zone deployment limit (2 zones at start, 3 at level 10)
    const { data: currentDeploys } = await supabase
      .from('zone_deployments')
      .select('id')
      .eq('player_id', player_id)
      .eq('is_active', true);

    const playerLevel = nine.level || 1;
    const maxZones = playerLevel >= 10 ? 3 : 2;
    if ((currentDeploys || []).length >= maxZones) {
      return res.status(400).json({
        error: `Already deployed to ${maxZones} zones (max for level ${playerLevel}). Withdraw from one first.`
      });
    }

    // Get player's guild tag
    const { data: player } = await supabase
      .from('players')
      .select('guild_tag, twitter_handle')
      .eq('id', player_id)
      .single();

    // Get house HP from houses table (V2 source of truth)
    const { data: house } = await supabase
      .from('houses')
      .select('hp')
      .eq('id', nine.house_id)
      .single();
    const deployHp = house?.hp || nine.base_hp || 100;

    // Nine heals to full on deploy
    await healNine(nine.id);

    // Create deployment
    const { data: deployment, error: deployErr } = await supabaseAdmin
      .from('zone_deployments')
      .insert({
        player_id: player_id,
        nine_id: nine.id,
        zone_id: zone_id,
        guild_tag: player?.guild_tag || ('@' + (player?.twitter_handle || 'lone_wolf')),
        current_hp: deployHp,
        max_hp: deployHp,
        is_active: true,
        is_mercenary: !(player?.guild_tag),
      })
      .select()
      .single();

    if (deployErr) {
      console.error('Deploy error:', deployErr);
      return res.status(500).json({ error: 'Failed to deploy' });
    }

    // Auto-equip cards if provided by deploy modal
    let equippedCount = 0;
    if (Array.isArray(card_ids) && card_ids.length > 0 && deployment) {
      for (let i = 0; i < Math.min(card_ids.length, MAX_CARDS_PER_ZONE); i++) {
        try {
          await supabaseAdmin
            .from('zone_card_slots')
            .insert({
              deployment_id: deployment.id,
              card_id: card_ids[i],
              slot_number: i + 1,
              is_active: true,
            });
          equippedCount++;
        } catch (e) {
          console.error(`Failed to equip card ${card_ids[i]} in slot ${i + 1}:`, e.message);
        }
      }
    }

    // Award deploy points (+5)
    await addPoints(player_id, ZONE_POINTS.DEPLOY, 'zone_deploy', `Deployed to zone ${zone_id}`);

    // Notify arena socket viewers
    try {
      if (global.__arenaSocket) {
        global.__arenaSocket._broadcastToZone(zone_id, 'arena:nine_joined', {
          nine_id: player_id,
          player_name: nine.name || player?.twitter_handle || 'Unknown',
          house: nine.house_key || 'smoulders',
          guild: player?.guild_tag || 'Lone Wolf',
          guild_id: player?.guild_tag,
          stats: { atk: nine.base_atk, hp: deployHp, spd: nine.base_spd, def: nine.base_def || 0, luck: nine.base_luck || 0 },
          equipped_images: nine.equipped_images || {},
        });
      }
    } catch (e) { /* socket broadcast is non-critical */ }

    // Tell combat engine to reload this zone on next tick (picks up new Nine immediately)
    if (global.__combatEngine) global.__combatEngine.forceReload(zone_id);

    res.json({
      success: true,
      deployment,
      points_earned: ZONE_POINTS.DEPLOY,
      message: player?.guild_tag
        ? `Deployed to zone ${zone_id}! Fighting for ${player.guild_tag} (+${ZONE_POINTS.DEPLOY} pts)`
        : `Lone Wolf deployed! 1.5× ATK bonus active. (+${ZONE_POINTS.DEPLOY} pts)`,
      is_lone_wolf: !(player?.guild_tag),
    });

  } catch (err) {
    console.error('Deploy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// POST /api/zones/withdraw
// Withdraw your Nine from a zone (free)
// Body: { player_id, zone_id }
// ═══════════════════════════════════════════
router.post('/withdraw', async (req, res) => {
  try {
    const { player_id, zone_id } = req.body;

    if (!player_id || !zone_id) {
      return res.status(400).json({ error: 'player_id and zone_id required' });
    }

    // Find active deployment
    const { data: deployment } = await supabase
      .from('zone_deployments')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .single();

    if (!deployment) {
      return res.status(404).json({ error: 'No active deployment on this zone' });
    }

    // Remove all cards from slots
    await supabaseAdmin
      .from('zone_card_slots')
      .update({ is_active: false })
      .eq('deployment_id', deployment.id)
      .eq('is_active', true);

    // Deactivate deployment
    await supabaseAdmin
      .from('zone_deployments')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', deployment.id);

    // Notify arena socket viewers
    try {
      if (global.__arenaSocket) {
        global.__arenaSocket._broadcastToZone(zone_id, 'arena:nine_left', { nine_id: player_id });
      }
    } catch (e) { /* non-critical */ }

    // Tell combat engine to reload this zone (removes withdrawn Nine immediately)
    if (global.__combatEngine) global.__combatEngine.forceReload(zone_id);

    res.json({
      success: true,
      message: 'Withdrawn from zone. Cards returned to hand.',
    });

  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// POST /api/zones/equip-card
// Equip a card to one of your 3 loadout slots
// V5: FREE — no mana cost, no tiers
// Body: { player_id, zone_id, card_id, slot_number }
// slot_number: 1, 2, or 3
// ═══════════════════════════════════════════
router.post('/equip-card', async (req, res) => {
  try {
    const { player_id, zone_id, card_id, slot_number } = req.body;

    if (!player_id || !zone_id || !card_id) {
      return res.status(400).json({ error: 'player_id, zone_id, and card_id required' });
    }

    const slot = parseInt(slot_number) || 1;
    if (slot < 1 || slot > MAX_CARDS_PER_ZONE) {
      return res.status(400).json({ error: `slot_number must be 1-${MAX_CARDS_PER_ZONE}` });
    }

    // Find active deployment on this zone
    const { data: deployment } = await supabase
      .from('zone_deployments')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .single();

    if (!deployment) {
      return res.status(400).json({ error: 'Not deployed on this zone — deploy first' });
    }

    // Get the card from player's collection
    const { data: card } = await supabase
      .from('player_cards')
      .select('*, spell:spell_id(name, spell_type, rarity, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects)')
      .eq('id', card_id)
      .eq('player_id', player_id)
      .single();

    if (!card) {
      return res.status(404).json({ error: 'Card not found in your collection' });
    }

    // V5: Check sharpness instead of exhaustion — 0% sharpness still works (50% power)
    // Cards can always be equipped, sharpness just affects effectiveness

    // Check card isn't already equipped on ANOTHER zone
    const { data: existingSlots } = await supabase
      .from('zone_card_slots')
      .select('id, deployment:deployment_id(zone_id)')
      .eq('card_id', card_id)
      .eq('is_active', true);

    const otherZoneSlot = (existingSlots || []).find(s =>
      s.deployment && s.deployment.zone_id !== zone_id
    );
    if (otherZoneSlot) {
      return res.status(400).json({
        error: 'Card is already equipped on another zone. Unequip it first.',
      });
    }

    // Remove any existing card in this specific slot
    await supabaseAdmin
      .from('zone_card_slots')
      .update({ is_active: false })
      .eq('deployment_id', deployment.id)
      .eq('slot_number', slot)
      .eq('is_active', true);

    // Also remove this card if it's in a different slot on THIS zone
    await supabaseAdmin
      .from('zone_card_slots')
      .update({ is_active: false })
      .eq('deployment_id', deployment.id)
      .eq('card_id', card_id)
      .eq('is_active', true);

    // Place card in slot
    const { data: newSlot, error: slotErr } = await supabaseAdmin
      .from('zone_card_slots')
      .insert({
        deployment_id: deployment.id,
        card_id: card_id,
        slot_number: slot,
        is_active: true,
      })
      .select()
      .single();

    if (slotErr) {
      console.error('Equip card error:', slotErr);
      return res.status(500).json({ error: 'Failed to equip card' });
    }

    const spellName = card.spell?.name || card.spell_name || 'Card';

    res.json({
      success: true,
      slot: newSlot,
      message: `${spellName} equipped in slot ${slot} on zone ${zone_id}!`,
    });

  } catch (err) {
    console.error('Equip card error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// POST /api/zones/unequip-card
// Remove a card from a specific slot (free)
// Body: { player_id, zone_id, slot_number }
// ═══════════════════════════════════════════
router.post('/unequip-card', async (req, res) => {
  try {
    const { player_id, zone_id, slot_number } = req.body;

    if (!player_id || !zone_id || !slot_number) {
      return res.status(400).json({ error: 'player_id, zone_id, and slot_number required' });
    }

    const { data: deployment } = await supabase
      .from('zone_deployments')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .single();

    if (!deployment) {
      return res.status(404).json({ error: 'No active deployment on this zone' });
    }

    const { data: removed } = await supabaseAdmin
      .from('zone_card_slots')
      .update({ is_active: false })
      .eq('deployment_id', deployment.id)
      .eq('slot_number', parseInt(slot_number))
      .eq('is_active', true)
      .select();

    res.json({
      success: true,
      removed: (removed || []).length,
      message: `Slot ${slot_number} cleared`,
    });

  } catch (err) {
    console.error('Unequip card error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones/:zoneId/deployments
// List all Nines deployed on a zone with their loadouts
// ═══════════════════════════════════════════
router.get('/:zoneId/deployments', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);

    const { data: deployments, error } = await supabase
      .from('zone_deployments')
      .select(`
        *,
        player:player_id(twitter_handle, profile_image, school_id),
        nine:nine_id(name, base_atk, base_hp, base_spd, base_def, base_luck, house_id, equipped_images),
        card_slots:zone_card_slots(id, card_id, slot_number, is_active)
      `)
      .eq('zone_id', zoneId)
      .eq('is_active', true);

    if (error) {
      console.error('Deployments fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch deployments' });
    }

    // Filter card_slots to only active ones
    const cleaned = (deployments || []).map(d => ({
      ...d,
      card_slots: (d.card_slots || []).filter(s => s.is_active),
    }));

    // Calculate guild power totals
    const guildPower = {};
    cleaned.forEach(d => {
      const tag = d.guild_tag || 'unaffiliated';
      if (!guildPower[tag]) guildPower[tag] = { total_hp: 0, count: 0 };
      guildPower[tag].total_hp += d.current_hp;
      guildPower[tag].count += 1;
    });

    res.json({
      zone_id: zoneId,
      deployments: cleaned,
      guild_power: guildPower,
      total_nines: cleaned.length,
    });

  } catch (err) {
    console.error('Zone deployments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones/my-deployments/:playerId
// List all zones this player is deployed to
// ═══════════════════════════════════════════
router.get('/my-deployments/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);

    const { data: deployments, error } = await supabase
      .from('zone_deployments')
      .select(`
        *,
        zone:zone_id(name, description),
        card_slots:zone_card_slots(id, card_id, slot_number, is_active)
      `)
      .eq('player_id', playerId)
      .eq('is_active', true);

    if (error) {
      console.error('My deployments error:', error);
      return res.status(500).json({ error: 'Failed to fetch' });
    }

    // Filter to active card slots only
    const cleaned = (deployments || []).map(d => ({
      ...d,
      card_slots: (d.card_slots || []).filter(s => s.is_active),
    }));

    res.json({
      deployments: cleaned,
      total: cleaned.length,
    });

  } catch (err) {
    console.error('My deployments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones/:zoneId/my-loadout/:playerId
// Get this player's 3-card loadout on a specific zone
// ═══════════════════════════════════════════
router.get('/:zoneId/my-loadout/:playerId', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);
    const playerId = parseInt(req.params.playerId);

    // Find deployment
    const { data: deployment } = await supabase
      .from('zone_deployments')
      .select('id')
      .eq('player_id', playerId)
      .eq('zone_id', zoneId)
      .eq('is_active', true)
      .single();

    if (!deployment) {
      return res.json({ loadout: [], slots_used: 0, slots_max: MAX_CARDS_PER_ZONE });
    }

    // Get active card slots with card details
    const { data: slots } = await supabase
      .from('zone_card_slots')
      .select(`
        id, card_id, slot_number,
        card:card_id(
          id, player_id, sharpness,
          spell:spell_id(name, spell_type, house, rarity, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects, image_url)
        )
      `)
      .eq('deployment_id', deployment.id)
      .eq('is_active', true)
      .order('slot_number');

    res.json({
      loadout: slots || [],
      slots_used: (slots || []).length,
      slots_max: MAX_CARDS_PER_ZONE,
    });

  } catch (err) {
    console.error('Loadout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones — List all active zones
// ═══════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { data: zones, error } = await supabase
      .from('zones')
      .select('*')
      .eq('is_active', true)
      .order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(zones || []);
  } catch (err) {
    console.error('Error fetching zones:', err);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// ═══════════════════════════════════════════
// BACKWARD COMPAT: keep old /play-card and /remove-card
// working but redirect to new equip system
// ═══════════════════════════════════════════
router.post('/play-card', async (req, res) => {
  // Map old single-card system to slot 1
  req.body.slot_number = req.body.slot_number || 1;
  // Forward to equip-card handler
  const handler = router.stack.find(r => r.route && r.route.path === '/equip-card');
  if (handler) {
    return handler.route.stack[0].handle(req, res);
  }
  res.status(500).json({ error: 'Equip handler not found' });
});

router.post('/remove-card', async (req, res) => {
  // Map old remove to unequip slot 1
  req.body.slot_number = req.body.slot_number || 1;
  const handler = router.stack.find(r => r.route && r.route.path === '/unequip-card');
  if (handler) {
    return handler.route.stack[0].handle(req, res);
  }
  res.status(500).json({ error: 'Unequip handler not found' });
});

module.exports = router;