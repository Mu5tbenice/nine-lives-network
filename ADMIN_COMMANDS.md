# Nine Lives Network - Admin Commands & Automation

## Quick Reference

Replace `YOUR_KEY` with: `42069FSO9JR3XJQ39d8q9e81x9k1109293id302193di10`

---

## Daily Workflow Commands

### Morning (Post Daily Objective)
```bash
# 1. Rotate to new objective zone
curl -X POST "http://localhost:5000/api/admin/rotate-objective" -H "x-admin-key: YOUR_KEY"

# 2. Post the objective tweet
curl -X POST "http://localhost:5000/api/admin/post-objective" -H "x-admin-key: YOUR_KEY"
```

### Throughout Day (Process Spell Casts)
```bash
# Process new replies from Twitter
curl -X POST "http://localhost:5000/api/admin/process-casts" -H "x-admin-key: YOUR_KEY"
```

### Evening (End of Day)
```bash
# 1. Run final end-of-day processing (calculates winner, awards bonuses)
curl -X POST "http://localhost:5000/api/admin/end-of-day-current" -H "x-admin-key: YOUR_KEY"

# 2. Post results tweet
curl -X POST "http://localhost:5000/api/admin/post-results" -H "x-admin-key: YOUR_KEY"
```

### Midnight (Reset Mana)
```bash
curl -X POST "http://localhost:5000/api/admin/reset-mana" -H "x-admin-key: YOUR_KEY"
```

---

## Manual / As-Needed Commands

### View Game Stats
```bash
curl "http://localhost:5000/api/admin/stats" -H "x-admin-key: YOUR_KEY"
```

### View Recent Casts (for Spell of the Day)
```bash
curl "http://localhost:5000/api/admin/recent-casts?limit=20" -H "x-admin-key: YOUR_KEY"
```

### Award Spell of the Day (+50 points)
```bash
curl -X POST "http://localhost:5000/api/admin/spell-of-the-day" \
  -H "x-admin-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"player_id": 1, "reason": "Creative RP"}'
```

### Check Zone Control
```bash
curl "http://localhost:5000/api/admin/zone-control/10" -H "x-admin-key: YOUR_KEY"
```

### Get Daily Winner
```bash
curl "http://localhost:5000/api/admin/daily-winner/10" -H "x-admin-key: YOUR_KEY"
```

### Test Bot Connection
```bash
curl "http://localhost:5000/api/admin/test-bot" -H "x-admin-key: YOUR_KEY"
```

---

## Automated Schedule (Cron Jobs)

These run automatically when the server is running:

| Time (UTC) | Action |
|------------|--------|
| Every 2 min | Process spell casts from Twitter |
| 08:00 | Post daily objective |
| 23:00 | End of day processing + post results |
| 00:00 | Reset all player mana to 5 |

---

## Zone IDs Reference

| ID | Zone Name | Type |
|----|-----------|------|
| 1 | Ember Peaks | Home (Ember) |
| 2 | Tidal Depths | Home (Tidal) |
| 3 | Stone Hollows | Home (Stone) |
| 4 | Zephyr Heights | Home (Zephyr) |
| 5 | Storm Citadel | Home (Storm) |
| 6 | Umbral Void | Home (Umbral) |
| 7 | Radiant Sanctum | Home (Radiant) |
| 8 | Arcane Nexus | Home (Arcane) |
| 9 | WildCat Wilds | Home (WildCat) |
| 10 | Crystal Crossroads | Neutral |
| 11 | Mystic Falls | Neutral |
| 12 | Ancient Ruins | Neutral |
| 13 | Twilight Grove | Neutral |
| 14 | Dragon's Rest | Neutral |

---

## School IDs Reference

| ID | School Name |
|----|-------------|
| 1 | Ember Covenant |
| 2 | Tidal Conclave |
| 3 | Stone Covenant |
| 4 | Zephyr Circle |
| 5 | Storm Assembly |
| 6 | Umbral Syndicate |
| 7 | Radiant Order |
| 8 | Arcane Spire |
| 9 | WildCat Path |

---

## Activity Decay Commands

### Run Activity Decay Manually
```bash
curl -X POST "http://localhost:5000/api/admin/activity-decay" -H "x-admin-key: YOUR_KEY"
```

### View Inactive Players
```bash
curl "http://localhost:5000/api/admin/inactive-players" -H "x-admin-key: YOUR_KEY"
```

### Reactivate a Player
```bash
curl -X POST "http://localhost:5000/api/admin/reactivate-player/1" -H "x-admin-key: YOUR_KEY"
```

---

## Activity Decay Rules

| Inactivity | Penalty |
|------------|---------|
| 3-7 days | -5% seasonal points |
| 7+ days | Marked inactive (hidden from leaderboards) |

Players reactivate automatically when they cast again.