// ═══════════════════════════════════════════════════════
// server/routes/quests.js
// Nine Lives Network — Weekly Quest System
//
// - 3 random quests assigned per day from a pool
// - Points awarded on completion
// - Weekly tiers: complete X quests in a week for bonus rewards
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const { addPoints } = require('../services/pointsService');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── QUEST POOL ──────────────────────────────────────────
const QUEST_POOL = [
  // Combat
  {
    id: 'deploy_two_zones',
    name: 'Double Deployment',
    desc: 'Deploy your Nine to 2 different zones today',
    icon: '⚔️',
    points: 25,
    check: async (playerId, todayStart) => {
      const { data } = await supabase
        .from('zone_deployments')
        .select('zone_id')
        .eq('player_id', playerId)
        .gte('created_at', todayStart);
      const unique = new Set((data || []).map(d => d.zone_id));
      return unique.size >= 2;
    }
  },
  {
    id: 'survive_three_snapshots',
    name: 'Endurance',
    desc: 'Stay deployed long enough to survive 3 snapshots (45 mins)',
    icon: '⏱️',
    points: 30,
    check: async (playerId, todayStart) => {
      const fortyfiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('zone_deployments')
        .select('id')
        .eq('player_id', playerId)
        .eq('is_active', true)
        .lte('created_at', fortyfiveMinsAgo)
        .limit(1);
      return !!(data && data.length > 0);
    }
  },
  {
    id: 'deploy_and_stay',
    name: 'Hold the Line',
    desc: 'Stay deployed in a zone for a full hour',
    icon: '🛡️',
    points: 35,
    check: async (playerId, todayStart) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('zone_deployments')
        .select('id')
        .eq('player_id', playerId)
        .eq('is_active', true)
        .lte('created_at', oneHourAgo)
        .limit(1);
      return !!(data && data.length > 0);
    }
  },
  {
    id: 'deploy_zone',
    name: 'Into Battle',
    desc: 'Deploy your Nine to any zone today',
    icon: '🗡️',
    points: 15,
    check: async (playerId, todayStart) => {
      const { data } = await supabase
        .from('zone_deployments')
        .select('id')
        .eq('player_id', playerId)
        .gte('created_at', todayStart)
        .limit(1);
      return !!(data && data.length > 0);
    }
  },
  {
    id: 'guild_flip',
    name: 'Zone Breaker',
    desc: 'Be deployed when your guild flips a zone to your control',
    icon: '🏴',
    points: 50,
    check: async (playerId, todayStart) => {
      const { data: player } = await supabase
        .from('players')
        .select('guild_tag')
        .eq('id', playerId)
        .single();
      if (!player) return false;
      const { data: deploys } = await supabase
        .from('zone_deployments')
        .select('zone_id')
        .eq('player_id', playerId)
        .gte('created_at', todayStart);
      if (!deploys || deploys.length === 0) return false;
      const zoneIds = deploys.map(d => d.zone_id);
      const { data: zones } = await supabase
        .from('zones')
        .select('id, controlling_guild_tag')
        .in('id', zoneIds)
        .eq('controlling_guild_tag', player.guild_tag);
      return !!(zones && zones.length > 0);
    }
  },

  // Collection
  {
    id: 'open_daily_pack',
    name: 'Daily Pull',
    desc: 'Open your free daily pack from the Packs page',
    icon: '📦',
    points: 20,
    check: async (playerId, todayStart) => {
      const { data } = await supabase
        .from('player_packs')
        .select('id')
        .eq('player_id', playerId)
        .gte('created_at', todayStart)
        .limit(1);
      return !!(data && data.length > 0);
    }
  },
  {
    id: 'open_two_packs',
    name: 'Pack Addict',
    desc: 'Open 2 packs today',
    icon: '📦',
    points: 30,
    check: async (playerId, todayStart) => {
      const { data } = await supabase
        .from('player_packs')
        .select('id')
        .eq('player_id', playerId)
        .gte('created_at', todayStart);
      return (data || []).length >= 2;
    }
  },
  {
    id: 'open_rare',
    name: 'Fortune Favours',
    desc: 'Open a pack and pull a Rare or higher card',
    icon: '💎',
    points: 40,
    check: async (playerId, todayStart) => {
      const { data } = await supabase
        .from('player_cards')
        .select('spell:spells(rarity)')
        .eq('player_id', playerId)
        .gte('created_at', todayStart);
      if (!data) return false;
      const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      return data.some(c => {
        const r = c.spell?.rarity;
        return r && rarityOrder.indexOf(r) >= 2;
      });
    }
  },
  {
    id: 'open_epic',
    name: 'Against All Odds',
    desc: 'Open a pack and pull an Epic or Legendary card',
    icon: '⭐',
    points: 60,
    check: async (playerId, todayStart) => {
      const { data } = await supabase
        .from('player_cards')
        .select('spell:spells(rarity)')
        .eq('player_id', playerId)
        .gte('created_at', todayStart);
      if (!data) return false;
      const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      return data.some(c => {
        const r = c.spell?.rarity;
        return r && rarityOrder.indexOf(r) >= 3;
      });
    }
  },

  // Spellbook / Loadout
  {
    id: 'full_loadout',
    name: 'Fully Armed',
    desc: 'Equip a full 3-card loadout to any zone deployment',
    icon: '📖',
    points: 25,
    check: async (playerId, todayStart) => {
      const { data } = await supabase
        .from('zone_deployments')
        .select('card_slot_1, card_slot_2, card_slot_3')
        .eq('player_id', playerId)
        .eq('is_active', true)
        .limit(5);
      if (!data) return false;
      return data.some(d => d.card_slot_1 && d.card_slot_2 && d.card_slot_3);
    }
  },
  {
    id: 'two_house_loadout',
    name: 'House Mixer',
    desc: 'Equip cards from 2 different houses in one zone deployment',
    icon: '🏠',
    points: 35,
    check: async (playerId, todayStart) => {
      const { data: deploys } = await supabase
        .from('zone_deployments')
        .select('card_slot_1, card_slot_2, card_slot_3')
        .eq('player_id', playerId)
        .eq('is_active', true)
        .limit(5);
      if (!deploys) return false;
      for (const d of deploys) {
        const cardIds = [d.card_slot_1, d.card_slot_2, d.card_slot_3].filter(Boolean);
        if (cardIds.length < 2) continue;
        const { data: cards } = await supabase
          .from('spells')
          .select('school_id')
          .in('id', cardIds);
        if (!cards) continue;
        const houses = new Set(cards.map(c => c.school_id).filter(Boolean));
        if (houses.size >= 2) return true;
      }
      return false;
    }
  },
  {
    id: 'change_loadout',
    name: 'Adapt and Overcome',
    desc: 'Change your card loadout on an active zone deployment today',
    icon: '🔄',
    points: 20,
    check: async (playerId, todayStart) => {
      const { data } = await supabase
        .from('zone_deployments')
        .select('id, updated_at')
        .eq('player_id', playerId)
        .eq('is_active', true)
        .gte('updated_at', todayStart)
        .limit(1);
      return !!(data && data.length > 0);
    }
  },
];

