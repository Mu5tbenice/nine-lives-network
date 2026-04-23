// ═══════════════════════════════════════════════════════════════════════
// server/routes/adminChronicle.js
//
// §9.78 — admin-gated endpoints for Chronicle revival diagnostics.
//   POST /api/admin/chronicle/fire-act      — manually trigger an act
//   GET  /api/admin/chronicle/health        — env + last-run state
//   GET  /api/admin/chronicle/recent-runs   — last N rows of chronicle_job_log
//
// Guarded by the same x-admin-key / ADMIN_KEY pattern as server/routes/admin.js.
// Lets Wray invoke posting without waiting for the 08:05 / 12:05 / 16:05 /
// 20:05 UTC cron windows and see the real error in the response body.
// ═══════════════════════════════════════════════════════════════════════
'use strict';

const express = require('express');
const router = express.Router();

let chronicleEngine = null;
let narrativeEngine = null;
let nermTwitter = null;
let chronicleJobLog = null;
try { chronicleEngine = require('../services/chronicleEngine'); } catch (e) {}
try { narrativeEngine = require('../services/narrativeEngine'); } catch (e) {}
try { nermTwitter = require('../services/nermTwitter'); } catch (e) {}
try { chronicleJobLog = require('../services/chronicleJobLog'); } catch (e) {}

function checkAdminKey(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
router.use(checkAdminKey);

// POST /api/admin/chronicle/fire-act
// Body or query: { act: 1|2|3|4 }
router.post('/fire-act', async (req, res) => {
  const actRaw = req.body?.act ?? req.query?.act;
  const act = parseInt(actRaw, 10);
  if (![1, 2, 3, 4].includes(act)) {
    return res.status(400).json({ error: 'act must be 1|2|3|4' });
  }

  const started = Date.now();
  const engineAvailable = !!chronicleEngine;
  const fallbackAvailable = !!narrativeEngine;
  const twitterAvailable = !!nermTwitter?.postTweetAsBot;

  if (!engineAvailable && !fallbackAvailable) {
    if (chronicleJobLog) {
      await chronicleJobLog.record({
        job_name: `chronicle_act${act}`,
        status: 'error',
        act_num: act,
        error_message: 'Neither chronicleEngine nor narrativeEngine is loaded',
        error_code: 'NO_ENGINE',
      });
    }
    return res.status(503).json({
      error: 'No chronicle engine loaded',
      engineAvailable,
      fallbackAvailable,
    });
  }

  try {
    let tweetId = null;
    let engineUsed = null;
    if (engineAvailable && twitterAvailable) {
      engineUsed = 'chronicleEngine (V2)';
      const result = await chronicleEngine.fireAct(act, nermTwitter.postTweetAsBot);
      tweetId = result?.tweet_id || result?.tweetId || null;
    } else if (engineAvailable && !twitterAvailable) {
      engineUsed = 'chronicleEngine (V2) — WARNING: nermTwitter.postTweetAsBot not available';
      const result = await chronicleEngine.fireAct(act, async () => null);
      tweetId = result?.tweet_id || result?.tweetId || null;
    } else {
      engineUsed = 'narrativeEngine (V4 fallback)';
      const fn = narrativeEngine[`postAct${act}`];
      if (typeof fn !== 'function') {
        throw new Error(`narrativeEngine.postAct${act} is not a function`);
      }
      const result = await fn();
      tweetId = result?.tweet_id || result?.tweetId || null;
    }
    const duration = Date.now() - started;
    if (chronicleJobLog) {
      await chronicleJobLog.record({
        job_name: `chronicle_act${act}`,
        status: 'success',
        duration_ms: duration,
        tweet_id: tweetId,
        act_num: act,
        metadata: { engineUsed, triggered: 'manual-admin' },
      });
    }
    return res.json({ ok: true, act, engineUsed, tweet_id: tweetId, duration_ms: duration });
  } catch (e) {
    const duration = Date.now() - started;
    if (chronicleJobLog) {
      await chronicleJobLog.record({
        job_name: `chronicle_act${act}`,
        status: 'error',
        duration_ms: duration,
        act_num: act,
        error_message: e.message,
        error_code: e.code || null,
        metadata: { stack: String(e.stack || '').split('\n').slice(0, 6).join('\n'), triggered: 'manual-admin' },
      });
    }
    return res.status(500).json({
      error: e.message,
      code: e.code || null,
      act,
      stack: String(e.stack || '').split('\n').slice(0, 8).join('\n'),
    });
  }
});

// GET /api/admin/chronicle/health
router.get('/health', async (req, res) => {
  const env = {
    // Posting auth (@9LVNetwork or @9LV_Nerm — whichever nermTwitter is using)
    TWITTER_API_KEY:       !!process.env.TWITTER_API_KEY,
    TWITTER_API_SECRET:    !!process.env.TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN:  !!process.env.TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET: !!process.env.TWITTER_ACCESS_SECRET,
    // Alt creds for @9LVNetwork (via server/config/twitter.js)
    NINELIVES_ACCESS_TOKEN:  !!process.env.NINELIVES_ACCESS_TOKEN,
    NINELIVES_ACCESS_SECRET: !!process.env.NINELIVES_ACCESS_SECRET,
    // LLM
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    // DB
    SUPABASE_URL:              !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const modules = {
    chronicleEngine: !!chronicleEngine,
    narrativeEngine: !!narrativeEngine,
    nermTwitter: !!nermTwitter,
    postTweetAsBot: !!nermTwitter?.postTweetAsBot,
    chronicleJobLog: !!chronicleJobLog,
  };

  let lastSuccess = [];
  if (chronicleJobLog) {
    try { lastSuccess = await chronicleJobLog.latestSuccessPerJob(); } catch (e) {}
  }

  res.json({ env, modules, lastSuccess });
});

// GET /api/admin/chronicle/recent-runs?limit=20&job=chronicle_act1
router.get('/recent-runs', async (req, res) => {
  if (!chronicleJobLog) {
    return res.status(503).json({ error: 'chronicleJobLog module not loaded' });
  }
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
  const job_name = req.query.job || null;
  const rows = await chronicleJobLog.recent({ job_name, limit });
  res.json({ rows });
});

module.exports = router;
