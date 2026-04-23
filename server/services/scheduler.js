// ═══════════════════════════════════════════════════════
// server/services/scheduler.js
// Nine Lives Network — Scheduled Jobs
// ═══════════════════════════════════════════════════════

const cron = require('node-cron');
const { captureBootFailure } = require('./bootFailures');

// All imports are optional — scheduler should NEVER crash on missing modules
let territoryControl = null;
let activityDecay = null;
let narrativeEngine = null;
let effectEngine = null;
let packSystem = null;
let supabase = null;
let manaRegen = null;
let nineSystem = null;
let combatEngine = null;
let bossEngine = null;
let twitterBot = null;
let nermBot = null;
let dropTicketEngine = null;
let chronicleEngine = null;
let nermTwitter = null;
let nermTelegram = null;

try {
  territoryControl = require('./territoryControl');
} catch (e) {
  console.log('⚠️ territoryControl not loaded');
  captureBootFailure('./services/territoryControl', e);
}
try {
  activityDecay = require('./activityDecay');
} catch (e) {
  console.log('⚠️ activityDecay not loaded');
  captureBootFailure('./services/activityDecay', e);
}
try {
  narrativeEngine = require('./narrativeEngine');
} catch (e) {
  console.log('⚠️ narrativeEngine not loaded');
  captureBootFailure('./services/narrativeEngine', e);
}
try {
  effectEngine = require('./effectEngine');
} catch (e) {
  console.log('⚠️ effectEngine not loaded');
  captureBootFailure('./services/effectEngine', e);
}
try {
  packSystem = require('./packSystem');
} catch (e) {
  console.log('⚠️ packSystem not loaded');
  captureBootFailure('./services/packSystem', e);
}
try {
  supabase = require('../config/supabase');
} catch (e) {
  console.log('⚠️ supabase not loaded');
  captureBootFailure('../config/supabase', e);
}
try {
  combatEngine = require('./combatEngine');
} catch (e) {
  console.log('⚠️ combatEngine not loaded');
  captureBootFailure('./services/combatEngine', e);
}
try {
  bossEngine = require('./bossEngine');
} catch (e) {
  console.log('⚠️ bossEngine not loaded');
  captureBootFailure('./services/bossEngine', e);
}
try {
  nineSystem = require('./nineSystem');
} catch (e) {
  console.log('⚠️ nineSystem not loaded');
  captureBootFailure('./services/nineSystem', e);
}
try {
  twitterBot = require('./twitterBot');
} catch (e) {
  console.log('⚠️ twitterBot not loaded');
  captureBootFailure('./services/twitterBot', e);
}
try {
  nermBot = require('./nermBot');
} catch (e) {
  console.log('⚠️ nermBot not loaded');
  captureBootFailure('./services/nermBot', e);
}
try {
  dropTicketEngine = require('./dropTicketEngine');
} catch (e) {
  console.log('⚠️ dropTicketEngine not loaded');
  captureBootFailure('./services/dropTicketEngine', e);
}
try {
  chronicleEngine = require('./chronicleEngine');
} catch (e) {
  console.log('⚠️ chronicleEngine not loaded');
  captureBootFailure('./services/chronicleEngine', e);
}
// §9.78 — persistent chronicle job log (replaces the in-memory-only jobLog)
let chronicleJobLog = null;
try {
  chronicleJobLog = require('./chronicleJobLog');
} catch (e) {
  console.log('⚠️ chronicleJobLog not loaded');
  captureBootFailure('./services/chronicleJobLog', e);
}
try {
  nermTwitter = require('./nermTwitter');
} catch (e) {
  console.log('⚠️ nermTwitter not loaded');
  captureBootFailure('./services/nermTwitter', e);
}
try {
  nermTelegram = require('./nerm-telegram');
} catch (e) {
  console.log('⚠️ nermTelegram not loaded');
  captureBootFailure('./services/nerm-telegram', e);
}

let jobsInitialized = false;
const jobLog = {};

function logJob(name) {
  jobLog[name] = new Date().toISOString();
}

