# 9LV.net — Mobile UX Plan

> Senior mobile UX designer's screen-by-screen pass for 9LV.net, anchored to the *Warm Night* design system (`/design.md`). Covers 17 player-facing pages. Admin tools, card-lab, terms, and privacy are out of scope. Read this alongside `design.md` — every component reference (`.btn-gold`, `.card`, etc.) is defined there.

---

## Audience snapshot

The 9LV player is **Twitter-native, crypto-curious, and plays on a phone in 2–5 minute bursts** between scrolls. Acquisition channels: @9LVNetwork, KOL/NFT whitelists, Telegram. They know what a token is, but they're here for the cat-survival metaphor and the dry voice — not the wallet. Game is wallet-free. Token exists, never gates play.

They tolerate fantasy lore but reward Nerm-voiced sarcasm over earnest copy. They will leave if a screen feels heavy or asks for a wallet. They will return if there's a "what did I miss while I was gone?" moment waiting on the dashboard.

**Three retention surfaces** (every screen should serve at least one):
1. **Daily-loop hooks** — pack pull, daily objective, streak, midnight reset.
2. **Compete-with-named-people hooks** — guild standings, duel ELO, fighter rows with @handles.
3. **Lore + voice hooks** — Nerm commentary, Chronicle threads, named houses, named zones.

---

## Per-screen template

Each screen lists:

- **Tag.** `CANONICAL` (gold-standard, replicate elsewhere) · `POLISH` (works, small fixes) · `RETHINK` (UX is wrong or absent, needs a redesign pass) · `FLAG` (needs investigation before any UX work).
- **Objective.** What this screen exists to do for the player.
- **Main action.** The single thing we want the player to do here.
- **UI elements.** In priority order, referenced to design.md classes.
- **States.** Empty / Loading / Error.
- **CTA.** Exact label, destination, button class.
- **Microcopy.** 3–5 strings in Nerm/IP voice (zero emojis in the strings I author below — the existing app uses emojis as icons throughout, which is fine to preserve).
- **Retention hook.** The one thing on this screen that pulls the player back tomorrow.

---

# Stage 1 — Acquire

## 1. Splash · `public/index.html` · POLISH

- **Objective.** Convince a Twitter visitor in 3 seconds that this is a game worth tapping into. Make the brand world land before any chrome appears.
- **Main action.** Tap **Enter the Realm** (registered players see *Dashboard*).
- **UI elements.** Background video at 28% opacity → top + bottom vignettes → particle layer → sparkle layer → centered title image (560px max, mix-blend-mode screen, breathing filter glow) → fixed bottom CTA stack: tagline → `SEASON 0 LIVE` badge → gold play button → muted "How To Play" + "Play: Survive" links → footer (Terms / Privacy / @9LVNetwork).
- **States.**
  - *Empty.* Not applicable — splash.
  - *Loading.* Title image fallback (`.title-fallback`) renders the wordmark in Cinzel if the PNG fails. Already wired.
  - *Error.* Not applicable.
- **CTA.** `Enter the Realm` → `/register.html` (or `/dashboard.html` if `localStorage.player_id` exists). Class: bespoke `.play-btn` (matches `.btn-gold` visual contract).
- **Microcopy.**
  - Tagline: *"Your Nine Fights. Cards Are Its Weapons."* (current — keep, it works.)
  - Season badge: *SEASON 0 LIVE*
  - Returning copy when `player_id` exists: *Dashboard* (current — keep.)
- **Retention hook.** The animated title + season badge — implies the world is currently happening without you. The "Play: Survive" link serves the 30-second-arcade itch.

**Note.** Splash already feels right. Resist the urge to add a hero card carousel or feature roster — the singular CTA is the whole point.

---

## 2. Sorting Ceremony · `public/register.html` · CANONICAL

- **Objective.** Convert a Twitter sign-in into a character-bonded player. Get them through OAuth + house pick + identity ceremony in under 60 seconds.
- **Main action.** Sign in with Twitter → accept Nerm's sorting OR pick a different house → tap **JOIN NETHARA**.
- **UI elements.** 4-dot progress bar (Connect → Sort → Choose → Enter) → Nerm avatar (floating animation) → headline (Cinzel ALL CAPS) → roast-bubble with typewriter cursor → Twitter button → house grid (3-col, drops to 2 at ≤400px) with stat bars per house + UNDERDOG +15% bonus pill on least-played → optional GUILD TAG input → 5-second confirm cooldown ("READ YOUR FATE FIRST… (5)") → confirmation ceremony with crest + stats + load bar.
- **States.**
  - *Loading.* "summoning a cat from the void" (current — keep.) Spinner.
  - *Sorting in progress.* Rotating Nerm thinking lines ("reading your timeline...", "judging you... this won't take long...", "counting your L's..."). Already implemented.
  - *Error.* "something broke. not surprised. try again." → "Try Again" full-width button → `/register.html`.
