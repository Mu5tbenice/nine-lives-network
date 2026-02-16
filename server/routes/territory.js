const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const packSystem = require('../services/packSystem');
const effectEngine = require('../services/effectEngine');
const scoringV2 = require('../services/scoringV2');

// Admin client for writes
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ═══════════════════════════════════════════
// POST /api/territory/action
// Cast a spell card OR basic attack/defend on a zone
//
// NEW: Send card_index (0-4) to use a card from today's hand
// OLD: Send just action_type ('attack'/'defend') for basic action
// Both work — old way still works exactly like before
// ═══════════════════════════════════════════
router.post('/action', async (req, res) => {
  try {
    const { player_id, zone_id, action_type, card_index } = req.body;

    // Validate input
    if (!player_id || !zone_id) {
      return res.status(400).json({ error: 'Need player_id and zone_id' });
    }

    // If no card_index AND no valid action_type, reject
    if (card_index === undefined && !['attack', 'defend'].includes(action_type)) {
      return res.status(400).json({ error: 'Need action_type (attack/defend) or card_index' });
    }

    // Get player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', player_id)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.mana < 1) {
      return res.status(400).json({ error: 'Not enough mana', mana_remaining: 0 });
    }

    // Get zone
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('*')
      .eq('id', zone_id)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Check if already acted on this zone today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAction } = await supabase
      .from('territory_actions')
      .select('id')
      .eq('player_id', player_id)
      .eq('zone_id', zone_id)
      .eq('game_day', today)
      .single();

    if (existingAction) {
      return res.status(400).json({ error: 'Already acted on this zone today' });
    }

    // ─── DETERMINE CARD ───
    let card = null;

    if (card_index !== undefined && card_index !== null) {
      // ── NEW: Card from daily hand ──
      const handResult = await packSystem.useCardFromHand(player_id, parseInt(card_index));
      if (!handResult.success) {
        return res.status(400).json({ error: handResult.error });
      }
      card = handResult.card;
    } else {
      // ── OLD: Basic attack/defend (still works like before) ──
      card = {
        name: action_type === 'defend' ? 'Basic Defend' : 'Basic Attack',
        house: 'universal',
        type: action_type,
        tier: 0,
        cost: 1,
        rarity: 'common',
        effects: [],
      };
    }

    // Check mana cost
    const manaCost = card.cost || 1;
    if (player.mana < manaCost) {
      return res.status(400).json({
        error: 'Not enough mana. Card costs ' + manaCost + ' MP, you have ' + player.mana,
        mana_remaining: player.mana,
      });
    }

    // ─── PROCESS EFFECTS ───
    let effectResult = {
      powerModifier: 1.0,
      bonusPoints: 0,
      effectsApplied: [],
      manaRefund: 0,
      extraInfluence: 0,
    };

    try {
      effectResult = await effectEngine.processEffects(
        card, zone_id, player_id, player.school_id
      );
    } catch (effErr) {
      console.error('Effect processing error (continuing):', effErr.message);
    }

    // ─── CALCULATE SCORE ───
    const scoreResult = await scoringV2.calculateTerritoryCast(
      card, player.school_id, zone_id, effectResult
    );

    // Zone multipliers
    let multiplier = 1.0;
    if (zone.is_current_objective) multiplier = 1.5;
    if (zone.bonus_effect) multiplier *= 1.25;

    const finalPoints = Math.round(scoreResult.totalPoints * multiplier);
    const finalPower = Math.round(scoreResult.totalPower * multiplier);

    // ─── DEDUCT MANA (minus any HASTE refund) ───
    const actualManaCost = Math.max(0, manaCost - (effectResult.manaRefund || 0));
    const newMana = player.mana - actualManaCost;

    // Deduct mana
    await supabaseAdmin
      .from('players')
      .update({ mana: newMana })
      .eq('id', player_id);

    // ─── RECORD ACTION ───
    const actionInsert = {
      player_id,
      zone_id,
      school_id: player.school_id,
      action_type: card.type || action_type || 'attack',
      power_contributed: finalPower,
      source: 'website',
      community_tag: player.community_tag || null,
      game_day: today,
      points_earned: finalPoints,
    };

    // Add V2 columns (added by the migration SQL)
    actionInsert.spell_name = card.name;
    actionInsert.spell_house = card.house || 'universal';
    actionInsert.spell_tier = card.tier || 0;
    actionInsert.spell_rarity = card.rarity || 'common';
    actionInsert.spell_effects = card.effects || [];
    actionInsert.base_power = scoreResult.basePower;
    actionInsert.rarity_multiplier = scoreResult.rarityMult;
    actionInsert.affinity_multiplier = scoreResult.affinityMult;
    actionInsert.total_power = finalPower;
    actionInsert.effects_applied = effectResult.effectsApplied;

    const { data: action, error: actionError } = await supabaseAdmin
      .from('territory_actions')
      .insert(actionInsert)
      .select()
      .single();

    if (actionError) {
      // Refund mana on failure
      await supabaseAdmin.from('players').update({ mana: player.mana }).eq('id', player_id);
      console.error('Territory action insert error:', actionError);
      return res.status(500).json({ error: 'Failed to record action' });
    }

    // ─── UPDATE PLAYER POINTS ───
    let totalPointsAwarded = finalPoints;

    await supabaseAdmin
      .from('players')
      .update({
        seasonal_points: (player.seasonal_points || 0) + finalPoints,
        lifetime_points: (player.lifetime_points || 0) + finalPoints,
      })
      .eq('id', player_id);

    // ─── ALL MANA SPENT BONUS ───
    let allManaBonus = 0;
    if (newMana === 0) {
      allManaBonus = 10;
      totalPointsAwarded += allManaBonus;

      await supabaseAdmin
        .from('players')
        .update({
          seasonal_points: (player.seasonal_points || 0) + finalPoints + allManaBonus,
          lifetime_points: (player.lifetime_points || 0) + finalPoints + allManaBonus,
        })
        .eq('id', player_id);

      // Update daily hand if it exists
      try {
        await supabaseAdmin
          .from('daily_hands')
          .update({ all_mana_spent: true })
          .eq('player_id', player_id)
          .eq('game_day', today);
      } catch (e) { /* daily_hands might not exist yet */ }
    }

    // ─── UPDATE ZONE INFLUENCE ───
    await updateZoneInfluence(zone_id, player.school_id, card.type || action_type || 'attack', player.community_tag);

    // ─── CHECK COMBOS ───
    let combos = [];
    try {
      combos = await scoringV2.checkCombos(zone_id, player.school_id, today);
    } catch (e) { /* non-critical */ }

    // ─── BUILD MESSAGE ───
    let message = card.name + ' cast! +' + totalPointsAwarded + ' pts';
    if (card.rarity && card.rarity !== 'common') {
      message = card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1) + ' ' + message;
    }
    var appliedEffects = effectResult.effectsApplied.filter(function(e) { return e.status === 'APPLIED'; });
    if (appliedEffects.length > 0) message += ' — ' + appliedEffects.length + ' effect(s)!';
    if (allManaBonus > 0) message += ' 🔥 All mana bonus +' + allManaBonus + '!';
    if (combos.length > 0) message += ' ✨ ' + combos[0].label + '!';

    // ─── RESPOND ───
    res.json({
      success: true,
      action,
      message,
      points_earned: totalPointsAwarded,
      mana_remaining: newMana,
      mana_cost: actualManaCost,
      is_objective: zone.is_current_objective,
      multiplier: multiplier,
      // V2 scoring breakdown (frontend uses when ready)
      card: {
        name: card.name,
        house: card.house || 'universal',
        rarity: card.rarity || 'common',
        tier: card.tier || 0,
        type: card.type || action_type,
      },
      scoring: {
        base: scoreResult.basePoints,
        rarity_mult: scoreResult.rarityMult,
        affinity_mult: scoreResult.affinityMult,
        effect_bonus: scoreResult.effectBonus,
        zone_multiplier: multiplier,
        all_mana_bonus: allManaBonus,
        total: totalPointsAwarded,
      },
      effects: effectResult.effectsApplied,
      combos: combos,
      influence_power: finalPower,
    });

  } catch (error) {
    console.error('Territory action error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/territory/actions/today
// All actions grouped by zone for today
// (UNCHANGED from your original)
// ═══════════════════════════════════════════
router.get('/actions/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: actions, error } = await supabase
      .from('territory_actions')
      .select('*, player:players(id, twitter_handle, profile_image, school_id)')
      .eq('game_day', today)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch actions error:', error);
      return res.status(500).json({ error: 'Failed to fetch actions' });
    }

    var byZone = {};
    if (actions) {
      actions.forEach(function(a) {
        if (!byZone[a.zone_id]) byZone[a.zone_id] = [];
        byZone[a.zone_id].push(a);
      });
    }

    res.json(byZone);

  } catch (error) {
    console.error('Territory actions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/territory/influence
// Current influence % per house per zone (today)
// (UNCHANGED from your original)
// ═══════════════════════════════════════════
router.get('/influence', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: actions, error } = await supabase
      .from('territory_actions')
      .select('zone_id, school_id, action_type')
      .eq('game_day', today);

    if (error) {
      console.error('Influence fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch influence data' });
    }

    var zones = {};
    if (actions) {
      actions.forEach(function(a) {
        if (!zones[a.zone_id]) zones[a.zone_id] = {};
        if (!zones[a.zone_id][a.school_id]) zones[a.zone_id][a.school_id] = 0;
        zones[a.zone_id][a.school_id] += (a.action_type === 'attack' ? 2 : 1);
      });
    }

    var result = {};
    Object.keys(zones).forEach(function(zoneId) {
      var schools = zones[zoneId];
      var total = 0;
      Object.values(schools).forEach(function(v) { total += v; });

      result[zoneId] = {};
      Object.keys(schools).forEach(function(schoolId) {
        result[zoneId][schoolId] = Math.round((schools[schoolId] / total) * 100);
      });
    });

    res.json(result);

  } catch (error) {
    console.error('Influence error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// GET /api/territory/zone/:id
// Detailed info for a single zone today
// (UNCHANGED from your original)
// ═══════════════════════════════════════════
router.get('/zone/:id', async (req, res) => {
  try {
    var zoneId = parseInt(req.params.id);
    var today = new Date().toISOString().split('T')[0];

    var { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('*')
      .eq('id', zoneId)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    var { data: actions, error: actionsError } = await supabase
      .from('territory_actions')
      .select('*, player:players(id, twitter_handle, profile_image, school_id)')
      .eq('zone_id', zoneId)
      .eq('game_day', today)
      .order('created_at', { ascending: false });

    if (actionsError) actions = [];

    var influence = {};
    var totalPower = 0;
    if (actions) {
      actions.forEach(function(a) {
        if (!influence[a.school_id]) influence[a.school_id] = 0;
        influence[a.school_id] += (a.action_type === 'attack' ? 2 : 1);
        totalPower += (a.action_type === 'attack' ? 2 : 1);
      });
    }

    var influencePct = {};
    Object.keys(influence).forEach(function(schoolId) {
      influencePct[schoolId] = totalPower > 0 ? Math.round((influence[schoolId] / totalPower) * 100) : 0;
    });

    res.json({
      zone: zone,
      actions: actions || [],
      influence: influencePct,
      total_actions: (actions || []).length,
      total_power: totalPower
    });

  } catch (error) {
    console.error('Zone detail error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// HELPER: Update zone influence in zone_control
// (UNCHANGED from your original)
// ═══════════════════════════════════════════
async function updateZoneInfluence(zoneId, schoolId, actionType, communityTag) {
  try {
    var power = actionType === 'attack' ? 2 : 1;

    var { data: existing } = await supabase
      .from('zone_control')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('school_id', schoolId)
      .single();

    if (existing) {
      await supabaseAdmin
        .from('zone_control')
        .update({ control_percentage: existing.control_percentage + power })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('zone_control')
        .insert({
          zone_id: zoneId,
          school_id: schoolId,
          control_percentage: power
        });
    }
    // Also update community influence
    if (communityTag) {
      try {
        var { data: existingComm } = await supabase
          .from('zone_community_control')
          .select('*')
          .eq('zone_id', zoneId)
          .eq('community_tag', communityTag)
          .single();

        if (existingComm) {
          await supabaseAdmin
            .from('zone_community_control')
            .update({ control_percentage: existingComm.control_percentage + power, updated_at: new Date().toISOString() })
            .eq('id', existingComm.id);
        } else {
          await supabaseAdmin
            .from('zone_community_control')
            .insert({
              zone_id: zoneId,
              community_tag: communityTag,
              control_percentage: power
            });
        }
      } catch (commErr) {
        console.error('Community influence update error:', commErr.message);
      }
    }
  } catch (error) {
    console.error('Update zone influence error:', error);
  }
}

module.exports = router;