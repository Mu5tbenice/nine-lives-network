# Design System for Nine Lives Network — *Warm Night*

## 1. Visual Theme & Atmosphere

Nine Lives Network's web client (`9lv.net`) is a dark, immersive **mobile app** dressed as a fantasy grimoire. The whole surface lives in a warm-night color cocoon (`#0e0a18`, `#120e1e`, `#1a1528`) where amber gold (`#D4A64B`) is the only prestige color and content — cards, fighter rows, zone names — does the rest of the work. The design philosophy is "app feel, not website feel": tab bars over scroll narratives, sticky bottom chrome over hero footers, sheet modals over centered dialogs, density over breathing room. The splash page is the only marketing-y surface; everywhere else is a place the player lives in for 2-to-5-minute bursts.

The typography pairs **Cinzel** (serif display, uppercase-friendly) with **Crimson Text** (serif body) to carry the fantasy-grimoire weight, then deliberately undercuts that with **Press Start 2P** for short ALL-CAPS UI labels and **JetBrains Mono** for numerical data. The retro-arcade pulse of Press Start 2P keeps the interface from feeling self-serious; the monospace digits keep timers, HP, and points readable at glance speed.

What distinguishes 9LV is its **raised gold geometry**. The single primary CTA on every screen uses a stacked 3D shadow (`0 4px 0 #8a6d2f, 0 6px 20px rgba(212,166,75,0.3)`) that drops 2px on press — a tactile "candle-lit button" feel. Combined with translucent card surfaces (`rgba(30,22,42,0.7)`), gold-pulse animations on featured cards, and the always-on Nerm voice (dry, sardonic, never groveling), the result is an interface that reads as a place, not a page.

**Key Characteristics:**
- Warm-night dark theme (`#0e0a18`–`#1a1528`) — UI recedes so cards, fighters, and Nerm commentary glow
- Single gold accent (`#D4A64B`) — never decorative, only the next-step action
- Cinzel + Crimson Text + Press Start 2P + JetBrains Mono — four families, each with one job
- Raised gold buttons with 3D press, pill secondary buttons, no flat material
- Stat colors are inviolable: ATK red, HP green, SPD cyan, DEF purple, LUCK gold
- House colors stay inside house contexts — never used as generic semantic accents
- Bottom-sheet modals on mobile, fixed bottom action bars on combat surfaces
- Mobile-first; the app idiom wins over the marketing-page idiom on every screen

## 2. Color Palette & Roles

### Primary Brand
- **Gold** (`#D4A64B`): Brand prestige — single primary CTA, daily pack pulse, active nav, prestige numbers
- **Gold Light** (`#E8C675`): Highlight stop in gold gradients, hover lift
- **Gold Dim** (`rgba(212,166,75,0.15)`): Pill backgrounds, subtle gold fills
- **Gold Border** (`rgba(212,166,75,0.35)`): Outlined gold edges
- **Gold Glow** (`rgba(212,166,75,0.25)`): Box-shadow halos on featured cards

### Background (Warm Night ramp)
- **Deep** (`#0e0a18`): Outermost page, behind everything
- **Mid** (`#120e1e`): Mid-stop in body gradient
- **Warm** (`#1a1528`): Warm pocket — splash and onboarding only
- **Card** (`rgba(30,22,42,0.7)`): Default translucent card surface
- **Card Solid** (`#1e1630`): Card surface when underlying gradient must be hidden
- **Inset** (`rgba(0,0,0,0.15)`): Inset rows inside cards (activity items, list rows)

### Text
- **Bright** (`#F5F0E8`): `--text-bright`, headings, prestige values
- **Body** (`#D4C8B8`): `--text-body`, default body copy
- **Muted** (`#9B8E7E`): `--text-muted`, secondary labels, inactive nav
- **Faint** (`#6B5E50`): `--text-faint`, timestamps, helper text

### Stat Semantics (inviolable across the app)
- **ATK Red** (`#e85a6a`): `--stat-atk`, attack values, damage numbers, destructive actions
- **HP Green** (`#6acd8a`): `--stat-hp`, hit points, positive change, live indicators
- **SPD Cyan** (`#6ac8d8`): `--stat-spd`, speed values, mana, informational
- **DEF Purple** (`#b088e8`): `--stat-def`, defense, arcane
- **LUCK Gold** (`#D4A64B`): `--stat-luck`, luck, drop chance — same hex as brand gold

