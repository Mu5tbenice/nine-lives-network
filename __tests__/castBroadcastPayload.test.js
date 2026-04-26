// Tests for arena PR-1 — name the cast.
// `combat:attack` and `combat:effect` socket payloads now include `card_name`
// so the client log can render named beats ("Goosebumps's Cinder Snap → Velvet -38").

const {
  buildAttackBroadcastPayload,
  buildEffectBroadcastPayload,
  buildWindupBroadcastPayload,
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
      effect: 'BURN',
      card: cinderSnap,
    });
    expect(out).toEqual({
      effect: 'BURN',
      by: 'Goosebumps',
      casterId: 'p-caster',
      on: 'Velvet',
      targetId: 'p-defender',
      card_name: 'Cinder Snap',
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
      card: cinderSnap,
      slot: 0,
      durationMs: 1200,
    });
    expect(out).toEqual({
      attacker: 'Goosebumps',
      attackerId: 'p-caster',
      target: 'Velvet',
      targetId: 'p-defender',
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
});
