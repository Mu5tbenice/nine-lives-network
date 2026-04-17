# NINE LIVES NETWORK — GAME BIBLE
## Single Source of Truth for All References
## Last Updated: April 15, 2026
## Combat V4 — Round-based, last guild standing, time-based DOT, balance pass
## Zone V2 — House presence bonuses, guild branding, nightly zone identity

---

## 1. IDENTITY

| Property | Value |
|----------|-------|
| Game Name | Nine Lives Network (9LN) |
| Game Title (gaming contexts) | Nines of Nethara |
| World Name | Nethara |
| Players Are Called | Nines |
| Individual Character | "a Nine" |
| NFT Collection (Season 2+) | The Nines (2,500 Genesis) |
| Token | $9LV (Solana, live on Pump.fun) |
| Aesthetic | Post-ironic high fantasy meets crypto Twitter meme culture |
| Tagline | "Your Nine Fights. Cards Are Its Weapons." |
| Website | ninelives.network |
| Twitter | @9LVNetwork |
| Mascot / AI Character | Nerm — a floating cat head, serves as Telegram moderator and Twitter bot |

---

## 2. WHAT IS NINE LIVES NETWORK?

Nine Lives Network is a card collection auto-battler with two parallel experiences:

**The Chronicle (Twitter/X):** @9LVNetwork posts a daily four-act story. Players reply in character as their Nine. The bot weaves them into the narrative. The ending is unpredictable. This is the social game.

**The Battlefield (Web App):** Players deploy their Nines to zones in Nethara, equip 3-card loadouts, and fight for territory in round-based auto-battles. Rounds end when one guild wipes the others — or after a 5-minute hard cap. They also duel other players 1v1, run a solo PvE gauntlet, and raid weekly bosses with their guild.

Every card has 5 stats (ATK, HP, SPD, DEF, LUCK) plus 1 effect. Your Nine has base stats from its house. Cards are its weapons — they add stats and trigger combat effects with spatial range. Position on the battlefield matters.

**Three interlocking layers:**
- CARDS = What your Nine fights with (3 per zone, strategic loadout)
- ITEMS = How your Nine fights (passive stat bonuses, earned through play)
- LEVEL = How strong your Nine is (XP progression, unlocks slots)

Both games feed the same leaderboard. Points convert to $9LV tokens.

---

## 3. THREE AUDIENCES, ONE GAME

**Crypto Raiders** — Guild territory battles, Chronicle roleplay on Twitter, coordinated pushes. Their community gets visibility when their guild controls zones.

**Normies / Gamers** — Collect cards, play duels, run gauntlet, join a guild. No crypto knowledge needed.

**Everyone** — Opening packs, checking combat, replying to the Chronicle, theorycrafting loadouts.

---

## 4. CORE DAILY LOOP

1. Morning: @9LVNetwork posts Chronicle Act 1. Player replies in character.
2. Open daily pack (5 cards added to permanent collection).
3. Deploy Nine to zones, equip 3-card loadout in deploy modal, rounds begin.
4. Midday: Chronicle Act 2 — player replies, gets named in the story.
5. Check zones — did the guild win rounds? Swap cards if needed.
6. Afternoon: Chronicle Act 3 — the stakes rise.
7. Run Gauntlet, do some duels, contribute to weekly boss.
8. Evening: Chronicle Act 4 — the ending. Bonus points awarded.
9. Check zone round standings before midnight.
10. Midnight: decay + reset, fresh start. Next day: new pack, new story, repeat.

---

## 5. YOUR NINE

### Everyone Gets One
Register and pick a house — your Nine exists immediately. No NFT needed. No purchase required.

### House Selection — "The Sorting Ceremony"
On registration, the game offers an AI-powered profile scan. It reads the player's recent tweets, bio, and vibe, then auto-assigns a house with a personalized roast. This is optional — players can pick manually instead.

### House Rules
- House can be switched once per week, but points do NOT carry over to the new house
- No "home zones" — all zones are contestable by anyone
- House determines base stats AND which effects feel thematic on your cards (though any house card can be equipped)

