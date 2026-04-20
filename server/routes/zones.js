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
const flags = (() => {
  try { return require('../config/flags'); } catch (e) { return {}; }
})();

// Lazy-load combatEngine to avoid circular deps — only used for removeDeploymentFromEngine
function getCombatEngine() {
  try {
    return require('../services/combatEngine');
  } catch (e) {
    return null;
  }
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// V5: Max cards per zone deployment
const MAX_CARDS_PER_ZONE = 3;

// V5 Zone points (from Game Design V5, Section 21)
const ZONE_POINTS = {
  DEPLOY: 5, // +5 for deploying to a zone
  FLIP_ZONE: 15, // +15 for flipping a zone to your guild
};

// ═══════════════════════════════════════════
// POST /api/zones/deploy
// Deploy your Nine to a zone (V5: FREE — no mana cost)
// Body: { player_id, zone_id }
// ═══════════════════════════════════════════
router.post('/deploy', async (req, res) => {
  try {
    const { player_id, zone_id, card_ids } = req.body;

    if (!player_id || !zone_id) {
      return res.status(400).json({ error: 'player_id and zone_id required' });
    }

    // §9.46 deploy lockout (feature-flagged, default OFF). When the zone is
    // in an active round, reject with 423 so the client can show a countdown
    // to the next intermission. No behavior change with flag false.
    if (flags.FEATURE_DEPLOY_LOCKOUT) {
      const engine = getCombatEngine();
      const zs = engine?.getZoneState ? engine.getZoneState(zone_id) : null;
      if (zs && zs.roundState === 'FIGHTING') {
        const msLeft = Math.max(0, (zs.roundEndsAt || 0) - Date.now());
        return res.status(423).json({
          error: 'deploy_locked',
          message: 'Deployment is only allowed during intermission',
          nextWindowInSeconds: Math.ceil(msLeft / 1000),
        });
      }
    }

    // Get player's Nine
    const nine = await getNine(player_id);
    if (!nine) {
      return res
        .status(404)
        .json({ error: 'No Nine found — complete registration first' });
    }

    // Check if already deployed on this zone — if so, treat as loadout swap:
    // silently withdraw first so the player can redeploy with new cards
    const { data: existingDeploy } = await supabase
      .from('zone_deployments')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .single();

    if (existingDeploy) {
      // Deactivate old card slots
      await supabaseAdmin
        .from('zone_card_slots')
        .update({ is_active: false })
        .eq('deployment_id', existingDeploy.id)
        .eq('is_active', true);
      // Deactivate old deployment
      await supabaseAdmin
        .from('zone_deployments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', existingDeploy.id);
      // Remove from engine
      try {
        const engine = getCombatEngine();
        if (engine?.removeDeploymentFromEngine)
          engine.removeDeploymentFromEngine(existingDeploy.id, zone_id);
      } catch (e) {
        /* non-critical */
      }
    }

    // V5: Check zone deployment limit (2 zones at start, 3 at level 10)
    // Re-query AFTER any swap withdrawal above, so count is accurate
    const { data: currentDeploys } = await supabase
      .from('zone_deployments')
      .select('id, zone_id')
      .eq('player_id', player_id)
      .eq('is_active', true);

    const playerLevel = nine.level || 1;
    const maxZones = playerLevel >= 10 ? 3 : 2;
    // Count only OTHER zones (we already withdrew from this one if it existed)
    const otherZoneDeploys = (currentDeploys || []).filter(
      (d) => String(d.zone_id) !== String(zone_id),
    );
    if (otherZoneDeploys.length >= maxZones) {
      return res.status(400).json({
        error: `Already deployed to ${maxZones} zones (max for level ${playerLevel}). Withdraw from one first.`,
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
        guild_tag:
          player?.guild_tag || '@' + (player?.twitter_handle || 'lone_wolf'),
        current_hp: nine.base_hp,
        max_hp: nine.base_hp,
        is_active: true,
        is_mercenary: !player?.guild_tag,
      })
      .select()
      .single();

    if (deployErr) {
      console.error('Deploy error:', deployErr);
      return res.status(500).json({ error: 'Failed to deploy' });
    }

    // ── Save card slots atomically (no separate equip-card call needed) ──
    const cardIdsArray = Array.isArray(card_ids)
      ? card_ids.map(Number).filter((n) => !isNaN(n) && n > 0)
      : [];

    if (cardIdsArray.length > 0) {
      // Validate cards belong to this player
      const { data: validCards } = await supabaseAdmin
        .from('player_cards')
        .select('id')
        .eq('player_id', player_id)
        .in('id', cardIdsArray);

      const validIds = new Set((validCards || []).map((c) => c.id));
      const slotsToInsert = cardIdsArray
        .filter((id) => validIds.has(id))
        .slice(0, MAX_CARDS_PER_ZONE)
        .map((card_id, i) => ({
          deployment_id: deployment.id,
          card_id,
          slot_number: i + 1,
          is_active: true,
        }));

      if (slotsToInsert.length > 0) {
        const { error: slotErr } = await supabaseAdmin
          .from('zone_card_slots')
          .insert(slotsToInsert);
        if (slotErr) console.error('Card slot insert error:', slotErr.message);
        else
          console.log(
            `✅ ${slotsToInsert.length} cards saved for deployment ${deployment.id}`,
          );
      }
    }

    // ── Load into combat engine immediately ──
    try {
      const combatEngine = require('../services/combatEngine');
      if (combatEngine?.loadDeploymentIntoEngine) {
        await combatEngine.loadDeploymentIntoEngine({
          ...deployment,
          nine: {
            house_id: nine.house_key || nine.house_id || 'stormrage',
            name: nine.name || 'Unknown',
          },
        });
      }
    } catch (e) {
      console.error('Combat engine load error:', e.message);
    }

    // Award deploy points (+5)
    await addPoints(
      player_id,
      ZONE_POINTS.DEPLOY,
      'zone_deploy',
      `Deployed to zone ${zone_id}`,
    );

    // Notify arena socket viewers
    try {
      if (global.__arenaSocket) {
        global.__arenaSocket._broadcastToZone(zone_id, 'arena:nine_joined', {
          nine_id: player_id,
          player_name: nine.name || player?.twitter_handle || 'Unknown',
          house: nine.house_key || 'smoulders',
          guild: player?.guild_tag || 'Lone Wolf',
          guild_id: player?.guild_tag,
          stats: {
            atk: nine.base_atk,
            hp: nine.base_hp,
            spd: nine.base_spd,
            def: nine.base_def || 0,
            luck: nine.base_luck || 0,
          },
          equipped_images: nine.equipped_images || {},
        });
      }
    } catch (e) {
      /* socket broadcast is non-critical */
    }

    res.json({
      success: true,
      deployment,
      points_earned: ZONE_POINTS.DEPLOY,
      message: player?.guild_tag
        ? `Deployed to zone ${zone_id}! Fighting for ${player.guild_tag} (+${ZONE_POINTS.DEPLOY} pts)`
        : `Lone Wolf deployed! 1.5× ATK bonus active. (+${ZONE_POINTS.DEPLOY} pts)`,
      is_lone_wolf: !player?.guild_tag,
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
      return res
        .status(404)
        .json({ error: 'No active deployment on this zone' });
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

    // Remove from combat engine immediately — stops ghost sprite re-appearing every 2s
    try {
      const engine = getCombatEngine();
      if (engine?.removeDeploymentFromEngine) {
        engine.removeDeploymentFromEngine(deployment.id, zone_id);
      }
    } catch (e) {
      /* non-critical */
    }

    // Notify arena socket viewers
    try {
      if (global.__arenaSocket) {
        global.__arenaSocket._broadcastToZone(zone_id, 'arena:nine_left', {
          nine_id: player_id,
        });
      }
    } catch (e) {
      /* non-critical */
    }

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
// POST /api/zones/update-loadout
// Replace all 3 card slots at once for an existing deployment
// Body: { player_id, zone_id, card_ids: [id1, id2, id3] }
// Uses supabaseAdmin — no RLS issues
// ═══════════════════════════════════════════
router.post('/update-loadout', async (req, res) => {
  try {
    const { player_id, zone_id, card_ids } = req.body;
    if (
      !player_id ||
      !zone_id ||
      !Array.isArray(card_ids) ||
      card_ids.length === 0
    ) {
      return res
        .status(400)
        .json({ error: 'player_id, zone_id, and card_ids required' });
    }

    const { data: deployment } = await supabaseAdmin
      .from('zone_deployments')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .single();

    if (!deployment) {
      return res.status(400).json({ error: 'Not deployed on this zone' });
    }

    // Validate cards belong to this player
    const cardIdsArray = card_ids.map(Number).filter((n) => !isNaN(n) && n > 0);
    const { data: validCards } = await supabaseAdmin
      .from('player_cards')
      .select('id')
      .eq('player_id', player_id)
      .in('id', cardIdsArray);

    const validIds = new Set((validCards || []).map((c) => c.id));
    const toInsert = cardIdsArray
      .filter((id) => validIds.has(id))
      .slice(0, MAX_CARDS_PER_ZONE)
      .map((card_id, i) => ({
        deployment_id: deployment.id,
        card_id,
        slot_number: i + 1,
        is_active: true,
      }));

    if (toInsert.length === 0) {
      return res
        .status(400)
        .json({ error: 'No valid cards found in your collection' });
    }

    // DELETE existing slots (not just mark inactive) — avoids unique constraint on re-insert
    await supabaseAdmin
      .from('zone_card_slots')
      .delete()
      .eq('deployment_id', deployment.id);

    const { error: insertErr } = await supabaseAdmin
      .from('zone_card_slots')
      .insert(toInsert);

    if (insertErr) {
      console.error('update-loadout insert error:', insertErr.message);
      return res.status(500).json({ error: 'Failed to save loadout' });
    }

    // Reload in combat engine immediately
    try {
      const combatEngine = require('../services/combatEngine');
      if (combatEngine?.loadDeploymentIntoEngine) {
        const { data: fullDep } = await supabaseAdmin
          .from('zone_deployments')
          .select(
            'id, player_id, nine_id, zone_id, guild_tag, current_hp, nine:nine_id(house_id, name)',
          )
          .eq('id', deployment.id)
          .single();
        if (fullDep)
          await combatEngine.loadDeploymentIntoEngine({
            ...fullDep,
            nine: {
              house_id: fullDep.nine?.house_id,
              name: fullDep.nine?.name || 'Unknown',
            },
          });
      }
    } catch (e) {
      console.error('Engine reload error:', e.message);
    }

    console.log(
      `✅ Loadout updated: player ${player_id} zone ${zone_id} [${toInsert.length} cards]`,
    );
    res.json({ success: true, slots: toInsert.length });
  } catch (err) {
    console.error('update-loadout error:', err);
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
      return res
        .status(400)
        .json({ error: 'player_id, zone_id, and card_id required' });
    }

    const slot = parseInt(slot_number) || 1;
    if (slot < 1 || slot > MAX_CARDS_PER_ZONE) {
      return res
        .status(400)
        .json({ error: `slot_number must be 1-${MAX_CARDS_PER_ZONE}` });
    }

    // Find active deployment — use admin client to bypass RLS
    const { data: deployment } = await supabaseAdmin
      .from('zone_deployments')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .single();

    if (!deployment) {
      return res
        .status(400)
        .json({ error: 'Not deployed on this zone — deploy first' });
    }

    // Get the card from player's collection — use admin client
    const { data: card } = await supabaseAdmin
      .from('player_cards')
      .select(
        '*, spell:spell_id(name, spell_type, rarity, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects)',
      )
      .eq('id', card_id)
      .eq('player_id', player_id)
      .single();

    if (!card) {
      return res
        .status(404)
        .json({ error: 'Card not found in your collection' });
    }

    // Check card isn't already equipped on ANOTHER zone — use admin client
    const { data: existingSlots } = await supabaseAdmin
      .from('zone_card_slots')
      .select('id, deployment:deployment_id(zone_id)')
      .eq('card_id', card_id)
      .eq('is_active', true);

    const otherZoneSlot = (existingSlots || []).find(
      (s) => s.deployment && s.deployment.zone_id !== zone_id,
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
      return res
        .status(400)
        .json({ error: 'player_id, zone_id, and slot_number required' });
    }

    const { data: deployment } = await supabase
      .from('zone_deployments')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .single();

    if (!deployment) {
      return res
        .status(404)
        .json({ error: 'No active deployment on this zone' });
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
router.get('/leaderboard/season', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const player_id = req.query.player_id || null;

    // Top N players
    const { data: rows, error } = await supabaseAdmin
      .from('players')
      .select('id, handle, username, season_points')
      .order('season_points', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Own rank (if player_id provided)
    let my_rank = null,
      my_points = null;
    if (player_id) {
      const { data: mine } = await supabaseAdmin
        .from('players')
        .select('season_points')
        .eq('id', player_id)
        .single();
      if (mine) {
        my_points = mine.season_points || 0;
        // Count players with more points
        const { count } = await supabaseAdmin
          .from('players')
          .select('id', { count: 'exact', head: true })
          .gt('season_points', my_points);
        my_rank = (count || 0) + 1;
      }
    }

    res.json({ rows: rows || [], my_rank, my_points });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:zoneId/deployments', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);

    const { data: deployments, error } = await supabase
      .from('zone_deployments')
      .select(
        `
        *,
        player:player_id(twitter_handle, profile_image, school_id),
        nine:nine_id(name, base_atk, base_hp, base_spd, base_def, base_luck, house_id, equipped_images),
        card_slots:zone_card_slots(id, card_id, slot_number, is_active)
      `,
      )
      .eq('zone_id', zoneId)
      .eq('is_active', true);

    if (error) {
      console.error('Deployments fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch deployments' });
    }

    // Filter card_slots to only active ones
    const cleaned = (deployments || []).map((d) => ({
      ...d,
      card_slots: (d.card_slots || []).filter((s) => s.is_active),
    }));

    // Calculate guild power totals
    const guildPower = {};
    cleaned.forEach((d) => {
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
      .select(
        `
        *,
        zone:zone_id(name, description),
        card_slots:zone_card_slots(id, card_id, slot_number, is_active)
      `,
      )
      .eq('player_id', playerId)
      .eq('is_active', true);

    if (error) {
      console.error('My deployments error:', error);
      return res.status(500).json({ error: 'Failed to fetch' });
    }

    // Filter to active card slots only
    const cleaned = (deployments || []).map((d) => ({
      ...d,
      card_slots: (d.card_slots || []).filter((s) => s.is_active),
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
    const { data: deployment } = await supabaseAdmin
      .from('zone_deployments')
      .select('id')
      .eq('player_id', playerId)
      .eq('zone_id', zoneId)
      .eq('is_active', true)
      .single();

    if (!deployment) {
      return res.json({
        loadout: [],
        slots_used: 0,
        slots_max: MAX_CARDS_PER_ZONE,
      });
    }

    // Get active card slots with card details
    const { data: slots } = await supabaseAdmin
      .from('zone_card_slots')
      .select(
        `
        id, card_id, slot_number,
        card:card_id(
          id, player_id, sharpness,
          spell:spell_id(name, spell_type, house, base_atk, base_hp, base_spd, base_def, base_luck, effect_1, bonus_effects, image_url, flavor_text)
        )
      `,
      )
      .eq('deployment_id', deployment.id)
      .eq('is_active', true)
      .order('slot_number');

    // Flatten nested spell data so frontend can read it directly
    const loadout = (slots || []).map((slot) => {
      const spell = slot.card?.spell || {};
      return {
        card_id: slot.card_id,
        slot_number: slot.slot_number,
        player_card_id: slot.card?.id,
        sharpness: slot.card?.sharpness ?? 100,
        name: spell.name || '???',
        spell_type: spell.spell_type || 'attack',
        house: spell.house || 'universal',
        base_atk: spell.base_atk ?? 0,
        base_hp: spell.base_hp ?? 0,
        base_spd: spell.base_spd ?? 0,
        base_def: spell.base_def ?? 0,
        base_luck: spell.base_luck ?? 0,
        effect_1: spell.effect_1 || '',
        base_effect: spell.effect_1 || '',
        bonus_effects: spell.bonus_effects || [],
        image_url: spell.image_url || '',
        flavor_text: spell.flavor_text || '',
      };
    });

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

    // Merge in live zone_control data (controlling_guild only; zones is
    // authoritative for dominant_house per Task 4.5 Q4).
    const { data: control } = await supabaseAdmin
      .from('zone_control')
      .select('zone_id, controlling_guild');

    const controlMap = {};
    (control || []).forEach((c) => {
      controlMap[c.zone_id] = c;
    });

    // Get active deployment counts per zone
    const { data: deployments } = await supabaseAdmin
      .from('zone_deployments')
      .select('zone_id')
      .eq('is_active', true);

    const deployCountMap = {};
    (deployments || []).forEach((d) => {
      deployCountMap[d.zone_id] = (deployCountMap[d.zone_id] || 0) + 1;
    });

    const merged = (zones || []).map((z) => ({
      ...z,
      controlling_guild:
        controlMap[z.id]?.controlling_guild || z.controlling_guild || null,
      dominant_house: z.dominant_house || null,
      house_bonus_label:
        z.house_bonus_label ||
        (z.dominant_house
          ? HOUSE_BONUSES[z.dominant_house]?.label || null
          : null),
      deployment_count: deployCountMap[z.id] || 0, // live fighter count
    }));

    res.json(merged);
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
  req.body.slot_number = req.body.slot_number || 1;
  const handler = router.stack.find(
    (r) => r.route && r.route.path === '/equip-card',
  );
  if (handler) return handler.route.stack[0].handle(req, res);
  res.status(500).json({ error: 'Equip handler not found' });
});

router.post('/remove-card', async (req, res) => {
  req.body.slot_number = req.body.slot_number || 1;
  const handler = router.stack.find(
    (r) => r.route && r.route.path === '/unequip-card',
  );
  if (handler) return handler.route.stack[0].handle(req, res);
  res.status(500).json({ error: 'Unequip handler not found' });
});

// ═══════════════════════════════════════════
// GET /api/zones/counts
// Fighter counts per zone for zone list badges
// ═══════════════════════════════════════════
router.get('/counts', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('zone_deployments')
      .select('zone_id')
      .eq('is_active', true);
    if (error) return res.status(500).json({ error: error.message });
    const counts = {};
    (data || []).forEach((d) => {
      counts[d.zone_id] = (counts[d.zone_id] || 0) + 1;
    });
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones/:zoneId/combat-stats
// ═══════════════════════════════════════════
router.get('/:zoneId/combat-stats', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);
    const { data: deployments } = await supabaseAdmin
      .from('zone_deployments')
      .select(
        'id, guild_tag, current_hp, max_hp, player_id, nine:nine_id(name, house_id)',
      )
      .eq('zone_id', zoneId)
      .eq('is_active', true);

    const fighters = (deployments || []).map((d) => ({
      id: d.player_id,
      name: d.nine?.name || 'Unknown',
      house: d.nine?.house_id || 'unknown',
      guild: d.guild_tag || null,
      hp: d.current_hp || 0,
      maxHp: d.max_hp || 0,
    }));
    res.json({ fighters, total: fighters.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// POST /api/zones/:zoneId/force-reload
// ═══════════════════════════════════════════
router.post('/:zoneId/force-reload', async (req, res) => {
  try {
    let combatEngine = null;
    try {
      combatEngine = require('../services/combatEngine');
    } catch (e) {}
    const zoneId = parseInt(req.params.zoneId);
    if (combatEngine?.loadDeploymentIntoEngine) {
      const { data: deployments } = await supabaseAdmin
        .from('zone_deployments')
        .select(
          'id, player_id, nine_id, zone_id, guild_tag, current_hp, nine:nine_id(house_id, name)',
        )
        .eq('zone_id', zoneId)
        .eq('is_active', true);
      for (const dep of deployments || []) {
        try {
          await combatEngine.loadDeploymentIntoEngine({
            ...dep,
            nine: {
              house_key: dep.nine?.house_id,
              name: dep.nine?.name || 'Unknown',
            },
          });
        } catch (e) {}
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones/:zoneId — single zone
// MUST be last to avoid catching other routes
// ═══════════════════════════════════════════

router.get('/:zoneId', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);
    if (isNaN(zoneId))
      return res.status(400).json({ error: 'Invalid zone ID' });
    const { data: zone, error } = await supabaseAdmin
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

// ═══════════════════════════════════════════════════
// HOUSE PRESENCE BONUS SYSTEM
// ═══════════════════════════════════════════════════

const HOUSE_BONUSES = {
  smoulders: {
    key: 'atk',
    label: '+20% ATK',
    description: 'The ember wastes harden every blade.',
  },
  darktide: {
    key: 'regen',
    label: '+3% HP regen per minute',
    description: 'Dark tides carry life back to the wounded.',
  },
  stonebark: {
    key: 'hp',
    label: '+25% max HP',
    description: 'The bark remembers every scar. It grows.',
  },
  ashenvale: {
    key: 'spd',
    label: '+15% SPD',
    description: 'The wind here has no patience.',
  },
  stormrage: {
    key: 'crit_mult',
    label: 'Crits deal 3× instead of 2×',
    description: 'Lightning hits once. It hits everything.',
  },
  nighthollow: {
    key: 'luck',
    label: '+10 LUCK',
    description: 'Fortune favours those who walk in shadow.',
  },
  dawnbringer: {
    key: 'heal_amp',
    label: 'HEAL and BLESS +50% stronger',
    description: 'This ground was consecrated in old light.',
  },
  manastorm: {
    key: 'effect_amp',
    label: 'All card effects +30% stronger',
    description: 'Every spell lands harder here.',
  },
  plaguemire: {
    key: 'poison_aura',
    label: 'Enemies start with 1 POISON stack',
    description: 'The air itself is infected.',
  },
};

// ═══════════════════════════════════════════════════
// GET /api/zones/:zoneId/zone-bonus
// Returns today's house bonus + branded guild for a zone
// ═══════════════════════════════════════════════════
router.get('/:zoneId/zone-bonus', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: history } = await supabaseAdmin
      .from('zone_control_history')
      .select('dominant_house, branded_guild')
      .eq('zone_id', zoneId)
      .gte('snapped_at', since);

    if (!history || !history.length) {
      return res.json({
        zone_id: zoneId,
        branded_guild: null,
        dominant_house: null,
        house_bonus: null,
        message: 'No fighters yesterday — no zone identity yet.',
      });
    }

    // Dominant house = most snapshot appearances in last 24h (fighter count, not HP)
    const houseCounts = {};
    history.forEach((h) => {
      if (h.dominant_house)
        houseCounts[h.dominant_house] =
          (houseCounts[h.dominant_house] || 0) + 1;
    });
    const [dominantHouse] =
      Object.entries(houseCounts).sort((a, b) => b[1] - a[1])[0] || [];

    // Branded guild = most appearances as the top guild in snapshots
    const guildCounts = {};
    history.forEach((h) => {
      if (h.branded_guild)
        guildCounts[h.branded_guild] = (guildCounts[h.branded_guild] || 0) + 1;
    });
    const [brandedGuild] =
      Object.entries(guildCounts).sort((a, b) => b[1] - a[1])[0] || [];

    const houseBonus = dominantHouse
      ? HOUSE_BONUSES[dominantHouse] || null
      : null;

    res.json({
      zone_id: zoneId,
      branded_guild: brandedGuild || null,
      dominant_house: dominantHouse || null,
      house_bonus: houseBonus,
    });
  } catch (err) {
    console.error('Zone bonus error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════
// POST /api/zones/recalculate-identities  (called nightly by scheduler)
// Reads last 24h history, writes dominant_house + branded_guild
// back to the zones table for fast reads on zone list
// ═══════════════════════════════════════════════════
router.post('/recalculate-identities', async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: allZones } = await supabaseAdmin
      .from('zones')
      .select('id')
      .eq('is_active', true);

    const { data: history } = await supabaseAdmin
      .from('zone_control_history')
      .select('zone_id, dominant_house, branded_guild')
      .gte('snapped_at', since);

    // Tiebreak source: distinct deployment instances in the 24h window,
    // grouped by zone_id. Row-count per deployment, not per round (strict
    // per-round sum would need a JSONB house_counts column — out of slice 1).
    const { data: deps } = await supabaseAdmin
      .from('zone_deployments')
      .select('zone_id, guild_tag, player_nines!inner(houses!inner(slug))')
      .gte('deployed_at', since);

    const depCountsByZone = {};
    for (const d of deps || []) {
      const z = d.zone_id;
      if (!depCountsByZone[z]) depCountsByZone[z] = { houses: {}, guilds: {} };
      const slug = d.player_nines?.houses?.slug;
      if (slug)
        depCountsByZone[z].houses[slug] =
          (depCountsByZone[z].houses[slug] || 0) + 1;
      if (d.guild_tag)
        depCountsByZone[z].guilds[d.guild_tag] =
          (depCountsByZone[z].guilds[d.guild_tag] || 0) + 1;
    }

    const pickTopWithTiebreak = (primaryCounts, tiebreakCounts) => {
      const keys = Object.keys(primaryCounts);
      if (!keys.length) return null;
      const maxCount = Math.max(...Object.values(primaryCounts));
      const top = keys.filter((k) => primaryCounts[k] === maxCount);
      if (top.length === 1) return top[0];
      const ranked = top
        .map((k) => [k, tiebreakCounts[k] || 0])
        .sort((a, b) => b[1] - a[1]);
      // If tiebreak 1 (deployment count) resolves, use it; else random.
      if (ranked[0][1] > (ranked[1]?.[1] || 0)) return ranked[0][0];
      return top[Math.floor(Math.random() * top.length)];
    };

    let updated = 0;
    for (const zone of allZones || []) {
      const zoneHistory = (history || []).filter((h) => h.zone_id === zone.id);
      if (!zoneHistory.length) continue;

      const houseRoundWins = {};
      const guildRoundWins = {};
      for (const h of zoneHistory) {
        if (h.dominant_house)
          houseRoundWins[h.dominant_house] =
            (houseRoundWins[h.dominant_house] || 0) + 1;
        if (h.branded_guild)
          guildRoundWins[h.branded_guild] =
            (guildRoundWins[h.branded_guild] || 0) + 1;
      }

      const depTiebreak = depCountsByZone[zone.id] || {
        houses: {},
        guilds: {},
      };
      const dominantHouse = pickTopWithTiebreak(
        houseRoundWins,
        depTiebreak.houses,
      );
      const brandedGuild = pickTopWithTiebreak(
        guildRoundWins,
        depTiebreak.guilds,
      );

      const houseBonus = dominantHouse ? HOUSE_BONUSES[dominantHouse] : null;

      await supabaseAdmin
        .from('zones')
        .update({
          dominant_house: dominantHouse || null,
          branded_guild: brandedGuild || null,
          house_bonus_label: houseBonus?.label || null,
        })
        .eq('id', zone.id);

      updated++;
    }

    // Refresh combat engine's in-memory bonus cache
    try {
      const combatEngine = require('../services/combatEngine');
      if (combatEngine.refreshZoneBonusCache)
        await combatEngine.refreshZoneBonusCache();
    } catch (e) {}

    console.log(`🌅 Zone identities recalculated — ${updated} zones updated`);
    res.json({ success: true, updated });
  } catch (err) {
    console.error('Recalculate identities error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/zones/:zoneId/rejoin — player clicks rejoin after KO ────
router.post('/:zoneId/rejoin', async (req, res) => {
  try {
    const { zoneId } = req.params;
    const playerId = req.body?.player_id;
    if (!playerId) {
      res.status(400).json({ error: 'player_id required' });
      return;
    }

    // §9.35: find the most-recent deployment for this (player, zone).
    // Do NOT filter on is_active — the KO path at combatEngine.js:849-859
    // flips is_active=false synchronously, so any rejoin attempt would
    // miss its own target row. Ordering + maybeSingle() also insulates
    // against multi-row ambiguity from historical deploy→withdraw cycles.
    const { data: dep, error } = await supabaseAdmin
      .from('zone_deployments')
      .select('id, player_id, nine_id, guild_tag, max_hp')
      .eq('zone_id', zoneId)
      .eq('player_id', playerId)
      .order('deployed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !dep) {
      res.status(404).json({ error: 'No deployment found for this zone' });
      return;
    }

    // Optional: new card slots passed in body for loadout swap on rejoin
    const { cardSlots } = req.body || {};
    let newCards = null;
    if (cardSlots && Array.isArray(cardSlots) && cardSlots.length > 0) {
      // Update card slots in DB then reload cards
      // For now just reload existing cards — full swap in next pass
    }

    const engine = getCombatEngine();
    if (!engine?.rejoinRound) {
      res.status(503).json({ error: 'Combat engine unavailable' });
      return;
    }
    const rejoined = engine.rejoinRound(
      String(dep.id),
      String(zoneId),
      newCards,
    );
    if (!rejoined) {
      res.status(400).json({ error: 'Cannot rejoin — not in withdrawn state' });
      return;
    }

    // §9.35: re-activate the DB row so its lifecycle flag tracks the
    // engine state. current_hp is NOT NULL in schema — mirror the engine's
    // full-HP restore by writing max_hp from the row we just selected.
    await supabaseAdmin
      .from('zone_deployments')
      .update({
        is_active: true,
        current_hp: dep.max_hp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dep.id);

    res.json({ success: true, deploymentId: dep.id, zoneId });
  } catch (err) {
    console.error('Rejoin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/leaderboard/season — top N players by season_points ──────

module.exports = router;
