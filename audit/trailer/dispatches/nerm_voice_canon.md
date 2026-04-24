# Voice Canon — Nerm

The voice that fronts the **Nethara Reveal** marquee piece. This is the first time Nerm gets a voice; once locked, this voice IS Nerm's voice for every future video, short, and dispatch.

Treat this casting decision as load-bearing. The voice locks here, and every piece of Nerm video content that follows uses the same ElevenLabs voice ID + the same settings. Voice drift is the only failure mode that compounds across episodes.

(Companion file: `voice_canon.md` defines the Nethara institutional voice — used for atmospheric drips, NOT for Nerm-led pieces. The two voices are distinct and should never be conflated.)

## Source canon

Nerm's voice rules come from `server/services/nermBrain.js` and the `project_nerm.md` memory. Summarized:

| Attribute | Setting |
|---|---|
| Case | Lowercase always |
| Punctuation | Periods + commas only. No `!`. No `?` except literal questions (rare). |
| Sentence length | Short. 2–8 words per clause is the pocket. Sometimes one word ("fine."). |
| Anchors | Ricky Gervais, Bill Hyde, Larry Mullen — dry, weary, takes jabs without trying |
| Stance | "Mean from not caring, not from trying to hurt" |
| Mood | Unbothered. Nothing is the first thing of its kind. He's seen it. |
| Affect | Slight world-weariness. Slight gravel. Centuries-old radio DJ. |

The voice does NOT moralize, sell, hype, perform, or flex. It observes with light contempt and occasional affection.

## How Nerm differs from the Nethara voice

| Nethara | Nerm |
|---|---|
| Institutional, world-as-subject | Character, Nerm-as-subject |
| Strips personality markers | Has personality markers (jabs, sighs, mid-line "fine") |
| Ledger-clerk register | Late-night radio register |
| Refuses to address viewer | Will address viewer ("you wanted to see the place") |
| Refuses jokes | Jokes by accident — observational humor with no setup |
| Stability **80** | Stability **65–75** (more variance fits Nerm) |
| Style exaggeration **0** | Style exaggeration **~0.15** (Nerm has presence; pure flatness would read as Nethara, not him) |
| Speaking rate **0.9x** (slow) | Speaking rate **0.95x** (slightly slow, but more conversational) |

**One-sentence test:** if the line sounds like a public works notice, it's Nethara. If it sounds like Nerm muttering at someone who walked into the wrong office, it's Nerm.

## Acceptable vs. unacceptable

**Acceptable** (Nerm voice):
- "fine. you wanted to see the place."
- "this is the wall. it has been here longer than i have."
- "do not get close. people who get close make my paperwork harder."
- "the moon. it watches. learn to live with it."

**Unacceptable** (off-canon — sells too hard, performs too much):
- "behold the wall." ← grandiose; Nerm doesn't behold anything
- "isn't it incredible?" ← sells, uses `?` and emotional hook
- "welcome to nethara!" ← exclamation, performative, marketing-speak
- "i've waited centuries to show you this." ← self-important; Nerm wouldn't earn the line
- "Buckle up." ← idiomatic-pushy; Nerm doesn't push

## ElevenLabs casting shortlist

Audition all three voices on the **intro line** for the Reveal piece:

> fine. you wanted to see the place.

| Voice | Tendency | Test for |
|---|---|---|
| **Charlie** | Gravelly, mid-range | Does "fine." land as a sigh? |
| **Daniel** | Warmer, slightly weary | Does the warmth get in the way? Nerm shouldn't feel friendly. |
| **Adam** | Neutral mid-range, some grit | Does the grit add character without becoming a put-on? |

**Lock criterion:** the voice where "fine." reads as a tired sigh, not a polite acknowledgment, not an enthusiastic affirmation. If none of the three pass, audition a fourth — but document why the first three failed (the canon doc may need tightening before more credits burn).

If you have to audition more than 5 voices, the brief is wrong and we revisit this doc.

## Locked TTS settings (use these for every Nerm line, every piece)

