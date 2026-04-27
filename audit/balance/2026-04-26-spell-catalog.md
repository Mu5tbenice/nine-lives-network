# Spell catalog audit — descriptions vs engine (2026-04-26)

**Sources audited:** 84 active spells in `spells` table · `EFFECTS_REFERENCE_V5.md` (root, dated 2026-02-26) · `effect_definitions` DB table · `server/services/combatEngine.js` (live engine).

## Top-line verdict

**`EFFECTS_REFERENCE_V5.md` is comprehensively out of sync with the live engine.** Almost every numerical claim in the doc is wrong — not a little wrong, structurally wrong (flat values vs. % scaling, blocked-attack vs. damage-reduction, different multipliers, different effect sets). The doc was written 2026-02-26 against an earlier engine and was not updated as combat moved to V4.

There are **three drift sources**, in descending order of severity:

1. **`EFFECTS_REFERENCE_V5.md`** — the document Wray and any new contributor would read first to understand effects. Treat as **historical**, not authoritative. Code is canon.
2. **`effect_definitions` table (24 rows in DB)** — describes a *completely different game* (V2/V3 zone-influence economy: "BURN: adds flat % extra influence to your house"). Dead schema, but misleading if read.
3. **In-game card descriptions / flavor text** — flavor lines on each `spells` row. These are tone, not mechanics — no drift to litigate, just noting they exist.

This audit's most useful artifact is the **constants table (§3)** — every in-engine number with a `combatEngine.js:LINE` citation, ready for the balance-simulator session to ingest.

---

## 1. Effect-by-effect drift table

| Effect | EFFECTS_REFERENCE_V5.md says | Engine actually does | Severity |
|---|---|---|---|
| **BURN** | "Deal 3 extra damage" | `burnStacks * 6` per 1.0s tick (timer-based DOT, max 3 stacks) | 🔴 high — completely different mechanic |
| **POISON** | "Deal 2 damage per cycle" | `floor(target.maxHp * 0.03 * stacks)` per 1.5s; decays after 3 fires | 🔴 high — % of target HP, not flat |
| **HEAL** | "Heal lowest-HP ally by 3 HP" | `floor(caster.maxHp * 0.07 * amp * hamp)` to lowest-HP ally | 🔴 high — scales with caster, not card |
| **BLESS** | "Heal lowest-HP ally by 2 HP" | `floor(caster.maxHp * 0.04 * amp * hamp)` to all allies in range | 🔴 high — AOE not single-target |
| **WARD** | "Absorb 3 damage from next hit" | Blocks the **entire** next non-PIERCE attack (no value) | 🔴 high — full block, not 3-absorb |
| **ANCHOR** | "Reduce all incoming damage by 2" | Prevents lethal: caps damage at `defender.hp - 1` (stays at 1 HP) | 🔴 high — last-stand save, not flat -2 |
| **TETHER** | "Random enemy shares 30% of damage they take" | Caster takes `floor(dmg/2)` of damage they deal (50%, 3 turns, applied to caster as recoil) | 🔴 high — wrong direction AND wrong rate |
| **MARK** | "+50% damage taken" | `+25% damage taken` (×1.25), 3 turns | 🟡 mid — direction right, magnitude half |
| **CRIT** | "50% chance to deal 1.5× auto-attack damage" | Crit chance = `luck * 0.3` ambient or `< luck` if `_crit` flag; mult = ×2 (×3 if stormrage zone bonus) | 🟡 mid — different chance + 2× not 1.5× |
| **SURGE** | "+3 ATK this combat cycle" | `1.5× damage` on next attack (multiplicative, not flat ATK) | 🟡 mid — converts to roughly +50% |
| **PIERCE** | "Auto-attacks and effects ignore WARD shields" | Ignores WARD **and** BARRIER **and** REFLECT (not just WARD) | 🟢 low — wider than doc says, not narrower |
| **WEAKEN** | "Random enemy loses 3 ATK this cycle" | Affected fighter does ×0.5 damage (50% reduction), 2 turns | 🟡 mid — wrong stat, wrong magnitude |
| **HEX** | "Random enemy loses 2 ATK this cycle" | `+8 ATK debuff per stack, max 24` (subtracted from atk in resolveAttack) | 🟡 mid — much bigger and stacking |
| **EXECUTE** | (no HP threshold mentioned) | `1.5× damage` if defender below 30% HP | 🟡 mid — significant mechanic missing from doc |
| **DODGE** | "30% chance to avoid all damage" | One-shot dodge flag (`dodgeReady = true`), consumed on next hit (100% block once) | 🟡 mid — single-charge, not probability |
| **REFLECT** | "Return 50% of damage taken back" | Reflects **full** damage, single-charge, ignored by PIERCE | 🟡 mid — magnitude doubled, single-shot |
| **THORNS** | "Attackers take 2 damage back" | (engine handler exists — read but no live spell uses it; needs deeper trace) | 🟢 low — implemented, hard to assess at desk |
| **CORRODE** | "Random enemy loses 2 max HP permanently" | `target.maxHp -= round(15 * amp)` once per CORRODE_CD; floor of 50 maxHP | 🔴 high — 7.5× the magnitude, has cooldown |
| **WITHER** | (described as "applies wither") | 3 turns of wither status; wither *halves all heals on victim* | 🟡 mid — heal-suppression is the actual point |
| **HASTE** | "Bonus auto-attack at 50% damage" | `+10 ATK / +10 SPD` for 3 turns (no bonus attack) | 🔴 high — completely different mechanic |
| **INSPIRE** | "Heal ALL allies by 1 HP each" | `+round(2 * amp) ATK and SPD` to all guildmates (permanent for round, no heal) | 🔴 high — buff aura, not heal |
| **DRAIN** | "Deal 2 damage to enemy, heal self for 2" | Sets `caster.drainActive = true` flag — actual damage/heal logic in attack handler (not in applyEffect) | 🟡 mid — too thin a peek to assess; flag-only handler |
| **SILENCE** | "Random enemy's card effects don't activate" | Hostile pull: highest-ATK enemy in mid range silenced for 2 turns; ignores guild | 🟡 mid — direction right, target-selection wrong |
| **NULLIFY** | (not in V5 doc table) | Strips one defensive flag from target (priority: WARD → BARRIER → ANCHOR → HASTE → DODGE) | 🟡 mid — implemented, undocumented |
| **CHAIN** | "Auto-attack and effects hit 2 targets" | Bounces a separate damage hit to a **random** non-caster non-primary in `melee*1.5` range | 🟡 mid — single bounce, range-limited |
| **TAUNT** | "Force enemies to target you" | Sets `tauntActive = true` flag (engine respects it in target selection — not deeply traced here) | 🟢 low — present, not on any live spell |
| **CLEANSE** | "Remove all debuffs from self" | Wipes burn/poison/timers/hex/weakened/silenced/marked/wither/blind from caster | 🟢 low — matches doc reasonably |

