# $9LV Listing Submission Reference

**Purpose:** canonical data for all listing submissions (CoinGecko, CoinMarketCap, GeckoTerminal, Crypto.com, exchanges). Every field filled once here; future submissions reuse.

**Last updated:** April 18, 2026
**Maintainer:** @Mu5tb3n1ce

Keep this current. When any field changes (new wallet, new pool, new social channel, new lock), update here first, then propagate to any pending submissions.

---

## 1. Basic Token Information

| Field | Value |
|---|---|
| Token Name | Nine Lives Network |
| Symbol | 9LV (often prefixed `$9LV` in marketing) |
| Chain | Solana |
| Contract Address | `CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump` |
| Decimals | 6 |
| Total Supply | 1,000,000,000 (1 billion, fixed forever) |
| Max Supply | 1,000,000,000 |
| Is Infinite | No |
| TGE Date | 2026-02-22 (from Streamflow vesting contract start) |

---

## 2. Official Links

### Primary
| Purpose | URL |
|---|---|
| Main website | https://9lv.net |
| Token page | https://9lv.net/token |
| Whitepaper (PDF) | https://github.com/Mu5tbenice/nine-lives-network/blob/main/docs/whitepaper-v1.pdf |
| GitHub | https://github.com/Mu5tbenice/nine-lives-network |

### Social
| Channel | URL |
|---|---|
| Twitter (main) | https://twitter.com/9LVNetwork |
| Twitter (Nerm bot) | https://twitter.com/9LV_Nerm |
| Telegram | `[PENDING — user setting username now, will be t.me/<username>]` |
| Discord | https://discord.gg/g6zUWW9gPE |