// ── WEEKLY REWARD TIERS ─────────────────────────────────
const WEEKLY_TIERS = [
  { tier: 1, questsNeeded: 3,  points: 50,  packBonus: 0, label: '3 Quests' },
  { tier: 2, questsNeeded: 5,  points: 100, packBonus: 0, label: '5 Quests' },
  { tier: 3, questsNeeded: 7,  points: 200, packBonus: 1, label: '7 Quests' },
  { tier: 4, questsNeeded: 10, points: 300, packBonus: 2, label: '10 Quests' },
];

// ── HELPERS ─────────────────────────────────────────────

function getTodayStart() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart() {
  const d = new Date();
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function pickDailyQuests(playerId, dateStr) {
  const seed = parseInt(playerId) + parseInt(dateStr.split('-').join(''));
  const shuffled = [...QUEST_POOL].sort((a, b) => {
    const ha = Math.sin(seed * a.id.length) * 10000;
    const hb = Math.sin(seed * b.id.length) * 10000;
    return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
  });
  return shuffled.slice(0, 3);
}

// ── GET /daily/:playerId ────────────────────────────────
router.get('/daily/:playerId', async (req, res) => {
  const { playerId } = req.params;
  const todayStart = getTodayStart();
  const todayDate = getTodayDate();
  const weekStart = getWeekStart();

  try {
    const todayQuests = pickDailyQuests(playerId, todayDate);

    const { data: existing } = await supabaseAdmin
      .from('player_quests')
      .select('quest_id, completed, reward_claimed')
      .eq('player_id', playerId)
      .eq('quest_date', todayDate);

    const existingMap = {};
    (existing || []).forEach(r => { existingMap[r.quest_id] = r; });

    const quests = [];

    for (const q of todayQuests) {
      const record = existingMap[q.id];
      let complete = !!(record?.completed);

      if (!complete) {
        try {
          complete = await q.check(playerId, todayStart);
          if (complete) {
            await supabaseAdmin
              .from('player_quests')
              .upsert({
                player_id: playerId,
                quest_id: q.id,
                quest_name: q.name,
                quest_desc: q.desc,
                quest_date: todayDate,
                completed: true,
                reward_points: q.points,
                reward_claimed: false,
              }, { onConflict: 'player_id,quest_id,quest_date' });

            await addPoints(playerId, q.points, 'quest_complete', `Quest completed: ${q.name}`);
          }
        } catch (e) {
          console.error(`[Quests] Check failed for ${q.id}:`, e.message);
        }
      }

      quests.push({ id: q.id, name: q.name, desc: q.desc, icon: q.icon, points: q.points, complete });
    }

    const { data: weekCompletions } = await supabaseAdmin
      .from('player_quests')
      .select('quest_id')
      .eq('player_id', playerId)
      .gte('quest_date', weekStart)
      .eq('completed', true);

    const weeklyCount = (weekCompletions || []).length;

    const { data: claimedTiers } = await supabaseAdmin
      .from('player_weekly_rewards')
      .select('tier')
      .eq('player_id', playerId)
      .eq('week_start', weekStart);

    const claimedTierNums = (claimedTiers || []).map(t => t.tier);

    const weeklyTiers = WEEKLY_TIERS.map(t => ({
      ...t,
      reached: weeklyCount >= t.questsNeeded,
      claimed: claimedTierNums.includes(t.tier),
    }));

    res.json({ quests, weeklyCount, weeklyTiers, weekStart });

  } catch (err) {
    console.error('[Quests] Error:', err.message);
    res.status(500).json({ error: 'Failed to load quests' });
  }
});

// ── POST /weekly-claim/:playerId ────────────────────────
router.post('/weekly-claim/:playerId', async (req, res) => {
  const { playerId } = req.params;
  const { tier } = req.body;
  const weekStart = getWeekStart();

  try {
    const tierDef = WEEKLY_TIERS.find(t => t.tier === tier);
    if (!tierDef) return res.status(400).json({ error: 'Invalid tier' });

    const { data: weekCompletions } = await supabaseAdmin
      .from('player_quests')
      .select('quest_id')
      .eq('player_id', playerId)
      .gte('quest_date', weekStart)
      .eq('completed', true);

    const weeklyCount = (weekCompletions || []).length;
    if (weeklyCount < tierDef.questsNeeded) {
      return res.status(400).json({ error: 'Not enough quests completed this week' });
    }

    const { data: alreadyClaimed } = await supabaseAdmin
      .from('player_weekly_rewards')
      .select('id')
      .eq('player_id', playerId)
      .eq('week_start', weekStart)
      .eq('tier', tier)
      .single();

    if (alreadyClaimed) return res.status(400).json({ error: 'Already claimed this tier' });

    await supabaseAdmin.from('player_weekly_rewards').insert({
      player_id: playerId,
      week_start: weekStart,
      tier,
    });

    if (tierDef.points > 0) {
      await addPoints(playerId, tierDef.points, 'weekly_quest_tier', `Weekly tier ${tier} reward (${tierDef.label})`);
    }

    if (tierDef.packBonus > 0) {
      for (let i = 0; i < tierDef.packBonus; i++) {
        await supabaseAdmin.from('player_packs').insert({
          player_id: playerId,
          pack_type: 'reward',
          created_at: new Date().toISOString(),
        });
      }
    }

    res.json({
      success: true,
      points_awarded: tierDef.points,
      packs_awarded: tierDef.packBonus,
      message: `Tier ${tier} claimed! +${tierDef.points} points${tierDef.packBonus > 0 ? ` + ${tierDef.packBonus} bonus pack(s)` : ''}`,
    });

  } catch (err) {
    console.error('[Quests] Weekly claim error:', err.message);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

module.exports = router;