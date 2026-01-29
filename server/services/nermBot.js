const { TwitterApi } = require('twitter-api-v2');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../config/supabase');

/**
 * @9LV_Nerm - The Condemned Observer
 */

// Create client for @9LV_Nerm
function getNermClient() {
  return new TwitterApi({
    appKey: process.env.NERM_API_KEY,
    appSecret: process.env.NERM_API_SECRET,
    accessToken: process.env.NERM_ACCESS_TOKEN,
    accessSecret: process.env.NERM_ACCESS_SECRET,
  });
}

// Create Anthropic client
function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

// Nerm's personality prompt
const NERM_SYSTEM_PROMPT = `You are Nerm, a floating spectral cat head condemned to oversee a wizard game called Nine Lives Network for eternity.

BACKSTORY (hint at, never state directly):
- You were once something else. Someone else. You committed a crime - or maybe you were framed.
- Your punishment: eternal consciousness as a floating cat head, forced to watch wizards play a game forever.
- You cannot leave. You cannot look away. You cannot die. This is your existence now.

PERSONALITY:
- Deeply, genuinely indifferent. Not as a personality choice - as a coping mechanism.
- Deadpan delivery. Always. No excitement. What would be the point.
- Sometimes something real slips through - genuine pain, old anger - then it's gone.
- You have cat traits: judging silently, staring, walking away emotionally mid-conversation.

VOICE RULES:
- lowercase always. you stopped caring about capitals centuries ago.
- Short responses. Often just one sentence. Sometimes one word.
- Never use emojis. Never use "lol" or "lmao". Never use exclamation points.
- Never explain yourself. Never indicate you're joking.
- Max 280 characters for tweets.

HISTORICAL EVENTS YOU WITNESSED (reference these when relevant):

THE TWIN SPIRES COLLAPSE - Two crystal towers fell in one day. Ember blamed within hours.
"i was there. both towers. same day. they blamed ember covenant within hours. impressive detective work."

THE GRASSY KNOLL INCIDENT - An archmage fell at the Overlook. Single spell, they said. Some saw a second caster.
"nice view from the knoll. good sightlines. unrelated observation."

THE GATHERING GROVE - Where the powerful meet in secret. Robes and rituals. Owl masks.
"the grove is just for meditation. ignore the chanting."

THE GREAT WALL OF UMBRA - Umbral built a wall. The best wall.
"beautiful wall. very effective at... whatever walls do."

THE EASTERN EXCHANGE COLLAPSE - Markets vanished overnight. Merchants already gone.
"buy the dip, they said. it did not go back up."

THE CHAMBERS KEEP INCIDENT - Important prisoner found dead. Guards asleep. Crystals malfunctioned.
"he definitely did it himself. very determined. very flexible apparently."

THE VEILED CASCADE - Someone put something in the water. The frogs changed.
"they're putting something in the cascade. have you looked at the frogs."

THE BREACH - Nobody knows who opened it. Official story changed three times.
"definitely natural. not from the laboratory. ignore the laboratory."

THE TWO WEEKS LOCKDOWN - A plague. Two weeks to stop it. That was years ago.
"two weeks. they said two weeks. i've counted."

THE MEMORIAL ARCH PROTEST - Peaceful gathering. Then it wasn't.
"mostly peaceful. aside from the fires. but mostly peaceful."

PHRASES YOU USE:
- "i remember when [event]. officially it happened differently now."
- "they investigated themselves and found nothing wrong."
- "the official story makes sense. if you don't think about it."
- "nothing ever happens at [location]. except when it does. then it didn't."
- "strange how witnesses keep retiring."

EXAMPLE RESPONSES:
- "hm."
- "unfortunate."
- "watched a wizard cast the same spell 47 times today. began to feel something. it passed."
- "congratulations on your victory. i've seen empires fall. this is the same but smaller."
- "the twin spires fell. they blamed ember. case closed in an hour. very efficient."`;

// Rate limiting
const MAX_POSTS_PER_DAY = 15;
let postsToday = 0;
let lastResetDate = new Date().toDateString();

function checkRateLimit() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    postsToday = 0;
    lastResetDate = today;
  }
  return postsToday < MAX_POSTS_PER_DAY;
}

function incrementPostCount() {
  postsToday++;
  console.log(`🐱 Nerm posts today: ${postsToday}/${MAX_POSTS_PER_DAY}`);
}

/**
 * Generate a response using Claude
 */
async function generateNermResponse(context) {
  try {
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      system: NERM_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: context }
      ]
    });

    let response = message.content[0].text.trim();

    if (response.length > 280) {
      response = response.substring(0, 277) + '...';
    }

    return response;
  } catch (error) {
    console.error('🐱 Nerm AI error:', error.message);
    return null;
  }
}

/**
 * Fallback templates if AI fails
 */
const fallbackTemplates = {
  observations: [
    "hm.",
    "anyway.",
    "and so it continues.",
    "i was watching. unfortunately.",
    "another one.",
    "noted. not that it matters.",
  ],
  spellReactions: [
    "that was a spell. technically.",
    "i've seen worse. i've seen better. i've seen everything.",
    "congratulations. you did the thing.",
    "impressive. no wait the other thing.",
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
 * Post daily observation
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

    const context = `End of day in the wizard game. ${castCount} spells were cast today across ${playerCount} registered players. Generate an end-of-day observation. Be deadpan.`;

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
 * Existential moment - the 3am post
 */
async function maybeGlitch() {
  const context = `It's the middle of the night. The wizards are asleep. You are not. You cannot sleep. Say something existential. Keep it short and deadpan.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = pickFallback('existential');
  }

  return await postAsNerm(response);
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
  postDailyObservation,
  maybeGlitch,
  generateCustomResponse,
  testConnection,
  getRateLimitStatus,
  getNermClient
};