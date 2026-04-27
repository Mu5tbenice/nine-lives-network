const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseAdmin');
const packSystem = require('../services/packSystem');
const {
  validateSurvivorsRunBody,
  HOUSES,
  DRAFT_SIZE,
} = require('./survivorsRunValidator');

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : NaN;
}

// Canonical 9-house catalogue served by GET /api/survivors/start. Mirrors the
// register.html / card-v4.js list — same color, sigil path, base stats. The
// `passive_hint` text is a one-liner the picker UI can show alongside the
// stat bars; PR-C will replace it with the actual passive ability spec when
// per-house passives ship.
const HOUSE_CATALOGUE = [
  { id: 'smoulders',   name: 'Smoulders',   color: '#E03C31', img: '/assets/images/houses/House-smoulders.png',  role: 'Glass Cannon',     base: { atk: 6, hp: 12, spd: 5, def: 0, luck: 1 }, passive_hint: 'Kills fast, dies fast.' },
  { id: 'darktide',    name: 'Darktide',    color: '#00B4D8', img: '/assets/images/houses/House-darktide.png',   role: 'Thief / Vampire',  base: { atk: 4, hp: 16, spd: 4, def: 1, luck: 1 }, passive_hint: 'Steals HP and buffs.' },
  { id: 'stonebark',   name: 'Stonebark',   color: '#5CB338', img: '/assets/images/houses/House-stonebark.png',  role: 'Wall / Tank',      base: { atk: 2, hp: 24, spd: 2, def: 3, luck: 0 }, passive_hint: 'Barely scratches but never dies.' },
  { id: 'ashenvale',   name: 'Ashenvale',   color: '#B0C4DE', img: '/assets/images/houses/House-Ashenvale.png',  role: 'Rogue / Speed',    base: { atk: 3, hp: 14, spd: 8, def: 0, luck: 2 }, passive_hint: 'Always acts first, dodges.' },
  { id: 'stormrage',   name: 'Stormrage',   color: '#FFC800', img: '/assets/images/houses/House-stormrage.png',  role: 'Burst / Crit',     base: { atk: 7, hp: 10, spd: 6, def: 0, luck: 2 }, passive_hint: 'Highest damage, lowest survival.' },
  { id: 'nighthollow', name: 'Nighthollow', color: '#7B2D8E', img: '/assets/images/houses/House-nighthollow.png',role: 'Disruptor / Luck', base: { atk: 4, hp: 13, spd: 7, def: 0, luck: 3 }, passive_hint: 'Shuts down enemy abilities.' },
  { id: 'dawnbringer', name: 'Dawnbringer', color: '#FF8C00', img: '/assets/images/houses/House-dawnbringer.png',role: 'Healer / Support', base: { atk: 3, hp: 18, spd: 3, def: 2, luck: 0 }, passive_hint: 'Keeps allies alive.' },
  { id: 'manastorm',   name: 'Manastorm',   color: '#5B8FE0', img: '/assets/images/houses/House-manastorm.png',  role: 'Controller',       base: { atk: 5, hp: 14, spd: 5, def: 1, luck: 1 }, passive_hint: 'Cancels and drains.' },
  { id: 'plaguemire',  name: 'Plaguemire',  color: '#E84393', img: '/assets/images/houses/House-plaguemire.png', role: 'DOT / Attrition',  base: { atk: 3, hp: 15, spd: 4, def: 2, luck: 1 }, passive_hint: 'Poisons everything slowly.' },
];

const MIN_COLLECTION_SIZE = DRAFT_SIZE; // 2

/**
 * GET /api/survivors/start?player_id=NNN
 *
 * Returns the data the start screen needs to render: house list, the
 * player's eligible draft pool from `player_cards`, and a play-gate flag
 * (`canPlay=false` + `blockReason='insufficient_collection'` when the
 * player has fewer than DRAFT_SIZE cards opened).
 *
 * The frontend reads `localStorage.player_id` per the canonical 9LN auth
 * pattern (see register.html / dashboard.html). Server doesn't yet enforce
 * session ownership of the queried player_id (logged §9.106) — PR-D or a
 * later session-middleware PR will harden this.
 */
