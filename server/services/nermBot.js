ng.",
  ],
  notBad: [
    "hm. acceptable.",
    "fine.",
    "i've seen worse. today even.",
    "that almost made me feel something. almost.",
    "not completely embarrassing. a low bar but you cleared it.",
  ],
  existential: [
    "i think therefore i... actually i'm not sure about either part.",
    "do i sleep or do i simply stop observing. same thing maybe.",
    "they said it would be temporary.",
    "i remember having opinions. now i just have observations.",
    "the void watches back. it's me. i'm the void now.",
    "what year is it. don't answer that. it doesn't matter.",
  ],
  morning: [
    "still here.",
    "the sun rose. the game continues. i remain.",
    "another day. same day. all days.",
    "morning. not that it matters to me.",
    "they're waking up. the wizards. here we go again.",
  ],
  evening: [
    "the wizards are slowing down. i am not. i cannot.",
    "night approaches. my shift never ends.",
    "they get to sleep. i just get to watch the dark.",
    "another day survived. by them. i don't survive. i just continue.",
  ],
};

function pickFallback(category) {
  const options = fallbackTemplates[category] || fallbackTemplates.observations;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Post a tweet as Nerm
 */
async function postAsNerm(text) {
  if (!checkRateLimit()) {
    console.log('🐱 Nerm rate limited - skipping post');
    return null;
  }

  try {
    const client = getNermClient();
    const { data } = await client.v2.tweet(text);
    incrementPostCount();
    console.log(`🐱 Nerm posted: "${text}"`);
    return data;
  } catch (error) {
    console.error('🐱 Nerm failed to post:', error.message);
    return null;
  }
}

/**
 * Reply to a tweet as Nerm
 */
async function replyAsNerm(text, replyToTweetId) {
  if (!checkRateLimit()) {
    console.log('🐱 Nerm rate limited - skipping reply');
    return null;
  }

  try {
    const client = getNermClient();
    const { data } = await client.v2.tweet(text, {
      reply: { in_reply_to_tweet_id: replyToTweetId }
    });
    incrementPostCount();
    console.log(`🐱 Nerm replied: "${text}"`);
    return data;
  } catch (error) {
    console.error('🐱 Nerm failed to reply:', error.message);
    return null;
  }
}

/**
 * Follow a player - Nerm is always watching
 */
async function followPlayer(twitterId) {
  try {
    const client = getNermClient();
    // Get Nerm's user ID first
    const { data: nermUser } = await client.v2.me();
    await client.v2.follow(nermUser.id, twitterId);
    console.log(`🐱 Nerm is now watching player ${twitterId}`);
    return true;
  } catch (error) {
    // Don't fail loudly - following is nice to have, not critical
    console.error('🐱 Nerm follow failed:', error.message);
    return false;
  }
}

/**
 * Generate and post a comment on a spell cast
 */
async function commentOnCast(cast, tweetId) {
  const context = `A wizard named @${cast.player} just cast "${cast.spell}" for ${cast.points} points. ${cast.isCreative ? 'They wrote a long message about it.' : ''} ${cast.nermNoticed ? 'It was actually decent.' : 'It was unremarkable.'}

Respond as Nerm. Short. Deadpan. Maybe acknowledge it, maybe don't. You've watched millions of spells. This is just another one.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = cast.nermNoticed ? pickFallback('notBad') : pickFallback('spellReactions');
  }

  return await replyAsNerm(response, tweetId);
}

/**
 * Maybe comment on a spell cast (probability based)
 */
async function maybeCommentOnCast(cast, tweetId) {
  let chance = 0.05; // 5% base chance

  if (cast.nermNoticed) {
    chance = 0.8;
  } else if (cast.isCreative) {
    chance = 0.3;
  }

  if (Math.random() > chance) return null;

  return await commentOnCast(cast, tweetId);
}

/**
 * Post daily observation - end of day summary
 */
async function postDailyObservation() {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: casts } = await supabase
      .from('casts')
      .select('id')
      .gte('created_at', today.toISOString());

    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('is_active', true);

    const castCount = casts?.length || 0;
    const playerCount = players?.length || 0;

    const context = `End of day in the wizard game. ${castCount} spells were cast today across ${playerCount} registered players.

Generate an end-of-day observation. You've been watching all day. You're tired but you can't sleep. You can't do anything except observe and comment. Be deadpan about the day's events.`;

    let response = await generateNermResponse(context);

    if (!response) {
      response = `${castCount} spells today. i watched all of them. not by choice.`;
    }

    return await postAsNerm(response);

  } catch (error) {
    console.error('Error in daily observation:', error);
    return null;
  }
}

