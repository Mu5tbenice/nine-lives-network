// Tests for arena PR-1 — name the cast.
// `combat:attack` and `combat:effect` socket payloads now include `card_name`
// so the client log can render named beats ("Goosebumps's Cinder Snap → Velvet -38").

const {
  buildAttackBroadcastPayload,
  buildEffectBroadcastPayload,
  buildWindupBroadcastPayload,
  classifyEffectRecipient,
} = require('../server/services/combatEnginePayloads');

const caster = {
  playerId: 'p-caster',
  playerName: 'Goosebumps',
  guildTag: 'ALPHA',
  x: 100,
  y: 200,
};

const defender = {
  playerId: 'p-defender',
  playerName: 'Velvet',
  guildTag: 'BETA',
  x: 300,
  y: 250,
};

const cinderSnap = {
  id: 42,
  slug: 'cinder-snap',
  name: 'Cinder Snap',
  effect_1: 'BURN',
};

describe('buildAttackBroadcastPayload — PR-1 card_name field', () => {
  test('payload includes card_name from card.name', () => {
    const out = buildAttackBroadcastPayload({
      caster,
      defender,
      dmg: 38,
      isCrit: false,
      critMult: 1,
      slot: 0,
      card: cinderSnap,
      hp: 62,
      maxHp: 100,
    });
    expect(out.card_name).toBe('Cinder Snap');
  });

  test('payload preserves existing fields the client depends on', () => {
    const out = buildAttackBroadcastPayload({
      caster,
      defender,
      dmg: 38,
      isCrit: true,
      critMult: 2,
      slot: 1,
      card: cinderSnap,
      hp: 62,
      maxHp: 100,
    });
    expect(out).toMatchObject({
      attacker: 'Goosebumps',
      attackerId: 'p-caster',
      defender: 'Velvet',
      defenderId: 'p-defender',
      dmg: 38,
      crit: true,
      critMult: 2,
      slot: 2, // slot is +1 for 1-based UI
      effect: 'BURN',
      hp: 62,
      maxHp: 100,
      guildA: 'ALPHA',
      guildB: 'BETA',
      x: 100,
      y: 200,
      tx: 300,
      ty: 250,
    });
  });

  test('card_name is null when card is missing (defensive)', () => {
    const out = buildAttackBroadcastPayload({
      caster,
      defender,
      dmg: 10,
      isCrit: false,
      critMult: 1,
      slot: 0,
      card: null,
      hp: 90,
      maxHp: 100,
    });
    expect(out.card_name).toBeNull();
    expect(out.effect).toBeNull();
  });

  test('crit is coerced to boolean', () => {
    const out = buildAttackBroadcastPayload({
      caster,
      defender,
      dmg: 1,
      isCrit: 0,
      critMult: 1,
      slot: 0,
      card: cinderSnap,
      hp: 99,
      maxHp: 100,
    });
    expect(out.crit).toBe(false);
  });
});

describe('buildEffectBroadcastPayload — PR-1 card_name field', () => {
  test('payload includes card_name and target name', () => {
    const out = buildEffectBroadcastPayload({
      caster,
      target: defender,
      recipient: 'OFFENSIVE',
      effect: 'BURN',
      card: cinderSnap,
      slot: 0,
    });
    expect(out).toEqual({
      effect: 'BURN',
      by: 'Goosebumps',
      casterId: 'p-caster',
      on: 'Velvet',
      targetId: 'p-defender',
      recipient: 'OFFENSIVE',
      card_name: 'Cinder Snap',
      slot: 1, // 1-indexed for UI
      x: 100,
      y: 200,
      tx: 300,
      ty: 250,
    });
  });

  test('self-targeted cast — target is null, on/targetId/tx/ty are null', () => {
    const out = buildEffectBroadcastPayload({
      caster,
      target: null,
      effect: 'SURGE',
      card: { name: 'Berserker Roar', effect_1: 'SURGE' },
    });
    expect(out.on).toBeNull();
    expect(out.targetId).toBeNull();
    expect(out.tx).toBeUndefined();
    expect(out.ty).toBeUndefined();
    expect(out.card_name).toBe('Berserker Roar');
  });

  test('card_name is null when card is missing', () => {
    const out = buildEffectBroadcastPayload({
      caster,
      target: defender,
      effect: 'CLEANSE',
      card: undefined,
    });
    expect(out.card_name).toBeNull();
  });
});

