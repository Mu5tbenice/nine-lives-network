# PR #283 — PR-E: PR-A/PR-C smoke bug fixes

**URL:** https://github.com/Mu5tbenice/nine-lives-network/pull/283
**Merged:** 2026-04-26
**Surfaces:** `/nethara-live.html` combat log + HUD card slots

## What changed

Two narrow fixes from the PR-A / PR-C smoke pass:

1. **Auto-attack log tag for non-OFFENSIVE cards.** Server now tags `combat:attack` payload with `recipient` (OFFENSIVE / SELF / ALLY_PICK / ALLY_AOE). Client suppresses card name + effect tag in the log when slot card is non-OFFENSIVE. Fixes "Goosebumps Regrowth → Velvet -28 [HEAL]" reading like the heal hit the enemy.
2. **Multi-slot windup glow on player HUD.** `combat:effect` now carries `slot`. Client clears `.slot-windup` on cast resolution (was only cleared on `combat:attack`, which runs on a different timer). Belt-and-braces clears ALL 3 slots on every local-player cast resolution.

## Smoke checklist

- [ ] Deploy with a mixed loadout (1 OFFENSIVE + 1 HEAL + 1 SELF e.g. WARD/SURGE)
- [ ] Auto-attack log line for the HEAL slot reads "X → Y -dmg" — **no card name, no [HEAL] tag**
- [ ] Auto-attack log line for the WARD/SURGE slot reads "X → Y -dmg" — **no card name, no [WARD] tag**
- [ ] Auto-attack log line for the OFFENSIVE slot still reads "X CardName → Y -dmg [BURN]" (unchanged)
- [ ] Watch your own HUD across a full round — only ONE card slot pulses gold at a time during windup; no stuck-glow on previous slots
- [ ] No regression to PR-A/B/C/D: cast log narration still reads correctly, intermission still freezes, slot pulse still fires on windup, Plaguemire deploy still works

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
