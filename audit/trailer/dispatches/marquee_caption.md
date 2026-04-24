# Marquee Caption — Nethara Reveal

Post copy for the **single marquee drop** of the Nethara Reveal piece. Different from `captions.md` (which is the 5-rotation library for individual dispatches) — this file is a one-drop spec because the Reveal is one piece, not a series.

Read `/audit/trailer/launch/README.md` and `nerm_voice_canon.md` before posting. Hard editorial rules apply: no emoji, no exclamation marks, no pump language, hashtag restraint, primary handle `@9LVNetwork`.

## Voice mode

All copy below is `[account]` voice — `@9LVNetwork` posting in Nerm-adjacent register, NOT Nerm-direct (the Reveal already has Nerm narrating; the post copy doesn't double up). Account-voice rules:

- Lowercase as default
- No exclamation marks
- Slightly more informational than Nerm — the post can describe what the video is, where Nerm-direct never would
- Never marketing-speak
- Never sells the token, the game, or the network

If a viewer DMs / replies and the response goes back as Nerm-direct (different account), that's `@9LV_Nerm` and uses Nerm's full voice — but the marquee drop itself is account-voice.

## Twitter (primary drop)

### Recommended copy

> nerm gives you the tour. that's the place. that's the point.
>
> #ninelivesnetwork

**Why:** Short. Doesn't oversell. Names Nerm so anyone who knows him knows what to expect; doesn't explain him for those who don't. "that's the place. that's the point." mirrors the Reveal's outro line — viewer who watches gets the callback. No `@9LVNetwork` self-mention because the post is FROM @9LVNetwork. One owned hashtag.

### Alternates (rotate if reposting in second week)

**Alternate A** — even more restrained
> the world. nerm walking. that's the format.

**Alternate B** — slightly more informational
> nethara. fifty-five seconds. nerm narrates. you do not need to like it.

**Alternate C** — minimal
> the place. nerm. nothing else.

### Drop instructions

- **Pin to @9LVNetwork profile immediately** after posting. Leave pinned for ≥1 week (longer if engagement justifies it).
- **No reply guy energy** in the comments. Account-voice replies should be sparse and Nerm-adjacent. Do NOT thank people for engagement, do NOT explain the video, do NOT "love that you noticed X."
- **If a viewer asks what house they should join / how to play / when token launches** — account-voice deflect: "more soon." Do not commit to dates or details in the marquee window.
- **Do NOT post a follow-up tweet within 4 hours** of the drop. Let the marquee breathe.

## YouTube description

```
nethara. fifty-five seconds. nerm narrates.

a place. five environments. one tour.

@9LVNetwork
@9LV_Nerm

music: [credit your source — Artlist / Soundstripe / Epidemic Sound license]
voice: [credit ElevenLabs voice ID if your TTS terms require it]
```

**Notes:**
- Title slot (NOT in description body): `Nethara — a tour. nerm walking.`
- Tags (the underused YouTube tag system): `nethara`, `nine lives network`, `nerm`, `9lv`, `cinematic short`, `world reveal`. Do NOT include generic `crypto`, `gaming`, `web3` tags.
- Thumbnail: pull a frame from D-05 moon citadel — the moon backlit composition is the most arresting still in the piece. Add minimal text: "nethara." in the same lowercase Nerm-canon style. NO splash text, NO arrows, NO faces (Nerm doesn't appear visually; thumbnail shouldn't promise what the video doesn't deliver).

## TikTok caption

```
nethara. nerm walking. that's the format.

#ninelivesnetwork #nethara #fyp
```

**TikTok-specific:**
- `#fyp` is the platform-algorithm concession; included sparingly here only because TikTok's discovery model rewards it
- Don't use `#crypto`, `#gaming`, `#trending` — they water down the brand and pull wrong-audience traffic
- Hook frame for TikTok: the title card (1.0s opener) needs to read instantly — confirm the typeface is large enough on a 6" phone screen before publishing

## IG Reels caption

```
nethara. nerm walking. that's the format.

a place. five environments. one tour.

@9LVNetwork
#ninelivesnetwork #nethara
```

**Reels-specific:**
- Caption length 125–300 chars — the slightly-longer version above is appropriate
- Reels viewers swipe slowly; first-frame hook matters less than TikTok but still important
- IG hashtag rules same as Twitter — owned only

## YouTube Shorts caption

YouTube Shorts uses the title field, not a separate caption. Use:

```
Nethara — nerm walking. fifty-five seconds.
```

Capitalized "Nethara" is acceptable in the title field as a proper-noun affordance for YouTube discovery — outside the title field, lowercase rules still apply.

## What every caption avoids

- **No "introducing"** / "presenting" / "announcing" — sells too hard
- **No "first look"** — even though it IS a first look. Saying so makes it feel like marketing.
- **No "stay tuned"** / "more coming" — the Reveal stands alone
- **No "join us"** / "early access" / "whitelist" — wrong moment for CTAs
- **No emoji** of any kind
- **No exclamation marks**
- **No pump language** (`#`crypto, `#`web3, "moon", "wagmi", "lfg", "early ape")

## Copy QC before posting

```bash
grep -En '!' audit/trailer/dispatches/marquee_caption.md            # zero hits in copy blocks
grep -EinH 'moon.{0,3}shot|wagmi|gm gm|lfg|ape |degen|pump' audit/trailer/dispatches/marquee_caption.md  # zero
grep -EinH 'introducing|first look|join us|early access|stay tuned' audit/trailer/dispatches/marquee_caption.md  # zero
```

If any hit appears in actual copy (not in this guidance text), rewrite. Hits in instructional text describing what to avoid are fine.

## After the drop — engagement window

- **Hours 0–6:** Watch the post. Respond to ONLY direct questions about the piece (e.g. "what did Nerm say?"). Do NOT respond to "WAGMI" / pump comments. Do NOT respond to bot replies.
- **Hours 6–24:** First engagement bucket lands. Note metrics: views, retweets, quote-retweets, watch-through rate (if available). These are the proof points for whether the marquee strategy worked.
- **Hours 24–48:** If engagement is ≥10x baseline, hold position — the Reveal is doing its job. If engagement is flat, the diagnostic kicks in (voice / music / hook — see `nerm_world_tour.md` verification section).
- **Day 7:** Decide whether to keep pinned. If still pulling new viewers (replies, retweets), pin stays. If feed has moved on, unpin and clear for the next drop.

## What comes after the Reveal lands

If the Reveal succeeds:
- Wave 0.1 supplementary recuts using the original individual production sheets at `d01_*.md` through `d05_*.md` become viable as supporting drops over weeks 2–4
- Position those recuts as deliberate slow-burn after the marquee — "more from the same world" not "here's another short"
- The Nethara voice (institutional) gets used for those recuts since the Reveal owns Nerm voice; this gives the world TWO voices over time which deepens the IP

If the Reveal underperforms:
- Do not immediately repost or recut. Wait the 24–48h diagnostic window.
- Document what missed in the project memory; revise the canon doc accordingly before next attempt.
- Wave 0.1 stays shelved until the marquee strategy is fixed.

## Cross-refs

- Production sheet: `nerm_world_tour.md` (this directory)
- Voice canon: `nerm_voice_canon.md` (this directory)
- VO script: `nerm_vo_script.md` (this directory)
- Original Wave 0 dispatches (now supplementary): `d01_*.md` through `d05_*.md` (this directory)
- Editorial rules: `/audit/trailer/launch/README.md` (untracked from prior sessions; rules apply regardless)
- Nerm voice source: `server/services/nermBrain.js`
