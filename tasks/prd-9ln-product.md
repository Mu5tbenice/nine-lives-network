# PRD — Nine Lives Network (9LN)

**Status:** Canonical product source of truth.
**Last updated:** 2026-04-17
**Supersedes:** `9LN_GAME_BIBLE.md` (2026-04-15), `README.md`, `replit.md`, `EFFECTS_REFERENCE_V5.md` (2026-02-26).
**Complements (unchanged):** `ADMIN_COMMANDS.md` (ops runbook), `CLAUDE.md` (developer guide), `spellbook.md` (legacy spell reference — retained for historical context only; combat rules in §4.12 of this doc are authoritative).

When this PRD conflicts with any older doc, **this PRD wins.** When this PRD conflicts with shipped code, the gap is logged in §9 (Open Questions) and resolved via a forthcoming feature PRD — not by silent code-wins default.

---

## 1. Introduction / Overview

**Nine Lives Network (9LN)** — shorthand *Nines of Nethara* in gaming contexts — is a card-collection auto-battler that runs across two parallel, interlocking experiences:

- **The Chronicle (Twitter/X):** `@9LVNetwork` posts a daily four-act story. Players reply in character as their Nine. The bot weaves them into the narrative and awards points for participation.
- **The Battlefield (Web app at `9lv.net`):** Players deploy a Nine to zones in the world of Nethara, equip a 3-card loadout, and fight round-based auto-battles for territory. They also run solo PvE gauntlets, 1v1 duels, and weekly guild boss raids.

Both surfaces feed one leaderboard. Points convert to `$9LV` (Solana, live on Pump.fun).

**Problem this product solves.** Crypto Twitter is a high-signal social layer with no durable game attached to it. Existing crypto games demand wallets, onboarding friction, and single-player grind. 9LN attaches a real-time competitive game to the social layer people already use — you can play by replying to a tweet, or by deploying cards in a browser, or both. No wallet required to start.

**Core product thesis.** Three interlocking layers keep engagement:
- **CARDS** = what your Nine fights with (3 per zone, tactical loadout).
- **ITEMS** = how your Nine fights (passive global stat bonuses earned through play).
- **LEVEL** = how strong your Nine is (XP progression, unlocks slots — does NOT raise base stats).

**Goal.** A daily-loop game where the Chronicle brings the social energy, the Battlefield rewards tactical play, and neither surface can be fully ignored by serious players.

---

## 2. Goals

Product-level, measurable. Each has an owner metric in §8.

1. **One daily loop that serves three audiences** (crypto raiders, normie gamers, lurkers) without forcing anyone into a surface they don't want.
2. **Onboarding in under 60 seconds** from first landing to first Nine deployed — no wallet, no email, no card purchases required.
3. **Every point a player earns lands in a single auditable table** (`point_log`) and on a single leaderboard column (`players.seasonal_points`). No ghost columns, no silently-dropped writes. (Current state: broken — see §9.)
4. **Round-based combat resolves in a median of ~60–90 seconds** with a hard 5-minute cap, so a player can see a meaningful outcome between bathroom breaks.
5. **Points are auditable end-to-end** — every `+X` shown in the UI can be traced to a `point_log` row.
6. **Nerm (the AI cat) is a character, not a feature** — it should feel like a resident of Nethara across Telegram, Twitter, and in-game flavor text, with consistent voice.
7. **The game is shippable today, not a roadmap** — the version of 9LN described here runs on production against real Supabase data. Future features (NFT Genesis, trinkets beyond L3, wizard ranks beyond cosmetic) are explicitly out of scope for this PRD (§5).

---

## 3. User Stories

### Crypto raiders
> "As a member of a crypto community with a guild tag, I want my guild to visibly control zones on the map and win the daily Chronicle war, so our community gets recognition (and our members earn `$9LV`) from coordinated play."

### Normie gamers
> "As a player who found 9LN through a friend and doesn't own crypto, I want to collect cards, duel other players, and climb a gauntlet without ever touching a wallet — and if I change my mind later, I can plug a wallet in and start earning tokens."

### Social / Chronicle players
> "As someone who mostly lives on Twitter, I want to reply to a daily story and see my Nine named in the narrative without having to open another tab. The web app is optional."

### Guild leader / community admin
> "As a guild leader, I want to see my guild's round wins, zone branding history, and member point contributions, so I can recruit, celebrate wins, and identify inactive members."

### Project owner (single reader of this doc)
> "As the person who built this, I want one canonical document that describes what 9LN IS — so the next Claude session, the next contractor, or the next me-in-three-weeks doesn't have to triangulate across four conflicting markdown files."

### Bot operator (project owner)
> "As the operator of `@9LVNetwork` and `@9LV_Nerm` bot accounts, I need observability into bot activity, the ability to kill or pause bot posting in case of bugs or abuse, and content moderation tools so the AI-generated output never embarrasses the brand."

---

## 4. Functional Requirements

Numbered within each subsection. When a subsection overrides an older doc, the override is called out in a note at the head of the subsection.

### 4.1 Identity

| Property | Value | Notes |
|---|---|---|
| Product name | Nine Lives Network | Legal / branding / URLs |
| Game title | Nines of Nethara | Used in gaming contexts (trailers, store listings) |
| World | Nethara | **Supersedes** README's "Avaloris" — drop that name everywhere. |
| Player character term | "a Nine" | Plural: "Nines" |
| NFT collection (Season 2+) | The Nines (2,500 Genesis) | Out of scope for this PRD; see §5 |
| Token | `$9LV` (Solana, Pump.fun) | 1:1 point conversion at vest (§4.19) |
| Mascot | Nerm (floating cat head) | Personality: sassy, punny, mildly chaotic, speaks as native of Nethara |
| Twitter (game) | `@9LVNetwork` | Posts Chronicle, objectives, results |
| Twitter (character) | `@9LV_Nerm` | AI-driven personality bot |
| Website | `9lv.net` | Canonical production URL. Used in Twitter OAuth callback (`server/routes/auth.js:19`), Nerm join copy (`server/services/nermBrain.js:256`), and all 40+ narrative footers. `ninelives.network` appears only in docs — not wired into any code path. Vanilla HTML/JS app under `/public/`. |

**4.1.1** The canonical house / guild / zone / card / effect names are defined in §4.3, §4.4, §4.10, §4.11, §4.12. Any legacy name (e.g., "Ember Covenant", "Tidal Conclave", "Avaloris") in code or docs is to be migrated or deleted. README's school table is deprecated.

### 4.2 Onboarding — "The Sorting Ceremony"

**4.2.1** Registration is via Twitter OAuth. No email, no wallet required. After OAuth the player picks a house in one of two modes:
- **AI Sorting (default, optional):** the app reads the player's recent tweets, bio, and vibe; auto-assigns a house with a personalized roast.
- **Manual:** the player picks from a visual grid of the 9 houses.

**4.2.2** On creation, a row in `players` (new `id`, `twitter_handle`, `school_id`, `guild_tag='lone_wolf'`, points columns at 0, `mana` at starting value) and a row in `player_nines` are created.

**4.2.3** House can be switched **once per week**. Points do NOT carry across house switches. (The app must enforce a 7-day cooldown timestamp.)

**4.2.4** There are no "home zones." All 27 zones are contestable by any house.

**4.2.5** Wallet linking is optional at any time after registration. A non-linked player can still accumulate points; claiming `$9LV` requires a wallet (§4.19).

### 4.3 Houses — Class / Base Stats

**Note:** Supersedes the "9 Schools" table in README. The 9 groupings are **houses** (class — how you fight), distinct from **guilds** (faction — who you fight for, §4.4).

| House | Icon | ATK | HP | SPD | DEF | LUCK | Role |
|---|---|---|---|---|---|---|---|
| Stormrage | ⚡ | 40 | 280 | 30 | 5 | 15 | Burst / Crit |
| Smoulders | 🔥 | 35 | 350 | 25 | 10 | 10 | Glass Cannon |
| Stonebark | 🌿 | 12 | 700 | 10 | 40 | 5 | Wall / Tank |
| Ashenvale | 💨 | 20 | 380 | 22 | 12 | 15 | Rogue / Speed |
| Nighthollow | 🌙 | 25 | 360 | 30 | 12 | 25 | Disruptor / Luck |
| Dawnbringer | ☀️ | 15 | 620 | 15 | 30 | 5 | Healer / Support |
| Manastorm | 🔮 | 30 | 380 | 25 | 15 | 10 | Controller |
| Plaguemire | ☠️ | 20 | 450 | 20 | 25 | 10 | DOT / Attrition |
| Darktide | 🌊 | 25 | 450 | 20 | 20 | 10 | Thief / Vampire |

**Design invariants:**
- Stormrage is the intentional glass cannon (highest ATK, lowest HP, lowest DEF).
- Stonebark is the intentional wall (opposite).
- Healer houses (Dawnbringer, Stonebark) are designed for group play — they underperform in 1v1 duels *by design*.
- Ashenvale base SPD is **22** (was 38; adjusted to stop SPD floor saturation).

**4.3.1** Base stats are read from the `houses` table at runtime. Changing a base stat in that table is a balance change, not a feature change.

**4.3.2** The deprecated old-scheme names (Ember/Tidal/Stone/Zephyr/Storm/Umbral/Radiant/Arcane/WildCat) appear in the current `README.md` and may appear in some seed files. **Seed data is the tiebreaker:** whatever names `database/seeds/schools.sql` ships become canonical in production. Any name mismatch is a bug.

### 4.4 Guilds

**4.4.1** A guild is a `guild_tag` string on `players`. Guilds are crypto communities, friend groups, or any self-organized team. There is no approval flow; a player sets their own tag.

**Guild uniqueness policy TODO** — currently no validation prevents impersonation via case variants (`$BONK` vs `$bonk` vs `$B0NK`). Track as §9.15.

**4.4.2** Players without a guild have `guild_tag = 'lone_wolf'`. There is **no lone-wolf ATK bonus.** Combat is FFA within a zone and guildmates cannot hit each other, so a compensation bonus is unjustified.

**4.4.3** Zone combat is FFA — every guild on a zone fights every other guild simultaneously. Same-guild Nines do NOT attack each other.

**4.4.4** Guild composition matters strategically: a balanced guild wants DPS (Smoulders / Stormrage), tank (Stonebark), support (Dawnbringer), control (Nighthollow / Manastorm), DOT (Plaguemire), speed (Ashenvale).

### 4.5 Stat System — Pure Addition

```
total_atk  = house.atk  + card1.atk  + card2.atk  + card3.atk
total_hp   = house.hp   + card1.hp   + card2.hp   + card3.hp
total_spd  = house.spd  + card1.spd  + card2.spd  + card3.spd
total_def  = house.def  + card1.def  + card2.def  + card3.def
total_luck = house.luck + card1.luck + card2.luck + card3.luck
```

**No multipliers. No conversions.** Items (§4.14) add flat stats globally. House presence bonuses (§4.10) apply on top as percentage modifiers to specific stats.

**Card stat ceilings** (enforced at card design, not combat):
- Pure ATK cards: +10 ATK max
- Hybrid attack + effect: +8 ATK max
- Control / DOT / support: +6 ATK max
- Speed cards: +8 SPD each
- DEF cards: +20 DEF (Stonebark-exclusive)
- LUCK cards: +20 LUCK (Nighthollow-exclusive)

### 4.6 Combat Formulas

**4.6.1 Server tick rate.** 200 ms per tick (5 updates/sec). All engine math must be **tick-rate independent** — time-based DOTs fire on real-time intervals, never "per tick."

**4.6.2 Attack interval.**
```
attack_interval = max(2.5, 7.5 - SPD × 0.10) seconds
```
Floor: 2.5 s. Reference table: SPD 10 → 6.5s, SPD 22 → 5.3s, SPD 30 → 4.5s, SPD 50+ → 2.5s.

**4.6.3 Card effect cycle.**
```
card_cycle_interval = max(5.5, 12.0 - SPD × 0.10) seconds
```
Floor: 5.5 s. Cards rotate: slot 1 → slot 2 → slot 3 → repeat.

**4.6.4 Damage per hit.** `damage = ATK² / (ATK + DEF)`. Minimum 1.

**4.6.5 Critical hits.**
- Base crit chance: `LUCK × 0.3 / 100`
- With CRIT effect active: `LUCK / 100`
- Crit damage: 2× (3× if the Stormrage zone presence bonus is active — see §4.10).
- BLIND zeroes effective LUCK for 2 attacks.

**4.6.6 Slot bonuses (auto-attack damage multipliers only — do NOT apply to card effects).**
- Slot 1 (Opener): ×1.35
- Slot 2 (Follow-up): ×1.0
- Slot 3 (Closer): ×1.5 if target is below 40% HP

### 4.7 Spatial Combat Model

**4.7.1** Every Nine has an `(x, y)` position on the zone battlefield. Range is determined by the active card's type.

| Range | Distance | Card types |
|---|---|---|
| Melee | 90 px | attack |
| Mid-range | 220 px | control |
| Ranged | 380 px | dot |
| AOE (self) | 120 px radius | support |
| Self-cast | 0 px | utility |
| Zone-wide | Infinite | INSPIRE, INFECT |

**4.7.2 Targeting.**

| Card type | Prefers | If nobody in range |
|---|---|---|
| attack | Lowest HP enemy | Move toward closest enemy |
| control | Highest ATK enemy | Move toward highest ATK enemy |
| dot | Highest HP enemy | Move toward highest HP enemy |
| support | Lowest HP ally (90 px AOE) | Move toward wounded ally |
| utility | Self | Hold position |

**TAUNT overrides all targeting** — all enemies must attack the taunting Nine.

**4.7.3 Movement.** `movement_speed = 30 + (totalSPD × 1.2)` pixels per engine tick. Sprites lerp toward server position. Visual style: bob + waddle when moving, idle sway when still, direction flip toward travel vector, z-sort by Y (lower Y = in front). Informally called "South Park style."

**4.7.4 Server loop (every 200 ms):**
1. Decrement attack + card timers.
2. Apply time-based DOT (POISON every 1.5 s, BURN every 1.0 s, CORRODE 5 s CD).
3. Update movement destinations every 6 ticks (1.2 s).
4. Step positions.
5. Resolve card effects when card timer elapses.
6. Resolve auto-attacks when attack timer elapses.
7. KO check — any Nine at 0 HP → `waiting` state.
8. Round-end check — single guild remaining OR 5-min cap → `endRound`.
9. Broadcast `arena:positions` to the `/arena` Socket.io namespace, room `zone_<id>`.

### 4.8 Round System

**4.8.1 Round end** (whichever fires first):
1. **Last guild standing** — all Nines from all other guilds KO'd.
2. **5-minute hard cap** — winner is the guild with highest total surviving HP.

**4.8.2 Round intermission: 25 seconds.** A cinematic overlay shows: winner guild, survivor count per guild, top-5 KO board, points awarded, elapsed time, end reason (`LAST_STANDING` or `CAP`).

