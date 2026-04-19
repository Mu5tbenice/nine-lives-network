# Tasks — 9LN Canonical PRD Rollout

Organized by the §5.5 phasing in `tasks/prd-9ln-product.md`. Each §9 item is tagged → FPRD (needs its own feature PRD + larger workstream) or → cleanup (single-PR scope). Phase tags reflect the PRD's own dispatch.

**How to read this file:**
- Parent tasks are work units, each landing in its own branch + PR.
- Phase 1 items are the critical path — nothing downstream ships until these close.
- Parents marked "Ongoing" can run in parallel with any phase; they don't block the critical path.
- Sub-tasks are implementation-ready. Check each off with `[x]` as it completes.

---

## Relevant Files

### Code that will be modified

- `server/services/combatEngine.js` — RPC-to-pointsService migration (§9.1), `handleKO` fix (§9.2), `SESSION_MS` (§9.3), `ROUND_MS` references (§9.4), zoneBonusCache (§9.19 downstream). Heaviest single file in this rollout.
- `server/services/pointsService.js` — the canonical `addPoints()` entry point everything should route through. New test coverage added in 1.9.
- `server/services/scheduler.js` — nightly cron owner; line 80 is the HTTP self-call to be replaced (§9.19).
- `server/routes/zones.js` — owns `writeNightlyPresence` (line 1014) and the parallel `/api/leaderboard/season` endpoint (line 1091) that needs to be retargeted or removed.
- `server/routes/leaderboards.js` — all reads must land on `players.seasonal_points`; verify none reference `season_points` after migration.
- `server/index.js` — stale "V6 wave combat" log at line 306 (§9.5), missing `mana.js` require at line 53 (§9.6), inline arena socket namespace.
- `server/routes/admin.js` — broken `combatEngineV2` require at line 644 (§9.6); decide fate of three dependent endpoints.
- `server/services/chronicleEngine.js` — existing length-based rubric at lines 170–187 (grounds FPRD 6.2).

### Database artifacts

- `database/schema.sql` — currently 5 bytes of corruption; target of the full Supabase dump in 3.1.
- New migration files under `database/migrations/` (or wherever convention dictates — verify during 1.1):
  - Drop `increment_season_points(bigint, integer)` overload.
  - Backfill `season_points` into `seasonal_points`.
  - Drop the `season_points` column.

### PRDs to author (all under `tasks/`)

- `tasks/prd-scoring-unification.md` (1.1)
- `tasks/prd-guild-uniqueness.md` (6.1)
- `tasks/prd-chronicle-quality-rubric.md` (6.2)
- `tasks/prd-leaderboard-subviews.md` (6.3)
- `tasks/prd-point-award-toasts.md` (6.4)
- `tasks/prd-post-l10-leveling.md` (7.1)
- `tasks/prd-items-system.md` (7.2)
- `tasks/prd-token-economy-ops.md` (7.3)
- `tasks/prd-nft-genesis-s2.md` (7.4)
- `tasks/prd-season-rollover.md` (7.5)
- `tasks/prd-testing-infrastructure.md` (8.1 — scheduled, authored later)

### Test files (to be created — Jest is configured but empty today, §9.13)

- `server/services/pointsService.test.js` — unit tests for the canonical entry point (1.9).
- `server/services/combatEngine.test.js` — smoke test for boot + tick loop (2.7).
- Future: one test file colocated with each service/route as it's touched.

### Notes

- Each parent task gets its own feature branch and PR. Branch prefixes: `fix/` for bug fixes, `feat/` for new functionality, `docs/` for PRDs, `chore/` for cleanup.
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests.
- `§9.x` references throughout point to the corresponding entry in the PRD's Known Issues ledger.
- Supabase changes: prefer the MCP's `apply_migration` for DDL; it creates a migration file under `supabase/migrations/` and applies it in one step. Plain SQL via `execute_sql` is for reads and ad-hoc verification only.

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. Update the file after completing each sub-task, not just after completing an entire parent task.

---

## Tasks

