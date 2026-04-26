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

/**
 * Build the `combat:attack` socket payload for the main resolveAttack path.
 *
 * Adds `card_name` so the client log can render the named beat
 * ("Goosebumps's Cinder Snap → Velvet -38") instead of just the effect tag.
 * The card is the slot-active card on the caster, used both to modulate the
 * auto-attack damage (slotMult) and to surface the card identity in the log.
 *
 * Caller passes the resolved damage and crit metadata; this fn does not
 * compute anything beyond shaping the payload.
 */
function buildAttackBroadcastPayload({
  caster,
  defender,
  dmg,
  isCrit,
  critMult,
  slot,
  card,
  hp,
  maxHp,
}) {
  return {
    attacker: caster.playerName,
    attackerId: caster.playerId,
    defender: defender.playerName,
    defenderId: defender.playerId,
    dmg,
    crit: !!isCrit,
    critMult,
    slot: slot + 1,
    card_name: card?.name || null,
    effect: card?.effect_1 || null,
    hp,
    maxHp,
    guildA: caster.guildTag,
    guildB: defender.guildTag,
    x: caster.x,
    y: caster.y,
    tx: defender.x,
    ty: defender.y,
  };
}

/**
 * Build the `combat:effect` socket payload emitted at the end of applyEffect.
 *
 * Includes `card_name` so the client can log a dedicated cast line
 * ("Goosebumps casts Cinder Snap on Velvet [POISON]"). target may be null
 * for self-buffs (SURGE/CRIT/CLEANSE etc.) — caller resolves that.
 */
function buildEffectBroadcastPayload({ caster, target, effect, card }) {
  return {
    effect,
    by: caster.playerName,
    casterId: caster.playerId,
    on: target?.playerName || null,
    targetId: target?.playerId || null,
    card_name: card?.name || null,
    x: caster.x,
    y: caster.y,
    tx: target?.x,
    ty: target?.y,
  };
}

module.exports = {
  buildRoundStartNinePayload,
  calculateRoundXP,
  buildAttackBroadcastPayload,
  buildEffectBroadcastPayload,
};
