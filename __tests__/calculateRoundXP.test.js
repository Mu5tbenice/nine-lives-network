// Tests for §9.91 — arena round-end XP awards. Pure function so we can
// unit test without standing up supabase or the tick loop. The integration
// (calls into addXP, broadcast payload shape) is covered by the existing
// duels XP path which uses the same xp-engine entrypoint.

const {
  calculateRoundXP,
} = require('../server/services/combatEnginePayloads');

describe('calculateRoundXP — §9.91', () => {
  const survivor = (playerId, guildTag) => ({
    playerId,
    guildTag,
    hp: 100,
    waitingForRound: false,
  });

  test('no living Nines → empty log', () => {
    expect(calculateRoundXP({ winner: 'ALPHA', flipped: false, livingNines: [] })).toEqual([]);
  });

  test('survivor with no winner gets zone_survive only (+2)', () => {
    const out = calculateRoundXP({
      winner: null,
      flipped: false,
      livingNines: [survivor('p1', 'BETA')],
    });
    expect(out).toEqual([{ playerId: 'p1', xp: 2 }]);
  });

  test('survivor on losing guild gets zone_survive only (+2)', () => {
    const out = calculateRoundXP({
      winner: 'ALPHA',
      flipped: false,
      livingNines: [survivor('p1', 'BETA')],
    });
    expect(out[0].xp).toBe(2);
  });

  test('survivor on winning guild (no flip) gets survive + win (+5)', () => {
    const out = calculateRoundXP({
      winner: 'ALPHA',
      flipped: false,
      livingNines: [survivor('p1', 'ALPHA')],
    });
    expect(out[0].xp).toBe(5);
  });

  test('survivor on flipping winning guild gets survive + win + flip (+13)', () => {
    const out = calculateRoundXP({
      winner: 'ALPHA',
      flipped: true,
      livingNines: [survivor('p1', 'ALPHA')],
    });
    expect(out[0].xp).toBe(13);
  });

  test('flipped on losing guild does NOT grant flip bonus', () => {
    const out = calculateRoundXP({
      winner: 'ALPHA',
      flipped: true,
      livingNines: [survivor('p1', 'GAMMA')],
    });
    expect(out[0].xp).toBe(2);
  });

  test('mixed roster — winner survivors and loser survivors awarded correctly', () => {
    const out = calculateRoundXP({
      winner: 'ALPHA',
      flipped: false,
      livingNines: [
        survivor('p-alpha-1', 'ALPHA'),
        survivor('p-alpha-2', 'ALPHA'),
        survivor('p-beta', 'BETA'),
      ],
    });
    expect(out).toEqual([
      { playerId: 'p-alpha-1', xp: 5 },
      { playerId: 'p-alpha-2', xp: 5 },
      { playerId: 'p-beta', xp: 2 },
    ]);
  });

  test('undefined livingNines is tolerated (returns empty)', () => {
    expect(calculateRoundXP({ winner: 'ALPHA', flipped: false })).toEqual([]);
  });
});
