# STATE OF THE CODEBASE — Nine Lives Network

Diagnostic audit. No files modified. All findings cite specific paths.

Date: 2026-04-17. Git branch: `main`. Head: `2f2e3fd`.

---

## 1. Project Structure

### Root-level files (live / intentional)

| Path | What it is |
|---|---|
| `README.md` | Public project overview. |
| `CLAUDE.md` | Guide for Claude Code sessions. |
| `replit.md` | Replit deployment notes. |
| `9LN_GAME_BIBLE_V3.md` | Design canon. Marked "Combat V3 / Zone V2", last updated March 19 2026. |
| `EFFECTS_REFERENCE_V5.md` | Card effect catalog, Feb 26 2026. Claims companions `CARD_STATS_V4.md` and `9LV_GAME_DESIGN_V4.md` exist — they don't. |
| `spellbook.md` | Spell system reference "V2", undated. |
| `ADMIN_COMMANDS.md` | Curl runbook and cron schedule. Current. |
| `package.json`, `package-lock.json` | Node deps. Express v5, CommonJS server, Vite/React client scaffold. |
| `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `components.json`, `drizzle.config.ts` | Tooling config for the (unused) React client. |
| `.env`, `.env.example`, `.gitignore`, `.gitattributes`, `.replit` | Env / VCS / Replit. |
| `server/` | Express backend (CommonJS). The live app. |
| `public/` | Vanilla HTML/CSS/JS game UI. This is the actual product. |
| `client/` | Vite + React + shadcn scaffold. Placeholder — not wired into the server. |
| `database/` | `schema.sql` (see §3 — corrupted) + three seed SQL files under `seeds/`. |
| `shared/schema.ts` | Drizzle schema — only a placeholder `users` table. |
| `scripts/build.ts`, `scripts/getNermTokens.js` | Build helper + Nerm OAuth helper. |
| `node_modules/` | Deps. |

### Root-level files that look accidental or should not be there

| Path | Size | Verdict |
|---|---|---|
| `collection` | 0 B | **Shell accident.** |
| `dont` | 0 B | **Shell accident.** |
| `glass cannon` | 0 B | **Shell accident** (note the space in the name). |
| `workspace` | 0 B | **Shell accident.** |
| `const { data: cardSlots } = await supabase` | 0 B | **Shell accident.** Someone pasted JS into a shell as a filename. |
| `sedufYWHw` | 271 B | **Misnamed copy of `.replit`** — contains `modules`, `ports`, `[deployment]` TOML. Random filename suggests a `cat > ` typo. |
| `card-v4-reference.jsx` | ~27 KB | Orphan .jsx at repo root — no imports reference it. Appears to be a reference snippet someone dropped. |
| `fix-card-refs.py` | 2.7 KB | One-off migration script. |
| `fix-narrative-points.js` | 3.3 KB | One-off migration script. |
| `nuke-old-cards.py` | 10 KB | One-off destructive script ("nuke" in the name — review before running). |
| `patch-game-modes-v4.py` | 4.3 KB | One-off migration script, filename implies a V4 schema shift. |
| `patch-packs.sh` | 3.7 KB | One-off shell patch. |
| `seed-narratives.js` | 1.2 KB | Root-level seed script. A nearly identical `server/services/seed-narratives.js` also exists. |

Six of the twelve items above are either clearly shell accidents (empty files, pasted JS as filename) or one-off scripts that should live under `scripts/` if kept at all.

### `server/` layout (actually exists)

```
server/
├── index.js              # entry point, Express + Socket.io bootstrap
├── config/               # supabase.js (anon), supabaseAdmin.js (service role), twitter.js
├── routes/               # 24 route files — see §3 for which are actually mounted
├── services/             # 36 "engines" + bots + schedulers
└── jobs/                 # Dailyobjective.js (note casing), scheduler.js
```

Note: `server/jobs/scheduler.js` exists AND `server/services/scheduler.js` exists. The one that runs is `services/scheduler.js` (the `index.js` require path).

---

## 2. Documentation Conflicts

### Inventory of design / spec / reference documents

| File | Filename version | In-content version | Dated | What it covers |
|---|---|---|---|---|
| `9LN_GAME_BIBLE_V3.md` | V3 | "Combat V3 — Spatial combat…" / "Zone V2" | **March 19 2026** | Houses, stats, cards, spatial combat model, 36 effects, items, zones, scoring. |
| `EFFECTS_REFERENCE_V5.md` | V5 | "EFFECTS REFERENCE V5" / "V5 NEW EFFECTS (8)" | Feb 26 2026 | 34-effect catalog. Header explicitly cross-references `CARD_STATS_V4.md` and `9LV_GAME_DESIGN_V4.md`. |
| `spellbook.md` | (no version in name) | "Spellbook System V2" | undated | Territory/Twitter spell system. |
| `ADMIN_COMMANDS.md` | — | — | undated | Ops runbook. |
| `README.md` | — | — | undated | Public overview. |
| `replit.md` | — | — | undated | Deployment notes. |
| `CLAUDE.md` | — | — | 2026-04-17 | Developer guide. |

### Cross-references and contradictions

- **The V4 "middle" is missing.** `EFFECTS_REFERENCE_V5.md` names `CARD_STATS_V4.md` and `9LV_GAME_DESIGN_V4.md` as companion documents. Neither file is in the repo. There was clearly a V4 design layer that has either been deleted or never committed. `patch-game-modes-v4.py` and `card-v4-reference.jsx` at repo root are leftover artifacts of that phase.
- **Game Bible says V3 combat; Effects Ref says V5 effects.** Not necessarily a contradiction (combat model ≠ effect catalog) but a reader has to know that to avoid being misled. Nothing in either document says "effects V5 is the counterpart to combat V3" — you have to infer.
- **No V6 document exists anywhere.** Yet `server/index.js:306` announces `"Combat engine started — V6 wave combat, 30s buffer"` on boot. See §4.
- **Naming drift across docs.** `README.md` calls the nine factions "schools" with names like *Ember Covenant*, *Tidal Conclave*. The Game Bible calls them "houses" with names like *Stormrage*, *Smoulders*, *Stonebark*. `ADMIN_COMMANDS.md` uses the README names. The DB-seeded names (`database/seeds/schools.sql`) will determine which is actually live — worth verifying. This is a content conflict, not a version conflict, but it will confuse anyone reading only some of the docs.

### Best guess at what's authoritative

| Topic | Authoritative doc | Stale |
|---|---|---|
| Combat model | `9LN_GAME_BIBLE_V3.md` | — |
| Effects | `EFFECTS_REFERENCE_V5.md` | — |
| Spells | `spellbook.md` (V2) — but no date, and code in `server/routes/spells.js` is the real source of truth | — |
| Ops | `ADMIN_COMMANDS.md` | — |
| Project layout | `CLAUDE.md` | `README.md`, `replit.md` |
| Card stats, game modes | **no authoritative doc** (the referenced V4 files are missing) | `card-v4-reference.jsx` is the closest artifact |

---

## 3. Dead / Missing Code

### Imports that point to files that do not exist

| Caller | Require path | Resolved to | Status |
|---|---|---|---|
| `server/index.js:53` | `./routes/mana` | `server/routes/mana.js` | **MISSING.** The route is mounted at `/api/mana` but the file is absent. Silently swallowed by the try/catch on line 52-58. |
| `server/routes/admin.js:644` | `../services/combatEngineV2` | `server/services/combatEngineV2.js` | **MISSING.** Admin endpoints at `admin.js:651-686` (`zone status v2`, `force-snapshot`, `reload-zone`) depend on this and will all return "V2 engine not loaded" 500s. |

Both sites use `try { require(...) } catch {}` patterns, so the server boots without any visible error. Nothing else in `server/**/*.js` references a non-existent relative path.

### Route files on disk but never mounted in `server/index.js`

| File | Notes |
|---|---|
| `server/routes/arena.js` | **Orphan.** `/arena` in `index.js` is a Socket.io namespace (`io.of('/arena')`), not an Express router mount — so this HTTP router is dead weight. |
| `server/routes/chronicle.js` | **Orphan.** The Chronicle is a described daily-loop feature; the router is written but never `app.use()`'d. |
| `server/routes/drop-tickets.js` | **Orphan.** `services/dropTicketEngine.js` is loaded by the scheduler, but the HTTP route isn't. |
| `server/routes/leveling.js` | **Orphan.** `profile.html` hits `/api/levels/{id}` (note: different path), so this may be stale/renamed. |
| `server/routes/raids.js` | **Orphan.** |
| `server/routes/stats.js` | **Orphan.** `public/dashboard.html` fetches `/api/players/...`, not `/api/stats/...`. |

### Service files on disk but never required anywhere

| File | Notes |
|---|---|
| `server/services/House-zones.js` | Orphan; unusual casing (`H` capital, hyphen) suggests it was never wired. |
| `server/services/arena-sockets.js` | Orphan at the module level — but `server/index.js:204-270` re-implements an arena Socket.io namespace inline. So the arena socket code is duplicated: one version in `index.js`, one version in an unused service file. |
| `server/services/cardDurability.js` | Orphan. Durability is referenced in effect text; whether it's enforced anywhere in the live engines is unclear. |
| `server/services/livesReset.js` | Orphan. Midnight mana/lives reset still runs because scheduler.js has its own implementation. |
| `server/services/nerm-hooks-v2.js` | Orphan. A `nerm-hooks` v1 isn't in the repo either — this looks like a WIP rewrite that was never finished or wired. |
| `server/services/nineStats.js` | Orphan. `services/statCalculation.js` is the live one. |
| `server/services/seed-narratives.js` | Orphan. Duplicate of the root-level `seed-narratives.js`. |
| `server/services/nermBot.js.bak` | **36.5 KB backup file** of the old Nerm bot, sitting next to the live `nermBot.js`. Source control should handle this; the .bak does not belong in the repo. |

### Database schema integrity

- **`database/schema.sql` is effectively empty.** The file is 5 bytes and contains the literal string `s.sql\n`. This is the primary schema file the project claims to ship. The actual schema lives in Supabase (cloud) and is invisible to anyone cloning the repo.
- `database/seeds/` contains `schools.sql`, `spells.sql`, `zones.sql` (intact).
- Server code references ~45 tables via `supabase.from(...)` including `players`, `zones`, `casts`, `duels`, `player_cards`, `zone_card_slots`, `zone_deployments`, `boss_fights`, `chronicle_acts`, `narrative_raids`, `guilds`, `houses`, `items`, `spells`, `drop_tickets`, `player_quests`, `point_log`, etc. Cross-checking them against schema is **not possible locally** because `schema.sql` is gone. Any new contributor cannot reproduce the DB without Supabase access.

---

## 4. System Conflicts — Combat V3 vs V6 vs V5

### What actually runs at boot

Only **one** engine starts on boot: `server/services/combatEngine.js` (labeled V3 in its header and in its own log line). `server/index.js:305` calls `combatEngine.startCombatEngine()` — that's the single entry point.

### The "V6" log message is a lie

- `server/services/combatEngine.js:2` — header comment: `// 9LV Combat Engine V3`
- `server/services/combatEngine.js:888` — real boot log from the engine: `"✅ Combat engine V3 started — round-based combat, 200ms ticks, 3min rounds"`
- `server/index.js:306` — the wrapping message: `"⚔️ Combat engine started — V6 wave combat, 30s buffer"`