- **CTA.** `JOIN NETHARA` → `/builder.html?player_id=<pid>` after confirmation ceremony. Class: bespoke `.twitter-btn` (gold gradient, matches design system).
- **Microcopy.**
  - Step 1: *"another one. wonderful. connect your twitter so i can figure out what's wrong with you."*
  - Step 2: *"NERM IS JUDGING YOU"*
  - Mismatch sass on house override: *"sure. ignore the magical cat. everyone does."*
  - Match validation: *"wise choice. I knew you had taste."*
  - Confirmation: *"Your Nine has been born. Entering the Builder…"*
- **Retention hook.** The sortable roast — a player who was just told *"reading your soul and you said nah. okay."* will share that screenshot on X (the SHARE ON X button is right there, tweets a templated `Nerm sorted me into <House>… 9LV.net @9LVNetwork $9LV`). That tweet is the entire user-acquisition flywheel.

**Note.** This is the gold standard for IP-voiced onboarding. Replicate the cooldown-before-CTA pattern (forces the player to read the lore beat) on any future ritual screen.

---

## 3. How to Play · `public/how-to-play.html` · POLISH

- **Objective.** Answer "what *is* this game?" for someone who tapped **How To Play** from the splash before signing up. Reduce sign-up bounces by making the rules clear in one scroll.
- **Main action.** Read enough to feel oriented → tap **Start Playing →** at the bottom.
- **UI elements.** Centered narrow column (560px max) → 6 collapsible-feeling sections (Getting Started, The Nine Houses, Spell Cards, Game Modes, The Chronicle, Guilds, Scoring, Daily Cycle) → numbered step cards → info-cards with stat pills, type tags, rarity ladder → `COMING SOON` badge on Chronicle → final CTA bar.
- **States.**
  - *Empty / Loading / Error.* All static — no states needed.
- **CTA.** `Start Playing →` → `/register.html`. Class: bespoke gold (matches `.btn-gold`).
- **Microcopy.**
  - Intro: *"Welcome to Nine Lives Network, territory warfare in the world of Nethara."* (current — keep.)
  - House warning: *"⚠ You can switch houses once per week, but points earned under your old house don't carry over. Choose wisely!"*
  - Pack reminder: *"No login = no pack, they don't stack up."* (current — this is killer copy, it earns the daily return.)
  - Lone Wolf: *"No guild? Lone Wolves get ×1.5 ATK in combat to compensate for fighting solo."*
- **Retention hook.** "No login = no pack" — the single most important sentence on the page. Surface it earlier (above the fold on mobile) and consider duplicating it in the dashboard's pack-claim card.

**Polish recommendation.** Currently a wall of info-cards. On mobile, collapse the Chronicle and Daily Cycle sections into expand-to-read accordions so first-load shows just Getting Started + Houses + Cards + Modes. Estimated win: ~30% more scroll-to-CTA completion.

---

# Stage 2 — Hub

## 4. Dashboard · `public/dashboard.html` · POLISH

- **Objective.** Be the "what's up since I left?" surface. In one scroll, the returning player sees streak, daily pack status, deployed Nines, recent activity, and one obvious next action.
- **Main action.** Tap into whichever surface is most rewarding *right now* — usually **Claim Daily Pack** (if unclaimed) or **Open Nethara** (if pack already claimed).
- **UI elements.** Top: player crest avatar + handle + house badge + change-house pill (subtle, opacity 0.6) + guild tag input/save → XP bar + level + "X XP to level Y" (recently added per `profile.html` parallel) → 4-stat row (Season pts / Lifetime / Streak / Cards) → quick-actions grid (3-col on mobile) → daily quest card (gold-pulse if unclaimed) → deployed Nines mini-cards (`.tl-card` timeline) → recent activity list (`.activity-item` rows).
- **States.**
  - *Empty.* New player with no deployments: `.activity-item` says *"No casts yet. Open Nethara and deploy a Nine."* with `.btn-pill` linking to `/nethara-live.html`.
  - *Loading.* Centered `.spinner` + Press Start 2P 8px caption *"LOADING…"* (already shipping).
  - *Error.* Centered error state with Nerm voice: *"the dashboard collapsed. probably your fault."* + Retry `.btn-pill`.
- **CTA.** Conditional: if daily pack unclaimed → `Claim Daily Pack` → `/packs.html` (gold pulse). Else → `Open Nethara` → `/nethara-live.html` (gold). Single gold button — never both.
- **Microcopy.**
  - Streak callout: *"Day {n}. Don't break it."*
  - Pack-claimed state: *"pack opened. cards in your spellbook."*
  - Empty deployments: *"no nines on the field. you're letting people score on you."*
  - Activity row prefix: *"⚔ {Zone} · +{pts} · {time ago}"*
