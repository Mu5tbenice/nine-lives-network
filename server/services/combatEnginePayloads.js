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

module.exports = { buildRoundStartNinePayload };
