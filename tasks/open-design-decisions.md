# Open Design Decisions

Parking lot for game / product design questions that aren't yet canonical. Items here are **candidates, not commitments** — do not treat as authoritative.

Each entry includes:
- **Status** — Open | In discussion | Decided (awaiting PRD merge) | Closed
- **Opened** — date the item was logged
- **Context** — why this surfaced
- **Current thinking** — options on the table
- **Open questions** — what needs to be resolved before decision

When a decision lands, status flips to **Decided (awaiting PRD merge)**. A focused PR then moves the content into `tasks/prd-9ln-product.md` with a §9 entry closing the drift.

---

## 1. Token sinks: redirect fees away from burns

**Status:** Open
**Opened:** 2026-04-21

**Context:** Current tokenomics (see `public/tokens.html`) specifies burns on NFT sales, pack revenue, and fees. Wray prefers directing fees toward LP liquidity or repopulating the rewards vesting pool — burning only reduces total supply without helping distribution. This is a piece of a **larger tokenomics optimisation PR**, not a quick patch.

**Current thinking:**
- Fee destinations to evaluate (non-exclusive): (a) LP liquidity provision, (b) rewards vesting pool top-up, (c) staker yield, (d) some split of the above.
- Season passes and cosmetics could be unlocked by **staking** (time-locked, tokens returned) rather than by burn — creates buy pressure without destroying supply.
- Two staking mental models to pick between:
  - **Pure time-lock** — stake X tokens for a season → unlock; tokens returned at season end. Zero token loss.
  - **Hybrid** — everyone can burn to buy; stakers get a discount or free access while staked. Two demand tiers.

**Open questions:**
- Pure time-lock or hybrid model?
- Fee split: how much to LP vs rewards vesting?
- What stays a burn (if anything) vs what converts to stake-unlock or LP-redirect?
- Scope cut: what lands in the tokenomics optimisation PR vs. what waits?

---

## 2. Points-to-token vesting shape

**Status:** Open
**Opened:** 2026-04-21

**Context:** No Solana backend yet. Vesting design is a placeholder until wallet linking / distribution is built. Currently all points are tracked off-chain only.

**Current thinking:**
- Archive proposal (Feb 2026): 7-day delay (earn → claimable), 100-point minimum per redemption, 1 redemption per wallet per 24h, wallet must be linked 7+ days before first redemption.
- Claude's instinct as a starting point: short cushion (3–5 days) + no slashing. Enough to smooth sell pressure without feeling punitive.

**Open questions:**
- Delay length: 0 / 3–5 / 7 / 14+ days?
- Early-exit penalty: none, or slash / cooldown for heavy claims before going inactive?
- Do all points vest equally, or do source-specific rules apply (e.g. X-engagement points vs zone-play points)?
- Sybil defence at redemption time (wallet age, stake requirement, etc.)?

---

## 3. Nerm interaction streak rewards

**Status:** Open
**Opened:** 2026-04-21

**Context:** Wray identifies this as a **core design choice** — Nerm rewards cards / drops for interaction streaks. Currently not represented in `tasks/prd-9ln-product.md` (grep confirms). Supersedes the pruned "Arcane Energy" concept from the Feb archive.

**Current thinking:**
- Nerm is the dispenser; streaks trigger rewards (card drops, pack rewards, possibly tokens later).
- Sits alongside Chronicle engage-to-earn on X as one of several interaction surfaces.
- Ties into the broader game-wide engage-to-earn goal — multiple independent ways to earn, with X carrying the lion's share by design.

**Open questions:**
- What qualifies as an "interaction streak" — consecutive days of any in-game action, X-engagement-specific, or a mix?
- Reward ladder shape — what do the 3 / 7 / 14 / 30-day thresholds grant?
- Rate limiting / anti-farming defences?
- Relationship to any existing streak multiplier system in the codebase (needs verification during design).
- Does a token reward component belong here, or is this cards / cosmetics / pack-drops only?

---

## 4. Boss redesign — random spawn into arena rounds

**Status:** Open
**Opened:** 2026-04-21

**Context:** Current canon (`tasks/prd-9ln-product.md` §4.17.4, `9LN_GAME_BIBLE.md`) describes Boss as its own mode — a weekly guild PvE raid (Mon–Fri). Wray has reframed: Boss is NOT its own mode. It's a concept where a boss sprite spawns randomly into a round in one of the arenas, changes game mechanics for that round, and does something (TBD) when it dies. Needs its own PR. Everything beyond this core concept is undesigned; do not import details from the archive proposals.

