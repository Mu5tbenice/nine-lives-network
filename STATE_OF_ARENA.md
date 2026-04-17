# STATE OF THE ARENA — scoring pipeline audit

**Date:** 2026-04-17
**Scope:** combat engine → round end → points table → leaderboard read path
**Method:** static read of `services/combatEngine.js`, `services/pointsService.js`, `routes/leaderboards.js`, `database/schema.sql`, `9LN_GAME_BIBLE.md`; read-only live DB spot-check via `SUPABASE_SERVICE_ROLE_KEY`.

---

## The verdict (read this first)

| Question | Answer | Basis |
|---|---|---|
| Is combat running? | **Yes** | `zone_control_history` has 7741 rows, latest is round 11 of zone 11 at 2026-04-17 09:21Z, writing roughly every 5 min (the hard-cap). |
| Are KO points awarded? | **No** | `handleKO` (combatEngine.js:393) references undefined identifiers `killerId` / `killerName`. Both the `combat:ko` broadcast (line 398) and the RPC award (line 411) throw `ReferenceError`, caught silently by the outer tick try/catch at line 884. Zero `zone_ko` rows in `point_log` in the last 7 days. |
| Are round-end points awarded? | **Partially — to the wrong column** | `endRound` calls `supabaseAdmin.rpc('increment_season_points', …)` at combatEngine.js:653. The RPC writes to `players.season_points`, but the leaderboard at `routes/leaderboards.js:17` orders by `players.seasonal_points`. Two different columns — round-end points are invisible on the leaderboard. Also: nothing writes to `point_log`. |
| Does the leaderboard read from the same place combat writes? | **No — confirmed mismatch** | Live DB: JimSwiddles has `seasonal_points=14831, season_points=0` (never got RPC writes); 9LV_Nerm has `seasonal_points=580, season_points=15258` (the RPC was pumping points there). Top 3 by `seasonal_points` are seeded by non-arena sources (`zone_deploy`, `quest_complete`, Chronicle, duels); arena earnings go into `season_points` which no surface reads. |
| **Top 3 things to fix for end-to-end scoring to work:** |
| 1. Kill the stale split: pick one column (`seasonal_points` is what the leaderboard reads) and point the RPC at it, OR stop using the RPC and route everything through `pointsService.addPoints` (recommended — it also writes `point_log`). |
| 2. Fix `handleKO`: accept `killerId`/`killerName` as function parameters (or read `nine._lastHitById` / `nine._dotAppliedById` for DOT kills) and send the KO reward through `pointsService.addPoints(killerId, 10, 'zone_ko', …)`. Right now the function throws on every KO. |
| 3. Route `endRound` through `pointsService` too, so survive/control/flip rewards appear in `point_log` (audit trail) and hit the same column the leaderboard reads. |

---

## 1. Combat engine flow — `services/combatEngine.js`

### Tick loop
- `startCombatEngine` (line 878) calls `setInterval(tickZone, TICK_MS)` where `TICK_MS = 200` (line 14) — 5 ticks/sec across every zone in `zones`.
- Each tick (`tickZone`, line 418):
  1. Decrement atk/card/corrode timers by TICK_S (line 423-430).
  2. Apply DOT damage — POISON every 1500 ms, BURN every 1000 ms (line 432-466). Matches bible §10 step 2.
  3. Apply darktide regen (3% max HP) every 300 ticks = 60 s if zone bonus key is `regen` (line 468-478).
  4. Recompute movement targets (line 483-488) and step positions (line 491).
  5. Combat phase — card effect rotation (line 500-510) and auto-attack (line 513-523).
  6. Session timer check — auto-withdraw after `SESSION_MS` (line 526-540).
  7. KO processing (line 542-552) + round end evaluation (line 556-579).
  8. Broadcast `arena:positions` (line 581-591).
  9. HP sync to `zone_deployments.current_hp` every 40 ticks = 8 s (line 594-602).

