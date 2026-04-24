# NINE LIVES NETWORK — EFFECTS REFERENCE V5
## All 34 Combat Effects — How They Actually Work in combatEngine.js
## February 26, 2026

---

## EFFECT PROCESSING ORDER

```
Phase 1: Card Effects Resolve (SPD order, highest first)
  → Damage effects (BURN, POISON, DRAIN, SIPHON, LEECH)
  → Healing effects (HEAL, BLESS)
  → Debuffs on enemies (SILENCE, HEX, WEAKEN, SLOW, MARK, CORRODE, TETHER, STUN, FEAR)
  → Buffs on self (AMPLIFY, SURGE, CRIT, PIERCE, CHAIN, HASTE, DODGE, REFLECT, PHASE, BARRIER, OVERCHARGE, TAUNT, STEALTH, ANCHOR, THORNS, WARD, SWIFT)
  → Special: CLEANSE, SHATTER, INSPIRE, INFECT flag, DOOM

Phase 2: Auto-Attack (SPD order)
  → STUNNED/PHASED skip attack
  → SLOWED: 50% chance to skip
  → STEALTHED enemies can't be targeted
  → TAUNTING enemy must be targeted
  → MARKED enemy preferred target
  → CRIT check (50% if crit_ready, 3% per LUCK point)
  → DODGE: 30% target avoids all damage
  → PIERCE: ignores WARD
  → DEF reduces damage
  → ANCHOR reduces damage by 2
  → WARD absorbs 3 damage
  → BARRIER absorbs up to barrierHP
  → MARK: +50% damage taken
  → THORNS: 2 damage reflected
  → REFLECT: 50% damage reflected
  → TETHER: 30% damage shared to tether source
  → HASTE: bonus attack at 50% ATK

Phase 4: Knockout
  → INFECT: POISON spreads to all enemies on KO (2 damage each)
```

---

## ATTACK EFFECTS (5)

| Effect | Combat Behavior |
|--------|----------------|
| **BURN** | Deal 3 extra damage to lowest-HP enemy (value from card overrides) |
| **CHAIN** | Auto-attack and effects hit 2 targets instead of 1 |
| **CRIT** | 50% chance to deal 1.5× auto-attack damage |
| **SURGE** | +3 ATK this combat cycle |
| **PIERCE** | Auto-attacks and effects ignore WARD shields |

## DEFENSE EFFECTS (5)

| Effect | Combat Behavior |
|--------|----------------|
| **HEAL** | Heal lowest-HP ally by 3 HP (value from card overrides) |
| **WARD** | Absorb 3 damage from next hit (ignored by PIERCE, destroyed by SHATTER) |
| **ANCHOR** | Reduce all incoming damage by 2 |
| **THORNS** | Attackers take 2 damage back |
| **BARRIER** | Separate shield with its own HP pool (default 5, destroyed by SHATTER) |

## MANIPULATION EFFECTS (5)

| Effect | Combat Behavior |
|--------|----------------|
| **DRAIN** | Deal 2 damage to enemy, heal self for 2 |
| **SIPHON** | Deal 1 damage to enemy, heal self for 1 |
| **WEAKEN** | Random enemy loses 3 ATK this cycle |
| **HEX** | Random enemy loses 2 ATK this cycle |
| **SILENCE** | Random enemy's card effects don't activate |

## UTILITY EFFECTS (4)

| Effect | Combat Behavior |
|--------|----------------|
| **HASTE** | Bonus auto-attack at 50% damage after normal attack |
| **SWIFT** | First card of the day: effect doubled (handled at cast time) |
| **DODGE** | 30% chance to avoid ALL damage (effects and auto-attacks) |
| **FREE** | No-op after §9.80 mana removal — legacy tag, cards are always free now |

## ATTRITION EFFECTS (4)

| Effect | Combat Behavior |
|--------|----------------|
| **POISON** | Deal 2 damage per cycle (stacks with BURN) |
| **CORRODE** | Random enemy loses 2 max HP permanently for the battle |
| **INFECT** | On KO, POISON spreads to ALL enemies (2 damage each) |
| **LEECH** | Deal 2 damage to enemy, heal self for 1 |

## SUPPORT EFFECTS (3)

| Effect | Combat Behavior |
|--------|----------------|
| **AMPLIFY** | Self buff: +2 ATK. Also: next ally heal on this target is +50% stronger |
| **INSPIRE** | Heal ALL allies by 1 HP each |
| **BLESS** | Heal lowest-HP ally by 2 HP |

## V5 NEW EFFECTS (8)

| Effect | Combat Behavior |
|--------|----------------|
| **SHATTER** | If any enemy has WARD or BARRIER, destroy it and deal 4 bonus damage |
| **TETHER** | Link random enemy — they share 30% of damage taken with the tether caster |
| **REFLECT** | Return 50% of damage taken back to the attacker |
| **PHASE** | Immune to all damage this cycle, but can't attack or use offensive effects |
| **MARK** | Random enemy takes 50% more damage from ALL sources this cycle |
| **CLEANSE** | Remove all debuffs from self (silence, hex, weaken, stun, fear, slow, mark, corrode, doom) |
| **OVERCHARGE** | +50% ATK this cycle, but take 20% of own max HP as recoil damage |
| **SLOW** | Random enemy loses 3 SPD and has 50% chance to skip auto-attack |
| **TAUNT** | Force all enemies to target you with auto-attacks |
| **STEALTH** | Can't be targeted by auto-attacks this cycle (still hit by AOE/CHAIN) |

## RARE/BOSS EFFECTS (3)

| Effect | Combat Behavior |
|--------|----------------|
| **STUN** | Target can't attack or use effects this cycle (full shutdown) |
| **FEAR** | Target loses 4 ATK this cycle |
| **DOOM** | Target takes 5 damage immediately + gets "doomed" status |

---

## INTERACTION PRIORITIES

When multiple effects interact, this is the resolution order:

1. **SILENCE** blocks ALL effects (checked first)
2. **PHASED** blocks offensive effects but allows self-buffs/heals
3. **DODGE** checked before any damage applies (30% avoid)
4. **PHASE** makes target immune (checked after DODGE)
5. **DEF** reduces damage (half value for effects, full for auto-attacks)
6. **ANCHOR** reduces damage by 2
7. **WARD** absorbs 3 damage (skipped if attacker has PIERCE)
8. **BARRIER** absorbs remaining damage up to its HP pool
9. **MARK** multiplies remaining damage by 1.5×
10. **THORNS** reflects flat 2 damage back
11. **REFLECT** reflects 50% of final damage back
12. **TETHER** shares 30% of final damage to tether source

---

## WHAT'S NOT IN COMBAT ENGINE (handled elsewhere)

- **FREE**: Legacy no-op — all casts are free after the §9.80 mana-system removal
- **SWIFT**: Doubles first card effect of the day — handled in zone deploy endpoint
- **Rarity scaling**: Bonus ATK/HP from rarity — applied when card is pulled, stored in DB
- **House affinity**: ×1.3 effect strength — applied when effects are parsed from card data
- **Region bonuses**: Applied separately via `applyRegionBonus()` before combat

---

*Companion to: combatEngine.js, CARD_STATS_V4.md, 9LV_GAME_DESIGN_V4.md*
