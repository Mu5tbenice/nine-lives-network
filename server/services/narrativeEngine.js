/**
 * narrativeEngine.js - Narrative Raid System
 *
 * Runs a 4-tweet daily story arc with community raid tracking.
 * Communities (crypto tags like $BONK, $WIF) compete by replying.
 * Winner = community with most UNIQUE repliers.
 *
 * Schedule (UTC):
 *   08:00 - Tweet 1: Story Opening + rally call
 *   14:00 - Tweet 2: Escalation + live community scoreboard
 *   18:00 - Tweet 3: Last Call + updated scores + urgency
 *   22:00 - Tweet 4: Resolution + winner + MVP + points awarded
 *
 * Between tweets: bot scrapes replies, counts unique repliers per community,
 * awards website points to registered players.
 */

const supabase = require("../config/supabase");

// ============================================================
// DATABASE HELPERS
// ============================================================

/**
 * Get or create today's raid record.
 * Stores the active narrative, tweet IDs, and current standings.
 */
async function getTodayRaid() {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Try to fetch existing raid for today
  const { data: existing, error: fetchError } = await supabase
    .from("narrative_raids")
    .select("*")
    .eq("raid_date", today)
    .single();

  if (existing) return existing;

  // Pick a random narrative that hasn't been used recently
  const narrative = await pickNarrative();

  // Create new raid
  const { data: newRaid, error: createError } = await supabase
    .from("narrative_raids")
    .insert({
      raid_date: today,
      narrative_id: narrative.id,
      narrative_title: narrative.title,
      status: "pending", // pending -> active -> scoring -> complete
      tweet_1_id: null,
      tweet_2_id: null,
      tweet_3_id: null,
      tweet_4_id: null,
      standings: {}, // { "$BONK": { unique: 5, users: ["id1","id2"...] }, ... }
      winner_community: null,
      winner_count: 0,
      mvp_player_id: null,
      mvp_twitter_handle: null,
      total_raiders: 0,
    })
    .select()
    .single();

  if (createError) {
    console.error("[NarrativeEngine] Error creating raid:", createError);
    return null;
  }

  console.log(
    `[NarrativeEngine] Created raid for ${today}: "${narrative.title}"`,
  );
  return newRaid;
}

/**
 * Pick a narrative that hasn't been used in the last 20 days.
 */
