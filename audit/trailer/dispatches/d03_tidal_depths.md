# Dispatch D-03 — Tidal Depths

**Runtime:** 10.0s
**Format:** 1080×1920 (9:16 vertical), H.264, 24fps, burned-in subtitles
**Register:** calm, melancholic, rhythmic
**Ship week:** Week 1 (second drop — proves water motion before glitch)
**Delivery channels:** Twitter, TikTok, IG Reels, YouTube Shorts

## Purpose

Second drop in Week 1. Ships after D-01 lands. Chosen for Week 1 because tidal water is the **safest** motion for an image-to-video tool — AI systems are well-trained on water physics. If D-01 proves the static-motion pipeline, D-03 proves continuous-motion. Together they're enough to go into Week 2 confident on the harder renders.

Introduces Nethara's relationship to time. The tide is punctual; Nethara isn't. That discrepancy is the world.

Also: the longest dispatch in Wave 0 (10s). The extra seconds earn themselves because the water motion + bioluminescence create ambient interest that justifies lingering.

## Asset list

| Asset | Source | Use |
|---|---|---|
| Source biome PNG | `public/assets/images/biomes/tidal-depths.png` | i2v input |
| AI-motion clip | `audit/trailer/dispatches/renders/d03_tidal_depths.mp4` | Primary video |
| VO take | `audit/trailer/dispatches/vo_takes/d03_tidaldepths_vo.wav` | Narration |
| Subtitle style | `audit/trailer/shorts/subtitle_style_vertical.md` | Inherit |
| Sign-off frame | `public/assets/images/title-nethara.png` | Closer |

## Runtime map

| # | Time | Source | Duration | VO | Subtitle cue | Edit note |
|---|---|---|---|---|---|---|
| 1 | 0.0–2.0 | Clip head | 2.0s | **silent** | — | Hold on water. Tide visible rising/falling. Ambient water bed enters at 0.2s, low. |
| 2 | 2.0–4.5 | Clip cont. | 2.5s | "the tide runs on a schedule." | `the tide runs on a schedule.` | First clause. Voice lands on "schedule" with no punch. |
| 3 | 4.5–5.0 | Clip cont. | 0.5s | **silent beat** | — | Short pause — half the length of D-02's pause because this discrepancy is observational, not ominous. |
| 4 | 5.0–7.5 | Clip cont. | 2.5s | "nethara does not keep one." | `nethara does not keep one.` | Flat. "nethara" read as place-name, not invocation. |
| 5 | 7.5–8.8 | Clip tail | 1.3s | **silent** | — | Water continues; subtitle holds or clears on fade. Lets the line settle. |
| 6 | 8.8–10.0 | Sign-off frame | 1.2s | **silent** | — | Hard cut to title card. Water ambient tails out. |

Total: **10.0s** exact.

## 9:16 reframing / crop notes

`biomes/tidal-depths.png` — verify native aspect. The water surface + bioluminescence-below-surface should occupy the full frame vertically. If there's a sky element in the source PNG, it can occupy the upper 15–20% but shouldn't dominate — the tide is the subject, not the sky.

If the AI tool's render compresses the water into the lower third and fills the upper portion with sky, re-render with a tighter framing prompt ("camera positioned just above water surface, water fills frame") or crop aggressively in CapCut.

## VO source take

| Line | Source take | Handling |
|---|---|---|
| Full line (two clauses with short pause) | `d03_tidaldepths_vo.wav` from `vo_script.md` | One take, natural ~0.4s pause between clauses. If TTS over-pauses or under-pauses, adjust in CapCut — the pause should feel like "someone taking a small breath before finishing a thought," not a dramatic gap. |

Delivery discipline: "nethara" must read as a flat place-name. If TTS capitalizes the inflection (reverent lift, or pause-before-pronouncing), re-generate. This voice is not in awe of the place it describes.

## Subtitle track

```
[2.00s – 4.50s]    the tide runs on a schedule.
[5.00s – 7.50s]    nethara does not keep one.
```

Anchor: **bottom default** (22% from bottom). Both single-line. Subtitle clears between cues (0.5s silent gap, matching audio).