describe('buildWindupBroadcastPayload — PR-2 telegraph', () => {
  test('payload includes attacker, target, card_name, duration_ms', () => {
    const out = buildWindupBroadcastPayload({
      caster,
      target: defender,
      recipient: 'OFFENSIVE',
      card: cinderSnap,
      slot: 0,
      durationMs: 1200,
    });
    expect(out).toEqual({
      attacker: 'Goosebumps',
      attackerId: 'p-caster',
      target: 'Velvet',
      targetId: 'p-defender',
      recipient: 'OFFENSIVE',
      card_name: 'Cinder Snap',
      effect: 'BURN',
      slot: 1,
      duration_ms: 1200,
      x: 100,
      y: 200,
      tx: 300,
      ty: 250,
    });
  });

  test('slot is 1-indexed for UI consistency with combat:attack payload', () => {
    const out = buildWindupBroadcastPayload({
      caster,
      target: defender,
      card: cinderSnap,
      slot: 2,
      durationMs: 1200,
    });
    expect(out.slot).toBe(3);
  });

  test('card_name is null when card has no name (defensive)', () => {
    const out = buildWindupBroadcastPayload({
      caster,
      target: defender,
      card: { effect_1: 'BURN' }, // no name
      slot: 0,
      durationMs: 1200,
    });
    expect(out.card_name).toBeNull();
    expect(out.effect).toBe('BURN');
  });

  test('null target (ALLY_AOE) produces null target/targetId/tx/ty', () => {
    const out = buildWindupBroadcastPayload({
      caster,
      target: null,
      recipient: 'ALLY_AOE',
      card: { name: 'Sun Hymn', effect_1: 'BLESS' },
      slot: 0,
      durationMs: 1200,
    });
    expect(out.target).toBeNull();
    expect(out.targetId).toBeNull();
    expect(out.tx).toBeNull();
    expect(out.ty).toBeNull();
    expect(out.recipient).toBe('ALLY_AOE');
    expect(out.card_name).toBe('Sun Hymn');
  });

  test('recipient field defaults to OFFENSIVE when omitted', () => {
    const out = buildWindupBroadcastPayload({
      caster,
      target: defender,
      card: cinderSnap,
      slot: 0,
      durationMs: 1200,
    });
    expect(out.recipient).toBe('OFFENSIVE');
  });
});

describe('classifyEffectRecipient — PR-A heal/buff log target', () => {
  test('OFFENSIVE effects', () => {
    expect(classifyEffectRecipient('BURN')).toBe('OFFENSIVE');
    expect(classifyEffectRecipient('POISON')).toBe('OFFENSIVE');
    expect(classifyEffectRecipient('HEX')).toBe('OFFENSIVE');
    expect(classifyEffectRecipient('WEAKEN')).toBe('OFFENSIVE');
    expect(classifyEffectRecipient('CORRODE')).toBe('OFFENSIVE');
    expect(classifyEffectRecipient('SILENCE')).toBe('OFFENSIVE');
    expect(classifyEffectRecipient('CHAIN')).toBe('OFFENSIVE');
  });

  test('ALLY_PICK effect (HEAL)', () => {
    expect(classifyEffectRecipient('HEAL')).toBe('ALLY_PICK');
  });

  test('ALLY_AOE effects (BLESS, INSPIRE)', () => {
    expect(classifyEffectRecipient('BLESS')).toBe('ALLY_AOE');
    expect(classifyEffectRecipient('INSPIRE')).toBe('ALLY_AOE');
  });

  test('SELF effects', () => {
    expect(classifyEffectRecipient('WARD')).toBe('SELF');
    expect(classifyEffectRecipient('BARRIER')).toBe('SELF');
    expect(classifyEffectRecipient('SURGE')).toBe('SELF');
    expect(classifyEffectRecipient('CRIT')).toBe('SELF');
    expect(classifyEffectRecipient('FEAST')).toBe('SELF');
    expect(classifyEffectRecipient('THORNS')).toBe('SELF');
    expect(classifyEffectRecipient('CLEANSE')).toBe('SELF');
  });

  test('case-insensitive', () => {
    expect(classifyEffectRecipient('burn')).toBe('OFFENSIVE');
    expect(classifyEffectRecipient('Heal')).toBe('ALLY_PICK');
  });

  test('null/undefined/unknown defaults to OFFENSIVE (safe fallback)', () => {
    expect(classifyEffectRecipient(null)).toBe('OFFENSIVE');
    expect(classifyEffectRecipient(undefined)).toBe('OFFENSIVE');
    expect(classifyEffectRecipient('')).toBe('OFFENSIVE');
    expect(classifyEffectRecipient('UNKNOWN_NEW_EFFECT')).toBe('OFFENSIVE');
  });
});