async function pickNarrative() {
  // Get recently used narrative IDs
  const twentyDaysAgo = new Date();
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

  const { data: recentRaids } = await supabase
    .from("narrative_raids")
    .select("narrative_id")
    .gte("raid_date", twentyDaysAgo.toISOString().split("T")[0]);

  const usedIds = (recentRaids || []).map((r) => r.narrative_id);

  // Get all narratives not recently used
  let query = supabase.from("narratives").select("*");
  if (usedIds.length > 0) {
    query = query.not("id", "in", `(${usedIds.join(",")})`);
  }

  const { data: available, error } = await query;

  if (error || !available || available.length === 0) {
    // Fallback: just pick any narrative
    const { data: fallback } = await supabase
      .from("narratives")
      .select("*")
      .limit(1);
    return fallback[0];
  }

  // Random pick from available
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Update raid record in database.
 */
async function updateRaid(raidId, updates) {
  const { data, error } = await supabase
    .from("narrative_raids")
    .update(updates)
    .eq("id", raidId)
    .select()
    .single();

  if (error) {
    console.error("[NarrativeEngine] Error updating raid:", error);
  }
  return data;
}

// ============================================================
// REPLY SCRAPING & COUNTING
// ============================================================

/**
 * Scrape replies to a tweet and count unique repliers per community.
 *
 * How it works:
 * 1. Fetch replies to the opening tweet (tweet_1_id)
 * 2. For each replier, look up their registration to find community_tag
 * 3. Count unique repliers per community
 * 4. Award points to registered players
 *
 * @param {string} tweetId - The tweet to scrape replies from
 * @param {object} currentStandings - Existing standings to merge with
 * @returns {object} Updated standings
 */
async function scrapeAndCount(tweetId, currentStandings = {}) {
  if (!tweetId) {
    console.log("[NarrativeEngine] No tweet ID to scrape");
    return currentStandings;
  }

  try {
    // Import twitter client
    const { mainClient } = require("../config/twitter");

    // Search for replies to our tweet
    // Twitter API v2: search recent tweets that are replies to our tweet
    const query = `conversation_id:${tweetId} is:reply`;

    const response = await mainClient.v2.search(query, {
      max_results: 100,
      "tweet.fields": ["author_id", "created_at", "text"],
      "user.fields": ["username"],
      expansions: ["author_id"],
    });

    if (!response.data?.data) {
      console.log("[NarrativeEngine] No replies found");
      return currentStandings;
    }

    const replies = response.data.data;
    const users = response.data.includes?.users || [];

    // Build username lookup from Twitter response
    const userMap = {};
    for (const user of users) {
      userMap[user.id] = user.username;
    }

    // Get all registered players
    const { data: players } = await supabase
      .from("players")
      .select("id, twitter_id, twitter_handle, community_tag, school_id");

    const playerByTwitterId = {};
    for (const p of players || []) {
      if (p.twitter_id) {
        playerByTwitterId[p.twitter_id] = p;
      }
    }

    // Also build lookup by handle (lowercase) as fallback
    const playerByHandle = {};
    for (const p of players || []) {
      if (p.twitter_handle) {
        playerByHandle[p.twitter_handle.toLowerCase().replace("@", "")] = p;
      }
    }

    // Deep clone current standings
    const standings = JSON.parse(JSON.stringify(currentStandings));

    // Track which players we've already counted (for points)
    const newRepliers = [];

    for (const reply of replies) {
      const authorId = reply.author_id;
      const authorHandle = userMap[authorId]?.toLowerCase();

      // Find the player by twitter_id first, then by handle
      let player = playerByTwitterId[authorId] || playerByHandle[authorHandle];

      if (!player || !player.community_tag) {
        // Unregistered or no community tag - skip counting
        continue;
      }

      const community = player.community_tag.toUpperCase();

      // Initialize community in standings if needed
      if (!standings[community]) {
        standings[community] = { unique: 0, users: [], player_ids: [] };
      }

      // Only count unique repliers
      if (!standings[community].users.includes(authorId)) {
        standings[community].users.push(authorId);
        standings[community].player_ids.push(player.id);
        standings[community].unique = standings[community].users.length;
        newRepliers.push(player);
      }
    }

    // Award points to new repliers (registered players who replied)
    for (const player of newRepliers) {
      await awardRaidPoints(player.id, 5); // 5 points per raid reply
    }

    console.log(
      `[NarrativeEngine] Scraped ${replies.length} replies, ${newRepliers.length} new unique raiders`,
    );
    return standings;
  } catch (error) {
    console.error("[NarrativeEngine] Scrape error:", error.message);
    return currentStandings;
  }
}

/**
 * Award website points to a player for participating in a raid.
 */
async function awardRaidPoints(playerId, points) {
  try {
    const { error } = await supabase.rpc("increment_player_points", {
      p_player_id: playerId,
      p_points: points,
    });

    if (error) {
      // Fallback: manual update if RPC doesn't exist
      const { data: player } = await supabase
        .from("players")
        .select("seasonal_points, lifetime_points")
        .eq("id", playerId)
        .single();

      if (player) {
        await supabase
          .from("players")
          .update({
            seasonal_points: (player.seasonal_points || 0) + points,
            lifetime_points: (player.lifetime_points || 0) + points,
          })
          .eq("id", playerId);
      }
    }
  } catch (err) {
    console.error(
      `[NarrativeEngine] Points error for player ${playerId}:`,
      err.message,
    );
  }
}

// ============================================================
// TWEET BUILDING
// ============================================================

/**
 * Build the opening tweet text (Tweet 1 - 8AM UTC).
 */
function buildOpeningTweet(narrative) {
  // narrative has fields: opening, escalation, last_call, resolution
  const rally =
    "\n\n🏴 Which community will answer the call?\nRally your people — reply to join the raid! 🐱‍👤";
  return `${narrative.opening}${rally}`;
}

/**
 * Build the midday update tweet (Tweet 2 - 2PM UTC).
 */
function buildMiddayTweet(narrative, standings) {
  const scoreboard = buildScoreboard(standings);
  const update = narrative.escalation || "The battle rages on...";

  let tweet = `${update}\n\n📊 RAID STANDINGS:\n${scoreboard}`;
  tweet += "\n\nStill time to rally — reply to Tweet 1 to score! ⚔️";
  return tweet;
}

/**
 * Build the last call tweet (Tweet 3 - 6PM UTC).
 */
function buildLastCallTweet(narrative, standings) {
  const scoreboard = buildScoreboard(standings);
  const tension = narrative.last_call || "The final hours approach...";

  // Find top 2 communities for drama
  const sorted = getSortedCommunities(standings);
  let drama = "";
  if (sorted.length >= 2) {
    const gap = sorted[0].unique - sorted[1].unique;
    if (gap <= 3) {
      drama = `\n\n🔥 ${sorted[1].tag} is only ${gap} raider${gap === 1 ? "" : "s"} behind ${sorted[0].tag}! ANYONE'S GAME!`;
    } else {
      drama = `\n\n${sorted[0].tag} leads by ${gap} — can anyone catch them?`;
    }
  }

  let tweet = `${tension}\n\n📊 RAID STANDINGS:\n${scoreboard}${drama}`;
  tweet += "\n\n⏰ LAST CALL — final raid count at 10PM UTC!";
  return tweet;
}

/**
 * Build the resolution tweet (Tweet 4 - 10PM UTC).
 */
function buildResolutionTweet(narrative, standings, mvpHandle) {
  const resolution = narrative.resolution || "And so the tale concludes...";
  const sorted = getSortedCommunities(standings);

  let tweet = `${resolution}\n\n`;

  if (sorted.length > 0) {
    const winner = sorted[0];
    tweet += `🏆 VICTORY: ${winner.tag} with ${winner.unique} raiders!\n`;

    // Runner up
    if (sorted.length > 1) {
      tweet += `🥈 ${sorted[1].tag}: ${sorted[1].unique}\n`;
    }
    if (sorted.length > 2) {
      tweet += `🥉 ${sorted[2].tag}: ${sorted[2].unique}\n`;
    }

    const totalRaiders = sorted.reduce((sum, c) => sum + c.unique, 0);
    tweet += `\n📊 Total raiders: ${totalRaiders}`;
  } else {
    tweet += "No communities rallied today... the void grows stronger. 🌑";
  }

  if (mvpHandle) {
    tweet += `\n⭐ MVP: @${mvpHandle}`;
  }

  tweet += "\n\n🐱 Full results at 9lv.net";
  return tweet;
}

/**
 * Format standings into a scoreboard string.
 */
function buildScoreboard(standings) {
  const sorted = getSortedCommunities(standings);
  if (sorted.length === 0) return "No raiders yet — be the first! 🐱";

  return sorted
    .slice(0, 5) // Top 5
    .map((c, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "▪️";
      return `${medal} ${c.tag}: ${c.unique} raider${c.unique === 1 ? "" : "s"}`;
    })
    .join("\n");
}

/**
 * Sort communities by unique replier count (descending).
 */
function getSortedCommunities(standings) {
  return Object.entries(standings)
    .map(([tag, data]) => ({
      tag,
      unique: data.unique,
      users: data.users,
      player_ids: data.player_ids,
    }))
    .sort((a, b) => b.unique - a.unique);
}

// ============================================================
// MAIN ACTIONS (called by scheduler)
// ============================================================

/**
 * TWEET 1 — Opening (8AM UTC)
 * Posts the story hook + rally call.
 */
async function postOpening() {
  console.log("[NarrativeEngine] === POSTING OPENING (Tweet 1) ===");

  try {
    const raid = await getTodayRaid();
    if (!raid) return;

    // Get the narrative text
    const { data: narrative } = await supabase
      .from("narratives")
      .select("*")
      .eq("id", raid.narrative_id)
      .single();

    if (!narrative) {
      console.error(
        "[NarrativeEngine] Narrative not found:",
        raid.narrative_id,
      );
      return;
    }

    const tweetText = buildOpeningTweet(narrative);

    // Post to Twitter
    const { mainClient } = require("../config/twitter");
    const tweet = await mainClient.v2.tweet(tweetText);
    const tweetId = tweet.data.id;

    console.log(`[NarrativeEngine] Opening posted, tweet ID: ${tweetId}`);

    // Save tweet ID and mark as active
    await updateRaid(raid.id, {
      tweet_1_id: tweetId,
      status: "active",
    });
  } catch (error) {
    console.error("[NarrativeEngine] Opening post error:", error.message);
  }
}

/**
 * TWEET 2 — Midday Update (2PM UTC)
 * Scrapes replies, posts scoreboard.
 */
async function postMidDay() {
  console.log("[NarrativeEngine] === POSTING MIDDAY UPDATE (Tweet 2) ===");

  try {
    const raid = await getTodayRaid();
    if (!raid || !raid.tweet_1_id) {
      console.log("[NarrativeEngine] No active raid or missing tweet 1");
      return;
    }

    // Scrape replies and update standings
    const standings = await scrapeAndCount(
      raid.tweet_1_id,
      raid.standings || {},
    );

    // Get narrative for story text
    const { data: narrative } = await supabase
      .from("narratives")
      .select("*")
      .eq("id", raid.narrative_id)
      .single();

    const tweetText = buildMiddayTweet(narrative, standings);

    // Post as reply to tweet 1
    const { mainClient } = require("../config/twitter");
    const tweet = await mainClient.v2.tweet(tweetText, {
      reply: { in_reply_to_tweet_id: raid.tweet_1_id },
    });

    // Update raid
    await updateRaid(raid.id, {
      tweet_2_id: tweet.data.id,
      standings: standings,
    });

    console.log("[NarrativeEngine] Midday update posted");
  } catch (error) {
    console.error("[NarrativeEngine] Midday post error:", error.message);
  }
}

/**
 * TWEET 3 — Last Call (6PM UTC)
 * Scrapes replies, posts urgent scoreboard.
 */
async function postLastCall() {
  console.log("[NarrativeEngine] === POSTING LAST CALL (Tweet 3) ===");

  try {
    const raid = await getTodayRaid();
    if (!raid || !raid.tweet_1_id) return;

    const standings = await scrapeAndCount(
      raid.tweet_1_id,
      raid.standings || {},
    );

    const { data: narrative } = await supabase
      .from("narratives")
      .select("*")
      .eq("id", raid.narrative_id)
      .single();

    const tweetText = buildLastCallTweet(narrative, standings);

    const { mainClient } = require("../config/twitter");
    const tweet = await mainClient.v2.tweet(tweetText, {
      reply: { in_reply_to_tweet_id: raid.tweet_1_id },
    });

    await updateRaid(raid.id, {
      tweet_3_id: tweet.data.id,
      standings: standings,
      status: "scoring",
    });

    console.log("[NarrativeEngine] Last call posted");
  } catch (error) {
    console.error("[NarrativeEngine] Last call error:", error.message);
  }
}

/**
 * TWEET 4 — Resolution (10PM UTC)
 * Final scrape, determine winner, award bonus points, post results.
 */
async function postResolution() {
  console.log("[NarrativeEngine] === POSTING RESOLUTION (Tweet 4) ===");

  try {
    const raid = await getTodayRaid();
    if (!raid || !raid.tweet_1_id) return;

    // Final scrape
    const standings = await scrapeAndCount(
      raid.tweet_1_id,
      raid.standings || {},
    );

    // Determine winner
    const sorted = getSortedCommunities(standings);
    let winnerCommunity = null;
    let winnerCount = 0;
    let mvpHandle = null;
    let totalRaiders = 0;

    if (sorted.length > 0) {
      winnerCommunity = sorted[0].tag;
      winnerCount = sorted[0].unique;
      totalRaiders = sorted.reduce((sum, c) => sum + c.unique, 0);

      // Award bonus points to winning community members
      const winnerPlayerIds = sorted[0].player_ids || [];
      for (const playerId of winnerPlayerIds) {
        await awardRaidPoints(playerId, 10); // 10 bonus for winning community
      }

      // Pick MVP — first replier from winning community (or most active)
      if (winnerPlayerIds.length > 0) {
        const { data: mvpPlayer } = await supabase
          .from("players")
          .select("twitter_handle")
          .eq("id", winnerPlayerIds[0])
          .single();

        if (mvpPlayer) {
          mvpHandle = mvpPlayer.twitter_handle?.replace("@", "");
        }
      }
    }

    // Get narrative for resolution text
    const { data: narrative } = await supabase
      .from("narratives")
      .select("*")
      .eq("id", raid.narrative_id)
      .single();

    const tweetText = buildResolutionTweet(narrative, standings, mvpHandle);

    // Post resolution
    const { mainClient } = require("../config/twitter");
    const tweet = await mainClient.v2.tweet(tweetText, {
      reply: { in_reply_to_tweet_id: raid.tweet_1_id },
    });

    // Finalize raid
    await updateRaid(raid.id, {
      tweet_4_id: tweet.data.id,
      standings: standings,
      winner_community: winnerCommunity,
      winner_count: winnerCount,
      mvp_twitter_handle: mvpHandle,
      total_raiders: totalRaiders,
      status: "complete",
    });

    console.log(
      `[NarrativeEngine] Resolution posted. Winner: ${winnerCommunity} (${winnerCount} raiders)`,
    );
  } catch (error) {
    console.error("[NarrativeEngine] Resolution error:", error.message);
  }
}

/**
 * PERIODIC SCRAPE — called every 10 minutes between tweets
 * Keeps standings up to date without posting.
 */
async function periodicScrape() {
  try {
    const raid = await getTodayRaid();
    if (!raid || !raid.tweet_1_id || raid.status === "complete") return;

    const standings = await scrapeAndCount(
      raid.tweet_1_id,
      raid.standings || {},
    );
    await updateRaid(raid.id, { standings });

    const total = Object.values(standings).reduce(
      (sum, c) => sum + c.unique,
      0,
    );
    console.log(
      `[NarrativeEngine] Periodic scrape: ${total} total unique raiders`,
    );
  } catch (error) {
    console.error("[NarrativeEngine] Periodic scrape error:", error.message);
  }
}

// ============================================================
// API HELPERS (for website display)
// ============================================================

/**
 * Get today's raid data for website display.
 */
async function getTodayRaidData() {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("narrative_raids")
    .select("*")
    .eq("raid_date", today)
    .single();

  return data;
}

/**
 * Get recent raid history for website display.
 */
async function getRaidHistory(limit = 7) {
  const { data } = await supabase
    .from("narrative_raids")
    .select("*")
    .eq("status", "complete")
    .order("raid_date", { ascending: false })
    .limit(limit);

  return data || [];
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Scheduler actions (called by cron)
  postOpening,
  postMidDay,
  postLastCall,
  postResolution,
  periodicScrape,

  // API helpers (called by routes)
  getTodayRaidData,
  getRaidHistory,

  // Testing helpers
  scrapeAndCount,
  buildScoreboard,
  getSortedCommunities,
};
