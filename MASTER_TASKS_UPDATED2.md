# Tasks: Nine Lives Network MVP

## Project Context & Summary

**Nine Lives Network** is a Twitter-based social-competitive game where players join magical houses and compete for territory control in the fantasy world of Avaloris. Players cast spells by replying to daily objective tweets. Crypto communities compete in daily Narrative Raids on Twitter.

### Tech Stack
- **Frontend:** HTML/CSS/JS, Three.js for 3D splash, custom territory map
- **Backend:** Node.js/Express.js
- **Database:** Supabase (PostgreSQL)
- **APIs:** Twitter API v2, Anthropic API (Claude for Nerm + narrative generation)
- **Hosting:** Replit Reserved VM (24/7)
- **Version Control:** GitHub (nine-lives-network repo)

### Live URLs
- **Game:** `https://nine-lives-network.replit.app`
- **Twitter:** @9LVNetwork (game bot + narrative raids), @9LV_Nerm (reply guy bot)

### Key Design Decisions
- **Scheduler:** Cleaned up — narrative raids replaced bounty system, Nerm is reply-guy only
- **Communities:** Identified by Solana contract address (auto-lookup ticker/name)
- **Community power chart:** Hero feature on leaderboards page
- **Narratives:** 4-tweet daily arc — tweet 1 pre-written, tweets 2-4 AI-generated from live data + images

---

## Current Priority Order

| # | Task | Status | Priority |
|---|------|--------|----------|
| 1 | Territory control bug — zones not flipping at midnight | 🔴 BUG | CRITICAL |
| 2 | Zone admin images not showing on live site | 🔴 BUG | HIGH |
| 3 | Splash page — move buttons below 3D model | 🟡 UI | HIGH |
| 4 | Community system rework — contract address lookup | 🔵 FEATURE | HIGH |
| 5 | Community power chart — hero on leaderboards | 🔵 FEATURE | HIGH |
| 6 | Narrative engine — Claude API for tweets 2-4 + image attachments | 🔵 FEATURE | MEDIUM |
| 7 | Rework narratives file (separate conversation) | 🔵 CONTENT | MEDIUM |
| 8 | Nav cleanup remaining pages | 🟡 UI | LOW |
| 9 | @handle font consistency | 🟡 UI | LOW |

---

## 1. 🔴 Territory Control Bug — Zones Not Flipping at Midnight

**Problem:** Players attack a zone, a house holds most influence, but at midnight the zone still isn't marked as controlled.

**Where to look:**
- `server/services/territoryControl.js` — `endOfDayProcessing()` function
- Scheduler fires this at 23:55 UTC
- Check: is the zone_control table being read correctly?
- Check: is the winner determination logic working?
- Check: is the zones table being updated with the winning school_id?

**Tasks:**
- [ ] 1.1 Add detailed logging to `endOfDayProcessing()` to trace exactly what's happening
- [ ] 1.2 Check if `zone_control` table has correct data at end of day
- [ ] 1.3 Verify winner determination logic (highest control % → wins zone)
- [ ] 1.4 Verify zones table is updated with winning `school_id`
- [ ] 1.5 Test manually via admin endpoint
- [ ] 1.6 Confirm fix works over a real day cycle

---

## 2. 🔴 Zone Admin Images Not Showing on Live Site

**Problem:** Images uploaded via zone-admin.html appear in the admin panel but not on the live world/map page.

**Where to look:**
- `public/zone-admin.html` — how are images being saved? (URL? Base64? Supabase storage?)
- `public/map.html` — how does the map load zone images?
- Check: are the image URLs/paths matching between admin save and map display?
- Check: is it a Supabase storage bucket permissions issue?

**Tasks:**
- [ ] 2.1 Check how admin saves images (what column, what format)
- [ ] 2.2 Check how map.html loads zone images (what column it reads)
- [ ] 2.3 Verify they match — fix the mismatch
- [ ] 2.4 Check Supabase storage bucket is set to public (if using storage)
- [ ] 2.5 Test: upload image in admin → confirm it shows on live map

---

## 3. 🟡 Splash Page — Move Buttons Below 3D Model

**Problem:** Buttons are hard to see on top of the wizard cat's yellow hat.

**Fix:** Move CTA buttons below the 3D canvas so they have their own space.

**Tasks:**
- [ ] 3.1 Edit `public/index.html` — restructure layout so buttons sit below the Three.js canvas
- [ ] 3.2 Ensure mobile responsive
- [ ] 3.3 Test on desktop + mobile

---

## 4. 🔵 Community System Rework — Contract Address

**Problem:** Current system uses a text tag ($BONK) entered at registration. Need to switch to Solana contract address with automatic ticker/name lookup.

**Changes needed:**
- Remove community tag from registration flow
- Add "Set Community" section on dashboard
- Player pastes Solana contract address
- System looks up coin name/ticker automatically (via DexScreener, Jupiter, or Birdeye API)
- Store: contract_address, ticker, coin_name in players table

**Tasks:**
- [ ] 4.1 Add columns to players table: `community_contract`, `community_ticker`, `community_name`
- [ ] 4.2 Create API endpoint: `POST /api/players/:id/community` — accepts contract address, looks up ticker
- [ ] 4.3 Build coin lookup service (`server/services/coinLookup.js`) — hit DexScreener/Jupiter API
- [ ] 4.4 Add "Set Community" card on dashboard with input field + save button
- [ ] 4.5 Remove community tag field from registration page
- [ ] 4.6 Update all references from `community_tag` to new fields across API routes
- [ ] 4.7 Migrate existing community_tag data if possible

---

