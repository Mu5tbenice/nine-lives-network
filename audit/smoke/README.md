# Smoke tests by PR

One file per merged PR that needs a live smoke check on Replit. Each file has:
- What changed (1–2 lines)
- A short checkbox list (≤6 items, critical path only)
- A result section for pass/fail notes

**Workflow:**
1. Claude creates a `PR<N>-<slug>.md` file when a PR is merged.
2. Wray runs through the checklist on Replit after pulling + republishing.
3. Wray ticks boxes / drops notes / screenshots inline.
4. Once the file is fully ticked, it's archived (move to `audit/smoke/_done/` or just leave — the timestamp tells the story).
5. Anything that fails goes into a §9 entry or a follow-up PR.

**Naming:** `PR<number>-<slug>.md` (e.g. `PR277-heal-log-target.md`). Keep slugs short.

**Older PRs (#274–#276)** already smoked mid-session 2026-04-26 ("the combat does feel better") — no smoke file needed. Files exist for everything merged after that smoke pass.
