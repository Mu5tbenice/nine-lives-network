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

**Maintenance convention.** Every PR that resolves an entry below appends a bold `**Resolved YYYY-MM-DD in PR #X.**` line to that entry rather than deleting it. Every PR that discovers a new issue adds a new entry at the next available number. See `CLAUDE.md` → "PRD discipline" for the mechanics, including the `PR #183` bootstrap pattern for self-referencing the current PR.

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

**Resolved 2026-04-23 in PR #198.** Three main-IIFE helpers (`getNineName`, `addFeedEvent`, `trackCombatStat`) now expose themselves on `window` at definition time, and the PIXI IIFE declares matching local aliases at its top that read from `window` at call time (same pattern as the existing `state` Proxy). `processArenaEvent` + any future cross-IIFE handler can now call these without the ReferenceError. No call-site rewrites needed — the aliases shadow the bare names so existing code like `addFeedEvent(...)` resolves to the alias, which forwards to `window.addFeedEvent`. Relearned the cost of this class of bug the hard way in PR #188 (the `S._tabHidden` scope regression) — this preemptive fix is cheap insurance against repeat. Also prompted adding `project_3d_layers_incoming.md` to memory so future sprite/renderer work for 3D layers preserves the layer-swap pattern without tripping the same pitfall.

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

**Resolved 2026-04-22 in PR #170.** Option 1 landed as part of the in-arena combat watch loop UX pass (commit `a99343a`, merged in `#170`). Current code at `public/nethara-live.html:3871` guards the `setTimeout(removeNineSprite, 800)` with `if (koId !== S.playerId)` — self-sprite stays on the arena, dimmed, with WAITING badge from Handler 2 (`:3909-3924`) through intermission. `arena:nine_rejoined` handler at `:4026-4045` and `arena:round_start` at `:4066-4075` restore alpha=1 and remove the badge on rejoin. Status retroactively updated **2026-04-23 during §9 audit** that caught the stale entry — the fix was landed but the PRD was never updated at the time.

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

**Resolved 2026-04-23 in PR #189.** Pill lives in the arena topbar next to the LIVE badge (`public/nethara-live.html:1237-1239` — `<div id="deploy-status-pill">`). New helper `window._updateDeployStatusPill()` reads S.isDeployed / S._withdrawnAfterKO / S._autoRedeploy + S._autoRedeployExpiry and picks one of three CSS variants: `deploy-pill--active` (cyan "DEPLOYED"), `deploy-pill--auto` (green "AUTO-REJOIN · Nm" with live countdown), `deploy-pill--withdrawn` (red pulsing "WITHDRAWN — REDEPLOY"). Hidden when the player has not deployed at all. State-change call sites wired: `confirmDeploy` success, `combat:ko` (self), `arena:nine_rejoined`, `arena:round_start`, `withdraw` success, `toggleAutoRedeploy`, `init()`, `_onTabVisible`, and the existing 30s metrics-sync interval (piggyback for Nm-left freshness, no dedicated timer). Countdown granularity is minutes — more than enough for a 1h window, and the 30s interval tick is imperceptible.

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

**Status: RESOLVED 2026-04-23.** All five Task 17.0 items shipped in order: #183 (item 1 — daily stats sync), #184 (item 2 — SESSION_MS deletion), #185 (item 4 — auto-rejoin default ON), #186 (item 3 — sidebar tab relabel), #? (item 5 — deploy-status pill §9.40). The §9.41 conflation is fully unwound.

