# Tasks: Nine Lives Network MVP

## Project Context & Summary

**Nine Lives Network** is a Twitter-based social-competitive game where players join magical schools and compete for territory control in the fantasy world of Avaloris. Players cast spells by replying to daily objective tweets.

### Tech Stack
- **Frontend:** HTML/CSS/JS, Leaflet.js for interactive map
- **Backend:** Node.js/Express.js
- **Database:** Supabase (PostgreSQL)
- **APIs:** Twitter API v2, Anthropic API (Claude Haiku for Nerm AI)
- **Hosting:** Replit Reserved VM (24/7)

### Live URLs
- **Game:** `https://cb75e2f0-c05f-4b97-af9e-a947d0ee3043-00-3ac7yv0i64smk.spock.replit.dev`
- **Twitter:** @9LVNetwork (game bot), @9LV_Nerm (AI personality bot)

### Key Accounts
- **Twitter Dev Portal:** Has two apps - one for @9LVNetwork, one for @9LV_Nerm
- **Supabase Project:** nine-lives-network
- **Replit Project:** Nine Lives Network

---

## Progress Summary

| Phase | Task | Status |
|-------|------|--------|
| 0.0 | Project Setup | ✅ COMPLETE |
| 1.0 | Database Schema | ✅ COMPLETE |
| 2.0 | Website Foundation & Splash | ✅ COMPLETE |
| 3.0 | Authentication & Registration | ✅ COMPLETE |
| 4.0 | Player Dashboard | ✅ COMPLETE |
| 5.0 | Interactive Map | ✅ COMPLETE |
| 6.0 | Leaderboards | ✅ COMPLETE |
| 7.0 | Twitter Bot (@9LVNetwork) | ✅ COMPLETE |
| 8.0 | Spell Casting & Game Engine | ✅ COMPLETE |
| 9.0 | Territory Control | ✅ COMPLETE |
| 10.0 | Points & Scoring | ✅ COMPLETE |
| 11.0 | Nerm Bot (@9LV_Nerm) | ✅ COMPLETE |
| 12.0 | Bounty System | ⬜ DEFERRED (Phase 2) |
| 13.0 | Testing & Polish | ✅ 95% COMPLETE |
| 14.0 | Beta Launch | ✅ DEPLOYED |
| 15.0 | Community Setup | ⬜ NEW |
| 16.0 | Tokenomics & Launch | ⬜ NEW |
| 17.0 | Telegram Bot/Game | ⬜ NEW |

---

## Relevant Files

### Frontend (Public)
- `public/index.html` - Splash page with wizard cat video + world showcase
- `public/dashboard.html` - Player dashboard with mana, stats, objectives
- `public/map.html` - Interactive Leaflet.js map of Avaloris
- `public/leaderboards.html` - Players, schools, communities leaderboards
- `public/register.html` - Twitter OAuth registration + school selection
- `public/how-to-play.html` - Game guide
- `public/css/styles.css` - Main stylesheet (N64 low-poly aesthetic)
- `public/assets/images/` - Wizard cat video, Nerm PFP, environment images

### Backend (Server)
- `server/index.js` - Express.js server entry point
- `server/config/supabase.js` - Supabase client configuration
- `server/routes/auth.js` - Twitter OAuth routes
- `server/routes/players.js` - Player data routes
- `server/routes/map.js` - Zone data routes
- `server/routes/leaderboards.js` - Leaderboard data routes
- `server/routes/admin.js` - Admin control endpoints
- `server/services/twitterBot.js` - @9LVNetwork bot (objectives, results)
- `server/services/nermBot.js` - @9LV_Nerm AI bot (Claude Haiku powered)
- `server/services/territoryControl.js` - Zone control calculations
- `server/services/activityDecay.js` - Activity penalties
- `server/services/scheduler.js` - Cron jobs for automation

