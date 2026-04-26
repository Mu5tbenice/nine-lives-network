# PR #277 — heal/buff log target fix

**URL:** https://github.com/Mu5tbenice/nine-lives-network/pull/277
**Merged:** 2026-04-26
**Surfaces:** `/nethara-live.html` combat log + windup telegraph

## What changed

Effect-recipient classifier (OFFENSIVE / ALLY_PICK / ALLY_AOE / SELF) routes the broadcast target correctly. HEAL narrates the actual ally, WARD/BARRIER/SURGE narrate as self-cast, BLESS/INSPIRE narrate as AOE on allies, offensive casts unchanged.

## Smoke checklist

- [ ] HEAL casts call out an **ally** name in the log, not an enemy (look for "casts Heart Bloom on Boomer" not "...on Velvet")
- [ ] WARD / BARRIER / SURGE / FEAST casts read as "X channels Y" with no target name
- [ ] BLESS / INSPIRE casts read as "X channels Y over allies"
- [ ] Offensive casts (BURN / POISON / HEX / CHAIN / etc.) still narrate enemy targets
- [ ] No console errors during a full round
- [ ] Windup telegraph still appears above each fighter's HP bar (no PR-2 regression)

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
