# Tasks: Survivors Mode

Source PRD: [`tasks/prd-survivors-mode.md`](./prd-survivors-mode.md) (v2 — annotations integrated 2026-04-26)

## Branching convention

This task list spans **five PRs** (PR-A through PR-E), one per parent task 1.0–5.0, mirroring PRD §9 Phased Rollout. Per 9LN convention each PR ships off its own branch from `main`; there is **no umbrella feature branch**. Branch creation is the first sub-task of each parent PR.

## Relevant Files

### Backend

- `server/routes/survivors.js` — request handler for run start / draft / submit; modified across PR-A, PR-B, PR-D.
- `server/routes/survivors.test.js` — Jest tests for the survivors route (new).
- `server/routes/leaderboards.js` — adds `GET /api/leaderboards/survivors` endpoint (PR-D).
- `server/routes/leaderboards.test.js` — Jest tests for the leaderboards route additions (new).
- `server/routes/admin.js` (or wherever admin endpoints live) — adds `POST /api/admin/survivors/specs` and `POST /api/admin/survivors/cron/:job` (PR-C, PR-E).
- `server/services/survivorsLeaderboardCron.js` — daily/weekly cron logic (new in PR-E).
- `server/services/survivorsLeaderboardCron.test.js` — Jest tests (new in PR-E).
- `server/services/scheduler.js` — registers the two survivors cron jobs (modified in PR-E, follow graceful-degradation pattern).
- `server/services/pointsService.js` — consumed for `addPoints`; not modified.
- `server/services/packSystem.js` — consumed for collection-fetch query and pack generation; not modified.
- `server/config/survivors-difficulty.js` — difficulty curve coefficients + per-round Round Boss scaling + `sneak_peek_chance` (new in PR-D).
- `database/migrations/005_extend_survivors_runs.sql` — schema migration (new in PR-A).
- `database/migrations/006_create_survivors_weapon_specs.sql` — schema migration (new in PR-A).
- `database/migrations/007_create_survivors_holds_and_grants.sql` — schema migration (new in PR-A).
- `database/schema.sql` — regenerated canonical schema after each migration via `node scripts/dump-schema.js`.
- `scripts/seed-survivors-weapon-specs.js` — initial weapon spec seed (default fallback + ~5 bespoke specs, mix continuous + activated) (new in PR-C).

### Frontend

- `public/survivors.html` — game shell + HUD chrome; modified across PR-B (house picker + draft), PR-C (level-up modal + activated cooldown row), PR-D (round-cleared banner).
- `public/js/survivors/main.js` — boot / state machine / game loop; modified across PR-B, PR-C, PR-D.
- `public/js/survivors/sprite.js` — 8-direction PNG layer compositor; KEEP, do not rewrite.
- `public/js/survivors/data.js` — sprite manifest; may be extended for biome backgrounds.
- `public/js/survivors/weapons.js` — client-side weapon spec runtime (continuous + activated behavior classes) (new in PR-C).
- `public/js/survivors/weapons.test.js` — runtime tests if a frontend runner exists; otherwise documented browser-test plan in the smoke md (new in PR-C).
- `public/leaderboards.html` — adds Survivors tab at line 1232 with daily/weekly/all-time sub-views ranked by kills (PR-D).
- `public/register.html` — referenced for `.house-grid` / `.house-btn` / `.house-reveal` patterns (read-only).

### Docs & bookkeeping

- `tasks/prd-survivors-mode.md` — source PRD (v2, locked).
- `tasks/prd-9ln-product.md` — receives a new §9 entry in PR-A (resolves the v1 anon-path Known Issue) and any other §9 entries triggered by subsequent PRs.
- `audit/smoke/PR-A-survivors-schema.md` — ≤6-item smoke checklist (new).
- `audit/smoke/PR-B-survivors-auth-draft.md` — ≤6-item smoke checklist (new).
- `audit/smoke/PR-C-survivors-weapons.md` — ≤6-item smoke checklist (new).
- `audit/smoke/PR-D-survivors-rounds-leaderboard.md` — ≤6-item smoke checklist (new).
- `audit/smoke/PR-E-survivors-cron-grants.md` — ≤6-item smoke checklist (new).