### Project contact
| Type | Value |
|---|---|
| Project email (official) | ninelivesnetwork@protonmail.com |
| Personal Telegram | @Mustbenice (also: https://t.me/Mustbenice) |
| Project lead Twitter | https://twitter.com/Mu5tb3n1ce |

---

## 3. Trading Venues

### Trading Pair #1 — PumpSwap (automatic from Pump.fun graduation)
| Field | Value |
|---|---|
| Exchange | PumpSwap |
| Base / Quote | 9LV / SOL |
| How created | Automatic at Pump.fun bonding curve graduation |
| LP status | Burned permanently at graduation |
| Trade URL | https://pump.fun/coin/CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump |
| Alt URL | https://swap.pump.fun/?input=So11111111111111111111111111111111111111112&output=CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump |

### Trading Pair #2 — Raydium (manually seeded by project)
| Field | Value |
|---|---|
| Exchange | Raydium |
| Base / Quote | 9LV / USDC |
| How created | Manually seeded by project from dev wallet |
| Pool AMM ID | `6XZ4h4mKoX4sbiCmE4g5rBmJMgKiz4Js4kBLsD3jmRJ6` |
| Trade URL | https://raydium.io/swap/?inputCurrency=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputCurrency=CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump |
| Pool explorer | https://solscan.io/account/6XZ4h4mKoX4sbiCmE4g5rBmJMgKiz4Js4kBLsD3jmRJ6 |
| USDC mint (Solana) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

---

## 4. Block Explorers

| Explorer | URL |
|---|---|
| Solscan (primary) | https://solscan.io/token/CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump |
| Solana Explorer | https://explorer.solana.com/address/CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump |
| Birdeye | https://birdeye.so/token/CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump |
| DexScreener | https://dexscreener.com/solana/CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump |
| Jupiter (buy) | https://jup.ag/swap/SOL-CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump |
| Top Holders | https://solscan.io/token/CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump#holders |

---

## 5. Supply & Distribution

### Circulating vs. Locked
| Amount | Status |
|---|---|
| 1,000,000,000 | Total & max supply (fixed forever) |
| 610,000,000 | Circulating (61%) |
| 210,000,000 | Locked via Streamflow vesting (21%) |
| 140,000,000 | Locked via Streamflow cliff locks (14%) |
| 40,000,000 | Held in seasons & staking reserve (4%) |

### Locked/Vested Wallets (on-chain, publicly verifiable)
| Wallet | Contents | Address |
|---|---|---|
| Player Rewards Receiver | 213M (across 3 vesting streams) | `AhzNW36BQgzcQnQK8f4s2feE14k92jpMxqgTdZuAyQC4` |
| Team + Dev Lock | 140M (100M team cliff + 40M dev cliff) | `A3WSisHEVfpWuBkKB9mjU3Nrvik5VMDMr7bFJqdoBCHu` |
| Seasons & Staking | 40M | `9woAbtBqMu8jbzen8QtXScBbhr7LywXexZWpTTsiAkhA` |
| Community Rewards Vesting source | 180M (source) | `BTJgtrxVq6tMfeGrGdThxHnJ1EYbUmu33RKAX6CrhTTm` |

### Streamflow Lock Dashboard
https://app.streamflow.finance/token-dashboard/solana/mainnet/CMSgLxMAtGnmZBthMp6kqqjL8QceAaRkFCdxP8Xnpump?type=lock

---

## 6. Initial Token Allocation

| # | Allocation | Amount | % | TGE % | Cliff (mo) | Vesting (mo) | Schedule |
|---|---|---|---|---|---|---|---|
| 1 | Public Circulation (Pump.fun + Raydium LP) | 610M | 61.0% | 100% | 0 | 0 | At TGE |
| 2 | Community Rewards Vesting | 180M | 18.0% | 0% | 0 | 24 | Linear monthly |
| 3 | Bonus Rewards Vesting | 33M | 3.3% | 0% | 0 | 24 | Linear |
| 4 | Team Lock | 100M | 10.0% | 0% | 12 | 0 | Cliff — all at once on 2027-03-01 |
| 5 | Dev Wallet Lock | 40M | 4.0% | 0% | 18 | 0 | Cliff — all at once on 2027-08-12 |
| 6 | Seasons & Staking Reserve | 37M | 3.7% | 0% | 0 | 24 | Gradual — deployed as prize pools and staking rewards |
| | **Total** | **1,000M** | **100.0%** | | | | |

Note on allocation math: token page says 4% Seasons & Staking (40M). Actual residual after summing the other five lock categories is 37M (3.7%). The site's round number is imprecise by 3M. When finalized in listings, use the exact 37M to balance to 100%. Low priority cleanup.

### Staking
| Field | Value |
|---|---|
| Platform | Streamflow |
| APY | 15% |
| Min stake | 30 days |
| Pool capacity | 200M $9LV |
| Current pool funding | 15M $9LV |
| Pool expires | March 2028 |
| URL | https://app.streamflow.finance/staking/solana/mainnet/HU8donvhbdmE8aQeaeWBezDBjbwMK6ifBix2MF1JM1C4 |

---

## 7. Token Categories (for CoinGecko, CoinMarketCap)

**Primary category:** Gaming / GameFi
**Secondary category:** Play-to-Earn (P2E)
**Tertiary category:** Solana Ecosystem

See `submissions-description.md` (below) for the 250-char rationale per category.

---

## 8. Token Utility & Mechanics Summary

### What $9LV does
- Conversion medium for in-game points (1 point = 1 $9LV, 7-day vest post-claim)
- Currency for cosmetic items in the game (titles, card art, zone naming, season passes)
- Stakable on Streamflow for 15% APY (30-day min)
- Wizard Rank qualifier (holding unlocks cosmetic perks, not combat power)

### What $9LV is NOT used for
- No gameplay power (spell upgrades, combat advantages, etc.)
- No exclusive combat content for holders
- No point multipliers for rank
- Token spending is opt-in, never required to play

### Deflationary mechanics
- Pack purchase burns (portion of every in-game pack buy)
- Cosmetic sink burns (portion of every cosmetic spend)
- Buyback burns from Pump.fun creator fees (100% of repurchased tokens burned)
- Seasonal treasury burns (every 60 days)
- Unclaimed rewards burns (at season end)
- NFT mint burns (Season 2+)

All burn transactions announced on Twitter by @9LV_Nerm with on-chain hash.

---

## 9. Project Descriptions (ready to paste into listing forms)

### Short description (1-sentence tagline)
> Nine Lives Network is a card-collection auto-battler with an honest token economy, where $9LV is earned through gameplay and converts to tradable tokens at the player's discretion.

### Elevator description (1 paragraph, ~400 chars)
> Nine Lives Network is a card collection auto-battler set in a fictional world called Nethara. Players register through Twitter, select one of nine houses, and deploy in-game characters called Nines to contest zones on a map through round-based auto-battles. The game runs across a web battlefield and a Twitter-native daily narrative called the Chronicle, with both surfaces feeding one leaderboard. The $9LV token on Solana serves as the optional conversion medium for in-game points.

### Uniqueness / differentiation (~400 chars)
> Nine Lives Network is designed as a game-first project with the token as an optional layer. Players are not required to connect a wallet to play, and all gameplay is free. Token conversion from points to $9LV is opt-in. The project maintains an explicit no-pay-to-win commitment: $9LV is not used to purchase gameplay advantages, and in-game sinks are limited to cosmetic and convenience items. Game state is database-backed while the token layer remains on-chain.

### History (~400 chars)
> The Nine Lives Network project began development in 2025 and launched the $9LV token on Solana via Pump.fun on February 22, 2026. Immediately after launch, 180 million tokens were locked into a 24-month linear vesting contract on Streamflow for player rewards. The token was paired with USDC on Raydium as a standard AMM liquidity pool. Additional vesting streams and cliff locks totaling 353 million tokens were subsequently established. The game is currently in closed beta ahead of Season 1 public launch.

### Roadmap (~400 chars)
> The immediate development focus is the completion of a unified scoring pipeline that connects in-game actions to the public leaderboard, required before exiting closed beta. Following that, Season 1 public launch will open registration to all users, running a 60-day competitive season with $9LV prize payouts. Season 2 introduces a Genesis NFT collection of 2,500 characters called The Nines, each with eight equippable trait slots affecting appearance and combat.

### Utility (~400 chars)
> $9LV serves two functions in Nine Lives Network. First, as the conversion medium for in-game points, claimable at 1 point to 1 $9LV with a 7-day vesting window before tokens become tradeable. Second, $9LV is spent on in-game cosmetic and convenience items (custom titles, card art variants, zone naming rights, season passes). Token holders are eligible for Wizard Rank tiers providing cosmetic perks only. $9LV can be staked on Streamflow at 15% APY.

### Category rationales (~250 chars each)

**Gaming / GameFi rationale:**
> Nine Lives Network is a card collection auto-battler game where $9LV is the token used within the game's economy. Players earn in-game points through combat and territory control, with $9LV serving as the optional conversion medium. The token is spent on in-game cosmetic items. $9LV utility is fundamentally tied to the game and has no separate financial instrument use case. GameFi categorization is appropriate because the token's primary function is in-game economic activity.

**Play-to-Earn rationale:**
> Nine Lives Network implements a play-to-earn model where in-game points convert to $9LV tokens at a published ratio of 1 point to 1 $9LV, with a 7-day anti-dump vesting window. Points are earned exclusively through gameplay and cannot be purchased. The rewards pool of 210 million $9LV vests over 24 months via Streamflow, releasing approximately 8.75 million tokens monthly into a publicly verifiable receiver wallet.

**Solana Ecosystem rationale:**
> Nine Lives Network and its $9LV token are native to the Solana blockchain. The token was deployed on Solana via Pump.fun on February 22, 2026 and currently trades on PumpSwap (native Solana DEX) and Raydium. All vesting, staking, and lock contracts are managed through Streamflow Finance, a Solana-native infrastructure provider. The project does not maintain a multi-chain presence.

---

## 10. Token Image

- File: `public/assets/images/token/9lv-logo.png`
- Dimensions: 200 × 200 px
- Format: PNG with transparency, 8-bit RGBA
- File size: 57 KB
- Meets CoinGecko's 200×200 preferred spec

---

## 11. Listing Submission Checklist

### CoinGecko — submitted [DATE] — request ID [number]
- [ ] Form submitted
- [ ] Request ID received via email
- [ ] Verification tweet posted from @9LVNetwork with request ID + GeckoTerminal URL
- [ ] Listing approved / pending / rejected

### CoinMarketCap — future
- [ ] Form submitted
- [ ] Verification process
- [ ] Listing approved

### GeckoTerminal — typically auto-listed after CoinGecko approval
- [ ] Verify listing appears after CoinGecko approval

### Other target venues
- [ ] Crypto.com watchlist
- [ ] DefiLlama tokens list
- [ ] CoinPaprika

---

## 12. Verification Posts

When submitting to any listing platform that requires a verification post, the template is:

```
Nine Lives Network is being listed on [PLATFORM].

Request ID: [NUMBER]
[PLATFORM] URL: [URL]

For verification purposes. Official channels: 9lv.net | @9LVNetwork | ninelivesnetwork@protonmail.com
```

**Post from:** @9LVNetwork on Twitter (official project account, not personal).

---

## Maintenance Notes

- When a new lock is created via Streamflow, add the wallet address to §5.
- When a new trading venue opens, add to §3.
- When a new social channel goes live, add to §2.
- When token supply metrics shift (e.g., after burns), update §5 circulating count.
- When listing application status changes, update §11.
- All section references here assume this doc is canonical — if anything conflicts with the token page at 9lv.net/token, reconcile and update both.
