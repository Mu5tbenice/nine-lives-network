# PR-C1 — Survivors weapon-spec backend (seed + GET + admin POST)

**URL:** _(filled in after PR creation)_
**Merged:** _(fill in)_
**Surfaces:** `survivors_weapon_specs` rows (5 bespoke + 1 sentinel), `GET /api/survivors/specs`, `POST /api/admin/survivors/specs`

## What changed

PR-C1 is the backend slice of the larger PR-C scope. PR-C2 (weapons.js client runtime) and PR-C3 (level-up modal + crystal economy) consume what PR-C1 lays down. **No user-visible change** in PR-C1 — the live game looks identical pre- and post-deploy.

- `scripts/seed-survivors-weapon-specs.js` — seeds 5 bespoke specs onto the sentinel row from migration 011:

  | spell_id | name           | behavior   | feel                                      |
  |---|---|---|---|
  | 1   | Mana Bolt      | continuous | classic projectile auto-fire              |
  | 19  | Eruption       | continuous | stationary BURN DOT-zone (stays where dropped) |
  | 14  | Cinder Guard   | continuous | radial THORNS aura (no projectile)        |
  | 30  | Verdant Mend   | activated  | self-target heal pulse (Q/E)              |
  | 6   | Hex Bolt       | activated  | CC burst — travels to nearest cluster, applies HEX |

  Numerics are starter knobs only — sim-tunable later via the admin upsert.

- `GET /api/survivors/specs` — returns all spec rows joined with the spell's name + image_url + house. Cached in-process for 60s; admin upserts flush the cache.

- `POST /api/admin/survivors/specs` (requires `x-admin-key`) — pure-function validator (`server/routes/survivorsSpecValidator.js`) enforces `behavior_class IN ('continuous','activated')`, numeric ranges, and a 5-key `rarity_scaling` shape before the upsert.

- 18 new Jest tests; suite total 9/9 green, **181 tests** (was 172).

## Smoke checklist (≤6)

PR-C1 is backend-only. **Wray verifies the deploy didn't break boot; Claude verifies the new endpoints.**

### Wray's checks

- [ ] **Replit pulled + PUBLISHED.** Live `9lv.net` runs PR-C1.
- [ ] **No boot crash.** Replit "Logs" tab shows the server started without red errors mentioning `survivors`, `admin`, or spec-related modules.
- [ ] **Game still loads + survivors page still works.** `9lv.net/survivors.html` continues to show the auth gate / 9-house picker / 2-card draft from PR-B without regression.

### Claude's checks (post-deploy)

- [ ] `GET /api/survivors/specs` returns 6 rows (sentinel + 5 bespoke); each row carries the joined spell name and house.
- [ ] Admin POST without `x-admin-key` → 401.
- [ ] Admin POST with `x-admin-key` and a tweaked `base_damage` updates the row, returns the updated values, and the next GET reflects the change immediately (cache invalidation works).

## Result

_(fill in)_

- Pass / Fail / Partial:
- Notes:
