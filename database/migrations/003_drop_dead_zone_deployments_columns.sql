-- =====================================================================
-- §9.7 — DROP DEAD zone_deployments STAT COLUMNS
-- =====================================================================
-- Four columns on zone_deployments were never written by any code path:
-- damage_dealt, heals_done, kos_dealt, points_earned.
--
-- Combat stats are accumulated on player_zone_metrics (per-player / zone
-- / date granularity). zone_deployments is used only for deployment
-- lifecycle state (HP, is_active, card_ids, ko_until).
--
-- Same-named columns on other tables (casts.points_earned,
-- territory_actions.points_earned) are live and untouched.
-- =====================================================================

BEGIN;
ALTER TABLE public.zone_deployments DROP COLUMN IF EXISTS damage_dealt;
ALTER TABLE public.zone_deployments DROP COLUMN IF EXISTS heals_done;
ALTER TABLE public.zone_deployments DROP COLUMN IF EXISTS kos_dealt;
ALTER TABLE public.zone_deployments DROP COLUMN IF EXISTS points_earned;
COMMIT;