### Documentation
- `ADMIN_COMMANDS.md` - Complete admin command reference
- `TASKS_STATUS.md` - Progress tracking
- `README.md` - Project overview

---

## Automated Schedule (UTC)

| Time | Action |
|------|--------|
| Every 15 min | Process spell casts (when objective active) |
| 08:00 | Post daily objective |
| 14:00 | Nerm afternoon post (50% chance) |
| 22:00 | Nerm daily roast |
| 23:00 | End of day processing + post results |
| 00:00 | Reset all player mana to 5 |
| 01:00 | Activity decay check |
| 03:00 | Nerm existential moment (30% chance) |

---

## Tasks

### Phase 1: MVP (COMPLETE)

- [x] 0.0 Project Setup & Configuration ✅ COMPLETE
  - [x] 0.1 Create Replit project (Node.js)
  - [x] 0.2 Initialize git repository
  - [x] 0.3 Create `.gitignore`
  - [x] 0.4 Create `package.json`
  - [x] 0.5 Install dependencies (express, cors, dotenv, @supabase/supabase-js, twitter-api-v2, node-cron, @anthropic-ai/sdk)
  - [x] 0.6 Configure Replit Secrets
  - [x] 0.7 Create folder structure
  - [x] 0.8 Create Express server
  - [x] 0.9 Verify server starts

- [x] 1.0 Database Schema & Supabase Setup ✅ COMPLETE
  - [x] 1.1 Create Supabase project
  - [x] 1.2 Create `schools` table (9 schools with colors, emojis)
  - [x] 1.3 Create `players` table (twitter_handle, twitter_id, school_id, mana, points, etc.)
  - [x] 1.4 Create `zones` table (14 zones - 9 home, 5 neutral)
  - [x] 1.5 Create `zone_control` table
  - [x] 1.6 Create `casts` table
  - [x] 1.7 Create `seasons` table
  - [x] 1.8 Seed schools and zones data
  - [x] 1.9 Configure RLS policies

- [x] 2.0 Website Foundation & Splash Page ✅ COMPLETE
  - [x] 2.1 Create CSS variables for theme
  - [x] 2.2 Create base styles (N64 aesthetic)
  - [x] 2.3 Create splash page with wizard cat video
  - [x] 2.4 Add world showcase (4 environment images)
  - [x] 2.5 Add Nerm section with PFP
  - [x] 2.6 Create How to Play page
  - [x] 2.7 Mobile responsive design

- [x] 3.0 Authentication & Registration System ✅ COMPLETE
  - [x] 3.1 Twitter API v2 setup
  - [x] 3.2 Twitter OAuth 2.0 flow
  - [x] 3.3 Registration page with school selection
  - [x] 3.4 Community tag input
  - [x] 3.5 Profile image URL support
  - [x] 3.6 School lock-in warning
  - [ ] 3.7 Wallet connection (DEFERRED to Phase 2)
  - [ ] 3.8 Account validation rules (DISABLED for alpha)

- [x] 4.0 Player Dashboard ✅ COMPLETE
  - [x] 4.1 Player profile display
  - [x] 4.2 Mana display (blue orbs)
  - [x] 4.3 Points display (seasonal + lifetime)
  - [x] 4.4 Current objective (dynamic from API)
  - [x] 4.5 Cast history
  - [x] 4.6 Rank displays
  - [x] 4.7 Logout functionality

- [x] 5.0 Interactive Map of Avaloris ✅ COMPLETE
  - [x] 5.1 Leaflet.js setup
  - [x] 5.2 Zone polygons with school colors
  - [x] 5.3 Zone click for details
  - [x] 5.4 Current objective highlight (pulsing)
  - [x] 5.5 Control percentages display
  - [x] 5.6 Auto-refresh every 5 minutes

- [x] 6.0 Leaderboards System ✅ COMPLETE
  - [x] 6.1 Players leaderboard
  - [x] 6.2 Schools leaderboard
  - [x] 6.3 Communities leaderboard
  - [x] 6.4 Current player highlighting
  - [x] 6.5 Tab navigation