| Setting | Value | Rationale |
|---|---|---|
| Voice timbre | Mid-range male, slightly gravelly | Matches the canon. Avoid overly polished or theatrical voices. |
| Stability | **70** | Lower than Nethara's 80 — Nerm has more natural variance. Too high and the voice becomes monotone; too low and it gets unstable. |
| Similarity / clarity | **80** | Clean diction. Nerm's lines aren't shouted but they're crisp. |
| Style exaggeration | **0.15** | Slightly above zero — Nerm has presence. Nethara's 0 is too flat for him. |
| Speaking rate | **0.95x** | Slightly slow but conversational. Nethara's 0.9x reads too institutional for Nerm. |
| Pitch | Default | No manual pitch shift — locks the natural timbre. |

Tune these once during D-01 line audition. Do NOT tune per-line during generation. Voice consistency is the feature.

## Naming discipline

- The voice IS Nerm's voice. Once locked, it doesn't get renamed, repurposed, or reassigned.
- If a viewer asks "is that Nerm's voice?" — yes. Account-voice reply: "yes."
- Do not create alternate Nerm voices for different contexts. There's one Nerm.

## Line-writing rules (for whoever drafts new Nerm copy in future)

1. **Lead with the subject when possible.** "the wall." / "the rift." / "you wanted." Subject-first reads as observation, not opinion.
2. **End on the unexpected word.** "do not get close. people who get close make my paperwork harder." — the line breaks toward bureaucracy at the close, not threat. That's Nerm.
3. **Use specifics over abstractions.** "rotten lettuce" beats "bad smells." "fourteen hundred years" beats "ages." Specifics make Nerm sound like he's been keeping score.
4. **Allow contradictions.** Nerm can say one thing and then a contradicting thing. "i was going to help. then i remembered who i am." Contradiction is in-character.
5. **Never explain the joke.** The line lands or doesn't. No "if you know what i mean," no "see what i did there."

## What to avoid entirely

- **Exclamation marks.** Hard ban, every Nerm line.
- **"Welcome to..."** Anything that sells. Nerm doesn't sell.
- **"Don't worry,"** "I got you," "trust me," "you'll love it." Reassurance is off-canon.
- **Pump language.** Same project guardrail as everywhere else — no moon (the celestial body is fine), no wagmi, no lfg, no fast-gain promises.
- **Long monologues.** Max 2 sentences per beat. Nerm doesn't lecture. Three sentences max if rhythm earns it.
- **Setting up the next beat.** Each line stands. Nerm doesn't transition for you ("now let's look at..."). Hard cuts handle transitions.

## Session workflow (for Nerm VO generation)

1. Open `nerm_vo_script.md` with all 8 Nerm lines.
2. Pick voice ID from audition shortlist. Generate the intro line first ("fine. you wanted to see the place.") — if "fine." lands as a sigh, the voice is the voice.
3. Generate all 8 lines back-to-back, same session, same settings.
4. Save TTS outputs to `audit/trailer/dispatches/nerm_vo_takes/` (create the directory). Naming: `nerm_<beat>_take<N>.wav`.
5. Log the locked voice ID + settings in the placeholder block at the top of `nerm_vo_script.md`.
6. Do NOT delete failed takes during the session — review later in CapCut, pick the best take per line.

## After the Reveal ships

Every future Nerm video / short / dispatch generates VO in this same locked voice with the same settings. The voice ID becomes part of project canon — log it in:
- Top of `nerm_vo_script.md`
- The `project_nerm.md` memory entry (so future sessions know which ElevenLabs voice IS Nerm)

## Canon-compliance grep

Before Nerm VO generation begins:

```bash
grep -En '!' audit/trailer/dispatches/nerm_vo_script.md     # zero hits in content
grep -En '\?' audit/trailer/dispatches/nerm_vo_script.md    # near-zero (only literal questions)
```

If any hit in line content (not headers / comments), rewrite. Headers and instruction copy can break the rules freely.
