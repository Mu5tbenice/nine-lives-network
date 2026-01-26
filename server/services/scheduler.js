const cron = require('node-cron');
const twitterBot = require('./twitterBot');
const territoryControl = require('./territoryControl');
const activityDecay = require('./activityDecay');
const nermBot = require('./nermBot');
const supabase = require('../config/supabase');

/**
 * Scheduled Jobs for Nine Lives Network
 * All times are in UTC
 */

let jobsInitialized = false;

function initializeScheduledJobs() {
  if (jobsInitialized) {
    console.log('⚠️ Scheduled jobs already initialized');
    return;
  }

  console.log('🕐 Initializing scheduled jobs...');

  /**
   * Process spell casts every 15 minutes (reduced from 2 min to save API credits)
   * Only runs if there's an active objective tweet
   */
  cron.schedule('*/15 * * * *', async () => {
    try {
      // Check if there's an active objective first (no API call)
      const zone = await territoryControl.getCurrentObjective();
      if (!zone || !zone.objective_tweet_id) {
        // No active objective, skip
        return;
      }

      console.log(`[${new Date().toISOString()}] ⚡ Running: Process spell casts`);
      const casts = await twitterBot.processSpellCasts();
      if (casts.length > 0) {
        console.log(`✅ Processed ${casts.length} casts`);
      }
    } catch (error) {
      console.error('❌ Error processing casts:', error.message);
    }
  });

  /**
   * Post daily objective at 8:00 AM UTC
   * Rotates to new zone and posts tweet
   */
  cron.schedule('0 8 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🌅 Running: Post daily objective`);
    try {
      // Rotate to new zone
      await twitterBot.rotateObjective();

      // Post the objective tweet
      const tweet = await twitterBot.postDailyObjective();
      if (tweet) {
        console.log(`✅ Posted objective tweet: ${tweet.id}`);
      }
    } catch (error) {
      console.error('❌ Error posting objective:', error.message);
    }
  });

  /**
   * End of day processing at 11:00 PM UTC
   * Calculates winner, awards bonuses, posts results
   */
  cron.schedule('0 23 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🌙 Running: End of day processing`);
    try {
      // Get current objective zone
      const zone = await territoryControl.getCurrentObjective();
      if (!zone) {
        console.log('⚠️ No objective zone set');
        return;
      }

      // Run end of day processing
      const result = await territoryControl.endOfDayProcessing(zone.id);
      console.log('📊 End of day result:', result);

      // Post results tweet
      const tweet = await twitterBot.postDailyResults();
      if (tweet) {
        console.log(`✅ Posted results tweet: ${tweet.id}`);
      }
    } catch (error) {
      console.error('❌ Error in end of day:', error.message);
    }
  });

  /**
   * Reset mana at midnight UTC
   * All players get 5 mana back
   */
  cron.schedule('0 0 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🔮 Running: Mana reset`);
    try {
      const { error } = await supabase
        .from('players')
        .update({ mana: 5 })
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error resetting mana:', error);
      } else {
        console.log('✅ All player mana reset to 5');
      }
    } catch (error) {
      console.error('❌ Error in mana reset:', error.message);
    }
  });

  /**
   * Activity decay check at 1:00 AM UTC daily
   * Penalizes inactive players
   */
  cron.schedule('0 1 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 📉 Running: Activity decay`);
    try {
      const result = await activityDecay.processActivityDecay();
      console.log('Activity decay result:', result);
    } catch (error) {
      console.error('❌ Error in activity decay:', error.message);
    }
  });

  /**
   * Nerm daily observation at 10:00 PM UTC
   * Posts a sarcastic end-of-day summary
   */
  cron.schedule('0 22 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🐱 Running: Nerm daily observation`);
    try {
      await nermBot.postDailyObservation();
    } catch (error) {
      console.error('❌ Error in Nerm observation:', error.message);
    }
  });

  /**
   * Nerm random existential post at 3:00 AM UTC
   * 30% chance to post something unhinged
   */
  cron.schedule('0 3 * * *', async () => {
    if (Math.random() < 0.3) {
      console.log(`[${new Date().toISOString()}] 🐱 Running: Nerm existential moment`);
      try {
        await nermBot.maybeGlitch();
      } catch (error) {
        console.error('❌ Error in Nerm glitch:', error.message);
      }
    }
  });

  /**
   * Nerm afternoon check-in at 2:00 PM UTC
   * 50% chance to post a random observation
   */
  cron.schedule('0 14 * * *', async () => {
    if (Math.random() < 0.5) {
      console.log(`[${new Date().toISOString()}] 🐱 Running: Nerm afternoon check-in`);
      try {
        const response = await nermBot.generateCustomResponse(
          "It's the middle of the day in the wizard game. Make a random sarcastic observation about being a cat forced to watch this. Keep it short."
        );
        if (response) {
          await nermBot.postAsNerm(response);
        }
      } catch (error) {
        console.error('❌ Error in Nerm afternoon:', error.message);
      }
    }
  });

  /**
   * Update zone control every 5 minutes
   * Keeps the map display current
   */
  cron.schedule('*/5 * * * *', async () => {
    try {
      const zone = await territoryControl.getCurrentObjective();
      if (zone) {
        await territoryControl.updateZoneControlTable(zone.id);
      }
    } catch (error) {
      console.error('❌ Error updating zone control:', error.message);
    }
  });

  jobsInitialized = true;
  console.log('✅ Scheduled jobs initialized:');
  console.log('   - Process casts: every 15 minutes (only when objective active)');
  console.log('   - Daily objective: 8:00 AM UTC');
  console.log('   - End of day: 11:00 PM UTC');
  console.log('   - Mana reset: midnight UTC');
  console.log('   - Activity decay: 1:00 AM UTC');
  console.log('   - Zone control update: every 5 minutes (local only)');
  console.log('   - 🐱 Nerm daily roast: 10:00 PM UTC');
  console.log('   - 🐱 Nerm afternoon (50%): 2:00 PM UTC');
  console.log('   - 🐱 Nerm existential (30%): 3:00 AM UTC');
}

/**
 * Stop all scheduled jobs (for testing)
 */
function stopAllJobs() {
  cron.getTasks().forEach(task => task.stop());
  jobsInitialized = false;
  console.log('🛑 All scheduled jobs stopped');
}

module.exports = {
  initializeScheduledJobs,
  stopAllJobs
};