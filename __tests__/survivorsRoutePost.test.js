// Tests for survivors run POST validation. Pure-function tests against
// the exported validateSurvivorsRunBody helper — same shape as the rest of
// the project (no supertest, no DB mocks).
//
// PR-A (§9.111) — anon-path rejection + telemetry fields.
// PR-B — 9-house allowlist + drafted_card_ids[2] required.
// PRD: tasks/prd-survivors-mode.md §4.1, §4.6.

const {
  validateSurvivorsRunBody: validate,
  HOUSES,
  DRAFT_SIZE,
} = require('../server/routes/survivorsRunValidator');

function bodyV2(overrides = {}) {
  // PR-B v2 client shape — includes drafted_card_ids (now required).
  return {
    player_id: 42,
    house: 'smoulders',
    time_sec: 600,
    level: 12,
    kills: 250,
    chapter: 3,
    won: false,
    display_name: 'TestPlayer',
    drafted_card_ids: [101, 207],
    ...overrides,
  };
}

function fullBody(overrides = {}) {
  // Every column the schema knows about.
  return {
    ...bodyV2(),
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
    const body = bodyV2();
    delete body.player_id;
    const r = validate(body);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
    expect(r.error).toBe('player_id required');
  });

  test('null player_id → 400', () => {
    const r = validate(bodyV2({ player_id: null }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('player_id required');
  });

  test('player_id = 0 → 400 (must be positive integer)', () => {
    const r = validate(bodyV2({ player_id: 0 }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('player_id required');
  });

  test('player_id = "abc" (non-numeric) → 400', () => {
    const r = validate(bodyV2({ player_id: 'abc' }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('player_id required');
  });
});

describe('validateSurvivorsRunBody — happy path with full v2 body', () => {
  test('full body returns ok and a complete row', () => {
    const r = validate(fullBody());
    expect(r.ok).toBe(true);
    expect(r.row.player_id).toBe(42);
    expect(r.row.seed).toBe(1234567890);
    expect(r.row.score).toBe(9999);
    expect(r.row.ended_reason).toBe('death');
    expect(r.row.cards_used).toHaveLength(2);
    expect(r.row.crystals_earned).toBe(1500);
    expect(r.drafted_card_ids).toEqual([101, 207]);
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

  test('minimal v2 body without optional fields still validates', () => {
    const r = validate(bodyV2());
    expect(r.ok).toBe(true);
    expect(r.row.player_id).toBe(42);
    expect(r.row.score).toBeNull();
    expect(r.row.ended_reason).toBeNull();
    expect(r.row.cards_used).toBeNull();
    expect(r.row.client_version).toBeNull();
    expect(r.drafted_card_ids).toEqual([101, 207]);
  });
});

describe('validateSurvivorsRunBody — drafted_card_ids (PR-B)', () => {
  test('missing drafted_card_ids → 400', () => {
    const body = bodyV2();
    delete body.drafted_card_ids;
    const r = validate(body);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('drafted_card_ids required');
  });

  test('drafted_card_ids non-array → 400', () => {
    const r = validate(bodyV2({ drafted_card_ids: 'not-an-array' }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('drafted_card_ids required');
  });

  test('drafted_card_ids length 1 → 400', () => {
    const r = validate(bodyV2({ drafted_card_ids: [101] }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('drafted_card_ids must contain exactly 2 ids');
  });

  test('drafted_card_ids length 3 → 400', () => {
    const r = validate(bodyV2({ drafted_card_ids: [101, 207, 309] }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('drafted_card_ids must contain exactly 2 ids');
  });

  test('drafted_card_ids contains zero/negative → 400', () => {
    const r = validate(bodyV2({ drafted_card_ids: [101, 0] }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('drafted_card_ids must be positive integers');
  });

  test('drafted_card_ids contains non-numeric → 400', () => {
    const r = validate(bodyV2({ drafted_card_ids: [101, 'foo'] }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('drafted_card_ids must be positive integers');
  });

  test('drafted_card_ids stringy ints normalize correctly', () => {
    const r = validate(bodyV2({ drafted_card_ids: ['101', '207'] }));
    expect(r.ok).toBe(true);
    expect(r.drafted_card_ids).toEqual([101, 207]);
  });

  test('DRAFT_SIZE export matches expected v1 (2)', () => {
    expect(DRAFT_SIZE).toBe(2);
  });
});

describe('validateSurvivorsRunBody — 9-house allowlist (PR-B)', () => {
  test.each([
    'smoulders', 'darktide', 'stonebark', 'ashenvale', 'stormrage',
    'nighthollow', 'dawnbringer', 'manastorm', 'plaguemire',
  ])('canonical house "%s" validates', (house) => {
    const r = validate(bodyV2({ house }));
    expect(r.ok).toBe(true);
    expect(r.row.house).toBe(house);
  });

  test('house allowlist size matches the 9-house canon', () => {
    expect(HOUSES.size).toBe(9);
  });

  test('uppercase house input is normalized to lowercase', () => {
    const r = validate(bodyV2({ house: 'STORMRAGE' }));
    expect(r.ok).toBe(true);
    expect(r.row.house).toBe('stormrage');
  });

  test('non-canonical house → 400', () => {
    const r = validate(bodyV2({ house: 'totally-not-a-house' }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid house');
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
    const r = validate(bodyV2({ display_name: 'x'.repeat(50) }));
    expect(r.ok).toBe(true);
    expect(r.row.display_name.length).toBe(24);
  });

  test('negative crystal values clamp to 0', () => {
    const r = validate(fullBody({ crystals_earned: -5 }));
    expect(r.ok).toBe(true);
    expect(r.row.crystals_earned).toBe(0);
  });

  test('seed defaults to a server-generated positive value when omitted', () => {
    const body = bodyV2();
    delete body.seed;
    const r = validate(body);
    expect(r.ok).toBe(true);
    expect(typeof r.row.seed).toBe('number');
    expect(r.row.seed).toBeGreaterThan(0);
  });
});

describe('validateSurvivorsRunBody — anti-AFK invariants', () => {
  test('time_sec above the v2 anti-AFK ceiling → 400', () => {
    const r = validate(bodyV2({ time_sec: 86401 }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid time_sec');
  });

  test('level above the v2 anti-AFK ceiling → 400', () => {
    const r = validate(bodyV2({ level: 1001 }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid level');
  });

  test('implausible kills/time ratio → 400', () => {
    const r = validate(bodyV2({ time_sec: 60, kills: 5000 }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('implausible kills/time ratio');
  });
});
