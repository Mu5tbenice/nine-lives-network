// Pure-function score recompute + plausibility checks for survivors runs.
// Lives in its own file so __tests__/ can require it without dragging in
// supabaseAdmin (project test convention).
//
// PRD: tasks/prd-survivors-mode.md §4.6, §7. Score is kills-primary so
// the leaderboard ranks-by-kills and ranks-by-score agree closely.

const cfg = require('../config/survivors-difficulty');

/**
 * Authoritative score formula.
 *
 *   score = kills * (1 + log10(1 + time_sec / 60)) * (1 + level * 0.02)
 *
 * Sketch only — sim will tune the multipliers. The formula must keep
 * kills strictly dominant.
 */
function computeScore({ kills, time_sec, level }) {
  const k = Math.max(0, Number(kills) || 0);
  const t = Math.max(0, Number(time_sec) || 0);
  const lv = Math.max(1, Number(level) || 1);
  const timeBoost = 1 + Math.log10(1 + t / cfg.score_time_log_base);
  const levelBoost = 1 + lv * cfg.score_level_step;
  return Math.round(k * timeBoost * levelBoost);
}

/**
 * Plausibility check. Returns { ok: true } if the run looks legit, or
 * { ok: false, reason } if it should be rejected with 400.
 *
 * Rejects:
 *   • kills_per_minute > kills_per_min_ceiling
 *   • level grew faster than level_cap_per_minute (linear cap on level vs time)
 */
function plausibilityCheck({ kills, time_sec, level }) {
  const k = Math.max(0, Number(kills) || 0);
  const t = Math.max(0, Number(time_sec) || 0);
  const lv = Math.max(1, Number(level) || 1);

  if (t < 5 && k > 0) {
    return { ok: false, reason: 'run too short to have kills' };
  }

  const minutes = Math.max(1 / 60, t / 60); // 1-second floor
  const kpm = k / minutes;
  if (kpm > cfg.kills_per_min_ceiling) {
    return {
      ok: false,
      reason: `kills/min ${kpm.toFixed(1)} > ceiling ${cfg.kills_per_min_ceiling}`,
    };
  }

  const maxLevel = 1 + Math.floor(minutes * cfg.level_cap_per_minute);
  if (lv > maxLevel) {
    return {
      ok: false,
      reason: `level ${lv} > linear cap ${maxLevel} for ${t}s`,
    };
  }

  return { ok: true };
}

module.exports = { computeScore, plausibilityCheck };