describe('buildEffectBroadcastPayload — PR-A recipient field', () => {
  test('SELF cast with caster as target renders correctly', () => {
    const out = buildEffectBroadcastPayload({
      caster,
      target: caster,
      recipient: 'SELF',
      effect: 'WARD',
      card: { name: 'Stone Bulwark', effect_1: 'WARD' },
    });
    expect(out.recipient).toBe('SELF');
    expect(out.on).toBe('Goosebumps'); // caster as target
    expect(out.targetId).toBe('p-caster');
  });

  test('ALLY_AOE cast with null target', () => {
    const out = buildEffectBroadcastPayload({
      caster,
      target: null,
      recipient: 'ALLY_AOE',
      effect: 'BLESS',
      card: { name: 'Sun Hymn', effect_1: 'BLESS' },
    });
    expect(out.recipient).toBe('ALLY_AOE');
    expect(out.on).toBeNull();
    expect(out.targetId).toBeNull();
  });

  test('slot omitted → null (defensive for legacy callers)', () => {
    const out = buildEffectBroadcastPayload({
      caster,
      target: defender,
      effect: 'BURN',
      card: cinderSnap,
    });
    expect(out.slot).toBeNull();
  });

  test('slot is 1-indexed when provided', () => {
    const out = buildEffectBroadcastPayload({
      caster,
      target: defender,
      effect: 'BURN',
      card: cinderSnap,
      slot: 2,
    });
    expect(out.slot).toBe(3);
  });
});

describe('buildAttackBroadcastPayload — PR-E recipient classification', () => {
  test('OFFENSIVE card emits recipient=OFFENSIVE', () => {
    const out = buildAttackBroadcastPayload({
      caster,
      defender,
      dmg: 38,
      isCrit: false,
      critMult: 1,
      slot: 0,
      card: { name: 'Cinder Snap', effect_1: 'BURN' },
      hp: 62,
      maxHp: 100,
    });
    expect(out.recipient).toBe('OFFENSIVE');
  });

  test('ALLY_PICK card (HEAL) emits recipient=ALLY_PICK on auto-attack', () => {
    const out = buildAttackBroadcastPayload({
      caster,
      defender,
      dmg: 14,
      isCrit: false,
      critMult: 1,
      slot: 0,
      card: { name: 'Regrowth', effect_1: 'HEAL' },
      hp: 86,
      maxHp: 100,
    });
    // Damage is real (auto-attack always hits enemy) but recipient field
    // tells the client to drop the card name + effect tag from the log.
    expect(out.recipient).toBe('ALLY_PICK');
    expect(out.dmg).toBe(14);
  });

  test('SELF card (WARD) emits recipient=SELF on auto-attack', () => {
    const out = buildAttackBroadcastPayload({
      caster,
      defender,
      dmg: 22,
      isCrit: false,
      critMult: 1,
      slot: 0,
      card: { name: 'Stone Bulwark', effect_1: 'WARD' },
      hp: 78,
      maxHp: 100,
    });
    expect(out.recipient).toBe('SELF');
  });

  test('null/missing card defaults to OFFENSIVE', () => {
    const out = buildAttackBroadcastPayload({
      caster,
      defender,
      dmg: 10,
      isCrit: false,
      critMult: 1,
      slot: 0,
      card: null,
      hp: 90,
      maxHp: 100,
    });
    expect(out.recipient).toBe('OFFENSIVE');
  });
});
