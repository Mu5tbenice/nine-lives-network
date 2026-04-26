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
    // PR-E: classify the slot card so the client log can suppress the
    // "X CardName → Y -dmg [HEAL]" narration when the slot's effect is
    // non-OFFENSIVE — auto-attacks always damage an enemy regardless of
    // what the slot card does, so labelling the swing with a heal/buff
    // name was misleading.
    recipient: classifyEffectRecipient(card?.effect_1),
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
 * Classify a card's effect by the recipient category for log/telegraph
 * narration. Bible §10's targeting-by-card-type spec is officially retired
 * (random with sticky-lock is the design — see project_combat_design_2026_04_26),
 * but the engine still has to know whether a cast is hitting an enemy, an
 * ally, the caster, or an AOE so the windup + effect broadcasts narrate
 * correctly. Otherwise heal cards say "casts Heal on [enemy]."
 *
 * Categories:
 *  - OFFENSIVE → target is an enemy (BURN, POISON, HEX, MARK, etc.)
 *  - ALLY_PICK → target is a specific ally (HEAL — picks lowest-HP ally)
 *  - ALLY_AOE  → AOE on allies, no single target (BLESS, INSPIRE)
 *  - SELF      → caster casts on themselves (WARD, BARRIER, SURGE, FEAST, etc.)
 *
 * Effects that don't fire on cast (FEAST/THORNS/SHATTER/INFECT — passive/on-KO)
 * are classified SELF since the cast is "readying" the on-death trigger.
 */
const OFFENSIVE_EFFECTS = new Set([
  'BURN', 'POISON', 'CORRODE', 'WEAKEN', 'MARK', 'HEX', 'BLIND',
  'WITHER', 'SILENCE', 'NULLIFY', 'CHAIN',
]);
const ALLY_PICK_EFFECTS = new Set(['HEAL']);
const ALLY_AOE_EFFECTS = new Set(['BLESS', 'INSPIRE']);
const SELF_EFFECTS = new Set([
  'WARD', 'BARRIER', 'ANCHOR', 'DODGE', 'REFLECT', 'TAUNT',
  'SURGE', 'CRIT', 'PIERCE', 'EXECUTE', 'CLEANSE',
  'HASTE', 'DRAIN', 'TETHER', 'FEAST', 'THORNS',
  'SHATTER', 'INFECT',
]);

function classifyEffectRecipient(effect) {
  if (!effect) return 'OFFENSIVE'; // null/missing effect defaults to enemy-target
  const e = String(effect).toUpperCase();
  if (OFFENSIVE_EFFECTS.has(e)) return 'OFFENSIVE';
  if (ALLY_PICK_EFFECTS.has(e)) return 'ALLY_PICK';
  if (ALLY_AOE_EFFECTS.has(e)) return 'ALLY_AOE';
  if (SELF_EFFECTS.has(e)) return 'SELF';
  return 'OFFENSIVE'; // unknown effects default to enemy-target (safe fallback)
}

/**
 * Build the `combat:windup` socket payload emitted 1.2s before a card cast
 * resolves. Tells the client which fighter is charging which card at which
 * target, so it can render a charge bar + log telegraph beat.
 *
 * Target may be null for ALLY_AOE casts (BLESS, INSPIRE) — caller passes
 * `target: null` and the client renders "X charges Y" with no recipient.
 * For SELF casts, caller passes target=caster so the log reads "X charges
 * Y on self" via the recipient field.
 */
function buildWindupBroadcastPayload({
  caster,
  target,
  recipient,
  card,
  slot,
  durationMs,
}) {
  return {
    attacker: caster.playerName,
    attackerId: caster.playerId,
    target: target ? target.playerName : null,
    targetId: target ? target.playerId : null,
    recipient: recipient || 'OFFENSIVE',
    card_name: card?.name || null,
    effect: card?.effect_1 || null,
    slot: slot + 1,
    duration_ms: durationMs,
    x: caster.x,
    y: caster.y,
    tx: target ? target.x : null,
    ty: target ? target.y : null,
  };
}

/**
 * Build the `combat:effect` socket payload emitted at the end of applyEffect.
 *
 * Includes `card_name` so the client can log a dedicated cast line
 * ("Goosebumps casts Cinder Snap on Velvet [POISON]"). target is null for
 * ALLY_AOE casts (BLESS/INSPIRE) and is the caster for SELF casts; the
 * recipient field tells the client how to narrate it.
 */
function buildEffectBroadcastPayload({ caster, target, recipient, effect, card, slot }) {
  return {
    effect,
    by: caster.playerName,
    casterId: caster.playerId,
    on: target?.playerName || null,
    targetId: target?.playerId || null,
    recipient: recipient || 'OFFENSIVE',
    card_name: card?.name || null,
    // PR-E: slot is 1-indexed (matches combat:windup + combat:attack). null
    // when caller doesn't know (legacy callers / non-cast pathways).
    slot: typeof slot === 'number' ? slot + 1 : null,
    x: caster.x,
    y: caster.y,
    tx: target?.x,
    ty: target?.y,
  };
}

/**
 * Evaluate whether the round should end this tick, post-KO processing.
 *
 * Returns the endReason if the round should end, or null to continue.
 * Pure function — no side effects, no broadcasts. Caller uses the result
 * to decide whether to invoke endRound().
 *
 * §9.108: a previous version of this check skipped endRound when
 * `alive.length === 0` (mutual KO / AOE wipe), which left the round
 * stuck in FIGHTING with all sprites visible at 0 HP and no intermission
 * firing. Symptom Wray reported 2026-04-26: "sprite gets left on the
 * arena with 0 hp bar and the next round doesn't fire."
 *
 * @param {Array<{guildTag, hp, waitingForRound}>} nines all fighters in zone
 * @param {boolean} anyKO whether any fighter died this tick
 * @returns {'last_standing'|'mutual_ko'|null}
 */
function evaluateRoundEnd(nines, anyKO) {
  if (!anyKO) return null;
  const alive = (nines || []).filter(
    (n) => !n.waitingForRound && n.hp > 0,
  );
  if (alive.length === 0) return 'mutual_ko';
  const guilds = new Set(alive.map((n) => n.guildTag));
  if (guilds.size <= 1) return 'last_standing';
  return null;
}

module.exports = {
  buildRoundStartNinePayload,
  calculateRoundXP,
  buildAttackBroadcastPayload,
  buildEffectBroadcastPayload,
  buildWindupBroadcastPayload,
  classifyEffectRecipient,
  evaluateRoundEnd,
};
