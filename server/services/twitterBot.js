const { TwitterApi } = require('twitter-api-v2');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../config/supabase');
const {
  houses,
  getRandomNarrative,
  getNarrativeById,
  getNermHook,
  buildEscalation,
  buildResolution,
} = require('./narratives');

// Admin client for writes (using service role to bypass RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
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

// Track today's narrative (persists during runtime)
let todaysNarrative = null;
let recentNarrativeIds = [];

// First Blood bonuses
const firstBloodBonuses = {
  1: { points: 25, title: '🩸 First Blood!' },
  2: { points: 15, title: '⚔️ Swift Strike!' },
  3: { points: 10, title: '🗡️ Quick Draw!' },
  4: { points: 7, title: '💨 Fast Cast!' },
  5: { points: 5, title: '⚡ Early Bird!' },
};

// ============================================
// NARRATIVE POST SYSTEM (3 posts per bounty)
// ============================================

/**
 * POST 1 — "The Situation" (Morning post)
 * Sets the scene with the narrative, easy prompt to engage with
 */
async function postMorningSituation() {
  try {
    const client = getNineLivesClient();

    // Get current objective zone
    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone) {
      console.error('No objective zone set!');
      return null;
    }

    // Pick today's narrative (avoid recent ones)
    todaysNarrative = getRandomNarrative(recentNarrativeIds);
    recentNarrativeIds.push(todaysNarrative.id);
    if (recentNarrativeIds.length > 5) recentNarrativeIds.shift();

    console.log(
      `📖 Today's narrative: ${todaysNarrative.title} (${todaysNarrative.id})`,
    );

    // Build the tweet
    let tweet = `📍 ${todaysNarrative.title}\n\n`;
    tweet += `${todaysNarrative.morning.text}\n\n`;
    tweet += `${todaysNarrative.morning.prompt}\n\n`;
    tweet += `🏠 Rep your House\n`;
    tweet += `💰 Rep your Community ($TAG)\n`;
    tweet += `✨ Best replies earn bonus points`;

    // Trim to 280 chars if needed (Twitter limit)
    if (tweet.length > 280) {
      // Shorten the narrative text to fit
      const maxNarrativeLen = 280 - todaysNarrative.morning.prompt.length - 80;
      const shortText =
        todaysNarrative.morning.text.substring(0, maxNarrativeLen) + '...';
      tweet = `📍 ${todaysNarrative.title}\n\n`;
      tweet += `${shortText}\n\n`;
      tweet += `${todaysNarrative.morning.prompt}\n\n`;
      tweet += `🏠 Rep your House\n`;
      tweet += `✨ Best replies earn bonus points`;
    }

    const { data } = await client.v2.tweet(tweet);
    console.log('📖 Posted morning situation:', data.id);

    // Store the tweet ID and narrative title on the zone
    await supabaseAdmin
      .from('zones')
      .update({
        objective_tweet_id: data.id,
        objective_posted_at: new Date().toISOString(),
        narrative_title: todaysNarrative.title,
      })
      .eq('id', zone.id);

    // Nerm reacts to the narrative
    try {
      const nermBot = require('./nermBot');
      const nermHook = getNermHook(todaysNarrative.id, 'morning');
      if (nermHook) {
        // Small delay so it looks natural
        setTimeout(
          async () => {
            await nermBot.replyAsNerm(nermHook, data.id);
            console.log(`🐱 Nerm commented on the situation`);
          },
          30000 + Math.random() * 60000,
        ); // 30-90 seconds later
      }
    } catch (nermError) {
      console.log('Nerm comment skipped:', nermError.message);
    }

    return data;
  } catch (error) {
    console.error('Error posting morning situation:', error);
    return null;
  }
}

/**
 * POST 2 — "The Escalation" (Midday post)
 * Uses real participation data + highlights top replies
 */
