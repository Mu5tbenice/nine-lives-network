// ═══════════════════════════════════════════════════════════════
// server/services/nermTwitter.js
// Nine Lives Network — Nerm Twitter Reply-Guy Bot
//
// What Nerm does on Twitter:
// 1. Watches mentions of @9LVNetwork and @9LV_Nerm
// 2. Replies to Chronicle act replies with in-character reactions
// 3. Likes quality Chronicle replies
// 4. Awards drop ticket for RT (1/day)
// 5. Runs on a 30-min poll (Replit-safe, no webhooks needed)
// ═══════════════════════════════════════════════════════════════

const { askNerm, rateChronicleReply, getPlayerContext } = require('./nermBrain');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Twitter API v2 credentials from env
function getTwitterClient() {
  const {
    TWITTER_API_KEY,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET,
    TWITTER_BEARER_TOKEN,
  } = process.env;

  if (!TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    console.warn('[Nerm Twitter] Missing OAuth credentials — bot disabled');
    return null;
  }

  // OAuth 1.0a signature for write operations (reply, like)
  const crypto = require('crypto');

  function oauthSign(method, url, params) {
    const oauthParams = {
      oauth_consumer_key: TWITTER_API_KEY,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: TWITTER_ACCESS_TOKEN,
      oauth_version: '1.0',
    };
    const allParams = { ...params, ...oauthParams };
    const paramStr = Object.keys(allParams).sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
      .join('&');
    const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
    const sigKey = `${encodeURIComponent(TWITTER_API_SECRET)}&${encodeURIComponent(TWITTER_ACCESS_SECRET)}`;
    const sig = crypto.createHmac('sha1', sigKey).update(base).digest('base64');
    oauthParams.oauth_signature = sig;
    const header = 'OAuth ' + Object.keys(oauthParams)
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(', ');
    return header;
  }

  async function postTweet(text, replyToId = null) {
    const url = 'https://api.twitter.com/2/tweets';
    const body = { text };
    if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
    const auth = oauthSign('POST', url, {});
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Tweet failed: ${res.status} ${err}`);
    }
    return res.json();
  }

  async function likeTweet(tweetId) {
    const userId = process.env.TWITTER_BOT_USER_ID;
    if (!userId) return;
    const url = `https://api.twitter.com/2/users/${userId}/likes`;
    const body = { tweet_id: tweetId };
    const auth = oauthSign('POST', url, {});
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(e => console.warn('[Nerm Twitter] Like failed:', e.message));
  }

  async function searchRecent(query, params = {}) {
    const bearer = TWITTER_BEARER_TOKEN;
    if (!bearer) return null;
    const url = new URL('https://api.twitter.com/2/tweets/search/recent');
    url.searchParams.set('query', query);
    url.searchParams.set('tweet.fields', 'author_id,text,public_metrics,conversation_id,created_at');
    url.searchParams.set('user.fields', 'username');
    url.searchParams.set('expansions', 'author_id');
    url.searchParams.set('max_results', '20');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (!res.ok) return null;
    return res.json();
  }

  return { postTweet, likeTweet, searchRecent };
}

// ── SEEN TWEET CACHE ──────────────────────────────────────────
// Prevents double-replying. Stored in Supabase for persistence.
async function hasSeen(tweetId) {
  const { data } = await supabaseAdmin
    .from('nerm_seen_tweets')
    .select('id')
    .eq('tweet_id', tweetId)
    .single();
  return !!data;
}

async function markSeen(tweetId, type = 'mention') {
  await supabaseAdmin.from('nerm_seen_tweets').upsert({
    tweet_id: tweetId,
    seen_at: new Date().toISOString(),
    type,
  }, { onConflict: 'tweet_id' }).catch(() => {});
}

// ── GET TODAY'S CHRONICLE TWEET IDS ──────────────────────────
async function getTodayChronicleIds() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from('chronicle_acts')
    .select('act_num, tweet_id')
    .eq('raid_date', today);
  return data || [];
}

// ── HANDLE A REPLY TO CHRONICLE ───────────────────────────────
// Decides whether Nerm should reply, like, or both
async function handleChronicleReply(tweet, twitterHandle, client) {
  if (!tweet || !tweet.tweet_id) return;
  if (await hasSeen(tweet.tweet_id + '_nerm')) return;

  const textLen = (tweet.text || '').length;
  const engagement = (tweet.like_count || 0) + (tweet.reply_count || 0) * 2;

  // Always like replies that are meaningful (>30 chars)
  if (textLen > 30) {
    await client.likeTweet(tweet.tweet_id).catch(() => {});
  }

  // Nerm replies to top ~30% of replies (engagement-based or detailed)
  // This keeps Nerm's timeline from being spammy
  const shouldReply = textLen >= 80 || engagement >= 2 || Math.random() < 0.25;
  if (!shouldReply) {
    await markSeen(tweet.tweet_id + '_nerm', 'skipped');
    return;
  }

  // Generate Nerm's reply
  const nermReply = await rateChronicleReply(tweet.text, twitterHandle);
  if (!nermReply) return;

  // Post it
  await client.postTweet(nermReply, tweet.tweet_id);
  await markSeen(tweet.tweet_id + '_nerm', 'replied');
  console.log(`[Nerm Twitter] Replied to @${twitterHandle}: "${nermReply.slice(0, 60)}..."`);
}

