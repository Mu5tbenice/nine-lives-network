# NINE LIVES NETWORK — GAME BIBLE
## Single Source of Truth for All References
## Last Updated: March 17, 2026
## Combat V3 — Spatial combat, range-based targeting, house-locked effects

---

## 1. IDENTITY

| Property | Value |
|----------|-------|
| Game Name | Nine Lives Network |
| Game Title (gaming contexts) | Nines of Nethara |
| World Name | Nethara |
| Players Are Called | Nines |
| Individual Character | "a Nine" |
| NFT Collection (Season 2+) | The Nines (2,500 Genesis) |
| Token | $9LV |
| Token Address | CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump |
| Chain | Solana (live on Pump.fun) |
| Website | 9lv.net |
| Twitter | @9LVNetwork |
| Mascot / AI Character | Nerm — a floating cat head, Telegram moderator and Twitter bot |

---

## 2. WHAT IS NINE LIVES NETWORK?

Nine Lives Network is a card collection auto-battler with two parallel experiences:

**The Chronicle (Twitter/X):** @9LVNetwork posts a daily four-act story. Players reply in character as their Nine. The bot weaves them into the narrative. The ending is unpredictable. This is the social game.

**The Battlefield (Web App):** Players deploy their Nines to zones in Nethara, equip 3 spell cards, and fight for territory in continuous real-time auto-battles with 15-minute scoring snapshots. They also duel other players 1v1, run a solo PvE gauntlet, and raid weekly bosses with their guild.

Every spell card has 5 stats (ATK, HP, SPD, DEF, LUCK) plus 1 effect. Your Nine has base stats from its house. Spell cards are its weapons — they add stats, determine spell range, and trigger combat effects. Position on the battlefield matters.

---

## 3. CORE DAILY LOOP

1. Open daily pack (5 cards).
2. Deploy Nine to a zone — select 3 spell cards in the deploy modal before confirming.
3. Continuous auto-battle runs. Check back to see how the guild is doing.
4. Reply to the Chronicle on Twitter.
5. Run Gauntlet or do some duels.
6. Check final zone standings before midnight.

---

## 4. YOUR NINE

### Everyone Gets One
Register and pick a house — your Nine exists immediately. No NFT needed. No purchase required.

### House Rules
- House can be switched once per week — points do NOT carry over
- No "home zones" — all 9 zones are contestable by anyone
- House determines base stats and which effects appear on your cards

---

## 5. HOUSES — BASE STATS (V3 Final)

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
| Darktide | 🌊 | 25 | 450 | 20 | 20 | 10 | Vampire |

### Design Notes
- Stormrage = highest ATK, lowest HP/DEF — pure glass cannon
- Stonebark = lowest ATK, highest HP/DEF — pure wall
- **Ashenvale base SPD is 22** (reduced from 38 in V2 — was hitting the speed floor with cards)
- Nighthollow has highest LUCK (25)
- Healers and tanks (Dawnbringer, Stonebark) are designed for group play — they lose 1v1 by design. Their value is keeping allies alive and anchoring zones.

---

## 6. GUILDS

House = Class (how you fight). Guild = Faction (who you fight for).

A well-built guild wants house diversity: DPS (Smoulders/Stormrage), Tank (Stonebark), Support (Dawnbringer), Control (Nighthollow/Manastorm), DOT (Plaguemire), Speed (Ashenvale).

Players without a guild are **Lone Wolves** — they get 1.5× ATK in combat to compensate.

**Combat only fires between different guild tags.** Two players in the same guild on the same zone do not fight each other.

---

## 7. STAT SYSTEM — PURE ADDITION

```
total = house_stat + card1_stat + card2_stat + card3_stat
```

No multipliers. No conversions. Card says ATK +8? Your Nine gains exactly 8 ATK.

