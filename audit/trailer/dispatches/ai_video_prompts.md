# AI Video Prompt Library — Dispatches

Image-to-video prompts for all 5 Wave 0 dispatches. Pick whichever tool's syntax section matches what you're using. All three — Runway Gen-3, Higgsfield Soul, and Kling 1.5/1.6 — accept the same input image; the prompt phrasing differs.

Every prompt targets **6–10 seconds** of output clip. The production sheet per-dispatch defines how that clip is used (loop, one-take, trimmed head/tail).

## Universal guardrails (apply to every prompt, every tool)

Add these negative prompts / exclusions on every render. If the tool doesn't accept negatives directly, include them as "avoid" language in the positive prompt.

- **No humans.** No figures, no silhouettes, no eyes peering out, no background crowd.
- **No animals.** Especially no cats — this is the world without its characters yet.
- **No text.** No logos, glyphs, signs, runes spelling anything legible, no burned-in captions.
- **No warping.** Lock architectural / structural lines. Buildings don't breathe; rocks don't pulse.
- **No style drift.** Match the source PNG's rendering aesthetic — stylized matte-painting, not photoreal, not anime.
- **No lens flare / no heavy bloom.** This voice is not cinematic-cheesy.

## D-01 — Umbral Wall

**Input image:** `public/assets/images/biomes/umbral-wall.png`
**Target duration:** 8s
**Motion register:** almost static. Architectural weight. The wall is the point.

### Runway Gen-3 prompt
```
A vast ancient wall of dark weathered stone dominates the frame, stretching
beyond the edges. Extremely subtle atmospheric motion only: thin mist
drifting slowly left to right across the base of the wall, faint particles
of dust hanging in late-evening light, a single slow camera push-in at
10% over 8 seconds. Absolutely no structural movement — the wall is still
as a monument. Matte-painting style, muted ochre and violet twilight palette,
high detail in stone texture. No humans, no animals, no text, no lens flare.
```
**Camera:** slow push-in, 10% zoom over clip duration
**Seed:** lock once D-01 lands, reuse across reruns

### Higgsfield Soul prompt
```
The umbral wall at dusk. Low atmospheric mist crossing the frame horizontally.
Slow push-in camera. Particulate dust in shafts of late light. Stone remains
perfectly static — no breathing, no warping. Matte-painting aesthetic.
```
**Camera preset:** Slow Dolly-In
**Motion intensity:** 1/5

### Kling 1.5/1.6 prompt
```
Ancient dark stone wall, dusk lighting, drifting mist across base of frame,
camera very slow push-in. Structure absolutely static. Subtle particle drift
in light rays. 8 seconds, high detail, matte painting style.
```
**Motion strength:** low
**Camera:** 静止/缓慢推进 (static/slow push)

---

## D-02 — Chaos Rift

**Input image:** `public/assets/images/biomes/chaos-rift.png`
**Target duration:** 6s
**Motion register:** glitch-coded, unsettling. The rift has a pattern that almost-but-doesn't-quite-resolve.

### Runway Gen-3 prompt
```
A tear in reality suspended in a dark void. The rift itself pulses with
chromatic aberration — colors separating and rejoining on a slow 2-second
cycle. Wisps of dark energy spiral inward toward the rift's center.
Occasional subtle frame-stutter on the rift's edge (not the full frame —
only the rift distorts). Environment around the rift stays static; only
the rift is alive. Dark purple and violet palette with red energy at the
core. No humans, no animals, no recognizable text or symbols in the energy,
no full-screen glitch effects.
```
**Camera:** static hold, no movement
**Seed:** lock on acceptable output

### Higgsfield Soul prompt
```
The chaos rift. A dimensional tear pulsing with chromatic separation. Dark
energy wisps spiraling inward. Occasional edge-stutter on the rift boundary
itself. Surrounding void is still. Dark violet and red palette.
```
**Camera preset:** Locked / Tripod
**Motion intensity:** 3/5 (only the rift)

### Kling 1.5/1.6 prompt
```
Dimensional rift in dark void, chromatic aberration pulse, dark energy
spiraling toward center, edge glitch on rift only, rest of frame static.
6 seconds, purple and red palette.
```
**Motion strength:** medium-localized
**Camera:** 静止 (static)

---

## D-03 — Tidal Depths

**Input image:** `public/assets/images/biomes/tidal-depths.png`
**Target duration:** 10s
**Motion register:** calm, rhythmic, melancholic. The tide has a schedule.

### Runway Gen-3 prompt
```
A coastal depth of dark luminescent water. Gentle tidal motion across the
full frame — waves rising and falling on a slow ~4-second cycle. Soft
bioluminescence pulsing from beneath the water on the same cadence as the
tide. Camera slowly drifts sideways (left to right) 5% over 10 seconds,
as if carried by the current. Sky remains still; only water and light
move. Deep blue-green palette with pale cyan bioluminescence. No creatures
visible, no humans, no boats, no surface debris.
```
**Camera:** slow lateral drift, 5% pan
**Seed:** lock when waves feel regular

### Higgsfield Soul prompt
```
Tidal depths. Bioluminescent water rising and falling in slow rhythm. Soft
pale glow from below the surface, pulsing on wave cadence. Camera drifting
sideways as if on current. Sky static. Deep ocean palette.
```
**Camera preset:** Lateral Drift
**Motion intensity:** 2/5

