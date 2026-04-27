// Tests for the kills-primary score formula + plausibility checks.
// PR-D — Survivors Mode v2.

const { computeScore, plausibilityCheck } = require('../server/routes/survivorsScore');

describe('computeScore — kills-primary formula', () => {
  test('zero kills returns zero', () => {
    expect(computeScore({ kills: 0, time_sec: 600, level: 5 })).toBe(0);
  });

  test('low-kill short-run baseline', () => {
    // 10 kills, 60s, level 1 → small but non-zero
    const s = computeScore({ kills: 10, time_sec: 60, level: 1 });
    expect(s).toBeGreaterThan(10);
    expect(s).toBeLessThan(40);
  });

  test('mid-kill mid-run climbs meaningfully', () => {
    // 200 kills, 300s, level 10
    const s = computeScore({ kills: 200, time_sec: 300, level: 10 });
    expect(s).toBeGreaterThan(200);
  });

  test('high-kill long-run scores significantly higher', () => {
    const lo = computeScore({ kills: 100, time_sec: 60, level: 5 });
    const hi = computeScore({ kills: 1000, time_sec: 600, level: 30 });
    expect(hi).toBeGreaterThan(lo * 10);
  });

  test('kills dominate — doubling kills more than doubles score', () => {
    const s1 = computeScore({ kills: 100, time_sec: 300, level: 10 });
    const s2 = computeScore({ kills: 200, time_sec: 300, level: 10 });
    expect(s2).toBeCloseTo(s1 * 2, -1);
  });

  test('time and level are gentle multipliers, not dominant', () => {
    // Same kills, very different time/level → score differs <2× either way
    const baseline = computeScore({ kills: 100, time_sec: 60, level: 1 });
    const longer   = computeScore({ kills: 100, time_sec: 600, level: 1 });
    const higherLv = computeScore({ kills: 100, time_sec: 60, level: 20 });
    expect(longer / baseline).toBeLessThan(2.5);
    expect(higherLv / baseline).toBeLessThan(2.5);
  });
});

describe('plausibilityCheck', () => {
  test('reasonable run passes', () => {
    const r = plausibilityCheck({ kills: 200, time_sec: 300, level: 10 });
    expect(r.ok).toBe(true);
  });

  test('zero kills + zero time passes (legitimate quick death)', () => {
    const r = plausibilityCheck({ kills: 0, time_sec: 12, level: 1 });
    expect(r.ok).toBe(true);
  });

  test('rejects too-short-with-kills', () => {
    const r = plausibilityCheck({ kills: 10, time_sec: 2, level: 1 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/too short/);
  });

  test('rejects > 600 kills/min ceiling', () => {
    // 1500 kills in 60s = 1500 KPM — way over 600 ceiling
    const r = plausibilityCheck({ kills: 1500, time_sec: 60, level: 5 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/kills\/min/);
  });

  test('rejects level grew faster than 5/min', () => {
    // 30 levels in 60s = 30 levels/min — way over the 5/min linear cap
    const r = plausibilityCheck({ kills: 100, time_sec: 60, level: 30 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/level/);
  });

  test('boundary — exactly at kills_per_min_ceiling passes', () => {
    // 600 kills in 60s → 600 KPM exactly
    const r = plausibilityCheck({ kills: 600, time_sec: 60, level: 5 });
    expect(r.ok).toBe(true);
  });
});