## Music bed

- **0.0–0.2s** silence
- **0.2–9.5s** ambient water bed — layered low-frequency ocean rumble + very soft bioluminescence-tone (like a synth pad at 20% volume). Tide bed should **pulse subtly** on the ~4s water cycle — audio mirrors visual.
- **VO ducking:** bed drops to -12dB during VO (2.0–4.5s and 5.0–7.5s), returns to full at 7.5s for the final settle
- **8.8s** bed fades over 0.5s as title card comes in
- **9.8s** full silence

**Do NOT use** recognizable water-ambience stock tracks ("Ocean Waves 01" from the CapCut library, etc.) — generic cadence telegraphs amateur production. Either source a custom ambient pass or use a heavily-processed underwater tone that reads as atmospheric, not stock.

## Sign-off frame

Final 1.2s (8.8–10.0s):
- Hard cut to `title-nethara.png` center
- Optional: 0.5s crossfade from final clip frame to title (exception to the "hard cut only" rule for this dispatch — water motion + crossfade reads like tide closing over the frame; feels on-register)
- If crossfade reads soft/cheesy, revert to hard cut per standard

## Render dependencies

- `biomes/tidal-depths.png` — **exists**
- AI-motion render — new
- VO take d03 — new
- `title-nethara.png` — **exists**

**Safest render in Wave 0.** If the AI tool can't produce clean water motion, the tool is broken entirely — pivot tools before proceeding.

## Edit notes

- **Tide cadence matters.** The water should rise and fall on a ~4-second cycle — two full cycles visible across the 10s clip. If the AI tool animates water at a rushed pace (1-second cycle) or static (no cycle), re-render with explicit timing in the prompt.
- **Bioluminescence must pulse on tide cadence.** Light-from-below rises and falls WITH the water, not against it. Off-beat pulsing breaks the "schedule" premise.
- **Camera drift is gentle.** The 5% lateral pan specified in `ai_video_prompts.md` — don't increase it. Fast camera drift reads as "nausea cam," wrong register.
- **Color grade target:** deep blue-green base, pale cyan highlights on the bioluminescence. Avoid saturated teal (reads as stock ocean footage); stay muted.
- **Audio target:** -14 LUFS integrated. Because the water bed is sustained, maintaining -14 LUFS across the full 10s is more critical than for shorter dispatches — use a limiter on the master bus.

## Post caption (copy from `captions.md`)

Default Option 2:
> forty-three-minute cycle. accurate to the second. unrelated to anything else.
>
> #ninelivesnetwork #nethara

## QC checklist

- [ ] Runtime = 10.00s ± 2 frames
- [ ] Water rise-and-fall cycle ~4s, two full cycles visible
- [ ] Bioluminescence pulses synchronized with tide
- [ ] Two subtitle cues match VO verbatim, lowercase, no `!`
- [ ] 0.5s silent gap between the two cues
- [ ] No stock-sounding ocean audio
- [ ] "nethara" reads as flat place-name, not invocation
- [ ] Sign-off frame is title-nethara.png
- [ ] Export 1080×1920, H.264, 24fps, -14 LUFS

## What this dispatch deliberately does NOT do

- **Does not show creatures in the water.** No fish silhouettes, no tentacles, no fins breaking the surface. The tide is the subject; tidal depths has residents, but their reveal is for later.
- **Does not moralize the discrepancy.** "the tide is more reliable than the world" — no. The voice states both facts and lets the viewer do the sitting.
- **Does not use "ancient" or "eternal" language.** The tide is just the tide; mystification breaks register.
- **Does not include Nerm.** Nerm cameo captions exist in `captions.md` but the VO is Nethara-only.

## Production notes

- Tidal motion is the most forgiving AI-motion prompt in Wave 0 — if D-03 is the second dispatch produced and it lands in 1-2 renders, confirms the pipeline is working and the team can go into Week 2 confident.
- If the water render looks too "cinematic" (too beautiful, too HDR, too perfect), that's actually a problem — Nethara voice doesn't do beauty, it does observation. Grade down the saturation and contrast until the water reads mundane-but-specific, not postcard.