---

## 6. HOUSES — BASE STATS

| House | Icon | ATK | HP | SPD | DEF | LUCK | Role |
|-------|------|-----|-----|-----|-----|------|------|
| Stormrage | ⚡ | 40 | 280 | 30 | 5 | 15 | Burst / Crit |
| Smoulders | 🔥 | 35 | 350 | 25 | 10 | 10 | Glass Cannon |
| Stonebark | 🌿 | 12 | 700 | 10 | 40 | 5 | Wall / Tank |
| Ashenvale | 💨 | 20 | 380 | 22 | 12 | 15 | Rogue / Speed |
| Nighthollow | 🌙 | 25 | 360 | 30 | 12 | 25 | Disruptor / Luck |
| Dawnbringer | ☀️ | 15 | 620 | 15 | 30 | 5 | Healer / Support |
| Manastorm | 🔮 | 30 | 380 | 25 | 15 | 10 | Controller |
| Plaguemire | ☠️ | 20 | 450 | 20 | 25 | 10 | DOT / Attrition |
| Darktide | 🌊 | 25 | 450 | 20 | 20 | 10 | Thief / Vampire |

### Stat Ranges
- ATK: 12 (Stonebark) to 40 (Stormrage)
- HP: 280 (Stormrage) to 700 (Stonebark)
- SPD: 10 (Stonebark) to 30 (Stormrage/Nighthollow)
- DEF: 5 (Stormrage) to 40 (Stonebark)
- LUCK: 5 (Stonebark/Dawnbringer) to 25 (Nighthollow)

### Design Notes
- Stormrage = ultimate glass cannon: highest ATK, lowest HP, lowest DEF
- Stonebark = ultimate wall: lowest ATK, highest HP, highest DEF, lowest SPD
- **Ashenvale base SPD is 22** (reduced from 38 — was hitting the SPD floor with any speed cards)
- Nighthollow has the highest LUCK (25 vs next closest 15)
- Healer/support houses (Dawnbringer, Stonebark) are designed for group play — they underperform in 1v1 duels by design

---

## 7. GUILDS

House = Class (how you fight). Guild = Faction (who you fight for).

Guilds are crypto communities ($BONK, $WIF, $DEGEN), friend groups, or any team. Non-crypto guilds welcome.

A well-built guild wants house diversity: DPS (Smoulders/Stormrage), Tank (Stonebark), Support (Dawnbringer), Control (Nighthollow/Manastorm), DOT (Plaguemire), Speed (Ashenvale).

Players without a guild receive the guild tag `lone_wolf`. There is **no lone wolf ATK bonus** — combat is FFA and guildmates can hit each other, so a compensation bonus makes no sense.

**Combat is FFA** — all guilds on a zone fight all other guilds simultaneously. Members of the same guild do NOT attack each other.

---

## 8. STAT SYSTEM — PURE ADDITION

The core formula is simple addition. No multipliers. No conversions.

```
total_atk  = house.atk  + card1.atk  + card2.atk  + card3.atk
total_hp   = house.hp   + card1.hp   + card2.hp   + card3.hp
total_spd  = house.spd  + card1.spd  + card2.spd  + card3.spd
total_def  = house.def  + card1.def  + card2.def  + card3.def
total_luck = house.luck + card1.luck + card2.luck + card3.luck
```

### Card Stat Ceilings
- Pure ATK cards: max +10 ATK
- Hybrid attack + effect cards: max +8 ATK
- Control/DOT/support cards: max +6 ATK
- Speed cards: max +8 SPD each
- DEF cards: max +20 DEF (Stonebark cards)
- LUCK cards: max +20 LUCK (Nighthollow cards)

---

## 9. COMBAT FORMULAS

### Server Tick Rate
200ms per tick — 5 server updates per second.

### Attack Speed
```
attack_interval = max(2.5, 7.5 - SPD × 0.10) seconds
```
Floor is **2.5 seconds**.

