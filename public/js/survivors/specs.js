// Survivors weapon-spec runtime.
//
// Loads `survivors_weapon_specs` from the server once per page life and
// exposes:
//   • fetchSpecs()       — async, cached singleton.
//   • lookupSpec(id, fb) — returns the spec for a spell_id, falling back
//                          to the sentinel (spell_id=0) if missing.
//   • specToWeaponDef(spec, card)
//                        — converts a spec row into a WEAPON_DEFS-compatible
//                          definition the existing engine can fire.
//
// PR-C2 — Survivors Mode v2.

const SPECS_URL = "/api/survivors/specs";

let _cache = null; // { specs: [...], byId: Map<spell_id, spec> }
let _inflight = null;

export async function fetchSpecs() {
  if (_cache) return _cache;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      const res = await fetch(SPECS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`specs ${res.status}`);
      const body = await res.json();
      const specs = body.specs || [];
      const byId = new Map(specs.map(s => [Number(s.spell_id), s]));
      _cache = { specs, byId };
      return _cache;
    } finally {
      _inflight = null;
    }
  })();
  return _inflight;
}

export function lookupSpec(spellId) {
  if (!_cache) return null;
  const spec = _cache.byId.get(Number(spellId));
  if (spec) return spec;
  return _cache.byId.get(0) || null; // sentinel fallback
}

// Apply rarity scaling multiplier to a base value. Uses the spec's own
// rarity_scaling map; falls back to 1.0 if the rarity isn't recognized.
export function rarityMultiplier(spec, rarity) {
  if (!spec || !spec.rarity_scaling) return 1.0;
  const r = String(rarity || 'common').toLowerCase();
  return Number(spec.rarity_scaling[r]) || 1.0;
}

// ── Spec → engine-weapon adapter ────────────────────────────────────────
//
// The existing weapons.js engine fires by `def.kind` ∈ projectile / aura /
// rotating / slam / stun / puddle / orbit. Map continuous specs to one of
// those kinds via a small heuristic on the spec values:
//
//   projectile_speed > 0                              → "projectile"
//   aoe_radius > 0  AND  base_cooldown_ms ≤  450 ms   → "puddle" (DOT-zone)
//   aoe_radius > 0  AND  base_cooldown_ms >  450 ms   → "aura"   (radial pulse)
//
// PR-C3 may add an explicit `kind` column on survivors_weapon_specs if
// the heuristic stops holding for new content. For PR-C2's seeded specs
// (Mana Bolt projectile, Eruption puddle@350ms, Cinder Guard aura@600ms)
// the heuristic maps cleanly.

export function inferKind(spec) {
  if (!spec) return "projectile";
  if ((spec.projectile_speed || 0) > 0) return "projectile";
  if ((spec.aoe_radius || 0) > 0) {
    return (spec.base_cooldown_ms || 1000) <= 450 ? "puddle" : "aura";
  }
  // No projectile, no aoe — fall back to a self-targeted aura at radius 80.
  return "aura";
}

/**
 * Build a WEAPON_DEFS-shaped def that the existing weapons.js engine can
 * fire. Pure function — no DOM, no I/O. Tested in
 * __tests__/survivorsSpecAdapter.test.js.
 *
 * The "levels" array contains a single entry rather than 5 since per-level
 * scaling for spec weapons is driven by rarity (PR-C3 will hook the rarity
 * bump path). Player passives still apply via the engine's stats() helper.
 */
