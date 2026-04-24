-- =====================================================================
-- §9.82 — RLS SECURITY PASS
-- =====================================================================
-- Enables row level security on all public tables, tightens over-permissive
-- policies, drops dead functions from §9.80 (mana cleanup), and clears
-- advisor warnings.
--
-- Apply via Supabase Studio SQL Editor OR via MCP apply_migration.
-- Safe to run multiple times (uses IF EXISTS / OR REPLACE).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. DROP DANGEROUS POLICIES
--    These allow anyone with the anon key to INSERT/UPDATE/DELETE.
--    Service role bypasses RLS natively, so no replacement is needed.
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow insert for all" ON public.players;
DROP POLICY IF EXISTS "Allow update for all" ON public.players;
DROP POLICY IF EXISTS "Allow update for all" ON public.zones;

-- ---------------------------------------------------------------------
-- 2. DROP REDUNDANT "SERVICE ROLE" POLICIES
--    Service role (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS entirely.
--    These policies are no-ops that trigger the "rls_policy_always_true"
--    advisor. Drop them; admin writes continue to work via service role.
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Service role can insert casts" ON public.casts;
DROP POLICY IF EXISTS "Service role can insert territory actions" ON public.territory_actions;
DROP POLICY IF EXISTS "Service role full access" ON public.player_zone_metrics;
DROP POLICY IF EXISTS "Service role full access" ON public.point_log;
DROP POLICY IF EXISTS "Guild clashes are deletable by service role" ON public.guild_clashes;
DROP POLICY IF EXISTS "Guild clashes are insertable by service role" ON public.guild_clashes;
DROP POLICY IF EXISTS "Guild clashes are updatable by service role" ON public.guild_clashes;

-- Deduplicate on casts (both policies are identical public SELECT)
DROP POLICY IF EXISTS "Anyone can view casts" ON public.casts;

-- ---------------------------------------------------------------------
-- 3. DROP DEAD FUNCTIONS (from §9.80 mana cleanup + legacy duplicates)
-- ---------------------------------------------------------------------

-- Mana system removed in PR #201
DROP FUNCTION IF EXISTS public.add_mana(integer, integer);

-- Unused plpgsql function (pointsService.js uses JS, not RPC)
DROP FUNCTION IF EXISTS public.add_points(integer, integer);

-- Duplicate variants — neither called via RPC anywhere in server/
DROP FUNCTION IF EXISTS public.degrade_sharpness(bigint[], integer);
DROP FUNCTION IF EXISTS public.degrade_sharpness(integer[], integer);

-- Duplicate variant of increment_season_points — keep bigint/p_pts version
-- (called from combatEngine.js:1394), drop integer/p_points plpgsql version
DROP FUNCTION IF EXISTS public.increment_season_points(integer, integer);

-- ---------------------------------------------------------------------
-- 4. FIX search_path ON REMAINING FUNCTIONS
--    Locks schema resolution to prevent path-injection attacks.
-- ---------------------------------------------------------------------

ALTER FUNCTION public.increment_season_points(bigint, integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_narrative_raids_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_spells_timestamp() SET search_path = public, pg_catalog;

-- ---------------------------------------------------------------------
-- 5. DROP DUPLICATE INDEX
-- ---------------------------------------------------------------------

DROP INDEX IF EXISTS public.spells_slug_unique;
-- (spells_slug_key is the keeper — same columns, automatically created
--  by the UNIQUE constraint.)

-- ---------------------------------------------------------------------
-- 6. ADD SELECT POLICIES FOR TABLES THE SERVER READS VIA ANON CLIENT
--    Server-only anon reads — these policies allow SELECT for anon +
--    authenticated roles. Writes still flow through service_role (bypasses
--    RLS natively). Tables not listed here are admin-only: RLS blocks all
--    anon access by default.
-- ---------------------------------------------------------------------

-- Helper: idempotent create-or-replace policy pattern
-- (DROP + CREATE because CREATE POLICY has no IF NOT EXISTS)

DROP POLICY IF EXISTS "anon_read" ON public.zone_deployments;
CREATE POLICY "anon_read" ON public.zone_deployments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.player_cards;
CREATE POLICY "anon_read" ON public.player_cards FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.player_nines;
CREATE POLICY "anon_read" ON public.player_nines FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.spells;
CREATE POLICY "anon_read" ON public.spells FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.items;
CREATE POLICY "anon_read" ON public.items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.player_items;
CREATE POLICY "anon_read" ON public.player_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.pack_inventory;
CREATE POLICY "anon_read" ON public.pack_inventory FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.card_durability_log;
CREATE POLICY "anon_read" ON public.card_durability_log FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.narrative_raids;
CREATE POLICY "anon_read" ON public.narrative_raids FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.community_clashes;
CREATE POLICY "anon_read" ON public.community_clashes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.player_quests;
CREATE POLICY "anon_read" ON public.player_quests FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.player_weekly_rewards;
CREATE POLICY "anon_read" ON public.player_weekly_rewards FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.player_levels;
CREATE POLICY "anon_read" ON public.player_levels FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.card_packs;
CREATE POLICY "anon_read" ON public.card_packs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.duel_history;
CREATE POLICY "anon_read" ON public.duel_history FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.daily_objectives;
CREATE POLICY "anon_read" ON public.daily_objectives FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.drop_tickets;
CREATE POLICY "anon_read" ON public.drop_tickets FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.chronicle_acts;
CREATE POLICY "anon_read" ON public.chronicle_acts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.chronicle_participants;
CREATE POLICY "anon_read" ON public.chronicle_participants FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.zone_guild_control;
CREATE POLICY "anon_read" ON public.zone_guild_control FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.nerm_user_memory;
CREATE POLICY "anon_read" ON public.nerm_user_memory FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.narratives;
CREATE POLICY "anon_read" ON public.narratives FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.duels;
CREATE POLICY "anon_read" ON public.duels FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read" ON public.zone_influence_history;
CREATE POLICY "anon_read" ON public.zone_influence_history FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------
-- 7. ENABLE RLS ON ALL PUBLIC TABLES FROM THE ADVISOR LIST
--    (Tables without SELECT policies above are now admin-only by default.)
-- ---------------------------------------------------------------------

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_card_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_guild_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_daily_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_community_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_influence_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_nines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_weekly_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_durability_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chronicle_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chronicle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_raids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nerm_seen_tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nerm_user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trait_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combat_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_clashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.effect_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nine_builds ENABLE ROW LEVEL SECURITY;

COMMIT;
