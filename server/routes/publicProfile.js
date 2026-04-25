// ══════════════════════════════════════════════════════════════════════
// server/routes/publicProfile.js
// ──────────────────────────────────────────────────────────────────────
// Public, shareable player profile pages at /p/<handle>. Server-renders
// HTML with per-player Open Graph + Twitter Card meta tags so that links
// shared on X / Telegram / Discord produce rich preview cards. The full
// character-sprite hero + audience flex sections land in PR 2; v1 ships
// a minimal placeholder with the OG tag scaffolding. See
// docs/ux-information-architecture.md for the architecture.
// ══════════════════════════════════════════════════════════════════════
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const supabaseAdmin = require('../config/supabaseAdmin');
const {
  renderProfileTemplate,
  buildShareText,
  HOUSES,
} = require('./publicProfileRender');

const router = express.Router();

const TEMPLATE_PATH = path.join(
  __dirname,
  '../../public/profile-public.template.html',
);
const NOT_FOUND_PATH = path.join(__dirname, '../../public/profile-404.html');

// Read template once at module load. Server boots are infrequent enough
// that re-reading per request is unnecessary; if we ever need hot-reload
// in dev we can add NODE_ENV-gated re-read here.
let TEMPLATE = '';
try {
  TEMPLATE = fs.readFileSync(TEMPLATE_PATH, 'utf8');
} catch (err) {
  console.error('[publicProfile] template read failed:', err.message);
}

// Lookup is case-insensitive — players register with whatever Twitter
// returns and handles in the wild get shared in mixed case (`/p/MyHandle`,
// `/p/myhandle` should resolve identically). Migration 005 adds a unique
// partial index on LOWER(twitter_handle) so this lookup is safe.
async function lookupPlayerByHandle(handle) {
  if (!handle) return null;
  const lower = String(handle).toLowerCase().replace(/^@/, '');
  const { data, error } = await supabaseAdmin
    .from('players')
    .select(
      'id, twitter_handle, school_id, guild_tag, lifetime_points, seasonal_points, streak, duel_wins, duel_losses, duel_elo, profile_image, is_active, created_at',
    )
    .ilike('twitter_handle', lower)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[publicProfile] lookup error:', error.message);
    return null;
  }
  return data || null;
}

async function fetchLevel(playerId) {
  if (!playerId) return { level: 1, xp: 0 };
  const { data, error } = await supabaseAdmin
    .from('player_levels')
    .select('level, xp')
    .eq('player_id', playerId)
    .maybeSingle();
  if (error || !data) return { level: 1, xp: 0 };
  return { level: data.level || 1, xp: data.xp || 0 };
}

router.get('/:handle', async (req, res) => {
  // Fast-fail for handles with characters that can't be Twitter handles —
  // avoids a DB hit on obvious 404s (favicon.ico, robots.txt accidents,
  // bot probes). Twitter handles are 1-15 chars, alphanumeric + underscore.
  const raw = req.params.handle || '';
  if (!/^@?[A-Za-z0-9_]{1,15}$/.test(raw)) {
    return res.status(404).sendFile(NOT_FOUND_PATH);
  }

  const player = await lookupPlayerByHandle(raw);
  if (!player) return res.status(404).sendFile(NOT_FOUND_PATH);

  const level = await fetchLevel(player.id);
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const html = renderProfileTemplate(TEMPLATE, player, {
    level: level.level,
    baseUrl,
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

module.exports = router;
module.exports._internals = {
  lookupPlayerByHandle,
  fetchLevel,
  HOUSES,
  buildShareText,
  renderProfileTemplate,
};
