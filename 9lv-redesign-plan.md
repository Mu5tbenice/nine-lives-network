# Nine Lives Network — Full Redesign Plan

## Status: DESIGN PHASE COMPLETE → READY FOR IMPLEMENTATION

---

## Pages Designed (Prototypes Built)

| Page | Prototype | Key Features |
|------|-----------|-------------|
| Registration | ✅ 9lv-full-redesign.jsx | 3-step: Connect 𝕏 → Choose House → Community Tag (via contract address) |
| Dashboard | ✅ 9lv-full-redesign.jsx + dashboard-v2.html | Story card w/ image, stats, streak, War Room mini, recent activity |
| World | ✅ 9lv-full-redesign.jsx | House influence, territory cards w/ attack/defend, story banner |
| Leaderboards | ✅ 9lv-full-redesign.jsx | Players/Houses/Communities tabs, chart data, profile links |
| War Room | ✅ community-markets.jsx + 9lv-full-redesign.jsx | D3 power chart, CoinGecko-style table, head-to-head |
| Arena | ✅ 9lv-full-redesign.jsx | Coming soon preview, battle format, equipment teaser |
| How to Play | ✅ 9lv-points-structure.jsx | Visual 3-tier points system, daily examples, streak multipliers |

---

## Design System (Shared Across All Pages)

### Colors
```css
--bg-deep:       #0a0812
--bg-mid:        #0d0a14
--bg-card:       rgba(255, 255, 255, 0.035)
--border-subtle: rgba(255, 255, 255, 0.07)
--gold-warm:     #D4A64B
--gold-dim:      rgba(212, 166, 75, 0.15)
--gold-border:   rgba(212, 166, 75, 0.35)
--text-bright:   #F0ECF8
--text-body:     #CCC5DB
--text-muted:    #847C98
--text-faint:    #554E68
--cyan:          #00D4FF
--green:         #00c864
--red:           #ff4444
--live-green:    #00ff88
```

### Typography
- **Titles:** Cinzel (serif, 600-700 weight)
- **Body:** Crimson Text (serif, italic for descriptions)
- **Data/Labels:** Press Start 2P (monospace, UPPERCASE, small)
- **Code/Meta:** JetBrains Mono (monospace)

### Components
- Cards: glass effect, subtle borders, rounded corners (12px)
- Gold buttons: gradient with 3D shadow (box-shadow: 0 4px 0)
- Mana orbs: cyan gradient radial with glow
- Lives: heart emoji with opacity for empty
- Badges: colored pill with border (Nerm Noticed, MVP, etc.)
- Sparklines: D3 mini charts with gradient fill
- Change %: green ▲ / red ▼ pills

---

## Outstanding Decisions / Refinements Needed

### 1. Community Tag via Contract Address
- **Registration step 3:** Input field for Solana contract address
- **System:** Pulls ticker symbol automatically from on-chain data
- **Dashboard:** Shows resolved ticker ($BONK, $WIF etc.)
- **Editable:** Players can update from dashboard settings
- **TODO:** Decide which API to use for CA → ticker resolution (Birdeye? Jupiter? DexScreener?)

### 2. Recent Activity (renamed from "Recent Casts")
- Covers all actions: story replies, territory attacks/defends, achievements
- Each entry shows: zone/action name, time, points earned, optional badge

### 3. Leaderboard Enhancements
- Each player row links to their 𝕏 profile
- Badges shown: House crest, community tag, streak fire icon
- Expandable rows with mini performance chart (7d sparkline)
- Communities tab shows chart data (sparklines, 24h change)

### 4. Points Structure (FINALIZED)
See 9lv-points-structure.jsx for full visual breakdown.

**𝕏 Battlefield (~60% of daily points):**
- Reply to story: 20 pts
- Like story post: 5 pts
- Retweet: 10 pts
- Quote tweet: 15 pts
- Quality short reply (10-30 words): +5
- Quality detailed reply (30+ words): +10
- Quality roleplay/creative: +15
- Nerm's Pick (AI selects 1-3 best): +25

**War Room / Territory (~30%):**
- Attack a zone: 8 pts (costs 1 mana)
- Defend a zone: 8 pts (costs 1 mana)
- All mana spent bonus: +5
- Zone captured (House wins): +10
- Zone held 3+ days: +3/day passive
- Objective zone: ×1.5 multiplier

