# Handover: Survivors Mode planning session

Session date: 2026-04-26 (late evening)
Outcome: PRD v2 locked, full task list scaffolded, zero code shipped (planning-only session by design).

## Artifacts produced

| File | What it is |
|---|---|
| `tasks/prd-survivors-mode.md` | PRD v2. 10 sections per `tasks/create-prd.md` template. All Wray-annotated docx changes integrated. |
| `tasks/tasks-prd-survivors-mode.md` | Implementation task list. 5 PRs (PR-A through PR-E), 69 sub-tasks, with relevant files + 9LN PR discipline notes. |
| `tasks/handover-survivors-mode.md` | This file. |

The earlier `prd-survivors-mode.docx` (Wray's annotated copy) and `~$d-survivors-mode.docx` lock file remain in `tasks/` — the integrated content lives in the `.md` now, so the docx can be archived or deleted at Wray's discretion.

## Locked design decisions

These are settled, no further interview needed before PR-A starts:

- **Endless run**, ranked by **kill count** (megabonk angle). Score formula leans `kills` primary; time and level as tiebreakers and small multipliers.
- **House pick at run start** from all 9 houses (decoupled from the player's main Nine — cross-house play allowed).
- **v1 default: uniform house base stats + per-house passive.** Differentiated stats deferred to balance sim. House-card synergy moved to Open Questions.
- **2-card draft from collection** at run start. Entry gated on having ≥2 cards opened. Synthetic starter-pool fallback removed; new players get a 15–20 card starter pack bundle at registration as a non-survivors prerequisite.
- **Boss-gated rounds**, not level-gated biome teleports. Each round = ~3-min biome window terminated by a Round Boss; defeating the boss advances to the next biome with stepped difficulty.
- **Bespoke `survivors_weapon_specs` table** with two `behavior_class` values: `continuous` (auto-fire) and `activated` (player-triggered, on cooldown, bound to Q/E).
- **Sneak-peek mechanic**: small chance (~7%/slot) a level-up offer pulls a card the player doesn't yet own. Run-only; not added to permanent collection.
- **Crystal currency**: drops from kills, spent in level-up (reroll + upgrade), evaporates at run end. Telemetry persisted (`crystals_earned`, `crystals_spent_*`).
- **Duplicate cards bump rarity** (C→U→R→E→L). At-cap legendary duplicates pay a fixed crystal payout.
- **Build cap = 6 cards.** Build-full + new card → swap UI.
- **Per-run payout** via `pointsService.addPoints(player_id, score, 'survivors_run_complete', ...)`. Daily + weekly cron each award top-3 bonus seasonal points. **Pack rewards** come from holding daily top-3 for 24 contiguous hours (NOT per-run time thresholds).
- **Visual carry-in: items only.** No house sigil overlay on the avatar.
- **Anti-cheat (v1)**: server-recomputed score + plausibility checks (kills/min ceiling, time-to-level cap). Mid-run heartbeat deferred to v2.

## Open Questions still in PRD §10 (sim-tune territory)

These don't block PR-A. Most are knobs the balance sim will resolve:

- House design pass details — passives' shape, house-card synergy magnitude.
- Round length, Round Boss difficulty curve, sneak-peek per-slot chance + per-run cap.
- Score formula exact shape, crystal drop rates, reroll/upgrade cost curves.
- Stat reinterpretation formulas (`damage = base * (1 + atk * 0.05)` style — exact curve TBD).
- Activated card slot cap (currently Q + E, third pickup behavior unspecified).
- Round transition UX (banner + breath beat: how long, what's shown).
- Player movement baseline + Round Boss arena bounds — needs prototyping not sim.

## What PR-A needs before starting

1. **Confirm `database/migrations/004_create_survivors_runs.sql` is applied to the live dev database.** PR-A migrations 005/006/007 build on it.
2. **Inspect the current `survivors_runs` rows.** PR-A flips `player_id` to NOT NULL — any existing `player_id IS NULL` rows need to be deleted (likely test data) or backfilled. Quick SELECT on session start will confirm.
3. **Supabase MCP write access.** If `mcp__supabase__apply_migration` isn't authenticated, fall back to applying SQL via the Supabase dashboard. Pre-flight task 0.2 covers this.

Per Wray's autonomy memory (schema/cron/deletions auto-OK, Claude merges via gh CLI after smoke), PR-A can proceed autonomously once the above three items are confirmed.

## Recommended first message next session

Pick one based on appetite:

- **Continue** — "Start PR-A." Claude pre-flights, applies migrations, opens the PR, smoke-tests, and merges after Wray confirms on Replit.
- **Pause + review** — "Read me the PRD §10 Open Questions out loud." Useful if Wray wants to lock more sim-tune knobs before any code.
- **Pivot** — "Park survivors, do X first." Survivors planning is a complete unit; nothing in flight will rot if it sits.

## What's NOT in this handover

- Carry-forward items from prior sessions (PR #297 deploy, audit PRs #294/295/296) — those live in the persistent memory handover, not survivors-scoped.
- Smoke-test artifact for this session — no code shipped, no smoke owed.
