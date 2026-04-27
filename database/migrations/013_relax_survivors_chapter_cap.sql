-- 013_relax_survivors_chapter_cap.sql
-- PR-D of Survivors Mode rebuild.
--
-- The v1 design used 6 fixed chapters (CHAPTERS in data.js). PR-D replaces
-- chapters with endless rounds, repurposing the existing `chapter` column
-- as the round number. The v1 CHECK (chapter ≤ 6) becomes a wall once a
-- player clears 6 rounds, so relax the cap to 1000 to mirror the level cap.
--
-- This migration is purely permissive: pre-PR-D code only ever submits
-- chapter values 1..6, so applying it before the deploy lands is safe.

BEGIN;

ALTER TABLE public.survivors_runs
  DROP CONSTRAINT IF EXISTS survivors_runs_chapter_check;

ALTER TABLE public.survivors_runs
  ADD CONSTRAINT survivors_runs_chapter_anti_afk_check
    CHECK (chapter >= 1 AND chapter <= 1000);

COMMIT;