| Total SPD | Attack Every |
|-----------|-------------|
| 10 | 6.5s (Stonebark base) |
| 22 | 5.3s (Ashenvale base) |
| 30 | 4.5s (Stormrage / Nighthollow base) |
| 50 | 2.5s (floor) |

### Card Effect Cycle
```
card_cycle_interval = max(5.5, 12.0 - SPD × 0.10) seconds
```
Floor is **5.5 seconds**. Card effects rotate sequentially: slot 1 → slot 2 → slot 3 → repeat.

| Total SPD | Card Fires Every |
|-----------|-----------------|
| 10 | 11.0s |
| 22 | 9.8s |
| 30 | 9.0s |
| 65+ | 5.5s (floor) |

### Damage Per Hit
```
damage = ATK² / (ATK + DEF)
```
Minimum damage: 1.

### Critical Hits
```
base_crit_chance   = LUCK × 0.3 / 100
crit_chance (CRIT) = LUCK / 100
```
Crits deal 2× damage. BLIND zeroes effective LUCK for 2 attacks.

### Slot Bonuses (auto-attack damage multipliers only)
- Slot 1 (Opener): ×1.35
- Slot 2 (Follow-up): ×1.0
- Slot 3 (Closer): ×1.5 if target below 40% HP

---

## 10. SPATIAL COMBAT MODEL

Every Nine has a position on the zone battlefield. Range is determined by active card type.

### Spell Ranges
| Range Type | Distance | Card Types |
|-----------|----------|-----------|
| Melee | 90px | attack cards |
| Mid-range | 220px | control cards |
| Ranged | 380px | DOT cards |
| AOE (self) | 120px radius | support cards |
| Self-cast | 0px | utility cards |
| Zone-wide | Infinite | INSPIRE, INFECT |

### Targeting by Card Type
| Card Type | Prefers | If nobody in range |
|-----------|---------|-------------------|
| attack | Lowest HP enemy (90px) | Move toward closest enemy |
| control | Highest ATK enemy (220px) | Move toward highest ATK enemy |
| dot | Highest HP enemy (380px) | Move toward highest HP enemy |
| support | Lowest HP ally (90px AOE) | Move toward wounded ally |
| utility | Self | Hold position |

**TAUNT override:** All enemies must attack the taunting Nine — overrides all targeting.

### Movement
Sprites lerp toward server position at a rate proportional to their SPD stat.

**Style:** Bob + waddle when moving, idle sway when still, direction flip toward travel direction, z-sort by Y position (lower = in front). This is "South Park style" — characters feel alive even without animation frames.

Movement speed = `30 + (totalSPD × 1.2)` pixels per engine tick.

### Server Loop (every 200ms)
1. Decrement all attack and card timers
2. Apply time-based DOT (POISON every 1.5s, BURN every 1.0s, CORRODE on CD)
3. Update movement destinations every 6 ticks (1.2s)
4. Step positions
5. Resolve card effects when card timer elapses
6. Resolve auto-attacks when attack timer elapses
7. KO check — 0 HP → waiting state
8. Round end check — single guild remaining → end round
9. Broadcast `arena:positions`

---

## 11. ROUND SYSTEM

Zone battles are **round-based**. This replaces the old continuous combat + 15-minute snapshot model.

### Round End Conditions (whichever comes first)
1. **Last guild standing** — all Nines from every other guild have been KO'd
2. **5-minute hard cap** — winner by highest total surviving guild HP

### Round Intermission (25 seconds)
A cinematic overlay shows: winner, survivor count per guild, KO board (top 5), points awarded, elapsed time, end reason (LAST GUILD STANDING or TIME CAP). After 25 seconds the next round begins.

### Round Start
- All Nines — including KO'd waiters — rejoin at **full HP**
- All status effects cleared (POISON, BURN, HEX, SILENCE, CORRODE, etc.)
- Round number increments

