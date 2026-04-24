-- 004_create_survivors_runs.sql
-- Survivors-mode (Vampire-Survivors-style arcade) run results.
-- One row per completed run (death or win). Applied via Supabase on 2026-04-25.
--
-- player_id is nullable because v1 of the mode is unauthenticated — runs are
-- tied to an optional display name the player types on the start screen.
-- When account linking ships later, player_id becomes populated on the server
-- side from the session.

CREATE TABLE IF NOT EXISTS public.survivors_runs (
  id           BIGSERIAL PRIMARY KEY,
  player_id    INTEGER REFERENCES public.players(id) ON DELETE SET NULL,
  display_name TEXT,
  house        TEXT NOT NULL,
  time_sec     INTEGER NOT NULL CHECK (time_sec >= 0 AND time_sec <= 7200),
  level        INTEGER NOT NULL CHECK (level >= 1 AND level <= 200),
  kills        INTEGER NOT NULL CHECK (kills >= 0 AND kills <= 100000),
  chapter      INTEGER NOT NULL CHECK (chapter >= 1 AND chapter <= 6),
  won          BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS survivors_runs_time_desc_idx
  ON public.survivors_runs (time_sec DESC, id DESC);

ALTER TABLE public.survivors_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survivors_runs_read_all" ON public.survivors_runs;
CREATE POLICY "survivors_runs_read_all"
  ON public.survivors_runs FOR SELECT
  USING (true);
