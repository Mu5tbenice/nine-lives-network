/**
 * ═══════════════════════════════════════════════════════
 * narrativeEngine.js — The Chronicle System V4
 * Nine Lives Network
 *
 * Daily four-act collaborative story on Twitter/X.
 * Players reply in character → AI weaves them into the narrative.
 *
 * Schedule (UTC):
 *   08:05 — Act 1: The Call (pre-written hook from narratives.js)
 *   12:05 — Act 2: The March (AI-generated, names players from Act 1 replies)
 *   16:05 — Act 3: The Storm (AI-generated, escalation, more players named)
 *   20:05 — Act 4: The Reckoning (AI-generated, wildcard ending, final scores)
 *
 * Between acts: scrape replies every 10 min, score quality, award points.
 *
 * THIS REPLACES the old narrativeEngine.js entirely.
 * ═══════════════════════════════════════════════════════
 */

const supabase = require("../config/supabase");
const { narratives, getRandomNarrative, getNarrativeById } = require("./narratives");

// ════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════

const HOUSES = {
  1: "Smoulders", 2: "Darktide", 3: "Stonebark", 4: "Ashenvale",
  5: "Stormrage", 6: "Nighthollow", 7: "Dawnbringer", 8: "Manastorm", 9: "Plaguemire"
};

const HOUSE_KEYWORDS = {
  1: ["fire", "burn", "flame", "ash", "ember", "smoulder"],
  2: ["tide", "deep", "ocean", "drown", "wave", "abyss"],
  3: ["stone", "root", "earth", "bark", "grow", "ancient"],
  4: ["wind", "gust", "storm", "breeze", "sky", "swift"],
  5: ["lightning", "thunder", "bolt", "spark", "storm", "shock"],
  6: ["shadow", "night", "void", "dark", "moon", "dusk"],
  7: ["light", "dawn", "sun", "radiant", "holy", "blessing"],
  8: ["mana", "arcane", "crystal", "rift", "spell", "warp"],
  9: ["plague", "poison", "rot", "decay", "toxic", "spore"]
};

// V4 Scoring from game design doc
const POINTS = {
  REPLY_BASE: 15,        // Showed up in character
  REPLY_QUALITY: 25,     // 10+ words, in-character (replaces base)
  REPLY_DETAILED: 35,    // 30+ words, strong narrative (replaces lower)
  HOUSE_FLAIR: 5,        // Stacks on top — used house keywords
  NAMED_IN_STORY: 20,    // Bot wove you into the narrative
  // Act 4 wildcard bonuses
  HEROIC_VICTORY: 30,
  UNDERDOG_TRIUMPH: 50,
  CHAOS_ENDING: 20,
  BETRAYAL_ARC: 40,
  MYSTERIOUS_OUTCOME: 30
};

const WILDCARD_ENDINGS = [
  "heroic_victory",    // Dominant house/guild gets bonus
  "underdog_triumph",  // Smallest group that showed up gets bigger bonus
  "chaos_ending",      // Everyone gets points, nobody "wins"
  "betrayal_arc",      // One house gets bonus, framed as betrayal
  "mysterious_outcome" // Random participating house gets bonus
];

// ════════════════════════════════════
// DATABASE HELPERS
// ════════════════════════════════════

/**
 * Get or create today's chronicle raid record.
 */