### No Mid-Round Rejoin
KO'd during a round = wait. Your sprite dims and shows WAITING. You auto-rejoin when the next round starts. No redeployment to a different zone while waiting.

### Session Timer
After **2 hours** of continuous deployment your Nine auto-withdraws. Manual reactivation required to continue.

### Round Timer Display
The UI shows **elapsed time** counting up (not a countdown — rounds have no fixed length). Timer turns gold at 4 minutes (approaching hard cap).

---

## 12. SCORING

### Zone Battle Points
| Action | Points | Timing |
|--------|--------|--------|
| Deal a KO | +10 | Immediately on KO |
| Alive at round end | +5 | Round end |
| Guild controls zone at round end | +8 | Round end (surviving guild members) |
| Guild flips zone control | +15 bonus | Round end |

### KO Credit Rules
Credit goes to the **last damage source**:
- Auto-attack kill → attacker
- POISON or BURN tick kill → last player who applied the effect
- CHAIN second-target kill → caster
- SHATTER kill → the KO'd Nine's controller

### Other Points
| Action | Points (Seasonal) | XP (Permanent) |
|--------|-------------------|----------------|
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

### Scoring Rules
- Card rarity does NOT affect points
- You never LOSE points
- No daily point cap for Season 1

---

## 13. ZONE STRUCTURE & IDENTITY

27 zones total. No home zones. All contestable.

### Three Layers of Zone Control

**Layer 1 — Per-Round Points** — covered in scoring above.

**Layer 2 — Daily Guild Branding**
At midnight, the guild that won the most rounds on each zone yesterday gets their tag displayed on that zone all of the following day. Resets nightly. Purely cosmetic.

**Layer 3 — House Presence Bonus**
At midnight, the house with the most fighters deployed on each zone yesterday claims it. The next day, ALL fighters on that zone benefit from that house's bonus — regardless of their own house or guild. Fighter count only — not HP.

| House Claims Zone | Bonus next day |
|---|---|
| 🔥 Smoulders | +20% ATK |
| 🌊 Darktide | Regenerate 3% max HP every 60 seconds |
| 🌿 Stonebark | +25% max HP |
| 💨 Ashenvale | +15% SPD |
| ⚡ Stormrage | Crits deal 3× damage instead of 2× |
| 🌙 Nighthollow | +10 LUCK |
| ☀️ Dawnbringer | HEAL and BLESS effects 50% stronger |
| 🔮 Manastorm | All card effects 30% stronger |
| ☠️ Plaguemire | Enemies start each round with 1 POISON stack |

No bonus if zone had no fighters the previous day. Both branding and house bonus recalculate at midnight UTC.

---

## 14. SPELL CARDS

Each card has exactly ONE effect — its identity.

Effects are thematically locked to houses. BURN only on Smoulders cards. POISON/CORRODE/WITHER only on Plaguemire. Your loadout tells a story.

### Card Types
| card_type | Targeting | Range | Stat Identity |
|-----------|-----------|-------|---------------|
| attack | Lowest HP enemy | 90px | High ATK |
| control | Highest ATK enemy | 220px | LUCK/SPD, moderate ATK |
| dot | Highest HP enemy | 380px | Low ATK, high HP |
| support | Lowest HP ally | 90px AOE | HP/DEF, zero ATK |
| utility | Self | Self | SPD/DEF/LUCK |

### House Effect Identity
| House | Exclusive Effects | Shared Effects |
|-------|------------------|----------------|
| Stormrage ⚡ | CRIT, PIERCE | CHAIN, SURGE, EXECUTE, WARD |
| Smoulders 🔥 | BURN | EXECUTE, THORNS, SURGE |
| Stonebark 🌿 | ANCHOR | WARD, THORNS, HEAL, WEAKEN |
| Ashenvale 💨 | DODGE | CHAIN, HASTE, WEAKEN |
| Nighthollow 🌙 | HEX, BLIND | SILENCE, MARK, DODGE |
| Dawnbringer ☀️ | BLESS, INSPIRE | HEAL, BARRIER, EXECUTE, PIERCE |
| Manastorm 🔮 | TETHER, NULLIFY | WEAKEN, DRAIN, SILENCE, SURGE, BARRIER |
| Plaguemire ☠️ | POISON, CORRODE, WITHER | BARRIER |
| Darktide 🌊 | — | DRAIN, MARK, SURGE, TETHER, WARD, CHAIN, BARRIER |

