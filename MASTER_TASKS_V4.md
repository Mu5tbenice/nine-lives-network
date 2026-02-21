# MASTER TASKS V3 — Updated Feb 20, 2026
## Single Source of Truth — Post Card-V4 Cleanup

---

## THE BIG PICTURE

**Backend: ✅ 100% complete.** All 4 game modes, mana, combat, deployments, midnight reset — all live.

**Card Design: 🔧 In progress.** Card v4.2 files are ready. Cleanup guide created. Need to deploy across all pages.

**Frontend: ~55% complete.** Pages exist and load, but most still show basic card displays instead of the gorgeous v4.2 design.

---

## ✅ COMPLETED

### Backend (All Live on Replit)
| System | Status |
|--------|--------|
| Mana (1/hr regen, max 10) | ✅ Working |
| Zone Battles (deploy, play-card, withdraw) | ✅ Working |
| Combat Effects (BURN, POISON, HEAL, WARD, etc.) | ✅ Working |
| Quick Duels (best of 3, free) | ✅ Working |
| Gauntlet (solo PvE, 1 mana) | ✅ Working |
| Weekly Boss (guild raid) | ✅ Working |
| Leaderboards V3 (6 tabs) | ✅ Wired |
| Midnight Reset | ✅ Wired in scheduler |
| Card Durability | ✅ Working |
| Lone Wolf (1.5x ATK) | ✅ Working |
| Packs & Collection | ✅ Working |
| Items & Equipment | ✅ Working |
| Nine Creation | ✅ Working |
| Game API Client | ✅ Loaded |
| How to Play V3 rewrite | ✅ Done |
| Leaderboards V3 (6 tabs, all endpoints) | ✅ Done |

### Card Design System
| Component | Status |
|-----------|--------|
| Card v4.2 React prototype (reference) | ✅ Complete |
| card-v4.css (unified CSS) | ✅ Created — needs deploy |
| card-v4.js (unified builder) | ✅ Created — needs deploy |
| card-particles.js (house particles) | ✅ Exists on site |
| Cleanup & Deploy Guide | ✅ Written |

---

## 🔥 IMMEDIATE NEXT: Card V4 Site-Wide Deploy

**THIS IS YOUR NEXT SESSION.** Follow the `CLEANUP-AND-DEPLOY-GUIDE.md` step by step.

### Tasks:
1. [ ] Create branch `cleanup/card-v4-unified`
2. [ ] Delete old files (card-v4-patch.css, card-builder-v4.js, spell-particles.js, patch-card-v4.sh)
3. [ ] Delete dead V2 pages (campfire.html, arena.html, token.html)
4. [ ] Add card-v4.css to `public/css/`
5. [ ] Add card-v4.js to `public/js/`
6. [ ] Update spellbook.html (CSS link + script tags + remove old inline code)
7. [ ] Update collection.html (same 3 changes)
8. [ ] Update dashboard.html (same 3 changes)
9. [ ] Update zone-detail.html (same 3 changes)
10. [ ] Update duels.html (same 3 changes)
11. [ ] Update gauntlet.html (same 3 changes)
12. [ ] Update boss.html (same 3 changes)
13. [ ] Test all pages
14. [ ] Commit → merge → close branch → publish

**Time estimate:** ~1 hour

---

## 📋 REMAINING WORK — After Card Deploy

### Priority 1: Collection Page Redesign
The page where players SEE and LOVE their cards. Must be gorgeous.
- [ ] Cards show full v4.2 design with ATK/HP stats in color
- [ ] Durability bar under each card
- [ ] "Deployed to: Zone X" badge on active cards
- [ ] Filter/sort by: house, type, rarity, exhausted
- [ ] Tap card → zoom popup with full details
- [ ] Use `buildCardV4(spell, { size: 'mini' })` for grid

### Priority 2: Zone Detail — Hand Carousel
The "Your Hand" panel at bottom.
- [ ] Card carousel uses `buildCardV4(spell, { size: 'tiny' })`
- [ ] Exhausted cards greyed out via `is_exhausted` flag
- [ ] Selected card gets golden border via `spell-card--selected` class

### Priority 3: Duels Page
- [ ] 3-card selection grid uses v4.2 cards
- [ ] Selected cards show highlight border
- [ ] VS screen renders both sides with v4.2 cards

### Priority 4: Gauntlet Page
- [ ] Card grid uses v4.2 design
- [ ] Floor enemy stats match card styling

### Priority 5: Boss Page
- [ ] Card grid uses v4.2 design
- [ ] Boss damage feedback styled

### Priority 6: Dashboard
- [ ] "Your Cards" preview with `size: 'tiny'` cards
- [ ] Active deployments show card + zone info
- [ ] Mana display (already working via game-api.js)

### Priority 7: Registration + Landing Page
- [ ] Add guild_tag field to signup form
- [ ] Landing page V3 Warm Night redesign
- [ ] Nethara Live V3 redesign

---

## 🔧 SMALL FIXES

| Issue | Priority | Effort |
|-------|----------|--------|
| Duplicate leaderboard files — delete wrong one | Quick | 2 min |
| Registration — add guild_tag field | Medium | 15 min |
| Spellbook — verify card-v4 renders after deploy | Medium | 5 min |
| Clean up duplicate `leaderboard-v3.js` vs `leaderboards-v3.js` | Quick | 2 min |

---

## ⏳ DEFERRED (Season 2+)

- NFT "The Nines" integration
- $9LV token + staking
- Companion game modes (Vampire Survivors-style "Last Life")
- Crafting / recharging system
- Quest system
- Events system (Mana Storm, Berserker Rage)
- Guild management (create/join/leave)
- Twitter bot V3 narrative engine
- Autonomous agent NPCs (Wild Nines, AVB integration)
- Region control bonuses

---

## GIT WORKFLOW REMINDER

```bash
# For EVERY change:
git checkout main
git pull origin main
git checkout -b feature/[name]

# ... do your work ...

git add -A
git commit -m "feat: description"
git push origin feature/[name]

# Then merge + close:
git checkout main
git merge feature/[name]
git push origin main
git branch -d feature/[name]

# ⚠️ CLOSE THE BRANCH before publishing on Replit!
# Deployments tab → Publish
```

---

## FILES THAT MATTER (After Cleanup)

### Card System (2 files only):
```
public/css/card-v4.css       ← ALL card styling
public/js/card-v4.js         ← card renderer (buildCardV4)
public/js/card-particles.js  ← house particle animations
```

### Backend Services:
```
server/services/combatEngine.js    ← zone combat
server/services/effectEngine.js    ← spell effects
server/services/duelEngine.js      ← quick duels
server/services/gauntletEngine.js  ← solo PvE
server/services/bossEngine.js      ← weekly boss
server/services/manaRegen.js       ← mana system
server/services/packSystem.js      ← card packs
server/services/cardDurability.js  ← charges
server/services/midnightReset.js   ← daily reset
server/services/nineSystem.js      ← character creation
```

### Frontend Pages:
```
public/index.html          ← landing (needs V3 redesign)
public/register.html       ← registration
public/dashboard.html      ← player home
public/nethara-live.html   ← territory feed
public/zone-detail.html    ← zone battle view
public/spellbook.html      ← browse all spells
public/collection.html     ← your cards
public/duels.html          ← quick duels
public/gauntlet.html       ← solo PvE
public/boss.html           ← weekly boss
public/leaderboards.html   ← rankings
public/how-to-play.html    ← game guide
```

---

*Last updated: February 20, 2026*
*Next session: Deploy card-v4 across all pages (follow CLEANUP-AND-DEPLOY-GUIDE.md)*
