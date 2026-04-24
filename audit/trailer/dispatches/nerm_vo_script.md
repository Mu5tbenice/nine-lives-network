# Nerm VO Script — Nethara Reveal

8 Nerm lines for the Nethara Reveal marquee piece. Generate in a single TTS session using the locked voice ID + settings from `nerm_voice_canon.md`. All 8 render in ~10 minutes once the voice is picked.

Save takes to `audit/trailer/dispatches/nerm_vo_takes/` (create the folder). Naming: `nerm_<beat>_take<N>.wav`.

## Locked voice settings (paste here after audition)

```
ElevenLabs voice ID: <fill in after audition>
Voice name: <Charlie / Daniel / Adam / other>
Stability: 70
Similarity: 80
Style exaggeration: 0.15
Speaking rate: 0.95x
Session date: <YYYY-MM-DD>
```

Future Nerm pieces use these exact values. Voice drift is the only failure mode that compounds across episodes.

---

## Recording order (intro first — hardest)

The intro line is the audition test AND the canon lock. If "fine." doesn't land as a sigh on your picked voice, audition again before generating the rest.

### Beat 0 — Intro

> fine. you wanted to see the place.

**Runtime target:** ~3s
**Delivery notes:**
- "fine." is a SIGH. Tired. Resigned. Not polite, not enthusiastic, not theatrical.
- Pause ~0.5s after "fine." — long enough that the viewer hears the resignation before the rest of the line lands.
- "you wanted to see the place." is matter-of-fact. Slight emphasis on "you" — light blame.
- If "fine." reads as enthusiastic or polite, regenerate. If it reads as theatrical (sighing FOR the audience), regenerate.

**File:** `nerm_intro_take<N>.wav`

---

### Beat 1 — Umbral Wall (D-01)

> this is the wall. it has been here longer than i have. it is fine.

**Runtime target:** ~6s
**Delivery notes:**
- "this is the wall." — opening declarative. Flat.
- Slight pause before "it has been here longer than i have." — Nerm is doing the math.
- "it is fine." closes flat. Nerm uses "fine" as both intro and outro of this beat — the second "fine" should land slightly drier than the intro's, less sigh and more shrug.

**File:** `nerm_d01_wall_take<N>.wav`

---

### Beat 2 — Skycastle (D-04)

> skycastle. they archive things. don't ask what.

**Runtime target:** ~5s
**Delivery notes:**
- "skycastle." stand-alone, like a tour guide pointing. Then beat ~0.4s.
- "they archive things." — flat. The mystery is in what gets archived, not in the delivery.
- "don't ask what." — slightly clipped. The dismissal is content. Do NOT punch "what" — the line is funnier without emphasis.

**File:** `nerm_d04_skycastle_take<N>.wav`

---

### Beat 3 — Chaos Rift (D-02)

> do not get close. people who get close make my paperwork harder.

**Runtime target:** ~5s
**Delivery notes:**
- "do not get close." — imperative but tired, not urgent. Same register as "learn the difference" from the Nethara D-05 line.
- "people who get close make my paperwork harder." — the kicker. The line's whole joke is that the rift is a workplace hassle for Nerm. Flat delivery. Do NOT emphasize "paperwork."
- This is the line where Nerm's bureaucratic-immortality character lands hardest. Get this one right.

**File:** `nerm_d02_rift_take<N>.wav`

---

### Beat 4 — Tidal Depths (D-03)

> the water is on time. nothing else is on time.

**Runtime target:** ~4s
**Delivery notes:**
- "the water is on time." flat. Like reading a clock.
- Pause ~0.4s.
- "nothing else is on time." — same flat register. The discrepancy is the joke; the voice doesn't help it.

**File:** `nerm_d03_water_take<N>.wav`

---

### Beat 5 — Moon Citadel (D-05)

> the moon. it watches. learn to live with it.

**Runtime target:** ~5s
**Delivery notes:**
- "the moon." — pause ~0.4s after, as if Nerm is pointing.
- "it watches." — flat, no spookiness. The moon being a watcher is fact, not horror.
- "learn to live with it." — imperative-calm. Same register as the Nethara "learn the difference" close (intentional echo). Do NOT scold.

**File:** `nerm_d05_moon_take<N>.wav`

---

### Beat 6 — Outro

> that's the place. it's not for everyone. that's also the point.

**Runtime target:** ~6s
**Delivery notes:**
- "that's the place." — closing the tour. Slight resignation, like the tour's over and Nerm wants you to leave.
- Pause ~0.4s.
- "it's not for everyone." — flat statement of fact.
- Pause ~0.4s.
- "that's also the point." — landing. Slight drier than the line before. Nerm is not selling Nethara; he's confirming it's not for sale.

**File:** `nerm_outro_take<N>.wav`

---

### Beat 7 — Sign-off reprise (optional, can be cut if pacing tight)

> tour over.

**Runtime target:** ~1.5s
**Delivery notes:**
- Two words. Flat. Reads like Nerm closing a tab.
- This goes over the title-nethara.png sign-off frame — if the cut runs over 60s, this is the first thing trimmed.

**File:** `nerm_signoff_take<N>.wav`

---

## Per-line QC

After generation, gut check per take:

| Take | Pass if... | Fail if... |
|---|---|---|
| Intro | "fine." is a sigh | Voice sounds polite or theatrical |
| Beat 1 | Second "fine" reads as shrug, not echo | Voice repeats "fine" with same intonation |
| Beat 2 | "don't ask what" is dismissive, not threatening | Voice punches "what" |
| Beat 3 | "paperwork" lands flat | Voice emphasizes "paperwork" — kills the joke |
| Beat 4 | Second "on time" matches first | Voice changes register on second clause |
| Beat 5 | "learn to live with it" is calm-imperative | Voice scolds |
| Outro | "that's also the point" lands drier than "it's not for everyone" | Voice escalates emotionally |
| Sign-off | Two words, flat | Voice editorializes ("tour... over...") |

If any fail, regenerate with same voice ID — not a new voice.

## Canon-compliance grep

```bash
grep -En '!' audit/trailer/dispatches/nerm_vo_script.md     # zero hits in line content
```

The grep should report zero hits inside the `> line` blocks. Hits in headers / instruction copy are fine.

## Total runtime accounting

| Beat | Target VO time |
|---|---|
| Intro | 3s |
| D-01 wall | 6s |
| D-04 skycastle | 5s |
| D-02 rift | 5s |
| D-03 water | 4s |
| D-05 moon | 5s |
| Outro | 6s |
| Sign-off | 1.5s |
| **Total VO** | **~35.5s** |

VO time + clip-only (no-VO) opening/closing buffers = ~50–55s total piece runtime.

## Future Nerm content

Every future Nerm video pulls voice settings from this file. New scripts go in new files (e.g. `nerm_<short_name>_vo.md`) — do NOT overwrite this script.

If the locked voice settings change, all subsequent Nerm content must regenerate with the new settings, OR explicitly note the settings used at the top of the new script. Voice consistency across Nerm appearances is non-negotiable.
