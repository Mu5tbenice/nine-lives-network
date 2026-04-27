# PR-A — Survivors Mode schema + telemetry

**URL:** https://github.com/Mu5tbenice/nine-lives-network/pull/298
**Merged:** _(fill in)_
**Surfaces:** Supabase schema (3 migrations), `server/routes/survivors.js` POST handler, `tasks/prd-9ln-product.md` §9.111

## What changed

PR-A foundation for the Survivors Mode rebuild (PRD `tasks/prd-survivors-mode.md`).

- **Migration 010** — extended `survivors_runs` with 8 telemetry columns (`seed`, `score`, `ended_reason`, `cards_used`, `crystals_earned`, `crystals_spent_reroll`, `crystals_spent_upgrade`, `client_version`); relaxed v1 anti-AFK caps; deleted the 19 orphan anon test rows; flipped `player_id` to `NOT NULL`.
- **Migration 011** — created `survivors_weapon_specs` keyed by `spell_id` with `behavior_class IN ('continuous','activated')`. Sentinel fallback row at `spell_id=0` so unmapped spells stay playable. PR-C will seed the bespoke specs.
- **Migration 012** — created `survivors_leaderboard_holds` (rank-hold spans for daily/weekly cron) + `survivors_pack_grants` (audit table for 24h-hold pack rewards). Consumed by PR-E.
- **Validator extracted** — `server/routes/survivorsRunValidator.js` is a pure-function module the route + Jest tests share. POST now requires positive integer `player_id` and accepts the new optional fields.
- **§9.111** added documenting the resolved v1 anon-path issue.

No game logic changes ship in PR-A — PR-B/C/D/E own UI, weapons, rounds, cron.

## Smoke checklist (≤6)

PR-A is backend plumbing only — no user-facing changes. **Wray's job is the deploy + a smell-test of the live game; Claude verifies the new API surface and DB shape.**

### Wray's checks (game still works after deploy)

- [ ] **Replit pulled + PUBLISHED.** Live `9lv.net` is running this branch.
- [ ] **No Replit boot crash.** Replit "Logs" tab shows the server started; no red errors mentioning `survivors`.
- [ ] **Game still loads.** Open `9lv.net` (or wherever the dashboard lives), click around — registration, dashboard, arena. Nothing throws a 500 / blank page.

### Claude's checks (post-deploy, Claude runs these)

- [ ] **API verification.** `POST /api/survivors/runs` with the new fields → 200; legacy POST without new fields → 200; anon POST (no `player_id`) → 400.
- [ ] **Schema verification.** `survivors_runs.player_id IS NOT NULL`; sentinel weapon spec row exists; `survivors_leaderboard_holds` + `survivors_pack_grants` tables present.
- [ ] **§9.111 visible in PRD** with the real PR # backref (post-bookkeeping commit).

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
