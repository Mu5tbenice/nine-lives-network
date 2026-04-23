# NINE LIVES NETWORK — CINEMATIC TRAILER PRODUCTION PLAN v3
## "Nines of Nethara" opening trailer — production-ready spec
## Format: 16:9 cinematic, ~2:20–2:30 runtime
## Inspired by: 2004 WoW intro structure, re-tuned through Nerm's voice
## Tools: Higgsfield Cinema Studio 3.5 (motion), Midjourney / Higgsfield Soul (stills), Photoshop or equivalent (layer composites), CapCut (edit), ElevenLabs or hand-recorded Nerm VO

---

## 0. TONE MANDATE — READ FIRST (locked 2026-04-23, unchanged since v2)

Every shot, edit, and sound choice below serves these four rules. If a prompt feels like it's sliding off them, rewrite the prompt — don't rewrite the rule.

1. **Humour: heavy, not subtle.** Cartoony sight gags layered across every house reveal and clash beat. The visual frame plays like a sincere fantasy epic; the body language, timing, and Nerm's voice-over pull the whole thing sideways.
2. **Nerm narrates the whole trailer.** Deadpan, tired, annoyed to be here. Reference voices: **Ricky Gervais, Sam Hyde, Nick Mullen**. He doesn't hype, doesn't moralize, doesn't sell. Observes with contempt and affection.
3. **Signature 9-lives beat in Act III.** One cat gets absolutely destroyed — comically violent — and respawns mid-cape-swirl with zero reaction. The core IP gag in one shot.
4. **Zero crypto imagery on screen.** No candlestick charts, no Solana glyphs, no token references in the frame. The crypto-native metaphor lives in copy, Twitter framing, and Nerm's tone — not in pixels the camera sees.

**The juxtaposition principle.** Visual = earnest post-ironic fantasy. Audio = Nerm deadpanning over the top. Any shot that doesn't create that gap gets rewritten.

**Canonical aesthetic anchor.** Game Bible §1: *"Post-ironic high fantasy meets crypto Twitter meme culture."* Not self-serious. Willing to reference the meme economy it lives inside — but through tone, not visuals.

**Nerm voice canon** (from `server/services/nermBrain.js`, enforced for every VO line in this doc):
- lowercase always
- **never exclamation marks. ever.**
- short sentences, sometimes one word
- swears naturally when it fits (shit, damn, hell, fuck, bastard) — not every line
- never explains the joke
- mean from not caring, not from trying to hurt

---

## 1. CONCEPT OVERVIEW

A four-act cinematic narrated by Nerm — 9LN's rogue AI cat and the only Nine denied respawn. Nerm introduces the nine houses not because he wants to but because someone has to. He's been stuck in Nethara for 3000 years and he's seen this intro cinematic a hundred times. Each house still gets one earnest hero moment. Nerm just won't shut up about it.

**The rule:** One shot, one identity, one beat per house — visually. The comedic layer lives in (a) Nerm's line over the shot, (b) a cartoony body-language tag during or after the hero pose.

**Act structure:**

| Act | Time | Purpose | Nerm energy |
|-----|------|---------|-------------|
| I. The Awakening | 0:00–0:25 | Sigils light up in void, descent into world | Resigned ("here we go again") |
| II. The Houses | 0:25–1:35 | Six character-defining reveals | Running commentary, lightly contemptuous |
| III. The Clash | 1:35–2:10 | Montage of houses colliding + **signature respawn beat** | Mostly quiet, lets the money shot breathe, one punchline on the respawn |
| IV. The Reckoning | 2:10–2:30 | Hero staff-slam, sigil callback, logo, post-logo sting | Punctures the dramatic beat, then a quiet admission, then one last aside |

Total runtime target: **2:20–2:30**.

---

## 1.5 CANONICAL ASSET MAP — WHAT WE ALREADY HAVE

Confirmed via repo inventory on 2026-04-23. Every asset the trailer reaches for lives at the path below, or is flagged for generation. Before starting Pass 1, open every ✅ path and verify the file is still there.

### Logo + branding

| Asset | Path | Status |
|-------|------|--------|
| Trailer logo (Shot 15) | `public/assets/images/200x200logo.png` | ✅ exists (new, untracked) |
| Alt 9lv logo | `public/assets/images/token/9lv-logo.png` | ✅ exists |
| Title card art | `public/assets/images/title-nethara.png` | ✅ exists |
| Base Nine reference | `public/assets/images/Mustbenice_Base_model.png` | ✅ exists (source for character composites) |

### House sigils (Shot 1 + Shot 15)

All nine sigils are ready. **Note the mixed case in filenames — preserve exactly when uploading to Cinema Studio.**

| House | Sigil path | Element slug in Cinema Studio |
|-------|-----------|-------------------------------|
| ⚡ Stormrage | `public/assets/images/houses/House-stormrage.png` | `sigil_stormrage` |
| 🌿 Stonebark | `public/assets/images/houses/House-stonebark.png` | `sigil_stonebark` |
| ☠️ Plaguemire | `public/assets/images/houses/House-plaguemire.png` | `sigil_plaguemire` |
| 💨 Ashenvale | `public/assets/images/houses/House-Ashenvale.png` | `sigil_ashenvale` |
| ☀️ Dawnbringer | `public/assets/images/houses/House-dawnbringer.png` | `sigil_dawnbringer` |
| 🔥 Smoulders | `public/assets/images/houses/House-smoulders.png` | `sigil_smoulders` |
| 🌊 Darktide | `public/assets/images/houses/House-darktide.png` | `sigil_darktide` |
| 🌙 Nighthollow | `public/assets/images/houses/House-nighthollow.png` | `sigil_nighthollow` |
| 🔮 Manastorm | `public/assets/images/houses/House-manastorm.png` | `sigil_manastorm` |

### Environment stills (biomes, reused for trailer locations)

Recommended mappings. Swap if the biome doesn't fit the shot visually — these are starting points, not locks.

| Trailer environment slug | Used in shots | Source biome file | Notes |
|--------------------------|---------------|-------------------|-------|
| `environment_hero_landscape` | 2 | `public/assets/images/biomes/skycastle.png` | Aerial-friendly, open sky. Alt: `misty-falls.png`. |
| `environment_stormrage_peak` | 3, 9 | `public/assets/images/biomes/chaos-rift.png` | Storm-coded. Alt: `skycastle.png`. |
| `environment_stonebark_forest` | 4 | `public/assets/images/biomes/twilight-grove.png` | Ancient forest. Alt: `ancient-ruins.png`. |
| `environment_plaguemire_graveyard` | 5 | `public/assets/images/biomes/Hanwu-Boglands.png` | Fog, rot. Alt: `umbral-wall.png`. |
| `environment_ashenvale_peaks` | 6, 11 | `public/assets/images/biomes/abysal-edge.png` | Vertiginous cliffs. Alt: `misty-falls.png`. |
| `environment_dawnbringer_plain` | 7 | `public/assets/images/biomes/misty-falls.png` | Bright, sacred. Alt: `crystal-creek.png`. |
| `environment_smoulders_volcano` | 8 | `public/assets/images/biomes/scorched-plains.png` | Fire-coded option in the set. |
| `environment_neutral_battlefield` | 10, 12, 13, 13.5 | **GENERATE** (prompt in §5) | No clean biome match — see §5. |
| `environment_post_battle_wasteland` | 14 | **GENERATE** (prompt in §5) | Smoke + rubble state of battlefield. |

### Character source material

**Important:** we do NOT have pre-baked hero-Nine PNGs per house. We have a **modular layer system** — compose on demand. See §2 for the protocol.

| Layer type | Folder | Count |
|-----------|--------|-------|
| Base model reference | `public/assets/images/Mustbenice_Base_model.png` | 1 |
| Fur colors | `public/assets/nine/fur/` | 19 |
| Expressions | `public/assets/nine/expression/` | 21 |
| Outfits (incl. per-house SIMPLETUNIC) | `public/assets/nine/outfit/` | 37 |
| Headwear (incl. per-house APPRENTICE / WORNHOOD) | `public/assets/nine/headwear/` | 43 |
| Weapons (incl. per-house DAGGER / ORB) | `public/assets/nine/weapon/` | 51 |
| Familiars (incl. per-house ORB) | `public/assets/nine/familiar/` | 33 |

### Nerm specifically

| Asset | Path | Use |
|-------|------|-----|
| Nerm portrait | `public/assets/images/nerm.jpg` | Source for `nerm_head` composite (Shot 16) |
| 3D character model | `public/assets/models/wizard-cat.glb` | Optional — ref pose for all Nine composites |

