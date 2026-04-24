# Nethara Dispatches — Reveal piece + supplementary recut sheets

This directory holds production sheets for two distinct pieces of social content built from the same source assets:

1. **The marquee piece — "Nethara Reveal"** (~55s Nerm-led world tour). Primary deliverable. One drop, pinned to @9LVNetwork. See `nerm_world_tour.md`.
2. **The supplementary recut sheets** (5 individual environment dispatches, originally Wave 0 drip). Production sheets retained as ready-to-go supporting content if and when we activate a two-tier strategy after the Reveal lands.

## Why two pieces from one asset bank

The original Wave 0 plan proposed 5 separate 6–10s environmental dispatches with deliberately-flat Nethara voice narration, dripped over 3 weeks. After all 5 Kling 3.0 environment clips were rendered, the strategy got pushback: a 10s flat-narration atmospheric clip won't earn its watch on a muted Twitter feed, and 5 quiet drops accumulate to less momentum than one strong drop.

The pivot: combine the same 5 clips into a **single ~55s Nerm-led world tour** as the marquee drop. Different voice (Nerm, character-led, dry-with-attitude — not Nethara institutional). Different ship strategy (one drop, pin, observe — not weekly drip). Same source clips.

The original 5-dispatch sheets are preserved as supplementary recut potential — if the marquee lands, those sheets become ready-to-ship supporting content for weeks 2–4 with zero additional spec work.

## What lives here

```
audit/trailer/dispatches/
│
├── README.md                  ← this file
│
│   PRIMARY — the marquee piece
├── nerm_world_tour.md         ← production sheet for the Reveal (~55s combined cut)
├── nerm_voice_canon.md        ← Nerm voice spec + ElevenLabs casting + locked TTS settings
├── nerm_vo_script.md          ← 8 Nerm VO lines (intro + 5 environment + outro + sign-off)
├── marquee_caption.md         ← single-drop caption library (Twitter / YouTube / TikTok / Reels)
│
│   SUPPLEMENTARY — recut sheets, retained for post-marquee deployment
├── voice_canon.md             ← "Nethara voice" institutional register (NOT used in Reveal)
├── vo_script.md               ← 5 Nethara-voice VO lines (NOT used in Reveal)
├── ai_video_prompts.md        ← Kling/Runway/Higgsfield prompts (used to render the 5 source clips)
├── captions.md                ← 5-rotation caption library per dispatch
├── d01_umbral_wall.md         ← 8s — for supplementary recut "umbral wall" standalone
├── d02_chaos_rift.md          ← 6s — for supplementary recut "chaos rift" standalone
├── d03_tidal_depths.md        ← 10s — for supplementary recut "tidal depths" standalone
├── d04_skycastle_dusk.md      ← 10s — for supplementary recut "skycastle" standalone
└── d05_moon_citadel.md        ← 8s — for supplementary recut "moon citadel" standalone

nerm_vo_takes/  ← create on Nerm VO generation; hold WAV files
renders/        ← optional — pull Kling clips into repo for tracked source
```

## Two voices, distinct, never conflated

The IP now has two narrative voices that serve different purposes. Lock the difference and never mix them within a single piece.

| Voice | Used in | Register | Voice canon file |
|---|---|---|---|
| **Nerm** | The Reveal marquee + future Nerm-led pieces | Character — dry, weary, takes jabs without trying. Gervais/Hyde/Mullen anchors. | `nerm_voice_canon.md` |
| **Nethara** | (deferred) supplementary recuts of individual environments, atmospheric drips | Institutional — flat, observational, world-as-subject. Ledger-clerk register. | `voice_canon.md` |

If a piece lands well in Nerm voice, it should not be reposted with Nethara voice (or vice versa). Voice consistency per-piece is the discipline.

Nerm voice gets locked once via ElevenLabs (audition during Reveal production); same voice ID powers every future Nerm piece. Nethara voice would also get locked once if/when supplementary recuts go live — different voice ID, different settings.

## Production status