**84 Cards total:** 12 Universal + 72 House-specific (8 per house × 9 houses).

---

## 15. SHARPNESS & CARD DEGRADATION

```
effective_stat = base_stat × (0.5 + sharpness / 200)
```
- 100% sharpness = 100% effectiveness
- 0% sharpness = 50% effectiveness (cards NEVER disappear)

### Rules
- Zone combat: **-1% per round end**
- Quick Duels / Gauntlet: no sharpness loss

### Sharpening
- 1 exact duplicate → 100%
- 3 same-house cards → 100%
- 5 any cards → 100%
- Sharpening Kit → +50%

---

## 16. ALL EFFECTS (36 Active — V4 Tuned)

### Removed Effects (not in engine)
GRAVITY, MIRROR, PARASITE, OVERCHARGE, SWIFT, RESURRECT, SLOW (merged into WEAKEN), STEALTH (merged into DODGE), PHASE, AMPLIFY, LEECH AURA.

### V4 Balance Changes (April 2026)
| Effect | Old | New | Reason |
|--------|-----|-----|--------|
| POISON | Per-tick damage | **Every 1.5s real-time** | Tick-rate dependent — killed tanks in 2s at 200ms ticks |
| BURN | Per-tick damage | **Every 1.0s real-time** | Same issue |
| CORRODE | 10-tick CD (~2s) | **5-second real-time CD** | Was -450 maxHP/min — one-shots tanks |
| HEX | -12/stack, max -36 | **-8/stack, max -24** | -36 = 95% ATK reduction on Stormrage — too dominant |
| WARD | Reapplied while active | **No reapply while active** | Permashield on Stormrage/Smoulders at Rare+ rarity |

### Effect Stacking
- Numeric (BURN, POISON, HEX): ×3 max. 1st: 100%, 2nd: 75%, 3rd: 50%
- Binary (SILENCE, WARD, ANCHOR, DODGE): on/off only, no stacking

### Timed Duration by Rarity
Common 8s / Uncommon 9s / Rare 10s / Epic 11s / Legendary 12s

---

### ATTACK EFFECTS

**BURN** — On-attack — 6 per stack, fires every 1.0 second
Stacks ×3. Duration = card_interval × 2 seconds. Smoulders exclusive.

**CHAIN** — On-attack — hits 2 targets
Second hit on random nearby enemy (130px). Kill credit attributed to caster.

**EXECUTE** — On-attack — +50% damage below 30% HP

**SURGE** — Passive — +50% ATK / takes extra damage

**PIERCE** — On-attack — ignores WARD and BARRIER

**CRIT** — On-attack — full LUCK% crit chance (vs 30% base). Stormrage exclusive.

---

### DEFENCE EFFECTS

**HEAL** — On-attack — 7% own maxHP to lowest-HP ally within 90px (self if none)

**WARD** — Timed — block 1 hit. Bypassed by PIERCE. **Will not reapply while still active.**

**ANCHOR** — Timed — can't drop below 1 HP. Stonebark exclusive.

**THORNS** — Passive — reflect 18% of each hit back to attacker

**BARRIER** — Passive — absorb 50 total damage. Bypassed by PIERCE.

---

### CONTROL EFFECTS

**SILENCE** — Timed — target's card effects don't trigger. Targets highest ATK enemy within 220px.

**HEX** — On-attack — **-8 ATK/stack, max -24**. Stacks ×3. Nighthollow exclusive.
*Full HEX on Stormrage: 40 → 16 ATK. Still fighting, but ~65% DPS reduction.*