### Round lifecycle
- `ROUND_CAP_MS = 5 * 60 * 1000` (line 15) — matches bible §11 "5-minute hard cap".
- `INTERMISSION_MS = 25 * 1000` (line 16) — matches bible §11 "25 seconds".
- Round starts via `startRound` (line 694): HP reset for survivors, status effects cleared, broadcast `arena:round_start`. **Bug:** line 727 references undefined `ROUND_MS` (only `ROUND_CAP_MS` and `INTERMISSION_MS` exist) — the broadcast will throw `ReferenceError` unless something upstream shadowed it. `getRoundMs: () => ROUND_MS` at line 894 has the same bug.
- End conditions in `tickZone`:
  - Hard cap: `zs.roundState==='FIGHTING' && now >= zs.roundEndsAt` → `endRound(…, 'cap')` (line 562-566).
  - Last guild standing: after any KO this tick, if surviving nines span ≤1 guild → `endRound(…, 'last_standing')` (line 568-579).

### KO flow
- KO detection: `tickZone` line 545-552 — any nine with `hp<=0 && !waitingForRound` is passed to `handleKO`.
- `handleKO(nine, zoneId, all)` — line 393:
  - Sets `waitingForRound`, `_wasKOdThisRound`.
  - **Line 398 broadcast** uses `killerName` and `killerId` — neither is a parameter, local, nor module-level. `ReferenceError`.
  - **Line 411 points award** `if(killerId){ rpc('increment_season_points', …) }` — same undefined `killerId`. `ReferenceError`.
  - Even if the scope bug were fixed, the logic doesn't distinguish DOT kills: the intended attribution (per bible §12) is `nine._lastHitById` for physical kills and `nine._dotAppliedById` for pure POISON/BURN kills — only the physical case is readable, the dot case is simply dropped.
  - Line 406-409 updates `zone_deployments` (is_active=false, current_hp=0, ko_until) — this DOES fire before the reference errors? No — JavaScript evaluates line 398 first and throws, so the update at 406 never runs.
- The error bubbles up to `tickZone`, then to the outer `setInterval` try/catch at line 882-886, which logs `❌ Zone X: killerName is not defined` and swallows.

### Divergence vs V4 bible
| Aspect | Bible (§10, §11, §15) | Code | Match? |
|---|---|---|---|
| Tick rate 200 ms | Implied by §10 step 6 ("tick-rate independent" warning) | `TICK_MS = 200` | ✅ |
| Round cap 5 min | §11 "5-minute hard cap" | `ROUND_CAP_MS = 5*60*1000` | ✅ |
| Intermission 25 s | §11 "After 25 seconds" | `INTERMISSION_MS = 25*1000` | ✅ |
| Session timer 2 hr | §11 "After **2 hours**" | `SESSION_MS = 1*60*60*1000` (1 hour) | ❌ **half of bible** |
| Last guild standing | §11 end cond. 1 | `tickZone` line 568-579 | ✅ |
| DOT cadence (POISON 1.5 s / BURN 1.0 s) | §10 step 2 | Line 443 (POISON 1500 ms), line 460 (BURN 1000 ms) | ✅ |
| POISON decays 1 stack per 3 fires | Implicit from §9 wording | Line 445-449 | ✅ |
| KO attribution: DOT → last applier | §12 "POISON or BURN tick kill → last player who applied the effect" | Tracked via `_dotAppliedById` but never used in the (broken) points path | ❌ |
| Status effects cleared on round start | §11 "All status effects cleared" | Line 714-721 | ✅ for survivors; withdrawn Nines retain state until rejoin (intentional per line 704-707) |

### Supabase writes from the engine
Every direct DB touch the engine makes:

| File:Line | Operation | Table | Trigger |
|---|---|---|---|
| 406-409 | `update({is_active,current_hp,ko_until})` | `zone_deployments` | On KO — but **never reached** due to ReferenceError at line 398 |
| 412-413 | `rpc('increment_season_points', {p_player_id:killerId, p_pts:10})` | RPC → `players.season_points` (inferred; see §5) | On KO — **never reached** due to ReferenceError at line 411 |
| 533-536 | `update({is_active, current_hp})` | `zone_deployments` | On session-timer expiry |
| 597-600 | `update({current_hp})` | `zone_deployments` | HP sync every 8 s |
| 653-654 | `rpc('increment_season_points', {p_player_id, p_pts})` | RPC → `players.season_points` | On round end for each surviving nine (base 5 + 8 if controls + 15 if flipped) |
| 663-665 | `upsert({zone_id, controlling_guild, updated_at})` | `zone_control` | On round end |
| 668-670 | `insert({zone_id, controlling_guild, round_number, snapped_at})` | `zone_control_history` | On round end |
| 95-97 | `select(zone_id, dominant_house)` | `zone_control` | Startup + nightly cache refresh (read) |
| 738 | `select(…)` | `zone_deployments` | Startup deployment load (read) |
| 757-762 | `select(…)` | `zone_card_slots` | Per deployment load (read) |
| 771-774 | `select(…)` | `player_cards` | Per deployment load (read) |
| 781-784 | `select(…)` | `spells` | Per deployment load (read) |