### Functional Accents
- **Live Green** (`#00ff88`): `--live`, on-air indicators, currently-active states
- **Orange** (`#FF8C00`): `--orange`, streak counter, urgency
- **Sunset** (`#e8855a`): Decorative warmth on splash and onboarding only
- **Sky** (`#8BB4E0`): Restraint accent, calm states (Manastorm house)

### House Colors (only inside guild/house contexts — never as generic semantic accents)
- **Smoulders** `#E03C31` · **Darktide** `#00B4D8` · **Stonebark** `#5CB338` · **Ashenvale** `#B0C4DE` · **Stormrage** `#FFC800` · **Nighthollow** `#7B2D8E` · **Dawnbringer** `#FF8C00` · **Manastorm** `#5B8FE0` · **Plaguemire** `#E84393`

### Borders
- **Subtle** (`rgba(255,255,255,0.07)`): Default card border
- **Medium** (`rgba(255,255,255,0.12)`): Section dividers, hover edges
- **Warm Gold** (`rgba(212,166,75,0.12)`): Default low-intensity gold border
- **Glow Gold** (`rgba(212,166,75,0.3)`): Hover/active gold edges

### Shadows
- **Button Raised** (`0 4px 0 #8a6d2f, 0 6px 20px rgba(212,166,75,0.3)`): Primary `.btn-gold` 3D press
- **Card Glow** (`0 0 15px rgba(212,166,75,0.25)`): Featured `.card--gold`
- **Card Pulse** (animated 15px → 25px gold glow, 4s loop): Hero `.card--gold-pulse` — at most one per page
- **Modal Scrim** (`rgba(0,0,0,0.7)` full overlay): Default modal backdrop
- **Sheet Lift** (`0 -8px 32px rgba(0,0,0,0.6)`): Bottom-sheet modals on ≤640px

## 3. Typography Rules

### Font Families
- **Display / Title**: `Cinzel` — serif, 400/500/600/700 weights. Uppercase-friendly with positive letter-spacing.
- **Body**: `Crimson Text` — serif, 400/600 weights + italic. 16px default body size.
- **UI Labels**: `Press Start 2P` — bitmap-style monospace, single weight. ALL CAPS short labels only (≤5 words).
- **Numerical Data**: `JetBrains Mono` — monospace, 400/500 weights. Timers, HP values, points.

Loaded via single Google Fonts link at top of `variables-v2.css` — see comments there for the canonical preconnect + link block.

### Hierarchy

| Role | Font | Size | Weight | Letter Spacing | Notes |
|------|------|------|--------|----------------|-------|
| Page H1 | Cinzel | 22–28px | 700–900 | 1.5–3px | Prestige headers, ceremony reveals |
| Section H2 | Cinzel | 16–18px | 700 | 1.5–2px | Card-header titles |
| Card Title | Cinzel | 14–16px | 700 | 0.5–1.5px | Spell card names, list-row titles |
| Body | Crimson Text | 16px | 400 | normal | Default paragraph copy |
| Body Dense | Crimson Text | 13–14px | 400 | normal | Inset rows, list metadata |
| Section Eyebrow | Press Start 2P | 8–10px | normal | 2px | ALL CAPS, gold or muted |
| UI Label | Press Start 2P | 6–10px | normal | 1–2px | Badges, tabs, button sub-labels |
| Numeric Stat | Press Start 2P | 8–22px | 700 | 0.5px | Card stat values (size variants) |
| Timer / Data | JetBrains Mono | 11–15px | 500 | normal | HP, points, timestamps |

### Principles
- **Four families, four jobs.** Don't blur the lines. Display = Cinzel. Body = Crimson Text. UI labels = Press Start 2P. Numbers = JetBrains Mono. Anything else is drift.
- **Press Start 2P is for ≤5 words ALL CAPS.** Anything longer hurts. Switch to Cinzel.
- **Body floor is 16px.** Don't drop the page default below this. Dense rows can shrink to 13–14px inline.
- **House footer fonts** (MedievalSharp, Pirata One, Cormorant SC, etc., loaded by `card-v4.css`) are reserved for the bottom strip of spell cards. Never hijack them for general UI.
- **One gold thing per surface.** Whether it's a Cinzel value or a `.btn-gold`, the eye should land on a single prestige element.

## 4. Component Stylings

### Buttons

