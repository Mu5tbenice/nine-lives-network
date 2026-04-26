// In-memory store of pending Telegram-link codes. Used by:
//   - POST /api/players/start-telegram-link (issues a code)
//   - server/services/nerm-telegram.js /start <payload> handler (consumes
//     a code and writes the player↔telegram link)
//
// Why in-memory? A pending link is short-lived (10-min TTL) and
// inherently ephemeral — a server restart that drops the codes just
// means the user clicks LINK TELEGRAM again. Persisting to Supabase
// would add complexity for no UX gain.
//
// Trade-off: this module is a singleton — both the route and the bot
// require the same module path, so they share one Map. If the codebase
// ever grows multiple node processes, the in-memory store will need to
// move to Redis or a small DB table. Not a real concern at current
// scale.

const CODE_LENGTH = 8;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude 0/O/1/I for legibility

// Map<code, { playerId, expiresAt }>
const _store = new Map();

function _now() {
  return Date.now();
}

function generateCode() {
  // Tight loop with collision-avoidance against the live store. With a
  // 32-char alphabet over 8 chars (~10^12 keyspace) and TTL=10min, the
  // collision probability is vanishingly small even with thousands of
  // pending codes.
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    if (!_store.has(code)) return code;
  }
  // Practically unreachable.
  throw new Error('Could not generate unique link code');
}

function storeCode(code, playerId, nowMs = _now()) {
  if (!code || typeof code !== 'string') throw new Error('code required');
  if (!playerId) throw new Error('playerId required');
  _store.set(code, {
    playerId,
    expiresAt: nowMs + CODE_TTL_MS,
  });
  return code;
}

// Returns the playerId on success, null on miss / expired / already-used.
// Atomic — once consumed, the entry is removed so it cannot be re-used.
function consumeCode(code, nowMs = _now()) {
  if (!code || typeof code !== 'string') return null;
  const entry = _store.get(code);
  if (!entry) return null;
  // Always delete first so an expired code is also removed (lazy GC).
  _store.delete(code);
  if (entry.expiresAt < nowMs) return null;
  return entry.playerId;
}

// Walks the store and removes expired entries. Cheap; safe to call from
// a periodic timer or piggyback on storeCode if memory ever matters.
function cleanupExpired(nowMs = _now()) {
  let removed = 0;
  for (const [code, entry] of _store.entries()) {
    if (entry.expiresAt < nowMs) {
      _store.delete(code);
      removed++;
    }
  }
  return removed;
}

// Test-only: peek at the live store size. Not exported in production
// callers because the store is conceptually opaque.
function _size() {
  return _store.size;
}

// Test-only: wipe the store (Jest tests share module state across
// describes; without this they'd interfere).
function _reset() {
  _store.clear();
}

module.exports = {
  generateCode,
  storeCode,
  consumeCode,
  cleanupExpired,
  CODE_LENGTH,
  CODE_TTL_MS,
  _size,
  _reset,
};