// ── HANDLE A DIRECT MENTION ───────────────────────────────────
async function handleMention(tweet, twitterHandle, client) {
  if (!tweet.id) return;
  if (await hasSeen(tweet.id)) return;

  // Strip @9LVNetwork and @9LV_Nerm from the text
  const cleanText = (tweet.text || '')
    .replace(/@9LVNetwork/gi, '')
    .replace(/@9LV_Nerm/gi, '')
    .trim();

  if (!cleanText || cleanText.length < 3) {
    await markSeen(tweet.id, 'empty');
    return;
  }

  const nermReply = await askNerm(
    `@${twitterHandle} mentioned you on Twitter and said: "${cleanText}". Reply as Nerm in ≤240 chars. Be in-character.`,
    'twitter',
    { twitterHandle }
  );

  if (!nermReply) return;

  await client.postTweet(nermReply, tweet.id);
  await markSeen(tweet.id, 'mention_reply');
  console.log(`[Nerm Twitter] Replied to mention from @${twitterHandle}`);
}

// ── SCAN CHRONICLE REPLIES + RESPOND ─────────────────────────
async function scanAndRespondToChronicle(client) {
  const chronicleIds = await getTodayChronicleIds();
  if (chronicleIds.length === 0) return;

  for (const act of chronicleIds) {
    if (!act.tweet_id) continue;
    const data = await client.searchRecent(
      `conversation_id:${act.tweet_id} -from:9LVNetwork -from:9LV_Nerm`
    ).catch(() => null);

    if (!data?.data) continue;

    const userMap = {};
    (data.includes?.users || []).forEach(u => { userMap[u.id] = u.username; });

    // Sort by engagement to pick best replies first
    const replies = data.data
      .map(t => ({
        tweet_id: t.id,
        text: t.text,
        author_id: t.author_id,
        like_count: t.public_metrics?.like_count || 0,
        reply_count: t.public_metrics?.reply_count || 0,
        handle: userMap[t.author_id] || 'unknown',
      }))
      .sort((a, b) => (b.like_count + b.reply_count * 2) - (a.like_count + a.reply_count * 2));

    // Reply to top 3 per act max (rate limit safety)
    let repliedCount = 0;
    for (const reply of replies) {
      if (repliedCount >= 3) break;
      const alreadySeen = await hasSeen(reply.tweet_id + '_nerm');
      if (alreadySeen) continue;
      await handleChronicleReply(reply, reply.handle, client);
      repliedCount++;
      // Pause between replies to avoid rate limits
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ── SCAN DIRECT MENTIONS ──────────────────────────────────────
async function scanMentions(client) {
  const data = await client.searchRecent(
    '@9LVNetwork OR @9LV_Nerm -is:retweet -from:9LVNetwork -from:9LV_Nerm'
  ).catch(() => null);

  if (!data?.data) return;

  const userMap = {};
  (data.includes?.users || []).forEach(u => { userMap[u.id] = u.username; });

  for (const tweet of data.data) {
    const handle = userMap[tweet.author_id] || 'unknown';
    await handleMention(tweet, handle, client);
    await new Promise(r => setTimeout(r, 1500));
  }
}

// ── RT TICKET AWARD ───────────────────────────────────────────
async function awardRTTicket(twitterHandle, raidDate) {
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id')
    .ilike('twitter_handle', twitterHandle)
    .single();

  if (!player) return;

  // Schema: ticket_date, tickets_earned (daily count), max 6/day total
  const { data: existing } = await supabaseAdmin
    .from('drop_tickets')
    .select('id, tickets_earned')
    .eq('player_id', player.id)
    .eq('ticket_date', raidDate)
    .single();

  if (!existing) {
    await supabaseAdmin.from('drop_tickets').insert({
      player_id: player.id,
      ticket_date: raidDate,
      tickets_earned: 1,
      rolled: false,
      results: null,
    }).catch(() => {});
  } else if ((existing.tickets_earned || 0) < 6) {
    // Max 6 tickets/day total (4 Chronicle + 1 RT + 1 login)
    await supabaseAdmin.from('drop_tickets')
      .update({ tickets_earned: existing.tickets_earned + 1 })
      .eq('id', existing.id)
      .catch(() => {});
  } else {
    return; // already at max
  }

  console.log(`[Nerm Twitter] RT ticket awarded to @${twitterHandle}`);
}

// ── MAIN POLL CYCLE ───────────────────────────────────────────
// Called every 30 minutes by scheduler
let isRunning = false;

async function runNermTwitterCycle() {
  if (isRunning) return;
  isRunning = true;

  const client = getTwitterClient();
  if (!client) {
    isRunning = false;
    return;
  }

  console.log('[Nerm Twitter] Starting scan cycle...');
  const raidDate = new Date().toISOString().slice(0, 10);

  try {
    await scanAndRespondToChronicle(client);
    await scanMentions(client);
  } catch (err) {
    console.error('[Nerm Twitter] Cycle error:', err.message);
  }

  isRunning = false;
  console.log('[Nerm Twitter] Scan cycle complete.');
}

// Start periodic polling (every 30 minutes)
function startNermTwitterBot() {
  const token = process.env.TWITTER_BEARER_TOKEN;
  const oauth = process.env.TWITTER_ACCESS_TOKEN;

  if (!token && !oauth) {
    console.warn('[Nerm Twitter] No Twitter credentials — bot disabled');
    return;
  }

  console.log('[Nerm Twitter] Starting reply-guy bot (30min cycle)...');
  runNermTwitterCycle(); // run immediately
  setInterval(runNermTwitterCycle, 30 * 60 * 1000); // then every 30 min
}

// Also export postTweet for use by chronicleEngine
async function postTweetAsBot(text, replyToId = null) {
  const client = getTwitterClient();
  if (!client) throw new Error('Twitter client not available');
  return client.postTweet(text, replyToId);
}

module.exports = { startNermTwitterBot, postTweetAsBot, runNermTwitterCycle };