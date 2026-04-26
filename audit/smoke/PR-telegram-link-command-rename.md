# Smoke — Telegram link uses /link@Nerm9LV_Bot (PR #?)

Follow-up to PR #291. `/start <code>` was triggering every other bot in
the 9LV group. Switched the canonical paste command to
`/link@Nerm9LV_Bot <code>` so only Nerm responds.

## Phone smoke

- [ ] On `/settings`, tap LINK TELEGRAM.
- [ ] STEP 2 box now shows `/link@Nerm9LV_Bot ABCD1234` (not `/start`).
- [ ] Tap COPY → clipboard has `/link@Nerm9LV_Bot <code>`.
- [ ] Paste in the 9LV Telegram group → **only Nerm9LV_Bot replies** with "Linked. @yourhandle is now bound." Other group bots stay silent.
- [ ] `/settings` flips to LINKED within ~3s.

## Edge

- [ ] Type `/link` (no payload) in the group → bot replies "Usage: /link <code> — get the code from Settings on the site."
- [ ] Legacy `/start <code>` still works (in case any external deeplink reuses it). Verifies the legacy path is intact, even though normal users won't see it from `/settings`.

## Notes

- Only the canonical paste form changed. Bot logic for the link itself is identical (same `handleLinkStart` helper, same DB writes, same success/error replies).
- The bot username is sourced from the API response (`bot_username` field) so the copy adapts if the bot ever rebrands.
