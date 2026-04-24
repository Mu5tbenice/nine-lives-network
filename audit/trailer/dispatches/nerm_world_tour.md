# Production Sheet — Nethara Reveal (Nerm-led world tour)

**Runtime:** ~55s (target 50–60s, hard cap 65s)
**Format:** 1080×1920 (9:16 vertical) primary; 1920×1080 (16:9 letterboxed) secondary for YouTube
**Voice:** Nerm via ElevenLabs locked voice (settings in `nerm_voice_canon.md`)
**Drop strategy:** Single marquee post on Twitter + YouTube. Pin to @9LVNetwork profile for ≥1 week.

## Purpose

The first marquee piece for Nine Lives Network's social presence. First time the audience meets Nerm via video. First look at Nethara as a place. Replaces the originally-planned 5-dispatch drip strategy after the audience-traction critique landed.

This piece is **distinct from** the cinematic launch trailer (`9LN_CINEMATIC_TRAILER_PRODUCTION_PLAN.md` v3, still shelved). The Reveal is a precursor — establishes world + Nerm before the bigger 4-act trailer drops. The two pieces do not compete; they sequence.

## Asset list

| Asset | Source | Use |
|---|---|---|
| D-01 clip (umbral wall) | Wray's Kling 3.0 render | Beat 1 — anchor environment |
| D-04 clip (skycastle) | Wray's Kling 3.0 render | Beat 2 — sky lift |
| D-02 clip (chaos rift) | Wray's Kling 3.0 render | Beat 3 — threat |
| D-03 clip (tidal depths) | Wray's Kling 3.0 render | Beat 4 — calm window |
| D-05 clip (moon citadel) | Wray's Kling 3.0 render | Beat 5 — cold close |
| Title card | `public/assets/images/title-nethara.png` | Open + sign-off |
| Logo (optional) | `public/assets/images/9lv-logo.png` | Sign-off frame composite |
| Splash bed (optional) | `public/assets/video/splash-bg.mp4` | Tail under sign-off |
| Nerm VO takes (8 lines) | `nerm_vo_takes/` (generated from `nerm_vo_script.md`) | Layered narration |
| Subtitle style | `audit/trailer/shorts/subtitle_style_vertical.md` | Burned-in subs, inherit verbatim |
| Music bed | Source from Artlist / Soundstripe / Epidemic ("cinematic ambient" / "dystopian") | Sparse rhythm + sub-bass |

**Pull all 5 Kling clips into `audit/trailer/dispatches/renders/` if you want them tracked in repo** — optional but recommended for reproducibility. Filenames: `d01_umbral_wall.mp4`, `d02_chaos_rift.mp4`, `d03_tidal_depths.mp4`, `d04_skycastle.mp4`, `d05_moon_citadel.mp4`.

## Runtime map

| # | Time | Source | Duration | Nerm VO | Subtitle | Edit note |
|---|---|---|---|---|---|---|
| 0 | 0.0–1.0 | Title card (`title-nethara.png`) | 1.0s | **silent** | — | Hard-in. Music bed enters at 0.0s — single sub-bass hit, then sparse percussive ticks. |
| 0a | 1.0–1.5 | Cross-cut (black) | 0.5s | **silent** | — | Brief transition — fade-thru-black. Music continues. |
| 1 | 1.5–4.5 | D-01 head | 3.0s | "fine. you wanted to see the place." | `fine.` then `you wanted to see the place.` | Open beat. "fine." lands at 1.7s, sigh-pause to 2.2s, second clause at 2.4s. |
| 2 | 4.5–13.0 | D-01 cont. | 8.5s | "this is the wall. it has been here longer than i have. it is fine." | three cues, see subtitle track | Wall fills frame. Camera push from D-01 render. |
| 2a | 13.0–13.3 | Cross-cut (fade-thru-black) | 0.3s | **silent** | — | Beat transition. Hard fade. |
| 3 | 13.3–22.0 | D-04 skycastle | 8.7s | "skycastle. they archive things. don't ask what." | three cues | Cloud parallax from D-04 render. Music lifts subtly. |
| 3a | 22.0–22.3 | Cross-cut (fade-thru-black) | 0.3s | **silent** | — | Transition. |
| 4 | 22.3–30.5 | D-02 chaos rift | 8.2s | "do not get close. people who get close make my paperwork harder." | two cues | Glitch motion from D-02 render. Music pulls slightly tense. |
| 4a | 30.5–30.8 | Cross-cut (fade-thru-black) | 0.3s | **silent** | — | Transition. |
| 5 | 30.8–40.0 | D-03 tidal depths | 9.2s | "the water is on time. nothing else is on time." | two cues | Water from D-03. Music pulls back — calm window. |
| 5a | 40.0–40.3 | Cross-cut (fade-thru-black) | 0.3s | **silent** | — | Transition. |
| 6 | 40.3–48.5 | D-05 moon citadel | 8.2s | "the moon. it watches. learn to live with it." | three cues | Moon zoom from D-05. Music lifts to peak. |
| 6a | 48.5–48.8 | Cross-cut (fade-thru-black) | 0.3s | **silent** | — | Transition. |
| 7 | 48.8–54.5 | Black background, optional D-05 hold-frame | 5.7s | "that's the place. it's not for everyone. that's also the point." | three cues | Outro spoken on dark/dim background. Music softens. |
| 8 | 54.5–55.5 | Sign-off frame (`title-nethara.png` + optional 9lv-logo.png) | 1.0s | **silent** | — | Hard cut to sign-off. Music tails out. |
| 8a | 55.5–55.5 | Optional Nerm sign-off "tour over." | 0.0s | (cut if length tight) | `tour over.` | If pacing allows, layer over sign-off frame's last 1s. Otherwise drop. |

