# Smoke — Telegram link group-canonical fix (PR #?)

Follow-up to PR #290's §9.109. Original deeplink-to-DM flow didn't work in
practice (Nerm bot doesn't reliably DM); this PR pivots `/settings` to a
group-canonical handshake: code + group join button + paste-this command.

## Phone smoke

- [ ] On `/settings`, Telegram row reads NOT LINKED with a LINK TELEGRAM button.
- [ ] Tap LINK TELEGRAM → panel reveals:
  - "STEP 1 — JOIN THE GROUP" + a JOIN 9LV TELEGRAM button.
  - "STEP 2 — PASTE THIS IN THE CHAT" + the code shown as `/start ABCD1234` with a COPY button.
  - "Bot will confirm in-channel." + CANCEL link.
- [ ] Tap COPY → button briefly says COPIED. Verify clipboard has `/start <code>`.
- [ ] Tap JOIN 9LV TELEGRAM → opens the 9LV community group in Telegram.
- [ ] In the group, paste `/start <code>` → bot replies in-channel: "Linked. @yourhandle is now bound."
- [ ] Switch back to `/settings` browser tab → within ~3s, pill flips to LINKED, your `@telegram_username` shows, "Join the community →" CTA appears.
- [ ] Refresh `/settings` → state persists.
- [ ] Tap UNLINK → confirm prompt → pill back to NOT LINKED.

## Edge

- [ ] Tap LINK TELEGRAM → wait for the code, then tap CANCEL → panel collapses, button is back, no leftover polling.
- [ ] Generate a code, wait 11+ minutes, then paste `/start <code>` in the group → bot replies "Link code expired or already used."
- [ ] Try linking the same Telegram account to a second player → bot replies "Already linked to another account."

## Notes

- Bot copy stays neutral; Nerm voice polish is a dedicated PR.
- The `t.me/<bot>?start=<code>` deeplink is no longer surfaced from `/settings`. Bot still accepts the payload via that path if anything else ever wants to use it (e.g. external "/start link" buttons).
