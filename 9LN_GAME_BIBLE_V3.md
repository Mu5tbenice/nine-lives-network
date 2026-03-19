# NINE LIVES NETWORK — GAME BIBLE
## Single Source of Truth for All References
## Last Updated: March 19, 2026
## Combat V3 — Spatial combat, range-based targeting, house-locked effects
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

**The Battlefield (Web App):** Players deploy their Nines to zones in Nethara, equip 3-card loadouts, and fight for territory in continuous real-time auto-battles with 15-minute scoring snapshots. They also duel other players 1v1, run a solo PvE gauntlet, and raid weekly bosses with their guild.

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
3. Deploy Nine to zones, equip 3-card loadout in deploy modal, continuous auto-battles run.
4. Midday: Chronicle Act 2 — player replies, gets named in the story.
5. Check zones — did the guild hold? Swap cards via the loadout.
6. Afternoon: Chronicle Act 3 — the stakes rise.
7. Run Gauntlet, do some duels, contribute to weekly boss.
8. Evening: Chronicle Act 4 — the ending. Bonus points awarded.
9. Check final zone standings before midnight.
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

## 6. HOUSES — BASE STATS (Combat V3 Final)

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

A well-built guild wants house diversity: DPS (Smoulders/Stormrage), Tank (Stonebark), Support (Dawnbringer), Control (Nighthollow/Manastorm), DOT (Plaguemire), Speed (Ashenvale). All Stormrage = big damage but one SILENCE shuts you down.

Players without a guild are **Lone Wolves** — they get 1.5× ATK in combat to compensate for fighting alone.

Combat only fires between different guild tags. Two players in the same guild on the same zone do NOT fight each other.

---

## 8. STAT SYSTEM — PURE ADDITION

The core formula is simple addition. No multipliers. No conversions. What you see is what gets added.

```
total_atk  = house.atk  + card1.atk  + card2.atk  + card3.atk
total_hp   = house.hp   + card1.hp   + card2.hp   + card3.hp
total_spd  = house.spd  + card1.spd  + card2.spd  + card3.spd
total_def  = house.def  + card1.def  + card2.def  + card3.def
total_luck = house.luck + card1.luck + card2.luck + card3.luck
```

Card says ATK +8? Your Nine gains exactly 8 ATK. No hidden math.

### Card Stat Ceilings (V3 — balanced by simulation)
- Pure ATK cards: max +10 ATK
- Hybrid attack + effect cards: max +8 ATK
- Control/DOT/support cards: max +6 ATK
- Speed cards: max +8 SPD each (Ashenvale cards never hit the SPD floor)
- DEF cards: max +20 DEF (Stonebark cards)
- LUCK cards: max +20 LUCK (Nighthollow cards)

---

## 9. COMBAT FORMULAS

### Attack Speed
```
attack_interval = max(5.5, 10.5 - SPD × 0.12) seconds
```
**Floor raised to 5.5 seconds** (from 2.0s). This prevents speed-stacking from breaking combat.

| Total SPD | Attack Every |
|-----------|-------------|
| 10 | 9.3s (Stonebark tank) |
| 22 | 7.9s (Ashenvale base) |
| 30 | 6.9s (Stormrage/Nighthollow base) |
| 43 | 5.5s (Ashenvale + 3 speed cards — hits floor) |
| 50+ | 5.5s (capped) |

### Card Effect Cycle
```
card_cycle_interval = max(5.5, 12.0 - SPD × 0.10) seconds
```
Card effects rotate sequentially — slot 1 fires, then slot 2, then slot 3, repeat.

### Damage Per Hit
```
damage = ATK² / (ATK + DEF)
```
Minimum damage: 1. High DEF dramatically reduces incoming damage with diminishing returns.

### Critical Hits
```
crit_chance = LUCK / 100 × 0.3  (base luck chance)
```
Cards with CRIT effect get full LUCK/100 crit chance. Crits deal 2× damage.

BLIND effect zeroes the target's effective LUCK for 2 attacks — prevents crits.

### Slot Bonuses (damage only, not effect strength)
- Slot 1 (Opener): ×1.35 damage on auto-attack
- Slot 2 (Follow-up): ×1.0 (normal)
- Slot 3 (Closer): ×1.5 damage if target below 40% HP