- [x] 7.0 Twitter Integration - @9LVNetwork ✅ COMPLETE
  - [x] 7.1 Create @9LVNetwork account
  - [x] 7.2 Twitter Developer App setup
  - [x] 7.3 Post daily objective tweets
  - [x] 7.4 Post daily results tweets
  - [x] 7.5 Admin endpoints for manual control
  - [x] 7.6 Store tweet IDs for reply tracking

- [x] 8.0 Spell Casting & Game Engine ✅ COMPLETE
  - [x] 8.1 Reply scraping from Twitter
  - [x] 8.2 Any reply = valid spell cast
  - [x] 8.3 Point calculation (base 10 + bonuses)
  - [x] 8.4 School flair detection (+2 points)
  - [x] 8.5 Word count bonus (+3 for 10-30, +5 for 30+)
  - [x] 8.6 Home zone bonus (+20%)
  - [x] 8.7 Nerm noticed bonus (+20, 10% random)
  - [x] 8.8 Mana deduction
  - [x] 8.9 Cast recording in database
  - [x] 8.10 Spell of the Day manual bonus (+50)

- [x] 9.0 Territory Control System ✅ COMPLETE
  - [x] 9.1 Zone control calculations
  - [x] 9.2 Control percentages by school
  - [x] 9.3 Daily winner determination
  - [x] 9.4 Winner bonuses (+5 to participants)
  - [x] 9.5 End of day processing
  - [x] 9.6 Zone control table updates

- [x] 10.0 Points & Scoring System ✅ COMPLETE
  - [x] 10.1 Individual points tracking
  - [x] 10.2 School points aggregation
  - [x] 10.3 Community points aggregation
  - [x] 10.4 Activity decay (3-7 days inactivity)
  - [x] 10.5 Inactive player handling

- [x] 11.0 Twitter Integration - @9LV_Nerm ✅ COMPLETE
  - [x] 11.1 Create @9LV_Nerm account
  - [x] 11.2 Separate Twitter Developer App
  - [x] 11.3 AI-powered responses (Claude Haiku)
  - [x] 11.4 Grumpy floating cat head personality
  - [x] 11.5 Scheduled posts (daily roast, afternoon, existential)
  - [x] 11.6 Rate limiting (max 10 posts/day)
  - [x] 11.7 Crypto roasting ("the orange one")
  - [x] 11.8 Admin endpoints for manual Nerm control

- [ ] 12.0 Bounty System ⬜ DEFERRED TO PHASE 2
  - [ ] 12.1 Bounty creation system
  - [ ] 12.2 HP tracking
  - [ ] 12.3 Damage dealing
  - [ ] 12.4 Reward distribution
  - [ ] 12.5 Kill shot bonus

- [x] 13.0 Testing, Polish & Mobile Optimization ✅ 95% COMPLETE
  - [x] 13.1 Registration flow tested
  - [x] 13.2 Dashboard working
  - [x] 13.3 Map working
  - [x] 13.4 Leaderboards working
  - [x] 13.5 Spell casting working
  - [x] 13.6 Fixed Supabase ambiguous relationship bugs
  - [ ] 13.7 Full mobile testing (ongoing)
  - [ ] 13.8 Edge case handling (ongoing)

- [x] 14.0 Beta Launch Preparation ✅ DEPLOYED
  - [x] 14.1 Reserved VM deployment
  - [x] 14.2 All secrets configured
  - [x] 14.3 Scheduled jobs running
  - [x] 14.4 Admin commands documented
  - [ ] 14.5 Terms of Service (TODO)
  - [ ] 14.6 Privacy Policy (TODO)
  - [x] 14.7 How to Play page created

---

### Phase 2: Community & Token (NEW)

