const { TwitterApi } = require('twitter-api-v2');
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabase');

// Admin client for writes (using service role to bypass RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create client for @9LVNetwork
function getNineLivesClient() {
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.NINELIVES_ACCESS_TOKEN,
    accessSecret: process.env.NINELIVES_ACCESS_SECRET,
  });
}

// School data for messages
const schools = {
  1: { name: 'Ember Covenant', emoji: '🔥' },
  2: { name: 'Tidal Conclave', emoji: '🌊' },
  3: { name: 'Stone Covenant', emoji: '🪨' },
  4: { name: 'Zephyr Circle', emoji: '💨' },
  5: { name: 'Storm Assembly', emoji: '⚡' },
  6: { name: 'Umbral Syndicate', emoji: '🌑' },
  7: { name: 'Radiant Order', emoji: '✨' },
  8: { name: 'Arcane Spire', emoji: '🔮' },
  9: { name: 'WildCat Path', emoji: '🐱' },
};

/**
 * Post the daily objective tweet
 */
async function postDailyObjective() {
  try {
    const client = getNineLivesClient();

    // Get today's objective zone
    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone) {
      console.error('No objective zone set!');
      return null;
    }

    const tweet = `⚔️ TODAY'S OBJECTIVE: ${zone.name.toUpperCase()}

Reply with your spell to claim territory for your school!

🎯 Zone bonus: ${zone.bonus_effect || 'Standard points'}
⏰ Ends at midnight UTC

#NineLivesNetwork #9LN`;

    const { data } = await client.v2.tweet(tweet);

    console.log('Posted daily objective:', data.id);

    // Store the tweet ID for tracking replies
    await supabaseAdmin
      .from('zones')
      .update({ 
        objective_tweet_id: data.id,
        objective_posted_at: new Date().toISOString()
      })
      .eq('id', zone.id);

    return data;

  } catch (error) {
    console.error('Error posting daily objective:', error);
    return null;
  }
}

/**
 * Post daily results
 */
async function postDailyResults() {
  try {
    const client = getNineLivesClient();

    // Get today's objective zone
    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone) return null;

    // Get zone control data
    const { data: control } = await supabase
      .from('zone_control')
      .select('school_id, control_percentage')
      .eq('zone_id', zone.id)
      .order('control_percentage', { ascending: false });

    // Get top casters for the day
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: topCasters } = await supabase
      .from('casts')
      .select('player_id, points_earned')
      .eq('zone_id', zone.id)
      .gte('created_at', today.toISOString())
      .order('points_earned', { ascending: false })
      .limit(3);

    // Get player details separately to avoid ambiguous relationship
    const playerIds = topCasters?.map(c => c.player_id) || [];
    const { data: players } = await supabase
      .from('players')
      .select('id, twitter_handle')
      .in('id', playerIds);

    // Build results tweet
    let tweet = `🏆 DAILY RESULTS: ${zone.name}\n\n`;

    if (control && control.length > 0) {
      const winner = control[0];
      const school = schools[winner.school_id];
      tweet += `${school.emoji} ${school.name} claims victory with ${Math.round(winner.control_percentage)}% control!\n\n`;
    }

    if (topCasters && topCasters.length > 0 && players) {
      tweet += `⭐ Top Casters:\n`;
      topCasters.forEach((cast, i) => {
        const medal = ['🥇', '🥈', '🥉'][i];
        const player = players.find(p => p.id === cast.player_id);
        if (player) {
          tweet += `${medal} @${player.twitter_handle}\n`;
        }
      });
    }

    tweet += `\n#NineLivesNetwork #9LN`;

    const { data } = await client.v2.tweet(tweet);
    console.log('Posted daily results:', data.id);

    return data;

  } catch (error) {
    console.error('Error posting daily results:', error);
    return null;
  }
}

/**
 * Read replies to the objective tweet and process spell casts
 * ANY reply is a valid cast!
 */
