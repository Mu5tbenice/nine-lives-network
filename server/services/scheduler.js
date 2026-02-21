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

// V3 services (optional — don't crash if missing)
let manaRegen = null;
let nineSystem = null;
let combatEngine = null;
let bossEngine = null;
try { manaRegen = require('./manaRegen'); } catch (e) { console.log('⚠️ manaRegen not loaded'); }
try { nineSystem = require('./nineSystem'); } catch (e) { console.log('⚠️ nineSystem not loaded'); }
try { combatEngine = require('./combatEngine'); } catch (e) { console.log('⚠️ combatEngine not loaded'); }
try { bossEngine = require('./bossEngine'); } catch (e) { console.log('⚠️ bossEngine not loaded'); }

// Optional modules (don't crash if missing)
let twitterBot = null;
let nermBot = null;
try { twitterBot = require('./twitterBot'); } catch (e) { console.log('⚠️ twitterBot not loaded'); }
try { nermBot = require('./nermBot'); } catch (e) { console.log('⚠️ nermBot not loaded'); }

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
  // MIDNIGHT BANKING — 00:00 UTC
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

    // V3: Heal all Nines to full HP at midnight
    try {
      if (nineSystem) {
        await nineSystem.midnightResetAllNines();
        console.log('✅ All Nines healed to full HP');
      }
    } catch (e) {
      console.error('❌ Nine midnight reset error:', e.message);
    }
  });

  // ════════════════════════════════
  // V3: MANA REGENERATION — every 5 min
  // ════════════════════════════════
  cron.schedule('*/5 * * * *', async () => {
    try {
      if (manaRegen) {
        await manaRegen.regenMana();
        logJob('mana_regen');
      }
    } catch (e) {
      console.error('❌ Mana regen error:', e.message);
    }
  });

  // ════════════════════════════════
  // V3: COMBAT CYCLE — every 15 min
  // ════════════════════════════════
  cron.schedule('*/15 * * * *', async () => {
    try {
      if (combatEngine) {
        console.log(`[${ts()}] ⚔️ Running combat cycle...`);
        const result = await combatEngine.runCombatCycle();
        console.log(`[${ts()}] ⚔️ Combat done: ${result.zones_processed || 0} zones, ${result.knockouts || 0} KOs`);
        logJob('combat_cycle');
      }
    } catch (e) {
      console.error('❌ Combat cycle error:', e.message);
    }
  });

  // ════════════════════════════════
  // V3: BOSS SPAWN — Monday 00:30 UTC
  // ════════════════════════════════
  cron.schedule('30 0 * * 1', async () => {
    try {
      if (bossEngine) {
        console.log(`[${ts()}] 👑 Spawning weekly boss...`);
        const result = await bossEngine.spawnBoss();
        console.log(`[${ts()}] 👑 Boss spawn:`, result.success ? result.boss?.name : result.error);
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
          console.log(`[${ts()}] 👑 Boss cycle: ${result.damage_dealt || 0} dmg, HP: ${result.boss_hp || 'defeated'}`);
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

  // ════════════════════════════════════════════════
  // 📜 THE CHRONICLE — 4-Act Daily Story
  // ════════════════════════════════════════════════

  // Act 1: The Call — 08:05 UTC
  cron.schedule('5 8 * * *', async () => {
    console.log(`[${ts()}] 📜 Chronicle Act 1: The Call`);
    logJob('chronicle_act1');
    try {
      await territoryControl.setRandomObjective();
      await narrativeEngine.postAct1();
    } catch (e) { console.error('❌ Chronicle Act 1:', e.message); }
  });

  // Act 2: The March — 12:05 UTC
  cron.schedule('5 12 * * *', async () => {
    console.log(`[${ts()}] 📜 Chronicle Act 2: The March`);
    logJob('chronicle_act2');
    try {
      await narrativeEngine.postAct2();
    } catch (e) { console.error('❌ Chronicle Act 2:', e.message); }
  });

  // Act 3: The Storm — 16:05 UTC
  cron.schedule('5 16 * * *', async () => {
    console.log(`[${ts()}] 📜 Chronicle Act 3: The Storm`);
    logJob('chronicle_act3');
    try {
      await narrativeEngine.postAct3();
    } catch (e) { console.error('❌ Chronicle Act 3:', e.message); }
  });

  // Act 4: The Reckoning — 20:05 UTC
  cron.schedule('5 20 * * *', async () => {
    console.log(`[${ts()}] 📜 Chronicle Act 4: The Reckoning`);
    logJob('chronicle_act4');
    try {
      await narrativeEngine.postAct4();
    } catch (e) { console.error('❌ Chronicle Act 4:', e.message); }
  });

  // Reply scraping — every 10 min during story hours (8AM-9PM UTC)
  cron.schedule('*/10 8-21 * * *', async () => {
    try {
      await narrativeEngine.periodicScrape();
      logJob('chronicle_scrape');
    } catch (e) { console.error('❌ Chronicle scrape:', e.message); }
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

  cron.schedule('*/5 * * * *', async () => {
    try {
      const updated = await territoryControl.updateAllZoneControl();
      if (updated > 0) logJob('zone_control_update');
    } catch (e) { console.error('❌ Zone control update:', e.message); }
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
  console.log('🏦 Midnight:  00:00 banking + heal | 00:05 upgrades | 01:30 decay');
  console.log('💧 Mana:      */5 regen');
  console.log('⚔️  Combat:    */15 zone cycles + boss cycles');
  console.log('👑 Boss:      Mon 00:30 spawn');
  console.log('');
  console.log('📜 Chronicle:');
  console.log('   08:05 — Act 1: The Call (pre-written hook)');
  console.log('   12:05 — Act 2: The March (AI + player names)');
  console.log('   16:05 — Act 3: The Storm (AI + escalation)');
  console.log('   20:05 — Act 4: The Reckoning (AI + wildcard ending)');
  console.log('   */10  — Reply scraping + quality scoring (8AM-9PM)');
  console.log('');
  console.log('🗺️  Territory: */2 casts | */5 control | */5 snapshots');
  console.log('🐱 Nerm:      Reply guy (reacts to noticed casts)');
  console.log('');
}

function ts() { return new Date().toISOString(); }

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