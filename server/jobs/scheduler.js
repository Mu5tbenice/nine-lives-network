const cron = require('node-cron');
const { postDailyObjective } = require('./dailyObjective');

/**
 * Initialize all scheduled jobs
 */
function initScheduler() {
  console.log('Initializing scheduler...');

  // Daily objective at 8 AM UTC
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running 8 AM daily objective...');
    await postDailyObjective();
  }, {
    timezone: 'UTC'
  });

  // Also run at startup if no objective exists for today
  checkAndPostObjective();

  console.log('Scheduler initialized');
  console.log('- Daily objective: 8 AM UTC');
}

/**
 * Check if today has an objective, if not post one
 */
async function checkAndPostObjective() {
  try {
    const supabase = require('../config/supabase');
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_objectives')
      .select('*')
      .eq('game_day', today)
      .single();

    if (error || !data) {
      console.log('No objective for today - posting one now...');
      await postDailyObjective();
    } else {
      console.log(`Today's objective already set: Zone ${data.zone_id}`);
    }
  } catch (err) {
    console.log('Checking objective status - will post if needed');
    // Table might not exist yet, try posting anyway
    await postDailyObjective();
  }
}

module.exports = { initScheduler, postDailyObjective };