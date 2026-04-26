# Smoke — Telegram link + auth-callback wins (PR #?)

## Pre-merge

- [x] Migration 008 already applied to prod via Supabase Management API (eligibility cleanup of telegram_* columns + partial unique index).

## §9.109 Telegram link — phone smoke

- [ ] On `/settings`, Telegram row reads NOT LINKED with a LINK TELEGRAM button.
- [ ] Tap LINK TELEGRAM → Telegram opens with @Nerm9LV_Bot chat. Tap the **Start** button.
- [ ] Bot replies in DM: "Linked. @yourhandle is now bound here." + community link.
- [ ] Switch back to `/settings` browser tab — within ~3s, pill flips to LINKED, your `@telegram_username` shows, "Join the community →" CTA appears.
- [ ] Refresh `/settings` → state persists.
- [ ] Tap UNLINK → confirm prompt → pill back to NOT LINKED in DB and UI.

## §9.103 Twitter pfp/handle refresh on login

- [ ] Change your X avatar OR rename your handle on X.
- [ ] Log out of 9lv.net, log back in.
- [ ] Dashboard renders the updated avatar / handle within one login. (`/p/<old-handle>` may 404 — expected.)

## §9.104 Daily-pack auto-claim on login

- [ ] With no daily pack claimed yet today, log in (use the X OAuth flow, not just navigating to dashboard).
- [ ] Dashboard loads with "DAILY PACK ADDED" toast at the top — auto-dismisses after ~7s, click-dismissable.
- [ ] `/packs.html` shows pack count +1 vs pre-login.
- [ ] Log out + log in again same UTC day → no second auto-claim, no second toast.

## Edge — Telegram link

- [ ] Open the deep-link in a desktop browser → t.me page, click "open Telegram" → completes same.
- [ ] Generate a code, wait 11+ minutes, then tap Start → bot replies "Link code expired or already used."
- [ ] Group fallback: in the community group, type `/start <code>` (where `<code>` was just generated). Bot replies in-group with the success line.
- [ ] Try linking the same Telegram account to a second player → bot replies "Already linked to another account."

## Notes

- Bot reply copy is intentionally neutral / functional — Nerm voice polish is a dedicated PR (per `feedback_nerm_voice_dedicated_pr.md`). Strings live as constants in `nerm-telegram.js` near `LINK_REPLIES`.
- Community group URL defaults to `https://t.me/iduj9q8mx98`. Override at runtime via `TELEGRAM_GROUP_URL` env var (Replit Secrets).
- The §9.106 codebase-wide auth gap still applies — a malicious actor with another player's `player_id` can issue a link code on their behalf and bind their own Telegram. Same trust model as wallet-link. Out of scope for this PR; flagged in §9.106.