async function getTodayRaid() {
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("narrative_raids")
    .select("*")
    .eq("raid_date", today)
    .single();

  if (existing) return existing;

  // Pick a narrative not used in the last 20 days
  const twentyDaysAgo = new Date();
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

  const { data: recentRaids } = await supabase
    .from("narrative_raids")
    .select("narrative_id")
    .gte("raid_date", twentyDaysAgo.toISOString().split("T")[0]);

  const usedIds = (recentRaids || []).map(r => r.narrative_id);
  const narrative = getRandomNarrative(usedIds);

  const { data: newRaid, error } = await supabase
    .from("narrative_raids")
    .insert({
      raid_date: today,
      narrative_id: narrative.id,
      narrative_title: narrative.title,
      status: "pending",
      tweet_1_id: null,
      tweet_2_id: null,
      tweet_3_id: null,
      tweet_4_id: null,
      act_1_text: null,
      act_2_text: null,
      act_3_text: null,
      act_4_text: null,
      standings: {},
      replies: [],          // All scored replies [{player_id, handle, house_id, text, score, act, named}]
      named_players: [],    // Handles that got woven into the story
      ending_type: null,
      winner_community: null,
      winner_count: 0,
      mvp_player_id: null,
      mvp_twitter_handle: null,
      total_raiders: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[Chronicle] Error creating raid:", error);
    return null;
  }

  console.log(`[Chronicle] Created raid for ${today}: "${narrative.title}"`);
  return newRaid;
}

/**
 * Update raid record.
 */
async function updateRaid(raidId, updates) {
  const { data, error } = await supabase
    .from("narrative_raids")
    .update(updates)
    .eq("id", raidId)
    .select()
    .single();

  if (error) console.error("[Chronicle] Update error:", error);
  return data;
}

// ════════════════════════════════════
// REPLY SCRAPING & QUALITY SCORING
// ════════════════════════════════════

/**
 * Scrape replies from all chronicle tweets, score quality, award points.
 * Returns updated standings + replies array.
 */
async function scrapeAndScore(raid) {
  // Collect all tweet IDs to scrape
  const tweetIds = [raid.tweet_1_id, raid.tweet_2_id, raid.tweet_3_id, raid.tweet_4_id].filter(Boolean);
  if (tweetIds.length === 0) return { standings: raid.standings || {}, replies: raid.replies || [] };

  try {
    const { mainClient } = require("../config/twitter");

    // Get all registered players
    const { data: players } = await supabase
      .from("players")
      .select("id, twitter_id, twitter_handle, community_tag, guild_tag, school_id");

    const playerByTwitterId = {};
    const playerByHandle = {};
    for (const p of players || []) {
      if (p.twitter_id) playerByTwitterId[p.twitter_id] = p;
      if (p.twitter_handle) playerByHandle[p.twitter_handle.toLowerCase().replace("@", "")] = p;
    }

    // Deep clone existing data
    const standings = JSON.parse(JSON.stringify(raid.standings || {}));
    const existingReplies = raid.replies || [];
    const seenPlayerIds = new Set(existingReplies.map(r => r.player_id));
    const newReplies = [];

    // Scrape each tweet's replies
    for (const tweetId of tweetIds) {
      try {
        const query = `conversation_id:${tweetId} is:reply`;
        const response = await mainClient.v2.search(query, {
          max_results: 100,
          "tweet.fields": ["author_id", "created_at", "text"],
          "user.fields": ["username"],
          expansions: ["author_id"],
        });

        if (!response.data?.data) continue;

        const replies = response.data.data;
        const users = response.data.includes?.users || [];
        const userMap = {};
        for (const u of users) userMap[u.id] = u.username;

        for (const reply of replies) {
          const authorId = reply.author_id;
          const authorHandle = userMap[authorId]?.toLowerCase();
          const player = playerByTwitterId[authorId] || playerByHandle[authorHandle];

          if (!player) continue; // Unregistered — skip
          if (seenPlayerIds.has(player.id)) continue; // Already scored

          // Score this reply
          const score = scoreReply(reply.text, player.school_id);
          const actNum = tweetIds.indexOf(tweetId) + 1;

          const replyRecord = {
            player_id: player.id,
            handle: player.twitter_handle?.replace("@", "") || authorHandle,
            house_id: player.school_id,
            house_name: HOUSES[player.school_id] || "Unknown",
            text: reply.text?.substring(0, 280) || "",
            score: score.total,
            breakdown: score,
            act: actNum,
            named: false, // Set to true when AI names them
            tweet_id: reply.id,
          };

          newReplies.push(replyRecord);
          seenPlayerIds.add(player.id);

          // Award points
          await awardPoints(player.id, score.total, "chronicle_reply");

          // Update community standings
          const community = (player.guild_tag || player.community_tag || "").toUpperCase();
          if (community) {
            if (!standings[community]) {
              standings[community] = { unique: 0, users: [], player_ids: [] };
            }
            if (!standings[community].users.includes(authorId)) {
              standings[community].users.push(authorId);
              standings[community].player_ids.push(player.id);
              standings[community].unique = standings[community].users.length;
            }
          }
        }

        // Rate limit: wait between tweet scrapes
        await sleep(1500);
      } catch (err) {
        console.error(`[Chronicle] Scrape error for tweet ${tweetId}:`, err.message);
      }
    }

    const allReplies = [...existingReplies, ...newReplies];

    if (newReplies.length > 0) {
      console.log(`[Chronicle] Scored ${newReplies.length} new replies (${allReplies.length} total)`);
    }

    return { standings, replies: allReplies };
  } catch (error) {
    console.error("[Chronicle] Scrape error:", error.message);
    return { standings: raid.standings || {}, replies: raid.replies || [] };
  }
}

/**
 * Score a single reply based on V4 quality tiers.
 */
function scoreReply(text, houseId) {
  const words = (text || "").trim().split(/\s+/).length;
  let base = POINTS.REPLY_BASE;

  // Quality tiers (replace, not stack)
  if (words >= 30) {
    base = POINTS.REPLY_DETAILED;
  } else if (words >= 10) {
    base = POINTS.REPLY_QUALITY;
  }

  // House flair bonus (stacks)
  let flair = 0;
  const lower = (text || "").toLowerCase();
  const keywords = HOUSE_KEYWORDS[houseId] || [];
  if (keywords.some(kw => lower.includes(kw))) {
    flair = POINTS.HOUSE_FLAIR;
  }

  return {
    base,
    flair,
    named: 0, // Added later when AI names them
    total: base + flair,
    words
  };
}

/**
 * Award points to a player.
 */
async function awardPoints(playerId, points, source) {
  try {
    // Try RPC first
    const { error } = await supabase.rpc("increment_player_points", {
      p_player_id: playerId,
      p_points: points,
    });

    if (error) {
      // Fallback: manual update
      const { data: player } = await supabase
        .from("players")
        .select("seasonal_points, lifetime_points")
        .eq("id", playerId)
        .single();

      if (player) {
        await supabase.from("players").update({
          seasonal_points: (player.seasonal_points || 0) + points,
          lifetime_points: (player.lifetime_points || 0) + points,
        }).eq("id", playerId);
      }
    }
  } catch (err) {
    console.error(`[Chronicle] Points error for ${playerId}:`, err.message);
  }
}

// ════════════════════════════════════
// AI STORY GENERATION (Anthropic)
// ════════════════════════════════════

/**
 * Call Anthropic to generate the next act of the story.
 * Feeds in: the original prompt, player replies, standings, named players so far.
 * Returns: story text that names specific players.
 */
async function generateActText(narrative, actNum, raid, replies) {
  // Pick the right prompt template
  const promptKey = `tweet_${actNum}_prompt`;
  const promptTemplate = narrative[promptKey];
  if (!promptTemplate) {
    console.error(`[Chronicle] No prompt found for act ${actNum}`);
    return null;
  }

  // Build context from player replies
  const actReplies = replies.filter(r => r.act < actNum); // Replies from PREVIOUS acts
  const topReplies = actReplies
    .sort((a, b) => b.score - a.score)
    .slice(0, 8); // Top 8 replies by quality

  // Build the standings scoreboard
  const standings = raid.standings || {};
  const sorted = getSortedCommunities(standings);
  const scoreboard = sorted.slice(0, 5).map((c, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "▪️";
    return `${medal} ${c.tag}: ${c.unique} raider${c.unique === 1 ? "" : "s"}`;
  }).join("\n");

  // Build player reply excerpts for the AI
  let playerContext = "";
  if (topReplies.length > 0) {
    playerContext = "\n\nPlayer replies to weave into the story (use their @handles):\n";
    topReplies.forEach(r => {
      playerContext += `- @${r.handle} (${r.house_name}): "${r.text.substring(0, 150)}"\n`;
    });
    playerContext += "\nPick 2-5 of these players to NAME in the story. Reference what they said or did.";
  }

  // Wildcard ending context for Act 4
  let endingContext = "";
  if (actNum === 4) {
    const ending = WILDCARD_ENDINGS[Math.floor(Math.random() * WILDCARD_ENDINGS.length)];
    raid._ending_type = ending; // Store for later

    const endingInstructions = {
      heroic_victory: "The dominant community/house wins decisively. Frame it as an earned victory.",
      underdog_triumph: "The SMALLEST community that showed up gets the glory. The underdogs win. The big groups are stunned.",
      chaos_ending: "Nobody wins cleanly. Everything went sideways. All participants get recognition. Chaos reigns.",
      betrayal_arc: "One house/community betrayed the others at the last moment. Frame it dramatically. They seized victory through cunning.",
      mysterious_outcome: "A random participating group gets the bonus for reasons nobody fully understands. Something strange happened. The outcome is... unexpected."
    };

    endingContext = `\n\nIMPORTANT — This is the FINAL act. Use this ending type: "${ending}"\n${endingInstructions[ending]}\nAnnounce results dramatically.`;
  }

  // The actual prompt to Anthropic
  const systemPrompt = `You are the narrator of The Chronicle — a daily collaborative story in the world of Nethara, where magical cat warriors called "Nines" battle for territory. Your tone is post-ironic high fantasy meets crypto Twitter meme culture. Deadpan humor. Committed to the fantasy premise while acknowledging its ridiculousness.

Rules:
- Write in 2nd/3rd person narrative. Under 280 characters for the story section (it's a tweet).
- Name specific players using their @handles when provided.
- Include the community scoreboard AFTER the story section.
- Keep the conspiratorial/dramatic tone matching the narrative theme.
- NEVER break character. You ARE the narrator of Nethara.
- End with "⚔️ Reply to join!" (Acts 2-3) or "Full intel at 9lv.net" (Act 4).`;

  const userPrompt = `NARRATIVE: "${narrative.title}"
THEME: ${narrative.theme}

PROMPT FOR THIS ACT:
${promptTemplate}

CURRENT SCOREBOARD:
${scoreboard || "No raiders yet"}
${playerContext}${endingContext}

Write the tweet for Act ${actNum}. Story section first, then scoreboard. Total must be under 280 characters if possible, but can go up to 400 for Act 4 resolution. Do NOT include hashtags.`;

  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    });

    const text = response.content[0]?.text;
    if (!text) {
      console.error("[Chronicle] Empty AI response");
      return null;
    }

    // Extract which players were named
    const namedHandles = [];
    for (const r of topReplies) {
      if (text.includes(`@${r.handle}`)) {
        namedHandles.push(r.handle);
      }
    }

    console.log(`[Chronicle] Act ${actNum} generated (${text.length} chars), named ${namedHandles.length} players`);
    return { text, namedHandles };
  } catch (err) {
    console.error("[Chronicle] AI generation error:", err.message);
    return null;
  }
}

