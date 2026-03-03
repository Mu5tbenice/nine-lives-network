// ═══════════════════════════════════════════════════════
// server/routes/zones.js
// V2 Zone Deployment + Combat Engine Integration
// Updated: March 2026 — Combat V2
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const { getNine, healNine } = require('../services/nineSystem');
const { addPoints } = require('../services/pointsService');
const { calculateNineStats, calculateBaseStats } = require('../services/statCalculation');

// Import combat engine for live zone management
let combatEngine = null;
try {
  combatEngine = require('../services/combatEngine');
} catch (e) {
  console.warn('⚠️ Combat engine not available for zones — running in DB-only mode');
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// V2 Config
const MAX_CARDS_PER_ZONE = 3;
const MAX_ZONE_POPULATION = 50;

const ZONE_POINTS = {
  DEPLOY: 5,
  FLIP_ZONE: 15,
};

// ═══════════════════════════════════════════
// POST /api/zones/deploy
// Deploy your Nine to a zone (FREE — no mana cost)
// Body: { player_id, zone_id }
// ═══════════════════════════════════════════
router.post('/deploy', async (req, res) => {
  try {
    const { player_id, zone_id } = req.body;

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

    // Check zone deployment limit (2 zones at start, 3 at level 10)
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

    // V2: Check zone population cap
    const { data: zoneDeployCount } = await supabase
      .from('zone_deployments')
      .select('id')
      .eq('zone_id', zone_id)
      .eq('is_active', true);

    if ((zoneDeployCount || []).length >= MAX_ZONE_POPULATION) {
      return res.status(400).json({ error: `Zone is full (${MAX_ZONE_POPULATION} max). Try another zone.` });
    }

    // V2: Check KO cooldown on this specific zone
    if (combatEngine) {
      const zone = combatEngine.zones.get(parseInt(zone_id));
      if (zone) {
        const cooldownExpiry = zone.koCooldowns.get(player_id);
        if (cooldownExpiry && Date.now() < cooldownExpiry) {
          const remaining = Math.ceil((cooldownExpiry - Date.now()) / 1000);
          return res.status(400).json({
            error: `KO cooldown: ${remaining}s remaining on this zone. You can deploy to a different zone now.`
          });
        }
      }
    }

    // Get player info
    const { data: player } = await supabase
      .from('players')
      .select('guild_tag, twitter_handle, school_id')
      .eq('id', player_id)
      .single();

    // V2: Calculate full stats (house + items — cards added after equipping)
    const baseStats = await calculateBaseStats(player_id);

    // Nine heals to full on deploy
    await healNine(nine.id);

    // Create deployment in database with V2 stats
    const { data: deployment, error: deployErr } = await supabaseAdmin
      .from('zone_deployments')
      .insert({
        player_id: player_id,
        nine_id: nine.id,
        zone_id: zone_id,
        guild_tag: player?.guild_tag || ('@' + (player?.twitter_handle || 'lone_wolf')),
        current_hp: baseStats.hp,
        max_hp: baseStats.hp,
        is_active: true,
        is_mercenary: !(player?.guild_tag),
      })
      .select()
      .single();

    if (deployErr) {
      console.error('Deploy error:', deployErr);
      return res.status(500).json({ error: 'Failed to deploy' });
    }

    // V2: Register with combat engine for real-time combat
    let combatResult = null;
    if (combatEngine && combatEngine.addNineToZone) {
      try {
        const houseSlug = baseStats.house?.slug || 'unknown';
        combatResult = await combatEngine.addNineToZone(player_id, parseInt(zone_id), {
          nineId: nine.id,
          name: nine.name || player?.twitter_handle || 'Unknown',
          guildTag: player?.guild_tag || ('@' + (player?.twitter_handle || 'lone_wolf')),
          houseSlug: houseSlug,
        });

        if (combatResult?.error) {
          // Combat engine rejected — roll back the deployment
          await supabaseAdmin
            .from('zone_deployments')
            .update({ is_active: false })
            .eq('id', deployment.id);
          return res.status(400).json({ error: combatResult.error });
        }
      } catch (e) {
        console.error('Combat engine deploy error:', e.message);
        // Non-critical — deployment still exists in DB, engine will pick it up on next load
      }
    }

    // Award deploy points (+5)
    await addPoints(player_id, ZONE_POINTS.DEPLOY, 'zone_deploy', `Deployed to zone ${zone_id}`);

    res.json({
      success: true,
      deployment,
      stats: combatResult?.stats || baseStats,
      hp: combatResult?.hp || baseStats.hp,
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

    // V2: Remove from combat engine
    if (combatEngine && combatEngine.removeNineFromZone) {
      combatEngine.removeNineFromZone(player_id, parseInt(zone_id));
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
// POST /api/zones/equip-card
// Equip a card to one of your 3 loadout slots
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
      .select('*, spell:spell_id(name, spell_type, house, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects)')
      .eq('id', card_id)
      .eq('player_id', player_id)
      .single();

    if (!card) {
      return res.status(404).json({ error: 'Card not found in your collection' });
    }

    // Check card isn't already equipped on ANOTHER zone
    const { data: existingSlots } = await supabase
      .from('zone_card_slots')
      .select('id, deployment:deployment_id(zone_id)')
      .eq('card_id', card_id)
      .eq('is_active', true);

    const otherZoneSlot = (existingSlots || []).find(s =>
      s.deployment && s.deployment.zone_id !== parseInt(zone_id)
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

    // V2: Recalculate combat stats now that a card changed
    // The combat engine will pick up new stats on next tick
    // But we can also update the in-memory Nine if engine is running
    if (combatEngine && combatEngine.zones) {
      const zone = combatEngine.zones.get(parseInt(zone_id));
      if (zone) {
        const nineCombat = zone.nines.get(player_id);
        if (nineCombat) {
          try {
            const newStats = await calculateNineStats(player_id, parseInt(zone_id));
            nineCombat.stats = {
              atk: newStats.atk,
              hp: newStats.hp,
              spd: newStats.spd,
              def: newStats.def,
              luck: newStats.luck,
            };
            // Update max HP (current HP stays where it is)
            const oldMaxHp = nineCombat.maxHp;
            nineCombat.maxHp = newStats.hp;
            // If max HP increased, give them the difference
            if (newStats.hp > oldMaxHp) {
              nineCombat.hp += (newStats.hp - oldMaxHp);
            }
            // Recalculate attack interval
            nineCombat.attackInterval = require('../services/statCalculation').calculateAttackInterval(newStats.spd);
            nineCombat.cards = newStats.cards || [];
          } catch (e) {
            console.error('Stat recalc on equip error:', e.message);
          }
        }
      }
    }

    const spellName = card.spell?.name || 'Card';

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

    // V2: Recalculate combat stats after card removal
    if (combatEngine && combatEngine.zones) {
      const zone = combatEngine.zones.get(parseInt(zone_id));
      if (zone) {
        const nineCombat = zone.nines.get(player_id);
        if (nineCombat) {
          try {
            const newStats = await calculateNineStats(player_id, parseInt(zone_id));
            nineCombat.stats = {
              atk: newStats.atk,
              hp: newStats.hp,
              spd: newStats.spd,
              def: newStats.def,
              luck: newStats.luck,
            };
            nineCombat.maxHp = newStats.hp;
            if (nineCombat.hp > nineCombat.maxHp) nineCombat.hp = nineCombat.maxHp;
            nineCombat.attackInterval = require('../services/statCalculation').calculateAttackInterval(newStats.spd);
            nineCombat.cards = newStats.cards || [];
          } catch (e) {
            console.error('Stat recalc on unequip error:', e.message);
          }
        }
      }
    }

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
// V2: includes calculated combat stats
// ═══════════════════════════════════════════
router.get('/:zoneId/deployments', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);

    const { data: deployments, error } = await supabase
      .from('zone_deployments')
      .select(`
        *,
        player:player_id(twitter_handle, profile_image, school_id),
        nine:nine_id(name, house_id, equipped_images),
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

    // V2: Get live combat stats from engine if available
    const withStats = cleaned.map(d => {
      const liveData = {};
      if (combatEngine && combatEngine.zones) {
        const zone = combatEngine.zones.get(zoneId);
        if (zone) {
          const nineCombat = zone.nines.get(d.player_id);
          if (nineCombat) {
            liveData.live_hp = nineCombat.hp;
            liveData.live_maxHp = nineCombat.maxHp;
            liveData.live_stats = nineCombat.stats;
            liveData.is_alive = nineCombat.isAlive;
            liveData.attack_interval = nineCombat.attackInterval;
            liveData.active_effects = zone.effectTracker.getEffects(d.player_id).map(e => ({
              effect: e.effect,
              value: e.value,
              expiresAt: e.expiresAt,
            }));
          }
        }
      }
      return { ...d, ...liveData };
    });

    // Calculate guild power totals using live HP
    const guildPower = {};
    withStats.forEach(d => {
      const tag = d.guild_tag || 'unaffiliated';
      if (!guildPower[tag]) guildPower[tag] = { total_hp: 0, count: 0 };
      guildPower[tag].total_hp += (d.live_hp != null ? d.live_hp : d.current_hp);
      guildPower[tag].count += 1;
    });

    // V2: Include zone control info
    let zoneControl = null;
    if (combatEngine && combatEngine.zones) {
      const zone = combatEngine.zones.get(zoneId);
      if (zone) {
        zoneControl = {
          controlled_by: zone.controllingGuild,
          snapshot_count: zone.snapshotCount,
        };
      }
    }

    res.json({
      zone_id: zoneId,
      deployments: withStats,
      guild_power: guildPower,
      total_nines: withStats.length,
      max_nines: MAX_ZONE_POPULATION,
      zone_control: zoneControl,
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
    const playerId = req.params.playerId;

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

    const cleaned = (deployments || []).map(d => {
      const result = {
        ...d,
        card_slots: (d.card_slots || []).filter(s => s.is_active),
      };

      // V2: Add live HP from combat engine
      if (combatEngine && combatEngine.zones) {
        const zone = combatEngine.zones.get(d.zone_id);
        if (zone) {
          const nineCombat = zone.nines.get(playerId);
          if (nineCombat) {
            result.live_hp = nineCombat.hp;
            result.live_maxHp = nineCombat.maxHp;
            result.is_alive = nineCombat.isAlive;
          }
        }
      }

      return result;
    });

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
    const playerId = req.params.playerId;

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

    const { data: slots } = await supabase
      .from('zone_card_slots')
      .select(`
        id, card_id, slot_number,
        card:card_id(
          id, player_id, sharpness,
          spell:spell_id(name, spell_type, house, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects, image_url)
        )
      `)
      .eq('deployment_id', deployment.id)
      .eq('is_active', true)
      .order('slot_number');

    // V2: Include calculated stats for the full loadout
    let combatStats = null;
    try {
      combatStats = await calculateNineStats(playerId, zoneId);
    } catch (e) { /* non-critical */ }

    res.json({
      loadout: slots || [],
      slots_used: (slots || []).length,
      slots_max: MAX_CARDS_PER_ZONE,
      combat_stats: combatStats ? {
        atk: combatStats.atk,
        hp: combatStats.hp,
        spd: combatStats.spd,
        def: combatStats.def,
        luck: combatStats.luck,
        attackInterval: combatStats.attackInterval,
        critChance: combatStats.critChance,
        breakdown: combatStats.breakdown,
      } : null,
    });

  } catch (err) {
    console.error('Loadout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones — List all active zones
// V2: includes live combat status
// ═══════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { data: dbZones, error } = await supabase
      .from('zones')
      .select('*')
      .eq('is_active', true)
      .order('id');

    if (error) return res.status(500).json({ error: error.message });

    // V2: Enrich with live combat data
    const enriched = (dbZones || []).map(z => {
      const liveData = {};
      if (combatEngine && combatEngine.zones) {
        const zone = combatEngine.zones.get(z.id);
        if (zone) {
          const alive = Array.from(zone.nines.values()).filter(n => n.isAlive);
          liveData.live_nines = alive.length;
          liveData.total_nines = zone.nines.size;
          liveData.max_nines = MAX_ZONE_POPULATION;
          liveData.controlled_by = zone.controllingGuild;
          liveData.snapshot_count = zone.snapshotCount;

          // Guild breakdown
          const guilds = {};
          alive.forEach(n => {
            const g = n.guildTag || 'lone_wolf';
            if (!guilds[g]) guilds[g] = { count: 0, total_hp: 0 };
            guilds[g].count++;
            guilds[g].total_hp += n.hp;
          });
          liveData.guilds = guilds;
        }
      }
      return { ...z, ...liveData };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching zones:', err);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones/:zoneId/combat-status
// V2: Get live combat engine status for a zone
// ═══════════════════════════════════════════
router.get('/:zoneId/combat-status', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);

    if (!combatEngine || !combatEngine.zones) {
      return res.json({ active: false, message: 'Combat engine not running' });
    }

    const zone = combatEngine.zones.get(zoneId);
    if (!zone) {
      return res.json({ active: false, nines: 0, message: 'No active combat on this zone' });
    }

    const nines = Array.from(zone.nines.values()).map(n => ({
      id: n.id,
      name: n.name,
      guild: n.guildTag,
      house: n.houseSlug,
      hp: n.hp,
      maxHp: n.maxHp,
      isAlive: n.isAlive,
      stats: n.stats,
      attackInterval: n.attackInterval,
      nextAttackIn: Math.max(0, Math.ceil((n.nextAttackAt - Date.now()) / 1000)),
      activeEffects: zone.effectTracker.getEffects(n.id).map(e => ({
        effect: e.effect,
        value: e.value,
        expiresIn: e.expiresAt ? Math.max(0, Math.ceil((e.expiresAt - Date.now()) / 1000)) : null,
      })),
    }));

    res.json({
      active: true,
      zone_id: zoneId,
      controlled_by: zone.controllingGuild,
      snapshot_count: zone.snapshotCount,
      nines,
      total_alive: nines.filter(n => n.isAlive).length,
      total_deployed: nines.length,
    });

  } catch (err) {
    console.error('Combat status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// BACKWARD COMPAT
// ═══════════════════════════════════════════
router.post('/play-card', async (req, res) => {
  req.body.slot_number = req.body.slot_number || 1;
  const handler = router.stack.find(r => r.route && r.route.path === '/equip-card');
  if (handler) {
    return handler.route.stack[0].handle(req, res);
  }
  res.status(500).json({ error: 'Equip handler not found' });
});

router.post('/remove-card', async (req, res) => {
  req.body.slot_number = req.body.slot_number || 1;
  const handler = router.stack.find(r => r.route && r.route.path === '/unequip-card');
  if (handler) {
    return handler.route.stack[0].handle(req, res);
  }
  res.status(500).json({ error: 'Unequip handler not found' });
});

module.exports = router;