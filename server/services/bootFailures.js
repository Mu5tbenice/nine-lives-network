// ═══════════════════════════════════════════════════════
// server/services/bootFailures.js
// Boot-time observability — shared accumulator for failed
// require() calls across server/index.js and scheduler.js.
// Exposed via /api/health as failed_requires.
// ═══════════════════════════════════════════════════════

const failures = [];

function captureBootFailure(module, error) {
  failures.push({
    module,
    error: error?.message || String(error),
    stack: error?.stack || null,
    timestamp: new Date().toISOString(),
  });
}

function getBootFailures() {
  return [...failures];
}

module.exports = { captureBootFailure, getBootFailures };