/**
 * Award "named in story" bonus to players.
 */
async function awardNamedBonus(replies, namedHandles) {
  for (const handle of namedHandles) {
    const reply = replies.find(r => r.handle === handle);
    if (reply && !reply.named) {
      reply.named = true;
      reply.score += POINTS.NAMED_IN_STORY;
      reply.breakdown.named = POINTS.NAMED_IN_STORY;
      reply.breakdown.total += POINTS.NAMED_IN_STORY;
      await awardPoints(reply.player_id, POINTS.NAMED_IN_STORY, "chronicle_named");
      console.log(`[Chronicle] +${POINTS.NAMED_IN_STORY} pts to @${handle} (named in story)`);
    }
  }
}

/**
 * Award Act 4 wildcard ending bonuses.
 */
async function awardWildcardBonus(endingType, replies, standings) {
  const sorted = getSortedCommunities(standings);
  const allParticipantIds = replies.map(r => r.player_id);

  let bonusAmount = 0;
  let recipientIds = [];
  let description = "";

  switch (endingType) {
    case "heroic_victory":
      bonusAmount = POINTS.HEROIC_VICTORY;
      if (sorted.length > 0) {
        recipientIds = sorted[0].player_ids || [];
        description = `Heroic Victory — ${sorted[0].tag} members`;
      }
      break;

    case "underdog_triumph":
      bonusAmount = POINTS.UNDERDOG_TRIUMPH;
      if (sorted.length > 0) {
        const smallest = sorted[sorted.length - 1]; // Smallest group
        recipientIds = smallest.player_ids || [];
        description = `Underdog Triumph — ${smallest.tag} members`;
      }
      break;

    case "chaos_ending":
      bonusAmount = POINTS.CHAOS_ENDING;
      recipientIds = allParticipantIds;
      description = "Chaos Ending — all participants";
      break;

    case "betrayal_arc":
      bonusAmount = POINTS.BETRAYAL_ARC;
      if (sorted.length > 1) {
        // Pick a random community that's NOT #1
        const betrayer = sorted[1 + Math.floor(Math.random() * (sorted.length - 1))];
        recipientIds = betrayer.player_ids || [];
        description = `Betrayal Arc — ${betrayer.tag} seized victory`;
      }
      break;

    case "mysterious_outcome":
      bonusAmount = POINTS.MYSTERIOUS_OUTCOME;
      if (sorted.length > 0) {
        const random = sorted[Math.floor(Math.random() * sorted.length)];
        recipientIds = random.player_ids || [];
        description = `Mysterious Outcome — ${random.tag} members`;
      }
      break;
  }

  // Award the bonus
  const uniqueIds = [...new Set(recipientIds)];
  for (const pid of uniqueIds) {
    await awardPoints(pid, bonusAmount, "chronicle_wildcard");
  }

  console.log(`[Chronicle] Wildcard "${endingType}": +${bonusAmount} to ${uniqueIds.length} players (${description})`);
  return { endingType, bonusAmount, recipientCount: uniqueIds.length, description };
}

