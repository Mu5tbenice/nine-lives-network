-- 011_create_survivors_weapon_specs.sql
-- PR-A of Survivors Mode rebuild (PRD: tasks/prd-survivors-mode.md §7).
--
-- Bespoke weapon-spec table that maps a spell_id to the runtime behavior the
-- survivors client uses (auto-fire vs key-bound activated, base damage,
-- cooldown, projectile speed, AOE, pierce, and per-rarity scaling).
--
-- v1 ships this table empty except for the sentinel fallback row at spell_id
-- = 0. PR-C seeds ~5 hand-tuned bespoke specs; the remaining catalog plays
-- with the fallback until content fills in.
--
-- spell_id is INTEGER to match public.spells(id). FK is intentionally NOT
-- declared yet — PR-C will validate every seeded spec against the live spells
-- table and add the FK then. Leaving it loose for PR-A keeps the migration
-- independent of spell catalog state.

BEGIN;

CREATE TABLE IF NOT EXISTS public.survivors_weapon_specs (
  spell_id           INTEGER PRIMARY KEY,
  behavior_class     TEXT NOT NULL CHECK (behavior_class IN ('continuous', 'activated')),
  base_damage        NUMERIC,
  base_cooldown_ms   INTEGER,
  projectile_speed   NUMERIC,
  aoe_radius         NUMERIC,
  pierce             INTEGER,
  activated_keybind  TEXT,
  rarity_scaling     JSONB,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sentinel fallback row. Any spell without a bespoke spec uses this shape.
-- The numeric defaults are deliberately mid-tier so an unmapped spell still
-- feels like a working weapon (sim will tune later).
INSERT INTO public.survivors_weapon_specs
  (spell_id, behavior_class, base_damage, base_cooldown_ms,
   projectile_speed, aoe_radius, pierce, activated_keybind, rarity_scaling)
VALUES
  (0, 'continuous', 10, 1000, 200, 0, 0, NULL,
   '{"common":1.0,"uncommon":1.15,"rare":1.32,"epic":1.52,"legendary":1.75}'::jsonb)
ON CONFLICT (spell_id) DO NOTHING;

ALTER TABLE public.survivors_weapon_specs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survivors_weapon_specs_read_all" ON public.survivors_weapon_specs;
CREATE POLICY "survivors_weapon_specs_read_all"
  ON public.survivors_weapon_specs FOR SELECT
  USING (true);

COMMIT;
