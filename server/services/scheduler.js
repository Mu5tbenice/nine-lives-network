const packSystem = require('./packSystem');
const effectEngine = require('./effectEngine');
const cron = require('node-cron');
const territoryControl = require('./territoryControl');
const activityDecay = require('./activityDecay');
const narrativeEngine = require('./narrativeEngine');
const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

// Optional modules
let twitterBot = null;
let nermBot = null;
try { twitterBot = require('./twitterBot'); } catch (e) { console.log('⚠️ twitterBot not loaded'); }
try { nermBot = require('./nermBot'); } catch (e) { console.log('⚠️ nermBot not loaded'); }

/**
 * Nine Lives Network — Scheduler
 * 
 * NARRATIVE RAIDS (@9LVNetwork):
 *   08:05  Tweet 1 — Story opening + rally call
 *   14:05  Tweet 2 — Midday standings update
 *   18:00  Tweet 3 — Last call + urgency
 *   22:05  Tweet 4 — Resolution + winner + points
 *   */10   Scrape replies (8AM-10PM)
 * 
 * TERRITORY (website game):
 *   */2    Process spell casts
 *   */5    Update zone control
 *   23:55  End of day territory processing
 * 
 * NERM (reply guy only — no standalone posts):
 *   Reacts to notable spell casts (10% chance, inside cast processing)
 * 
 * MAINTENANCE:
 *   00:00  Reset mana (7) + lives + card upgrades + effect cleanup
 *   01:30  Activity decay
 */

let jobsInitialized = false;

