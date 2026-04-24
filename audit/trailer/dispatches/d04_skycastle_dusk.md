# Dispatch D-04 — Skycastle at Dusk

**Runtime:** 10.0s
**Format:** 1080×1920 (9:16 vertical), H.264, 24fps, burned-in subtitles
**Register:** atmospheric, ritual, institutional
**Ship week:** Week 3 (paired with D-05)
**Delivery channels:** Twitter, TikTok, IG Reels, YouTube Shorts

## Purpose

Ships in Week 3 alongside D-05. The most explicitly institutional dispatch in Wave 0 — the voice references a bureaucratic ritual ("twice a day. once for the living. once for the records."). Plants the idea that Nethara is an administered world, not a wild one. That framing seeds the deployment / zone-control game mechanic when players later encounter it.

Also: second-longest dispatch (10s). The three-sentence structure needs room to breathe; squeezing into 6s would make the "once for the records" land without landing.

## Asset list

| Asset | Source | Use |
|---|---|---|
| Source biome PNG | `public/assets/images/biomes/skycastle.png` | i2v input |
| AI-motion clip | `audit/trailer/dispatches/renders/d04_skycastle.mp4` | Primary video |
| VO take | `audit/trailer/dispatches/vo_takes/d04_skycastle_vo.wav` | Narration |
| Subtitle style | `audit/trailer/shorts/subtitle_style_vertical.md` | Inherit |
| Sign-off frame | `public/assets/images/title-nethara.png` | Closer |

## Runtime map

| # | Time | Source | Duration | VO | Subtitle cue | Edit note |
|---|---|---|---|---|---|---|
| 1 | 0.0–1.5 | Clip head | 1.5s | **silent** | — | Hold on skycastle. Ambient wind/drone bed enters at 0.2s. Camera static; clouds drifting. |
| 2 | 1.5–4.0 | Clip cont. | 2.5s | "dusk settles on skycastle twice a day." | `dusk settles on skycastle twice a day.` | First clause. Normal pace. |
| 3 | 4.0–4.3 | Clip cont. | 0.3s | **silent** | — | Small pause. Not the big pause — just breath. |
| 4 | 4.3–6.3 | Clip cont. | 2.0s | "once for the living." | `once for the living.` | Slightly slower. Let "living" settle. |
| 5 | 6.3–6.8 | Clip cont. | 0.5s | **silent** | — | Pause — longer than previous. The next line is the landing. |
| 6 | 6.8–8.8 | Clip cont. | 2.0s | "once for the records." | `once for the records.` | Slowest clause. Equal weight to "living" — do not punch "records." |
| 7 | 8.8–10.0 | Sign-off frame | 1.2s | **silent** | — | Hard cut to title card. Wind bed tails out. |

Total: **10.0s** exact.

## 9:16 reframing / crop notes

`biomes/skycastle.png` — verify aspect. The castle spire should occupy the middle ~60% of vertical frame height. Clouds above and below. If the AI tool's render pushes the castle to the edge or makes it tiny in a cloud-dominated composition, re-render with framing emphasis ("castle fills center of frame, clouds frame top and bottom").

The vertical framing suits skycastle well — the spire silhouette IS vertical, which is why this biome is one of the safer 9:16 adaptations in Wave 0.

## VO source take

| Line | Source take | Handling |
|---|---|---|
| Full line (three clauses, increasing gravity) | `d04_skycastle_vo.wav` from `vo_script.md` | Single take. Cadence: normal / slightly slower / slower-still. Final clause gets the most room. |

Delivery test: "the records" at end must land grounded, not mystical. If TTS treats "records" as a reverb-worthy reveal, regenerate. This voice doesn't do reveals — it does log entries.

## Subtitle track

```
[1.50s – 4.00s]    dusk settles on skycastle twice a day.
[4.30s – 6.30s]    once for the living.
[6.80s – 8.80s]    once for the records.
```

Anchor: **bottom default** (22% from bottom). Cue 1 may need to wrap to 2 lines depending on font metrics — test on phone. If it wraps, break at "skycastle" (8 chars) so line 1 is "dusk settles on skycastle" and line 2 is "twice a day." That break preserves sentence rhythm over character balance.