**Engine-line citations (anchor for the simulator session):**
- BURN apply: `combatEngine.js:523-531` · BURN tick: `combatEngine.js:1124-1149`
- POISON apply: `combatEngine.js:532-538` · POISON tick: `combatEngine.js:1090-1120`
- HEAL: `combatEngine.js:546-555` · BLESS: `combatEngine.js:557-573`
- WARD: `combatEngine.js:575-577` apply, `:822-824` consume · BARRIER: `:578-580` apply, `:827-832` consume
- ANCHOR: `combatEngine.js:581-583` apply, `:840-843` consume · CHAIN: `combatEngine.js:649-685`
- HEX: `combatEngine.js:609-611` · TETHER: `combatEngine.js:618-621` apply, `:833-839` consume
- HASTE: `combatEngine.js:625-628` · INSPIRE: `combatEngine.js:687-693` · CLEANSE: `combatEngine.js:695-710`
- WITHER: `combatEngine.js:629-630` (heal-halver applied at HEAL/BLESS sites)

---

## 2. Effects implemented but never appear on a card

The engine has handlers for these, but no `spells` row uses them as `base_effect`:

- **TAUNT** — implemented `combatEngine.js:590-592`, zero spells.
- **REFLECT** — implemented, zero spells.
- **CLEANSE** — implemented, zero spells (the WITHER handler also self-clears burns; CLEANSE is engine-level only).

Verdict: **dead implementations.** Either ship a card that uses them or remove from engine on cleanup.

## 3. Effects documented but not implemented

From `EFFECTS_REFERENCE_V5.md` table that have no `applyEffect` case:

- **SHATTER, STUN, FEAR, DOOM, SIPHON, LEECH, AMPLIFY, OVERCHARGE, SLOW, STEALTH, PHASE, INFECT, SWIFT, FREE** — 14 effects documented, never reached the V4 engine. Some (FREE, SWIFT) were tied to the mana economy that was stripped (per `project_mana_dead_code.md`).

Verdict: doc is hallucinating effects. Either delete those rows from `EFFECTS_REFERENCE_V5.md` or add the implementations.

## 4. Constants table (the artifact for the simulator)

All values cited from `combatEngine.js` at the indicated line.

