# Character Composition Recipes — Trailer Pass 1

Open this alongside your compositor (Photoshop / Higgsfield Soul / Krita / GIMP). Each section is one Nine. Layer order is **bottom → top**. Export as 1024×1024 PNG, transparent background, with the exact filename shown.

All source layer files live under `public/assets/nine/<type>/` unless stated otherwise. Run `bash audit/trailer/verify_assets.sh` first to confirm every path below resolves.

---

## ⚡ Stormrage

**Hero output:** `audit/trailer/characters/hero/stormrage_nine.png`

| Layer | File | Notes |
|-------|------|-------|
| Fur | `public/assets/nine/fur/STORMGREY.png` | Base body color |
| Outfit | `public/assets/nine/outfit/SIMPLETUNIC_STORMRAGE.png` | Purple-blue house tunic |
| Headwear | `public/assets/nine/headwear/APPRENTICE_STORMAGE.png` | **filename typo: missing R** — use as-is |
| Expression | `public/assets/nine/expression/DETERMINED.png` | Narrowed eyes, forward |
| Weapon | `public/assets/nine/weapon/STAFFOFSTORMS.png` | Held overhead, both paws |
| Familiar | `public/assets/nine/familiar/ORB_STORMRAGE.png` | Orbiting right shoulder |

**Pose direction:** Left paw on hip, right paw gripping staff mid-shaft. Ears pinned back. Tail horizontal behind. Fur ruffled (cape wind). Eyes forward, narrowed.

**Tag output:** `audit/trailer/characters/tag/stormrage_nine_tag.png`
- Swap Expression → `DERP.png`
- Redraw fur as **standing straight up from electrical charge**, all points radiating. One whisker twitched. Eyes crossed.

---

## 🌿 Stonebark

**Hero output:** `audit/trailer/characters/hero/stonebark_nine.png`

| Layer | File | Notes |
|-------|------|-------|
| Fur | `public/assets/nine/fur/TABBY.png` | Earth-tone base |
| Outfit | `public/assets/nine/outfit/SIMPLETUNIC_STONEBARK.png` | Green-brown house tunic |
| Headwear | `public/assets/nine/headwear/WORNHOOD_STONEBARK.png` | Aged hood |
| Expression | `public/assets/nine/expression/NEUTRAL.png` | Half-lidded, calm |
| Weapon | `public/assets/nine/weapon/GNARLEDBRANCH.png` | Butt planted, both paws stacked on top |
| Familiar | `public/assets/nine/familiar/MUSHROOMBUDDY.png` | At feet or shoulder |

