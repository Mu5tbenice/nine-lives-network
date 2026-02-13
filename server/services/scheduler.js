// ═══════════════════════════════════════════════════════
// server/services/scheduler.js
// Nine Lives Network — Scheduled Jobs
// ═══════════════════════════════════════════════════════

const cron = require('node-cron');
const territoryControl = require('./territoryControl');
const activityDecay = require('./activityDecay');
const narrativeEngine = require('./narrativeEngine');
const effectEngine = require('./effectEngine');
const packSystem = require('./packSystem');
const supabase = require('../config/supabase');

// Optional modules (don't crash if missing)
let twitterBot = null;
let nermBot = null;
try { twitterBot = require('./twitterBot'); } catch (e) { console.log('⚠️ twitterBot not loaded'); }
try { nermBot = require('./nermBot'); } catch (e) { console.log('⚠️ nermBot not loaded'); }

/**
 * SCHEDULE OVERVIEW (all times UTC)
 *
 * 00:00  MIDNIGHT BANKING — the big one:
 *        snapshot influence → process flags (POISON/CORRODE)
 *        → flip zones → award bonuses → decay 40%
 *        → reset mana to 7 → update streaks → clear flags
 *
 * 00:05  Process card upgrades (mana + energy check)
 * 01:30  Activity decay (inactive players)
 *
 * 08:05  Narrative: Opening tweet + set objective
 * 14:05  Narrative: Midday standings
 * 18:00  Narrative: Last call
 * 22:05  Narrative: Resolution + winner
 *
  every 2 min    Process Twitter spell casts (8AM-10PM)
  every 5 min    Update zone control percentages
  every 5 min    Save influence snapshot (for dominance charts)
  every 10 min   Scrape narrative replies (8AM-10PM)
 */

