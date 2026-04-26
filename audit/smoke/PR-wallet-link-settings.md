# Smoke — wallet-link + settings page (PR #?)

## Pre-merge: apply migration

- [ ] Run `database/migrations/007_wallet_eligibility.sql` in Supabase SQL editor (or via psql) — adds `players.eligibility_flags`, `players.wallet_changed_at`, partial unique index on `players.wallet_address`. Pre-flight verified zero existing wallet rows / zero duplicates.

## Player-facing — `/settings`

- [ ] Settings link appears in nav (between Spellbook and Help). Click it; page loads with your handle + house + join date populated.
- [ ] Paste a valid Solana address (e.g. one from your Phantom). Input border turns cyan, helper says "Looks valid". Click SAVE; pill flips to LINKED, message says "Wallet linked."
- [ ] Refresh the page — address persists in the input, pill stays LINKED.
- [ ] Try `0x` ETH address → input border turns orange, message says "Looks like an Ethereum address — Solana wallets are base58, no 0x." SAVE button stays disabled.
- [ ] Try changing the wallet immediately → server responds 429 with "Wallet was changed recently — try again in N day(s)."

## Admin — eligibility flag set + CSV export

- [ ] `curl -X POST -H "x-admin-key: $ADMIN_KEY" -H "Content-Type: application/json" -d '{"flag":"whitelist_test","value":true}' https://9lv.net/api/admin/players/<your_id>/eligibility` → returns success + your eligibility_flags object.
- [ ] `curl -H "x-admin-key: $ADMIN_KEY" "https://9lv.net/api/admin/eligibility/whitelist_test?format=csv"` → returns a CSV with one row: `"<your_handle>","<your_wallet>",<your_id>`.

## Notes

- Pre-existing failing test `castBroadcastPayload.test.js` is unrelated (arena agent's WIP in `combatEngine.js` / `combatEnginePayloads.js`). Wallet PR does not touch combat code.
- Wallet ownership signature verification is intentionally deferred per §9.102 (just-in-time at NFT drop time, not at link time).
