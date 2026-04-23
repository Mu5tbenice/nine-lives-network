// ═══════════════════════════════════════════════════════
// server/services/deployLockout.js
// §9.46 + §9.67 deploy-lockout predicate, extracted from the
// /api/zones/deploy route so it can be unit-tested in isolation.
//
// Returns { block, msLeft } given the combat engine's in-memory zone
// state and the incoming requester's player_id.
//
// 423 fires only when ALL three conditions hold:
//   1. round has real time left (roundEndsAt > now)
//   2. zone has ≥2 distinct guilds present (a genuine contest)
//   3. the requester is not already deployed on this zone (self-reswap
//      is always allowed so players can reconfigure their own loadout)
// ═══════════════════════════════════════════════════════

function shouldBlockDeploy({ zoneState, playerId, now = Date.now() }) {
  if (!zoneState || zoneState.roundState !== 'FIGHTING') {
    return { block: false, msLeft: 0 };
  }
  const nines = zoneState.nines ? Array.from(zoneState.nines.values()) : [];
  const guildsInZone = new Set(nines.map((n) => n.guildTag));
  const msLeft = (zoneState.roundEndsAt || 0) - now;
  const roundHasTimeLeft = msLeft > 0;
  const isContested = guildsInZone.size >= 2;
  const isSelfReswap = nines.some(
    (n) => String(n.playerId) === String(playerId),
  );
  if (roundHasTimeLeft && isContested && !isSelfReswap) {
    return { block: true, msLeft };
  }
  return { block: false, msLeft: Math.max(0, msLeft) };
}

module.exports = { shouldBlockDeploy };
