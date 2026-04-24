# Voice Canon — "Nethara Voice"

The narrator of the Dispatches track. Not Nerm. Not a named character. Reads as the world's own voice — ledger clerk reading the weather, archivist annotating a map, dispatch officer logging the shift.

Lock this voice once at TTS-generation time. Cast once, reuse across all 5 Wave 0 dispatches and every future dispatch. Drift breaks the track.

## Register

| Attribute | Setting |
|---|---|
| Case | Lowercase always |
| Punctuation | Periods and commas only. No `!`. No `?` except if the line is a literal question (rare). No em-dash (reads too literary for this voice). |
| Sentence length | Short. 2–8 words per clause is the sweet spot. |
| Emotional affect | Flat, observational, mildly weary. Not monotone — there's a pulse, just a low one. |
| Mood | Somewhere between a 2am radio DJ and a night-shift librarian. Not dead, not trying. |
| Register | Observational. The voice reports. It does not opine, judge, warn directly, or editorialize — it lets the facts sit. |

## How it differs from Nerm

| Nerm | Nethara voice |
|---|---|
| Specific character — denied respawn, anchors Gervais/Hyde/Mullen | Unnamed, institutional, anyone and no one |
| Takes jabs at the viewer ("keep up") | Doesn't acknowledge the viewer |
| Explains his own personality ("i am the only one who doesn't come back") | Never refers to itself |
| Lowercase Nerm-canon | Lowercase, same canon — but also strips personality markers |
| Has a history with specific Nines ("my guy") | References Nethara as a place, not people it knows |
| Mean from not caring | Neutral from being far away |

One-sentence test: if the line sounds like something Nerm would tweet, it's wrong for this voice. If it sounds like something printed on a public works notice, it's right.

## Acceptable vs. unacceptable phrasings

**Acceptable** (Nethara voice):
- "the wall does not fall."
- "the tide runs on a schedule."
- "learn the difference."
- "this is recorded. this is all."

**Unacceptable** (Nerm leaking through):
- "the wall does not fall. obviously." ← "obviously" is a Nerm tic
- "tide's on a schedule. figure it out." ← "figure it out" is a Nerm jab
- "learn it or don't. up to you." ← viewer-direct, Nerm-style
- "i've been watching the wall for years." ← first-person, Nerm-style

## AI TTS settings (ElevenLabs recipe — starting point)

These are baseline recommendations. Adjust one at a time and lock the final set on first dispatch.

| Setting | Value | Why |
|---|---|---|
| Voice timbre | Mid-range male or neutral-androgynous | Avoids leaning on Nerm's specific age/gender. Female voices read as "oracle" which over-colors; stick mid-range. |
| Stability | 75–85 | High stability — no wavering, no expressive peaks. |
| Similarity / clarity | 80 | Clean diction; this voice wins on clarity, not character. |
| Style exaggeration | 0 (off) | Do not let the engine add affect. Flat is the feature. |
| Speaking rate | 0.9x | Slightly slow. Gives periods room. |
| Pitch | Default | No manual pitch shift — locks the natural timbre. |

Recommended ElevenLabs voice IDs to audition (pick one, stick with it):
- **Charlie** — mid-range, slightly gravelly, works for night-dispatch register
- **Daniel** — warmer, better for atmospheric beats like D-03 tidal / D-04 skycastle
- **Antoni** — more neutral, works for D-01 umbral wall / D-05 moon citadel

Audition all three with D-01's line ("the wall does not fall. the wall does not blink. the wall does not ask you to understand.") before locking. The winner is whichever one **doesn't add drama** to the third sentence.

## Naming discipline

- Do not name the narrator in copy, captions, or production notes. No nickname. No "The Archivist," no "The Observer." The voice is an effect, not a character.
- If a viewer asks who the voice is, the correct answer is "it's nethara." The Twitter account can reply in Nerm voice with something like "not me. don't ask again."

## Line-writing rules

1. **Lead with the subject.** "The wall" / "the tide" / "the rift." Puts Nethara's nouns first, the viewer's curiosity second.
2. **Use the present tense.** This voice is always reporting now, not recalling.
3. **Three-beat structure works.** "The wall does not fall. The wall does not blink. The wall does not ask you to understand." — anaphora with a final turn. Use sparingly (1 of 5 dispatches max, or it becomes a tic).
4. **Avoid metaphor that requires explanation.** "The tide runs on a schedule" lands cold. "The tide is a metronome measuring regret" is literary — wrong register.
5. **End on a grounded line, not a mystical one.** Close with something flat ("learn the difference") not open ("and so we wait"). The voice isn't wistful.

## What to avoid entirely

- **Exclamation marks.** Same rule as Nerm / account voice — hard ban.
- **"We" or "us."** No first-person plural. The voice is not in a community with the listener.
- **Rhetorical questions.** "Can you feel it?" — no. This voice does not interrogate the viewer.
- **Promotional pivots.** No "join the network" tails. The dispatch ends when the dispatch ends.
- **Timestamps or date-stamps.** "It is 3 a.m. in Nethara" — no. The voice is outside time.
- **Mythic-trailer register.** "In a land forgotten..." — no. That's the cinematic-narrator track we rejected.

## Session workflow (for the TTS generation pass)

1. Open `vo_script.md` with all 5 lines.
2. Pick one voice ID from the audition shortlist. Generate the D-01 line first (the hardest — three-beat anaphora). If it lands, the voice is the voice.
3. Generate all 5 lines back-to-back in the same session with the same settings. **Do not re-tune between lines** — consistency is the point.
4. Save TTS outputs to `audit/trailer/dispatches/vo_takes/` (create the directory when needed). Naming: `d<N>_<biome>_vo.wav`.
5. Keep the raw TTS settings dump in a comment at the top of `vo_script.md` — if the voice ever needs regenerating, we match settings.

## Canon-compliance grep

Before wrapping the VO generation session:

```bash
grep -En '!' audit/trailer/dispatches/vo_script.md            # zero hits in content
grep -En '\?' audit/trailer/dispatches/vo_script.md           # near-zero (only true questions)
grep -Ein 'i |i\.|we |us ' audit/trailer/dispatches/vo_script.md  # no first-person pronouns
```

If any of these fail, the line is wrong for this voice.

## Why this voice, not a third option

Rejected alternatives from the planning round:
- **Cinematic narrator** (deep mythic trailer voice) — breaks the IP register. Nine Lives Network is not a Tolkien pastiche.
- **In-world vox pops** (unnamed characters speaking) — richer but harder to cast consistently. Save for Wave 1+ dispatches once the institutional voice is locked.
- **No VO at all** (text + sound design) — viable but single-register. We want voice variety across the track so the feed isn't monotone against other post types.

The Nethara-voice approach is the lowest-friction path that still preserves IP tone and leaves Nerm's voice untouched for when he debuts.
