# Zone identity V4 — design questions

**Status: OPEN — blocking Task 4.0 fix.**

Owner: user (Spencer). Claude filled in Context + Evidence; decision sections are left blank for the user to resolve.

## Context

Zone identity is the per-zone metadata that drives two player-visible systems:

1. **House presence bonus** (`§4.10.2 Layer 3` in the PRD / Game Bible). Every zone is supposed to confer a next-day stat modifier tied to whichever house had the strongest presence the previous day (e.g. Stormrage zone → crit-dmg triple, Smoulders zone → poison aura, Stonebark zone → atk multiplier). This is a "home field" mechanic.
2. **Daily guild branding** (`§4.10.2 Layer 2`). Each zone carries a cosmetic guild tag for the day — whichever guild won the most rounds the previous day.

V4 is a 9-zone arena game (not the V1 27-zone territorial map). Rounds are ~5 minutes long, last-guild-standing or 5-min hard cap, with 25s intermissions. The combat engine runs a 200ms tick loop inside the server process; round-end persists a row to `zone_control_history` and upserts `zone_control`.

**What code currently expects:**
- `server/services/combatEngine.js:127-134` reads `zone_control.dominant_house` at engine init and caches it in `zoneBonusCache`. The in-combat damage/HP/effect multipliers at `combatEngine.js:163-670` apply bonuses from that cache.
- `server/routes/zones.js:808-838` merges `zone_control.dominant_house` + `zone_control.controlling_guild` into the zones-list response, with fallback to `zones.dominant_house`.
- `public/nethara-live.html` (5 call sites) reads `zone.dominant_house` from the zones-list response to drive icon, color, and bonus-label display.
- `server/routes/zones.js:1096-1160` (nightly `/recalculate-identities`) aggregates the last 24h of `zone_control_history` and writes the top-counted house + guild to `zones.dominant_house` + `zones.branded_guild`.

**What the data shows (2026-04-19 diagnostic):**
- `zone_control_history` has 7,763 rows across 30 days (2026-03-19 → 2026-04-18), 8 distinct zones. Every recent row has `dominant_house=NULL`, `branded_guild=NULL`, `snapshot_hp=0`. The round-end writer never populates them.
- `zone_control` has 8 rows (zone 18 "Chaos Rift" has none). All 8 have non-null `dominant_house` and `controlling_guild` — but these are stale holdovers, since no live writer touches those columns. `max(snapshot_hp)=700`, also stale.
- `zones.dominant_house` is populated only by the nightly recalc, which aggregates the NULL source data → writes NULL.

There is no spec in the PRD or Game Bible that defines *how* `dominant_house` is computed at round level. The pre-diagnostic code assumed these concepts were well-defined. They aren't.

## Evidence

Six findings from the 2026-04-19 Task 4.0 diagnostic:

1. **Round-end writer is incomplete.** `server/services/combatEngine.js:1226-1239` inserts `{ zone_id, controlling_guild, round_number, snapped_at }` into `zone_control_history` — omits `dominant_house`, `branded_guild`, `snapshot_hp`. Error handler is a silent `/* non-fatal if column missing */`. Result: 30 days of NULL/0 source data.
2. **Split source of truth.** `combatEngine.js:127-134` reads `zone_control.dominant_house`; `/recalculate-identities` writes to `zones.dominant_house`. Nothing updates `zone_control.dominant_house`. The combat engine's bonus cache is driven by a column no live writer touches; populated values (e.g. zone 10 = "plaguemire") are from a removed code path.
3. **`snapshot_hp` is deprecated V1.** Per stakeholder (2026-04-19), this column was a per-zone HP bar tied to house HP totals; scrapped in V4 due to cross-house HP imbalance. No live reader uses the value.
4. **`/midnight-reset` is orphaned.** `server/routes/zones.js:1166-1210` defines an endpoint that no cron calls; `scheduler.js` only calls `/recalculate-identities`. Overlaps with the recalc endpoint on a different aggregation window.
5. **`dominant_house` semantics are undefined per round.** Three plausible definitions (most-deployed, winner-guild-composition, most-damage-dealt); existing code assumes per-day aggregation of a per-round value, but never specifies the per-round value.
6. **`branded_guild` semantics are similarly undefined, and never rendered.** Grep found zero frontend references to `branded_guild` (only `dominant_house`). Backend tracks and recalculates it, but nothing displays it anywhere.

Key code + SQL references:
- Writer: `server/services/combatEngine.js:1226-1239`
- Combat reader: `server/services/combatEngine.js:127-134`
- Nightly recalc: `server/routes/zones.js:1096-1160`
- Orphaned endpoint: `server/routes/zones.js:1166-1210`
- Frontend display: `public/nethara-live.html:1845, 1953, 1980, 2031, 3910`
- Schema: `zone_control_history` has `id, zone_id, controlling_guild, snapshot_hp, dominant_house, branded_guild, snapped_at, round_number`; `zone_control` has `id, zone_id, controlling_guild, snapshot_hp, dominant_house, updated_at`.

---

## Question 1: What does "dominant house" mean per round?

Options:

**(a) Most-deployed house in that round.**
- Pros: simple to compute at round end (count Nines by house across all deployments in the round); captures "who showed up"; matches the word "presence" in the PRD.
- Cons: losing team can still drive dominance if they field more Nines. A guild that rolls in with 8 Stormrage Nines and loses every round still brands the zone Stormrage. Rewards attendance, not skill.

