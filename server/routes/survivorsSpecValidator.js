// Pure-function validator for the admin upsert at
// POST /api/admin/survivors/specs.
//
// Lives in its own file so __tests__/ can require it without dragging in
// supabaseAdmin (project test convention).
//
// PRD: tasks/prd-survivors-mode.md §4.9 (admin tuning).

const BEHAVIOR_CLASSES = new Set(['continuous', 'activated']);

// Loose ceilings — tunable via the same admin endpoint, but reject anything
// out-of-band as a typo guard. Sim will eventually pin tighter values.
const MAX_BASE_DAMAGE = 10000;       // hard ceiling; allow negatives for heal specs
const MIN_BASE_DAMAGE = -10000;
const MAX_COOLDOWN_MS = 60000;       // 60s — anything longer is almost certainly wrong
const MIN_COOLDOWN_MS = 50;          // 50ms — cap the lower bound to avoid tick storms
const MAX_PROJECTILE_SPEED = 5000;
const MAX_AOE_RADIUS = 2000;
const MAX_PIERCE = 50;

const RARITY_KEYS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function inRange(v, min, max) {
  return isFiniteNumber(v) && v >= min && v <= max;
}

/**
 * Validate + sanitize a spec body. Returns { ok: true, row } or
 * { ok: false, status, error }. Caller upserts the row by `spell_id`.
 */
function validateSurvivorsSpecBody(body) {
  body = body || {};

  const spell_id = parseInt(body.spell_id, 10);
  if (!Number.isFinite(spell_id) || spell_id < 0) {
    return { ok: false, status: 400, error: 'spell_id required (positive int or 0 for fallback)' };
  }

  const behavior_class = String(body.behavior_class || '').toLowerCase();
  if (!BEHAVIOR_CLASSES.has(behavior_class)) {
    return { ok: false, status: 400, error: 'behavior_class must be continuous or activated' };
  }

  const base_damage = Number(body.base_damage);
  if (!inRange(base_damage, MIN_BASE_DAMAGE, MAX_BASE_DAMAGE)) {
    return { ok: false, status: 400, error: `base_damage must be in [${MIN_BASE_DAMAGE}, ${MAX_BASE_DAMAGE}]` };
  }

  const base_cooldown_ms = parseInt(body.base_cooldown_ms, 10);
  if (!inRange(base_cooldown_ms, MIN_COOLDOWN_MS, MAX_COOLDOWN_MS)) {
    return { ok: false, status: 400, error: `base_cooldown_ms must be in [${MIN_COOLDOWN_MS}, ${MAX_COOLDOWN_MS}]` };
  }

  const projectile_speed = Number(body.projectile_speed ?? 0);
  if (!inRange(projectile_speed, 0, MAX_PROJECTILE_SPEED)) {
    return { ok: false, status: 400, error: `projectile_speed must be in [0, ${MAX_PROJECTILE_SPEED}]` };
  }

  const aoe_radius = Number(body.aoe_radius ?? 0);
  if (!inRange(aoe_radius, 0, MAX_AOE_RADIUS)) {
    return { ok: false, status: 400, error: `aoe_radius must be in [0, ${MAX_AOE_RADIUS}]` };
  }

  const pierce = parseInt(body.pierce ?? 0, 10);
  if (!inRange(pierce, 0, MAX_PIERCE)) {
    return { ok: false, status: 400, error: `pierce must be in [0, ${MAX_PIERCE}]` };
  }

  // activated_keybind is nullable. If present, must be a single-char-ish
  // string ≤ 8 chars (so 'Q', 'E', 'KeyQ' all fit).
  let activated_keybind = body.activated_keybind ?? null;
  if (activated_keybind !== null && activated_keybind !== undefined) {
    if (typeof activated_keybind !== 'string' || activated_keybind.length > 8) {
      return { ok: false, status: 400, error: 'activated_keybind must be a string ≤ 8 chars or null' };
    }
  } else {
    activated_keybind = null;
  }

  // rarity_scaling JSONB — if provided, must contain all 5 rarity keys with
  // positive numeric multipliers.
  let rarity_scaling = body.rarity_scaling ?? null;
  if (rarity_scaling !== null && rarity_scaling !== undefined) {
    if (typeof rarity_scaling !== 'object' || Array.isArray(rarity_scaling)) {
      return { ok: false, status: 400, error: 'rarity_scaling must be an object' };
    }
    for (const key of RARITY_KEYS) {
      const v = rarity_scaling[key];
      if (!isFiniteNumber(v) || v <= 0) {
        return { ok: false, status: 400, error: `rarity_scaling.${key} must be a positive number` };
      }
    }
  } else {
    rarity_scaling = null;
  }

  return {
    ok: true,
    row: {
      spell_id,
      behavior_class,
      base_damage,
      base_cooldown_ms,
      projectile_speed,
      aoe_radius,
      pierce,
      activated_keybind,
      rarity_scaling,
    },
  };
}

module.exports = {
  validateSurvivorsSpecBody,
  BEHAVIOR_CLASSES,
  RARITY_KEYS,
  MAX_BASE_DAMAGE,
  MIN_BASE_DAMAGE,
  MAX_COOLDOWN_MS,
  MIN_COOLDOWN_MS,
  MAX_PROJECTILE_SPEED,
  MAX_AOE_RADIUS,
  MAX_PIERCE,
};
