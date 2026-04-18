// ESLint config for Nine Lives Network
// Minimal baseline: eslint:recommended + Node globals. No custom rules beyond
// what's needed to silence known false positives for this codebase's patterns.
// Any rule relaxation below should be explained in the PR that introduced it.

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script', // CommonJS — server uses require/module.exports
  },
  extends: ['eslint:recommended'],
  rules: {
    // Relaxations for the 8.5 baseline PR (see PR body for rationale):
    // - no-unused-vars: 54 findings, pervasive legacy noise; future cleanup can re-enable.
    // - no-empty: 11 findings, all from the intentional graceful-degradation pattern (PRD §7.2).
    // - no-inner-declarations: 2 findings, stylistic only.
    // - no-case-declarations: 1 finding in arena-engine.js which is dead code (§9.11).
    'no-unused-vars': 'off',
    'no-empty': 'off',
    'no-inner-declarations': 'off',
    'no-case-declarations': 'off',
  },
};
