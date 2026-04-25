-- 005_player_handle_unique_lower.sql
-- ─────────────────────────────────────────────────────────────────────
-- Case-insensitive uniqueness for active player handles. Backs the
-- /p/<handle> public profile routing scoped in PR #230's IA discovery
-- doc (docs/ux-information-architecture.md). Partial index — only
-- enforced for is_active = true rows with a non-null handle, so
-- soft-deleted players don't block re-registration.
--
-- Pre-flight (2026-04-25): zero duplicates found on production via
--   SELECT LOWER(twitter_handle), COUNT(*) FROM players
--   WHERE is_active = true AND twitter_handle IS NOT NULL
--   GROUP BY 1 HAVING COUNT(*) > 1;
-- so this migration applies cleanly.
-- ─────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS players_twitter_handle_lower_unique
  ON players (LOWER(twitter_handle))
  WHERE is_active = true AND twitter_handle IS NOT NULL;
