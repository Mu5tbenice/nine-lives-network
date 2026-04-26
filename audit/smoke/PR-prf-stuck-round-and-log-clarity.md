# PR-F — stuck-round-after-KO + log clarity

**URL:** _(filled in after PR creation)_
**Merged:** 2026-04-26
**Surfaces:** `combatEngine.js` round-end logic; `/nethara-live.html` combat log

## What changed

Three fixes from the PR-E smoke notes 2026-04-26 evening:

1. **§9.108 — stuck round after mutual KO.** When everyone died on the same tick (1v1 mutual KO, AOE wipe), the old `alive.length > 0` guard skipped `endRound` and the round froze with all sprites visible at 0 HP. Extracted a pure `evaluateRoundEnd` helper that returns `'last_standing' | 'mutual_ko' | null`. New `mutual_ko` reason ends the round with no winner; intermission still fires normally.
2. **`[auto attack]` tag in combat log** — auto-attacks now read *"X → Y -dmg [auto attack]"* (or *"X CardName → Y -dmg [BURN] [auto attack]"* for offensive slots) so spectators can scan the log and tell auto-attacks apart from spell casts at a glance.
3. **DOT log entries** — every POISON/BURN tick now lands in the log as *"🩸 Velvet -3 [POISON]"* (was previously only floating text on your own Nine, invisible to spectators).

## Smoke checklist

- [ ] Trigger a 1v1 mutual KO (e.g. low HP both sides, simultaneous big hit). Round should end cleanly within ~1s — round-end modal appears, 35s intermission countdown, next round starts. Sprites should NOT remain stuck at 0 HP.
- [ ] Watch a round with mixed loadout. Auto-attack lines now read *"X → Y -dmg [auto attack]"* — easy to scan.
- [ ] Watch a fighter take POISON or BURN. New log lines like *"🩸 Velvet -3 [POISON]"* appear in the feed every 1.5s (POISON) / 1.0s (BURN).
- [ ] No regression to PR-E behavior: heal-slot auto-attacks still don't show *[HEAL]*; only one card slot pulses gold at a time.

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