router.get('/start', async (req, res) => {
  try {
    const player_id = toInt(req.query.player_id);
    if (!Number.isFinite(player_id) || player_id <= 0) {
      return res.status(400).json({ error: 'player_id required' });
    }

    const cardsRaw = await packSystem.getCollection(player_id);

    // Flatten the join shape for the canonical buildCardV4() consumer.
    // Each entry keeps `id` (player_cards PK — the draft id) plus a `spell`
    // sub-object holding the canonical card-v4 fields.
    const cards = (cardsRaw || []).map((c) => ({
      id: c.id,
      player_id: c.player_id,
      spell_id: c.spell_id,
      rarity: c.rarity,
      sharpness: c.sharpness ?? 100,
      acquired_at: c.acquired_at,
      spell: c.spell || null,
    }));

    const canPlay = cards.length >= MIN_COLLECTION_SIZE;
    const blockReason = canPlay ? null : 'insufficient_collection';

    return res.json({
      ok: true,
      player_id,
      houses: HOUSE_CATALOGUE,
      cards,
      canPlay,
      blockReason,
      draft_size: DRAFT_SIZE,
      min_collection_size: MIN_COLLECTION_SIZE,
    });
  } catch (err) {
    console.error('GET /api/survivors/start:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * POST /api/survivors/runs
 * Record the outcome of a finished run. Requires player_id (PR-A — §9.111)
 * and `drafted_card_ids: [int, int]` whose ids belong to the session
 * player's `player_cards` (PR-B).
 *
 * `score` from the client is currently accepted as a hint — PR-D adds the
 * server-side recompute and starts ignoring the client value. `seed`
 * defaults to a server-generated value when omitted.
 */
router.post('/runs', async (req, res) => {
  try {
    const validated = validateSurvivorsRunBody(req.body);
    if (!validated.ok) {
      return res.status(validated.status).json({ error: validated.error });
    }
    const { row, drafted_card_ids } = validated;

    // Ownership check — drafted ids must belong to the player.
    const { data: ownedRows, error: ownErr } = await supabase
      .from('player_cards')
      .select('id')
      .eq('player_id', row.player_id)
      .in('id', drafted_card_ids);

    if (ownErr) {
      console.error('survivors ownership check error:', ownErr);
      return res.status(500).json({ error: 'ownership check failed' });
    }

    const ownedSet = new Set((ownedRows || []).map((r) => r.id));
    const allOwned = drafted_card_ids.every((id) => ownedSet.has(id));
    if (!allOwned) {
      return res.status(403).json({ error: 'drafted_card_ids not owned by player' });
    }

    // Stamp the drafted ids onto cards_used if the client didn't supply a
    // richer per-card snapshot. Schema column is JSONB, accepts either shape.
    const cards_used = row.cards_used
      ? row.cards_used
      : drafted_card_ids.map((id) => ({ player_card_id: id }));

    const { data, error } = await supabase
      .from('survivors_runs')
      .insert({ ...row, cards_used })
      .select('id, created_at, seed')
      .single();

    if (error) {
      console.error('survivors insert error:', error);
      return res.status(500).json({ error: 'insert failed' });
    }

    res.json({ ok: true, id: data.id, created_at: data.created_at, seed: data.seed });
  } catch (err) {
    console.error('POST /api/survivors/runs:', err);
    res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/survivors/specs
 *
 * Returns every row from `survivors_weapon_specs` joined with the
 * underlying spell's name + image_url + house so the client runtime
 * (PR-C2) can map drafted card spell_ids to weapon behavior + visuals.
 *
 * Result is cached in-process for SPECS_CACHE_TTL_MS to avoid hitting the
 * DB on every survivors session boot. PR-C2's runtime calls this once on
 * run start. Admin upserts (POST /api/admin/survivors/specs) invalidate
 * the cache.
 */
const SPECS_CACHE_TTL_MS = 60_000;
let specsCache = { value: null, expiresAt: 0 };
function invalidateSpecsCache() { specsCache = { value: null, expiresAt: 0 }; }

router.get('/specs', async (req, res) => {
  try {
    const now = Date.now();
    if (specsCache.value && specsCache.expiresAt > now) {
      return res.json(specsCache.value);
    }

    // No FK is declared on survivors_weapon_specs.spell_id (deferred from
    // PR-A migration 011 to keep the schema independent of spell catalog
    // state). Without an FK, PostgREST's nested-resource embedding fails
    // — so we return flat rows here. The client already has spell metadata
    // from /api/packs/collection/:player_id and looks up spec by spell_id.
    const { data, error } = await supabase
      .from('survivors_weapon_specs')
      .select('spell_id, behavior_class, base_damage, base_cooldown_ms, projectile_speed, aoe_radius, pierce, activated_keybind, rarity_scaling, updated_at')
      .order('spell_id', { ascending: true });

    if (error) {
      console.error('survivors specs query error:', error);
      return res.status(500).json({ error: 'specs query failed' });
    }

    const payload = { ok: true, specs: data || [], cached_at: new Date(now).toISOString() };
    specsCache = { value: payload, expiresAt: now + SPECS_CACHE_TTL_MS };
    return res.json(payload);
  } catch (err) {
    console.error('GET /api/survivors/specs:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Exposed so the admin upsert route can flush the cache after a write.
router.invalidateSpecsCache = invalidateSpecsCache;
module.exports.invalidateSpecsCache = invalidateSpecsCache;

/**
 * GET /api/survivors/runs/top?limit=10&house=smoulders
 * Leaderboard — longest surviving runs first. Optionally filter by house.
 * (PR-D replaces this with kills-primary ranking + windowed views.)
 */
router.get('/runs/top', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, toInt(req.query.limit) || 10));
    let q = supabase
      .from('survivors_runs')
      .select('id, display_name, house, time_sec, level, kills, chapter, won, created_at')
      .order('time_sec', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (req.query.house) {
      const h = String(req.query.house).toLowerCase();
      if (HOUSES.has(h)) q = q.eq('house', h);
    }

    const { data, error } = await q;
    if (error) {
      console.error('survivors top error:', error);
      return res.status(500).json({ error: 'query failed' });
    }
    res.json(data || []);
  } catch (err) {
    console.error('GET /api/survivors/runs/top:', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
