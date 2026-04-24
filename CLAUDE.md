# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # nodemon server/index.js (auto-reload)
npm start       # node server/index.js (production)
npm test        # jest — test suite is not populated yet
```

Default port is `5000` (overridable via `PORT`). `npm run dev`/`npm start` run the backend — that's all there is. The unused `/client/` React scaffold was deleted in PR #210 (§9.12); UI lives in `/public/`.

Node 18+ is required (`engines` in `package.json`).

Admin endpoints are protected by an `x-admin-key` header. See `ADMIN_COMMANDS.md` for the full curl catalog — that file is the canonical operational runbook for daily game operations (post objective, process casts, end-of-day, reset mana, decay, etc.) and cron schedule.

## Architecture

### Frontend — vanilla HTML/CSS/JS under `/public/`

The game UI is vanilla HTML/CSS/JS under `/public/` (dashboard, map, leaderboards, duels, arena, packs, card-lab, zone-battle, admin pages, etc.), served as Express static files. Three.js and Leaflet.js are used via CDN on specific pages. There is no bundler or build step for the frontend.

(Historical: a `/client/` Vite+React scaffold existed but was never wired to anything; deleted in PR #210, §9.12.)

### Backend is CommonJS Express (v5)

Entry point: `server/index.js`. Written in `require`/`module.exports` — do not introduce ESM syntax on the server side.

Layout:
- `server/routes/` — Express routers, mounted under `/auth` and `/api/<name>` (players, territory, duels, map, leaderboards, admin, spells, clashes, packs, sortingHat, items, quests, zones, gauntlet, boss, crafting, nines, mana, arena, chronicle, drop-tickets, raids, stats, leveling)
- `server/services/` — all business logic / "engines" (combat, arena, boss, crafting, duel, effect, gauntlet, narrative, nerm*, pack, scoring, territoryControl, xp, scheduler, twitterBot, etc.). Everything is flat under `services/`; there is no separate `server/engine/` or `server/twitter/` directory despite older drafts of this file suggesting otherwise.
- `server/config/` — `supabase.js` (anon, respects RLS) and `supabaseAdmin.js` (service role, bypasses RLS). Server-side writes generally use the admin client.
- `server/jobs/` — a couple of standalone job scripts; recurring cron lives in `services/scheduler.js`.

### Graceful-degradation loading pattern

`server/index.js` and `services/scheduler.js` wrap every `require()` of routes, engines, and bots in individual try/catch blocks that log a warning and continue. This is intentional — the server is designed to boot even when optional services (Twitter, Telegram, Anthropic, combat engine, etc.) fail to load. When adding a new route/engine, follow the same pattern and never let a missing optional dependency abort startup.

### Database: Supabase is source of truth, Drizzle is vestigial

Game data lives in Supabase (PostgreSQL) and is accessed via `@supabase/supabase-js` throughout `server/services/` and `server/routes/`. `database/schema.sql` is the canonical SQL — regenerate via `scripts/dump-schema.js` after DDL changes. Migrations live in `database/migrations/` (filename-prefixed with an incrementing number).

Two clients, chosen deliberately:
- `config/supabase.js` — anon key, for reads that should respect Row Level Security
- `config/supabaseAdmin.js` — service role key, for server-side writes that bypass RLS

### Real-time layer (Socket.io)

`server/index.js` creates an HTTP server, attaches `socket.io`, and exposes an `/arena` namespace that rooms clients by `zone_<id>`. The combat engine emits position/state updates by calling `global.__arenaSocket._broadcastToZone(zoneId, event, data)` — that global is the bridge between the tick loop in `services/combatEngine.js` and connected clients. Duels wire their own socket handlers via `routes/duels.js` exporting `setupDuelSockets(io)`. Chat messages go through the same arena namespace with light HTML stripping/length limits in `index.js`.

Socket.io is optional — if `require("socket.io")` fails the server continues and duels fall back to REST only.

### Combat / scheduling model

`services/combatEngine.js` owns a continuous tick loop with scoring snapshots; `/api/combat/next-cycle` and `/api/combat/next-snapshot` expose the timer for the UI. `services/scheduler.js` uses `node-cron` for daily jobs (midnight banking, objective post, activity decay, Nerm posts, etc.) — see `ADMIN_COMMANDS.md` for the schedule table.

### Twitter + AI bots

Two separate Twitter app credential sets drive two accounts:
- **@9LVNetwork** (`NINELIVES_ACCESS_TOKEN`/`_SECRET`) — game bot: Chronicle acts, objectives, results
- **@9LV_Nerm** (`NERM_ACCESS_TOKEN`/`_SECRET`) — AI personality bot, text generated via `@anthropic-ai/sdk`

Anthropic Claude (`ANTHROPIC_API_KEY`) is also used for flavor text generation on game events. A `node-telegram-bot-api` integration for Nerm exists in `services/nerm-telegram.js`.

## PRD discipline

`tasks/prd-9ln-product.md` is the canonical product source of truth (see its Appendix C for the supersession list). Two rules govern any PR that touches §9 (the live bug ledger):

1. **Resolving a §9 entry.** A PR that closes a Known Issue in §9 MUST update that entry in the same PR by appending a bold line: `**Resolved YYYY-MM-DD in PR #X.**`. Do not delete the entry — preserve history so future audits can trace what was fixed, when, and in which PR. If the fix is partial, use `**Partially resolved YYYY-MM-DD in PR #X**` and describe what remains open.

2. **Introducing a new Known Issue.** A PR that discovers a new bug, drift, or gap MUST add a §9 entry numbered to the next available slot (currently §9.20+). Follow the existing format: Symptom, Effect/Severity, Resolution plan.

### Bootstrap mechanic — `PR #?` placeholder

The PR number is not assigned until after `gh pr create` runs. For PRs that resolve a §9 entry with a self-reference, the workflow is:

1. First commit applies the Resolved marker with a `PR #?` placeholder.
2. Push branch, open draft PR, capture the assigned PR number.
3. Final bookkeeping commit on the same PR replaces `PR #?` with the real number. Commit title: `docs: resolve PR number references to #X`. Merge after this commit lands.

This placeholder-then-resolve pattern is the only supported way to self-reference the current PR. Retroactive markers (citing previously-merged PRs) use the real number directly — no placeholder needed.

## Game domain references

The single source of truth for game design is **`9LN_GAME_BIBLE.md`** (repo root, unversioned filename — always current). It describes Combat V4 (round-based, last guild standing, time-based DOT) and Zone V2. Consult it before changing game rules, stats, or effect logic.

Historical specs live in `docs/archive/` (V3 bible, the April 2026 round-battle RFC, etc.) — for context only, never authoritative. See `docs/archive/README.md` for a breadcrumb of what each archived doc represents.

Other reference docs in the repo root:

- `EFFECTS_REFERENCE_V5.md` — card effect catalog
- `spellbook.md` — spell system reference
- `ADMIN_COMMANDS.md` — operational runbook and cron schedule
- `replit.md` — deployment-environment notes

Domain vocabulary worth knowing before reading code: **Nine** = a player's character; **house** = class (9 of them, drive base stats); **guild** = faction; **zone** = territory on the map; **Chronicle** = the daily 4-act Twitter narrative; **deployment** = a Nine placed in a zone with a 3-card loadout. House/school names appear in two different naming schemes across the codebase (Ember/Tidal/Stone/... in README vs Stormrage/Smoulders/Stonebark/... in the Game Bible) — the Game Bible names are the current canonical set.