let jobsInitialized = false;
const jobLog = {}; // Track last run times

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
  // MIDNIGHT BANKING — 00:00 UTC
  // This is the main daily reset
  // ════════════════════════════════
  cron.schedule('0 0 * * *', async () => {
    console.log(`[${ts()}] 🏦 MIDNIGHT BANKING`);
    logJob('midnight_banking');
    try {
      const result = await territoryControl.midnightBanking();
      console.log('✅ Midnight banking complete:', JSON.stringify(result));
    } catch (e) {
      console.error('❌ Midnight banking error:', e.message);
    }
  });

  // ════════════════════════════════
  // CARD UPGRADES — 00:05 UTC
  // Check yesterday's hands for upgrade eligibility
  // ════════════════════════════════
  cron.schedule('5 0 * * *', async () => {
    console.log("[" + ts() + "] Processing card upgrades");
    logJob('card_upgrades');
    try {
      const result = await packSystem.processUpgrades();
      console.log('✅ Card upgrades:', result.upgraded, 'processed');
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
      const result = await activityDecay.processActivityDecay();
      console.log('✅ Activity decay:', result);
    } catch (e) {
      console.error('❌ Activity decay:', e.message);
    }
  });

  // ════════════════════════════════
  // NARRATIVE RAIDS — Daily story arc
  // ════════════════════════════════

  // Tweet 1: Story opening + set today's objective
  cron.schedule('5 8 * * *', async () => {
    console.log(`[${ts()}] 📖 Narrative: Opening`);
    logJob('narrative_opening');
    try {
      // Set random objective zone for today
      await territoryControl.setRandomObjective();
      await narrativeEngine.postOpening();
    } catch (e) { console.error('❌ Narrative opening:', e.message); }
  });

  // Tweet 2: Midday standings
  cron.schedule('5 14 * * *', async () => {
    console.log(`[${ts()}] 📊 Narrative: Midday`);
    logJob('narrative_midday');
    try {
      await narrativeEngine.postMidDay();
    } catch (e) { console.error('❌ Narrative midday:', e.message); }
  });

  // Tweet 3: Last call
  cron.schedule('0 18 * * *', async () => {
    console.log(`[${ts()}] ⏰ Narrative: Last call`);
    logJob('narrative_lastcall');
    try {
      await narrativeEngine.postLastCall();
    } catch (e) { console.error('❌ Narrative last call:', e.message); }
  });

  // Tweet 4: Resolution + winner
  cron.schedule('5 22 * * *', async () => {
    console.log(`[${ts()}] 🏆 Narrative: Resolution`);
    logJob('narrative_resolution');
    try {
      await narrativeEngine.postResolution();
    } catch (e) { console.error('❌ Narrative resolution:', e.message); }
  });

  // Scrape narrative replies every 10 min (8AM-10PM)
  cron.schedule('*/10 8-21 * * *', async () => {
    try {
      await narrativeEngine.periodicScrape();
      logJob('narrative_scrape');
    } catch (e) { console.error('❌ Narrative scrape:', e.message); }
  });

  // ════════════════════════════════
  // TERRITORY — Real-time updates
  // ════════════════════════════════

  // Process Twitter spell casts every 2 min (during active hours)
  cron.schedule('*/2 8-22 * * *', async () => {
    try {
      if (!twitterBot) return;
      const zone = await territoryControl.getCurrentObjective();
      if (!zone || !zone.objective_tweet_id) return;

      const casts = await twitterBot.processSpellCasts();
      if (!casts || casts.length === 0) return;
      console.log("[" + ts() + "] Processed " + casts.length + " casts");
      console.log(`[${ts()}] ⚡ Processed ${casts.length} casts`);
      logJob('cast_processing');

      // Nerm reply guy — reacts to noticed casts
      if (nermBot) {
        const noticed = casts.filter(c => c.nermNoticed);
        for (const cast of noticed) {
          try {
            if (!cast.tweet_id) continue;
            const response = await nermBot.generateCustomResponse(
              'You noticed @' + cast.player + ' from ' + cast.schoolName +
              ' cast "' + cast.spell + '" for ' + cast.points +
              ' points. React. Under 200 chars. Deadpan. One sentence.'
            );
            if (response) {
              await nermBot.replyAsNerm(response, cast.tweet_id);
              console.log('🐱 Nerm replied to @' + cast.player);
            }
            await new Promise(r => setTimeout(r, 2000));
          } catch (e) { console.error('Nerm reply error:', e.message); }
        }
      }
    } catch (e) { console.error('❌ Cast processing:', e.message); }
  });

  // Update zone control every 5 min
  cron.schedule('*/5 * * * *', async () => {
    try {
      const updated = await territoryControl.updateAllZoneControl();
      if (updated > 0) logJob('zone_control_update');
    } catch (e) { console.error('❌ Zone control update:', e.message); }
  });

  // Save influence snapshot every 5 min (for dominance sparkline charts)
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
        const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        await admin.from('zone_influence_history').insert(inserts);
        logJob('influence_snapshot');
      }
    } catch (e) { /* silent — non-critical */ }
  });

  // ════════════════════════════════
  // DONE
  // ════════════════════════════════

  jobsInitialized = true;

  console.log('');
  console.log('✅ Scheduler initialized:');
  console.log('');
  console.log('🏦 Midnight Banking:');
  console.log('   00:00 — Full midnight banking (snapshot, flags, flip, decay, reset)');
  console.log('   00:05 — Card upgrades');
  console.log('   01:30 — Activity decay');
  console.log('');
  console.log('📖 Narrative Raids:');
  console.log('   08:05 — Opening + set objective');
  console.log('   14:05 — Midday standings');
  console.log('   18:00 — Last call');
  console.log('   22:05 — Resolution');
  console.log('   */10  — Scrape replies (8AM-10PM)');
  console.log('');
  console.log('🗺️  Territory:');
  console.log('   */2   — Process casts (8AM-10PM)');
  console.log('   */5   — Update zone control');
  console.log('   */5   — Influence snapshots (for charts)');
  console.log('');
  console.log('🐱 Nerm: Reply guy (reacts to noticed casts)');
  console.log('');
}

// Timestamp helper
function ts() { return new Date().toISOString(); }

// Get job status (used by admin health endpoint)
function getJobStatus() {
  return {
    initialized: jobsInitialized,
    lastRuns: jobLog,
    timestamp: new Date().toISOString(),
  };
}

function stopAllJobs() {
  cron.getTasks().forEach(task => task.stop());
  jobsInitialized = false;
  console.log('🛑 All scheduled jobs stopped');
}

// Auto-start
initializeScheduledJobs();

module.exports = { initializeScheduledJobs, stopAllJobs, getJobStatus };