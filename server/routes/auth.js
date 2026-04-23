const express = require('express');
const router = express.Router();
const { authClient, createUserClient } = require('../config/twitter');
const supabase = require('../config/supabase');

// V3: Nine creation on registration
let nineSystem = null;
try {
  nineSystem = require('../services/nineSystem');
} catch (e) {
  console.log('⚠️ nineSystem not loaded');
}

// Pack system — for granting welcome packs on registration
let packSystem = null;
try {
  packSystem = require('../services/packSystem');
} catch (e) {
  console.log('⚠️ packSystem not loaded');
}

// Store OAuth states temporarily (in production, use Redis or database)
const oauthStates = new Map();

// Callback URL for Twitter OAuth - USE YOUR PUBLISHED APP URL
const CALLBACK_URL =
  process.env.TWITTER_CALLBACK_URL || 'https://9lv.net/auth/twitter/callback';

/**
 * GET /auth/twitter
 * Initiates Twitter OAuth 2.0 flow.
 *
 * §9.70 note: PR #176 added a mobile-UA redirect here to
 * /auth/twitter-mobile (long-press workaround page). Reverted 2026-04-23
 * after smoke test confirmed the long-press step was dead-end UX — user
 * tapped the Login button, X app still hijacked, nothing happened. The
 * extra instruction page just added a step without fixing the underlying
 * return-from-X-app problem. Real fix = Apple Universal Links /
 * Android App Links registration on 9lv.net (deferred to a dedicated
 * session). /auth/twitter-mobile endpoint kept as orphaned code; clean
 * up when the UL PR lands.
 */
router.get('/twitter', async (req, res) => {
  try {
    const { url, codeVerifier, state } = authClient.generateOAuth2AuthLink(
      CALLBACK_URL,
      { scope: ['tweet.read', 'users.read'] },
    );

    // Store the codeVerifier for later use
    oauthStates.set(state, {
      codeVerifier,
      createdAt: Date.now(),
    });

    // Clean up old states (older than 10 minutes)
    for (const [key, value] of oauthStates.entries()) {
      if (Date.now() - value.createdAt > 10 * 60 * 1000) {
        oauthStates.delete(key);
      }
    }

    // Force browser to handle OAuth (prevent X app from hijacking)
    // Add a timestamp to prevent caching issues on mobile
    const browserUrl = url + '&force_login=false&screen_hint=login';

    res.redirect(browserUrl);
  } catch (error) {
    console.error('Error starting Twitter OAuth:', error);
    res.redirect('/register.html?error=oauth_failed');
  }
});

/**
 * GET /auth/twitter-mobile
 * Alternative mobile-friendly login that shows instructions
 */