### Card Stat Ceilings (V3)
- Pure ATK cards: max +10 ATK
- Hybrid attack + effect cards: max +8 ATK
- Control/support cards: max +6 ATK
- Speed cards: max +8 SPD each
- DEF cards (Stonebark): max +20 DEF
- LUCK cards (Nighthollow): max +20 LUCK

---

## 8. COMBAT FORMULAS

### Attack Speed
```
attack_interval = max(5.5, 10.5 - SPD × 0.12) seconds
```
Floor is **5.5 seconds** — prevents speed stacking from breaking combat.

### Spell Card Cycle
```
card_cycle_interval = max(5.5, 12.0 - SPD × 0.10) seconds
```
Cards rotate sequentially: slot 1 → slot 2 → slot 3 → repeat.

### Damage Per Hit
```
damage = ATK² / (ATK + DEF)
```
Minimum 1. High DEF dramatically reduces damage.

### Critical Hits
```
base_crit_chance  = LUCK × 0.3 / 100
CRIT card chance  = LUCK / 100
crit_damage       = 2×
```

### Slot Bonuses (damage only, not effect strength)
- Slot 1 (Opener): ×1.35 damage
- Slot 2 (Follow-up): ×1.0
- Slot 3 (Closer): ×1.5 if target below 40% HP

---

## 9. SPATIAL COMBAT MODEL (V3)

### Overview
Every Nine has a position on the zone battlefield. **Spell range determines who you can affect.** Each spell card has a range that matches its flavour — a poison dart flies further than a fire breath. Position is real and affects outcomes.

### Spell Ranges
| Range | Distance | Typical Spells |
|-------|----------|----------------|
| Close | 90px | BURN, CHAIN, DRAIN, EXECUTE, SURGE — requires proximity |
| Mid | 220px | SILENCE, HEX, WEAKEN, MARK, TETHER — projected spells |
| Long | 380px | POISON, CORRODE, WITHER — thrown/mist effects |
| AOE self | 120px radius | HEAL, BLESS, INSPIRE — centred on caster |
| Self-cast | — | WARD, ANCHOR, DODGE, BARRIER — protective spells |
| Zone-wide | Infinite | INFECT, FEAST, SHATTER — on-KO events |

### Targeting by Spell Type
Within range, each Nine picks the best target based on its active card's **spell_type**:

| Spell Type | Prefers |
|------------|---------|
| attack | Lowest HP enemy in range |
| manipulation | Highest ATK enemy in range |
| support | Lowest HP ally in range **including self** |
| defend | Self |
| utility | Self or hold position |

**Heals and buffs always include self as a valid target.** A lone Nine with a HEAL card heals themselves. A Dawnbringer near allies heals the most wounded.

**This eliminates the death spiral.** A wounded Nine is only targeted by close-range attack spell casters within 90px — not the whole zone. They can retreat, dodge, or get healed by a nearby Dawnbringer.

**TAUNT override:** Forces all enemies on the zone to target the taunting Nine — overrides all other targeting.

### Movement
Each Nine moves to put their current spell in range of their preferred target:

| Spell Range | Desired Distance | Feel |
|-------------|-----------------|------|
| Close | ~70px | Aggressive — closes in fast |
| Mid | ~180px | Deliberate — holds distance |
| Long | ~300px | Careful — stays at the back |
| Support/AOE | ~60px from wounded ally | Protective — orbits allies |
| TAUNT | Zone centre | Plants and holds |

Movement speed = `30 + (totalSPD × 1.2)` pixels per engine tick.

### Server Tick: Every 2 Seconds
1. Decrement attack timers
2. Update movement targets every 2 ticks
3. Step positions
4. POISON DOT every 3 ticks
5. Attack timer elapsed → range check → resolve
6. KO check
7. Broadcast positions to renderer

### 15-Minute Snapshot
Highest total HP guild controls the zone. Combat never pauses.

---

## 10. SPELL CARDS

