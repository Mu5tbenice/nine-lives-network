# Nine Lives Network — Spellbook System V2

## Core Philosophy

**Spells enhance the existing Attack/Defend system — they don't replace it.**

The basic 1 MP Attack (+10 influence) and 1 MP Defend (+10 defense) remain the bread and butter. Spells are optional upgrades that cost the SAME 1 MP but add bonus effects on top. Think of it like this:

- **Attack** = plain cast, always works, +10 influence
- **Attack + Kindle** = same 1 MP, +10 influence PLUS +3 bonus and a burn effect
- **Power Spell** = 2 MP, bigger effect but costs double your daily resource

This means every cast matters. Nobody is "wasting" mana on basics because basics ARE the foundation that spells build on.

---

## How It Works (Player Experience)

### On the Website (Territory Cards)
1. Player clicks **Attack** or **Defend** on a zone card
2. A spell picker slides out showing available spells for today
3. Top option is always **"Basic Attack"** or **"Basic Defend"** (1 MP, no extras)
4. Below that: today's rotation spells, each with effect pills showing what they do
5. Player picks one, confirms, done

### On Twitter (Reply Casting)
1. Player replies to the daily objective tweet
2. Just replying = Basic Attack (default, 1 MP)
3. Including a spell name = that spell is cast instead
4. Example: `Kindle 🔥 burning this zone down!` = Kindle spell
5. Example: `defend` = Basic Defend
6. Example: `ward the walls hold!` = Ward spell (defend)

### Spell Picker UI (on zone cards)
```
┌─────────────────────────────────┐
│  ⚔️ ATTACK — Crimson Hollow     │
│                                  │
│  ┌─────────────────────────────┐│
│  │ Basic Attack         1 MP   ││
│  │ +10 influence               ││
│  └─────────────────────────────┘│
│                                  │
│  ┌─────────────────────────────┐│
│  │ 🔥 Kindle            1 MP   ││
│  │ +10 influence               ││
│  │ [+3 BONUS] [BURN 🔥]       ││
│  └─────────────────────────────┘│
│                                  │
│  ┌─────────────────────────────┐│
│  │ 🔥 Scorch             2 MP  ││
│  │ +10 influence               ││
│  │ [+8 BONUS] [STRIP DEF ⬇]   ││
│  └─────────────────────────────┘│
│                                  │
│  Today: 3/5 mana remaining      │
└─────────────────────────────────┘
```

The **effect pills** are small colored badges that show at a glance what the spell does. Hovering/tapping reveals the full description.

---

## Mana & Costs

| Resource | Value |
|----------|-------|
| Daily Mana | 5 MP |
| Basic Attack / Defend | 1 MP |
| Standard Spell (Tier 1) | 1 MP |
| Power Spell (Tier 2) | 2 MP |
| Ultimate Spell (Tier 3) | 3 MP |

**Key rule:** Tier 1 spells cost the same as basics. The tradeoff is that Tier 1 spells rotate daily — basics are ALWAYS available. So basics = reliable, spells = situational power.

---

## Spell Tiers

### Tier 1 — Standard (1 MP)
Same cost as basic. Adds a small bonus effect on top of the base +10 influence/defense. Always worth using IF they're in rotation.

### Tier 2 — Power (2 MP)  
Significant effects. Uses 40% of your daily mana. Strategic choice.

### Tier 3 — Ultimate (3 MP)
Game-changing. Uses 60% of your daily mana. Available only on specific days. Big commitment.

---

## Universal Spells (All Houses)

Always available. Never rotate. The "safe picks."

| Spell | Cost | Type | Base | Bonus Effects |
|-------|------|------|------|---------------|
| **Basic Attack** | 1 MP | Attack | +10 influence | — |
| **Basic Defend** | 1 MP | Defend | +10 defense | — |
| **Mana Siphon** | 1 MP | Attack | +10 influence | `DRAIN` Steals 2 from leading house |
| **Fortify** | 1 MP | Defend | +10 defense | `LOCKOUT` Can't attack this zone for 1 hr |
| **Rally Cry** | 1 MP | Support | +5 influence | `INSPIRE` All housemates who cast here today get +2 each |
| **Scout** | 1 MP | Utility | — | `REVEAL` Shows exact % for all houses (normally rounded) |

