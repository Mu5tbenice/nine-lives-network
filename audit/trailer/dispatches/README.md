# Nethara Dispatches — Wave 0 Environmental Shorts

A new shorts track that **ships now**, without waiting on character composites or a Nerm VO recording session. Production sheets here are for five 6–10s environment-only dispatches using existing biome PNGs + AI motion tools + AI TTS. Feed food for the weeks while Wave 1 character shorts stay shelved.

## Why this track exists

The existing Wave 1 shorts at `../shorts/` are **shelved** — all five are character-heavy (Nerm head composite, Darktide respawn footage, Smoulders/Plaguemire hero renders) and block on human/tool work Claude can't drive from the CLI.

Wave 0 dispatches bypass those blockers entirely. No main characters. No hero composites. No Nerm voice recording session. Just environments animated from stills, voiced by a deliberately-flat "Nethara voice" via AI TTS.

## Strategic framing

- **Ships in parallel to trailer production**, not after it
- **Establishes world register** before any character reveal — viewers meet Nethara's tone before they meet Nerm or any Nine
- **Proves the AI-motion pipeline** — first production cycle outside the character-asset system
- **Keeps the feed warm** while Wave 1 and trailer renders bake

When Wave 1 unblocks, it ships alongside this track. Dispatches remain the baseline drip; character shorts layer on top.

## What lives here

```
audit/trailer/dispatches/
├── README.md                    ← this file — track overview
├── voice_canon.md               ← "Nethara voice" spec + AI TTS settings recipe
├── ai_video_prompts.md          ← per-dispatch Runway / Higgsfield / Kling prompts
├── vo_script.md                 ← 5 Nethara-voice VO lines for TTS generation
├── captions.md                  ← 5 caption rotations per dispatch for social platforms
├── d01_umbral_wall.md           ← 8s — static architectural, "the wall does not fall."
├── d02_chaos_rift.md            ← 6s — glitch-coded, "you will not see it in time."
├── d03_tidal_depths.md          ← 10s — calm melancholic, "nethara does not keep one."
├── d04_skycastle_dusk.md        ← 10s — institutional, "once for the records."
└── d05_moon_citadel.md          ← 8s — cold imperative, "learn the difference."

renders/  ← create on first production run; hold AI-motion MP4 outputs
vo_takes/ ← create on first production run; hold TTS WAV outputs
```

## The 5 dispatches

| ID | Biome | Runtime | Register | Ship week |
|---|---|---|---|---|
| D-01 | umbral-wall | 8s | Ominous, static, architectural | 1 |
| D-02 | chaos-rift | 6s | Unsettling, glitch-coded | 2 |
| D-03 | tidal-depths | 10s | Calm, melancholic | 1 |
| D-04 | skycastle | 10s | Atmospheric, institutional | 3 |
| D-05 | moon-citadel | 8s | Cold, imperative | 3 |

Total runtime across all 5: **42 seconds** of original content. Five distinct emotional registers. One consistent voice.

## Asset reality — zero new source generation

Every dispatch reuses assets already in repo. The AI motion tool is the only new production step.

| Asset | Count | Path |
|---|---|---|
| Biome PNGs | 5 used (of 13 available) | `public/assets/images/biomes/` |
| Title card | 1 | `public/assets/images/title-nethara.png` |
| Splash video (optional tail) | 1 | `public/assets/video/splash-bg.mp4` |

**Zero Cinema Studio generation. Zero character composites. Zero Photoshop work.**

## Voice rules

The Nethara voice is **not Nerm**. It's an institutional register — world-as-subject, observational, deadpan, flat. Full spec in `voice_canon.md`.

Hard rules inherited from `/audit/trailer/launch/README.md`:
- Lowercase always
- No exclamation marks, no emoji, no pump language
- Primary brand handle `@9LVNetwork`; Nerm account `@9LV_Nerm`
- Hashtag restraint (owned only: `#ninelivesnetwork`, `#9LV`, `#nethara`)

Track-specific rules from `voice_canon.md`:
- No first-person ("i" / "we" / "us")
- No direct address ("you," except impersonal as in D-02)
- No rhetorical questions
- No mythic-trailer register ("in a land forgotten...")
- Three-beat anaphora used at most once per 5 dispatches (D-01 is the one)

## Production pipeline — end-to-end per dispatch

1. Open dispatch's production sheet (e.g. `d01_umbral_wall.md`)
2. Feed source biome PNG to AI motion tool (Runway / Higgsfield Soul / Kling) using prompt from `ai_video_prompts.md`
3. Render 6–10s clip. Accept fast, don't over-iterate — hard cap 6 renders per dispatch
4. Generate VO via AI TTS (ElevenLabs) using locked voice settings from `voice_canon.md`
5. In CapCut: combine clip + VO + burned-in subtitle per `../shorts/subtitle_style_vertical.md` + title-nethara.png sign-off
6. Export 1080×1920 H.264 24fps -14 LUFS
7. Post with caption from `captions.md`

