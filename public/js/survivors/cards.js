// Cards — offer 3 on level-up. PR-C3: offers are now drawn from the
// player's drafted collection (via /api/survivors/start) rather than a
// fixed WEAPON_DEFS table. Passive offers from PASSIVE_DEFS still ride
// alongside as the legacy stat-up mechanic.
//
// Crystal economy constants live here so cards.js + ui.js + main.js share
// the same numbers. Sim-tunable.

import { PASSIVE_DEFS } from "./data.js";

// PR-C3 — Crystal economy starter values (sim-tunable).
export const CRYSTAL_REROLL_BASE      = 25;   // first reroll within a level-up
export const CRYSTAL_REROLL_MULT      = 2;    // doubled per use within the same level-up
export const CRYSTAL_UPGRADE_COST     = 50;   // flat per rarity bump
export const CRYSTAL_LEGENDARY_PAYOUT = 200;  // duplicate of an at-cap legendary card

export const CRYSTAL_DROP_NORMAL = 1;
export const CRYSTAL_DROP_ELITE  = 3;
export const CRYSTAL_DROP_BOSS   = 20;

// Build cap (continuous + activated combined). PRD §4.4.18.
export const BUILD_CAP = 6;

/**
 * Build the offer pool for the current level-up.
 *
 * `collection` is the array returned by /api/survivors/start (each entry
 * carries `{ id, spell_id, rarity, spell:{name, image_url, ...} }`).
 * The picker just samples 3 distinct entries from this pool. If the player
 * has fewer than 3 collection entries, fills the remainder with passive
 * offers from PASSIVE_DEFS so the modal always has 3 choices.
 */
export function buildOffers(player, collection) {
  const offers = [];
  const cards = Array.isArray(collection) ? collection : [];

  for (const c of cards) {
    if (!c || !c.spell_id) continue;
    offers.push({
      kind: "card",
      cardId: c.id,
      spellId: c.spell_id,
      rarity: c.rarity || 'common',
      name: (c.spell && c.spell.name) || `Spell ${c.spell_id}`,
      art: cardArtPath(c),
      card: c,
    });
  }

  for (const id of Object.keys(PASSIVE_DEFS)) {
    const lv = (player.passives && player.passives[id]) || 0;
    if (lv >= 5) continue;
    const def = PASSIVE_DEFS[id];
    offers.push({
      kind: "passive",
      id,
      name: def.name,
      symbol: def.symbol,
      text: `${def.desc} (Lv ${lv} → ${lv + 1})`,
      isNew: lv === 0,
    });
  }

  return offers;
}

function cardArtPath(c) {
  if (!c || !c.spell || !c.spell.image_url) return null;
  const url = c.spell.image_url;
  if (url.indexOf('http') === 0 || url.indexOf('/') === 0) return url;
  return `/assets/images/spells/${url}`;
}

// Weighted random pick of k distinct offers.
export function pickOffers(offers, k = 3) {
  const pool = offers.slice();
  const out = [];
  for (let i = 0; i < k && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

// PR-C3: legacy applyOffer is kept for the passive-offer path. Card-offer
// application now lives in main.js because it needs access to the spec
// runtime + grantWeaponFromCard + bumpRarity helpers.
export function applyOffer(player, offer, grantWeapon) {
  if (offer.kind === "passive") {
    const lv = player.passives[offer.id] || 0;
    player.passives[offer.id] = lv + 1;
    recomputePassiveStats(player);
    return;
  }
  // Legacy weapon offers (from prior PRs) — still grant via WEAPON_DEFS.
  if (offer.kind === "weapon") {
    grantWeapon(player, offer.id);
    return;
  }
  // Card offers handled by main.js (needs spec + rarity bump + crystal economy).
}

export function recomputePassiveStats(player) {
  // Reset to base
  player.speed   = 210;
  player.dmgMul  = 1;
  player.dodge   = 0;
  player.regen   = 0;
  player.pickup  = 1;
  player.xpMul   = 1;
  player.crit    = 0;
  player.cdMul   = 1;

  for (const [id, lv] of Object.entries(player.passives)) {
    const def = PASSIVE_DEFS[id];
    if (!def) continue;
    for (const [stat, per] of Object.entries(def.perLevel)) {
      switch (stat) {
        case "moveSpd": player.speed  *= (1 + per * lv); break;
        case "dmgMul":  player.dmgMul *= (1 + per * lv); break;
        case "dodge":   player.dodge  += per * lv; break;
        case "regen":   player.regen  += per * lv; break;
        case "pickup":  player.pickup *= (1 + per * lv); break;
        case "xpMul":   player.xpMul  *= (1 + per * lv); break;
        case "crit":    player.crit   += per * lv; break;
        case "cdMul":   player.cdMul  *= (1 + per * lv); break;
      }
    }
  }
  player.dodge = Math.min(0.6, player.dodge);
  player.crit  = Math.min(0.8, player.crit);
  player.cdMul = Math.max(0.4, player.cdMul);
}