So boot output contains both lines back-to-back — the V3 line from inside the engine, then a stale hard-coded "V6 wave combat" log message in `index.js`. **The V6 label does not correspond to any code or design doc.** It looks like a half-done rename that was never completed (or never started). Nothing implements "wave combat" or a "30s buffer".

### A third engine also exists and sometimes runs

- `server/services/arena-engine.js:2-4` — header: `"ARENA ENGINE — Nine Lives Network V5"`. Per-zone instantiation with 5-minute cycles, 3-4 rounds per cycle.
- It is **not started at boot**. It is instantiated lazily when a player joins a zone via the `/arena` Socket.io namespace (`server/index.js` doesn't require it, but `services/arena-sockets.js` would — except `arena-sockets.js` is itself orphaned; see §3).
- Net effect: arena-engine V5 appears to be a parallel implementation that was meant to replace or augment combatEngine V3, never fully migrated to, and is currently reachable only via indirect code paths that may not even fire.

### Version labels found in code (file:line)

| Location | Label |
|---|---|
| `server/services/combatEngine.js:2` | `// 9LV Combat Engine V3` |
| `server/services/combatEngine.js:888` | `✅ Combat engine V3 started` |
| `server/services/arena-engine.js:2` | `ARENA ENGINE — Nine Lives Network V5` |
| `server/services/duelEngine.js:3` | `// V3 Quick Duels` |
| `server/services/bossEngine.js:2` | `// V3 Weekly Boss` |
| `server/services/gauntletEngine.js:3` | `// V3 The Gauntlet` |
| `server/services/nineSystem.js:3` | `// V2: reads all stats from houses table` |
| `server/index.js:306` | `"V6 wave combat, 30s buffer"` (stale; no matching code) |
| `server/routes/admin.js:644` | `require('../services/combatEngineV2')` (file missing) |

### What's actually happening on boot

**Combat V3 starts and runs.** No other combat engine is started on boot. The V6 log line is a leftover string from an aborted migration. The V5 arena engine exists but is only instantiated lazily and can only be reached through code paths whose wiring is broken. `combatEngineV2` is referenced by admin endpoints but has no implementation file, so three admin endpoints are dead.

---

## 5. Unfinished Pages

### `public/` — 24 HTML pages

**Complete and wired:**

| Page | Purpose |
|---|---|
| `index.html` | Splash / landing. Full animation stack. |
| `register.html` | Twitter OAuth onboarding, house selection, sorting ceremony. |
| `dashboard.html` | Player hub — stats, deployments, casts, guild. |
| `profile.html` | Individual player profile. |
| `nethara-live.html` | Real-time territory warfare. **8,726 lines** — by far the largest file in the repo. Socket.io + Pixi.js. |
| `zone-battle.html` | Zone detail + deploy + play cards. 927 lines. |
| `spellbook.html` | Card collection browser. |
| `card-lab.html` | Design tool showcase (internal/dev). |
| `gauntlet.html` | Solo PvE roguelike. |
| `duels.html` | 1v1 PvP. |
| `boss.html` | Weekly guild boss raid. |
| `leaderboards.html` | All leaderboards. |
| `how-to-play.html` | Static rules/tutorial. |
| `admin.html` | Spell + zone + player admin, full CRUD. |
| `spell-admin.html` | Simpler spell admin (partial duplicate of `admin.html`). |
| `zone-admin.html` | Zone CRUD. |
| `arena-mapper.html` | Dev utility: polygon mapper. |
| `privacy.html`, `terms.html`, `token.html` | Static info pages. |

**In-progress / stubbed:**

| Page | State | Evidence |
|---|---|---|
| `packs.html` | **In progress.** Free daily pack UI works; "Buy Packs" section needs backend endpoint; auction section is empty with "Coming soon!". |
| `builder.html` | **Unclear.** Form UI is complete, but no clear API binding in the readable portion — form submission may be stubbed. |
| `wilds.html` | **In progress / odd.** Uses React + Babel loaded inline (not Vite), not matching the rest of the codebase. Smells like a standalone prototype. |
| `zone-detail.html` | **Superseded.** 408 lines, shares the title "Zone Battle" with `zone-battle.html` (927 lines). The longer file is the live one; `zone-detail.html` has no deployment logic and looks like a predecessor that was never deleted. |

**Dead content references:**

- Only one live "Coming soon" note (`packs.html` auction section) plus one TODO (`packs.html` buy-packs). No broken script/stylesheet imports detected in the public set.

### `client/` — React scaffold

The React app is a **placeholder** that is not served by `server/index.js`. It is not wired into npm scripts.

| File | State |
|---|---|
| `client/src/App.tsx` | Stub. Wouter router with two routes: `/` → Home, `*` → 404. No game routes. |
| `client/src/pages/home.tsx` | Placeholder — generic "Node.js Express Server" welcome card. Not the actual game splash. |
| `client/src/pages/not-found.tsx` | Complete generic 404. |
| `client/src/components/ui/*` | 40+ shadcn/ui components (library — not pages). |
| `client/src/hooks/*`, `client/src/lib/*` | Standard shadcn + React Query boilerplate. |

No real game features have been built in React. Nothing in `/client/` renders anything from Supabase or the Express API. Shipping it adds ~40 component files, `@vitejs/plugin-react`, Tailwind, drizzle-kit, and React 19 to the dependency graph for zero user-facing value today.

---

## 6. The Swamp List

Cleanup candidates, grouped by flavor. Nothing below is "urgent fix" — this is the accumulated debt.

### Junk files in the repo root

- [ ] Empty shell-accident files: `collection`, `dont`, `glass cannon` (note the space), `workspace`, `const { data: cardSlots } = await supabase` — all 0 bytes.
- [ ] `sedufYWHw` — misnamed 271-byte copy of `.replit`.
- [ ] `card-v4-reference.jsx` — 27 KB orphan .jsx at repo root, not imported by anything.
- [ ] One-off migration scripts at root: `fix-card-refs.py`, `fix-narrative-points.js`, `nuke-old-cards.py`, `patch-game-modes-v4.py`, `patch-packs.sh`, `seed-narratives.js` (root version). Move under `scripts/` or delete post-migration.
- [ ] `.bak` files tracked in git: `server/services/nermBot.js.bak` (36.5 KB), `public/css/components-v2.css.bak`.
- [ ] Two `seed-narratives.js` files (root + `server/services/`), probably diverged.
- [ ] Two `scheduler.js` files (`server/jobs/scheduler.js` vs `server/services/scheduler.js`) — only one is wired.

### Broken / missing code the try/catch hides

- [ ] `server/routes/mana.js` missing — `/api/mana` silently disabled.
- [ ] `server/services/combatEngineV2.js` missing — three admin endpoints broken.
- [ ] `database/schema.sql` is 5 bytes containing `s.sql`. The "primary database schema" file is effectively absent.
- [ ] The graceful-degrade `try { require } catch` pattern means every one of the above boots "green" in logs. That pattern protects against intermittent optional integrations (Telegram, Anthropic) but is currently hiding four concrete bugs.

### Orphaned modules

- [ ] 6 orphaned route files: `arena.js`, `chronicle.js`, `drop-tickets.js`, `leveling.js`, `raids.js`, `stats.js`.
- [ ] 8 orphaned services: `House-zones.js`, `arena-sockets.js`, `cardDurability.js`, `livesReset.js`, `nerm-hooks-v2.js`, `nineStats.js`, `seed-narratives.js`, `nermBot.js.bak`.
- [ ] Arena Socket.io handler is inlined in `server/index.js:204-270` while a separate `services/arena-sockets.js` exists unused — duplicated logic.

### Versioning / docs

- [ ] Stale boot log: `server/index.js:306` claims "V6 wave combat, 30s buffer" — no such engine exists.
- [ ] `EFFECTS_REFERENCE_V5.md` names `CARD_STATS_V4.md` and `9LV_GAME_DESIGN_V4.md` as companions; neither exists.
- [ ] No V4 spec of any kind survives; only artifacts (`card-v4-reference.jsx`, `patch-game-modes-v4.py`) remain.
- [ ] Faction naming is inconsistent across docs: README says *Ember Covenant / Tidal Conclave*, Game Bible says *Stormrage / Smoulders*. The DB seed decides which is live — verify and pick one.
- [ ] `spellbook.md` is undated; unclear if current.

### Parallel implementations / dead branches

- [ ] Combat: V3 (`combatEngine.js`, live) + V5 (`arena-engine.js`, lazy, may not reach) + V2 reference (`admin.js` → missing file) + "V6" (log message only). At least two of these should go away.
- [ ] Frontend: live `/public/` vanilla + unused `/client/` React scaffold. Decide whether to migrate or delete; carrying both is just overhead.
- [ ] `zone-detail.html` appears superseded by `zone-battle.html` — both titled "Zone Battle".
- [ ] `admin.html` and `spell-admin.html` partially overlap.
- [ ] `nermBot.js` + `nermBot.js.bak` — the .bak should not be in git.

### Graceful-degradation reliance

- [ ] `server/index.js` wraps every route load in its own try/catch. Useful for resilience, but it means missing files don't fail tests and don't show up in CI. Consider: at startup, collect the list of failed requires and expose via `/api/health` so monitoring can catch them. Right now a missing `mana.js` is indistinguishable from a working `mana.js` from outside the process.

### Things worth verifying but not necessarily fixing

- [ ] Does `wilds.html` (React via Babel inline) actually get linked from anywhere in the live flow? If not, it's a prototype carcass.
- [ ] Does the `/api/levels/{id}` path that `profile.html` hits exist in any mounted router? `routes/leveling.js` is orphaned — this call may 404 silently in the UI.
- [ ] Does `routes/stats.js` duplicate `routes/players.js` or `routes/admin.js` endpoints? If so, decide which is canonical.
- [ ] `shared/schema.ts` (Drizzle) defines only a placeholder `users` table. Delete Drizzle entirely or commit to it — right now it's a confusing signal.

---

## Overall temperature read

The **live game loop works** — `public/` is a functional vanilla HTML/JS product with all core modes (territory, duels, gauntlet, boss, chronicle) reaching real API endpoints. The **backend is a CommonJS Express app held together by defensive try/catch blocks** that hide at least two concrete missing-file bugs from boot logs.

The mess is concentrated in four areas:

1. **Aborted migrations.** V4 specs are gone but artifacts remain. V6 is announced in logs but doesn't exist. V5 exists as a parallel engine that isn't wired. V2 engine is referenced by admin but missing.
2. **Documentation drift.** README/replit.md are out of date; faction names disagree across docs; the primary schema.sql file is literally 5 bytes.
3. **Shell/editor spillage.** Multiple zero-byte "filename" accidents in the repo root, plus .bak files committed to git.
4. **Dual-everything without commitment.** Two frontends (one live, one scaffold), two schedulers, two arena socket implementations, two zone-detail pages, two nerm bot files.

None of this is blocking production. All of it will slow the next person who touches the codebase.
