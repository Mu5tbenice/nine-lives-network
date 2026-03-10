// ═══════════════════════════════════════════════════════════════
// server/services/chronicleEngine.js
// Nine Lives Network — Chronicle Engine V2
//
// What this does:
//  - Before each act posts: reads REAL game state (zones, guilds, houses)
//  - For Acts 2/3/4: scans Twitter replies on previous act → names real players
//  - Generates act text with Claude using real data + pre-written templates
//  - Awards points + Drop Tickets to repliers
//  - Records everything in chronicle_participants table
// ═══════════════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const { addPoints } = require('./pointsService');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── HOUSE MAP ────────────────────────────────────────────────
const HOUSE_NAMES = {
  1: 'Smoulders 🔥', 2: 'Darktide 🌊', 3: 'Stonebark 🌿',
  4: 'Ashenvale 💨', 5: 'Stormrage ⚡', 6: 'Nighthollow 🌙',
  7: 'Dawnbringer ☀️', 8: 'Manastorm 🔮', 9: 'Plaguemire ☠️',
};

// ── SCORING ──────────────────────────────────────────────────
const SCORE = {
  BASE:    { points: 15, xp: 5 },
  QUALITY: { points: 25, xp: 5 },  // 50+ chars
  DETAIL:  { points: 35, xp: 5 },  // 120+ chars
  HOUSE_FLAIR: { points: 5, xp: 0 },
  NAMED:   { points: 20, xp: 10 },
  ENDING: {
    heroic_victory:    { points: 30 },
    underdog_triumph:  { points: 50 },
    chaos_ending:      { points: 20 },
    betrayal_arc:      { points: 40 },
    mysterious_outcome:{ points: 30 },
  },
};

const DROP_TICKET_SOURCES = {
  chronicle_reply: 1, // 1 ticket per act reply (max 4/day)
  retweet: 1,
};

