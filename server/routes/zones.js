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

// ── Combat engine wiring ──────────────────────────────────────────────
let combatEngine = null;
try {
  combatEngine = require('../services/combatEngine');
} catch (e) {
  console.warn('⚠️ Combat engine not available in zones.js');
}

// V5: Max cards per zone deployment
const MAX_CARDS_PER_ZONE = 3;

// V5 Zone points (from Game Design V5, Section 21)
const ZONE_POINTS = {
  DEPLOY: 5,       // +5 for deploying to a zone
  FLIP_ZONE: 15,   // +15 for flipping a zone to your guild
};

// ═══════════════════════════════════════════
// POST /api/zones/deploy
// Deploy your Nine to a zone (V5: FREE — no mana cost)
// Body: { player_id, zone_id }
// ═══════════════════════════════════════════
router.post('/deploy', async (req, res) => {
  try {
    // Parse as integers — JSON body can send strings, Supabase .eq() is type-strict
    const player_id = parseInt(req.body.player_id);
    const zone_id = parseInt(req.body.zone_id);

    if (!player_id || !zone_id) {
      return res.status(400).json({ error: 'player_id and zone_id required' });
    }

    // Get player's Nine
    const nine = await getNine(player_id);
    if (!nine) {
      return res.status(404).json({ error: 'No Nine found — complete registration first' });
    }

    // Check if already deployed on this zone
    const { data: existingDeploy } = await supabaseAdmin
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
    const { data: currentDeploys } = await supabaseAdmin
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

    // V5: Deploy is FREE — no mana cost

    // Get player's guild tag
    const { data: player } = await supabase
      .from('players')
      .select('guild_tag, twitter_handle')
      .eq('id', player_id)
      .single();

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
        current_hp: nine.base_hp,
        max_hp: nine.base_hp,
        is_active: true,
        is_mercenary: !(player?.guild_tag),
      })
      .select()
      .single();

    if (deployErr) {
      console.error('Deploy error:', deployErr);
      return res.status(500).json({ error: 'Failed to deploy' });
    }

    // Award deploy points (+5)
    await addPoints(player_id, ZONE_POINTS.DEPLOY, 'zone_deploy', `Deployed to zone ${zone_id}`);

    // ── Equip cards if provided with deploy request ───────────────────
    // Frontend passes card_ids: [slot1_id, slot2_id, slot3_id]
    const cardIds = req.body.card_ids || [];
    if (cardIds.length > 0) {
      try {
        const validSlots = [];
        for (let i = 0; i < Math.min(cardIds.length, 3); i++) {
          const cardId = parseInt(cardIds[i]);
          if (!cardId) continue;

          // Verify card belongs to this player
          const { data: card } = await supabaseAdmin
            .from('player_cards')
            .select('id')
            .eq('id', cardId)
            .eq('player_id', player_id)
            .single();
          if (!card) continue;

          // Verify card isn't already on another active zone
          const { data: existing } = await supabaseAdmin
            .from('zone_card_slots')
            .select('id, deployment_id')
            .eq('card_id', cardId)
            .eq('is_active', true);

          const onOtherZone = (existing || []).some(s => s.deployment_id !== deployment.id);
          if (onOtherZone) continue;

          validSlots.push({ deployment_id: deployment.id, card_id: cardId, slot_number: i + 1, is_active: true });
        }

        if (validSlots.length > 0) {
          await supabaseAdmin.from('zone_card_slots').insert(validSlots);
          console.log(`⚔️ ${validSlots.length} cards equipped on deploy for player ${player_id}`);
        }
      } catch (e) {
        console.error('⚠️ Card equip on deploy failed (non-critical):', e.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // ── Wire into combat engine ───────────────────────────────────────
    if (combatEngine?.loadDeploymentIntoEngine) {
      try {
        await combatEngine.loadDeploymentIntoEngine({
          ...deployment,
          nine: {
            house_key: nine.house_id,
            name: nine.name || player?.twitter_handle || 'Unknown',
          },
        });
        console.log(`⚔️ ${nine.name} wired into combat engine on zone ${zone_id}`);
      } catch (e) {
        console.error('❌ Combat engine load (non-critical):', e.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // Notify arena socket viewers
    try {
      if (global.__arenaSocket) {
        global.__arenaSocket._broadcastToZone(zone_id, 'arena:nine_joined', {
          nine_id: player_id,
          player_name: nine.name || player?.twitter_handle || 'Unknown',
          house: nine.house_key || 'smoulders',
          guild: player?.guild_tag || 'Lone Wolf',
          guild_id: player?.guild_tag,
          stats: { atk: nine.base_atk, hp: nine.base_hp, spd: nine.base_spd, def: nine.base_def || 0, luck: nine.base_luck || 0 },
          equipped_images: nine.equipped_images || {},
        });
      }
    } catch (e) { /* socket broadcast is non-critical */ }

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
    const { data: deployment } = await supabaseAdmin
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

    // ── Remove from combat engine ─────────────────────────────────────
    if (combatEngine?.removeDeploymentFromEngine) {
      try {
        combatEngine.removeDeploymentFromEngine(deployment.id, zone_id);
        console.log(`⚔️ Removed deployment ${deployment.id} from combat engine`);
      } catch (e) {
        console.error('❌ Combat engine remove (non-critical):', e.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // Notify arena socket viewers
    try {
      if (global.__arenaSocket) {
        global.__arenaSocket._broadcastToZone(zone_id, 'arena:nine_left', { nine_id: player_id });
      }
    } catch (e) { /* non-critical */ }

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
    // Parse all IDs as integers — JSON body can send strings, Supabase .eq() is type-strict
    const player_id = parseInt(req.body.player_id);
    const zone_id = parseInt(req.body.zone_id);
    const card_id = parseInt(req.body.card_id);
    const slot_number = req.body.slot_number;

    if (!player_id || !zone_id || !card_id) {
      return res.status(400).json({ error: 'player_id, zone_id, and card_id required' });
    }

    const slot = parseInt(slot_number) || 1;
    if (slot < 1 || slot > MAX_CARDS_PER_ZONE) {
      return res.status(400).json({ error: `slot_number must be 1-${MAX_CARDS_PER_ZONE}` });
    }

    // Find active deployment on this zone — admin client bypasses RLS
    const { data: deployment, error: depErr } = await supabaseAdmin
      .from('zone_deployments')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .single();

    if (depErr || !deployment) {
      console.error('[equip-card] deployment lookup failed:', depErr, { player_id, zone_id });
      return res.status(400).json({ error: 'Not deployed on this zone — deploy first' });
    }

    // Get the card from player's collection — admin client bypasses RLS
    const { data: card, error: cardErr } = await supabaseAdmin
      .from('player_cards')
      .select('id, spell_id, sharpness, player_id')
      .eq('id', card_id)
      .eq('player_id', player_id)
      .single();

    if (cardErr || !card) {
      console.error('[equip-card] card not found:', cardErr, { card_id, player_id });
      return res.status(404).json({ error: 'Card not found in your collection' });
    }

    // Check card isn't already in an active slot on a DIFFERENT zone
    const { data: existingSlots } = await supabaseAdmin
      .from('zone_card_slots')
      .select('id, deployment_id')
      .eq('card_id', card_id)
      .eq('is_active', true);

    if (existingSlots && existingSlots.length > 0) {
      const slotDeploymentIds = existingSlots.map(s => s.deployment_id).filter(Boolean);
      if (slotDeploymentIds.length > 0) {
        const { data: otherDeps } = await supabaseAdmin
          .from('zone_deployments')
          .select('id, zone_id')
          .in('id', slotDeploymentIds)
          .eq('is_active', true)
          .neq('zone_id', zone_id);
        if (otherDeps && otherDeps.length > 0) {
          return res.status(400).json({ error: 'Card is already equipped on another zone. Unequip it first.' });
        }
      }
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

    // ── Reload deployment in combat engine so new card is picked up ──
    if (combatEngine?.loadDeploymentIntoEngine) {
      try {
        const { data: dep } = await supabaseAdmin
          .from('zone_deployments')
          .select('id, player_id, nine_id, zone_id, guild_tag, current_hp, nine:nine_id(house_id, name)')
          .eq('id', deployment.id)
          .single();
        if (dep) {
          await combatEngine.loadDeploymentIntoEngine({
            ...dep,
            nine: { house_key: dep.nine?.house_id, name: dep.nine?.name || 'Unknown' },
          });
        }
      } catch (e) { /* non-critical */ }
    }

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

    const { data: deployment } = await supabaseAdmin
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

    const { data: deployments, error } = await supabaseAdmin
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

    const cleaned = (deployments || []).map(d => ({
      ...d,
      card_slots: (d.card_slots || []).filter(s => s.is_active),
    }));

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

    const { data: deployments, error } = await supabaseAdmin
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

    const { data: deployment, error: depErr } = await supabaseAdmin
      .from('zone_deployments')
      .select('id')
      .eq('player_id', playerId)
      .eq('zone_id', zoneId)
      .eq('is_active', true)
      .single();

    if (depErr || !deployment) {
      return res.json({ loadout: [], slots_used: 0, slots_max: MAX_CARDS_PER_ZONE });
    }

    const { data: slots, error: slotErr } = await supabaseAdmin
      .from('zone_card_slots')
      .select('id, card_id, slot_number')
      .eq('deployment_id', deployment.id)
      .eq('is_active', true)
      .order('slot_number');

    if (slotErr || !slots || slots.length === 0) {
      return res.json({ loadout: [], slots_used: 0, slots_max: MAX_CARDS_PER_ZONE });
    }

    const cardIds = slots.map(s => s.card_id).filter(Boolean);
    const { data: playerCards, error: cardErr } = await supabaseAdmin
      .from('player_cards')
      .select('id, spell_id, sharpness, player_id')
      .in('id', cardIds);

    if (cardErr) {
      console.error('[my-loadout] player_cards fetch error:', cardErr, { cardIds });
      return res.json({ loadout: [], slots_used: 0, slots_max: MAX_CARDS_PER_ZONE });
    }

    const spellIds = (playerCards || []).map(c => c.spell_id).filter(Boolean);
    let spells = [];
    if (spellIds.length > 0) {
      const { data: spellData } = await supabaseAdmin
        .from('spells')
        .select('id, name, spell_type, card_type, house, rarity, base_atk, base_hp, base_spd, base_def, base_luck, effect_1, bonus_effects, image_url, base_effect, flavor_text')
        .in('id', spellIds);
      spells = spellData || [];
    }

    const cardMap = {};
    (playerCards || []).forEach(c => { cardMap[c.id] = c; });
    const spellMap = {};
    spells.forEach(s => { spellMap[s.id] = s; });

    const loadout = slots.map(slot => {
      const card = cardMap[slot.card_id] || {};
      const spell = spellMap[card.spell_id] || {};
      return {
        id: slot.id,
        card_id: slot.card_id,
        slot_number: slot.slot_number,
        player_card_id: card.id,
        sharpness: card.sharpness ?? 100,
        name: spell.name || null,
        spell_type: spell.spell_type || 'attack',
        card_type: spell.card_type || 'attack',
        house: spell.house || 'universal',
        rarity: spell.rarity || 'common',
        base_atk: spell.base_atk ?? 0,
        base_hp: spell.base_hp ?? 0,
        base_spd: spell.base_spd ?? 0,
        base_def: spell.base_def ?? 0,
        base_luck: spell.base_luck ?? 0,
        effect_1: spell.effect_1 || spell.base_effect || '',
        bonus_effects: spell.bonus_effects || [],
        flavor_text: spell.flavor_text || '',
        image_url: spell.image_url || '',
      };
    }).filter(slot => slot.name);

    res.json({
      loadout,
      slots_used: loadout.length,
      slots_max: MAX_CARDS_PER_ZONE,
    });

  } catch (err) {
    console.error('Loadout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones/counts
// Active deployment counts + leading guild per zone
// ═══════════════════════════════════════════
router.get('/counts', async (req, res) => {
  try {
    const { data: deployments, error } = await supabaseAdmin
      .from('zone_deployments')
      .select('zone_id, guild_tag, current_hp')
      .eq('is_active', true);

    if (error) return res.status(500).json({ error: error.message });

    const counts = {};
    (deployments || []).forEach(d => {
      const zid = d.zone_id;
      if (!counts[zid]) counts[zid] = { count: 0, guilds: {} };
      counts[zid].count++;
      const tag = d.guild_tag || 'unaffiliated';
      if (!counts[zid].guilds[tag]) counts[zid].guilds[tag] = { hp: 0, fighters: 0 };
      counts[zid].guilds[tag].hp += d.current_hp || 0;
      counts[zid].guilds[tag].fighters++;
    });

    const result = {};
    for (const [zid, data] of Object.entries(counts)) {
      const sorted = Object.entries(data.guilds).sort((a, b) => b[1].hp - a[1].hp);
      result[zid] = {
        count: data.count,
        top_guild: sorted[0]?.[0] || null,
        guilds: data.guilds,
      };
    }

    res.json(result);
  } catch (err) {
    console.error('Zone counts error:', err);
    res.status(500).json({ error: 'Failed to fetch zone counts' });
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
// GET /api/zones/:zoneId/combat-stats
// Live fighter stats for zone detail panel
// ═══════════════════════════════════════════
router.get('/:zoneId/combat-stats', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);

    const { data: deployments, error } = await supabaseAdmin
      .from('zone_deployments')
      .select(`
        id, guild_tag, current_hp, max_hp, player_id,
        nine:nine_id(name, house_id)
      `)
      .eq('zone_id', zoneId)
      .eq('is_active', true);

    if (error) return res.status(500).json({ error: error.message });

    const fighters = (deployments || []).map(d => ({
      id:     d.player_id,
      name:   d.nine?.name || 'Unknown',
      house:  d.nine?.house_id || 'unknown',
      guild:  d.guild_tag || null,
      hp:     d.current_hp || 0,
      maxHp:  d.max_hp || 0,
      damage: 0,  // tracked client-side via combat meters
      heals:  0,
      kos:    0,
    }));

    // Guild aggregates
    const guilds = {};
    fighters.forEach(f => {
      if (!f.guild) return;
      if (!guilds[f.guild]) guilds[f.guild] = { count: 0, totalHp: 0, maxHp: 0 };
      guilds[f.guild].count++;
      guilds[f.guild].totalHp += f.hp;
      guilds[f.guild].maxHp   += f.maxHp;
    });

    res.json({ fighters, guilds, total: fighters.length });
  } catch (err) {
    console.error('Combat stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// POST /api/zones/:zoneId/force-reload
// Tell the combat engine to reload card loadouts
// for all active deployments on this zone
// ═══════════════════════════════════════════
router.post('/:zoneId/force-reload', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);

    if (combatEngine?.loadDeploymentIntoEngine) {
      // Reload all active deployments on this zone
      const { data: deployments } = await supabaseAdmin
        .from('zone_deployments')
        .select('id, player_id, nine_id, zone_id, guild_tag, current_hp, nine:nine_id(house_id, name)')
        .eq('zone_id', zoneId)
        .eq('is_active', true);

      for (const dep of (deployments || [])) {
        try {
          await combatEngine.loadDeploymentIntoEngine({
            ...dep,
            nine: { house_key: dep.nine?.house_id, name: dep.nine?.name || 'Unknown' },
          });
        } catch (e) { /* non-critical per deployment */ }
      }
    }

    res.json({ success: true, message: `Zone ${zoneId} reloaded` });
  } catch (err) {
    console.error('Force reload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones/:zoneId — Single zone by ID
// ═══════════════════════════════════════════
router.get('/:zoneId', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);
    const { data: zone, error } = await supabase
      .from('zones')
      .select('*')
      .eq('id', zoneId)
      .single();
    if (error) return res.status(404).json({ error: 'Zone not found' });
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// ═══════════════════════════════════════════
router.post('/play-card', async (req, res) => {
  req.body.slot_number = req.body.slot_number || 1;
  const handler = router.stack.find(r => r.route && r.route.path === '/equip-card');
  if (handler) return handler.route.stack[0].handle(req, res);
  res.status(500).json({ error: 'Equip handler not found' });
});

router.post('/remove-card', async (req, res) => {
  req.body.slot_number = req.body.slot_number || 1;
  const handler = router.stack.find(r => r.route && r.route.path === '/unequip-card');
  if (handler) return handler.route.stack[0].handle(req, res);
  res.status(500).json({ error: 'Unequip handler not found' });
});

module.exports = router;