**(b) Winning guild's house composition.**
- Pros: rewards winning; natural narrative ("Stonebark held Umbral Wall tonight").
- Cons: guilds are multi-house, so the winning guild's "house" is ambiguous. Requires a tiebreak rule (most common house among the winning guild's surviving Nines? All of them? KO-weighted?).

**(c) Most-damage-dealing house in round.**
- Pros: rewards play performance regardless of deployment count; aligns with V4's stat-driven combat emphasis.
- Cons: doesn't match "deployment" / "presence" language in the bible; DOT-heavy houses (Plaguemire, Smoulders) would dominate every metric regardless of actual control.

**(d) Hybrid:** e.g. weighted sum of deployment count + KO count + survival; custom formula.
- Pros: tunable.
- Cons: opaque to players.

Decision: [LEFT BLANK]

## Question 2: What does "dominant house" mean per day?

Current code (`/recalculate-identities`) assumes the per-day value is the plurality-winner across the 24h of per-round `dominant_house` values in `zone_control_history`. That assumption only works once Q1 is answered (the per-round value must exist first).

Options:

**(a) Mode of per-round values** (current code's implicit assumption). Count distinct `dominant_house` values across the day's rounds; take the plurality.
- Pros: simple; the recalc endpoint already does this.
- Cons: ties are arbitrary (JS `Object.entries().sort()` picks last stable).

**(b) Sum of per-round evidence.** Don't store a per-round dominant_house at all; instead store the round-level *counts* (e.g. `{ stormrage: 5, stonebark: 3, ... }`), and aggregate the raw counts over 24h. Pick the top at the day level.
- Pros: more statistically honest; avoids the per-round tiebreak problem.
- Cons: changes schema (`zone_control_history` would store a JSONB per round instead of a single `dominant_house` string).

**(c) Last-round wins.** Whoever was dominant in the *final* round of the day brands the zone.
- Pros: dramatic narrative; late-night rounds matter most.
- Cons: variance-heavy; one fluke round flips a day.

Decision: [LEFT BLANK]

## Question 3: What does "branded_guild" represent and display where?

Current state:
- Backend tracks it in `zones.branded_guild` (nightly recalc) and would track it in `zone_control_history.branded_guild` (if the writer populated it).
- Frontend: **no references anywhere** — `public/nethara-live.html` only reads `dominant_house`; React scaffold doesn't reference `branded_guild` at all.
- Per PRD §4.10.2 Layer 2, it's a "Daily guild branding" cosmetic — the guild tag visible on the zone all day.

Questions:
- If it's meant to display, where? Zone tooltip? Zone name prefix? Arena header ("Umbral Wall — branded by @9LVNetwork")?
- If it's meant to confer a bonus to that guild's Nines in that zone, what bonus? The PRD lists it under "cosmetic" only.
- Semantic question (parallels Q1): "Branded guild" = most wins? most deployments? winning guild of the final round?

Decision: [LEFT BLANK]

## Question 4: Source of truth — `zones` table or `zone_control`?

The split described in §9.21 needs to collapse. Pick one:

**(a) `zone_control` is authoritative.**
- Update round-end writer to set `dominant_house` / `branded_guild` on the upsert at `combatEngine.js:1215-1224`.
- Update `/recalculate-identities` to write to `zone_control` instead of `zones`.
- Drop `zones.dominant_house` / `zones.branded_guild` / `zones.house_bonus_label` columns, or have the zones-list response join `zone_control`.
- Combat engine continues reading from its current location; no refactor there.
- Pros: combat engine is the hottest reader; keeping source close to combat state reduces latency and mismatch risk.
- Cons: `zones` list response needs a join (already does one today).

**(b) `zones` is authoritative.**
- Refactor `combatEngine.js:127-134` to read from `zones` instead of `zone_control`.
- Drop `zone_control.dominant_house` / `zone_control.snapshot_hp` columns.
- `zone_control` becomes purely round-level live state (`controlling_guild`, `updated_at`).
- Pros: `zones` is the "dimension" table; placing daily-aggregated identity there matches the mental model (one row per zone, not per round).
- Cons: combat reads cross a different table than where round events are written.

Decision: [LEFT BLANK]

## Question 5: Remove `snapshot_hp` entirely?

- V1 mechanic, scrapped per stakeholder confirmation (2026-04-19).
- No live consumer; no live writer.
- Column exists on both `zone_control` and `zone_control_history`.
- Historical values in the 8 current `zone_control` rows (max=700) are from a removed code path.

Default proposal: drop both columns + remove the vestigial SELECT at `server/routes/zones.js:1041-1042` in the same cleanup PR that consolidates the source of truth (Q4).

Decision: [LEFT BLANK]

---

## What unblocks Task 4.0

The fix PR needs answers to **Q1, Q2, Q4, Q5** at minimum. Q3 (branded_guild display) can be deferred — it isn't gating combat bonuses, so the fix can populate the column correctly without the UI work landing yet.

Suggested next step: user answers Q1, Q2, Q4, Q5 inline in this file. Claude then drafts the implementation PR against those decisions, closing §9.19–9.22 in one coordinated cleanup pass.