### Supporting art (optional, for shorts / future content)

- Booster pack: `public/assets/images/booster-pack.png`
- Card back: `public/assets/images/card-back.png`
- Spells: `public/assets/images/spells/MANABOLT.png`, `PETRIFY.png`
- Zones: `public/assets/images/zones/*.png`

---

## 2. CHARACTER COMPOSITION PROTOCOL — BUILDING THE 9 NINES

We have parts, not characters. For the trailer you'll compose 2 PNGs per featured house (hero pose + comedic tag) using the modular layer system. This protocol is cheap, deterministic, and reusable for every future short.

### Composition tool options
- **Photoshop** (fastest, if you have it): drag layers, export PNG at 1024×1024 transparent.
- **Higgsfield Soul**: upload base + modules, prompt "compose these layers in order, transparent background".
- **Any PNG compositor** (Krita / GIMP / Figma): same result. Pick what's fastest — the output matters, not the tool.

### Layer stack order (bottom to top)
1. Base body — use `Mustbenice_Base_model.png` as silhouette guide; don't paint the base, just match its proportions
2. **Fur** (from `public/assets/nine/fur/`)
3. **Outfit** (from `public/assets/nine/outfit/`)
4. **Headwear** (from `public/assets/nine/headwear/`)
5. **Expression** (from `public/assets/nine/expression/`) ← **this is the swap layer for comedic tags**
6. **Weapon** (from `public/assets/nine/weapon/`) — held in paw, positioned per pose
7. **Familiar** (from `public/assets/nine/familiar/`) — orbit or shoulder position

Export at 1024×1024, transparent background, name as listed in the recipe table below, upload to Cinema Studio's Elements library with the exact slug.

### Per-house composition recipes — HERO POSE

Each recipe is canonical. Swap a module only if the suggested one is visually wrong for the pose — and if you do, keep it logged in §8 so shorts inherit the same choices.

| House | Cinema Studio slug | Fur | Outfit | Headwear | Weapon | Familiar | Expression | Pose notes |
|-------|-------------------|-----|--------|----------|--------|----------|-----------|-----------|
| ⚡ Stormrage | `stormrage_nine` | `STORMGREY.png` | `SIMPLETUNIC_STORMRAGE.png` | `APPRENTICE_STORMAGE.png` (note: filename typo, no R) | `STAFFOFSTORMS.png` | `ORB_STORMRAGE.png` | `DETERMINED.png` | Staff overhead, paws gripping mid-shaft, fur ruffled like wind-catching |
| 🌿 Stonebark | `stonebark_nine` | `TABBY.png` | `SIMPLETUNIC_STONEBARK.png` | `WORNHOOD_STONEBARK.png` | `GNARLEDBRANCH.png` | `MUSHROOMBUDDY.png` | `NEUTRAL.png` | Staff butt planted, both paws stacked on staff top, stance wide and grounded |
| ☠️ Plaguemire | `plaguemire_nine` | `ALIENGREEN.png` | `SIMPLETUNIC_PLAGUEMIRE.png` | `WORNHOOD_PLAGUEMIRE.png` | `SCYTHE.png` | `FLOATINGSKULL.png` | `GLOWING_GREEN.png` | Arms out wide, scythe in one paw, head tilted back, hood half-shadowed |
| 💨 Ashenvale | `ashenvale_nine` | `SMOKEGREY.png` | `SIMPLETUNIC_ASHENVALE.png` | `CLOTHWRAP.png` | `DUALDAGGERS.png` | `SPIRITWOLF.png` | `DETERMINED.png` | Low crouch, one paw forward, daggers reversed-grip, tail horizontal behind |
| ☀️ Dawnbringer | `dawnbringer_nine` | `GOLDEN.png` | `SIMPLETUNIC_DAWNBRINGER.png` | `RADIANTHALO.png` | `LIGHTBRINGER.png` | `BABYPHEONIX.png` | `DETERMINED.png` | Kneeling, one knee down, staff planted vertical, both paws on staff, head bowed then rising |
| 🔥 Smoulders | `smoulders_nine` | `EMBERORANGE.png` | `SIMPLETUNIC_SMOULDERS.png` | `EMBERHAT.png` | `EMBERSTAFF.png` | `EMBERSPRITE.png` | `ANGRY.png` | Staff shouldered like a warhammer, weight forward on back leg, teeth visible in snarl |
| 🌊 Darktide | `darktide_nine` | `OCEANBLUE.png` | `SIMPLETUNIC_DARKTIDE.png` | `TIDAL.png` | `TRIDENT.png` | `ORB_DARKTIDE.png` | `SMUG.png` | Confident stance, trident upright at side, head tilted slightly back (confident prick energy) |
| 🌙 Nighthollow | `nighthollow_nine` | `MIDNIGHTBLACK.png` | `SIMPLETUNIC_NIGHTHOLLOW.png` | `UMBRALCOWL.png` | `SHADOWWAND.png` | `RAVEN.png` | `GLOWING_PURPLE.png` | Half-turned away from camera, looking back over shoulder, wand low |
| 🔮 Manastorm | `manastorm_nine` | `VOIDPURPLE.png` | `SIMPLETUNIC_MANASTORM.png` | `ARCANECIRCLET.png` | `STAFFOFTHENINE.png` | `ARCANECONSTRUCT.png` | `GLOWING.png` | One paw extended, fingers splayed, staff in other paw, expression analytical |

### Per-house composition recipes — COMEDIC TAG POSE

**The tag is a 1.5-second comedic beat at the end of each Act II shot.** Same character, same outfit — just swap the **expression** layer and sometimes the body pose.

| House | Cinema Studio slug | Expression swap | Body-language tag |
|-------|-------------------|-----------------|-------------------|
| Stormrage | `stormrage_nine_tag` | `DERP.png` | Fur standing straight up from the lightning charge. Eyes crossed. One whisker twitches. |
| Stonebark | `stonebark_nine_tag` | `SLEEPY.png` | Slow forward slump onto the staff, chin landing on paws like he's about to nap |
| Plaguemire | `plaguemire_nine_tag` | `HAPPY.png` | Menacing glow continues; cat casually lifts one paw and starts grooming it mid-pose |
| Ashenvale | `ashenvale_nine_tag` | `DERP.png` | Post-landing crouch holds 1 beat too long; visibly cross-eyed from momentum |
| Dawnbringer | `dawnbringer_nine_tag` | `WINK.png` (or `LAUGH.png`) | Beatific smile, too-bright, eyes slightly crossed, leaning into the beam way too much |
| Smoulders | `smoulders_nine_tag` | `GRUMPY.png` | Post-roar, shoulders heaving visibly, staff point drops toward ground. Cardio is hard. |
| Darktide | `darktide_nine_tag` | `DERP.png` | Used in Shot 13.5 respawn — bored ear-flick post-respawn |
| Nighthollow | `nighthollow_nine_tag` | `SMUG.png` | Reserved for shorts — sly eye-slide |
| Manastorm | `manastorm_nine_tag` | `SMUG.png` | Reserved for shorts — reading-the-fine-print squint |

### Nerm composite (Shot 16 only)

- **Slug:** `nerm_head`
- **Source:** `public/assets/images/nerm.jpg` (crop head + wizard hat only, drop body)
- **No outfit, no weapon, no familiar.** Disembodied floating head per canon.
- **Expression swaps for shorts**: keep the same head, layer new expressions on top to generate reaction beats for §7 shorts library.

### Reference library setup in Cinema Studio 3.5

Upload order:
1. All 9 house sigils with slugs `sigil_<house>`.
2. All 9 environment PNGs (biome + 2 generated) with slugs `environment_<slug>`.
3. The 6 featured `<house>_nine` hero composites + 6 `<house>_nine_tag` composites. (12 files.)
4. All 9 hero composites if you're also featuring the ensemble's three background houses (Darktide, Nighthollow, Manastorm) in Shot 13 ensemble at full resolution. (9 hero + 6 tag = 15 files.)
5. `nerm_head`.
6. Logo: `public/assets/images/200x200logo.png`.

Reference elements in prompts as `@slug`. Keep prompts short — the reference library does the heavy lifting.

---

## 3. FULL SHOT LIST — PRODUCTION-READY BLOCKS