**WEAKEN** — Timed — target deals 50% damage for 2 attacks

**DRAIN** — On-attack — 20% lifesteal

**FEAST** — On-KO — heal 15% of dead enemy's maxHP (zone-wide trigger)

**TETHER** — On-attack — 50/50 damage split with target for 3 attacks

**MARK** — On-attack — +25% damage taken by target for 3 attacks (all sources)

**BLIND** — On-attack — LUCK = 0 for 2 attacks (no crits, no DODGE). Nighthollow exclusive.

**NULLIFY** — On-attack — strip one active buff (WARD → BARRIER → ANCHOR → HASTE → DODGE). Manastorm exclusive.

---

### TEMPO EFFECTS

**HASTE** — On-attack — +10 SPD for 3 attacks

**DODGE** — Utility — fully evade the next incoming hit

---

### ATTRITION EFFECTS

**POISON** — On-attack — 3% maxHP × stacks, fires every **1.5 seconds**
Stacks ×3, each stack decays after 3 fires (~4.5s per stack). Plaguemire exclusive.
*3 stacks vs Stonebark: ~378 total damage over 14 seconds*

**CORRODE** — On-attack — -15 maxHP, **5-second real-time cooldown**
Permanently reduces max HP until round reset. Plaguemire exclusive.
*Full 5-min round: up to 36 applications = -540 maxHP. Stonebark ends at ~160 maxHP.*

**WITHER** — On-attack — HEAL, BLESS, BARRIER 50% less effective for 3 attacks. Plaguemire exclusive.

**INFECT** — On-KO — all enemies on zone get 1 POISON stack when this Nine dies.

---

### TEAM EFFECTS

**INSPIRE** — On-attack — +2 ATK, +2 SPD to all allies (zone-wide)

**BLESS** — On-attack — heal all allies within 90px for 4% own maxHP

**TAUNT** — Utility — all enemies must attack this Nine (zone-wide override)

**SHATTER** — On-KO — deal 10% own maxHP as damage to all enemies within 120px

**REFLECT** — Utility — bounce the next incoming hit back at full damage (consumed on trigger)

**CLEANSE** — On-attack — remove all debuffs from self (BURN, POISON, HEX, WEAKEN, SILENCE, TETHER, MARK, WITHER, BLIND)

---

### Targeting Summary
| Effect | Targets |
|--------|---------|
| Auto-attack | Varies by card_type |
| BURN / POISON / HEX / WEAKEN / DRAIN / CORRODE / WITHER / BLIND | Attack target |
| CHAIN | Attack target + 1 random nearby enemy (130px) |
| HEAL | Lowest HP ally within 90px |
| BLESS | All allies within 90px |
| INSPIRE | All allies on zone |
| SILENCE | Highest ATK enemy within 220px |
| MARK | Highest HP enemy within 220px |
| NULLIFY | Attack target |
| FEAST | Any enemy KO (zone-wide passive) |
| TAUNT | Forces all enemies to attack this Nine |
| SHATTER | All enemies within 120px on KO |
| INFECT | All enemies on zone on KO |

---

## 17. NOTABLE BUILD SYNERGIES

**The Predator** (Darktide): DRAIN + FEAST + MARK
Lifesteal on every hit. Feast on kills. Mark the highest HP target for focus fire.

**The Plague** (Plaguemire): CORRODE + POISON + WITHER
Rot maxHP over the round, stack DOT, nullify healing. Hard counter to Stonebark.

**The Unkillable Wall** (Stonebark): ANCHOR + THORNS + TAUNT
Force all enemies to hit you. Reflect 18%. Can't die during ANCHOR. Glass cannons kill themselves on your THORNS.

**The Speed Ghost** (Ashenvale): CHAIN + DODGE + HASTE
Fast, hits two targets, evades hits. Hard to pin down.

**The Shutdown** (Nighthollow/Manastorm): SILENCE + HEX + BLIND
Silence the strongest attacker, hex their ATK to -24, blind to strip LUCK. Triple debuff.