**Current thinking:**
- Boss = a sprite spawned into a random arena's round, not a standalone mode.
- Its presence alters round mechanics while it's alive.
- Something happens when it dies — specifics TBD.

**Open questions:**
- Spawn trigger and frequency.
- What mechanics change during a boss round.
- Reward, and who receives it on death.
- Interaction with the round's normal last-guild-standing end condition.
- Fate of canon's weekly-boss-as-own-mode sections (rewrite or remove) when this lands.

---

## 5. Social hangout / drop-opening room

**Status:** Open
**Opened:** 2026-04-22

**Context:** Wray sketched a basic hangout page that would integrate Supabase data into charts and metrics, host a chat room, and serve as the place where players congregate to open their drops. Reinforces the "favourite space to hang out" retention angle and the "check in every hour" session shape from `project_vision.md`. Lore-named over "War Room" — that name clashes with the hangout vibe.

**Current thinking:**
- Core = Supabase data dashboards (interesting metrics, leaderboards, countdowns) + live chat + communal pack/drop opening.
- Communal drop-opening is a proven format (Twitch drops, stream raids); creates a reason to be logged in when not actively playing.
- Candidate names: **The Campfire** (cozy / tribal), **The Scratching Post** (playful / flavor-rich), **The Den** (cat-appropriate / safe-space), **The Respawn** (ties directly to the nine-lives metaphor — drops = "pull a new life").
- **Shelved (revisit later):** $9LV-token rarity-betting on others' pack opens. Reasons to defer — gambling regulatory exposure (US prediction-market law), escrow/oracle/payout infra cost, risk of the token feeling casino-first. Non-token "good call" badges / kudos / reputation are a cheaper substitute that delivers the same social dopamine; revisit token-backed only if the format proves out non-monetarily.

**Open questions:**
- Final name choice.
- Mandatory drop opening here, or optional / opt-in?
- Live chat moderation model (auto-mod, Nerm-as-room-host, both)?
- First scope cut — chat + dashboards only, or include communal drop opening from day one?
- Telegram parity — does the same room concept extend to Telegram, or is this site-only?

---

## 6. NFT collection: anti-Sybil gate + item mirror + SOL-funded buyback

**Status:** Core model decided; pricing number and secondary-market policy still open
**Opened:** 2026-04-22
**Updated:** 2026-04-22

**Context:** Originally framed as the answer to the registration-gate / anti-Sybil tension in `tasks/tasks-prd-9ln-rollout.md` task 7.3. Expanded in a second design pass (same day) to cover collection design, trait-to-item mirroring, acquisition paths, and where proceeds go. Needs to be finished before tokens are redeemable — gates the token-economy launch.

**Decided:**
- **Primary purpose:** anti-Sybil gate for $token claim. Only NFT holders can redeem points → tokens. Gameplay and points-earning remain open to all.
- **Collection shape:** randomly generated, PFP-style. Traits on the NFT correspond 1:1 to in-game items. Snapshot-at-mint — no live/dynamic updates.
- **Supply:** 2000–2500 NFTs total. Allocation split across three buckets:
  - Wray-held (direct distribution by Wray to aligned individuals / giveaways).
  - Whitelist (hand-delivered to aligned communities and KOLs as a "limited club invite" per `project_activation_strategy.md`).
  - Open-market mint.
- **Head-start into the drop pool:** when a wallet holding an NFT links to a player account, the in-game items corresponding to the NFT's traits are inserted into that player's inventory as a one-time grant. A lucky trait roll = rare items from day one. Non-holders catch up over time via the items drop system (Decision #8).
- **Not pay-to-win:** every item in the NFT trait set is also earnable by non-holders through drops once #8 ships. NFT holder gets a time advantage, not a permanent power gap.
- **Payment model (open-market mint only):** **SOL-priced, not $9LV-priced.** Whitelist and Wray-held NFTs are free. Rationale: selling the $9LV that came in as NFT payment would create sell pressure on the token (counter-intuitive); SOL inflows can instead fund constructive actions on $9LV.
- **SOL proceeds destination:** primarily $9LV market buyback + LP depth (creates buy pressure on $9LV from a primary-sales event); secondarily operational treasury. Matches Wray's broader preference pattern (convert SOL inflows into $9LV constructively; don't sell received $9LV back out).
- **Inventory delivery mechanism:** at wallet-link time, read the wallet's current NFT holdings → resolve traits → insert corresponding rows into `player_items` flagged as NFT-sourced. No ongoing chain sync; no live polling.
- **Transfer behavior:** items **stay** in the player's inventory even if the NFT is later transferred. Items are off-chain stat modifiers with no trade value and no farm incentive, so propagation across former holders is acceptable. If NFT later moves to a new wallet and that wallet links, the new holder also gets the items (benefit propagates through the chain of linked holders).
- **Sybil gate not weakened by item propagation:** token claim checks *current* NFT ownership per wallet at claim time, not link history. Transferring the NFT strips claim rights from the sender even though their inventory remains.