| Quantity | Formula | Line |
|---|---|---|
| Auto-attack base damage | `max(1, floor(atk² / (atk + def)))` | `:135` |
| Auto-attack interval (s) | `max(2.5, 7.5 - spd × 0.1)` | `:129` |
| Card cast interval (s) | `max(5.5, 12.0 - spd × 0.1)` | `:130` |
| Slot multiplier (slot 0) | ×1.35 damage | `:138` |
| Slot multiplier (slot 2 if HP<40%) | ×1.5 damage | `:139` |
| BURN tick interval | 1.0s | `:1132` |
| BURN tick damage | `burnStacks × 6` (max 3 stacks → max 18/tick) | `:1126` |
| BURN duration | `cardInterval(spd) × 2` seconds | `:527` |
| POISON tick interval | 1.5s | `:1098` |
| POISON tick damage | `floor(target.maxHp × 0.03 × stacks)` | `:1092` |
| POISON decay | 1 stack removed every 3 fires (~4.5s) | `:1100-1103` |
| HEAL amount | `floor(caster.maxHp × 0.07 × amp × hamp)` | `:550` |
| BLESS amount (per ally in range) | `floor(caster.maxHp × 0.04 × amp × hamp)` | `:559` |
| WITHER heal-suppression | ×0.5 on heals received | `:551, :568` |
| WARD effect | full block of next non-PIERCE attack | `:822-824` |
| BARRIER HP | `round(50 × amp)`, or 25 if witherActive | `:579` |
| ANCHOR effect | caps damage at `hp - 1` (one-time) | `:840-843` |
| CHAIN bounce range | `melee × 1.5` | `:658` |
| HEX ATK debuff | `+8 per stack, max 24` | `:610` |
| MARK damage taken | `×1.25`, 3 turns | `:773` |
| WEAKEN damage dealt | `×0.5`, 2 turns | `:769` |
| SURGE damage mult | `×1.5` (single hit) | `:767` |
| EXECUTE bonus | `×1.5` if defender HP < 30% | `:776-777` |
| CRIT mult | ×2 (×3 with stormrage zone bonus) | `:791` |
| TETHER caster recoil | `floor(dmg/2)` per attack, 3 turns | `:834-838` |
| HASTE buff | `+10 ATK, +10 SPD`, 3 turns | `:626-627` |
| INSPIRE aura | `+2 ATK, +2 SPD` to guildmates (round-permanent) | `:691-692` |
| Darktide zone regen | `3% maxHP / minute` (every 300 ticks) | `:1154-1158` |

**Zone bonuses recognized in code:** `atk` (smoulders ×1.2), `crit_mult` (stormrage ×3), `luck` (nighthollow +10), `regen` (darktide 3%/min), `heal_amp` (dawnbringer ×1.5), generic effect amp via `effectAmp(caster)`.

---

## 5. Worth-playing eyeball pass (10 archetype cards)

Rough numbers, no simulator. Assumes a typical Nine: HP=100, ATK=30, DEF=15, SPD=50.

| Card (effect) | Quick math | Verdict |
|---|---|---|
| **Solar Flare** (BURN) | 6 dmg/sec × ~10s duration = 60 dmg per stack. Max 3 stacks = 18/sec. 100 HP target dies in 6s if stacked. | 🟢 LIKELY GOOD — fast kill at 3 stacks |
| **Toxic Dart** (POISON) | 3 HP/1.5s = 2 HP/sec at 1 stack. 100 HP / 2 = 50s to kill solo. With Twilight Grove pre-stack: faster. | 🟡 MID — slow without backup, fast with zone bonus |
| **Solace** (HEAL) | 7% of caster maxHP = 7 HP per cast. Cast every ~7s. Outpaces 1-stack POISON (2/s) but loses to 2-stack BURN (12/s). | 🟡 MID — survives DOT-light, dies to focused fire |
| **Bastion** (WARD) | Blocks one full attack. Auto-attack lands every ~2.5s. WARD lasts until next hit = ~2.5s of upside. | 🔴 LIKELY WEAK — single-hit absorb, no scaling |
| **Adamant Grip** (ANCHOR) | Saves you from one lethal blow (hp→1). Then consumed. | 🟢 LIKELY GOOD — guaranteed survive a round, big tempo swing |
| **Chain Lightning** (CHAIN) | Bounces one extra hit at melee×1.5 range. ~baseDmg(30,15) = 60 dmg bonus per cast. | 🟢 LIKELY GOOD — free extra hit when targets cluster |
| **Overload** (SURGE) | ×1.5 next attack. baseDmg ~60 → 90. Single hit. | 🟡 MID — useful but one-shot |
| **War Banner** (INSPIRE) | +2 ATK / +2 SPD aura on all guildmates. Passive, no consume. | 🟢 LIKELY GOOD — round-long ATK uplift, scales with team size |
| **Petrify** (BLIND) | Target loses LUCK-based crit chance for 2 turns. | 🔴 LIKELY WEAK — niche; only matters vs high-LUCK builds |
| **Counterspell** (NULLIFY) | Strips one defensive buff. Useful against WARD/BARRIER stacks. | 🟡 MID — tempo card, wasted if no buffs to strip |