**The War Commander** (Dawnbringer): INSPIRE + BLESS + HEAL
Buff all allies, AOE heal, personal heal. Useless solo. Invaluable in guild fights.

**The Burst Finisher** (Stormrage): CRIT + CHAIN + EXECUTE
High crit chance, chain hits 2 targets, execute punishes wounded enemies. Snowballs.

### Simulation-verified matchup notes
- Tank beats burst 1v1 (glass cannons die to THORNS reflection over time) — intended
- DOT beats tank 1v1 (~50s) — fast but acceptable; counter is CLEANSE + healer allies
- 1v1 matchups are rare end-of-round scenarios; guild fights are where balance really lives

---

## 18. ITEMS

Items add raw stats (5-20 per stat). A full Legendary set ≈ one Common card in value.

### Slots (3 equipped: Weapon, Outfit, Hat)
| Slot | Focus |
|------|-------|
| Weapon | ATK focused |
| Outfit | HP/DEF focused |
| Hat | Utility/LUCK focused |

Passive and global — apply across all zones. No sharpness.

---

## 19. DAILY PACKS

- 1 free pack per day on login (5 random cards, independent rarity rolls)
- Pool: all 84 cards (all houses + universal)
- Cards selected in the deploy modal before confirming

---

## 20. LEVELING SYSTEM

Leveling unlocks things — it does NOT increase base stats.

### XP Sources (Permanent — Never Resets)
| Action | XP |
|--------|-----|
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

### Key Milestones
| Level | Unlock |
|-------|--------|
| 1 | Start — 2 zone slots |
| 3 | Trinket slot 1 |
| 8 | Trinket slot 2 |
| 10 | 3rd zone slot + cosmetic border |

---

## 21. GAME MODES

### Zone Battles — The Core Mode
Round-based spatial auto-combat. Deploy → equip 3 cards → fight. Rounds end on last guild standing or 5-min cap. 25s intermission. Full HP reset each round. Sharpness -1% per round end.

### Quick Duels (1v1 PvP)
Best of 3. Reveal a card simultaneously — higher ATK deals damage. No sharpness loss.

### The Gauntlet (Solo PvE)
Sequential AI battles, each harder. Daily reset. Item drops at floors 5, 10, 15. No sharpness loss.

### Weekly Boss (Guild PvE Raid)
Monday–Friday. Scales with player count. AOE attacks. Sharpness degrades as normal.

---

## 22. LEADERBOARDS

| Board | Ranks By |
|-------|---------|
| Player (main) | Individual season points |
| Guild | Member points + zone round wins |
| House | Average points of active members |
| Duel | Elo rating (1000 base) |
| Gauntlet | Highest floor reached |
| Zone Control | Total rounds controlled |

---

## 23. $9LV TOKEN ECONOMY

Points convert to $9LV tokens. Starting ratio: 1 point = 1 $9LV. Vesting: 7 days before claimable, 7 more before tradeable.

### Wizard Ranks — COSMETIC ONLY
| Rank | Perks |
|------|-------|
| Apprentice | Base game |
| Initiate | Profile border glow |
| Adept | +1 bonus pack/week |
| Mage | Animated card backs |
| Archmage | Gold name on leaderboard |
| Grand Sorcerer | Custom card frame |

---

## 24. QUICK REFERENCE (V4)