### Kling 1.5/1.6 prompt
```
Deep ocean tidal waters, gentle rhythmic waves, soft bioluminescence pulsing
below surface, slow sideways camera drift. 10 seconds, deep blue-green
with cyan highlights. No creatures.
```
**Motion strength:** low-medium
**Camera:** 缓慢横移 (slow lateral)

---

## D-04 — Skycastle Dusk

**Input image:** `public/assets/images/biomes/skycastle.png`
**Target duration:** 10s
**Motion register:** atmospheric, ritual. Dusk as ceremony.

### Runway Gen-3 prompt
```
A towering spire castle suspended in clouds at dusk. Low-speed cloud
layers drifting across the frame at two distinct depths — foreground
clouds moving left, background clouds moving right, creating parallax.
Warm amber and cold violet color wash: the castle backlit by a fading
sun below the cloud line. Subtle magical light pulses inside the castle
windows (every ~3 seconds, slow fade). Camera holds static — the sky
moves, the castle holds. No flying figures, no birds, no dragons, no
visible humans in the windows.
```
**Camera:** static hold
**Seed:** lock when cloud parallax feels layered, not soupy

### Higgsfield Soul prompt
```
Floating castle at dusk, cloud parallax at two depths, backlit by setting
sun below clouds, faint pulsing window lights. Camera held still. Warm
amber and cold violet mixed.
```
**Camera preset:** Static / Wide Hold
**Motion intensity:** 2/5 (clouds only)

### Kling 1.5/1.6 prompt
```
Floating castle, dusk sky, layered cloud movement parallax, subtle warm
window lights pulsing slowly, camera static. 10 seconds, amber and violet
color wash.
```
**Motion strength:** low
**Camera:** 静止 (static)

---

## D-05 — Moon Citadel

**Input image:** `public/assets/images/biomes/moon-citadel.png`
**Target duration:** 8s
**Motion register:** cold, imperative. The moon is a warning, not a gift.

### Runway Gen-3 prompt
```
A stone citadel silhouetted against an enormous pale moon. The moon is
the dominant element — occupies 40% of the frame vertically. Very slow
zoom-in on the moon over 8 seconds, not the citadel. Thin cirrus clouds
pass across the moon's face at mid-clip (seconds 3–5) — slow, scattered,
not obscuring. Citadel holds still; only the moon and cirrus move. Cold
blue-silver palette. No stars visible. No human figures on the walls,
no lights in the citadel windows.
```
**Camera:** slow zoom-in on moon, 15% over clip
**Seed:** lock when moon surface detail holds

### Higgsfield Soul prompt
```
Stone citadel silhouetted against large pale moon. Slow zoom-in on moon.
Thin cirrus crossing moon face mid-clip. Citadel static. Cold blue-silver.
No lights on citadel.
```
**Camera preset:** Slow Zoom-In
**Motion intensity:** 2/5

### Kling 1.5/1.6 prompt
```
Large pale moon behind silhouetted stone citadel, slow zoom toward moon,
thin cirrus clouds crossing moon surface, citadel stays still. 8 seconds,
cold blue-silver palette, no stars.
```
**Motion strength:** low
**Camera:** 缓慢推近 (slow push)

---

## Rendering discipline

### Seed-locking strategy

On the first render of each dispatch, save the seed value from whichever tool you used. If the output is rejected, re-render with a different seed — but log rejections so we learn which seed ranges work for which biome. If the output is approved, lock that seed in this document in the `**Seed:**` slot under each dispatch.

### Render count budget

- **Target:** 1–3 renders per dispatch (accept fast, don't over-iterate)
- **Hard cap:** 6 renders per dispatch. If we haven't landed in 6, the prompt is broken — revise the prompt copy above before re-rendering.
- **Log rejects briefly:** one line per rejected seed in a `renders.log` scratch file — "D-01 seed 4821 — wall breathing, rejected" — so we don't re-test the same failure mode.

### Output specs

| Attribute | Value |
|---|---|
| Resolution | 1080×1920 (9:16) — crop or native render |
| Frame rate | 24fps (cinematic) — not 30 or 60 |
| Duration | Per-dispatch target (6–10s), can be trimmed in CapCut |
| Format | MP4, H.264, sRGB |
| Loopable | Not required — dispatches are one-take, not loops |

If the tool only outputs 16:9, render at 1920×1080 and center-crop to 1080×1920 in CapCut. Environment shots tolerate center-crop better than character shots — expect 15–25% width loss, accept it.

### Style lock across the 5 renders

Target: all 5 dispatches read as **the same show**. If D-01 reads like a matte painting and D-02 reads like photoreal, the track reads inconsistent. Pick one tool, one style preset, one aesthetic — and stick with it across all 5. If a given biome PNG's native aesthetic drifts across renders, grade-match in CapCut before export (consistent contrast + color temp).

## Post-production handoff

Once the AI-motion clip lands, the workflow continues in CapCut per each dispatch's production sheet. The AI tool's job ends at the clip export — subtitle, VO layer, sign-off frame, and audio-level mastering all happen downstream.

## What to upgrade later (not Wave 0 scope)

- **Env-to-env transitions** for compiled "Nethara reel" showcase posts — deferred until at least 3 dispatches exist to cut between.
- **Time-of-day variants** (dawn versions of each biome) — deferred; fixed-time-of-day is simpler for Wave 0.
- **Spell VFX overlays** (e.g. lightning on stormrage biome, poison mist on plaguemire) — deferred to dispatches Wave 1+.
- **Arena combat inserts** (capture from `/zone-battle.html` as part of a dispatch) — deferred; adds real-time-capture dependency that this wave deliberately avoids.
