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

- [ ] **Boot log clean.** Pull on Replit, PUBLISH. Server boot log shows no errors loading `./routes/survivors`. The graceful-degradation `try/require` around `survivorsRoutes` should not log a captured boot failure.
- [ ] **Migrations applied.** In Supabase SQL editor, confirm `\d survivors_runs` shows `player_id` as `NOT NULL` and the 8 new columns present; `\dt survivors_*` shows 4 tables (`survivors_runs`, `survivors_weapon_specs`, `survivors_leaderboard_holds`, `survivors_pack_grants`); `SELECT * FROM survivors_weapon_specs` returns the sentinel `spell_id=0` row.
- [ ] **Authed POST succeeds.** `curl -X POST https://9lv.net/api/survivors/runs -H 'content-type: application/json' -d '{"player_id":<your id>,"house":"smoulders","time_sec":120,"level":3,"kills":42,"chapter":1,"won":false,"seed":12345,"ended_reason":"death","crystals_earned":50,"client_version":"smoke-PR-A"}'` returns `{ok:true, id, created_at, seed:12345}`. `SELECT * FROM survivors_runs ORDER BY id DESC LIMIT 1` shows your row with all the new fields populated.
- [ ] **Legacy POST still succeeds.** `curl -X POST https://9lv.net/api/survivors/runs -H 'content-type: application/json' -d '{"player_id":<your id>,"house":"smoulders","time_sec":60,"level":2,"kills":10,"chapter":1,"won":false}'` returns 200 (backward compat — old client shape works as long as `player_id` is included). The inserted row has `seed > 0` (server-generated), `score=null`, `crystals_*=0`.
- [ ] **Anon POST rejected.** Same curl with `player_id` omitted returns 400 `{error:"player_id required"}`. Drop into Supabase: `SELECT count(*) FROM survivors_runs WHERE player_id IS NULL` returns 0.
- [ ] **§9.111 visible in PRD.** `grep -c "9.111" tasks/prd-9ln-product.md` returns ≥1; entry resolves with the real PR number (post-bookkeeping commit).

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