**Total: ~55.5s** (acceptable; cut Beat 8a if you want to land at 54s exact).

## Subtitle track

```
[1.70s – 2.20s]    fine.
[2.40s – 4.50s]    you wanted to see the place.
[4.80s – 6.50s]    this is the wall.
[6.80s – 10.30s]   it has been here longer than i have.
[10.50s – 12.50s]  it is fine.
[13.50s – 14.80s]  skycastle.
[15.10s – 18.00s]  they archive things.
[18.30s – 21.30s]  don't ask what.
[22.50s – 25.00s]  do not get close.
[25.30s – 30.30s]  people who get close make my paperwork harder.
[31.00s – 33.50s]  the water is on time.
[34.00s – 37.50s]  nothing else is on time.
[40.50s – 42.00s]  the moon.
[42.30s – 44.00s]  it watches.
[44.30s – 47.50s]  learn to live with it.
[49.00s – 51.00s]  that's the place.
[51.30s – 52.50s]  it's not for everyone.
[52.80s – 54.30s]  that's also the point.
```

Anchor: **bottom default** (22% from bottom per `subtitle_style_vertical.md`). Most cues single-line; longer ones may wrap to 2 lines (acceptable per the vertical subtitle spec — never 3 lines for one cue).

## Music bed direction

Critical change from the original individual-dispatch sheets — atmospheric drone won't carry 55s.

**Approach:**
- **0.0s** Single sub-bass hit (~40Hz), decays through 0.0–1.0s under title card
- **0.5–13.0s** Sparse percussive ticks (clock-like, ~70 BPM half-time feel) over sub-bass pedal. Quiet under VO.
- **13.0–30.0s** Bed builds subtly — adds one mid-frequency texture (synth pad ~200Hz, very low in mix). Don't get loud.
- **30.0–40.0s** Pull back during the water beat. Mid-frequency drops out. Just sub-bass + ticks.
- **40.0–48.5s** Lift again during moon beat. Add a high-frequency shimmer (cymbal-bowing texture) over moon push.
- **48.5–55.0s** Outro: bed reduces to sub-bass + slow pulse. Final note lands under title card.
- **55.5s** Fade to silence.

**Reference register:** Annihilation, The Lighthouse, dystopian / restraint. NOT epic orchestral, NOT lo-fi chill, NOT video game soundtrack.

**Source:** Artlist / Soundstripe / Epidemic Sound under "cinematic ambient" / "dystopian" / "ominous" tags. Avoid anything with vocals or recognizable melodic hooks.

**VO ducking:** Bed drops -10dB to -12dB under every Nerm VO line. Returns to full at line ends.

## CapCut assembly walkthrough

1. **New project, 1080×1920, 24fps**
2. **Import all 5 Kling clips** + title card + 9lv-logo + Nerm VO takes (best take per line) + chosen music bed
3. **Layer 1 (V1) — clips:** Title (1s) → fade-thru-black (0.5s) → D-01 (8.5s + 3s lead-in for VO) → fade-thru-black (0.3s) → D-04 (8.7s) → fade (0.3s) → D-02 (8.2s) → fade (0.3s) → D-03 (9.2s) → fade (0.3s) → D-05 (8.2s) → fade (0.3s) → black or dim D-05 hold (5.7s for outro VO) → sign-off (1s)
4. **Layer 2 (V2) — burned-in subtitles** per the subtitle track above. Use the title-style preset matching `subtitle_style_vertical.md` (color, drop shadow, no background pill, anchor 22% from bottom)
5. **Layer 3 (A1) — Nerm VO takes**, one per beat, dropped at the start times in the runtime map. Audio level: peak around -3dB so they sit above the music bed
6. **Layer 4 (A2) — music bed**, full duration, ducked under Nerm VO via keyframes (not auto-ducking — keyframes give you control)
7. **Layer 5 (A3, optional) — sub-bass hit at 0.0s**, single sample, lets the title card land
8. **Color grade** — match across all 5 clips. They were rendered separately and may drift in saturation / contrast. Apply a single LUT or grade adjustment to the V1 layer for cohesion.
9. **Export 1080×1920 H.264 24fps -14 LUFS integrated, peak -1.0 dBTP**
10. **Secondary export 1920×1080:** new export pass with the 9:16 timeline letterboxed center in a black 16:9 frame. Accept the visual loss — YouTube needs 16:9.