function initializeScheduledJobs() {
  if (jobsInitialized) {
    console.log('⚠️ Scheduled jobs already initialized');
    return;
  }

  console.log('🕐 Initializing scheduled jobs...');

  // ============================================
  // NARRATIVE RAIDS — 4-tweet daily story arc
  // ============================================

  // Tweet 1: Story opening + rally call
  cron.schedule('5 8 * * *', async () => {
    console.log(`[${ts()}] 📖 Narrative: Opening`);
    try {
      await narrativeEngine.postOpening();
    } catch (e) { console.error('❌ Narrative opening:', e.message); }
  });

  // Tweet 2: Midday standings
  cron.schedule('5 14 * * *', async () => {
    console.log(`[${ts()}] 📊 Narrative: Midday update`);
    try {
      await narrativeEngine.postMidDay();
    } catch (e) { console.error('❌ Narrative midday:', e.message); }
  });

  // Tweet 3: Last call
  cron.schedule('0 18 * * *', async () => {
    console.log(`[${ts()}] ⏰ Narrative: Last call`);
    try {
      await narrativeEngine.postLastCall();
    } catch (e) { console.error('❌ Narrative last call:', e.message); }
  });

  // Tweet 4: Resolution + winner
  cron.schedule('5 22 * * *', async () => {
    console.log(`[${ts()}] 🏆 Narrative: Resolution`);
    try {
      await narrativeEngine.postResolution();
    } catch (e) { console.error('❌ Narrative resolution:', e.message); }
  });

  // Scrape replies every 10 min during active hours
  cron.schedule('*/10 8-21 * * *', async () => {
    try {
      await narrativeEngine.periodicScrape();
    } catch (e) { console.error('❌ Narrative scrape:', e.message); }
  });

  // ============================================
  // TERRITORY — Website spell casting game
  // ============================================

  // Process spell casts every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      if (!twitterBot) return;
      const zone = await territoryControl.getCurrentObjective();
      if (!zone || !zone.objective_tweet_id) return;

      const casts = await twitterBot.processSpellCasts();
      if (!casts || casts.length === 0) return;

      console.log(`[${ts()}] ⚡ Processed ${casts.length} casts`);

      // Nerm reply guy — reacts to noticed casts only
      if (nermBot) {
        const noticed = casts.filter(c => c.nermNoticed);
        for (const cast of noticed) {
          try {
            if (!cast.tweet_id) continue;
            const response = await nermBot.generateCustomResponse(
              `You noticed @${cast.player} from ${cast.schoolName} cast "${cast.spell}" for ${cast.points} points. React to their school, spell, or score. Under 200 chars. Deadpan. One sentence.`
            );
            if (response) {
              await nermBot.replyAsNerm(response, cast.tweet_id);
              console.log(`🐱 Nerm replied to @${cast.player}`);
            }
            await new Promise(r => setTimeout(r, 2000));
          } catch (e) {
            console.error(`Nerm reply error:`, e.message);
          }
        }
      }
    } catch (e) { console.error('❌ Cast processing:', e.message); }
  });

  // Update zone control every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await territoryControl.updateAllZoneControl();
    } catch (e) { console.error('❌ Zone control update:', e.message); }
  });

  // End of day territory processing
  cron.schedule('55 23 * * *', async () => {
    console.log(`[${ts()}] 🏰 End of day territory processing`);
    try {
      const result = await territoryControl.endOfDayProcessing();
      console.log('✅ Territory processing complete:', result);
    } catch (e) { console.error('❌ Territory EOD:', e.message); }
  });

  // ============================================
  // MAINTENANCE
  // ============================================

  // Midnight: reset mana + lives + V2 upgrades + cleanup
  cron.schedule('0 0 * * *', async () => {
    console.log(`[${ts()}] 🔮 Midnight reset`);

    // V2: Process card upgrades (check yesterday's mana + energy)
    try {
      const upgradeResult = await packSystem.processUpgrades();
      console.log('[Scheduler] Card upgrades:', upgradeResult.upgraded, 'processed');
    } catch (err) {
      console.error('[Scheduler] Upgrade error:', err.message);
    }

    // V2: Reset mana to 7
    try {
      const { error: manaErr } = await supabaseAdmin
        .from('players')
        .update({ mana: 7 })
        .gte('id', 0);
      if (manaErr) console.error('❌ Mana reset:', manaErr);
      else console.log('✅ Mana reset to 7');
    } catch (e) { console.error('❌ Mana reset:', e.message); }

    // Reset lives
    try {
      const { error: livesErr } = await supabaseAdmin
        .from('players')
        .update({ lives: 3 })
        .lt('lives', 3);
      if (!livesErr) console.log('✅ Lives reset to 3');
    } catch (e) { console.error('❌ Lives reset:', e.message); }

    // V2: Clean expired zone effects
    try {
      await effectEngine.cleanupExpiredEffects();
      console.log('✅ Expired zone effects cleaned');
    } catch (err) {
      console.error('[Scheduler] Cleanup error:', err.message);
    }
  });

  // Activity decay
  cron.schedule('30 1 * * *', async () => {
    console.log(`[${ts()}] 📉 Activity decay`);
    try {
      const result = await activityDecay.processActivityDecay();
      console.log('Activity decay:', result);
    } catch (e) { console.error('❌ Activity decay:', e.message); }
  });

  // ============================================
  // DONE
  // ============================================

  jobsInitialized = true;

  console.log('');
  console.log('✅ Scheduler initialized:');
  console.log('');
  console.log('📖 Narrative Raids (@9LVNetwork):');
  console.log('   08:05 — Opening tweet');
  console.log('   14:05 — Midday standings');
  console.log('   18:00 — Last call');
  console.log('   22:05 — Resolution + winner');
  console.log('   */10  — Scrape replies (8AM-10PM)');
  console.log('');
  console.log('🗺️  Territory:');
  console.log('   */2   — Process spell casts');
  console.log('   */5   — Update zone control');
  console.log('   23:55 — End of day processing');
  console.log('');
  console.log('🐱 Nerm: Reply guy only (reacts to noticed casts)');
  console.log('');
  console.log('⚙️  Maintenance:');
  console.log('   00:00 — Reset mana (7) + lives + upgrades + cleanup');
  console.log('   01:30 — Activity decay');
  console.log('');
}

// Timestamp helper
function ts() { return new Date().toISOString(); }

function stopAllJobs() {
  cron.getTasks().forEach(task => task.stop());
  jobsInitialized = false;
  console.log('🛑 All scheduled jobs stopped');
}

initializeScheduledJobs();

module.exports = { initializeScheduledJobs, stopAllJobs };