## 5. 🔵 Community Power Chart — Hero on Leaderboards

**Problem:** The community power chart (Markets tab from previous session) isn't loading, possibly because of the community tag → contract address transition. It should be the MAIN feature of the leaderboards page, not hidden in a tab.

**Design:** Power chart is the hero section at the top of leaderboards. Player rankings and house standings are below.

**Tasks:**
- [ ] 5.1 Fix chart data source to work with new community system (contract address)
- [ ] 5.2 Move power chart to top of leaderboards page as hero section
- [ ] 5.3 Player/house leaderboard tables below the chart
- [ ] 5.4 Make chart visually compelling — this is the dopamine hook for communities
- [ ] 5.5 Include: community name, ticker, raider count, 7D trend, sparklines
- [ ] 5.6 Add raid win history to chart data (from narrative_raids table)

---

## 6. 🔵 Narrative Engine — Claude API + Images

**Problem:** Tweets 2-4 need to be AI-generated from live game data, and all 4 tweets need attached images.

**Tasks:**
- [ ] 6.1 Update `narrativeEngine.js` — add Claude API call for generating tweets 2-4
- [ ] 6.2 Pass live standings + tweet 1 text + theme as context to Claude
- [ ] 6.3 Add image upload to Twitter posts (images stored as 1.1.png, 1.2.png etc.)
- [ ] 6.4 Store narrative images in Supabase storage or public/assets
- [ ] 6.5 Update narratives data format (from separate conversation rework)
- [ ] 6.6 Add raids API route to server/index.js
- [ ] 6.7 Test full 4-tweet cycle

---

## 7. 🔵 Rework Narratives File

**Status:** Prompt written (PROMPT_rework_narratives.md). Do this in a separate conversation.

- [ ] 7.1 Paste existing narratives + prompt into new conversation
- [ ] 7.2 Get all ~40 narratives converted to new format (tweet_1 + AI prompts for 2-4)
- [ ] 7.3 Generate 4 images per narrative (1.1-1.4 naming convention)
- [ ] 7.4 Upload to project

---

## 8. 🟡 Nav Cleanup (Remaining Pages)

Delegated to Replit AI previously. Check if done, if not:

- [ ] 8.1 dashboard.html — remove War Room, add Logout
- [ ] 8.2 arena.html — remove War Room, add Logout
- [ ] 8.3 how-to-play.html — remove War Room, add Logout

---

## 9. 🟡 @handle Font Consistency

- [ ] 9.1 All Twitter handles across site: Press Start 2P, 9px
- [ ] 9.2 Target: dashboard, leaderboards, map, modals

---

## Completed Work

| Task | Date |
|------|------|
| Crystal Towers hero visual on World page | Feb 9 |
| Markets tab with community power charts (drafted) | Feb 9 |
| Zone admin tool (zone-admin.html) | Feb 9 |
| Logout buttons on map.html + leaderboards.html | Feb 9 |
| War Room removed from map.html + leaderboards.html | Feb 9 |
| Scheduler rewrite — clean, narrative raids + reply-guy Nerm | Feb 9 |
| narrativeEngine.js — 4-tweet raid system | Feb 9 |
| raids.js API routes | Feb 9 |
| narrative_raids DB migration | Feb 9 |
| Prompt for narratives file rework | Feb 9 |

---

## Files Delivered This Session

| File | Purpose | Deploy To |
|------|---------|-----------|
| `narrativeEngine.js` | Core raid engine | `server/services/narrativeEngine.js` |
| `scheduler.js` | Clean scheduler rewrite | `server/services/scheduler.js` (REPLACE) |
| `raids.js` | Raid API routes | `server/routes/raids.js` |
| `narrative_raids_migration.sql` | Database table | Run in Supabase SQL Editor |
| `PROMPT_rework_narratives.md` | Prompt for separate conversation | Reference only |

---

## Deployment Checklist (for files from this session)

- [ ] Create branch: `git checkout -b feature/scheduler-rewrite`
- [ ] Run `narrative_raids_migration.sql` in Supabase SQL Editor
- [ ] Replace `server/services/scheduler.js` with new version
- [ ] Add `server/services/narrativeEngine.js`
- [ ] Add `server/routes/raids.js`
- [ ] Register raids route in `server/index.js`:
  ```js
  const raidsRoutes = require('./routes/raids');
  app.use('/api/raids', raidsRoutes);
  ```
- [ ] Commit: `git commit -m "feat: scheduler rewrite + narrative raid system"`
- [ ] Push + PR + Merge
- [ ] `git checkout main && git pull && git branch -d feature/scheduler-rewrite`
- [ ] Republish in Replit

---

## Houses Reference

| ID | Name | Emoji | Color |
|----|------|-------|-------|
| 1 | Smoulders | 🔥 | #FF4444 |
| 2 | Darktide | 🌊 | #00CED1 |
| 3 | Stonebark | 🌿 | #55CC44 |
| 4 | Ashenvale | 💨 | #98FB98 |
| 5 | Stormrage | ⚡ | #FFBB00 |
| 6 | Nighthollow | 🌙 | #CC44DD |
| 7 | Dawnbringer | ☀️ | #FFD700 |
| 8 | Manastorm | 🔮 | #6699EE |
| 9 | Plaguemire | ☠️ | #88CC66 |

---

## Git Workflow Reminder

```bash
git checkout main
git pull origin main
git checkout -b feature/[name]

# work...

git add .
git commit -m "type: description"
git push origin feature/[name]

# GitHub → PR → Merge

git checkout main
git pull origin main
git branch -d feature/[name]

# Republish in Replit
```