- **Retention hook.** Streak counter + the daily pack card. Both regenerate at midnight UTC. The pack card needs to be the loudest element when unclaimed — gold-pulse + "1 PACK WAITING" Press Start 2P eyebrow. The "No login = no pack" tax means a missed day costs forever.

**Polish recommendations.**
1. Promote the daily pack card to the top above quick-actions when unclaimed.
2. Add a soft "Chronicle live in 3h" countdown badge if the Chronicle bot is operational (currently offline per project state — gate behind feature flag).
3. The change-house pill at 0.6 opacity is right; resist making it any more prominent — switching house wipes house-context points.

---

## 5. Profile · `public/profile.html` · POLISH

- **Objective.** Show the player their identity and progression. Personal museum, not a hub.
- **Main action.** Read your own stats + badges. (Most visits are vanity scrolls, not destination-driven.)
- **UI elements.** Profile header card (80px gold-bordered avatar + Cinzel 22px House <Name> + @handle + house element badge) → XP section (level, XP-to-next-level countdown, 10px gradient bar, Zone slots: <n>) → 4-stat grid (Season pts / Lifetime / Streak / Cards) → Badges grid (earned vs locked, opacity 0.35 for locked) → Recent activity list (last 5 casts).
- **States.**
  - *Empty (no casts).* *"No activity yet"* (current copy is fine but lifeless — see microcopy below).
  - *Loading.* Spinner. Already shipping.
  - *Error (no player_id).* "🧙 No player found. You need to register first." → link to `/register.html`. Already shipping.
- **CTA.** None (this is a vanity surface). Implicit secondary: tap a badge to see how to earn it (not yet implemented — see polish notes).
- **Microcopy.**
  - Empty activity: *"no casts yet. you've been a tourist."*
  - Locked badge tooltip (proposed): *"earn this by {condition}"*
  - Max-level XP: *"MAX LEVEL"* (current — keep.)
- **Retention hook.** XP-to-next-level countdown. Small absolute number ("12 XP to level 4") is more motivating than a percentage. Already implemented correctly. The badges grid carries half its potential right now — see polish notes.

**Polish recommendations.**
1. Make badges tappable. Each badge opens a bottom-sheet (per design.md mobile pattern) showing earn condition + progress (e.g. "5 Day Streak — currently at day 3").
2. Currently 4 of 6 badges are hardcoded `earned:false` — wire them to real conditions or remove them. Locked-forever badges feel broken.
3. Add a "Share Profile" `.btn-pill` at the bottom that tweets a profile screenshot template. Pure acquisition lever.

---

# Stage 3 — Play (Live)

## 6. Arena Live · `public/nethara-live.html` · CANONICAL

> Updated 2026-04-25: arena polish is **unfrozen**. The 3D-layer work ships through a native app build (out of scope for the web). Treat this page as the canonical mobile pattern AND as a polish target — capture its patterns for replication elsewhere AND ship retention/visual improvements here directly. Loop-stability still beats polish; don't break the live tick.