**Streak Multipliers (~10%):**
- 3-day streak: ×1.1
- 7-day streak: ×1.2
- 14-day streak: ×1.3
- First activity of day: +5

**Daily earning potential:**
- Casual (reply + like): ~25-30 pts
- Active (𝕏 + territory): ~100 pts
- Grinder (everything + streak): ~140+ pts

---

## Implementation Order

### Phase 1: Shared Foundation
**Branch:** `style/design-system-v2`
- [ ] Create `/css/variables-v2.css` with all design tokens
- [ ] Create `/css/components-v2.css` with shared card, button, badge styles
- [ ] Update `/css/nav.css` with new nav design
- [ ] Add Google Fonts link (Cinzel, Crimson Text, Press Start 2P, JetBrains Mono)
- [ ] Merge → main

### Phase 2: Dashboard
**Branch:** `style/dashboard-v2`
- [ ] Replace `dashboard.html` with new design
- [ ] Wire up existing APIs (/api/players, /api/zones/objective, /api/leaderboards/schools)
- [ ] Add streak display (may need backend addition)
- [ ] Add War Room mini (needs /api/communities/stats — can mock initially)
- [ ] Test on mobile
- [ ] Merge → main

### Phase 3: Registration
**Branch:** `style/register-v2`
- [ ] Replace `register.html` with 3-step flow
- [ ] Contract address input for community tag
- [ ] Wire up existing Twitter OAuth
- [ ] Merge → main

### Phase 4: World Page
**Branch:** `style/world-v2`
- [ ] Replace `map.html` / `world.html` with new design
- [ ] Territory cards with environment images
- [ ] House influence rankings
- [ ] Attack/defend buttons wired to existing /api/territory/action
- [ ] Merge → main

### Phase 5: Leaderboards
**Branch:** `style/leaderboards-v2`
- [ ] Replace `leaderboards.html`
- [ ] 3 tabs: Players, Houses, Communities
- [ ] Add 𝕏 profile links, badges, sparklines
- [ ] Merge → main

### Phase 6: War Room (NEW PAGE)
**Branch:** `feat/war-room`
- [ ] Create `warroom.html`
- [ ] D3 power chart (needs community history data)
- [ ] Rankings table with sparklines
- [ ] Head-to-head matchups
- [ ] Create `/api/communities/stats` endpoint
- [ ] Create `community_daily_stats` database table
- [ ] Add nav link
- [ ] Merge → main

### Phase 7: How to Play
**Branch:** `style/help-v2`
- [ ] Replace `how-to-play.html` with points structure visual
- [ ] 3-tier breakdown, daily examples, FAQ
- [ ] Merge → main

### Phase 8: Arena
**Branch:** `style/arena-v2`
- [ ] Replace/create `arena.html` with coming soon preview
- [ ] Merge → main

### Phase 9: Backend Updates
**Branch:** `feat/points-v2`
- [ ] Update points calculation to match new structure
- [ ] Add streak tracking (consecutive days)
- [ ] Add community stats aggregation
- [ ] Add Nerm's Pick logic
- [ ] Add quality reply detection (word count tiers)
- [ ] Merge → main

---

## Database Additions Needed

### community_daily_stats (NEW)
```sql
CREATE TABLE community_daily_stats (
  id SERIAL PRIMARY KEY,
  community_tag TEXT NOT NULL,
  contract_address TEXT,
  game_day DATE NOT NULL,
  total_points INTEGER DEFAULT 0,
  participant_count INTEGER DEFAULT 0,
  active_today INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Player table additions
```sql
ALTER TABLE players ADD COLUMN streak INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN last_active_date DATE;
ALTER TABLE players ADD COLUMN contract_address TEXT;
```

---

## Nav Structure (Final)
```
Nine Lives Network    Dashboard | World | Leaderboards | War Room | Arena | Help | Logout
```

---

## Files Created During Design Phase
1. `9lv-dashboard-redesign.jsx` — Initial dashboard prototype (React)
2. `dashboard-v2.html` — Production-ready dashboard HTML
3. `community-markets.jsx` — War Room standalone prototype
4. `9lv-full-redesign.jsx` — Complete 7-page site prototype
5. `9lv-points-structure.jsx` — Points system visual / How to Play
6. `9lv-redesign-plan.md` — This document
