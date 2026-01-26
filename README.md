# Nine Lives Network 🐱✨

A social-competitive game on Twitter where wizard cats compete for territory control in the fantasy world of Avaloris.

## Overview

Nine Lives Network is a game where players:
- Join one of **9 magical schools**
- Cast spells by **replying to tweets**
- Compete for **territory control** on a fantasy map
- Earn points and climb **leaderboards**
- Optionally connect **Solana wallets** for NFT features

## Tech Stack

- **Frontend:** HTML/CSS/JavaScript, Three.js, Leaflet.js
- **Backend:** Node.js, Express.js
- **Database:** Supabase (PostgreSQL)
- **Platform:** Twitter API v2
- **Blockchain:** Solana (Phase 2)

## Getting Started

### Prerequisites

- Node.js 18+
- Twitter Developer Account (API access)
- Supabase Account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your credentials
4. Run the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

See `.env.example` for required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `TWITTER_API_KEY` - Twitter API credentials
- `TWITTER_API_SECRET` - Twitter API secret
- `TWITTER_BEARER_TOKEN` - Twitter bearer token
- And more...

## Project Structure

```
nine-lives-network/
├── public/             # Frontend files
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side JavaScript
│   └── assets/         # Images, models, etc.
├── server/             # Backend files
│   ├── config/         # Configuration (Supabase, Twitter)
│   ├── routes/         # API routes
│   ├── engine/         # Game logic
│   ├── twitter/        # Twitter integration
│   ├── jobs/           # Scheduled tasks
│   └── index.js        # Server entry point
├── database/           # SQL schemas and seeds
├── .env.example        # Environment template
├── package.json        # Dependencies
└── README.md           # This file
```

## Scripts

- `npm start` - Run production server
- `npm run dev` - Run development server with auto-reload
- `npm test` - Run tests

## The Nine Schools

| School | Element | Color |
|--------|---------|-------|
| Ember Covenant | Fire | Deep Red |
| Tidal Conclave | Water | Ocean Blue |
| Stone Covenant | Earth | Brown |
| Zephyr Circle | Air | Sky Blue |
| Storm Assembly | Lightning | Electric Yellow |
| Umbral Syndicate | Shadow | Deep Purple |
| Radiant Order | Light | White |
| Arcane Spire | Arcane | Silver |
| WildCat Path | Chaos | Rainbow |

## Key Accounts

- **@9LVNetwork** - Main game account (objectives, results)
- **@9LV_Nerm** - Personality bot (roasts, observations)

## License

MIT

---

Built with 🐱 by @Mu5tb3n1ce