### What Every Card Has
- **Name** — e.g. "Ember Strike"
- **House** — which house it belongs to
- **spell_type** — attack / manipulation / support / defend / utility
- **effect_1** — exactly one effect
- **Stats** — ATK, HP, SPD, DEF, LUCK bonuses
- **Rarity** — Common → Legendary
- **Sharpness** — 0–100%

### House Effect Identity
| House | Their Spell Effects |
|-------|-------------------|
| Stormrage ⚡ | CRIT, PIERCE, CHAIN, SURGE, EXECUTE, WARD |
| Smoulders 🔥 | BURN, EXECUTE, THORNS, SURGE |
| Stonebark 🌿 | ANCHOR, WARD, THORNS, HEAL, WEAKEN |
| Ashenvale 💨 | DODGE, CHAIN, HASTE, WEAKEN |
| Nighthollow 🌙 | HEX, BLIND, SILENCE, MARK, DODGE |
| Dawnbringer ☀️ | HEAL, BLESS, INSPIRE, BARRIER, EXECUTE, PIERCE |
| Manastorm 🔮 | TETHER, NULLIFY, WEAKEN, DRAIN, SILENCE, SURGE, BARRIER |
| Plaguemire ☠️ | POISON, CORRODE, WITHER, BARRIER |
| Darktide 🌊 | DRAIN, MARK, SURGE, TETHER, WARD, CHAIN, BARRIER |

### Total: 84 Cards
12 Universal + 72 House-specific (8 per house × 9 houses).

---

## 11. SHARPNESS & CARD DEGRADATION

```
effective_stat = base_stat × (0.5 + sharpness / 200)
```
- 100% = full power. 0% = 50% power. **Cards never disappear.**

- Zone combat: -1% per 15-minute snapshot
- Duels and Gauntlet: NO sharpness loss

### Restoring Sharpness
- 1 exact duplicate → 100%
- 3 cards same house → 100%
- 5 cards any kind → 100%
- Sharpening Kit → +50%

---

## 12. ALL EFFECTS (V3 — 36 Active)

### Removed in V3 (with reasons)
| Effect | Reason |
|--------|--------|
| GRAVITY | Breaks at 50 players — "all enemies hit you" is unimplementable at scale |
| MIRROR | Infinite loop when MIRROR meets MIRROR |
| PARASITE | "Attach to host" — who is the host at 50 players? |
| OVERCHARGE | Doubles CORRODE/POISON — balance nightmare |
| SWIFT | Deploy-only gimmick, no ongoing zone warfare relevance |
| RESURRECT | 5-min cooldown effectively never fires — Season 2 candidate |
| SLOW | Merged into WEAKEN |
| STEALTH | Merged into DODGE |
| PHASE | Movement system handles evasion |
| AMPLIFY | "Next ally to attack" — impossible to track cleanly at scale |
| LEECH AURA | Replaced by DRAIN |

### New in V3
| Effect | House | Description |
|--------|-------|-------------|
| BLIND | Nighthollow | Target LUCK = 0 for 2 attacks — no crits, DODGE won't activate |
| WITHER | Plaguemire | Target's HEAL/BLESS/BARRIER 50% less effective for 3 attacks |
| NULLIFY | Manastorm | Strip one active buff (WARD → BARRIER → ANCHOR → HASTE → DODGE priority) |

### Effect Values (V3 Balanced)
| Effect | Value |
|--------|-------|
| HEAL | 7% of caster's own maxHP |
| BLESS | 4% of caster's own maxHP to all nearby allies |
| DRAIN | 20% of damage dealt as HP |
| BURN | 6 damage per stack per hit |
| POISON | 3% of target maxHP per stack every 3 ticks |
| CORRODE | -15 target maxHP on-attack, 10-tick cooldown |
| THORNS | 18% of incoming damage reflected |
| BARRIER | 50 absorption (flat) |
| HEX | -12 ATK per stack, max -35 |
| INSPIRE | +2 ATK, +2 SPD to all zone allies |
| HASTE | +10 SPD for 3 attacks |