---

## 10. SPATIAL COMBAT MODEL (V3)

### Overview
Combat is always happening. Every Nine has a position on the zone battlefield. **Where you are determines who you can attack and who can attack you.** Range is determined by your active card's type.

### Spell Ranges (logical pixels on arena)
| Range Type | Distance | Card Types |
|-----------|----------|-----------|
| Melee | 90px | attack cards |
| Mid-range | 220px | control cards |
| Ranged | 380px | DOT cards |
| AOE (self) | 120px radius | support cards |
| Self-cast | 0px | utility cards |
| Zone-wide | Infinite | INSPIRE, INFECT |

### Targeting by Card Type
Your Nine attacks whoever fits its card preference AND is within range:

| Card Type | Range | Prefers | If nobody in range... |
|-----------|-------|---------|----------------------|
| attack | 90px melee | Lowest HP enemy | Move toward closest enemy |
| control | 220px mid | Highest ATK enemy | Move toward highest ATK enemy |
| dot | 380px ranged | Highest HP enemy | Move toward highest HP enemy |
| support | 90px AOE | Lowest HP ally | Move toward wounded ally |
| utility | Self | Self | Hold position |

**This eliminates the death spiral.** A wounded Nine is only targeted by melee attack cards within 90px — maybe 2-3 Nines, not 20. They can retreat, dodge, or get healed. Sustain builds are viable.

**TAUNT override:** If any Nine has TAUNT active, ALL enemies on the zone must attack it — overrides all targeting rules.

### Movement
Each Nine moves toward a desired position based on its current card's range:
- Melee cards: close in to 70px from target (aggressive rush)
- Control cards: hold 180px from target (mid-distance pressure)
- DOT cards: hold 300px from target (backline safety)
- Support cards: orbit 60px from most wounded ally

Movement speed = `30 + (totalSPD × 1.2)` pixels per engine tick.
Stonebark: ~54px/tick. Stormrage: ~78px/tick. TAUNT: moves to zone centre and stops.

### Server Tick: Every 2 Seconds
Each tick:
1. Decrement all attack timers
2. Update desired positions every 2 ticks
3. Step movement toward desired position
4. If attack timer elapsed → resolve attack (range check must pass)
5. Apply POISON DOT every 3 ticks
6. Check KOs
7. Broadcast `arena:positions` to PIXI renderer

### 15-Minute Snapshot
Every 15 minutes: count total HP per guild. Highest HP guild controls the zone. Combat never pauses.

### Fight Timeout
After 300 ticks (~600s): winner = highest (HP/maxHP) ratio. Draw if within 5%.

---

## 11. SPELL CARDS

### Design Philosophy
Cards are the game. Each card has exactly ONE effect — its identity. Two cards can share an effect (e.g. two POISON cards from Plaguemire) but each has different stats.

Effects are thematically locked to houses. BURN only appears on Smoulders cards. POISON/CORRODE/WITHER only on Plaguemire. This means your loadout tells a story about how you fight.

### What Every Card Has
- Name (e.g. "Ember Strike")
- House (which house it belongs to, or Universal)
- card_type (attack / control / dot / support / utility) — drives targeting
- ATK, HP, SPD, DEF, LUCK stat bonuses
- effect_1 — exactly one effect
- Rarity (rolled on pull)
- Sharpness (0–100%)

### Card Types and Their Roles
| card_type | Targeting | Range | Stat Identity |
|-----------|-----------|-------|---------------|
| attack | Lowest HP enemy | Melee 90px | High ATK, sometimes SPD or LUCK |
| control | Highest ATK enemy | Mid 220px | LUCK/SPD focused, moderate ATK |
| dot | Highest HP enemy | Ranged 380px | Low ATK, HP for survivability |
| support | Lowest HP ally | AOE self 90px | HP/DEF, zero ATK |
| utility | Self | Self | SPD/DEF/LUCK — no enemy targeting |

### House Effect Identity (what effects appear on which house cards)
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

### Total: 84 Cards
12 Universal + 72 House-specific (8 per house × 9 houses).

---

## 12. SHARPNESS & CARD DEGRADATION

Every card has sharpness (0–100%). Zone combat degrades sharpness:

```
effective_stat = base_stat × (0.5 + sharpness / 200)
```
- 100% sharpness = 100% effectiveness
- 50% sharpness = 75% effectiveness
- 0% sharpness = 50% effectiveness (cards NEVER disappear)

### Sharpness Rules
- Zone combat: -1% per 15-minute snapshot
- Quick Duels: NO sharpness loss
- Gauntlet: NO sharpness loss

### Sharpening (Restoring Sharpness)
- 1 exact duplicate → restore to 100%
- 3 cards from same house → restore to 100%
- 5 cards of any kind → restore to 100%
- Sharpening Kit (consumable) → restore 50%

---

## 13. ALL EFFECTS (V3 Final — 36 Active Effects)

### Removed from V2 (not implemented in engine)
| Effect | Reason |
|--------|--------|
| GRAVITY | Unimplementable at scale — "all enemies hit you on deploy" breaks with 50 players |
| MIRROR | Infinite loop risk — MIRROR bouncing MIRROR creates recursive nightmares |
| PARASITE | Too many edge cases — who is the "host" at 50 players? |
| OVERCHARGE | Balance nightmare — doubles CORRODE, POISON etc. |
| SWIFT | Deploy-only gimmick with no ongoing relevance in zone warfare |
| RESURRECT | 5-minute cooldown effectively never fires; revisit Season 2 |
| SLOW | Merged into WEAKEN for simplicity |
| STEALTH | Merged into DODGE for simplicity |
| PHASE | Removed — movement system handles evasion now |
| AMPLIFY | Removed — too complex to track "next ally to attack" |
| LEECH AURA | Replaced by DRAIN (cleaner implementation) |

### Effect Values (V3 — balanced by simulation)
| Effect | Old Value | V3 Value | Notes |
|--------|-----------|----------|-------|
| HEAL | +10 to +25 flat | 7% own maxHP | Scales with tank builds |
| BLESS | +5 HP to 3 allies | 4% caster maxHP | Encourages healer to stay near allies |
| DRAIN | 5% leech | 20% leech | Vampire builds viable now |
| BURN | +3 to +8 flat | 6 per stack | More predictable |
| POISON | +3 flat tick | 3% target maxHP per stack | Scales vs tanks correctly |
| CORRODE | -1 max HP/10s aura | -15 max HP on-attack, 10-tick CD | No longer passive zone-wide aura |
| THORNS | 15 flat reflect | 18% of damage reflected | Scales with attacker's ATK |
| BARRIER | 30-50 absorption | 50 flat absorption | Consistent |

### New Effects (V3 additions)
| Effect | House | Trigger | Description |
|--------|-------|---------|-------------|
| BLIND | Nighthollow | On-attack | Target's LUCK = 0 for 2 attacks — no crits, DODGE won't activate |
| WITHER | Plaguemire | On-attack | Target's HEAL, BLESS, BARRIER are 50% less effective for 3 attacks |
| NULLIFY | Manastorm | On-attack | Strip one active buff (WARD → BARRIER → ANCHOR → HASTE → DODGE in priority) |

### Effect Stacking Rules
- Numeric effects (BURN, POISON, HEX): Stack ×3 max. 1st: 100%, 2nd: 75%, 3rd: 50%.
- Binary effects (SILENCE, WARD, ANCHOR, DODGE): On/off only, don't stack.

### Timed Effect Duration by Rarity
| Rarity | Duration |
|--------|----------|
| Common | 8 seconds |
| Uncommon | 9 seconds |
| Rare | 10 seconds |
| Epic | 11 seconds |
| Legendary | 12 seconds |

---

### ATTACK EFFECTS

**BURN** — On-attack — 6 per stack
Extra fire damage per hit. Stacks ×3. Smoulders exclusive.

**CHAIN** — On-attack — hits 2 targets
Primary hit on attack target, second hit on random nearby enemy (within 130px of primary).

**EXECUTE** — On-attack — +50% damage
Bonus damage to enemies below 30% HP. The finisher.

**SURGE** — Passive — +50% ATK / takes extra damage
Berserker mode. More damage dealt, more fragile.

**PIERCE** — On-attack — bypasses shields
Ignores WARD and BARRIER.

**CRIT** — On-attack — full LUCK crit chance
This card procs crit at full LUCK% (vs base 30% of LUCK). Stormrage exclusive.

