# Dispatch D-02 — Chaos Rift

**Runtime:** 6.0s
**Format:** 1080×1920 (9:16 vertical), H.264, 24fps, burned-in subtitles
**Register:** unsettling, glitch-coded
**Ship week:** Week 2 (ships after D-01 and D-03 prove the pipeline)
**Delivery channels:** Twitter, TikTok, IG Reels, YouTube Shorts

## Purpose

Hardest motion brief in Wave 0 — the clip needs **localized** glitch (only the rift distorts, environment around it stays calm). If the AI tool smears motion across the full frame, the dispatch reads as generic vapor-glitch content instead of a specific unstable phenomenon. Shipped second-last in the sequence so the team's first two dispatches (D-01, D-03) prove control before we attempt this one.

Lore-tease. The rift has lived in `/public/assets/images/biomes/chaos-rift.png` since repo inception but has never had a narrative beat attached to it. D-02 plants one.

## Asset list

| Asset | Source | Use |
|---|---|---|
| Source biome PNG | `public/assets/images/biomes/chaos-rift.png` | i2v input |
| AI-motion clip | `audit/trailer/dispatches/renders/d02_chaos_rift.mp4` | Primary video |
| VO take | `audit/trailer/dispatches/vo_takes/d02_chaosrift_vo.wav` | Narration |
| Subtitle style | `audit/trailer/shorts/subtitle_style_vertical.md` | Inherit |
| Sign-off frame | `public/assets/images/title-nethara.png` | Closer |

## Runtime map

| # | Time | Source | Duration | VO | Subtitle cue | Edit note |
|---|---|---|---|---|---|---|
| 1 | 0.0–1.0 | Clip head | 1.0s | **silent** | — | Rift pulsing; no voice. Sub-bass hit at 0.0s, decay to silence. Let the image disturb before the line lands. |
| 2 | 1.0–3.0 | Clip cont. | 2.0s | "the rift has a pattern." | `the rift has a pattern.` | Flat. No inflection. |
| 3 | 3.0–3.6 | Clip cont. | 0.6s | **silent pause** | — | Pause longer than any other pause in Wave 0. The gap is content. |
| 4 | 3.6–5.2 | Clip cont. | 1.6s | "you will not see it in time." | `you will not see it in time.` | Voice stays flat. Do not punch "in time." |
| 5 | 5.2–6.0 | Sign-off frame | 0.8s | **silent** | — | Hard cut to title card. Drone cuts to silence 0.1s before title hits — amplifies the closure. |

Total: **6.0s** exact.

## 9:16 reframing / crop notes

`biomes/chaos-rift.png` — verify aspect before rendering. The rift should be centered vertically in the 9:16 frame, occupying roughly the middle 50% of height. The pulsing energy is the subject; the surrounding void is context.

If the AI tool places the rift off-center, re-render or crop in CapCut to recenter. An off-center rift reads as "something in the background" instead of "the subject."

## VO source take

| Line | Source take | Handling |
|---|---|---|
| Full line (two clauses with pause) | `d02_chaosrift_vo.wav` from `vo_script.md` | Single take with built-in ~0.6s pause. If the TTS shortens the pause below 0.5s, manually extend the silence in CapCut between the two clauses. |

The pause between "the rift has a pattern." and "you will not see it in time." is the whole joke. Do not let CapCut's audio editor auto-compress that silence — lock it with a manual split.

## Subtitle track

```
[1.00s – 3.00s]    the rift has a pattern.
[3.60s – 5.20s]    you will not see it in time.
```

Anchor: **bottom default** (22% from bottom). Both cues single-line, center-aligned. Subtitle stays off-screen during the 0.6s silent pause — do not bridge the two cues with a continuous subtitle. The visual pause matches the audio pause.

## Music bed

- **0.0s** single sub-bass hit (~40Hz, no sustained tone) — feels like the rift "landing" in the feed
- **0.0–6.0s** no sustained bed. Instead: sporadic chromatic micro-glitches in the audio (2-3 total across the clip), timed to sync with visual glitches in the rift render
- **5.2s** hard audio cut — no tail, no fade. Total silence for the final 0.8s lets the title card read as afterimage.

