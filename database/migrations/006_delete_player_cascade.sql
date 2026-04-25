-- 006_delete_player_cascade.sql
-- ─────────────────────────────────────────────────────────────────────
-- delete_player_cascade(p_id integer) — wipes a player and all
-- dependent rows in one transactional call. Returns a jsonb summary
-- of rows deleted per table.
--
-- Motivation: re-testing the registration funnel previously required
-- manual SQL deletes across each child table in dependency order
-- (`feedback_registration_smoke_friction.md`).
--
-- Scope:
--   - 21 direct-child tables FK to players(id)
--   - 4 transitive child tables that FK to those direct children
--     (battles → nfts, card_durability_log → player_cards,
--      zone_card_slots → player_cards + zone_deployments,
--      bounty_damage → bounties)
--
-- Order:
--   Phase 1 — clear transitive children scoped by player ownership
--   Phase 2 — clear direct children (zone_deployments BEFORE player_nines
--             because zone_deployments.nine_id → player_nines.id)
--   Phase 3 — delete the players row itself
--
-- Multi-FK direct-child tables fold into per-table OR clauses:
--   casts: player_id OR target_player_id
--   duels: challenger_id OR target_id OR winner_id OR loser_id
--
-- History:
--   v1 (initial)   — missed transitive FKs; failed on player_cards
--                    when zone_card_slots had references.
--   v2 (this file) — adds Phase 1 transitive clears and corrects the
--                    zone_deployments / player_nines order. Replaces v1
--                    via CREATE OR REPLACE so applying this file alone
--                    is sufficient.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION delete_player_cascade(p_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  cnt integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_id) THEN
    RAISE EXCEPTION 'Player id % not found', p_id;
  END IF;

  -- ─── Phase 1: transitive children (FK to a player-owned row, not players directly) ───

  DELETE FROM battles
    WHERE challenger_nft_id IN (SELECT id FROM nfts WHERE owner_player_id = p_id)
       OR defender_nft_id   IN (SELECT id FROM nfts WHERE owner_player_id = p_id)
       OR winner_nft_id     IN (SELECT id FROM nfts WHERE owner_player_id = p_id);
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('battles', cnt);

  DELETE FROM card_durability_log
    WHERE card_id IN (SELECT id FROM player_cards WHERE player_id = p_id);
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('card_durability_log', cnt);

  DELETE FROM zone_card_slots
    WHERE card_id       IN (SELECT id FROM player_cards     WHERE player_id = p_id)
       OR deployment_id IN (SELECT id FROM zone_deployments WHERE player_id = p_id);
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('zone_card_slots', cnt);

  DELETE FROM bounty_damage
    WHERE attacker_id = p_id
       OR bounty_id IN (SELECT id FROM bounties WHERE target_player_id = p_id);
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('bounty_damage', cnt);

  -- ─── Phase 2: direct child rows (player-scoped) ───

  DELETE FROM bounties WHERE target_player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('bounties', cnt);

  DELETE FROM card_packs WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('card_packs', cnt);

  DELETE FROM casts WHERE player_id = p_id OR target_player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('casts', cnt);

  DELETE FROM chronicle_participants WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('chronicle_participants', cnt);

  DELETE FROM daily_quests WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('daily_quests', cnt);

  DELETE FROM drop_tickets WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('drop_tickets', cnt);

  DELETE FROM duels
    WHERE challenger_id = p_id
       OR target_id     = p_id
       OR winner_id     = p_id
       OR loser_id      = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('duels', cnt);

  -- zone_deployments BEFORE player_nines (zone_deployments.nine_id → player_nines.id).
  DELETE FROM zone_deployments WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('zone_deployments', cnt);

  DELETE FROM player_cards WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('player_cards', cnt);

  DELETE FROM player_items WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('player_items', cnt);

  DELETE FROM player_levels WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('player_levels', cnt);

  DELETE FROM player_nines WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('player_nines', cnt);

  DELETE FROM player_quests WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('player_quests', cnt);

  DELETE FROM player_weekly_rewards WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('player_weekly_rewards', cnt);

  DELETE FROM player_zone_metrics WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('player_zone_metrics', cnt);

  DELETE FROM nfts WHERE owner_player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('nfts', cnt);

  DELETE FROM nine_builds WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('nine_builds', cnt);

  DELETE FROM pack_inventory WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('pack_inventory', cnt);

  DELETE FROM point_log WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('point_log', cnt);

  DELETE FROM territory_actions WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('territory_actions', cnt);

  -- ─── Phase 3: the player itself ───

  DELETE FROM players WHERE id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('players', cnt);

  RETURN result;
END;
$$;

COMMENT ON FUNCTION delete_player_cascade(integer) IS
  'Hard-delete a player and all dependent rows (direct + transitive) in one transaction. '
  'Returns jsonb summary of rows deleted per table. '
  'Used by DELETE /api/admin/player/:idOrHandle for registration smoke testing.';
