-- 010_extend_survivors_runs.sql
-- PR-A of Survivors Mode rebuild (PRD: tasks/prd-survivors-mode.md, §9.111).
--
-- Extends the v1 survivors_runs table (migration 004) with the telemetry the
-- new endless-rounds design needs:
--   seed                       — server-generated run seed (BIGINT) for replays / determinism
--   score                      — server-recomputed kills-primary score (PR-D writes; nullable here)
--   ended_reason               — 'death' | 'crash' | 'timeout' | etc.
--   cards_used                 — JSONB array of {spell_id, final_rarity}
--   crystals_earned            — in-run crystal currency totals (telemetry only; evaporates at run end)
--   crystals_spent_reroll
--   crystals_spent_upgrade
--   client_version             — useful when bisecting client-side regressions
--
-- Also lifts the v1 caps (time_sec ≤ 7200, level ≤ 200) — runs are endless now,
-- difficulty scales steeply enough that the new ceilings are anti-AFK only.
--
-- Finally flips player_id to NOT NULL. v1 supported anonymous play; v2 requires
-- an authenticated player. The 19 anon rows currently in dev are test data and
-- get deleted as part of this migration so the NOT NULL flip can succeed.

BEGIN;

-- New columns. Defaults chosen so the route can keep accepting legacy bodies
-- during the transition without erroring.
ALTER TABLE public.survivors_runs
  ADD COLUMN IF NOT EXISTS seed                    BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score                   INTEGER,
  ADD COLUMN IF NOT EXISTS ended_reason            TEXT,
  ADD COLUMN IF NOT EXISTS cards_used              JSONB,
  ADD COLUMN IF NOT EXISTS crystals_earned         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crystals_spent_reroll   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crystals_spent_upgrade  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_version          TEXT;

-- Drop the v1 caps and replace with relaxed anti-AFK ceilings.
-- These constraints were unnamed in 004 (PostgreSQL auto-named them
-- survivors_runs_time_sec_check, survivors_runs_level_check). Drop by name.
ALTER TABLE public.survivors_runs
  DROP CONSTRAINT IF EXISTS survivors_runs_time_sec_check;
ALTER TABLE public.survivors_runs
  DROP CONSTRAINT IF EXISTS survivors_runs_level_check;

ALTER TABLE public.survivors_runs
  ADD CONSTRAINT survivors_runs_time_sec_anti_afk_check
    CHECK (time_sec >= 0 AND time_sec <= 86400);
ALTER TABLE public.survivors_runs
  ADD CONSTRAINT survivors_runs_level_anti_afk_check
    CHECK (level >= 1 AND level <= 1000);

-- Delete the 19 v1 anon test rows so the NOT NULL flip succeeds. v1 had zero
-- authed runs, so this is a clean wipe of test data only.
DELETE FROM public.survivors_runs WHERE player_id IS NULL;

ALTER TABLE public.survivors_runs
  ALTER COLUMN player_id SET NOT NULL;

COMMIT;
