-- Drop deprecated V1 columns from zone_control and zone_control_history.
-- Context: Task 4.0 slice 3 of 3 (final). See PRD §9.19, §9.22.
-- Applied manually via Supabase dashboard on 2026-04-20 because MCP
-- apply_migration is blocked in read-only mode. This file documents
-- the migration for repo history.
ALTER TABLE public.zone_control DROP COLUMN IF EXISTS snapshot_hp;
ALTER TABLE public.zone_control DROP COLUMN IF EXISTS dominant_house;
ALTER TABLE public.zone_control_history DROP COLUMN IF EXISTS snapshot_hp;