export function specToContinuousDef(spec, card) {
  const cardName = (card && card.spell && card.spell.name) || (card && card.name) || `spell ${spec.spell_id}`;
  const cardArt  = card && card.spell && card.spell.image_url
    ? (card.spell.image_url.indexOf("http") === 0 || card.spell.image_url.indexOf("/") === 0
        ? card.spell.image_url
        : `/assets/images/spells/${card.spell.image_url}`)
    : null;

  const mult = rarityMultiplier(spec, card && card.rarity);
  const kind = inferKind(spec);

  // Common base level — populated per-kind below.
  const baseDmg  = (Number(spec.base_damage) || 0) * mult;
  const baseCd   = Number(spec.base_cooldown_ms) || 1000;
  const baseSpd  = Number(spec.projectile_speed) || 0;
  const baseAoe  = Number(spec.aoe_radius) || 0;
  const basePier = Number(spec.pierce) || 0;

  let level;
  switch (kind) {
    case "projectile":
      level = { cd: baseCd, dmg: baseDmg, count: 1, spd: baseSpd, pierce: basePier, homing: 0.04, aoe: 0 };
      break;
    case "aura":
      level = { tickMs: baseCd, dmg: baseDmg, radius: baseAoe || 100 };
      break;
    case "puddle":
      level = { cd: baseCd, dmg: baseDmg, radius: baseAoe || 80, ttl: 4000 };
      break;
    default:
      level = { cd: baseCd, dmg: baseDmg, count: 1, spd: baseSpd || 400, pierce: 0, homing: 0, aoe: 0 };
  }

  return {
    id: `spec_${spec.spell_id}`,
    name: cardName,
    kind,
    art: cardArt,
    levels: [level],
    // Marker fields for the runtime — not consumed by the existing engine.
    isSpec: true,
    spellId: Number(spec.spell_id),
    rarity: (card && card.rarity) || 'common',
  };
}

/**
 * Build an activated weapon entry. Activated weapons don't tick under the
 * continuous engine — they're held in player.activatedSlots and fire on
 * key press (Q / E) when their cooldown is ≤ 0.
 */
export function specToActivatedEntry(spec, card, key) {
  const cardName = (card && card.spell && card.spell.name) || (card && card.name) || `spell ${spec.spell_id}`;
  const cardArt  = card && card.spell && card.spell.image_url
    ? (card.spell.image_url.indexOf("http") === 0 || card.spell.image_url.indexOf("/") === 0
        ? card.spell.image_url
        : `/assets/images/spells/${card.spell.image_url}`)
    : null;

  const mult = rarityMultiplier(spec, card && card.rarity);

  return {
    spellId: Number(spec.spell_id),
    key,
    name: cardName,
    art: cardArt,
    rarity: (card && card.rarity) || 'common',
    behavior: 'activated',
    baseDamage: (Number(spec.base_damage) || 0) * mult,
    cooldownMs: Number(spec.base_cooldown_ms) || 9000,
    projectileSpeed: Number(spec.projectile_speed) || 0,
    aoeRadius: Number(spec.aoe_radius) || 0,
    pierce: Number(spec.pierce) || 0,
    cdLeft: 0,
  };
}

// PR-C3 — rarity bump chain. Duplicate cards in the level-up flow walk a
// single rarity tier upward (cap at legendary, where the level-up handler
// converts to a fixed crystal payout instead).
export const RARITY_CHAIN = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export function bumpRarity(rarity) {
  const i = RARITY_CHAIN.indexOf(String(rarity || 'common').toLowerCase());
  if (i < 0) return 'uncommon';
  if (i >= RARITY_CHAIN.length - 1) return 'legendary'; // already at cap
  return RARITY_CHAIN[i + 1];
}

export function isAtMaxRarity(rarity) {
  return String(rarity || '').toLowerCase() === 'legendary';
}

// Recompute a continuous spec weapon's level entry after its in-run rarity
// bumps. Mutates `weaponEntry.def.levels[0]` in place — same shape that
// specToContinuousDef produced, just with the new multiplier applied.
// Used by the level-up upgrade handler in main.js.
export function recomputeSpecWeapon(weaponEntry, spec, newRarity) {
  if (!weaponEntry || !weaponEntry.def || !spec) return;
  const mult = rarityMultiplier(spec, newRarity);
  const baseDmg = (Number(spec.base_damage) || 0) * mult;
  const lv = weaponEntry.def.levels[0];
  if (!lv) return;
  lv.dmg = baseDmg;
  weaponEntry.def.rarity = newRarity;
}

// Same idea for activated slots — bump in-place.
export function recomputeActivatedSlot(slot, spec, newRarity) {
  if (!slot || !spec) return;
  const mult = rarityMultiplier(spec, newRarity);
  slot.baseDamage = (Number(spec.base_damage) || 0) * mult;
  slot.rarity = newRarity;
}

// Test hooks (exported for jest in node).
export function _resetCacheForTesting() { _cache = null; _inflight = null; }