// ── TWITTER CLIENT ────────────────────────────────────────────
// Thin wrapper — actual posting handled by existing nermBot/scheduler
// We only ADD reply-scanning and reply-to functions here
async function twitterApiGet(endpoint, params = {}) {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    console.warn('[Chronicle] No TWITTER_BEARER_TOKEN — reply scanning disabled');
    return null;
  }
  const url = new URL(`https://api.twitter.com/2/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!res.ok) {
    console.error(`[Chronicle] Twitter API error ${res.status}:`, await res.text());
    return null;
  }
  return res.json();
}

// ── GET REAL GAME STATE ───────────────────────────────────────
async function getGameState() {
  try {
    // Active deployments per zone
    const { data: deployments } = await supabase
      .from('zone_deployments')
      .select('zone_id, guild_tag, player:player_id(twitter_handle, school_id)')
      .eq('is_active', true);

    const totalNines = (deployments || []).length;

    // Guild deployment counts
    const guildCounts = {};
    const houseCounts = {};
    const twitterHandles = [];
    (deployments || []).forEach(d => {
      if (d.guild_tag) guildCounts[d.guild_tag] = (guildCounts[d.guild_tag] || 0) + 1;
      const sid = d.player?.school_id;
      if (sid) houseCounts[sid] = (houseCounts[sid] || 0) + 1;
      if (d.player?.twitter_handle) twitterHandles.push(d.player.twitter_handle);
    });

    // Zone control (most recent snapshot data)
    const { data: zones } = await supabase
      .from('zones')
      .select('name, controlling_guild')
      .eq('is_active', true);

    const controlledZones = (zones || []).filter(z => z.controlling_guild);
    const controlByGuild = {};
    controlledZones.forEach(z => {
      if (z.controlling_guild) {
        controlByGuild[z.controlling_guild] = (controlByGuild[z.controlling_guild] || 0) + 1;
      }
    });

    // Top guild by zone control
    const topGuild = Object.entries(controlByGuild).sort((a, b) => b[1] - a[1])[0];
    // Top guild by deployed nines
    const mostDeployedGuild = Object.entries(guildCounts).sort((a, b) => b[1] - a[1])[0];
    // Top house by deployed nines
    const topHouseId = Object.entries(houseCounts).sort((a, b) => b[1] - a[1])[0];
    const topHouseName = topHouseId ? (HOUSE_NAMES[topHouseId[0]] || 'Unknown') : 'Unknown';

    return {
      totalNines,
      totalZones: (zones || []).length,
      controlledZones: controlledZones.length,
      topGuildByZones: topGuild ? `${topGuild[0]} (${topGuild[1]} zones)` : 'None yet',
      topGuildByNines: mostDeployedGuild ? `${mostDeployedGuild[0]} (${mostDeployedGuild[1]} Nines)` : 'None yet',
      topHouse: topHouseName,
      guildCounts,
      houseCounts,
      activeTwitterHandles: [...new Set(twitterHandles)].slice(0, 10),
    };
  } catch (err) {
    console.error('[Chronicle] Failed to get game state:', err.message);
    return {
      totalNines: 0, totalZones: 9, controlledZones: 0,
      topGuildByZones: 'None yet', topGuildByNines: 'None yet',
      topHouse: 'Unknown', guildCounts: {}, houseCounts: {}, activeTwitterHandles: [],
    };
  }
}

// ── SCAN TWITTER REPLIES ──────────────────────────────────────
// Returns array of { twitter_handle, twitter_id, text, like_count, reply_count }
async function scanReplies(tweetId) {
  if (!tweetId) return [];
  try {
    // Search for replies using conversation_id
    const data = await twitterApiGet('tweets/search/recent', {
      query: `conversation_id:${tweetId} -from:9LVNetwork`,
      'tweet.fields': 'author_id,text,public_metrics,created_at',
      'user.fields': 'username',
      expansions: 'author_id',
      max_results: 25,
    });

    if (!data || !data.data) return [];

    const userMap = {};
    (data.includes?.users || []).forEach(u => { userMap[u.id] = u.username; });

    return data.data.map(t => ({
      twitter_handle: userMap[t.author_id] || 'unknown',
      twitter_id: t.author_id,
      tweet_id: t.id,
      text: t.text,
      like_count: t.public_metrics?.like_count || 0,
      reply_count: t.public_metrics?.reply_count || 0,
    }));
  } catch (err) {
    console.error('[Chronicle] Reply scan failed:', err.message);
    return [];
  }
}

// ── SCORE REPLY ───────────────────────────────────────────────
function scoreReply(text) {
  const len = (text || '').length;
  let score = SCORE.BASE;
  if (len >= 120) score = SCORE.DETAIL;
  else if (len >= 50) score = SCORE.QUALITY;

  // House flair bonus — mentions a house name
  const houseWords = ['smoulders', 'darktide', 'stonebark', 'ashenvale', 'stormrage',
                      'nighthollow', 'dawnbringer', 'manastorm', 'plaguemire'];
  const hasHouseFlair = houseWords.some(h => text.toLowerCase().includes(h));

  return {
    points: score.points + (hasHouseFlair ? SCORE.HOUSE_FLAIR.points : 0),
    xp: score.xp,
    tier: len >= 120 ? 'detailed' : len >= 50 ? 'quality' : 'base',
    hasHouseFlair,
  };
}

// ── AWARD CHRONICLE POINTS + DROP TICKET ─────────────────────
async function awardReplyPoints(playerId, scoring, actNum, raidDate) {
  try {
    // Add points
    await addPoints(playerId, scoring.points, 'chronicle_reply',
      `Chronicle Act ${actNum} reply (${scoring.tier})`);

    // Award drop ticket (max 4 per day from Chronicle)
    // Schema: ticket_date, tickets_earned (daily count), rolled, results (jsonb)
    const { data: existingRow } = await supabaseAdmin
      .from('drop_tickets')
      .select('id, tickets_earned')
      .eq('player_id', playerId)
      .eq('ticket_date', raidDate)
      .single();

    if (!existingRow) {
      // First ticket today
      await supabaseAdmin.from('drop_tickets').insert({
        player_id: playerId,
        ticket_date: raidDate,
        tickets_earned: 1,
        rolled: false,
        results: null,
      });
    } else if ((existingRow.tickets_earned || 0) < 4) {
      // Increment, max 4 from Chronicle
      await supabaseAdmin.from('drop_tickets')
        .update({ tickets_earned: existingRow.tickets_earned + 1 })
        .eq('id', existingRow.id);
    }

    console.log(`[Chronicle] Awarded ${scoring.points}pts + Drop Ticket to player ${playerId}`);
  } catch (err) {
    console.error('[Chronicle] Award failed for player', playerId, err.message);
  }
}

// ── MATCH TWITTER HANDLE TO PLAYER ───────────────────────────
async function findPlayerByTwitter(twitterHandle) {
  const { data } = await supabaseAdmin
    .from('players')
    .select('id, twitter_handle, school_id, guild_tag')
    .ilike('twitter_handle', twitterHandle)
    .single();
  return data || null;
}

// ── PROCESS ACT REPLIES ───────────────────────────────────────
// Scans replies to prev act, scores registered players, returns top handles to name
async function processReplies(prevTweetId, actNum, raidDate) {
  const replies = await scanReplies(prevTweetId);
  if (replies.length === 0) {
    console.log(`[Chronicle] No replies found for tweet ${prevTweetId}`);
    return { namedHandles: [], participantCount: 0 };
  }

  console.log(`[Chronicle] Found ${replies.length} replies to process`);

  const namedHandles = [];
  let participantCount = 0;

  for (const reply of replies) {
    // Check if already processed this reply
    const { data: existing } = await supabaseAdmin
      .from('chronicle_participants')
      .select('id')
      .eq('reply_tweet_id', reply.tweet_id)
      .single();
    if (existing) continue;

    participantCount++;
    const scoring = scoreReply(reply.text);

    // Find player in our DB
    const player = await findPlayerByTwitter(reply.twitter_handle);

    if (player) {
      // Registered player — award points
      await awardReplyPoints(player.id, scoring, actNum - 1, raidDate);

      // Record participant
      await supabaseAdmin.from('chronicle_participants').insert({
        player_id: player.id,
        raid_date: raidDate,
        act_num: actNum - 1,
        reply_tweet_id: reply.tweet_id,
        points_awarded: scoring.points,
        quality_tier: scoring.tier,
        named_in_story: false,
      }).catch(() => {});
    }

    // Add to "candidates to name in story" (top 2 by engagement)
    if (namedHandles.length < 2) {
      namedHandles.push({
        handle: reply.twitter_handle,
        text: reply.text,
        engagement: reply.like_count + reply.reply_count * 2,
        player,
      });
    }
  }

  // Sort named candidates by engagement
  namedHandles.sort((a, b) => b.engagement - a.engagement);

  // Mark top named handles as named_in_story and award bonus points
  for (const candidate of namedHandles.slice(0, 2)) {
    if (candidate.player) {
      await addPoints(candidate.player.id, SCORE.NAMED.points, 'chronicle_named',
        `Named in Chronicle Act ${actNum}`);
      await supabaseAdmin.from('chronicle_participants')
        .update({ named_in_story: true })
        .eq('reply_tweet_id', candidate.handle); // best-effort
    }
  }

  return {
    namedHandles: namedHandles.slice(0, 2).map(c => '@' + c.handle),
    participantCount,
  };
}

// ── GENERATE ACT TEXT WITH CLAUDE ────────────────────────────
async function generateActText(actNum, actName, gameState, namedHandles, raidTitle, endingType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[Chronicle] No ANTHROPIC_API_KEY — using fallback text');
    return fallbackActText(actNum, actName, gameState, namedHandles, raidTitle);
  }

  const HOUSE_LIST = Object.values(HOUSE_NAMES).join(', ');
  const topRepliers = namedHandles.length > 0
    ? `The following real players replied to the previous act and should be woven into the narrative (mention them by @handle): ${namedHandles.join(', ')}`
    : 'No specific players to name this act.';

  const ENDING_PROMPTS = {
    heroic_victory:    'End triumphantly — the dominant force wins gloriously. Poetic and epic.',
    underdog_triumph:  'End with a shocking upset — the smallest faction claims victory. Hopeful.',
    chaos_ending:      'End in glorious chaos — nobody wins, everyone is implicated.',
    betrayal_arc:      'End with betrayal — someone switched sides at the last moment.',
    mysterious_outcome:'End mysteriously — a third force appears, outcome unclear.',
  };

  const actInstructions = {
    1: `Act 1 (THE CALL): Set the scene. Establish conflict. Use vivid Netharan world-building. End with a call to action asking players to reply as their Nine. Keep it under 240 chars total.`,
    2: `Act 2 (THE MARCH): Advance the story. Mention named players if any. Include a short NETHARA STANDINGS block using real data. Show momentum building. Under 240 chars plus standings.`,
    3: `Act 3 (THE STORM): Escalate. Stakes rise. Reference zone battles happening RIGHT NOW. Mention real guilds/houses if active. Under 240 chars plus brief standing update.`,
    4: `Act 4 (THE RECKONING): ${endingType ? ENDING_PROMPTS[endingType] : 'Resolve the story dramatically.'} Name the winners. Give final standings. Under 280 chars.`,
  };

  const standingsBlock = actNum >= 2 ? `
NETHARA STANDINGS (use this data):
⚔️ ${gameState.totalNines} Nines deployed across ${gameState.totalZones} zones
🏴 Leading guild: ${gameState.topGuildByZones}
🔥 Most active house: ${gameState.topHouse}
🗡️ Raiders count: ${gameState.totalNines}` : '';

  const prompt = `You are writing THE CHRONICLE — the daily narrative for Nine Lives Network, a web3 card battle game set in Nethara.

WORLD: Nethara is a post-ironic high fantasy world. Nine houses (${HOUSE_LIST}) fight for zone control. Players are called Nines. Guilds are player communities. The tone is epic on the surface, self-aware underneath — serious lore meets crypto Twitter.

TODAY'S STORY: "${raidTitle}"

${actInstructions[actNum]}

${topRepliers}

${standingsBlock}

RULES:
- Never use "wizard cats" — call them Nines or by house name
- Nethara is the world name, not Avaloris
- Keep crypto/blockchain references subtle and in-world (spell crystals, forge runes, etc.)
- Always end Acts 1-3 with "⚔️ Reply as your Nine!"
- Use house icons: 🔥 Smoulders 🌊 Darktide 🌿 Stonebark 💨 Ashenvale ⚡ Stormrage 🌙 Nighthollow ☀️ Dawnbringer 🔮 Manastorm ☠️ Plaguemire
- Format standings cleanly with emoji bullets
- Write only the tweet text, no preamble

Write Act ${actNum} now:`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) throw new Error('Empty Claude response');
    return text;
  } catch (err) {
    console.error('[Chronicle] Claude generation failed:', err.message);
    return fallbackActText(actNum, actName, gameState, namedHandles, raidTitle);
  }
}

// ── FALLBACK ACT TEXT (no API key / Claude error) ─────────────
function fallbackActText(actNum, actName, gameState, namedHandles, raidTitle) {
  const named = namedHandles.length > 0 ? `${namedHandles.join(' and ')} step forward. ` : '';
  const templates = {
    1: `🗡️ ${raidTitle}\n\nThe nine houses of Nethara stir. ${gameState.totalNines} Nines hold the field across ${gameState.totalZones} contested zones. The ${gameState.topHouse} push hard.\n\nThe story begins.\n\n⚔️ Reply as your Nine!`,
    2: `${named}The march across Nethara's zones continues. ${gameState.topGuildByNines} leads the charge.\n\n⚔️ ${gameState.totalNines} Nines active\n🏴 ${gameState.topGuildByZones} holds the most territory\n\n⚔️ Reply as your Nine!`,
    3: `The storm breaks. Zones fracture and reform. ${named}${gameState.topHouse} warriors hold their ground.\n\n⚔️ ${gameState.totalNines} Nines fighting\n🔥 ${gameState.topGuildByZones} leading\n\n⚔️ Reply as your Nine!`,
    4: `The Reckoning arrives. ${gameState.topGuildByZones} stands tallest as the dust settles.\n\n${named}The Chronicle remembers those who fought.\n\n⚔️ Final: ${gameState.totalNines} Nines, ${gameState.controlledZones} zones claimed.`,
  };
  return templates[actNum] || templates[1];
}