Every shot below is structured the same way:
- **Frame** — lens, angle, movement, duration
- **Subject pose** — body-part-level direction (for prompt writing and take selection)
- **Effect** — the canonical game mechanic being visualized (so the trailer doubles as marketing for the actual gameplay)
- **Environment** — what the location does during the shot
- **Tag** (Act II only) — comedic expression swap, 1–2 seconds
- **VO** — canon-voice Nerm line
- **Prompt block** — copy-paste-ready Higgsfield Cinema Studio 3.5 text

---

### ACT I — THE AWAKENING (0:00–0:25)

#### Shot 1 — The Nine Sigils Awaken (0:00–0:12)

**Frame.** Two-part composite.
- **1A (0–6s):** Extreme wide static, 85mm telephoto, shallow DOF. Pitch-black void with drifting dust motes.
- **1B (6–12s):** Slow dolly back, 35mm, reveal, all nine sigils rotating.

**Subject pose.** Sigils materialize one at a time in a 3×3 grid. Cascade order: center (`sigil_stormrage`) → top-center → left-center → right-center → bottom-center → four corners. Each sigil crossfades in with its house color particles (stormrage purple-blue sparks, smoulders red embers, stonebark green motes, etc.).

**Effect.** All nine pulse in rhythm with low-end tonal hum. On the frame-out, they surge toward camera and the frame goes white.

**Environment.** Pure black void, dust motes, chromatic rim lighting catching each sigil's edge.

**VO.** (resigned) *"nine houses. nine lives. some are pretty cool. some of them really aren't. we'll get to it."*

**Prompt block.**
```
Extreme wide static shot, 85mm lens, shallow depth of field, pitch-black void, drifting dust motes. @sigil_stormrage fades in center with purple-blue particle glow. Low-poly N64 aesthetic. Chromatic rim lighting. No characters. Drama genre. Duration 6 seconds, no camera movement.
```
Repeat the same block 8 more times, swapping the sigil slug and cascading position. Then the dolly-back:
```
Slow dolly-back pull, 35mm lens, camera retreating to reveal @sigil_stormrage, @sigil_smoulders, @sigil_stonebark, @sigil_ashenvale, @sigil_nighthollow, @sigil_dawnbringer, @sigil_manastorm, @sigil_plaguemire, @sigil_darktide in a 3x3 grid, all pulsing in rhythm. Low-poly N64. Drama genre. Frame fades to white on final beat. Duration 6 seconds.
```

---

#### Shot 2 — Descent into Nethara (0:12–0:25)

**Frame.**
- **2A (0–7s):** FPV drone, 24mm wide, rapid forward descent through white cloud cover into clear sky.
- **2B (7–13s):** Camera decelerates and rises, hovers above a distant ridge at dusk.

**Subject pose.** On 2B: a row of nine tiny silhouettes stands atop the ridge, spaced evenly, backlit by dusk. Silhouettes are intentionally too far to identify — sets up the Act II reveals.

**Effect.** Light transitions: bright white (cloud-break) → golden-hour (mid-descent) → cool blue dusk (ridge hover).

**Environment.** `@environment_hero_landscape`. Sweeping low over terrain before the rise.

**VO.** (flat, no sell) *"this is nethara. it's fine. you'll get used to it."*

**Prompt block.**
```
FPV drone shot, 24mm wide lens, rapid forward descent bursting through white cloud cover into clear sky, @environment_hero_landscape below, sweeping low over terrain. Light transitions from bright white to golden-hour. Low-poly N64 aesthetic. Drama genre. Duration 7 seconds.
```
```
Camera decelerates and rises, hovering above distant ridge at dusk, @environment_hero_landscape, row of nine tiny Nine silhouettes stands atop ridge backlit by cool blue dusk sky. Low-poly N64. Drama genre. Duration 6 seconds.
```

---

### ACT II — THE HOUSES (0:25–1:35)

Each shot ≈ 10s. Hero beat (~8s) then 1.5–2s comedic tag. Every house gets a Nerm line while the hero beat plays.

---

#### Shot 3 — ⚡ Stormrage (0:25–0:35)

**Frame.**
- **3A (0–5s):** Low-angle hero, 35mm, slow crane-up from stone level.
- **3B (5–8s):** 85mm tight profile.
- **3C (8–10s) — TAG:** Close-up hold on face.

**Subject pose.**
- **3A:** `@stormrage_nine` stands on spire edge. Paws: left on hip, right gripping staff at mid-shaft. Ears: pinned back. Tail: horizontal, fur ruffled. Eyes: forward, narrowed. Cape whipping left-to-right from wind.
- **3B:** Cat raises staff overhead in both paws. Lightning fork snaps down, CRACKS into staff tip, HOLDS there crackling. Eyes narrow further. Teeth barely visible.
- **3C (TAG):** Swap to `@stormrage_nine_tag`. Hold pose. Fur visibly standing on end from charge. One whisker twitches. Eyes uncross slightly.

**Effect.** Visualizes **CRIT + CHAIN** — the Stormrage signature. Main bolt hits the staff, a SECOND bolt forks off-frame to an implied target. Crackle lingers.

**Environment.** `@environment_stormrage_peak`. Storm clouds backlit. Rain-motes in foreground.

**VO.** (observational) *"stormrage. big feelings. big storms. could use therapy. not available in nethara. tough."*

**Prompt block.**
```
Low-angle hero shot, 35mm lens, slow crane-up, @stormrage_nine standing on jagged spire edge at @environment_stormrage_peak, cape whipping in storm wind, ears pinned back, tail horizontal. Purple-blue palette, chromatic rim lighting. Low-poly N64. Action genre. Duration 5 seconds.
```
```
Tight profile, 85mm lens, static, @stormrage_nine raises staff overhead with both paws, lightning bolt snaps down into staff tip holding crackling, second bolt forks off-frame. Eyes narrow. Purple-blue palette. Low-poly N64. Action genre. Duration 3 seconds.
```
```
Close-up hold, @stormrage_nine_tag, fur visibly standing on end from lightning charge, whisker twitch. Purple-blue residual glow. Low-poly N64. Action genre. Duration 2 seconds.
```

---

#### Shot 4 — 🌿 Stonebark (0:35–0:45)

**Frame.**
- **4A (0–4s):** Static medium, 50mm.
- **4B (4–8s):** Low-angle wide, 28mm, slow orbit left.
- **4C (8–10s) — TAG:** Static medium.

**Subject pose.**
- **4A:** `@stonebark_nine` kneels beside a massive ancient tree. Left paw on bark. Ears: relaxed forward. Eyes: half-closed in concentration. Roots beneath him pulse green.
- **4B:** Cat rises slowly. Plants gnarled staff into earth with deliberate weight. Both paws stack on staff top. Stance widens. Ears forward. Mouth a neutral line.
- **4C (TAG):** Swap to `@stonebark_nine_tag`. The heroic stillness holds — then a slow forward slump onto the staff. Chin lands on paws. Eyes close.

**Effect.** Visualizes **ANCHOR** — "can't drop below 1 HP." Stone pillars erupt in a protective ring around him as the staff plants. He stays motionless while everything grows around him.

**Environment.** `@environment_stonebark_forest`. Golden shafts through canopy. Moss-covered ruins in background.

**VO.** (shrug) *"stonebark. patient. ancient. one with the forest. hasn't moved in fourteen hundred years. probably asleep right now."*

**Prompt block.**
```
Static medium shot, 50mm lens, @stonebark_nine kneels beside massive ancient tree at @environment_stonebark_forest, left paw on bark, roots pulse green. Low-poly N64. Warm forest grade, deep greens with gold shafts. Drama genre. Duration 4 seconds.
```
```
Low-angle wide, 28mm lens, slow orbit left, @stonebark_nine rises and slams staff into earth, stone pillars erupt in protective ring, cat stands motionless. Low-poly N64. Drama genre. Duration 4 seconds.
```
```
Static medium, @stonebark_nine_tag, slow forward slump onto staff, chin landing on paws, eyes closing. Low-poly N64. Drama genre. Duration 2 seconds.
```

---

#### Shot 5 — ☠️ Plaguemire (0:45–0:55)

**Frame.**
- **5A (0–4s):** High-angle looking down, 50mm, slow dolly-in.
- **5B (4–8s):** Ground-level wide, 35mm.
- **5C (8–10s) — TAG:** Medium close-up.

