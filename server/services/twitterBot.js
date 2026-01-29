const { TwitterApi } = require('twitter-api-v2');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
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

// Create Anthropic client for flavor text
function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

// School data for messages
const schools = {
  1: { name: 'Ember Covenant', emoji: '🔥', element: 'fire' },
  2: { name: 'Tidal Conclave', emoji: '🌊', element: 'water' },
  3: { name: 'Stone Covenant', emoji: '🪨', element: 'earth' },
  4: { name: 'Zephyr Circle', emoji: '💨', element: 'air' },
  5: { name: 'Storm Assembly', emoji: '⚡', element: 'lightning' },
  6: { name: 'Umbral Syndicate', emoji: '🌑', element: 'shadow' },
  7: { name: 'Radiant Order', emoji: '✨', element: 'light' },
  8: { name: 'Arcane Spire', emoji: '🔮', element: 'arcane' },
  9: { name: 'WildCat Path', emoji: '🐱', element: 'chaos' },
};

// Zone lore for AI context
const zoneLore = {
  'Crystal Crossroads': 'A nexus of ley lines where magical energy converges. Ancient crystals hum with power.',
  'Mystic Falls': 'Waterfalls that flow upward, defying gravity. The mist carries whispered prophecies.',
  'Ancient Ruins': 'Remnants of a civilization that mastered magic before the schools existed. Secrets lie buried.',
  'Twilight Grove': 'A forest where day and night exist simultaneously. Time moves strangely here.',
  'Dragons Rest': 'Where the last dragon fell. Its bones still radiate magical energy.',
  'The Nexus': 'The heart of Avaloris. All magical paths lead here eventually.',
  'Shadowmere': 'A realm of perpetual dusk. Light spells flicker and fade.',
  'Stormspire': 'A mountain peak where lightning strikes constantly. Only the bold venture here.',
};

// First Blood bonuses
const firstBloodBonuses = {
  1: { points: 25, title: '🩸 First Blood!' },
  2: { points: 15, title: '⚔️ Swift Strike!' },
  3: { points: 10, title: '🗡️ Quick Draw!' },
  4: { points: 7, title: '💨 Fast Cast!' },
  5: { points: 5, title: '⚡ Early Bird!' }
};

/**
 * Generate AI flavor text for objectives
 */
async function generateFlavorText(zone, type = 'objective') {
  try {
    const client = getAnthropicClient();
    const lore = zoneLore[zone.name] || 'A contested territory in the realm of Avaloris.';

    let prompt = '';

    if (type === 'objective') {
      prompt = `You are writing a brief, dramatic announcement for a fantasy wizard game. The zone "${zone.name}" is today's battle objective.

Zone lore: ${lore}

Write 1-2 sentences of dramatic fantasy flavor text announcing this zone is under contest. Be evocative but concise. No hashtags. No emojis. Channel the tone of a war correspondent reporting from a magical battlefield.

Examples of good tone:
- "The ley lines at Crystal Crossroads surge with unstable energy. The schools converge."
- "Dawn breaks over the Ancient Ruins. Today, history will be written in spell-fire."
- "The mists of Mystic Falls part to reveal armies of wizards. Battle is inevitable."`;
    } else if (type === 'midday') {
      prompt = `Write a brief 1-sentence dramatic update about an ongoing magical battle at "${zone.name}". Something like a war correspondent's field report. No hashtags. No emojis. Tense and immediate.`;
    } else if (type === 'final') {
      prompt = `Write a brief 1-sentence urgent announcement that the battle for "${zone.name}" ends in 4 hours. Dramatic, tense, like a final call to arms. No hashtags. No emojis.`;
    }

    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
    });

    return message.content[0].text.trim();
  } catch (error) {
    console.error('AI flavor text error:', error.message);
    return null;
  }
}

/**
 * Check and award First Blood bonus
 */
