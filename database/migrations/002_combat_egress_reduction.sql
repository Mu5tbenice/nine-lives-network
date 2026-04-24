-- =====================================================================
-- §9.84 — COMBAT ENGINE EGRESS REDUCTION
-- =====================================================================
-- Creates an atomic "add-to-existing" RPC for zone metrics, replacing
-- the per-tick SELECT-then-UPSERT pattern with a single RPC call.
--
-- Apply via MCP apply_migration OR Supabase Studio.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.add_zone_metrics_deltas(
  p_zone_id integer,
  p_metric_date date,
  p_deltas jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO public.player_zone_metrics
    (player_id, zone_id, metric_date, damage, heals, kos, updated_at)
  SELECT
    (elem->>'player_id')::integer,
    p_zone_id,
    p_metric_date,
    COALESCE((elem->>'damage')::integer, 0),
    COALESCE((elem->>'heals')::integer, 0),
    COALESCE((elem->>'kos')::integer, 0),
    now()
  FROM jsonb_array_elements(p_deltas) elem
  ON CONFLICT (player_id, zone_id, metric_date) DO UPDATE SET
    damage = public.player_zone_metrics.damage + EXCLUDED.damage,
    heals = public.player_zone_metrics.heals + EXCLUDED.heals,
    kos = public.player_zone_metrics.kos + EXCLUDED.kos,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

COMMENT ON FUNCTION public.add_zone_metrics_deltas IS
  'Atomic accumulator for combat metrics. Called from combatEngine.js flushZoneMetrics() — single RPC replaces SELECT + UPSERT per flush. §9.84';