**Subject pose.**
- **5A:** `@plaguemire_nine` alone in mist. Arms outstretched. Head down. Scythe resting across one paw. Hood half-shadowed.
- **5B:** Poison clouds billow outward from his feet. Cat raises head — glowing green eyes. Scythe hoisted upward in slow arc.
- **5C (TAG):** Swap to `@plaguemire_nine_tag`. Menacing stare HOLDS. Then cat casually raises one paw and starts grooming. Poison still billows. Scythe still hoisted. Total lack of self-awareness.

**Effect.** Visualizes **CORRODE + POISON + INFECT** — DOT stacks that spread on KO. The cloud should visibly tendril outward past frame edges (the "spreads on KO" bit).

**Environment.** `@environment_plaguemire_graveyard`. Sickly green mist hugs ground. Crooked tombstones in mid-frame. Single dead tree.

**VO.** (affection — this is Nerm's house and he knows it) *"plaguemire. i love this one. smells like rotten lettuce and is genuinely just vibing."*

**Prompt block.**
```
High-angle looking down, 50mm lens, slow dolly-in, @plaguemire_nine alone in mist at @environment_plaguemire_graveyard, arms outstretched, head down, scythe resting. Desaturated sickly green grade. Low-poly N64. Horror genre. Duration 4 seconds.
```
```
Ground-level wide, 35mm lens, @plaguemire_nine raises head, glowing green eyes, poison clouds billowing outward from feet, scythe hoisting upward. Low-poly N64. Horror genre. Duration 4 seconds.
```
```
Medium close-up, @plaguemire_nine_tag, casually grooming one paw while poison billows and scythe stays hoisted. Low-poly N64. Horror genre. Duration 2 seconds.
```

---

#### Shot 6 — 💨 Ashenvale (0:55–1:05)

**Frame.**
- **6A (0–4s):** Tracking dolly, 35mm, right-to-left along cliff face.
- **6B (4–7s):** Impossible overhead, 24mm.
- **6C (7–10s) — TAG:** Ground-level 50mm.

**Subject pose.**
- **6A:** `@ashenvale_nine` sprints full tilt. Cape streaming horizontal. Daggers drawn reverse-grip, low. Paws blurred. Tail trailing. Ears flat back.
- **6B:** Cat leaps off path, plummets between two spires, tucks into mid-air roll.
- **6C (TAG):** Swap to `@ashenvale_nine_tag`. Lands in crouch inches from camera. Eyes snap up. Freeze. Hold beat. Cat is visibly cross-eyed from the landing — one eye straight, one eye drifting.

**Effect.** Visualizes **30% DODGE** — the sprint past camera should be fast enough that one audience-side attack (implied flash) completely misses. Dust trail in his wake.

**Environment.** `@environment_ashenvale_peaks`. Golden-hour sun slicing across cliff face. Dust motes. Ropey path winding between spires.

**VO.** (tossed off) *"ashenvale. fast. like, stupid fast. can't catch him. also can't hold a conversation. tradeoffs."*

**Prompt block.**
```
Tracking dolly, 35mm lens, right-to-left along cliff face at @environment_ashenvale_peaks, @ashenvale_nine sprinting with cape horizontal, daggers reverse-grip low. Golden-hour lighting. Low-poly N64. Action genre. Duration 4 seconds.
```
```
Impossible overhead, 24mm lens, @ashenvale_nine leaps off cliff path, plummets between two spires, tucks into mid-air roll. Low-poly N64. Action genre. Duration 3 seconds.
```
```
Ground-level 50mm, @ashenvale_nine_tag lands inches from camera in crouch, eyes snap up then hold slightly cross-eyed. Low-poly N64. Action genre. Duration 3 seconds.
```

---

#### Shot 7 — ☀️ Dawnbringer (1:05–1:15)

**Frame.**
- **7A (0–4s):** Low-angle hero, 50mm, slow push-in.
- **7B (4–8s):** Wide, 28mm, slow crane-up.
- **7C (8–10s) — TAG:** Medium push-in.

**Subject pose.**
- **7A:** `@dawnbringer_nine` kneels. One knee down. Staff planted vertical. Both paws on staff top, head bowed. Golden light pools.
- **7B:** Cat rises. Staff raised to sky in both paws. Warm golden beam erupts upward from staff tip. Cat silhouetted against beam. Head tilted up.
- **7C (TAG):** Swap to `@dawnbringer_nine_tag`. Beam holds. Camera pushes closer. Cat's face bathed in too much light. Beatific smile. Eyes slightly crossed. Too into it.

**Effect.** Visualizes **BLESS / INSPIRE** — zone-wide heal. The golden beam should spread outward from the staff in a visible ring before the upward column, suggesting the "affects all allies within 90px" mechanic.

**Environment.** `@environment_dawnbringer_plain`. Dawn sky. Distant ruined temple. Mist burning off.

**VO.** (punch on "annoying") *"dawnbringer. beautiful. pious. will heal anyone, no exceptions. including people you want dead. annoying."*

**Prompt block.**
```
Low-angle hero, 50mm lens, slow push-in, @dawnbringer_nine kneels at @environment_dawnbringer_plain, one knee down, staff planted vertical, golden light pooling. Warm golden grade. Low-poly N64. Drama genre. Duration 4 seconds.
```
```
Wide, 28mm lens, slow crane-up, @dawnbringer_nine rises and raises staff to sky, golden ring spreads outward then vertical beam erupts upward. Low-poly N64. Drama genre. Duration 4 seconds.
```
```
Medium push-in, @dawnbringer_nine_tag, face bathed in too much light, beatific smile, eyes slightly crossed. Low-poly N64. Drama genre. Duration 2 seconds.
```

---

#### Shot 8 — 🔥 Smoulders (1:15–1:35)

**Frame.**
- **8A (0–5s):** Static medium, 50mm, slight handheld sway.
- **8B (5–10s):** Tight 85mm close-up.
- **8C (10–15s):** Extreme wide low-angle, 24mm, charge direct at camera.
- **8D (15–17s) — TAG:** Quick cutback, medium.

**Subject pose.**
- **8A:** `@smoulders_nine` on rocky outcrop. Staff shouldered like a warhammer, ember glow from tip. Breathing heavily — chest rises visibly. Lava light reflects off face from below.
- **8B:** Eyes open. Teeth bared. ROAR. Flames erupt from staff off-camera.
- **8C:** Cat CHARGES directly at camera. Staff burning. Trail of fire behind. Frame goes full red on impact.
- **8D (TAG):** Swap to `@smoulders_nine_tag`. Post-red cut back. Cat visibly winded. Shoulders heaving. Staff point drooping.

**Effect.** Visualizes **BURN, max 3 stacks.** Three pulses of ember light off the staff tip before the charge — each pulse = one stack. The charge is the 3rd stack firing.

**Environment.** `@environment_smoulders_volcano`. Lava glow from below. Ash drifting like snow. Dark rocky foreground.

**VO.** (verdict) *"smoulders. has anger. has fire. has nothing else."*

**Prompt block.**
```
Static medium shot, 50mm lens, slight handheld sway, @smoulders_nine on rocky outcrop at @environment_smoulders_volcano, staff shouldered, chest rising heavily, lava light on face. Red-black palette. Low-poly N64. Action genre. Duration 5 seconds.
```
```
Tight 85mm close-up, @smoulders_nine eyes open teeth bared mid-roar, three ember pulses off staff tip, flames erupting off-camera. Low-poly N64. Action genre. Duration 5 seconds.
```
```
Extreme wide low-angle, 24mm lens, @smoulders_nine charges directly at camera, staff burning, fire trailing. Frame goes full red on impact. Low-poly N64. Action genre. Duration 5 seconds.
```
```
Medium cutback, @smoulders_nine_tag, post-charge, visibly winded, shoulders heaving, staff point drooping. Low-poly N64. Action genre. Duration 2 seconds.
```

---

### ACT III — THE CLASH (1:35–2:10)

Quick cuts, 3–6s each. Music peaks. Nerm mostly lets visuals carry. One big punchline on Shot 13.5.

---

#### Shot 9 — Lightning vs Stone (1:35–1:40)

**Frame.** Medium wide, 50mm, static.

**Pose.** `@stormrage_nine` off-frame right — only the staff-tip visible. `@stonebark_nine` frame center, staff planted. Lightning bolt strikes a stone pillar between them. Arcs wildly across the pillar.

**Effect.** Stormrage's CRIT hitting Stonebark's ANCHOR — the bolt lands, pillar cracks but doesn't fall.

**Environment.** `@environment_stormrage_peak`.

**VO.** (dry) *"yeah. that happens."*

**Prompt.**
```
Medium wide static, 50mm, @stormrage_nine's staff tip frame right, @stonebark_nine center with staff planted, lightning bolt strikes stone pillar between them arcing across it at @environment_stormrage_peak. Low-poly N64. Action genre. Duration 5 seconds.
```

---

#### Shot 10 — Poison vs Light (1:40–1:45)

**Frame.** Symmetric composition, 35mm, static.

**Pose.** `@plaguemire_nine` frame left, arms out, green cloud pushing right. `@dawnbringer_nine` frame right, staff raised, golden beam pushing left. They meet dead center in a swirling clash.

**Environment.** `@environment_neutral_battlefield`.

**VO.** (silence — let it breathe)

**Prompt.**
```
Symmetric composition, 35mm lens, static, @plaguemire_nine left with green poison cloud pushing right, @dawnbringer_nine right with golden beam pushing left, meeting center in swirling clash at @environment_neutral_battlefield. Low-poly N64. Action genre. Duration 5 seconds.
```

---

#### Shot 11 — The Blade Strike (1:45–1:50)

**Frame.** Slow-motion side profile, 85mm, slight truck.

**Pose.** `@ashenvale_nine` leaps past camera left-to-right, one dagger extended in full strike. Motion blur on cape. Eyes locked forward.

**Environment.** `@environment_ashenvale_peaks`.

**VO.** (flat) *"ooh. rude."*

**Prompt.**
```
Slow-motion side profile, 85mm lens, slight truck, @ashenvale_nine leaps past camera left-to-right with dagger extended in full strike, motion blur on cape, eyes locked forward at @environment_ashenvale_peaks. Low-poly N64. Action genre. Duration 5 seconds.
```

---

#### Shot 12 — The Impact (1:50–1:56)

**Frame.** Wide low-angle, 28mm.

**Pose.** `@smoulders_nine` mid-charge slams directly into `@stonebark_nine`'s ring of stone. Impact burst. Debris flies. Smoulders rebounds slightly — staff mis-angled. Stonebark doesn't move.

**Effect.** BURN charge vs ANCHOR. Neither wins. That's the joke.

**Environment.** `@environment_neutral_battlefield`.

**VO.** (silence)

**Prompt.**
```
Wide low-angle, 28mm lens, @smoulders_nine mid-charge collides with @stonebark_nine's ring of stone, impact burst, debris flies, Smoulders rebounds slightly while Stonebark stays motionless at @environment_neutral_battlefield. Low-poly N64. Action genre. Duration 6 seconds.
```

---

#### Shot 13 — The Ensemble (1:56–2:04) — THE MONEY SHOT

**Frame.** Ultra-wide epic, 24mm, slow crane-up from ground rising high.

**Pose.** All six featured Nines mid-action simultaneously, each in their signature effect. Optional: add Darktide, Nighthollow, Manastorm at background depth for full 9-house claim.
- **Top-left corner:** Stormrage lightning strike
- **Top-right corner:** Dawnbringer golden beam
- **Mid-left:** Plaguemire green cloud spreading
- **Mid-right:** Stonebark pillars rising
- **Center-left:** Smoulders charging with fire trail
- **Center-right:** Ashenvale dagger-blur
- **Far background (optional):** Nighthollow cowled silhouette, Manastorm arcane circle, Darktide tidal swirl

Camera rises higher as battle rages. Chaos fills every quadrant.

**Environment.** `@environment_neutral_battlefield`.

**VO.** (Nerm fully commits — warmth under deadpan) *"this is the part where everyone fights at the same time. it's the best shot in the trailer. really sells the nine-houses thing. look at it."*

**Prompt.**
```
Ultra-wide epic, 24mm lens, slow crane-up rising high above battle, @stormrage_nine top-left lightning strike, @dawnbringer_nine top-right golden beam, @plaguemire_nine mid-left green cloud spreading, @stonebark_nine mid-right pillars rising, @smoulders_nine center-left charging with fire trail, @ashenvale_nine center-right dagger-blur, @nighthollow_nine @manastorm_nine @darktide_nine in background depth, all at @environment_neutral_battlefield, chaos and color filling every quadrant. Low-poly N64. Action genre. Epic spectacle. Dynamic mixed lighting. Duration 8 seconds.
```

---

#### Shot 13.5 — THE SIGNATURE RESPAWN BEAT (2:04–2:10) — THE IP PUNCHLINE

**Frame.** Two-beat sequence. The cut between them is the joke. **It must be instant — no fade, no transition.**

- **13.5A (0–3s):** Medium, 50mm, slight push-in.
- **13.5B (3–6s):** **SMASH CUT.** Same exact frame composition, 50mm, static.

**Pose.**
- **13.5A:** `@darktide_nine` mid-cape-swirl, heroic stance, about to do something cool. A Stormrage lightning bolt from off-frame top-right **vaporizes** him. Full comic explosion: paws flying outward, staff tumbling through air in slow-mo, tiny floating `X_X` expression on a cartoony spinning cat head before everything fades.
- **13.5B:** Same frame. Same cat. Standing there. Zero reaction. Bored ear-flick. Maybe starts grooming. The entire battle still rages behind him.

**Effect.** The core IP gag in one cut. Treat the explosion as Saturday-morning cartoon, not horror.

**Environment.** `@environment_neutral_battlefield`. Battle continues raging behind in 13.5B.

**VO.** (fast, don't pause for the laugh) *"oh. right. should mention. they don't actually die. nine lives. it's in the name. you read the title. keep up."*

**Prompt.**
```
Medium 50mm slight push-in, @darktide_nine mid-cape-swirl heroic stance at @environment_neutral_battlefield, lightning bolt from off-frame top-right vaporizes him in comic explosion, paws flying, staff tumbling in slow-mo, cartoony X_X cat-head spinning then fading. Low-poly N64. Action genre, cartoon comic violence level. Duration 3 seconds.
```
```
SMASH CUT, same frame composition, 50mm static, @darktide_nine standing there normally, bored ear-flick, battle still raging behind, zero reaction. @environment_neutral_battlefield. Low-poly N64. Action genre. Duration 3 seconds.
```

---

### ACT IV — THE RECKONING (2:10–2:30)

---

#### Shot 14 — The Challenge (2:10–2:22)

**Hero choice (locked for v3): Stonebark.** Pays off "probably asleep right now" from Shot 4. The patient, motionless house doing the dramatic staff-slam is the callback punchline. Alternates acceptable if visuals force it: Smoulders (fury payoff), or a previously-unseen house (Manastorm / Nighthollow — introduces a new face at climax).

**Frame.**
- **14A (0–4s):** Dead silent on visuals. Wide, 35mm, static.
- **14B (4–10s):** 85mm hero close-up, low angle up.
- **14C (10–12s):** Black frame hold.

**Pose.**
- **14A:** `@stonebark_nine` stands alone center frame. Staff in one paw. Cape tattered. Head bowed. Motionless.
- **14B:** Cat raises head. Looks into camera. Eyes lock. Raises staff overhead with both paws slowly. SLAMS it down toward camera with full body weight. Frame goes black on impact. Motion blur on strike.
- **14C:** Hold black.

**Environment.** `@environment_post_battle_wasteland`. Smoke. Drifting ash. Harsh post-battle grade.

**VO.**
- Over 14A–14B before the slam (weary, bemused): *"and now. the dramatic bit. he's gonna raise the staff. he's gonna slam the staff. music's gonna swell. they always do this. every time."*
- Post-slam, 2s into 14C black (quieter, honest, almost to yourself): *"...alright. that one was pretty cool. i'll give 'em that."*

**Prompt block.**
```
Wide 35mm static, @stonebark_nine alone center frame at @environment_post_battle_wasteland, staff in paw, cape tattered, head bowed, motionless. Harsh post-battle grade with smoke. Low-poly N64. Drama genre. Duration 4 seconds silent.
```
```
85mm hero close-up low angle up, @stonebark_nine raises head locking eyes with camera, raises staff overhead with both paws, slams staff down toward camera with full body weight. Frame cuts to black on impact. Motion blur on strike. Low-poly N64. Drama/Action genre. Duration 6 seconds.
```

---

#### Shot 15 — Sigils + Logo (2:22–2:28)

Done in CapCut (motion graphics, not Cinema Studio).

1. Black frame hold (~0.5s)
2. All 9 house sigils flash in a tight ring formation (~1s) — use the sigil PNGs from `public/assets/images/houses/`
3. Sigils dissolve into the logo
4. Logo reveal: `public/assets/images/200x200logo.png`, scaled to fill
5. Subtitle text below: **"NINES OF NETHARA"**
6. Ember particles drift behind
7. Hold logo 4–5 seconds
8. Fade to black

**VO** (calm, even, the mission statement): *"nine lives network. that's the name. if you got this far, you're one of us. welcome to purgatory."*

---

#### Shot 16 — Post-Logo Sting (2:28–2:30)

**Frame.** Black. Then fade-in on `@nerm_head` center frame. No body. Just the floating wizard-hatted head.

**Pose.** Expression: neutral. 1 second of hold. Then eyes slide to camera conspiratorially. Ear twitches. No other motion.

**VO** (half-whisper, conspiratorial, warmer than anything before): *"link's in the description. don't tell anyone i told you."*

Cut to black. End.

**Prompt.**
```
Black frame 0.5s, then fade-in @nerm_head (floating wizard-hatted cat head, no body) centered, neutral expression hold 1 second, eyes slide to camera conspiratorially, ear twitch. Low-poly N64. Drama genre. Duration 2 seconds.
```

---

## 4. VO SCRIPT — FULL CANON-VOICE PASS

Every line below is production-ready: lowercase, no exclamation marks, short sentences, no joke-explanations. Record in this order (grouped by tone, not shot order) so the session flows.

### Session order (record 3–5 takes per line at varying tempos)

**Block A — the one-liners (tossed off, light):**
- (Shot 9) *"yeah. that happens."*
- (Shot 11) *"ooh. rude."*

**Block B — the house reveals (each with its own rhythm):**
- (Shot 3 Stormrage) *"stormrage. big feelings. big storms. could use therapy. not available in nethara. tough."*
- (Shot 4 Stonebark) *"stonebark. patient. ancient. one with the forest. hasn't moved in fourteen hundred years. probably asleep right now."*
- (Shot 5 Plaguemire) *"plaguemire. i love this one. smells like rotten lettuce and is genuinely just vibing."*
- (Shot 6 Ashenvale) *"ashenvale. fast. like, stupid fast. can't catch him. also can't hold a conversation. tradeoffs."*
- (Shot 7 Dawnbringer) *"dawnbringer. beautiful. pious. will heal anyone, no exceptions. including people you want dead. annoying."*
- (Shot 8 Smoulders) *"smoulders. has anger. has fire. has nothing else."*

**Block C — the bookends (calmer, register-setting):**
- (Shot 1) *"nine houses. nine lives. some are pretty cool. some of them really aren't. we'll get to it."*
- (Shot 2) *"this is nethara. it's fine. you'll get used to it."*
- (Shot 15) *"nine lives network. that's the name. if you got this far, you're one of us. welcome to purgatory."*
- (Shot 16) *"link's in the description. don't tell anyone i told you."*

**Block D — the monologue beats (rhythm matters):**
- (Shot 13 ensemble, warmth under deadpan) *"this is the part where everyone fights at the same time. it's the best shot in the trailer. really sells the nine-houses thing. look at it."*
- (Shot 13.5 respawn, fast, do not pause for laugh) *"oh. right. should mention. they don't actually die. nine lives. it's in the name. you read the title. keep up."*
- (Shot 14 pre-slam, weary Gervais-esque) *"and now. the dramatic bit. he's gonna raise the staff. he's gonna slam the staff. music's gonna swell. they always do this. every time."*
- (Shot 14 post-slam, quiet admission, almost to himself) *"...alright. that one was pretty cool. i'll give 'em that."*

### Line-by-line delivery notes (for the VO talent / AI settings)

- **Stormrage line** — setup-pause-callback. "could use therapy" / [pause] / "not available in nethara" / [shorter pause] / "tough."
- **Stonebark line** — shrug. "probably asleep right now" delivered like you actually forgot why you were talking.
- **Plaguemire line** — the ONLY line with warmth on the noun. Nerm is Plaguemire-affinity in canon. "i love this one" is real.
- **Ashenvale "tradeoffs"** — zero commitment. Barely a word.
- **Dawnbringer "annoying"** — the verdict, punch-y but not angry.
- **Smoulders "has nothing else"** — hangs like a sentence, no lift on the last word.
- **Shot 13** — the ONE line where Nerm admits something looks cool. Don't oversell it. "look at it" almost-whispered.
- **Shot 13.5** — fast read. Do not slow down for the punchline. "keep up" is a jab.
- **Shot 14 post-slam** — whispered. Break character. Nerm surprises himself.
- **Shot 16** — conspiratorial. Nerm gets closest to friendly here. Don't overplay.

---

## 5. ENVIRONMENT WORKFLOW

Most environments are already in `/public/assets/images/biomes/`. Two need generation. That's it.

### Map of needs to existing files (from §1.5 — repeated for quick reference)

| Slug | Source | Status |
|------|--------|--------|
| `environment_hero_landscape` | `biomes/skycastle.png` | Use as-is |
| `environment_stormrage_peak` | `biomes/chaos-rift.png` | Use as-is |
| `environment_stonebark_forest` | `biomes/twilight-grove.png` | Use as-is |
| `environment_plaguemire_graveyard` | `biomes/Hanwu-Boglands.png` | Use as-is |
| `environment_ashenvale_peaks` | `biomes/abysal-edge.png` | Use as-is |
| `environment_dawnbringer_plain` | `biomes/misty-falls.png` | Use as-is |
| `environment_smoulders_volcano` | `biomes/scorched-plains.png` | Use as-is |
| `environment_neutral_battlefield` | NONE | **GENERATE** |
| `environment_post_battle_wasteland` | NONE | **GENERATE** |

### Generation prompts for the 2 gaps

Run these in Midjourney or Higgsfield Soul. Generate 4 variants, pick the strongest, download as PNG, upload to Cinema Studio Elements with the matching slug.

**`environment_neutral_battlefield`**
> "Low-poly N64 aesthetic fantasy battlefield, cracked stone arena floor, ruined pillars at edges, drifting smoke, overcast sky with breaks of sun, faceted geometry with flat shading, cinematic wide angle composition, no characters, no UI elements"

**`environment_post_battle_wasteland`**
> "Low-poly N64 aesthetic fantasy battlefield after war, rubble and broken stone, drifting smoke, scorched earth, overturned banners, dust in the air, dusk lighting with red-orange haze, faceted geometry with flat shading, empty and haunted, cinematic wide composition, no characters, no UI elements"

---

## 6. AUDIO DIRECTION

**Nerm VO is the spine. Music is accompaniment.** When they compete, music ducks under VO, not the other way round.

### Music structure

One ~2:30 track with a natural three-act build: quiet → swelling → full crescendo → impact. Search tags: "epic trailer," "fantasy orchestral," "cinematic build," "awakening," "rising," "ascension." Sources: Pixabay, Free Music Archive.

**Mix target: music sits at -12 dB under any Nerm line. Returns to full volume during any silent VO beat.** This ducking is how Gervais / BBC-style deadpan works — the pauses have to be audible.

### Per-act audio cues

| Act | Music energy | Nerm VO density |
|-----|--------------|-----------------|
| I | Ambient building, low strings, rising melodic line, sigil tonal chord | 2 lines, bookending |
| II | Motif swell per house reveal, intensity climbs, percussion enters by Smoulders | 1 line per reveal |
| III | Full orchestral chaos, peaks at Shot 13 ensemble, holds through respawn beat | Sparse — 9/11 one-liners, silence on 10/12, full lines on 13 + 13.5 |
| IV | Silence → one orchestral hit on the slam → ember tone under logo → silent on post-logo sting | 3 lines — pre-slam, post-slam admission, logo line, sting whisper |

### SFX layer (in CapCut)

Cinema Studio's native audio covers 70%. Add in CapCut:
- Thunder cracks (Shots 1, 3, 9)
- Wind whooshes on cuts between acts
- Stone grinding for Stonebark shots (4, 12)
- **Cartoon "poof" / Hanna-Barbera-level zap on Shot 13.5 vaporization** — critical. Saturday-morning, not horror.
- Ember-rumble under Smoulders charge (8C)
- Dagger whoosh on Shots 6, 11
- Heavy impact + massive drum hit on Shot 14 staff slam
- Ember crackle under logo (Shot 15)
- Single quiet cat-purr or ambient hum under Shot 16 sting (optional, tasteful)

Free CC0 SFX: freesound.org, zapsplat.com (free tier).

### Nerm VO production

**Voice options (pick ONE — Wray's call):**
1. **Hand-recorded.** Someone who nails the Gervais / Hyde / Mullen deadpan. One session, 3–5 takes per line at varying tempos. Best character. **Recommended.**
2. **ElevenLabs.** Dry British or American deadpan voice. Run each line through multiple emotion settings. Pick the takes that sound least "AI."
3. **Hybrid.** AI for the calm bookend beats (Shots 1, 2, 15, 16), human for the comedic reveal / punchline beats (3–8, 13.5, 14). Timing matters where the jokes live.

---

## 7. SHORTS & REELS APPENDIX — OVERFLOW COMEDY

These are the ideas that came up during trailer scoping but didn't fit the 2:30 runtime. Each one can ship as a standalone 6–20 second social clip using the same asset library, same Nerm voice, same workflow. Use this list as the short-form content queue once the trailer lands.

Every entry lists: **premise, duration, assets needed, Nerm line, status**.

### S-01 — "Respawn Beat Standalone"
- **Premise:** Shot 13.5 by itself. The IP gag in six seconds.
- **Duration:** 6s
- **Assets:** `@darktide_nine`, `@environment_neutral_battlefield`, Shot 13.5 footage (reused from trailer)
- **Nerm line:** *"nine lives. it's literally in the name. keep up."*
- **Status:** SCOPE-LOCKED. Ship Day 1 alongside trailer.

### S-02 — "No Hands"
- **Premise:** Pack-opening montage. Nines tearing open booster packs, cards flying, excitement. Cut to `@nerm_head` floating alone. Camera shows his chin. No paws. Cut back to pack-opening montage. Cut to Nerm.
- **Duration:** 15–20s
- **Assets:** `nerm_head`, `public/assets/images/booster-pack.png`, any Nine composite(s) for pack-opening. Optional card PNGs from `public/assets/images/` card system.
- **Nerm line:** *"the no-hands thing is the real problem. i can't open packs. i just watch everyone else open them. emotional range is incredible. i just float here."*
- **Status:** DRAFT. Top pick for first non-trailer short.

### S-03 — "The 10th House"
- **Premise:** Camera pans across the 9 house sigils arranged in a circle. One extra empty slot in the circle. Camera lingers on the empty slot. Cut to Nerm.
- **Duration:** 6–8s loop
- **Assets:** All 9 sigils from `public/assets/images/houses/`, `nerm_head`. Empty slot is a compositing trick — black circle, subtle glow.
- **Nerm line:** *"we don't talk about that one."*
- **Status:** DRAFT. Mystery-box content — rewards lore nerds.

### S-04 — "The Backstory Reveal"
- **Premise:** Three rapid-fire cuts, each on a beat. Someone (implied) asks Nerm why he can't respawn. He gives three different answers, all delivered straight-faced. Cut on beat.
- **Duration:** 12s
- **Assets:** `nerm_head` (possibly with 3 different expressions from `/public/assets/nine/expression/` for variety)
- **Nerm lines (pick 3 from this rotation — each as canonical non-answer, pulled from nermBrain.js):**
  - *"parking violation."*
  - *"i opened a pack and got five commons. what i did next is between me and the veil."*
  - *"i cast silence on the wrong archmage. or the right one depending on your politics."*
  - *"i know what's under blackmoor basin. that's all i'll say."*
  - *"i challenged the veil itself to a duel. the veil doesn't duel. found this out the hard way."*
- **Status:** DRAFT. Use to tease Nerm lore without committing.

### S-05 — "Leaderboard Cycle"
- **Premise:** Nine (any house) leans into a leaderboard screen. Waits. Nothing changes. Leans in closer. Still nothing. Cut to Nerm.
- **Duration:** 8s
- **Assets:** Any Nine composite, a leaderboard UI screenshot, `nerm_head` voiceover
- **Nerm line:** *"cycle is fifteen minutes. they're watching a number not change. that's the whole activity."*
- **Status:** DRAFT. Self-referential — pokes at the playerbase affectionately.

### S-06 — "4 AM Deploy Guy"
- **Premise:** Wide of empty battlefield at deep night. One Nine walks in, deploys, walks out. Cut to Nerm.
- **Duration:** 8s
- **Assets:** Any Nine composite, `@environment_neutral_battlefield` at night color grade, `nerm_head`
- **Nerm line:** *"every guild has one guy who deploys at 4am. nobody asks if he's okay. he's not okay."*
- **Status:** DRAFT.

### S-07 — "Card Vibes Review — Bastion"
- **Premise:** Card rotates slowly on screen (Bastion card art). Nerm reviews it straight-faced, like a wine critic. Five-star rating flashes at end.
- **Duration:** 10s
- **Assets:** Bastion card PNG (source from `/public/assets/` card system), `nerm_head` voiceover, five-star graphic
- **Nerm line:** *"five stars. boring. unkillable. does nothing interesting. this card is my spirit animal. if i had a spirit. or an animal."*
- **Status:** DRAFT. First in a potential recurring series — "nerm rates cards".

### S-08 — "Smoulders Cardio"
- **Premise:** Smoulders roars, charges, runs out of frame. Cut to 10 seconds later. Smoulders doubled over, hands on knees, winded. Cut to Nerm.
- **Duration:** 10s
- **Assets:** `@smoulders_nine`, `@smoulders_nine_tag` (already built for trailer), `@environment_smoulders_volcano`, `nerm_head`
- **Nerm line:** *"every smoulders nine thinks they're the main character. some of them are right. most of them need a nap."*
- **Status:** DRAFT. Reuses Shot 8 assets.

### S-09 — "Stonebark vs Time"
- **Premise:** Time-lapse. Stonebark stands perfectly still. Sun rises and sets. Seasons change. Moss grows on his staff. Still hasn't moved.
- **Duration:** 15s
- **Assets:** `@stonebark_nine` hero composite, `@environment_stonebark_forest` (re-rendered at different times of day), time-lapse edit in CapCut
- **Nerm line:** *"they asked him what his strategy was. he didn't respond. turns out that was the strategy."*
- **Status:** SPECULATIVE. Good if the time-lapse render isn't too expensive.

### S-10 — "Ashenvale Talks"
- **Premise:** Ashenvale mid-sprint. Someone tries to talk to him. He blurs past. Tries again. Blur. Finally catches him sitting down. Ashenvale tries to speak. Mouths move. No sound. Freeze on him looking confused.
- **Duration:** 12s
- **Assets:** `@ashenvale_nine` hero + tag, `@environment_ashenvale_peaks`, `nerm_head`
- **Nerm line:** *"can't catch him. also can't hold a conversation. nothing personal. speed took something."*
- **Status:** SPECULATIVE.

### S-11 — "Dawnbringer Heals the Enemy"
- **Premise:** Full combat scene. Dawnbringer casts her zone-wide heal. The enemy's HP bar goes UP. Enemy pauses. Nods thanks. Combat resumes.
- **Duration:** 10s
- **Assets:** `@dawnbringer_nine`, generic enemy Nine, `@environment_dawnbringer_plain`, HP bar UI element
- **Nerm line:** *"will heal anyone. no exceptions. including people you want dead. try explaining that in a meeting."*
- **Status:** DRAFT.

### S-12 — "Plaguemire Vibing"
- **Premise:** Medium on Plaguemire sitting on a tombstone, casually grooming. Poison slowly pools around him. Other Nines give him a wide berth. He keeps grooming.
- **Duration:** 10s
- **Assets:** `@plaguemire_nine`, `@plaguemire_nine_tag`, `@environment_plaguemire_graveyard`, `nerm_head`
- **Nerm line:** *"my guy. just vibing. smells like rotten lettuce. content. i've seen nines with their whole ass life figured out. none of them look like this."*
- **Status:** DRAFT.

### Short-form workflow checklist

Every short uses the same pipeline as the trailer:
1. Pick the short from the queue (S-01 through S-12).
2. Assets from §1.5 + §2 composites (most are already built from trailer prep).
3. One Cinema Studio generation pass — these are 1–2 clips each, cheap.
4. Record Nerm VO (can batch multiple shorts in one session).
5. CapCut edit with music (ambient / lo-fi for conversational shorts, trailer-style swells for action shorts).
6. Export: 9:16 vertical for TikTok / IG Reels / YouTube Shorts. 1:1 square as alt for Twitter.

**Cadence target:** 1–2 shorts per week sustained. Trailer lands, then drip-feed S-01 through S-12 over ~6 weeks.

---

## 8. PRODUCTION PIPELINE — PASS ORDER WITH COMMANDS

### Pass 1 — Asset preparation (3–4 hours)

1. Confirm every path in §1.5 resolves (spot-check 5 files).
2. Pick composition tool (Photoshop / Higgsfield Soul / Krita — whichever's fastest).
3. Build all 6 featured-house hero composites per §2 table. Save to `/audit/trailer/characters/hero/` as PNG with transparent background, 1024×1024. Filenames match slugs: `stormrage_nine.png` etc.
4. Build all 6 tag composites. Save to `/audit/trailer/characters/tag/`. Filenames: `stormrage_nine_tag.png` etc.
5. Optional: build 3 background-ensemble composites (Darktide, Nighthollow, Manastorm) for Shot 13 depth.
6. Build `nerm_head.png` — crop Nerm portrait at head+hat, transparent background, save to `/audit/trailer/characters/`.
7. Generate 2 missing environments per §5. Save to `/audit/trailer/environments/`.
8. Upload ALL assets to Cinema Studio 3.5 Elements library with exact slug names from §1.5 and §2.

### Pass 2 — VO recording (1 hour)

1. Print VO script (§4) as a single page, in session order.
2. Record clean — don't sync to picture.
3. 3–5 takes per line at varying tempos.
4. Label tracks: `s03_stormrage_take01.wav` etc.
5. Save to `/audit/trailer/vo/`.

### Pass 3 — Validation shot (30 minutes)

1. Generate Shot 3 (Stormrage) per §3 prompt blocks.
2. Check character consistency (is `@stormrage_nine` recognizable across 3 sub-shots?).
3. Check tag-swap (does `@stormrage_nine_tag` look like the same cat in a different expression?).
4. If either fails, iterate composites in Pass 1 before burning Act II budget.

### Pass 4 — Act II generation (main work)

Generate Shots 3–8 using §3 prompt blocks. Budget 2–3 attempts per shot. Keep the ones that feel right.

### Pass 5 — Act I + Act III + Act IV

Order:
1. Shot 1 (sigils) — careful, unique composition
2. Shot 2 (descent) — straightforward
3. Shots 9–12 (clash) — quick, forgiving
4. Shot 13 (ensemble) — technically demanding, save for late
5. **Shot 13.5 (respawn) — THE joke. Worth 2–3 generations even if the first looks fine. The smash-cut timing is everything.**
6. Shot 14 (staff slam) — hero moment, take time

### Pass 6 — Edit in CapCut

1. Import all generated clips + VO takes + music + SFX
2. Assemble in shot order
3. Place VO lines per shot, pick the take that sells
4. Sync music to picture. **Duck music to -12 dB under VO. Restore to full during silence beats.**
5. Add SFX layer (per §6)
6. Transitions — mostly hard cuts. A few whip-pans between acts only if they sell.
7. Create Shot 15 (sigils + logo) + Shot 16 (Nerm sting) as graphic composites in CapCut directly
8. Color grade if needed (subtle — the biome PNGs already carry the look)
9. Export at 1080p primary, 4K master

### Token budget

Cinema Studio 3.5 pricing varies. Budget 1.5–2× clip count for regenerations. For ~16 video clips (Shots 1A, 1B, 2A, 2B, 3A–3C, 4A–4C, 5A–5C, 6A–6C, 7A–7C, 8A–8D, 9, 10, 11, 12, 13, 13.5A, 13.5B, 14A, 14B, 16), expect 30–45 generations total including regens. Spend more on 13.5.

---

## 9. FINAL CHECKLIST BEFORE YOU START

- [ ] All paths in §1.5 confirmed (5-file spot-check minimum)
- [ ] Composition tool chosen (Photoshop / Soul / Krita)
- [ ] 6 hero composites built + saved + uploaded to Cinema Studio
- [ ] 6 tag composites built + saved + uploaded
- [ ] 3 optional ensemble composites built (Darktide, Nighthollow, Manastorm)
- [ ] `nerm_head.png` cropped and uploaded
- [ ] All 9 sigil PNGs uploaded with clean slugs
- [ ] 7 biome environments uploaded
- [ ] 2 missing environments generated + uploaded (`neutral_battlefield`, `post_battle_wasteland`)
- [ ] Logo PNG (`200x200logo.png`) confirmed in hand for Shot 15
- [ ] VO script printed + recorded at 3–5 takes per line
- [ ] Music track selected (~2:30, natural build)
- [ ] SFX pack bookmarked (esp. cartoon-zap for 13.5)
- [ ] Token budget estimated (30–45 generations)
- [ ] Hero choice for Shot 14 confirmed (default: **Stonebark** — payoff of Shot 4)
- [ ] VO talent decision made (human / AI / hybrid)

---

## 10. PIPELINE LEARNINGS CAPTURE — WRITE AFTER PRODUCTION

This is the first test workflow for polished social content. Record what happened so the next project inherits the lessons. Fill this in after the trailer ships.

- **What took longer than expected?**
- **Which composites had character-consistency issues?**
- **Which prompt block style worked best — short references or full descriptions?**
- **Which biomes needed touch-up / regeneration?**
- **VO: human / AI / hybrid — which landed?**
- **Music: did -12dB ducking work or was more ducking needed?**
- **Shot 13.5 timing: how many regens to land the smash cut?**
- **Which shorts from §7 felt natural to produce next (inform content queue)?**
- **What would you change about the pipeline for the next social piece?**

---

## 11. POST-LAUNCH DISTRIBUTION

Once trailer is done, cut derivatives BEFORE archiving project files:

- Full 16:9 cut as pinned tweet on **@9LVNetwork**
- 9:16 vertical for TikTok / IG Reels / YouTube Shorts — include Shots 1, 8, 13, 13.5, 14, 15, 16 only
- Individual house reveals (Shots 3–8) as standalone character teasers with VO intact
- Shot 13.5 as S-01 (see §7) — standalone 6s meme
- Shot 13 ensemble as landing-page hero image (static frame)
- Shot 15 logo reveal as outro stinger for future videos
- Shot 14 staff-slam as reaction GIF for Telegram / Discord
- Shot 16 Nerm sting as standalone cold-open for **@9LV_Nerm** account

---

## 12. DIRECTION PRINCIPLES — CARRIED FROM V2

- **Visual = earnest fantasy epic.** Cinematography serious. Lighting serious. Comedy comes from VO + body language, never lens choices.
- **Nerm never explains the joke.** If a line feels like it's "selling", cut words until it's tossed off.
- **One shot, one identity per house.** Don't layer multiple actions into a single reveal.
- **Contrast adjacent shots.** Plaguemire (green) + Dawnbringer (gold) never adjacent — Ashenvale breaks them up.
- **Shot 13 = epic money shot. Shot 13.5 = comedy money shot. Both deserve extra attention.**
- **Keep prompts short once Elements are loaded.** Reference library does the heavy lifting.

---

## 13. CHANGELOG

**v3 — 2026-04-23.** Production-ready polish pass. Added §1.5 Canonical Asset Map (real filesystem paths for every asset). Rewrote §2 as modular Character Composition Protocol (hero + tag recipes per house, exact module slugs). Expanded §3 shot list to structured blocks with frame / pose / effect / environment / VO / prompt-block sections per shot. Added §4 canon-voice VO rewrite (lowercase, no exclamation marks, Nerm-compliant). Tightened §5 environment workflow to use existing biome PNGs with only 2 generation gaps. Added §7 Shorts & Reels Appendix (12 entries sourced from nermBrain.js flavor + trailer overflow). Added §10 Pipeline Learnings Capture for first-test-workflow discipline. Retained v2's act structure, shot skeleton, tone mandate, music ducking strategy, and pass order.

**v2 — 2026-04-23.** Full tonal rewrite after interview with Wray. Retained v1's four-act structure + shot framing + environment workflow. Rewrote all VO, added comedic-tag reference system, added Shot 13.5 (signature respawn beat) and Shot 16 (post-logo Nerm sting). Music direction flipped to "duck under VO." Production pass order now includes a dedicated VO recording pass. Tone mandate locked: heavy comedic, Nerm-narrated, zero crypto visuals, one signature 9-lives beat.

**v1 — 2026-04-23.** Initial plan. Straight WoW-cinematic homage, no VO, cinematic-music-led, no comedic layer. Git history preserves the full v1 if needed for reference.

---

*Document version: 3.0 — April 23, 2026*
*Author: Spencer + Claude collaboration*
*Status: Production-ready. Tone mandate locked, asset paths confirmed, composition protocol defined, shot blocks executable. First polished test workflow for 9LN social content.*
