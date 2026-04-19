-- Cleanup ghost zone_deployments left behind by the §9.2 handleKO bug.
-- Context: §9.23 root-cause fix in PR #?. Before this fix, handleKO at
-- server/services/combatEngine.js:781 threw ReferenceError before its
-- DB-state update at L844-854 could mark KO'd deployments as inactive.
-- Result: rows with is_active=true and current_hp=0 — the "ghost
-- alive" state observed during the §9.23 diagnostic.
-- This migration retires those leftover rows. The handleKO fix in the
-- same PR prevents new ghosts from accumulating going forward.
-- Applied manually via Supabase dashboard on 2026-04-20 because MCP
-- apply_migration is blocked in read-only mode.
UPDATE zone_deployments
SET is_active = false,
    ko_at = NOW()
WHERE is_active = true
  AND current_hp = 0;