### Notes

- Jest tests sit alongside the code files (e.g. `survivors.js` + `survivors.test.js` in the same directory).
- Run all tests: `npm test`. Run a single file: `npx jest server/routes/survivors.test.js`.
- After each sub-task is completed, check the box (`- [ ]` → `- [x]`) before moving on.
- 9LN PR discipline: stage files explicitly with `git add path/to/file` (never `-A` or `.`); each PR adds an `audit/smoke/PR<n>-<slug>.md` with ≤6 critical-path checks; bug-resolving PRs update the §9 entry using the `PR #?` placeholder workflow then a final bookkeeping commit.
- Migrations are filename-prefixed with an incrementing number; regenerate `database/schema.sql` via `node scripts/dump-schema.js` after DDL changes.
- Server-side `require()` of optional services follows the graceful-degradation try/catch pattern in `server/index.js` and `services/scheduler.js` — never let a missing optional dependency abort startup.

## Tasks

- [ ] 0.0 Pre-flight
  - [ ] 0.1 Confirm `tasks/prd-survivors-mode.md` v2 is the locked source of truth (no further design changes pending).
  - [ ] 0.2 Confirm Supabase access for migrations: either the `mcp__supabase__apply_migration` MCP tool is authenticated, or you have direct dashboard / psql access to the dev database.
  - [ ] 0.3 Run `npm test` on a clean `main` checkout to establish the Jest baseline; survivors tests will sit on top of this.
  - [ ] 0.4 Confirm `database/migrations/004_create_survivors_runs.sql` has been applied to the live dev database (PR-A's migrations build on it). If not, apply it first.

- [ ] 1.0 PR-A — Schema + telemetry migrations
  - [x] 1.1 `git checkout main && git pull && git checkout -b feat/survivors-schema-telemetry`.
  - [x] 1.2 Create `database/migrations/005_extend_survivors_runs.sql`: add columns `seed BIGINT NOT NULL DEFAULT 0`, `score INTEGER`, `ended_reason TEXT`, `cards_used JSONB`, `crystals_earned INTEGER DEFAULT 0`, `crystals_spent_reroll INTEGER DEFAULT 0`, `crystals_spent_upgrade INTEGER DEFAULT 0`, `client_version TEXT`. Drop the `time_sec ≤ 7200` and `level ≤ 200` CHECK constraints (or relax to anti-AFK ceilings: `time_sec ≤ 86400`, `level ≤ 1000`).
  - [x] 1.3 In the same migration, handle existing `player_id IS NULL` rows (delete if they're test data; backfill if real) then `ALTER TABLE survivors_runs ALTER COLUMN player_id SET NOT NULL`. Add a leading SQL comment explaining the choice.
  - [x] 1.4 Create `database/migrations/006_create_survivors_weapon_specs.sql` with table `(spell_id BIGINT PRIMARY KEY REFERENCES spells(id), behavior_class TEXT NOT NULL CHECK (behavior_class IN ('continuous','activated')), base_damage NUMERIC, base_cooldown_ms INTEGER, projectile_speed NUMERIC, aoe_radius NUMERIC, pierce INTEGER, activated_keybind TEXT NULL, rarity_scaling JSONB, updated_at TIMESTAMPTZ DEFAULT now())`. Insert one fallback row keyed by sentinel `spell_id = 0` with safe default values.
  - [x] 1.5 Create `database/migrations/007_create_survivors_holds_and_grants.sql` with two tables: `survivors_leaderboard_holds (id BIGSERIAL PK, player_id BIGINT NOT NULL REFERENCES players(id), rank INTEGER NOT NULL, scope TEXT NOT NULL CHECK (scope IN ('daily','weekly')), held_since TIMESTAMPTZ NOT NULL, held_until TIMESTAMPTZ, run_id BIGINT REFERENCES survivors_runs(id), reward_granted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now())` with index `(player_id, scope, reward_granted)`; and `survivors_pack_grants (id BIGSERIAL PK, player_id BIGINT NOT NULL REFERENCES players(id), source TEXT NOT NULL, run_id BIGINT NULL REFERENCES survivors_runs(id), hold_id BIGINT NULL REFERENCES survivors_leaderboard_holds(id), pack_id BIGINT NULL REFERENCES packs(id), granted_at TIMESTAMPTZ DEFAULT now())`.
  - [x] 1.6 Apply migrations 005 / 006 / 007 to dev Supabase via `mcp__supabase__apply_migration` (or psql). Verify with `mcp__supabase__list_tables` + `mcp__supabase__execute_sql` that columns/tables exist with correct types.
  - [x] 1.7 Update `server/routes/survivors.js` POST handler to accept the new optional fields nullable (`seed`, `score`, `ended_reason`, `cards_used`, `crystals_earned`, `crystals_spent_reroll`, `crystals_spent_upgrade`, `client_version`) and persist them through to the insert.
  - [x] 1.8 Regenerate canonical schema: `node scripts/dump-schema.js` and commit the updated `database/schema.sql`.
  - [x] 1.9 Add a new §9 entry to `tasks/prd-9ln-product.md` documenting the v1 anon-path issue (now resolved by this PR). Use `**Resolved YYYY-MM-DD in PR #?**` placeholder per CLAUDE.md.
  - [x] 1.10 Write Jest tests in `server/routes/survivors.test.js`: happy-path POST with all new fields; legacy POST with only old fields (backward compat); 401-or-equivalent rejection for an anon submission now that `player_id` is required.
  - [x] 1.11 Run `npm test` and confirm passing.
  - [x] 1.12 Create `audit/smoke/PR-A-survivors-schema.md` with ≤6 checks: migrations applied; sample POST with all fields succeeds; sample legacy POST still succeeds; §9 entry visible in PRD; `database/schema.sql` regenerated; anon insert is rejected.
  - [x] 1.13 Stage explicit paths only (`git add database/migrations/005_*.sql database/migrations/006_*.sql database/migrations/007_*.sql database/schema.sql server/routes/survivors.js server/routes/survivors.test.js tasks/prd-9ln-product.md audit/smoke/PR-A-survivors-schema.md`) and commit.
  - [x] 1.14 Open PR with `gh pr create`; capture the assigned PR number.
  - [x] 1.15 Bookkeeping commit: replace `PR #?` with the real PR number in the §9 entry; commit message `docs: resolve PR number references to #X`.
  - [x] 1.16 After Wray smoke confirms, merge via `gh pr merge --squash`.

- [ ] 2.0 PR-B — Auth-gated start + 2-card draft + entry precondition + 9-house picker
  - [x] 2.1 `git checkout main && git pull && git checkout -b feat/survivors-auth-and-draft`.
  - [x] 2.2 In `server/routes/survivors.js`, replace the hardcoded 4-house set (`HOUSES = {smoulders, darktide, stonebark, plaguemire}`) with all 9 (Smoulders, Darktide, Stonebark, Ashenvale, Stormrage, Nighthollow, Dawnbringer, Manastorm, Plaguemire). Validate the submitted house is in the set.
  - [x] 2.3 Add session-required middleware to `POST /api/survivors/runs`. Reject anonymous requests with 401. Use the same auth pattern as other authed routes (find an example via grep — typically a `req.session.player_id` check).
  - [x] 2.4 Add an entry-precondition check: reject `POST /api/survivors/runs` with 400 + `{reason: 'insufficient_collection'}` when the session player's `player_cards` count is below 2.
  - [x] 2.5 Implement `GET /api/survivors/start`: returns `{ houses: [...all 9 with sigil paths and base stats], cards: [...player's draft pool from player_cards], canPlay: bool, blockReason: 'insufficient_collection' | null }`. Reuse the collection-fetch pattern from `server/services/packSystem.js:667-683`.
  - [x] 2.6 Extend `POST /api/survivors/runs` body to accept `{ house, drafted_card_ids: [id1, id2], ... }`. Validate that exactly 2 ids are sent and that both belong to the session player's `player_cards`. Avoid a separate `/draft` endpoint — fold draft into run creation.
  - [x] 2.7 Update `public/survivors.html` start screen to render a 3×3 house grid using `.house-grid` / `.house-btn` patterns from `public/register.html:39-69`. Pull sigils from `public/assets/images/houses/House-{name}.png`.
  - [x] 2.8 Add the card-draft step to the start UI: after house pick, render the player's collection in a responsive grid; allow selecting exactly 2 cards; "Begin Run" button enabled only when 2 are selected.
  - [x] 2.9 Add the "open your starter packs" CTA modal: when `canPlay === false && blockReason === 'insufficient_collection'`, render a modal with a button linking to the existing pack-open page (e.g. `/packs.html`) instead of the start UI.
  - [x] 2.10 Update `public/js/survivors/main.js` to call `GET /api/survivors/start` on entering the menu state and transition through house pick → draft → play states. Pass `drafted_card_ids` and `house` into the run-create payload.
  - [x] 2.11 Write Jest tests in `server/routes/survivors.test.js` for: 401 on unauth; 400 on `<2` cards; 200 on a valid 2-card draft; rejection when `house` isn't in the 9-house set; rejection when a `drafted_card_id` doesn't belong to the player.
  - [x] 2.12 Run `npm test`.
  - [ ] 2.13 Create `audit/smoke/PR-B-survivors-auth-draft.md` with ≤6 checks: logged-out user redirected; logged-in user sees 9 houses; pick a house; pick 2 cards; "Begin Run" starts a run; new account with 0 cards sees pack CTA.
  - [ ] 2.14 Stage explicit paths and commit; `gh pr create`; merge after Wray smoke confirmation.

- [ ] 3.0 PR-C — Weapon spec system + activated-card runtime + level-up choice screen
  - [x] 3.1 `git checkout main && git pull && git checkout -b feat/survivors-weapons-and-levelup`.
  - [x] 3.2 Create `scripts/seed-survivors-weapon-specs.js`: inserts the default fallback row (already created in PR-A) and ~5 bespoke specs — pick 3 continuous (e.g. one projectile, one aura, one DOT-zone) and 2 activated (e.g. a heal pulse, a CC burst). Document the chosen spells in a top-of-file comment.
  - [x] 3.3 Run the seed script against dev Supabase; verify rows landed via `mcp__supabase__execute_sql`.
  - [x] 3.4 Implement `GET /api/survivors/specs` in `server/routes/survivors.js`: returns all rows from `survivors_weapon_specs` joined with `spells` for name/slug/icon. Cache the response in memory for 60s to avoid hot-path DB hits.
  - [x] 3.5 Create `public/js/survivors/weapons.js` — client-side runtime that: loads specs via `GET /api/survivors/specs` on run start; for each card in the build looks up its spec (falls back to the default for unmapped); implements `continuous` behavior (auto-fire on cooldown using `base_cooldown_ms`, projectile / aura / DOT per subtype); implements `activated` behavior (binds first activated card to Q, second to E, fires only on key press, shows cooldown ring in HUD); applies in-run rarity scaling per `rarity_scaling` JSONB.
  - [x] 3.6 In `public/survivors.html` HUD, add an "Activated Casts" row showing 1–2 cooldown rings labelled Q / E with the bound card's icon. Hide the row entirely when no activated cards are equipped.
  - [x] 3.7 Build the level-up choice modal in `public/js/survivors/main.js` + `public/survivors.html`: pause game and dim canvas; render 3 random offers from `player_cards` (each slot has `sneak_peek_chance` from difficulty config to instead pull a card NOT in the player's collection — visually marked with a dashed border or "From the wild" tag); "Reroll" button (spend N crystals, N escalates within one level-up); "Upgrade" button (opens secondary picker showing current build cards, spend M crystals to bump a chosen card's rarity by one tier); "Skip" button.
  - [x] 3.8 Implement build-full handling: when build has 6 cards and player accepts a new one, present a swap UI (pick one of the 6 to discard).
  - [x] 3.9 Implement duplicate handling: if accepted card is already in build, bump that instance's rarity by one tier (cap at legendary). At cap, award fixed crystal payout (configurable in `server/config/survivors-difficulty.js`).
  - [x] 3.10 Implement in-run crystal pickup: enemies drop crystal entities on death; player walks over to collect; accumulate `run.crystals_earned` and reflect in HUD.
  - [x] 3.11 Wire pause-state correctly: activated casts and weapon cooldowns must NOT advance during the level-up modal.
  - [x] 3.12 Add admin tuning endpoint `POST /api/admin/survivors/specs` (requires `x-admin-key`): upserts a spec for a given `spell_id`. Validate `behavior_class` enum and required numeric fields server-side.
  - [ ] 3.13 Write tests in `public/js/survivors/weapons.test.js` (or as a documented browser-test plan in the smoke md if no frontend runner exists) for: spec lookup with unknown spell falls back; rarity scaling math; reroll cost escalation within one level-up; build-full swap logic; duplicate-rarity bump capped at legendary → crystal payout; activated-card key binding (first→Q, second→E).
  - [x] 3.14 Run `npm test`.
  - [ ] 3.15 Create `audit/smoke/PR-C-survivors-weapons.md` with ≤6 checks: `/api/survivors/specs` returns rows; level-up offers 3 cards; reroll spends crystals and refreshes; duplicate bumps rarity in HUD; activated card binds to Q and fires on key with cooldown ring; build-full swap dialog works.
  - [ ] 3.16 Stage explicit paths and commit; `gh pr create`; merge after smoke.

- [ ] 4.0 PR-D — Round structure + Round Bosses + kills-primary scoring + leaderboard tab
  - [x] 4.1 `git checkout main && git pull && git checkout -b feat/survivors-rounds-and-leaderboard`.
  - [x] 4.2 Create `server/config/survivors-difficulty.js` exporting starter knobs: `{ T_double: 120, k_spawn: 0.85, k_hp: 1.1, k_dmg: 0.7, T_elite: 600, cap_concurrent_enemies: 250, round_step: 0.20, boss_step: 0.35, round_length_sec: 180, sneak_peek_chance: 0.07, base_spawn: 1.5, hp0: 10, dmg0: 2, boss_hp0: 200, kills_per_min_ceiling: 600, legendary_dup_crystal_payout: 200 }`. Comment all values as v1 starter, sim-tunable.
  - [x] 4.3 Implement client-side round-state machine in `public/js/survivors/main.js`: state `IN_ROUND` spawns enemies per the difficulty curve with elite chance ramping; after `round_length_sec` elapsed in-round, spawn a Round Boss and suppress further normal spawns until boss dies or kills the player; on Round Boss death emit `ROUND_CLEARED`, show banner ("ROUND N CLEARED — BIOME ↗"), 2–3s teleport animation, increment `round` counter, transition back to `IN_ROUND` for the next biome; always trigger a level-up choice on Round Boss kill (independent of XP).
  - [x] 4.4 Implement biome rotation: cycle through 9 placeholder biomes (one per house element). v1 differentiation = different background tint + enemy color palette + spawn weight; full art is a separate content track.
  - [x] 4.5 Implement Round Boss prefab: bigger sprite, `boss_hp0 * (1 + round * boss_step)` HP, larger crystal payout on death, telegraphed attack pattern (even a placeholder "charges at player every 4s" is fine for v1).
  - [x] 4.6 Server-side score recompute in `server/routes/survivors.js`: on `POST /api/survivors/runs` insert ignore client-supplied `score` and recompute server-side from validated `kills`, `time_sec`, `level`. Reference formula `score = kills * (1 + Math.log10(1 + time_sec / 60)) * (1 + level * 0.02)` — export to a module so tests can call directly. Add plausibility checks: `kills_per_minute = kills / max(1, time_sec/60)` reject if > `kills_per_min_ceiling`; reject if `level` exceeds a linear cap function of `time_sec` defined in difficulty config.
  - [x] 4.7 On insert success call `pointsService.addPoints(player_id, computed_score, 'survivors_run_complete', \`Round ${round}, ${kills} kills, ${time_sec}s\`)`.
  - [x] 4.8 Implement `GET /api/leaderboards/survivors?window=daily|weekly|alltime&limit=50&offset=0` in `server/routes/leaderboards.js`: `daily` filters `created_at >= now() - 24h`, `weekly` `>= now() - 7d`, `alltime` no filter; sort `kills DESC, score DESC, time_sec ASC, id ASC`; returns `{ window, rows: [{ rank, player_id, display_name, house, kills, score, time_sec, level, run_id }] }`.
  - [x] 4.9 Add Survivors tab to `public/leaderboards.html` at line 1232: use the existing tab JS pattern (`switchTab('survivors')`); add a sub-tab row for daily / weekly / all-time; headline column = kills.
  - [x] 4.10 Wire the client-side run-end POST in `public/js/survivors/main.js`: when player dies send `{ house, time_sec, level, kills, seed, ended_reason: 'death', cards_used: [{spell_id, final_rarity}], crystals_earned, crystals_spent_reroll, crystals_spent_upgrade, client_version }`. Client does NOT send `score`.
  - [x] 4.11 Write Jest tests for: score recompute formula (3+ scenarios spanning low/mid/high kill counts); plausibility check rejection; leaderboard sort order with ties; daily window date filter. Place in `server/routes/survivors.test.js` and new `server/routes/leaderboards.test.js`.
  - [x] 4.12 Run `npm test`.
  - [x] 4.13 Create `audit/smoke/PR-D-survivors-rounds-leaderboard.md` with ≤6 checks: play 1 round; kill round boss; see banner + biome change; die; see seasonal points credited; see entry on leaderboard ranked by kills.
  - [x] 4.14 Stage explicit paths and commit; `gh pr create`; merge after smoke.

- [ ] 5.0 PR-E — Daily / weekly cron + rank-hold tracking + 24h pack grants
  - [ ] 5.1 `git checkout main && git pull && git checkout -b feat/survivors-cron-and-pack-grants`.
  - [ ] 5.2 Create `server/services/survivorsLeaderboardCron.js` exporting `runDaily()` and `runWeekly()`. Each pulls top-3 by kills for its window (reuse the `/api/leaderboards/survivors` query); for each placement calls `pointsService.addPoints(player_id, bonus, source, description)` with bonuses `{daily: {1:500, 2:250, 3:100}, weekly: {1:5000, 2:2500, 3:1000}}` and sources `survivors_top3_daily` / `survivors_top3_weekly`. Also writes/updates `survivors_leaderboard_holds`: opens a hold row when a player enters top-3 daily, closes (`held_until = now()`) when they leave; same logic per-week for weekly.
  - [ ] 5.3 Register cron schedules in `server/services/scheduler.js` with the graceful-degradation `try { require(...) } catch(...)` pattern: daily `5 0 * * *` UTC, weekly `10 0 * * 1` UTC (Mondays). Failed registration must not abort startup.
  - [ ] 5.4 Add admin trigger endpoint `POST /api/admin/survivors/cron/:job` (requires `x-admin-key`, `:job` ∈ `daily | weekly`): synchronously runs the chosen cron job and returns the result. This is the smoke-test entry point.
  - [ ] 5.5 Implement 24h pack grant logic — either inside `survivorsLeaderboardCron.js` or as a separate job running every 15 minutes: find any `survivors_leaderboard_holds` row where `scope='daily'`, `(held_until OR now()) - held_since >= 24h`, `reward_granted = false`; for each, call the existing pack generation path in `server/services/packSystem.js` (use the standard daily-pack generator) to produce a pack for the player; insert a `survivors_pack_grants` row with `source='rank_hold_24h_daily'`, `hold_id`, `pack_id`; set `reward_granted = true` on the hold row.
  - [ ] 5.6 Write Jest tests in `server/services/survivorsLeaderboardCron.test.js` for: cron daily run with 0 / 1 / 5+ runs in the window; bonus point math; hold row open/close lifecycle (player enters/leaves top-3); 24h threshold pack grant fires exactly once per qualifying hold (no double-grant).
  - [ ] 5.7 Run `npm test`.
  - [ ] 5.8 Create `audit/smoke/PR-E-survivors-cron-grants.md` with ≤6 checks: admin trigger daily cron; top-3 receive bonus seasonal points (verify via `point_log`); hold rows opened; 24h-aged hold triggers pack grant; pack appears in player's inventory; rerunning the cron does not double-grant.
  - [ ] 5.9 Stage explicit paths and commit; `gh pr create`; merge after smoke.
