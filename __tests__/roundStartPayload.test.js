// Tests for §9.71 — arena:round_start.nines[] payload includes `withdrawn`
// so the client can keep KO'd-waiting self-sprites dimmed with WAITING badge
// instead of clobbering alpha/badge on every round_start.

const {
  buildRoundStartNinePayload,
} = require('../server/services/combatEnginePayloads');

describe('buildRoundStartNinePayload — §9.71', () => {
  const survivor = {
    playerId: 'p-survivor',
    deploymentId: 'd-survivor',
    hp: 120,
    maxHp: 120,
    guildTag: 'ALPHA',
    houseKey: 'stormrage',
    withdrawn: false,
  };

  const withdrawnKoWaiting = {
    playerId: 'p-withdrawn',
    deploymentId: 'd-withdrawn',
    hp: 0,
    maxHp: 100,
    guildTag: 'BETA',
    houseKey: 'smoulders',
    withdrawn: true,
    waitingForRound: true,
  };

  test('survivor gets withdrawn:false and full hp', () => {
    const out = buildRoundStartNinePayload(survivor);
    expect(out).toEqual({
      id: 'p-survivor',
      deploymentId: 'd-survivor',
      playerId: 'p-survivor',
      hp: 120,
      maxHp: 120,
      guildTag: 'ALPHA',
      houseKey: 'stormrage',
      withdrawn: false,
    });
  });

  test('withdrawn KO\'d Nine gets withdrawn:true and hp=0', () => {
    const out = buildRoundStartNinePayload(withdrawnKoWaiting);
    expect(out.withdrawn).toBe(true);
    expect(out.hp).toBe(0);
    expect(out.maxHp).toBe(100);
    expect(out.id).toBe('p-withdrawn');
  });

  test('withdrawn is coerced to boolean (undefined → false)', () => {
    const nine = { ...survivor };
    delete nine.withdrawn;
    const out = buildRoundStartNinePayload(nine);
    expect(out.withdrawn).toBe(false);
  });

  test('withdrawn is coerced to boolean (truthy value → true)', () => {
    const nine = { ...survivor, withdrawn: 1 };
    const out = buildRoundStartNinePayload(nine);
    expect(out.withdrawn).toBe(true);
  });

  test('id aligns with playerId (client S.nines is keyed by playerId per §9.25)', () => {
    const out = buildRoundStartNinePayload(survivor);
    expect(out.id).toBe(survivor.playerId);
    expect(out.playerId).toBe(survivor.playerId);
  });

  test('mixed round — survivor + withdrawn mapped side by side', () => {
    const payload = [survivor, withdrawnKoWaiting].map(
      buildRoundStartNinePayload,
    );
    expect(payload[0].withdrawn).toBe(false);
    expect(payload[0].hp).toBe(120);
    expect(payload[1].withdrawn).toBe(true);
    expect(payload[1].hp).toBe(0);
  });
});
