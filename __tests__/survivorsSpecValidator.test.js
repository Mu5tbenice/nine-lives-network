// Tests for the admin-upsert spec validator.
// Pure-function tests against survivorsSpecValidator.js — same convention
// as the project's other validator tests.
//
// PR-C1 — Survivors Mode v2.

const {
  validateSurvivorsSpecBody: validate,
  BEHAVIOR_CLASSES,
  RARITY_KEYS,
} = require('../server/routes/survivorsSpecValidator');

function spec(overrides = {}) {
  return {
    spell_id: 1,
    behavior_class: 'continuous',
    base_damage: 12,
    base_cooldown_ms: 850,
    projectile_speed: 540,
    aoe_radius: 0,
    pierce: 0,
    activated_keybind: null,
    rarity_scaling: {
      common: 1.0, uncommon: 1.15, rare: 1.32, epic: 1.52, legendary: 1.75,
    },
    ...overrides,
  };
}

describe('validateSurvivorsSpecBody — happy path', () => {
  test('continuous projectile validates', () => {
    const r = validate(spec());
    expect(r.ok).toBe(true);
    expect(r.row.spell_id).toBe(1);
    expect(r.row.behavior_class).toBe('continuous');
    expect(r.row.base_damage).toBe(12);
  });

  test('activated heal (negative damage) validates', () => {
    const r = validate(spec({ behavior_class: 'activated', base_damage: -36, activated_keybind: 'Q' }));
    expect(r.ok).toBe(true);
    expect(r.row.base_damage).toBe(-36);
    expect(r.row.activated_keybind).toBe('Q');
  });

  test('sentinel fallback (spell_id=0) validates', () => {
    const r = validate(spec({ spell_id: 0 }));
    expect(r.ok).toBe(true);
    expect(r.row.spell_id).toBe(0);
  });
});

describe('validateSurvivorsSpecBody — required fields', () => {
  test('missing spell_id → 400', () => {
    const r = validate(spec({ spell_id: undefined }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/spell_id/);
  });

  test('negative spell_id → 400', () => {
    const r = validate(spec({ spell_id: -1 }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/spell_id/);
  });

  test('missing behavior_class → 400', () => {
    const r = validate(spec({ behavior_class: undefined }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/behavior_class/);
  });

  test('invalid behavior_class enum value → 400', () => {
    const r = validate(spec({ behavior_class: 'passive' }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/continuous or activated/);
  });
});

describe('validateSurvivorsSpecBody — numeric ranges', () => {
  test('base_damage above ceiling → 400', () => {
    const r = validate(spec({ base_damage: 1e6 }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/base_damage/);
  });

  test('base_damage below floor → 400', () => {
    const r = validate(spec({ base_damage: -1e6 }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/base_damage/);
  });

  test('cooldown below floor → 400', () => {
    const r = validate(spec({ base_cooldown_ms: 10 }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/cooldown/);
  });

  test('cooldown above ceiling → 400', () => {
    const r = validate(spec({ base_cooldown_ms: 999_999 }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/cooldown/);
  });

  test('projectile_speed defaults to 0 when omitted', () => {
    const r = validate(spec({ projectile_speed: undefined }));
    expect(r.ok).toBe(true);
    expect(r.row.projectile_speed).toBe(0);
  });

  test('pierce above ceiling → 400', () => {
    const r = validate(spec({ pierce: 9999 }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/pierce/);
  });
});

describe('validateSurvivorsSpecBody — activated_keybind', () => {
  test('null keybind validates', () => {
    const r = validate(spec({ activated_keybind: null }));
    expect(r.ok).toBe(true);
    expect(r.row.activated_keybind).toBeNull();
  });

  test('"Q" keybind validates', () => {
    const r = validate(spec({ activated_keybind: 'Q' }));
    expect(r.ok).toBe(true);
    expect(r.row.activated_keybind).toBe('Q');
  });

  test('long string > 8 chars → 400', () => {
    const r = validate(spec({ activated_keybind: 'WAYTOOLONGSTRING' }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/activated_keybind/);
  });

  test('non-string → 400', () => {
    const r = validate(spec({ activated_keybind: 42 }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/activated_keybind/);
  });
});

describe('validateSurvivorsSpecBody — rarity_scaling', () => {
  test('null rarity_scaling validates', () => {
    const r = validate(spec({ rarity_scaling: null }));
    expect(r.ok).toBe(true);
    expect(r.row.rarity_scaling).toBeNull();
  });

  test('all 5 rarity keys with positive numbers validates', () => {
    const r = validate(spec());
    expect(r.ok).toBe(true);
    for (const k of RARITY_KEYS) {
      expect(r.row.rarity_scaling[k]).toBeGreaterThan(0);
    }
  });

  test('missing rarity key → 400', () => {
    const incomplete = { common: 1, uncommon: 1.1, rare: 1.2, epic: 1.3 };
    const r = validate(spec({ rarity_scaling: incomplete }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/legendary/);
  });

  test('zero multiplier → 400', () => {
    const broken = { common: 0, uncommon: 1.1, rare: 1.2, epic: 1.3, legendary: 1.4 };
    const r = validate(spec({ rarity_scaling: broken }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/positive/);
  });

  test('array (not object) → 400', () => {
    const r = validate(spec({ rarity_scaling: [1, 1.1, 1.2, 1.3, 1.4] }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/object/);
  });
});

describe('validateSurvivorsSpecBody — exports', () => {
  test('BEHAVIOR_CLASSES is the canonical set', () => {
    expect(BEHAVIOR_CLASSES.has('continuous')).toBe(true);
    expect(BEHAVIOR_CLASSES.has('activated')).toBe(true);
    expect(BEHAVIOR_CLASSES.size).toBe(2);
  });

  test('RARITY_KEYS lists the 5 canonical rarities in order', () => {
    expect(RARITY_KEYS).toEqual(['common', 'uncommon', 'rare', 'epic', 'legendary']);
  });
});