- [ ] 15.0 Community Setup
  - [ ] 15.1 Create secure Telegram channel
    - [ ] 15.1.1 Create main announcement channel (one-way)
    - [ ] 15.1.2 Create community chat group
    - [ ] 15.1.3 Set up admin roles and permissions
    - [ ] 15.1.4 Configure anti-spam (Combot or Rose bot)
    - [ ] 15.1.5 Create channel rules/pinned message
    - [ ] 15.1.6 Set up slow mode for chat
    - [ ] 15.1.7 Create verification system for new members
    - [ ] 15.1.8 Link channel to @9LVNetwork Twitter for cross-posting
  - [ ] 15.2 Create secure Discord server
    - [ ] 15.2.1 Create server with proper category structure
    - [ ] 15.2.2 Set up roles (Admin, Mod, Verified, School roles for each of 9 schools)
    - [ ] 15.2.3 Configure channel permissions (read-only announcements, gated channels)
    - [ ] 15.2.4 Set up verification system (Captcha bot or similar)
    - [ ] 15.2.5 Create welcome channel with rules
    - [ ] 15.2.6 Set up school-specific channels (only visible to school members)
    - [ ] 15.2.7 Create game-updates channel linked to @9LVNetwork
    - [ ] 15.2.8 Set up Nerm bot channel for AI interactions
    - [ ] 15.2.9 Configure anti-raid protection
    - [ ] 15.2.10 Create mod-only channels and audit logs
    - [ ] 15.2.11 Set up role assignment bot (link Discord to game account)

- [ ] 15.3 Increase Social Media Posting Frequency
  - [ ] 15.3.1 Update @9LVNetwork scheduler (target 6-8 posts/day)
    - [ ] Add 12:00 UTC midday standings update
    - [ ] Add 16:00 UTC afternoon reminder ("4 hours left!")
    - [ ] Add 20:00 UTC final push ("Last chance to cast!")
    - [ ] Add milestone posts (first cast of day, 10th cast, etc.)
    - [ ] Add hourly mini-updates during peak hours (optional)
  - [ ] 15.3.2 Update @9LV_Nerm scheduler (target 5-8 posts/day)
    - [ ] Add 09:00 UTC morning grumpy post (100% chance)
    - [ ] Increase 14:00 UTC afternoon to 100% chance
    - [ ] Add 17:00 UTC evening complaint
    - [ ] Keep 22:00 UTC daily roast (100%)
    - [ ] Increase 03:00 UTC existential to 80% chance
    - [ ] Add reaction to first cast of the day
    - [ ] Increase reply chance on player casts (from 5% to 15%)
  - [ ] 15.3.3 Add dynamic content variety
    - [ ] Create more tweet templates for variety
    - [ ] Add school-specific callouts
    - [ ] Add rivalry mentions between schools
    - [ ] Add weather/mood of Avaloris flavor text

