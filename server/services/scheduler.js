const cron = require('node-cron');
const twitterBot = require('./twitterBot');
const territoryControl = require('./territoryControl');
const activityDecay = require('./activityDecay');
const nermBot = require('./nermBot');
const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

// Try to load livesReset, but don't fail if it doesn't exist
let livesReset = null;
try {
  livesReset = require('./livesReset');
} catch (e) {
  console.log('⚠️ livesReset module not found - lives reset will use inline function');
}

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

  // ============================================
  // SPELL PROCESSING - Every 2 minutes
  // ============================================
  cron.schedule('*/2 * * * *', async () => {
    try {
      const zone = await territoryControl.getCurrentObjective();
      if (!zone || !zone.objective_tweet_id) return;

      console.log(`[${new Date().toISOString()}] ⚡ Processing spell casts`);
      const casts = await twitterBot.processSpellCasts();

      if (casts.length > 0) {
        console.log(`✅ Processed ${casts.length} casts`);

        // Nerm only replies to casts he "noticed" (10% chance, set in processSpellCasts)
        const noticedCasts = casts.filter(c => c.nermNoticed);

        for (const cast of noticedCasts) {
          try {
            if (!cast.tweet_id) continue;

            const response = await nermBot.generateCustomResponse(
              `You just noticed @${cast.player} from ${cast.schoolName} cast "${cast.spell}" and earned ${cast.points} points. 

React specifically to:
- Their school (${cast.schoolName}) - maybe judge their faction
- Their spell name ("${cast.spell}") - comment on the spell choice
- Their point total (${cast.points}) - impressive or pathetic?

Keep it under 200 characters. Be deadpan. One sentence max.`
            );

            if (response) {
              await nermBot.replyAsNerm(response, cast.tweet_id);
              console.log(`🐱 Nerm noticed @${cast.player}'s cast and replied`);
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (e) {
            console.error(`Nerm reply error for @${cast.player}:`, e.message);
          }
        }

        if (noticedCasts.length > 0) {
          console.log(`🐱 Nerm noticed ${noticedCasts.length}/${casts.length} casts`);
        }
      }
    } catch (error) {
      console.error('❌ Error processing casts:', error.message);
    }
  });

  // ============================================
  // @9LVNetwork POSTS - BOUNTIES
  // ============================================
  // 3 bounties per day: Morning, Afternoon, Evening
  // Each bounty runs for ~5-6 hours before results

  // 08:00 UTC - MORNING BOUNTY
  cron.schedule('0 8 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🌅 Posting MORNING bounty`);
    try {
      await twitterBot.rotateObjective();
      const tweet = await twitterBot.postDailyObjective();
      if (tweet) console.log(`✅ Posted morning bounty: ${tweet.id}`);
    } catch (error) {
      console.error('❌ Error posting morning bounty:', error.message);
    }
  });

  // 13:00 UTC - Close morning bounty, post results
  cron.schedule('0 13 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🏆 Closing MORNING bounty`);
    try {
      const tweet = await twitterBot.postDailyResults();
      if (tweet) console.log(`✅ Posted morning results: ${tweet.id}`);
    } catch (error) {
      console.error('❌ Error posting morning results:', error.message);
    }
  });

  // 14:00 UTC - AFTERNOON BOUNTY
  cron.schedule('0 14 * * *', async () => {
    console.log(`[${new Date().toISOString()}] ☀️ Posting AFTERNOON bounty`);
    try {
      await twitterBot.rotateObjective();
      const tweet = await twitterBot.postDailyObjective();
      if (tweet) console.log(`✅ Posted afternoon bounty: ${tweet.id}`);
    } catch (error) {
      console.error('❌ Error posting afternoon bounty:', error.message);
    }
  });

  // 19:00 UTC - Close afternoon bounty, post results
  cron.schedule('0 19 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🏆 Closing AFTERNOON bounty`);
    try {
      const tweet = await twitterBot.postDailyResults();
      if (tweet) console.log(`✅ Posted afternoon results: ${tweet.id}`);
    } catch (error) {
      console.error('❌ Error posting afternoon results:', error.message);
    }
  });

  // 20:00 UTC - EVENING BOUNTY
  cron.schedule('0 20 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🌙 Posting EVENING bounty`);
    try {
      await twitterBot.rotateObjective();
      const tweet = await twitterBot.postDailyObjective();
      if (tweet) console.log(`✅ Posted evening bounty: ${tweet.id}`);
    } catch (error) {
      console.error('❌ Error posting evening bounty:', error.message);
    }
  });

  // 01:00 UTC (next day) - Close evening bounty, post results
  cron.schedule('0 1 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🏆 Closing EVENING bounty`);
    try {
      const tweet = await twitterBot.postDailyResults();
      if (tweet) console.log(`✅ Posted evening results: ${tweet.id}`);
    } catch (error) {
      console.error('❌ Error posting evening results:', error.message);
    }
  });
  });

  // ============================================
  // @9LV_Nerm POSTS
  // ============================================

  // 09:00 UTC - Morning grumpy (100%)
  cron.schedule('0 9 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🐱 Nerm morning grumpy`);
    try {
      const prompts = [
        "It's morning in the wizard game. You just woke up and are NOT happy about having to watch these wizards cast spells all day. Complain briefly.",
        "Another day of watching wizard cats pretend to be magical. Express your displeasure at being awake.",
        "The sun is up. The wizards are stirring. You'd rather be sleeping. Share your morning mood.",
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

  // 14:00 UTC - Afternoon observation (100%)
  cron.schedule('0 14 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🐱 Nerm afternoon observation`);
    try {
      const response = await nermBot.generateCustomResponse(
        "It's the middle of the day in the wizard game. Make a random sarcastic observation about being a cat forced to watch this. Keep it short."
      );
      if (response) {
        await nermBot.postAsNerm(response);
        console.log('✅ Posted Nerm afternoon observation');
      }
    } catch (error) {
      console.error('❌ Error in Nerm afternoon:', error.message);
    }
  });

  // 17:00 UTC - Evening complaint (80%)
  cron.schedule('0 17 * * *', async () => {
    if (Math.random() < 0.8) {
      console.log(`[${new Date().toISOString()}] 🐱 Nerm evening complaint`);
      try {
        const response = await nermBot.generateCustomResponse(
          "It's late afternoon. The wizards are still going. Express your fatigue with watching this game."
        );
        if (response) {
          await nermBot.postAsNerm(response);
          console.log('✅ Posted Nerm evening complaint');
        }
      } catch (error) {
        console.error('❌ Error in Nerm evening:', error.message);
      }
    }
  });

  // 22:00 UTC - Daily roast (100%)
  cron.schedule('0 22 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🐱 Nerm daily roast`);
    try {
      await nermBot.postDailyObservation();
      console.log('✅ Posted Nerm daily roast');
    } catch (error) {
      console.error('❌ Error in Nerm roast:', error.message);
    }
  });

  // 03:00 UTC - Existential moment (80%)
  cron.schedule('0 3 * * *', async () => {
    if (Math.random() < 0.8) {
      console.log(`[${new Date().toISOString()}] 🐱 Nerm existential moment`);
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

  // 00:00 UTC - Reset mana AND lives
  cron.schedule('0 0 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🔮 Midnight reset: mana + lives`);
    try {
      // Reset mana (use admin client to bypass RLS)
      const { error: manaError } = await supabaseAdmin
        .from('players')
        .update({ mana: 5 })
        .gte('id', 0); // Update all players

      if (manaError) {
        console.error('❌ Error resetting mana:', manaError);
      } else {
        console.log('✅ All player mana reset to 5');
      }

      // Reset lives
      if (livesReset) {
        await livesReset.resetAllLives();
        await livesReset.expirePendingDuels();
      } else {
        // Inline lives reset if module not available (use admin client)
        const { error: livesError } = await supabaseAdmin
          .from('players')
          .update({ lives: 3 })
          .lt('lives', 3);

        if (!livesError) {
          console.log('✅ All player lives reset to 3');
        }
      }
    } catch (error) {
      console.error('❌ Error in midnight reset:', error.message);
    }
  });

  // 01:00 UTC - Activity decay
  cron.schedule('0 1 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 📉 Activity decay`);
    try {
      const result = await activityDecay.processActivityDecay();
      console.log('Activity decay result:', result);
    } catch (error) {
      console.error('❌ Error in activity decay:', error.message);
    }
  });

  // Every 5 minutes - Update zone control
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

  console.log('');
  console.log('✅ Scheduled jobs initialized:');
  console.log('');
  console.log('📢 @9LVNetwork:');
  console.log('   08:00 - Daily objective (AI flavor)');
  console.log('   12:00 - Midday standings');
  console.log('   16:00 - Afternoon reminder');
  console.log('   20:00 - Final push');
  console.log('   23:00 - Daily results');
  console.log('');
  console.log('🐱 @9LV_Nerm:');
  console.log('   09:00 - Morning (100%)');
  console.log('   14:00 - Afternoon (100%)');
  console.log('   17:00 - Evening (80%)');
  console.log('   22:00 - Daily roast (100%)');
  console.log('   03:00 - Existential (80%)');
  console.log('   + Replies to all casts');
  console.log('');
  console.log('⚙️ Maintenance:');
  console.log('   */2 min - Process casts');
  console.log('   */5 min - Update zone control');
  console.log('   00:00 - Reset mana + lives');
  console.log('   01:00 - Activity decay');
  console.log('');
}

function stopAllJobs() {
  cron.getTasks().forEach(task => task.stop());
  jobsInitialized = false;
  console.log('🛑 All scheduled jobs stopped');
}

// Auto-initialize when required
initializeScheduledJobs();

module.exports = {
  initializeScheduledJobs,
  stopAllJobs
};