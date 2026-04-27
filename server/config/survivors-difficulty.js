// Survivors Mode difficulty + economy knobs.
//
// All values are starter knobs only — sim-tunable. Rough notes on intent:
//
//   spawn_rate(t)        = base_spawn * (1 + t / T_double)^k_spawn
//   enemy_hp(t, round)   = hp0 * (1 + t / T_double)^k_hp * (1 + round * round_step)
//   enemy_dmg(t, round)  = dmg0 * (1 + t / T_double)^k_dmg * (1 + round * round_step)
//   elite_chance(t)      = clamp(t / T_elite, 0, 0.35)
//   round_boss_hp(round) = boss_hp0 * (1 + round * boss_step)
//
// PR-D — server-side knobs consumed by score recompute + plausibility checks.
// PRD: tasks/prd-survivors-mode.md §7.

module.exports = {
  // Time-driven curves
  T_double: 120,        // seconds for difficulty to double
  k_spawn: 0.85,
  k_hp: 1.1,
  k_dmg: 0.7,
  T_elite: 600,         // elite chance ramp
  cap_concurrent_enemies: 250,

  // Round-driven curves
  round_step: 0.20,     // per-round HP/DMG multiplier bump
  boss_step: 0.35,      // per-round boss HP bump
  round_length_sec: 180,

  // Base values
  base_spawn: 1.5,
  hp0: 10,
  dmg0: 2,
  boss_hp0: 200,

  // Anti-cheat ceilings (PR-D plausibility checks)
  kills_per_min_ceiling: 600, // 10 KPS sustained — anything higher rejects
  level_cap_per_minute: 5,    // can't grow more than 5 levels/min sustained

  // Crystal economy (mirrors public/js/survivors/cards.js values for the
  // server-side leaderboard / payout math)
  legendary_dup_crystal_payout: 200,

  // Score formula multipliers
  score_time_log_base: 60,    // time term divisor before log10
  score_level_step: 0.02,     // level multiplier slope
};