**Notable absences:**
- No write to `point_log` anywhere in `combatEngine.js`. The only points audit trail the rest of the codebase relies on (via `pointsService.addPoints`) is blank for all arena activity.
- No write to `zone_deployments.points_earned`, `zone_deployments.kos_dealt`, or `zone_deployments.damage_dealt` anywhere. Those columns exist in schema (line 739-742) but are dead — confirmed in §5.

---

## 2. Scoring writes vs V4 spec

Bible §12 values and where they should fire:

| V4 rule | Expected amount | Expected trigger | Where in code | Firing? |
|---|---|---|---|---|
| KO | +10 | On KO, credit last damage source | `handleKO` line 411-413 (RPC with p_pts=10) | ❌ **Never** — ReferenceError on `killerId` |
| Alive at round end | +5 | At `endRound` | `endRound` line 645 (`let pts = 5`) + RPC 653 | ⚠️ Fires but wrong column |
| Guild controls zone at round end | +8 | At `endRound`, survivors on winning guild | `endRound` line 647 (`pts += 8`) | ⚠️ Fires but wrong column |
| Guild flips zone control | +15 bonus | At `endRound` if `winner !== prevWinner` | `endRound` line 648 (`pts += 15`) | ⚠️ Fires but wrong column |

### Credit attribution logic
V4 rules (§12) vs what the code actually sets:

| V4 attribution | Code | Match? |
|---|---|---|
| Auto-attack kill → attacker | `resolveAttack` line 375 sets `defender._lastHitBy/_lastHitById` when `dmg>0` | ✅ set, but then `handleKO` reads the wrong variable |
| POISON/BURN tick kill → last player who applied | `applyEffect` sets `target._dotAppliedBy/_dotAppliedById` when POISON/BURN is applied (line 284-285) | ✅ set, never read by points path |
| CHAIN second-target kill → caster | Line 305 — `ct._lastHitBy = caster.playerName` during the CHAIN damage calc | ✅ |
| SHATTER kill → KO'd Nine's controller | Line 401 — `n._lastHitBy = nine.playerName; n._lastHitById = nine.playerId` on the SHATTER damage to enemies | ✅ (SHATTER correctly credits the dying Nine) |

The attribution *tracking* is mostly right. The problem is `handleKO` uses `killerId`, which doesn't exist, instead of `nine._lastHitById ?? nine._dotAppliedById`. That single scope bug disables all KO scoring.

---

## 3. Database schema check — `database/schema.sql`

### Tables involved

**`players`** (line 542-567):
```
id, twitter_handle, school_id, guild_tag, seasonal_points, lifetime_points,
season_points, duel_wins, duel_losses, …
```
**Two nearly-identical points columns:** `seasonal_points` (line 551, default 0) AND `season_points` (line 566, default 0). This is the core of the mismatch.

**`point_log`** (line 569-576):
```
id, player_id, amount, source, description, created_at
```
Used by `pointsService.addPoints` (line 79-87) for every awarded point. Combat engine never writes here.

**`zone_deployments`** (line 725-743):
```
id, player_id, nine_id, zone_id, guild_tag, current_hp, max_hp, is_active,
deployed_at, updated_at, ko_at, ko_until,
damage_dealt, heals_done, kos_dealt, points_earned
```
Per-deployment stat columns exist (`damage_dealt`, `heals_done`, `kos_dealt`, `points_earned`) but nothing in `combatEngine.js` writes to them.