- **Objective.** Watch your Nine fight in real time. Be social during combat. Make tactical mid-battle decisions (swap, exit, AUTO toggle).
- **Main action.** Watch combat (Socket.io tick stream). Secondary: chat, swap card mid-battle, deploy/exit.
- **UI elements (post §9.90).**
  - Top bar: zone name (ellipsis-truncate, PR #217), LIVE badge always visible.
  - Portrait header strip (PR #218, was a vestigial sidebar) — horizontal.
  - Card slots with full-width names (PR #226 unblocked).
  - Action bar: bottom-fixed horizontal — `.btn-gold` SWAP, red EXIT, AUTO ON/OFF pill (PR #219).
  - Tabs: SPELLS / LOG / STATS / ZONE / POINTS — Press Start 2P 6.5px, fixed icon + label (PR #220).
  - Chat: visible input + gold-outlined send arrow (PR #220), unread badges on CHAT/LOG (PR #225, 99+ cap).
  - Combat log at 15px / readable line-height (PR #222).
  - Nerm commentary band (top: 74px, z-index 65, PR #222).
  - Round-end modal: bottom-sheet on ≤640px (PR #223).
- **States.**
  - *Empty (no fighters).* "Loading zone..." then transitions to live tick.
  - *Loading.* "LOADING ZONE..." Press Start 2P 7px / muted (current).
  - *Error.* "ZONE NOT FOUND" or "ERROR" Press Start 2P / red.
- **CTA.** `SWAP` (gold) — only ever one gold button per state. EXIT is red, AUTO is a pill.
- **Microcopy.**
  - Fighter row: `[guild] @handle` (deduplicated per PR #226).
  - Empty deployments: *"No Nines deployed. Deploy yours!"*
  - Round-end modal: opens with results + (proposed) reward roll content per project memory's round-end-dopamine plan.
  - Chat placeholder: *"Say something..."*
- **Retention hook.** This is THE retention surface. The 35-second round intermission needs to be filled with reward feedback (per `project_round_end_dopamine.md`): points-now (easy win, do first), XP slot now content-later, RNG drop roller deferred. With the arena unfrozen, this is now near-term work — schedule into Path A.

**Canonical patterns to replicate elsewhere.**
- Bottom-fixed horizontal action bar.
- Tab bar with unread badges.
- Bottom-sheet modals.
- Live-tick socket pattern.
- Inline chat with always-visible send button.

---

## 7. Zone Detail (legacy) · `public/zone-detail.html` · POLISH

- **Objective.** Browse a single zone before deploying — see who's there, see the combat log, equip a card via FAB. The pre-§9.90 zone view that pre-dates `nethara-live.html`.
- **Main action.** Tap **DEPLOY** after picking a card from the carousel.
- **UI elements.** Loading state → zone header → guild list (or `No one deployed yet. Be the first!`) → card carousel (left/right buttons) → bottom FAB toggling deck/equip → combat log → no-log empty state.
- **States.**
  - *Empty (no deployments).* *"No one deployed yet. Be the first!"*
  - *No combat log.* *"No combat yet. Deploy opposing guilds to start."*
  - *Loading.* "LOADING ZONE..." Press Start 2P / muted.
  - *Error.* "ZONE NOT FOUND" or "ERROR".
- **CTA.** `DEPLOY` → POST deployment → reload as live arena. `WITHDRAW` (`.btn-pill` red variant) for already-deployed.
- **Microcopy.**
  - Action bar: *DEPLOY*, *WITHDRAW*
  - FAB tooltip (proposed): *"open hand"*
- **Retention hook.** None unique — this page is a stepping stone to `nethara-live.html`.

**Polish recommendation.** This page increasingly overlaps with `nethara-live.html`. Decide before the 3D-layer drop whether to (a) consolidate into `nethara-live.html` and redirect this URL, or (b) keep as the lightweight pre-deploy preview. Recommend (a) — fewer URLs, less duplication.

---

## 8. Zone Battle (legacy) · `public/zone-battle.html` · POLISH

- **Objective.** Real-time combat view with ⚔️ BEGIN COMBAT button — the manual-trigger combat mode. Mostly superseded by the auto-tick in `nethara-live.html`.
- **Main action.** Tap **BEGIN COMBAT** to start a round (manual trigger pattern — possibly admin/dev-only at this point).
- **UI elements.** Loading state → zone header → guild rows with HP bars + cards → live timer → cast log.
- **States.**
  - *Loading.* "Loading zone..." JetBrains Mono 10px / muted (current).
  - *Empty / Error.* Not surfaced; falls back to mock data per code comment.
- **CTA.** `⚔️ BEGIN COMBAT ⚔️` (bespoke `.begin-btn` — visually similar to `.btn-gold`).
- **Microcopy.**
  - Begin button: *⚔️ BEGIN COMBAT ⚔️*
  - Loading: *Loading zone...*
- **Retention hook.** None — this is a developer/admin combat trigger, not a player-facing retention surface.

**Polish recommendation.** Audit whether players can reach this URL through normal nav. If not, demote to `/admin/zone-battle.html` and remove from any visible nav. If yes, fold into `nethara-live.html`.

---

## 9. Survivors · `public/survivors.html` · RETHINK

- **Objective.** Vampire-Survivors-style arcade mode — quick session, no deploy commitment, pure dopamine. Brand-new page from PR #224.
- **Main action.** Start a run, survive waves of enemies, beat your previous score.
- **UI elements (currently sparse — needs the UX layer).** Currently has minimal HUD (`.sv-top-empty` placeholder copy). Needs:
  - Title screen: house pick + difficulty + previous best score → big gold "BEGIN" button.
  - In-run HUD: time survived, kill count, current wave, HP bar, level-up notifications.
  - Pause overlay (mobile: long-press anywhere).
  - End-of-run summary: time, kills, XP earned, "+1 to leaderboard rank" if applicable.
  - Leaderboard tab: top 10 survivors + your rank + your previous best.
- **States.**
  - *Empty (no scores yet).* *"Be the first to die."*
  - *Loading.* `.spinner` + "LOADING WAVE..."
  - *Error.* "the void glitched. respawn?" → Try Again `.btn-pill`.
- **CTA.** `BEGIN` (`.btn-gold`) on title screen → in-run combat → `RUN AGAIN` (gold) on death summary.
- **Microcopy.**
  - Title eyebrow: *"NINE LIVES: SURVIVE — single life, no respawn, all glory."*
  - Wave intro: *"WAVE {n}"* (Press Start 2P 18px, full-screen flash 0.5s).
  - Death: *"that one's on you."*
  - New record: *"new high. weird."*
- **Retention hook.** "Beat your best" + a public top-10 — the universal arcade engine. Add daily seed so today's run is the same enemy pattern for everyone, then leaderboards become a comparison and not just a personal grind. Tweet-share button on death screen ("survived 2:34, killed 89, what's yours?").

**Rethink priority: high.** This is a freshly-shipped surface that needs UX polish before the next acquisition push. It's *also* the only mode someone can play without registering (linked from splash as "Play: Survive") — make the friction-free path obvious, and make sign-up a soft post-run nudge ("save your run to the leaderboard? sign in.").

---

# Stage 4 — Play (Alt Modes)

## 10. Quick Duels · `public/duels.html` · POLISH

- **Objective.** "I have 2 minutes" mode — best-of-3 PvP with no card consumption, no deployment commitment.
- **Main action.** Tap **FIND OPPONENT** → reveal a card per round → see result.
- **UI elements.** Card-slot picker (uses `card-slot-v4.css` house-stripe + rarity-border) → fight button (currently labeled `⚔️ FIND OPPONENT — 1 MANA`) → reveal animation → round result → best-of-3 tracker → match history list.
- **States.**
  - *No cards.* "no cards in your hand. open a pack first." → `.btn-pill` → `/packs.html`.
  - *Searching opponent.* `.spinner` + "FINDING OPPONENT..." with timeout → "no one online. try again in a sec."
  - *Error.* `❌ Failed` + button text reverts (current handling).
- **CTA.** `⚔️ FIND OPPONENT` (gold). The "— 1 MANA" suffix needs to come off (see flag below).
- **Microcopy.**
  - Pre-match: *"both reveal at the same time. higher ATK wins. try not to embarrass yourself."*
  - Win: *"that wasn't even close."*
  - Loss: *"absolutely cooked."*
  - Empty hand: *"no cards in your hand. you can't fight with vibes."*
- **Retention hook.** ELO tracking surfaced via the Duels leaderboard tab. Add a daily "first 3 duels grant +50% bonus pts" multiplier to the dashboard call-out — converts duels from one-off into a daily habit.

**FLAG.** Button currently says "1 MANA". Per `project_mana_dead_code.md`, the mana system is dead. Strip the mana cost from the duel CTA copy as part of the broader mana-cleanup PR — don't fix it in isolation.

---

## 11. The Wilds · `public/wilds.html` · FLAG

- **Objective (intended).** Exploration / roaming mode where players approach encounters, fight or flee, collect rewards.
- **What's actually in the file.** JSX-style markup with `onClick={...}` and `style={{}}` — React syntax inside what's supposed to be a vanilla static HTML page. This file does not match the rest of the codebase pattern.
- **Action required BEFORE any UX work.**
  1. Verify whether the page renders at all in production (`/wilds.html` in browser — does it load Babel standalone? Throw? Show blank?).
  2. If it renders via inline Babel: document the pattern OR rewrite to vanilla.
  3. If it doesn't render: file a §9 entry, decide whether to fix or remove from nav.
- **Until that resolves**, this UX plan cannot prescribe layout/microcopy/CTAs without making assumptions about the runtime. Current best guess from grep: `BEGIN JOURNEY` start CTA, `APPROACH` / `FIGHT` action verbs, `SKIP REWARD` exit, character layered sprite rendering. The visual contract appears to match design.md (gold gradient CTA, house crests with drop-shadow, Cinzel/Press Start 2P fonts).
- **Suggested investigation.** Spawn an Explore agent with: *"Open `public/wilds.html` in headless Chrome and report what's on screen at first load. Is it React? If so, where's the runtime loaded from?"*

---

## 12. The Gauntlet · `public/gauntlet.html` · POLISH

- **Objective.** Floor-by-floor tower run. Beat floor N → continue to floor N+1. Single-session progression with run-state persistence.
- **Main action.** Tap **CONTINUE TO FLOOR {n}** to descend, or **VIEW TOWER** to see the bigger picture.
- **UI elements.** Tower view (floor list with completion ticks) → current floor card → cards / hand → encounter intro → fight resolve → reward / penalty.
- **States.**
  - *Loading.* Standard `.spinner`.
  - *Error.* `.g-error` red-tinted card, JetBrains Mono 12px.
  - *Run-active.* "CONTINUE TO FLOOR {n}" gold button.
  - *Run-complete.* "VIEW TOWER" dim button + new run CTA.
- **CTA.** `CONTINUE TO FLOOR {n} →` (gold). Secondary `VIEW TOWER` (dim).
- **Microcopy.**
  - Tower title: *"THE GAUNTLET — climb until you fall."*
  - First-time hint: *"each floor gets harder. no respawn mid-run."*
  - Death: *"dead on floor {n}. sleep it off."*
  - Reward: *"floor {n} cleared. take what you earned."*
- **Retention hook.** Personal-best floor reached + a leaderboard tab for "highest floor cleared this season". Daily-seed gauntlet (same enemies for everyone today) makes screenshot-comparison viable.

---

# Stage 5 — Collect & Equip

## 13. Spellbook · `public/spellbook.html` · POLISH

- **Objective.** Browse the full card collection (yours + the codex of all cards). Filter, search, plan loadouts.
- **Main action.** Tap a card → see detail / take to builder. Or filter by rarity/type/status to find a specific card.
- **UI elements.** Tabs: MY CARDS / CODEX → search input ("Search cards...") → filter rows: Rarity (All / Common / Uncommon / Rare / Epic / Legendary), Type (ATK / DEF / SUP / MAN / UTL), Status (All / Owned / Locked) → card grid (`card-v4.css`, mini variant) → empty state with link to packs.
- **States.**
  - *Empty (My Cards).* "no cards in your spellbook. open a pack." → `.btn-pill` → `/packs.html`. Already wired (`.sb-empty`).
  - *Empty (filtered).* "nothing matches that filter. try fewer rules." → "Clear filters" `.btn-pill`.
  - *Loading.* `.sb-spinner` + "Loading spellbook..." (current).
  - *Error.* (Currently silent console.error — see polish.)
- **CTA.** No singular gold button on this page — it's a browse surface. Tapping a card is the implicit action.
- **Microcopy.**
  - Empty: *"no cards in your spellbook. open a pack."*
  - Codex tab: *"every card in the realm. some you have. some you don't."*
  - Search placeholder: *"Search cards..."*
  - Sharpness tooltip: *"sharpen by feeding duplicate or same-house cards."*
- **Retention hook.** Codex completionism — a "12 / 47 collected" Press Start 2P counter at the top of the Codex tab is a daily nudge. Same trick that made Pokédex a verb.

**Polish recommendations.**
1. Surface a Codex completion percentage near the tab.
2. On filtered-empty, give a recovery action ("Clear filters") — currently silent.
3. Add an error state — currently console.error swallows failures, leaving user with a blank page.

---

## 14. Builder · `public/builder.html` · POLISH

- **Objective.** Multi-step character/loadout customization — name, equipment slots, first pack, first deployment. Runs immediately after registration.
- **Main action.** Step-by-step: customize → first pack → tutorial → enter Nethara.
- **UI elements.** 4-step wizard (CTA buttons advance) → character preview with layered sprite (head, body, weapon, trinket1, trinket2 slots) → guild-tag input ("e.g. $BONK, $WIF, or any team name") → Lone Wolf hint → step-3 booster pack art → step-4 dashboard skip link.
- **States.**
  - *Empty slots.* "Find trinkets in chests & drops" (currently — informational, but trinkets have no drop path per project memory; rephrase).
  - *Loading inventory.* Console log; no visible spinner — see polish.
  - *Error.* Console.warn fallback to empty slots.
- **CTA.** Step 1: `CUSTOMIZE YOUR NINE →` (gold). Step 2: `OPEN YOUR FIRST PACK →` (gold). Step 3: `HOW DO I FIGHT? →` (gold). Step 4: `⚔️ ENTER NETHARA` (gold, 16px, 3px tracking). Soft skip: `skip to dashboard →` (mono underline).
- **Microcopy.**
  - Lone Wolf: *"Leave empty to go Lone Wolf (1.5× ATK in zones)"* (current — keep, it's good.)
  - Empty slot tooltip (proposed): *"earn this slot by leveling up."*
  - Final step: *"⚔️ ENTER NETHARA"*
- **Retention hook.** Onboarding momentum — every step ends in a gold CTA, no decision fatigue. Don't add "skip" buttons earlier than step 4; keep the lock-in.

**Polish recommendations.**
1. The "Find trinkets in chests & drops" copy implies a drop system that doesn't exist (per project memory: items have no drop path). Rephrase to: *"Trinket slots unlock as your Nine levels."*
2. Add a visible loading state when inventory fetches.
3. The character preview is the silent star — make sure layered sprite errors degrade to the house crest gracefully (already partially handled).

---

## 15. The Bazaar · `public/packs.html` · POLISH

- **Objective.** Pack opening + cosmetics shop. The dopamine room. Daily pack is the main return-engine.
- **Main action.** Tap **CLAIM DAILY PACK** → reveal animation → COLLECT.
- **UI elements.** Tabs: 📦 Packs / ✨ Shop / 🐱 Featured → header sub copy → daily pack card (gold-pulse if unclaimed) → reveal ceremony overlay (close button + REVEAL ALL + COLLECT CARDS) → empty/error states.
- **States.**
  - *Already claimed today.* "pack claimed. come back at midnight UTC."
  - *Loading.* `.spinner` + "Loading packs..." (current).
  - *Error.* `.empty-state` with `📦` icon + "Could not load packs" (current — sharpen voice, see microcopy).
  - *Reveal in progress.* Full-screen overlay with countdown.
- **CTA.** `CLAIM DAILY PACK` (gold, pulse). After reveal: `COLLECT CARDS` (gold).
- **Microcopy.**
  - Pre-claim: *"1 pack waiting. don't say I didn't warn you."*
  - Claimed today: *"pack claimed. come back at midnight UTC. or don't."*
  - Error: *"the bazaar's having a moment. refresh."*
  - Reveal intro: *"5 cards. let's see what fate gives you."*
  - Legendary pull (proposed): *"a legendary. show-off."*
- **Retention hook.** Daily pack + the "no login = no pack" tax. A streak counter on the pack card ("Day 7 — pack quality boost active") would dial this further.

**Polish recommendations.**
1. Daily streak boost (+rarity weighting on day 7, day 14, day 30) — ship as a "PACK STREAK" eyebrow on the daily pack card.
2. Reveal ceremony already feels good — preserve it as part of the canonical "ceremony" pattern (along with house reveal and round-end).
3. Featured tab is currently underused — promote it as the home of NFT-claim cosmetics when that ships (per `project_character_art_and_nft.md`).

---

# Stage 6 — Status & Economy

## 16. Leaderboards · `public/leaderboards.html` · POLISH

- **Objective.** Show the player where they stand, who they're chasing, and who's chasing them. Drive guild rivalries.
- **Main action.** Scan a tab. Most players scroll, find their name, and leave.
- **UI elements.** 4 tabs: 🏆 SEASON / 🏠 HOUSES / ⚔️ DUELS / 💥 CLASH → ranked list with crest + handle + house pill + score → for CLASH: sub-tabs (📊 Standings / ⚔️ Matches) + admin-only New Clash Matchup button.
- **States.**
  - *Empty (Season).* *"No players yet. Be the first to earn points!"* (current — keep.)
  - *Empty (Houses).* *"No house data yet."*
  - *Empty (Duels).* *"No duels fought yet. Challenge someone!"* (current — keep, this is exactly the right hook.)
  - *Empty (Clash, non-admin).* *"No guild clashes yet. Coming soon!"* (current — replace "Coming soon!" with something less placeholder-feeling, see microcopy.)
  - *Loading.* `.spinner` (current).
  - *Error.* Currently silent (console.error) — see polish.
- **CTA.** None on the page itself; each row is implicitly tappable to a player profile. (Profile-from-leaderboard nav is not yet implemented — see polish.)
- **Microcopy.**
  - Your row highlight (proposed): *"YOU"* gold pill in the rank column.
  - Empty Clash (revised): *"no clashes scheduled. talk to your guild."*
  - Tab hover/tap eyebrow: subtle Press Start 2P sub-label per tab ("THIS SEASON", "ALL HOUSES", "ELO RATING", "GUILD vs GUILD").
- **Retention hook.** Showing the player their own rank prominently — currently the list is just everyone in order, easy to miss yourself. Sticky-pin "YOU" row at the top of the list (or just highlight it gold and scroll-to on load).

**Polish recommendations.**
1. Sticky "YOU" pin on every leaderboard tab.
2. Tap a row → open player profile (currently no link).
3. Surface error state — silent failure leaves the page blank.
4. The Clash tab is the most underdeveloped — when guild clashes do go live, this surface needs a heroic redesign with match brackets, score timers, and tweet-able results.

---

## 17. $9LV Token · `public/token.html` · RETHINK

- **Objective.** Show the player the token exists, where to find it, what it represents. Educational + transparency. **NOT** a transaction surface — game is wallet-free.
- **Main action.** Copy the contract address (or read).
- **UI elements (currently sparse).** Contract address with COPY button. Almost nothing else above the fold from grep. The token is live on Solana per project memory but the page hasn't been built out.
- **States.**
  - *Empty / Loading / Error.* Not really applicable — page is largely static.
- **CTA.** `COPY` (single secondary action). No primary gold CTA — adding "BUY ON PUMP.FUN" is **out of scope** per project memory (no on-chain code unless scoped, no pump-and-dump hard guardrail).
- **Microcopy.**
  - Page eyebrow: *"$9LV — the token. live on Solana. live for the game."*
  - Address: monospace + copy button. (Current — keep.)
  - Below address (proposed): *"the game is wallet-free. the token is its own thing."*
  - Education section (proposed): *"how to earn → points convert (vested pool). how to use → not yet — gameplay first."*
- **Retention hook.** None today — the page is informational and visited once. To convert this into a recurring surface, add a "current vested pool / current pts→token rate (illustrative only)" widget with a clear "no claim path live yet" disclaimer. **Rethink priority: medium.** Avoid making it a financial surface; keep it a transparency surface.

**Rethink recommendations.**
1. Page hierarchy: hero (token name + Solana eyebrow + CA copy) → 3 plain-language facts (what it is, what it isn't, what's next) → "where to track" links (pump.fun, pumpswap) → IP-voiced disclaimer.
2. Hard guardrail: the page must not promise gain. Strip any "BUY", "SWAP", "MOON", "100x" framing. The Nerm voice: *"you don't need this to play. you don't need this to win. you don't need this. that's the whole point."*
3. Defer until activation strategy decides whether token belongs on splash nav at all (per `project_activation_strategy.md`).

---

# Stage 7 — What this plan implies

## Summary of tags

| Tag | Count | Pages |
|---|---|---|
| **CANONICAL** | 2 | `register.html`, `nethara-live.html` |
| **POLISH** | 11 | `index`, `how-to-play`, `dashboard`, `profile`, `zone-detail`, `zone-battle`, `duels`, `gauntlet`, `spellbook`, `builder`, `packs`, `leaderboards` |
| **RETHINK** | 2 | `survivors.html`, `token.html` |
| **FLAG** | 1 | `wilds.html` |

## Two paths from here

This UX plan was written so that you can choose, with eyes open, between two next moves:

### Path A — TODO list (incremental polish)
Work through the **POLISH** items as discrete PRs. Each is small, low-risk, mergeable inside a day. Recommended order by ROI:

1. **Dashboard daily-pack promotion** + streak emphasis (highest retention lever).
2. **Spellbook codex completion %** + filtered-empty recovery + error state.
3. **Leaderboards "YOU" sticky row** + tap-to-profile.
4. **Profile badges interactivity** (tappable bottom-sheets).
5. **Packs daily streak boost surfacing.**
6. **Builder copy clean-up** ("Trinket slots unlock as your Nine levels").
7. **Mana cleanup PR** (resolves dead-code §9 entry + removes "1 MANA" from duels CTA).
8. **how-to-play accordion collapse** below the fold.
9. **zone-detail / zone-battle consolidation** decision (consolidate or document the split).

### Path B — Site-wide consistency overhaul
Treat the design.md style spec as the contract and re-skin the player-facing surfaces against it in coordinated batches. Stage order:

1. **Anchor pass** — verify `design.md` reads cleanly when fed to Claude Design / a generation agent. Spot-check tokens against `variables-v2.css`. (No code changes.)
2. **Arena polish & round-end dopamine** (`nethara-live.html`) — points-now reward feedback, XP slot now content-later, RNG drop roller deferred. Arena is unfrozen as of 2026-04-25.
3. **Survivors UX layer** (`survivors.html`) — title screen, in-run HUD, end-of-run summary, leaderboard. Net-new design surface.
4. **Token page rewrite** (`token.html`) — transparency-not-financial surface.
5. **Wilds investigation + decision** (`wilds.html`) — rewrite to vanilla, document JSX exception, or remove.
6. **Hub pass** (`dashboard.html`, `profile.html`) — daily-pack pulse, streak prominence, badge interactivity, sticky chrome.
7. **Library pass** (`spellbook.html`, `builder.html`, `packs.html`) — codex completion %, filtered-empty recovery, daily streak boost surfacing.
8. **Status pass** (`leaderboards.html`) — sticky "YOU" row, tap-to-profile.
9. **Onboarding pass** (`index.html`, `register.html`, `how-to-play.html`) — accordion collapse on how-to-play; the other two are already canonical.
10. **Cleanup pass** — mana cleanup PR (`duels.html`), zone-detail / zone-battle consolidation decision.

**Recommendation: Path B (site-wide consistency).** Wray's directive 2026-04-25: *"I want consistency in design site wide before making any new pages."* The arena freeze is lifted and the design.md is the new contract — running it across the site as a coordinated re-skin is the right move. Path A's incremental PRs are still valid as the *order* within Path B (steps 6–10 are essentially Path A), but the framing is "we're aligning the whole site to the spec," not "we're chipping away at a TODO list."

## Constraints in force

- **App feel, not website feel.** Design choices bias toward mobile-app idioms (tab bars, bottom-sheet modals, sticky bottom action chrome) — see `design.md` Section 1 + the "Don't" list in Section 7. The splash is the only allowed marketing surface; everywhere else is the app.
- **Mana system is dead code.** Any screen that surfaces mana cost copy (currently just `duels.html` — `1 MANA`) needs a coordinated cleanup PR with a §9 add-then-resolve entry.
- **No on-chain code.** Token page rewrite is presentational only.
- **§9.90 phone smoke pending.** Verify PRs #225 (CHAT/LOG unread badge) and #226 (fighter row dedupe) on Wray's phone before any new mobile-affecting work lands.
- **Arena polish unfrozen 2026-04-25.** The 3D-layer prototype ships through a native app build (out of scope for web). `nethara-live.html` is fair game for both replication-template duty AND direct polish.