router.get('/twitter-mobile', async (req, res) => {
  try {
    const { url, codeVerifier, state } = authClient.generateOAuth2AuthLink(
      CALLBACK_URL,
      { scope: ['tweet.read', 'users.read'] },
    );

    // Store the codeVerifier for later use
    oauthStates.set(state, {
      codeVerifier,
      createdAt: Date.now(),
    });

    // Clean up old states (older than 10 minutes)
    for (const [key, value] of oauthStates.entries()) {
      if (Date.now() - value.createdAt > 10 * 60 * 1000) {
        oauthStates.delete(key);
      }
    }

    // Send an HTML page that opens in browser properly
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Login with X - Nine Lives Network</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0f;
            color: #e0d4ff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
          }
          h1 { color: #b8a9ff; margin-bottom: 10px; }
          p { color: #8b7faa; margin-bottom: 20px; }
          .btn {
            background: #1da1f2;
            color: white;
            padding: 15px 30px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            font-size: 18px;
            display: inline-block;
            margin: 10px;
          }
          .btn:hover { background: #0d8bd9; }
          .tip {
            background: #1a1a2e;
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
            font-size: 14px;
            max-width: 300px;
          }
        </style>
      </head>
      <body>
        <h1>🐱 Nine Lives Network</h1>
        <p>Tap the button below to login with X</p>

        <a href="${url}" class="btn" target="_blank" rel="noopener">
          Login with X
        </a>

        <div class="tip">
          <strong>📱 Tip:</strong> If the X app opens instead of a login page, 
          long-press the button and choose "Open in Browser"
        </div>

        <p style="margin-top: 30px;">
          <a href="/" style="color: #8b7faa;">← Back to Home</a>
        </p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error starting Twitter OAuth:', error);
    res.redirect('/register.html?error=oauth_failed');
  }
});

/**
 * GET /auth/twitter/callback
 * Handles Twitter OAuth callback
 */
router.get('/twitter/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    console.log('Callback received:', {
      code: code?.substring(0, 10),
      state: state?.substring(0, 10),
      error,
    });

    // Check for Twitter error
    if (error) {
      console.log('Twitter returned error:', error);
      return res.redirect(`/register.html?error=${error}`);
    }

    // Verify state exists
    const storedState = oauthStates.get(state);
    console.log(
      'Stored states:',
      oauthStates.size,
      'Looking for:',
      state?.substring(0, 10),
    );

    if (!storedState) {
      console.log('State not found!');
      return res.redirect('/register.html?error=invalid_state');
    }

    const { codeVerifier } = storedState;
    oauthStates.delete(state);

    console.log('Exchanging code for token...');

    // Exchange code for access token
    const { accessToken, refreshToken } = await authClient.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: CALLBACK_URL,
    });

    console.log('Got access token, fetching user info...');

    // Create a client with the user's access token
    const userClient = new (require('twitter-api-v2').TwitterApi)(accessToken);

    // Get user info
    const { data: twitterUser } = await userClient.v2.me({
      'user.fields': [
        'created_at',
        'public_metrics',
        'description',
        'profile_image_url',
      ],
    });

    console.log('Got user:', twitterUser.username, twitterUser.id);

    // Check if user already exists in database
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('twitter_id', twitterUser.id)
      .single();

    console.log(
      'Existing player check:',
      existingPlayer ? 'Found' : 'Not found',
    );

    if (existingPlayer) {
      // Calculate login streak
      const now = new Date();
      const lastLogin = existingPlayer.last_login
        ? new Date(existingPlayer.last_login)
        : null;
      let newStreak = existingPlayer.streak || 0;

      if (!lastLogin) {
        // First ever login
        newStreak = 1;
      } else {
        const daysSince = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
        if (daysSince === 0) {
          // Already logged in today — don't change streak
          newStreak = existingPlayer.streak || 1;
        } else if (daysSince === 1) {
          // Logged in yesterday — increment streak
          newStreak = (existingPlayer.streak || 0) + 1;
        } else {
          // Missed a day — reset
          newStreak = 1;
        }
      }

      // Update last_login and streak
      await supabase
        .from('players')
        .update({ last_login: now.toISOString(), streak: newStreak })
        .eq('id', existingPlayer.id);

      console.log(
        `Streak updated: ${newStreak} days for player ${existingPlayer.id}`,
      );
      console.log(
        'Redirecting to dashboard with player_id:',
        existingPlayer.id,
      );
      return res.redirect(`/dashboard.html?player_id=${existingPlayer.id}`);
    }

    // Validate Twitter account requirements
    const validation = validateTwitterAccount(twitterUser);
    console.log('Validation result:', validation);

    if (!validation.valid) {
      return res.redirect(`/register.html?error=${validation.reason}`);
    }

    // Store Twitter info in session/temp storage for registration completion
    // For now, pass via URL params (in production, use secure session)
    const params = new URLSearchParams({
      twitter_id: twitterUser.id,
      twitter_handle: twitterUser.username,
      profile_image:
        twitterUser.profile_image_url?.replace('_normal', '_400x400') || '',
      access_token: accessToken,
      refresh_token: refreshToken || '',
      bio: twitterUser.description || '',
      followers: String(twitterUser.public_metrics?.followers_count || 0),
      following: String(twitterUser.public_metrics?.following_count || 0),
      step: 'choose_school',
    });

    console.log('Redirecting to school selection for:', twitterUser.username);
    res.redirect(`/register.html?${params.toString()}`);
  } catch (error) {
    console.error('Error in Twitter callback:', error.message);
    console.error('Full error:', error);
    res.redirect('/register.html?error=callback_failed');
  }
});

/**
 * POST /auth/complete-registration
 * Completes registration with school selection and optional guild tag
 */