**Patterns:**
- **DOT damage outpaces single-target healing.** Solar Flare's 18/sec at 3 stacks beats Solace's 7-per-7s. Heal-only loadouts lose to focused BURN.
- **WARD is a trap** — a 2.5s shield in a 5-minute fight is rounding error. Either WARD needs a value (engine match doc → "absorb N") or duration extension.
- **ANCHOR is the strongest defensive in the set** because it converts to "guaranteed survive 1 hit" — strictly better than WARD's "block 1 hit" because you keep all your HP minus dmg-1.
- **INSPIRE is the strongest support** — round-permanent aura, no consume, scales linearly with allies. War Banner is probably underplayed (zero equips in the V4 window per Doc A §3).
- **The Hanwu Boglands stalemate** (per Doc A §2) makes more sense now: +30% to all effects buffs both BURN damage and HEAL output — BURN damage scales linearly, HEAL scales with caster maxHP, so on equally-statted fighters they cancel. The bonus needs an asymmetry to actually decide a fight.

---

## 6. Recommendations

**Low-effort, high-clarity (do before the simulator session):**
1. **Delete `EFFECTS_REFERENCE_V5.md`** or replace with a stub pointing to `combatEngine.js`. It's actively misleading. The constants table in §4 above is the replacement.
2. **Delete the 14 documented-but-unimplemented rows** from any reference doc that survives. SHATTER/STUN/FEAR/DOOM etc. don't exist.
3. **Decide TAUNT/REFLECT/CLEANSE fate** — three handlers, zero cards. Either author cards for them in the next pack pass or remove the handlers.
4. **Drop the `effect_definitions` DB table** in a separate cleanup PR (along with `casts`, `events`, `zone_effects`, `card_durability_log` — see Doc A §6c). Add `§9.NN` entry: "legacy V2/V3 zone-influence schema cleanup".

**For the balance simulator initiative:**
1. Constants table (§4) is the input. Every cell is a tunable.
2. Highest-suspicion tunables (most likely off): WARD value, ANCHOR magnitude, BURN tick rate, POISON %-of-maxHP. These are the biggest description-vs-engine deltas, which suggests the engine values are coincidental rather than designed.
3. **Zone bonuses need redesign before sim runs** — per Doc A §6a, the +30% all-effects bonus is self-canceling. Don't sim against bonuses we already know are broken.

**Card description rewrite (deferrable):**
- The flavor text on each spell is fine — it's tone, not mechanics. No need to update.
- If/when in-game card UIs show numerical effects, generate them from engine constants, not from `EFFECTS_REFERENCE_V5.md`. Single source of truth = engine.

---

## 7. Spell catalog snapshot (84 cards by effect)

For Doc C's mapping table downstream:

| effect | count | houses |
|---|---|---|
| MARK | 7 | darktide, nighthollow, universal |
| BURN | 5 | smoulders |
| BARRIER | 5 (technically 6 — see note) | darktide, dawnbringer, manastorm, plaguemire ×2, universal |
| CHAIN | 5 | ashenvale ×2, darktide, stormrage, universal |
| DODGE | 5 | ashenvale ×3, nighthollow ×2 |
| WARD | 5 | darktide, stonebark ×2, stormrage ×2 |
| WEAKEN | 5 | ashenvale, dawnbringer, manastorm, stonebark, universal |
| HEAL | 4 | dawnbringer ×2, stonebark ×2 |
| SURGE | 4 | darktide, stormrage ×2, universal |
| ANCHOR | 3 | stonebark ×2, universal |
| DRAIN | 3 | darktide, manastorm ×2 |
| EXECUTE | 3 | dawnbringer, smoulders, universal |
| HEX | 3 | nighthollow, universal ×2 |
| SILENCE | 3 | nighthollow ×2, universal |
| TETHER | 3 | darktide, manastorm ×2 |
| THORNS | 3 | smoulders ×2, stonebark |
| WITHER | 3 | plaguemire ×3 |
| CRIT | 2 | stormrage ×2 |
| HASTE | 2 | ashenvale ×2 |
| NULLIFY | 2 | manastorm ×2 |
| PIERCE | 2 | dawnbringer, stormrage |
| POISON | 2 | plaguemire ×2 |
| BLESS | 1 | dawnbringer |
| BLIND | 1 | nighthollow |
| CORRODE | 1 | plaguemire |
| INSPIRE | 1 | dawnbringer |

(Total: 84.) Smoulders is the only mono-effect house (5/5 cards = BURN-themed even if sub-effect varies). Plaguemire concentrates on attrition (POISON/CORRODE/WITHER/BARRIER). Stormrage spread across CHAIN/CRIT/PIERCE/SURGE/WARD. Universal cards back-fill rare effects (HEX, MARK, EXECUTE, SILENCE).