---

### DEFENCE EFFECTS

**HEAL** — On-attack — 7% own maxHP
Heals lowest HP ally within 90px (AOE self range). If no ally nearby, heals self.

**WARD** — Timed — block 1 hit
Next incoming hit deals 0 damage. Bypassed by PIERCE.

**ANCHOR** — Timed — can't die
Can't drop below 1 HP during window. Stonebark exclusive.

**THORNS** — Passive — 18% of damage reflected
Reflect 18% of each hit back to attacker.

**BARRIER** — Passive — 50 absorption
Absorbs 50 total damage. Gone when broken. Bypassed by PIERCE.

---

### CONTROL EFFECTS

**SILENCE** — Timed — suppress effects
Targets highest ATK enemy within mid-range (220px). Effects blocked for 2 attacks.

**HEX** — On-attack — -12 ATK/stack, max -35
Reduces target ATK. Stacks ×3. Nighthollow exclusive.

**WEAKEN** — Timed — target deals 50% damage
Lasts 2 of target's attacks.

**DRAIN** — On-attack — 20% lifesteal
Heal self for 20% of damage dealt.

**FEAST** — On-KO — 15% of dead enemy maxHP
Zone-wide. Triggers whenever any enemy on the zone dies.

**TETHER** — On-attack — 50/50 damage split
All damage this Nine deals is split 50/50 with the tethered target. Lasts 3 attacks.

**MARK** — On-attack — +25% damage taken
Tags highest HP enemy. All sources deal +25% to them. Lasts 3 attacks.

**BLIND** — On-attack — LUCK = 0 for 2 attacks
Target cannot crit, DODGE won't activate. Nighthollow exclusive.

**NULLIFY** — On-attack — strip one buff
Removes first active buff found: WARD → BARRIER → ANCHOR → HASTE → DODGE. Manastorm exclusive.

---

### TEMPO EFFECTS

**HASTE** — On-attack — +10 SPD for 3 attacks
Speed burst. Recalculates attack interval immediately.

**DODGE** — Utility — next hit evaded
Activates when card fires. The incoming hit is fully evaded.

---

### ATTRITION EFFECTS

**POISON** — On-attack — 3% maxHP per stack per 3 ticks
DOT that ticks every 3 engine ticks. Stacks ×3. Plaguemire exclusive.

**CORRODE** — On-attack — -15 maxHP
Target permanently loses 15 max HP. 10-tick internal cooldown. Plaguemire exclusive.

**WITHER** — On-attack — 50% heal reduction for 3 attacks
Target's HEAL, BLESS, BARRIER are half as effective. Plaguemire exclusive.

**INFECT** — On-KO — spreads POISON
When this Nine is KO'd, all enemies on zone get 1 POISON stack.

---

### TEAM EFFECTS

**INSPIRE** — On-attack — +2 ATK, +2 SPD to all allies
Zone-wide ally buff. Dawnbringer/support identity.

**BLESS** — On-attack — 4% own maxHP to nearby allies
Heals all allies within 90px AOE.

**TAUNT** — Utility — force all enemies to target you
All enemies must attack the taunting Nine. Zone-wide override. Stonebark identity.

**SHATTER** — On-KO — 10% maxHP as AOE damage
On death, deals 10% of own maxHP to all enemies within 120px.

**REFLECT** — Utility — bounce next hit back at full damage
Next incoming hit is bounced back at full damage. Consumed on trigger.

**CLEANSE** — On-attack — remove all debuffs from self
Clears: BURN, POISON, HEX, WEAKEN, SILENCE, TETHER, MARK, WITHER, BLIND.

---

### Targeting Summary
| Effect | Targets |
|--------|---------|
| Auto-attack | Varies by card_type (see section 10) |
| BURN/POISON/HEX/WEAKEN/DRAIN/CORRODE/WITHER/BLIND | Applied to attack target |
| CHAIN | Attack target + 1 random nearby enemy |
| HEAL | Lowest HP ally within 90px |
| BLESS | All allies within 90px |
| INSPIRE | All allies on zone |
| SILENCE | Highest ATK enemy within 220px |
| MARK | Highest HP enemy within 220px |
| NULLIFY | Attack target (strips their buffs) |
| FEAST | Any enemy KO on zone (passive trigger) |
| TAUNT | Forces all enemies to attack this Nine |
| SHATTER | All enemies within 120px on KO |
| INFECT | All enemies on zone on KO |