async function checkFirstBlood(playerId, schoolId, zoneId) {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: todaysCasts } = await supabase
      .from('casts')
      .select('id, player_id, created_at')
      .eq('zone_id', zoneId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: true });

    if (!todaysCasts) {
      return { position: 1, points: 25, title: '🩸 First Blood!' };
    }

    const playerIds = todaysCasts.map(c => c.player_id);
    const { data: players } = await supabase
      .from('players')
      .select('id, school_id')
      .in('id', playerIds);

    const schoolCasts = todaysCasts.filter(cast => {
      const player = players?.find(p => p.id === cast.player_id);
      return player?.school_id === schoolId;
    });

    const alreadyCast = schoolCasts.some(c => c.player_id === playerId);
    if (alreadyCast) return null;

    const position = schoolCasts.length + 1;
    if (position > 5) return null;

    const bonus = firstBloodBonuses[position];
    return { position, points: bonus.points, title: bonus.title };

  } catch (error) {
    console.error('Error checking first blood:', error);
    return null;
  }
}

/**
 * Post the daily objective tweet - WITH AI FLAVOR TEXT
 */
async function postDailyObjective() {
  try {
    const client = getNineLivesClient();

    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone) {
      console.error('No objective zone set!');
      return null;
    }

    // Generate AI flavor text
    const flavorText = await generateFlavorText(zone, 'objective');

    // Build tweet WITHOUT hashtags
    let tweet = `⚔️ TODAY'S BOUNTY: ${zone.name.toUpperCase()}\n\n`;

    if (flavorText) {
      tweet += `${flavorText}\n\n`;
    }

    tweet += `Reply to claim territory for your school.\n`;
    tweet += `🩸 First 5 from each school get bonus points\n`;
    tweet += `⏰ Ends at midnight UTC`;

    const { data } = await client.v2.tweet(tweet);
    console.log('Posted daily objective:', data.id);

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
 * Post midday standings update - WITH AI FLAVOR
 */
async function postMiddayStandings() {
  try {
    const client = getNineLivesClient();

    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone) return null;

    const { data: control } = await supabase
      .from('zone_control')
      .select('school_id, control_percentage')
      .eq('zone_id', zone.id)
      .order('control_percentage', { ascending: false })
      .limit(5);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { count: castCount } = await supabase
      .from('casts')
      .select('*', { count: 'exact', head: true })
      .eq('zone_id', zone.id)
      .gte('created_at', today.toISOString());

    // Generate AI flavor
    const flavorText = await generateFlavorText(zone, 'midday');

    let tweet = `📊 MIDDAY REPORT: ${zone.name}\n\n`;

    if (flavorText) {
      tweet += `${flavorText}\n\n`;
    }

    if (control && control.length > 0) {
      control.slice(0, 3).forEach((c, i) => {
        const school = schools[c.school_id];
        const bar = getProgressBar(c.control_percentage);
        tweet += `${i + 1}. ${school.emoji} ${school.name.split(' ')[0]}: ${Math.round(c.control_percentage)}%\n`;
      });
    } else {
      tweet += `No spells cast yet. Be the first.\n`;
    }

    tweet += `\n⚡ ${castCount || 0} spells cast`;
    tweet += `\n⏰ 12 hours remaining`;

    const { data } = await client.v2.tweet(tweet);
    console.log('Posted midday standings:', data.id);

    return data;

  } catch (error) {
    console.error('Error posting midday standings:', error);
    return null;
  }
}

/**
 * Post afternoon reminder
 */
async function postAfternoonReminder() {
  try {
    const client = getNineLivesClient();

    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone) return null;

    const { data: control } = await supabase
      .from('zone_control')
      .select('school_id, control_percentage')
      .eq('zone_id', zone.id)
      .order('control_percentage', { ascending: false })
      .limit(1);

    let tweet = `⏰ 8 HOURS REMAIN\n\n`;
    tweet += `The battle for ${zone.name} continues.\n\n`;

    if (control && control.length > 0) {
      const leader = schools[control[0].school_id];
      tweet += `${leader.emoji} ${leader.name} leads at ${Math.round(control[0].control_percentage)}%\n\n`;
      tweet += `Will your school answer the call?`;
    } else {
      tweet += `No clear leader. Every spell matters.`;
    }

    const { data } = await client.v2.tweet(tweet);
    console.log('Posted afternoon reminder:', data.id);

    return data;

  } catch (error) {
    console.error('Error posting afternoon reminder:', error);
    return null;
  }
}

/**
 * Post final push reminder - WITH AI FLAVOR
 */
