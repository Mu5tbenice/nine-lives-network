-- Migration 009: Strip zone-bonus drift + legacy V2/V3 schema (§9.110)
-- Date: 2026-04-26
-- Context:
--   The static zones.house_bonus_label / zones.dominant_house values were
--   accidental drift from an unfinished house-of-the-day bonus system. The
--   live data showed them producing pathologies (Hanwu manastorm "+30% all"
--   creating heal/damage stalemates; Twilight plaguemire pre-applying POISON
--   stacks). The bonus model needs a clean redesign — these columns and
--   their related dead schema are removed now to clear the canvas.
--
-- Companion code changes in same PR:
--   - server/services/combatEngine.js — HOUSE_BONUSES, zoneBonusCache,
--     getZoneBonus, refreshZoneBonusCache, effectAmp, healAmp, all bonus
--     key reads (atk, hp, spd, luck, regen, heal_amp, effect_amp, crit_mult)
--     stripped.
--   - server/routes/zones.js — HOUSE_BONUSES table, GET /:zoneId/zone-bonus,
--     POST /recalculate-identities deleted.
--   - server/services/scheduler.js — nightly recalc cron call deleted.
--   - public/nethara-live.html — CLIENT_HOUSE_BONUSES + 5 UI display sites
--     stripped.
--   - EFFECTS_REFERENCE_V5.md and docs/design/zone-identity-v4.md deleted.
--
-- Kept (intentional):
--   - zones.controlling_guild + zones.branded_guild — banner / ownership
--     display surface; future redesign hooks here.
--   - zone_control + zone_control_history tables — round-history audit trail.
--
-- Safety:
--   - Pre-flight verified the legacy tables (effect_definitions, casts,
--     events, zone_effects, card_durability_log, combat_cycles) hold no
--     post-V4 data; effect_definitions has 24 rows describing a V2/V3
--     influence-economy game that the V4 engine doesn't read.

BEGIN;

-- 1. Drop dead bonus columns from zones
ALTER TABLE zones DROP COLUMN IF EXISTS house_bonus_label;
ALTER TABLE zones DROP COLUMN IF EXISTS dominant_house;

-- 2. Drop dead column from zone_control_history
ALTER TABLE zone_control_history DROP COLUMN IF EXISTS dominant_house;

-- 3. Drop dead column from zone_control
ALTER TABLE zone_control DROP COLUMN IF EXISTS dominant_house;

-- 4. Drop legacy tables (all empty post-V4 per audit/balance/2026-04-26-live-data.md §6c)
DROP TABLE IF EXISTS effect_definitions CASCADE;
DROP TABLE IF EXISTS casts CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS zone_effects CASCADE;
DROP TABLE IF EXISTS card_durability_log CASCADE;
DROP TABLE IF EXISTS combat_cycles CASCADE;

COMMIT;