---

## 14. NOTABLE BUILD SYNERGIES (V3)

**The Predator** (Darktide): DRAIN + FEAST + MARK
Lifesteal 20% of every hit. Feast on kills. Mark the highest HP target for coordinated focus.

**The Plague** (Plaguemire): CORRODE + POISON + WITHER
Rot enemy maxHP, stack DOT, nullify their healing. Specifically counters healer builds.

**The Unkillable Wall** (Stonebark): ANCHOR + THORNS + TAUNT
Force ALL enemies to hit you. Reflect 18% of every hit. Can't die during ANCHOR window.

**The Speed Ghost** (Ashenvale): CHAIN + DODGE + HASTE
Fast rotation, hits two targets per attack, evades incoming hits. Hard to pin down.

**The Shutdown** (Nighthollow/Manastorm): SILENCE + HEX + BLIND
Silence the strongest attacker, hex away their ATK, blind to strip LUCK. Triple debuff.

**The War Commander** (Dawnbringer): INSPIRE + BLESS + HEAL
Buff all allies, AOE heal nearby allies, personal heal. Requires allies in proximity.

**The Corrode Tank** (Plaguemire vs Stonebark): CORRODE + CORRODE + WITHER
DOT cards target highest HP enemies — specifically Stonebark. Two CORRODE stacks = -30 maxHP every 10 ticks. WITHER stops Stonebark healing. The hard counter to wall builds.

**The Burst Finisher** (Stormrage): CRIT + CHAIN + EXECUTE
High LUCK crit chance. Chain hits 2 targets. Execute punishes low HP. Snowball combo.

---

## 15. ITEMS

Items add raw stats directly (5-20 per stat). Supplementary — a full Legendary set is worth roughly one Common card.

### Item Slots (3 equipped: Weapon, Outfit, Hat)
| Slot | Focus |
|------|-------|
| Weapon | ATK focused |
| Outfit | HP/DEF focused |
| Hat | Utility/LUCK focused |

Items are passive and global — equipped on your Nine, apply across ALL zones. No sharpness.

---

## 16. DAILY PACKS

- 1 free pack per day on login
- Contents: 5 random cards with independent rarity rolls
- Pool: All 84 cards (all houses + universal), any can appear
- Cards selected in the deploy modal — must pick before confirming deploy

---

## 17. LEVELING SYSTEM

### Level ≠ Power
Leveling does NOT increase base stats. A level 1 and level 50 player have the same house stats.

### XP Sources (Permanent — Never Resets)
| Action | XP |
|--------|-----|
| Survive a combat snapshot | +2 |
| Win a combat snapshot | +3 |
| Deal a KO | +5 |
| Win a Quick Duel | +4 |
| Lose a Quick Duel | +1 |
| Complete Gauntlet floor | +3 per floor |
| Boss damage snapshot | +3 |
| Boss kill participation | +15 |
| Chronicle reply (any act) | +5 |
| Named in Chronicle story | +10 |
| Daily login | +5 |
| Flip a zone to your guild | +8 |

### Key Milestones
| Level | Unlock |
|-------|--------|
| 1 | Start. 2 zone slots |
| 3 | Trinket slot 1 |
| 8 | Trinket slot 2 |
| 10 | 3rd zone slot + cosmetic border |

---

## 18. GAME MODES

### Zone Battles (Territory Warfare) — The Core Mode
- Deploy Nine to zone, equip 3 cards in deploy modal (cards selected before confirming deploy)
- Continuous real-time spatial combat — position matters, range matters
- 15-minute snapshots score zone control
- Guild with highest surviving total HP at snapshot controls the zone
- Cards locked to that zone while deployed — can't equip the same card to two zones
- Sharpness degrades -1% per snapshot

### Quick Duels (1v1 PvP)
- No sharpness loss
- Format: Both players reveal a card simultaneously. Higher ATK deals damage. Best of 3 rounds.
- Fast mode. No risk.

### The Gauntlet (Solo PvE)
- No sharpness loss
- Sequential AI battles, each harder
- Daily reset
- Item drops at floor 5, 10, 15

