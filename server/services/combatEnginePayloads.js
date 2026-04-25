// ══════════════════════════════════════════════════════════════════════
// server/services/combatEnginePayloads.js
// Pure helpers that shape the `arena:*` socket payloads. Isolated from the
// main engine so they can be unit-tested without standing up supabase,
// scheduler timers, or the tick loop. See combatEngine.js for callers.
// ══════════════════════════════════════════════════════════════════════
'use strict';

/**
 * Build a single `arena:round_start.nines[]` entry for a Nine.
 *
 * §9.71: `withdrawn` is included so the client can distinguish a KO'd-waiting
 * self-sprite (kept in zs.nines per §9.35 with hp=0) from a survivor. Without
 * it the client unconditionally cleared alpha/badge on round_start, producing
 * a bright 0-HP bar with no WAITING label on the withdrawn sprite.
 */
function buildRoundStartNinePayload(n) {
  return {
    id: n.playerId, // align with arena:positions — S.nines client map is keyed by playerId (§9.25)
    deploymentId: n.deploymentId,
    playerId: n.playerId,
    hp: n.hp,
    maxHp: n.maxHp,
    guildTag: n.guildTag,
    houseKey: n.houseKey,
    withdrawn: !!n.withdrawn,
  };
}

/**
 * Calculate per-player XP awards for round end.
 *
 * §9.91: arena combat was emitting zero XP — the xp-engine defined
 * zone_survive/zone_win/zone_flip rewards but combatEngine.endRound never
 * called addXP. Extracted here as a pure function so endRound stays focused
 * on points/zone-control bookkeeping and the XP math is unit-testable.
 *
 * Caller is responsible for filtering `livingNines` (hp > 0,
 * !waitingForRound). KO XP is awarded immediately in handleKO and is NOT
 * computed here.
 *
 * @param {object} args
 * @param {string|null} args.winner Guild tag controlling the zone, or null
 * @param {boolean} args.flipped Whether the winner flipped control this round
 * @param {Array} args.livingNines Pre-filtered alive Nines
 * @returns {Array<{playerId, xp}>} XP delta per player
 */
function calculateRoundXP({ winner, flipped, livingNines }) {
  const log = [];
  for (const n of livingNines || []) {
    let xp = 2; // zone_survive — alive at end of round
    if (winner && n.guildTag === winner) {
      xp += 3; // zone_win — guild controls zone
      if (flipped) xp += 8; // zone_flip — guild flipped control this round
    }
    log.push({ playerId: n.playerId, xp });
  }
  return log;
}

module.exports = { buildRoundStartNinePayload, calculateRoundXP };
