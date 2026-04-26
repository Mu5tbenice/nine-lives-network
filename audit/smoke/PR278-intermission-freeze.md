# PR #278 — intermission combat freeze

**URL:** https://github.com/Mu5tbenice/nine-lives-network/pull/278
**Merged:** 2026-04-26
**Surfaces:** `/nethara-live.html` round transitions + 35s intermission

## What changed

Combat for-loop, DOTs, movement, and KO check now pause during the 35s intermission. Position broadcasts continue (per §9.76 stall detector). Timers gated and re-set at round start so survivors don't insta-cast on resume.

## Smoke checklist

- [ ] Watch a round end and the 35s intermission. Combat log goes **silent** during the pause (no cast / windup / DOT entries)
- [ ] Fighter HP bars don't tick down from POISON / BURN during the intermission
- [ ] Fighters stay frozen — no walking / repositioning during intermission
- [ ] Round-end modal + countdown render normally
- [ ] Next round starts cleanly — survivors at full HP, no instant cluster cast on resume
- [ ] No full-page reconnect overlay (stall detector should NOT false-fire)

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
