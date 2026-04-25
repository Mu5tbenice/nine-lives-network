// ══════════════════════════════════════════════════════════════════════
// server/routes/publicProfileRender.js
// ──────────────────────────────────────────────────────────────────────
// Pure helpers for the /p/<handle> public profile route. Lives in its own
// module so unit tests can exercise the template + share-text logic
// without standing up Supabase or Express. See publicProfile.js for the
// route handler that wires this into the app.
// ══════════════════════════════════════════════════════════════════════
'use strict';

// House metadata mirrors the client side (register.html HOUSES + the
// /design.md house-color table). Kept as a small constant here so we
// don't have to ship a JSON file or query the DB for cosmetic data
// every page render.
const HOUSES = {
  1: { name: 'Smoulders',   color: '#E03C31', image: '/assets/images/houses/House-smoulders.png' },
  2: { name: 'Darktide',    color: '#00B4D8', image: '/assets/images/houses/House-darktide.png' },
  3: { name: 'Stonebark',   color: '#5CB338', image: '/assets/images/houses/House-stonebark.png' },
  4: { name: 'Ashenvale',   color: '#B0C4DE', image: '/assets/images/houses/House-Ashenvale.png' },
  5: { name: 'Stormrage',   color: '#FFC800', image: '/assets/images/houses/House-stormrage.png' },
  6: { name: 'Nighthollow', color: '#7B2D8E', image: '/assets/images/houses/House-nighthollow.png' },
  7: { name: 'Dawnbringer', color: '#FF8C00', image: '/assets/images/houses/House-dawnbringer.png' },
  8: { name: 'Manastorm',   color: '#5B8FE0', image: '/assets/images/houses/House-manastorm.png' },
  9: { name: 'Plaguemire',  color: '#E84393', image: '/assets/images/houses/House-plaguemire.png' },
};

const DEFAULT_OG_IMAGE = '/assets/images/title-nethara.png';

/**
 * Minimal HTML escape for placeholder values. Profile text fields come from
 * Twitter (handle) and our own DB columns (guild tag, points, etc.) — none
 * are rich user input, but escaping is cheap and stops any future
 * "guild tag = `<script>`" footgun cold.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build the share-to-X tweet template for the COPY LINK / SHARE ON X buttons.
 * Kept as a pure function so the message stays consistent and is easy to
 * iterate on in tests.
 */
function buildShareText({ handle, houseName, level, lifetimePoints, baseUrl }) {
  const url = `${baseUrl || 'https://9lv.net'}/p/${encodeURIComponent(
    String(handle || '').toLowerCase(),
  )}`;
  return [
    `Level ${level || 1} ${houseName || 'Nine'} on Nine Lives Network`,
    `${(lifetimePoints || 0).toLocaleString()} lifetime points`,
    `See my Nine: ${url}`,
    `$9LV @9LVNetwork`,
  ].join('\n');
}

/**
 * Replace template placeholders with player-specific values. Pure — no DB,
 * no fs, no req/res. The route handler reads the template at boot and
 * passes it in.
 *
 * `options.level` is the current player level (defaults to 1 if the
 * player hasn't been seeded into player_levels yet).
 * `options.baseUrl` is the canonical origin used to build absolute OG /
 * share URLs (e.g. "https://9lv.net").
 */
function renderProfileTemplate(template, player, options = {}) {
  if (!template) return '';
  const house = HOUSES[player && player.school_id] || HOUSES[1];
  const level = options.level || 1;
  const baseUrl = options.baseUrl || 'https://9lv.net';

  const handle = player && player.twitter_handle ? player.twitter_handle : 'unknown';
  const handleLower = String(handle).toLowerCase();
  const lifetimePoints = (player && player.lifetime_points) || 0;
  const streak = (player && player.streak) || 0;
  const duelElo = (player && player.duel_elo) || 1000;
  const guildTag = player && player.guild_tag ? player.guild_tag : null;

  const guildDisplay = guildTag
    ? guildTag.startsWith('@') || guildTag === handle
      ? 'NO GUILD'
      : `[${guildTag.toUpperCase()}]`
    : 'LONE WOLF';

  const ogImage = options.ogImage || `${baseUrl}${DEFAULT_OG_IMAGE}`;
  const ogUrl = `${baseUrl}/p/${encodeURIComponent(handleLower)}`;

  const shareText = buildShareText({
    handle: handleLower,
    houseName: house.name,
    level,
    lifetimePoints,
    baseUrl,
  });

  const replacements = {
    '{{handle}}': escapeHtml(handle),
    '{{handle_lower}}': escapeHtml(handleLower),
    '{{house_name}}': escapeHtml(house.name.toUpperCase()),
    '{{house_color}}': house.color,
    '{{house_image}}': house.image,
    '{{level}}': String(level),
    '{{lifetime_points}}': lifetimePoints.toLocaleString(),
    '{{streak}}': String(streak),
    '{{duel_elo}}': String(duelElo),
    '{{guild_display}}': escapeHtml(guildDisplay),
    '{{og_image}}': escapeHtml(ogImage),
    '{{og_url}}': escapeHtml(ogUrl),
    '{{player_id}}': escapeHtml(player ? player.id : ''),
    '{{share_text_encoded}}': encodeURIComponent(shareText),
  };

  let out = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    out = out.split(placeholder).join(value);
  }
  return out;
}

module.exports = {
  renderProfileTemplate,
  buildShareText,
  escapeHtml,
  HOUSES,
  DEFAULT_OG_IMAGE,
};