### Weekly Boss (Guild PvE Raid)
- Appears Monday, must die by Friday
- Sharpness degrades as normal
- Boss AOE attacks all Nines simultaneously

---

## 19. ZONE STRUCTURE & IDENTITY

### Structure
27 zones total. There are no fixed "home zones" or regions — any house can fight on any zone. Zones are purely aesthetic environments players choose based on preference. All zones are always fully contestable.

### Two Daily Systems: House Presence Bonus + Guild Branding

Every zone develops an **identity** based on who fought there yesterday. Two things are tracked independently:

---

### House Presence Bonus

**What it is:** At midnight, the game counts how many fighters from each house were deployed on each zone during the previous day. The house with the most fighters "claimed" the zone. The next day, ALL fighters on that zone — regardless of their house or guild — benefit from that house's bonus.

**Why global (not house-specific):** Making it global creates real strategic decisions. Guilds coordinate to flood a zone with a specific house to "set" the bonus they want tomorrow. A guild of mostly Stormrage players might send their Stonebark tanks to claim zone 7 so everyone gets +25% HP there tomorrow.

**How it's calculated:** Simple fighter count, not HP. One deployed Nine = one vote. This is house-neutral — Stonebark's massive HP pool gives no advantage in the count.

**The bonuses:**

| House Claims the Zone | Bonus — Applied to ALL fighters there next day |
|----------------------|------------------------------------------------|
| 🔥 Smoulders | +20% ATK |
| 🌊 Darktide | All fighters regenerate 3% of their max HP every minute |
| 🌿 Stonebark | +25% max HP |
| 💨 Ashenvale | +15% SPD |
| ⚡ Stormrage | Critical hits deal 3× damage instead of 2× |
| 🌙 Nighthollow | +10 LUCK for all fighters |
| ☀️ Dawnbringer | All HEAL and BLESS effects are 50% stronger |
| 🔮 Manastorm | All card effects are 30% stronger |
| ☠️ Plaguemire | All fighters on the zone start each day with 1 POISON stack on their enemies |

**No bonus:** If a zone had no fighters the previous day, it has no house bonus until someone shows up.

---

### Guild Branding

**What it is:** The guild with the highest total fighter presence (count × hours deployed) on a zone yesterday gets their tag displayed on that zone for the entire next day. Purely cosmetic — no stat effect.

**Display examples:**
- Zone card header: `⚔️ Branded by [BONK]`
- Zone detail page shows the guild's tag prominently
- Zone list badge shows the branding

**Why it matters:** This is how meme coin communities and guilds get their name seen. Coordinating your whole guild to flood a zone gets your brand on the map. It's free advertising inside the game and a genuine incentive for guild coordination beyond just winning points.

**Branding resets every day at midnight** based on the previous day's presence.

---

### Zone Identity Changes Nightly
Both the house bonus and the guild branding are recalculated at midnight UTC. A zone's identity can shift every single day depending on who showed up. A zone that was a Smoulders ATK zone yesterday could be a Dawnbringer HEAL zone tomorrow if enough healers deployed there.

---

## 20. SCORING & POINTS

Points are seasonal (reset each season). XP is permanent (never resets).

| Action | Points (Seasonal) | XP (Permanent) |
|--------|-------------------|----------------|
| Deploy to a zone | +5 | — |
| Survive combat snapshot | +3 | +2 |
| Win combat snapshot | +5 | +3 |
| Deal a KO | +10 | +5 |
| Flip zone to guild | +15 | +8 |
| Hold zone full day | +25 | +10 |
| Win Quick Duel | +8 | +4 |
| Lose Quick Duel | +2 | +1 |
| Gauntlet floor | +3/floor | +3/floor |
| Boss damage snapshot | +4 | +3 |
| Boss kill participation | +20 | +15 |
| Boss kill — top guild | +25 bonus | — |
| Boss kill — top player | +50 bonus | — |
| Killing blow | +30 bonus | — |
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

## 21. LEADERBOARDS

| Board | What It Ranks |
|-------|--------------|
| Player (main) | Individual season points |
| Guild | Member points + zone bonuses |
| House | Average points of active members |
| Duel | Separate Elo rating |
| Gauntlet | Highest floor reached |
| Zone Control | Total snapshots of control |

---

## 22. $9LV TOKEN ECONOMY

