# Nine Lives Network

## Overview

Nine Lives Network is a Twitter-based social-competitive game where players join one of 9 magical schools (houses) and compete for territory control in the fantasy world of Nethara. Players cast spells by replying to tweets posted by the game bot (@9LVNetwork), earn points, and climb leaderboards. The game features an AI personality bot (@9LV_Nerm) powered by Anthropic's Claude that provides commentary on game events.

The project has a dual frontend architecture: a legacy static HTML/CSS/JS frontend served from `/public` (the actual game UI) and a newer React/Vite scaffold under `/client` that currently serves a generic placeholder page. The game logic, Twitter bot automation, and all core functionality live in the Express.js backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Dual Frontend Setup
- **Legacy Frontend (`/public/`)**: The actual game UI — static HTML pages with vanilla JS, CSS custom properties, Three.js for 3D elements on the splash page, and Leaflet.js for the interactive world map. Pages include: splash/landing (`index.html`), player dashboard (`dashboard.html`), world map (`world.html`), leaderboards (`leaderboards.html`), registration (`register.html`), how-to-play, privacy policy, and terms of service. This is served as Express static files.
- **React Frontend (`/client/`)**: A Vite + React + TypeScript scaffold with shadcn/ui components, TailwindCSS, and wouter for routing. Currently only has a placeholder home page and 404 page. Built output goes to `dist/public`. Uses path aliases: `@/` maps to `client/src/`, `@shared/` maps to `shared/`.

### Backend (`/server/`)
- **Runtime**: Node.js with Express.js (v5), written in CommonJS (`require`/`module.exports`), entry point is `server/index.js`
- **Routes**: Modular Express routers — `auth.js` (Twitter OAuth 2.0), `players.js`, `territory.js`, `duels.js`, `map.js`, `leaderboards.js`, `admin.js`
- **Services**: Business logic modules — `twitterBot.js` (game bot), `nermBot.js` (AI personality bot), `territoryControl.js` (zone control calculations), `activityDecay.js` (inactivity penalties), `livesReset.js` (daily life resets), `narratives.js` (story/lore engine with 40 rotating narratives across 25 zones), `scheduler.js` (cron jobs)
- **Admin API**: Protected by `x-admin-key` header, provides manual controls for daily game operations (post objectives, process spell casts, end-of-day calculations, reset mana, view stats)

### Database
- **Primary Database**: Supabase (PostgreSQL) accessed via `@supabase/supabase-js` client library. Two clients are used: a regular client (respects Row Level Security) for public reads, and an admin/service-role client (bypasses RLS) for server-side writes.
- **Drizzle ORM**: Configured in `drizzle.config.ts` and `shared/schema.ts` for a PostgreSQL database via `DATABASE_URL`. Currently the schema only defines a basic `users` table. The actual game tables (players, zones, casts, duels, territory_actions, daily_objectives, etc.) are managed directly in Supabase and accessed via the Supabase JS client, not Drizzle.
- **Key Tables** (in Supabase): `players`, `zones`, `casts`, `territory_actions`, `duels`, `daily_objectives`

### Game Loop & Scheduling
- Uses `node-cron` for automated jobs
- Spell processing runs every 2 minutes (checks Twitter replies)
- Daily cycle: morning objective post → process casts throughout day → end-of-day winner calculation → results post → midnight mana/lives reset
- Admin can trigger any step manually via API

### Authentication
- Twitter OAuth 2.0 for player registration and login
- OAuth states stored in-memory (Map) — not persistent across restarts
- Players authenticate via Twitter, choose a school during registration

### AI Integration
- Anthropic Claude (via `@anthropic-ai/sdk`) powers two features:
  1. Flavor text generation for game events (spell cast responses, narratives)
  2. The @9LV_Nerm bot personality — a spectral cat with a detailed character prompt

### Twitter Integration
- `twitter-api-v2` library for both bot accounts
- @9LVNetwork: Game bot that posts objectives, processes spell casts (reply-based), posts results
- @9LV_Nerm: AI personality bot that occasionally comments on game events (10% chance per cast)
- Separate API credentials for each bot account

### Build System
- Vite for client-side bundling (React app)
- esbuild for server-side bundling (via `scripts/build.ts`)
- Server runs directly via `node server/index.js` in development (no transpilation needed — it's CommonJS)

## External Dependencies

### Third-Party Services
- **Supabase**: PostgreSQL database hosting with Row Level Security, accessed via JS client library (not Drizzle ORM for game data)
- **Twitter API v2**: Two authenticated app accounts for game bot and AI personality bot
- **Anthropic API**: Claude AI for generating narrative text and powering the Nerm bot personality
- **Google Fonts**: Cinzel, Crimson Text, Press Start 2P, JetBrains Mono, DM Sans, Fira Code, Geist Mono, Architects Daughter

### Key Environment Variables
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (for Drizzle — may need Replit Postgres provisioning)
- `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`
- `TWITTER_BEARER_TOKEN`, `TWITTER_CALLBACK_URL`
- `NINELIVES_ACCESS_TOKEN`, `NINELIVES_ACCESS_SECRET` (for @9LVNetwork)
- `NERM_API_KEY`, `NERM_API_SECRET`, `NERM_ACCESS_TOKEN`, `NERM_ACCESS_SECRET` (for @9LV_Nerm)
- `ANTHROPIC_API_KEY`
- `ADMIN_KEY` (for admin API endpoints)
- `PORT` (defaults to 5000)

### NPM Dependencies (Notable)
- `express` v5, `cors`, `dotenv`, `node-cron`
- `@supabase/supabase-js`, `twitter-api-v2`, `@anthropic-ai/sdk`
- `drizzle-kit` (for schema management, though game data uses Supabase client directly)
- `vite`, `@vitejs/plugin-react`, `tailwindcss`, `tailwindcss-animate`
- `three.js` (via CDN for splash page 3D cat model)
- `leaflet.js` (referenced in docs for world map)