### Stacking
- Numeric effects: max 3 stacks. 1st: 100%, 2nd: 75%, 3rd: 50%
- Binary effects: on/off, no stacking

### Duration by Rarity
Common 8s / Uncommon 9s / Rare 10s / Epic 11s / Legendary 12s

---

### ATTACK SPELL EFFECTS

**BURN** — Close range — 6 per stack
Fire breath. Requires proximity. Smoulders exclusive. Stacks ×3.

**CHAIN** — Close range — hits 2 targets
Primary hit + second hit on random nearby enemy within 130px.

**EXECUTE** — Close range — +50% damage below 30% HP
The finisher. Punishes low HP enemies.

**SURGE** — Passive — +50% ATK / more damage taken
Berserker mode.

**PIERCE** — Close range — bypasses WARD and BARRIER
Hard counter to shields.

**CRIT** — Close range — full LUCK crit chance
Stormrage exclusive. Full LUCK% chance (vs base 30% of LUCK).

---

### DEFENCE SPELL EFFECTS

**HEAL** — AOE self — 7% own maxHP
Heals the lowest HP target within 90px including self. Solo Nine always heals self.

**BLESS** — AOE self — 4% own maxHP to nearby allies
Heals all allies within 90px. Dawnbringer must stay near the team.

**WARD** — Self-cast — block 1 hit
Next incoming hit = 0 damage. Bypassed by PIERCE.

**ANCHOR** — Self-cast — can't die
Can't drop below 1 HP during window. Stonebark exclusive.

**THORNS** — Passive — 18% reflected
Reflects 18% of each hit back to attacker.

**BARRIER** — Self-cast — 50 absorption
Absorbs 50 damage. Gone when broken. Bypassed by PIERCE.

---

### MANIPULATION SPELL EFFECTS

**SILENCE** — Mid range — block effects for 2 attacks
Targets highest ATK enemy within 220px.

**HEX** — Mid range — -12 ATK per stack, max -35
Nighthollow exclusive. Stacks ×3.

**WEAKEN** — Mid range — target deals 50% damage
Lasts 2 of target's attacks.

**DRAIN** — Close range — 20% lifesteal
Heal self for 20% of damage dealt.

**TETHER** — Mid range — 50/50 damage split
Damage splits 50/50 with tethered target for 3 attacks.

**MARK** — Mid range — +25% damage taken
Tags highest HP enemy. All sources deal +25% for 3 attacks.

**BLIND** — Mid range — LUCK = 0 for 2 attacks
No crits, no DODGE. Nighthollow exclusive.

**NULLIFY** — Mid range — strip one buff
Strips: WARD → BARRIER → ANCHOR → HASTE → DODGE. Manastorm exclusive.

**FEAST** — On-KO — 15% of dead enemy maxHP
Zone-wide. Triggers on any enemy KO.

---

### UTILITY SPELL EFFECTS

**HASTE** — Self-cast — +10 SPD for 3 attacks
Recalculates interval immediately.

**DODGE** — Self-cast — next hit evaded
Fully evades the next incoming hit.

**CLEANSE** — Self — remove all debuffs
Clears: BURN, POISON, HEX, WEAKEN, SILENCE, TETHER, MARK, WITHER, BLIND.

---

### TEAM / KO SPELL EFFECTS

**INSPIRE** — Zone-wide — +2 ATK, +2 SPD to all allies

**TAUNT** — Self — all enemies must target you
Zone-wide override. Stonebark identity.

**SHATTER** — On-KO — 10% maxHP AOE
On death: deals 10% own maxHP to all enemies within 120px.

**REFLECT** — Self-cast — bounce next hit back at full damage

**INFECT** — On-KO — all enemies get 1 POISON stack

---

