-- 008_telegram_link.sql
-- ─────────────────────────────────────────────────────────────────────
-- Telegram link infrastructure. Mirrors the wallet-link pattern from
-- migration 007. Three columns + a partial unique index on
-- telegram_user_id so one Telegram account binds to at most one player.
--
-- Two surfaces consume these columns:
--   - POST /api/players/start-telegram-link issues a one-time deep-link
--     code; the user opens https://t.me/Nerm9LV_Bot?start=<code> and the
--     bot's /start <payload> handler writes the link.
--   - GET /api/players/:id/telegram-status powers the /settings page
--     poll that flips the pill from NOT LINKED to LINKED.
--
-- Pre-flight (2026-04-26): zero existing telegram_* columns; clean apply.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE players ADD COLUMN IF NOT EXISTS telegram_user_id varchar;
ALTER TABLE players ADD COLUMN IF NOT EXISTS telegram_username varchar;
ALTER TABLE players ADD COLUMN IF NOT EXISTS telegram_linked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS players_telegram_user_id_unique
  ON players (telegram_user_id)
  WHERE telegram_user_id IS NOT NULL;

COMMENT ON COLUMN players.telegram_user_id IS
  'Telegram user id (numeric, stored as string). Set when player completes the deep-link handshake via /api/players/start-telegram-link.';
COMMENT ON COLUMN players.telegram_username IS
  'Telegram username (without @). Optional — not all Telegram users set one.';
COMMENT ON COLUMN players.telegram_linked_at IS
  'When the link was established. Updated on re-link.';
