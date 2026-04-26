// ═══════════════════════════════════════════════════════
// server/routes/admin.js
// Admin panel API — zones, clashes, spells, scheduler
// All routes require x-admin-key header
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const territoryControl = require('../services/territoryControl');
const activityDecay = require('../services/activityDecay');
const supabase = require('../config/supabaseAdmin');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Optional modules
let twitterBot = null;
let nermBot = null;
let scheduler = null;
try {
  twitterBot = require('../services/twitterBot');
} catch (e) {}
try {
  nermBot = require('../services/nermBot');
} catch (e) {}
try {
  scheduler = require('../services/scheduler');
} catch (e) {}

// ── AUTH MIDDLEWARE ──
function checkAdminKey(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Apply to all routes
router.use(checkAdminKey);

// ╔═══════════════════════════════════╗
// ║  DASHBOARD / HEALTH               ║
// ╚═══════════════════════════════════╝

// GET /api/admin/stats — game overview
router.get('/stats', async (req, res) => {
  try {
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('is_active', true);
    const { data: zones } = await supabase
      .from('zones')
      .select('id, name, is_current_objective, controlling_school_id');
    const { data: spells } = await supabase
      .from('spells')
      .select('id')
      .eq('is_active', true);

    const today = new Date().toISOString().split('T')[0];
    const { data: todayActions } = await supabase
      .from('territory_actions')
      .select('id')
      .eq('game_day', today);

    const objective = zones ? zones.find((z) => z.is_current_objective) : null;
    const controlled = zones
      ? zones.filter((z) => z.controlling_school_id).length
      : 0;

    res.json({
      total_players: players ? players.length : 0,
      active_spells: spells ? spells.length : 0,
      total_zones: zones ? zones.length : 0,
      zones_controlled: controlled,
      actions_today: todayActions ? todayActions.length : 0,
      current_objective: objective ? objective.name : 'None set',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/scheduler-status — cron job health
router.get('/scheduler-status', async (req, res) => {
  try {
    const status = scheduler
      ? scheduler.getJobStatus()
      : { initialized: false, lastRuns: {} };
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ╔═══════════════════════════════════╗
// ║  FORCE ACTIONS                     ║
// ╚═══════════════════════════════════╝

// POST /api/admin/force-midnight — manually trigger midnight banking
router.post('/force-midnight', async (req, res) => {
  try {
    console.log('[Admin] Force midnight banking triggered');
    const result = await territoryControl.midnightBanking();
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/force-objective — set random or specific objective
router.post('/force-objective', async (req, res) => {
  try {
    const { zone_id } = req.body;

    if (zone_id) {
      // Set specific zone
      await supabaseAdmin
        .from('zones')
        .update({ is_current_objective: false })
        .eq('is_current_objective', true);
      await supabaseAdmin
        .from('zones')
        .update({ is_current_objective: true })
        .eq('id', zone_id);
      res.json({ success: true, zone_id });
    } else {
      // Random
      const id = await territoryControl.setRandomObjective();
      res.json({ success: true, zone_id: id });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ╔═══════════════════════════════════╗
// ║  ZONE MANAGEMENT                   ║
// ╚═══════════════════════════════════╝

// GET /api/admin/zones — list all zones
router.get('/zones', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('id');
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/zone/:id — update a zone
router.put('/zone/:id', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    const allowed = [
      'name',
      'description',
      'image_url',
      'video_url',
      'zone_type',
      'bonus_effect',
      'is_current_objective',
      'school_id',
    ];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('zones')
      .update(updates)
      .eq('id', zoneId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/zones — create a zone
router.post('/zones', async (req, res) => {
  try {
    const {
      name,
      description,
      zone_type,
      image_url,
      video_url,
      bonus_effect,
      school_id,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const { data, error } = await supabaseAdmin
      .from('zones')
      .insert({
        name,
        description: description || '',
        zone_type: zone_type || 'neutral',
        image_url: image_url || null,
        video_url: video_url || null,
        bonus_effect: bonus_effect || null,
        school_id: school_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, zone: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/zone/:id — delete a zone
router.delete('/zone/:id', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    const { error } = await supabaseAdmin
      .from('zones')
      .delete()
      .eq('id', zoneId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/zone/:id/objective — toggle objective
router.post('/zone/:id/objective', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    // Clear all objectives first
    await supabaseAdmin
      .from('zones')
      .update({ is_current_objective: false })
      .eq('is_current_objective', true);
    // Set this one
    await supabaseAdmin
      .from('zones')
      .update({ is_current_objective: true })
      .eq('id', zoneId);
    res.json({ success: true, zone_id: zoneId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/zone/:id/bonus — set bonus effect
router.post('/zone/:id/bonus', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    const { bonus_effect } = req.body;
    await supabaseAdmin
      .from('zones')
      .update({ bonus_effect: bonus_effect || null })
      .eq('id', zoneId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/zone-influence/:id — detailed influence for a zone
router.get('/zone-influence/:id', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    const today = new Date().toISOString().split('T')[0];
    const influence = await territoryControl.getAllZoneInfluence(today);
    res.json({ zone_id: zoneId, influence: influence[zoneId] || {} });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/zones/:id/state — §9.67 diagnostic for deploy-lockout triage.
// Returns the combat engine's in-memory view of a zone (roundState, timing,
// distinct guilds, per-Nine summary) so ops can reason about why a deploy
// was accepted or rejected. Read-only.
router.get('/zones/:id/state', (req, res) => {
  try {
    let engine = null;
    try {
      engine = require('../services/combatEngine');
    } catch (e) {
      return res.status(503).json({ error: 'combat engine unavailable' });
    }
    if (!engine || !engine.getZoneState) {
      return res.status(503).json({ error: 'combat engine unavailable' });
    }
    const zoneId = req.params.id;
    const zs = engine.getZoneState(zoneId);
    if (!zs) {
      return res.json({ zone_id: zoneId, loaded: false });
    }
    const now = Date.now();
    const nines = zs.nines ? Array.from(zs.nines.values()) : [];
    const guilds = Array.from(new Set(nines.map((n) => n.guildTag)));
    const msLeft = (zs.roundEndsAt || 0) - now;
    res.json({
      zone_id: zoneId,
      loaded: true,
      roundState: zs.roundState,
      roundNumber: zs.roundNumber,
      roundEndsAt: zs.roundEndsAt,
      secondsToNext: Math.max(0, Math.ceil(msLeft / 1000)),
      stale: zs.roundState === 'FIGHTING' && msLeft <= 0,
      ninesCount: nines.length,
      guilds,
      contested: guilds.length >= 2,
      nines: nines.map((n) => ({
        deploymentId: n.deploymentId,
        playerId: n.playerId,
        playerName: n.playerName,
        guildTag: n.guildTag,
        houseKey: n.houseKey,
        hp: n.hp,
        maxHp: n.maxHp,
        waitingForRound: !!n.waitingForRound,
        withdrawn: !!n.withdrawn,
      })),
    });
  } catch (e) {
    console.error('[admin zones/:id/state]', e);
    res.status(500).json({ error: e.message });
  }
});

// ╔═══════════════════════════════════╗
// ║  COMMUNITY CLASH MANAGEMENT        ║
// ╚═══════════════════════════════════╝

// GET /api/admin/clashes — list active clashes
router.get('/clashes', async (req, res) => {
  try {
    // Try community_clashes first, fall back to guild_clashes
    let data, error;
    ({ data, error } = await supabase
      .from('community_clashes')
      .select('*')
      .order('created_at', { ascending: false }));

    if (error) {
      // Try guild_clashes table as fallback
      ({ data, error } = await supabase
        .from('guild_clashes')
        .select('*')
        .order('created_at', { ascending: false }));
    }

    if (error) throw error;

    // Format for frontend compatibility
    const formatted = (data || []).map((c) => ({
      id: c.id,
      team_a: {
        tag: c.team_a_tag || c.guild_a,
        color: c.team_a_color || c.color_a,
        points: c.team_a_points || c.score_a || 0,
      },
      team_b: {
        tag: c.team_b_tag || c.guild_b,
        color: c.team_b_color || c.color_b,
        points: c.team_b_points || c.score_b || 0,
      },
      season: c.season,
      week: c.week,
      is_active:
        c.is_active !== undefined ? c.is_active : c.status === 'active',
    }));

    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/clashes — create a clash
router.post('/clashes', async (req, res) => {
  try {
    const {
      team_a_tag,
      team_a_color,
      team_b_tag,
      team_b_color,
      season,
      week,
      guild_a,
      guild_b,
      color_a,
      color_b,
    } = req.body;

    const teamA = team_a_tag || guild_a;
    const teamB = team_b_tag || guild_b;
    if (!teamA || !teamB)
      return res.status(400).json({ error: 'Both team tags required' });

    // Try community_clashes first
    let data, error;
    ({ data, error } = await supabaseAdmin
      .from('community_clashes')
      .insert({
        team_a_tag: teamA,
        team_a_color: team_a_color || color_a || '#D4A64B',
        team_b_tag: teamB,
        team_b_color: team_b_color || color_b || '#00D4FF',
        season: season || 0,
        week: week || 1,
      })
      .select()
      .single());

    if (error) {
      // Fallback to guild_clashes
      ({ data, error } = await supabaseAdmin
        .from('guild_clashes')
        .insert({
          guild_a: teamA,
          guild_b: teamB,
          color_a: team_a_color || color_a || '#D4A64B',
          color_b: team_b_color || color_b || '#00D4FF',
          week: week || 1,
          status: 'upcoming',
          score_a: 0,
          score_b: 0,
        })
        .select()
        .single());
    }

    if (error) throw error;
    res.json({ success: true, clash: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/clash/:id — update a clash
router.put('/clash/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const allowed = [
      'team_a_tag',
      'team_a_color',
      'team_b_tag',
      'team_b_color',
      'team_a_points',
      'team_b_points',
      'season',
      'week',
      'is_active',
    ];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const { data, error } = await supabaseAdmin
      .from('community_clashes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/clash/:id — delete a clash
router.delete('/clash/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabaseAdmin
      .from('community_clashes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ╔═══════════════════════════════════╗
// ║  SPELL MANAGEMENT                  ║
// ╚═══════════════════════════════════╝

// Helper: safely parse bonus_effects from DB (handles double-serialization)
function parseEffects(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// GET /api/admin/spells — list all spells
router.get('/spells', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('spells')
      .select('*')
      .order('id');
    if (error) throw error;

    // Normalize bonus_effects for each spell
    const spells = (data || []).map((s) => ({
      ...s,
      bonus_effects: parseEffects(s.bonus_effects),
    }));

    res.json({ spells });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/spells — create spell
router.post('/spells', async (req, res) => {
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
      base_atk,
      base_hp,
      base_spd,
      base_def,
      base_luck,
      in_pack_pool,
      is_active,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    // Auto-generate slug if not provided
    const finalSlug =
      slug && slug.trim()
        ? slug.trim()
        : name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

    const insertData = {
      name: name.trim(),
      slug: finalSlug,
      house: house || 'universal',
      spell_type: spell_type || 'attack',
      base_effect: base_effect || '',
      bonus_effects: bonus_effects || [], // Pass array directly — Supabase JSONB handles it
      flavor_text: flavor_text || '',
      motto: motto || null,
      is_active: is_active !== undefined ? is_active : true,
      is_always_available: false,
      in_pack_pool: in_pack_pool !== undefined ? in_pack_pool : true,
    };

    // Add V5 stats if provided
    if (base_atk !== undefined) insertData.base_atk = base_atk;
    if (base_hp !== undefined) insertData.base_hp = base_hp;
    if (base_spd !== undefined) insertData.base_spd = base_spd;
    if (base_def !== undefined) insertData.base_def = base_def;
    if (base_luck !== undefined) insertData.base_luck = base_luck;

    const { data, error } = await supabaseAdmin
      .from('spells')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    console.log('[Admin] Created spell: ' + data.id + ' - ' + data.name);
    res.json({
      success: true,
      spell: { ...data, bonus_effects: parseEffects(data.bonus_effects) },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/spell/:id — update spell
router.put('/spell/:id', async (req, res) => {
  try {
    const spellId = parseInt(req.params.id);
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
      'is_always_available',
      'image_url',
      'in_pack_pool',
      'base_atk',
      'base_hp',
      'base_spd',
      'base_def',
      'base_luck',
      'rarity_weights',
    ];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) {
        // Pass bonus_effects as-is (array) — do NOT JSON.stringify for JSONB columns
        updates[f] = req.body[f];
      }
    });

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'No fields to update' });

    const { data, error } = await supabaseAdmin
      .from('spells')
      .update(updates)
      .eq('id', spellId)
      .select()
      .single();
    if (error) throw error;
    res.json({
      success: true,
      spell: { ...data, bonus_effects: parseEffects(data.bonus_effects) },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/spell/:id — delete spell
router.delete('/spell/:id', async (req, res) => {
  try {
    const spellId = parseInt(req.params.id);

    // Don't delete always-available spells
    const { data: spell } = await supabase
      .from('spells')
      .select('is_always_available, name')
      .eq('id', spellId)
      .single();
    if (!spell) return res.status(404).json({ error: 'Spell not found' });
    if (spell.is_always_available)
      return res
        .status(400)
        .json({ error: 'Cannot delete always-available spells' });

    const { error } = await supabaseAdmin
      .from('spells')
      .delete()
      .eq('id', spellId);
    if (error) throw error;
    console.log('[Admin] Deleted spell: ' + spellId + ' - ' + spell.name);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ╔═══════════════════════════════════╗
// ║  PLAYER MANAGEMENT                 ║
// ╚═══════════════════════════════════╝

// GET /api/admin/players — list all players
router.get('/players', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/player/:id — update player
router.put('/player/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const allowed = [
      'seasonal_points',
      'lifetime_points',
      'streak',
      'lives',
      'arcane_energy',
      'is_active',
      'school_id',
      'community_tag',
    ];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const { data, error } = await supabaseAdmin
      .from('players')
      .update(updates)
      .eq('id', playerId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/player/:idOrHandle — cascade-delete a player.
// Accepts a numeric id OR a twitter handle (case-insensitive, with or
// without leading @). Calls the delete_player_cascade(p_id) SQL function
// (database/migrations/006_delete_player_cascade.sql) which wipes 20
// dependent tables in one transaction and returns a per-table count.
//
// Use case: registration smoke testing — re-test the /register.html flow
// without manually deleting rows across child tables.
//   curl -X DELETE -H "x-admin-key: $ADMIN_KEY" \
//     https://9lv.net/api/admin/player/Mu5tb3n1ce
router.delete('/player/:idOrHandle', async (req, res) => {
  try {
    const raw = String(req.params.idOrHandle || '').trim();
    if (!raw) return res.status(400).json({ error: 'idOrHandle required' });

    let playerId;
    if (/^\d+$/.test(raw)) {
      playerId = parseInt(raw, 10);
    } else {
      const handle = raw.replace(/^@/, '');
      const { data: lookup, error: lookupErr } = await supabaseAdmin
        .from('players')
        .select('id, twitter_handle')
        .ilike('twitter_handle', handle)
        .limit(1)
        .maybeSingle();
      if (lookupErr) throw lookupErr;
      if (!lookup) return res.status(404).json({ error: 'player_not_found', handle });
      playerId = lookup.id;
    }

    const { data: summary, error } = await supabaseAdmin.rpc('delete_player_cascade', {
      p_id: playerId,
    });
    if (error) throw error;
    res.json({ success: true, playerId, deleted: summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ╔═══════════════════════════════════╗
// ║  NERM BOT CONTROLS                 ║
// ╚═══════════════════════════════════╝

// GET /api/admin/test-nerm
router.get('/test-nerm', async (req, res) => {
  try {
    if (!nermBot) return res.status(500).json({ error: 'Nerm not loaded' });
    const user = await nermBot.testConnection();
    res.json({ success: !!user, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/nerm-post — make Nerm post
router.post('/nerm-post', async (req, res) => {
  try {
    if (!nermBot) return res.status(500).json({ error: 'Nerm not loaded' });
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const tweet = await nermBot.postAsNerm(message);
    res.json({ success: !!tweet, tweet_id: tweet ? tweet.id : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/nerm-generate — generate without posting
router.post('/nerm-generate', async (req, res) => {
  try {
    if (!nermBot) return res.status(500).json({ error: 'Nerm not loaded' });
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const response = await nermBot.generateCustomResponse(prompt);
    res.json({ success: !!response, response });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/nerm-status
router.get('/nerm-status', async (req, res) => {
  try {
    if (!nermBot) return res.json({ loaded: false });
    const status = nermBot.getRateLimitStatus();
    res.json({ loaded: true, ...status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ╔═══════════════════════════════════╗
// ║  TWITTER BOT CONTROLS              ║
// ╚═══════════════════════════════════╝

// GET /api/admin/test-bot
router.get('/test-bot', async (req, res) => {
  try {
    if (!twitterBot)
      return res.status(500).json({ error: 'Twitter bot not loaded' });
    const user = await twitterBot.testConnection();
    res.json({ success: !!user, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/post-objective
router.post('/post-objective', async (req, res) => {
  try {
    if (!twitterBot)
      return res.status(500).json({ error: 'Twitter bot not loaded' });
    const tweet = await twitterBot.postDailyObjective();
    res.json({ success: !!tweet, tweet_id: tweet ? tweet.id : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/process-casts
router.post('/process-casts', async (req, res) => {
  try {
    if (!twitterBot)
      return res.status(500).json({ error: 'Twitter bot not loaded' });
    const casts = await twitterBot.processSpellCasts();
    res.json({ success: true, processed: casts ? casts.length : 0, casts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ╔═══════════════════════════════════╗
// ║  ACTIVITY DECAY                    ║
// ╚═══════════════════════════════════╝

// POST /api/admin/activity-decay
router.post('/activity-decay', async (req, res) => {
  try {
    const result = await activityDecay.processActivityDecay();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/inactive-players
router.get('/inactive-players', async (req, res) => {
  try {
    const players = await activityDecay.getInactivePlayers();
    res.json(players || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ╔═══════════════════════════════════╗
// ║  RECENT ACTIONS (replaces casts)   ║
// ╚═══════════════════════════════════╝

// GET /api/admin/recent-actions — recent territory actions
router.get('/recent-actions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const { data, error } = await supabase
      .from('territory_actions')
      .select(
        'id, player_id, zone_id, action_type, spell_name, spell_rarity, points_earned, effects_applied, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ╔═══════════════════════════════════╗
// ║  SPELL IMAGE UPLOAD                ║
// ╚═══════════════════════════════════╝

// Use memory storage — file goes to Supabase Storage, not local disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.post(
  '/spell/:id/upload-image',
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: 'No image file provided' });
      const spellId = parseInt(req.params.id);
      const ext = path.extname(req.file.originalname).toLowerCase();
      const storagePath = `spell-${spellId}${ext}`;

      // Upload to Supabase Storage (upsert = overwrite if exists)
      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from('spell-images')
          .upload(storagePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true,
          });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('spell-images')
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // Save the full URL in the database
      const { data, error } = await supabaseAdmin
        .from('spells')
        .update({ image_url: publicUrl })
        .eq('id', spellId)
        .select()
        .single();
      if (error) throw error;

      console.log(`[Admin] Uploaded image for spell ${spellId}: ${publicUrl}`);
      res.json({
        success: true,
        filename: storagePath,
        url: publicUrl,
        spell: data,
      });
    } catch (e) {
      console.error('[Admin] Image upload error:', e.message);
      res.status(500).json({ error: e.message });
    }
  },
);

// ╔═══════════════════════════════════════════════════════════════════╗
// ║  ELIGIBILITY FLAGS — admin-side NFT/whitelist/giveaway curation   ║
// ║  (see project memory project_nft_as_withdrawal_key.md)            ║
// ╚═══════════════════════════════════════════════════════════════════╝
//
// Players never see these flags in v1. Wray sets them per-curation to
// build a snapshot of eligible (handle, wallet_address) pairs that any
// future airdrop tool can consume. No claim contract, no on-chain calls.

const FLAG_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;

// POST /api/admin/players/:id/eligibility
// Body: { flag: 'whitelist_round_1', value: true }
// Sets or unsets one key on players.eligibility_flags. value=false removes
// the key (instead of storing false) so flags-set checks remain truthy.
router.post('/players/:id/eligibility', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id, 10);
    if (!playerId || Number.isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player id' });
    }
    const { flag, value } = req.body || {};
    if (!flag || !FLAG_NAME_RE.test(String(flag))) {
      return res.status(400).json({
        error: 'flag must match ^[a-z][a-z0-9_]{0,63}$ (e.g. whitelist_round_1)',
      });
    }

    const { data: current, error: readErr } = await supabaseAdmin
      .from('players')
      .select('id, eligibility_flags, twitter_handle, wallet_address')
      .eq('id', playerId)
      .single();
    if (readErr || !current) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const flags = { ...(current.eligibility_flags || {}) };
    if (value === false || value === null) {
      delete flags[flag];
    } else {
      flags[flag] = true;
    }

    const { data: updated, error: writeErr } = await supabaseAdmin
      .from('players')
      .update({ eligibility_flags: flags })
      .eq('id', playerId)
      .select('id, twitter_handle, wallet_address, eligibility_flags')
      .single();
    if (writeErr) throw writeErr;

    console.log(
      `[admin/eligibility] player_id=${playerId} handle=${current.twitter_handle} flag=${flag} value=${flags[flag] ? 'true' : 'unset'}`,
    );

    res.json({
      success: true,
      player_id: updated.id,
      twitter_handle: updated.twitter_handle,
      wallet_address: updated.wallet_address || null,
      eligibility_flags: updated.eligibility_flags,
    });
  } catch (e) {
    console.error('[admin/eligibility] set error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// GET /api/admin/eligibility/:flag?format=csv|json (default json)
// Returns every player with the flag set to truthy. CSV mode emits a
// header + rows of handle,wallet_address,player_id, filtered to only
// rows that have a wallet_address — that's the airdrop-ready set.
router.get('/eligibility/:flag', async (req, res) => {
  try {
    const flag = String(req.params.flag || '');
    if (!FLAG_NAME_RE.test(flag)) {
      return res.status(400).json({ error: 'Invalid flag name' });
    }
    const format = (req.query.format || 'json').toLowerCase();

    const { data, error } = await supabaseAdmin
      .from('players')
      .select('id, twitter_handle, wallet_address, eligibility_flags, created_at')
      .filter(`eligibility_flags->>${flag}`, 'eq', 'true')
      .order('id', { ascending: true });
    if (error) throw error;

    const rows = data || [];

    if (format === 'csv') {
      const ready = rows.filter((r) => r.wallet_address);
      const lines = ['twitter_handle,wallet_address,player_id'];
      ready.forEach((r) => {
        // Defensive — none of these fields should contain commas, but escape anyway.
        const handle = String(r.twitter_handle || '').replace(/"/g, '""');
        const wallet = String(r.wallet_address || '').replace(/"/g, '""');
        lines.push(`"${handle}","${wallet}",${r.id}`);
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="eligibility-${flag}-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      return res.send(lines.join('\n') + '\n');
    }

    res.json({
      flag,
      total: rows.length,
      with_wallet: rows.filter((r) => r.wallet_address).length,
      players: rows.map((r) => ({
        id: r.id,
        twitter_handle: r.twitter_handle,
        wallet_address: r.wallet_address || null,
        created_at: r.created_at,
      })),
    });
  } catch (e) {
    console.error('[admin/eligibility] export error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

module.exports = router;