```
STAT ADDITION:         total = house + card1 + card2 + card3
ATTACK INTERVAL:       max(2.5, 7.5 - SPD × 0.10) seconds
CARD CYCLE:            max(5.5, 12.0 - SPD × 0.10) seconds
DAMAGE:                ATK² / (ATK + DEF)
CRIT CHANCE (base):    LUCK × 0.3 / 100
CRIT CHANCE (CRIT):    LUCK / 100
CRIT DAMAGE:           2× normal (3× with Stormrage zone bonus)

SERVER TICK:           200ms (5 updates/second)
ROUND END:             Last guild standing OR 5-minute hard cap
INTERMISSION:          25 seconds
HP RESET:              Full HP at every round start
STATUS RESET:          All effects cleared at round start
SESSION TIMER:         2 hours then auto-withdraw
KO IN ROUND:           Wait for next round (no mid-round rejoin)

MOVEMENT:              South Park style — bob + waddle + idle sway
LERP:                  0.02 base, scales with house SPD
Z-SORT:                Lower Y = rendered in front

SHARPNESS LOSS:        -1% per round end
ZONE IDENTITY:         Recalculates midnight UTC daily

POISON:                3% maxHP × stacks, every 1.5s (time-based)
BURN:                  6 × stacks, every 1.0s (time-based)
CORRODE:               -15 maxHP, 5s real-time CD
HEX:                   -8 ATK/stack, max -24
WARD:                  Blocks 1 hit — will NOT reapply while active
HEAL:                  7% own maxHP
BLESS:                 4% own maxHP to nearby allies (90px)
DRAIN:                 20% lifesteal
THORNS:                18% reflected
BARRIER:               50 flat absorption

SCORING (zone):        KO +10 (immediate) | Alive +5 | Control +8 | Flip +15
KO CREDIT:             Last damage source: auto-attack, DOT applier, CHAIN caster, SHATTER owner
LONE WOLF:             No ATK bonus — FFA makes it irrelevant

SLOT BONUSES:          Slot 1: ×1.35 | Slot 2: ×1.0 | Slot 3: ×1.5 (if target <40% HP)
ATK CARD MAX:          +10 (pure), +8 (hybrid)
SPD CARD MAX:          +8 each
ASHENVALE SPD:         22 base

EFFECTS ACTIVE:        36
CARDS:                 84 (12 Universal + 72 House)
HOUSES:                9
ZONES:                 27
```

---

## 25. PLAYTESTING WATCHLIST

Balance questions only real player behaviour can answer:

1. **Round length feel** — simulation median is ~80s for balanced 4v4. If consistently under 30s (burst-dominated) or over 4 minutes regularly (tank-stall), rebalance.

2. **DOT viability** — Plaguemire 1v1 vs tank: ~50s. In guild fights with healers and CLEANSE, may feel slower. Watch whether DOT players feel effective or irrelevant.

3. **Tank survivability** — Stonebark under full CORRODE pressure ends a 5-min round at ~160 maxHP. Should feel threatening but still functional through a full round.

4. **KO vs survival scoring** — simulation: glass cannons ~1.9× more pts/hr than tanks. Intentional (high risk/reward) but monitor whether tanks feel unrewarded.

5. **WARD timing post-fix** — brief vulnerability window between WARD expiring and next card cycle. Watch whether this feels punishing or correct.

6. **HEX post-fix** — Stormrage at -24 HEX: 16 ATK remaining (1.7 DPS). Should sting but not disable. Monitor whether Nighthollow/Manastorm players feel HEX is still worth running.

---

## 26. NERM — THE AI CAT

Nerm is Nine Lives Network's mascot — a floating cat head. Serves as Telegram moderator, Twitter/X bot personality, and in-game Chronicle character. Personality: sassy, knowledgeable, loves puns, slightly chaotic, speaks as if born in Nethara.

---

*Document updated April 15, 2026.*
*Supersedes 9LN_GAME_BIBLE_V3.md (March 19, 2026).*

*Changes from V3: round-based combat (replaces continuous + 15-min snapshots), last-guild-standing end condition, 5-min hard cap, 25s intermission, full HP + status reset per round, no mid-round rejoin, 2hr session timer, time-based DOT (POISON 1.5s / BURN 1.0s / CORRODE 5s CD), HEX -8 max-24, WARD no-reapply, lone wolf ATK bonus removed, scoring rebalanced (KO+10 / Alive+5 / Control+8 / Flip+15), KO credit extended to DOT/CHAIN/SHATTER sources, 200ms server tick, South Park movement (bob+waddle+idle sway), sharpness loss per round end not per snapshot.*
