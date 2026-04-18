# Nine Lives Network

A card-collection auto-battler with an honest token economy, running inside crypto Twitter.

**Status:** Closed beta. Live at [9lv.net](https://9lv.net).
**Token:** $9LV on Solana. Contract `CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump`. See [9lv.net/token](https://9lv.net/token).
**Roadmap:** Season 1 public launch follows scoring unification. Season 2 introduces the Nines Genesis NFT collection.

---

## What is this?

9LN is a card-collection auto-battler set in Nethara, a world inhabited by cat warriors called Nines. Players pick one of nine houses, deploy their Nine to zones on a map, and fight round-based auto-battles for territory. Alongside the web game, a daily four-act story called the Chronicle runs on Twitter — players reply in character as their Nine, and replies feed the same leaderboard as zone battles.

Both surfaces earn points. Points convert to $9LV tokens, if the player wants them to. Playing is free. Wallets are optional. There is no pay-to-win.

For the full project vision, token economics, and design philosophy, read the [whitepaper](./docs/whitepaper-v1.pdf).

## Repository structure

This is the working repository for the 9LN web application, Chronicle bot, and supporting infrastructure. A Node.js/Express backend with Supabase (Postgres) for game state, Pixi.js for live combat rendering, and Socket.io for real-time updates. The $9LV token is on-chain via Solana, with vesting and staking managed through Streamflow.

- `server/` — Node.js Express backend, combat engine, routes, bots
- `public/` — Static frontend, HTML/CSS/JS with Pixi.js arena
- `database/` — Schema dump and SQL seeds
- `tasks/` — Canonical PRD and rollout task list
- `docs/` — Whitepaper, game bible, architectural decisions
- `scripts/` — Tooling for schema dump, data migration, health checks
- `client/` — Legacy React scaffold (marked for removal, see task 5.8)

## The canonical documents

Three documents describe 9LN more accurately than any code comment could:

- **[tasks/prd-9ln-product.md](./tasks/prd-9ln-product.md)** — The canonical product requirements document. §9 is the live bug ledger; every known issue is tracked here against a specific file and line of code.
- **[tasks/tasks-prd-9ln-rollout.md](./tasks/tasks-prd-9ln-rollout.md)** — The execution plan for closed-beta-to-launch. Organized in phases; time estimates per parent task.
- **[9LN_GAME_BIBLE.md](./9LN_GAME_BIBLE.md)** — Current game design (Combat V4, Zone V2). Authoritative for stats, effects, zones, combat formulas.

PRs that resolve §9 entries update the PRD in the same commit (see the PRD discipline section in [CLAUDE.md](./CLAUDE.md)). Nothing is deleted from §9 — entries are marked resolved with the PR number and date, preserving history.

## How it works, briefly

- Players register via Twitter, no wallet required
- They pick a house (nine available, each with different stats and roles)
- They deploy their Nine to zones on the map with a three-card loadout
- Combat is deterministic and server-authoritative; clients render what the server broadcasts
- Rounds end when one guild is the last standing or a 5-minute cap hits
- Points accumulate across zone combat, Chronicle replies, duels, and gauntlet runs
- At any time, players can claim points as $9LV tokens (1:1 ratio, 7-day vest)

The on-chain layer is deliberately narrow. Tokens, vesting, LP, buybacks, and burns happen on Solana. Game state, card inventories, deployments, points — all of it lives in Postgres because that is what Postgres is good at and what on-chain storage is terrible at.

## State of the project

9LN is solo-led by [@Mu5tb3n1ce](https://twitter.com/Mu5tb3n1ce). The project is in closed beta. Active development focus is the scoring pipeline unification (PRD §9.1 and §9.2) that gates public launch.

**Working:** combat runs, the token trades, the Chronicle posts daily, guild branding updates on zones, the daily pack system ships cards to all registered players.

**In active development:** scoring unification, onboarding polish, items system, post-level-10 progression.

**Deferred to Season 2+:** the Nines NFT collection, expanded items, full Wizard Rank rollout.

To play: open [9lv.net](https://9lv.net) and follow the prompts.
To watch development: follow [@9LVNetwork](https://twitter.com/9LVNetwork) on Twitter.

## Contributing

The project does not accept external pull requests at this stage of closed beta. The code is public to enable transparency for investors, partners, and curious developers. Feedback, bug reports, and feature discussion are welcome via GitHub Issues.

## Contact

- Investor and partnership inquiries: `ninelivesnetwork@protonmail.com`
- General and fast back-and-forth: Telegram [@Mustbenice](https://t.me/Mustbenice)
- Game-related: Twitter [@9LVNetwork](https://twitter.com/9LVNetwork)
- Project author: [@Mu5tb3n1ce](https://twitter.com/Mu5tb3n1ce)

## License

[Proprietary — all rights reserved.](./LICENSE) See LICENSE file for full terms.
