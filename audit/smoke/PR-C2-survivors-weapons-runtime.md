# PR-C2 — Survivors weapons runtime + activated cooldown HUD

**URL:** _(filled in after PR creation)_
**Merged:** _(fill in)_
**Surfaces:** `/survivors.html` HUD, `/js/survivors/specs.js`, `/js/survivors/weapons.js`, `/js/survivors/main.js`, `/js/survivors/ui.js`, `/js/survivors/entities.js`

## What changed

PR-C2 is the second slice of the larger PR-C scope. **First user-visible runtime change** in the survivors rebuild — the cards you draft in PR-B's start screen now actually fire in combat.

- **Specs runtime** — new `public/js/survivors/specs.js` fetches `/api/survivors/specs` once per page life, caches it, and exposes a `lookupSpec(spell_id)` that falls back to the sentinel row for unmapped spells.
- **Spec → engine adapter** — `specToContinuousDef()` translates a server spec into a `WEAPON_DEFS`-shaped def the existing weapons engine can fire (mapping `behavior_class=continuous` to `projectile` / `aura` / `puddle` based on a heuristic over `projectile_speed` and `base_cooldown_ms`).
- **`grantWeaponFromCard()`** — drafted cards branch by behavior class. Continuous cards add to a new `player.specWeapons[]` (auto-fired by the engine). Activated cards bind to `player.activatedSlots` — first activated → Q, second → E.
- **Activated firing path** — `fireActivated(player, slot)` handles three shapes:
  - Negative `baseDamage` → self heal pulse (Verdant Mend).
  - `projectile_speed > 0` → travels to nearest enemy + AOE on impact (Hex Bolt).
  - Otherwise → radial AOE pulse around the player.
- **HUD** — new "Activated Casts" row below the weapons strip showing Q / E icons with a cooldown overlay that drains as the cooldown elapses. Hidden when the player has no activated cards drafted.
- **Soft fallback** — if the spec fetch fails or the player drafts only activated cards, the run still grants the house's legacy starting weapon so combat isn't soft-locked.

## What's intentionally NOT in this PR

- The level-up modal still grants legacy `WEAPON_DEFS` weapons via `cards.js`. PR-C3 rewrites that to use the player's collection + the spec runtime.
- Crystals, sneak-peek rolls, reroll/upgrade, build-full swap, duplicate rarity bumps — all PR-C3.
- The pause-state correctness sweep (no weapon-cooldown advance during the modal) — PR-C3.

## Smoke checklist (≤6)

PR-C2 has visible gameplay changes. **Wray drives the in-game smoke; Claude verifies post-deploy.**

### Wray's checks (live `9lv.net/survivors.html`)

- [ ] **Replit pulled + PUBLISHED.**
- [ ] **Drafted continuous card fires.** Pick Mana Bolt (spell_id=1) as one of your 2 cards → in-game, see projectiles auto-firing toward the nearest enemy. (Mana Bolt is `continuous projectile`, base_dmg=12, cd=850ms.)
- [ ] **Drafted activated card binds to Q.** Pick Verdant Mend (Stonebark heal) → in-game, see a "Q" cooldown ring near the bottom of the HUD with the card's art. Press Q when at low HP → HP bar jumps up, ring drains over 12 seconds and refills bottom-up. Pressing Q while on cooldown does nothing.
- [ ] **Two activated cards bind Q + E.** Pick Verdant Mend AND Hex Bolt → both rings appear (Q for the first picked, E for the second). Each fires on its own key.
- [ ] **Mixed draft works.** Pick 1 continuous + 1 activated → projectiles auto-fire AND the activated key works. The continuous-only fallback (house starter) is NOT granted.
- [ ] **No-spec-drafted fallback.** Pick 2 cards whose `spell_id`s have no bespoke spec (e.g. anything not in {1, 6, 14, 19, 30}) → run still plays via the sentinel fallback (auto-fires a generic projectile at base_dmg=10 cd=1000ms).

### Claude's checks (post-deploy, smoke-time, run automatically)

- [ ] No browser console errors during a run start.
- [ ] `GET /api/survivors/specs` still returns 6 rows (cache propagation didn't break).

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
