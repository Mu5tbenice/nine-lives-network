const cron = require('node-cron');
const twitterBot = require('./twitterBot');
const territoryControl = require('./territoryControl');
const activityDecay = require('./activityDecay');
const nermBot = require('./nermBot');
const supabase = require('../config/supabase');

/**
 * Scheduled Jobs for Nine Lives Network
 * All times are in UTC
 * 
 * @9LVNetwork Schedule (6-8 posts/day):
 *   08:00 - Daily objective
 *   12:00 - Midday standings
 *   16:00 - Afternoon reminder
 *   20:00 - Final push
 *   23:00 - Daily results
 * 
 * @9LV_Nerm Schedule (5-8 posts/day):
 *   09:00 - Morning grumpy (100%)
 *   14:00 - Afternoon observation (100%)
 *   17:00 - Evening complaint (80%)
 *   22:00 - Daily roast (100%)
 *   03:00 - Existential moment (80%)
 *   + Random reactions to casts (15% chance)
 */

let jobsInitialized = false;

function initializeScheduledJobs() {
  if (jobsInitialized) {
    console.log('⚠️ Scheduled jobs already initialized');
    return;
  }

  console.log('🕐 Initializing scheduled jobs...');

  // ============================================
  // SPELL PROCESSING
  // ============================================

  /**
   * Process spell casts every 2 minutes
   * Only runs if there's an active objective tweet
   */
  cron.schedule('*/2 * * * *', async () => {
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

        // Random Nerm reaction to casts (15% chance per batch with casts)
        if (Math.random() < 0.15 && casts.length > 0) {
          try {
            const randomCast = casts[Math.floor(Math.random() * casts.length)];
            const response = await nermBot.generateCustomResponse(
              `A wizard named @${randomCast.player} just cast "${randomCast.spell}" for ${randomCast.points} points. Make a short sarcastic observation about this. Be grumpy but not mean.`
            );
            if (response) {
              await nermBot.postAsNerm(response);
              console.log('🐱 Nerm reacted to cast');
            }
          } catch (e) {
            console.error('Nerm reaction error:', e.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing casts:', error.message);
    }
  });

  // ============================================
  // @9LVNetwork POSTS
  // ============================================

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
   * Post midday standings at 12:00 PM UTC
   */
  cron.schedule('0 12 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 📊 Running: Midday standings`);
    try {
      const tweet = await twitterBot.postMiddayStandings();
      if (tweet) {
        console.log(`✅ Posted midday standings: ${tweet.id}`);
      }
    } catch (error) {
      console.error('❌ Error posting midday standings:', error.message);
    }
  });

  /**
   * Post afternoon reminder at 4:00 PM UTC
   */
  cron.schedule('0 16 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🔔 Running: Afternoon reminder`);
    try {
      const tweet = await twitterBot.postAfternoonReminder();
      if (tweet) {
        console.log(`✅ Posted afternoon reminder: ${tweet.id}`);
      }
    } catch (error) {
      console.error('❌ Error posting afternoon reminder:', error.message);
    }
  });

  /**
   * Post final push at 8:00 PM UTC
   */
  cron.schedule('0 20 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🚨 Running: Final push`);
    try {
      const tweet = await twitterBot.postFinalPush();
      if (tweet) {
        console.log(`✅ Posted final push: ${tweet.id}`);
      }
    } catch (error) {
      console.error('❌ Error posting final push:', error.message);
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

  // ============================================
  // @9LV_Nerm POSTS
  // ============================================

  /**
   * Nerm morning grumpy post at 9:00 AM UTC (100% chance)
   */
  cron.schedule('0 9 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🐱 Running: Nerm morning grumpy`);
    try {
      const prompts = [
        "It's morning in the wizard game. You just woke up and are NOT happy about having to watch these wizards cast spells all day. Complain about it briefly.",
        "Another day of watching wizard cats pretend to be magical. Express your displeasure at being awake.",
        "The sun is up. The wizards are stirring. You'd rather be sleeping. Share your morning mood.",
        "You're a floating cat head forced to observe a wizard game at 9am. How do you feel about this?",
      ];
      const prompt = prompts[Math.floor(Math.random() * prompts.length)];
      const response = await nermBot.generateCustomResponse(prompt);
      if (response) {
        await nermBot.postAsNerm(response);
        console.log('✅ Posted Nerm morning grumpy');
      }
    } catch (error) {
      console.error('❌ Error in Nerm morning:', error.message);
    }
  });

  /**
   * Nerm afternoon observation at 2:00 PM UTC (100% chance)
   */
  cron.schedule('0 14 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🐱 Running: Nerm afternoon observation`);
    try {
      const response = await nermBot.generateCustomResponse(
        "It's the middle of the day in the wizard game. Make a random sarcastic observation about being a cat forced to watch this. Maybe comment on how the battle is going, or just complain about existence. Keep it short."
      );
      if (response) {
        await nermBot.postAsNerm(response);
        console.log('✅ Posted Nerm afternoon observation');
      }
    } catch (error) {
      console.error('❌ Error in Nerm afternoon:', error.message);
    }
  });

  /**
   * Nerm evening complaint at 5:00 PM UTC (80% chance)
   */
  cron.schedule('0 17 * * *', async () => {
    if (Math.random() < 0.8) {
      console.log(`[${new Date().toISOString()}] 🐱 Running: Nerm evening complaint`);
      try {
        const prompts = [
          "It's late afternoon. The wizards are still going. Express your fatigue with watching this game.",
          "You've been watching wizard cats cast spells for hours. Share a tired, sarcastic thought.",
          "The day is dragging on. Make an observation about time moving slowly when you're a floating cat head.",
          "Evening approaches. The spells continue. Say something grumpy about the state of things.",
        ];
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        const response = await nermBot.generateCustomResponse(prompt);
        if (response) {
          await nermBot.postAsNerm(response);
          console.log('✅ Posted Nerm evening complaint');
        }
      } catch (error) {
        console.error('❌ Error in Nerm evening:', error.message);
      }
    }
  });

  /**
   * Nerm daily roast at 10:00 PM UTC (100% chance)
   */
  cron.schedule('0 22 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🐱 Running: Nerm daily roast`);
    try {
      await nermBot.postDailyObservation();
      console.log('✅ Posted Nerm daily roast');
    } catch (error) {
      console.error('❌ Error in Nerm roast:', error.message);
    }
  });

  /**
   * Nerm existential moment at 3:00 AM UTC (80% chance)
   */
  cron.schedule('0 3 * * *', async () => {
    if (Math.random() < 0.8) {
      console.log(`[${new Date().toISOString()}] 🐱 Running: Nerm existential moment`);
      try {
        await nermBot.maybeGlitch();
        console.log('✅ Posted Nerm existential moment');
      } catch (error) {
        console.error('❌ Error in Nerm existential:', error.message);
      }
    }
  });

  // ============================================
  // MAINTENANCE JOBS
  // ============================================

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
  console.log('');
  console.log('📢 @9LVNetwork Schedule:');
  console.log('   - 08:00 UTC: Daily objective');
  console.log('   - 12:00 UTC: Midday standings');
  console.log('   - 16:00 UTC: Afternoon reminder');
  console.log('   - 20:00 UTC: Final push');
  console.log('   - 23:00 UTC: Daily results');
  console.log('');
  console.log('🐱 @9LV_Nerm Schedule:');
  console.log('   - 09:00 UTC: Morning grumpy (100%)');
  console.log('   - 14:00 UTC: Afternoon observation (100%)');
  console.log('   - 17:00 UTC: Evening complaint (80%)');
  console.log('   - 22:00 UTC: Daily roast (100%)');
  console.log('   - 03:00 UTC: Existential moment (80%)');
  console.log('   - Random: React to casts (15% per batch)');
  console.log('');
  console.log('⚙️ Maintenance:');
  console.log('   - Every 2 min: Process spell casts');
  console.log('   - Every 5 min: Update zone control');
  console.log('   - 00:00 UTC: Mana reset');
  console.log('   - 01:00 UTC: Activity decay');
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