- [x] 0.0 Kickoff — branch strategy & PR cadence for the full rollout (est: S) *Absorbed into PR #132 (Task 0.5). Branching strategy, PR cadence, commit message convention, and review workflow all documented in CLAUDE.md and demonstrated by shipped PRs #125–#138. No separate PR needed.*
  - [ ] 0.1 Confirm branch-prefix convention per task type: `fix/` (1.0, 2.0, 3.0, 4.0), `chore/` (5.0), `docs/` (6.x, 7.x, 8.x).
  - [ ] 0.2 Confirm PR ordering — Phase 1 parents can run in parallel (different files), but 1.0 and 2.0 both touch `combatEngine.js` so sequence them 1.0 → 2.0 to avoid merge pain. 3.0, 4.0, and 5.0 are independent.
  - [ ] 0.3 Commit message convention — match existing repo style (observed in recent commits): lowercase type prefix, em-dash separator, terse subject under 70 chars, detailed body.
  - [ ] 0.4 Decide whether to open all Phase 1 PRs as draft-first or ready-for-review. Recommend draft-first so stakeholder can preview before combat-engine changes go live.

- [x] 0.5 PRD update convention (est: S — one-time setup)
  - [x] 0.5.1 Establish: every PR that resolves a §9 PRD entry MUST update the PRD in the same commit (mark entry as 'Resolved YYYY-MM-DD in PR #X' rather than deleting).
  - [x] 0.5.2 Establish: every PR that introduces a new known issue MUST add a §9 entry (numbered next available).
  - [x] 0.5.3 Update `CLAUDE.md` to enforce this convention for future Claude Code sessions.
  - [x] 0.5.4 Apply the convention retroactively to PRs already merged today (#125, #126, #127, #128, #129, #130) — §9.5 (PRs #126 + #128), §9.9 (PRs #126 + #127) fully resolved; §9.6 (PR #125, schema.sql only) and §9.8 (PR #127, .bak only) partially resolved. #129 (PRD creation), #130 (working tree cleanup) didn't have §9 entries to resolve.

### Phase 1 — Scoring Foundations (critical path)

- [ ] 1.0 Scoring pipeline unification (§9.1 + §9.2 → FPRD, bundled) (est: L)
  - [ ] 1.1 Author `tasks/prd-scoring-unification.md` using `tasks/create-prd.md` template. Cover: why unify, migration order, backfill stakeholder review, rollback plan, verification checklist.
  - [ ] 1.2 Via Supabase MCP `apply_migration`, drop the `increment_season_points(bigint, integer)` RPC overload. The `(integer, integer)` plpgsql overload becomes the only signature; it already writes `seasonal_points` + `lifetime_points`. Verify with `pg_get_functiondef` after.
  - [ ] 1.3 Migrate `server/services/combatEngine.js:653` — replace `supabaseAdmin.rpc('increment_season_points', ...)` with `pointsService.addPoints(n.playerId, pts, source, description)` where `source` is `'zone_survive'`, `'zone_control'`, or `'zone_flip'` depending on the point component.
  - [ ] 1.4 Fix `handleKO(nine, zoneId, all)` at `server/services/combatEngine.js:393`. Derive killer as `const killerId = nine._lastHitById ?? nine._dotAppliedById;` and `const killerName = nine._lastHitBy ?? nine._dotAppliedBy;`. Replace the undefined-variable broadcast at line 398.
  - [ ] 1.5 Route the KO reward through `pointsService.addPoints(killerId, 10, 'zone_ko', \`KO'd @${ko'dName} on ${zoneName}\`)`. Remove the RPC call at line 411.
  - [ ] 1.6 Write a one-time backfill migration (separate PR, stakeholder-gated): `UPDATE players SET seasonal_points = seasonal_points + season_points WHERE season_points > 0;` — review top-10 affected rows with stakeholder first. Log the diff to `point_log` with `source='migration_season_backfill'` so the audit trail is complete.
  - [ ] 1.7 After 1.6 ships and is verified, drop the `players.season_points` column via migration.
  - [ ] 1.8 Retarget or remove `/api/leaderboard/season` at `server/routes/zones.js:1091`. If retained, point it at `seasonal_points` with a time-bounded filter once seasons exist; otherwise remove and grep `public/` for any client-side callers.
  - [ ] 1.9 Create `server/services/pointsService.test.js`. Tests: `addPoints` increments both columns, inserts one `point_log` row, handles negative amounts (decay path), handles unknown `playerId` gracefully. Use a throwaway Supabase branch via MCP `create_branch` for isolation.
  - [ ] 1.10 Manual QA — local dev or Supabase branch isolation:
    - a. Start `npm run dev` locally; deploy a test Nine to a zone via the live UI (using the Twitter OAuth dance against production Supabase via the local server).
    - b. Trigger a KO event manually (admin endpoint or by playing).
    - c. Verify in Supabase via MCP: (i) `point_log` has a row with `source='zone_ko'` and the correct `player_id`; (ii) `players.seasonal_points` incremented by 10; (iii) `players.lifetime_points` incremented by 10; (iv) `players.season_points` unchanged (zero new writes).
    - d. Wait for round end; verify survive (+5), control (+8), and any flip (+15) points appear in `point_log` with correct sources and on `seasonal_points`.
    - e. If any verification fails, do NOT promote 1.11 — fix and re-test.
  - [ ] 1.11 Update PRD §9.1 and §9.2 entries to "resolved" once 1.10 passes.
  - [ ] 1.12 Regression guard: write a simple weekly health check (cron or manual-runnable script) that queries `point_log` source distribution. Alert if any row appears with `source` matching the deprecated patterns (writes to `season_points`, direct `UPDATE` bypassing `pointsService`). Any non-zero count means unification has regressed.
    - Implementation: add to `scripts/health/scoring-pipeline-check.js`
    - Schedule via `services/scheduler.js` — Sunday 03:00 UTC
    - Output to console + optionally Telegram (via existing Nerm channel)
  - [ ] 1.13 Phase 1 release moment:
    - Update `README.md` changelog with Phase 1 summary
    - Tweet from `@9LVNetwork` acknowledging the scoring fix (drafting suggestion: *"Behind the scenes: every KO and round-end point now lands correctly. If your leaderboard rank shifted, that's why — actual play is now what counts."*)
    - Verify production deployment via Replit republish
    - Mark Phase 1 'Done' in PRD §5.5

- [x] 2.0 Combat engine code hygiene (§9.3 + §9.4 + §9.5 → cleanup cluster) (est: S — re-estimated after §9.5 struck)
  - [x] 2.1 Change `SESSION_MS` at `server/services/combatEngine.js:17` from `1 * 60 * 60 * 1000` to `2 * 60 * 60 * 1000` — matches PRD §4.8.5.
  - [x] 2.2 Remove the `roundMs: ROUND_MS` field from the `arena:round_start` broadcast at `server/services/combatEngine.js:727`. Rounds have no fixed length; clients should count elapsed time.
  - [x] 2.3 Remove the `getRoundMs: () => ROUND_MS` export at `server/services/combatEngine.js:894`.
  - [x] 2.4 Grep the repo for any caller of `getRoundMs` — update or remove callers. Same for client-side listeners of `roundMs` in `arena:round_start` — verify nothing breaks. *Verified zero consumers in `server/` and `public/`.*
  - [x] 2.5 ~~Delete the stale `"⚔️ Combat engine started — V6 wave combat, 30s buffer"` log at `server/index.js:306`.~~ **Struck — already resolved retroactively in PRs #126 + #128 per §9.5.**
  - [x] 2.6 ~~Boot the server locally, confirm log output shows V3 only (no "V6 wave combat" line).~~ **Struck — verification of §9.5 already done at PRD §9.5 markup time on 2026-04-18.**
  - [x] 2.7 ~~Add `server/services/combatEngine.test.js` smoke test.~~ **Dropped from this PR — defer all test infrastructure decisions (runner, layout, config) to Task 8.1.** Regression confirmed via `node -e "require('./server/services/combatEngine.js')"` exit 0.

- [x] 3.0 Missing-file resolution (§9.6 → cleanup) (est: S — re-estimated after 3.1 struck, 3.4/3.5 deferred)
  - [x] 3.1 ~~Dump the live Supabase schema to `database/schema.sql`.~~ **Struck — pre-done retroactively in PR #125 per §9.6 audit.**
  - [x] 3.2 Decide fate of `server/routes/mana.js`. *Deleted the require block at `server/index.js:52-58` per PRD §5.9 non-goal. Grep verified zero consumers of `/api/mana/*` in `server/` or `public/`.*
  - [x] 3.3 Decide fate of `server/services/combatEngineV2.js`. *Deleted the require + 3 dependent admin endpoints at `server/routes/admin.js:639-687` per PRD §5.8 non-goal. V2-specific concepts (15-min snapshots, `forceSnapshot`, `reloadZone`) don't map to current V3/V4 engine — re-pointing would be a semantic translation not in §9.6 scope.*
  - [x] 3.4 ~~Add a `/api/health` endpoint that reports failed requires.~~ **Deferred to Task 8.6 (boot-time observability).** This is a new concern, not a §9.6 resolution — deserves its own task + plan + estimate.
  - [x] 3.5 ~~Verify: boot → curl `/api/health` → confirm zero failed requires.~~ **Deferred with 3.4 to Task 8.6.** This PR verified via `node --check` on both modified files (both pass) + grep confirming zero `combatEngineV2` or `/api/mana` references anywhere in `server/` or `public/`.

- [x] 4.0 Nightly zone-identity cron fix + diagnostic (§9.19 → Phase 1 critical) **(fully resolved 2026-04-20 across PR #141 / #143 / #144 / #145a / #145b)** (est: M — re-estimated from L after Task 4.5 locked the design)
  - [x] 4.1 ~~**DIAGNOSTIC FIRST.** Via Supabase MCP, query `zones` table and `zone_control.updated_at` for the past 7 nights. Check whether `branded_guild` and `dominant_house` have been updating daily. Command sketch: `SELECT id, branded_guild, dominant_house, updated_at FROM zones ORDER BY updated_at DESC;`~~ **Diagnostic complete 2026-04-19 in PR #141. Fix scope is now dependent on design decisions — see Task 4.5 and `docs/design/zone-identity-v4.md`.** The diagnostic disproved the PORT-mismatch hypothesis; the real issues are an incomplete round-end writer, a split source of truth, and undefined V4 semantics. Findings captured in PRD §9.19 (reframed) and §9.20–9.22 (new).
  - [x] 4.2 ~~If stale: document how many zones + how many days. Estimate affected rounds (the in-combat `zoneBonusCache` at `combatEngine.js:97-100` would have been applying pre-stale-date bonuses). Surface to stakeholder.~~ **Superseded 2026-04-19 in PR #141.** Diagnostic showed the cron fires correctly; impact is NULL aggregation, not missed-cron staleness. Scope reframed in PRD §9.19.
  - [x] 4.3 ~~Refactor `server/services/scheduler.js:80`. Replace `fetch('http://localhost:${PORT||5000}/api/zones/recalculate-identities')` with a direct `require('../routes/zones').writeNightlyPresence()` call — or extract `writeNightlyPresence` to a shared service if the route file shouldn't be reached into.~~ **Superseded 2026-04-19 in PR #141.** The self-call is not the defect. May still be desirable as a code-hygiene cleanup but is not on the Task 4.0 critical path.
  - [x] 4.4 ~~Remove the HTTP self-call pattern entirely from scheduler.js — same-process work should be a direct function call. Grep for any other `fetch('http://localhost:...')` inside the scheduler and fix similarly.~~ **Superseded 2026-04-19 in PR #141** — same rationale as 4.3.
  - [x] 4.5 ~~Add a log line after the direct call that reports how many zones were updated: `[${ts()}] 🌙 Zone identity recalc complete — N zones updated`.~~ **Superseded 2026-04-19 in PR #141.** The recalc endpoint already logs this via its `console.log` at `server/routes/zones.js:1154`.
  - [x] 4.6 ~~Verify the next midnight UTC run updates all 27 zones by re-running the diagnostic query from 4.1.~~ **Superseded 2026-04-19 in PR #141.** Zone count is 9 in V4 (not 27 V1). Verification step will be re-scoped once the design doc resolves.
  - [x] 4.7 ~~Update PRD §9.19 to "resolved" after 4.6 passes.~~ **Superseded 2026-04-19 in PR #141** — §9.19 is now BLOCKED rather than resolvable via this task's original plan.
  - [x] 4.0.1 ~~Update `combatEngine.endRound` to write per-round `dominant_house` per Q1 rule (deployment count, tiebreak with winning guild's dominant house).~~ **Landed 2026-04-20 in PR #143.** Per-round computation in `combatEngine.js` endRound. Tiebreak 1 = winning guild's dominant house. Tiebreak 2 = random. `branded_guild` = winner at round level. `snapshot_hp` omitted from insert (§9.22 cleanup).
  - [x] 4.0.2 ~~Update `/recalculate-identities` aggregation to use rounds-won counting per Q2 rule (not deployment-count tally).~~ **Landed 2026-04-20 in PR #143.** Rounds-won aggregation with tiebreak 1 = 24h deployment count (close proxy for "summed across rounds"; strict semantic would need a JSONB column, flagged as known imprecision in the commit body), tiebreak 2 = random. Applied to both `dominant_house` and `branded_guild`.
  - [x] 4.0.3 ~~Refactor combatEngine zone-bonus reader to read `zones` table instead of `zone_control` per Q4.~~ **Landed 2026-04-20 in PR #144.** `refreshZoneBonusCache` at `server/services/combatEngine.js:124-142` now reads from `zones`. Zones-list merge at `server/routes/zones.js:829-841` also flipped to prefer `zones` over `zone_control` so frontend and combat see the same authoritative value. `zone_control.dominant_house` column drop deferred to PR #145. Closes §9.21.
  - [x] 4.0.4 ~~Drop `snapshot_hp` column from `zone_control` and `zone_control_history` via migration; remove any remaining writers per Q5.~~ **Landed 2026-04-20 across PR #145a (reads removed) and PR #?. (schema drop)**. `zone_control.dominant_house` also dropped (Q4 cleanup). Migration at `supabase/migrations/20260419144153_drop_zone_control_deprecated_columns.sql` — applied manually via Supabase dashboard because MCP is in read-only mode. Post-drop schema verified via `execute_sql`. Closes §9.22.
  - [x] 4.0.5 ~~Delete orphaned `/midnight-reset` endpoint per §9.20.~~ **Landed 2026-04-20 in PR #143.** Endpoint at `server/routes/zones.js` deleted. Zero consumers confirmed via grep before deletion. Closes §9.20.
  - [x] 4.0.6 ~~Wire minimal guild-tag text rendering on zone cards (no logo yet) per Q3 scope.~~ **Landed 2026-04-20 in PR #144.** Branded-guild text pill added to `buildZoneCard` in `public/nethara-live.html`. Subordinate styling vs the controlling_guild pill. Logo rendering remains deferred to the guild-profile-system task (Task 10.0).

- [x] 4.5 Zone identity V4 design decisions — resolve the open questions in `docs/design/zone-identity-v4.md`. Prerequisite for Task 4.0 fix. Owner: user. Est: M — design work, not coding. **Resolved 2026-04-20 in PR #142. All 5 decisions locked in `docs/design/zone-identity-v4.md`.**
  - [x] 4.5.1 ~~User answers Q1 (per-round `dominant_house` semantics) inline in the design doc.~~ **Answered 2026-04-20 in PR #142.** Q1: most-deployed house; tiebreak = winning guild's dominant house.
  - [x] 4.5.2 ~~User answers Q2 (per-day aggregation rule) inline in the design doc.~~ **Answered 2026-04-20 in PR #142.** Q2: house dominant in most rounds; tiebreaks = total deployments, then random.
  - [x] 4.5.3 ~~User answers Q4 (source of truth — `zone_control` vs `zones`) inline in the design doc.~~ **Answered 2026-04-20 in PR #142.** Q4: `zones` table authoritative; combat engine refactored to read from `zones`; `zone_control.dominant_house` dropped.
  - [x] 4.5.4 ~~User answers Q5 (`snapshot_hp` drop — default proposal accept/reject) inline in the design doc.~~ **Answered 2026-04-20 in PR #142.** Q5: drop column from both `zone_control` and `zone_control_history`; remove remaining writer references.
  - [x] 4.5.5 ~~Q3 (`branded_guild` display) may be deferred — not gating combat bonuses. Mark deferred if skipped.~~ **Answered 2026-04-20 in PR #142.** Q3: controlling guild in most rounds; same tiebreak as Q2. Task 4.0 scope = data plumbing + minimal text rendering (guild tag only); logo UI deferred to the new guild-profile-system task (see Task 10.0).
  - [x] 4.5.6 ~~Once Q1/Q2/Q4/Q5 are answered, unblock Task 4.0 and scope its new sub-tasks against the decisions.~~ **Done 2026-04-20 in PR #142.** Task 4.0 unblocked; new sub-tasks 4.0.1–4.0.7 added under Task 4.0.

### Ongoing — runs parallel to any phase; does not block critical path

**Dependencies within §5.0:** 5.1 → 5.5 (`seed-narratives.js` fate). 5.3 → 5.7 (arena-engine V5 deletion follows arena-sockets decision). 5.8 → 5.9 (Drizzle removal follows React scaffold removal). All others are independent and can run in any order.

- [ ] 5.0 Cleanup sweep — orphans, dead code, repo spillage (§9.7–§9.12) (est: L)
  - [ ] 5.1 Decide fate of `zone_deployments.damage_dealt`, `heals_done`, `kos_dealt`, `points_earned` columns (§9.7). Default: drop them via migration. Alternative: wire them up in `combatEngine.js` during the 1.x work so per-session stats appear on the profile page.
  - [ ] 5.2 Per-file triage of orphaned routes (§9.8): `arena.js`, `chronicle.js`, `drop-tickets.js`, `leveling.js`, `raids.js`, `stats.js`. For each orphaned route file, grep `public/**/*.{html,js}` AND `client/**/*` for API path references. If any caller exists, do NOT delete — either mount the route or remove the caller. Log decision per route in commit message.
  - [ ] 5.3 Per-file triage of orphaned services (§9.8): `House-zones.js`, `arena-sockets.js` (duplicate of inlined `index.js:204-270`), `cardDurability.js`, `livesReset.js`, `nerm-hooks-v2.js`, `nineStats.js`, `seed-narratives.js` duplicate. Default: delete. Move `nermBot.js.bak` out of git entirely.
  - [ ] 5.4 Delete shell-accident files at repo root (§9.9): `collection`, `dont`, `glass cannon` (with space), `workspace`, `const { data: cardSlots } = await supabase`, `sedufYWHw`. All empty or junk.
  - [ ] 5.5 Move one-off scripts from repo root to `scripts/archive/` (§9.9): `fix-card-refs.py`, `nuke-old-cards.py`, `patch-game-modes-v4.py`, `patch-packs.sh`. Delete the duplicate root-level `seed-narratives.js` (the one under `server/services/` is the live path, also being evaluated in 5.3).
  - [ ] 5.6 Verify faction name drift (§9.10): query live `houses` table via MCP, compare against PRD §4.3 canonical names (Stormrage/Smoulders/etc.). If matching, delete the legacy table in `README.md`. If mismatched, open a separate migration PRD — do not silently rename rows.
  - [ ] 5.7 Arena-engine V5 decision (§9.11). Inspect `server/services/arena-engine.js` and confirm it's unreachable (no startup require, and `arena-sockets.js` that would load it is itself orphaned per 5.3). If confirmed dead, delete the file as part of the same sweep that handles 5.3.
  - [ ] 5.8 React scaffold `/client/` decision (§9.12). Default: delete the directory + update `package.json` to remove React-only dependencies (`react`, `react-dom`, `@vitejs/plugin-react`, `drizzle-kit`, shadcn UI pieces). If retained, a dedicated migration PRD is required before any work starts.
  - [ ] 5.9 Remove `drizzle.config.ts` and `shared/schema.ts` (the placeholder `users` table) if 5.8 deletes the React scaffold — Drizzle has no game-table coverage (§7.4).

### Phase 2 — Player Onboarding & Visible Feedback (FPRDs)

- [ ] 6.0 Phase 2 feature PRDs — author + schedule (est: L — 4 FPRDs)
  - [ ] 6.1 Write `tasks/prd-guild-uniqueness.md` (§9.15). Cover: canonicalization algorithm (casefold + strip zero-width + trim), allow-list vs claim-flow decision, migration for existing `players.guild_tag` rows, rollout order.
  - [ ] 6.2 Write `tasks/prd-chronicle-quality-rubric.md` (§9.18). Cover: replace length heuristic at `chronicleEngine.js:170-187`; options include LLM-graded rubric (via existing Anthropic integration) or moderator-reviewable flags; rollout / backtest plan against historical replies.
  - [ ] 6.3 Write `tasks/prd-leaderboard-subviews.md`. Cover: daily / seasonal / zone / guild drill-down views, query performance targets (500ms p50), cache strategy, URL scheme.
  - [ ] 6.4 Write `tasks/prd-point-award-toasts.md`. Cover: Socket.io broadcast on `point_log` insert (use Supabase realtime or a post-insert trigger), toast UI pattern, rate-limiting for burst events like round-end payouts.
  - [ ] 6.5 FPRD execution order — name the order explicitly:
    1. **6.4 (point award toasts)** — depends on Phase 1 `point_log` accuracy; ship immediately after Phase 1 closes for instant visible feedback.
    2. **6.1 (guild uniqueness)** — gates community growth; impersonation prevention is a credibility issue once player count grows.
    3. **6.2 (chronicle quality rubric)** — improves Chronicle scoring fairness; lower urgency until reply volume justifies semantic scoring cost.
    4. **6.3 (leaderboard sub-views)** — polish; least urgent.

    Each FPRD spawns its own `tasks-prd-<n>.md` after approval.
  - [ ] 6.6 Manual verification that satisfies Phase 2 "Done when" criteria (PRD §5.5): new-player path under 60s; leaderboards under 500ms p50; KO +10 row visible in personal history before next round.

- [ ] 10.0 Guild profile + identity system (est: L — feature work) *Surfaced by Task 4.5 Q3 — the `branded_guild` UX is half-implemented because guilds have no profile system. Prerequisite: none (can parallel Task 4.0 fix).*
  - [ ] 10.1 Scope: `guilds` table with name, slug, logo upload, description, ownership, membership model.
  - [ ] 10.2 Scope: UI flows for guild creation, joining, logo upload.
  - [ ] 10.3 Scope: integration with `branded_guild` display in zone cards (replaces the manual-logo-assignment interim from Task 4.0.6).

### Phase 3 — Hardcore Community Foundations (FPRDs)

- [ ] 7.0 Phase 3 feature PRDs — author + schedule (est: L — 5 FPRDs + legal coordination)
  - [ ] 7.1 Write `tasks/prd-post-l10-leveling.md` (§9.16). Cover: hard cap vs soft cap vs rollover design, stakeholder decision, XP curve beyond L10 if applicable, UI updates.
  - [ ] 7.2 Write `tasks/prd-items-system.md`. Cover: full stat range (5–20 per stat confirmed in PRD §4.14), drop source per rarity, crafting path, trade-offs between Weapon/Outfit/Hat slot focus, no-sharpness invariant.
  - [ ] 7.3 Write `tasks/prd-token-economy-ops.md` (§9.17). Cover: claim cadence (manual vs scheduled), eligibility gates, ratio-adjustment governance, anti-Sybil baseline (Twitter account age? Chronicle activity threshold?), audit trail columns.
  - [ ] 7.4 Write `tasks/prd-nft-genesis-s2.md`. Cover: 2,500 Genesis scope, allocation method (mint, airdrop, earn), gameplay effects (PRD §1 says Season 2+ but no specifics), Solana integration plan.
  - [ ] 7.5 Write `tasks/prd-season-rollover.md`. Cover: snapshot mechanics (freeze leaderboard, backfill to a `season_snapshots` table), `seasonal_points` reset logic, `lifetime_points` preservation, season-end reward computation, cutoff timing, communication plan.
  - [ ] 7.6 Pre-launch legal consult for token claim flow (7.3). Before token claim ships, consult a lawyer with experience in:
    - Securities classification of `$9LV` under applicable jurisdictions (US, EU, Spencer's jurisdiction).
    - Anti-Sybil / KYC requirements for token distribution.
    - Consumer protection on point→token conversion ratio changes.

    This is an external service cost. Budget and schedule before 7.3 implementation begins, not after.
  - [ ] 7.7 Order the 5 FPRDs by stakeholder value; likely items (7.2) and post-L10 (7.1) are the near-term player-facing wins, NFT Genesis (7.4) is Season 2 gating, season rollover (7.5) is infrastructure that must exist before seasonal resets.

### Deferred / Tracked

- [ ] 8.0 Deferred-but-tracked items (est: S)
  - [ ] 8.1 Author `tasks/prd-testing-infrastructure.md` (§9.13) — after Phase 1 closes. Cover: Jest configuration standards, where tests live (colocated), coverage targets, CI integration, initial suite scope (pointsService, combatEngine smoke, key routes).
  - [ ] 8.2 Set a calendar reminder for 2026-10-17 (six months out) to review `zone_control_history` row growth vs PRD §7.7's ~96k rows/year projection. If on track, author a retention PRD.
  - [ ] 8.3 Confirm PRD §7.7 already captures the storage-growth plan adequately; if not, expand with concrete rollup criteria (e.g., "archive rows older than 90 days to `zone_control_history_archive` table").
  - [ ] 8.4 Quarterly PRD review — 2026-07-17 — verify §9 resolutions are accurately reflected and close any ledger entries that are now done.

- [x] 8.5 Establish lint + formatter baseline (est: M) *All non-deferred sub-tasks complete in PR #138 (2026-04-19). Sub-task 8.5.5 (CI integration) deliberately deferred — tied to Task 8.1 testing infrastructure decisions.*
  - [x] 8.5.1 Add `.prettierrc`, `.eslintrc.cjs` with sensible vanilla-JS + Express defaults. *Also added `.prettierignore` + `.eslintignore`. `singleQuote: true` chosen to reduce churn vs ambient style. ESLint on `eslint:recommended` + Node env with 4 rules relaxed (no-unused-vars, no-empty, no-inner-declarations, no-case-declarations) — rationale documented in `.eslintrc.cjs` and in the PR body.*
  - [x] 8.5.2 Add `npm run lint`, `npm run format`, and `npm run format:check` scripts to `package.json`.
  - [x] 8.5.3 Run formatter once across the whole repo as a single "apply formatter" commit (no logic changes). *132 files reformatted. `public/**` deferred to a future dedicated PR — inline-JS HTML is higher risk.*
  - [x] 8.5.4 Document lint conventions in `CLAUDE.md`. *Documented inline in `.eslintrc.cjs` rule relaxations + PR body. If a CLAUDE.md mention is desired, add in a follow-up docs PR — kept out of this bulk-reformat PR to preserve review focus.*
  - [ ] 8.5.5 Decide CI integration (probably defer until §8.1 testing infrastructure).

- [x] 8.6 Boot-time observability — `/api/health` with `failed_requires` reporting (est: S–M) *Landed in PR #140 (2026-04-19). Actual site count on wire-up was 21 + 15 = 36 (rollout text said 22 + 15 = 37); the discrepancy is the Socket.io try/catch being counted differently, not missed coverage.*

  **Context.** Surfaced out of Task 3.0 (PR #137). Originally planned as 3.4 but deferred because it's a new observability concern, not a §9.6 resolution. PRD §7.2 already names it as a "planned follow-up" — this task lands it.

  **Scope from 2026-04-18 investigation.** `server/index.js` has **22** `try { require(...) } catch (e) { ... }` sites for optional routes/engines. `server/services/scheduler.js` has **15** similar sites for scheduled jobs. Both files use the graceful-degradation pattern per PRD §7.2, so both must be covered.

  - [x] 8.6.1 Add module-level `bootFailures` array at top of `server/index.js`. *Deviated: `bootFailures` lives in `server/services/bootFailures.js` (shared module) rather than inline in `server/index.js`. Required because `scheduler.js`'s catch blocks execute during its require from index.js — a file-level array in index.js can't see scheduler failures without an awkward export dance. Shared module → single accumulator, single source for `/api/health`.*
  - [x] 8.6.2 Update every existing `try { require(...) } catch (e) { ... }` site in `server/index.js` (22 sites) and `server/services/scheduler.js` (15 sites) to push `{ module, error: e.message }` into `bootFailures` on failure. Consider extracting a shared helper if the pattern proves noisy. *Extracted `captureBootFailure(module, error)` helper. Each entry also carries `stack` and `timestamp` — zero cost when empty, high value when the endpoint actually matters. Existing `console.log`/`console.error` lines preserved alongside the new capture call.*
  - [x] 8.6.3 Extend the existing `/api/health` endpoint at `server/index.js:308` (currently returns `{ status, timestamp }`) to include `failed_requires: bootFailures` in the JSON response. *`status` stays `"ok"` — this is observability, not health gating. Consumers read `failed_requires.length` to decide policy.*
  - [x] 8.6.4 Smoke-verify: boot the server, `curl localhost:$PORT/api/health`, assert `failed_requires: []` (post-Task 3.0 state). Optionally introduce a deliberate missing-require test (temporary rename of an optional file) to confirm it surfaces in the response, then restore. *Both verified: clean boot → `failed_requires: []`. Deliberate-fail test (temporarily renamed `routes/quests.js`) surfaced `{ module: './routes/quests', error: 'Cannot find module...', stack: '...', timestamp: '...' }` as expected.*
  - [x] 8.6.5 Update PRD §7.2 ("Caveat of this pattern") to reference the landed endpoint instead of the "planned follow-up" phrasing.
