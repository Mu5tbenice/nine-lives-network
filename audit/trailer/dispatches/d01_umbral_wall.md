# Dispatch D-01 — Umbral Wall

**Runtime:** 8.0s
**Format:** 1080×1920 (9:16 vertical), H.264, 24fps, burned-in subtitles
**Register:** ominous, static, architectural
**Ship week:** Week 1 (first drop — proves pipeline)
**Delivery channels:** Twitter, TikTok, IG Reels, YouTube Shorts

## Purpose

First dispatch out of the gate. Strongest static premise in Wave 0 — minimal motion complexity, maximum atmospheric weight. If the AI-motion tool can't produce a clean near-static render of a wall with drifting mist, it won't produce anything else in the set, so D-01 doubles as the pipeline validation shot.

Plants the Nethara voice in the feed cold. Viewers who don't know the IP get architecture + mood + voice; viewers who do get world-lore seeding toward Wave 1.

## Asset list

| Asset | Source | Use |
|---|---|---|
| Source biome PNG | `public/assets/images/biomes/umbral-wall.png` | i2v input for AI motion tool |
| AI-motion clip | `audit/trailer/dispatches/renders/d01_umbral_wall.mp4` (create on render) | Primary video layer |
| VO take | `audit/trailer/dispatches/vo_takes/d01_umbralwall_vo.wav` | Narration |
| Subtitle style | `audit/trailer/shorts/subtitle_style_vertical.md` | Inherit verbatim |
| Sign-off frame | `public/assets/images/title-nethara.png` | Final 1s closer |

## Runtime map

| # | Time | Source | Duration | VO | Subtitle cue | Edit note |
|---|---|---|---|---|---|---|
| 1 | 0.0–0.3 | Clip head | 0.3s | **silent** | — | Hold on wall. Drone music bed enters at 0.1s, very low. No VO yet — let the image land first. |
| 2 | 0.3–2.3 | Clip cont. | 2.0s | "the wall does not fall." | `the wall does not fall.` | First clause. Camera pushing in at 10%. |
| 3 | 2.3–4.3 | Clip cont. | 2.0s | "the wall does not blink." | `the wall does not blink.` | Second clause. Equal weight to first. Mist continues drifting. |
| 4 | 4.3–6.8 | Clip cont. | 2.5s | "the wall does not ask you to understand." | `the wall does not ask you to understand.` | Longer landing — the turn of the line needs room. Voice stays flat. |
| 5 | 6.8–8.0 | Sign-off frame | 1.2s | **silent** | — | Hard cut to `title-nethara.png` centered, optional splash-bg.mp4 tail underneath. Drone tails out. |

Total: **8.0s** exact.

## 9:16 reframing / crop notes

`biomes/umbral-wall.png` is stored at native aspect ratio — confirm what that is before rendering. Likely 16:9 or 4:3. Reframing options:

1. **If AI tool natively outputs 9:16:** supply the full image; the tool will compose a 9:16 crop automatically. Accept whatever it chooses and verify the wall still reads monumental.
2. **If AI tool outputs 16:9 only:** render 1920×1080 and center-crop to 1080×1920 in CapCut. Since the wall is an architectural horizontal, center-crop retains the most important vertical slice.

Either way — the wall should fill at least 60% of the 9:16 frame's vertical space at mid-clip. If the render makes the wall look small, the dispatch reads as "some landscape" instead of "a monument." Re-render.

## VO source take

| Line | Source take | Handling |
|---|---|---|
| Full line (three clauses) | `d01_umbralwall_vo.wav` from `vo_script.md` | Generated once in the locked-voice TTS session. Flat delivery, equal weight on each anaphora clause. |

If the take adds drama to the third clause, regenerate with stability bumped up +5 and style exaggeration forced to 0. This line is the hardest voice test in Wave 0 — if D-01's take isn't flat enough, the rest of the track reads off-register.

## Subtitle track

```
[0.30s – 2.30s]    the wall does not fall.
[2.30s – 4.30s]    the wall does not blink.
[4.30s – 6.80s]    the wall does not ask you
                   to understand.
```

