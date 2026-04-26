# Smoke — Nerm bot command registration via setMyCommands (PR #?)

Follow-up to PR #292. The `/link` handler shipped in code, but didn't
appear in Telegram's autocomplete and Wray reported the bot acting as
if `/link` wasn't registered. Adding `bot.setMyCommands([...])` on
startup fixes both: the menu shows `/link` and Telegram's privacy mode
delivers the command reliably to the bot in groups.

## Replit logs (post-Publish)

- [ ] `✅ Nerm Telegram running as @Nerm9LV_Bot` shows.
- [ ] `✅ Nerm Telegram command list registered with BotFather` shows shortly after.

## In Telegram

- [ ] In the 9LV group chat, type `/` — autocomplete menu now shows `/link`, `/help`, `/sort`, `/houses`, `/lore`, `/cards`, `/scamcheck`.
- [ ] DM @Nerm9LV_Bot directly and type `/` — the same list shows. (Bot still doesn't *respond* in DM, but the menu populates.)

## Smoke the link

- [ ] On `/settings`, tap LINK TELEGRAM, then COPY → clipboard has `/link@Nerm9LV_Bot <code>`.
- [ ] Paste in the 9LV group → only Nerm9LV_Bot replies "Linked. @yourhandle is now bound."
- [ ] `/settings` flips to LINKED within ~3s.

## If `/link` STILL doesn't trigger after deploy

Most likely the Telegram bot hasn't restarted. On Replit:
1. Confirm you pulled latest main.
2. Click **Publish** (not just save). The workspace shell process is separate from production.
3. Wait ~10s for the new process to boot.
4. Look for the two ✅ log lines above in the deploy logs.

If logs show those lines but the bot still ignores `/link@Nerm9LV_Bot <code>`, then the bot's privacy mode in BotFather might be set to strict-mode-without-known-commands. Send `/setprivacy` to @BotFather and toggle it, OR just confirm the menu populates after `setMyCommands` runs (which it should).