// ════════════════════════════════════
// HELPERS
// ════════════════════════════════════

function getSortedCommunities(standings) {
  return Object.entries(standings || {})
    .map(([tag, data]) => ({
      tag,
      unique: data.unique,
      users: data.users,
      player_ids: data.player_ids,
    }))
    .sort((a, b) => b.unique - a.unique);
}

function buildScoreboard(standings) {
  const sorted = getSortedCommunities(standings);
  if (sorted.length === 0) return "No raiders yet — be the first! 🐱";
  return sorted.slice(0, 5).map((c, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "▪️";
    return `${medal} ${c.tag}: ${c.unique} raider${c.unique === 1 ? "" : "s"}`;
  }).join("\n");
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ════════════════════════════════════
// MAIN ACTIONS (called by scheduler)
// ════════════════════════════════════

/**
 * ACT 1 — The Call (08:05 UTC)
 * Posts pre-written hook from narratives.js.
 */
async function postAct1() {
  console.log("[Chronicle] ═══ ACT 1: THE CALL ═══");

  try {
    const raid = await getTodayRaid();
    if (!raid) return;
    if (raid.tweet_1_id) { console.log("[Chronicle] Act 1 already posted"); return; }

    const narrative = getNarrativeById(raid.narrative_id);
    if (!narrative) {
      console.error("[Chronicle] Narrative not found:", raid.narrative_id);
      return;
    }

    // Use the pre-written tweet_1
    const tweetText = narrative.tweet_1;

    const { mainClient } = require("../config/twitter");
    const tweet = await mainClient.v2.tweet(tweetText);
    const tweetId = tweet.data.id;

    console.log(`[Chronicle] Act 1 posted, tweet ID: ${tweetId}`);

    await updateRaid(raid.id, {
      tweet_1_id: tweetId,
      act_1_text: tweetText,
      status: "active",
    });
  } catch (error) {
    console.error("[Chronicle] Act 1 error:", error.message);
  }
}

/**
 * ACT 2 — The March (12:05 UTC)
 * Scrapes replies, generates AI continuation naming players.
 */
async function postAct2() {
  console.log("[Chronicle] ═══ ACT 2: THE MARCH ═══");

  try {
    const raid = await getTodayRaid();
    if (!raid || !raid.tweet_1_id) { console.log("[Chronicle] No active raid"); return; }
    if (raid.tweet_2_id) { console.log("[Chronicle] Act 2 already posted"); return; }

    // Scrape and score all replies so far
    const { standings, replies } = await scrapeAndScore(raid);

    // Get the narrative
    const narrative = getNarrativeById(raid.narrative_id);
    if (!narrative) return;

    // Generate Act 2 with AI
    const raidWithStandings = { ...raid, standings, replies };
    const result = await generateActText(narrative, 2, raidWithStandings, replies);

    let tweetText;
    if (result) {
      tweetText = result.text;
      // Award named-in-story bonus
      await awardNamedBonus(replies, result.namedHandles);
    } else {
      // Fallback: use prompt template + scoreboard
      const scoreboard = buildScoreboard(standings);
      tweetText = `The story deepens...\n\n📊 RAID STANDINGS:\n${scoreboard}\n\nReply to Tweet 1 to join! ⚔️`;
    }

    // Post as reply to Act 1
    const { mainClient } = require("../config/twitter");
    const tweet = await mainClient.v2.tweet(tweetText, {
      reply: { in_reply_to_tweet_id: raid.tweet_1_id },
    });

    const allNamedPlayers = [...(raid.named_players || []), ...(result?.namedHandles || [])];

    await updateRaid(raid.id, {
      tweet_2_id: tweet.data.id,
      act_2_text: tweetText,
      standings,
      replies,
      named_players: [...new Set(allNamedPlayers)],
    });

    console.log("[Chronicle] Act 2 posted");
  } catch (error) {
    console.error("[Chronicle] Act 2 error:", error.message);
  }
}

/**
 * ACT 3 — The Storm (16:05 UTC)
 * Escalation with more players named.
 */
async function postAct3() {
  console.log("[Chronicle] ═══ ACT 3: THE STORM ═══");

  try {
    const raid = await getTodayRaid();
    if (!raid || !raid.tweet_1_id) return;
    if (raid.tweet_3_id) { console.log("[Chronicle] Act 3 already posted"); return; }

    const { standings, replies } = await scrapeAndScore(raid);
    const narrative = getNarrativeById(raid.narrative_id);
    if (!narrative) return;

    const raidWithStandings = { ...raid, standings, replies };
    const result = await generateActText(narrative, 3, raidWithStandings, replies);

    let tweetText;
    if (result) {
      tweetText = result.text;
      await awardNamedBonus(replies, result.namedHandles);
    } else {
      const scoreboard = buildScoreboard(standings);
      tweetText = `The stakes rise...\n\n📊 RAID STANDINGS:\n${scoreboard}\n\n⏰ LAST CALL — final count at 8PM UTC! ⚔️`;
    }

    const { mainClient } = require("../config/twitter");
    const tweet = await mainClient.v2.tweet(tweetText, {
      reply: { in_reply_to_tweet_id: raid.tweet_1_id },
    });

    const allNamedPlayers = [...(raid.named_players || []), ...(result?.namedHandles || [])];

    await updateRaid(raid.id, {
      tweet_3_id: tweet.data.id,
      act_3_text: tweetText,
      standings,
      replies,
      named_players: [...new Set(allNamedPlayers)],
      status: "scoring",
    });

    console.log("[Chronicle] Act 3 posted");
  } catch (error) {
    console.error("[Chronicle] Act 3 error:", error.message);
  }
}

/**
 * ACT 4 — The Reckoning (20:05 UTC)
 * Wildcard ending, final scores, resolution.
 */
async function postAct4() {
  console.log("[Chronicle] ═══ ACT 4: THE RECKONING ═══");

  try {
    const raid = await getTodayRaid();
    if (!raid || !raid.tweet_1_id) return;
    if (raid.tweet_4_id) { console.log("[Chronicle] Act 4 already posted"); return; }

    // Final scrape
    const { standings, replies } = await scrapeAndScore(raid);
    const narrative = getNarrativeById(raid.narrative_id);
    if (!narrative) return;

    // Generate Act 4 with wildcard ending
    const raidWithStandings = { ...raid, standings, replies };
    const result = await generateActText(narrative, 4, raidWithStandings, replies);

    // Get the ending type (set during generation)
    const endingType = raidWithStandings._ending_type || "chaos_ending";

    let tweetText;
    if (result) {
      tweetText = result.text;
      await awardNamedBonus(replies, result.namedHandles);
    } else {
      const scoreboard = buildScoreboard(standings);
      const sorted = getSortedCommunities(standings);
      const winner = sorted.length > 0 ? sorted[0] : null;
      tweetText = winner
        ? `🏆 VICTORY: ${winner.tag} with ${winner.unique} raiders!\n\n${scoreboard}\n\nFull intel at 9lv.net`
        : `The void grows stronger... No communities rallied today. 🌑\n\nFull intel at 9lv.net`;
    }

    // Award wildcard bonus
    const wildcardResult = await awardWildcardBonus(endingType, replies, standings);

    // Determine winner + MVP
    const sorted = getSortedCommunities(standings);
    const winnerCommunity = sorted.length > 0 ? sorted[0].tag : null;
    const winnerCount = sorted.length > 0 ? sorted[0].unique : 0;
    const totalRaiders = sorted.reduce((sum, c) => sum + c.unique, 0);

    // MVP = highest scoring replier
    const mvp = replies.sort((a, b) => b.score - a.score)[0];

    // Post
    const { mainClient } = require("../config/twitter");
    const tweet = await mainClient.v2.tweet(tweetText, {
      reply: { in_reply_to_tweet_id: raid.tweet_1_id },
    });

    const allNamedPlayers = [...(raid.named_players || []), ...(result?.namedHandles || [])];

    await updateRaid(raid.id, {
      tweet_4_id: tweet.data.id,
      act_4_text: tweetText,
      standings,
      replies,
      named_players: [...new Set(allNamedPlayers)],
      ending_type: endingType,
      winner_community: winnerCommunity,
      winner_count: winnerCount,
      mvp_player_id: mvp?.player_id || null,
      mvp_twitter_handle: mvp?.handle || null,
      total_raiders: totalRaiders,
      status: "complete",
    });

    console.log(`[Chronicle] Act 4 posted. Winner: ${winnerCommunity} (${winnerCount}). Ending: ${endingType}`);
  } catch (error) {
    console.error("[Chronicle] Act 4 error:", error.message);
  }
}

/**
 * PERIODIC SCRAPE — called every 10 minutes between acts.
 * Keeps standings and reply scores up to date.
 */
async function periodicScrape() {
  try {
    const raid = await getTodayRaid();
    if (!raid || !raid.tweet_1_id || raid.status === "complete") return;

    const { standings, replies } = await scrapeAndScore(raid);
    await updateRaid(raid.id, { standings, replies });

    const total = Object.values(standings).reduce((sum, c) => sum + (c.unique || 0), 0);
    if (total > 0) {
      console.log(`[Chronicle] Scrape: ${total} unique raiders, ${replies.length} scored replies`);
    }
  } catch (error) {
    console.error("[Chronicle] Periodic scrape error:", error.message);
  }
}

// ════════════════════════════════════
// API HELPERS (for dashboard/routes)
// ════════════════════════════════════

/**
 * Get today's chronicle data for the dashboard.
 * Returns act texts, statuses, player participation, etc.
 */
async function getTodayChronicle(playerId) {
  const today = new Date().toISOString().split("T")[0];

  const { data: raid } = await supabase
    .from("narrative_raids")
    .select("*")
    .eq("raid_date", today)
    .single();

  if (!raid) {
    return {
      active: false,
      title: null,
      acts: [],
      standings: {},
      player_participated: false,
      player_named: false,
      ending_type: null,
    };
  }

  // Build acts array
  const acts = [
    {
      num: 1,
      name: "The Call",
      time: "08:00 UTC",
      status: raid.tweet_1_id ? "complete" : "upcoming",
      tweet_id: raid.tweet_1_id,
      text: raid.act_1_text,
    },
    {
      num: 2,
      name: "The March",
      time: "12:00 UTC",
      status: raid.tweet_2_id ? "complete" : (raid.tweet_1_id ? "active" : "upcoming"),
      tweet_id: raid.tweet_2_id,
      text: raid.act_2_text,
    },
    {
      num: 3,
      name: "The Storm",
      time: "16:00 UTC",
      status: raid.tweet_3_id ? "complete" : (raid.tweet_2_id ? "active" : "upcoming"),
      tweet_id: raid.tweet_3_id,
      text: raid.act_3_text,
    },
    {
      num: 4,
      name: "The Reckoning",
      time: "20:00 UTC",
      status: raid.tweet_4_id ? "complete" : (raid.tweet_3_id ? "active" : "upcoming"),
      tweet_id: raid.tweet_4_id,
      text: raid.act_4_text,
    },
  ];

  // Check if this player participated or was named
  const replies = raid.replies || [];
  const namedPlayers = raid.named_players || [];
  let playerParticipated = false;
  let playerNamed = false;
  let playerScore = 0;

  if (playerId) {
    const pid = parseInt(playerId);
    const playerReply = replies.find(r => r.player_id === pid);
    if (playerReply) {
      playerParticipated = true;
      playerScore = playerReply.score;
    }
    const { data: playerData } = await supabase
      .from("players")
      .select("twitter_handle")
      .eq("id", pid)
      .single();
    if (playerData) {
      const handle = (playerData.twitter_handle || "").replace("@", "").toLowerCase();
      playerNamed = namedPlayers.some(h => h.toLowerCase() === handle);
    }
  }

  return {
    active: true,
    title: raid.narrative_title,
    acts,
    standings: raid.standings || {},
    total_raiders: raid.total_raiders || Object.values(raid.standings || {}).reduce((s, c) => s + (c.unique || 0), 0),
    player_participated: playerParticipated,
    player_named: playerNamed,
    player_score: playerScore,
    ending_type: raid.ending_type,
    winner_community: raid.winner_community,
    mvp_handle: raid.mvp_twitter_handle,
    named_players: namedPlayers,
    status: raid.status,
  };
}

/**
 * Get recent chronicle history.
 */
async function getChronicleHistory(limit = 7) {
  const { data } = await supabase
    .from("narrative_raids")
    .select("raid_date, narrative_title, ending_type, winner_community, winner_count, total_raiders, mvp_twitter_handle, status")
    .eq("status", "complete")
    .order("raid_date", { ascending: false })
    .limit(limit);

  return data || [];
}

// ════════════════════════════════════
// EXPORTS
// ════════════════════════════════════

module.exports = {
  // Scheduler actions (called by cron)
  postAct1,       // was postOpening
  postAct2,       // was postMidDay
  postAct3,       // was postLastCall
  postAct4,       // was postResolution
  periodicScrape,

  // API helpers (called by routes)
  getTodayChronicle,
  getChronicleHistory,

  // Legacy aliases (so scheduler doesn't break during transition)
  postOpening: postAct1,
  postMidDay: postAct2,
  postLastCall: postAct3,
  postResolution: postAct4,

  // Testing
  scrapeAndScore,
  scoreReply,
  buildScoreboard,
  getSortedCommunities,
};