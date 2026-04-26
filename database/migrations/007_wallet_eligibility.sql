-- 007_wallet_eligibility.sql
-- ─────────────────────────────────────────────────────────────────────
-- Wallet-link infrastructure for the Solana NFT distribution surface
-- (see project memory `project_nft_as_withdrawal_key.md` for the policy
-- — registration / gameplay / earning open to all; NFT-holding gates
-- the future points→token cash-out only).
--
-- Three changes on `players`:
--   1. `eligibility_flags jsonb` — admin-set per-player flags (e.g.
--      whitelist_round_1, kol_invite, giveaway_winner_2026_05). Nothing
--      player-visible in v1; powers admin CSV export only.
--   2. `wallet_changed_at timestamptz` — last wallet write time. Used
--      to enforce a 7-day rate limit on wallet rotations (prevents
--      churning to dodge an exposed wallet or to pile up flags).
--   3. Partial unique index on `wallet_address` (case-sensitive — Solana
--      base58 is case-sensitive, no folding) for non-null values only,
--      so unset wallets don't all collide.
--
-- Pre-flight (2026-04-26):
--   SELECT wallet_address, COUNT(*) FROM players
--    WHERE wallet_address IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1;
--   → 0 rows. Column is fully orphaned; migration applies clean.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS eligibility_flags jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS wallet_changed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS players_wallet_address_unique
  ON players (wallet_address)
  WHERE wallet_address IS NOT NULL;

COMMENT ON COLUMN players.eligibility_flags IS
  'Admin-set per-player flags for NFT/whitelist/giveaway curation. Keys are flag names (e.g. whitelist_round_1), values are boolean. Player-invisible in v1; consumed by GET /api/admin/eligibility/:flag.';

COMMENT ON COLUMN players.wallet_changed_at IS
  'Timestamp of last wallet_address write. Used by POST /api/players/link-wallet to enforce a 7-day rate limit on wallet rotations.';
