// ═══════════════════════════════════════════════════════
// server/config/flags.js
// Server-side feature flags. Default OFF — only flip after
// playtest confirms the mechanic feels right.
// ═══════════════════════════════════════════════════════

module.exports = {
  // §9.46 deploy lockout — when true, /api/zones/deploy rejects with 423
  // during an active round (zone roundState === 'FIGHTING'). Deploy is only
  // allowed during intermission. Client shows a countdown to the next window.
  // Ships OFF; awaits playtest before flipping. Game Bible V4→V5 change is a
  // separate PR after the flag validates.
  FEATURE_DEPLOY_LOCKOUT: false,
};
