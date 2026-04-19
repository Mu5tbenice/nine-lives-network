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

**4.8.5 Session timer: 2 hours.** After 2 hours continuous deployment the Nine auto-withdraws. Manual reactivation required to continue.

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

### 9.2 `handleKO` ReferenceError → FPRD (bundled with 9.1)

**Symptom.** `server/services/combatEngine.js:393` — `handleKO(nine, zoneId, all)` references undefined `killerId` and `killerName` at lines 398 and 411. Throws `ReferenceError` on every KO. The outer tick `try/catch` (line 882) swallows.

**Effect.** Zero KO points ever awarded since V3. `point_log` has zero `zone_ko` rows in the last 7 days.

**Resolution plan:** Derive killer as `nine._lastHitById ?? nine._dotAppliedById`, route the +10 reward through `pointsService.addPoints(killerId, 10, 'zone_ko', …)`.

### 9.3 `SESSION_MS` is half the spec → cleanup

**Symptom.** `server/services/combatEngine.js:17` — `SESSION_MS = 1 * 60 * 60 * 1000` (1 hour). §4.8.5 of this PRD specifies **2 hours**.

**Resolution:** Change constant to `2 * 60 * 60 * 1000`.

**Resolved 2026-04-18 in PR #136.** Constant updated to `2 * 60 * 60 * 1000` with inline reference to PRD §4.8.5.

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

### 9.23 Rounds not ending on production → OPEN (investigation required)

**Symptom.** Observed 2026-04-20 during PR #143 smoke test: a deployed Nine with HP reaching 0 did not trigger round end. The 5-minute hard cap (`ROUND_CAP_MS` at `server/services/combatEngine.js:14`) also did not appear to fire (user observation — unverified by code trace).

**Effect.** Player-facing. Rounds that don't end can't award round-end points (+5 alive, +8 control, +15 flip at `combatEngine.js:1183-1186`). KO points are unaffected (fire immediately in `handleKO`, not at round end). But without round ending: no new round begins, no intermission, no cinematic round-end broadcast, no `zone_control_history` row written → nightly `/recalculate-identities` has no source data.

**Severity.** High. Gates all non-KO arena scoring and the per-round `dominant_house` writer introduced in PR #143.

**Diagnostic hypotheses (unverified — do not act on without a trace):**
- `endRound` not invoked because the tick loop's end-of-round detector (last-guild-standing OR `ROUND_CAP_MS` elapsed) has a logic bug.
- `endRound` is invoked but the persistence path errors silently. The history insert error handler now logs (PR #143 commit 1), so a reproduction should surface DB errors if that's the cause.
- `_wasKOdThisRound` / `waitingForRound` flag state is inconsistent, blocking the last-guild-standing condition from ever evaluating true.

**Resolution plan:** Separate investigation. Needs a code trace of the tick loop's round-end detection (setInterval at `combatEngine.js:1509-1521`), server log inspection during a reproduction, and MCP verification that the `zone_control_history` insert actually runs. Do NOT attempt a fix in PR #144.

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
| **Session** | A Nine's continuous deployment on a zone. Auto-withdraws after 2 hours. |
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
