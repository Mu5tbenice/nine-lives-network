# Voxel-pixel primitive library — cast-animation design (2026-04-26)

**Goal:** propose a small library of reusable cast-animation primitives, parameterised by color/count/duration, then map each of the 84 active spells to a primitive + parameters. Source data: card name + description + effect + house. No external mood-board reference (per Wray's 2026-04-26 ruling).

**Out of scope here:** asset creation, code wiring, status-effect visuals (those are a separate layer — see §5), and primitives for survivors / world map. Arena casts only.

**Locked direction it builds on:** voxel-pixel + sound (`project_voxel_pixel_visual_direction.md`); spell anims separate from status visuals; auto-attacks also get spell animations; 8-angle sprites stay shelved for arena.

---

## 1. Primitive set (8 primitives)

Each primitive is a parameterised motion+particle template. Per-card overrides supply color, count, duration, and a "feel" modifier.

| # | Primitive | Motion | What it's for | Default params |
|---|---|---|---|---|
| 1 | **BURST** | Radial outward pop from impact point | Single-tick attacks, status-application punches, critical strikes | 12 particles, 350ms, fast easing |
| 2 | **TRAIL** | Linear caster→target streak, leaves afterimage | Projectiles, dashes, pierce-style attacks | 8 particles, 250ms, linear |
| 3 | **RISE** | Upward bloom from target's feet, soft ascend | Heals, buffs, inspire auras, ally-targeted positives | 16 particles, 600ms, ease-out |
| 4 | **ZIGZAG** | Jagged angular path, can branch | Lightning-style chains, multi-target arcs | 6 particles per arc, 400ms, sharp bounce |
| 5 | **DOME** | Hemispheric shell forms over caster | Wards, barriers, defensive holds | Wireframe shell, 800ms hold + 400ms fade |
| 6 | **CRUMBLE** | Downward shatter / particles fall | Executes, debuffs, decay, hard hits, silence-presses | 20 particles, 700ms, gravity-easing |
| 7 | **SPIRAL** | Orbiting motes around target | Marks, hexes, curses, target-locks | 8 motes, ~1200ms loop, slow rotation |
| 8 | **BEAM** | Continuous tether between caster and target | Drains, tethers, projectile darts | 1 line + 4 ribbon particles, 500ms |

**Composition rule:** complex casts can chain ≤2 primitives back-to-back. Example: *Solar Flare* (BURN) = BURST on impact, then short TRAIL of trailing embers as the burn-status visual hands off. Default is single-primitive for clarity; composition is opt-in.

**Sound hook:** each primitive has a single named SFX bucket (see §5). One sound per primitive, not per card.

---

## 2. Effect → primitive default mapping

This is the lookup the renderer keys off when a card lacks an explicit override. Per-card overrides in §4.

| effect | primary primitive | rationale |
|---|---|---|
| BURN | BURST + TRAIL | impact pop, ember trail handoff |
| POISON | BEAM (projectile) | toxic dart / spray motion |
| CORRODE | CRUMBLE | structural decay |
| HEAL | RISE | classic upward bloom |
| BLESS | RISE (wider, multi-target) | aoe variant of RISE |
| WARD | DOME | overhead shell |
| BARRIER | DOME (denser, longer hold) | thicker variant of DOME |
| ANCHOR | DOME (heavy, rooted, low) | grounded variant of DOME |
| DODGE | TRAIL (caster afterimage) | flicker-out dash |
| REFLECT | BURST + DOME (consume on hit) | kept for future cards |
| TAUNT | RISE (banner-style) | kept for future cards |
| SILENCE | CRUMBLE | downward press silencing |
| HEX | SPIRAL | curse motes circling |
| WEAKEN | CRUMBLE (softer) | enervation/sag |
| MARK | SPIRAL (sigil ring) | target reticle |
| TETHER | BEAM (persistent) | binding ribbon |
| DRAIN | BEAM (siphon ribbon) | stream from target → caster |
| HASTE | TRAIL (caster) | motion blur on self |
| WITHER | CRUMBLE | decay/age-out |
| BLIND | CRUMBLE (darkness fall) | downward shadow shroud |
| NULLIFY | BURST (cancel pop) | counterspell snap |
| CHAIN | ZIGZAG | classic lightning arc |
| INSPIRE | RISE (banner aura) | group rallying |
| CLEANSE | RISE (washing out debuff motes) | kept for future cards |
| SURGE | BURST (radial pulse) | overcharge |
| CRIT | BURST (sharp, with halo) | critical impact |
| PIERCE | TRAIL (linear, narrow) | piercing line |
| EXECUTE | CRUMBLE (heavy, decisive) | finishing blow |
| THORNS | BURST (spike-out) | retribution spikes |

---

## 3. House color palettes

Two-color (primary + accent) per house. Primary drives the dominant particle color; accent is highlights, sparkles, secondary motes.

| House | Primary | Accent | Feel |
|---|---|---|---|
| ashenvale | silver `#C8CFD6` | slate `#5E6B7A` | wind, swift, monochrome cool |
| darktide | deep teal `#1A6E78` | foam white `#E0F2F4` | tidal, undertow, oceanic |
| dawnbringer | gold `#E5B83A` | ivory `#F4ECD8` | radiant, holy, warm |
| manastorm | arcane purple `#6E3CB6` | cyan `#3FD3F0` | scholarly, electric-glyph |
| nighthollow | violet `#5B2C82` | bone white `#EFE8DC` | shadow, void, muted |
| plaguemire | bile green `#7AAA1F` | black `#0E1108` | rot, swamp, infectious |
| smoulders | ember orange `#E36B0A` | ash gray `#3A2F2A` | fire, charred earth |
| stonebark | moss green `#5C7A3D` | bark brown `#5A3E22` | rooted, mossy, grounded |
| stormrage | electric blue `#3F7FFF` | bright yellow `#FFE03A` | lightning, raw current |
| universal | neutral white `#EFEFEF` | gray `#8C8C8C` | unaligned, raw mana |

Implementation note: these are starting palettes — easy to revise per Wray's eye when assets are first composited. The point of pinning hex codes now is to remove "what color does each house use" as a per-card decision.

---

## 4. Per-card mapping table (84 cards)

`primitive` column is the primary motion. `params` summarises color from §3 + count/duration deltas from §1 default.

### Ashenvale (8 cards) — silver / slate, wind theme

| Card | Effect | Primitive | Params |
|---|---|---|---|
| Cyclone Strike | CHAIN | ZIGZAG | silver arcs, 2 branches, 350ms (fast/sharp) |
| Tempest | CHAIN | ZIGZAG | silver arcs, 3 branches, 500ms (broader) |
| Mistwalker's Cloak | DODGE | TRAIL | silver afterimage on caster, 300ms |
| Phantom Step | DODGE | TRAIL | silver afterimage, faster (200ms) |
| Vanishing Gale | DODGE | TRAIL | silver+slate dual afterimage, 350ms |
| Gust Blade | HASTE | TRAIL | silver motion-blur on caster, 400ms |
| Tailwind | HASTE | TRAIL | silver streamers behind caster, 500ms |
| Windshear | WEAKEN | CRUMBLE | slate descending shards, 600ms |

### Darktide (8 cards) — deep teal / foam, tidal theme

| Card | Effect | Primitive | Params |
|---|---|---|---|
| Abyssal Barrier | BARRIER | DOME | teal shell, 1000ms hold, dense |
| Maelstrom | CHAIN | ZIGZAG | teal arcs spiraling, 500ms |
| Leech Current | DRAIN | BEAM | teal ribbon target → caster, foam highlights |
| Abyssal Whisper | MARK | SPIRAL | teal motes orbiting target, ~1200ms loop |
| Sovereign Tide | MARK | SPIRAL | teal sigil ring, slower, more opaque |
| Riptide | SURGE | BURST | teal radial pulse + foam spray, 400ms |
| Kraken's Embrace | TETHER | BEAM | persistent teal tendril, 800ms |
| Tidal Guard | WARD | DOME | teal shell with foam ripples |

### Dawnbringer (8 cards) — gold / ivory, radiant theme

| Card | Effect | Primitive | Params |
|---|---|---|---|
| Sanctuary | BARRIER | DOME | gold shell, ivory inner glow |
| Blessing of Light | BLESS | RISE | gold pillars on each ally, wider radius |
| Divine Wrath | EXECUTE | CRUMBLE | gold descending shards on target, ivory accent |
| Ascension | HEAL | RISE | gold bloom rising taller (800ms) |
| Solace | HEAL | RISE | softer ivory bloom, 600ms |
| War Banner | INSPIRE | RISE | banner-style gold pillar at caster, persistent for round |
| Radiant Strike | PIERCE | TRAIL | narrow gold lance, 300ms |
| Herald's Rebuke | WEAKEN | CRUMBLE | ivory descending fade on target |

### Manastorm (8 cards) — arcane purple / cyan, scholarly theme

| Card | Effect | Primitive | Params |
|---|---|---|---|
| Mana Barrier | BARRIER | DOME | purple shell with cyan glyph etchings |
| Arcane Siphon | DRAIN | BEAM | purple ribbon, cyan core |
| Resonance Tap | DRAIN | BEAM | thinner purple beam, dotted |
| Counterspell | NULLIFY | BURST | purple cancel-pop with cyan ring snap |
| Unravel | NULLIFY | BURST | purple unraveling threads, cyan tail |
| Arcane Convergence | TETHER | BEAM | purple+cyan dual ribbon |
| Binding Clause | TETHER | BEAM | purple chains binding target |
| Reality Warp | WEAKEN | CRUMBLE | cyan reality-tears falling |

### Nighthollow (8 cards) — violet / bone, shadow theme

| Card | Effect | Primitive | Params |
|---|---|---|---|
| Petrify | BLIND | CRUMBLE | violet darkness fall + bone shards |
| Shadowmeld | DODGE | TRAIL | violet fade-out caster afterimage |
| Umbral Shroud | DODGE | TRAIL | violet shroud particles, slower fade |
| Creeping Doubt | HEX | SPIRAL | violet motes orbiting, dense |
| Revenant Surge | MARK | SPIRAL | violet sigil with bone halo |
| Shadow Bolt | MARK | SPIRAL | violet bolt with lingering motes |
| Oblivion | SILENCE | CRUMBLE | violet darkness press, 800ms |
| Veil of Dusk | SILENCE | CRUMBLE | softer violet veil drop |

### Plaguemire (8 cards) — bile green / black, rot theme

| Card | Effect | Primitive | Params |
|---|---|---|---|
| Demonic Growth | BARRIER | DOME | bile-green spiked shell |
| Spore Shield | BARRIER | DOME | green spore-cloud shell |
| Blightfall | CORRODE | CRUMBLE | bile green descending splatters |
| Pandemic | POISON | BEAM | green spray spread, multi-puff trail |
| Toxic Dart | POISON | BEAM | green dart projectile, single |
| Phoenix Veil | WITHER | CRUMBLE | green-black ash fall |
| Plague Doctor | WITHER | CRUMBLE | sickly green descending mist |
| Wither | WITHER | CRUMBLE | classic decay, 700ms |

### Smoulders (8 cards) — ember orange / ash, fire theme

| Card | Effect | Primitive | Params |
|---|---|---|---|
| Ember Strike | BURN | BURST + TRAIL | orange impact, ash trail |
| Eruption | BURN | BURST | wide orange radial, more particles (24) |
| Firestorm Volley | BURN | BURST × 3 | three small orange bursts in sequence |
| Kindle | BURN | BURST | small orange spark, 250ms |
| Solar Flare | BURN | BURST + RISE | orange impact with rising flame pillar |
| Scorched Earth | EXECUTE | CRUMBLE | ash debris fall + orange residue |
| Cinder Guard | THORNS | BURST | orange spike-out around caster |
| Molten Shell | THORNS | BURST | orange spike-out, denser |

### Stonebark (8 cards) — moss green / bark brown, rooted theme

| Card | Effect | Primitive | Params |
|---|---|---|---|
| Adamant Grip | ANCHOR | DOME | bark-brown low rooted dome |
| Root Strike | ANCHOR | CRUMBLE+TRAIL | roots erupt up at target then ground (override default) |
| Regrowth | HEAL | RISE | moss-green rising vines, 700ms |
| Verdant Mend | HEAL | RISE | moss-green softer bloom |
| Earthshatter | THORNS | BURST | bark-brown stone shards outward |
| Ancient Bulwark | WARD | DOME | bark-brown shield, dense, 1000ms |
| Bastion | WARD | DOME | bark-brown squared shell |
| Quake | WEAKEN | CRUMBLE | brown ground-shake debris |

### Stormrage (8 cards) — electric blue / yellow, lightning theme

| Card | Effect | Primitive | Params |
|---|---|---|---|
| Chain Lightning | CHAIN | ZIGZAG | blue+yellow arcs, 3 branches, fast |
| Eye of Thunder | CRIT | BURST | blue radial halo with yellow core |
| Spark | CRIT | BURST | tiny blue+yellow pop, 200ms |
| Short Circuit | PIERCE | TRAIL | narrow blue lance with yellow sparks |
| Overload | SURGE | BURST | wide blue+yellow pulse |
| Surge Tap | SURGE | BURST | smaller blue tap, 300ms |
| Thunder Guard | WARD | DOME | blue shell, yellow arcing glyphs |
| Voltaic Ward | WARD | DOME | blue shell with yellow electric mesh |

### Universal (10 cards) — neutral white / gray

| Card | Effect | Primitive | Params |
|---|---|---|---|
| Hold the Line | ANCHOR | DOME | gray rooted dome, low |
| Arcane Shield | BARRIER | DOME | white shell |
| Mana Bolt | CHAIN | ZIGZAG | white arc, 1 branch (basic) |
| Nethara's Judgment | EXECUTE | CRUMBLE | white descending decree shards |
| Chaos Rift | HEX | SPIRAL | gray motes + white tear |
| Hex Bolt | HEX | SPIRAL | gray motes orbiting |
| Abyssal Verdict | MARK | SPIRAL | gray sigil ring |
| Fate's Coin | MARK | SPIRAL | spinning coin + gray motes |
| Void Rend | MARK | SPIRAL + BURST | gray spiral + white impact rip |
| Sealed Decree | SILENCE | CRUMBLE | gray descending stamp |
| Ley Surge | SURGE | BURST | white radial pulse |
| Arcane Bolt | WEAKEN | CRUMBLE | gray descending mana shards |

(Total: 84 cards mapped. Universal lists 12 because three cards have base_effect=MARK; matches the §7 table in `2026-04-26-spell-catalog.md`.)

---

## 5. Status-effect visuals (separate layer)

Per the locked direction "spell anims separate from status visuals," cast primitives end when the cast resolves. Persistent status indicators are a different visual track, rendered on the affected fighter:

- **BURN** — small ember haze drifting upward from the fighter (loop, ~2s cycle, fades when stacks=0)
- **POISON** — slow green drips falling from fighter (loop, ~1.5s cycle)
- **MARK** — small reticle hovering above fighter's head (steady, until expires)
- **WITHER** — desaturation overlay + occasional ash drift (subtle)
- **BLIND** — darkness around the fighter's head (faint cloud)
- **HEX** — single mote orbiting fighter slowly
- **SILENCE** — small crossed-out circle above fighter
- **WARD** — faint shimmer on fighter outline (until consumed)
- **BARRIER** — visible HP bar of barrier next to fighter HP
- **TETHER** — persistent thin BEAM between caster and target until consumed
- **HASTE / INSPIRE** — soft outline glow on fighter (color from house)

These are deliberately subtle — they communicate state without competing with cast animations.

---

## 6. Sound layer (one SFX per primitive)

Per the design ruling "one SFX per primitive, not per card." Sketch only — actual sound design deferred.

| Primitive | SFX archetype |
|---|---|
| BURST | sharp percussive crack with brief tail |
| TRAIL | whoosh / swoosh / dash |
| RISE | ascending chime / bloom |
| ZIGZAG | crack-and-jump (lightning hop) |
| DOME | low resonant thud + shimmer hold |
| CRUMBLE | descending shatter / heavy fall |
| SPIRAL | mid-pitch hum / orbital wobble |
| BEAM | continuous low drone with attack and release |

Each SFX is pitched/filtered per-house at runtime (e.g., smoulders BURST = warmer, stormrage BURST = brighter, sharper). One sound bank, not 84.

---

## 7. Integration breadcrumb (where this plugs in)

**Current cast-visual code:** `/public/nethara-live.html` line 4390 — the `socket.on('combat:effect')` handler. Today calls `spawnParticles()` with a flat color/count by effect name.

**Existing precedent:** `/public/spell-vfx.js` already defines per-house shapes (ball, wave, shard, slash, bolt, orb, star, spiral, cloud) — kept as a reference, but the V4 pipeline gets deleted per `project_voxel_pixel_visual_direction.md`.

**Proposed integration sketch (no code in this doc):**
1. Replace `spawnParticles()` with `spawnPrimitive(primitiveName, { house, effect, count, duration, x, y, tx, ty })`.
2. The renderer keys off the per-card override table (§4) when present; falls back to `effect → primitive` mapping (§2) otherwise.
3. House color comes from the §3 palette; primitive count/duration from §1 defaults + per-card delta in §4.
4. Voxel-pixel asset format: TBD with the 3D layers session — start with sprite-sheet voxel particles + simple polyhedron primitives, no full voxel grids.
5. Status-effect overlay (§5) is a separate render layer attached to fighter sprite, not the cast layer.

**Asset folder:** new `/public/assets/vfx-primitives/` (one subfolder per primitive, sprite atlases inside). Not creating in this doc.

---

## 8. What this doc deliberately does NOT decide

- **Asset format / authoring tool** — voxel meshes vs. sprite atlases vs. shader-only is the next session's call.
- **Frame counts / timing per primitive** — defaults in §1 are placeholders for first build.
- **Whether DODGE / HASTE need camera or sprite-only effects** — likely sprite-only for arena, but the renderer can layer either.
- **Auto-attack visuals** — locked direction says auto-attacks also get spell animations. Current proposal: auto-attacks default to a generic BURST in caster's house color, no card-specific override. Revisit when archetypes feel uniform.
- **Per-rarity sparkle** — if rare/legendary cards want visual distinction, it's an additive layer over the primitive (e.g., a halo). Not specced here.