Per-dispatch production sheet has runtime maps, subtitle tracks, music bed specs, and QC checklists.

## Ship cadence

| Week | Drops | Rationale |
|---|---|---|
| Week 1 | D-01 (umbral wall) | Strongest static premise — proves pipeline |
| Week 1 | D-03 (tidal depths) | Safest motion — proves water renders cleanly |
| Week 2 | D-02 (chaos rift) | Hardest motion — ship after confidence is built |
| Week 3 | D-04 (skycastle) | Most institutional register — paired |
| Week 3 | D-05 (moon citadel) | Imperative closer — ends Wave 0 |

Target: 5 dispatches across ~3 weeks. Interleave with pre-launch drip tweets from `/audit/trailer/launch/pre_launch_drip.md` — 2 videos + 3 text tweets per week per existing launch plan.

**Dispatches do not advertise themselves across each other.** No "part 1 of 5," no "next: the rift." Each stands alone.

## Pipeline-validation strategy

- **D-01 is the validation shot.** If D-01's render holds in 1–3 attempts, the AI tool + prompt library + voice settings are all proven. Scale to D-03 immediately.
- **If D-01 fails after 6 render attempts**, the prompt in `ai_video_prompts.md` needs revision before proceeding. Pause the whole track, diagnose, revise, retry. Do not roll forward to D-03 with an unproven pipeline.
- **Voice lock after D-01 takes.** The TTS settings that produce an acceptable D-01 become the locked settings for D-02 through D-05 — do not re-tune per-dispatch, consistency is the feature.

## Cross-track coherence

Before posting a dispatch:

- Check `../shorts/` — is any Wave 1 short scheduled to drop the same day? If yes, delay one to avoid self-cannibalizing the feed
- Check `../launch/pre_launch_drip.md` — don't double-up a text tweet and a dispatch drop on the same day within 4 hours of each other
- If the master trailer has launched and the pinned thread is live, dispatches drop **without** `@9LVNetwork` in the caption during that week — the pinned thread owns the brand handle

## Canon-compliance grep (run before any dispatch production)

```bash
grep -En '!' audit/trailer/dispatches/*.md                              # zero hits in content
grep -Ein '\bI\b|\bwe\b|\bus\b' audit/trailer/dispatches/vo_script.md    # zero first-person in VO
grep -EinH 'moon.{0,3}shot|wagmi|gm gm|lfg|ape |degen|pump' audit/trailer/dispatches/*.md  # zero pump lang
```

(Note: "moon" alone is canon — it's a celestial body in-world, cf. D-05. "moonshot" is pump language. The regex targets the latter.)

If any of these hit in line content (not instruction/header copy), rewrite before production.

## Out of scope for Wave 0

- **Wave 0 extensions** (D-06 through D-10) — spec after at least 3 Wave 0 dispatches have shipped and engagement data exists
- **Arena gameplay capture** — viable raw source (`/zone-battle.html` renders combat without main characters), but adds real-time dependency that Wave 0 deliberately avoids. Saved for Wave 1+ dispatches.
- **Env-to-env transitions** (compiled "Nethara reel" showcase post) — deferred until at least 3 dispatches exist to cut between
- **Time-of-day variants** (dawn versions of each biome) — deferred; fixed dusk-only is simpler for Wave 0
- **Spell VFX overlays** (lightning on stormrage biome, poison mist on plaguemire) — deferred
- **Translated subtitles** / non-English caption exports — not scoped; English-only for Wave 0

## Cross-refs

- Wave 1 character shorts (shelved): `/audit/trailer/shorts/` — ships when character composites + Nerm VO unblock
- Trailer cut-downs (16:9 social distribution): `/audit/trailer/cuts/`
- Launch copy (pinned thread, pre-launch drip, captions): `/audit/trailer/launch/`
- Subtitle style (inherited verbatim): `/audit/trailer/shorts/subtitle_style_vertical.md`
- Master production plan: `/9LN_CINEMATIC_TRAILER_PRODUCTION_PLAN.md` (v3, reference only — not modified by Wave 0)
- Voice canon source (for Nerm, referenced for Nethara-voice delta): `server/services/nermBrain.js`

## After Wave 0 ships

On completion of all 5 dispatches, log the following to the project memory:

- Which AI motion tool was used (final pick after audition)
- Which TTS voice ID was locked
- Average renders-to-approve per dispatch
- Time-to-publish per dispatch (start of render to post copy in hand)
- Any edit decisions that diverged from the production sheets — and whether the divergence improved the dispatch

That data feeds the §10 Pipeline Learnings Capture rubric in the master plan. Wave 0 is the first systematic content production cycle — the learnings inform how Wave 1 shorts (and subsequent dispatches) are produced.
