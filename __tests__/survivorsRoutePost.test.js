// Tests for PR-A survivors run POST validation. Pure-function tests against
// the exported validateSurvivorsRunBody helper — same shape as the rest of
// the project (no supertest, no DB mocks).
//
// PRD: tasks/prd-survivors-mode.md §4.1, §4.6.
// §9 entry: §9.111 (v1 anon path resolved).

const { validateSurvivorsRunBody: validate } = require(
  '../server/routes/survivorsRunValidator',
);

function legacyBody(overrides = {}) {
  // The shape v1 frontend currently sends, minus the new PR-A telemetry
  // fields. Used to confirm backward compat — old clients still validate as
  // long as they include player_id (the new requirement).
  return {
    player_id: 42,
    house: 'smoulders',
    time_sec: 600,
    level: 12,
    kills: 250,
    chapter: 3,
    won: false,
    display_name: 'TestPlayer',
    ...overrides,
  };
}

function fullBody(overrides = {}) {
  // The shape PR-D's frontend will send. Includes every new column.
  return {
    ...legacyBody(),
    seed: 1234567890,
    score: 9999,
    ended_reason: 'death',
    cards_used: [
      { spell_id: 101, final_rarity: 'rare' },
      { spell_id: 207, final_rarity: 'epic' },
    ],
    crystals_earned: 1500,
    crystals_spent_reroll: 200,
    crystals_spent_upgrade: 800,
    client_version: 'survivors-v2.0.0',
    ...overrides,
  };
}

describe('validateSurvivorsRunBody — anon-path rejection (§9.111)', () => {
  test('missing player_id → 400', () => {
    const body = legacyBody();
    delete body.player_id;
    const r = validate(body);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
    expect(r.error).toBe('player_id required');
  });

  test('null player_id → 400', () => {
    const r = validate(legacyBody({ player_id: null }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('player_id required');
  });

  test('player_id = 0 → 400 (must be positive integer)', () => {
    const r = validate(legacyBody({ player_id: 0 }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('player_id required');
  });

  test('player_id = "abc" (non-numeric) → 400', () => {
    const r = validate(legacyBody({ player_id: 'abc' }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('player_id required');
  });
});

describe('validateSurvivorsRunBody — happy path with all PR-A fields', () => {
  test('full body returns ok and a complete row', () => {
    const r = validate(fullBody());
    expect(r.ok).toBe(true);
    expect(r.row.player_id).toBe(42);
    expect(r.row.seed).toBe(1234567890);
    expect(r.row.score).toBe(9999);
    expect(r.row.ended_reason).toBe('death');
    expect(r.row.cards_used).toHaveLength(2);
    expect(r.row.crystals_earned).toBe(1500);
    expect(r.row.crystals_spent_reroll).toBe(200);
    expect(r.row.crystals_spent_upgrade).toBe(800);
    expect(r.row.client_version).toBe('survivors-v2.0.0');
  });

  test('every PR-A telemetry field is present on the returned row', () => {
    const r = validate(fullBody());
    const expected = [
      'player_id', 'house', 'time_sec', 'level', 'kills', 'chapter', 'won',
      'display_name', 'seed', 'score', 'ended_reason', 'cards_used',
      'crystals_earned', 'crystals_spent_reroll', 'crystals_spent_upgrade',
      'client_version',
    ];
    for (const key of expected) {
      expect(r.row).toHaveProperty(key);
    }
  });
});

describe('validateSurvivorsRunBody — backward compatibility', () => {
  test('legacy body (no PR-A fields) still validates with player_id', () => {
    const r = validate(legacyBody());
    expect(r.ok).toBe(true);
    expect(r.row.player_id).toBe(42);
    expect(r.row.house).toBe('smoulders');
    expect(r.row.score).toBeNull();
    expect(r.row.ended_reason).toBeNull();
    expect(r.row.cards_used).toBeNull();
    expect(r.row.client_version).toBeNull();
  });

  test('legacy body without seed still gets a server-generated seed', () => {
    const r = validate(legacyBody());
    expect(r.ok).toBe(true);
    expect(typeof r.row.seed).toBe('number');
    expect(r.row.seed).toBeGreaterThan(0);
  });

  test('crystals default to 0 when omitted', () => {
    const r = validate(legacyBody());
    expect(r.row.crystals_earned).toBe(0);
    expect(r.row.crystals_spent_reroll).toBe(0);
    expect(r.row.crystals_spent_upgrade).toBe(0);
  });
});

describe('validateSurvivorsRunBody — sanitization', () => {
  test('cards_used non-array is dropped to null', () => {
    const r = validate(fullBody({ cards_used: 'not an array' }));
    expect(r.ok).toBe(true);
    expect(r.row.cards_used).toBeNull();
  });

  test('ended_reason not in the allowlist is dropped to null', () => {
    const r = validate(fullBody({ ended_reason: 'rage_quit' }));
    expect(r.ok).toBe(true);
    expect(r.row.ended_reason).toBeNull();
  });

  test('client_version > 32 chars is truncated', () => {
    const long = 'x'.repeat(100);
    const r = validate(fullBody({ client_version: long }));
    expect(r.ok).toBe(true);
    expect(r.row.client_version.length).toBe(32);
  });

  test('display_name > 24 chars is truncated', () => {
    const r = validate(legacyBody({ display_name: 'x'.repeat(50) }));
    expect(r.ok).toBe(true);
    expect(r.row.display_name.length).toBe(24);
  });

  test('negative crystal values clamp to 0', () => {
    const r = validate(fullBody({ crystals_earned: -5 }));
    expect(r.ok).toBe(true);
    expect(r.row.crystals_earned).toBe(0);
  });
});

describe('validateSurvivorsRunBody — existing v1 invariants still hold', () => {
  test('invalid house → 400', () => {
    const r = validate(legacyBody({ house: 'definitely-not-real' }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid house');
  });

  test('time_sec above the v2 anti-AFK ceiling → 400', () => {
    const r = validate(legacyBody({ time_sec: 86401 }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid time_sec');
  });

  test('level above the v2 anti-AFK ceiling → 400', () => {
    const r = validate(legacyBody({ level: 1001 }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid level');
  });

  test('implausible kills/time ratio → 400', () => {
    const r = validate(legacyBody({ time_sec: 60, kills: 5000 }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('implausible kills/time ratio');
  });
});