async function postFinalPush() {
  try {
    const client = getNineLivesClient();

    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone) return null;

    const { data: control } = await supabase
      .from('zone_control')
      .select('school_id, control_percentage')
      .eq('zone_id', zone.id)
      .order('control_percentage', { ascending: false })
      .limit(3);

    // Generate AI flavor
    const flavorText = await generateFlavorText(zone, 'final');

    let tweet = `🚨 FINAL HOURS: ${zone.name}\n\n`;

    if (flavorText) {
      tweet += `${flavorText}\n\n`;
    }

    if (control && control.length >= 2) {
      const first = schools[control[0].school_id];
      const second = schools[control[1].school_id];
      const gap = Math.round(control[0].control_percentage - control[1].control_percentage);

      tweet += `${first.emoji} ${first.name.split(' ')[0]}: ${Math.round(control[0].control_percentage)}%\n`;
      tweet += `${second.emoji} ${second.name.split(' ')[0]}: ${Math.round(control[1].control_percentage)}%\n\n`;

      if (gap <= 10) {
        tweet += `${gap}% separates victory from defeat.`;
      } else {
        tweet += `The gap widens. Can anyone close it?`;
      }
    }

    const { data } = await client.v2.tweet(tweet);
    console.log('Posted final push:', data.id);

    return data;

  } catch (error) {
    console.error('Error posting final push:', error);
    return null;
  }
}

/**
 * Helper: Generate a simple progress bar
 */
