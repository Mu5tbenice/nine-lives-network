const supabase = require('../config/supabase');
const { twitter9LV } = require('../config/twitter');

/**
 * Post daily objective to Twitter and update database
 */
async function postDailyObjective() {
  console.log('Running daily objective job...');

  try {
    // Get a random non-home zone for today's objective
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('*')
      .eq('zone_type', 'neutral');

    if (zonesError) throw zonesError;
    if (!zones || zones.length === 0) {
      console.error('No neutral zones found');
      return { success: false, error: 'No neutral zones' };
    }

    // Pick a random zone (or you could rotate through them)
    const zone = zones[Math.floor(Math.random() * zones.length)];

    // Clear previous objective
    await supabase
      .from('zones')
      .update({ is_current_objective: false })
      .eq('is_current_objective', true);

    // Set new objective
    await supabase
      .from('zones')
      .update({ is_current_objective: true })
      .eq('id', zone.id);

    // Create tweet content
    const tweetContent = `⚔️ DAILY OBJECTIVE ⚔️

🗺️ Target: ${zone.name}
${zone.description ? `📜 ${zone.description}` : ''}

Reply to this tweet to cast your spell!
🔥 Use your school's magic
✨ Be creative for bonus points
⏰ Ends at 11 PM UTC

#NineLivesNetwork #9LV`;

    // Post to Twitter
    let tweetId = null;
    let tweetUrl = null;

    if (twitter9LV) {
      try {
        const tweet = await twitter9LV.v2.tweet(tweetContent);
        tweetId = tweet.data.id;
        tweetUrl = `https://twitter.com/9LVNetwork/status/${tweetId}`;
        console.log('Posted objective tweet:', tweetUrl);
      } catch (twitterError) {
        console.error('Twitter post failed:', twitterError);
        // Continue anyway - objective is set even if tweet fails
      }
    } else {
      console.warn('Twitter client not configured - skipping tweet');
    }

    // Save to daily_objectives table
    const { error: insertError } = await supabase
      .from('daily_objectives')
      .upsert({
        zone_id: zone.id,
        tweet_id: tweetId,
        tweet_url: tweetUrl,
        game_day: new Date().toISOString().split('T')[0]
      }, { onConflict: 'game_day' });

    if (insertError) {
      console.error('Failed to save daily objective:', insertError);
    }

    console.log(`Daily objective set: ${zone.name} (ID: ${zone.id})`);
    return { success: true, zone, tweetId, tweetUrl };

  } catch (error) {
    console.error('Daily objective job failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { postDailyObjective };