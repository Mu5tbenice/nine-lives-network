# PR #280 — Phase 2 cleanup (V3→V4 label + Plaguemire strip §9.99 + V2 flag §9.100)

**URL:** https://github.com/Mu5tbenice/nine-lives-network/pull/280
**Merged:** 2026-04-26
**Surfaces:** `combatEngine.js` (Plaguemire strip), `nethara-live.html` (V2 comment block), PRD §9.99 + §9.100

## What changed

1. Header label V3 → V4 (cosmetic).
2. Plaguemire `poison_aura` zone bonus removed from `HOUSE_BONUSES`. The inert deploy-time apply block also removed. House identity / zone bonus redesign queued for the balance-simulator pass.
3. V2 `processArenaEvent` legacy router flagged with §9.100 comment. Hard delete deferred to voxel-pixel rebuild — `_castByEffect` and friends are LIVE for the player's own cast visuals and must be preserved.

No functional change for the live player (Plaguemire bonus was inert anyway).

## Smoke checklist

- [ ] Deploy to a Plaguemire-dominant zone (if available). Verify nothing breaks — deploy works, round runs, no console errors
- [ ] Deploy to any zone — verify the player's own per-effect VFX (the `_castByEffect` treatments for BURN, POISON, HEAL, WARD, etc.) STILL fire on cast
- [ ] No regression to PR-A / B / C: heal log, intermission freeze, player slot pulse all still work
- [ ] PRD §9.99 + §9.100 visible in `tasks/prd-9ln-product.md` (lightweight check — open the file, search for the entries)

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
