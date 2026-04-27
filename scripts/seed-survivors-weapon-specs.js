#!/usr/bin/env node
//
// Seeds the 5 bespoke `survivors_weapon_specs` rows used by PR-C2's runtime.
// The sentinel fallback row (spell_id=0) is created by migration 011 — this
// script just adds the hand-tuned bespoke specs on top of it.
//
// Usage:  node scripts/seed-survivors-weapon-specs.js
//
// Picks (3 continuous, 2 activated — see PRD §4.3.14):
//
//   spell_id  name             behavior     why
//   1         Mana Bolt        continuous   classic projectile auto-fire (CHAIN)
//   19        Eruption         continuous   stationary DOT-zone (BURN) — different feel from a projectile
//   14        Cinder Guard     continuous   damage-reflect aura (THORNS) — radial, no projectile
//   30        Verdant Mend     activated    heal pulse — Q/E player-triggered (HEAL)
//   6         Hex Bolt         activated    CC burst — slows + chips on cooldown (HEX)
//
// Numeric values are starter knobs only; sim-tunable via the admin upsert
// endpoint (POST /api/admin/survivors/specs) after PR-C ships.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const supabase = require('../server/config/supabaseAdmin');

// Same rarity multipliers as the sentinel row (migration 011). Override per
// spec when sim signals a different curve.
const STANDARD_RARITY_SCALING = {
  common: 1.0,
  uncommon: 1.15,
  rare: 1.32,
  epic: 1.52,
  legendary: 1.75,
};

const SPECS = [
  // ── Continuous: classic projectile ──────────────────────────────────────
  {
    spell_id: 1, // Mana Bolt
    behavior_class: 'continuous',
    base_damage: 12,
    base_cooldown_ms: 850,
    projectile_speed: 540,
    aoe_radius: 0,
    pierce: 0,
    activated_keybind: null,
    rarity_scaling: STANDARD_RARITY_SCALING,
  },

  // ── Continuous: stationary DOT-zone ─────────────────────────────────────
  {
    spell_id: 19, // Eruption
    behavior_class: 'continuous',
    base_damage: 5,           // tick damage
    base_cooldown_ms: 350,    // tick interval (zone re-applies BURN this often)
    projectile_speed: 0,      // no projectile — drops at player or near hostile cluster
    aoe_radius: 90,
    pierce: 0,
    activated_keybind: null,
    rarity_scaling: STANDARD_RARITY_SCALING,
  },

  // ── Continuous: radial aura (no projectile, no zone) ────────────────────
  {
    spell_id: 14, // Cinder Guard
    behavior_class: 'continuous',
    base_damage: 4,           // damage per pulse
    base_cooldown_ms: 600,    // pulse interval
    projectile_speed: 0,
    aoe_radius: 110,
    pierce: 0,
    activated_keybind: null,
    rarity_scaling: STANDARD_RARITY_SCALING,
  },

  // ── Activated: heal pulse (player-triggered) ────────────────────────────
  {
    spell_id: 30, // Verdant Mend
    behavior_class: 'activated',
    base_damage: -36,         // negative = heal amount on cast
    base_cooldown_ms: 12000,  // 12s cooldown
    projectile_speed: 0,
    aoe_radius: 0,            // self-target
    pierce: 0,
    activated_keybind: null,  // bound client-side to Q or E in pickup order
    rarity_scaling: STANDARD_RARITY_SCALING,
  },

  // ── Activated: CC burst ─────────────────────────────────────────────────
  {
    spell_id: 6, // Hex Bolt
    behavior_class: 'activated',
    base_damage: 18,          // small chip dmg
    base_cooldown_ms: 9000,   // 9s cooldown
    projectile_speed: 480,    // travels to nearest enemy cluster
    aoe_radius: 80,           // explodes on impact, applies HEX
    pierce: 0,
    activated_keybind: null,
    rarity_scaling: STANDARD_RARITY_SCALING,
  },
];

async function main() {
  let inserted = 0;
  let updated = 0;

  for (const spec of SPECS) {
    const { data, error } = await supabase
      .from('survivors_weapon_specs')
      .upsert(spec, { onConflict: 'spell_id' })
      .select('spell_id');

    if (error) {
      console.error(`[seed] ${spec.spell_id} (${spec.behavior_class}) FAILED:`, error.message);
      process.exitCode = 1;
      continue;
    }
    if (data && data.length) {
      inserted += 1;
      console.log(`[seed] ${spec.spell_id} (${spec.behavior_class}) ok`);
    } else {
      updated += 1;
    }
  }

  // Confirm the count.
  const { data: rows } = await supabase
    .from('survivors_weapon_specs')
    .select('spell_id');
  console.log(`[seed] done. ${inserted} written; total rows in survivors_weapon_specs = ${rows ? rows.length : '?'}`);
}

main().catch((err) => {
  console.error('[seed] fatal:', err);
  process.exit(1);
});