## Music bed

- **0.0–0.2s** silence
- **0.2–8.8s** low wind/drone bed, warm-cold split — lower frequency range amber, higher frequency range violet (mirrors the color grade). Duck -10dB under each VO clause.
- **6.8–8.8s** bed swells slightly as "once for the records" plays — NOT dramatic, just a small gravitational pull. 1–2dB lift, no more.
- **8.8s** bed drops fast (0.5s fade) as title card hits
- **9.5s** total silence into the final title frame

**Do NOT use** choir, organ, or any instrument associated with "ceremonial" register in film scoring. The ritual in this dispatch is bureaucratic, not liturgical — the audio reflects that.

## Sign-off frame

Final 1.2s (8.8–10.0s):
- Hard cut to `title-nethara.png` center
- No fade, no dissolve
- Audio goes to total silence before the title hits — the quiet is the closure

## Render dependencies

- `biomes/skycastle.png` — **exists**
- AI-motion render — new
- VO take d04 — new
- `title-nethara.png` — **exists**

**Moderate complexity render.** Cloud parallax at two depths is a known-solved problem for AI motion tools — should land in 1-3 attempts.

## Edit notes

- **Cloud parallax at two depths is the specific motion.** Foreground clouds drift one direction, background clouds drift opposite. If the render produces uniform cloud drift (all clouds moving same direction same speed), re-render with explicit parallax prompt language.
- **Window-light pulse frequency.** Subtle pulses every ~3 seconds, visible but not attention-grabbing. If the AI renders constant warm glow (no pulse) or dramatic flash-pulse (too much), re-render.
- **Color grade target:** amber-violet split — warm tones in the lower third of the frame (sun below cloud line), cool violet in the upper third. Castle silhouette reads dark against both. Do not grade toward pure gold (reads cheesy sunset) or pure blue (reads cold night — wrong time of day).
- **No flying objects.** If the AI hallucinates birds, dragons, or figures in the sky, re-render. The sky is empty of inhabitants; it's architecture and weather only.
- **Audio target:** -14 LUFS integrated. The small swell at "records" is the only dynamic variance — keep it subtle.

## Post caption (copy from `captions.md`)

Default Option 1:
> two ledgers. one dusk each.
>
> #ninelivesnetwork #nethara

## QC checklist

- [ ] Runtime = 10.00s ± 2 frames
- [ ] Castle silhouette occupies ~60% vertical frame height
- [ ] Two cloud layers visible with opposing-direction parallax
- [ ] Three subtitle cues match VO verbatim, lowercase, no `!`
- [ ] Subtle window-light pulses every ~3s (present but not attention-grabbing)
- [ ] "once for the records" lands grounded, not mystical
- [ ] No birds / dragons / figures in the sky
- [ ] Sign-off frame is title-nethara.png
- [ ] Export 1080×1920, H.264, 24fps, -14 LUFS

## What this dispatch deliberately does NOT do

- **Does not show inhabitants of the castle.** No silhouettes at the windows, no figures on the walls. "for the living" is abstract — naming or showing them specifies the wrong thing.
- **Does not explain "the records."** Viewers will ask — let them. The voice doesn't elaborate.
- **Does not use the word "forever" or "eternal."** Skycastle isn't mystic; it's just old. Mystification breaks the institutional register.
- **Does not include Nerm.** Same as D-01 through D-03.

## Institutional register discipline

D-04 is the most explicitly bureaucratic dispatch in Wave 0. If it lands, it establishes that Nethara is an **administered** world — which is a key seed for the deployment/zone-control gameplay mechanic that players encounter later. That payoff only works if the voice stays flat and the "records" concept lands as routine, not wondrous.

If any of the edit decisions below tempt you, DON'T:
- Adding a subtitle at the end that says "the records archive" or similar
- Showing the castle's archive room via AI cutaway
- Narrating "the records of every Nine who has fallen"

Any of those over-commits the mystery and breaks the institutional understatement. The dispatch gives the viewer enough to wonder; the game gives them the answers later.