- [ ] 16.0 Tokenomics & Token Launch
  - [ ] 16.1 Token Design
    - [ ] 16.1.1 Define token name and ticker (e.g., $9LV or $NERM)
    - [ ] 16.1.2 Choose blockchain (Solana recommended for low fees)
    - [ ] 16.1.3 Define total supply (suggested: 1 billion)
    - [ ] 16.1.4 Create token allocation breakdown
  - [ ] 16.2 Token Allocation (suggested)
    - [ ] 16.2.1 Community/Players: 40% (game rewards, airdrops)
    - [ ] 16.2.2 Treasury/Development: 20% (locked, for future development)
    - [ ] 16.2.3 Team: 15% (vested over 2 years with cliff)
    - [ ] 16.2.4 Liquidity: 15% (DEX liquidity pool)
    - [ ] 16.2.5 Marketing/Partnerships: 10%
  - [ ] 16.3 Token Utility Design
    - [ ] 16.3.1 Spell enhancements (spend tokens for bonus effects)
    - [ ] 16.3.2 Bounty creation (stake tokens to create bounties)
    - [ ] 16.3.3 School treasury (schools accumulate tokens)
    - [ ] 16.3.4 Governance voting (future feature)
    - [ ] 16.3.5 Cosmetic purchases (future feature)
  - [ ] 16.4 Vesting & Unlock Schedule
    - [ ] 16.4.1 Team tokens: 6-month cliff, then 24-month linear vest
    - [ ] 16.4.2 Treasury: Unlocked by governance votes
    - [ ] 16.4.3 Community: Released through gameplay over seasons
  - [ ] 16.5 Token Launch Execution
    - [ ] 16.5.1 Create token on Solana (using Token Program)
    - [ ] 16.5.2 Set up multi-sig wallet for treasury
    - [ ] 16.5.3 Create liquidity pool on Raydium/Orca
    - [ ] 16.5.4 List on DEX aggregators (Jupiter)
    - [ ] 16.5.5 Apply for CoinGecko/CoinMarketCap listing
  - [ ] 16.6 Integration with Game
    - [ ] 16.6.1 Add wallet connection to registration (Phantom, Solflare)
    - [ ] 16.6.2 Create token reward distribution system
    - [ ] 16.6.3 Build claim page for player rewards
    - [ ] 16.6.4 Implement on-chain leaderboard snapshots

- [ ] 17.0 Telegram Bot/Game
  - [ ] 17.1 Bot Setup
    - [ ] 17.1.1 Create Telegram bot via @BotFather
    - [ ] 17.1.2 Get bot token and configure
    - [ ] 17.1.3 Set up Node.js bot using `telegraf` or `node-telegram-bot-api`
    - [ ] 17.1.4 Deploy bot to same Replit or separate service
    - [ ] 17.1.5 Link bot to Supabase database
  - [ ] 17.2 Game Concept: "Nerm's Tower" (vertical scrolling adventure)
    - [ ] 17.2.1 Design: Players climb a tower, each message = one floor
    - [ ] 17.2.2 New messages push old ones up (natural Telegram flow)
    - [ ] 17.2.3 Each floor has random encounter (monster, treasure, trap, rest)
    - [ ] 17.2.4 Players use school abilities (Ember = attack, Tidal = heal, etc.)
    - [ ] 17.2.5 Nerm provides sarcastic commentary at random floors
  - [ ] 17.3 Core Mechanics
    - [ ] 17.3.1 `/start` - Begin climb, show character stats
    - [ ] 17.3.2 `/climb` - Ascend one floor, trigger random event
    - [ ] 17.3.3 `/attack` - Fight monster on current floor
    - [ ] 17.3.4 `/spell [name]` - Cast school-specific spell
    - [ ] 17.3.5 `/rest` - Skip turn, recover HP
    - [ ] 17.3.6 `/stats` - Show current HP, floor, points
    - [ ] 17.3.7 `/leaderboard` - Show top climbers
  - [ ] 17.4 Integration with Main Game
    - [ ] 17.4.1 Link Telegram account to Twitter game account
    - [ ] 17.4.2 Tower progress gives bonus points in main game
    - [ ] 17.4.3 School affiliation carries over
    - [ ] 17.4.4 Shared leaderboard between platforms
  - [ ] 17.5 Nerm Integration
    - [ ] 17.5.1 Random Nerm comments during gameplay
    - [ ] 17.5.2 AI-generated roasts for deaths
    - [ ] 17.5.3 Nerm as floor boss at milestone floors
    - [ ] 17.5.4 `/nerm` command to ask Nerm anything
  - [ ] 17.6 Rewards & Progression
    - [ ] 17.6.1 Daily climb limit (uses same mana as Twitter game)
    - [ ] 17.6.2 Floor milestones give token rewards (when launched)
    - [ ] 17.6.3 Weekly tower reset with leaderboard prizes
    - [ ] 17.6.4 Rare item drops that affect main game

---

## Environment Variables Required

### Replit Secrets
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SESSION_SECRET=xxx
NODE_ENV=development
PORT=5000

