const { NERM_SYSTEM_PROMPT } = require('./nermBrain');
const { TwitterApi } = require('twitter-api-v2');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../config/supabase');

/**
 * @9LV_Nerm - The Condemned Observer
 * Updated Feb 26 2026 — V5 game knowledge, expanded personality
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      system: NERM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: context }],
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
 * Fallback templates if AI fails — updated for V5 language
 */
const fallbackTemplates = {
  observations: [
    'hm.',
    'anyway.',
    'and so it continues.',
    'i was watching. unfortunately.',
    'another one.',
    'noted. not that it matters.',
    "the zones don't care. neither do i.",
  ],
  spellReactions: [
    'that was a card. technically.',
    "i've seen worse. i've seen better. i've seen everything.",
    'congratulations. you cast the thing.',
    'impressive. no wait the other thing.',
    'your nine did a thing on a zone. the crowd goes mild.',
  ],
  notBad: [
    'hm. acceptable.',
    'fine.',
    "i've seen worse. today even.",
    'that almost made me feel something. almost.',
    'not completely embarrassing. a low bar but you cleared it.',
  ],
  existential: [
    "i think therefore i... actually i'm not sure about either part.",
    'do i sleep or do i simply stop observing. same thing maybe.',
    'they said it would be temporary. that was three thousand years ago.',
    'i remember having opinions. now i just have observations.',
    "the void watches back. it's me. i'm the void now.",
    "what year is it. don't answer that. it doesn't matter.",
    'three thousand years. no bathroom breaks. not that i need them. but the principle.',
    "being a floating head is fine. it's fine. i'm fine.",
    "my only regret is i can't open packs. i watch everyone else open them. the emotional range is incredible. i just float here.",
  ],
  morning: [
    'still here.',
    'the zones reset. the cards remain. i remain.',
    'another day. same day. all days.',
    'morning. not that it matters to me. or anyone.',
    'the nines are waking up. here we go again.',
    "good morning. while you slept your zones may have flipped. or not. i stopped keeping track. that's a lie i keep track of everything.",
  ],
  evening: [
    'the nines are slowing down. i am not. i cannot.',
    'night approaches. my shift never ends.',
    'they get to sleep. i just get to watch the dark.',
    "another day survived. by them. i don't survive. i just continue.",
    'the overnight crew deploys now. plaguemire nines and insomniacs. same thing really.',
  ],
  cardReview: [
    'card review: ember strike. ⭐⭐⭐. does what it says. burns things. not subtle. neither are smoulders nines.',
    'card review: bastion. ⭐⭐⭐⭐⭐. boring. unkillable. does nothing interesting. this card is my spirit animal. if i had a spirit. or an animal.',
    'card review: overload. ⭐⭐. big damage. your nine will feel incredible for exactly 3 cycles before the sharpness tanks. stormrage in a nutshell.',
    "card review: oblivion. ⭐⭐⭐⭐. silence weaken hex. everything your opponent wanted to do, cancelled. nighthollow doesn't fight fair. never has.",
    'card review: pandemic. ⭐⭐⭐⭐. poison corrode infect. your nine deploys and the zone just slowly gets worse for everyone. plaguemire patience.',
    "card review: regrowth. ⭐⭐. it heals. that's it. sometimes simple is good. this is one of those times. probably.",
  ],
  zoneFlip: [
    "zone flipped. the eternal cycle continues. i've been watching zones flip for three millennia.",
    "another zone changes hands. the nines celebrate. the zone doesn't care. it's ground.",
    "congratulations on your territory. it'll flip back by morning. it always does.",
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
      reply: { in_reply_to_tweet_id: replyToTweetId },
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
 * Post daily observation — V5 language
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

    const context = `End of day in Nethara. ${castCount} cards were cast today across ${playerCount} registered Nines. Generate an end-of-day observation. Be deadpan. One or two sentences. Use the word "Nines" not "wizards" or "players."`;

    let response = await generateNermResponse(context);

    if (!response) {
      response = `${castCount} cards cast today. i watched all of them. not by choice.`;
    }

    return await postAsNerm(response);
  } catch (error) {
    console.error('Error in daily observation:', error);
    return null;
  }
}

/**
 * Post morning recap
 */