router.post('/complete-registration', express.json(), async (req, res) => {
  try {
    // V3: Accept both community_tag (old frontend) and guild_tag (new frontend)
    const {
      twitter_id,
      twitter_handle,
      school_id,
      community_tag,
      guild_tag,
      profile_image,
    } = req.body;
    const playerGuildTag = guild_tag || community_tag || null;

    // Validate required fields
    if (!twitter_id || !twitter_handle || !school_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for duplicate registration
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('twitter_id', twitter_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already registered' });
    }

    // Validate school is a valid id (1-9)
    const school_id_int = parseInt(school_id);
    if (!school_id_int || school_id_int < 1 || school_id_int > 9) {
      return res.status(400).json({ error: 'Invalid school' });
    }

    // Create player record
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        twitter_id,
        twitter_handle,
        school_id: parseInt(school_id),
        guild_tag: playerGuildTag, // V3: renamed from community_tag
        profile_image: profile_image || null,
        mana: 3,
        max_mana: 10, // V3: new column
        last_mana_regen: new Date().toISOString(), // V3: new column
        lifetime_points: 0,
        seasonal_points: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      return res.status(500).json({ error: 'Failed to create player' });
    }

    // ========================================
    // V3: CREATE THEIR NINE
    // ========================================
    try {
      if (nineSystem) {
        await nineSystem.createNine(
          player.id,
          parseInt(school_id),
          twitter_handle,
        );
        console.log(`⚔️ Nine created for @${twitter_handle}`);
      }
    } catch (nineError) {
      // Non-critical — don't fail registration if Nine creation fails
      console.error('⚔️ Nine creation failed:', nineError.message);
    }
    // ========================================

    // ========================================
    // GRANT STARTER ITEMS
    // ========================================
    try {
      const { data: starters } = await supabase
        .from('items')
        .select('id')
        .eq('is_starter', true)
        .eq('is_active', true);

      if (starters && starters.length > 0) {
        const rows = starters.map((item) => ({
          player_id: player.id,
          item_id: item.id,
          source: 'starter',
        }));
        await supabase.from('player_items').upsert(rows, {
          onConflict: 'player_id,item_id',
          ignoreDuplicates: true,
        });
        console.log(
          `🎒 ${starters.length} starter items granted to @${twitter_handle}`,
        );
      }
    } catch (itemError) {
      console.error('🎒 Starter items grant failed:', itemError.message);
    }
    // ========================================

    // ========================================
    // GRANT 2 WELCOME PACKS
    // ========================================
    try {
      if (packSystem && packSystem.grantPack) {
        await packSystem.grantPack(player.id, 'welcome', 'registration');
        await packSystem.grantPack(player.id, 'welcome', 'registration');
        console.log(`🎴 2 welcome packs granted to @${twitter_handle}`);
      }
    } catch (packError) {
      // Non-critical — don't fail registration if pack grant fails
      console.error('🎴 Welcome pack grant failed:', packError.message);
    }
    // ========================================

    // ========================================
    // NERM AUTO-FOLLOW: Always watching...
    // ========================================
    try {
      const nermBot = require('../services/nermBot');
      await nermBot.followPlayer(twitter_id);
      console.log(`🐱 Nerm is now watching @${twitter_handle}`);
    } catch (followError) {
      // Non-critical - don't fail registration if follow fails
      console.error('🐱 Nerm follow failed:', followError.message);
    }
    // ========================================

    res.json({ success: true, player });
  } catch (error) {
    console.error('Error completing registration:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * GET /auth/check
 * Check if a Twitter user is already registered
 */
router.get('/house-counts', async (req, res) => {
  try {
    const { data } = await supabase.from('players').select('school_id');
    var counts = {};
    (data || []).forEach((p) => {
      if (p.school_id) counts[p.school_id] = (counts[p.school_id] || 0) + 1;
    });
    res.json(counts);
  } catch (e) {
    res.json({});
  }
});
router.get('/check/:twitter_id', async (req, res) => {
  try {
    const { twitter_id } = req.params;

    const { data: player } = await supabase
      .from('players')
      .select('id, twitter_handle, school_id')
      .eq('twitter_id', twitter_id)
      .single();

    if (player) {
      res.json({ registered: true, player });
    } else {
      res.json({ registered: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Check failed' });
  }
});

/**
 * Validate Twitter account meets requirements
 * - Account age: 30+ days (DISABLED FOR TESTING)
 * - Minimum 50 followers (DISABLED FOR TESTING)
 * - At least 10 tweets (DISABLED FOR TESTING)
 */
function validateTwitterAccount(twitterUser) {
  // TEMPORARILY DISABLED FOR TESTING
  // Re-enable these checks before launch

  /*
  const createdAt = new Date(twitterUser.created_at);
  const accountAge = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Check account age (30 days)
  if (accountAge < 30) {
    return { valid: false, reason: 'account_too_new' };
  }

  // Check followers (50 minimum)
  if (twitterUser.public_metrics?.followers_count < 50) {
    return { valid: false, reason: 'not_enough_followers' };
  }

  // Check tweet count (10 minimum as simplified check)
  if (twitterUser.public_metrics?.tweet_count < 10) {
    return { valid: false, reason: 'not_enough_tweets' };
  }
  */

  return { valid: true };
}

module.exports = router;
