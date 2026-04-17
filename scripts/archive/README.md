# scripts/archive/

Historical one-off migration scripts. Already executed against production. Kept for reference. Do not re-run without verifying current state first.

## Contents

- `fix-card-refs.py` — stripped phantom script/CSS references (card-builder-v4.js, card-particles.js, card-globals.js, card-v4-patch.css) from 8 public/*.html pages and deduped repeated script tags.
- `fix-narrative-points.js` — patched `server/services/narrativeEngine.js` to delegate `awardPoints` to the central `pointsService` instead of using a broken direct Supabase path.
- `nuke-old-cards.py` — "Nuke old card system v2": removed the old playing-card CSS block from `components-v2.css`, added `card-particles.js`/`card-v4.js` includes, and injected a V4 override block on 7 public/*.html pages so `buildCard` resolves to `buildCardV4`.
- `patch-game-modes-v4.py` — converted inline card-slot HTML in duels.html, gauntlet.html, boss.html to use the shared `buildCardSlot()` helper and added `card-slot-v4.css` + `card-slot-helper.js` includes.
- `patch-packs.sh` — restyled `public/packs.html`: added `nav-v2.css` / `nav.js`, swapped emoji pack icons for `booster-pack.png`, enlarged pack cards, adjusted header padding.