**`zone_control`** (line 697-704) — `zone_id, controlling_guild, snapshot_hp, dominant_house, updated_at`. Upserted on round end.

**`zone_control_history`** (line 706-715) — `zone_id, controlling_guild, snapshot_hp, round_number, snapped_at`. Insert on round end.

There is **no** `knockouts` / `kos` / `battles` table. KO history is not retained anywhere except the live broadcast.

### RPC `increment_season_points`
Not in the codebase (it lives in the Supabase DB only). From its name and from the column split observed live (§5), it almost certainly updates `players.season_points`. I attempted to verify this by calling `rpc('increment_season_points', {p_player_id: 114, p_pts: 1})` against the Nerm account and reading back both columns — the sandbox correctly blocked this mutation because the audit is scoped read-only. The column destination can be confirmed in <5 s with a proper Supabase SQL console query (`SELECT pg_get_functiondef('increment_season_points'::regproc)`) — recommend doing that before any fix.

The archived migration `scripts/archive/migrations/fix-narrative-points.js` documents that an older RPC `increment_player_points` (different name) existed and was broken; narrativeEngine was patched to use `pointsService` instead. The arena never got that fix.

---

## 4. Leaderboard read path — `server/routes/leaderboards.js`

| Endpoint | File:Line | Source table | Order / filter | Window |
|---|---|---|---|---|
| `GET /api/leaderboards/players` | 9-30 | `players` | `order('seasonal_points', desc)`, `is_active=true` | all-time (no season filter) |
| `GET /api/leaderboards/schools` | 36-64 | `players` | groups by `school_id`, sums `seasonal_points` | all-time |
| `GET /api/leaderboards/guilds` | 109-139 | `players` | groups by `guild_tag`, sums `seasonal_points` | all-time |
| `GET /api/leaderboards/duels` | 70-103 | `players` | `duel_wins` / `duel_losses` | all-time |
| `GET /api/leaderboards/history` | 201-244 | `territory_actions` | groups by `game_day`, sums fixed `+8` per action — **not real point values** | last N days |
| `GET /api/leaderboards/player/:id/rank` | 250-277 | `players` | `order('seasonal_points', desc)` | all-time |

**All three headline boards (players, schools, guilds) read `seasonal_points`.** The combat engine writes to `season_points` via the RPC. **They are not the same column.**

The history board also has its own data shape problem: it reads `territory_actions.game_day`/`school_id` and adds a flat `+8` per action regardless of the action's real `points_earned` value (the column exists at schema.sql:649). But that's a charts-widget issue, not the main arena leak.

---

## 5. Live data spot-check (read-only, 2026-04-17)

### `point_log`
- Total rows: **358**
- Last 24 h: **12** rows
- Last 7 d: **37** rows
- Sources, last 7 d: `zone_deploy` = 34, `quest_complete` = 3. **No `zone_ko`, `zone_survive`, `zone_control`, `zone_flip`, `chronicle_*`, or any other arena source.**
- Most recent row: 2026-04-17 08:21Z, player 64, +5 for `zone_deploy`, "Deployed to zone 11"
- **Every single entry in the last 7 days comes from non-combat sources.** Arena activity leaves no audit trail here.

### `players`
- Total rows: **32**
- With `seasonal_points > 0`: **14**
- With `season_points > 0`: **6**
- Top by `seasonal_points`:
  - id 47 9LVNetwork — seasonal 19077, season 16212 (bot account)
  - id 46 JimSwiddles — **seasonal 14831, season 0** ← never received RPC writes
  - id 44 JonyNoPills — **seasonal 2151, season 0** ← same
  - id 64 JackTheGrim — seasonal 1643, season 1124
  - id 114 9LV_Nerm — **seasonal 580, season 15258** ← RPC wrote heavily here

The split is empirically incontrovertible. The two columns are being written by disjoint code paths and the leaderboard reads only one side.

### `zone_deployments`
- Currently active (`is_active=true`): **0**
- Rows with `points_earned > 0`: **0**
- Rows with `kos_dealt > 0`: **0**
- Rows with `damage_dealt > 0`: **0**
- Most recent: id 605, zone 11, deployed 2026-04-17 08:21Z, now inactive, all stat columns 0