**Item 5 resolution (2026-04-23 in PR #189).** See §9.40 above — the pill itself lives there; this §9.41 entry just tracks that the last Task 17.0 item is done.

**Item 1 resolution (2026-04-23 in PR #183).** No new server-side tracking source was needed — the existing `player_zone_metrics` table (§9.50, PR #163) already keys on `(player_id, zone_id, metric_date)` with `metric_date` defaulting to `(now() AT TIME ZONE 'UTC')::date`, so rows naturally roll over at 00:00 UTC. The actual gap was client-side: `S.combatMetrics` only seeded from the server on zone entry, then grew unbounded via socket events with no reset boundary — a tab kept open across UTC midnight silently conflated yesterday's + today's stats. Fix in `public/nethara-live.html`: (a) extracted the seed fetch into a reusable `syncSessionMetricsFromServer(zoneId, {wholesale})` helper; (b) added `_checkUtcDayRollover()` that detects UTC date change, clears `S.combatMetrics`, re-fetches from `/api/zones/:zone_id/metrics`, and shows a `🕛 New UTC day — today's stats reset` feed event; (c) `startSessionMetricsSync()` wraps both in a 30s interval so the client stays bound to the server's day boundary and can't drift. Socket events still increment `S.combatMetrics` between re-syncs for sub-30s responsiveness; the periodic wholesale-replace absorbs any missed events back into the server's canonical count. `S.combatMetrics` kept its name for this PR — renaming to `S.dailyMetrics` (or splitting into ROUND/DAILY maps per item 3) is deferred to the sidebar rewrite.

**Item 2 resolution (2026-04-23 in PR #184).** `SESSION_MS` constant, `SESSION_MS_OVERRIDE_SECONDS` env-var branch, the `_deployedAt` Nine-state field, and the entire server-side session-timer loop at `combatEngine.js:1178-1204` are deleted. Deployments are now indefinite per §4.8.5 — only a KO or explicit withdraw ends one. The `arena:session_expired` broadcast no longer fires from the server; the client handler at `nethara-live.html:3896` is left dormant for one deploy cycle as backward-compat and is scheduled for removal in a follow-up PR. Supersedes §9.3's resolution (2h SESSION_MS is no longer the operative value) and shifts §9.38's trigger semantics permanently (handler body correct, trigger removed). No new behavior — this is a deletion. Risk surface: manual deployers who previously would have been auto-withdrawn at 2h now stay deployed indefinitely; intentional per PRD spec. Monitoring suggestion for the next Nerm update cycle: watch `zone_deployments.is_active=true` counts to confirm no runaway accumulation (if seen, the original concern — idle players clogging zones — would justify a different cap mechanism, not this timer).

**Item 3 resolution (2026-04-23 in PR #186).** Minimal UI relabel. Sidebar tabs renamed: `ROUND` → `THIS ROUND`, `SESSION` → `TODAY` on both desktop (`#sb-view-round` / `#sb-view-session` — icons kept) and mobile (`#mob-tab-stats` buttons). Internal `_sidebarView` key (`'round'` / `'session'`) preserved to avoid churn across the 8+ call sites that read it. The `SESSION` label was actively misleading post-Task 17.0 item 1 — the data behind it is the server's `player_zone_metrics` for today, rolling over at 00:00 UTC, so "TODAY" describes what's on screen. `DAY / LIFETIME / THIS-ROUND` three-tab variant from the original PRD sketch was dropped — LIFETIME would need a new data source (a `players.lifetime_points`-style aggregate per-stat), and that's a scope expansion unrelated to fixing the §9.41 conflation. If we want a LIFETIME tab later, file it as its own entry.

**Item 4 resolution (2026-04-23 in PR #185).** Auto-rejoin is ON by default for every new page session (`S._autoRedeploy: true` at init). The 1h auto-rejoin window arms on first successful deploy — not at page load — per the glossary's "1h from first auto-deploy" phrasing; `confirmDeploy`'s success path sets `_autoRedeployExpiry = Date.now() + 3600000` only when expiry is unset. A new `window._autoRejoinActive()` helper consolidates the "auto ON AND within window (or not yet armed)" predicate that previously lived inline at three call sites (`combat:ko`, `arena:round_end`, `arena:round_start`) — single source of truth, `expiry=0` treated as armed. Round-end modal replaced the single context-aware CTA with two buttons: primary **CHANGE BUILD** (opens deploy modal pre-selected, identical to the prior ON path) and secondary **WAIT** (dismiss; auto-rejoin fires silently on `arena:round_start`). Helper copy beneath the buttons reflects the auto-on default with an inline "turn it back on" affordance for the rare OFF case. KO widget default hint updated to "AUTO-REJOIN ON — YOU'LL RE-ENTER NEXT ROUND" (previous "REJOIN WHEN THE ROUND ENDS" pre-dated auto being default). Deploy modal toggle label flipped to the friendlier "KEEP AUTO-REJOINING ✓" / "AUTO-REJOIN: OFF" and defaults to the ON visual; init path calls `_syncAutoRejoinUI()` so HUD + modal toggles reflect state on load instead of waiting for user interaction. Rationale per §9.41's framing: >95% of players want to keep fighting, so the "do-nothing" path (WAIT) should be the silent-success one; build-tweaking is the rarer deliberate action, promoted to primary.

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

**Resolved 2026-04-22 in PR #170.** Flipped `FEATURE_DEPLOY_LOCKOUT: false` → `true` in `server/config/flags.js` as part of the in-arena combat watch loop rework. Server guard at `routes/zones.js:55` now active — mid-round deploys respond 423. Rejoin endpoint (`/api/zones/:zoneId/rejoin`) is not behind the flag, so KO'd players' auto-rejoin + manual rejoin paths continue to work during FIGHTING. Paired with §9.60 (client-side guard) the effect is: already-deployed players can't rebuild mid-round (widget-gated CTA, feed-event silent-skip on openDeployModal); new players entering a zone mid-round can still open the modal and pick cards, and their confirm deploy hits the existing 423 countdown on the deploy button (implemented in the original §9.46 plumbing). Game Bible V4 → V5 update deferred to a separate doc PR.

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

**Decision 2026-04-23**: option (a) — tune intermission length + server-emitted deadline. Per-player extension (b) rejected: conflicts with the §9.46 lockout state machine and complicates timing ownership. CHANGE BUILD retention (rejecting c) supported by the wider window plus §9.69's queue landing same PR.

**Resolved 2026-04-23 in PR #178.** `INTERMISSION_MS` bumped 25s → 35s in `server/services/combatEngine.js:17` — mobile smoke testing confirmed 25s was too tight for the open-modal / scroll-grid / tap-card / confirm flow. `arena:round_end` broadcast now carries `nextRoundAt` (absolute server timestamp) alongside the existing `intermissionMs` (duration); client uses `data.nextRoundAt || Date.now() + data.intermissionMs` at `public/nethara-live.html:3952-3962`, accurate across any client/server clock drift. Desktop is unaffected — 35s vs 25s is a non-issue with a mouse-driven flow.

### 9.49 Multi-bug triage — 7 UI defects discovered 2026-04-20

**Symptom (user-reported 2026-04-20, screenshots in `docs/screenshots/`).** Post-PR #162 smoke test surfaced a second cluster of arena UI defects that survived the mobile readability pass. (a) Sidebar fighter HP bars appeared static or imperceptibly subtle — the live HP value was correct but the bar didn't visibly animate. (b) Round-end popup stayed layered on top of the deploy modal after CHANGE BUILD was clicked, making the modal unclickable. (c) Deploy modal stat row (ATK / HP / SPD / DEF / LCK) showed permanent `--` placeholders — nothing ever populated them. (d) Mobile arena HUD at 393×852 required scrolling the portrait column to reach the AUTO-REJOIN toggle. (e) Mobile deploy-modal selected-row slots were 64px tall — excessive vertical footprint above the card grid. (f) Desktop deploy-modal card grid at 1920×1080 rendered too few cards per row because the `minmax(155px, 1fr)` basis over-stretched each card. (g) Deploy modal house filter tabs rendered both the house crest image AND the fallback emoji span simultaneously.

**Root causes.** (a) `renderGuildSidebar()` ran innerHTML-rebuild on every 200ms positions tick, destroying the HP-bar fill node and preventing the CSS `transition: width 0.4s` from animating. (b) `_handleRoundEndAction` CHANGE BUILD branch called `openDeployModal({preselectCurrent:true})` but never dismissed the round-end overlay; z-index 8500 (overlay) vs 2000 (modal) kept the overlay on top. (c) `#deploy-*` stat elements shipped with `--` placeholders and no JS ever wrote to them. (d) Portrait column vertical stack overflowed panel height — cumulative effect of PR #162's 14px Press 2P floor + stacked HP + button padding. (e) §9.47 set mobile `.deploy-selected-slot { height:64px; slot-name 14px; slot-eff 14px }` — larger than needed. (f) `#deploy-card-grid { grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)) }` inline style, unchanged since carousel replacement. (g) Tab template rendered `<img>` + `<span>${emoji}</span>` in one `innerHTML`; `onerror` only hid the image, leaving both visible when the crest loaded successfully.

**Resolved 2026-04-21 in PR #163.** Seven commits, UI-scoped (no server or schema changes in §9.49 — per-zone metrics tracked separately as §9.50):

1. **Sidebar HP in-place updates** — new `_updateSidebarHpInPlace()` helper patches existing DOM nodes (`data-fighter-{id,hp-bar,hp-num,dmg,heals,kos}`) instead of rebuilding innerHTML. Signature cache (id order + sort field + round/session view) detects membership/sort/view changes and falls back to full rebuild. The CSS `transition: width 0.4s` now animates because the fill node persists. Diagnostic `console.debug('[§9.49 HP-live] …')` marked for removal in a follow-up PR.
2. **Round-end modal dismiss** — `_handleRoundEndAction` auto-on branch now calls `_dismissRoundEnd()` before `openDeployModal()`. One-line fix.
3. **Deploy modal stat row live compute** — new `_refreshDeployStats()` reads `HOUSE_STATS[S.playerHouse]` + sum of selected card `.base_*` stats, writes to `#deploy-atk/hp/spd/def/luck`. Called from `openDeployModal` immediately on display, at the end of the preselect pass, and from `toggleCardSelect` on every selection change.
4. **Mobile HUD vertical fit** — three small trims (~35–40px total): `.mob-btn` padding 12px→9px vertical (44px tap target preserved via font + padding + border math); `#mob-auto-row` column→row so label and toggle share one line; `#mob-nine-hp-text .hp-max` margin-top 2px→0.
5. **Mobile deploy selected-row compressed** — `.deploy-selected-slot` height 64→44px, `slot-name` 14→13px Cinzel, `slot-eff` 14→12px Press 2P, `slot-x` kept at 22×22 for tap target.
6. **Desktop card grid sizing** — `minmax(155px, 1fr)` → `minmax(130px, 1fr)`; card `min-height` 180→170. At 375px mobile still fits 2 cards per row (2×130 + 10 gap = 270 ≤ ~351 usable width; 3 cols would need 410 which doesn't fit).
7. **House icon single render** — emoji span starts `display:none`. On img error, `onerror` reveals the span AND removes the broken img node so exactly one icon renders: logo when the file exists, emoji when it 404s.

An eighth bug originally raised (emoji overlap on a different grid built by `_buildGrid`) was skipped per user decision — the user didn't see the issue and asked to drop that commit.

Regression check per commit is code-review only: Claude Code has no browser capability at 1920×1080 or 393×852 from CLI. Manual browser validation is the reviewer's responsibility before merge.

**Follow-up:** remove the `[§9.49 HP-live]` diagnostic `console.debug` calls once the in-place HP path is confirmed healthy in production.

### 9.50 Per-zone session/round metrics — persistence + zone-scoping gaps

**Symptom.** Client-side `S.combatMetrics` (session damage/heals/KOs) and `S._roundMetrics` (round variant) were global Maps — not scoped to the zone and not persisted server-side. Two user-visible consequences: (1) users who left and returned to a zone lost their session totals unless the throttled localStorage write had fired within 1.5s; (2) `S._roundMetrics` carried round numbers from Zone A into Zone B when the user switched mid-session — "THIS ROUND" stats showed ghost data until the next `round_end` event cleared the map.

**Root causes.** Server had no storage for combat metrics — `point_log` tracks scoring (different concept); no `combat_metrics` / `player_zone_metrics` table existed. Client persisted session metrics to `localStorage['9lv_metrics_<zone>_<date>']` on a 1500 ms throttle inside `trackCombatStat`, losing up to 1.5 s of final events on quick zone-leave. `S._roundMetrics` was reset per `round_end` but not per zone change — latent since the round-metric split.

**Resolved 2026-04-21 in PR #163.** Server adds the persistence layer; client consumes it as authoritative with localStorage retained as offline fallback. Two client sub-bugs fixed in the same commit.

- **Schema** (`database/schema.sql`). New `player_zone_metrics` table keyed by `(player_id, zone_id, metric_date)` with `damage / heals / kos` integer columns. `metric_date` defaults to `(now() AT TIME ZONE 'UTC')::date` so daily rollover is implicit — no cron. `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` for idempotent migration. **Must be applied manually via Supabase SQL Editor** — the exact snippet is printed at the end of the PR body.
- **Route** (`server/routes/zones.js`). `GET /api/zones/:zone_id/metrics` returns `{ players: [{ player_id, name, guild, damage, heals, kos }, …] }` for today (UTC). Joins to `players` for name/guild. Returns `{ players: [], note: 'metrics_table_missing' }` when the table hasn't been migrated yet so clients fall back gracefully.
- **Engine** (`server/services/combatEngine.js`). `trackMetric(nine, stat, amount)` accumulates transient `_sessionDmgDelta` / `_sessionHealsDelta` / `_sessionKosDelta` at each damage/heal/KO resolution site (main attack, CHAIN, REFLECT, POISON/BURN DOT credited to applier via `_dotAppliedById`, HEAL/BLESS/DRAIN, SHATTER). `flushZoneMetrics(zoneId, zs)` runs once per `tickZone` as a batched read+upsert. Fire-and-forget so combat latency is unaffected. Table-missing errors latch `_metricsTableMissing` so a missing migration never spams logs.
- **Client** (`public/nethara-live.html`). `openArena` fetches `/api/zones/:id/metrics` and seeds `S.combatMetrics` with server-authoritative totals, merged via `Math.max` so in-flight real-time events aren't clobbered. Sub-bug (a) fix: `S._roundMetrics.clear()` on zone change. Sub-bug (b) fix: `closeArena` flushes `S.combatMetrics` to localStorage eagerly before clearing and cancels the pending 1500 ms throttle timer.

Combat engine was not regressed during implementation (code-review only — no browser check from Claude Code CLI). Missing migration is soft-tolerated end-to-end: server returns empty, client falls back to localStorage, engine skips upserts after the first 42P01. **Follow-up:** once the migration is confirmed applied, consider migrating to a PL/pgSQL RPC for true atomic additive upsert (the current read-modify-write is single-writer safe but not concurrency-safe).

### 9.51 Mobile deploy modal horizontal overflow — right edge clips top-to-bottom

**Symptom (user-reported 2026-04-21, screenshot `audit/screenshots/2026-04-21-mobile-modal-width/devtools-393x852.png`).** Opening the deploy modal on any mobile viewport (393×852 iPhone 14 in DevTools and on a real Android device) produced a consistent right-edge clip across every row — title close ×, LCK stat, rightmost house filter icon, 3rd selected slot, card-grid right column, AUTO-REJOIN label, and the CANCEL/DEPLOY buttons all cut off equally. User had to horizontally scroll to reach the right half. Reproduces identically in Chrome DevTools device mode and on real hardware, so not device-specific.

**Root cause — latent since PR #161.** Not a PR #163 regression (PR #163's stat-row fix only made the clip more noticeable because the row now shows real numbers instead of `--` placeholders). Three structural gaps compounded:

1. **PR #161 bumped `.deploy-sort-btn`** inside the mobile `@media (max-width: 640px)` block from desktop's `font-size: 5px; padding: 3px 7px` to `font-size: 14px !important; padding: 8px 10px !important` as part of the 14px readability floor. The SORT label jumped to 14px in the same pass. Net effect at 14px Press Start 2P (monospace, ~1em per char): SORT label ~56px + 6 buttons (RARITY ~104, HP ~48, ATK/SPD/DEF/LCK ~64 each) + 4px gaps + 32px parent padding ≈ **~510px total**. Viewport: 393px. Overflow: ~120px.
2. **`#deploy-sort-bar`** (inline style at `public/nethara-live.html:1666`) had neither `flex-wrap` nor `overflow-x: auto`. Default `nowrap` forced the row to one line regardless of parent width.
3. **`.deploy-inner`** declared only `max-width: 520px` with no explicit `width` and no `box-sizing: border-box` (`public/nethara-live.html:635-638`). With the wrapper's column flex default `align-items: stretch`, the inner sized up to match the widest child — so the 510px sort bar pushed the inner past the viewport, and every sibling stretched to the new wider inner. That explains why rows that would otherwise fit (stat row with `flex-wrap: wrap`, selected row with `flex: 1` slots, card grid with `minmax` fit-content) all clipped on the right too: they were stretched past viewport by the column-flex-stretch inheritance, not forcing width themselves.
4. **`.deploy-modal`** at `public/nethara-live.html:629-633` had `overflow-y: auto` but no `overflow-x: hidden` safety net, so the inner's overflow produced a visible horizontal scroll rather than a clipped container.

Only 2 occurrences of `box-sizing: border-box` in the entire file — it's not set globally, so padding is additive to width throughout the modal chain.

**Resolved 2026-04-21 in PR #164.** One commit, 17 lines added inside the existing `@media (max-width: 640px)` block. All rules mobile-scoped; desktop CSS untouched.

- `.deploy-modal { overflow-x: hidden; }` — safety net so any future child that escapes the cap gets clipped, not scrolled.
- `.deploy-inner { width: 100%; max-width: 100vw; box-sizing: border-box; }` — hard upper bound. The `max-width: 100vw` wins over desktop's `max-width: 520px` via media-query specificity, and `box-sizing: border-box` makes the 12px horizontal padding inclusive.
- `box-sizing: border-box; max-width: 100%` applied to `.deploy-stats-preview`, `#deploy-sort-bar`, `#deploy-card-grid-wrap`, `.deploy-selected-row` — the four rows whose padding could otherwise combine with `align-items: stretch` to overflow.
- `#deploy-sort-bar { flex-wrap: wrap; row-gap: 6px; }` — actual root-cause fix. Seven items now wrap onto 2 lines at 393px instead of forcing one 510px line. Adds ~30px vertical footprint on mobile in exchange for zero horizontal overflow.

Regression status: code-review only (Claude Code CLI has no browser capability). Manual browser validation at 393×852 is the reviewer's responsibility before merge. No JS changes, no server changes, no other UI changes bundled in — scope held at pure CSS as requested.

**Follow-up resolved 2026-04-21 in PR #165.** PR #164's grouped selector omitted `.deploy-house-tabs`, so on mobile the 10-tab row (ALL + 9 houses × 40px + 6px gaps ≈ 454px) still sized itself to content — past `.deploy-inner`'s 100vw cap. Because the flex item's default `min-width: auto` resolved to the content width, the tabs container had no bounded width for `overflow-x: auto` to clip against, and the row clipped at the modal's right edge instead of scrolling as designed. Fix: add `.deploy-house-tabs` to the grouped `max-width: 100%; box-sizing: border-box` selector and include `min-width: 0` in the shared declaration so the container can shrink below its intrinsic content width. `min-width: 0` is a no-op for the other four rows that already don't overflow their content, but required for the tabs row to let `overflow-x: auto` take effect. Desktop untouched.

### 9.52 Combat not true FFA — guildmates skip hostile logic in 10 combat sites

**Symptom.** Per PRD §7 / Effects Reference, combat is meant to be true FFA — guild tags are cosmetic/organizational only, and only support effects (HEAL, BLESS, INSPIRE, and `ally_cluster` support-card positioning) treat guildmates as allies. In practice every hostile site in `server/services/combatEngine.js` filtered by `n.guildTag !== … .guildTag`: auto-attacks, TAUNT aggro, CHAIN secondary bounce, SILENCE, SHATTER/INFECT on-death AOE, FEAST on-KO trigger, plaguemire `poison_aura` on-deploy, hostile-card standoff positioning, and — most severely — the tick-loop fight gate. Net effect: guildmates never attacked each other; a zone that reached a same-guild-only survivor state stalled silently for the remaining 5-minute round cap; TAUNT's aggro-override didn't pull guildmates; CHAIN bounces and on-death AOEs skipped half the battlefield.

Display of the bug was intermittent because mixed-guild rounds masked most of it — the tick-loop stall only manifested after one side "cleaned up" and the survivors happened to share a tag. The stale Lone Wolf copy in the deploy API response (`"1.5× ATK bonus active"`) was a second, latent UI regression: the engine never applied that bonus (removed in V4), but the success message still advertised it to every guildless deploy.

**Root cause.** Every hostile predicate in `combatEngine.js` carried a guild clause copied from an earlier team-vs-team mode that predated V4 FFA. No `isAlly` / `isEnemy` helper exists in the engine — the guild checks were inline and drifted independently as effects were added. The design drift was never surfaced in a single audit, so the fixes accumulated instead of being removed. The V4 FFA decision is recorded in code only via a single comment at `combatEngine.js:257` (`"no lone_wolf ATK bonus — FFA makes it irrelevant"`).

**Resolved 2026-04-21 in PR #165.** Three commits:

1. **`fix(combat): remove guild filters from hostile logic`** — swapped the `n.guildTag !== caster.guildTag` predicate for `n.deploymentId !== caster.deploymentId` at every hostile site so self is excluded but every other nine is a valid target/victim regardless of guild. Sites touched:
   - `pickTarget` — TAUNT aggro and the auto-attack enemy list
   - `updateDest` — the `enemies` list for hostile-card standoff (`allies` stays guild-filtered because it's read only by the `ally_cluster` support branch)
   - `applyEffect/SILENCE` — mid-range highest-ATK target
   - `applyEffect/CHAIN` — secondary bounce in 1.5× melee range
   - `handleKO/SHATTER` — 120px on-death AOE
   - `handleKO/INFECT` — zone-wide on-death poison
   - `handleKO/FEAST` — on-KO heal for surviving FEAST-card holders
   - `loadDeploymentIntoEngine` — plaguemire `poison_aura` pre-poison on deploy
   - `tickZone` main loop — fight gate: was `"another nine with different guild exists"`, now `"another live nine exists"`. This was the most severe latent bug — stalled round to hard cap whenever survivors shared a tag.
2. **`fix(api): drop stale Lone Wolf 1.5× ATK copy from deploy response`** — `server/routes/zones.js:251` deploy-success message no longer advertises a bonus the engine hasn't applied since V4.
3. **Docs commit** (this entry).

**Unchanged — correct by design.** Four sites in the engine keep `n.guildTag === caster.guildTag`: `pickHealTarget` (HEAL target selection), BLESS AOE heal, INSPIRE zone-wide buff, and the `ally_cluster` movement branch in `updateDest`. These are the support-side places where guildmates legitimately are allies.

**Unchanged — out of scope.** Round-end guild scoring (`n.guildTag === winner` for +8 control / +15 flip) and the "last guild standing" round-termination rule stay as-is. FFA per-tick combat correctness doesn't require scoring changes; Spencer makes that decision separately. All display/persistence `guildTag` reads (broadcasts, KO events, leaderboard reads, DB upserts, chat tags) also unchanged — `guildTag` remains a valid metadata field.

**Dormant code noted.** `server/services/arena-engine.js` contains an `isAlly()` helper and 20+ guild checks. That engine is never required by `server/index.js` and does not run in production — left untouched. If it's ever revived, its guild logic will need the same FFA audit.

Regression status: code-review only — Claude Code CLI can't spin up a live combat tick loop. Live playtest is the real validation; simulation doesn't cover guild-composition edge cases (e.g., all-same-guild survivors, TAUNT from a guildmate, FEAST chains across guild lines).

**Follow-up.** Optional: introduce an `isAlly(nine, other)` helper to prevent this exact drift from recurring. Currently every support filter inlines `n.guildTag === caster.guildTag && n.deploymentId !== caster.deploymentId`; a named helper would make the design intent self-documenting. Not required for the fix.

### 9.53 Legacy world name "Avaloris" in `replit.md` and `package.json` → canon drift

**Symptom.** Two non-archive, non-PRD files still referenced the deprecated world name "Avaloris" instead of the canonical "Nethara" defined in PRD §4.1:

- `replit.md:5` described the game world as "the fantasy world of Avaloris" in the project overview paragraph.
- `package.json:4` carried the original project description string that also named "Avaloris."

Silent drift — nothing broke at runtime — but any reader cross-referencing those files against the PRD saw conflicting world names, and the `package.json` description is the value surfaced on npm / Replit metadata consumers.

(Archive files under `docs/_raw-history/` also mention Avaloris; those are intentionally frozen historical artifacts per `feedback_archive_mining_default.md` and are out of scope for canon cleanup.)

**Resolved 2026-04-22 in PR #166.** Single-word substitutions in both files — "Avaloris" → "Nethara." No other edits. Surfaced during the canon-cleanup scoping pass; entered and resolved in the same PR per the add-then-resolve pattern for pre-existing drift.

### 9.54 `CLAUDE.md` and `STATE_OF_THE_CODEBASE.md` misattribute stale directory references

**Symptom.** `CLAUDE.md` lines 33 and 96 claimed that `README.md` and `replit.md` reference non-existent `server/engine/` and `server/twitter/` directories. `STATE_OF_THE_CODEBASE.md` repeated the same claim on lines 15, 17, 88, and 274. Grepping both `README.md` and `replit.md` returned **zero** matches for either directory string — the claim was false. The only actual occurrences of `server/engine` / `server/twitter` in the repo were in `tasks/prd-9ln-product.md:703` (an explicit "those don't exist" note — informational, not drift), `CLAUDE.md` itself, and `STATE_OF_THE_CODEBASE.md`. Net effect: a future reader following the guidance to "fix the stale refs in README / replit.md" would find nothing to fix and waste the lookup.

**Resolved 2026-04-22 in PR #166.** Updated the claims to match reality:

- `CLAUDE.md:33` — removed the "Note: README.md and replit.md call this directory..." sentence; replaced with a cleaner statement that the flat `services/` layout is the only structure.
- `CLAUDE.md:96` — dropped the incorrect parenthetical from the `replit.md` bullet.
- `STATE_OF_THE_CODEBASE.md:15` — removed the "Out of date — refers to `server/engine/`..." clause from the README row.
- `STATE_OF_THE_CODEBASE.md:17` — removed the "Same stale directory references as README" clause from the replit.md row.
- `STATE_OF_THE_CODEBASE.md:88` — removed the "README and `replit.md` both describe..." bullet entirely.
- `STATE_OF_THE_CODEBASE.md:274` — removed the matching item from the Versioning/docs open-issues checklist.

Surfaced during the canon-cleanup scoping; entered and resolved in the same PR.

### 9.55 KO overlay and round-end modal stack when a KO lands near round end

**Symptom (user-reported 2026-04-21, screenshot `audit/screenshots/PR165 Notes/SS6.png`).** When a player's Nine is KO'd within the last few seconds of a round, both the KO widget (`#ko-overlay`, z-index 65) and the round-end modal (`#round-end-overlay`, z-index 8500) render simultaneously. The round-end modal paints over the top half of the KO widget because of the higher z-index, leaving a confusing stacked UI where both are partially visible and neither is cleanly dismissable without input.

**Root cause.** `nethara-live.html` has a `dismissKOOverlay()` helper at line 3492, but none of the round-end rendering paths call it. The `arena:round_end` socket handler at line 4007 mutates round state and then calls `_showRoundEnd(data)` at line 4064 without first dismissing the KO widget. When the two events fire within the same animation frame (KO in the final second of a round that ends on KO), both overlays are visible at once.

**Resolved 2026-04-22 in PR #167.** Added a single `dismissKOOverlay();` call inside the `arena:round_end` handler, placed immediately before `_showRoundEnd(data)` at `nethara-live.html:4064`. The dismiss is a safe no-op when the KO overlay isn't visible, so there's no branch or null-check needed. Placement is *after* the KO-rejoin bookkeeping at lines 4020–4029 (which reads `S._wasKOdThisRound` for auto-rejoin queueing) and *before* the round-end DOM mutation, so the UI state flip is clean: the KO widget closes, then the round-end modal opens in its place.

Scope held to the one behaviour fix — no copy, positioning, or interaction changes to either modal. The larger KO / round-end UX rework (non-blocking positioning, skull emoji, killer name) is queued as a separate PR in the PR165 Notes wave.

### 9.56 Top-bar arena timer shows 15-min snapshot-cycle countdown instead of round/intermission timer

**Symptom (user-reported 2026-04-21, screenshot `audit/screenshots/PR165 Notes/SS5.png`).** The top-bar timer in the arena header (`#countdown-time` at `nethara-live.html:1208`, next to the LIVE pill) displays the time until the next 15-minute scoring-snapshot boundary (e.g. counts down to the next :00/:15/:30/:45). That value has no relationship to the round the player is watching. The sidebar timer at `#zt-round-timer` (`1459`) already shows the correct round/intermission clock; the top bar was driven by a different, unrelated source.

**Root cause.** `startCountdown()` at `nethara-live.html:5718` ran a 1s interval keyed on `S.cycleEndTime`, a value set by `fetchCycleTiming()` (`5730`) to the next wall-clock 15-minute boundary. Neither field is maintained by the round-state socket handlers (`arena:round_end` at `4007`, `arena:round_start` at `4101`) that drive `S._roundState` / `S._roundStartedAt` / `S._roundEndsAt`. The top-bar ticker and the sidebar round ticker (`4705–4731`) read from entirely different state.

**Resolved 2026-04-22 in PR #170.** Three-part fix in `public/nethara-live.html`:

1. Dropped `cycleEndTime: null,` from the `S` state literal at `1824`.
2. Deleted `fetchCycleTiming()` (`5730–5735`) entirely — no other callers existed.
3. Rewrote `startCountdown()` to mirror the sidebar ticker's semantics: during `FIGHTING` render elapsed seconds since `S._roundStartedAt` with the `.fighting` gold class; during `INTERMISSION` render the countdown to `S._roundEndsAt` with the `.urgent` red-pulse class applied at ≤10s. Both branches use the `M:SS` format matching the sidebar.

The top-bar and sidebar clocks now tick together on the same state, and the LIVE pill / `⏱` icon were left untouched. No server changes.

### 9.57 Arena loading overlay progress bar reads as a stall

**Symptom (user-reported 2026-04-21, side note in PR165 Notes).** On entering a zone, the arena loading overlay's progress bar (`#arena-loading-bar` at `nethara-live.html:1191`) appears to freeze at roughly the midpoint before the Deploy Nine button becomes available. Players interpret the pause as the app having frozen.

**Root cause.** The bar wasn't smoothly animating — it stepped through four hard-coded percentages mapped to real phases: `0` on `openArena()` (`2143`), `35` on biome-image load (`6360`/`6364`), `60` on socket connect (`3549`), `100` on the first `arena:positions` tick (`3562`). The gaps between those checkpoints (especially 35→60 and 60→100) are bounded by network latency, so the fill element literally parks at 35% or 60% while waiting for the next event. The 8-second safety timeout at `2105` masked pathological hangs but also let the "stall" visual persist for a full 8s in the worst case.

**Resolved 2026-04-22 in PR #170.** Four-part fix in `public/nethara-live.html`:

1. Removed `#arena-loading-bar` from the overlay DOM (`1190–1192`). Replaced with a small CSS `.arena-spinner` (gold arc over a subtle ring, `0.9s` linear rotation) added to the arena CSS block (`~299`).
2. Rewrote `_showArenaLoading(msg, _pct)` (`1830`) to drop the bar-width write. Kept the `_pct` parameter as a harmless no-op so existing call sites at `2143 / 3549 / 3562 / 6360 / 6364` keep working without churn — the phase text labels (`LOADING ARENA...` → `LOADING FIGHTERS...` → `JOINING ZONE...` → `READY`) remain the honest indicator of what the app is doing.
3. Dropped the safety timeout from 8 s to 3 s at `2105`. Past 3 s the overlay hiding itself is more useful than holding up the Deploy CTA while something upstream is wrong.
4. No server-side or state changes. The LIVE pill, countdown timer (§9.56), and positions-tick dismiss path (§9.24) are untouched.

### 9.58 Post-KO UX had no mid-round feedback; KO widget redesigned as non-blocking informational overlay

**Symptom (user-reported 2026-04-21, screenshots `audit/screenshots/PR165 Notes/SS4.png` + `SS5.png`).** When a player's Nine was KO'd mid-round, the combat tray hid silently and no on-screen element confirmed what had happened until the round-end modal fired with a separate bottom-center `_showRejoinPrompt` banner. Meanwhile the legacy `#ko-overlay` / `showKOOverlay(killerName)` DOM still lived in `nethara-live.html` (lines 1640–1656, 581–611, 3458) as dead code since commit `2410167` suppressed the `combat:ko` call in §9.31. Net effect: the player learned they'd been KO'd only when the match paused, and the only UX touching killer identity (already in the `combat:ko` payload as `data.killerName`) was a stat-tracker, never player-visible.

**Root cause.** The original §9.31 suppression was correct for the *then*-current widget (blocking, 60-second countdown, pushing immediate redeploy) but left no replacement. The rejoin flow then split across three disjoint UIs: (a) a never-shown KO widget, (b) an ad-hoc bottom-center rejoin prompt created at round-end, (c) the round-end modal that happened to share screen-space with prompt (b). The PR165 Notes wave plan's "reworked KO widget" in the wave plan assumed the widget was still live; exploration surfaced it was dead.

**Resolved 2026-04-22 in PR #170.** Rewired the KO widget as a non-blocking, informational overlay and collapsed the three-surface rejoin flow into one.

- **Combat:ko handler (`~3889`):** re-added `showKOOverlay(data.killerName || null)` for self-KOs, superseding §9.31's suppression. New widget design doesn't block the arena (`pointer-events: none` on the overlay root, `auto` on the widget itself), so the §9.31 concerns no longer apply.
- **Widget DOM (`1640–1656`):** rebuilt with `💀` skull, `KNOCKED OUT` title, `by {killerName}` subtitle (dynamic via `#ko-killer`), short hint, primary `REJOIN` button (disabled until INTERMISSION), secondary `STAY WITHDRAWN` button. Removed the 60s countdown ring, the expired-message element, and the `pick-cards` link — the first two are obsolete (no deadline), the third is superseded by the round-end modal's CHANGE BUILD CTA.
- **Widget CSS (`~581–611`):** repositioned from `top: 60px` to `top: 96px` so it floats below the top bar / zone name and above the HUD tray. Added secondary-button styling. Dropped ring-specific rules.
- **Widget JS (`~3458`):** `showKOOverlay(killerName)` populates the killer span, reads `S._autoRedeploy` to switch between `REJOIN AT ROUND END` / `AUTO-REJOINING…` states, and starts a 500 ms `_updateKOWidgetCTA` interval that flips the CTA enabled when `S._roundState === 'INTERMISSION'` arrives. `dismissKOOverlay()` clears the interval. New `_koRejoinClick` / `_koWithdrawClick` handlers back the two buttons; `_koRejoinClick` reuses the existing `_doRejoin` helper (which calls `/api/zones/:id/rejoin`). `_koWithdrawClick` sets `S._withdrawnAfterKO = true`, dismisses the widget, re-shows the DEPLOY CTA.
- **Rejoin-prompt cleanup (`~4617–4666`):** deleted `_showRejoinPrompt` + `_dismissRejoinPrompt` + their two window exports. Redirected the four callers (`arena:session_expired`, `arena:round_end` KO branch, `arena:nine_rejoined`, `arena:round_start` auto-rejoin failure fallback) to either `dismissKOOverlay()` or `_updateKOWidgetCTA()`. `_doRejoin` stripped of its `_dismissRejoinPrompt()` call and its `#rejoin-btn` DOM hook — both are the widget's concern now.
- **Legacy KO-cooldown gate (`confirmDeploy ~3195`):** removed the 60s KO cooldown block (`S._koUntil` check). `_koUntil` and `_koTimer` state fields deleted from the `S` literal (`1829`). Build-change gating (§9.46) is the source of truth for when deploys are allowed.
- **Dead legacy helper:** deleted `dismissKOAndRejoin` (`~3510`) — only ever called from the removed legacy widget button.

Interactions preserved: auto-rejoin still fires on `arena:round_start` via the existing `_doRejoin` path; on failure the widget's CTA re-enables so the player can retry. Session-expiry dismisses the widget via `dismissKOOverlay()` (replaces the old `_dismissRejoinPrompt` call).

**Follow-up 2026-04-22 in PR #171.** Smoke test on Replit revealed the §9.55 `dismissKOOverlay()` call inside `arena:round_end` was firing against the newly-revived widget and dismissing it at round-end before its CTA had a chance to flip. User feedback: the accidental behavior was preferable — "better than two buttons for one job." Formalised the simpler single-CTA model by dropping the widget's buttons entirely and letting the round-end modal (§9.59) own post-round action:

- **Widget DOM (`~1640`):** removed `#ko-rejoin-btn` and `#ko-withdraw-btn` elements.
- **Widget CSS (`~619–627`):** dropped both button rulesets.
- **Widget JS (`~3458`):** `showKOOverlay` now populates hint text based on `S._autoRedeploy` — `AUTO-REJOIN ON — REJOINING NEXT ROUND` when on, `WATCH THE ROUND — CHAT STAYS LIVE` when off. No more polling interval, no more button state manipulation.
- **Cleanup:** deleted `_updateKOWidgetCTA` (~20 lines), `_koRejoinClick` / `_koWithdrawClick` window handlers, the `_koWidgetInt` state field + its init at `1821`, and the stale `_updateKOWidgetCTA()` call inside the `arena:round_start` auto-rejoin failure fallback (replaced with a feed-event nudge pointing to CHANGE BUILD / manual deploy).
- **§9.55 dismiss at round-end** remains the intentional handoff mechanism; widget vanishes when the round-end modal (§9.59) appears.

The widget is now a pure informational notice: skull + `KNOCKED OUT by {killerName}` + single hint line. The round-end modal is the sole source of post-round action. If the player wants to rejoin with same build and auto-rejoin is off, they toggle auto on via the modal's `ENABLE AUTO-REJOIN` CTA; auto-rejoin fires at round_start. If they want to change builds, they click CHANGE BUILD. Doing nothing keeps them withdrawn — same outcome as the deleted STAY WITHDRAWN button.

Captured as a general design principle in the user's auto-memory (`feedback_single_cta_surface.md`): don't duplicate CTAs across widget + modal — pick one surface for the action.

### 9.59 Round-end modal blocked the arena spectacle

**Symptom (user-reported 2026-04-21, screenshot `audit/screenshots/PR165 Notes/SS3.png`).** When a round ends, the round-end modal (`#round-end-overlay`, z-index 8500) rendered at viewport center with a 40 %-opacity full-viewport backdrop (`#round-end-backdrop`, z-index 8499). The backdrop darkened the arena canvas, and the modal's center position obscured the card tray + chat on mobile. End result: the player couldn't watch the post-round moment (e.g., surviving sprites celebrating) or keep chatting during intermission — the intended "spectacle + chat stay live" loop was gated behind dismissing the modal.

**Root cause.** `_showRoundEnd` at `nethara-live.html:4434` created both a backdrop element and a center-anchored overlay (`top:50%;left:50%;transform:translate(-50%,-50%)`) with a scale-in animation. The design was "dramatic intermission beat" per an earlier comment, but the drama came at the cost of blocking everything behind it. The modal's own `NEXT ROUND IN Ns` countdown meant the player also had two clocks (it + the top-bar timer) competing for attention.

**Resolved 2026-04-22 in PR #170.** Non-blocking rework inside `public/nethara-live.html`:

- Removed the backdrop element creation + append (`4459–4465`). `_dismissRoundEnd` now only has to clean up the overlay itself (plus a defensive removeChild of any legacy backdrop node left over from a prior session).
- Repositioned the overlay from viewport-center to `top: calc(var(--nav-height, 56px) + 48px); left: 50%; transform: translateX(-50%)` — sits just below the arena top bar, leaving the arena canvas, HUD tray, sidebar, and chat all visible.
- Replaced the `roundEndScale` center-translate animation with `roundEndSlide` (top-biased slide-down). Dropped the now-unused `roundEndFade` and `slideUp` keyframes from the inline `<style>`.
- Tightened padding (`20px 22px` → `14px 18px`), shrunk ROUND OVER header font (9 → 8 px), survivor-grid gap (12 → 10 px), and trimmed a few vertical margins for a ~20 % shorter footprint. The CTA button font dropped 11 → 10 px + padding 14 → 12 px to match.
- Kept the modal's internal `NEXT ROUND IN Ns` countdown as a secondary clock alongside the top-bar timer (§9.56).
- Coordinated with §9.58: the KO widget moved from `top: 96px` to `bottom: 230px` so it sits above the HUD tray during intermission — round-end modal occupies the top-center slot; KO widget the bottom-center. They're fully visible simultaneously without overlap.

CTA behavior (`_handleRoundEndAction` at `~4560`) is unchanged: auto-rejoin ON → CHANGE BUILD opens the preselected deploy modal; auto-rejoin OFF → the button flips the toggle on. The `§9.45` / `§9.47` / `§9.49` comments in that function still describe the correct invariants.

### 9.60 Client-side deploy-modal gate: silent-skip during FIGHTING for already-deployed players

**Symptom.** With `FEATURE_DEPLOY_LOCKOUT` flipping ON (§9.46 resolved), an already-deployed player clicking the SWAP or LOADOUT button during FIGHTING would see the deploy modal open, pick cards, and only discover the lockout when they hit the 423 countdown on the confirm button. The modal is visually loud (full-screen on mobile), so the UX was "the game tells me I can rebuild, then tells me I can't."

**Resolved 2026-04-22 in PR #170.** Added an early guard in `openDeployModal` at `nethara-live.html:2845`:

```javascript
if (S._roundState === 'FIGHTING' && S.isDeployed) {
  addFeedEvent('🔒 Deploy opens at round end', 'system');
  return;
}
```

`S.isDeployed` ensures new players (who haven't yet deployed on this zone) still see the modal so they can pick cards — their confirm flow hits the existing 423 countdown on the button, which is a clearer signal for first-time deployers. Already-deployed players get a lightweight feed event and keep watching the spectacle.

Interactions: the round-end modal's CHANGE BUILD CTA opens `openDeployModal({preselectCurrent: true})` during INTERMISSION, which passes this gate (roundState is not FIGHTING). Auto-rejoin uses `/api/zones/:zoneId/rejoin`, which is not behind the lockout flag, so it's unaffected.

### 9.61 Arena chat broadcast silently broken — client/server event-name mismatch

**Symptom (user-reported 2026-04-22 during PR #170 smoke test).** Typing a message in arena chat shows the message in the sender's feed (optimistic render) but no other browser in the same zone ever receives it. Chat looked alive to the sender; invisible to everyone else.

**Root cause.** Two-way event-name mismatch on the `/arena` socket.io namespace, pre-existing on `main` before PR #170:

- Client emits `zone:chat` (`public/nethara-live.html:5705`) → server's `/arena` handler had no listener for `zone:chat` → inbound messages dropped.
- Server emits `chat:message` (`server/index.js:276`) → client had no listener for `chat:message` → outbound broadcasts dropped.
- Server listened for `chat:send` (`server/index.js:264`) → client never emitted that name.
- Client listened for `zone:chat` (`public/nethara-live.html:3708`) → server never emitted it.

Net effect: every chat send failed silently at the inbound hop; the outbound broadcast path was never reached. Origin is likely a historical rename on one side (probably server-side, splitting the action name into `chat:send` for inbound + `chat:message` for outbound) without updating the other side. Orphan copy in `server/services/arena-sockets.js` (a file not currently imported from `server/index.js`) had the same two-name pattern.

**Resolved 2026-04-22 in PR #171.** Aligned every chat event on a single symmetric name, `zone:chat`:

- `server/index.js:264` — `socket.on('chat:send', …)` → `socket.on('zone:chat', …)`.
- `server/index.js:276` — `arenaNamespace.to(`zone_${zoneId}`).emit('chat:message', …)` → `…emit('zone:chat', …)`.
- `server/services/arena-sockets.js:70 + 78` — same rename, even though the file is orphan today, so a future wire-up doesn't re-introduce the drift.
- Client unchanged — it was already canonical on `zone:chat` for both directions.

No other consumers of the old event names anywhere under `server/`, `public/`, or `client/`. Awaiting two-browser Replit verification.

### 9.62 Deploy modal house filter tabs still overlap on mobile 393×852

**Symptom (user-reported 2026-04-22 during PR #170 smoke test).** Follow-up on §9.51's fix (PR #164 resolved the main body overflow of the deploy modal at 393×852). The house filter tab row at the top of the modal (`#deploy-house-tabs`) still overlaps itself — tabs run into each other horizontally so adjacent house labels visually collide. Rest of the modal is visible and usable.

**Root cause** (diagnosed 2026-04-23). `.deploy-house-tabs` at `public/nethara-live.html:682` uses `display: flex; overflow-x: auto` with `flex-shrink: 0` on each tab. 10 tabs (ALL + 9 houses) × 40px + 9 gaps × 6px = 454px — wider than the 393px viewport. The PR #164 / §9.51 follow-up added `min-width: 0` to the row so the flex parent could shrink and the `overflow-x: auto` would kick in — that did enable scrolling, but visually on real hardware the horizontal-scroll affordance is barely discoverable and tabs at the edge of the scroll window render as "half a tab" which reads as overlap / crash into each other.

**Resolution.** Wrap instead of scroll. In the mobile media query, override `.deploy-house-tabs` to `flex-wrap: wrap; overflow-x: visible; row-gap: 6px`. 10 tabs × 40px fit as 5 per row at 393px (224px used, ~170px spare for container padding/margins), so the tabs reflow into 2 rows without horizontal scrolling and without any hidden gesture. No change to desktop (still single-row with `overflow-x: auto`).

**Resolved 2026-04-23 in PR #177.**

### 9.63 Sidebar fighter profile popup — can't navigate between profiles, center-viewport position

**Symptom (user-reported 2026-04-22 during PR #170 smoke test).** Clicking a fighter row in the sidebar leaderboard opens a profile popup. Two issues:

1. **Navigation friction.** If another profile is already open, clicking a new fighter row doesn't switch to them — player has to dismiss the current popup first, then click again.
2. **Position.** Popup renders center-viewport. Wray wants it anchored to the clicked fighter row, "more like a speech bubble or extra window extending from the profile card."

**Root cause** (diagnosed 2026-04-23). Two core issues + two bonus bugs found while there:

1. The row's `onclick` bubbled up to a document-level outside-click handler (`public/nethara-live.html:5322`) that removed the popup immediately on any click that wasn't *inside* the popup. Rapid row-to-row switches went: row click → `_showFighterPopup` creates popup → document handler fires → target is the row (not inside popup) → popup removed. User saw a flash or nothing, had to dismiss-then-reclick.
2. Popup CSS was hardcoded to `top:50%;left:50%;transform:translate(-50%,-50%)` regardless of where the source row was.
3. *(Bonus)* The row `<div>` had **two** `style=""` attributes (one with layout, one with `cursor:pointer`). Browser kept the first, dropped the second — `cursor:pointer` silently never applied.
4. *(Bonus)* Listener leak: each popup open attached a new `document.addEventListener('click', _close)` but the old handlers were only removed when they actually fired an outside-click close. Repeated row clicks stacked document listeners.

**Resolution.** Row `onclick` now calls `event.stopPropagation()` and passes `this` as an anchor element into `_showFighterPopup(id, anchorEl)`. The popup computes position from `anchorEl.getBoundingClientRect()` — places to the left of the row if there's room, else to the right, else falls back to center-viewport (narrow / mobile). Outside-click handler tracked as `window._fpCloseHandler` so each re-open removes the prior listener before binding a new one. Duplicate `style` attribute on the row merged into one.

Pointer/arrow connecting popup visually to the row is deferred — current placement sits adjacent to the source row, which is the main ask. Add the pointer in a follow-up polish pass if the popup still feels disconnected in use.

**Resolved 2026-04-23 in PR #175.**

---

### 9.67 Deploy lockout deadlocks single-guild zones — 423 with `nextWindowInSeconds: 0` on Twilight Grove + Hanwu Boglands

**Symptom (user-reported 2026-04-23 during PR #171 smoke test — SS4).** POST `/api/zones/deploy` returns **423 Locked** with body `{"error":"deploy_locked","message":"Deployment is only allowed during intermission","nextWindowInSeconds":0}` on zones 13 (Twilight Grove) and Hanwu Boglands. Only those two zones exhibit the bug — other zones deploy fine. The zero-seconds window suggests the server thinks intermission is imminent yet the state never transitions. A player already deployed on the affected zone also cannot reconfigure their own loadout — the same 423 blocks self-reswap.

**Root cause.** The guard at `server/routes/zones.js:55-66` (introduced by §9.46 and flipped ON by §9.60) returns 423 whenever the zone's `roundState === 'FIGHTING'`. Twilight Grove and Hanwu have active deployments from a single guild. With no enemy, the combat engine's last-guild-standing transition (`services/combatEngine.js:1231-1248`) never fires, and the 5-minute hard cap (line 1225) immediately flows back into FIGHTING on the next `startRound`. Net effect: the first guild to claim an empty zone soft-locks it against all future joiners AND against their own loadout edits. Zones with no deployments return `null` from `getZoneState()` and skip the guard entirely, which is why other zones appear unaffected.

**Resolution plan.** Extract the guard predicate into `server/services/deployLockout.js` and tighten to require all three conditions before returning 423: (a) round has real time left (`roundEndsAt > now`); (b) zone has ≥2 distinct guilds present (a genuine contest, matching Game Bible's "last guild standing" semantics); (c) requester is not already deployed on this zone (self-reswap is always allowed). Add Jest tests covering every bypass path. Add `GET /api/admin/zones/:id/state` diagnostic so ops can inspect the engine's in-memory zone view (roundState, guilds, stale flag, per-Nine summary) when triaging future lockout reports.

**Follow-up filed as §9.69.** The existing self-reswap code path does a full withdraw + redeploy which resets HP and spawn position mid-round. This PR only unblocks the 423; the semantic choice (queue loadout for next round vs true hot-swap) is scoped to §9.69.

**Resolved 2026-04-23 in PR #173.**

---

### 9.68 Desktop viewport at 1728×1117 is unresponsive — 500px cap, 2-col grid, no image loading state

**Symptom (user-reported 2026-04-23 during PR #171 smoke test — SS2 + SS3).** Dashboard caps at `max-width: 500px` in `public/dashboard.html:34`, leaving ~600px of empty space on each side on a 1728×1117 Chrome window at 100% zoom. Typography renders small because sizing is fixed-`px` rather than fluid. The zone grid is hardcoded to 2 columns (`grid-template-columns: 1fr 1fr` at line 613) regardless of viewport, so wider displays don't pack more zones per row. Zone card images render as dead black rectangles while loading — no placeholder, no spinner, no indication that anything is happening.

**Effect.** Medium. The live UI (`/public/`, vanilla HTML/CSS/JS) was designed mobile-first and lacks a desktop adaptation layer; the mobile polish from prior §9 passes doesn't translate up. Wray's framing: "file a ticket to dynamically detect the agent/browser to find their resolution and scale it to theirs."

**Resolution plan.** First pass in PR #173 (this PR): container breakpoints on both dashboard + deploy modal, auto-fit zone grid on dashboard, reusable `.img-skeleton` shimmer utility + preload-and-reveal for zone card images. Remaining desktop work tracked below as follow-up.

**Partially resolved 2026-04-23 in PR #173.** Specifically landed:

- `public/dashboard.html:34-54` — `.main-container` grows to 720 / 1040 / 1240px at 768 / 1100 / 1440px viewports. Mobile (500px) unchanged.
- `public/dashboard.html` — `.img-skeleton` class + `@keyframes skeletonShimmer` added as a reusable loading state.
- `public/dashboard.html` zone grid — shifted from hardcoded `1fr 1fr` to `repeat(auto-fit, minmax(220px, 1fr))` so cards reflow 2→3→4→5 columns as the window widens.
- `public/dashboard.html` zone-card images — render with `.img-skeleton` + `data-zone-img`, then a post-insert preloader (`revealZoneImages`) swaps in the real `background-image` on `Image.onload` and removes the skeleton class. No more dead-black rectangles during image fetch.
- `public/nethara-live.html:645-655` — `.deploy-inner` grows on the same three breakpoints. The deploy modal's card grid (already `auto-fill minmax(130px,1fr)`) now reflows to more columns on desktop instead of being pinned at 520px.

**Follow-up scope (still OPEN, deferred).**

1. Fluid typography — `clamp()` on dashboard hero / section headings + deploy modal titles so the font scales with viewport. Current pass leaves fixed-px typography intact.
2. Dashboard hero card inline-styled fixed-px sections (stats bar, points float, character canvas) stay mobile-sized on desktop — will feel small on wide monitors.
3. Other pages — builder.html, leaderboards.html, packs.html, card-lab.html — have the same 500px container pattern; each needs the breakpoint treatment.
4. Apply `.img-skeleton` to other image surfaces (card thumbnails, house crests, zone thumbnails elsewhere).
5. Agent/browser resolution detection per Wray's request — on modern browsers CSS media queries handle this natively, so likely not needed unless a specific device is misreporting. Revisit if a concrete device ID shows up.

**Status: PARTIALLY RESOLVED** — follow-up items above remain open.

---

### 9.69 Self-reswap during an active round — semantic decision pending (queue vs hot-swap)

**Symptom (surfaced 2026-04-23 during §9.67 fix).** Once §9.67 unblocks self-reswap, a player reconfiguring their own loadout during FIGHTING goes through the existing withdraw + redeploy code path at `server/routes/zones.js:86-106`. This deactivates the old slots, removes the Nine from `zones.get(zone_id)` via `removeDeploymentFromEngine`, then re-inserts a fresh deployment downstream. Side-effects: the Nine gets **fresh HP and a new spawn position** mid-round. Not a regression — pre-existing behavior — but a UX question surfaced by the §9.67 unblock.

**Effect.** Low. Functional but semantically unclear to players. A player who reswaps "in a pinch" during a contested round effectively heals themselves and relocates, which may or may not be the intended cost/benefit.

**Resolution plan.** Product decision pending. Wray's stated default (2026-04-23): accept the swap immediately but defer the card change until next `startRound` (preserves HP and position). Stretch alternative: a true hot-swap that replaces the `cards` array on the live Nine without respawning — the card rotation (`cardIdx`) picks up the new loadout on its next cycle. Hot-swap is more engaging but requires clear UI feedback — a pending-change indicator for the queued variant, or a "now firing" card indicator for the hot-swap variant — before it ships. Out of scope for §9.67 PR.

**Decision 2026-04-23**: queue-and-apply-at-next-round-start. Hot-swap deferred — the queue variant is lower risk (no mid-round stats-flicker), matches "round is sacred" mental model, and can be iterated into hot-swap later without breaking the contract.

**Resolved 2026-04-23 in PR #178.** In-memory pending queue on the combat engine (`server/services/combatEngine.js`): new `pendingCardQueue` Map keyed by `${zoneId}:${deploymentId}` → cardIds. Three new engine internals:

- **`queuePendingCards(zoneId, deploymentId, cardIds)`** — exported; sets the entry. Second queue overrides first (idempotent).
- **`applyCardsInPlace(nine, newCards, zoneBonus)`** — recomputes `stats` + `maxHp` from house + new cards + zone bonus; assigns `nine.cards`; preserves `nine.hp`, `nine.x`, `nine.y`, and all active status effects; resets `cardIdx` to 0 so the new loadout fires from slot 1 cleanly; recomputes `atkTimer` / `cardTimer` from the new SPD.
- **`applyPendingCardsAtRoundStart(zoneId, zs)`** — async, called fire-and-forget from `startRound` at `services/combatEngine.js:1466-1471`. For each Nine with a queued entry it fetches the card data via `fetchCardsByPlayerCardIds`, calls `applyCardsInPlace`, and fires a DB sync (`syncSlotsForDeployment`) to rotate `zone_card_slots` rows so DB eventually matches what's actually firing. Errors are caught per-Nine so one failure can't block others.

Route layer (`server/routes/zones.js:76-124`): a new self-reswap branch runs after the §9.46/§9.67 lockout check but before the existing "deactivate old deployment + redeploy" path. If the engine's in-memory zone state shows `roundState === 'FIGHTING'` and has a Nine with this `playerId`, the route validates `card_ids` belong to the player, calls `engine.queuePendingCards(...)`, and returns `200 { success, pending: true, message }` — no DB writes, no withdraw+redeploy. Self-reswap during `INTERMISSION` still flows through the existing immediate-apply path below.

Client (`public/nethara-live.html:3231-3241`): `confirmDeploy()` receives `pending: true`, closes the modal, and surfaces a `⏳ Build queued — applies at next round start` feed event. Equipped-cards HUD stays on the *current* loadout — it'll update organically once the new cards start firing at round start via the existing combat event stream.

Known limitation: engine restart mid-intermission drops pending entries (in-memory only, no DB persistence). The player just resubmits the swap — acceptable for v1 since restarts are rare and the cost of a schema migration outweighs the benefit. Escalate to a `pending_card_ids` jsonb column on `zone_deployments` if restarts-mid-queue turn out to be common in production.

**Follow-up in PR #179.** Smoke test of PR #178 revealed the queue path was unreachable from the UI: the mobile SWAP button at `public/nethara-live.html:1544` threw `Uncaught ReferenceError: openDeployModal is not defined` because `openDeployModal` was declared as a local `async function` inside an IIFE but never assigned to `window` (sibling functions `closeDeployModal`, `confirmDeploy`, `withdraw`, `toggleAutoRedeploy` all are). Desktop accidentally worked via the `btn-swap-build` event-delegation catch at line 2546; the mobile button's class-only markup missed that fallback. Pre-existing bug surfaced by §9.69 making mid-round reswap a valid flow. Fixed by adding `window.openDeployModal = openDeployModal;` next to the other exposures at line 3166. Also removed the now-superseded §9.60 client-side gate at `openDeployModal` entry (lines 2851-2860) that silent-skipped already-deployed players during FIGHTING — the server-side queue (above) is the source of truth now, and `confirmDeploy`'s `pending:true` response handler provides the user feedback.

---

### 9.70 Mobile X/Twitter auth deep-links into X app and never returns

**Symptom (user-reported 2026-04-23 during PR #173 smoke test).** On mobile with the X native app installed, tapping "Connect Twitter" on `/register.html` deep-links into the X app, the user authorizes, then nothing happens — the user is stranded in the X app with no return to the game. Login fails silently. Blocks mobile registration and blocks smoke-testing any logged-in flow (Wray flagged this while trying to regression-test §9.67 on a legitimately contested zone).

**Effect.** High — mobile is the primary device class for the target audience (Twitter-native crypto-survival game); broken login kills onboarding and blocks further smoke testing.

**Root cause.** `public/register.html:325` used `window.location.href = '/auth/twitter'` — full-page nav. The server 302s to `https://twitter.com/oauth/authorize?...`; iOS/Android treat that URL as a Universal Link / App Link and hand it to the X native app. The X app completes OAuth and tries to redirect to `https://9lv.net/auth/twitter/callback`, but because the original browser tab was replaced by the nav, there's no return path — iOS either drops the result in a tab the user can't find or keeps the user in the X app. No `apple-app-site-association` or `.well-known/assetlinks.json` on 9lv.net to hand the X app's return intent back to the browser context.

**Resolution.** Open auth in a new tab via `window.open('/auth/twitter', '_blank', 'noopener')` so the X app detour doesn't orphan the original tab. Add a `storage`-event listener on the original tab so it auto-navigates to `/dashboard.html?player_id=X` once the new tab writes `player_id` to localStorage (the existing callback chain already does this — see `public/dashboard.html:170` and `public/register.html:657`). Show a "waiting on new tab" state on the button so the user knows the flow is active elsewhere. Popup-blocker fallback: if `window.open` returns null, fall back to `window.location.href` so the user isn't stuck.

Scope-boxed to `public/register.html`. Did not touch the server OAuth flow (`server/routes/auth.js`), the orphaned `/auth/twitter-mobile` endpoint (cleanup for a later dead-code pass), or Universal Link / App Link infrastructure (deferred — only needed if new-tab fix doesn't unblock mobile auth).

**Partially resolved 2026-04-23 in PR #174.** The new-tab + storage-listener change improved tab UX and is defense-in-depth, but did NOT solve the underlying X-app Universal-Link intercept — Wray confirmed mobile login still dead-ends after PR #174 merged and after updating the X Dev Portal Website URL to production.

**Follow-up resolution in PR #176.** Server-side mobile UA detection added in `GET /auth/twitter` (`server/routes/auth.js:30-62`). iPhone / iPad / Android / generic mobile user-agents are 302'd to the existing `/auth/twitter-mobile` HTML page, which renders a big "Login with X" button plus an explicit instruction: "If the X app opens instead of a login page, long-press the button and choose 'Open in Browser.'" Long-pressing an `<a href>` in iOS Safari / Android Chrome invokes the browser's context menu with an **Open in Background / Open in Safari / Open in Browser** option — which routes around the X app's Universal Link claim on `twitter.com/oauth/authorize` and keeps the OAuth flow entirely in the browser.

Trade-off: mobile users have to perform one extra gesture (long-press instead of tap) and follow a visible instruction. Not ideal UX, but reliable across iOS/Android/X-app-version combinations without requiring Apple Developer / Google Play verification for Universal Links on our own domain. Desktop flow is unchanged.

**PR #176 reverted 2026-04-23 in PR #179.** Smoke test on real iPhone confirmed the long-press workaround was dead-end UX: user lands on the twitter-mobile instruction page, taps the Login button normally, X app still hijacks, nothing returns. The intermediate page added a tap without fixing the underlying problem. Wray's verdict: "it must read the login from the app like before, not need additional steps like this." The server-side UA redirect in `server/routes/auth.js:29-52` was removed; client flow returns to the PR #174 baseline (`window.open('/auth/twitter', '_blank')` direct). `/auth/twitter-mobile` endpoint left in place as orphaned code — cleanup deferred to the Universal Links PR.

**Re-opened as PARTIALLY RESOLVED.** PR #174 (new-tab + storage listener) remains in effect as UX defense-in-depth. Core mobile hijack still unfixed. Next required step: **Apple Universal Links + Android App Links registration on 9lv.net**. Needs `/.well-known/apple-app-site-association` + `/.well-known/assetlinks.json` served with the correct MIME types, plus the Apple team ID / Android package / SHA-256 fingerprint that allow the OS to route the X app's return intent back to the browser. Scope for a dedicated session when Wray is ready.

**Status: OPEN — pending Universal Links implementation.**

---

### 9.71 KO'd-withdrawn self-sprite renders bright 0-HP bar (no dim, no WAITING badge) after round_start when auto-rejoin is OFF

**Symptom (user-reported 2026-04-23 during PR #181 smoke test).** On a round that ends while the player is KO'd with auto-rejoin OFF (or declined), the next round starts and the player's own sprite is visible on the arena with a **bright red 0-HP bar** and **no dim treatment / no WAITING badge**. Expected: sprite stays at α=0.25 with "WAITING" label (the §9.37 treatment) until the player redeploys or the round ends again. The §9.58 KO widget + round-end modal CTAs still work — this is a cosmetic regression specific to the intermission → next-round transition for withdrawn self-sprites.

**Effect.** Low–medium severity, cosmetic only. No gameplay impact (the player is correctly withdrawn server-side; engine skips them; redeploy path works). But the visual — a pristine-colored sprite with a bright 0-HP bar — reads as "my Nine is alive and at zero health", which is confusing during a live round and undermines the §9.37 / §9.35 "you are dead, here's where you'll respawn" UX.

**Root cause.** Asymmetry between server-side `startRound` retention and client-side `arena:round_start` handler:

- Server (`server/services/combatEngine.js:1488-1498`) keeps KO'd Nines in `zs.nines` per §9.35, flips them to `withdrawn:true`, leaves `hp:0`, and returns early from the HP-reset loop.
- Server broadcast (`combatEngine.js:1533-1545`) emits `arena:round_start` with `nines: all.map({ id, hp, maxHp, guildTag, houseKey })` — **no `withdrawn` flag in the payload**.
- Client (`public/nethara-live.html:4111-4123`) iterates `data.nines` and for every entry calls `updateNineHP()` (paints the bar), sets `sp.container.alpha = 1` (undoes §9.37 dim), and removes `sp._waitingBadge` (undoes WAITING label). The handler has no way to tell which entries are withdrawn and treats all Nines as survivors.

The §9.37 dim is applied on `combat:ko` (`nethara-live.html:3937-3953`) with `waitingForRound: true`, but `arena:round_start` — which fires after intermission — clobbers it for every Nine in the payload. The bug was dormant while §9.33 auto-rejoin always re-entered a withdrawn self-sprite; when auto-rejoin is off, the sprite stays withdrawn across the round boundary and the clobber becomes visible.

**Resolution plan.** Two-sided minimal fix:

- **Server** (`server/services/combatEngine.js:1536-1544`): add `withdrawn: !!n.withdrawn` to the payload object. One line.
- **Client** (`public/nethara-live.html:4115-4122`): gate the `sp.container.alpha = 1` + `_waitingBadge` removal on `!n.withdrawn && n.hp > 0`. If the Nine IS withdrawn, leave the dim and badge in place (and defensively re-apply α=0.25 if a race condition cleared them — belt-and-braces, ~4 lines).

Verification: Jest test mocks two Nines (one withdrawn, one alive), calls `startRound`, asserts the broadcast payload includes `withdrawn:true` / `withdrawn:false` on the respective entries. Manual smoke: auto-rejoin OFF, take a KO, wait for next round → sprite stays dimmed with WAITING label; redeploy CTA still works.

**Resolved 2026-04-23 in PR #182.**

---

### 9.72 Arena goes stale mid-session — deploy CTA shows, sprites hover from previous round, combat stuck, no console errors

**Symptom (user-reported 2026-04-23 during smoke of the nine-PR batch).** After some period of watching a live arena — trigger is not reproducible but seems to involve the round boundary and/or a background tab window — the UI reaches a frozen state: `#deploy-cta` is visible, the player's own sprite hovers from a previous round, the opponent's sprite is stuck in place, combat events (damage numbers, HP ticks) stop arriving. No browser-console errors. Browser refresh restores normal state.

**Effect.** High annoyance; directly blocks any extended smoke test because the player has to refresh and re-click-into the zone to recover. Adjacent to §9.24 (loading-overlay) and the tab-visibility fix shipped in PR #188, but neither fully explains this particular symptom — PR #188 addressed animation queue buildup and tab-return resync, while this bug persists even without a tab switch.

**Root cause hypothesis.** Two candidates, both defensively addressed in the fix because I couldn't deterministically reproduce from the code path alone:
1. **Zombie socket.** Socket.io auto-reconnect fires `connect` and emits `join_zone`, but for reasons specific to Replit / polling-fallback / sandbox lifecycle, the server's `arena:positions` broadcast never resumes to this client. Client has no watchdog, so the stale state sits forever. Sprites persist because `S.nines` is only culled by arena:positions ticks.
2. **Server-side tick stall for the zone.** If `tickZone` throws inside the engine's `try/catch`, the catch logs and continues — but a repeating throw for a specific zone means no positions broadcast reaches any client in that zone until restart. Same downstream effect on the client.

**Resolution plan.** Two-part client-side defense in `public/nethara-live.html`:
1. **Stall detector.** New state field `S._lastPositionsAt` stamps each `arena:positions` receipt. `_startStallDetector()` runs every 2s; if the arena tab is visible AND `_lastPositionsAt > 0` AND more than 15s have passed without a tick, it logs `[stall] no arena:positions in Xs — forcing reconnect` and calls `S.socket.disconnect()` + `S.socket.connect()`. Socket.io's auto-reconnect machinery takes it from there.
2. **Sprite cleanup on reconnect.** The `socket.on('connect', ...)` handler now clears `S.nines` (removing PIXI containers from the stage) before emitting `join_zone`. Without this, any stale sprite from the pre-dropout session lingers because no culling event arrives until positions resumes. Combined with the stall detector, this closes the loop: detect stall → force reconnect → clean sprite map → positions repopulate from server truth.

The 15s threshold sits well above the 200ms tick interval (so no false alarms) and below where the user would notice the freeze. Tab-visibility guard (`S._tabHidden`) prevents the detector from false-firing when the browser naturally throttles RAF/setInterval.

**Resolved 2026-04-23 in PR #191.**

---

### 9.73 Arena mid-range (641–768px) uncovered, no breakpoint tokens, inlined tap-target specs

**Symptom (inventory 2026-04-23).** The mobile responsive audit surfaced three interrelated gaps in `public/nethara-live.html`:
1. The `641–768px` viewport range (iPad portrait, landscape phones, small tablets) has no `@media` rules — it falls through to the `max-width: 640px` mobile block (which assumes 84px portrait col + compressed HUD and wastes space at 700px) or jumps to the `min-width: 768px` desktop modal rules (which don't re-expand the mobile layout). Tests awkwardly in both directions.
2. Every `@media` query hardcodes raw px values (`640px`, `768px`, `1100px`, `1440px`). No naming convention. Future rename or retune across the file is high-friction grep + replace.
3. `44px+` tap-target spec mentioned in comments (per iOS HIG + WCAG 2.5.5) but not enforced via a shared class — individual mobile button styles satisfy it through different combinations of `font-size + padding + border`, and new buttons risk drifting below the threshold.

**Effect.** Pre-resolution: iPad portrait users on `/zone/:id` see the mobile HUD squeezed into 768px as if they were on a 393px phone. Developer cost: any cross-file breakpoint change is fragile. Accessibility: new buttons may regress below the 44px target without anyone noticing until external review.

**Resolution plan.** Three coordinated micro-changes in one PR:
1. **Breakpoint tokens** declared as commented CSS custom properties at the top of the file (`--bp-xs: 390px`, `--bp-sm: 640px`, `--bp-md: 768px`, `--bp-lg: 1100px`, `--bp-xl: 1440px`). Since `@media` can't reference CSS vars directly, every existing and new `@media` block gets a trailing comment (`/* --bp-sm 640px */`) so the file is grep-friendly for future token-driven refactors.
2. **641–768px block** added to cascade over the 640px mobile rules. Widens `#mob-portrait-col` from 84px → 110px, bumps portrait image 64px → 84px, raises base font sizes on buttons/tabs/chat/log to 15px, and gives the canvas 60% of vertical height (vs 54% on narrow phones). All rules `min-width:641px and max-width:768px` gated — nothing unconditional, desktop 1920×1080 untouched.
3. **`.tap-target` utility** (`min-height:44px; min-width:44px; padding:10px 14px`) declared at the top of the stylesheet. Existing mobile buttons keep their inline padding (converting them risks visual regression); the utility is documentation + escape hatch for future additions.

**Resolved 2026-04-23 in PR #192.**

---

### 9.74 Mobile arena polish — card name truncation ("TEMP...") + portrait column cramp breaks MVP acceptability

**Symptom (user-reported 2026-04-23 with iPhone XR 414×896 screenshot saved at `audit/mobile/Screenshot 2026-04-23 205236.png`).** At sub-640px viewports the arena is functionally readable but visibly unpolished in ways that undermine the "is this a real product?" first impression. Specifically:
- Card slot layout is horizontal (art left / name right) at ~128px total width. The name field gets ~67px after padding — not enough for Cinzel 14px bold. Full card names like "TEMPORAL CURRENT" or "PLAGUEMIRE" truncate to `TEMP...` / `PLAG...` / `VAH...` with CSS ellipsis. Players can't identify their own cards without tapping each one.
- Portrait column at 84px (≤640) / 76px (≤390) feels thin. Player handle `@9LVNetwork` truncates to `@9LV_...` with ellipsis — loss of identity for a handle that's *the* brand.
- General visual density. Wray's take: "users will not take it seriously."

**Effect.** MVP-blocking on the quality dimension. Functionality is intact (tap still works, HP still renders, stats still track) but the first impression reads as a hacked web build rather than a shipped mobile game. Blocks the "small userbase of fans" MVP criterion from `project_vision.md` — can't ask people to show up and play if the mobile surface looks thrown together.

**Resolution plan.** Arena-only polish pass (other pages deferred):
1. **Card slot vertical layout.** Switch `.mob-card-slot` from `flex-direction:row` (art-left / name-right) to `flex-direction:column` (art-top / name-bottom). Art gets 64% of card height — the character/card visual becomes prominent. Name gets the bottom 36% at full card width (~96px at 414px viewport). Remove `white-space:nowrap`; use `-webkit-line-clamp: 2` so long names wrap to two lines instead of ellipsis-truncating. Font drops 14→13 to fit cleanly in two lines for the longest card names in the catalog.
2. **Portrait column widen.** 84→96 at ≤640, 76→86 at ≤390. Extra 12px at 414px viewport still leaves comfortable room for the card-slot column.
3. **Player handle 2-line wrap.** Replace `nowrap + ellipsis` with `-webkit-line-clamp: 2`. Drop font 14→12 so a wrapped 2-line handle doesn't eat too much vertical space before the HP bar.
4. **Slot visual polish.** Subtle gradient background, small drop-shadow, slight border-contrast bump — makes the cards read as physical objects instead of flat rectangles.

**Verification.** Manual smoke at three viewports: 390×844 (iPhone 15), 414×896 (iPhone XR — the reported case), 744×1133 (iPad portrait — PR #192's mid-range block should still apply cleanly). Regression check at 1920×1080 desktop — all new rules are inside the existing `@media (max-width: 640px)` and `@media (max-width: 390px)` blocks, so desktop is untouched.

**Out of scope for this PR (deferred):** secondary-pages responsive pass (register / packs / how-to-play / builder / leaderboards / card-lab — the original plan's PR #2, now renumbered to a future §9.75 entry if prioritized). Dashboard hero inline-styles refactor and fluid typography sweep — also deferred to a future §9.76 pass.

**Resolved 2026-04-23 in PR #194.**

---

### 9.76 Arena loading overlay flashes mid-intermission — server skips `arena:positions` broadcast for 35s, false-firing the §9.72 stall detector

**Symptom (user-reported 2026-04-23 late, post-sync of PRs #193–#195).** During the 35-second intermission between rounds, the deploy-status pill + HUD get masked by a full-viewport loading overlay. User's quote: *"theres a loading screen that takes over the whole screen when theres about 15 seconds from next round starting... at the moment its difficult to tell if you are deployed or not."* Devtools console shows `[stall] no arena:positions in 32s — forcing reconnect` shortly before the overlay appears.

**Effect.** Medium-high UX damage during every round transition. The deploy-status pill (§9.40), combat tray, and auto-rejoin controls disappear behind a `z-index:200` overlay at `public/nethara-live.html:1300`. Forced socket reconnect also wipes `S.nines` (§9.72 hotfix), which means the arena re-renders from scratch after each intermission — visually thrashy and makes players think something is broken.

**Root cause.** `server/services/combatEngine.js` function `tickZone` contains an early-return at lines 1208–1211:

```js
if (zs.roundState === 'INTERMISSION') {
  if (now >= zs.roundEndsAt) startRound(zoneId, zs, Array.from(zs.nines.values()));
  return;
}
```

The `return` exits the function before reaching the `broadcast(zoneId, 'arena:positions', ...)` at the bottom of the same function. For the full 35-second `INTERMISSION_MS` window, the server broadcasts zero position packets. The client's stall detector — correctly implemented in PR #191 with a 15-second silence threshold — watches for `arena:positions` and sees a long silence every round. It fires `console.warn("[stall] ...")`, calls `S.socket.disconnect()` → `S.socket.connect()`, and the reconnect handler at `public/nethara-live.html:3739` shows `_showArenaLoading('JOINING ZONE...', 60)`. Exactly Wray's reported symptom.

This is a **real server bug**, not a client false-positive. The stall detector was correct; the server was incorrectly silent during intermission.

**Resolution.** Refactor the `arena:positions` payload into a module-scoped `broadcastArenaPositions(zoneId, zs)` helper. Call it from two places: (a) the main path at the end of `tickZone` (same as before), AND (b) the intermission short-circuit so position ticks continue through the 35s window. Positions don't change during intermission — no combat runs, Nines sit at their last-tick coordinates — but the tick keeps the Socket.io wire busy and the stall detector stays quiet. Client renders unchanged, pill stays visible, no loading-overlay flash, no forced reconnect.

Kept the intermission `return;` intact: combat mutation code ABOVE the intermission block (DOT timers, attack cycles, etc.) already gates on `hp > 0 && !waitingForRound`, so survivors with lingering poison stacks or burn timers would still tick during intermission if the return were removed. That's a pre-existing latent behavior separate from this fix; not touched.

**Resolved 2026-04-23 in PR #196.**

---

### 9.77 Remove dormant `arena:session_expired` client handler — one-deploy-cycle backward-compat window closed

**Symptom / debt.** PR #184 deleted the server-side `SESSION_MS` + 2h inactivity timer but intentionally kept the client handler for `arena:session_expired` at `public/nethara-live.html:4134` dormant for one deploy cycle, as a safety net in case any stale server instance was still broadcasting the event. That cycle passed — 15+ PRs of smoke testing since PR #184, zero stale events observed in the logs. The handler + its "Session ended (2 hours)" feed message (which pre-dated the SESSION_MS deletion per §9.3) are now dead code whose presence is misleading to anyone reading the file.

**Effect.** Low severity, code-hygiene only. No user impact. The handler never fires. But it's a ~28-line block that says a Nine can be "session expired" when by policy (§4.8.5) it cannot.

**Resolution.** Removed the handler body in `public/nethara-live.html` (replaced with a 5-line note explaining the removal + audit breadcrumb). Cleaned the two surviving references in `server/services/combatEngine.js` (one above the constants block, one where the session-timer loop used to live) — both now say "removed in §9.77" instead of "will be removed in a follow-up."

**Resolved 2026-04-23 in PR #197.**

---

### 9.79 Arena bottom tray graphics disappear mid-session despite player still deployed → deferred

**Symptom (user-reported 2026-04-23 end-of-session smoke).** During a continuous session, the `#arena-bottom-tray` (the combat HUD strip at the bottom of the arena view — card slots, withdraw/swap buttons, spell timeline) vanishes visually while the player is still deployed per `S.isDeployed`. Deploy-status pill (§9.40) stays correct; combat still progresses; so the state is fine, just the bottom UI is hidden.

**Effect.** Low severity annoyance. Player loses access to the swap/exit buttons until they refresh. Not blocking gameplay — combat auto-continues, auto-rejoin still fires on KO. Flagged as "small annoyance" by Wray; not blocking MVP.

**Root cause hypothesis (not verified).** Something is setting `document.getElementById('arena-bottom-tray').style.display = 'none'` without a matching re-show on the next legitimate deploy-visible transition. Candidates: the visibility re-sync path (`_onTabVisible` at `public/nethara-live.html:~4897`), the `arena:round_start` handler, or a stale leftover from one of the KO / withdraw paths. None of the recent PRs explicitly introduced this — most likely a pre-existing latent desync between `S.isDeployed` and the bottom-tray CSS.

**Resolution plan.** Deferred. Pre-3D-animation work is being pushed out per 2026-04-23 priority reset. Will be revisited after the 3D animated-layers drop in ~2 weeks since arena polish is batched for that window. If the annoyance escalates before then, the fix is likely: add a deploy-state-to-tray-visibility sync on every state-change event (tab-visible, round_start, nine_rejoined, 30s metrics-sync interval) — same pattern as the pill from §9.40 / Task 17.0 item 5.

**Status: OPEN — deferred.**

---

### 9.80 Mana system + gauntlet + boss cleanup — dead code removal

**Symptom.** Mana column/logic persisted in the DB, server routes, scheduler, and Chronicle bot despite the V5 product direction (§4.2.2, §5.9) marking mana as legacy. Frontend was stubbed to `99` in dashboard/zone-detail but the server still deducted on spell cast and the midnight cron still reset the pool — a silent divergence where players could hit a server-side gate they couldn't see. Gauntlet and boss features shipped as full routes + engines + tables but were no longer part of the MVP loop. `/boss.html` was still reachable from nav and fetched `/api/boss/*` endpoints that existed but were dead-ended. `twitterBot.js` (the Chronicle spellcast bot) gated spell casts on `player.mana <= 0`, a legacy concern actively blocking the Chronicle revival interview.

**Effect.** Low player-visible — no one complained. But ~50 files of dead code, a reachable `/boss.html` that silently errored, and a blocking concept for the upcoming Chronicle revival.

**Resolution plan.** Full removal: delete `manaRegen.js`, `gauntletEngine.js`, `bossEngine.js`, their routes, `public/boss.html`; strip mana gate from `twitterBot.js` and `territory.js`; remove midnight mana-reset from `territoryControl.js`; remove boss cron jobs + dead vars from `scheduler.js`; delete admin `reset-mana` endpoint; scrub player-facing docs (builder, how-to-play, packs, spellbook, EFFECTS). DB migration drops `players.mana/max_mana/last_mana_regen`, `casts.mana_cost`, `nfts.total_mana`, `traits.stat_mana`, `daily_quests.reward_mana`, `player_quests.reward_mana`; drops `gauntlet_runs`, `boss_contributions`, `boss_deployments`, `boss_fights` tables. `packSystem.all_mana_spent` flag kept (load-bearing for daily card upgrade gate) and now fires on every territory cast.

**Resolved 2026-04-24 in PR #201.**

---

### 9.81 nethara-live.html — malformed `</html>` close leaks CSS as visible text

**Symptom (user-reported 2026-04-24 during PR #201 smoke test).** Arena shell briefly shows raw CSS text right before zones finish loading: `div:hover { background: rgba(255,255,255,0.05) !important; } /* Slideshow dots */ #ss-dots > div { transition: background 0.2s; } >`. Pre-existing in `main` at the time of discovery — not introduced by any specific recent PR.

**Root cause.** `public/nethara-live.html` ended with `</html` (no `>`), then ~18 lines of orphan CSS rules, then a stray `>` on its own line that finally closed the mangled `</html` tag. Browser absorbed most of the CSS as pseudo-attributes on the malformed close tag but leaked the tail as visible text in the document body during first paint.

**Effect.** Low. Cosmetic text leak during arena first-load only. Not blocking gameplay; CSS rules were also effectively ignored (not inside a `<style>` block), so any styling intent was already lost.

**Resolution plan.** Move the orphaned rules into the existing `<style>` block in `<head>` (where they clearly belong — standard game UI rules for deploy grid, HUD buffs, stats tab, slideshow dots). Replace mangled close with clean `</html>`.

**Resolved 2026-04-24 in PR #202.**

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
