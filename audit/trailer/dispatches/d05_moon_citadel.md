# Dispatch D-05 — Moon Citadel

**Runtime:** 8.0s
**Format:** 1080×1920 (9:16 vertical), H.264, 24fps, burned-in subtitles
**Register:** cold, imperative
**Ship week:** Week 3 (paired with D-04)
**Delivery channels:** Twitter, TikTok, IG Reels, YouTube Shorts

## Purpose

Ships last in Wave 0, paired with D-04 in Week 3. Functions as the "closer" — the only dispatch whose final line is imperative ("learn the difference."). After five dispatches the viewer has absorbed the Nethara voice without any direct address; D-05 breaks that pattern exactly once, which lands harder because the previous four didn't.

Thematically closes a loop: D-01 introduced "a thing that does not ask you to understand." D-05 ends with "learn the difference" — the voice stops observing and gives one instruction. If Wave 0 has a narrative arc, that's it.

## Asset list

| Asset | Source | Use |
|---|---|---|
| Source biome PNG | `public/assets/images/biomes/moon-citadel.png` | i2v input |
| AI-motion clip | `audit/trailer/dispatches/renders/d05_moon_citadel.mp4` | Primary video |
| VO take | `audit/trailer/dispatches/vo_takes/d05_mooncitadel_vo.wav` | Narration |
| Subtitle style | `audit/trailer/shorts/subtitle_style_vertical.md` | Inherit |
| Sign-off frame | `public/assets/images/title-nethara.png` | Closer |

## Runtime map

| # | Time | Source | Duration | VO | Subtitle cue | Edit note |
|---|---|---|---|---|---|---|
| 1 | 0.0–1.2 | Clip head | 1.2s | **silent** | — | Hold on citadel + moon. Cold drone bed enters at 0.2s. |
| 2 | 1.2–3.2 | Clip cont. | 2.0s | "the moon above the citadel is a lamp." | `the moon above the citadel is a lamp.` | First clause. Flat, observational. |
| 3 | 3.2–3.5 | Clip cont. | 0.3s | **silent** | — | Brief pause. |
| 4 | 3.5–5.0 | Clip cont. | 1.5s | "it is also a warning." | `it is also a warning.` | Flat. Do NOT punch "warning." |
| 5 | 5.0–5.5 | Clip cont. | 0.5s | **silent** | — | Longer pause — the imperative is landing. |
| 6 | 5.5–7.0 | Clip cont. | 1.5s | "learn the difference." | `learn the difference.` | Imperative but calm. Nod, not finger-wag. |
| 7 | 7.0–8.0 | Sign-off frame | 1.0s | **silent** | — | Hard cut to title card. Drone tails out. |

Total: **8.0s** exact.

## 9:16 reframing / crop notes

`biomes/moon-citadel.png` — the moon should dominate the upper half of the 9:16 frame, citadel silhouette in lower half. This is the **most vertical-friendly** biome in Wave 0 — the composition is already "big moon above, dark structure below," which maps naturally to 9:16.

If the AI tool's render shrinks the moon to a distant dot or crops it out, re-render with framing prompt ("moon is large, occupies 40% of frame vertically, positioned in upper portion"). Do not try to recover a bad moon-framing render in CapCut — the compositional weight matters too much.

## VO source take

| Line | Source take | Handling |
|---|---|---|
| Full line (three clauses, third imperative) | `d05_mooncitadel_vo.wav` from `vo_script.md` | One take. Third clause is imperative but not angry — "learn the difference" should feel like a librarian saying "return by Thursday," not a drill sergeant. |

Delivery test: if "learn the difference" sounds like a scold, regenerate. If it sounds like a suggestion ("you might want to learn..."), also regenerate. The line is imperative-calm — a narrow register. This is the hardest TTS generation in Wave 0 after D-01.

## Subtitle track

```
[1.20s – 3.20s]    the moon above the citadel is a lamp.
[3.50s – 5.00s]    it is also a warning.
[5.50s – 7.00s]    learn the difference.
```

Anchor: **bottom default** (22% from bottom). Cue 1 may wrap to 2 lines depending on font metrics — acceptable. Cues 2 and 3 are single-line. If wrap happens on cue 1, break at "citadel" so line 1 is "the moon above the citadel" and line 2 is "is a lamp."

## Music bed