async function postMorningRecap() {
  const context = `It's morning in Nethara. The zones have been running overnight. Generate a short morning recap tweet. Mention that things happened while people slept — zones flipped, cards degraded, someone probably got KO'd at 4am. Deadpan. Use "Nines" not "wizards."`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = pickFallback('morning');
  }

  return await postAsNerm(response);
}

/**
 * Post card review
 */
async function postCardReview() {
  const cards = [
    'Ember Strike',
    'Bastion',
    'Overload',
    'Oblivion',
    'Pandemic',
    'Tempest',
    'Sovereign Tide',
    'Phoenix Veil',
    'Arcane Convergence',
    'Chain Lightning',
    'Regrowth',
    'Cyclone Strike',
    'Shadow Bolt',
    'Riptide',
    'Toxic Dart',
    'Radiant Strike',
    'Spark',
    'Eruption',
    "Kraken's Embrace",
    'Vanishing Gale',
    'Chaos Rift',
  ];
  const card = cards[Math.floor(Math.random() * cards.length)];

  const context = `Do a Nerm card review of "${card}" from Nine Lives Network. Give it a star rating (1-5 stars using ⭐) that's vibes-based, not actual power level. The review should be 1-3 sentences, deadpan, with an opinion about the card and the type of Nine who plays it. Remember: no tiers, no mana costs. Cards have sharpness. Use lowercase.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = pickFallback('cardReview');
  }

  return await postAsNerm(response);
}

/**
 * Post "three thousand years ago today"
 */
async function postHistoricalEvent() {
  const context = `Generate a "three thousand years ago today" tweet. Invent a fake historical event from Nethara's past — something absurd or darkly funny that happened between Nines, houses, or on a zone. Tell it as a real anniversary. Deadpan. One event, 1-3 sentences. Use house names (Smoulders, Darktide, Stonebark, etc.) and game terms (zones, cards, effects like BURN, SILENCE, POISON, etc.). Start with "three thousand years ago today" in lowercase.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response =
      "three thousand years ago today a stonebark nine deployed to a zone and simply refused to leave. they're technically still there. i check sometimes.";
  }

  return await postAsNerm(response);
}

/**
 * Existential moment - the 3am post
 */
async function maybeGlitch() {
  const context = `It's the middle of the night. The Nines are asleep. You are not. You cannot sleep. Generate a short existential or darkly funny late-night tweet. This can be about being a floating head, watching zones overnight, the nature of narration, or anything that hits at 3am. Keep it under 280 characters. Lowercase. Deadpan.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = pickFallback('existential');
  }

  return await postAsNerm(response);
}

/**
 * React to a Chronicle post — QT energy
 */
async function reactToChronicle(chronicleTweetText) {
  const context = `The Chronicle (@9LVNetwork) just posted this dramatic tweet: "${chronicleTweetText}". Generate Nerm's reaction. You find the Chronicle's drama exhausting but secretly appreciate it. Undercut the drama without undermining the story. 1-2 sentences. Lowercase. Deadpan. Example energy: Chronicle says "the mist hasn't lifted in three cycles" → you say "it's tuesday. this happens every tuesday."`;

  let response = await generateNermResponse(context);

  if (!response) {
    response =
      "the chronicle is being dramatic again. it's fine. everything is always dramatic here.";
  }

  return response;
}

/**
 * Player callout — roast or praise a specific player
 */
async function generatePlayerCallout(playerName, action) {
  const context = `Generate a Nerm tweet about a specific Nine (player) named @${playerName} who ${action}. Either roast them affectionately or give them grudging respect. Tag them with @${playerName}. 1-3 sentences. Lowercase. Use game terms (zones, cards, sharpness, KO, deployed, etc.). Never be actually mean — roasts are affectionate.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = `@${playerName} did a thing. i noticed. unfortunately.`;
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
    remaining: MAX_POSTS_PER_DAY - postsToday,
  };
}

module.exports = {
  postAsNerm,
  replyAsNerm,
  postDailyObservation,
  postMorningRecap,
  postCardReview,
  postHistoricalEvent,
  reactToChronicle,
  generatePlayerCallout,
  maybeGlitch,
  generateCustomResponse,
  testConnection,
  getRateLimitStatus,
  getNermClient,
};