| Item | Status |
|---|---|
| 5 Kling 3.0 environment clips (D-01 through D-05) | ✅ Rendered, in Wray's Higgsfield/Kling workspace |
| `ai_video_prompts.md` prompt library | ✅ Complete (used to produce the 5 clips) |
| Nethara voice canon | ✅ Spec complete (deferred; not used in Reveal) |
| Nethara VO lines | ✅ Spec complete (deferred; not used in Reveal) |
| Nerm voice canon | ✅ Spec complete |
| Nerm VO script (8 lines) | ✅ Spec complete |
| Reveal production sheet | ✅ Spec complete |
| Marquee caption library | ✅ Spec complete |
| Nerm voice audition + lock | ⏳ Pending (next session) |
| All 8 Nerm VO lines generated | ⏳ Pending |
| CapCut assembly of Reveal | ⏳ Pending |
| Reveal export + Twitter drop | ⏳ Pending |

## Production order — pick up here

1. **Read `nerm_voice_canon.md`** — voice canon, casting shortlist, locked TTS settings
2. **Audition 3 voices on ElevenLabs** using the intro line ("fine. you wanted to see the place.") — pick whichever lands "fine." as a sigh
3. **Generate all 8 Nerm VO lines** from `nerm_vo_script.md` in same locked-voice session
4. **Log voice ID + settings** at top of `nerm_vo_script.md` (placeholder block waiting)
5. **Source music bed** — Artlist / Soundstripe / Epidemic under "cinematic ambient" / "dystopian"
6. **Assemble in CapCut** per `nerm_world_tour.md` runtime map (single 9:16 timeline)
7. **Export** 1080×1920 H.264 24fps -14 LUFS + secondary 1920×1080 letterboxed for YouTube
8. **Drop on Twitter first**, pin to @9LVNetwork. Caption from `marquee_caption.md`
9. **Observe 24h** before any follow-up content
10. **Decide week 2** — if Reveal lands, activate Wave 0.1 supplementary recuts using the `d0X_*.md` sheets + Nethara voice. If Reveal misses, diagnose before further production.

## Hard editorial rules (apply across all pieces here)

Inherited from `/audit/trailer/launch/README.md`:
- Lowercase always (titles can use proper-noun caps as platform affordance)
- No exclamation marks, no emoji, no pump language
- Primary handle `@9LVNetwork`; Nerm account `@9LV_Nerm`
- Hashtag restraint — owned only (`#ninelivesnetwork`, `#9LV`, `#nethara`); `#fyp` acceptable on TikTok only

Voice-specific rules in each voice canon file (`nerm_voice_canon.md`, `voice_canon.md`).

## Cross-track positioning

The Reveal is **distinct from**:

- **The cinematic launch trailer** (`9LN_CINEMATIC_TRAILER_PRODUCTION_PLAN.md` v3 — still production-planned but shelved on character compositing). The Reveal is a precursor; the trailer is the bigger 4-act launch piece. Do not let them compete in messaging.
- **Wave 1 character shorts** at `../shorts/` (still shelved on nerm_head + Nerm VO recording session). Different production pipeline. Different content. The Reveal does NOT show characters; Wave 1 shorts depend on character composites.
- **Pre-launch drip tweets** at `../launch/pre_launch_drip.md` (text-only). Those are continuous brand-voice presence; the Reveal is a single high-stakes drop.

## Canon-compliance grep (run before any drop)

```bash
grep -En '!' audit/trailer/dispatches/*.md       # only inside rule-citation code spans, never in voiced/posted content
grep -EinH 'moon.{0,3}shot|wagmi|gm gm|lfg|ape |degen|pump' audit/trailer/dispatches/*.md  # only in guardrail regex
grep -Ein '\bI\b|\bwe\b|\bus\b' audit/trailer/dispatches/nerm_vo_script.md vo_script.md  # voice-content checks
```

If hits land in posted/voiced content (not instructional / regex / rule-citation), rewrite before posting.

## After the Reveal ships

Update this README with:
- Reveal launch date + first 24h engagement summary
- Whether Wave 0.1 supplementary recuts get activated
- Final locked Nerm voice ID (also stored in `nerm_voice_canon.md` and `project_nerm.md` memory)
- Any pipeline learnings — feed into §10 Pipeline Learnings Capture in master plan

The Reveal is **the first marquee video drop** for the IP. Treat the production data as load-bearing for everything that follows.