async function postEscalation() {
  try {
    const client = getNineLivesClient();

    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone) return null;

    // Use current narrative or fall back
    const narrative = todaysNarrative || getRandomNarrative();

    // Get today's cast data
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: todaysCasts } = await supabase
      .from('casts')
      .select('player_id, points_earned')
      .eq('zone_id', zone.id)
      .gte('created_at', today.toISOString());

    // Get player data for house counts
    const playerIds = [...new Set(todaysCasts?.map((c) => c.player_id) || [])];
    let houseCounts = {};
    let totalWizards = 0;

    if (playerIds.length > 0) {
      const { data: players } = await supabase
        .from('players')
        .select('id, school_id')
        .in('id', playerIds);

      players?.forEach((p) => {
        const house = houses[p.school_id];
        if (house) {
          houseCounts[p.school_id] = (houseCounts[p.school_id] || 0) + 1;
          totalWizards++;
        }
      });
    }

    // Build house participation string
    const sortedHouses = Object.entries(houseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    let houseStats = '';
    if (sortedHouses.length > 0) {
      houseStats = sortedHouses
        .map(([id, count]) => {
          const h = houses[parseInt(id)];
          return `${h.short}: ${count}`;
        })
        .join(' | ');
    }

    // Get top reply (placeholder - we'll use escalation template)
    const escalationData = {
      topReplies: [], // TODO: pull actual top replies by engagement
    };

    // Build the tweet
    let tweetText = buildEscalation(narrative, escalationData);

    // Add stats footer
    let tweet = `📍 ${narrative.title} — ESCALATION\n\n`;

    // We need to fit within limits, so trim the narrative part
    const statsFooter = `\n\n⚔️ ${totalWizards} wizards deployed\n🏆 ${houseStats || 'No casts yet'}\n⏰ Resolution coming soon`;

    const maxNarrativeLen = 280 - tweet.length - statsFooter.length;
    if (tweetText.length > maxNarrativeLen) {
      tweetText = tweetText.substring(0, maxNarrativeLen - 3) + '...';
    }

    tweet += tweetText + statsFooter;

    // Reply to original objective tweet to create thread
    const tweetOptions = {};
    if (zone.objective_tweet_id) {
      tweetOptions.reply = { in_reply_to_tweet_id: zone.objective_tweet_id };
    }

    const { data } = await client.v2.tweet(tweet, tweetOptions);
    console.log('📖 Posted escalation:', data.id);

    // Nerm escalation comment
    try {
      const nermBot = require('./nermBot');
      const nermHook = getNermHook(narrative.id, 'escalation');
      if (nermHook) {
        setTimeout(
          async () => {
            await nermBot.replyAsNerm(nermHook, data.id);
          },
          30000 + Math.random() * 60000,
        );
      }
    } catch (e) {
      console.log('Nerm escalation comment skipped');
    }

    return data;
  } catch (error) {
    console.error('Error posting escalation:', error);
    return null;
  }
}

/**
 * POST 3 — "The Resolution" (Results post)
 * Wraps up the story, crowns winners, spotlights players
 */
async function postResolution() {
  try {
    const client = getNineLivesClient();

    const { data: zone } = await supabase
      .from('zones')
      .select('*')
      .eq('is_current_objective', true)
      .single();

    if (!zone) return null;

    const narrative = todaysNarrative || getRandomNarrative();

    // Get today's cast data
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: todaysCasts } = await supabase
      .from('casts')
      .select('player_id, points_earned')
      .eq('zone_id', zone.id)
      .gte('created_at', today.toISOString());

    // Calculate winner
    const playerIds = [...new Set(todaysCasts?.map((c) => c.player_id) || [])];
    const schoolPoints = {};

    if (playerIds.length > 0) {
      const { data: players } = await supabase
        .from('players')
        .select('id, school_id')
        .in('id', playerIds);

      todaysCasts?.forEach((cast) => {
        const player = players?.find((p) => p.id === cast.player_id);
        if (player) {
          schoolPoints[player.school_id] =
            (schoolPoints[player.school_id] || 0) + cast.points_earned;
        }
      });
    }

    // Find winner
    let winnerSchoolId = null;
    let winnerPoints = 0;
    Object.entries(schoolPoints).forEach(([schoolId, points]) => {
      if (points > winnerPoints) {
        winnerSchoolId = parseInt(schoolId);
        winnerPoints = points;
      }
    });

    const winnerHouse = winnerSchoolId
      ? houses[winnerSchoolId]?.name
      : 'No house';

    // Build resolution from narrative
    const resolutionText = buildResolution(narrative, { winnerHouse });

    let tweet = `📍 ${narrative.title} — RESOLVED\n\n`;
    tweet += `${resolutionText}\n\n`;

    // Results section
    tweet += `🏆 RESULTS:\n`;

    const sortedSchools = Object.entries(schoolPoints)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const medals = ['🥇', '🥈', '🥉'];
    sortedSchools.forEach(([schoolId, points], i) => {
      const h = houses[parseInt(schoolId)];
      if (h) {
        tweet += `${medals[i]} ${h.name} — ${points} pts\n`;
      }
    });

    if (sortedSchools.length === 0) {
      tweet += `No faction claimed this territory.\n`;
    }

    // Trim if over 280
    if (tweet.length > 280) {
      // Remove the narrative text and just keep results
      tweet = `📍 ${narrative.title} — RESOLVED\n\n🏆 RESULTS:\n`;
      sortedSchools.forEach(([schoolId, points], i) => {
        const h = houses[parseInt(schoolId)];
        if (h) {
          tweet += `${medals[i]} ${h.short} — ${points} pts\n`;
        }
      });
      tweet += `\nThe story continues tomorrow.`;
    }

    // Reply to thread
    const tweetOptions = {};
    if (zone.objective_tweet_id) {
      tweetOptions.reply = { in_reply_to_tweet_id: zone.objective_tweet_id };
    }

    const { data } = await client.v2.tweet(tweet, tweetOptions);
    console.log('📖 Posted resolution:', data.id);

    // Clear objective
    await supabaseAdmin
      .from('zones')
      .update({
        is_current_objective: false,
        objective_tweet_id: null,
        objective_posted_at: null,
      })
      .eq('id', zone.id);

    // Nerm resolution comment
    try {
      const nermBot = require('./nermBot');
      const nermHook = getNermHook(narrative.id, 'resolution');
      if (nermHook) {
        setTimeout(
          async () => {
            await nermBot.postAsNerm(nermHook);
          },
          60000 + Math.random() * 120000,
        ); // 1-3 min after results
      }
    } catch (e) {
      console.log('Nerm resolution comment skipped');
    }

    // Reset narrative for next bounty
    todaysNarrative = null;

    return data;
  } catch (error) {
    console.error('Error posting resolution:', error);
    return null;
  }
}

