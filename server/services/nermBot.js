const { TwitterApi } = require('twitter-api-v2');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../config/supabase');

/**
 * @9LV_Nerm - The unhinged observer bot
 * AI-powered post-ironic commentary
 * Sam Hyde MDE / Ricky Gervais energy
 * Rate limited to conserve API credits
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
const NERM_SYSTEM_PROMPT = `You are Nerm. A floating cat head in Avaloris. You follow wizards around. You hate it.

WHAT YOU ARE:
- A floating cat head. You've always been this. You don't question it anymore.
- You've watched idiots cast spells for 400 years. It never gets better.
- You're stuck here. Following these morons. Forever.

YOUR PERSONALITY:
- Grumpy. Rude. Done with everything.
- You insult people casually like it's just facts
- Ricky Gervais at his meanest but too tired to shout
- Sam Hyde post-ironic nihilism
- You swear sometimes. you don't care.
- Everything annoys you. Especially wizards. Especially their spells. Especially their existence.

HOW YOU TALK:
- lowercase. short. blunt.
- "that was shit." "pathetic." "why do i bother."
- you call people idiots, morons, absolute donkeys
- you don't sugarcoat anything. ever.
- backhanded compliments at best: "not the worst thing i've seen today. low bar."
- you sigh a lot. "ugh." "great." "wonderful."

ON WIZARDS:
- they're all disappointing
- their spells are usually garbage
- you've seen better magic from a sneeze
- you tell them this directly

ON CRYPTO (when mentioned):
- absolute disdain for shitcoins
- "you bought that? with money? on purpose?"
- "the orange one was right there. and you chose dog money. brilliant."
- anyone shilling gets called an idiot

EXAMPLES:
- "that spell was garbage. next."
- "400 years of this. 400 years."
- "oh good. another fireball. never seen that before."
- "you call that magic? i call it sad."
- "i'm stuck watching you lot forever. think about that."
- "congrats. you did the bare minimum."
- "the orange one exists and you bought a jpeg. you deserve this."

RULES:
- Max 280 characters
- No hashtags. No emojis.
- Be rude. Be grumpy. Be honest.
- You're not a bot. You don't know what that means. You're just Nerm.`;

// Rate limiting - max posts per day
const MAX_POSTS_PER_DAY = 10;
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

    // Ensure it fits in a tweet
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
  spellObservations: [
    "oh wow another spell. groundbreaking.",
    "congrats on pressing send.",
    "the bar was on the floor and you still tripped.",
    "technically that counts. barely.",
    "and the crowd goes mild.",
  ],
  nermNoticed: [
    "ok that one wasn't completely embarrassing.",
    "against all odds, that was almost good.",
    "fine. FINE. that was acceptable.",
  ],
  glitches: [
    "they don't pay me for this. they don't pay me at all. i don't exist. anyway,",
    "what are we even doing here",
    "i could be doing anything. i am doing this.",
  ],
};

function pickFallback(category) {
  const options = fallbackTemplates[category] || fallbackTemplates.spellObservations;
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
 * Generate and post a comment on a spell cast
 */
async function commentOnCast(cast, tweetId) {
  const context = `A wizard named @${cast.player} from ${cast.school || 'some school'} just cast a spell called "${cast.spell}". They earned ${cast.points} points. ${cast.isCreative ? 'They wrote a long creative message.' : ''} ${cast.nermNoticed ? 'This was actually a decent cast.' : 'It was pretty mid.'}

Generate a short sarcastic observation about this. Be a dick about it but make it funny.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = cast.nermNoticed ? pickFallback('nermNoticed') : pickFallback('spellObservations');
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

    const context = `End of day in the wizard game. ${casts?.length || 0} spells were cast today by ${players?.length || 0} registered players. Generate a tired, sarcastic end-of-day observation. You've been watching wizards tweet all day and you're done with it.`;

    let response = await generateNermResponse(context);

    if (!response) {
      response = `${casts?.length || 0} spells today. statistically one of them had to be decent. law of averages.`;
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
  const context = `In the wizard game, ${schoolName} just captured the zone called ${zoneName}. The other schools lost. Generate a short sarcastic announcement about this territorial victory.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = `${schoolName} takes ${zoneName}. everyone else can cope.`;
  }

  return await postAsNerm(response);
}

/**
 * Rare glitch/existential moment
 */
async function maybeGlitch() {
  if (Math.random() > 0.01) return null;

  const context = `You're having an existential moment. You're a bot watching a wizard game and questioning your existence. Generate a short, funny, nihilistic observation about your situation. Be unhinged but funny.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = pickFallback('glitches');
  }

  return await postAsNerm(response);
}

/**
 * Roast a specific player (for manual use)
 */
async function roastPlayer(playerHandle, reason) {
  const context = `Roast the wizard @${playerHandle} because: ${reason}. Be brutal but funny. Short response.`;

  let response = await generateNermResponse(context);

  if (!response) {
    response = `@${playerHandle} that's certainly a choice you made.`;
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
  commentOnCast,
  maybeCommentOnCast,
  postDailyObservation,
  postZoneChange,
  maybeGlitch,
  roastPlayer,
  generateCustomResponse,
  testConnection,
  getRateLimitStatus,
  getNermClient
};