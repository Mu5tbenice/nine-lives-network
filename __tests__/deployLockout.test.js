// Tests for §9.46 + §9.67 deploy-lockout predicate.
// See server/services/deployLockout.js for behavior spec.

const { shouldBlockDeploy } = require('../server/services/deployLockout');

function makeZs({
  roundState = 'FIGHTING',
  roundEndsAt = Date.now() + 120_000,
  nines = [],
} = {}) {
  return {
    roundState,
    roundEndsAt,
    nines: new Map(nines.map((n) => [n.deploymentId, n])),
  };
}

describe('shouldBlockDeploy', () => {
  const NOW = 1_700_000_000_000;

  test('genuine 2-guild round with time remaining → BLOCK', () => {
    const zs = makeZs({
      roundEndsAt: NOW + 60_000,
      nines: [
        { deploymentId: 1, playerId: 10, guildTag: 'A' },
        { deploymentId: 2, playerId: 20, guildTag: 'B' },
      ],
    });
    const r = shouldBlockDeploy({ zoneState: zs, playerId: 99, now: NOW });
    expect(r.block).toBe(true);
    expect(r.msLeft).toBe(60_000);
  });

  test('single-guild zone → ALLOW (no contest)', () => {
    const zs = makeZs({
      roundEndsAt: NOW + 60_000,
      nines: [
        { deploymentId: 1, playerId: 10, guildTag: 'A' },
        { deploymentId: 2, playerId: 11, guildTag: 'A' },
      ],
    });
    const r = shouldBlockDeploy({ zoneState: zs, playerId: 99, now: NOW });
    expect(r.block).toBe(false);
  });

  test('stale FIGHTING (roundEndsAt in the past) → ALLOW', () => {
    const zs = makeZs({
      roundEndsAt: NOW - 5_000,
      nines: [
        { deploymentId: 1, playerId: 10, guildTag: 'A' },
        { deploymentId: 2, playerId: 20, guildTag: 'B' },
      ],
    });
    const r = shouldBlockDeploy({ zoneState: zs, playerId: 99, now: NOW });
    expect(r.block).toBe(false);
  });

  test('self-reswap during contested round → ALLOW', () => {
    const zs = makeZs({
      roundEndsAt: NOW + 60_000,
      nines: [
        { deploymentId: 1, playerId: 10, guildTag: 'A' },
        { deploymentId: 2, playerId: 20, guildTag: 'B' },
      ],
    });
    const r = shouldBlockDeploy({ zoneState: zs, playerId: 10, now: NOW });
    expect(r.block).toBe(false);
  });

  test('INTERMISSION → ALLOW regardless of other state', () => {
    const zs = makeZs({
      roundState: 'INTERMISSION',
      roundEndsAt: NOW + 60_000,
      nines: [
        { deploymentId: 1, playerId: 10, guildTag: 'A' },
        { deploymentId: 2, playerId: 20, guildTag: 'B' },
      ],
    });
    const r = shouldBlockDeploy({ zoneState: zs, playerId: 99, now: NOW });
    expect(r.block).toBe(false);
  });

  test('no zone state loaded → ALLOW (zone not in engine)', () => {
    const r = shouldBlockDeploy({ zoneState: null, playerId: 99, now: NOW });
    expect(r.block).toBe(false);
  });

  test('empty zone (no Nines) during FIGHTING → ALLOW', () => {
    const zs = makeZs({ roundEndsAt: NOW + 60_000, nines: [] });
    const r = shouldBlockDeploy({ zoneState: zs, playerId: 99, now: NOW });
    expect(r.block).toBe(false);
  });

  test('playerId comparison is string-tolerant (int vs string)', () => {
    const zs = makeZs({
      roundEndsAt: NOW + 60_000,
      nines: [
        { deploymentId: 1, playerId: 10, guildTag: 'A' },
        { deploymentId: 2, playerId: 20, guildTag: 'B' },
      ],
    });
    const r = shouldBlockDeploy({ zoneState: zs, playerId: '10', now: NOW });
    expect(r.block).toBe(false);
  });

  test('msLeft reflects remaining time when block fires', () => {
    const zs = makeZs({
      roundEndsAt: NOW + 37_500,
      nines: [
        { deploymentId: 1, playerId: 10, guildTag: 'A' },
        { deploymentId: 2, playerId: 20, guildTag: 'B' },
      ],
    });
    const r = shouldBlockDeploy({ zoneState: zs, playerId: 99, now: NOW });
    expect(r.block).toBe(true);
    expect(r.msLeft).toBe(37_500);
  });
});