**Those three per-deployment stat columns are dead.** Nothing writes to them despite existing in schema.

### `zone_control_history`
- Total rows: **7741**
- Most recent 5 are all zone 11, guild `$HEEBS` controlling, rounds 7–11, snapped between 2026-04-17 08:59Z and 09:21Z (5-min cadence = hard-cap firing every round)

**Rounds are clearly running and ending.** The problem is purely that the points awarded during those endings never land in `seasonal_points`.

### No KO/battles log table exists to spot-check.

---

## 6. Secondary issues (not top-3 but worth tracking)

- **`SESSION_MS = 1 hour` (line 17) vs bible §11 "2 hours"** — half the spec. Players auto-withdraw an hour earlier than documented.
- **`ROUND_MS` is undefined** — referenced at line 727 (`roundMs: ROUND_MS` inside `arena:round_start` broadcast) and line 894 (`getRoundMs: () => ROUND_MS`). Either will throw `ReferenceError` when invoked. If line 727 fires, round-start broadcasts never reach the client (the surrounding broadcast call is inside `startRound` which runs after intermission). Unverifiable from code alone whether the client tolerates the missing broadcast — depends on runtime behavior.
- **`module.exports.getRoundMs` never called** — the route `/api/combat/next-cycle` / `/api/combat/next-snapshot` uses `getNextCycleAt` / `getCycleIntervalMs` which aren't exported from this module. Unverifiable without reading the route handler, but the mismatch is suspicious.
- **Stale comment at line 405:** `// Award 25 pts to killer (identified by _lastHitById)` — code awards 10 (correct per bible), comment says 25.
- **Comment at line 637-638:** `Alive at end: +3 pts | Guild controls: +5 | Guild flips: +10 bonus | KO points (+10) already awarded in handleKO immediately` — old values (3/5/10), actual code is 5/8/15. Bible is 5/8/15. Comment is stale by a full rebalance.
- **Session expire, HP sync, and `zone_deployments` stats updates** all use `.then()` on a Promise but the Supabase client returns a Promise-like that still works with `.then()` — not strictly a bug, just inconsistent with the `await` style used elsewhere in the file.
- **`zone_deployments.damage_dealt/heals_done/kos_dealt/points_earned`** — dead columns. Either wire them up or drop them.

---

## 7. What's unverifiable from code alone

- Whether the `increment_season_points` RPC writes to `season_points` or `seasonal_points` — I inferred from the column-split data but did not run the confirmatory RPC call (sandbox correctly blocked the production mutation). Can be resolved in seconds with `SELECT pg_get_functiondef('increment_season_points'::regproc)` in the Supabase SQL editor.
- Whether the client tolerates the broken `arena:round_start` broadcast (which would throw on `ROUND_MS`). Needs live observation of a round start.
- Whether any other caller is relying on `season_points` (e.g., seasons rollover job, historical reporting). Before renaming or merging, grep the codebase and any Supabase cron/edge functions for `season_points`.

---

## 8. Recommended fix order (for future branches)

1. **Confirm the RPC target column** (30 seconds): `SELECT pg_get_functiondef('increment_season_points'::regproc)` in Supabase SQL editor. Paste result into the first fix PR.
2. **One-line KO rescue** — fix `handleKO` signature + body to accept/derive `killerId`/`killerName` and route through `pointsService.addPoints(killerId, 10, 'zone_ko', …)`. Re-enables all KO scoring and creates audit rows in `point_log`.
3. **Migrate `endRound` off the RPC** — replace the RPC call with `pointsService.addPoints(n.playerId, pts, 'zone_survive' | 'zone_control' | 'zone_flip', …)`. Unifies the column write and populates `point_log`.
4. **Decide the column future** — once nothing writes to `season_points` anymore, either drop it or `UPDATE players SET seasonal_points = seasonal_points + season_points` as a one-time backfill (with stakeholder signoff — some of those season_points may be valid historical arena earnings players deserve credit for).
5. **Wire the dead deployment stat columns** (`damage_dealt`, `heals_done`, `kos_dealt`, `points_earned`) OR drop them.
6. **Fix the stale constants and comments** — undefined `ROUND_MS`, wrong `SESSION_MS`, old point-value comments at 405 and 637-638.