### Targeting Summary
| Situation | Target |
|-----------|--------|
| attack spell | Lowest HP enemy in range |
| manipulation spell | Highest ATK enemy in range |
| support/defend spell | Lowest HP ally in range including self |
| utility spell | Self |
| SILENCE | Highest ATK enemy within 220px |
| MARK | Highest HP enemy within 220px |
| HEAL/BLESS | Lowest HP within AOE including self |
| TAUNT | Forces all enemies to this Nine |
| SHATTER | All enemies within 120px on KO |
| INFECT | All enemies on zone on KO |

---

## 13. NOTABLE SYNERGIES (V3)

**The Predator** (Darktide): DRAIN + FEAST + MARK — 20% lifesteal, feast on kills, mark tanks for focus.

**The Plague** (Plaguemire): CORRODE + POISON + WITHER — rot maxHP, stack DOT, nullify healing. Hard counter to sustain.

**The Unkillable Wall** (Stonebark): ANCHOR + THORNS + TAUNT — force all enemies to hit you, reflect 18%, can't die.

**The Speed Ghost** (Ashenvale): CHAIN + DODGE + HASTE — fast rotation, hits two targets, evades hits.

**The Shutdown** (Nighthollow/Manastorm): SILENCE + HEX + BLIND — silence the biggest threat, melt their ATK, strip their LUCK.

**The War Commander** (Dawnbringer): INSPIRE + BLESS + HEAL — buff all allies, AOE heal nearby, self-sustain.

**The Corrode Tank** (Plaguemire vs Stonebark): CORRODE + CORRODE + WITHER — long-range DOT specifically targets highest HP. Two CORRODE stacks = -30 maxHP per cycle. WITHER stops Stonebark healing. The hard counter to wall builds.

**The Burst Finisher** (Stormrage): CRIT + CHAIN + EXECUTE — full LUCK crits, hits two targets, punishes low HP.

**The Suicide Bomber** (Stonebark): SHATTER + INFECT + SURGE — die faster, explode for 10% maxHP AOE, spread POISON on KO.

---

## 14. ITEMS

Items add raw stats (5–20 per stat). A full Legendary set ≈ one Common card. Supplementary only.

| Slot | Focus |
|------|-------|
| Weapon | ATK |
| Outfit | HP/DEF |
| Hat | Utility/LUCK |

Items are passive and global — apply across all zones. No sharpness. Earned through play only (Season 1).

---

## 15. DAILY PACKS

- 1 free pack per day on login, 5 cards per pack
- Pool: all 84 cards, any house
- Cards selected in the deploy modal before confirming deploy

### Rarity Pull Weights
| Rarity | Weight |
|--------|--------|
| Common | 50% |
| Uncommon | 25% |
| Rare | 15% |
| Epic | 7% |
| Legendary | 3% |

---

## 16. LEVELING

Level does NOT increase base stats. Levels unlock content only.

| Action | XP |
|--------|-----|
| Survive snapshot | +2 |
| Win snapshot | +3 |
| Deal KO | +5 |
| Win Duel | +4 |
| Lose Duel | +1 |
| Gauntlet floor | +3 |
| Boss kill | +15 |
| Chronicle reply | +5 |
| Named in story | +10 |
| Daily login | +5 |
| Flip a zone | +8 |

| Level | Unlock |
|-------|--------|
| 1 | 2 zone slots |
| 3 | Trinket slot 1 |
| 8 | Trinket slot 2 |
| 10 | 3rd zone slot |

---

## 17. GAME MODES

### Zone Battles — The Core Mode
- 9 zones, each with a unique arena and polygon walk boundary
- Select 3 spell cards before deploying — cards locked to that zone while deployed
- Continuous spatial combat — range and position matter
- 15-minute snapshots score zone control
- Sharpness degrades -1% per snapshot

### Quick Duels (1v1 PvP)
No sharpness loss. Best of 3 rounds — both players reveal a card simultaneously.

### The Gauntlet (Solo PvE)
No sharpness loss. Sequential AI battles, daily reset. Item drops at floors 5, 10, 15.

