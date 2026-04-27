# PRD: Survivors Mode

## 1. Introduction / Overview

Survivors Mode is a new player-facing game mode for Nine Lives Network: a top-down arena roguelike inspired by Vampire Survivors, Megabonk, and Hades. The player picks one of the nine houses, drafts two cards from their permanent collection, and fights through boss-gated rounds whose difficulty scales continuously with elapsed time. Each round takes place in a single biome and ends with a Round Boss; defeating the boss advances the player to the next biome with a harder enemy roster. On each player level-up the choice screen presents three card offers (pulled from the player's collection — with a small chance of a "sneak peek" card from outside their collection), and lets the player spend in-run "crystals" to reroll the offers or upgrade an owned card's rarity. Runs continue indefinitely and end only on death. Rank is by **kill count** (with score, time, and level as tiebreakers — the megabonk angle). Finishing a run awards seasonal points; daily and weekly top-3 placements award bonus points. Holding a leaderboard rank for a sustained period rewards permanent packs (separate from per-run rewards).

The mode reuses the existing card collection, the canonical 5-stat schema (atk/hp/spd/def/luck), the points service, the leaderboards UI, and the 8-direction PNG sprite layer compositor that is already shipped.

## 2. Goals

1. Ship a complete endless roguelike loop (house pick → card draft → run → level-ups → death → payout) that is smoke-testable in isolation per PR.
2. Make the player's permanent card collection materially affect run variety, so larger collections feel valuable and pack pressure is preserved.
3. Wire the run economy into the existing season-points pipeline via `pointsService.addPoints(...)` — no parallel currency.
4. Add a Survivors leaderboard tab (ranked by kills) that is the primary daily competitive surface for the mode.
5. Establish a bespoke `survivors_weapon_specs` data layer that lets design tune spell-to-weapon behavior without code changes — supporting both continuous (auto-fire) and activated (player-triggered, on cooldown) weapon classes.
6. Avoid drift on the canonical 5 stats — survivors-specific feel comes from in-run modifiers and per-house passives, not new persistent columns.

## 3. User Stories

- As a returning player, I open Survivors, pick Stormrage, draft my two favourite Storm cards from my collection, and play a run that feels distinct from another player who picked Smoulders with two attack cards.
- As a competitive player, I check the daily Survivors leaderboard, see I'm in 4th by kill count, run again to bump into top-3 before the daily cron, and earn the daily top-3 bonus.
- As a new player just past registration, I open my starter pack bundle (15–20 cards) and enter Survivors with a buildable collection from day one. If I try to enter Survivors with fewer than 2 cards opened, the game prompts me to open my unopened packs first.
- As a curious player chasing variety, occasionally a level-up offer slot pulls a card I don't yet own — a "sneak peek" from the broader pack pool. Picking it grants the card to me for the rest of the run only (not added to my permanent collection).
- As a card collector, I pick up a duplicate of a card already in my build, and the run instance bumps its rarity from common to uncommon. Five duplicates of the same card across a long run would walk it C→U→R→E→L.
- As a tactical player, I use my activated heal card at the right moment in a tough boss fight to survive the encounter instead of relying solely on auto-fire weapons.
- As a player chasing rewards, I hold the daily #1 rank for 24 contiguous hours and receive a permanent pack the next day — separate from the seasonal points I earned during the run.
- As an admin, I tune `survivors_weapon_specs` rows to rebalance a spell's projectile speed, AOE, or activated-cast cooldown without redeploying code.

## 4. Functional Requirements

### 4.1 Run lifecycle

1. Survivors mode requires an authenticated player session. Anonymous play is removed (the v1 anon path is a Known Issue to be migrated, see §9 of the PRD ledger).
2. Run start UI presents a 3×3 grid of the nine houses (Smoulders, Darktide, Stonebark, Ashenvale, Stormrage, Nighthollow, Dawnbringer, Manastorm, Plaguemire). Selecting a house assigns the run a per-house **passive ability**. **v1 default: all houses share uniform base stats (`atk/hp/spd/def/luck`); per-house passives differentiate playstyle.** Differentiated `houses.base_*` columns are intentionally NOT used in v1, pending balance simulation. House-card synergy (cards matching the chosen house gain a small in-run buff) is a candidate flavor mechanic surfaced in Open Questions.
3. Survivors entry is gated on the player owning at least 2 cards in `player_cards`. New players are issued a starter pack bundle (15–20 cards) at registration; the Survivors entry CTA blocks with an "open your starter packs" prompt if the player has unopened bundles or a sub-2-card collection.
4. After house pick, the player drafts exactly two cards from their `player_cards` collection. These two cards become the run's starting weapons (active from t=0 — continuous cards begin auto-firing immediately, activated cards bind to their cooldown slot). The synthetic starter-card pool fallback proposed in earlier drafts is removed.
5. Runs are server-seeded (`seed BIGINT` generated server-side, written to `survivors_runs.seed`). Clients never supply the seed.
6. The run is endless. Difficulty scales continuously with elapsed time and round number. There is no win condition; death ends the run.
7. The current artificial caps (`time_sec ≤ 7200` in migration 004, ~20-minute and level-120 caps in `server/routes/survivors.js`) are lifted. The intent is for difficulty to scale steeply enough that 24h runs are not achievable — no clamp is needed beyond a generous anti-AFK safeguard.

### 4.2 Round structure, visuals, and rendering

8. The run is structured as a sequence of **rounds**. Each round = a single biome with an escalating-pressure window (default ~3 minutes), terminated by a **Round Boss** encounter. Defeating the Round Boss teleports the player to the next biome with a harder enemy roster and a Round Boss whose difficulty steps up. Rounds continue indefinitely.
9. Round Bosses are the only bosses in v1. There is no fixed-interval mid-round boss. Round Boss kills drop a guaranteed crystal pile and trigger a level-up choice screen on top of any pending level-up.
10. Initial v1 biome roster = the 9 house elements (Ember, Tide, Stone, Forest, Storm, Void, Light, Arcane, Plague). Biome art and enemy rosters are content tracks that iterate after launch.
11. The player avatar uses the 8-direction PNG layer compositor at `public/js/survivors/sprite.js` (`getAtlas`, `composeAngle`, `drawChar`). Equipped items on the player's active Nine carry in **as visual layers only** — they do not grant stats inside survivors runs. House sigils do NOT overlay the avatar; only the equipped item layers render.

### 4.3 Stats and combat

12. Survivors uses only the canonical 5 stats: `atk, hp, spd, def, luck`. Persistent schema is unchanged. Run-state holds per-run modifiers under the same five names. In survivors context:
    - `atk` → outgoing damage multiplier
    - `hp` → maximum health (and natural regen scale)
    - `spd` → movement speed AND attack-speed bonus (cooldown reduction)
    - `def` → incoming damage reduction
    - `luck` → crit chance AND drop rate AND reroll cost discount
13. Cards in a player's build do not act on a turn loop. Each card maps to a weapon spec defined in the `survivors_weapon_specs` table, which is loaded by the client on run start.
14. **Two weapon behavior classes** exist in v1, declared per-spec:
    - `continuous` — auto-fires on its own cooldown (projectile / aura / orbit / DOT-zone / etc).
    - `activated` — does NOT auto-fire; the player triggers the cast manually (e.g. heal pulse, crowd-control burst, defensive shield). Activated cards bind to keyboard slots (e.g. Q / E) and the HUD shows a cooldown ring.
15. The default fallback weapon spec applies to any spell not explicitly mapped, so the run is always playable. Bespoke specs (continuous and activated) are an iterative content track; v1 ships ~5 hand-tuned bespoke specs plus the fallback.

### 4.4 Level-up choice screen

16. Each player level-up pauses the run and presents a choice screen with:
    - Three random card offers pulled from the player's `player_cards` collection. Each offer slot has a small independent chance to instead pull a **sneak-peek card** — a card NOT in the player's collection (drawn from the pack pool). Sneak-peek cards picked up are run-only and do NOT enter the player's permanent collection.
    - A "Reroll" button: spend N crystals to redraw all three offers (N escalates per use within one level-up).
    - An "Upgrade" button: spend M crystals to bump the rarity of a card already in the build by one tier (cap at legendary).
    - A "Skip" button: take no card, no spend, continue.
17. If the offered card is already in the build, accepting it bumps the in-run instance's rarity by one tier (capped at legendary). At cap, further duplicates of a legendary card convert to a **fixed crystal payout** (so duplicates always pay something).
18. Build cap is six cards. When the build is full and the player accepts a new card, the player must designate which existing card to swap (the swapped card is discarded for the rest of the run).

### 4.5 In-run currency (crystals)

19. Enemies drop crystals on death. Drop quantity scales with enemy tier (normal / elite / round-boss). Specific drop rates are tunable via a config file shipped with the weapon spec table.
20. Crystals exist only within a single run. They are never persisted, never spendable outside the run, and never convert to seasonal points or packs.
21. Crystals earned and crystals spent (split by reroll vs upgrade) are written to `survivors_runs` as telemetry.

### 4.6 Run-end payout

22. On run end the server records a row in `survivors_runs` with: `player_id, house, time_sec, level, kills, seed, score, ended_reason, cards_used, crystals_earned, crystals_spent_reroll, crystals_spent_upgrade, client_version, created_at`.
23. The server recomputes `score = f(kills, time_sec, level)` server-side from the run row, **with `kills` as the primary contributor** (megabonk-style ranking). Time and level act as multipliers / tiebreakers. Client-supplied scores are ignored. Plausibility checks reject impossible kills/time/level combinations.
24. On successful insert, the server calls `pointsService.addPoints(player_id, score, 'survivors_run_complete', description)` (path: `server/services/pointsService.js`). This is the sole per-run payout.
25. Two cron jobs in `server/services/scheduler.js` settle leaderboard bonuses:
    - **Daily** (e.g. 00:05 UTC): top-3 by best kill count in the past 24h receive bonus seasonal points (recommended starting values: 1st = 500, 2nd = 250, 3rd = 100).
    - **Weekly** (e.g. Monday 00:10 UTC): top-3 by best kill count in the prior 7 days receive larger bonuses (1st = 5000, 2nd = 2500, 3rd = 1000).
26. Both bonus paths use `pointsService.addPoints` with sources `survivors_top3_daily` and `survivors_top3_weekly`.

### 4.7 Rank-persistence pack rewards

27. A new table `survivors_leaderboard_holds` tracks contiguous spans during which a player held a top-3 daily/weekly rank. The daily and weekly cron jobs open and close hold rows.
28. When a hold reaches **24 contiguous hours at top-3 daily** (v1 threshold) and `reward_granted = false`, a permanent pack is granted to the player and the row is marked.
29. Pack grants are written to a new `survivors_pack_grants` audit table for traceability. Pack contents reuse the existing pack generation pipeline in `server/services/packSystem.js` — Survivors does not invent a new pack type for v1.
30. Login-streak pack rewards are an adjacent feature, out of scope for this PRD (separate ticket).

### 4.8 Leaderboard surface

31. A new "Survivors" tab is added to `public/leaderboards.html` (insertion point line 1232). Tab supports daily / weekly / all-time sub-views, **ranked by `kills DESC` then `score DESC` then `time_sec ASC` then `id ASC`** for stable tie-breaking.
32. A new endpoint `GET /api/leaderboards/survivors?window=daily|weekly|alltime` returns paginated rank rows.
33. Survivors leaderboard placements feed back into the existing leaderboards page UI conventions (color tag, sub-tabs, sigils).

### 4.9 Admin and tuning

34. `survivors_weapon_specs` is admin-editable via existing admin endpoints (`x-admin-key` header). At minimum, an admin POST `/api/admin/survivors/specs` route accepts a JSON spec for a given `spell_id`.
35. The difficulty curve coefficients (`base_spawn`, `T_double`, `k_spawn`, `k_hp`, `k_dmg`, `T_elite`, `cap_concurrent_enemies`, plus per-round Round Boss scaling) live in a server-side config file (e.g. `server/config/survivors-difficulty.js`) and are loaded on boot. Default values targeted for first balance pass, expected to be tuned via offline simulation harness.

## 5. Non-Goals (Out of Scope for v1)

- Bespoke weapon spec content for every spell in the catalog. v1 ships ~5 bespoke specs (mix of continuous and activated) + a default fallback. Remaining specs are an iterative content track post-launch.
- Differentiated per-house base stats. v1 uses uniform base stats + per-house passives; differentiated stats are deferred to a balance pass.
- House-card synergy bonus mechanic — surfaced as an Open Question; not built in v1 unless the sim shows strong design value.
- Synthetic starter-card pool fallback — replaced by the registration-time pack bundle + entry gate.
- Floor-drop sneak-peek (drops on the ground from the pack pool) — sneak-peek lives only in level-up offer slots in v1.
- Biome art and enemy rosters beyond v1 placeholders.
- Login-streak pack rewards (separate adjacent feature).
- Co-op or multiplayer Survivors.
- Mobile touch-control optimizations (desktop and tablet keyboard / pointer first).
- Wallet linking, on-chain rewards, or token claim flow specific to Survivors. Per project memory the points-to-token cash-out is gated by NFT and is deferred infrastructure-wide.
- Replay playback UI. The `seed` and `cards_used` columns are stored to enable replay later, but no replay viewer ships in v1.
- New stat columns on `player_nines`. All survivors run modifiers stay in run-state under canonical names.
- Mid-run heartbeat anti-cheat — deferred to v2. v1 relies on server-side score recompute + plausibility checks (kills-per-minute and time-to-level bands).

## 6. Design Considerations

- House picker should mimic `public/register.html:39-69` (`.house-grid`, `.house-btn`, `.house-reveal` animation) so visual language is consistent with onboarding.
- Sprite atlas caching at `public/js/survivors/sprite.js` is the win — keep it. Player avatar tinting honours the player's house primary color. No house-sigil overlay on the avatar.
- HUD chrome already exists in `public/survivors.html` (HP/XP bars, weapon slots, timer, kills counter, level-up modal frame). Build on it; do not rebuild. Add an activated-card cooldown row (Q / E slots with cooldown rings) and a kill counter prominent enough to be the rank-defining metric.
- Card-offer modal during level-up should follow 9LN's existing pack-reveal modal conventions for visual continuity. Sneak-peek cards are visually distinct (e.g. dashed border or "From the wild" tag).
- Round transitions need a brief breath beat: "ROUND CLEARED — BIOME ↗" banner and a 2–3 second teleport animation before the next biome's enemies start spawning.
- App-feel not website-feel: full-screen canvas, sticky chrome, no marketing scrolls.

## 7. Technical Considerations

### Schema additions

Three migrations (one per concern):

- **Migration: extend `survivors_runs`** — add `seed BIGINT NOT NULL DEFAULT 0`, `score INTEGER`, `ended_reason TEXT`, `cards_used JSONB` (stores final rarity at run end, not full progression history), `crystals_earned INTEGER DEFAULT 0`, `crystals_spent_reroll INTEGER DEFAULT 0`, `crystals_spent_upgrade INTEGER DEFAULT 0`, `client_version TEXT`. Drop the `time_sec ≤ 7200` and `level ≤ 200` check constraints (or relax to a generous anti-AFK ceiling). Make `player_id` NOT NULL going forward (after migrating any anon rows out).
- **Migration: create `survivors_weapon_specs`** — `(spell_id BIGINT PK, behavior_class TEXT NOT NULL CHECK (behavior_class IN ('continuous','activated')), base_damage NUMERIC, base_cooldown_ms INTEGER, projectile_speed NUMERIC, aoe_radius NUMERIC, pierce INTEGER, activated_keybind TEXT NULL, rarity_scaling JSONB, updated_at TIMESTAMPTZ DEFAULT now())`. Insert one fallback row keyed by sentinel id for unmapped spells.
- **Migration: create `survivors_leaderboard_holds` + `survivors_pack_grants`** — see Functional Reqs §4.7.

### Files to modify

- `server/routes/survivors.js` — fix the 4-house hardcoded set (`HOUSES = {smoulders, darktide, stonebark, plaguemire}` → all 9), lift the artificial caps, accept the new fields, recompute score server-side with kills as primary, gate on session, add the "≥2 cards" precondition check.
- `server/services/scheduler.js` — register `survivorsDailyTop3` and `survivorsWeeklyTop3` cron jobs (rank by kills).
- `server/services/pointsService.js` — no changes (consumed as-is).
- `server/services/packSystem.js` — no changes for v1 (rank-persistence rewards reuse default pack generation).
- `public/leaderboards.html` (line 1232) — add Survivors tab (kills as the headline rank column).
- `public/js/survivors/main.js` — wire game loop to spec API, level-up choice modal (including sneak-peek slot), crystal pickup, activated-card cooldown UI, round transitions, run-end POST.
- `public/js/survivors/sprite.js` — keep, do not rewrite.
- `public/survivors.html` — keep chrome, build out level-up modal, round-cleared banner, activated-card cooldown row.
- New: `server/config/survivors-difficulty.js` — difficulty curve coefficients + per-round Round Boss scaling.

### Difficulty curve (starting values, sim-tunable)

```
spawn_rate(t)        = base_spawn * (1 + t/T_double)^k_spawn
enemy_hp(t, round)   = hp0 * (1 + t/T_double)^k_hp * (1 + round * round_step)
enemy_dmg(t, round)  = dmg0 * (1 + t/T_double)^k_dmg * (1 + round * round_step)
elite_chance(t)      = clamp(t/T_elite, 0, 0.35)
round_length_sec     = 180 (default; per-round override allowed)
round_boss_hp(round) = boss_hp0 * (1 + round * boss_step)
sneak_peek_chance    = 0.07 per offer slot (default; sim-tunable)
```

Starter knobs: `T_double=120s`, `k_spawn=0.85`, `k_hp=1.1`, `k_dmg=0.7`, `T_elite=600s`, `cap_concurrent_enemies=250`, `round_step=0.20`, `boss_step=0.35`. Real values land after balance sim.

### Score formula (kills-primary)

```
score = kills * (1 + log10(1 + time_sec / 60)) * (1 + level * 0.02)
```

Sketch only — sim will tune the multipliers. The formula must keep `kills` strictly dominant so leaderboard rank-by-kills and rank-by-score agree closely.

### Risks and mitigations

- **R1: Bespoke spec content debt for 100+ spells.** Mitigation: ship a default fallback that synthesizes weapon behavior from existing card metadata (`spell_type`, `spell_house`, base stats from `player_cards`). v1 ships ~5 hand-tuned specs (split between continuous and activated) + fallback. Bespoke specs grow as a content track.
- **R2: New-player onboarding gap.** Mitigation: registration-time starter pack bundle (15–20 cards) — a separate but blocking dependency on the pack system. The Survivors entry CTA must hard-block until the player's collection meets the threshold.
- **R3: Score / kill-count farming via seed replays or client-side tampering.** Mitigation: server generates `seed`, server recomputes `score` and validates `kills`, plausibility checks reject impossible runs (kills-per-minute bands, time-to-level bands), rate-limit `POST /api/survivors/runs` per `player_id`. Mid-run heartbeat is deferred but pre-wired in the schema for future v2.
- **R4: Activated-card UX on first-time players.** Mitigation: tutorial overlay on first activated card pickup explains the keybind and cooldown ring; persistent setting hides future tutorials per player.

### Existing utilities to reuse (do not reinvent)

- `pointsService.addPoints(playerId, amount, source, description)` — `server/services/pointsService.js`
- `houses` table + `combatEngine.js` house base stats — `server/services/combatEngine.js:75-85` (uniform stats in v1, but the table stays the source of truth; per-house passives are loaded from a new column or sibling table)
- `player_cards` collection fetch — `server/services/packSystem.js:667-683`
- 8-direction sprite compositor — `public/js/survivors/sprite.js`
- House sigils — `public/assets/images/houses/House-{name}.png`
- House picker UI pattern — `public/register.html:39-69`
- Leaderboard tab UI — `public/leaderboards.html:1232`
- `node-cron` scheduler — `server/services/scheduler.js`
- Graceful-degradation `require()` pattern — `server/index.js`

## 8. Success Metrics

- A complete authenticated run (house pick → 2-card draft → run → death → score posted → leaderboard updated → seasonal points credited) executes end-to-end without manual intervention.
- A daily cron run awards top-3 bonus points and writes hold rows; an admin can trigger it synchronously for smoke-testing.
- At least 5 spells have bespoke `survivors_weapon_specs` rows (mix of continuous and activated); the remainder play with the default fallback.
- Survivors leaderboard tab appears on `public/leaderboards.html` with daily / weekly / all-time sub-tabs, ranked by kills, and renders rows from `survivors_runs`.
- A player attempting Survivors with fewer than 2 cards is blocked with an "open your starter packs" prompt and cannot start a run until the precondition is met.
- An activated card (e.g. a heal) can be picked up, bound to a key slot, fired manually, and observed going on cooldown — without crashes.

## 9. Phased Rollout (proposed PRs)

1. **PR-A: Schema + telemetry.** Three migrations (extend `survivors_runs`, add `survivors_weapon_specs` with `behavior_class` and `activated_keybind`, add `survivors_leaderboard_holds` + `survivors_pack_grants`). Update route to accept new fields (nullable). §9 entry added for the v1 anon-path Known Issue.
2. **PR-B: Auth-gated start + collection draft + entry precondition.** New `GET /api/survivors/start` returns the player's eligible draft pool from `player_cards`. `POST /api/survivors/runs` requires session. Entry blocks if `player_cards < 2` with an "open your starter packs" CTA. Fix hardcoded 4-house set in `server/routes/survivors.js:6` to all 9. Lift artificial caps.
3. **PR-C: Weapon spec system + activated-card runtime + rarity scaling.** Seed `survivors_weapon_specs` with default fallback + ~5 bespoke specs (mix continuous + activated). Client `weapons.js` reads spec via `/api/survivors/specs` and handles both behavior classes (auto-fire vs key-bound activated cooldowns). Level-up screen wired with three offers + sneak-peek roll + reroll + upgrade + swap-on-full + at-cap legendary crystal payout.
4. **PR-D: Round structure + Round Bosses + scoring + per-run payout + leaderboard tab.** Implement round transitions (biome teleport on Round Boss kill), Round Boss spawn at end of round window, kills-primary score recompute, `pointsService.addPoints` on insert with source `survivors_run_complete`. Add Survivors tab to `public/leaderboards.html` ranked by kills with daily/weekly/all-time sub-views.
5. **PR-E: Daily + weekly cron + rank-hold tracking + pack grants.** Two scheduled jobs writing `survivors_leaderboard_holds` and granting bonus seasonal points. Admin trigger endpoint for synchronous smoke-test. 24h-at-top-3-daily threshold triggers `survivors_pack_grants` row + pack delivery via existing `packSystem.js`.

Each PR is smoke-testable in isolation; per CLAUDE.md and Wray's smoke-test cadence preference, each gets an `audit/smoke/PR<n>-<slug>.md` checklist on merge.

## 10. Open Questions

The following items remain open for the balance simulation pass and / or follow-up rounds:

- **House design pass** — v1 default = uniform base stats + per-house passive. Should houses get differentiated base stats again later, and how strong should passives be? Should "house cards" (cards matching the player's chosen house) get an in-run synergy bonus (e.g. +X% damage / +Y% effect) — and at what magnitude? Sim-tune.
- **Round length** — default 180s per round. Constant, or should it stretch with round number? Sim-tune.
- **Round Boss difficulty progression** — `boss_hp0 * (1 + round * boss_step)` is a starting shape; the actual curve needs sim-validation so round 10 isn't trivial and round 20 isn't a wall.
- **Sneak-peek drop chance** — default 7% per offer slot; should it be capped per run (so a hot streak doesn't dump 10 unowned cards on a player)?
- **Activated card UX** — keybinds confirmed as Q / E for v1. Should additional activated slots exist, or stay capped at two? What happens if the player picks up a third activated card?
- **Score formula exact shape** — `kills * (1 + log10(1 + time/60)) * (1 + level * 0.02)` is a sketch. Sim-tune so kills always dominate while time and level meaningfully reward longer / deeper runs.
- **Crystal drop rates per enemy tier + reroll cost curve + upgrade cost curve** — sim-tune.
- **Stat reinterpretation exact formulas** — e.g. `damage = base * (1 + atk * 0.05)` vs another curve. Linked to the house design pass since house stat differentiation drives variance. Sim-tune.
- **Round transition UX** — does the "ROUND CLEARED" banner pause input fully, allow build review, or just animate through? UX call.
- **Player movement speed baseline + Round Boss arena bounds** — needs prototyping, not sim.