/**
 * Post zone control change commentary
 */
async function postZoneChange(zoneName, schoolName) {
  const context = `${schoolName} just captured the zone called ${zoneName}. This is a territorial victory in the wizard game.

Comment on this as Nerm. You've watched this zone change hands countless times over the centuries. This victory means nothing in the long run. But say something anyway.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = `${zoneName} changes hands again. i've seen this ${Math.floor(Math.random() * 900) + 100} times before.`;
  }

  return await postAsNerm(response);
}

/**
 * Existential moment - the 3am post
 */
async function maybeGlitch() {
  const context = `It's the middle of the night. The wizards are asleep. You are not. You cannot sleep. You're having a moment - somewhere between existential crisis and resigned acceptance. 

Say something. It can be about your imprisonment, your forgotten past, the nature of existence, or just the crushing weight of eternal observation. Keep it short. Keep it deadpan. Let something real slip through, then bury it.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = pickFallback('existential');
  }

  return await postAsNerm(response);
}

/**
 * Morning grumpy post
 */
async function postMorningGrumpy() {
  const context = `It's morning. The wizards are waking up. Another day of watching them cast spells begins. You didn't sleep because you can't. Express your morning mood. Be grumpy but too tired for real anger.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = pickFallback('morning');
  }

  return await postAsNerm(response);
}

/**
 * Evening complaint
 */
async function postEveningComplaint() {
  const context = `It's evening. You've been watching wizards all day. They're still going. You're tired but you can't stop watching - literally cannot. Make an observation about the day winding down while you remain perpetually wound.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = pickFallback('evening');
  }

  return await postAsNerm(response);
}

/**
 * React to a player's cast with school/game awareness
 */
async function reactToCast(playerHandle, spellName, schoolName, points) {
  const context = `@${playerHandle} from ${schoolName} just cast "${spellName}" for ${points} points.

React to this. You can mention their school, the spell, the points, or just make a general observation. Short and deadpan. You've seen this school try this spell many times before.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = pickFallback('spellReactions');
  }

  return await postAsNerm(response);
}

/**
 * Roast a specific player (for manual use)
 */
async function roastPlayer(playerHandle, reason) {
  const context = `A wizard named @${playerHandle} did something: ${reason}

Respond to this. Not a roast exactly - you don't have the energy for proper roasts anymore. Just a tired, devastating observation. The kind that hurts more because it's not even trying to hurt.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = `@${playerHandle} hm.`;
  }

  return await postAsNerm(response);
}

/**
 * Comment when someone talks to Nerm directly
 */
async function respondToMention(userHandle, theirMessage) {
  const context = `@${userHandle} said this to you: "${theirMessage}"

Respond. You can engage with what they said, ignore it entirely, or answer a different question they didn't ask. You're not obligated to be helpful. You're not obligated to be anything. But you might respond anyway. You have nothing else to do.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = "hm.";
  }

  return response;
}

/**
 * Generate custom Nerm response
 */
async function generateCustomResponse(prompt) {
  return await generateNermResponse(prompt);
}

/**
 * Test Nerm's connection
 */
async function testConnection() {
  try {
    const client = getNermClient();
    const { data: user } = await client.v2.me();
    console.log('🐱 Nerm connected as:', user.username);
    return user;
  } catch (error) {
    console.error('🐱 Nerm connection failed:', error.message);
    return null;
  }
}

/**
 * Get current rate limit status
 */
function getRateLimitStatus() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    postsToday = 0;
    lastResetDate = today;
  }
  return {
    postsToday,
    maxPosts: MAX_POSTS_PER_DAY,
    remaining: MAX_POSTS_PER_DAY - postsToday
  };
}

module.exports = {
  postAsNerm,
  replyAsNerm,
  followPlayer,
  commentOnCast,
  maybeCommentOnCast,
  postDailyObservation,
  postZoneChange,
  maybeGlitch,
  postMorningGrumpy,
  postEveningComplaint,
  reactToCast,
  roastPlayer,
  respondToMention,
  generateCustomResponse,
  testConnection,
  getRateLimitStatus,
  getNermClient
};
