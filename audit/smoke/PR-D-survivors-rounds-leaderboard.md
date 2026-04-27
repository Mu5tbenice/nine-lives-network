# PR-D — Survivors endless rounds + kills-primary scoring + leaderboard tab

**URL:** _(filled in after PR creation)_
**Merged:** _(fill in)_
**Surfaces:** survivors_runs schema (chapter cap), `server/routes/survivors.js` (score recompute + payout), `server/routes/leaderboards.js` (`GET /api/leaderboards/survivors`), `public/leaderboards.html` (Survivors tab), `public/js/survivors/spawner.js` (round-state machine), `public/js/survivors/main.js` (round banner), `public/js/survivors/ui.js` (round HUD pill).

## What changed

PR-D closes the loop. Combined with PR-C3, this is the smoke target Wray asked for.

- **Migration 013** — relaxes `survivors_runs.chapter` cap from 6 to 1000. Permissive only — old code unaffected. Already applied to dev Supabase.
- **Endless rounds** — `spawner.js` now wraps the biome index through CHAPTERS and increments a separate `state.round` counter. The "chapter" idea on the wire is just the round number now; HUD pill says "Round N — biome name" instead of "Chapter N".
- **Server-side kills-primary score** — `POST /api/survivors/runs` recomputes `score` from `(kills, time_sec, level)` via `computeScore()` and ignores any client-supplied value. Plausibility check rejects implausible runs (kills/min > 600 ceiling, level grew faster than 5/min).
- **Seasonal points payout** — successful insert calls `pointsService.addPoints(player_id, score, 'survivors_run_complete', desc)`. Fire-and-forget; row insert isn't blocked by payout failures.
- **`GET /api/leaderboards/survivors?window=daily|weekly|alltime`** — new endpoint. Sort: `kills DESC, score DESC, time_sec ASC, id ASC`. Hydrates `twitter_handle` per row.
- **Survivors leaderboard tab** — `public/leaderboards.html` gets a SURVIVORS tab next to CLASH with daily / weekly / all-time sub-views. Headline column is kills.

## Tests

- `__tests__/survivorsScore.test.js` — 12 new tests for score formula + plausibility checks. Suite total: 10/10 green, **193 tests** (was 181).

## Smoke checklist (≤6) — combined PR-C3 + PR-D session

This smoke covers PR-C3 (level-up + crystals) **and** PR-D (rounds + scoring + leaderboard) since both shipped without smoke gates per Wray's "do more depth" instruction.

### Wray's checks (in-game)

- [ ] **Replit pulled + PUBLISHED** with the latest main.
- [ ] **Round structure works.** Defeat the round boss → "Round N Cleared — biome name" banner appears, the biome shifts visually, the HUD pill updates to Round N+1, enemies spawn for the next round. Repeat at least once (round 2 → round 3).
- [ ] **Level-up + crystals + reroll.** Level up → 3 canonical card-v4 offers; kill stuff to accumulate crystals (◆ pill in top HUD); reroll once → crystals decrement by 25, offers refresh. Reroll a second time → costs 50.
- [ ] **Duplicate bumps rarity.** Pick a card already in your build → in-run damage on that weapon increases (compare to before).
- [ ] **Run-end → seasonal points credited.** Die → return to dashboard → seasonal points went up by roughly `kills × time_log × level_step`. (Open `point_log` in Supabase if you want exact value: source = `'survivors_run_complete'`.)
- [ ] **Leaderboard tab shows the run.** Open `9lv.net/leaderboards.html` → click SURVIVORS tab → DAILY view shows your just-completed run ranked by kills.

### Claude's checks (post-deploy)

- [ ] `npm test` 10/10 suites green.
- [ ] `GET /api/leaderboards/survivors?window=daily` returns at least the smoke run.
- [ ] `POST /api/survivors/runs` with `kills=10000, time_sec=10` → 400 (plausibility rejection).
- [ ] `survivors_runs.score` is server-recomputed (ignored client `score:99999`).

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