Anchor: **bottom default** (22% from bottom per `subtitle_style_vertical.md`). Line 3 wraps — "the wall does not ask you" on line 1, "to understand." on line 2. Per the style doc, 2-line wrap is standard for vertical; never 3 lines for a single cue.

## Music bed

- **0.0–0.1s** silence (hard start)
- **0.1–6.8s** low drone, muted ochre tonality (not horror, not trailer-swell — architectural hum). Duck -10dB under VO at 0.3s. Hold at -10dB through all three VO clauses.
- **6.8–8.0s** drone swells back to flat and tails out on fade to black / sign-off frame.

**Do NOT use** a dramatic orchestral piece, a piano bed, or anything with clear melody. This dispatch's audio is texture, not song.

## Sign-off frame

Final 1.2s (6.8–8.0s):
- Cut hard from clip to `title-nethara.png` at center
- Optional: overlay `splash-bg.mp4` at 30% opacity behind the title card for 0.8s, fade-in the logo over 0.3s, hold 0.1s, hard cut to black
- No voice, no subtitle. The title card is the ident.

## Render dependencies

- `biomes/umbral-wall.png` — **exists**
- AI-motion render — new, this dispatch
- VO take d01 — new, generated from `vo_script.md`
- `title-nethara.png` — **exists**

**Earliest-shippable dispatch in Wave 0.** Everything needed exists in repo or is specced for generation; no external-tool rendering of character composites, no VO recording session.

## Edit notes

- **Do not add a zoom on the wall during VO.** The camera push (10% over 8s) is the only motion. Additional in-CapCut zooms read as trying too hard.
- **Do not add motion-graphic elements** (animated text, glitch transitions, particle overlays). The dispatch is one AI-clip + one voice + one subtitle track + one title card. Four layers max.
- **Color grade target:** muted ochre base, slight violet in mid-tones. Do not grade toward warm gold — that reads as sunset-epic, wrong register for this dispatch.
- **Hard cut to sign-off.** No fade, no dissolve between clip and title card. The cut is the end of the dispatch; Nethara doesn't fade out.
- **Audio target:** -14 LUFS integrated, peak -1.0 dBTP. Matches Wave 1 shorts spec so cross-track volume is consistent.

## Post caption (copy from `captions.md`)

Default Option 1:
> the wall has been counted. it is still there.
>
> #ninelivesnetwork #nethara

## QC checklist

- [ ] Runtime = 8.00s ± 2 frames
- [ ] Wall fills ≥60% vertical frame at mid-clip
- [ ] Three subtitle cues match VO line verbatim, lowercase, no `!`
- [ ] Line 3 subtitle wraps to 2 lines (not 1, not 3)
- [ ] Third VO clause has no dramatic swell
- [ ] No glitch / no flare / no text in the AI clip
- [ ] Sign-off frame is title-nethara.png, hard cut from clip
- [ ] Export 1080×1920, H.264, 24fps, -14 LUFS

## What this dispatch deliberately does NOT do

- **Does not reveal a house.** The wall is a place, not a faction. Viewers don't need to know which house controls umbral-wall biome in the game — that detail is for later.
- **Does not tease other dispatches.** No "next: the rift" tease, no end-frame chyron. Dispatches stand alone.
- **Does not explain what happens beyond the wall.** The voice refuses, so the dispatch refuses. Answering the implied question kills the register.
- **Does not include Nerm.** Nerm doesn't cameo. The voice is Nethara, not Nerm.

## Pipeline-validation note

This is the first dispatch produced. On completion, log learnings in a scratch note:

- Which AI tool + version was used
- Which voice ID was locked
- How many render attempts before the clip held
- Any TTS settings adjustments made from `voice_canon.md` baseline
- Time-to-publish (start of render → post copy in hand)

If D-01 takes longer than 2 hours of active work end-to-end (excluding render wait), flag in git commit — the pipeline isn't lean enough yet and needs tightening before D-02.