// ── PICK ENDING TYPE ──────────────────────────────────────────
function pickEndingType(gameState) {
  // Underdog triumph if a small force has outsized zone control
  const guildEntries = Object.entries(gameState.guildCounts);
  if (guildEntries.length >= 2) {
    const [top, second] = guildEntries.sort((a, b) => b[1] - a[1]);
    if (second && top[1] > second[1] * 3) return 'underdog_triumph';
  }
  // Chaos if nobody controls zones
  if (gameState.controlledZones === 0) return 'chaos_ending';
  // Otherwise random weighted
  const r = Math.random();
  if (r < 0.35) return 'heroic_victory';
  if (r < 0.55) return 'chaos_ending';
  if (r < 0.70) return 'betrayal_arc';
  if (r < 0.85) return 'underdog_triumph';
  return 'mysterious_outcome';
}

// ── MAIN: FIRE AN ACT ─────────────────────────────────────────
// Called by scheduler at 08:00, 12:00, 16:00, 20:00 UTC
// actNum: 1, 2, 3, or 4
// postTweet: async (text, replyToId?) => { id: tweetId }
async function fireAct(actNum, postTweet) {
  console.log(`[Chronicle] Firing Act ${actNum}...`);
  const raidDate = new Date().toISOString().slice(0, 10);

  try {
    // Get today's chronicle record
    const { data: raid } = await supabaseAdmin
      .from('chronicle_raids')
      .select('*')
      .eq('raid_date', raidDate)
      .single();

    if (!raid) {
      console.error('[Chronicle] No raid record for today:', raidDate);
      return;
    }

    // Get act template from chronicle_acts table
    const { data: actRecord } = await supabaseAdmin
      .from('chronicle_acts')
      .select('*')
      .eq('raid_date', raidDate)
      .eq('act_num', actNum)
      .single();

    // Get real game state
    const gameState = await getGameState();

    // Scan replies from previous act (for acts 2, 3, 4)
    let namedHandles = [];
    let participantCount = 0;
    if (actNum > 1) {
      const { data: prevAct } = await supabaseAdmin
        .from('chronicle_acts')
        .select('tweet_id')
        .eq('raid_date', raidDate)
        .eq('act_num', actNum - 1)
        .single();

      if (prevAct?.tweet_id) {
        const result = await processReplies(prevAct.tweet_id, actNum, raidDate);
        namedHandles = result.namedHandles;
        participantCount = result.participantCount;
        console.log(`[Chronicle] Act ${actNum - 1} had ${participantCount} participants, naming: ${namedHandles.join(', ')}`);
      }
    }

    // Pick ending type for Act 4
    const endingType = actNum === 4 ? pickEndingType(gameState) : null;

    // Generate act text
    const actText = await generateActText(
      actNum,
      actRecord?.act_name || ['', 'The Call', 'The March', 'The Storm', 'The Reckoning'][actNum],
      gameState,
      namedHandles,
      raid.narrative_title || 'Chronicles of Nethara',
      endingType,
    );

    // Find Act 1 tweet ID for threading
    let replyToId = null;
    if (actNum > 1) {
      const { data: act1 } = await supabaseAdmin
        .from('chronicle_acts')
        .select('tweet_id')
        .eq('raid_date', raidDate)
        .eq('act_num', 1)
        .single();
      replyToId = act1?.tweet_id || null;
    }

    // Post the tweet
    const posted = await postTweet(actText, replyToId);
    const tweetId = posted?.id || posted?.data?.id || null;

    console.log(`[Chronicle] Act ${actNum} posted. Tweet ID: ${tweetId}`);

    // Save tweet ID + generated text back to chronicle_acts
    await supabaseAdmin
      .from('chronicle_acts')
      .upsert({
        raid_date: raidDate,
        act_num: actNum,
        act_name: ['', 'The Call', 'The March', 'The Storm', 'The Reckoning'][actNum],
        tweet_id: tweetId,
        tweet_text: actText,
        status: 'complete',
        participant_count: participantCount,
        named_handles: namedHandles.join(','),
      }, { onConflict: 'raid_date,act_num' });

    // For Act 4: update raid with ending type and process final scoring
    if (actNum === 4 && endingType) {
      await processAct4Bonuses(raidDate, endingType, gameState);
      await supabaseAdmin
        .from('chronicle_raids')
        .update({
          ending_type: endingType,
          status: 'complete',
          total_raiders: participantCount,
        })
        .eq('raid_date', raidDate);
    }

    return { tweetId, actText, namedHandles, participantCount };

  } catch (err) {
    console.error(`[Chronicle] fireAct ${actNum} error:`, err.message);
    throw err;
  }
}

// ── ACT 4: ENDING BONUSES ─────────────────────────────────────
async function processAct4Bonuses(raidDate, endingType, gameState) {
  const bonus = SCORE.ENDING[endingType]?.points || 20;

  // Get all today's participants
  const { data: participants } = await supabaseAdmin
    .from('chronicle_participants')
    .select('player_id')
    .eq('raid_date', raidDate);

  if (!participants || participants.length === 0) return;

  const playerIds = [...new Set(participants.map(p => p.player_id))];
  console.log(`[Chronicle] Awarding Act 4 ${endingType} bonus (${bonus}pts) to ${playerIds.length} players`);

  for (const pid of playerIds) {
    await addPoints(pid, bonus, 'chronicle_ending',
      `Chronicle ending bonus: ${endingType} (+${bonus}pts)`).catch(() => {});
  }
}

// ── EXPORTS ───────────────────────────────────────────────────
module.exports = {
  fireAct,
  getGameState,
  scanReplies,
  processReplies,
  scoreReply,
};