---

## House Spells

Every house has exactly **6 spells**: 3× Tier 1, 2× Tier 2, 1× Ultimate.

**Daily rotation selects 2 of 3 Tier 1 spells and 1 of 2 Tier 2 spells.** Ultimates follow a weekly schedule. This means every house gets exactly **2 Tier 1 + 1 Tier 2** available each day (plus their ultimate on designated days).

---

### 🔥 HOUSE SMOULDERS — *Aggression / Burst*
*"From ember to inferno. We do not ask — we take."*

| Spell | Tier | Cost | Type | Base | Effect Pills |
|-------|------|------|------|------|-------------|
| **Kindle** | 1 | 1 MP | Attack | +10 | `+3 BONUS` `BURN` Target house loses 1 influence/hr for 2 hrs |
| **Flame Wall** | 1 | 1 MP | Defend | +10 | `+2 BONUS` `SCALD` Next attacker here takes −3 influence |
| **Ember Toss** | 1 | 1 MP | Attack | +10 | `SPREAD` +3 influence to one other active zone (random) |
| **Scorch** | 2 | 2 MP | Attack | +10 | `+8 BONUS` `STRIP DEF` Reduces top house's defense by 5 |
| **Wildfire** | 2 | 2 MP | Attack | +10 | `SPREAD ×2` +5 influence to two other active zones |
| **🔥 Inferno** | 3 | 3 MP | Attack | +10 | `+20 BONUS` `ERUPTION` If 3+ Smoulders cast here today, bonus doubles to +40 |

---

### 🌊 HOUSE DARKTIDE — *Control / Redistribution*
*"The tide comes for all. Patience is our sharpest weapon."*

| Spell | Tier | Cost | Type | Base | Effect Pills |
|-------|------|------|------|------|-------------|
| **Undertow** | 1 | 1 MP | Attack | +10 | `PULL` Steals 3 from second-highest house |
| **Tidal Shield** | 1 | 1 MP | Defend | +10 | `+2 BONUS` `REFLECT` Returns 3 influence to next attacker |
| **Fog Bank** | 1 | 1 MP | Utility | — | `CLOAK` Hides your house's % for 2 hrs (shows ???) |
| **Riptide** | 2 | 2 MP | Attack | +10 | `+5 BONUS` `SWAP` Your house swaps rank with the lowest house |
| **Erode** | 2 | 2 MP | Attack | +10 | `WEAKEN` Reduces ALL other houses' defense by 3 |
| **🌊 Maelstrom** | 3 | 3 MP | Control | — | `RESET` Redistributes all influence equally, then +25 to yours |

---

### 🌿 HOUSE STONEBARK — *Endurance / Fortification*
*"We are the mountain. Move us if you dare."*

| Spell | Tier | Cost | Type | Base | Effect Pills |
|-------|------|------|------|------|-------------|
| **Root** | 1 | 1 MP | Defend | +10 | `+4 BONUS` `ANCHOR` Defense can't drop below 10 for 1 hr |
| **Quake** | 1 | 1 MP | Attack | +10 | `CRACK` All other houses lose 2 defense |
| **Regrowth** | 1 | 1 MP | Defend | +10 | `HEAL` Restores 5 defense your house lost today |
| **Overgrowth** | 2 | 2 MP | Defend | +10 | `+10 BONUS` `THORNS` Attacks against you cost +1 MP for 2 hrs |
| **Terraform** | 2 | 2 MP | Utility | — | `CONVERT` Turns 10 of your defense into 10 influence |
| **🌿 Living Fortress** | 3 | 3 MP | Defend | +10 | `+30 BONUS` `PERSIST` If you control zone at day end, +15 defense carries to tomorrow |

---

### 💨 HOUSE ASHENVALE — *Speed / Efficiency*
*"Gone before you noticed. Back before you blinked."*

