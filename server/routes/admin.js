// ═══════════════════════════════════════════════════════
// server/routes/admin.js
// Admin panel API — zones, clashes, spells, scheduler
// All routes require x-admin-key header
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const territoryControl = require('../services/territoryControl');
const activityDecay = require('../services/activityDecay');
const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Optional modules
let twitterBot = null;
let nermBot = null;
let scheduler = null;
try { twitterBot = require('../services/twitterBot'); } catch (e) {}
try { nermBot = require('../services/nermBot'); } catch (e) {}
try { scheduler = require('../services/scheduler'); } catch (e) {}

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
    const { data: players } = await supabase.from('players').select('id').eq('is_active', true);
    const { data: zones } = await supabase.from('zones').select('id, name, is_current_objective, controlling_school_id');
    const { data: spells } = await supabase.from('spells').select('id').eq('is_active', true);

    const today = new Date().toISOString().split('T')[0];
    const { data: todayActions } = await supabase.from('territory_actions').select('id').eq('game_day', today);

    const objective = zones ? zones.find(z => z.is_current_objective) : null;
    const controlled = zones ? zones.filter(z => z.controlling_school_id).length : 0;

    res.json({
      total_players: players ? players.length : 0,
      active_spells: spells ? spells.length : 0,
      total_zones: zones ? zones.length : 0,
      zones_controlled: controlled,
      actions_today: todayActions ? todayActions.length : 0,
      current_objective: objective ? objective.name : 'None set',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/scheduler-status — cron job health
router.get('/scheduler-status', async (req, res) => {
  try {
    const status = scheduler ? scheduler.getJobStatus() : { initialized: false, lastRuns: {} };
    res.json(status);
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/force-objective — set random or specific objective
router.post('/force-objective', async (req, res) => {
  try {
    const { zone_id } = req.body;

    if (zone_id) {
      // Set specific zone
      await supabaseAdmin.from('zones').update({ is_current_objective: false }).eq('is_current_objective', true);
      await supabaseAdmin.from('zones').update({ is_current_objective: true }).eq('id', zone_id);
      res.json({ success: true, zone_id });
    } else {
      // Random
      const id = await territoryControl.setRandomObjective();
      res.json({ success: true, zone_id: id });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/reset-mana — reset all player mana to 7
router.post('/reset-mana', async (req, res) => {
  try {
    await supabaseAdmin.from('players').update({ mana: 7 }).eq('is_active', true);
    res.json({ success: true, message: 'All players mana reset to 7' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ╔═══════════════════════════════════╗
// ║  ZONE MANAGEMENT                   ║
// ╚═══════════════════════════════════╝

// GET /api/admin/zones — list all zones
router.get('/zones', async (req, res) => {
  try {
    const { data, error } = await supabase.from('zones').select('*').order('id');
    if (error) throw error;
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/zone/:id — update a zone
router.put('/zone/:id', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    const allowed = ['name', 'description', 'image_url', 'video_url', 'zone_type', 'bonus_effect', 'is_current_objective'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabaseAdmin.from('zones').update(updates).eq('id', zoneId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/zones — create a zone
router.post('/zones', async (req, res) => {
  try {
    const { name, description, zone_type, image_url, video_url, bonus_effect } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const { data, error } = await supabaseAdmin.from('zones').insert({
      name, description: description || '',
      zone_type: zone_type || 'neutral',
      image_url: image_url || null,
      video_url: video_url || null,
      bonus_effect: bonus_effect || null,
    }).select().single();

    if (error) throw error;
    res.json({ success: true, zone: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/zone/:id — delete a zone
router.delete('/zone/:id', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    const { error } = await supabaseAdmin.from('zones').delete().eq('id', zoneId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/zone/:id/objective — toggle objective
router.post('/zone/:id/objective', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    // Clear all objectives first
    await supabaseAdmin.from('zones').update({ is_current_objective: false }).eq('is_current_objective', true);
    // Set this one
    await supabaseAdmin.from('zones').update({ is_current_objective: true }).eq('id', zoneId);
    res.json({ success: true, zone_id: zoneId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/zone/:id/bonus — set bonus effect
router.post('/zone/:id/bonus', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    const { bonus_effect } = req.body;
    await supabaseAdmin.from('zones').update({ bonus_effect: bonus_effect || null }).eq('id', zoneId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/zone-influence/:id — detailed influence for a zone
router.get('/zone-influence/:id', async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    const today = new Date().toISOString().split('T')[0];
    const influence = await territoryControl.getAllZoneInfluence(today);
    res.json({ zone_id: zoneId, influence: influence[zoneId] || {} });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ╔═══════════════════════════════════╗
// ║  COMMUNITY CLASH MANAGEMENT        ║
// ╚═══════════════════════════════════╝

// GET /api/admin/clashes — list active clashes
router.get('/clashes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('community_clashes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Format for frontend compatibility
    const formatted = (data || []).map(c => ({
      id: c.id,
      team_a: { tag: c.team_a_tag, color: c.team_a_color, points: c.team_a_points },
      team_b: { tag: c.team_b_tag, color: c.team_b_color, points: c.team_b_points },
      season: c.season,
      week: c.week,
      is_active: c.is_active,
    }));

    res.json(formatted);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/clashes — create a clash
router.post('/clashes', async (req, res) => {
  try {
    const { team_a_tag, team_a_color, team_b_tag, team_b_color, season, week } = req.body;
    if (!team_a_tag || !team_b_tag) return res.status(400).json({ error: 'Both team tags required' });

    const { data, error } = await supabaseAdmin.from('community_clashes').insert({
      team_a_tag,
      team_a_color: team_a_color || '#D4A64B',
      team_b_tag,
      team_b_color: team_b_color || '#00D4FF',
      season: season || 0,
      week: week || 1,
    }).select().single();

    if (error) throw error;
    res.json({ success: true, clash: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/clash/:id — update a clash
router.put('/clash/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const allowed = ['team_a_tag', 'team_a_color', 'team_b_tag', 'team_b_color',
                     'team_a_points', 'team_b_points', 'season', 'week', 'is_active'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const { data, error } = await supabaseAdmin.from('community_clashes').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/clash/:id — delete a clash
router.delete('/clash/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabaseAdmin.from('community_clashes').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ╔═══════════════════════════════════╗
// ║  SPELL MANAGEMENT                  ║
// ╚═══════════════════════════════════╝

// GET /api/admin/spells — list all spells
router.get('/spells', async (req, res) => {
  try {
    const { data, error } = await supabase.from('spells').select('*').order('id');
    if (error) throw error;
    res.json({ spells: data || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/spells — create spell
router.post('/spells', async (req, res) => {
  try {
    const { name, slug, house, tier, mana_cost, spell_type, base_effect, bonus_effects, flavor_text, motto } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });

    const { data, error } = await supabaseAdmin.from('spells').insert({
      name: name.trim(),
      slug: slug.trim(),
      house: house || 'universal',
      tier: tier || 0,
      mana_cost: mana_cost || 1,
      spell_type: spell_type || 'attack',
      base_effect: base_effect || '+10 influence',
      bonus_effects: JSON.stringify(bonus_effects || []),
      flavor_text: flavor_text || '',
      motto: motto || null,
      is_active: true,
      is_always_available: false,
    }).select().single();

    if (error) throw error;
    console.log('[Admin] Created spell: ' + data.id + ' - ' + data.name);
    res.json({ success: true, spell: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/spell/:id — update spell
router.put('/spell/:id', async (req, res) => {
  try {
    const spellId = parseInt(req.params.id);
    const allowed = ['name', 'slug', 'house', 'tier', 'mana_cost', 'spell_type',
       'base_effect', 'bonus_effects', 'flavor_text', 'motto',
       'is_active', 'is_always_available', 'image_url', 'in_pack_pool',
       'base_atk', 'base_hp', 'base_spd', 'base_def', 'base_luck',
       'rarity_weights'];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) {
        updates[f] = f === 'bonus_effects' ? JSON.stringify(req.body[f]) : req.body[f];
      }
    });

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });

    const { data, error } = await supabaseAdmin.from('spells').update(updates).eq('id', spellId).select().single();
    if (error) throw error;
    res.json({ success: true, spell: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/spell/:id — delete spell
router.delete('/spell/:id', async (req, res) => {
  try {
    const spellId = parseInt(req.params.id);

    // Don't delete always-available spells
    const { data: spell } = await supabase.from('spells').select('is_always_available, name').eq('id', spellId).single();
    if (!spell) return res.status(404).json({ error: 'Spell not found' });
    if (spell.is_always_available) return res.status(400).json({ error: 'Cannot delete always-available spells' });

    const { error } = await supabaseAdmin.from('spells').delete().eq('id', spellId);
    if (error) throw error;
    console.log('[Admin] Deleted spell: ' + spellId + ' - ' + spell.name);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ╔═══════════════════════════════════╗
// ║  PLAYER MANAGEMENT                 ║
// ╚═══════════════════════════════════╝

// GET /api/admin/players — list all players
router.get('/players', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, twitter_handle, school_id, community_tag, mana, seasonal_points, lifetime_points, streak, lives, arcane_energy, is_active, created_at')
      .order('seasonal_points', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/player/:id — update player
router.put('/player/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const allowed = ['mana', 'seasonal_points', 'lifetime_points', 'streak', 'lives', 'arcane_energy', 'is_active', 'school_id', 'community_tag'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const { data, error } = await supabaseAdmin.from('players').update(updates).eq('id', playerId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/nerm-post — make Nerm post
router.post('/nerm-post', async (req, res) => {
  try {
    if (!nermBot) return res.status(500).json({ error: 'Nerm not loaded' });
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const tweet = await nermBot.postAsNerm(message);
    res.json({ success: !!tweet, tweet_id: tweet ? tweet.id : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/nerm-generate — generate without posting
router.post('/nerm-generate', async (req, res) => {
  try {
    if (!nermBot) return res.status(500).json({ error: 'Nerm not loaded' });
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const response = await nermBot.generateCustomResponse(prompt);
    res.json({ success: !!response, response });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/nerm-status
router.get('/nerm-status', async (req, res) => {
  try {
    if (!nermBot) return res.json({ loaded: false });
    const status = nermBot.getRateLimitStatus();
    res.json({ loaded: true, ...status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ╔═══════════════════════════════════╗
// ║  TWITTER BOT CONTROLS              ║
// ╚═══════════════════════════════════╝

// GET /api/admin/test-bot
router.get('/test-bot', async (req, res) => {
  try {
    if (!twitterBot) return res.status(500).json({ error: 'Twitter bot not loaded' });
    const user = await twitterBot.testConnection();
    res.json({ success: !!user, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/post-objective
router.post('/post-objective', async (req, res) => {
  try {
    if (!twitterBot) return res.status(500).json({ error: 'Twitter bot not loaded' });
    const tweet = await twitterBot.postDailyObjective();
    res.json({ success: !!tweet, tweet_id: tweet ? tweet.id : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/process-casts
router.post('/process-casts', async (req, res) => {
  try {
    if (!twitterBot) return res.status(500).json({ error: 'Twitter bot not loaded' });
    const casts = await twitterBot.processSpellCasts();
    res.json({ success: true, processed: casts ? casts.length : 0, casts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ╔═══════════════════════════════════╗
// ║  ACTIVITY DECAY                    ║
// ╚═══════════════════════════════════╝

// POST /api/admin/activity-decay
router.post('/activity-decay', async (req, res) => {
  try {
    const result = await activityDecay.processActivityDecay();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/inactive-players
router.get('/inactive-players', async (req, res) => {
  try {
    const players = await activityDecay.getInactivePlayers();
    res.json(players || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
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
      .select('id, player_id, zone_id, action_type, spell_name, spell_rarity, points_earned, effects_applied, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ╔═══════════════════════════════════╗
// ║  SPELL IMAGE UPLOAD                ║
// ╚═══════════════════════════════════╝

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/assets/images/spells'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const spellId = req.params.id;
    const safeName = `spell-${spellId}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

router.post('/spell/:id/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const spellId = parseInt(req.params.id);
    const filename = req.file.filename;
    const { data, error } = await supabaseAdmin
      .from('spells')
      .update({ image_url: filename })
      .eq('id', spellId)
      .select()
      .single();
    if (error) throw error;
    console.log(`[Admin] Uploaded image for spell ${spellId}: ${filename}`);
    res.json({ success: true, filename, spell: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// GUILD CLASH ADMIN ROUTES
// Add these to your existing server/routes/admin.js file
// (paste at the bottom, BEFORE the module.exports line)
// ═══════════════════════════════════════════════════════

/**
 * POST /api/admin/clashes
 * Create a new guild clash matchup
 */
router.post('/clashes', async (req, res) => {
  try {
    const { week, guild_a, guild_b, color_a, color_b, status, score_a, score_b } = req.body;

    if (!guild_a || !guild_b) {
      return res.status(400).json({ error: 'Both guild names are required' });
    }

    const { data: clash, error } = await supabase
      .from('guild_clashes')
      .insert({
        week: week || 1,
        guild_a,
        guild_b,
        color_a: color_a || '#FFD700',
        color_b: color_b || '#00BFFF',
        status: status || 'upcoming',
        score_a: score_a || 0,
        score_b: score_b || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating clash:', error);
      return res.status(500).json({ error: 'Failed to create clash' });
    }

    res.json(clash);
  } catch (error) {
    console.error('Error in create clash:', error);
    res.status(500).json({ error: 'Failed to create clash' });
  }
});

/**
 * PUT /api/admin/clashes/:id
 * Update a clash matchup (scores, status, etc.)
 */
router.put('/clashes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    // Only include fields that were sent
    const allowed = ['week', 'guild_a', 'guild_b', 'color_a', 'color_b', 'status', 'score_a', 'score_b'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const { data: clash, error } = await supabase
      .from('guild_clashes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating clash:', error);
      return res.status(500).json({ error: 'Failed to update clash' });
    }

    res.json(clash);
  } catch (error) {
    console.error('Error in update clash:', error);
    res.status(500).json({ error: 'Failed to update clash' });
  }
});

/**
 * DELETE /api/admin/clashes/:id
 * Delete a clash matchup
 */
router.delete('/clashes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('guild_clashes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting clash:', error);
      return res.status(500).json({ error: 'Failed to delete clash' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in delete clash:', error);
    res.status(500).json({ error: 'Failed to delete clash' });
  }
});
module.exports = router;