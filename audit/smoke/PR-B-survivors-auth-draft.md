# PR-B — Survivors Mode auth-gated start + 9-house picker + 2-card draft

**URL:** _(filled in after PR creation)_
**Merged:** _(fill in)_
**Surfaces:** `/survivors.html` start flow (auth → 9 houses → draft → begin), `GET /api/survivors/start`, `POST /api/survivors/runs` validator (`drafted_card_ids` required + ownership check)

## What changed

PR-B is the first user-visible PR of the Survivors Mode rebuild.

- **9-house picker** (canonical `.house-btn` style, matches `register.html`) replaces the v1 4-house gate. Server allowlist + frontend list + canonical color/sigil/stats per house.
- **2-card draft** uses the canonical `buildCardV4()` renderer from `/js/card-v4.js` — same card frames as packs / dashboard / nethara-live, no parallel design.
- **`GET /api/survivors/start`** new endpoint returns the 9-house catalogue + the player's collection + a `canPlay` / `blockReason` gate.
- **Entry precondition** — players with fewer than 2 cards see an "open your starter packs" CTA linking to `/packs.html` instead of the start screen.
- **`drafted_card_ids` required** on `POST /api/survivors/runs`. Validator enforces array length 2 + positive ints; route enforces ownership against `player_cards`. 18 new Jest tests; suite is 8/8, **172 tests** (was 157).
- **No game logic changes** — the in-game run still uses the house's placeholder starting weapon. PR-C wires drafted cards in as actual run weapons.

## Smoke checklist (≤6)

PR-B has user-visible UI changes. **Wray drives most of these in-game; Claude handles the API checks at the bottom.**

### Wray's checks (in-browser, on Replit-published `9lv.net`)

- [ ] **Replit pulled + PUBLISHED.** Live `9lv.net` runs PR-B.
- [ ] **Auth gate.** Open `9lv.net/survivors.html` in an incognito tab (no `player_id` in localStorage). Should see "Sign in to play" with a Sign In button. Sign in normally → returning to `survivors.html` shows the house picker.
- [ ] **House picker (9 houses).** All 9 houses render in a 3×3 grid: Smoulders, Darktide, Stonebark, Ashenvale, Stormrage, Nighthollow, Dawnbringer, Manastorm, Plaguemire. Each tile shows the house sigil, name in the canonical font, role line, and 5 stat bars (ATK / HP / SPD / DEF / LCK). Visual matches the register.html house picker.
- [ ] **2-card draft.** Pick any house → draft screen shows your collection rendered as canonical card frames (same look as `/packs.html` reveals). Pick 2 cards — "Begin Run" enables. Pick a 3rd while 2 are picked → unpicked cards visibly dim, can still click a picked one to deselect. "← Back to houses" returns to the picker.
- [ ] **Begin Run.** Click "Begin Run" with 2 picked → start screen hides, the canvas + HUD load, run starts as in v1.
- [ ] **No-collection account.** If you have a test account with 0 cards (or want to verify): the start screen should show the "Open Your Packs" CTA blocking the picker. Linking to `/packs.html` works.

### Claude's checks (post-deploy, run automatically)

- [ ] `GET /api/survivors/start?player_id=44` returns `houses[9]` + `cards[]` + `canPlay`.
- [ ] `POST /api/survivors/runs` without `drafted_card_ids` → 400 `drafted_card_ids required`.
- [ ] `POST /api/survivors/runs` with foreign `drafted_card_ids` (cards belonging to another player) → 403.
- [ ] `POST /api/survivors/runs` with valid 2-card draft → 200, row inserted with `cards_used` populated.

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