$9LV is live on Solana. Points convert to $9LV tokens.

### Conversion
- Starting ratio: 1 point = 1 $9LV
- Vesting: 7 days before claimable, 7 more before tradeable

### Wizard Ranks — COSMETIC ONLY (never give combat advantage)
| Rank | Perks |
|------|-------|
| Apprentice | Base game |
| Initiate | Profile border glow |
| Adept | +1 bonus pack/week |
| Mage | Animated card backs |
| Archmage | Gold name on leaderboard |
| Grand Sorcerer | Custom card frame |

---

## 23. QUICK REFERENCE (V3)

```
STAT ADDITION:         total = house + card1 + card2 + card3
ATTACK INTERVAL:       max(5.5, 10.5 - SPD × 0.12) seconds
CARD CYCLE:            max(5.5, 12.0 - SPD × 0.10) seconds
DAMAGE:                ATK² / (ATK + DEF)
CRIT CHANCE (base):    LUCK × 0.3 / 100
CRIT CHANCE (CRIT card): LUCK / 100
CRIT DAMAGE (default): 2× normal
CRIT DAMAGE (Stormrage zone): 3× normal

COMBAT MODEL:          Continuous spatial — position and range matter
SERVER TICK:           Every 2 seconds
ZONE SNAPSHOT:         Every 15 minutes (scores zone control for points)
KO COOLDOWN:           1 minute (that zone only)
SHARPNESS LOSS:        -1% per snapshot
FIGHT TIMEOUT:         300 ticks

ZONE IDENTITY:         Recalculates at midnight UTC each day
ZONE BONUS:            Based on dominant house fighter count (NOT HP) from previous day
ZONE BRANDING:         Guild with highest presence (count × hours) gets their tag displayed
ZONE BONUS APPLIES TO: ALL fighters on the zone regardless of house or guild

HOUSE BONUSES:
  smoulders   → +20% ATK
  darktide    → +3% max HP regen per minute
  stonebark   → +25% max HP
  ashenvale   → +15% SPD
  stormrage   → crits deal 3× instead of 2×
  nighthollow → +10 LUCK
  dawnbringer → HEAL and BLESS +50% strength
  manastorm   → all card effects +30% strength
  plaguemire  → enemies start with 1 POISON stack

SPELL RANGES:          Melee 90px / Mid 220px / Ranged 380px / AOE-self 120px
TARGETING:             Driven by card_type — NOT always lowest HP
MOVEMENT SPEED:        30 + (totalSPD × 1.2) px/tick

HOUSE SPD RANGE:       10 (Stonebark) to 30 (Stormrage/Nighthollow)
ASHENVALE SPD:         22 base (reduced from 38 — V3 fix)
ATK CARD MAX:          +10 ATK (pure), +8 ATK (hybrid)
SPD CARD MAX:          +8 SPD each

HEAL:                  7% own maxHP
BLESS:                 4% own maxHP to nearby allies
DRAIN:                 20% lifesteal
BURN:                  6 per stack
POISON:                3% target maxHP per stack per 3 ticks
CORRODE:               -15 maxHP on-attack, 10-tick CD
THORNS:                18% of damage reflected

EFFECTS ACTIVE:        36
EFFECTS CUT (V3):      GRAVITY, MIRROR, PARASITE, OVERCHARGE, SWIFT,
                       RESURRECT, SLOW, STEALTH, PHASE, AMPLIFY, LEECH AURA
EFFECTS ADDED (V3):    BLIND, WITHER, NULLIFY

CARDS TOTAL:           84 (12 Universal + 72 House, 8 per house)
HOUSES:                9
ZONES:                 27
```

---

## 24. NERM — THE AI CAT

Nerm is Nine Lives Network's mascot and AI character — a floating cat head. Serves as:
- Telegram group moderator and helper bot
- Twitter/X bot personality (@9LVNetwork)
- In-game character that appears in Chronicle stories

Personality: sassy, knowledgeable, loves puns, slightly chaotic. Speaks as if it's lived in Nethara for centuries.

---

*Document updated March 19, 2026. Zone V2 — house presence bonuses (global, fighter-count based, nightly reset), guild branding (cosmetic, nightly reset), old region bonus system removed. Combat V3 base unchanged.*
