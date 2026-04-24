// Cards — offer 3 on level-up. Mix of new/upgraded weapons and passives.

import { WEAPON_DEFS, PASSIVE_DEFS } from "./data.js";

// Build the pool of offers legal for the current player state.
export function buildOffers(player) {
  const offers = [];

  // Weapons: owned (can level up if <5) + new (up to 6 total).
  for (const id of Object.keys(WEAPON_DEFS)) {
    const owned = player.weapons.find(w => w.id === id);
    if (owned) {
      if (owned.level < 5) {
        offers.push({
          kind: "weapon", id,
          name: WEAPON_DEFS[id].name,
          art: WEAPON_DEFS[id].art,
          text: `Lv ${owned.level} → ${owned.level + 1}`,
          isNew: false,
        });
      }
    } else {
      if (player.weapons.length < 6) {
        offers.push({
          kind: "weapon", id,
          name: WEAPON_DEFS[id].name,
          art: WEAPON_DEFS[id].art,
          text: "New weapon",
          isNew: true,
        });
      }
    }
  }

  // Passives: max level 5.
  for (const id of Object.keys(PASSIVE_DEFS)) {
    const lv = player.passives[id] || 0;
    if (lv >= 5) continue;
    const def = PASSIVE_DEFS[id];
    offers.push({
      kind: "passive", id,
      name: def.name,
      symbol: def.symbol,
      text: `${def.desc} (Lv ${lv} → ${lv + 1})`,
      isNew: lv === 0,
    });
  }

  return offers;
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

// Apply a chosen offer to the player.
export function applyOffer(player, offer, grantWeapon) {
  if (offer.kind === "weapon") {
    grantWeapon(player, offer.id);
    return;
  }
  // Passive: increment level, recompute derived stats.
  const lv = player.passives[offer.id] || 0;
  player.passives[offer.id] = lv + 1;
  recomputePassiveStats(player);
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
