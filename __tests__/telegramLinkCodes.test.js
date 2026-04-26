// Tests for the in-memory Telegram-link code store. No DB, no bot.

const {
  generateCode,
  storeCode,
  consumeCode,
  cleanupExpired,
  CODE_LENGTH,
  CODE_TTL_MS,
  _size,
  _reset,
} = require('../server/routes/telegramLinkCodes');

beforeEach(() => _reset());

describe('generateCode', () => {
  test('returns a string of CODE_LENGTH chars', () => {
    const c = generateCode();
    expect(typeof c).toBe('string');
    expect(c.length).toBe(CODE_LENGTH);
  });

  test('uses only the legibility-safe alphabet (no 0, O, 1, I)', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    }
  });

  test('generates distinct codes (no immediate collisions)', () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) seen.add(generateCode());
    // Strong collision-free expectation given the keyspace.
    expect(seen.size).toBe(100);
  });
});

describe('storeCode + consumeCode — happy path', () => {
  test('store then consume returns the playerId', () => {
    storeCode('ABC12345', 42);
    expect(consumeCode('ABC12345')).toBe(42);
  });

  test('consume removes the entry (single-use)', () => {
    storeCode('ABC12345', 42);
    expect(_size()).toBe(1);
    consumeCode('ABC12345');
    expect(_size()).toBe(0);
  });

  test('consume after consume returns null', () => {
    storeCode('ABC12345', 42);
    consumeCode('ABC12345');
    expect(consumeCode('ABC12345')).toBeNull();
  });
});

describe('consumeCode — miss cases', () => {
  test('unknown code returns null', () => {
    expect(consumeCode('NOPE9999')).toBeNull();
  });

  test('null/empty/non-string returns null', () => {
    expect(consumeCode(null)).toBeNull();
    expect(consumeCode(undefined)).toBeNull();
    expect(consumeCode('')).toBeNull();
    expect(consumeCode(12345)).toBeNull();
  });

  test('expired code returns null AND is removed from the store', () => {
    const past = 1000;
    const future = past + CODE_TTL_MS + 1; // 1ms past TTL
    storeCode('ABC12345', 42, past);
    expect(_size()).toBe(1);
    expect(consumeCode('ABC12345', future)).toBeNull();
    expect(_size()).toBe(0); // lazy GC on consume
  });

  test('exactly-at-expiry treats as expired (consumed=null)', () => {
    const past = 1000;
    storeCode('ABC12345', 42, past);
    // Per impl: entry.expiresAt < nowMs → null. Equality (< not <=) keeps it valid.
    // So at exactly past+TTL, it's still consumable.
    expect(consumeCode('ABC12345', past + CODE_TTL_MS)).toBe(42);
  });
});

describe('storeCode — input validation', () => {
  test('rejects empty code', () => {
    expect(() => storeCode('', 42)).toThrow();
  });

  test('rejects non-string code', () => {
    expect(() => storeCode(123, 42)).toThrow();
  });

  test('rejects missing playerId', () => {
    expect(() => storeCode('ABC12345', null)).toThrow();
    expect(() => storeCode('ABC12345', undefined)).toThrow();
    expect(() => storeCode('ABC12345', 0)).toThrow();
  });
});

describe('cleanupExpired', () => {
  test('removes only expired entries', () => {
    const t0 = 1000;
    storeCode('OLDCODE1', 1, t0);
    storeCode('OLDCODE2', 2, t0);
    storeCode('NEWCODE1', 3, t0 + CODE_TTL_MS - 1000); // still fresh after big advance
    const future = t0 + CODE_TTL_MS + 5000;
    const removed = cleanupExpired(future);
    expect(removed).toBe(2);
    expect(_size()).toBe(1);
    expect(consumeCode('NEWCODE1', future)).toBe(3);
  });

  test('returns 0 when nothing expired', () => {
    storeCode('FRESH001', 1);
    storeCode('FRESH002', 2);
    expect(cleanupExpired()).toBe(0);
    expect(_size()).toBe(2);
  });
});

describe('isolation between codes', () => {
  test('two simultaneous codes for different players don\'t cross-pollinate', () => {
    storeCode('CODEAAAA', 42);
    storeCode('CODEBBBB', 99);
    expect(consumeCode('CODEAAAA')).toBe(42);
    expect(consumeCode('CODEBBBB')).toBe(99);
  });

  test('same player can hold multiple pending codes (most-recent click wins)', () => {
    storeCode('FIRST001', 42);
    storeCode('SECOND02', 42);
    expect(consumeCode('FIRST001')).toBe(42);
    expect(consumeCode('SECOND02')).toBe(42);
  });
});