async function processSpellCasts() {
  try {
    const client = getNineLivesClient();

    // Get the current objective zone with its tweet ID
    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone || !zone.objective_tweet_id) {
      console.log('No objective tweet to check');
      return [];
    }

    // Search for replies to our objective tweet
    // Using search instead of mentions for better reply detection
    const searchQuery = `conversation_id:${zone.objective_tweet_id} -from:9LVNetwork`;

    let mentions;
    try {
      const searchResult = await client.v2.search(searchQuery, {
        'tweet.fields': ['created_at', 'author_id', 'conversation_id', 'in_reply_to_user_id'],
        'user.fields': ['username'],
        'expansions': ['author_id'],
        max_results: 100
      });
      mentions = searchResult;
    } catch (searchError) {
      // Fallback to mentions timeline if search fails
      console.log('Search failed, trying mentions timeline...');
      mentions = await client.v2.userMentionTimeline(
        '2015058106443513856', // @9LVNetwork user ID
        {
          'tweet.fields': ['created_at', 'author_id', 'conversation_id', 'in_reply_to_user_id'],
          'user.fields': ['username'],
          'expansions': ['author_id'],
          max_results: 100,
          since_id: zone.last_processed_tweet_id || undefined
        }
      );
    }

    if (!mentions || !mentions.data || !mentions.data.data) {
      console.log('No new replies found');
      return [];
    }

    const tweets = mentions.data.data || mentions.data;
    const users = mentions.includes?.users || mentions.data.includes?.users || [];

    const processedCasts = [];
    let nermNoticeCount = 0; // Track random Nerm bonuses

    for (const tweet of tweets) {
      // Find the user
      const user = users.find(u => u.id === tweet.author_id);
      if (!user) continue;

      // Check if user is registered
      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('twitter_id', tweet.author_id)
        .single();

      if (!player) {
        console.log(`Unregistered user: @${user.username}`);
        continue;
      }

      // Check if player has mana
      if (player.mana <= 0) {
        console.log(`Player @${user.username} has no mana`);
        continue;
      }

      // Check if already processed this tweet
      const { data: existingCast } = await supabase
        .from('casts')
        .select('id')
        .eq('tweet_id', tweet.id)
        .single();

      if (existingCast) {
        console.log(`Already processed tweet: ${tweet.id}`);
        continue;
      }

      // Parse the spell - ANY reply is valid now!
      const spell = parseSpell(tweet.text, player.school_id);

      // Calculate points
      const { points: basePoints, breakdown } = calculatePoints(spell, zone, player);
      let finalPoints = basePoints;

      // Random Nerm notice bonus (roughly 10% chance, max 3 per batch)
      let nermNoticed = false;
      if (nermNoticeCount < 3 && Math.random() < 0.1) {
        finalPoints += 20;
        breakdown.push('Nerm noticed: +20');
        nermNoticed = true;
        nermNoticeCount++;
      }

      // Record the cast using ADMIN client to bypass RLS
      const { data: cast, error } = await supabaseAdmin
        .from('casts')
        .insert({
          player_id: player.id,
          spell_name: spell.name,
          zone_id: zone.id,
          tweet_id: tweet.id,
          mana_cost: spell.mana_cost,
          points_earned: finalPoints
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording cast:', error);
        continue;
      }

      // Deduct mana and update points using ADMIN client
      await supabaseAdmin
        .from('players')
        .update({ 
          mana: player.mana - spell.mana_cost,
          last_cast_at: new Date().toISOString(),
          seasonal_points: (player.seasonal_points || 0) + finalPoints,
          lifetime_points: (player.lifetime_points || 0) + finalPoints
        })
        .eq('id', player.id);

      // Update zone control
      await updateZoneControl(zone.id, player.school_id, finalPoints);

      processedCasts.push({
        player: user.username,
        spell: spell.name,
        points: finalPoints,
        breakdown,
        nermNoticed,
        isCreative: spell.isCreative
      });

      console.log(`✨ Cast processed: @${user.username} cast ${spell.name} for ${finalPoints} points`);
    }

    // Update last processed tweet ID using ADMIN client
    if (tweets.length > 0) {
      const latestId = tweets[0].id;
      await supabaseAdmin
        .from('zones')
        .update({ last_processed_tweet_id: latestId })
        .eq('id', zone.id);
    }

    console.log(`Processed ${processedCasts.length} casts`);
    return processedCasts;

  } catch (error) {
    console.error('Error processing spell casts:', error);
    return [];
  }
}

/**
 * Parse a spell from tweet text
 * ANY reply is a valid cast - we just detect if there's extra flair
 */
function parseSpell(text, schoolId) {
  const textLower = text.toLowerCase();

  // School spell names for flavor detection
  const schoolSpells = {
    1: ['ember bolt', 'flame shield', 'inferno', 'fire', 'burn', 'blaze'],
    2: ['tidal wave', 'ice barrier', 'tsunami', 'water', 'freeze', 'flood'],
    3: ['rock throw', 'stone wall', 'earthquake', 'earth', 'boulder', 'quake'],
    4: ['wind slash', 'air shield', 'cyclone', 'air', 'gust', 'breeze'],
    5: ['lightning bolt', 'static field', 'thunderstorm', 'lightning', 'thunder', 'shock'],
    6: ['shadow strike', 'dark veil', 'void blast', 'shadow', 'darkness', 'void'],
    7: ['light beam', 'holy shield', 'radiant burst', 'light', 'radiant', 'holy'],
    8: ['arcane missile', 'mana shield', 'arcane explosion', 'arcane', 'magic', 'mystic'],
    9: ['chaos bolt', 'wild magic', 'catastrophe', 'chaos', 'wild', 'random'],
  };

  const spells = schoolSpells[schoolId] || [];

  // Check for school-specific spell keywords (bonus flair)
  let spellName = 'magical strike'; // default
  let hasSchoolFlair = false;

  for (const spell of spells) {
    if (textLower.includes(spell)) {
      spellName = spell;
      hasSchoolFlair = true;
      break;
    }
  }

  // Check for generic cast keywords
  const castKeywords = ['cast', 'spell', 'attack', 'defend', 'magic', '🔮', '⚔️', '✨', '🔥', '💧', '⚡', '🌑', '✨'];
  let hasCastKeyword = castKeywords.some(kw => textLower.includes(kw));

  // Word count for creativity detection
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  // ANY reply is valid - return spell info
  return {
    name: spellName,
    mana_cost: 1,
    type: 'offensive',
    hasSchoolFlair,
    hasCastKeyword,
    wordCount,
    isCreative: wordCount >= 10 // potential creativity bonus
  };
}

