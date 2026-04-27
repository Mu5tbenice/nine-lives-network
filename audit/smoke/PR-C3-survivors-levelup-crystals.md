# PR-C3 — Survivors level-up modal + crystal economy + build management

**URL:** _(filled in after PR creation)_
**Merged:** _(fill in)_
**Surfaces:** survivors.html (HUD crystal pill + level-up modal CSS), ui.js (canonical-card level-up modal + 3 modes), main.js (presentLevelUp wiring + crystal pickup), cards.js (collection-driven offers), specs.js (rarity bump + recompute helpers), entities.js (player.crystals)

## What changed

PR-C3 is the final slice of PR-C scope. **Level-up now feels meaningful** — every level presents 3 canonical card-v4 offers from your collection, you spend in-run crystals to reroll or upgrade, the build caps at 6 with a swap UI, and duplicates bump rarity (with at-cap legendary paying back crystals).

- **Level-up modal rewrite (ui.js)** — three modes inside `#sv-modal`:
  - **OFFER** — 3 random offers from the player's collection rendered with the canonical `buildCardV4` frames, plus a passive offer (legacy mechanic) when needed; Reroll / Upgrade Build / Skip buttons.
  - **UPGRADE** — secondary picker showing the player's current build cards; pick one to bump its rarity (C→U→R→E→L).
  - **SWAP** — when the build is full and the player accepts a NEW card, force-pick which existing build card to discard.
- **Collection-driven offers (cards.js)** — `buildOffers(player, collection)` samples from the cards the player owns instead of `WEAPON_DEFS`. Passive offers from `PASSIVE_DEFS` still appear alongside as fillers.
- **Crystal economy (main.js + entities.js + survivors.html)** — every kill drops 1 crystal pickup; boss kills drop a 5×4 = 20-crystal pile. New `◆ N` HUD pill in the top bar shows the running total.
- **Reroll** — first reroll within a level-up costs 25 crystals; doubles per use (25 → 50 → 100 → …); resets each level-up.
- **Upgrade** — flat 50 crystals per rarity bump; closes the modal after applying.
- **Duplicate handling** — picking a card already in the build bumps its in-run rarity in place (recomputes damage via `rarityMultiplier`); at-cap legendaries award a fixed 200-crystal payout instead.
- **Build cap = 6** — when build is full and a NEW card offer is picked, the SWAP picker forces a discard; activated keys (Q / E) re-bind based on remaining order after a swap.
- **Pause-state correctness** — `update(dt)` is gated by `phase === "PLAY"`, so weapon cooldowns + activated cooldowns + spawner all freeze while the modal is open.

## Smoke checklist (≤6)

PR-C3 is heavy in-game UI. **Wray drives the in-game smoke; this PR pairs with PR-D's smoke for a single combined session.**

### Wray's checks

- [ ] **Level-up shows 3 canonical card frames.** Pick a draft, level once → modal opens with 3 offers using the same card visuals as `/packs.html` (foil, rarity colors, stats, sigil).
- [ ] **Crystals drop and tally.** Top HUD shows `◆ N`; killing enemies bumps it; the modal shows the same total.
- [ ] **Reroll spends crystals + escalates.** Crystals go down by 25 first reroll, 50 second, 100 third. Reroll button disables when crystals < cost.
- [ ] **Duplicate bumps rarity.** Pick a card that's already in your build → no new build slot, but the in-run rarity ticks up (visible damage increase on continuous; tooltip change on activated). Pick a legendary duplicate → crystals jump by 200 instead.
- [ ] **Build full → swap modal.** Once you have 6 build slots filled, accepting a new card opens the discard picker; pick one → it's removed and replaced.
- [ ] **Modal pauses combat.** Enemies stop moving and weapons stop firing while the modal is open; resumes when you pick / skip / close.

### Claude's checks (post-deploy)

- [ ] No browser console errors during a run.
- [ ] `npm test` 9/9 suites green (no server-side change in this PR).

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
