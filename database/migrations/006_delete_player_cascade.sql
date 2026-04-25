-- 006_delete_player_cascade.sql
-- ─────────────────────────────────────────────────────────────────────
-- delete_player_cascade(p_id integer) — wipes a player and all 20
-- dependent table rows in one transactional call. Returns a jsonb
-- summary of rows deleted per table.
--
-- Motivation: re-testing the registration funnel previously required
-- manual SQL deletes across each child table in dependency order
-- (`feedback_registration_smoke_friction.md`). 20 child tables FK to
-- players(id), only player_zone_metrics has ON DELETE CASCADE. This
-- function consolidates the cascade into one call.
--
-- Tables covered (verified via grep on database/schema.sql):
--   bounties, bounty_damage, card_packs, casts, chronicle_participants,
--   daily_quests, drop_tickets, duels, nfts, nine_builds, pack_inventory,
--   player_cards, player_items, player_levels, player_nines, player_quests,
--   player_weekly_rewards, point_log, player_zone_metrics, territory_actions,
--   zone_deployments  (+ players itself).
--
-- Multi-FK tables fold into per-table OR clauses:
--   casts: player_id OR target_player_id
--   duels: challenger_id OR target_id OR winner_id OR loser_id
--   bounties: target_player_id only (no actor FK)
--   bounty_damage: attacker_id only
--   nfts: owner_player_id
--
-- Order is irrelevant for inter-table FKs (no child table references
-- another via player_id). The only ordering constraint is dependents
-- before players itself; plpgsql function bodies execute in a single
-- transaction so partial failures roll back.
--
-- Usage:
--   SELECT delete_player_cascade(123);
-- Returns:
--   {"bounties": 0, "casts": 3, "duels": 1, ..., "players": 1}
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

  DELETE FROM bounties WHERE target_player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('bounties', cnt);

  DELETE FROM bounty_damage WHERE attacker_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('bounty_damage', cnt);

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
       OR target_id = p_id
       OR winner_id = p_id
       OR loser_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('duels', cnt);

  DELETE FROM nfts WHERE owner_player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('nfts', cnt);

  DELETE FROM nine_builds WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('nine_builds', cnt);

  DELETE FROM pack_inventory WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('pack_inventory', cnt);

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

  DELETE FROM point_log WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('point_log', cnt);

  DELETE FROM territory_actions WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('territory_actions', cnt);

  DELETE FROM zone_deployments WHERE player_id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('zone_deployments', cnt);

  DELETE FROM players WHERE id = p_id;
  GET DIAGNOSTICS cnt = ROW_COUNT; result := result || jsonb_build_object('players', cnt);

  RETURN result;
END;
$$;

COMMENT ON FUNCTION delete_player_cascade(integer) IS
  'Hard-delete a player and all 20 dependent table rows in one transaction. '
  'Returns jsonb summary of rows deleted per table. '
  'Used by DELETE /api/admin/player/:idOrHandle for registration smoke testing. '
  'SECURITY DEFINER so it can be invoked by anon/authenticated through RPC if needed.';