function initializeScheduledJobs() {
  if (jobsInitialized) {
    console.log('⚠️ Scheduled jobs already initialized');
    return;
  }

  console.log('🕐 Initializing scheduled jobs...');

  // ════════════════════════════════
  // START BOTS (once on load)
  // ════════════════════════════════
  try {
    if (nermTelegram) nermTelegram.startNermBot();
  } catch (e) {
    console.log('⚠️ Nerm Telegram start failed:', e.message);
  }
  try {
    if (nermTwitter) nermTwitter.startNermTwitterBot();
  } catch (e) {
    console.log('⚠️ Nerm Twitter start failed:', e.message);
  }

  // ════════════════════════════════
  // MIDNIGHT BANKING — 00:00 UTC
  // ════════════════════════════════
  cron.schedule('0 0 * * *', async () => {
    console.log(`[${ts()}] 🏦 MIDNIGHT BANKING`);
    logJob('midnight_banking');
    try {
      if (territoryControl) {
        const result = await territoryControl.midnightBanking();
        console.log('✅ Midnight banking complete:', JSON.stringify(result));
      }
    } catch (e) {
      console.error('❌ Midnight banking error:', e.message);
    }

    // Recalculate zone identities (house presence bonus + guild branding)
    await fetch(
      'http://localhost:' +
        (process.env.PORT || 5000) +
        '/api/zones/recalculate-identities',
      {
        method: 'POST',
      },
    ).catch((e) => console.error('Zone identity recalc failed:', e.message));

    // Heal all Nines to full HP at midnight
    try {
      if (nineSystem) {
        await nineSystem.midnightResetAllNines();
        console.log('✅ All Nines healed to full HP');
      }
    } catch (e) {
      console.error('❌ Nine midnight reset error:', e.message);
    }

    // V5: Process Drop Tickets at midnight
    try {
      if (dropTicketEngine) {
        console.log(`[${ts()}] 🎫 Processing Drop Tickets...`);
        const result = await dropTicketEngine.processAllTickets();
        console.log(`✅ Drop Tickets processed: ${result.processed} players`);
        logJob('drop_ticket_process');
      }
    } catch (e) {
      console.error('❌ Drop Ticket processing error:', e.message);
    }
  });

  // V3 combat engine runs its own internal loop via startCombatEngine()
  // Old runCombatCycle cron removed — no longer needed

  // ════════════════════════════════
  // V3: BOSS SPAWN — Monday 00:30 UTC
  // ════════════════════════════════
  cron.schedule('30 0 * * 1', async () => {
    try {
      if (bossEngine) {
        console.log(`[${ts()}] 👑 Spawning weekly boss...`);
        const result = await bossEngine.spawnBoss();
        console.log(
          `[${ts()}] 👑 Boss spawn:`,
          result.success ? result.boss?.name : result.error,
        );
        logJob('boss_spawn');
      }
    } catch (e) {
      console.error('❌ Boss spawn error:', e.message);
    }
  });

  // ════════════════════════════════
  // V3: BOSS COMBAT — every 15 min
  // ════════════════════════════════
  cron.schedule('*/15 * * * *', async () => {
    try {
      if (bossEngine) {
        const result = await bossEngine.bossCombatCycle();
        if (!result.skipped) {
          console.log(
            `[${ts()}] 👑 Boss cycle: ${result.damage_dealt || 0} dmg, HP: ${result.boss_hp || 'defeated'}`,
          );
          logJob('boss_combat');
        }
      }
    } catch (e) {
      console.error('❌ Boss combat error:', e.message);
    }
  });

  // ════════════════════════════════
  // CARD UPGRADES — 00:05 UTC
  // ════════════════════════════════
  cron.schedule('5 0 * * *', async () => {
    console.log('[' + ts() + '] Processing card upgrades');
    logJob('card_upgrades');
    try {
      if (packSystem) {
        const result = await packSystem.processUpgrades();
        console.log('✅ Card upgrades:', result.upgraded, 'processed');
      }
    } catch (e) {
      console.error('❌ Card upgrade error:', e.message);
    }
  });

  // ════════════════════════════════
  // ACTIVITY DECAY — 01:30 UTC
  // ════════════════════════════════
  cron.schedule('30 1 * * *', async () => {
    console.log(`[${ts()}] 📉 Activity decay`);
    logJob('activity_decay');
    try {
      if (activityDecay) {
        const result = await activityDecay.processActivityDecay();
        console.log('✅ Activity decay:', result);
      }
    } catch (e) {
      console.error('❌ Activity decay:', e.message);
    }
  });

  // ════════════════════════════════════════════════
  // 📜 THE CHRONICLE — 4-Act Daily Story
  // ════════════════════════════════════════════════

  // §9.78 — shared wrapper that runs one act and records the outcome
  // into chronicle_job_log. Engine preference: V2 chronicleEngine first,
  // V4 narrativeEngine fallback. Manual admin trigger path lives in
  // routes/adminChronicle.js and uses the same wrapper shape inline.
  async function runChronicleActWithLog(actNum) {
    const started = Date.now();
    let engineUsed = null;
    let tweetId = null;
    try {
      if (chronicleEngine) {
        engineUsed = 'chronicleEngine';
        const { postTweetAsBot } = require('./nermTwitter');
        const result = await chronicleEngine.fireAct(actNum, postTweetAsBot);
        tweetId = result?.tweet_id || result?.tweetId || null;
      } else if (narrativeEngine) {
        engineUsed = 'narrativeEngine';
        const fn = narrativeEngine[`postAct${actNum}`];
        if (typeof fn === 'function') {
          const result = await fn();
          tweetId = result?.tweet_id || result?.tweetId || null;
        } else {
          throw new Error(`narrativeEngine.postAct${actNum} not a function`);
        }
      } else {
        throw new Error('No chronicle engine loaded');
      }
      if (chronicleJobLog) {
        await chronicleJobLog.record({
          job_name: `chronicle_act${actNum}`,
          status: 'success',
          duration_ms: Date.now() - started,
          tweet_id: tweetId,
          act_num: actNum,
          metadata: { engineUsed, triggered: 'cron' },
        });
      }
    } catch (e) {
      console.error(`❌ Chronicle Act ${actNum}:`, e.message);
      if (chronicleJobLog) {
        await chronicleJobLog.record({
          job_name: `chronicle_act${actNum}`,
          status: 'error',
          duration_ms: Date.now() - started,
          act_num: actNum,
          error_message: e.message,
          error_code: e.code || null,
          metadata: { engineUsed, triggered: 'cron', stack: String(e.stack || '').split('\n').slice(0, 6).join('\n') },
        });
      }
    }
  }

  // Act 1: The Call — 08:05 UTC
  cron.schedule('5 8 * * *', async () => {
    console.log(`[${ts()}] 📜 Chronicle Act 1: The Call`);
    logJob('chronicle_act1');
    if (territoryControl) {
      try { await territoryControl.setRandomObjective(); } catch (e) { console.error('❌ setRandomObjective:', e.message); }
    }
    await runChronicleActWithLog(1);
  });

  // Act 2: The March — 12:05 UTC
  cron.schedule('5 12 * * *', async () => {
    console.log(`[${ts()}] 📜 Chronicle Act 2: The March`);
    logJob('chronicle_act2');
    await runChronicleActWithLog(2);
  });

  // Act 3: The Storm — 16:05 UTC
  cron.schedule('5 16 * * *', async () => {
    console.log(`[${ts()}] 📜 Chronicle Act 3: The Storm`);
    logJob('chronicle_act3');
    await runChronicleActWithLog(3);
  });

  // Act 4: The Reckoning — 20:05 UTC
  cron.schedule('5 20 * * *', async () => {
    console.log(`[${ts()}] 📜 Chronicle Act 4: The Reckoning`);
    logJob('chronicle_act4');
    await runChronicleActWithLog(4);
  });

  // Reply scraping — every 10 min during story hours (8AM-9PM UTC)
  cron.schedule('*/10 8-21 * * *', async () => {
    const started = Date.now();
    try {
      // Nerm scans Chronicle replies and mentions, awards points
      if (nermTwitter) await nermTwitter.runNermTwitterCycle();
      else if (narrativeEngine) await narrativeEngine.periodicScrape(); // fallback
      logJob('chronicle_scrape');
      // §9.78 — success row so we can see scrape cadence in the health endpoint.
      if (chronicleJobLog) {
        await chronicleJobLog.record({
          job_name: 'chronicle_scrape',
          status: 'success',
          duration_ms: Date.now() - started,
          metadata: { triggered: 'cron', runner: nermTwitter ? 'nermTwitter' : narrativeEngine ? 'narrativeEngine' : 'none' },
        });
      }
    } catch (e) {
      console.error('❌ Chronicle scrape:', e.message);
      if (chronicleJobLog) {
        await chronicleJobLog.record({
          job_name: 'chronicle_scrape',
          status: 'error',
          duration_ms: Date.now() - started,
          error_message: e.message,
          error_code: e.code || null,
          metadata: { triggered: 'cron' },
        });
      }
    }
  });

  // ════════════════════════════════
  // TERRITORY — Real-time updates
  // ════════════════════════════════

  cron.schedule('*/2 8-22 * * *', async () => {
    try {
      if (!twitterBot) return;
      const zone = await territoryControl.getCurrentObjective();
      if (!zone || !zone.objective_tweet_id) return;

      const casts = await twitterBot.processSpellCasts();
      if (!casts || casts.length === 0) return;
      console.log(`[${ts()}] ⚡ Processed ${casts.length} casts`);
      logJob('cast_processing');

      // Nerm reacts to noticed spell casts — uses nermBrain for AI voice
      const noticed = casts.filter((c) => c.nermNoticed);
      for (const cast of noticed) {
        try {
          if (!cast.tweet_id) continue;
          let response = null;
          const prompt =
            'You noticed @' +
            cast.player +
            ' from ' +
            cast.schoolName +
            ' cast "' +
            cast.spell +
            '" for ' +
            cast.points +
            ' points. React. Under 200 chars. Deadpan. One sentence.';
          // Try nermBrain first (AI), fall back to old nermBot
          try {
            const { askNerm } = require('./nermBrain');
            response = await askNerm(prompt, 'twitter', {
              twitterHandle: cast.player,
            });
          } catch (_) {
            if (nermBot)
              response = await nermBot.generateCustomResponse(prompt);
          }
          if (response) {
            if (nermBot) await nermBot.replyAsNerm(response, cast.tweet_id);
            console.log('🐱 Nerm replied to @' + cast.player);
          }
          await new Promise((r) => setTimeout(r, 2000));
        } catch (e) {
          console.error('Nerm reply error:', e.message);
        }
      }
    } catch (e) {
      console.error('❌ Cast processing:', e.message);
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    try {
      if (territoryControl) {
        const updated = await territoryControl.updateAllZoneControl();
        if (updated > 0) logJob('zone_control_update');
      }
    } catch (e) {
      console.error('❌ Zone control update:', e.message);
    }
  });

  cron.schedule('2,7,12,17,22,27,32,37,42,47,52,57 * * * *', async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const influence = await territoryControl.getAllZoneInfluence(today);
      const inserts = [];

      for (const [zoneId, schools] of Object.entries(influence)) {
        for (const [schoolId, data] of Object.entries(schools)) {
          inserts.push({
            zone_id: parseInt(zoneId),
            school_id: parseInt(schoolId),
            influence_pct: data.percentage,
            snapshot_time: new Date().toISOString(),
          });
        }
      }

      if (inserts.length > 0) {
        const { createClient } = require('@supabase/supabase-js');
        const admin = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
        await admin.from('zone_influence_history').insert(inserts);
        logJob('influence_snapshot');
      }
    } catch (e) {
      /* silent — non-critical */
    }
  });

  // ════════════════════════════════
  // DONE
  // ════════════════════════════════

  jobsInitialized = true;

  console.log('');
  console.log('✅ Scheduler initialized:');
  console.log('');
  console.log(
    '🏦 Midnight:  00:00 banking + heal + drop tickets | 00:05 upgrades | 01:30 decay',
  );
  console.log('⚔️  Combat:    */15 zone cycles + boss cycles');
  console.log('👑 Boss:      Mon 00:30 spawn');
  console.log(
    '🎫 Tickets:   Midnight auto-roll (earned from Chronicle + login)',
  );
  console.log('');
  console.log('📜 Chronicle:');
  console.log('   08:05 — Act 1: The Call (AI-generated with real zone data)');
  console.log('   12:05 — Act 2: The March (AI + player names)');
  console.log('   16:05 — Act 3: The Storm (AI + escalation)');
  console.log('   20:05 — Act 4: The Reckoning (AI + wildcard ending)');
  console.log('   */10  — Reply scraping + quality scoring (8AM-9PM)');
  console.log('');
  console.log('🗺️  Territory: */2 casts | */5 control | */5 snapshots');
  console.log(
    '🐱 Nerm:      Twitter reply-guy (30min scan) + Telegram bot (long-poll)',
  );
  console.log('   Brain:    Claude haiku — game-aware, deadpan, in-character');
  console.log('');
}

function ts() {
  return new Date().toISOString();
}

function getJobStatus() {
  return {
    initialized: jobsInitialized,
    lastRuns: jobLog,
    timestamp: new Date().toISOString(),
  };
}

function stopAllJobs() {
  cron.getTasks().forEach((task) => task.stop());
  jobsInitialized = false;
  console.log('🛑 All scheduled jobs stopped');
}

// Auto-start
initializeScheduledJobs();

module.exports = { initializeScheduledJobs, stopAllJobs, getJobStatus };
