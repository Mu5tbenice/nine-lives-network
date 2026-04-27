// Pure-function validator for POST /api/survivors/runs.
// Lives in its own file so __tests__/ can require it without dragging in
// supabaseAdmin (which needs SUPABASE_URL at module load time and trips
// Jest if .env isn't injected).
//
// PRD: tasks/prd-survivors-mode.md §4.1, §4.6.

const crypto = require('crypto');

// Bounds match the CHECK constraints in migration 004 + the v2 anti-AFK
// ceilings from migration 010. PR-B will replace HOUSES with the full 9-house
// set; PR-D will add server-side score recompute. PR-A scope: telemetry only.
const HOUSES = new Set(['smoulders', 'darktide', 'stonebark', 'plaguemire']);
const MAX_TIME_SEC = 86400;
const MAX_LEVEL = 1000;
const MAX_KILLS = 100000;
const ENDED_REASONS = new Set(['death', 'crash', 'timeout', 'quit']);

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : NaN;
}

function toIntOr(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function generateSeed() {
  // Postgres BIGINT max is 2^63-1; stay well inside JS safe-integer range.
  return Number(crypto.randomBytes(6).readUIntBE(0, 6));
}

/**
 * Validate + sanitize a POST /api/survivors/runs body. Pure function — no I/O.
 * Returns { ok: true, row } where `row` is ready to insert, or
 *         { ok: false, status, error }.
 */
function validateSurvivorsRunBody(body) {
  body = body || {};

  const player_id = toInt(body.player_id);
  if (!Number.isFinite(player_id) || player_id <= 0) {
    return { ok: false, status: 400, error: 'player_id required' };
  }

  const house = String(body.house || '').toLowerCase();
  if (!HOUSES.has(house)) {
    return { ok: false, status: 400, error: 'invalid house' };
  }

  const time_sec = toInt(body.time_sec);
  if (!Number.isFinite(time_sec) || time_sec < 0 || time_sec > MAX_TIME_SEC) {
    return { ok: false, status: 400, error: 'invalid time_sec' };
  }

  const level = toInt(body.level);
  if (!Number.isFinite(level) || level < 1 || level > MAX_LEVEL) {
    return { ok: false, status: 400, error: 'invalid level' };
  }

  const kills = toInt(body.kills);
  if (!Number.isFinite(kills) || kills < 0 || kills > MAX_KILLS) {
    return { ok: false, status: 400, error: 'invalid kills' };
  }

  const chapter = toInt(body.chapter);
  if (!Number.isFinite(chapter) || chapter < 1 || chapter > 6) {
    return { ok: false, status: 400, error: 'invalid chapter' };
  }

  if (kills > time_sec * 12 + 50) {
    return { ok: false, status: 400, error: 'implausible kills/time ratio' };
  }

  const won = !!body.won;
  const display_name = typeof body.display_name === 'string'
    ? body.display_name.trim().slice(0, 24) || null
    : null;

  const seedRaw = toInt(body.seed);
  const seed = Number.isFinite(seedRaw) && seedRaw > 0 ? seedRaw : generateSeed();

  const score = Number.isFinite(toInt(body.score)) ? toInt(body.score) : null;

  const ended_reason = typeof body.ended_reason === 'string'
      && ENDED_REASONS.has(body.ended_reason)
    ? body.ended_reason
    : null;

  const cards_used = Array.isArray(body.cards_used) ? body.cards_used : null;

  const crystals_earned        = toIntOr(body.crystals_earned, 0);
  const crystals_spent_reroll  = toIntOr(body.crystals_spent_reroll, 0);
  const crystals_spent_upgrade = toIntOr(body.crystals_spent_upgrade, 0);

  const client_version = typeof body.client_version === 'string'
    ? body.client_version.slice(0, 32)
    : null;

  return {
    ok: true,
    row: {
      player_id,
      house,
      time_sec,
      level,
      kills,
      chapter,
      won,
      display_name,
      seed,
      score,
      ended_reason,
      cards_used,
      crystals_earned,
      crystals_spent_reroll,
      crystals_spent_upgrade,
      client_version,
    },
  };
}

module.exports = {
  validateSurvivorsRunBody,
  HOUSES,
  ENDED_REASONS,
  MAX_TIME_SEC,
  MAX_LEVEL,
  MAX_KILLS,
};