**Gold Raised** — `.btn-gold` (the single primary CTA per screen)
- Background: `linear-gradient(180deg, #D4A64B 0%, #b8903d 100%)`
- Text: `#0e0a18` (deep background)
- Padding: 12px 24px
- Radius: 8px
- Font: Cinzel 14px / 700 / 1.5px tracking
- Shadow: `0 4px 0 #8a6d2f, 0 6px 20px rgba(212,166,75,0.3)`
- Active: `transform: translateY(2px)`, shadow collapses to `0 2px 0 #8a6d2f`
- Use: The next step the player should take. One per surface.

**Pill Outlined** — `.btn-pill` (secondary)
- Background: `rgba(212,166,75,0.15)`
- Text: `#D4A64B`
- Border: `1px solid rgba(212,166,75,0.35)`
- Padding: 5px 14px
- Radius: 5px
- Font: Cinzel 11px / 600
- Use: Edit, Refresh, Cancel, Change house, secondary nav — anything that isn't the next step.

**Combat Action — Attack** — `.btn-attack`
- Background: `linear-gradient(135deg, #cc3333, #aa2222)`
- Text: `#fff`
- Padding: 10px 0 (flex:1)
- Radius: 6px
- Font: Press Start 2P 9px / 1px tracking
- Use: In-combat attack-side selection only. Never elsewhere.

**Combat Action — Defend** — `.btn-defend`
- Background: `linear-gradient(135deg, #3366cc, #2244aa)`
- Same shape as `.btn-attack`. Defense-side combat selection only.

### Cards

**Default** — `.card`
- Background: `rgba(30,22,42,0.7)`
- Border: `1px solid rgba(255,255,255,0.07)`
- Radius: 12px
- Padding: 18px
- Use: Default content container.

**Featured** — `.card--gold`
- Adds: `1px solid rgba(212,166,75,0.35)` border, `0 0 15px rgba(212,166,75,0.25)` glow
- Use: Daily quest, daily objective zone, prestige content.

**Hero (animated)** — `.card--gold-pulse`
- Adds: `glowPulse 4s ease-in-out infinite` (15px → 25px gold glow halo)
- Use: At most one per page. Reserved for the loudest retention surface — the unclaimed daily pack, the live duel match, the active Chronicle thread.

### Badges

| Class | Background / Color | Use |
|-------|--------------------|-----|
| `.badge--live` | `rgba(0,255,136,0.12)` / `#00ff88` + 2.5s pulse | On-air, live battle, currently-running |
| `.badge--nerm` | gold-dim / gold + gold-border | Nerm-authored content, AI commentary |
| `.badge--mvp` | cyan-dim / cyan + cyan-border | MVP, featured player |
| `.badge--season` | gold-dim / gold + gold-border, 10px Press Start 2P | Season banner ("SEASON 0 LIVE") |
| `.badge--streak` | orange-dim / orange + orange-border | Daily streak counter |
| `.pct--up` / `.pct--down` | green-bg / red-bg, 9px Press Start 2P | Numerical change indicators |

All badges use Press Start 2P 8px (10px for `--season`), 4px 10px padding, 4px radius.

### Bars

- **Track** — `.bar-track`: 7px height, 4px radius, `rgba(255,255,255,0.04)` background
- **Fill** — `.bar-fill`: 100% height, 4px radius, `transition: width 0.8s ease`
- Fill color comes from semantic context (gold for XP, green for HP, cyan for mana). The 0.8s transition is intentional — feels like a flow, not a snap.

### Inputs

- Background: `rgba(255,255,255,0.05)`
- Border: `1px solid rgba(255,255,255,0.1)`
- Text: `#F5F0E8`
- Padding: 8px 12px
- Radius: 6px
- Font: Press Start 2P 12px (uppercase forms — guild tag) or Crimson Text 14px (chat, search)
- Focus: border becomes `rgba(212,166,75,0.35)`
- Use: Search, chat, guild-tag entry, admin forms.

### Tabs