| Spell | Tier | Cost | Type | Base | Effect Pills |
|-------|------|------|------|------|-------------|
| **Gust** | 1 | 1 MP | Attack | +10 | `SWIFT` Cooldown reduced to 5 min instead of 10 |
| **Tailwind** | 1 | 1 MP | Support | +5 | `FREE CAST` Next Ashenvale cast here costs 0 MP |
| **Zephyr** | 1 | 1 MP | Defend | +10 | `DODGE` 30% chance next attack against you misses |
| **Cyclone** | 2 | 2 MP | Attack | +10 | `+2 BONUS` `SWEEP` Removes 4 influence from every other house |
| **Slipstream** | 2 | 2 MP | Attack | +10 | `REACH` Can target any active zone (ignores normal restrictions) |
| **💨 Tempest** | 3 | 3 MP | Attack | +10 | `+15 BONUS` `GALE` Free +10 attack on one other active zone |

---

### ⚡ HOUSE STORMRAGE — *High Risk / High Reward*
*"The sky answers to us. And today, it's angry."*

| Spell | Tier | Cost | Type | Base | Effect Pills |
|-------|------|------|------|------|-------------|
| **Spark** | 1 | 1 MP | Attack | +10 | `CRIT 25%` 25% chance to double the entire cast (+20 total) |
| **Static Field** | 1 | 1 MP | Defend | +10 | `FIZZLE 25%` 25% chance enemy's next attack does nothing |
| **Arc** | 1 | 1 MP | Attack | +10 | `CHAIN` +3 influence if another Stormrage cast here in last 30 min |
| **Chain Lightning** | 2 | 2 MP | Attack | +10 | `+5 BONUS` `CHAIN ×2` +5 to one other active zone |
| **Overcharge** | 2 | 2 MP | Utility | — | `AMPLIFY` Your next spell's bonus effects are doubled |
| **⚡ Thunderstrike** | 3 | 3 MP | Attack | +10 | `+25 BONUS` `SMITE` Leading house loses 15 influence |

---

### 🌙 HOUSE NIGHTHOLLOW — *Disruption / Information*
*"You can't fight what you can't see."*

| Spell | Tier | Cost | Type | Base | Effect Pills |
|-------|------|------|------|------|-------------|
| **Shadow Bolt** | 1 | 1 MP | Attack | +10 | `NIGHT OWL` During 00:00–08:00 UTC, +5 bonus |
| **Veil** | 1 | 1 MP | Defend | +10 | `STEALTH` Your casts hidden from activity feed for 1 hr |
| **Curse** | 1 | 1 MP | Debuff | — | `HEX` Target house's next 2 casts have −3 influence |
| **Hex** | 2 | 2 MP | Debuff | — | `SILENCE` Target house can't use Tier 2+ spells here for 1 hr |
| **Soul Drain** | 2 | 2 MP | Attack | +10 | `+5 BONUS` `STEAL` Takes 5 from controlling house |
| **🌙 Eclipse** | 3 | 3 MP | Control | — | `FREEZE` All other houses' influence frozen 1 hr. You get +25 |

---

### ☀️ HOUSE DAWNBRINGER — *Support / Group Strength*
*"Our light lifts all. But it burns our enemies brightest."*

| Spell | Tier | Cost | Type | Base | Effect Pills |
|-------|------|------|------|------|-------------|
| **Radiance** | 1 | 1 MP | Support | +8 | `AURA` All Dawnbringer who cast here today get +2 |
| **Holy Shield** | 1 | 1 MP | Defend | +10 | `UNDERDOG` If fewest members here, +8 bonus instead |
| **Blessing** | 1 | 1 MP | Support | +5 | `GIFT` Target ally (any house) gets +5 on next cast |
| **Smite** | 2 | 2 MP | Attack | +10 | `+6 BONUS` `JUSTICE` Extra +5 vs leading house |
| **Sanctuary** | 2 | 2 MP | Defend | +10 | `+10 BONUS` `SAFE` Your house can't lose more than 5 influence/hr here for 2 hrs |
| **☀️ Dawn's Light** | 3 | 3 MP | Support | +10 | `+15 BONUS` `RESTORE` All Dawnbringer members regen 1 MP (once/day) |

---

### 🔮 HOUSE MANASTORM — *Manipulation / Counters*
*"Reality is merely a suggestion we choose to rewrite."*

