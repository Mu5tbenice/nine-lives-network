# VO Script — Dispatches Wave 0

Five Nethara-voice lines. One per dispatch. Generate in a single TTS session using the settings locked in `voice_canon.md`. All 5 render in ~10 minutes of generation time once a voice ID is picked.

Save takes to `audit/trailer/dispatches/vo_takes/` (create the directory when generating). Naming: `d<N>_<biome-key>_vo.wav`.

## Canon recap (the voice-writing rules these lines obey)

- Lowercase always
- Periods + commas only. No `!`. No `?`.
- Short sentences. Observational. World's-own-voice, not Nerm.
- No first-person pronouns. No "we." No direct address to the viewer.
- No metaphor that needs explaining. No mystic register.

If editing any line below, re-check against `voice_canon.md` before regenerating.

---

## D-01 — Umbral Wall

> the wall does not fall. the wall does not blink. the wall does not ask you to understand.

**Runtime target:** ~6.5s of VO on a slightly-slow read
**Delivery notes:**
- Three-beat anaphora. Each clause gets equal weight — do not let the third sentence swell.
- Pause ~0.3s between sentences. Not dramatic — just a reader taking breath.
- Do NOT punch "understand." It lands flat, which is the joke.
- If the TTS adds drama to the third clause, lower stability or regenerate.

**File:** `d01_umbralwall_vo.wav`

---

## D-02 — Chaos Rift

> the rift has a pattern. you will not see it in time.

**Runtime target:** ~4s of VO
**Delivery notes:**
- Two sentences. The gap between them is the whole line. Pause ~0.6s between — longer than D-01's pauses, because the turn is the content.
- "you will not see it in time" — flat. No emphasis on "in time." The finality is implicit.
- Fine as exactly two sentences; do not pad.
- **Exception to the no-second-person rule:** "you" here is impersonal, not addressing the viewer specifically. Reading as "one will not see it in time" is too formal. Keep "you."

**File:** `d02_chaosrift_vo.wav`

---

## D-03 — Tidal Depths

> the tide runs on a schedule. nethara does not keep one.

**Runtime target:** ~4.5s of VO
**Delivery notes:**
- Pause ~0.4s between sentences — matching the tide's own rhythm.
- "nethara" is a proper noun but read it lowercase-register (no reverence, no bump). It's a place name to this voice, not a deity.
- If the TTS stresses "nethara" as capitalized, regenerate or bypass with phonetic override.
- No irony in the delivery — just an observation of the discrepancy.

**File:** `d03_tidaldepths_vo.wav`

---

## D-04 — Skycastle Dusk

> dusk settles on skycastle twice a day. once for the living. once for the records.

**Runtime target:** ~7s of VO
**Delivery notes:**
- Three sentences, cadence: normal / slightly slower / slower-still. Let the final clause have the most room.
- "the records" is the landing. No punch, no reverb-worthy pause — just a tiny bit of weight. This is the most "institutional" line in the set and should feel like it.
- Pause ~0.3s after sentence 1, ~0.5s after sentence 2.
- If TTS reads "records" with an upward lilt (like a question), regenerate.

**File:** `d04_skycastle_vo.wav`

---

## D-05 — Moon Citadel

> the moon above the citadel is a lamp. it is also a warning. learn the difference.

**Runtime target:** ~6s of VO
**Delivery notes:**
- Three sentences building. The third — "learn the difference." — is imperative but not angry. Think "nod, not finger-wag."
- Pause ~0.3s after sentence 1, ~0.5s after sentence 2 (let "warning" settle).
- "learn the difference" is the closest this voice comes to advising the viewer. Do NOT soften it into a suggestion; keep the imperative register.
- Do NOT punch "warning." The word does the work.

**File:** `d05_mooncitadel_vo.wav`

---

## Recording order (TTS session)

Generate in this order — hardest anaphora first, then descending complexity:

1. **D-01** (three-beat anaphora — hardest for TTS not to overdramatize)
2. **D-04** (three sentences — second-hardest)
3. **D-05** (three sentences with imperative close)
4. **D-03** (two sentences, discrepancy joke)
5. **D-02** (two sentences, pause-is-content)

If D-01 doesn't land on any voice in the audition shortlist, the voice isn't tuned flat enough — tighten `voice_canon.md` settings (lower stability, kill style exaggeration, slower rate) and retry before proceeding.

## Per-line QC

After generation, one-line gut check per take:

| Take | Pass if... | Fail if... |
|---|---|---|
| D-01 | Third clause has no more drama than the first | Voice swells on "understand" |
| D-02 | Pause between sentences feels heavy, not awkward | Second sentence follows too fast |
| D-03 | "nethara" reads as a flat noun, not a proper invocation | Voice reveres the word |
| D-04 | "records" lands grounded, not mystical | Voice treats "records" as a spooky reveal |
| D-05 | "learn the difference" is imperative but calm | Voice finger-wags or softens to a suggestion |

If any fail, regenerate with the same voice ID — not a new voice. The voice is locked; the take is the variable.

## Session-settings record

Log the final settings that produced the shipped takes as a fenced block at the top of this file on the first successful generation:

```
TTS settings used for Wave 0 shipped takes:
  Provider: ElevenLabs
  Voice ID: <fill in after audition>
  Stability: <value>
  Similarity: <value>
  Style: 0
  Speaking rate: <value>
  Session date: <YYYY-MM-DD>
```

Future dispatches regenerate with the exact same values. Voice drift is the only failure mode that compounds across episodes — lock early, audit often.

## Canon-compliance grep

Before considering this script done:

```bash
grep -En '!' audit/trailer/dispatches/vo_script.md                       # zero hits in content
grep -En 'I |I\.' audit/trailer/dispatches/vo_script.md                  # zero hits in content
grep -Ein '\bwe\b|\bus\b' audit/trailer/dispatches/vo_script.md          # zero hits in content
```

If any hit in line content (not headers), rewrite. Headers and instruction copy can break the rules freely — those aren't the voice speaking.

## Post-session

- Save wavs to `audit/trailer/dispatches/vo_takes/`
- Keep at least 2 takes per line if generations are cheap; delete all but the chosen take after CapCut integration
- Note the voice ID in every short's production sheet so future dispatches pull the same voice
- If any regeneration happens later, log old→new take in git commit message so we track which episode uses which pass
