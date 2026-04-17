# ZONE BATTLE — ROUND SYSTEM DESIGN
## Locked Design V1 — April 2026
## This replaces the previous continuous combat + 1-minute cooldown model

---

## WHAT ZONE BATTLES ARE

A spectator-friendly territory game. Players deploy their Nine, set their build, and 
compete in short rounds for zone control. You don't need to be watching constantly 
to compete — but watching is rewarding. Guilds collect points together for a 
community leaderboard. The game is FFA — even guildmates can hit each other if 
randomly targeted. Guilds cooperate through build diversity, not by protecting 
each other.

---

## ROUND STRUCTURE

- Each zone runs continuous rounds
- Round length: **TBD through playtesting** (starting point: 3 minutes)
- Between rounds: **20-30 second cinematic breakdown** (see below)
- All Nines on the zone fight freely for the duration of the round
- **No rejoining mid-round** — if you die you wait for the next round to start
- At round end: **all surviving Nines restore to full HP** before next round begins

---

## CINEMATIC ROUND END (the drama moment)

When a round ends:
1. Combat visuals slow down for 3-5 seconds
2. "ROUND END" announced on screen
3. Guild control calculated and displayed — which guild had most members alive
4. Points awarded with visible callouts above each Nine
5. KO leaderboard flash — who scored kills this round
6. 20-30 second countdown before next round
7. New round begins — full HP for all surviving Nines, any waiting players rejoin

This moment is the cinematic payoff. It should feel like a boxing round bell.

---

## GUILD CONTROL

**Rule:** The guild with the most members alive at the exact moment a round ends 
controls the zone for that round.

- Ties broken by total surviving HP
- Control is calculated per-round — a guild can lose and regain control round by round
- No fixed "home zones" — any guild can control any zone
- Guild control rewards build diversity — a guild of pure glass cannons wins KOs 
  but may lose control to a guild with surviving tanks

---

## ZONE CONTROL BENEFITS (three layers)

Controlling a zone has three distinct rewards. They operate on different timescales 
and reward different types of engagement.

### Layer 1 — Per-Round Points (immediate)
Covered in the scoring section. Points awarded at round end to surviving guild members 
whose guild controlled that round.

### Layer 2 — Daily Guild Branding (prestige / visibility)
At midnight UTC, the game calculates which guild won the most rounds on each zone 
during the previous 24 hours. That guild gets their tag and guild art displayed on 
the zone for the entire following day.

- Visible on the zone map, zone detail page, and zone card header
- Resets every midnight — must be defended daily to keep it
- Purely cosmetic but highly motivating for communities and meme coin guilds
- Display example: "⚔️ Controlled by [BONK]" with guild art shown on zone

If no guild won a majority of rounds, the zone shows as contested.

### Layer 3 — House Presence Bonus (strategic)
At midnight UTC, the game also calculates which house had the most individual fighters 
deployed on each zone during the previous day. That house "claims" the zone and sets 
a bonus that applies to ALL fighters on that zone the following day — regardless of 
their house or guild.

This is a fighter count, not HP. One deployed Nine = one vote. Guilds coordinate 
to flood a zone with a specific house to set the bonus they want tomorrow.

| House Claims Zone | Bonus — Applied to ALL fighters next day |
|---|---|
| 🔥 Smoulders | +20% ATK |
| 🌊 Darktide | Regenerate 3% max HP per minute |
| 🌿 Stonebark | +25% max HP |
| 💨 Ashenvale | +15% SPD |
| ⚡ Stormrage | Critical hits deal 3× damage instead of 2× |
| 🌙 Nighthollow | +10 LUCK for all fighters |
| ☀️ Dawnbringer | All HEAL and BLESS effects 50% stronger |
| 🔮 Manastorm | All card effects 30% stronger |
| ☠️ Plaguemire | All fighters start each round with 1 POISON stack on enemies |

No bonus applies if a zone had no fighters the previous day.

### Why three layers works
- A guild that shows up and wins rounds gets their name on the map (Layer 2)
- A guild that strategically floods a zone with a specific house shapes tomorrow's 
  battlefield for everyone (Layer 3)
- Both require consistent daily engagement, not just one big push
- Crypto communities get genuine map visibility — their brand, on the world

---

## SCORING

Points are awarded at round end only. No continuous per-minute scoring.

