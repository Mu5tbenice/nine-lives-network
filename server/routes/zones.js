// ═══════════════════════════════════════════════════════
// server/routes/zones.js
// V3 Zone Deployment + Card Slot System
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const { spendMana } = require('../services/manaRegen');
const { getNine, healNine } = require('../services/nineSystem');
const { getEffectiveStats, RARITY_BONUSES } = require('../services/cardDurability');
const { addPoints } = require('../services/pointsService');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Zone deploy points (from Game Design V4, Section 19)
const ZONE_POINTS = {
  DEPLOY: 5,  // +5 for deploying to a zone
};

// ═══════════════════════════════════════════
// POST /api/zones/deploy
// Deploy your Nine to a zone (costs 1 mana)
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

    // Spend 1 mana
    const manaResult = await spendMana(player_id, 1);
    if (!manaResult.success) {
      return res.status(400).json({ error: manaResult.error });
    }

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

    // ── AWARD DEPLOY POINTS (+5) ──
    await addPoints(player_id, ZONE_POINTS.DEPLOY, 'zone_deploy', `Deployed to zone ${zone_id}`);

    res.json({
      success: true,
      deployment,
      mana_remaining: manaResult.mana,
      points_earned: ZONE_POINTS.DEPLOY,
      message: player?.guild_tag
        ? `Deployed to zone ${zone_id}! Fighting for ${player.guild_tag} (+${ZONE_POINTS.DEPLOY} pts)`
        : `Lone Wolf deployed! 1.5x ATK bonus active. (+${ZONE_POINTS.DEPLOY} pts)`,
      is_lone_wolf: player?.guild_tag ? false : true,
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

    // Remove card from slot (if any)
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

    res.json({
      success: true,
      message: 'Withdrawn from zone. Card returned to hand.',
    });

  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// POST /api/zones/play-card
// Play a card on a zone you're deployed to
// Body: { player_id, zone_id, card_id }
// Costs mana based on tier: T0/T1=1, T2=2, T3=3
// ═══════════════════════════════════════════
router.post('/play-card', async (req, res) => {
  try {
    const { player_id, zone_id, card_id } = req.body;

    if (!player_id || !zone_id || !card_id) {
      return res.status(400).json({ error: 'player_id, zone_id, and card_id required' });
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

    // Get the card
    const { data: card } = await supabase
      .from('player_cards')
      .select('*, spell:spell_id(name, base_atk, base_hp, tier, mana_cost, bonus_effects)')
      .eq('id', card_id)
      .eq('player_id', player_id)
      .single();

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (card.is_exhausted) {
      return res.status(400).json({ error: 'Card is exhausted — recharge it first' });
    }

    // Check card isn't already active on ANOTHER zone
    const { data: existingSlot } = await supabase
      .from('zone_card_slots')
      .select('id, deployment:deployment_id(zone_id)')
      .eq('card_id', card_id)
      .eq('is_active', true)
      .single();

    if (existingSlot) {
      return res.status(400).json({
        error: 'Card is already active on another zone. Remove it first.',
      });
    }

    // Calculate mana cost based on tier
    const tier = card.spell_tier || card.spell?.tier || 0;
    let manaCost = 1;
    if (tier >= 3) manaCost = 3;
    else if (tier >= 2) manaCost = 2;

    // Spend mana
    const manaResult = await spendMana(player_id, manaCost);
    if (!manaResult.success) {
      return res.status(400).json({ error: manaResult.error });
    }

    // Remove any existing card from this deployment slot
    await supabaseAdmin
      .from('zone_card_slots')
      .update({ is_active: false })
      .eq('deployment_id', deployment.id)
      .eq('is_active', true);

    // Place new card in slot
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('zone_card_slots')
      .insert({
        deployment_id: deployment.id,
        card_id: card_id,
        is_active: true,
      })
      .select()
      .single();

    if (slotErr) {
      console.error('Card slot error:', slotErr);
      return res.status(500).json({ error: 'Failed to play card' });
    }

    res.json({
      success: true,
      slot,
      mana_cost: manaCost,
      mana_remaining: manaResult.mana,
      message: `${card.spell_name || 'Card'} played on zone ${zone_id}!`,
    });

  } catch (err) {
    console.error('Play card error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// POST /api/zones/remove-card
// Remove active card from a zone slot (free)
// Body: { player_id, zone_id }
// ═══════════════════════════════════════════
router.post('/remove-card', async (req, res) => {
  try {
    const { player_id, zone_id } = req.body;

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

    await supabaseAdmin
      .from('zone_card_slots')
      .update({ is_active: false })
      .eq('deployment_id', deployment.id)
      .eq('is_active', true);

    res.json({ success: true, message: 'Card removed from zone slot' });

  } catch (err) {
    console.error('Remove card error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/zones/:zoneId/deployments
// List all Nines deployed on a zone
// ═══════════════════════════════════════════
router.get('/:zoneId/deployments', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);

    const { data: deployments, error } = await supabase
      .from('zone_deployments')
      .select(`
        *,
        player:player_id(twitter_handle, profile_image, school_id),
        nine:nine_id(name, base_atk, base_hp, base_spd, house_id),
        card_slot:zone_card_slots(card_id, is_active)
      `)
      .eq('zone_id', zoneId)
      .eq('is_active', true);

    if (error) {
      console.error('Deployments fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch deployments' });
    }

    // Calculate guild power totals
    const guildPower = {};
    (deployments || []).forEach(d => {
      const tag = d.guild_tag || 'unaffiliated';
      if (!guildPower[tag]) guildPower[tag] = { total_hp: 0, count: 0 };
      guildPower[tag].total_hp += d.current_hp;
      guildPower[tag].count += 1;
    });

    res.json({
      zone_id: zoneId,
      deployments: deployments || [],
      guild_power: guildPower,
      total_nines: (deployments || []).length,
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
        card_slot:zone_card_slots(card_id, is_active)
      `)
      .eq('player_id', playerId)
      .eq('is_active', true);

    if (error) {
      console.error('My deployments error:', error);
      return res.status(500).json({ error: 'Failed to fetch' });
    }

    res.json({
      deployments: deployments || [],
      total: (deployments || []).length,
    });

  } catch (err) {
    console.error('My deployments error:', err);
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

module.exports = router;