| Spell | Tier | Cost | Type | Base | Effect Pills |
|-------|------|------|------|------|-------------|
| **Arcane Missile** | 1 | 1 MP | Attack | +10 | `PIERCE` Ignores 3 points of defense |
| **Spell Shield** | 1 | 1 MP | Defend | +10 | `ABSORB` Blocks the next debuff on your house |
| **Flux** | 1 | 1 MP | Utility | — | `RANDOMIZE` Gain between +5 and +20 influence (random) |
| **Counterspell** | 2 | 2 MP | Reaction | — | `NEGATE` Cancels last enemy spell effect (within 10 min). Refunds 1 MP |
| **Transmute** | 2 | 2 MP | Utility | — | `CONVERT` Swap up to 15 of your defense ↔ influence |
| **🔮 Reality Warp** | 3 | 3 MP | Control | — | `SWAP` Exchange two OTHER houses' influence totals |

---

### ☠️ HOUSE PLAGUEMIRE — *Attrition / Damage Over Time*
*"Everything rots. We just accelerate the process."*

| Spell | Tier | Cost | Type | Base | Effect Pills |
|-------|------|------|------|------|-------------|
| **Toxic Bolt** | 1 | 1 MP | Attack | +8 | `DOT` +2 influence per 15 min for 1 hour (+8 total over time) |
| **Miasma** | 1 | 1 MP | Defend | +8 | `TOXIC ZONE` All houses lose 1 influence/hr for 2 hrs. Plaguemire is immune |
| **Spore** | 1 | 1 MP | Attack | +10 | `INFECT` If target house doesn't cast here within 30 min, they lose 5 |
| **Contagion** | 2 | 2 MP | Debuff | — | `WITHER` Target house loses 2 influence/hr for 3 hrs |
| **Decompose** | 2 | 2 MP | Attack | +10 | `CORRODE` Zone's max defense cap reduced by 10 for the day |
| **☠️ Blight** | 3 | 3 MP | Attack | +10 | `+10 BONUS` `PLAGUE` All other active zones: non-Plaguemire houses lose 5 influence |

---

## Combo System (Automatic Triggers)

Combos trigger **automatically** based on participation thresholds. **Any cast on the zone counts** — you don't need to cast a specific spell. If 3 people from Smoulders all cast Basic Attack on the same zone, the Resonance combo triggers for all of them.

### How It Works
- Combos check: "How many unique members of house X have cast on zone Y today?"
- When threshold is met, the combo bonus applies **retroactively to all participants** AND to future casters
- This means early casters aren't penalized — they get the bonus too
- A player's contribution counts regardless of what spell they used

### House Combos (Same House)

| Combo | Threshold | Effect | Flavor |
|-------|-----------|--------|--------|
| **Resonance** | 3 members from same house cast on same zone today | +5 bonus to every participant (retro + future) | *Three voices become one roar.* |
| **Surge** | 5 members | +10 bonus to every participant | *The ley lines tremble with united power.* |
| **House United** | 8 members | +15 bonus to every participant. Zone becomes "Claimed" — defense doubled for rest of day | *An entire house focuses its will.* |
| **Overwhelming Force** | 12 members | +20 bonus to every participant. House gets double influence for rest of day on this zone | *The realm itself bows.* |

**Important:** These are CUMULATIVE. If 8 people cast, you trigger Resonance (at 3), Surge (at 5), AND House United (at 8). Total bonus: +5 +10 +15 = +30 per participant.

### Community Combos (Same Community Tag)

Players who share the same community tag (e.g., $BONK, $WIF) get bonus effects too:

| Combo | Threshold | Effect | Flavor |
|-------|-----------|--------|--------|
| **Community Rally** | 3 members with same community tag cast on same zone | +3 bonus to all community participants | *Your community rides together.* |
| **Community Siege** | 5 members with same tag | +7 bonus to all + their house gets +5 | *A community's strength echoes through its house.* |
| **Community Dominance** | 10 members with same tag | +12 bonus. Community tag displayed on zone for rest of day | *This zone belongs to [TAG].* |

**Community combos stack with house combos.** If 5 $BONK players all in Smoulders cast on the same zone, they trigger BOTH Surge (+10) AND Community Siege (+7) for +17 bonus each.

---

## Cross-House Collaboration Spells

These trigger when players from **different houses** contribute to the same zone. Encourages alliances and makes the game social.