- **0.0–0.2s** silence
- **0.2–7.0s** cold-register drone — high-frequency shimmer (not ambient-music pretty, more like the tonality of cold metal in wind) layered with a sub-bass pedal. Duck -10dB under each VO clause.
- **5.5–7.0s** during the "learn the difference" clause, bed does NOT swell. Imperative lines land harder when the bed doesn't help them.
- **7.0s** bed cuts to silence on the hard cut to title card — similar to D-02's audio-silence approach at the end. Cold register suits a cold close.

**Do NOT use** a warm bed, choir, or anything with emotional pull. The moon in this dispatch is a warning; the audio reflects that.

## Sign-off frame

Final 1.0s (7.0–8.0s):
- Hard cut from clip to `title-nethara.png` center
- Audio silence for the full 1.0s — matches D-02's silence-close treatment. Wave 0 has two silence-close dispatches (D-02, D-05); the other three tail out gradually. Variety in closer rhythm keeps the track from reading formulaic.
- No fade, no dissolve

## Render dependencies

- `biomes/moon-citadel.png` — **exists**
- AI-motion render — new
- VO take d05 — new
- `title-nethara.png` — **exists**

**Moderate complexity render.** The slow moon-zoom is the specific motion; thin cirrus crossing mid-clip is the decorative element. Both are straightforward for current AI motion tools.

## Edit notes

- **Zoom target is the moon, not the citadel.** The camera pushes toward the moon specifically. If the AI tool scales the whole frame (including citadel), it's wrong — only the moon should grow larger over the clip duration.
- **Cirrus cloud timing discipline.** Thin clouds cross the moon's face at seconds 3–5 of the render (mid-clip). They should NOT fully obscure the moon — partial occlusion only, like watching a lighthouse beam through fog. If the AI renders heavy cloud cover, re-render.
- **Citadel silhouette stays pure-black or near-black.** No detail, no windows, no lit features. This biome's mystery depends on the citadel being a silhouette — a detailed render reveals too much.
- **No stars.** The moon is the only light source. If AI generates a starfield, re-render with explicit "no stars" negative prompt.
- **Color grade target:** cold blue-silver. Black citadel silhouette, pale silver moon, thin steel-blue clouds. No warm tones whatsoever — grade out any orange that AI tools love to add to "atmospheric" night renders.
- **Audio target:** -14 LUFS integrated. The 1.0s of silence at the end brings average integrated lower — lift the earlier portion slightly to compensate.

## Post caption (copy from `captions.md`)

Default Option 1:
> two functions. same object. a problem of reading.
>
> #ninelivesnetwork #nethara

## QC checklist

- [ ] Runtime = 8.00s ± 2 frames
- [ ] Moon occupies upper ~40% of frame, dominant compositional element
- [ ] Camera zoom target is the moon specifically, not the whole frame
- [ ] Thin cirrus crosses moon face at mid-clip without fully obscuring
- [ ] Citadel silhouette is pure/near-pure black, no interior detail
- [ ] No stars visible
- [ ] Three subtitle cues match VO verbatim, lowercase, no `!`
- [ ] "learn the difference" lands imperative but calm, not scolding
- [ ] Sign-off frame hard-cut with 1.0s silence
- [ ] Export 1080×1920, H.264, 24fps, -14 LUFS

## What this dispatch deliberately does NOT do

- **Does not show what the warning is about.** The moon being a warning is declared; the subject of the warning is not. Specifying it (e.g. "beware the nights" subtitle) kills the register.
- **Does not show figures on the citadel walls.** No guards, no lookouts. The citadel is sealed.
- **Does not use mystical language.** No "ancient eye," no "watcher in the sky." The moon is just a moon that happens to also function as a warning — the discrepancy IS the content.
- **Does not soften the imperative.** "learn the difference" stays as written. No softened variant like "try to learn the difference" — imperative is the register.

## Closer discipline — this is the end of Wave 0

D-05 is the last dispatch in Wave 0. After it ships, the next move is Wave 1 (character shorts from `/audit/trailer/shorts/`) once those unblock, OR Wave 2 dispatches if we choose to extend this track.

Do NOT add "more to come" / "stay tuned" language to the caption or the dispatch. Wave 0 ends when D-05 drops; the feed's next move is the next move — no in-dispatch roadmap.

If the team wants to mark Wave 0 as complete for internal tracking, do it in the git commit message, not in the dispatch content.

## Cross-dispatch thematic close

If D-01 says "the wall does not ask you to understand" and D-05 says "learn the difference" — the voice has completed a small arc. It began by telling the viewer the world doesn't require your comprehension; it ends by giving you exactly one instruction. That symmetry is intentional. Don't over-explain it anywhere (commit messages, captions, thread replies). It either works in aggregate or it doesn't.
