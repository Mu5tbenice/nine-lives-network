// ═══════════════════════════════════════════════════════
// server/config/flags.js
// Server-side feature flags. Default OFF — only flip after
// playtest confirms the mechanic feels right.
// ═══════════════════════════════════════════════════════

module.exports = {
  // §9.46 deploy lockout — /api/zones/deploy rejects with 423 during an
  // active round (zone roundState === 'FIGHTING'). Deploy is only allowed
  // during intermission. Client shows a countdown to the next window.
  // Flipped ON 2026-04-22 as part of the in-arena combat watch loop rework
  // (see §9.60). The rejoin endpoint (/api/zones/:zoneId/rejoin) is NOT
  // behind this flag, so KO'd players' auto-rejoin + manual rejoin paths
  // continue to work during FIGHTING.
  FEATURE_DEPLOY_LOCKOUT: true,
};