/**
 * Calculate points for a spell cast
 * Base: 10 points
 * Bonuses: school flair, word count, zone bonuses
 */
function calculatePoints(spell, zone, player) {
  let points = 10; // Base points for ANY cast
  let breakdown = ['Base: 10'];

  // School flair bonus (+2)
  if (spell.hasSchoolFlair) {
    points += 2;
    breakdown.push('School flair: +2');
  }

  // Effort bonus for longer messages (+3 for 10-30 words, +5 for 30+)
  if (spell.wordCount >= 30) {
    points += 5;
    breakdown.push('Detailed cast: +5');
  } else if (spell.wordCount >= 10) {
    points += 3;
    breakdown.push('Descriptive cast: +3');
  }

  // Zone bonus
  if (zone.bonus_effect === '+50% points') {
    const bonus = Math.floor(points * 0.5);
    points += bonus;
    breakdown.push(`Zone bonus: +${bonus}`);
  } else if (zone.bonus_effect === '+25% school points') {
    const bonus = Math.floor(points * 0.25);
    points += bonus;
    breakdown.push(`Zone bonus: +${bonus}`);
  }

  // Home zone bonus (+20%)
  if (zone.school_id === player.school_id) {
    const bonus = Math.floor(points * 0.2);
    points += bonus;
    breakdown.push(`Home zone: +${bonus}`);
  }

  return { points, breakdown };
}

/**
 * Update zone control based on spell cast
 */
async function updateZoneControl(zoneId, schoolId, points) {
  try {
    // Get current control
    const { data: existing } = await supabase
      .from('zone_control')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('school_id', schoolId)
      .single();

    if (existing) {
      // Update existing control using ADMIN client
      const newPercentage = Math.min(100, existing.control_percentage + (points / 10));
      await supabaseAdmin
        .from('zone_control')
        .update({ control_percentage: newPercentage })
        .eq('id', existing.id);
    } else {
      // Create new control record using ADMIN client
      await supabaseAdmin
        .from('zone_control')
        .insert({
          zone_id: zoneId,
          school_id: schoolId,
          control_percentage: points / 10
        });
    }

    // Normalize percentages so they don't exceed 100% total
    await normalizeZoneControl(zoneId);

  } catch (error) {
    console.error('Error updating zone control:', error);
  }
}

/**
 * Normalize zone control so total = 100%
 */
async function normalizeZoneControl(zoneId) {
  const { data: controls } = await supabase
    .from('zone_control')
    .select('*')
    .eq('zone_id', zoneId);

  if (!controls || controls.length === 0) return;

  const total = controls.reduce((sum, c) => sum + c.control_percentage, 0);

  if (total > 100) {
    // Normalize using ADMIN client
    for (const control of controls) {
      const normalized = (control.control_percentage / total) * 100;
      await supabaseAdmin
        .from('zone_control')
        .update({ control_percentage: normalized })
        .eq('id', control.id);
    }
  }
}

/**
 * Set a new daily objective
 */
async function setDailyObjective(zoneId) {
  try {
    // Clear current objective using ADMIN client
    await supabaseAdmin
      .from('zones')
      .update({ is_current_objective: false })
      .eq('is_current_objective', true);

    // Set new objective using ADMIN client
    await supabaseAdmin
      .from('zones')
      .update({ is_current_objective: true })
      .eq('id', zoneId);

    console.log(`Set new objective: zone ${zoneId}`);
    return true;

  } catch (error) {
    console.error('Error setting objective:', error);
    return false;
  }
}

/**
 * Rotate to a random neutral zone
 */
async function rotateObjective() {
  try {
    const { data: neutralZones } = await supabase
      .from('zones')
      .select('id')
      .eq('zone_type', 'neutral');

    if (!neutralZones || neutralZones.length === 0) {
      console.error('No neutral zones available');
      return false;
    }

    // Pick a random zone
    const randomZone = neutralZones[Math.floor(Math.random() * neutralZones.length)];
    return await setDailyObjective(randomZone.id);

  } catch (error) {
    console.error('Error rotating objective:', error);
    return false;
  }
}

/**
 * Test the bot connection
 */
async function testConnection() {
  try {
    const client = getNineLivesClient();
    const { data: user } = await client.v2.me();
    console.log('Bot connected as:', user.username);
    return user;
  } catch (error) {
    console.error('Bot connection failed:', error.message);
    return null;
  }
}

module.exports = {
  postDailyObjective,
  postDailyResults,
  processSpellCasts,
  setDailyObjective,
  rotateObjective,
  testConnection,
  getNineLivesClient
};