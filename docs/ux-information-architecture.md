# Information Architecture — Dashboard / Profile / Builder

> Discovery + recommendation for the player-management surfaces of 9LV.net. Companion to `/docs/ux-plan-mobile.md`. Written 2026-04-25 in response to Wray's "we need a public profile so people can be discovered and users can show off their achievements."

---

## Context

The site has three player-management pages — `dashboard.html`, `profile.html`, `builder.html` — with overlapping content and unclear roles. None of them are publicly shareable. There is no `/p/<handle>` route, no Open Graph or Twitter Card meta tags anywhere in `/public/`, and no achievement system backing the 6 hardcoded badges on the profile page.

The audience is a triangulation: **gamers, crypto-natives, and a character-focused player segment** (per Wray's framing — players drawn to cosmetics, character expression, and collection mechanics rather than competitive grind). Each audience has different reasons to come back and different reasons to *show it off*. The architecture has to serve all three without becoming three separate apps.

The unifying retention thread across all three audiences: **identity expression + visible progression + social proof**. They all want to see their character, see what they've done, and show it to others.

---

## What's broken right now

1. **Profile is private-only.** `profile.html` resolves player from `?player_id=<uuid>` or localStorage (`profile.html:94–99`). Nobody can share it. Nobody can be discovered. The 6 badges (`First Cast`, `5-Day Streak`, `Week Warrior`, `Territory Lord`, `Top 10`, `Genesis Cat`) are hardcoded in `renderProfile()` (`profile.html:155–161`) — only the first two have any real condition wired; the other four are permanently `earned: false`.
2. **No public-URL infrastructure.** Express serves `/api/*` and static files only (`server/index.js:30–63`). No `/p/<handle>`, no `/u/<handle>`, no `/@<handle>`. No way to attach per-player Open Graph tags — every page in `/public/` is static, zero `<meta property="og:*">` tags exist anywhere.
3. **`twitter_handle` is not unique** in the players schema (`database/schema.sql:511–533`). Routing by handle requires either a unique partial index or a dedicated `slug` column.
4. **Three pages overlap on player identity** — house, handle, guild tag appear on all three. XP bar is on both dashboard (small, top-right) and profile (prominent, "Nine Rank"). Both surface stats, but in different contexts (seasonal+today on dashboard; lifetime+achievements on profile).
5. **Discovery is broken.** No tap-through from leaderboard rows to player profiles. No tap-through from arena fighter rows. No tap-through from `@handle` anywhere. Players can see other players' stats only by guessing URLs with `?player_id=<uuid>`.
6. **Database aggregates are partial.** `players` has `lifetime_points`, `seasonal_points`, `duel_wins`, `duel_losses`, `duel_elo`, `streak`. Missing: card count, total zones deployed, total KOs, total survivals, codex completion %, best Gauntlet floor, best ELO. Aggregates must be computed from `zone_deployments` / `duels` / `player_items` joins on demand.
7. **Achievements table doesn't exist.** No `achievements`, `badges`, `unlocks`, or `player_achievements` table in schema. The 6 badges in profile.html are decorative.

---

## Audience snapshot

| Audience | Cares about | Profile flex |
|---|---|---|
| **Gamers** | progression, leaderboards, builds, win rate, "I beat the game" moments | ELO, codex %, win rate, hardest Gauntlet floor, deployment count |
| **Crypto-natives** | flex-by-rarity, screenshot-worthy moments, social proof, share-to-X | total points, legendary card count, top-N achievements, Genesis-era marker |
| **Character-focused** | character expression, customization, collection completionism, social presence | character sprite + outfit showcase, badges grid, daily Nerm greeting, guild |

**The unifying surface that serves all three: a public profile with a character-sprite hero.** The character art is what carries to every audience. Stats are the differentiator below the fold. Share-to-X is the acquisition lever.

---

## Recommendation: keep three pages, sharpen roles

**Two-file vs three-file fork.** I considered collapsing builder into a modal inside dashboard (two-file architecture). Recommending against. Reasons:
- Builder's depth (8 gear slots, layered character preview, animated equipment picker, stat-delta math) doesn't compress into a sheet without sacrificing the visual feedback that makes equipment matter.
- Builder serves *both* onboarding (4-step wizard with card reveals + pack opening + mode tutorial) AND ongoing edit. Folding the wizard into a modal would make the onboarding flow worse for the audience that needs it most.
- The mental model "where do I act today / who am I / edit my character" is cleaner as three pages than as two-with-a-sheet.

### Page roles (the contract)

| Surface | Role | Tense | Audience | URL |
|---|---|---|---|---|
| `dashboard.html` | Operational hub | "today" | self only | `/dashboard.html` |
| `profile.html` (public) | Show-off page | "all-time" | self + others | `/p/<handle>` (new) |
| `builder.html` | Character editor | "configure" | self only | `/builder.html` (existing) |

**Dashboard.** What's happening today. Streak status, daily pack, deployed Nines, daily quests, active zones, snapshot countdown. ONE primary CTA (deploy / claim pack / open Nethara — picks based on state). Hero card with character + level. EDIT button → builder.

**Profile (public).** Who you are. Character sprite as the hero. Handle, house, guild, level, lifetime points, streak record, ELO. Badges grid (real achievements once wired). Recent activity. Share-to-X button. PUBLIC URL — anyone can visit, no login required, rich link previews on social.

**Builder.** Configure your character. Two modes preserved (onboarding wizard + edit mode via `?skip_intro=1`). Item picker, layered preview, stat math. Save & back to dashboard.

### What changes per page

**Dashboard** — light pass:
- Trim the small XP bar duplication (profile owns the prominent XP display now); leave dashboard XP as a short status line, not a featured component.
- Promote daily pack to `.card--gold-pulse` when unclaimed (per `/design.md` section 4 + `/docs/ux-plan-mobile.md` recommendation).
- Make character art tappable → opens public profile (`/p/<own-handle>`).
- Add EDIT button parity for handle-based profile so "view my public page" is one tap from home.

**Profile** — heavy pass (this is the v1 work):
- Convert from `?player_id=<uuid>` resolution to `/p/<handle>` server-rendered route.
- Reorganize as character-sprite hero (using same layered-PNG technique from `builder.html`) + headline stats + audience-mapped flex sections + recent activity + share button.
- Surface the booster-pack PNG style + design-system tokens from `/design.md`.
- Wire the existing badge slots to real achievement conditions (separate PR — see sequence).

**Builder** — minor copy + flow polish:
- Trinket slot copy: change "Find trinkets in chests & drops" → "Trinket slots unlock as your Nine levels" (per `/docs/ux-plan-mobile.md` polish note; trinkets currently have no drop path).
- Save & Back affordance more prominent in edit mode.
- Onboarding wizard stays untouched.

---

## Public profile architecture

### URL strategy: `/p/<handle>`

- Short, scannable, share-friendly.
- Handle is human-readable. UUIDs are not.
- Handle is already the player's Twitter @ — recognition transfers.
- Case-insensitive: `/p/MyHandle` and `/p/myhandle` resolve to the same player.

Considered alternatives:
- `/@<handle>` — pretty but URL-encodes badly in some clients.
- `/profile/<handle>` — verbose; adds nothing over `/p/`.
- `/<handle>` — too greedy; collides with future top-level routes.

### Handle uniqueness

`twitter_handle` is unique on Twitter's side (Twitter enforces it), so the 99% case is already collision-free. Only edge cases:
- A player changes their Twitter handle after registering (we capture at registration time and don't sync).
- Two players register with different cases of "the same" handle (`@FooBar` vs `@foobar`).

**Recommendation:** add a unique partial index on `LOWER(twitter_handle)` where `is_active = true`. Migration ships in the foundations PR. Existing data validated before the migration runs (search for any duplicate-by-lower handles; resolve by suffixing with `_2`, `_3` if any exist).

### Server-side rendering for OG tags

Express currently serves only static + `/api/*`. To inject per-player OG tags without dragging in a templating engine, add one new route:

```js
// server/routes/publicProfile.js
app.get('/p/:handle', async (req, res) => {
  const player = await lookupByHandle(req.params.handle);
  if (!player) return res.status(404).sendFile('public/profile-404.html');
  const html = renderProfileHTML(player);  // reads template, injects OG meta + initial state
  res.send(html);
});
```

Template lives at `public/profile-public.template.html` with `{{handle}}`, `{{house}}`, `{{level}}`, `{{lifetime_points}}`, `{{og_image}}` placeholders. Server-rendered HTML includes:

```html
<meta property="og:title" content="{{handle}} — Level {{level}} {{house}} · 9LV">
<meta property="og:description" content="{{lifetime_points}} lifetime points · {{streak}}-day streak">
<meta property="og:image" content="https://9lv.net/og/{{handle}}.png">
<meta property="og:url" content="https://9lv.net/p/{{handle}}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@9LVNetwork">
```

The `og:image` URL points to a generated card image — **deferred to a later PR.** v1 ships with a static fallback image (the splash title PNG) so links preview decently without requiring the image-gen pipeline now. The dynamic per-player OG image is its own scoped piece of work.

### Discovery vectors (where the profile URL gets surfaced)

1. **Leaderboard rows** — tap a row → `/p/<handle>`. Requires UPDATE to `leaderboards.html` to wrap rows in anchors. Per `/docs/ux-plan-mobile.md` polish note.
2. **Arena fighter rows** — tap a fighter row → `/p/<handle>`. Currently fighter rows are static; a tap target needs adding.
3. **`@handle` mentions across the app** — chat messages, KO logs, deployment lists. Anywhere a handle appears, wrap in a link.
4. **Profile share button** — pre-populates a tweet:
   ```
   Level <X> <House> on 9LV.net
   <lifetime_points> points · <streak>-day streak
   See my Nine: 9lv.net/p/<handle>
   $9LV @9LVNetwork
   ```
5. **OG link preview** — when someone tweets the URL, the rich card carries the player's stats. Twitter / Telegram / Discord all auto-preview.

---

## Profile content map (by audience)

The profile page renders a single layout for everyone, but the layout is composed of audience-mapped chunks. Order top-to-bottom:

1. **Character sprite hero** *(all audiences)* — full layered-PNG character at the top, ~280px tall. House crest as background, character + equipped items composited via the same renderer `builder.html` uses. This IS the page on first impression.
2. **Identity strip** *(all)* — `@handle` · House · Guild tag · Level. One line, Cinzel + Press Start 2P.
3. **Headline stats** *(all)* — three big numbers: Lifetime points, Streak (current/best), ELO. Press Start 2P big, semantic stat colors. The "show off" line.
4. **Badges grid** *(character-focused + crypto)* — once achievements ship, real earn states. Until then, grey out the un-wired four badges with a "coming soon" footnote rather than the current locked-forever state.
5. **Audience flexes** *(per-segment, all rendered, ordered by relevance)* —
   - **Gamer flex:** ELO + duel record (W/L), codex completion %, deployment count.
   - **Crypto flex:** legendary card count, top-N season achievements, points-vs-rank.
   - **Character flex:** equipped item showcase, days since registration ("Genesis-era player" badge if before a cutoff).
6. **Recent activity** *(all)* — last 5 casts / KOs / round wins. Already partially built.
7. **Share strip** *(all)* — `Share on X` button + a copy-link button. Pre-templated tweet.
8. **Self-only ribbon at the top** *(if viewing own page)* — small `.btn-pill` "Edit Profile" → `builder.html?skip_intro=1`. Doesn't render when viewing someone else's page.

---

## Achievements system (separate PR, but blocks "real" badges)

The 6 hardcoded badges need real conditions wired. Scope:

1. New table `player_achievements` (`player_id`, `achievement_id`, `earned_at`, `progress`).
2. New table `achievements` (catalog: `id`, `name`, `description`, `icon`, `condition_type`, `condition_value`).
3. Earn-condition checks at relevant moments — cast → check First Cast; streak ping → check 5-day / week; round-end → check Territory Lord; daily aggregate → check Top 10.
4. Backfill from existing data — everyone with 1+ casts retroactively earns First Cast; everyone past 7-day streak gets Week Warrior; etc.
5. Add a "progress" surface for badges with thresholds (e.g. "Territory Lord — held a zone 23 / 100 rounds").

This is a sizeable workstream. **Profile v1 ships without the achievements system** — badges remain the 6 hardcoded ones with the same conditions wired today. Achievements get fully wired in PR 4 of the sequence below.

---

## Sequence of work

| # | PR | Scope | Risk |
|---|---|---|---|
| 1 | **Foundations** | Migration adding unique partial index on `LOWER(twitter_handle)`; new `server/routes/publicProfile.js` exposing `/p/:handle`; `public/profile-public.template.html`; basic OG meta tags with static fallback image; minimal placeholder rendering. | Low — additive. |
| 2 | **Public profile UX** | New layout for `profile-public.template.html` matching the content map above. Character-sprite hero (reuse `builder.html` renderer), headline stats, audience flex sections, share-to-X button, recent activity. Style per `/design.md`. Self-only "Edit Profile" pill. | Medium — net-new layout. |
| 3 | **Discovery wiring** | Leaderboard row tap-through, arena fighter row tap-through, `@handle` mention links across chat / KO log / deployment lists. | Medium — touches multiple files. |
| 4 | **Achievements system** | New tables, earn-condition hooks, backfill migration, dynamic badge rendering on profile. | Higher — DB + business logic. |
| 5 | **Dashboard tighten** | Trim XP duplication; promote daily pack to `.card--gold-pulse`; make hero character art tap → public profile; small stat-display reorganization to remove profile-overlap. | Low — UI polish. |
| 6 | **Builder polish** | Trinket copy fix; clearer save flow; minor visual alignment with `/design.md`. | Low — copy + minor CSS. |
| 7 | **(Future) Dynamic OG image** | Server-rendered per-player image (handle + house crest + stats). Gives every shared profile link a unique social card. | Low risk but new pipeline (image generation). Defer until ROI clear. |

PRs 1–3 are the v1 ship for "public, shareable profile." PRs 4–6 are follow-ups. PR 7 is opportunistic.

---

## Audience-by-audience retention map

Each surface should serve at least 2 of 3 audiences. Confirms the 3-page split is well-targeted.

| Surface | Gamer | Crypto | Character |
|---|---|---|---|
| **Dashboard** | daily quests, snapshot timer, deployments | points growth, pack countdown, $9LV reminder | character art, daily Nerm greeting, streak |
| **Public profile** | level, ELO, win rate, codex %, deployments | total points, legendary count, top-N achievements | character sprite hero, outfit showcase, badges |
| **Builder** | loadout optimization, sharpness math | — | item picker, outfit experimentation |
| **Arena (live)** | round-end XP, KO scoring, build feedback | live points, occasional pack pulls | live character watching, Nerm commentary |
| **Bazaar (packs)** | rarity rolls | dopamine reveal | daily ritual |
| **Leaderboards** | rank, ELO | top-N recognition | guild standing |
| **Spellbook** | collection optimization | rarity flex | aesthetic browsing |

Public profile is the one new surface that hits ALL THREE audiences hard. That's why it's the right v1 priority.

---

## Open questions / out of scope

- **Wallet linking on profile.** Per `project_token_economy.md`, no on-chain code unless scoped. v1 profile does NOT show wallet address or token balance. When token-claim path activates (Open Design Decision #6), profile gets a small "wallet linked" pill — not before.
- **Campfire integration.** Per `project_campfire_concept.md`, downstream of the dashboard/profile redesign. Profile could later show "currently opening a pack at the Campfire" presence indicator — but campfire itself isn't built. v1 profile is solo, async.
- **Profile customization** (themes, banner, custom flair). Deferred — v1 ships with a fixed layout. Custom flair becomes meaningful once cosmetic NFT path activates.
- **Privacy controls.** v1 assumes all profiles are public. If players want hide-from-discovery, that's a follow-up.
- **Block / report.** v1 doesn't include moderation primitives. If the community grows, this is a Phase-2 concern.
- **Rate limiting on `/p/<handle>`.** v1 ships with the standard Express rate limit. If scrapers become an issue, add per-IP throttling later.

---

## Verification (when v1 lands)

- `/p/<handle>` resolves on first hit for any active player. Case-insensitive.
- `curl /p/<handle>` returns HTML with `<meta property="og:title">` filled with player-specific values.
- Tweeting `https://9lv.net/p/<handle>` produces a rich preview card on Twitter.
- Tapping a leaderboard row navigates to that player's public profile.
- Tapping `@handle` in chat / KO log / deployment list navigates to that player's public profile.
- Self-view shows "Edit Profile" pill; other-view does not.
- Share-to-X button opens a Twitter intent with the templated tweet pre-filled.
- 404 on a non-existent handle returns a Nerm-voiced error page rather than a generic Express 404.
- Mobile: layout passes the spot-checks in `/public/design-preview.html`. Bottom-sheet pattern for any profile actions on ≤640px.

---

## TL;DR for the recommendation

Keep three pages. Add a public URL for one of them. Build it in this order:

1. Plumbing (`/p/<handle>` route + handle uniqueness + OG tag scaffolding).
2. Layout (character-hero profile with audience-mapped flex sections).
3. Discovery (link `@handle` mentions everywhere, leaderboards tap-through).
4. Achievements (real badges).
5. Dashboard polish (de-dupe with new profile).
6. Builder polish (copy fixes).

V1 ships with PRs 1–3. Everything else is follow-up. The single biggest acquisition lever in the whole site is going to be a tweet of `9lv.net/p/<your-handle>` rendering a rich card with the player's character sprite + lifetime points — that's the play.
