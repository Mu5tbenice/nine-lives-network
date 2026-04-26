// Pure helpers for /api/players/link-wallet — kept separate from the route
// handler so they can be tested without Supabase or Express. The route in
// players.js wires these together and adds the DB calls.
//
// Design choices:
//   - Solana base58 alphabet is case-sensitive; we do NOT case-fold (`O` and
//     `0` are excluded from the alphabet, so the validation regex catches
//     them anyway).
//   - We do not import @solana/web3.js for `PublicKey`-level on-curve
//     validation. Regex + length covers ~all real wallets pasted from
//     Phantom/Solscan; on-curve enforcement happens just-in-time at the
//     NFT-drop sign-message step (per project_nft_as_withdrawal_key.md).
//   - ETH addresses (0x-prefixed, 42 chars) are detected as a special case
//     so we can give a friendlier error than "invalid character."

// Solana base58: digits 1-9 + uppercase/lowercase letters minus 0, O, I, l.
const SOL_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;
const ETH_RE = /^0x[0-9a-fA-F]{40}$/;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function validateSolanaAddress(input) {
  if (input == null) {
    return { ok: false, normalized: null, error: 'Wallet address required', code: 'EMPTY' };
  }
  const trimmed = String(input).trim();
  if (!trimmed) {
    return { ok: false, normalized: null, error: 'Wallet address required', code: 'EMPTY' };
  }
  if (ETH_RE.test(trimmed)) {
    return {
      ok: false,
      normalized: null,
      error: 'That looks like an Ethereum address. Solana wallets are base58 (no 0x prefix).',
      code: 'LOOKS_LIKE_ETH',
    };
  }
  if (trimmed.length < 32) {
    return {
      ok: false,
      normalized: null,
      error: 'Solana addresses are 32–44 characters.',
      code: 'TOO_SHORT',
    };
  }
  if (trimmed.length > 44) {
    return {
      ok: false,
      normalized: null,
      error: 'Solana addresses are 32–44 characters.',
      code: 'TOO_LONG',
    };
  }
  if (!SOL_BASE58_RE.test(trimmed)) {
    return {
      ok: false,
      normalized: null,
      error: 'Address contains invalid characters. Solana base58 excludes 0, O, I, and l.',
      code: 'INVALID_CHAR',
    };
  }
  return { ok: true, normalized: trimmed, error: null, code: null };
}

// 7-day rate limit on wallet rotations. First link (walletChangedAt null)
// is always allowed.
function checkWalletChangeAllowed(walletChangedAt, nowMs = Date.now()) {
  if (!walletChangedAt) return { ok: true, days_left: 0 };
  const lastMs = new Date(walletChangedAt).getTime();
  if (Number.isNaN(lastMs)) return { ok: true, days_left: 0 };
  const elapsed = nowMs - lastMs;
  if (elapsed >= SEVEN_DAYS_MS) return { ok: true, days_left: 0 };
  const days_left = Math.max(1, Math.ceil((SEVEN_DAYS_MS - elapsed) / ONE_DAY_MS));
  return { ok: false, days_left };
}

module.exports = {
  validateSolanaAddress,
  checkWalletChangeAllowed,
  SEVEN_DAYS_MS,
};
