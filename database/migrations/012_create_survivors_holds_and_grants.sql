-- 012_create_survivors_holds_and_grants.sql
-- PR-A of Survivors Mode rebuild (PRD: tasks/prd-survivors-mode.md §4.7).
--
-- Two tables that PR-E uses to award "rank persistence" pack rewards:
--
--   survivors_leaderboard_holds
--     One row per contiguous span a player held a top-3 daily/weekly rank.
--     The cron jobs in PR-E open a hold when a player enters top-3 and close
--     it (held_until = now()) when they leave. When a daily hold reaches 24
--     contiguous hours and reward_granted = false, the cron mints a pack via
--     the existing pack-system pipeline.
--
--   survivors_pack_grants
--     Audit table — one row per pack granted by a survivors-mode trigger.
--     Tracks the source ('rank_hold_24h_daily', etc.), the originating run
--     and/or hold, and the resulting pack_id (FK omitted for now — packs
--     table doesn't exist in dev yet; PR-E adds the FK if the table lands by
--     then, otherwise the column just stores the generated pack identifier).
--
-- player_id is INTEGER to match public.players(id).

BEGIN;

CREATE TABLE IF NOT EXISTS public.survivors_leaderboard_holds (
  id              BIGSERIAL PRIMARY KEY,
  player_id       INTEGER NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  rank            INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 3),
  scope           TEXT NOT NULL CHECK (scope IN ('daily', 'weekly')),
  held_since      TIMESTAMPTZ NOT NULL,
  held_until      TIMESTAMPTZ,
  run_id          BIGINT REFERENCES public.survivors_runs(id) ON DELETE SET NULL,
  reward_granted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS survivors_leaderboard_holds_player_scope_reward_idx
  ON public.survivors_leaderboard_holds (player_id, scope, reward_granted);

CREATE INDEX IF NOT EXISTS survivors_leaderboard_holds_open_holds_idx
  ON public.survivors_leaderboard_holds (scope, held_until)
  WHERE held_until IS NULL;

CREATE TABLE IF NOT EXISTS public.survivors_pack_grants (
  id          BIGSERIAL PRIMARY KEY,
  player_id   INTEGER NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,
  run_id      BIGINT REFERENCES public.survivors_runs(id) ON DELETE SET NULL,
  hold_id     BIGINT REFERENCES public.survivors_leaderboard_holds(id) ON DELETE SET NULL,
  pack_id     BIGINT,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS survivors_pack_grants_player_idx
  ON public.survivors_pack_grants (player_id);

ALTER TABLE public.survivors_leaderboard_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survivors_pack_grants       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survivors_leaderboard_holds_read_all" ON public.survivors_leaderboard_holds;
CREATE POLICY "survivors_leaderboard_holds_read_all"
  ON public.survivors_leaderboard_holds FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "survivors_pack_grants_read_all" ON public.survivors_pack_grants;
CREATE POLICY "survivors_pack_grants_read_all"
  ON public.survivors_pack_grants FOR SELECT
  USING (true);

COMMIT;