| Spell | Requirement | Effect | Flavor |
|-------|-------------|--------|--------|
| **Alliance Pact** | 2 players from different houses both cast Support-type spells on same zone within 30 min | Both houses get +8 bonus influence | *An unlikely partnership.* |
| **Convergence** | Players from 3+ different houses cast on same zone in 1 hour | All participating houses get +5 bonus. Leading house (if not participating) loses 8 | *The enemy of my enemy...* |
| **Grand Ritual** | Players from 5+ different houses cast on same zone today | Zone produces 1.5× points for ALL casters for rest of day | *A rare moment of unity.* |
| **Chaos Surge** | Players from 7+ different houses cast on same zone today | Zone becomes "Chaotic" — all spell bonus effects doubled for 2 hrs, but 15% chance any spell backfires (effect goes to random house) | *Too much magic. Reality cracks.* |

Like house combos, these are **automatic** and based on participation count, not specific spell choices.

---

## Daily Rotation

### What Rotates
Each day at 08:00 UTC, the system picks:
- **2 of 3 Tier 1 spells** per house (randomly selected)
- **1 of 2 Tier 2 spells** per house (randomly selected)
- **Ultimates** follow weekly schedule (see below)

### What DOESN'T Rotate
- Basic Attack / Basic Defend — always available
- Universal spells (Mana Siphon, Fortify, Rally Cry, Scout) — always available
- Combo thresholds — always active
- Cross-house collaborations — always active

### Ultimate Schedule

| Day | Ultimates Available |
|-----|-------------------|
| Monday | Smoulders 🔥, Darktide 🌊, Stonebark 🌿 |
| Tuesday | Ashenvale 💨, Stormrage ⚡, Nighthollow 🌙 |
| Wednesday | Dawnbringer ☀️, Manastorm 🔮, Plaguemire ☠️ |
| **Thursday** | **ALL ULTIMATES ⚡ THUNDER DAY** |
| Friday | Smoulders 🔥, Ashenvale 💨, Dawnbringer ☀️ |
| Saturday | Darktide 🌊, Stormrage ⚡, Manastorm 🔮 |
| Sunday | Stonebark 🌿, Nighthollow 🌙, Plaguemire ☠️ |

Every house gets ultimates on **3 days per week** (+ Thursday).

---

## Chaos Modifiers (Random Daily Events)

20% chance per day. Announced in the daily objective tweet.

| Modifier | Effect |
|----------|--------|
| **Mana Surge** | All players get 7 MP today instead of 5 |
| **Spell Storm** | All spell bonus effects +50% |
| **Silence** | No Tier 2 or Ultimate spells today. Tier 1 and basics only |
| **Wild Magic** | 10% chance any spell has a random bonus effect instead of its normal one |
| **Blood Moon** | Attack spells get +3 bonus. Defense spells get −3 |
| **Solstice** | Defense spells get +5 bonus. Attack spells get −2 |
| **Leyline Convergence** | All combo thresholds reduced by 1 (Resonance = 2, Surge = 4, etc.) |
| **Double or Nothing** | All influence gains doubled, all defense gains halved |
| **Fog of War** | No house can see any other house's influence % today |
| **Harvest Moon** | Community combo thresholds reduced by 1 |

---

## Effect Pill Reference

These are the hoverable badges that appear on spell cards in the UI:

| Pill | Color | Description on Hover |
|------|-------|---------------------|
| `+N BONUS` | Gold | Adds N extra influence/defense on top of base |
| `BURN` | Orange | Target loses influence over time |
| `DOT` | Green | Damage dealt over time (drip effect) |
| `SPREAD` | Red-orange | Effect applies to other active zones |
| `DRAIN` | Purple | Steals influence from another house |
| `STRIP DEF` | Red | Reduces target's defense |
| `REFLECT` | Cyan | Returns damage to attackers |
| `PULL` | Blue | Moves influence from one house to yours |
| `CLOAK` | Dark purple | Hides information |
| `STEALTH` | Dark purple | Hides your activity |
| `SWAP` | Pink | Exchanges positions or values |
| `WEAKEN` | Yellow-red | Reduces all enemies' stats |
| `ANCHOR` | Brown | Prevents defense from dropping |
| `HEAL` | Green | Restores lost defense |
| `THORNS` | Green | Attacks against you cost extra |
| `CONVERT` | Blue-gold | Transform one stat into another |
| `PERSIST` | Gold | Effect carries to next day |
| `SWIFT` | White | Reduced cooldown |
| `FREE CAST` | Cyan | Next cast costs 0 MP |
| `DODGE` | Light blue | Chance to avoid incoming attack |
| `REACH` | White | Can target any zone |
| `SWEEP` | Gray | Hits all other houses |
| `CRIT N%` | Yellow | Chance to deal double |
| `FIZZLE N%` | Yellow | Chance enemy attack fails |
| `CHAIN` | Electric blue | Bonus for casting in sequence with housemates |
| `AMPLIFY` | Purple | Doubles next spell's bonus |
| `NIGHT OWL` | Dark blue | Bonus during off-peak hours |
| `HEX` | Purple | Debuff on target house |
| `SILENCE` | Gray | Prevents spell use |
| `STEAL` | Dark red | Takes from controlling house |
| `FREEZE` | Ice blue | Locks influence in place |
| `PIERCE` | Silver | Ignores defense |
| `ABSORB` | Blue | Blocks debuffs |
| `RANDOMIZE` | Rainbow | Random effect amount |
| `NEGATE` | White | Cancels enemy spell |
| `INFECT` | Green | Punishes inactivity |
| `WITHER` | Brown-green | Slow influence drain |
| `CORRODE` | Dark green | Reduces zone's defense cap |
| `PLAGUE` | Toxic green | Area-of-effect damage |
| `TOXIC ZONE` | Green | Ongoing zone damage |
| `LOCKOUT` | Red | Prevents specific actions |
| `UNDERDOG` | Gold | Bonus when outnumbered |
| `AURA` | Warm gold | Group buff |
| `GIFT` | White-gold | Buff an ally |
| `JUSTICE` | Gold | Bonus vs leading house |
| `SAFE` | Gold | Limits influence loss |
| `RESTORE` | Cyan | Regenerates mana |
| `ERUPTION` | Red-gold | Scales with participation |
| `RESET` | Cyan | Equalizes influence |
| `INSPIRE` | Gold | Buffs housemates |
| `REVEAL` | White | Shows hidden information |

---

## Implementation Notes

### Database Changes

**New table: `spells`**
```sql
CREATE TABLE spells (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  house_id INTEGER REFERENCES schools(id),  -- NULL = universal
  tier INTEGER NOT NULL DEFAULT 1,           -- 1, 2, or 3
  cost INTEGER NOT NULL DEFAULT 1,
  type VARCHAR(20) NOT NULL,                 -- attack, defend, support, utility, debuff, control, reaction
  base_influence INTEGER DEFAULT 0,
  base_defense INTEGER DEFAULT 0,
  effects JSONB NOT NULL DEFAULT '[]',       -- array of {pill, value, description}
  flavor_text TEXT,
  is_ultimate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New table: `daily_rotations`**
```sql
CREATE TABLE daily_rotations (
  id SERIAL PRIMARY KEY,
  game_day DATE NOT NULL UNIQUE,
  rotation JSONB NOT NULL,                   -- {house_id: [spell_ids]}
  ultimate_houses INTEGER[],                 -- house IDs with ultimates today
  chaos_modifier VARCHAR(50),                -- NULL = no modifier
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Modify `territory_actions`** — add spell reference:
```sql
ALTER TABLE territory_actions ADD COLUMN spell_id INTEGER REFERENCES spells(id);
-- NULL = basic attack/defend (backwards compatible)
```

### Combo Detection Logic
```
On each new cast:
  1. Count unique house members who cast on this zone today
  2. Check thresholds: 3 → Resonance, 5 → Surge, 8 → United, 12 → Overwhelming
  3. For any NEW threshold crossed:
     a. Apply bonus retroactively to all prior casters from that house
     b. Flag zone so future casters auto-receive the bonus
  4. Repeat for community tag combos
  5. Count unique houses on this zone today for cross-house collabs
```

### Priority Order
1. Seed spell data into database
2. Build spellbook.html (read-only reference page)
3. Add spell picker to zone card Attack/Defend flow
4. Update cast processing to apply spell effects
5. Add combo detection to cast pipeline
6. Add rotation generation to 08:00 scheduler
7. Add chaos modifier system