**Pose direction:** Staff butt planted in ground. Both paws stacked on staff top (like a shepherd's crook rest). Stance wide, grounded. Back straight. Chin level. Ears relaxed forward.

**Tag output:** `audit/trailer/characters/tag/stonebark_nine_tag.png`
- Swap Expression → `SLEEPY.png`
- Slow forward slump onto the staff — chin resting on paws — eyes closing. Same modules, new pose.

---

## ☠️ Plaguemire

**Hero output:** `audit/trailer/characters/hero/plaguemire_nine.png`

| Layer | File | Notes |
|-------|------|-------|
| Fur | `public/assets/nine/fur/ALIENGREEN.png` | Sickly green base |
| Outfit | `public/assets/nine/outfit/SIMPLETUNIC_PLAGUEMIRE.png` | Tattered house tunic |
| Headwear | `public/assets/nine/headwear/WORNHOOD_PLAGUEMIRE.png` | Half-shadowing hood |
| Expression | `public/assets/nine/expression/GLOWING_GREEN.png` | Glowing green eyes |
| Weapon | `public/assets/nine/weapon/SCYTHE.png` | Held upright in one paw |
| Familiar | `public/assets/nine/familiar/FLOATINGSKULL.png` | Floating above shoulder |

**Pose direction:** Arms out wide, slightly raised. Head tilted back, slight angle. Scythe hoisted upright in right paw, blade angled outward. Hood half-shadows the face. Stance upright but loose (not tensed — Plaguemire is unhurried).

**Tag output:** `audit/trailer/characters/tag/plaguemire_nine_tag.png`
- Swap Expression → `HAPPY.png`
- Same pose BUT left paw raised to mouth, casually grooming. Scythe still hoisted. Total lack of self-awareness.

---

## 💨 Ashenvale

**Hero output:** `audit/trailer/characters/hero/ashenvale_nine.png`

| Layer | File | Notes |
|-------|------|-------|
| Fur | `public/assets/nine/fur/SMOKEGREY.png` | Smoke-silver base |
| Outfit | `public/assets/nine/outfit/SIMPLETUNIC_ASHENVALE.png` | Grey house tunic |
| Headwear | `public/assets/nine/headwear/CLOTHWRAP.png` | Bandit-style face wrap |
| Expression | `public/assets/nine/expression/DETERMINED.png` | Eyes locked forward |
| Weapon | `public/assets/nine/weapon/DUALDAGGERS.png` | Reverse-grip, one in each paw |
| Familiar | `public/assets/nine/familiar/SPIRITWOLF.png` | Running alongside, or omitted for pure rogue silhouette |

**Pose direction:** Low crouch. One paw forward for balance, other paw back gripping a dagger. Tail horizontal behind for sprint-balance. Ears flat back. Weight driving forward. Cape / wrap streaming behind.

**Tag output:** `audit/trailer/characters/tag/ashenvale_nine_tag.png`
- Swap Expression → `DERP.png`
- Post-landing crouch. Eyes snap up but hold visibly cross-eyed (one eye straight, one drifting). Same pose.

---

## ☀️ Dawnbringer

**Hero output:** `audit/trailer/characters/hero/dawnbringer_nine.png`

| Layer | File | Notes |
|-------|------|-------|
| Fur | `public/assets/nine/fur/GOLDEN.png` | Radiant gold base |
| Outfit | `public/assets/nine/outfit/SIMPLETUNIC_DAWNBRINGER.png` | White-gold house tunic |
| Headwear | `public/assets/nine/headwear/RADIANTHALO.png` | Floating halo |
| Expression | `public/assets/nine/expression/DETERMINED.png` | Head bowed then rising |
| Weapon | `public/assets/nine/weapon/LIGHTBRINGER.png` | Staff planted vertical |
| Familiar | `public/assets/nine/familiar/BABYPHEONIX.png` | Perched on shoulder or orbiting |

**Pose direction:** Kneeling. One knee down. Staff planted vertical in ground. Both paws on staff top. Head bowed initially. In the rising half of the pose: staff raised to sky with both paws, head tilted up, silhouetted against rising beam.

**Tag output:** `audit/trailer/characters/tag/dawnbringer_nine_tag.png`
- Swap Expression → `WINK.png` (fallback: `LAUGH.png` if WINK doesn't read as beatific)
- Face bathed in too much light. Beatific smile, eyes slightly crossed. Leaning into the beam too much.

---

## 🔥 Smoulders

**Hero output:** `audit/trailer/characters/hero/smoulders_nine.png`

| Layer | File | Notes |
|-------|------|-------|
| Fur | `public/assets/nine/fur/EMBERORANGE.png` | Fire-orange base |
| Outfit | `public/assets/nine/outfit/SIMPLETUNIC_SMOULDERS.png` | Red-black house tunic |
| Headwear | `public/assets/nine/headwear/EMBERHAT.png` | Flame-motif hat |
| Expression | `public/assets/nine/expression/ANGRY.png` | Teeth bared mid-roar |
| Weapon | `public/assets/nine/weapon/EMBERSTAFF.png` | Shouldered like warhammer |
| Familiar | `public/assets/nine/familiar/EMBERSPRITE.png` | Circling head |

**Pose direction:** Staff shouldered diagonally across back (carry-grip, not combat-grip). Weight forward on back leg, front leg bent. Chest puffed, visibly rising-falling for breathing. Shoulders rolled forward. Teeth bared, upper lip lifted.

**Tag output:** `audit/trailer/characters/tag/smoulders_nine_tag.png`
- Swap Expression → `GRUMPY.png`
- Post-roar slump. Shoulders heaving. Staff point drooping toward ground. Cardio is hard.

---

## 🌊 Darktide (hero + tag, used in Shot 13.5 respawn + ensemble)

**Hero output:** `audit/trailer/characters/hero/darktide_nine.png`

| Layer | File | Notes |
|-------|------|-------|
| Fur | `public/assets/nine/fur/OCEANBLUE.png` | Tidal blue base |
| Outfit | `public/assets/nine/outfit/SIMPLETUNIC_DARKTIDE.png` | Blue-teal house tunic |
| Headwear | `public/assets/nine/headwear/TIDAL.png` | Wave-motif |
| Expression | `public/assets/nine/expression/SMUG.png` | Confident, slightly smug |
| Weapon | `public/assets/nine/weapon/TRIDENT.png` | Upright at side |
| Familiar | `public/assets/nine/familiar/ORB_DARKTIDE.png` | Orbiting |

**Pose direction:** Confident stance. Trident held upright at side, one paw on its shaft. Head tilted slightly back. Cape swirling from below (the heroic moment right before he gets vaporized in Shot 13.5). Chin up.

**Tag output:** `audit/trailer/characters/tag/darktide_nine_tag.png`
- Swap Expression → `DERP.png` (bored/unbothered — post-respawn)
- Standing neutrally. Ear flicked. No reaction. Used for Shot 13.5B "smash cut normal again".

---

## 🌙 Nighthollow (ensemble only — optional for Shot 13 depth)

**Hero output:** `audit/trailer/characters/hero/nighthollow_nine.png`

| Layer | File | Notes |
|-------|------|-------|
| Fur | `public/assets/nine/fur/MIDNIGHTBLACK.png` | Void black base |
| Outfit | `public/assets/nine/outfit/SIMPLETUNIC_NIGHTHOLLOW.png` | Dark purple-gold tunic |
| Headwear | `public/assets/nine/headwear/UMBRALCOWL.png` | Shadow cowl |
| Expression | `public/assets/nine/expression/GLOWING_PURPLE.png` | Purple eye-glow |
| Weapon | `public/assets/nine/weapon/SHADOWWAND.png` | Held low |
| Familiar | `public/assets/nine/familiar/RAVEN.png` | Perched on shoulder |

**Pose direction:** Half-turned away from camera. Looking back over shoulder. Wand held low. Cowl obscures upper face. For ensemble shot this is background-depth only — low detail is fine.

**Tag output:** (not needed for trailer; build for shorts S-04 etc if used)

---

## 🔮 Manastorm (ensemble only — optional for Shot 13 depth)

**Hero output:** `audit/trailer/characters/hero/manastorm_nine.png`

| Layer | File | Notes |
|-------|------|-------|
| Fur | `public/assets/nine/fur/VOIDPURPLE.png` | Deep purple base |
| Outfit | `public/assets/nine/outfit/SIMPLETUNIC_MANASTORM.png` | Arcane-purple tunic |
| Headwear | `public/assets/nine/headwear/ARCANECIRCLET.png` | Mage circlet |
| Expression | `public/assets/nine/expression/GLOWING.png` | Neutral-glow eyes |
| Weapon | `public/assets/nine/weapon/STAFFOFTHENINE.png` | Big staff, held in one paw |
| Familiar | `public/assets/nine/familiar/ARCANECONSTRUCT.png` | Floating construct |

**Pose direction:** One paw extended forward, fingers splayed (casting read). Other paw holding staff. Expression analytical. Background-depth for ensemble — low detail fine.

**Tag output:** (not needed for trailer)

---

## Nerm (Shot 16 only)

**Output:** `audit/trailer/characters/nerm_head.png`

No modular layers. Source is `public/assets/images/nerm.jpg`.

**Steps:**
1. Open `nerm.jpg` in your compositor.
2. Mask / crop so only the **head + wizard hat** remains. No body.
3. Remove background — transparent alpha.
4. Export at 1024×1024, centered in frame, with some padding around the head.
5. Save to `audit/trailer/characters/nerm_head.png`.

**For reaction shorts (S-01, S-02, S-03):** generate variants by layering different `expression/*.png` files over the base Nerm head:
- `nerm_head_neutral.png` — base, as is
- `nerm_head_smug.png` — expression/SMUG.png overlaid
- `nerm_head_grumpy.png` — expression/GRUMPY.png overlaid
- `nerm_head_derp.png` — expression/DERP.png overlaid

Build these as needed, not upfront. Shots 16 only needs the neutral version.

---

## After all composites land

1. Run `bash audit/trailer/verify_assets.sh` one more time as a sanity check.
2. Upload each composite to Higgsfield Cinema Studio 3.5 Elements library with the exact slug (filename without extension).
3. Tick the `characters/` items in `audit/trailer/README.md`.
4. Move on to Pass 2 (VO recording — see `vo/VO_SCRIPT.md`).