## QC checklist

- [ ] Total runtime 50–60s (cut Beat 8a if over)
- [ ] Title card holds 1s, hard-in (no fade-up)
- [ ] All 5 environment clips appear in correct order (D-01 → D-04 → D-02 → D-03 → D-05)
- [ ] Each beat transition is fade-thru-black 0.3s (NOT crossfade, NOT cut-on-action)
- [ ] All Nerm VO takes use the **same locked voice ID** (no voice drift between beats)
- [ ] "fine." in intro reads as sigh, not enthusiasm
- [ ] "paperwork" in Beat 3 lands flat (not punched)
- [ ] All subtitles match VO verbatim, lowercase, no `!`
- [ ] Music bed has presence (not pure ambient drone)
- [ ] VO ducking is keyframe-controlled, not auto-applied
- [ ] Sign-off frame is `title-nethara.png` (with optional 9lv-logo composite)
- [ ] Color grade consistent across all 5 clips
- [ ] Export 1080×1920 H.264 24fps -14 LUFS
- [ ] Secondary 1920×1080 letterboxed export ready for YouTube

## Distribution

| Platform | Format | Caption | Pin? |
|---|---|---|---|
| Twitter (primary drop) | 1080×1920, native upload | From `marquee_caption.md` | YES — pin to @9LVNetwork profile for ≥1 week |
| YouTube | 1920×1080 letterboxed | Full description from `marquee_caption.md` | N/A |
| TikTok | 1080×1920, native | Adapted caption from `marquee_caption.md` | N/A |
| IG Reels | 1080×1920 | Adapted caption | N/A |
| YouTube Shorts | 1080×1920 | Title-only | N/A |

**Drop sequence:**
- Day 0 — Twitter primary drop, pin immediately
- Day 0 +1h — YouTube upload (slower processing, drop after Twitter is live)
- Day 0 +6h — TikTok + IG Reels (allows Twitter to capture initial reaction)
- Day 0 +24h — Observe engagement before drafting any follow-up content
- Day +7 — Unpin if engagement has tailed off; otherwise leave pinned through next push

## Verification — what success looks like

1. **Voice locks within 3 candidates** — if you audition more than 3 voices, the canon doc needs tightening before more credits burn
2. **All 8 Nerm VO lines generate in one session** with the same locked voice ID
3. **Final cut runs 50–60s** — if it goes over 65s, cut Beat 8a (sign-off) first, then Beat 4 (water) second
4. **Marquee drop on Twitter gets ≥10x normal feed engagement within 24h** — if it doesn't, diagnose: (a) Nerm-voice problem (recast), (b) music-presence problem (re-master), (c) hook problem (re-cut Beat 1 to put "fine." at 0.0s instead of 1.7s)
5. **Pinned for ≥1 week** on @9LVNetwork — the Reveal IS the introduction now; supporting content points to it

## What this piece deliberately does NOT do

- **Does not show characters.** The 5 environment clips are character-free; Nerm narrates but doesn't appear visually. First visual reveal of any Nine is reserved for the cinematic trailer.
- **Does not include a token CTA, whitelist link, or game URL.** The Reveal sells the world. The CTA happens elsewhere.
- **Does not name houses, factions, or Nine names.** "skycastle" is the place; "they archive things" doesn't name who "they" are. Specifics get reserved for trailer + onboarding flow.
- **Does not acknowledge the original 5-dispatch plan** in any post copy. The Reveal stands alone — the audience never knows it was originally planned as 5 quiet drops.
- **Does not include a "more coming soon" tail.** The piece ends when it ends.

## Backup plan if voice audition fails

If none of Charlie / Daniel / Adam pass the "fine." test on ElevenLabs:

**Option A** — audition 2 more voices from ElevenLabs catalog matching the canon (gravelly mid-range male, slight world-weariness). Document why the first three failed in `nerm_voice_canon.md` so we tighten the casting brief.

**Option B** — Wray records the VO himself (or a friend) — voice doesn't need to be professionally cast for the Reveal. Authenticity sometimes beats polish. If choosing this path, record in a closet with a phone (low-fi but consistent), do NOT use studio reverb.

**Option C** — Skip Nerm VO for this piece, use **on-screen text only** + heavier music. Falls back to the "music + text cards" option from the original strategic question. Less character but ships. Treat as last resort.

If Option B or C fires, document the decision in this file's edit history and the project memory.