**Still open:**
- **Exact NFT mint price (SOL).** Fixed flat rate is recommended over bonding curves at this supply (simpler to message, easier to reason about). Number and any trait-rarity-tiered pricing undesigned.
- **SOL proceeds split** between $9LV buyback + LP vs operational treasury (percentage, cadence, execution mechanism). Ties into Decision #1.
- **Whitelist specifics:** which communities, how many NFTs each, selection / distribution process.
- **Secondary market access (Tensor / Magic Eden):** post-mint liquidity, price floor expectation, whether floor is actively defended or allowed to drift.
- **One-NFT-one-claimer enforcement:** per-NFT cooldowns, lifetime caps, or just per-wallet at claim time?
- **Vesting interaction with #2:** do NFT holders get a shorter points-to-token vesting delay, or same shape as non-holders?
- **Collection timing:** does the NFT ship with MVP or later? Token claim cannot go live until the NFT is minted and wallet-linking is wired.

**Known properties worth acknowledging (not open questions — stating so they're not surprises):**
- **Item grants propagate through holders.** Every wallet that holds the NFT and links during that hold receives a permanent item grant. Over time, total items-granted-via-NFT > total NFTs.
- **Secondary-buyer benefit parity.** A buyer who purchases a whitelisted NFT on secondary gets the same in-game benefits as the original whitelist recipient. Standard NFT behavior; don't fight it.

**Implementation prep (tracked here so it isn't forgotten when the NFT build starts):**
- Schema work: `items` table needs a `nft_trait_id` (or equivalent) field so traits map to items. Not in place today. Wray confirmed this is a prep task for when the NFT workflow begins.
- Wallet-link flow needs a "read NFT holdings → resolve traits → insert items" step.
- `project_character_art_and_nft.md` memory should stay aligned as these decisions firm up (currently references this decision correctly).

---

## 7. Sharpness restoration: same-card vs cross-card consumption

**Status:** Open
**Opened:** 2026-04-22

**Context:** Per `project_gameplay_loop.md`, cards lose sharpness per arena round used and revert to common-tier stats at 0%. Restoration consumes duplicates — but Wray flagged "consume the same card (or a different card??)" as undecided. Surfacing now so the existing sharpening UI / mechanics work doesn't lock in an answer by silent default.

**Current thinking:**
- **Same-card-only (recommended).** Your duplicate of *this card* matters to *this card*. Preserves duplicate-specificity and keeps the "another duplicate, useful again" dopamine loop tight. Maximises pack-buying pressure since restoring your favourite card requires opening more packs hoping for that card.
- **Cross-card (any-of-equal-rarity).** More forgiving to players unlucky on duplicates of their preferred card; reduces frustration but weakens pack-buy pressure and dilutes the duplicate-specificity feel.
- **Hybrid — same-card normal restoration + universal "shards / dust" from sacrificing duplicates.** Hearthstone disenchant model. Treat as a separate later mechanism, not a competitor to the primary restoration rule. If pursued, design after the same-card rule has been live long enough to know if there's a real need.

**Open questions:**
- Same-card-only or cross-card?
- Restoration math — how much sharpness does one duplicate restore? Linear, diminishing, fixed bucket?
- If cross-card: does rarity matching apply (Legendary restored only by Legendary, etc.)?
- Should sharpness depletion rate vary by rarity (Legendary cards deplete slower since they're harder to replace)?
- Any token-cost component layered on top?

---

## 8. Items drop / loot-box system (primary item acquisition path)

**Status:** Open (unchanged; NFT discussion confirmed this decision is not replaced)
**Opened:** 2026-04-22
**Updated:** 2026-04-22

**Context:** Items in Nine Lives are off-chain stat modifiers (not cosmetic-only — they give in-game stats) attached to the PNG-layer character system. There is **no acquisition path for items today** — players only have items already seeded onto their account. This is the **primary way players earn items**; the NFT collection (Decision #6) is only a catch-up shortcut into the same item pool.

**Why it matters that #6 doesn't replace #8:** the clarified NFT model only grants items as a one-time head-start at wallet-link time based on the NFT's traits. Non-holders need an ongoing path to earn items, and NFT holders need a way to acquire items beyond their initial trait set. Both populations depend on #8 being built.

**Current thinking:**
- A drop / loot-box mechanism distinct from the card-pack system. Items and cards are different artifacts in different tables with different roles (cards = combat loadout, items = character stat modifiers + appearance).
- RNG-based like packs — a given drop can yield common or rare items.
- Same item pool whether you got a seed via NFT or via drops; NFT holders and non-holders reach the same ceiling over time.
- Source surfaces to consider: arena wins, quests, daily-login bonuses (separate from the daily card pack), Nerm-driven rewards (tipping via Nerm's wallet agent), gameplay milestones, special event drops.

**Open questions:**
- Which surfaces actually trigger drops? All of the above, or a curated subset?
- Drop rate balance — how often does a player get *anything*, and how often something good?
- Rarity model — mirror card rarity tiers (Common / Rare / Legendary), or different scheme?
- Does the `items` table have a rarity field today, or does rarity come from the drop context (needs schema check).
- Loot-box format — opened immediately on drop, queued for the social hangout room (Decision #5), or both?
- Ecosystem-participation reward criteria — gameplay-only, or also Chronicle engagement / Telegram presence / token-holding?
- Anti-farming: how to stop one account hoovering drops via repetitive low-effort actions (multi-account or single-account grinding)?
- Should drop-awarded items be flagged differently from NFT-trait-awarded items in `player_items`, or treated as identical once granted?

---

## 9. Chronicle engage-to-earn measurement on cheapest-possible X API tier

**Status:** Open
**Opened:** 2026-04-22

**Context:** Engage-to-earn (likes / replies / retweets → points) is part of the MVP Chronicle. Wray currently has only a tweet-sending balance on the X API, not a tier that exposes engagement metrics. Free tier can't reliably read engagement; Basic is $100/mo; Pro is significantly more. Wray wants the cheapest possible path. Needs deciding before the build starts.

**Current thinking:**
- **Budget the $100/mo Basic tier when engage-to-earn ships.** Predictable cost, real metrics. Honest answer; not the cheapest.
- **Free-tier workaround.** Webhooks where available, client-side tracking via a Twitter login flow (players authorize their own account → we read their engagement on our posts), partial coverage scraping. Lower fidelity, higher fragility, more code surface.
- **Defer engage-to-earn until token economy is properly funded.** Ship Chronicle as story-only at MVP; engage-to-earn becomes a later milestone with budget allocated.
- A hybrid is plausible: launch with player-authorized read access on free tier (zero ongoing cost, lower coverage), upgrade to Basic only if engagement scale warrants.

**Open questions:**
- Which path — paid tier, free workaround, defer, or hybrid?
- If free workaround: does a player-OAuth-into-Twitter flow conflict with the "no wallet to start" / low-friction onboarding ethos?
- If deferred: what's the gating event that unlocks engage-to-earn (token revenue threshold, MVP launch + 30d, manual call)?
- Is there a Chronicle-internal substitute for engagement-as-points (e.g. earn points by *posting in Telegram* about the Chronicle, where we do have read access)?

---

## 10. Player leveling / XP progression rewards

**Status:** Open
**Opened:** 2026-04-22

**Context:** `server/routes/leveling.js` exists but does nothing functional today. Wray wants leveling to feel like real progression and reward players, but recognizes that level → stat boost on Nines would wreck combat balance. Needs designing.

**Current thinking:**
- **Cosmetic / status only.** A number next to the player name, badge tiers, identity / pride. Lowest balance risk, lowest reward feel. Easiest to ship.
- **Gameplay-surface unlocks.** Higher level unlocks new modes, additional loadout slots, deeper Chronicle interaction tools, Telegram features, etc. Creates a clear progression ladder without touching combat math.
- **Stat / power boosts to the Nine.** Direct combat advantage from leveling. Highest reward feel; highest pay-to-win-via-grinding risk. Wray instincts toward this but flagged the balance concern.
- A layered approach is plausible: cosmetic + unlocks at most levels, with one or two visible "milestone" power bumps gated by significant level investment so it feels earned, not free.

**Open questions:**
- Which model — cosmetic-only, unlocks, stats, or layered?
- XP source — combat participation, wins, time spent, Chronicle interaction, all of the above?
- Does leveling persist across seasons or reset?
- If unlocks: which surfaces are level-gated and at what tier?
- If stats: how to keep new players competitive against high-level players in shared zones?