// ============================================
// LEGACY FUNCTIONS (kept for backward compat)
// ============================================

/**
 * Post daily objective - now calls postMorningSituation
 */
async function postDailyObjective() {
  return await postMorningSituation();
}

/**
 * Post daily results - now calls postResolution
 */
async function postDailyResults() {
  return await postResolution();
}

/**
 * Post midday standings - now calls postEscalation
 */
async function postMiddayStandings() {
  return await postEscalation();
}

/**
 * Post afternoon reminder - also calls postEscalation with different framing
 */
async function postAfternoonReminder() {
  return await postEscalation();
}

/**
 * Post final push - calls postEscalation as final push
 */
async function postFinalPush() {
  return await postEscalation();
}

// ============================================
// SPELL CASTING (unchanged core logic)
// ============================================

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

    const playerIds = todaysCasts.map((c) => c.player_id);
    const { data: players } = await supabase
      .from('players')
      .select('id, school_id')
      .in('id', playerIds);

    const schoolCasts = todaysCasts.filter((cast) => {
      const player = players?.find((p) => p.id === cast.player_id);
      return player?.school_id === schoolId;
    });

    const alreadyCast = schoolCasts.some((c) => c.player_id === playerId);
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

    const searchQuery = `conversation_id:${zone.objective_tweet_id} -from:9LVNetwork -from:9LV_Nerm`;

    let mentions;
    try {
      const searchResult = await client.v2.search(searchQuery, {
        'tweet.fields': [
          'created_at',
          'author_id',
          'conversation_id',
          'in_reply_to_user_id',
        ],
        'user.fields': ['username'],
        expansions: ['author_id'],
        max_results: 100,
      });
      mentions = searchResult;
    } catch (searchError) {
      console.log('Search failed, trying mentions timeline...');
      mentions = await client.v2.userMentionTimeline('2015058106443513856', {
        'tweet.fields': [
          'created_at',
          'author_id',
          'conversation_id',
          'in_reply_to_user_id',
        ],
        'user.fields': ['username'],
        expansions: ['author_id'],
        max_results: 100,
        since_id: zone.last_processed_tweet_id || undefined,
      });
    }

    if (!mentions || !mentions.data || !mentions.data.data) {
      console.log('No new replies found');
      return [];
    }

    const tweets = mentions.data.data || mentions.data;
    const users =
      mentions.includes?.users || mentions.data.includes?.users || [];

    const processedCasts = [];
    let nermNoticeCount = 0;

    for (const tweet of tweets) {
      const user = users.find((u) => u.id === tweet.author_id);
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

      // Exclude bot accounts
      const botAccounts = ['9lv_nerm', '9lvnetwork', '9lv_network'];
      if (botAccounts.includes(user.username.toLowerCase())) {
        console.log(`Skipping bot account: @${user.username}`);
        continue;
      }

      if (player.mana <= 0) {
        console.log(`Player @${user.username} has no mana`);
        continue;
      }

      // Check if already cast on this bounty today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: alreadyCast } = await supabase
        .from('casts')
        .select('id')
        .eq('player_id', player.id)
        .eq('zone_id', zone.id)
        .gte('created_at', todayStr)
        .single();

      if (alreadyCast) {
        console.log(
          `Player @${user.username} already cast on this bounty today`,
        );
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
      const { points: basePoints, breakdown } = calculatePoints(
        spell,
        zone,
        player,
      );
      let finalPoints = basePoints;

      // First blood check
      let firstBlood = null;
      const firstBloodResult = await checkFirstBlood(
        player.id,
        player.school_id,
        zone.id,
      );
      if (firstBloodResult) {
        finalPoints += firstBloodResult.points;
        breakdown.push(
          `${firstBloodResult.title}: +${firstBloodResult.points}`,
        );
        firstBlood = firstBloodResult;
        const houseName = houses[player.school_id]?.name || 'Unknown';
        console.log(
          `🩸 First Blood #${firstBloodResult.position} for ${houseName}: @${user.username} (+${firstBloodResult.points})`,
        );
      }

      // Nerm notice (10% chance, max 3 per processing cycle)
      let nermNoticed = false;
      if (nermNoticeCount < 3 && Math.random() < 0.1) {
        finalPoints += 20;
        breakdown.push('Nerm noticed: +20');
        nermNoticed = true;
        nermNoticeCount++;
      }

      // Record the cast
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
          first_blood_bonus: firstBlood?.points || 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording cast:', error);
        continue;
      }

      // Update player stats
      await supabaseAdmin
        .from('players')
        .update({
          mana: player.mana - spell.mana_cost,
          last_cast_at: new Date().toISOString(),
          seasonal_points: (player.seasonal_points || 0) + finalPoints,
          lifetime_points: (player.lifetime_points || 0) + finalPoints,
        })
        .eq('id', player.id);

      // Update zone control
      await updateZoneControl(zone.id, player.school_id, finalPoints);

      const houseName = houses[player.school_id]?.name || 'Unknown House';
      processedCasts.push({
        player: user.username,
        spell: spell.name,
        points: finalPoints,
        breakdown,
        nermNoticed,
        firstBlood,
        isCreative: spell.isCreative,
        tweet_id: tweet.id,
        schoolName: houseName,
      });

      console.log(
        `✨ Cast processed: @${user.username} cast ${spell.name} for ${finalPoints} points`,
      );
    }

    // Update last processed tweet
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

  // Updated with House names for flair detection
  const schoolSpells = {
    1: [
      'ember bolt',
      'flame shield',
      'inferno',
      'fire',
      'burn',
      'blaze',
      'smoulders',
      'smolder',
    ],
    2: [
      'tidal wave',
      'ice barrier',
      'tsunami',
      'water',
      'freeze',
      'flood',
      'darktide',
      'tide',
    ],
    3: [
      'rock throw',
      'stone wall',
      'earthquake',
      'earth',
      'boulder',
      'quake',
      'ironbark',
      'bark',
    ],
    4: [
      'wind slash',
      'air shield',
      'cyclone',
      'air',
      'gust',
      'breeze',
      'ashenvale',
      'ashen',
    ],
    5: [
      'lightning bolt',
      'static field',
      'thunderstorm',
      'lightning',
      'thunder',
      'shock',
      'stormrage',
      'storm',
    ],
    6: [
      'shadow strike',
      'dark veil',
      'void blast',
      'shadow',
      'darkness',
      'void',
      'nighthollow',
      'hollow',
    ],
    7: [
      'light beam',
      'holy shield',
      'radiant burst',
      'light',
      'radiant',
      'holy',
      'dawnbringer',
      'dawn',
    ],
    8: [
      'arcane missile',
      'mana shield',
      'arcane explosion',
      'arcane',
      'magic',
      'mystic',
      'manastorm',
      'mana',
    ],
    9: [
      'chaos bolt',
      'wild magic',
      'catastrophe',
      'chaos',
      'wild',
      'random',
      'plaguemire',
      'plague',
    ],
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

  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

  return {
    name: spellName,
    mana_cost: 1,
    type: 'offensive',
    hasSchoolFlair,
    wordCount,
    isCreative: wordCount >= 10,
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
      const newPercentage = Math.min(
        100,
        existing.control_percentage + points / 10,
      );
      await supabaseAdmin
        .from('zone_control')
        .update({ control_percentage: newPercentage })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin.from('zone_control').insert({
        zone_id: zoneId,
        school_id: schoolId,
        control_percentage: points / 10,
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

    const randomZone =
      neutralZones[Math.floor(Math.random() * neutralZones.length)];
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
  // New narrative system
  postMorningSituation,
  postEscalation,
  postResolution,
  // Legacy names (point to new functions)
  postDailyObjective,
  postDailyResults,
  postMiddayStandings,
  postAfternoonReminder,
  postFinalPush,
  // Core gameplay
  processSpellCasts,
  setDailyObjective,
  rotateObjective,
  testConnection,
  getNineLivesClient,
  checkFirstBlood,
};