### Weekly Boss (Guild Raid)
Appears Monday, must die by Friday. Sharpness degrades as normal.

---

## 18. ZONES

9 zones total. Each zone has a unique name, arena background image, and `arena_polygon` defining the walkable boundary sprites stay within.

Zone control bonuses and special effects are configurable per-zone from the admin panel — not tied to fixed house regions.

---

## 19. SCORING & POINTS

Points are seasonal. XP is permanent.

| Action | Points | XP |
|--------|--------|----|
| Deploy to zone | +5 | — |
| Survive snapshot | +3 | +2 |
| Win snapshot | +5 | +3 |
| Deal KO | +10 | +5 |
| Flip zone | +15 | +8 |
| Hold zone full day | +25 | +10 |
| Win Duel | +8 | +4 |
| Lose Duel | +2 | +1 |
| Gauntlet floor | +3/floor | +3/floor |
| Boss snapshot | +4 | +3 |
| Boss kill | +20 | +15 |
| Boss top guild | +25 bonus | — |
| Boss top player | +50 bonus | — |
| Killing blow | +30 bonus | — |
| Chronicle reply | +15–35 | +5 |
| Named in story | +20 | +10 |
| Daily login | +5 | +5 |

Card rarity does NOT affect points. You never LOSE points.

---

## 20. $9LV TOKEN

| | |
|-|-|
| Token | $9LV |
| Address | CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump |
| Chain | Solana |
| Conversion | 1 point = 1 $9LV (starting ratio) |
| Vesting | 7 days before claimable, 7 more before tradeable |

**Wizard Ranks — cosmetic only, never affect combat or points.**

---

## 21. NERM

Floating cat head. Telegram moderator, Twitter bot (@9LVNetwork), Chronicle character.
Personality: sassy, deadpan, knows everything about Nethara.

---

## 22. QUICK REFERENCE

```
WEBSITE:          9lv.net
TOKEN:            $9LV — CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump

STAT ADDITION:    total = house + card1 + card2 + card3
ATTACK:           max(5.5, 10.5 - SPD × 0.12) seconds
CARD CYCLE:       max(5.5, 12.0 - SPD × 0.10) seconds
DAMAGE:           ATK² / (ATK + DEF)
BASE CRIT:        LUCK × 0.3 / 100
CRIT CARD:        LUCK / 100
CRIT DAMAGE:      2×

SLOT BONUSES:     Slot 1 ×1.35 / Slot 2 ×1.0 / Slot 3 ×1.5 if target <40% HP

TICK:             2 seconds
SNAPSHOT:         15 minutes
KO COOLDOWN:      1 minute (that zone only)
SHARPNESS:        -1% per snapshot / min 50% effectiveness
TIMEOUT:          300 ticks

SPELL RANGES:     Close 90px / Mid 220px / Long 380px / AOE 120px
TARGETING:        attack→lowest HP | manipulation→highest ATK | support→lowest HP incl. self
MOVEMENT:         30 + (SPD × 1.2) px/tick

ASHENVALE SPD:    22 base (V3 — was 38)
ATK CARD MAX:     +10 pure / +8 hybrid
SPD CARD MAX:     +8 each

HEAL:             7% own maxHP
BLESS:            4% own maxHP nearby
DRAIN:            20% lifesteal
BURN:             6/stack
POISON:           3% target maxHP/stack per 3 ticks
CORRODE:          -15 maxHP on-attack, 10-tick CD
THORNS:           18% reflected
BARRIER:          50 absorption

ZONES:            9 (unique arena + polygon each)
CARDS:            84 (12 Universal + 8/house × 9 houses)
EFFECTS:          36 active
HOUSES:           9
```

---

*Updated March 17, 2026. V3: spatial combat, range-based spell targeting, house-locked effects, Ashenvale SPD 22, CORRODE reworked, 11 effects removed, 3 added (BLIND, WITHER, NULLIFY).*