# @9LVNetwork (main game bot)
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_BEARER_TOKEN=xxx
TWITTER_CLIENT_ID=xxx
TWITTER_CLIENT_SECRET=xxx
NINELIVES_ACCESS_TOKEN=xxx
NINELIVES_ACCESS_SECRET=xxx

# @9LV_Nerm (personality bot - separate app)
NERM_API_KEY=xxx
NERM_API_SECRET=xxx
NERM_ACCESS_TOKEN=xxx
NERM_ACCESS_SECRET=xxx

# AI
ANTHROPIC_API_KEY=sk-ant-xxx

# Admin
ADMIN_KEY=42069FSO9JR3XJQ39d8q9e81x9k1109293id302193di10
```

### Future (Phase 2)
```
# Telegram Bot
TELEGRAM_BOT_TOKEN=xxx

# Solana
SOLANA_RPC_URL=xxx
TOKEN_MINT_ADDRESS=xxx
TREASURY_WALLET=xxx
```

---

## Admin Commands Quick Reference

### Game Control
```bash
# View stats
curl "http://localhost:5000/api/admin/stats" -H "x-admin-key: YOUR_KEY"

# Process casts manually
curl -X POST "http://localhost:5000/api/admin/process-casts" -H "x-admin-key: YOUR_KEY"

# Post objective
curl -X POST "http://localhost:5000/api/admin/post-objective" -H "x-admin-key: YOUR_KEY"

# End of day
curl -X POST "http://localhost:5000/api/admin/end-of-day-current" -H "x-admin-key: YOUR_KEY"
```

### Nerm Control
```bash
# Generate response (no post)
curl -X POST "http://localhost:5000/api/admin/nerm-generate" \
  -H "x-admin-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Someone just cast a terrible spell"}'

# Post as Nerm
curl -X POST "http://localhost:5000/api/admin/nerm-post" \
  -H "x-admin-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "watching."}'
```

---

## Monitoring

### Check Deployment Logs
Replit → Deployments tab → Click deployment → Logs

### Check What Happened Overnight
1. Check @9LVNetwork Twitter for posted tweets
2. Check @9LV_Nerm Twitter for Nerm posts
3. Run stats command
4. Check Supabase dashboard for activity

### Common Issues
- **Login janky:** Deployment runs separately from Shell. Don't need to run `npm start` manually.
- **Supabase errors:** Usually ambiguous relationship - need to fetch player data separately from casts.
- **Nerm not posting:** Check rate limit status, check ANTHROPIC_API_KEY credits.

---

## For Next Chat Session

### Step 1: Upload These Files From Replit
Upload these files at the START of your new chat so Claude can see your codebase:

**Essential (upload these):**
1. `MASTER_TASKS.md` - This file (full task list & context)
2. `ADMIN_COMMANDS.md` - Admin reference
3. `server/index.js` - Server entry point
4. `server/services/scheduler.js` - Cron jobs (what runs automatically)
5. `server/services/twitterBot.js` - @9LVNetwork bot logic
6. `server/services/nermBot.js` - @9LV_Nerm AI bot logic

**If working on specific features, also upload:**
- `server/routes/admin.js` - Admin endpoints
- `server/services/territoryControl.js` - Zone control logic
- `public/dashboard.html` - If fixing dashboard
- `public/index.html` - If fixing homepage

### Step 2: Copy This Context Message

```
# Nine Lives Network - Continuing Development

## What This Is
Twitter-based wizard game where players join 1 of 9 magical schools and compete for territory in Avaloris by replying to daily objective tweets.

## Tech Stack
- Frontend: HTML/CSS/JS, Leaflet.js for map
- Backend: Node.js/Express.js on Replit
- Database: Supabase (PostgreSQL)
- Twitter: @9LVNetwork (game bot), @9LV_Nerm (AI personality bot)
- AI: Anthropic Claude Haiku powers Nerm's responses
- Hosting: Replit Reserved VM (24/7)