| Action | Points |
|--------|--------|
| Deal a KO during the round | +10 (awarded immediately on KO, not at round end) |
| Alive at round end | +3 |
| Guild controls zone at round end | +5 (all surviving guild members on that zone) |
| Guild flips zone control (took it from another guild) | +10 bonus to all surviving guild members |

### Scoring philosophy by build type:
- **Glass cannon / burst** — scores through KOs, dies often, high risk high reward
- **Tank** — scores through survival and guild control, low KO output
- **DOT / attrition** — KOs from damage over time, requires rounds long enough for 
  effects to tick (round length tuning critical for this)
- **Support / control** — keeps guild members alive, contributes to guild control 
  indirectly
- **Speed builds** — lands more attacks per round, more KO opportunities

No single build dominates all scoring categories. This is intentional.

---

## REJOINING

- If knocked out mid-round: **wait at the zone, rejoin automatically when the next 
  round starts**
- No lives system, no charges — rounds handle the natural pacing
- No instant rejoin mid-round under any circumstance (prevents HP reset abuse)
- A player can stay on a zone across as many rounds as they want
- **Session timer:** After a set period (TBD — starting point: 1-2 hours) your Nine 
  automatically withdraws and you must manually reactivate to continue
- The session timer is the anti-AFK-forever mechanic, not the death system

---

## THINGS TO VALIDATE IN PLAYTESTING

These are NOT design decisions yet — they are questions that only playtesting can answer:

1. **Round length** — 3 minutes is the starting point. DOT builds need enough time 
   for POISON/CORRODE to meaningfully stack. Tanks need enough time to be worn down 
   by attrition builds. Adjust up or down based on feel.

2. **DOT viability** — If rounds feel too short for DOT to matter, increase round 
   length before changing DOT values. Only tune the stats if the length is right 
   but DOT still feels weak.

3. **Tank survival** — Tanks should survive more rounds than glass cannons but should 
   not be unkillable within a round. If tanks never die in a round, either round 
   length needs increasing or tank HP/DEF needs scaling down.

4. **KO point value** — +10 per KO should feel rewarding but not so dominant that 
   survival/control points feel pointless. If KO farming is the only viable strategy, 
   reduce KO points or increase survival/control points.

5. **Session timer** — 1 hour starting point. Adjust based on how often you want 
   players returning to the site.

6. **Zone population** — Minimum number of Nines needed for a round to start? 
   What happens on low-population zones?

---

## WHAT THIS REPLACES

- Continuous per-minute survival scoring — REMOVED
- 1-minute death cooldown — REMOVED
- Charge/lives system — NOT IMPLEMENTED (not needed with round structure)
- 15-minute snapshot scoring — REPLACED by round-end scoring
- Old region control bonuses (fixed per-region bonuses) — REPLACED by dynamic 
  house presence bonus system (nightly, per-zone, based on fighter count)

---

## IMPLEMENTATION NOTES FOR DEVELOPERS

### Core changes required:
1. Replace continuous combat loop with round-based loop
2. Round timer with broadcast to all clients on zone
3. Round end trigger: freeze combat, calculate scores, broadcast results, reset HP, 
   start new round
4. Death during round: player enters waiting state, auto-rejoins on next round start
5. Guild control calculation: count surviving members per guild at round end
6. KO points: award +10 immediately on KO event (not at round end)
7. Session timer: track deploy time, auto-withdraw after session duration, 
   push notification to player
8. Daily guild branding: at midnight count rounds won per guild per zone, 
   store winning guild tag, display on zone until next midnight
9. Daily house presence: at midnight count fighter deployments per house per zone, 
   store winning house, apply that house's bonus to all fighters on that zone next day
10. House bonus must be readable by combatEngine.js at fight time and applied to 
    all fighters regardless of their own house

### Key files likely affected:
- combatEngine.js — round loop, HP reset, KO handling
- zones.js — guild control calculation, round scoring
- nethara-live.html — round timer UI, cinematic round end display, waiting state UI
- server/index.js — round orchestration, Socket.io broadcasts

### What does NOT change:
- Card stats and effects — same system
- Loadout selection — same system
- House base stats — same system
- PIXI sprite rendering — same system (animations may need timing adjustments 
  separately, not part of this implementation)

---

*Design locked April 2026. Tuning values marked TBD are intentionally left for 
playtesting. Do not treat them as design decisions.*