**Do NOT use** a musical bed, ambient drone, or any sustained tone. This dispatch's audio is texture-and-silence. Silence is the instrument.

## Sign-off frame

Final 0.8s (5.2–6.0s):
- Hard cut from glitching rift to `title-nethara.png` at center, black background
- Total audio silence
- No fade in, no fade out — pure cut-to-cut timing
- Shorter sign-off window than D-01 (0.8s vs 1.2s) — the whole dispatch is shorter + tighter

## Render dependencies

- `biomes/chaos-rift.png` — **exists**
- AI-motion render — new, highest-risk clip in Wave 0
- VO take d02 — new
- `title-nethara.png` — **exists**

**Highest-risk render in Wave 0.** Budget up to 6 render attempts. If none land, pause D-02 and proceed to D-04/D-05 while re-specifying the prompt. Do not ship a render that distorts the whole frame — that's the failure mode the prompt is specifically protecting against.

## Edit notes

- **The rift must stay localized.** If the whole frame ripples, the render failed. Re-render with stricter negative prompt ("entire frame must not warp, only the rift distorts").
- **Glitch frequency discipline.** Aim for **2–4 glitch pulses** across the 6 seconds — not continuous. Continuous glitch reads as noise; sporadic glitch reads as pattern-that-you-almost-see.
- **No text glyphs in the rift.** If AI generates runes, symbols, or text-like artifacts in the rift's energy, those are off-brand. The rift doesn't communicate — it exists.
- **Color grade target:** dark violet base, red energy at the rift core, chromatic aberration on edges only. Do not push toward green or blue — those read as portal-fantasy tropes, wrong register.
- **Hard cut to sign-off.** Same rule as D-01.
- **Audio target:** -14 LUFS integrated for the sub-bass hit + micro-glitches. Because most of the clip is silence, audio mastering is sparse — the LUFS target applies across the clip duration, not per segment.

## Post caption (copy from `captions.md`)

Default Option 1:
> observation window: between breaths. do not try.
>
> #ninelivesnetwork

## QC checklist

- [ ] Runtime = 6.00s ± 2 frames
- [ ] Rift is centered vertically, occupies ~50% of frame height
- [ ] Environment around the rift is still — only the rift distorts
- [ ] Two subtitle cues match VO verbatim, lowercase, no `!`
- [ ] Silent ~0.6s pause between the two subtitles (no bridge caption)
- [ ] No recognizable text / runes / symbols in the rift energy
- [ ] Sub-bass hit at 0.0s hits clean; no sustained music bed
- [ ] Sign-off frame is title-nethara.png, hard cut from clip
- [ ] Export 1080×1920, H.264, 24fps, -14 LUFS

## What this dispatch deliberately does NOT do

- **Does not explain the rift.** The rift is a pattern you will not see — the dispatch honors that by not showing it to you either. No close-up reveal, no "see here?" moment.
- **Does not lore-drop.** No reference to Nethara's history with the rift, no name for what comes through it. Pure present-tense observation.
- **Does not use horror tropes.** No jump scare, no face in the rift, no sudden volume spike. The register is unsettling-because-flat, not unsettling-because-loud.
- **Does not include Nerm.** Nerm would explain the rift — Nethara voice refuses to.

## Rendering risk mitigation

If after 6 attempts the AI tool cannot produce a localized-motion render:

**Fallback Plan A:** Composite the AI-motion clip in two passes —
1. Render a static-plate clip first (still image, zero motion, 6s duration)
2. Render a rift-only motion clip against transparent/black background
3. Composite them in CapCut with the rift layered over the static plate

**Fallback Plan B:** Apply CapCut's built-in chromatic aberration + pulse effects to the static PNG directly, skip AI motion entirely for D-02. Result is lower-quality but shippable. Only use if Plan A also fails.

**Fallback Plan C:** Skip D-02 entirely and substitute with a new dispatch premise (e.g. `biomes/ancient-ruins.png` — D-02-alt). Document the substitution in the commit.

Flag in commit message which path was used: `[D-02: primary render]` / `[D-02: fallback A]` / `[D-02: substituted]`.