**4.8.3 Round start:**
- All Nines (including prior-round KO'd waiters) rejoin at **full HP**.
- All status effects clear (POISON, BURN, HEX, SILENCE, CORRODE, WARD, ANCHOR, DODGE, etc.).
- `round_number` increments.

**4.8.4 No mid-round rejoin.** A KO'd Nine sprite dims and shows `WAITING` until the next round. No redeployment to a different zone while waiting.

**4.8.5 Deployment lifecycle — three separate concepts.** Deployment length, auto-rejoin arming, and the "session" sidebar view are semantically distinct and must not be conflated.

- **(a) Manual deploy → stays deployed forever.** Only a KO or an explicit withdraw removes a Nine from a zone. There is no server-side idle/session timeout. The former 2-hour `SESSION_MS` constant is deleted under §9.41's refactor.
- **(b) Auto-rejoin → 1-hour armed window.** When the player toggles auto-rejoin ON and deploys, a 1-hour window opens from the first auto-deploy moment. Within that window, the client auto-redeploys on every KO's next round_start. At the 1-hour cap the auto-rejoin stops firing; the Nine stays withdrawn until the player manually re-deploys to re-arm a fresh 1-hour window.
- **(c) Sidebar "session" view → today's combat stats.** The right-side fighter list's SESSION toggle shows per-player cumulative combat stats for the current UTC day (KOs, damage dealt, damage taken, heals). Resets at 00:00 UTC. Distinct from `seasonal_points` (season-scoped, on `players`). Requires a new daily tracking source (see §9.41).

See §9.41 for the implementation refactor that aligns current code with this spec.

**4.8.6 UI timer.** Counts up (rounds have no fixed length). Timer turns gold at 4:00 (approaching the hard cap).

### 4.9 Scoring

**4.9.1 Zone battle points** (written on the events below):

| Action | Points (seasonal) | Timing |
|---|---|---|
| Deal a KO | +10 | Immediately on KO |
| Alive at round end | +5 | Round end |
| Guild controls zone at round end | +8 | Round end (surviving guild members) |
| Guild flips zone control | +15 bonus | Round end |

**4.9.2 KO credit.** Credit goes to the **last damage source**:
- Auto-attack kill → attacker (`nine._lastHitById`).
- POISON / BURN tick kill → the last player who applied the effect (`nine._dotAppliedById`).
- CHAIN second-target kill → the caster.
- SHATTER kill → the KO'd Nine's controller (SHATTER damages enemies on own death).

**4.9.3 Other sources.**

| Action | Points (Seasonal) | XP (Permanent) |
|---|---|---|
| Win Quick Duel | +8 | +4 |
| Lose Quick Duel | +2 | +1 |
| Gauntlet floor | +3/floor | +3/floor |
| Boss damage (per round) | +4 | +3 |
| Boss kill participation | +20 | +15 |
| Chronicle reply (base) | +15 | +5 |
| Chronicle quality reply | +25 | +5 |
| Chronicle detailed reply | +35 | +5 |
| Named in story | +20 | +10 |
| Daily login | +5 | +5 |

**4.9.4 Scoring invariants.**
- Card rarity does NOT affect points awarded.
- Players never lose points except via the explicitly defined activity decay rule (§4.22.4).
- No daily point cap for Season 1.

**4.9.5 Canonical points pipeline (must hold end-to-end):**

1. Every points-awarding event in code calls `pointsService.addPoints(playerId, amount, source, description)`.
2. `pointsService.addPoints` writes to **two places atomically**:
   - `UPDATE players SET seasonal_points += amount, lifetime_points += amount WHERE id = playerId`
   - `INSERT INTO point_log (player_id, amount, source, description, created_at) VALUES (…)`
3. All leaderboard reads (player / school / guild / rank) query `players.seasonal_points`.
4. `players.season_points` is **deprecated** — no new writes; existing values backfilled into `seasonal_points` on migration. (See §9 for current state and the forthcoming scoring-unification feature PRD.)

### 4.10 Zones — Structure & Identity

**4.10.1 Count.** 27 zones total. All contestable. No home zones.

**4.10.2 Three layers of zone control.**

**Layer 1 — Per-round points.** Covered in §4.9.

**Layer 2 — Daily guild branding.** At midnight UTC, the guild that won the most rounds on each zone *yesterday* gets its tag displayed on that zone all of today. Cosmetic only. Resets nightly.

**Implementation status:** Live. The `writeNightlyPresence` logic at `server/routes/zones.js:1014-1038` (exposed as `POST /api/zones/recalculate-identities`) writes `zones.branded_guild`. Scheduled nightly via `server/services/scheduler.js:80` at 00:00 UTC. A secondary on-demand snapshot path computes it via `fetchZoneSnapshot` at `server/routes/zones.js:904-937`. *Caveat:* the scheduler invokes the endpoint over HTTP with a fallback port of 5000, which mismatches the `.env.example` default of 3000 (see §9.19).

**Layer 3 — House presence bonus.** At midnight UTC, the house with the most fighters deployed on each zone yesterday claims it. The next day, **all fighters on that zone benefit from that house's bonus regardless of their own house/guild.** Fighter count only — not HP, not rounds won.

**Implementation status:** Live. Same midnight endpoint as Layer 2 writes `zones.dominant_house` alongside `branded_guild`. The combat engine consumes it at `server/services/combatEngine.js:97-100` to populate a per-zone `zoneBonusCache` on startup and refresh. The `HOUSE_BONUSES` map drives the in-combat multipliers.

| House claims zone | Next-day bonus |
|---|---|
| 🔥 Smoulders | +20% ATK |
| 🌊 Darktide | Regen 3% maxHP / 60 s |
| 🌿 Stonebark | +25% maxHP |
| 💨 Ashenvale | +15% SPD |
| ⚡ Stormrage | Crits deal 3× (instead of 2×) |
| 🌙 Nighthollow | +10 LUCK |
| ☀️ Dawnbringer | HEAL and BLESS 50% stronger |
| 🔮 Manastorm | All card effects 30% stronger |
| ☠️ Plaguemire | Enemies start each round with 1 POISON stack |

No bonus if zone had zero fighters the previous day. Both layers recalculate at midnight UTC.

### 4.11 Spell Cards

**4.11.1** Each card has exactly **one** effect — that effect is the card's identity. Effects are thematically locked to houses (§4.12).

**4.11.2 Card types.**

| type | Targeting | Range | Stat identity |
|---|---|---|---|
| attack | Lowest HP enemy | 90 px | High ATK |
| control | Highest ATK enemy | 220 px | LUCK / SPD, moderate ATK |
| dot | Highest HP enemy | 380 px | Low ATK, high HP |
| support | Lowest HP ally | 90 px AOE | HP / DEF, zero ATK |
| utility | Self | Self | SPD / DEF / LUCK |

**4.11.3 House effect ownership.**

| House | Exclusive | Shared |
|---|---|---|
| Stormrage ⚡ | CRIT, PIERCE | CHAIN, SURGE, EXECUTE, WARD |
| Smoulders 🔥 | BURN | EXECUTE, THORNS, SURGE |
| Stonebark 🌿 | ANCHOR | WARD, THORNS, HEAL, WEAKEN |
| Ashenvale 💨 | DODGE | CHAIN, HASTE, WEAKEN |
| Nighthollow 🌙 | HEX, BLIND | SILENCE, MARK, DODGE |
| Dawnbringer ☀️ | BLESS, INSPIRE | HEAL, BARRIER, EXECUTE, PIERCE |
| Manastorm 🔮 | TETHER, NULLIFY | WEAKEN, DRAIN, SILENCE, SURGE, BARRIER |
| Plaguemire ☠️ | POISON, CORRODE, WITHER | BARRIER |
| Darktide 🌊 | — | DRAIN, MARK, SURGE, TETHER, WARD, CHAIN, BARRIER |

**4.11.4 Total card pool: 84.** 12 Universal + 72 House-specific (8 per house × 9 houses).

**4.11.5 Any card can be equipped by any house** — house ownership determines thematic fit, not equipment restriction.

### 4.12 Effects — 36 Active (V4-Tuned)

**Note:** `EFFECTS_REFERENCE_V5.md` (Feb 26 2026) predates the April 15 V4 balance pass and is deprecated. Its values (POISON "per cycle", BURN "per cycle", HEX "-12/stack max -36", WARD reapplies) are wrong. Use §4.12 of this PRD.

**Removed since V5 doc:** GRAVITY, MIRROR, PARASITE, OVERCHARGE, SWIFT, RESURRECT, PHASE, AMPLIFY, LEECH AURA, SLOW (merged into WEAKEN), STEALTH (merged into DODGE).

**Stacking rules:**
- Numeric (BURN, POISON, HEX): max ×3, diminishing: 1st 100%, 2nd 75%, 3rd 50%.
- Binary (SILENCE, WARD, ANCHOR, DODGE): on/off only, no stacking.

**Timed durations by rarity:** Common 8s / Uncommon 9s / Rare 10s / Epic 11s / Legendary 12s.

#### ATTACK

| Effect | Mechanic |
|---|---|
| BURN | On-attack — 6 damage per stack, fires every 1.0 s. Stacks ×3. Duration = card_interval × 2s. Smoulders-exclusive. |
| CHAIN | On-attack — second hit on random nearby enemy within 130 px. Kill credit to caster. |
| EXECUTE | On-attack — +50% damage when target below 30% HP. |
| SURGE | Passive — +50% ATK, take extra damage. |
| PIERCE | On-attack — ignores WARD and BARRIER. |
| CRIT | On-attack — full LUCK% crit chance (vs 30% base). Stormrage-exclusive. |

#### DEFENCE

| Effect | Mechanic |
|---|---|
| HEAL | On-attack — 7% own maxHP to lowest-HP ally within 90 px (self if none). |
| WARD | Timed — block 1 hit. Bypassed by PIERCE. **Does NOT reapply while still active.** |
| ANCHOR | Timed — cannot drop below 1 HP. Stonebark-exclusive. |
| THORNS | Passive — reflect 18% of each incoming hit back to attacker. |
| BARRIER | Passive — absorb 50 total damage. Bypassed by PIERCE. |

#### CONTROL

| Effect | Mechanic |
|---|---|
| SILENCE | Timed — target's card effects don't trigger. Targets highest ATK enemy within 220 px. |
| HEX | On-attack — **-8 ATK/stack, max -24**. Nighthollow-exclusive. |
| WEAKEN | Timed — target deals 50% damage for 2 attacks. |
| DRAIN | On-attack — 20% lifesteal. |
| FEAST | On-KO — heal 15% of dead enemy's maxHP (zone-wide trigger). |
| TETHER | On-attack — 50/50 damage split with target for 3 attacks. |
| MARK | On-attack — target takes +25% damage from all sources for 3 attacks. |
| BLIND | On-attack — target LUCK = 0 for 2 attacks. Nighthollow-exclusive. |
| NULLIFY | On-attack — strip one active buff (WARD → BARRIER → ANCHOR → HASTE → DODGE). Manastorm-exclusive. |

#### TEMPO

| Effect | Mechanic |
|---|---|
| HASTE | On-attack — +10 SPD for 3 attacks. |
| DODGE | Utility — fully evade the next incoming hit. |

#### ATTRITION

| Effect | Mechanic |
|---|---|
| POISON | On-attack — 3% maxHP × stacks, fires every **1.5 s**. Stacks ×3, each stack decays after 3 fires (~4.5 s). Plaguemire-exclusive. |
| CORRODE | On-attack — -15 maxHP, **5-second real-time cooldown**. Permanent until round reset. Plaguemire-exclusive. |
| WITHER | On-attack — HEAL/BLESS/BARRIER 50% weaker for 3 attacks. Plaguemire-exclusive. |
| INFECT | On-KO — all enemies on zone gain 1 POISON stack. |

#### TEAM

| Effect | Mechanic |
|---|---|
| INSPIRE | On-attack — +2 ATK, +2 SPD to all allies (zone-wide). |
| BLESS | On-attack — heal all allies within 90 px for 4% own maxHP. |
| TAUNT | Utility — all enemies must attack this Nine (zone-wide override). |
| SHATTER | On-KO — 10% own maxHP as damage to all enemies within 120 px. |
| REFLECT | Utility — bounce the next incoming hit back at full damage (consumed on trigger). |
| CLEANSE | On-attack — remove all debuffs from self. |

### 4.13 Sharpness & Card Degradation

```
effective_stat = base_stat × (0.5 + sharpness / 200)
```
- 100% sharpness = 100% effectiveness.
- 0% sharpness = 50% effectiveness (**cards NEVER disappear**).

**Loss rules:**
- Zone combat: -1% per round end.
- Quick Duels / Gauntlet: no sharpness loss.

**Sharpening paths:**
- 1 exact duplicate → 100%.
- 3 same-house cards → 100%.
- 5 any cards → 100%.
- Sharpening Kit item → +50%.

### 4.14 Items

**4.14.1** Items add raw stats (5–20 per stat). A full Legendary set ≈ the value of one Common card — items are supplementary, not primary.

**4.14.2 Slots (3 equipped):**

| Slot | Focus |
|---|---|
| Weapon | ATK |
| Outfit | HP / DEF |
| Hat | Utility / LUCK |

**4.14.3** Item stats are passive and global — apply across all zones simultaneously. Items have no sharpness.

### 4.15 Daily Packs

**4.15.1** Each account receives **1 free pack per day on login**. A pack is 5 random cards, independent rarity rolls per card. The pool is all 84 cards (universal + all houses).

**4.15.2** On deployment, a player selects 3 cards from their permanent collection via the deploy modal before confirming.

**4.15.3** Paid packs, auction packs, and a secondary market are explicitly out of scope for this PRD (§5).

### 4.16 Leveling

**4.16.1** Leveling unlocks things. **It does NOT increase base stats.**

**4.16.2 XP sources (permanent — never reset):**

| Action | XP |
|---|---|
| Alive at round end | +2 |
| Guild controls zone at round end | +3 |
| Deal a KO | +5 |
| Win a Quick Duel | +4 |
| Lose a Quick Duel | +1 |
| Complete Gauntlet floor | +3/floor |
| Boss damage (per round) | +3 |
| Boss kill participation | +15 |
| Chronicle reply | +5 |
| Named in Chronicle story | +10 |
| Daily login | +5 |
| Flip zone to guild | +8 |

**4.16.3 Milestones (Season 1):**

| Level | Unlock |
|---|---|
| 1 | Start — 2 zone slots |
| 3 | Trinket slot 1 |
| 8 | Trinket slot 2 |
| 10 | 3rd zone slot + cosmetic border |

Trinket items themselves are out of scope for this PRD (§5).

**Levels beyond 10: TODO** — design decision pending (hard cap at 10? soft cap with diminishing returns? XP banked for future season unlocks?). Until decided, players may continue to accumulate XP past L10 with no additional unlocks. Track as §9.16.

### 4.17 Game Modes

**4.17.1 Zone Battles (core mode).** Round-based spatial auto-combat. Deploy → equip 3 cards → fight. Per §4.7–§4.10.

**4.17.2 Quick Duels (1v1 PvP).** Best of 3. Simultaneous card reveal — higher ATK deals damage. No sharpness loss. Elo rating (base 1000).

**4.17.3 Gauntlet (solo PvE).** Sequential AI battles, each harder. Daily reset. Item drops at floors 5, 10, 15. No sharpness loss.

**4.17.4 Weekly Boss (guild PvE raid).** Runs Monday–Friday. Scales with player count. AOE attacks. Sharpness degrades as normal.

### 4.18 Leaderboards

| Board | Ranks by |
|---|---|
| Player (main) | Individual seasonal points |
| Guild | Member points + zone round wins |
| House | Average points of active members |
| Duel | Elo rating |
| Gauntlet | Highest floor reached |
| Zone Control | Total rounds controlled |

**4.18.1** All point-based boards read `players.seasonal_points` (see §4.9.5). Any read of `players.season_points` is a bug.

### 4.19 `$9LV` Token Economy

**4.19.1** Points convert to `$9LV` at a starting ratio of **1 point : 1 `$9LV`**.

**4.19.2 Vesting:** 7 days before claimable, 7 more days before tradeable.

**4.19.3 Wizard Ranks — COSMETIC ONLY.** Rank does not modify combat.

| Rank | Perks |
|---|---|
| Apprentice | Base game |
| Initiate | Profile border glow |
| Adept | +1 bonus pack/week |
| Mage | Animated card backs |
| Archmage | Gold name on leaderboard |
| Grand Sorcerer | Custom card frame |

**Operational details TODO** — point→token claim cadence (manual vs automatic), ratio adjustment governance, anti-gaming protections (Sybil accounts farming daily login + Chronicle reply), and historical conversion records are deferred to a token-economy FPRD. Track as §9.17.

### 4.20 The Chronicle

**4.20.1** `@9LVNetwork` posts a daily 4-act story on Twitter/X:
- Morning — Act 1 (inciting).
- Midday — Act 2 (rising action, players begin being named).
- Afternoon — Act 3 (stakes rise).
- Evening — Act 4 (resolution, bonus points awarded).

**4.20.2** Players reply in character as their Nine. Replies are scored per §4.9.3 (base / quality / detailed tiers + named-in-story bonus). Flavor text on all four acts is generated via Anthropic Claude.

**4.20.3** The ending is unpredictable. Chronicle is the **social** half of the game — a player who only plays on Twitter has a complete (if narrower) experience.

**Quality tier rubric.** §4.9.3 defines three reply tiers (base / quality / detailed). Currently judged by raw character length in `server/services/chronicleEngine.js:170-187`: **base** for replies under 50 characters (+15 pts), **quality** for 50–119 characters (+25 pts), **detailed** for 120+ characters (+35 pts). A flat house-flair bonus applies if the reply text contains any of the 9 house names (case-insensitive). This is a deliberately crude heuristic — it rewards length over substance, so a 50-word gibberish reply outscores a 30-word in-character one-liner. Replacement by a semantic rubric (narrative relevance, in-character voice, specificity — potentially LLM-graded via the existing Anthropic integration) is tracked as §9.18.

### 4.21 Nerm — The AI Cat

**4.21.1** Nerm is 9LN's mascot and character: a floating cat head. Voice: sassy, pun-heavy, slightly chaotic, speaks as if born in Nethara.

**4.21.2 Surfaces where Nerm appears:**
- Twitter/X as `@9LV_Nerm` (AI personality bot, generation via Anthropic Claude).
- Telegram (moderator role, integration via `node-telegram-bot-api`).
- In-game Chronicle as a recurring character.
- Game flavor text on key events.

**4.21.3** Nerm is a **character**, not a feature — the voice must be consistent across all three surfaces. A breaking change in any surface should preserve voice.

### 4.22 Data & Scoring Pipeline (cross-cutting)

**4.22.1 Primary data store.** Supabase (Postgres). Two clients: `supabase.js` (anon key, respects RLS) and `supabaseAdmin.js` (service role, bypasses RLS). Server-side writes go through the admin client. `database/schema.sql` is the intended canonical SQL (see §9 — currently corrupted).

**4.22.2 Real-time layer.** Socket.io on `/arena` namespace, rooms keyed `zone_<id>`. Combat engine calls `global.__arenaSocket._broadcastToZone(zoneId, event, data)` to push updates. Duel handlers attach via `setupDuelSockets(io)`.

**4.22.3 Scheduler.** `node-cron` in `services/scheduler.js`. Daily jobs: midnight banking, objective post, activity decay, Nerm posts, zone presence recalc. See `ADMIN_COMMANDS.md` for the full schedule.

**4.22.4 Activity decay.** On the daily scheduler, any player inactive (`last_cast_at` stale beyond threshold) has `seasonal_points` reduced by 5% (floor). This is the ONLY sanctioned case where a player's point total decreases.

**4.22.5 Points pipeline — canonical flow.** Per §4.9.5:
```
event → pointsService.addPoints(playerId, amount, source, description)
        ├── UPDATE players.seasonal_points += amount
        ├── UPDATE players.lifetime_points  += amount
        └── INSERT point_log (player_id, amount, source, description, created_at)
```
No code path awards points by any other route. The RPC `increment_season_points` is deprecated and pending removal (see §9).

**4.22.6 Admin boundary.** All admin endpoints require an `x-admin-key` header. See `ADMIN_COMMANDS.md` for the full catalogue. Admin endpoints can override any gameplay value — that surface is intentional and audited in-band (every admin mutation should write a `point_log` or equivalent audit row where applicable).

---

## 5. Non-Goals (Out of Scope)

What 9LN — in the version described by this PRD — explicitly **does not** include:

1. **NFT Genesis collection.** "The Nines" (2,500 Genesis) is Season 2+. Not in this PRD.
2. **Paid packs, auction house, secondary market.** `packs.html` has "coming soon" sections for these — they stay that way until a dedicated feature PRD replaces them.
3. **Trinket items (beyond unlock slots).** Trinket slots exist at L3 / L8 milestones but the trinket item set itself is not defined here.
4. **Wizard ranks as gameplay modifiers.** Ranks are cosmetic-only. Any rank-based combat bonus proposal is a future feature, not current scope.
5. **React/Vite frontend (`/client/`).** Scaffold exists; no game features are built there. Do not invest in migration to React until a dedicated PRD justifies it.
6. **Old V5 effect mechanics** (POISON per-cycle, BURN per-cycle, HEX -12/-36, WARD reapply, PHASE/AMPLIFY/OVERCHARGE/SWIFT/LEECH AURA/etc.). These are wrong. The only authoritative effect definitions are in §4.12.
7. **"Combat V6 wave combat with 30s buffer"** — this phrase appears in `server/index.js:306` boot logs but does not correspond to any design or implementation. It is a stale log line and should be removed. 9LN does not have "wave combat."
8. **`combatEngineV2`** — referenced from `server/routes/admin.js:644` but the file does not exist. Do not build a V2 engine; fix or remove the admin endpoints that depend on it.
9. **`/api/mana` route** — referenced from `server/index.js:53` but `server/routes/mana.js` does not exist. Mana logic lives in existing routes/services; the separate route file is not needed unless a feature PRD requires it.
10. **Dual naming schemes.** Legacy school names (Ember Covenant, Tidal Conclave, Avaloris-as-world) are not supported. Only the house names in §4.3 and the world name Nethara are canonical.

---

## 5.5 Phasing & Release Sequence

This PRD is not a roadmap — it describes the end state. But the work to close the gaps in §9 is not uniform in urgency. The three phases below sequence the effort from "the game records points correctly" through "the loop feels rewarding" to "hardcore community foundations."

### Phase 1 — Scoring foundations

**Scope.** Every arena combat event records points via the canonical pipeline (§4.9.5) and lands in `point_log`. Nothing ships downstream of this.

**Closes:** §9.1 (scoring column split), §9.2 (`handleKO` ReferenceError), §9.3 (`SESSION_MS`), §9.4 (`ROUND_MS` undefined), §9.5 (stale V6 boot log), §9.6 (missing files — at minimum a `database/schema.sql` dump so new contributors can reproduce locally), §9.19 (scheduler PORT mismatch potentially breaking nightly zone identity recalc — player-facing, not tidiness).

**Done when:**
- Zero writes to `players.season_points` in any session over 24 h; zero reads of that column in any live route.
- Every KO visible in the intermission overlay has a matching `point_log` row with `source='zone_ko'`.
- Combat engine boot log reports only the truthful version string (no "V6 wave combat" line).
- Boot-time missing-file audit (§7.2 follow-up) reports zero failed requires.
- `SESSION_MS` constant matches §4.8.5 (2 hours); no `ReferenceError: ROUND_MS is not defined` in 24 h of logs.
- Nightly zone identity recalc (§9.19) verified firing in production — `zones.dominant_house` and `zones.branded_guild` updated within the last 24 h across all 27 zones.

### Phase 2 — Player onboarding & visible feedback

**Scope.** Polish the loop so the reward is legible. Onboarding under 60 s; leaderboards that reflect reality; real-time point feedback in the UI.

**Surfaces FPRDs for:**
- Chronicle quality scoring rubric replacement (§9.18).
- Guild tag uniqueness / impersonation policy (§9.15).
- Leaderboard sub-views (daily / seasonal / zone / guild drill-down).
- Real-time point-award toast notifications driven by `point_log` inserts (via Socket.io).

**Done when:**
- New-player path from OAuth → first deploy verified under 60 s on mid-range laptop + mobile.
- Leaderboard endpoints at `/api/leaderboards/*` return data within 500 ms (p50) and reflect writes within one round.
- A player who just earned +10 for a KO can see that row in their personal history page before the next round starts.
- Guild impersonation via case variant ($BONK vs $bonk) is prevented at write time, with existing rows canonicalized by migration.

### Phase 3 — Hardcore community foundations

**Scope.** Systems that reward long-term engagement. Items fleshed out, leveling beyond L10 defined, Chronicle/Twitter quality loops tightened, season rollover infrastructure built.

**Surfaces FPRDs for:**
- Post-L10 leveling design (§9.16).
- Item crafting / drop rate / rarity curve — making items feel like a meaningful collection parallel to cards.
- Token economy operational details (§9.17) — claim cadence, ratio governance, anti-Sybil.
- NFT Genesis planning for Season 2 (the 2,500 Genesis drop — scope, allocation, gameplay effects).
- Season rollover job (freeze leaderboard snapshot, reset `seasonal_points`, carry `lifetime_points`, issue season-end rewards).

**Done when:**
- A player reaching L10 has a defined next milestone, even if it's "level cap — XP now counts toward next season."
- Items have a full stat range + drop source + crafting path all documented in a feature PRD.
- A dry run of the season rollover job on a staging Supabase branch produces `seasonal_points = 0`, `lifetime_points` preserved, top-N snapshot recorded, and issues computed rewards without errors.
- Token claim flow has been through legal/compliance review and has a documented anti-Sybil baseline.

---

## 6. Design Considerations

**6.1 Aesthetic.** Post-ironic high fantasy meets crypto-Twitter meme culture. Tagline: *"Your Nine Fights. Cards Are Its Weapons."* Not self-serious; willing to reference the meme economy it lives inside.

**6.2 Visual language.** "South Park style" for Nine sprites — bob + waddle when moving, idle sway when still, direction flip, z-sort by Y. Static art can feel alive without frame animation.

**6.3 Frontend reality.** The live UI is vanilla HTML/CSS/JS under `/public/`, served as Express static files. Three.js and Leaflet.js load from CDN on the pages that need them. The `/client/` React/Vite scaffold is NOT the game — see §5.

**6.4 UI feedback loops.** The round timer counts **up** (no fixed round length). Points awards shown in the intermission overlay must match `point_log` entries one-to-one — if they don't, the UI is lying and the user trust erodes.

**6.5 Accessibility.** Not a goal-line requirement for this PRD, but all critical game state (current HP, active effects, round timer, points awarded) must be readable as text, not only visual. A screen-reader-tested pass is deferred to a follow-up PRD.

---

## 7. Technical Considerations

**7.1 Stack.**
- Node 18+.
- Express v5 (CommonJS — `require` / `module.exports`, **no ESM** on the server side).
- Socket.io (optional — server boots if it fails to load; duels fall back to REST).
- Supabase (`@supabase/supabase-js`).
- Anthropic Claude (`@anthropic-ai/sdk`) for Chronicle flavor + Nerm personality.
- `twitter-api-v2` for both `@9LVNetwork` and `@9LV_Nerm` bots.
- `node-telegram-bot-api` for Nerm's Telegram presence.
- `node-cron` for scheduled jobs.
- Frontend: vanilla HTML/JS under `/public/`; Three.js / Leaflet.js / Pixi.js loaded via CDN per page.

**7.2 Graceful-degradation pattern.** `server/index.js` and `services/scheduler.js` wrap every `require()` in individual `try/catch`. The server is designed to boot even when optional services (Twitter, Telegram, Anthropic, combat engine) fail to load. Every new route/engine MUST follow this pattern.

**Caveat of this pattern:** it hides missing files (e.g., `mana.js`, `combatEngineV2.js`) from boot logs. A startup self-report (list of failed requires exposed via `/api/health`) was implemented in PR #140 via a shared `server/services/bootFailures.js` accumulator — `/api/health` now returns `{ status, timestamp, failed_requires: [{ module, error, stack, timestamp }] }`. An empty `failed_requires` array is the healthy state.

**7.3 Server layout (actual, not as README claims).**
- `server/routes/` — Express routers mounted under `/auth`, `/api/<name>`.
- `server/services/` — all engines, bots, schedulers (flat). **Not `server/engine/` or `server/twitter/`** — those don't exist.
- `server/config/` — `supabase.js`, `supabaseAdmin.js`, `twitter.js`.
- `server/jobs/` — a couple of standalone job scripts. Recurring cron lives in `services/scheduler.js`.

**7.4 Drizzle is vestigial.** `drizzle.config.ts` and `shared/schema.ts` exist but define only a placeholder `users` table. **Do not** treat Drizzle as the schema authority. Game tables are defined in Supabase directly.

**7.5 Environment variables.** See `.env.example`. Required:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_BEARER_TOKEN`, `NINELIVES_ACCESS_TOKEN`, `NINELIVES_ACCESS_SECRET`
- `NERM_ACCESS_TOKEN`, `NERM_ACCESS_SECRET`, `NERM_TELEGRAM_TOKEN`
- `ANTHROPIC_API_KEY`
- `ADMIN_KEY`
- `PORT` (default **3000** per `.env.example`; note `server/services/scheduler.js:80` falls back to `5000` when self-calling the recalc endpoint — mismatch tracked in §9.19)

**7.6 Scripts.**
- `npm run dev` — `nodemon server/index.js` (auto-reload).
- `npm start` — `node server/index.js` (production).
- `npm test` — Jest (**no tests populated yet**).
- No lint script configured.

**7.7 Storage growth budget.** `zone_control_history` grows at ~265 rows/day (empirically, 2026-04-17). `point_log` at ~10/day. At current cadence, `zone_control_history` projects to ~96k rows/year. A retention policy (e.g., rollup past 90 days) is deferred but worth flagging before the first DB cost spike.

---

## 8. Success Metrics

**Product metrics:**
| Metric | Target |
|---|---|
| New-player time to first deploy | < 60 s (median) |
| DAU / registered players | > 40% |
| % of sessions that include both a Chronicle reply AND a zone deployment | > 25% |
| Guild density (players with non-`lone_wolf` tag) | > 50% |

**Combat balance metrics (watchlist from playtesting):**
| Metric | Target | Rebalance trigger |
|---|---|---|
| Round length (median, balanced 4v4) | ~80 s | < 30 s OR > 4 min routinely |
| DOT 1v1 vs tank resolution time | ~50 s | Players report DOT feels irrelevant |
| Stonebark maxHP after full CORRODE pressure at 5 min | ~160 | < 100 ("one-shot" feel) or > 300 (tanks unchecked) |
| Pts/hr ratio glass cannon : tank | ~1.9× | > 2.5× (tanks feel unrewarded) |
| HEX-capped Stormrage ATK | 16 (1.7 DPS) | Players abandon Nighthollow / Manastorm |
| WARD post-expiry vulnerability window | Present but brief | Feels "punishing" rather than "tactical" |

**Technical metrics:**
| Metric | Target |
|---|---|
| Points awarded in UI = rows inserted into `point_log` | 1:1 |
| Combat engine `ReferenceError` rate | 0 / 24h |
| Boot-log discrepancies (engine version strings match code) | 0 |
| Round-start broadcast delivery rate | 100% (no silently-thrown `ROUND_MS` errors) |
| Admin endpoints returning 500 "engine not loaded" | 0 |

---

## 9. Open Questions / Known Issues

This section is the **live bug ledger** the PRD carries. Each item is tied to a code location and should be resolved by a dedicated follow-up feature PRD (marked `→ FPRD`) or a one-liner cleanup PR (marked `→ cleanup`). Nothing here is acceptable in a shipped product long-term; all of it is currently live.

**Maintenance convention.** Every PR that resolves an entry below appends a bold `**Resolved YYYY-MM-DD in PR #X.**` line to that entry rather than deleting it. Every PR that discovers a new issue adds a new entry at the next available number. See `CLAUDE.md` → "PRD discipline" for the mechanics, including the `PR #?` bootstrap pattern for self-referencing the current PR.

### 9.1 Scoring column split — `seasonal_points` vs `season_points` → FPRD

**Symptom.** Combat engine awards round-end points via `supabaseAdmin.rpc('increment_season_points', { p_player_id, p_pts })` at `server/services/combatEngine.js:653`. PostgREST resolves the `p_pts` parameter name to the `(bigint, integer)` overload of the RPC, which writes to `players.season_points`. The leaderboard at `server/routes/leaderboards.js:17` orders by `players.seasonal_points`. The two are different columns.

**Effect.** Every arena survive / control / flip point is invisible on the public leaderboard. Live data (2026-04-17): `@9LV_Nerm` has `season_points=15258` and `seasonal_points=580`.

**Resolution plan:** (1) Drop the `(bigint, integer)` RPC overload; (2) migrate combat engine to `pointsService.addPoints`; (3) one-time backfill of `season_points` into `seasonal_points` (with stakeholder review — some values are historically valid arena earnings); (4) drop the `season_points` column; (5) retarget the `/api/leaderboard/season` endpoint at `seasonal_points` or remove it.

**Partially resolved 2026-04-20 in PR #147.** KO-slice (+10 pts on kill) migrated to `pointsService.addPoints` in PR #147 as part of §9.2 / §9.23 handleKO fix. Survive/control/flip paths in `endRound` still use the broken `increment_season_points` RPC — remain open under §9.1.

### 9.2 `handleKO` ReferenceError → FPRD (bundled with 9.1)

**Symptom.** `server/services/combatEngine.js:393` — `handleKO(nine, zoneId, all)` references undefined `killerId` and `killerName` at lines 398 and 411. Throws `ReferenceError` on every KO. The outer tick `try/catch` (line 882) swallows.

**Effect.** Zero KO points ever awarded since V3. `point_log` has zero `zone_ko` rows in the last 7 days.

**Resolution plan:** Derive killer as `nine._lastHitById ?? nine._dotAppliedById`, route the +10 reward through `pointsService.addPoints(killerId, 10, 'zone_ko', …)`.

**Resolved 2026-04-20 in PR #147.** Applied the prescribed recipe verbatim. `handleKO` now derives `killerId = nine._lastHitById ?? nine._dotAppliedById ?? null` and `killerName = nine._lastHitBy ?? nine._dotAppliedBy ?? null` at the top of the function and uses those locals in the `combat:ko` broadcast and the points award. KO reward now goes through `pointsService.addPoints(killerId, 10, 'zone_ko', …)` (also closes §9.1 KO-slice). Discovery chain: §9.2 (original 2026-04-17 filing) → §9.23 (symptom investigation 2026-04-20 during Task 4.0 PR #143 smoke test, when ghost sprites + non-ending rounds surfaced) → PR #147. Cleanup migration in the same PR retires 1 ghost `zone_deployments` row that accumulated before the fix.

### 9.3 `SESSION_MS` is half the spec → cleanup

**Symptom.** `server/services/combatEngine.js:17` — `SESSION_MS = 1 * 60 * 60 * 1000` (1 hour). §4.8.5 of this PRD specifies **2 hours**.

**Resolution:** Change constant to `2 * 60 * 60 * 1000`.

**Resolved 2026-04-18 in PR #136.** Constant updated to `2 * 60 * 60 * 1000` with inline reference to PRD §4.8.5.

**Superseded 2026-04-20 by §9.41.** §4.8.5's rewrite drops the server-side inactivity timeout entirely; `SESSION_MS` itself is being deleted under §9.41's refactor. This §9.3 entry stays intact as history — the 1h→2h fix was correct against the spec as it existed at the time. The new spec (manual deploys stay indefinitely) makes both the original value AND the §9.3 fix obsolete.

### 9.4 `ROUND_MS` undefined → cleanup

**Symptom.** `server/services/combatEngine.js:727` and `:894` reference `ROUND_MS`, which is not declared. Rounds have no fixed length, so these references are conceptually wrong, not just a typo.

**Resolution:** Remove the `roundMs: ROUND_MS` field from the `arena:round_start` broadcast and from the `getRoundMs` export. Clients should display elapsed time, not a fixed round length.

**Resolved 2026-04-18 in PR #136.** Both references removed. Pre-verified zero consumers of `getRoundMs()` and zero client-side listeners for the `roundMs` field anywhere in `server/` or `public/`.

### 9.5 Stale "V6 wave combat" boot log → cleanup

**Symptom.** `server/index.js:306` logs `"⚔️ Combat engine started — V6 wave combat, 30s buffer"`. No code implements wave combat or a 30s buffer. The engine itself logs its true identity on the next line (`"✅ Combat engine V3 started"`).

**Resolution:** Delete the line. Per §5.7, "V6 wave combat" is not a thing.

**Resolved 2026-04-17 in PRs #126 + #128** (retroactive — these merged before the PRD was written). `server/index.js:306` is now a clean `combatEngine.startCombatEngine()` call block with no V6 log line. Verified 2026-04-18.

### 9.6 Missing files referenced by live code → cleanup

- `server/routes/mana.js` — required at `server/index.js:53`, does not exist. `/api/mana` is silently disabled.
- `server/services/combatEngineV2.js` — required at `server/routes/admin.js:644`. Three admin endpoints (zone status v2, force-snapshot, reload-zone) return "V2 engine not loaded."
- `database/schema.sql` — 5 bytes containing `s.sql\n`. The primary schema file is effectively absent; a clean clone cannot reproduce the DB locally.

**Resolution:** Either build the missing artifacts (for schema.sql — dump the live Supabase schema into the file) or remove their require/reference sites.

**Partially resolved 2026-04-17 in PR #125** (retroactive — pre-PRD). `database/schema.sql` now contains a 941-line generated dump (timestamp `2026-04-17T12:47:50Z`), and `scripts/dump-schema.js` was added so future refreshes are reproducible.

**Resolved 2026-04-18 in PR #137.** The two remaining missing-require sites have been removed: `server/index.js` no longer requires `./routes/mana.js` (per PRD §5.9 non-goal), and `server/routes/admin.js` no longer requires `../services/combatEngineV2` nor exposes the three dependent admin endpoints (per PRD §5.8 non-goal). The boot-time observability work originally scoped as 3.4 — a `/api/health` endpoint that reports failed requires — was deferred to a new Task 8.6 since it's a separate concern from §9.6 resolution.

### 9.7 Dead per-deployment stat columns → cleanup (or FPRD if surfaced)

**Symptom.** `zone_deployments` has `damage_dealt`, `heals_done`, `kos_dealt`, `points_earned` — no code writes to them.

**Resolution options:** (a) wire them up in combat engine so per-session stats surface in profile; (b) drop the columns. Pick one.

### 9.8 Orphaned routes and services → cleanup

Routes on disk but never mounted in `server/index.js`: `arena.js`, `chronicle.js`, `drop-tickets.js`, `leveling.js`, `raids.js`, `stats.js`.
Services on disk but never required: `House-zones.js`, `arena-sockets.js` (despite an inline arena namespace implementation in `server/index.js:204-270`), `cardDurability.js`, `livesReset.js`, `nerm-hooks-v2.js`, `nineStats.js`, `seed-narratives.js` (duplicate of root-level), and the committed `nermBot.js.bak`.

**Resolution:** Decide per-file whether to wire or delete. Default to delete — anything not surfacing in code is costing attention.

**Partially resolved 2026-04-17 in PR #127** (retroactive — pre-PRD). `server/services/nermBot.js.bak` has been removed from the repo. **Still open:** all 6 orphaned routes and 7 remaining orphaned services — targeted by Task 5.0 (Cleanup sweep) in `tasks-prd-9ln-rollout.md`.

### 9.9 Shell-accident files in repo root → cleanup

Empty files: `collection`, `dont`, `glass cannon` (with space), `workspace`, `const { data: cardSlots } = await supabase`.
Misnamed files: `sedufYWHw` (a 271-byte copy of `.replit`).
One-off scripts at root (should move to `scripts/` or delete after migration): `fix-card-refs.py`, `fix-narrative-points.js`, `nuke-old-cards.py`, `patch-game-modes-v4.py`, `patch-packs.sh`, `seed-narratives.js`.

**Resolution:** Delete.

**Resolved 2026-04-17 in PRs #126 + #127** (retroactive — pre-PRD). PR #126 deleted the empty shell-accident files and `sedufYWHw`. PR #127 moved the one-off migration scripts to `scripts/archive/migrations/` and deleted `card-v4-reference.jsx`. *Note:* this class of file re-accumulates through shell accidents (today's session surfaced a new batch — see the next cleanup sweep).

### 9.10 Faction name drift in seed data → verify

**Symptom.** README uses legacy scheme (Ember Covenant / Tidal Conclave / etc.); §4.3 of this PRD uses the canonical scheme (Stormrage / Smoulders / etc.). `database/seeds/schools.sql` is the tiebreaker for production.

**Resolution:** Inspect the seed file + live `houses` table. If live rows match §4.3 names, delete the README table. If they match legacy names, that's a larger migration; plan it deliberately.

### 9.11 Arena engine V5 parallel implementation → decide & prune

**Symptom.** `server/services/arena-engine.js` header reads `ARENA ENGINE — Nine Lives Network V5`. It is instantiated per-zone with 5-minute cycles. It is NOT started at boot; only reachable if `services/arena-sockets.js` is loaded — but `arena-sockets.js` is itself orphaned. Net result: V5 arena engine exists but may never execute.

**Resolution:** Either (a) delete V5 entirely (it's dead); or (b) a feature PRD migrates combatEngine.js → arena-engine.js. Carrying both is pure cost.

### 9.12 React scaffold — retain or remove? → decide

`/client/` is a complete Vite+React+shadcn scaffold with a two-route placeholder app. It contributes ~40 component files and a parallel dependency graph (React 19, Tailwind, drizzle-kit, @vitejs/plugin-react) for zero shipped features.

**Resolution:** Either (a) a dedicated PRD plans a migration; (b) delete it. Default in the absence of a plan: delete, free the mental overhead.

### 9.13 No automated tests → deferred

`npm test` runs Jest with zero populated tests. This is a known gap, not a bug. A testing-infrastructure PRD is a follow-up.

### 9.14 Storage growth → monitor

See §7.7. `zone_control_history` at 265 rows/day will be the first table to show meaningful cost. Pre-emptive rollup / archival PRD at 6-month mark.

### 9.15 Guild tag uniqueness / impersonation → FPRD (Phase 2)

**Symptom.** `players.guild_tag` is a free-text string with no validation. `$BONK`, `$bonk`, `$B0NK`, and `$BONK` with an injected zero-width space are all distinct tags today. Impersonation-by-case-variant is possible.

**Resolution plan:** Feature PRD defining canonicalization (casefold + strip-zero-width + trim), an allow-list for crypto tickers with a claim/approval flow if needed, and a migration that rewrites existing `guild_tag` values and de-duplicates collisions.

### 9.16 Post-L10 leveling → FPRD (Phase 3)

**Symptom.** §4.16.3 defines unlocks through L10. Players past L10 continue earning XP (permanent, never resets) with no additional reward.

**Resolution options:** (a) hard cap at L10 — XP past cap is dropped; (b) soft cap — diminishing XP returns past L10; (c) rollover — XP past L10 banks toward Season 2 unlocks. Decision pending.

### 9.17 Token economy operational details → FPRD (Phase 3)

**Symptom.** §4.19 establishes the 1:1 point→`$9LV` ratio and 7+7 day vest but does not define: claim cadence (manual button? scheduled? eligibility gate?), who can adjust the ratio and under what process, anti-gaming protections (Sybil accounts farming daily login + Chronicle reply), or an audit trail for historical conversions.

**Resolution plan:** Token-economy FPRD. Must coordinate with legal/compliance before shipping claim flow.

### 9.18 Chronicle quality rubric is a length heuristic → FPRD (Phase 2)

**Symptom.** `server/services/chronicleEngine.js:170-187` decides reply tier by raw character count: `<50` = base (+15), `50–119` = quality (+25), `120+` = detailed (+35), plus a flat bonus if the text contains any of 9 house names. This rewards length over quality; a 50-word gibberish reply scores higher than a 30-word in-character one-liner.

**Resolution plan:** Replace with a semantic rubric. Options include an LLM-graded rubric (narrative relevance, in-character voice, specificity) via the existing Anthropic integration, or a moderator-reviewable flagging system. Either route is a feature PRD.

### 9.19 Nightly zone-identity recalc — incomplete writer + undefined V4 semantics → BLOCKED — design decisions required

**Status.** Blocked pending design decisions. See `docs/design/zone-identity-v4.md`.

**Symptom (reframed 2026-04-19).** The nightly cron fires correctly — `server/services/scheduler.js:150` schedules the midnight banking block, which at lines 163-170 POSTs `http://localhost:${PORT||5000}/api/zones/recalculate-identities`. The recalc endpoint at `server/routes/zones.js:1096-1160` executes and writes to `zones.dominant_house` / `zones.branded_guild` / `zones.house_bonus_label`. The real problems are threefold:

1. **Incomplete round-end writer.** `server/services/combatEngine.js:1226-1239` inserts into `zone_control_history` on every round end but omits `dominant_house`, `branded_guild`, and `snapshot_hp` — so those three columns are persistently NULL/0 across 7,763 rows spanning 30 days (2026-03-19 → 2026-04-18). The nightly recalc then has no source data to aggregate.
2. **Split source of truth.** The combat engine's zone-bonus cache at `combatEngine.js:127-134` reads `zone_control.dominant_house`. The nightly recalc writes `zones.dominant_house`. Nothing writes `zone_control.dominant_house`. Two tables holding the same semantic field, with the runtime consumer reading from the side nothing updates. See §9.21.
3. **Undefined V4 semantics.** There is no current spec for what "dominant house" or "branded guild" means in a V4 (9-zone arena) round. Pre-diagnostic code assumed these concepts existed but never defined them. Fixing (1) and (2) requires picking a definition.

**Severity note.** Originally filed (pre-diagnostic) as a PORT-default mismatch causing silent 404s. The 2026-04-19 diagnostic proved the cron fires correctly — the PORT hypothesis was wrong. Reframed to incomplete writer + design gap. The underlying player-facing concern stands: zone presence/branding bonuses in `combatEngine.js` are driven by stale or NULL values, so combat is not honoring any zone-identity mechanic.

**Resolution.** **BLOCKED** on design decisions. See `docs/design/zone-identity-v4.md` for the five open questions (round-level dominant-house definition, daily aggregation rule, branded-guild semantics, single source of truth, `snapshot_hp` deprecation). Once answered, the fix is:
- Update the round-end writer at `combatEngine.js:1226-1239` to populate the designed fields.
- Consolidate zone-identity reads/writes onto one table (see §9.21).
- Drop deprecated V1 mechanics (see §9.22).

**Updated 2026-04-19 in PR #141.** Reframed after full diagnostic via Supabase MCP (zones/zone_control/zone_control_history inspection) + grep audit of writers and readers. Original framing preserved below for history.

**Partially resolved 2026-04-20 in PR #143.** Round-end writer now populates `dominant_house` and `branded_guild`; recalc aggregation switched to rounds-won. Full resolution pending: (a) combat engine reader switch to `zones` table (PR #144 — Task 4.0.3) and (b) `snapshot_hp` column drop (PR #145 — Task 4.0.4).

**Fully resolved 2026-04-20 in PR #146.** End-to-end zone-identity pipeline for V4 is now live and correct. Resolution chain: PR #141 (diagnostic reframe), PR #143 (round-end writer + recalc aggregation per Q1/Q2), PR #144 (combat reader switch + merge flip + guild-tag UI per Q3/Q4), PR #145 (code cleanup of deprecated column reads — slice "3a"), PR #146 (schema drop via `supabase/migrations/20260419144153_drop_zone_control_deprecated_columns.sql` — slice "3b"). Combat, recalc, and UI all read from `zones` as the single source of truth; deprecated V1 columns are gone.

**Original filing (PORT default mismatch hypothesis — proven wrong 2026-04-19).** `.env.example:25` sets `PORT=3000`. `server/services/scheduler.js:80` self-calls its recalc endpoint via `http://localhost:${process.env.PORT || 5000}/api/zones/recalculate-identities`, falling back to **5000**. The hypothesis was that if the server bound to 3000 and `PORT` wasn't exported to the scheduler's environment, the request would 404 silently. The diagnostic confirmed the cron does reach the endpoint and the endpoint does run — the real issue is that the endpoint aggregates NULL/0 data because the round-end writer never populates the source columns.

### 9.20 Orphaned `/api/zones/midnight-reset` endpoint → cleanup

**Symptom.** `server/routes/zones.js:1166-1210` defines `router.post('/midnight-reset', ...)` with an in-file comment that it's "Called by a scheduled job (or cron) at midnight UTC." No cron call exists — `server/services/scheduler.js` audit (2026-04-19 Task 4.0 diagnostic) confirmed the only zone-identity cron call is to `/recalculate-identities`, not `/midnight-reset`. The endpoint overlaps in purpose with `/recalculate-identities` (both aggregate `zone_control_history` to set `zones.branded_guild` / `zones.dominant_house`), differing only in aggregation window: `/midnight-reset` uses today's history from 00:00 UTC; `/recalculate-identities` uses the trailing 24h.

**Effect.** Dead code; overlap risks confusion for future maintainers. Low severity on its own but zone-identity-adjacent — should be handled in the same cleanup pass that resolves §9.19.

**Resolution plan:** Delete the endpoint after `docs/design/zone-identity-v4.md` picks a single source of truth. Zone-identity mechanics should have one designated write path.

**Resolved 2026-04-20 in PR #143.** Endpoint deleted; `/recalculate-identities` is now the sole write path for zone-identity fields per the Task 4.5 Q4 decision. Grep confirmed zero consumers across `server/`, `public/`, `client/` before deletion.

### 9.21 Split source of truth — `zone_control.dominant_house` vs `zones.dominant_house` → architectural decision

**Symptom.** Two tables hold the same semantic field:
- `zone_control.dominant_house` — read by `server/services/combatEngine.js:127-134` to build the in-memory `zoneBonusCache` used in live combat.
- `zones.dominant_house` — written by `server/routes/zones.js:1096-1160` (nightly recalc) and read by `server/routes/zones.js:808-838` (zones list response merge) and `public/nethara-live.html:1845, 1953, 1980, 2031, 3910` (UI display).

No writer populates `zone_control.dominant_house`. Existing populated values in the 8 current rows are stale — the V4 writer at `combatEngine.js:1215-1224` only sets `controlling_guild`, and V1-style writers (`config/twitter.js`, `routes/territory.js`, `services/twitterBot.js`, `services/territoryControl.js`) target `school_id` / `control_percentage` columns that no longer exist in the current schema. Those V1 writers fail silently on every call.

**Effect.** The combat engine applies zone bonuses based on a column nothing updates. The UI reads `zones.dominant_house` (freshly recalculated), but combat uses `zone_control.dominant_house` (frozen). Players can see a mismatch between the displayed house bonus and what actually modifies their stats in-round.

**Resolution plan:** Pick one table as source of truth. See `docs/design/zone-identity-v4.md` Q4. Candidate decisions:
- **(a)** Make `zone_control.dominant_house` authoritative — update the round-end writer + nightly recalc to write there; frontend reads from the `zones` endpoint's merged response (it already has the fallback).
- **(b)** Make `zones.dominant_house` authoritative — refactor `combatEngine.js` bonus cache to read from `zones` instead, drop the column from `zone_control`.

**Resolved 2026-04-20 in PR #144.** Chose option (b) per Task 4.5 Q4: `zones.dominant_house` is now authoritative. The combat engine's zone-bonus cache at `server/services/combatEngine.js:124-142` now reads from `zones` instead of `zone_control`. The zones-list merge at `server/routes/zones.js:829-841` flipped to prefer `z.dominant_house` over `controlMap[z.id]?.dominant_house` so the frontend and combat engine see the same authoritative value. The `zone_control.dominant_house` column itself will be dropped in PR #145 (bundled with §9.22's `snapshot_hp` drop to keep all schema migrations in one PR).

### 9.22 `snapshot_hp` column in `zone_control` / `zone_control_history` is deprecated V1 → cleanup

**Symptom.** Both `zone_control.snapshot_hp` and `zone_control_history.snapshot_hp` exist in the schema (integer). The 2026-04-19 Task 4.0 diagnostic confirmed:
- No live code path writes the column. The current writer at `combatEngine.js:1215-1239` omits it; V1-style writers targeting `school_id` / `control_percentage` cannot be reached (those columns no longer exist).
- The 8 current rows in `zone_control` have populated `snapshot_hp` values (max=700) — historical values from a code path that no longer exists.
- `zone_control_history` recent rows all have `snapshot_hp=0` (column omitted from insert, DB default).
- No live reader outside a single diagnostic SELECT at `server/routes/zones.js:1041-1042`; the selected value is not consumed downstream.

Per stakeholder confirmation (2026-04-19), `snapshot_hp` is a scrapped V1 mechanic — intended as a per-zone HP bar tied to house HP totals, deprecated due to cross-house HP imbalance in V4's 9-house design.

**Resolution plan:** Drop both columns via migration; remove the vestigial SELECT at `server/routes/zones.js:1041-1042`. Execute in the same cleanup pass that resolves §9.19, since the same writer consolidation touches these tables.

**Resolved 2026-04-20 in PR #146.** Vestigial SELECT removed in PR #145. Columns dropped via `supabase/migrations/20260419144153_drop_zone_control_deprecated_columns.sql` — applied manually through the Supabase dashboard SQL Editor because the Supabase MCP is configured in read-only mode and blocks `apply_migration`. Post-drop schema verified via `execute_sql`: `zone_control` now has `id, zone_id, controlling_guild, updated_at`; `zone_control_history` has `id, zone_id, controlling_guild, dominant_house, branded_guild, snapped_at, round_number`.

### 9.23 Rounds not ending on production → root cause traced to §9.2

**Symptom.** Observed 2026-04-20 during PR #143 smoke test: a deployed Nine with HP reaching 0 did not trigger round end. The 5-minute hard cap (`ROUND_CAP_MS` at `server/services/combatEngine.js:14`) also did not appear to fire (user observation — unverified by code trace).

**Effect.** Player-facing. Rounds that don't end can't award round-end points (+5 alive, +8 control, +15 flip at `combatEngine.js:1183-1186`). KO points are unaffected (fire immediately in `handleKO`, not at round end). But without round ending: no new round begins, no intermission, no cinematic round-end broadcast, no `zone_control_history` row written → nightly `/recalculate-identities` has no source data.

**Severity.** High. Gates all non-KO arena scoring and the per-round `dominant_house` writer introduced in PR #143.

**Diagnostic hypotheses (unverified — do not act on without a trace):**
- `endRound` not invoked because the tick loop's end-of-round detector (last-guild-standing OR `ROUND_CAP_MS` elapsed) has a logic bug.
- `endRound` is invoked but the persistence path errors silently. The history insert error handler now logs (PR #143 commit 1), so a reproduction should surface DB errors if that's the cause.
- `_wasKOdThisRound` / `waitingForRound` flag state is inconsistent, blocking the last-guild-standing condition from ever evaluating true.

**Resolution plan:** Separate investigation. Needs a code trace of the tick loop's round-end detection (setInterval at `combatEngine.js:1509-1521`), server log inspection during a reproduction, and MCP verification that the `zone_control_history` insert actually runs. Do NOT attempt a fix in PR #144.

**Resolved 2026-04-20 in PR #147.** Investigation completed; symptom cluster (rounds not ending, lingering KO sprites, ghost `zone_deployments` rows) traced to a single root cause: PRD §9.2's long-standing `handleKO` ReferenceError (undefined `killerName` / `killerId` identifiers). The throw on every KO prevented `zs.nines.delete(...)`, `anyKO = true`, the `combat:ko` broadcast, and the `zone_deployments.is_active = false` update from running. The 5-min cap WAS firing correctly (verified via `zone_control_history` — 21 rows in 2h, every ~5:25); only the last-guild-standing path was dead. Fixed in this PR by closing §9.2; cleanup migration retires the 1 ghost row that accumulated. §9.23 was a downstream symptom of §9.2 — not an independent bug.

### 9.24 Stuck arena loading overlay after Socket.io reconnect → cleanup

**Symptom.** Observed 2026-04-20 during the §9.23 post-fix smoke test (PR #147). The `#arena-loading` full-screen overlay appeared on initial arena entry (expected) AND reappeared "after a round or a few minutes" and got stuck (not expected). User-visible effect: arena canvas hidden beneath a 96%-opaque overlay, sprites obscured, round-start transition invisible, bottom tray unreachable.

**Root cause.** `_firstPositionsTick` is a closure-scoped variable declared inside `connectArenaSocket` at `public/nethara-live.html:3283`. It flips to `false` on the first-ever `arena:positions` tick and stays `false` for the lifetime of the handler closure. Socket.io's auto-reconnect reuses the same socket object and handlers without re-calling `connectArenaSocket`, so:

1. `socket.on('connect', …)` at L3274 fires on every reconnect → `_showArenaLoading('JOINING ZONE...', 60)` shows the overlay.
2. `arena:positions` eventually arrives → `_firstPositionsTick` is already `false` → the dismiss `setTimeout` at L3288 never runs.
3. The 8s fallback at L2017 is one-shot per `openArena` call — already fired and gone on the initial load.

Reconnects occur on: network blips, device sleep/resume, Socket.io ping timeout (20s default), Replit cold-restarts. Matches the observed "after a round or a few minutes" cadence.

**Pre-existing bug.** The `_firstPositionsTick` closure pattern predates PR #147. Surfaced now because rounds actually end post-fix — users stay in the arena long enough across reconnects to observe the stuck state.

**Resolution plan:** Two complementary fixes in `public/nethara-live.html`:
- Fix A: reset `_firstPositionsTick = true` in the `socket.on('disconnect', …)` handler so the next positions tick after reconnect re-enters the dismiss path.
- Fix B: defensive dismissal in `arena:positions` — if the overlay is still visible (inline `display !== 'none'`) when positions arrive, dismiss it regardless of `_firstPositionsTick`. Catches any edge case where Fix A didn't trigger.

**Resolved 2026-04-20 in PR #148.** Both fixes applied. Also expected (but not promised) to resolve the "sprite stays visible" and "round obscured by popup" symptoms from the §9.23 post-fix report — both were hypothesized as overlay side-effects. User will re-verify post-deploy.

### 9.25 `arena:round_start` payload uses `deploymentId` while client expects `playerId` → cleanup

**Symptom.** The `arena:round_start` broadcast at `server/services/combatEngine.js:1363-1370` sends `id: n.deploymentId` in its per-Nine payload. The client handler at `public/nethara-live.html:3746-3750` computes `String(n.deploymentId || n.id)` to look up sprites in `S.nines`. But `S.nines` is keyed by `playerId` (set inside `addNineSprite` via the `arena:positions` handler at L3296, which uses `String(d.id)` where server sends `id = playerId`). So the lookup always misses, and the "restore waiting sprites to visible" loop never runs.

**Effect.** Dimmed sprites (alpha 0.25 + WAITING badge applied by the `combat:ko` waiting handler at `nethara-live.html:3613-3628`) never un-dim at round start. Latent bug — surfaced only when rounds actually end on KO after PR #147, making the un-dim behavior observable.

**Resolution plan:** Align the `arena:round_start` payload's `id` field with `arena:positions` — use `n.playerId`. Simplify the client lookup to `String(n.id)`. Keep `deploymentId` as a separate field on the payload for any future consumer.

**Resolved 2026-04-20 in PR #149.**

### 9.26 `arena:positions` missing `waitingForRound` field → cleanup

**Symptom.** The `arena:positions` payload at `server/services/combatEngine.js:1111-1130` omits `n.waitingForRound` from the per-Nine object. The client's filter at `public/nethara-live.html:3315` (`if (d.hp <= 0 && d.waitingForRound) return;`) was intended to skip position updates for KO'd-but-still-broadcast Nines, but `d.waitingForRound` is always undefined on the client side. Filter is effectively dead code.

**Effect.** If the server's `zs.nines.delete` ever fails to remove a KO'd Nine (see §9.27), or if positions happen to be broadcast during the transient tick where `nine.waitingForRound = true` but `zs.nines.delete` hasn't run yet, the client can't filter that Nine out. Sprite receives position updates, wanders despite HP=0.

**Resolution plan:** Add `waitingForRound: !!n.waitingForRound` to the `arena:positions` payload. Client filter becomes live.

**Resolved 2026-04-20 in PR #149.**

### 9.27 Self-KO'd sprite persists on KO'd player's view → root cause traced to §9.28

**Symptom.** Observed 2026-04-20 post PR #147. Player 1's own sprite stays fully visible, wanders, no KO animation or WAITING dim, HP bar at 0. Player 2 (spectator) sees the KO correctly (sprite removed at round start). Perspective-specific — only the KO'd player's view is broken.

**Hypothesis space** (per §9.23 investigation, 2026-04-20):

1. `zs.nines.delete(deploymentId)` at `combatEngine.js:1061` is failing or being undone — server continues broadcasting positions for self → client receives them → sprite wanders. Client's positions-cull explicitly skips self (`nethara-live.html:3377-3380`), so no fallback.
2. `combat:ko` event is not reaching the KO'd player's client (Socket.io reconnect window, event loss) — Handler 1's 800ms `removeNineSprite` setTimeout never schedules.
3. Compound — both failing at once.

**Diagnostic logging added in PR #149:**
- Server: `[KO] zone=X nine=<deploymentId> player=<playerId> delete_start` + `delete_ok` or `delete_failed` with remaining count, around the `zs.nines.delete` call.
- Client: `[combat:ko] received nineId=X isSelf=<bool> waitingForRound=<bool>` at the top of the `combat:ko` handler.

**Next step:** reproduce the KO on production post-deploy (Replit logs panel open DURING the KO), inspect both server and client logs, narrow the hypothesis per the decision matrix in PR #149 description.

Note: PR #149 also lands §9.25 and §9.26 which are defensive — §9.26 specifically should mitigate the wandering symptom even if §9.27's root cause is hypothesis 1 (delete failing), because the client will now filter KO'd-state broadcasts out.

**Resolved 2026-04-20 in PR #150 via §9.28.** Root cause identified: `resolveId` scope error in the client `combat:ko` handler — not server-side delete failing (Hypothesis 1) and not Socket.io event loss (Hypothesis 2 as originally framed). Handler threw `ReferenceError: resolveId is not defined` on its first line (`const koId = resolveId(data.nineId || data.nine);`) because `resolveId` lives inside IIFE 2 while the handler lives inside IIFE 1, with no window bridge. Every subsequent line of the handler — `animateKO`, the self-KO overlay, the 800ms sprite-removal setTimeout, the waiting-dim Handler 2 — never executed. Spectators saw correct behavior because their sprite cleanup comes from the `arena:positions` cull at `nethara-live.html:3377-3380` (no resolveId needed); self-sprite has no fallback cleanup because that cull explicitly skips self. Fix: add `resolveId` to the `_pixi` window export — see §9.28. Diagnostic logging added in PR #149 remains in place for future KO investigations.

### 9.28 `resolveId` not exposed across IIFE boundary → cleanup

**Symptom.** Observed 2026-04-20 after PR #149's diagnostic logging prompted user to open DevTools: every socket event that triggers a handler using `resolveId` (`combat:attack`, `combat:effect`, `combat:ko`, `combat:dot`, etc.) throws `ReferenceError: resolveId is not defined` on the handler's first line. Errors flood the browser console at the cadence of combat events (multiple per second during active combat).

**Root cause.** `resolveId` is a function declaration inside IIFE 2 (`public/nethara-live.html:5263-8717`). Socket handlers that call it live inside IIFE 1 (lines 1629-4274). IIFE 2 exports a curated set of functions to `window` via `Object.assign(window, _pixi)` at line 8716, but `resolveId` was not in the `_pixi` export list. IIFE 1 has no local binding and no window fallback, so every bare `resolveId(...)` call from IIFE 1 throws.

**Discovery chain.** Bug has existed since commit `040be39` (major refactor into IIFEs). Dormant because most affected handlers — especially `combat:ko` — rarely fired in production:
- Pre-PR #147: rounds never ended on KO, so `combat:ko` broadcasts didn't happen. Handler never fired, never threw.
- Post-PR #147: KOs fire correctly, `combat:ko` broadcasts arrive at the client, handler throws on line 1. **This is the actual root cause of §9.27** — the self-KO'd sprite persists because `combat:ko` handler aborts before reaching `animateKO`, the self-KO branch, the 800ms `removeNineSprite` setTimeout, and the waiting-dim handler.
- Post-PR #149: diagnostic logging made the console flood observable to the user.

**Resolution plan:** Add `resolveId` to the `_pixi` export block at `public/nethara-live.html:8708-8715`. IIFE 2's `resolveId` uses `state.nines` — `state` is a Proxy reading from `window._S`, which is IIFE 1's `S`. So `state.nines === S.nines`. Calling `window.resolveId` from IIFE 1 operates on the same Map correctly. Bare `resolveId(...)` in IIFE 1 falls through to `window.resolveId` via standard JS scope resolution.

**Resolved 2026-04-20 in PR #150.** Added to `_pixi` export. Also transitively fixes IIFE 1's `getNineName` (which internally calls `resolveId`), which was throwing on every combat-feed render.

See §9.30 for the symmetric cleanup in the other direction (IIFE 2 calls IIFE 1 functions without a window bridge).

### 9.29 Phantom `ml` reference in `toggleAutoRedeploy` → cleanup

**Symptom.** Clicking the HUD auto-rejoin toggle throws `ReferenceError: ml is not defined` at `public/nethara-live.html:3119`. Inside `window.toggleAutoRedeploy`, local variables `t` and `l` are declared via `getElementById`; `ml` is referenced without declaration.

**Root cause.** Leftover from a refactor. The inline comment at line 3118 ("deploy modal auto toggle now handled by `_syncAutoRejoinUI`") indicates the modal-label update migrated to `_syncAutoRejoinUI()` at line 3117, and line 3119 should have been deleted at the same time. `ml` was never declared in this function — `git log -S "const ml"` returns zero matches across repo history.

**Resolution plan:** Delete line 3119. Clean up the comment to reflect that the handoff is complete (drop the transitional "now").

**Resolved 2026-04-20 in PR #150.**

### 9.30 IIFE 2 calls IIFE 1 functions without window bridge → cleanup (symmetric to §9.28)

**Symptom.** `processArenaEvent` inside IIFE 2 (`public/nethara-live.html:7374+`) calls functions that are defined only inside IIFE 1 and not exposed on `window`. Every such call throws `ReferenceError` when the handler is reached. Documented call sites (non-exhaustive):
- `getNineName` — called at `nethara-live.html:7411, 7412, 7482, 7506, 7528, 7553, 7559, 7565, 7571, 7580, 7588, 7591, 7601, 7611, 7621, 7627, 7648, 7664, 7719, 7740, 7767, 7787, 7804, 7829, 7843, 7862, 7893, 7937, 7968, 7971, 7975, 7982, 8020, 8082` (inside IIFE 2's event handlers). Defined at `nethara-live.html:3780` inside IIFE 1. Not on `window`.
- `addFeedEvent` — called at multiple IIFE 2 sites inside `processArenaEvent`. Defined in IIFE 1.
- `trackCombatStat` — same pattern.

**Effect.** `processArenaEvent` in IIFE 2 throws on the first of these calls it reaches. Currently **not user-visible** because the active combat code path uses IIFE 1's socket handlers (`combat:ko`, `combat:attack`, `combat:effect`, `combat:dot`) as primary. `processArenaEvent` is the V2 event processor for legacy or continuous-combat events and is not on the current hot path. Structurally broken nonetheless — any future code path that exercises `processArenaEvent` will trip this bug.

**Resolution plan:** Two options:
- **(a) Mirror §9.28's fix** — expose the needed IIFE 1 functions (`getNineName`, `addFeedEvent`, `trackCombatStat`, and any others `processArenaEvent` reaches) to `window` via a bridge similar to `_pixi`. Minimal-surface fix.
- **(b) Refactor `processArenaEvent`** — move it into IIFE 1, or pass the required functions in as arguments, or merge the two IIFEs. Larger-surface but cleaner architecturally.

Deferred until evidence of user-visible impact OR an independent refactor motivates the cleanup.

**Status: OPEN.** Opened 2026-04-20 in PR #150 as a documented known issue captured during the §9.28 investigation. Not fixed in the same PR to keep the hotfix scope tight.

### 9.31 Legacy 60s KO popup duplicates round-end rejoin UX → cleanup

**Symptom.** On any KO, the `combat:ko` handler opens a full-screen `#ko-overlay` with a 60-second countdown and a "SAME BUILD / REDEPLOY" button (`public/nethara-live.html:3182-3228`, triggered at line 3580 and mirrored for the V2 event path at line 7543). The overlay's countdown also owned the auto-rejoin trigger at expiry (line 3220-3222). Separately, at round end the server broadcasts `arena:round_end` and the client shows `_showRejoinPrompt` (line 4176) — a second, bottom-centered rejoin UI.

**Effect.** Two rejoin prompts overlap after a KO: the 60s popup dominates the screen first, then the round-end prompt layers on top when the round actually ends. The popup's "REDEPLOY" path hits `POST /api/zones/deploy` (creates a new deployment) while the round-end prompt's "REJOIN" path hits `POST /api/zones/:zoneId/rejoin` (reactivates the existing withdrawn deployment). Different APIs, different server-side state transitions — confusing for players, fragile if both are clicked.

**Resolution plan:** Delete both `showKOOverlay()` call sites. Leave the function definition and `#ko-overlay` markup dormant in place — removable in a later cleanup pass but out of scope for this fix. The round-end rejoin prompt (`_showRejoinPrompt`) becomes the sole post-KO UX.

**Resolved 2026-04-19 in PR #151.** Both call sites of `showKOOverlay()` removed (primary `combat:ko` handler and V2 `processArenaEvent` branch). Function definition and overlay HTML left intact as dormant code; bundled with §9.33 which relocated the auto-rejoin trigger out of the popup countdown, and §9.32 which gated the high-frequency broadcast log.

### 9.32 `arena:positions` log fires every tick → cleanup

**Symptom.** `server/index.js:292-298` logs every `arena:positions` broadcast at info level: `📡 arena:positions → zone_<id>, nines: <n>`. The event fires from the combat engine tick loop (~6 Hz per active zone), so server logs are flooded with one line per zone per ~160 ms under any live combat load.

**Effect.** Steady-state log noise with zero diagnostic value — the line contains no per-Nine detail, no timing, no delta. Obscures useful server-side logs during investigations. Low severity, but uncontroversial cleanup.

**Resolution plan:** Wrap the log in a `process.env.DEBUG_BROADCASTS === '1'` check. Opt-in, no `.env.example` change needed.

**Resolved 2026-04-19 in PR #151.** Gate applied; log only fires when `DEBUG_BROADCASTS=1` is set in the environment. All other `_broadcastToZone` events continue to emit silently (as before).

### 9.33 Auto-rejoin trigger lives in legacy popup countdown → cleanup

**Symptom.** The auto-rejoin trigger at `public/nethara-live.html:3220-3222` fired from inside the legacy 60s KO popup's 1-second countdown interval (`S._koTimer`). When the popup was killed by §9.31, the auto-rejoin mechanism was killed with it.

**Effect.** Post-§9.31, the HUD "AUTO-REJOIN" toggle became a dead setting — flips the flag, saves the expiry, but nothing ever reads it at the right moment. Players who had auto-rejoin turned on would sit in the withdrawn state until they manually clicked the round-end rejoin prompt.

Separately, the `checkAutoRedeploy()` function called from the expired popup pointed at `POST /api/zones/deploy` — the wrong API for the round-rejoin flow. That endpoint creates a *new* `zone_deployments` row while the player's existing deployment is still lingering as `withdrawn`, resulting in a duplicate deployment in the engine state.

**Resolution plan:** Relocate the trigger to the `arena:round_start` socket handler — this is the earliest point at which the server's `combatEngine.rejoinRound()` will accept the call (`nine.withdrawn` is set in `startRound()`, not in `endRound()`). Gate on the existing `S._withdrawnAfterKO` flag (set at round_end when the local player was KO'd) plus the existing `S._autoRedeploy && Date.now() <= S._autoRedeployExpiry` check. Use the existing `window._doRejoin()` (hits the correct `/rejoin` API) rather than `checkAutoRedeploy()`. At round_end, suppress the manual rejoin prompt when auto-rejoin is on and log a "🔄 Auto-rejoining at Round N start..." feed message so the player isn't left wondering during the 25s intermission.

Add a fallback: `_doRejoin()` returns a boolean; on `false` (silent network throw or server rejection) the round_start handler shows the manual rejoin prompt anyway, so the player is never stranded in the withdrawn state.

**Resolved 2026-04-19 in PR #151.** Trigger relocated to `arena:round_start`; `_doRejoin()` now returns boolean for failure-path fallback; round_end suppresses the manual prompt when auto-rejoin is on. `checkAutoRedeploy()` itself left dormant (still referenced nowhere else after the popup removal) — removable in a later cleanup pass.

### 9.34 `arena:round_end` rejoin guard requires `S.isDeployed` (always false for KO'd player) → cleanup

**Symptom.** The `arena:round_end` socket handler at `public/nethara-live.html:3674` gated its post-KO branch on `if (S.isDeployed && S._wasKOdThisRound)`. Both the manual `_showRejoinPrompt` and the new auto-rejoin trigger from §9.33 lived inside that branch.

`S.isDeployed` is cleared at `nethara-live.html:3577` in the FIRST `combat:ko` socket handler's self-KO branch — fires immediately on KO arrival, well before `arena:round_end` is broadcast. So by round_end time, `S.isDeployed` has been `false` for the entire intermission, the conjunction `false && _wasKOdThisRound` is permanently `false` for the KO'd player, and the rejoin branch never enters.

**Effect.** Post-§9.31 (legacy 60s KO popup removal), no rejoin UX of any kind reached the player after a KO: no manual prompt, no auto-rejoin feed message, no `S._withdrawnAfterKO` set, no auto-rejoin trigger at round_start. Player stayed silently withdrawn.

**Discovery chain.** Pre-existing dead branch — predates PR #151 by an unknown margin. The legacy 60s KO popup at `nethara-live.html:3580` was the user's primary post-KO UI and masked the dead branch entirely; nobody noticed `_showRejoinPrompt` was unreachable because the popup was always front-and-center. PR #151 commit 1 deleted both `showKOOverlay()` call sites per §9.31, making the round_end branch the sole post-KO path. Smoke test on the deployed PR #151 build immediately surfaced the regression: KO'd players received no UI at all. Investigation traced the chain in <30 minutes; one-line fix landed in the same PR cycle.

**Resolution plan:** Drop the `S.isDeployed` clause. `S._wasKOdThisRound` (set at `nethara-live.html:3629` only when the server's `combat:ko` broadcast carries `waitingForRound: true` for this player's id) is precisely "this player was deployed at start of round AND got KO'd this round" — sufficient on its own. Sibling guards in the same handler (survival counter at line 3701, points tally at line 3702) keep their `S.isDeployed` clauses; their semantics are correct.

**Resolved 2026-04-19 in PR #152.** One-line guard change at `nethara-live.html:3674`. The `arena:round_start` auto-rejoin trigger and `_doRejoin` boolean fallback (shipped in PR #151) become live the moment this guard fires correctly. Discovery and resolution split across two PRs because §9.34 was caught only after PR #151's deploy; #151 had already merged by the time the regression report arrived.

### 9.35 Auto-rejoin doesn't fire despite toggle ON post-§9.34 → investigation

**Symptom.** Smoke test on the PR #151 + #152 build with auto-rejoin toggled ON pre-deploy (via the deploy modal): KO'd player sits through `round_end` intermission and stays withdrawn when round 2 begins. No `🔄 Auto-rejoining at Round N start...` feed message fires. Handler 1 of `combat:ko` logs cleanly (`[combat:ko] received nineId=45 isSelf=true waitingForRound=true`), so the server event is arriving and the first handler runs.

**Effect.** The auto-rejoin feature is effectively dead end-to-end — §9.34's fix unblocked the guard, but the guard's preconditions aren't being satisfied. Players who opt into auto-rejoin still have to manually rejoin. Severity: moderate — no data loss, but a core QoL feature advertised in the deploy modal does not work.

**Initial hypothesis (not yet confirmed).** The second `combat:ko` socket handler at `public/nethara-live.html:3622` — the one that actually sets `S._wasKOdThisRound = true` — is silently early-returning on `if (!sp) return;` when `S.nines.get(resolveId(dataKo.nineId))` misses. Handler 1's console log does NOT prove Handler 2 ran to completion; Handler 1's self-branch fires regardless of sprite-map presence.

Ruled out by the same investigation: (a) deploy-modal toggle only flipping the boolean without `_autoRedeployExpiry` — both fields are set by the shared `window.toggleAutoRedeploy` function (nethara-live.html:3110-3112, deploy modal onclick at 1615); (b) stray clears of `_wasKOdThisRound` between set (3629) and check (3679) — only sites are the set, the post-use clear in round_end, and the round_start reset at 3776.

**Resolution plan:** Ship diagnostic logs at two points under the `§9.35 diagnostic` comment marker:
1. Handler 2 entry (`nethara-live.html:3624`, after the `waitingForRound` gate) — dump `rawNineId`, `playerId`, `resolvedKey`, `spriteFound`, first 5 `mapKeys`, `selfMatch`.
2. `arena:round_end` rejoin guard (`nethara-live.html:3676`, before `if (S._wasKOdThisRound)`) — dump `_wasKOdThisRound`, `_autoRedeploy`, `_autoRedeployExpiry`, `now`, `expiredOrOff`.

One KO reproduction on the deployed build should pinpoint the failure mode. Fix follows in a separate PR; diagnostic logs removed at that time (or kept if they prove durably useful).

**Hypothesis chain (as resolved).** Three incorrect hypotheses preceded the actual root cause. Documenting the trail because each failed hypothesis removed a real layer of obscuring state, and the chain is the clearest explanation of why the bug stayed hidden so long.

1. *Initial suspicion (disproved by PR #153 diagnostics):* Handler 2 silently early-returning on sprite-map miss. Smoke-test log output was textbook-clean — `spriteFound: true, selfMatch: true, _wasKOdThisRound: true, _autoRedeploy: true, expiredOrOff: false`. Handler 2 fired. The round_end guard entered. `_doRejoin()` fired.
2. *Second suspicion (disproved by grep):* `/api/zones/:zoneId/rejoin` route doesn't exist. Route is defined at `server/routes/zones.js:1204` and mounted at `/api/zones` in `server/index.js:72`. Added by commit `da949a1` (2026-04-15). Client URL + method + body shape all correct.
3. *Third suspicion (partial root cause — fixed in PR #154 but didn't close the loop):* The route's own DB lookup at `zones.js:1219` filtered on `.eq('is_active', true)`. `combatEngine.js:849-859` flips `is_active` to `false` synchronously in the KO handler. Query returned no row → route responded `404 "No active deployment found"`. PR #154 dropped the filter, ordered by `deployed_at` desc, and added a post-rejoin re-activation write. Smoke test confirmed the 404 resolved — but now returned **400 "Cannot rejoin — not in withdrawn state"**, surfacing the deeper bug.
4. *Actual root cause:* The tick-loop KO handler at `combatEngine.js:1072` called `zs.nines.delete(key)` the instant a Nine was KO'd. This removed the Nine from the engine's in-memory map, making `startRound`'s `if (n._wasKOdThisRound) { n.withdrawn = true; ... }` branch unreachable (the Nine wasn't in the iterated `all` array), and `rejoinRound`'s `zs.nines.get(deploymentId)` lookup always returned `undefined`. Route responded 400 with the generic "not in withdrawn state" message — a misleading error text, since the real issue was "nine not in engine map" (case `b` of three distinct `rejoinRound()` falsy-return conditions). The comment at the startRound branch already described the correct intent ("kept in zs.nines for the broadcast but flagged as withdrawn") — the code just didn't match.

**Latent since PR #121 (Round System V1, 2026-04-15).** The Round System landed with `rejoinRound` designed around the assumption that KO'd Nines stay in `zs.nines` with `withdrawn=true`, but the KO handler in the same PR deleted them at KO time. For five days, **no production code path exercised the rejoin route for a KO'd Nine** — the legacy 60s KO popup's auto-redeploy flow went through `/api/zones/deploy` (which creates a new deployment row) instead of `/api/zones/:zoneId/rejoin`. §9.31 removed that popup, §9.33 wired `_doRejoin()` as the actual post-KO path, §9.34 cleared a separate `S.isDeployed` guard, and §9.35 (PR #154) unblocked the DB filter — each successive fix peeled away an obscuring layer, exposing the next deeper bug. The [KO] delete/delete_failed diagnostic logs added in PR #149 for §9.27 investigation literally instrumented this delete operation, but the delete itself was never questioned.

**Resolved 2026-04-20 in PR #155.** Fix across two PRs, landed sequentially as the investigation progressed:
- **PR #154** — `server/routes/zones.js:1214-1264`: drop `.eq('is_active', true)` from the DB lookup; order by `deployed_at desc` with `.maybeSingle()` to target the most-recent deployment and insulate against multi-row ambiguity; re-activate the row after engine rejoin succeeds.
- **This PR** — `server/services/combatEngine.js:1072`: remove the `zs.nines.delete(key)` call in the tick-loop KO handler. The Nine now stays in the map with `waitingForRound=true`, `startRound` sees it and sets `withdrawn=true`, `rejoinRound` finds it and restores it. Updated comment at startRound and replaced the split [KO] diagnostic log with a single `waitingForRound=true, kept in map (§9.35)` line so smoke-test logs clearly show the new behavior.

Downstream behavior audit for the map-retention change: combat loop already skips on `(hp<=0 || waitingForRound || withdrawn)` flags (no presence-based reliance); session-timeout and explicit withdraw paths still delete (no memory leak); arena:positions broadcast was already adding `waitingForRound` field per §9.26 so client dimming still works; `endRound`'s `dominant_house`/`housePresence` counts now correctly include KO'd-this-round participants, which matches the participation-based design intent at `combatEngine.js:1178`.

**Confirmed end-to-end on 2026-04-20 smoke test.** Auto-rejoin works: one `combat:ko` per KO, `_wasKOdThisRound=true` at round_end, `POST /api/zones/10/rejoin → 200`, player re-enters round N+1 at full HP. §9.35 diagnostic logs removed in PR #157.

### 9.36 KO loop gate re-fires for withdrawn Nines → regression surfaced by §9.35 fix

**Symptom.** Smoke test on the PR #155 build: `combat:ko` socket event fires 4+ times per Nine, approximately 25 seconds apart (once per round-cycle). `_wasKOdThisRound` stays `false` in every `[round_end:rejoin-check]` diagnostic log. Auto-rejoin never fires. No rejoin `POST` appears in Network tab. First `[combat:ko-handler2]` log shows `mapKeys: Array(2), spriteFound: true`; subsequent ones show `mapKeys: Array(1), spriteFound: false` — the client sprite is removed 800ms after the first KO (per `nethara-live.html:3603` setTimeout), so all re-fired `combat:ko` events land on a missing sprite and Handler 2's `if (!sp) return` bails before setting the flag.

**Effect.** Auto-rejoin is unreachable (its prerequisite `_wasKOdThisRound=true` never persists long enough to be read at `round_end`). Round N+1 frequently ends instantly via `last_standing` because the re-KO'd Nine is excluded from the `alive` filter (hp=0) and the remaining guild count drops to one on the first tick — visible to all zone participants as "round ended 1 second after it started." Additionally: `handleKO`'s +10 killer-reward at `combatEngine.js:848-871` fires on every re-KO via the stale `nine._lastHitById` from the original kill. The original killer accumulates free points every round-cycle until session timeout. Small point-farming surface but a real leaderboard-integrity concern.

**Root cause.** The KO gate at `combatEngine.js:1066` checked only two fields: `if (nine.hp <= 0 && !nine.waitingForRound)`. `startRound` at line 1325-1334 clears `waitingForRound=false` for KO'd Nines while leaving `hp=0` and `withdrawn=true`. Next combat tick re-evaluates the two-field gate → TRUE → `handleKO` re-fires → `combat:ko` re-broadcasts → `anyKO=true` → `last-guild-standing` check at line 1093-1111 evaluates → if applicable, `endRound('last_standing')` on tick 1 of the round → 25s intermission → `startRound` clears `waitingForRound` again → loop.

**Why it wasn't visible pre-§9.35.** Before PR #155, the KO handler called `zs.nines.delete(key)` at KO time. The tick loop `for (const nine of all)` built `all` from `Array.from(zs.nines.values())` (line 876), so the deleted Nine was invisible to subsequent ticks. The gate was architecturally unreachable for any Nine after first KO. §9.35's map retention (intentional, required for `rejoinRound` to work) made the Nine visible to the loop again, exposing the latent gate bug.

**State machine (post-fix).**

| Stage | `hp` | `waitingForRound` | `withdrawn` | Gate passes? |
|---|---|---|---|---|
| Alive | >0 | false | false | ❌ (hp) |
| Just KO'd (first time) | 0 | false→true | false | ✅ once, then ❌ (waitingForRound) |
| Intermission | 0 | true | false | ❌ (waitingForRound) |
| After `startRound` for round N+1 | 0 | false | **true** | ❌ (**withdrawn** — the new check) |
| After `rejoinRound` | max | false | false | ❌ (hp) |

**Resolved 2026-04-20 in PR #156.** One-line fix at `combatEngine.js:1066`:
```diff
-    if (nine.hp <= 0 && !nine.waitingForRound) {
+    if (nine.hp <= 0 && !nine.waitingForRound && !nine.withdrawn) {
```
Mirrors the combat loop's own three-field skip at line 986-987, which was already correct. Also closes the phantom-points farming surface as a side effect.

Not in scope for this PR (flagged for separate consideration): the `waitingForRound = false` clear at `startRound` line 1332 is semantically redundant with `withdrawn = true` from the caller's perspective — could be removed to clean up the state-machine meaning. Deferred to avoid regression risk in other consumers of `waitingForRound`; the gate fix alone closes §9.36.

**Confirmed end-to-end on 2026-04-20 smoke test.** Same run that confirmed §9.35 — KO fires once, gate no longer re-arms, round N+1 runs to normal conclusion, auto-rejoin completes.

### 9.37 KO'd Nine sprite disappears during intermission → polish

**Symptom.** User-observed on the 2026-04-20 smoke test that validated §9.35 + §9.36: between a KO and the round_start rejoin, "the sprite wasn't visible for a few seconds" before re-appearing at full HP in round N+1.

**Root cause (by design, not a bug).** Handler 1 of `combat:ko` at `public/nethara-live.html:3603` schedules `setTimeout(() => { removeNineSprite(koId); }, 800)` — the KO'd sprite is physically removed from the PIXI stage 800ms after the KO animation plays. Handler 2 at line 3622 dims a still-present sprite and adds a WAITING badge for the remainder of the round, but by the time `round_end` and the 25s intermission begin, Handler 1's removal has already fired. The sprite is gone until `arena:nine_rejoined` or `arena:round_start` re-adds it.

**Effect.** Players who know they auto-rejoined still wonder for 25+ seconds "am I still in this zone?" — a small trust-in-the-UI gap. No functional impact: rejoin completes correctly, HP restores, combat resumes.

**Priority: Low.** UX polish, not a correctness issue. Opens cleanly for batching with Task 17.0 (auto-rejoin UX redesign) since both involve rethinking the post-KO visual flow.

**Resolution direction (for the eventual fix).** Two options:
1. **Keep sprite dimmed + WAITING badge through intermission.** Remove Handler 1's `setTimeout(removeNineSprite)` for the self case (keep it for other-player KOs so sprites clean up). On `arena:round_start` the survivor-path already restores alpha=1 (line 3769-3770); rejoin path would need to follow suit. Low effort, high clarity — player can see exactly where they'll re-appear.
2. **Show a persistent "YOUR NINE — AUTO-REJOINING…" pill in the HUD during intermission.** Text-only overlay without sprite changes. Works for both auto-rejoin and manual-prompt paths.

Option 1 is stronger because the spatial anchor (sprite position) is more reassuring than a disembodied text pill. Option 2 is a fallback if Option 1 turns out to interact badly with other post-KO cleanup paths. Settle the choice as part of Task 17.0's scope.

**Status: OPEN.** No code change in this cycle.

PR #153 diagnostic logs retained for one more smoke-test cycle. Will be removed in the next PR once a successful rejoin on production is confirmed (expected log pattern: one `[combat:ko]` per KO, not four; `_wasKOdThisRound=true` at round_end; `POST /api/zones/10/rejoin → 200`; `🔄 <name> rejoined zone 10` server log; feed `✅ Rejoined`).

### 9.38 Session-expired sprite lingers + UX broken → cleanup

**Symptom.** User-observed: after the 2-hour session timer elapses, the player's Nine sprite stays on the arena stage indefinitely. No prominent notification beyond a feed message; no re-affordance to redeploy; the arena bottom combat tray stays visible even though the player is no longer deployed.

**Effect.** Ghost sprite is visible to the expired player (for whom the cull at `nethara-live.html:3386` explicitly skips self-culling). Other players don't see the ghost because the server already stops including the expired Nine in `arena:positions` broadcasts and the client's cull removes non-self sprites not in the active set. So the symptom is self-only — but the affected player has no clear path back into combat without refreshing or navigating away and re-entering the arena.

**Root cause.** The `arena:session_expired` handler at `public/nethara-live.html:3610-3619` only set `S.isDeployed = false` and tried to update a `#deploy-status-pill` element that doesn't exist in the DOM (see §9.40). It did not: remove the self-sprite, hide the combat tray, re-show the DEPLOY CTA, dismiss any pending `_showRejoinPrompt`, or correct the feed-message time value (said "1 hour" but `SESSION_MS` is 2 hours per §9.3 resolution).

**Resolved 2026-04-20 in PR #158.** Full handler rewrite at `nethara-live.html:3610`:
- Explicit `removeNineSprite(String(S.playerId))` since the cull skips self.
- Reset client deploy state: `S.equippedCards = []`, `S.deployedZoneIds.delete(S.currentZoneId)`.
- Hide `#arena-bottom-tray`, show `#deploy-cta`.
- `_dismissRejoinPrompt()` in case the timeout fires during intermission.
- Correct feed text to "2 hours" per PRD §4.8.5.
- Drop the `#deploy-status-pill` reference (element doesn't exist; see §9.40).

Intentionally *not* cleared: `S._autoRedeploy` and `S._autoRedeployExpiry`. Player's auto-rejoin preference persists across redeploys — the expiry check handles any drift naturally. Cleaner UX than forcing them to re-toggle.

Server path required no change — engine/DB cleanup at `combatEngine.js:1045-1052` was already correct.

**Smoke-test tooling also landed:** `SESSION_MS_OVERRIDE_SECONDS` env var at `combatEngine.js:18` shortens the 2h default to an arbitrary seconds value for dev runs. Production leaves it unset. Zero cost when unset; enables testing this UX flow in 2 minutes per attempt instead of 2 hours.

**Semantics update 2026-04-20 — see §9.41.** The handler implementation shipped in this PR is correct and stays in place. But the trigger semantics shift: under §4.8.5's rewrite there is no 2h-inactivity kick; instead the same handler will fire when the 1h auto-rejoin arming window elapses without a manual re-deploy. No code change required here — the cleanup in the handler (sprite removal, CTA re-show, etc.) is the correct response regardless of which trigger fires it. §9.41 lands the server-side trigger change.

### 9.39 `arena:nine_rejoined` looked up sprite by deploymentId instead of playerId → latent

**Symptom.** Would have left the WAITING badge and `alpha=0.25` dim stuck on the self-sprite after rejoin, had the sprite persisted through intermission.

**Effect.** Unreachable in production pre-§9.37 fix because the self-sprite was removed at 800ms after KO. Fix 3 of PR #158 (sprite-retention through intermission, resolves §9.37) is what would have exposed the handler's lookup miss user-visibly.

**Root cause.** Handler at `public/nethara-live.html:3748` did `S.nines.get(String(data.deploymentId))` but the sprite map has been keyed by `playerId` since §9.25 (PR #149). The lookup silently returned `undefined` and the `if (sp)` branch didn't run — alpha restoration, badge removal, and HP update all skipped for the self-case.

**Resolved 2026-04-20 in PR #158.** Handler now uses `String(data.playerId ?? data.deploymentId)` for resilience. Fix included in the same commit as §9.37's main change (commit `3c4ce11`), since §9.37's sprite-retention is what would have exposed the bug. Also added matching badge cleanup in the `arena:round_start` survivor-path loop for the brief ~200ms window between round_start and nine_rejoined during which a KO'd-now-rejoining sprite would otherwise show `alpha=1` with a lingering WAITING badge.

### 9.40 Missing `#deploy-status-pill` element — planned HUD affordance never implemented → UX polish

**Symptom.** The `arena:session_expired` handler tried to update `document.getElementById('deploy-status-pill')` innerHTML, but no such element exists in the DOM (grep confirms zero matches for `id="deploy-status-pill"`). Silent no-op. The intent appears to have been a persistent HUD pill showing deployment status (e.g., "⏰ SESSION ENDED" tag near the deploy CTA).

**Effect.** Session-timeout UX had no persistent visual anchor — only a transient feed event and (pre-§9.38 fix) an un-reset combat tray. §9.38's fix drops the reference entirely and relies on the DEPLOY CTA re-show + feed event for UX. Sufficient for the expired case.

**Status: OPEN.** Low priority, UX polish. Batch with Task 17.0 auto-rejoin UX redesign since that's where deploy-related HUD elements will be revisited. If the Task 17.0 scope settles on wanting a persistent session/deploy-status HUD pill, implement the DOM + CSS + update logic there. Otherwise this §9.40 can close as "no-fix — feed + CTA is sufficient UX" when Task 17.0 ships.

**Scope update 2026-04-20 — see §9.41.** Under §4.8.5's rewritten three-concept model, a deploy-status pill (if we build one) needs to reflect a three-state machine, not a single "session ended" label: **DEPLOYED-INDEFINITE** (manual deploy, no time bound), **AUTO-REJOINING — Nmin left** (countdown to 1h auto-rejoin cap), **WITHDRAWN** (post-KO without auto-rejoin, or post-cap). Design this as part of Task 17.0 item 5 (deferred polish after the core refactor lands).

### 9.41 Session timeout semantics refactor — conflated concepts must be separated

**Symptom.** The current implementation conflates three distinct concepts under the word "session" (§4.8.5 rewrite explains the separation). Code, UI, and PRD prose all mix them:
- `server/services/combatEngine.js:18` defines `SESSION_MS = 2h` as a server-side **inactivity** timeout that auto-withdraws a Nine after 2 hours of continuous deployment.
- Client `_autoRedeployExpiry = Date.now() + 3600000` (1h) is the **auto-rejoin arming window** but named/placed as if it were a session timer.
- `public/nethara-live.html` right-side sidebar's SESSION toggle shows `S.combatMetrics` — which grows unbounded for the life of the page session (not "today"), has no reset boundary, and is separate from any deployment lifecycle.

**Effect.**
- Manual deployers get kicked after 2h despite the design now being "deploy forever, KO or withdraw only" — PR #158's §9.38 fix silently enforces a rule that §4.8.5's new spec rejects.
- Auto-rejoin players hit the 1h client-side expiry before the 2h server-side kick, so their last hour of "deployment" is really a silent-fail zombie state where the server thinks they're still fighting but the client stopped auto-rejoining.
- Sidebar SESSION toggle's numbers don't correspond to any player-meaningful window. "Today's KOs" and "this-page-load's KOs" diverge as soon as the player keeps a tab open across midnight UTC.

**Root cause.** `SESSION_MS` was added as a single blunt instrument before the three concepts were recognized as distinct. Each subsequent feature that needed some "session-ish" behavior layered on top of it or around it, creating the conflation.

**Scope (to be split into 3-5 PRs under Task 17.0):**
1. **Daily combat stats infrastructure.** New `daily_combat_stats` tracking source on server (Supabase table or in-memory with periodic flush, TBD), with 00:00 UTC reset boundary. Client sidebar SESSION view reads from this, not from `S.combatMetrics`. `S.combatMetrics` either becomes the ROUND source only (renamed) or is removed if `S._roundMetrics` covers the need after D1's fix.
2. **Remove `SESSION_MS` + server-side inactivity timeout.** Delete the constant and the `arena:session_expired` server broadcast path. Keep the client handler dormant for one deploy cycle as backward-compat (remove in a follow-up). Manual deploys now persist until KO or explicit withdraw.
3. **Sidebar rewrite.** SESSION toggle wired to the new daily source. DAY/SESSION/ROUND sort labels reconsidered for clarity — possibly DAY / LIFETIME / THIS-ROUND.
4. **Auto-rejoin UX (Task 17.0 original scope).** Flip defaults to auto-rejoin ON, "CHANGE BUILD" becomes primary post-KO affordance, rejoin becomes silent. 1h window messaging throughout.
5. **Deferred polish.** `#deploy-status-pill` design (§9.40) revisited under the new state machine: DEPLOYED-INDEFINITE / AUTO-REJOINING-Nmin-left / WITHDRAWN.

**Sequencing constraint.** Item 1 (daily_combat_stats) must ship before item 3 (sidebar rewrite). Items 2 and 4 can parallel-ship after item 1 lands. Item 5 is last.

**Status: OPEN.** High priority — current state is actively incorrect per §4.8.5's rewritten spec. Batch with Task 17.0 (rollout task now expanded from M → M-L, 3-5 PRs).

**Supersedes / updates:** §9.3 (2h SESSION_MS resolution superseded — SESSION_MS itself is being deleted), §9.38 (handler implementation correct, trigger semantics shift from 2h-inactivity to 1h-auto-rejoin-cap-hit), §9.40 (pill design needs rethink under the new three-state deploy state machine).

### 9.42 `arena:nine_joined` event dropped on the floor → mid-session joiners show as cat placeholder

**Symptom.** User-observed: players consistently see a plain house-colored cat silhouette instead of a fully-composited layered Nine (fur + outfit + weapon + expression + headwear + familiar). Destroys the first impression for new players — the NFT-style layered art is the game's main visual hook.

**Effect.** Every new deploy into an occupied zone creates a permanent placeholder on every existing occupant's screen. Self-view was unaffected (`confirmDeploy` at `nethara-live.html:2997-3065` runs a self-specific post-deploy patch). Players who were already in the zone at arena-entry of each other were also unaffected (`checkDeployment`'s retroactive patch at `nethara-live.html:2115-2172` covers that case). The specific uncovered case: existing arena occupants' view of a newly-deploying player.

**Root cause — handler missing.** Server broadcasts `arena:nine_joined` from POST `/api/zones/deploy` at `server/routes/zones.js:206-220` with the full `equipped_images` payload. Client had no `socket.on('arena:nine_joined', ...)` handler — grep confirmed zero matches in `public/nethara-live.html`. The socket event arrived, the client silently discarded it. The next `arena:positions` tick created a sprite for the new player with `S._deployCache[id]` still empty, which triggers `addNineSprite`'s tier-3 cat-silhouette fallback at `nethara-live.html:6192`. The early-return at line 6122 (`if (state.nines.has(nine.id)) return;`) locks the fallback in permanently.

**Investigation evidence.** Supabase query confirmed 33 of 34 player_nines rows have `equipped_images` populated (97%), so the data exists server-side. Asset paths on disk (`public/assets/nine/fur/GINGER.png`, etc.) match DB paths exactly, so there's no missing-file or bucket-config issue. The renderer at `addNineSprite:6120` works correctly when fed data. The bug is entirely in the socket-event routing: server sends, client ignores.

**Resolved 2026-04-20 in PR #160.** Added the missing handler to `public/nethara-live.html` near line 3393 (right after `arena:nine_left`). Populates `S._deployCache[nine_id]` with the broadcast's `equipped_images`, preserving any `profile_image` that was cached previously. If a sprite already exists for that id (event race: `arena:positions` beat this event), patches in-place with the newly-available layers — mirroring the patch pattern already used in `checkDeployment` (line 2127) and `confirmDeploy` (line 3024). If no sprite exists yet, the next `arena:positions` tick will create it correctly from the now-populated cache.

Diagnostic `console.log` retained for one smoke-test cycle per the §9.35/PR #153 pattern. Removed in a follow-up PR once production smoke-test confirms the fix.

### 9.43 `equipped_fur` slugs vs `equipped_images` map — data desync → data integrity

**Symptom.** Supabase query surfaces a quiet mismatch: of 34 `player_nines` rows, 15 have the individual slug columns (`equipped_fur`, `equipped_outfit`, `equipped_weapon`, `equipped_expression`, `equipped_headwear`, `equipped_familiar`) populated, but 33 have the `equipped_images` JSONB map populated. Not breaking anything visibly — the renderer reads only `equipped_images` — but two "sources of truth" for the same semantic fact have drifted.

**Effect.** None user-visible. But any future code path that needs to read the slug (e.g., for rarity lookup, set-bonus calculation, item-removal UX) against a row with only the image map populated will misbehave. Also makes auditing / migrations riskier.

**Root cause (likely).** Historical backfill that populated `equipped_images` for all Nines but didn't backfill the individual slug columns — possibly because the image paths were derivable from defaults or a one-time migration, while the individual slugs require knowing the user's actual equipment state at the time.

**Status: OPEN.** Low priority, data integrity. Fix direction: a one-time reverse backfill that parses `equipped_images[slot]` filenames to derive slugs (e.g., `/assets/nine/fur/GINGER.png` → `fur-ginger`). Would need a mapping table from filename → slug since the slug naming convention differs from the UPPERCASE filename convention. Defer until a feature actively needs the slug columns.

### 9.44 Layer-texture load failure silently produces invisible Nine → edge case

**Symptom.** If `PIXI.Texture.from(imgPath)` fires an error event on any of the 6 layer textures during compositing, `addNineSprite:6164` removes that specific layer from the `spriteGroup` but doesn't re-evaluate the three-tier fallback (layers → PFP → cat). If all 6 layers fail to load on the same sprite (e.g., a bad `equipped_images` map with 404 paths, or a storage outage for the `/assets/nine/` directory), the spriteGroup ends up with zero children — the sprite renders as just the ring + shadow + name label with no body at all.

**Effect.** Not currently triggered in production (filesystem paths match DB paths). But any future data corruption, asset-path typo, or CDN misconfiguration in the `/assets/nine/` tree would produce invisible Nines on the arena without any diagnostic signal.

**Root cause.** The fallback tree at `addNineSprite:6154-6192` is evaluated in strictly linear order with no re-entry. `hasAnyImage = true` locks out tier 2 (profile_image) and tier 3 (cat fallback) even if layer textures later fail to load. The `.on('error')` handler removes the failed sprite but doesn't set `hasAnyImage = false` or re-trigger the fallback cascade.

**Status: OPEN.** Low priority, defensive. Fix direction: count successfully-loaded layers in the error handler, and if the count drops to zero, invoke `_drawCatFallback(spriteGroup, hColor)`. Alternatively, subscribe to the texture `.on('loaded')` / `.on('error')` on all 6 layers and make the tier-evaluation reactive. Defer until either a real incident occurs or the rendering path is refactored for other reasons.

### 9.45 Mobile readability minimum-viable pass — nav overlap, Press Start 2P floor, round-end CTA

**Symptom (user-reported 2026-04-20).** Three distinct complaints on phone-sized viewports (375-430px): (a) the top nav bar covers the arena's LIVE pill + countdown timer and the top few pixels of the PIXI canvas; (b) the arena bottom tray, card picker, and stat panels are unreadable due to a mix of 5-8px Press Start 2P and 11-13px Crimson Text that was designed for desktop; (c) the round-end popup has no actionable affordance — players with auto-rejoin off sit through the 25s intermission without a clear way to enable it, players with auto-rejoin on have no way to tweak a single card without a full re-pick.

**Root cause (nav overlap).** Latent `--nav-height: 52px` / `navH = 52` constants in `public/nethara-live.html` never updated when `public/css/nav-v2.css` was raised from 52→76px to fit the 70px logo image. The 24px delta put `arena-view`'s absolute-positioned top bar (LIVE pill + timer) behind the real nav on every viewport — most painful on mobile where every vertical pixel matters. Also affected desktop, silently — users hadn't explicitly reported it there because the timer happens to sit near-enough-to-readable at desktop viewport heights, but the UI was still wrong.

**Root cause (readability).** The arena's `@media (max-width: 640px)` block at `nethara-live.html:889-1041` shipped the bottom tray, card slots, stat bars, chat, and deploy modal at 5-8px Press Start 2P fonts — designed to match the retro pixel aesthetic, but below the WCAG AA floor and below any reasonable legibility bar on a phone screen. Tap targets for `.mob-btn` (LOADOUT, WITHDRAW) and `.mob-tab-btn` (BUILD/STATS/CHAT/LOG) were ~20px tall, well below the 44×44 HIG minimum.

**Root cause (round-end popup).** The popup shipped without action buttons (see `_showRoundEnd` at `nethara-live.html:4152`) — pure informational overlay with a countdown. Auto-rejoin could only be toggled from the HUD or deploy modal, neither of which was contextually adjacent to the round-end moment. Players who wanted to swap a card faced a round transition with no call-to-action pointing them at the deploy modal.

**Resolved 2026-04-20 in PR #161.** Four coordinated fixes:

1. **Nav root-cause fix.** `nav-v2.css` + `nav.js` + `nethara-live.html` now share a single CSS-driven nav height (76px desktop, 56px ≤640px). `nav.js` reads `nav.offsetHeight` at mount + on resize so body padding auto-matches whatever the active media query resolves to. `nethara-live.html` uses `var(--nav-height)` throughout and overrides the var to 56px inside its mobile media block; PIXI canvas sizing reads `getComputedStyle(...).getPropertyValue('--nav-height')` so canvas math follows the active breakpoint. Mobile logo renders at 48px (up from ~48px implied) inside the 56px bar — proportionally larger share of nav chrome. Desktop unchanged: nav stays 76px, logo stays 70px; the fix reveals previously-covered UI (timer + LIVE pill) without changing any layout dimensions.

2. **14px Press Start 2P + 14px Crimson floor on mobile.** Strict floor applied inside the existing `@media (max-width: 640px)` block. `.mob-btn`, `.mob-tab-btn`, `#mob-nine-name/hp-text`, `.mob-card-slot *`, `.hud-stat-*`, `#mob-chat-log/input`, `#mob-battle-log`, `#mob-auto-label`, and deploy-modal elements (`.deploy-stat-key/val`, `.deploy-sort-btn`, `.deploy-title`, `.btn-deploy/cancel`) all bumped to ≥14px. Tap targets `.mob-btn` and `.mob-tab-btn` padded to 44px+ tall. Card slots switch to horizontal scroll with 200px min-width per slot (184px on <390px viewports) to accommodate the larger text without clipping. Portrait col widened 90→116px (92px on <390px) to fit 14px "LOADOUT" / "WITHDRAW" labels. Desktop (≥641px) visually unchanged — all edits are inside the mobile media block.

3. **Round-end popup single context-aware CTA.** Reads `S._autoRedeploy` at click time. Auto-rejoin ON → button "CHANGE BUILD", opens the deploy modal with current cards pre-selected via the new `openDeployModal({preselectCurrent:true})` option. Auto-rejoin OFF → button "ENABLE AUTO-REJOIN" + helper copy "Turn on auto-rejoin to keep fighting with your current build next round — or redeploy manually from the arena"; click flips `toggleAutoRedeploy()` and dismisses the popup. CHANGE BUILD click also restarts the popup countdown to 60s client-side (server-side intermission timing unchanged — if server's `round_start` fires before 60s the popup dismisses and modal stays open per Task 23 rule).

4. **Deploy modal pre-select.** `openDeployModal(opts)` now accepts `opts.preselectCurrent`. When true and `S.equippedCards` is populated, after the `/api/packs/collection` fetch resolves the function matches equipped cards by `player_card_id` against the returned collection, pushes matches into `S.selectedCards` with the same `{idx, card}` shape the existing toggle path uses, updates the selected-count + confirm button label/enabled state, and re-renders the selected-row slots before the grid paints. Duplicate-safe via a `seen` Set on indices. No behavior change for existing callers (no opts → `preselectCurrent` defaults false).

**Deferred to follow-up PRs** (from the pre-audit at `audit/mobile-pre-audit-code-only.md`): dashboard mobile @media overrides, spellbook card modal overflow, leaderboards podium squish at 375px, register step 3 stat tooltip clipping, packs card reveal overflow, how-to-play 3-col house grid at 375px, systematic tap-target utility class. These are separate PRs in the 5-PR plan from the audit; this PR is the minimum-viable scope the user explicitly requested.

### 9.46 Deploy lockout during active round — mechanic behind FEATURE_DEPLOY_LOCKOUT flag

**Symptom.** N/A — this is a forward-looking mechanic, not a bug. Opened as a tracked FLAG_OFF entry so the server + client plumbing lives in production without the behavior, awaiting playtest before the flag flips.

**Motivation.** The current `/api/zones/deploy` route accepts deploys at any moment in a zone's lifecycle — including mid-round, which lets a player observe the fight, pick a counter-build, and join instantly. Design direction under consideration: lock deployment to intermission windows only, so builds must be committed before the round starts (can still be tweaked between rounds). Tightens the tactical loop; opens a "deploy window" concept as part of Round System V2. Needs playtest before the Game Bible ships V4 → V5.

**Shape (PR-level plumbing, FLAG_OFF).**

- **Server.** `server/config/flags.js` — new module exporting `FEATURE_DEPLOY_LOCKOUT: false`. Lazy-loaded by `routes/zones.js` so a missing module never blocks boot (matches the graceful-degradation pattern). Guard in POST `/api/zones/deploy`: if flag is true AND `combatEngine.getZoneState(zone_id).roundState === 'FIGHTING'`, respond `423 Locked` with body `{ error: 'deploy_locked', message: 'Deployment is only allowed during intermission', nextWindowInSeconds: N }` where N is `ceil((roundEndsAt - now) / 1000)`. Guard sits before any DB writes — cheap.
- **Client.** `confirmDeploy()` intercepts 423 and invokes `_showDeployLockout(btn, secs)` which disables the deploy button and paints a "🔒 DEPLOY OPENS IN m:ss" countdown that ticks down to zero, then re-enables the button with the existing "⚔️ DEPLOY" / "SELECT N MORE" label. Auto-redeploy paths (`checkAutoRedeploy`, `dismissKOAndRejoin`) silent-skip on 423 with a feed event — no modal rescue, no error toast; the next intermission opens the window naturally.
- **Operational posture.** Flag ships OFF in production. No visible behavior difference vs pre-PR. Flip only after playtest in a dev environment. The auto-rejoin / lockout interaction is a known question for playtest — `round_start` fires the zone into `FIGHTING` within milliseconds, so any auto-deploy in that window would hit the guard; the `rejoin` endpoint is separate and unaffected, so rejoin-based auto-rejoin still works. Whether auto-redeploy needs an exempt-flag, an intermission-scheduled fire, or should stay disabled when lockout is on is a playtest decision.

**Status: OPEN — FLAG_OFF awaiting playtest.** Close when the flag has been flipped in production and the mechanic has survived a week without regression reports. Separate PR will then update the Game Bible V4 → V5 to document the "deploy window" concept formally.

### 9.47 Mobile visual follow-up — real-phone smoke test of PR #161

**Symptom (user-reported 2026-04-20).** Phone smoke test of PR #161 on an actual Android device (not DevTools) surfaced seven distinct visual issues: (a) deploy modal ATK/HP/SPD/DEF/LCK preview row exceeded viewport width, clipping LCK at the right; (b) arena HUD portrait column too wide at 116px on 393px phone; (c) card slots partially off-screen — slot 3 unreachable because horizontal scroll was the PR #161 choice; (d) `LOADOUT` button truncated to `LOADOU`; (e) `AUTO-REJOIN: ON ✓` label wrapped to 3 vertical lines in the narrow col; (f) `#mob-nine-hp-text` "439/620" clipped at left edge because 7-char Press 2P 14px centered text overflowed the portrait col and cropped both sides; (g) STATS tab showed only the player's own stat bars instead of the fighters leaderboard the desktop sidebar shows — mobile users couldn't see other Nines in the zone. Plus: pre-deploy the mobile HUD rendered with empty portrait + "--/--" placeholders instead of getting out of the way for the JOIN BATTLE CTA. User also retracted the PR #161 client-side 60s countdown extension as misleading UX.

**Root cause.** PR #161 applied the 14px Press Start 2P floor strictly but accepted several layout tradeoffs without phone validation: 200px card slot min-width + horizontal scroll was untested ergonomics; 116px portrait col was defensively wide for 14px button labels; single-line HP at 14px × 7 chars was too tight; `AUTO-REJOIN: ON ✓` at 14px was a 15-char string that couldn't fit any reasonable portrait col width. The pre-deploy HUD visibility was latent — mobile CSS forced `.arena-bottom-tray` to `display: flex !important` regardless of the inline `display: none` that desktop relied on. The 60s countdown was a speculative widening of the deploy window that turned out to be a false promise because round_start is server-driven.

**Resolved 2026-04-20 in PR #162.** Seven visual fixes + two behavior cleanups:

1. **Deploy modal stat row** — `.deploy-stat-val` 16→14px, both `.deploy-stat-key` and `.deploy-stat-val` `letter-spacing: 0`, `.deploy-stat-row` gains `flex-wrap: wrap` + 2px gap as a graceful fallback when 5 stats don't fit single-row, `.deploy-stat` padding tightened to 5px 1px with `flex: 1 1 18%` for a better wrap basis. `.deploy-stats-preview` padding 8px 12px → 6px 8px to claw back horizontal space.
2. **Portrait column** — `#mob-portrait-col` 116→84px (≤640px), 92→76px (≤390px); padding trimmed to 6px/4px horizontal.
3. **Card slots** — dropped horizontal scroll, restored `flex: 1 1 0` distribution so all 3 fit; hid `.slot-type`, `.slot-effect-pill`, `.slot-stats-row` on mobile (full details still in desktop HUD / card tap popup); `#mob-card-slots` min-height 120 → 96, max-height 160 → 120.
4. **Button labels** — `⇄ LOADOUT` → `SWAP`, `WITHDRAW` → `EXIT`. Dropped the unicode arrow prefix from SWAP because adding it pushes text width past 84px col even with minimal padding; `.mob-btn` padding 12px 6px → 12px 4px, `letter-spacing: 0`, `overflow: hidden` as safety.
5. **Auto-rejoin layout** — `#mob-auto-row` flex-direction row → column (toggle on top, label below). Toggle slightly enlarged 30×16 → 36×18. Mobile-only label text changed in `_syncAutoRejoinUI` from `AUTO-REJOIN: ON ✓ / OFF` to `AUTO ✓ / AUTO`. On-state label tinted green.
6. **HP text stacked display** — new `_setMobileHPText(el, hp, maxHp)` helper writes `<span.hp-cur>` + `<span.hp-max>` children; current HP full-green, max HP 50% opacity. Two callsites updated (arena:positions self-path + syncMobilePortrait). Both numbers remain visible, both meet 14px floor, neither clips.
7. **Stats tab leaderboard** — `renderGuildSidebar()` now paints to both `#fighters-list` and `#mob-fighters-list` in a single call. `#mob-tab-stats` rewritten with ROUND/SESSION toggle + HP/DMG/HEAL/KOs sort row + scrollable list, all mirroring desktop. `_setSidebarView` and `_sortFighters` extended to repaint active state on `[data-sb-view]` + `.mob-sb-sort-btn` elements. Desktop `#sb-view-round`/`#sb-view-session` gain `data-sb-view` attributes. `syncMobStats()` removed — the player's own stat bars are no longer duplicated in the stats tab; sprite + HP + debuffs stay in the portrait column as the self-view.
8. **Pre-deploy HUD hidden** — `body.arena-pre-deploy` class mirrored from `#deploy-cta.style.display` by a single MutationObserver; `@media(max-width:640px) body.arena-pre-deploy .arena-bottom-tray { display: none !important; }` hides the whole mobile HUD when pre-deploy. No per-callsite plumbing — 14+ existing deploy-state toggle sites stay untouched.
9. **60s countdown extension removed** — `_handleRoundEndAction` no longer calls `overlay._resetCountdown(60)`. The popup runs its server-aligned countdown and dismisses naturally when round_start arrives. The `overlay._resetCountdown` helper stays in place as a harmless future hook. Rejoin timing design moved to §9.48.

Desktop (≥641px) visually unchanged for all nine changes. All CSS scoped to `@media (max-width: 640px)`; all HTML tweaks affect either mobile-only elements or desktop elements where the change is a `data-*` attribute addition with no visual impact.

### 9.48 Round-end rejoin timing needs server-side design

**Symptom.** PR #161 introduced a client-side 60s popup countdown reset on `CHANGE BUILD` click, intended to give the player a longer deploy window between rounds. But the server fires `round_start` on its own schedule (typically 25s intermission), at which point the client popup is force-dismissed. The 60s number was purely cosmetic — the popup would show "NEXT ROUND IN 60s" then vanish at ~25s regardless.

**Effect.** False promise UX — player sees a deadline that the system won't honor. The rollback in §9.47 removes the misleading text but leaves the underlying design question unanswered: does the CHANGE BUILD flow actually need a wider intermission window, and if so, how?

**Design questions (for the separate PR that closes this entry).**

1. **Is the intermission too short in practice?** Default 25s (`INTERMISSION_MS` in `combatEngine.js:17`). Phone-smoke-test observation suggested 25s is tight for opening the deploy modal, scrolling card grid, tapping a new card, tapping DEPLOY. Validate with more smoke tests before acting.
2. **Who owns intermission length — zone-wide or per-player extension?** If zone-wide, every player benefits from a longer breather (simpler but affects pacing). If per-player, only the player who clicked CHANGE BUILD gets the extension (complex — server has to track per-player deploy windows independent of round_state, which conflicts with the §9.46 deploy-lockout direction).
3. **Interaction with §9.46 deploy lockout.** If lockout is ON and intermission is 25s, the player has exactly 25s to deploy or they're locked out until next round end. Combined with auto-rejoin on, this could strand a player who intended to deploy a new build.
4. **What's the signal from the server that "deploy window closes in N seconds"?** Current round_start fires without a heads-up. Options: emit `arena:deploy_window_closing` at T-5s, or include a deploy-window-closes timestamp in `arena:round_end` payload that the client can render accurately.

**Status: OPEN.** Tracked as design debt independent of Task 24.0's scope. Closes when a follow-up PR adds either (a) a tuned intermission length + server-emitted deadline the client can render accurately, or (b) a per-player deploy window extension API with clear interaction rules vs §9.46 lockout, or (c) a deliberate product decision to leave intermission fixed and remove the "CHANGE BUILD" affordance as a redesign.

---

## Appendix A — Glossary

Definitions of terms used throughout this PRD. Each ≤15 words.

| Term | Definition |
|---|---|
| **Nine** | A player's character in Nethara. Every registered player has one. |
| **House** | One of 9 classes (Stormrage, Smoulders, etc.). Determines base stats and thematic card affinity. |
| **Guild** | A player's faction (`guild_tag` string). Crypto community, friend group, or any self-organized team. |
| **Zone** | One of 27 contested territories on the Nethara map. FFA combat arenas. |
| **Deployment** | A Nine placed in a zone with a 3-card loadout. Row in `zone_deployments`. |
| **Loadout** | The 3 cards a Nine is fighting with on a given zone. Reconfigurable between rounds. |
| **Round** | One zone battle. Ends on last-guild-standing or the 5-min hard cap. |
| **Intermission** | The 25-second pause between rounds. Displays outcome and points awarded. |
| **Session** | Ambiguous term post-§9.41 refactor. Three distinct concepts per §4.8.5: (a) **deployment lifespan** — indefinite, KO/withdraw-only; (b) **auto-rejoin window** — 1h from first auto-deploy; (c) **sidebar session view** — today's combat stats, resets at 00:00 UTC. |
| **KO** | Knockout — a Nine reaching 0 HP. KO'd Nines wait until the next round to rejoin. |
| **FFA** | Free-for-all — within a zone every guild fights every other guild simultaneously. |
| **Lone wolf** | A player with `guild_tag = 'lone_wolf'`. No guild bonuses; no compensation bonus either. |
| **Presence bonus** | Next-day zone-wide house bonus for whichever house had the most fighters deployed yesterday. |
| **Branding** | Cosmetic daily guild tag on a zone — goes to the guild that won most rounds yesterday. |
| **Rarity** | Card tier (Common / Uncommon / Rare / Epic / Legendary). Drives effect duration and stat ranges. |
| **Sharpness** | Card's effectiveness percentage (0–100%). Decays per round; restored via duplicate / stack / kit. |
| **Lifetime points** | `players.lifetime_points` — never resets; sum of every point ever earned. |
| **Seasonal points** | `players.seasonal_points` — resets at season rollover; drives the live leaderboard. |
| **`point_log`** | Audit table. One row per point-awarding event with `source`, `amount`, `description`, `created_at`. |
| **Chronicle** | The daily 4-act Twitter narrative posted by `@9LVNetwork`. Social half of the game. |
| **Nerm** | 9LN's AI cat mascot. `@9LV_Nerm` on Twitter; Telegram moderator; recurring Chronicle character. |

---

## Appendix B — Quick Reference

```
STAT ADDITION:         total = house + card1 + card2 + card3
ATTACK INTERVAL:       max(2.5, 7.5 - SPD × 0.10) s
CARD CYCLE:            max(5.5, 12.0 - SPD × 0.10) s
DAMAGE:                ATK² / (ATK + DEF)
CRIT (base):           LUCK × 0.3 / 100
CRIT (with CRIT fx):   LUCK / 100
CRIT DMG:              2× (3× under Stormrage zone bonus)

SERVER TICK:           200 ms
ROUND END:             last guild standing OR 5-min cap
INTERMISSION:          25 s
HP RESET:              full HP at every round start
STATUS RESET:          all effects cleared at round start
SESSION TIMER:         2 hours, then auto-withdraw
KO IN ROUND:           wait for next round (no mid-round rejoin)

SHARPNESS LOSS:        -1% per round end (zone combat only)
ZONE IDENTITY:         recalculates midnight UTC daily

POISON:                3% maxHP × stacks, every 1.5 s
BURN:                  6 × stacks, every 1.0 s
CORRODE:               -15 maxHP, 5 s real-time CD
HEX:                   -8 ATK/stack, max -24
WARD:                  blocks 1 hit, NO reapply while active
HEAL:                  7% own maxHP
BLESS:                 4% own maxHP to allies within 90 px
DRAIN:                 20% lifesteal
THORNS:                18% reflected
BARRIER:               50 flat absorption

SCORING (zone):        KO +10 | Alive +5 | Control +8 | Flip +15
KO CREDIT:             last damage source (auto / DOT / CHAIN / SHATTER)
LONE WOLF:             no ATK bonus — FFA makes it irrelevant

SLOT BONUSES:          1: ×1.35  |  2: ×1.0  |  3: ×1.5 (target <40% HP)
ATK CARD MAX:          +10 pure / +8 hybrid / +6 control-DOT-support
SPD CARD MAX:          +8 each

EFFECTS ACTIVE:        36
CARDS:                 84 (12 Universal + 72 House)
HOUSES:                9
ZONES:                 27

POINTS PIPELINE:       event → pointsService.addPoints()
                              → players.seasonal_points += amount
                              → players.lifetime_points += amount
                              → INSERT point_log row
LEADERBOARD READ:      players.seasonal_points (never season_points)
```

---

## Appendix C — Document status

- **Supersedes:** `9LN_GAME_BIBLE.md` (2026-04-15, combat rules + domain vocab), `README.md` (deprecated school names, stale server layout, outdated world name), `replit.md` (stale server layout), `EFFECTS_REFERENCE_V5.md` (superseded effect mechanics).
- **Complements:** `ADMIN_COMMANDS.md` (operational runbook — still canonical for ops), `CLAUDE.md` (developer guide for Claude Code sessions).
- **History / for context only:** `STATE_OF_THE_CODEBASE.md` (2026-04-17 audit — informed §9 of this PRD), `STATE_OF_ARENA.md` (2026-04-17 scoring pipeline audit — source of §9.1–9.4).

When any change to 9LN's product definition is made, this PRD is updated first. Code follows.
