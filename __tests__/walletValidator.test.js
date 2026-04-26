// Tests for the pure helpers backing POST /api/players/link-wallet.
// No DB, no Express — just input/output checks.

const {
  validateSolanaAddress,
  checkWalletChangeAllowed,
  SEVEN_DAYS_MS,
} = require('../server/routes/walletValidator');

// A real-shaped Solana address (44 chars, valid base58 alphabet).
// Synthetic — does not correspond to any real on-chain account.
const VALID_SOL = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
// Real-shaped 32-char address (also valid base58, the lower bound).
const VALID_SOL_32 = '11111111111111111111111111111111';

describe('validateSolanaAddress — happy path', () => {
  test('accepts a typical 43-char Solana address', () => {
    const r = validateSolanaAddress(VALID_SOL);
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe(VALID_SOL);
    expect(r.code).toBeNull();
    expect(r.error).toBeNull();
  });

  test('accepts the 32-char lower bound', () => {
    const r = validateSolanaAddress(VALID_SOL_32);
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe(VALID_SOL_32);
  });

  test('trims surrounding whitespace before validation', () => {
    const r = validateSolanaAddress(`   ${VALID_SOL}\n`);
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe(VALID_SOL);
  });

  test('trims tabs and CRLF (real paste artifacts)', () => {
    const r = validateSolanaAddress(`\t${VALID_SOL}\r\n`);
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe(VALID_SOL);
  });
});

describe('validateSolanaAddress — empty / null', () => {
  test('rejects null', () => {
    const r = validateSolanaAddress(null);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('EMPTY');
  });

  test('rejects undefined', () => {
    const r = validateSolanaAddress(undefined);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('EMPTY');
  });

  test('rejects empty string', () => {
    const r = validateSolanaAddress('');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('EMPTY');
  });

  test('rejects whitespace-only string', () => {
    const r = validateSolanaAddress('   \t\n');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('EMPTY');
  });
});

describe('validateSolanaAddress — Ethereum addresses', () => {
  test('rejects 0x-prefixed 42-char ETH address with friendly message', () => {
    const r = validateSolanaAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('LOOKS_LIKE_ETH');
    expect(r.error).toMatch(/ethereum/i);
  });

  test('rejects mixed-case ETH (EIP-55 checksum form)', () => {
    const r = validateSolanaAddress('0xAbCdEf1234567890aBcDeF1234567890aBcDeF12');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('LOOKS_LIKE_ETH');
  });
});

describe('validateSolanaAddress — length bounds', () => {
  test('rejects too short (31 chars)', () => {
    const r = validateSolanaAddress('a'.repeat(31));
    expect(r.ok).toBe(false);
    expect(r.code).toBe('TOO_SHORT');
  });

  test('rejects too long (45 chars)', () => {
    const r = validateSolanaAddress('a'.repeat(45));
    expect(r.ok).toBe(false);
    expect(r.code).toBe('TOO_LONG');
  });
});

describe('validateSolanaAddress — invalid base58 characters', () => {
  test('rejects address containing 0 (zero excluded from base58)', () => {
    const bad = '0' + VALID_SOL.slice(1);
    const r = validateSolanaAddress(bad);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INVALID_CHAR');
  });

  test('rejects address containing O (capital o excluded)', () => {
    const bad = 'O' + VALID_SOL.slice(1);
    const r = validateSolanaAddress(bad);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INVALID_CHAR');
  });

  test('rejects address containing l (lowercase L excluded)', () => {
    const bad = 'l' + VALID_SOL.slice(1);
    const r = validateSolanaAddress(bad);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INVALID_CHAR');
  });

  test('rejects address containing I (capital i excluded)', () => {
    const bad = 'I' + VALID_SOL.slice(1);
    const r = validateSolanaAddress(bad);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INVALID_CHAR');
  });

  test('rejects address with whitespace in the middle', () => {
    // Use the 32-char lower bound so insertion still falls within length range.
    const bad = VALID_SOL_32.slice(0, 10) + ' ' + VALID_SOL_32.slice(10);
    const r = validateSolanaAddress(bad);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INVALID_CHAR');
  });
});

describe('checkWalletChangeAllowed — rate limit', () => {
  test('allows first link (no prior change)', () => {
    expect(checkWalletChangeAllowed(null).ok).toBe(true);
    expect(checkWalletChangeAllowed(undefined).ok).toBe(true);
    expect(checkWalletChangeAllowed('').ok).toBe(true);
  });

  test('allows after exactly 7 days', () => {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS).toISOString();
    expect(checkWalletChangeAllowed(sevenDaysAgo, now).ok).toBe(true);
  });

  test('allows after more than 7 days', () => {
    const now = Date.now();
    const eightDaysAgo = new Date(now - SEVEN_DAYS_MS - 86400000).toISOString();
    expect(checkWalletChangeAllowed(eightDaysAgo, now).ok).toBe(true);
  });

  test('blocks 1 day after change with days_left=6', () => {
    const now = Date.now();
    const oneDayAgo = new Date(now - 86400000).toISOString();
    const r = checkWalletChangeAllowed(oneDayAgo, now);
    expect(r.ok).toBe(false);
    expect(r.days_left).toBe(6);
  });

  test('blocks immediately after change with days_left=7', () => {
    const now = Date.now();
    const justNow = new Date(now - 1000).toISOString();
    const r = checkWalletChangeAllowed(justNow, now);
    expect(r.ok).toBe(false);
    expect(r.days_left).toBe(7);
  });

  test('blocks 6 days 23h 59m later — clamps days_left to at least 1', () => {
    const now = Date.now();
    const almostSeven = new Date(now - SEVEN_DAYS_MS + 60000).toISOString();
    const r = checkWalletChangeAllowed(almostSeven, now);
    expect(r.ok).toBe(false);
    expect(r.days_left).toBe(1);
  });

  test('handles invalid timestamp by allowing (defensive — never block on garbage)', () => {
    const r = checkWalletChangeAllowed('not-a-date');
    expect(r.ok).toBe(true);
  });
});