- Container: flex row, no background
- Tab: Press Start 2P 6.5–9px, padding 0 13px, transparent background
- Active: gold text `#D4A64B`, inset bottom-border 2px gold
- Inactive: `rgba(255,255,255,0.3)` text, no border
- Right-divider: `1px solid rgba(255,255,255,0.05)` between tabs
- **Unread badge** (PR #225 pattern): tiny 14px gold pill with white text, top-right of tab; "99+" cap.
- Use: Arena live HUD (SPELLS / LOG / STATS / ZONE / POINTS), spellbook (MY CARDS / CODEX), bazaar (PACKS / SHOP / FEATURED), leaderboards (SEASON / HOUSES / DUELS / CLASH).

### Quick Actions Grid (hub pattern)

- Layout: `grid, repeat(3, 1fr), 8px gap`
- Tile: `.quick-btn` — column flex, 16px 10px padding, `.card` background, hover → gold border
- Icon: 24px (emoji or SVG) on top
- Label: Press Start 2P 9px ALL CAPS, 1px tracking
- Use: Dashboard, profile, any hub-style screen — three tappable doorways at glance speed.

### Activity Row

- Container: flex row, 12px gap, 13px 14px padding, `--bg-inset` background, 8px radius, 5px bottom-margin
- Dot (left): 9px circle, semantic color
- Info: title (Cinzel 15/600), meta (JetBrains 11px faint)
- Points (right): Press Start 2P 11px green
- Use: Recent activity lists, leaderboard rows, deployment summaries.

### Spell Card (`card-v4.css`)

The card itself is its own subsystem. Three core size variants, one zoom, multiple state modifiers.

| Variant | W × H | Use |
|---------|--------|-----|
| Default `.spell-card` | 240 × 380 | Spellbook grid, deck builder |
| Mini `.sc-mini` | 200 × 316 | Inventory grid |
| Tiny `.sc-tiny` | 160 × 252 | Dashboard hand preview |
| Zoom `.sc-zoom` | 340 × 530 | Detail overlay |

States (mutually exclusive): `--legendary` (always-on shimmer) · `--worn` (sharpness 1–50%) · `--degraded` (sharpness 0%, "DULL" overlay) · `--deployed` (top-right ⚔ tag) · `--selected` (gold ring + lift).

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Tokens: `--gap-xs: 4px`, `--gap-sm: 8px`, `--gap-md: 14px`, `--gap-lg: 20px`, `--gap-xl: 28px`
- Use the tokens. If you reach for `padding: 18px`, stop.

### Border Radius Scale
- `--radius-xs: 4px` — Badges, pills, inset rows
- `--radius-sm: 8px` — Buttons, small cards, tab tiles
- `--radius: 12px` — Default card / container
- 16–20px — Onboarding hero card, sheet headers (page-specific)
- 50% — Avatars, mana orbs, streak dots, circular CTAs
- 9999px — Full pill (rare; use 8px for buttons by default)

### Container Widths
- `.main-container` — 800px max, 68px top-padding (clears the fixed nav)
- Top nav inner — 960px max
- Onboarding card — 440px max
- How-to-play body — 560px max
- Dashboard / page contents — 500 / 720 / 1040px (mobile / tablet / desktop)

### Whitespace Philosophy
- **App density, not marketing margins.** Players scan, tap, swipe. Tight spacing keeps content above the fold.
- **Vertical rhythm via `--gap-md` (14px)** between major elements; `--gap-sm` (8px) within tight clusters.
- **Hero sections live on the splash and on round-end ceremonies only.** Everywhere else, the action sits inside the first 400px of the viewport.

### Grid Postures
- **Quick actions:** 3-column on mobile (`repeat(3, 1fr)`), expandable on desktop.
- **Card grid:** `repeat(auto-fill, minmax(250px, 1fr))` default; `minmax(210px)` mini; `minmax(170px)` tiny.
- **House grid (register):** 3-column, drops to 2-column at ≤400px.
- **Profile stats:** 4-column desktop, 2-column ≤600px.

### Z-Index Hierarchy
1. Page background gradient — base
3. Particle / sparkle layers (splash) — `z: 3`
10. Landing container — `z: 10`
20. Bottom CTA section (splash) — `z: 20`
50. Sticky nav backdrop — `z: 50`
60. Arena HUD chrome — `z: 60`
65. Nerm commentary band — `z: 65`
99. Modal scrim, mobile menu — `z: 99`
100. Top nav, modal content — `z: 100`
99999. Body-level tooltips — `z: 99999`

Don't introduce new high-z values without revising this table.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Base (Level 0) | `linear-gradient(180deg, #0e0a18 0%, #120e1e 50%, #0e0a18 100%)` | Page background |
| Surface (Level 1) | `rgba(30,22,42,0.7)` translucent card on gradient | Default cards, sidebar, containers |
| Featured (Level 2) | `0 0 15px rgba(212,166,75,0.25)` gold glow | `.card--gold` — daily quest, prestige content |
| Hero (Level 3) | `glowPulse 4s` animated 15→25px gold halo | `.card--gold-pulse` — at most one per page |
| Button Raised | `0 4px 0 #8a6d2f, 0 6px 20px rgba(212,166,75,0.3)` | `.btn-gold` 3D press |
| Modal | `rgba(0,0,0,0.7)` full overlay scrim | Centered modal (desktop) |
| Sheet | `0 -8px 32px rgba(0,0,0,0.6)` lift from bottom edge | Bottom-sheet modals (≤640px) |

**Shadow Philosophy.** On the warm-night palette, depth reads through *warm glow*, not sharp drop-shadows. The gold halo under `.btn-gold` is the canonical "this is real" signal. The gold-pulse on the daily-pack card is the canonical "you should look here" signal. Don't use grey or black drop-shadows — they vanish on the gradient. Don't use neon or electric glows — they break the warm-night atmosphere.

## 7. Do's and Don'ts

### Do
- Use `--gold` once per screen. The gold button is the player's "next step." Anything else is supporting cast.
- Use `.btn-gold` for primary, `.btn-pill` for secondary. Don't invent button variants.
- Reach for the existing CSS custom properties in `public/css/variables-v2.css` instead of inlining hex values.
- Use Press Start 2P only for short ALL CAPS labels (≤5 words). Switch to Cinzel for anything longer.
- Use bottom-sheet modals on ≤640px (PR #223 pattern). Centered modals on phone are a regression.
- Dock primary combat actions in a horizontal bottom bar on mobile (PR #218 pattern).
- Truncate long names with ellipsis + tooltip on hover/long-press (PR #226 pattern).
- Stat colors map 1:1 to `--stat-*` tokens. Always.
- Add unread badges on tabs when content arrives behind them (PR #225 pattern, 99+ cap).
- Treat the splash as the *only* marketing surface — every other page is the app.

### Don't
- Don't add a second gold button. Even on multi-step flows — the next-step is gold, back/cancel is `.btn-pill`.
- Don't stack action buttons vertically on mobile combat surfaces (PR #218 lesson).
- Don't center-modal on mobile (PR #223 lesson).
- Don't introduce neon or electric color combos — that reads as crypto-bro, which the brand explicitly avoids.
- Don't mix house fonts into general UI. MedievalSharp, Pirata One, Cormorant SC, etc. are reserved for the bottom strip of spell cards.
- Don't use light backgrounds. The warm-night immersion is core; light surfaces break the world.
- Don't use thin or subtle drop-shadows on the dark gradient — they vanish. Use warm glow instead.
- Don't grovel in copy. Nerm doesn't apologize, doesn't soften, doesn't hand-hold past the second nudge. *"something broke. not surprised. try again."* is the canonical error voice.
- Don't write marketing-page idioms — no "Features / Pricing / About" footers, no hero scroll narratives, no testimonial sliders. This is an app.
- Don't reference React, Tailwind, or any bundler. Vanilla HTML/CSS/JS only. (`wilds.html`'s JSX is a bug, not a pattern.)

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile XS | ≤400px | Onboarding card pads tighten; house grid 3-col → 2-col |
| Mobile S | ≤480px | `.main-container` pads tighten; mana orbs 22 → 17px; quick-btn label 9 → 7px |
| Mobile | ≤600px | Spell card defaults shrink (240 → 200, 380 → 316) |
| Mobile L | ≤640px | Top nav 76 → 56px; modals → bottom-sheet |
| Tablet | ≤768px | Hamburger appears; desktop nav links hide |
| Desktop | ≥769px | Full sidebar / desktop-grade chrome |

### Collapsing Strategy
- **Nav:** desktop horizontal links → hamburger (≤768px) → 56px slim bar (≤640px)
- **Modals:** centered card → bottom-sheet (full-width, anchored to bottom, max-height 80vh, slide-up entrance) at ≤640px
- **Action bars (combat):** desktop sidebar buttons → mobile fixed horizontal bottom bar (PR #218)
- **Card grid:** 5 → 3 → 2 → 1 columns as width drops
- **Tab bars:** persist at all sizes; never collapse into a more menu

### Tap & Viewport Hardening
Every page sets:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
```
And `-webkit-tap-highlight-color: transparent` is set globally. Hover effects degrade to tap effects on touch — never rely on `:hover` for critical interaction state.

### Tap Targets
Floor: 44 × 44px effective hit area. `.btn-gold` (12px 24px × 14px text) clears this. `.btn-pill` (5px 14px) does NOT — wrap it in a 44px-min container or pad it visually.

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: Deep (`#0e0a18`)
- Surface: Card (`rgba(30,22,42,0.7)`)
- Text: Bright (`#F5F0E8`), Body (`#D4C8B8`), Muted (`#9B8E7E`), Faint (`#6B5E50`)
- Accent: Gold (`#D4A64B`)
- Border: Subtle (`rgba(255,255,255,0.07)`)
- Stat: ATK `#e85a6a`, HP `#6acd8a`, SPD `#6ac8d8`, DEF `#b088e8`, LUCK `#D4A64B`
- Live: `#00ff88`
- Error: ATK red `#e85a6a`

### Example Component Prompts
- "Create a default card: `.card` class — rgba(30,22,42,0.7) background, 1px rgba(255,255,255,0.07) border, 12px radius, 18px padding. Title at 16px Cinzel weight 700, bright text. Subtitle at 14px Crimson Text weight 400, muted text."
- "Design a primary CTA: `.btn-gold` — linear-gradient(180deg, #D4A64B 0%, #b8903d 100%), 8px radius, 12px 24px padding. 14px Cinzel weight 700, 1.5px tracking, deep-bg text color. Shadow: 0 4px 0 #8a6d2f, 0 6px 20px rgba(212,166,75,0.3). Active: translateY(2px), shadow collapses."
- "Build a featured card with pulse: `.card .card--gold-pulse` — adds 1px rgba(212,166,75,0.35) border + glowPulse 4s animation. Use AT MOST ONCE per page."
- "Design a tab bar: row of buttons, Press Start 2P 6.5–9px, transparent background. Active = gold text + 2px gold inset bottom-border. Inactive = rgba(255,255,255,0.3) text. Add unread badges (top-right gold pill, 99+ cap) when content arrives behind a tab."
- "Create a bottom-sheet modal (≤640px): position fixed bottom 0, full width, max-height 80vh, 16px 16px 0 0 radius, slide-up entrance with translateY(100% → 0) over 0.3s ease."

### Iteration Guide
1. Start with the gradient — `linear-gradient(180deg, #0e0a18 0%, #120e1e 50%, #0e0a18 100%)` is the baseline canvas.
2. ONE gold button per screen — the next step the player should take. Everything else is `.btn-pill`.
3. Stat colors are inviolable — ATK red, HP green, SPD cyan, DEF purple, LUCK gold. Don't invent new ones.
4. Press Start 2P for short ALL CAPS labels only — anything ≥5 words goes to Cinzel.
5. Bottom-sheet modals on mobile — never centered. PR #223 lesson.
6. Bottom-fixed horizontal action bar on combat surfaces — never stacked vertically. PR #218 lesson.
7. Tabs get unread badges when content arrives behind them — PR #225 pattern.
8. Voice is dry-sardonic Nerm. Errors say *"something broke. not surprised. try again."* Empty states gently insult the player or the universe.
9. App feel, not website feel — tab bars over scroll narratives, sticky chrome over hero footers, density over breathing room.

### Retention Hooks (build these into every screen)
Three retention surfaces — every screen should serve at least one:
1. **Daily-loop hooks:** the unclaimed daily pack as `.card--gold-pulse`, streak counter with `.badge--streak`, midnight-reset countdown, "Day N — pack quality boost active" messaging.
2. **Compete-with-named-people hooks:** sticky "YOU" row on leaderboards, fighter rows with @handles + house pill, ELO + recent duels list, guild standings.
3. **Lore + voice hooks:** Nerm commentary band (`.badge--nerm`), Chronicle thread tease, named houses + named zones, IP-voiced empty/error copy.

### When Generating a New Screen
1. Link `/css/variables-v2.css`, then `/css/components-v2.css`, then `/css/nav-v2.css`, then any page-specific CSS.
2. Add the canonical Google Fonts link (see `variables-v2.css` comment block at top).
3. Include `<script src="/js/nav.js"></script>` at body top.
4. Wrap content in `<div class="main-container">`.
5. Show `.spinner` + Press Start 2P 8px caption (`LOADING…`) while data fetches.
6. Render empty state with 48px icon @0.4 opacity + Cinzel 18px title + Crimson 14px muted body + `.btn-pill` recovery CTA.
7. On error, show Nerm-voiced message + `Try Again` `.btn-pill`.
8. If the screen has tabs, wire unread badges. If it has a primary action on mobile, dock it in a fixed bottom bar. If it has a modal, make it a bottom-sheet on ≤640px.
9. Identify which retention hook the screen serves. If none, ask whether the screen should exist.
