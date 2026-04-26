# PR #279 — player spell-bar windup pulse

**URL:** https://github.com/Mu5tbenice/nine-lives-network/pull/279
**Merged:** 2026-04-26
**Surfaces:** `/nethara-live.html` HUD card slots (desktop + mobile)

## What changed

The 3 HUD card slots now pulse gold during the 1.2s windup window of the player's own cast. Anticipation parity with the spectator charge bar above the sprite.

## Smoke checklist

- [ ] Deploy to a zone, watch a round as the player. The card slot that's about to fire **pulses gold for ~1.2s** before the cast resolves
- [ ] Pulse stops cleanly when the cast lands (handoff to the existing slot-active flash)
- [ ] Multiple slots cycle correctly across casts (slot 0 windup → fire → slot 1 windup → fire → slot 2 windup → fire)
- [ ] Mobile (≤640px viewport): pulse visible on the mobile card slots too
- [ ] No regression to PR-B intermission freeze (pulse stops cleanly between rounds)

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