function getProgressBar(percentage) {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Post daily results - NO HASHTAGS
 */
async function postDailyResults() {
  try {
    const client = getNineLivesClient();

    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone) return null;

    const { data: control } = await supabase
      .from('zone_control')
      .select('school_id, control_percentage')
      .eq('zone_id', zone.id)
      .order('control_percentage', { ascending: false });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: topCasters } = await supabase
      .from('casts')
      .select('player_id, points_earned')
      .eq('zone_id', zone.id)
      .gte('created_at', today.toISOString())
      .order('points_earned', { ascending: false })
      .limit(3);

    const playerIds = topCasters?.map(c => c.player_id) || [];
    const { data: players } = await supabase
      .from('players')
      .select('id, twitter_handle')
      .in('id', playerIds);

    let tweet = `🏆 VICTORY: ${zone.name}\n\n`;

    if (control && control.length > 0) {
      const winner = control[0];
      const school = schools[winner.school_id];
      tweet += `${school.emoji} ${school.name} claims the territory with ${Math.round(winner.control_percentage)}% control.\n\n`;
    }

    if (topCasters && topCasters.length > 0 && players) {
      tweet += `Top Casters:\n`;
      topCasters.forEach((cast, i) => {
        const medal = ['🥇', '🥈', '🥉'][i];
        const player = players.find(p => p.id === cast.player_id);
        if (player) {
          tweet += `${medal} @${player.twitter_handle}\n`;
        }
      });
    }

    tweet += `\nThe battle continues tomorrow.`;

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
 */
async function processSpellCasts() {
  try {
    const client = getNineLivesClient();

    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone || !zone.objective_tweet_id) {
      console.log('No objective tweet to check');
      return [];
    }

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
      console.log('Search failed, trying mentions timeline...');
      mentions = await client.v2.userMentionTimeline(
        '2015058106443513856',
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
    let nermNoticeCount = 0;

    for (const tweet of tweets) {
      const user = users.find(u => u.id === tweet.author_id);
      if (!user) continue;

      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('twitter_id', tweet.author_id)
        .single();

      if (!player) {
        console.log(`Unregistered user: @${user.username}`);
        continue;
      }

      if (player.mana <= 0) {
        console.log(`Player @${user.username} has no mana`);
        continue;
      }

      const { data: existingCast } = await supabase
        .from('casts')
        .select('id')
        .eq('tweet_id', tweet.id)
        .single();

      if (existingCast) {
        console.log(`Already processed tweet: ${tweet.id}`);
        continue;
      }

      const spell = parseSpell(tweet.text, player.school_id);
      const { points: basePoints, breakdown } = calculatePoints(spell, zone, player);
      let finalPoints = basePoints;

      let firstBlood = null;
      const firstBloodResult = await checkFirstBlood(player.id, player.school_id, zone.id);
      if (firstBloodResult) {
        finalPoints += firstBloodResult.points;
        breakdown.push(`${firstBloodResult.title}: +${firstBloodResult.points}`);
        firstBlood = firstBloodResult;
        console.log(`🩸 First Blood #${firstBloodResult.position} for ${schools[player.school_id].name}: @${user.username} (+${firstBloodResult.points})`);
      }

      let nermNoticed = false;
      if (nermNoticeCount < 3 && Math.random() < 0.1) {
        finalPoints += 20;
        breakdown.push('Nerm noticed: +20');
        nermNoticed = true;
        nermNoticeCount++;
      }

      const { data: cast, error } = await supabaseAdmin
        .from('casts')
        .insert({
          player_id: player.id,
          spell_name: spell.name,
          zone_id: zone.id,
          tweet_id: tweet.id,
          mana_cost: spell.mana_cost,
          points_earned: finalPoints,
          school_position: firstBlood?.position || null,
          first_blood_bonus: firstBlood?.points || 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording cast:', error);
        continue;
      }

      await supabaseAdmin
        .from('players')
        .update({ 
          mana: player.mana - spell.mana_cost,
          last_cast_at: new Date().toISOString(),
          seasonal_points: (player.seasonal_points || 0) + finalPoints,
          lifetime_points: (player.lifetime_points || 0) + finalPoints
        })
        .eq('id', player.id);

      await updateZoneControl(zone.id, player.school_id, finalPoints);

      processedCasts.push({
        player: user.username,
        spell: spell.name,
        points: finalPoints,
        breakdown,
        nermNoticed,
        firstBlood,
        isCreative: spell.isCreative,
        tweet_id: tweet.id,
        schoolName: schools[player.school_id]?.name || 'Unknown School'
      });

      console.log(`✨ Cast processed: @${user.username} cast ${spell.name} for ${finalPoints} points`);
    }

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
 */
function parseSpell(text, schoolId) {
  const textLower = text.toLowerCase();

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

  let spellName = 'magical strike';
  let hasSchoolFlair = false;

  for (const spell of spells) {
    if (textLower.includes(spell)) {
      spellName = spell;
      hasSchoolFlair = true;
      break;
    }
  }

  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  return {
    name: spellName,
    mana_cost: 1,
    type: 'offensive',
    hasSchoolFlair,
    wordCount,
    isCreative: wordCount >= 10
  };
}

/**
 * Calculate points for a spell cast
 */
function calculatePoints(spell, zone, player) {
  let points = 10;
  let breakdown = ['Base: 10'];

  if (spell.hasSchoolFlair) {
    points += 2;
    breakdown.push('School flair: +2');
  }

  if (spell.wordCount >= 30) {
    points += 5;
    breakdown.push('Detailed cast: +5');
  } else if (spell.wordCount >= 10) {
    points += 3;
    breakdown.push('Descriptive cast: +3');
  }

  if (zone.bonus_effect === '+50% points') {
    const bonus = Math.floor(points * 0.5);
    points += bonus;
    breakdown.push(`Zone bonus: +${bonus}`);
  } else if (zone.bonus_effect === '+25% school points') {
    const bonus = Math.floor(points * 0.25);
    points += bonus;
    breakdown.push(`Zone bonus: +${bonus}`);
  }

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
    const { data: existing } = await supabase
      .from('zone_control')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('school_id', schoolId)
      .single();

    if (existing) {
      const newPercentage = Math.min(100, existing.control_percentage + (points / 10));
      await supabaseAdmin
        .from('zone_control')
        .update({ control_percentage: newPercentage })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('zone_control')
        .insert({
          zone_id: zoneId,
          school_id: schoolId,
          control_percentage: points / 10
        });
    }

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
    await supabaseAdmin
      .from('zones')
      .update({ is_current_objective: false })
      .eq('is_current_objective', true);

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
  postMiddayStandings,
  postAfternoonReminder,
  postFinalPush,
  processSpellCasts,
  setDailyObjective,
  rotateObjective,
  testConnection,
  getNineLivesClient,
  checkFirstBlood,
  generateFlavorText
};