## Current Status
- MVP COMPLETE and DEPLOYED (Tasks 0-11, 13-14)
- Game is live and functional
- Next: Increase posting frequency, community setup, tokenomics

## Live URLs
- Game: https://cb75e2f0-c05f-4b97-af9e-a947d0ee3043-00-3ac7yv0i64smk.spock.replit.dev
- Twitter: @9LVNetwork, @9LV_Nerm

## Key Files Structure
```
nine-lives-network/
├── public/
│   ├── index.html          # Splash page
│   ├── dashboard.html      # Player dashboard
│   ├── map.html            # Interactive map
│   ├── leaderboards.html   # Leaderboards
│   ├── register.html       # Registration
│   ├── how-to-play.html    # Guide
│   └── assets/images/      # Wizard cat, Nerm, environments
├── server/
│   ├── index.js            # Express entry point
│   ├── config/
│   │   └── supabase.js     # DB client
│   ├── routes/
│   │   ├── auth.js         # Twitter OAuth
│   │   ├── admin.js        # Admin controls
│   │   ├── players.js      # Player data
│   │   ├── map.js          # Zone data
│   │   └── leaderboards.js # Leaderboard data
│   └── services/
│       ├── twitterBot.js   # @9LVNetwork bot
│       ├── nermBot.js      # @9LV_Nerm AI bot
│       ├── scheduler.js    # Cron jobs
│       ├── territoryControl.js
│       └── activityDecay.js
├── MASTER_TASKS.md         # Full task list
└── ADMIN_COMMANDS.md       # Admin reference
```

## Current Automated Schedule (UTC)
| Time | Action |
|------|--------|
| Every 15 min | Process spell casts |
| 08:00 | Daily objective tweet |
| 14:00 | Nerm afternoon (50%) |
| 22:00 | Nerm daily roast |
| 23:00 | End of day results |
| 00:00 | Mana reset |
| 03:00 | Nerm existential (30%) |

## What I Need Help With
[DESCRIBE YOUR SPECIFIC TASK OR ISSUE]

## Files Attached
[LIST THE FILES YOU UPLOADED]
```

### Step 3: Describe What You Need
Be specific about what you want to accomplish. Examples:
- "Increase posting frequency - add midday updates and more Nerm posts"
- "Fix bug in leaderboards - showing wrong scores"
- "Set up Discord server with proper permissions"
- "Start building Telegram bot"

### Pro Tips for Best Results
1. **Upload files first** - Claude can read them and understand your code
2. **Be specific** - "Add 12:00 UTC standings post" is better than "post more"
3. **One task at a time** - Don't ask for 5 things at once
4. **Show errors** - Screenshot any error messages
5. **Confirm changes** - After Claude gives you code, confirm you've updated Replit

---

## Schools Reference

| ID | Name | Emoji | Color |
|----|------|-------|-------|
| 1 | Ember Covenant | 🔥 | #FF4500 |
| 2 | Tidal Conclave | 🌊 | #1E90FF |
| 3 | Stone Covenant | 🪨 | #8B4513 |
| 4 | Zephyr Circle | 💨 | #87CEEB |
| 5 | Storm Assembly | ⚡ | #FFD700 |
| 6 | Umbral Syndicate | 🌑 | #4B0082 |
| 7 | Radiant Order | ✨ | #FFD700 |
| 8 | Arcane Spire | 🔮 | #9400D3 |
| 9 | WildCat Path | 🐱 | #228B22 |

## Zones Reference

| ID | Name | Type |
|----|------|------|
| 1-9 | School Home Zones | Home |
| 10 | Crystal Crossroads | Neutral |
| 11 | Mystic Falls | Neutral |
| 12 | Ancient Ruins | Neutral |
| 13 | Twilight Grove | Neutral |
| 14 | Dragon's Rest | Neutral |
