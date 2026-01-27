const express = require('express');
const router = express.Router();
const { authClient, createUserClient } = require('../config/twitter');
const supabase = require('../config/supabase');

// Store OAuth states temporarily (in production, use Redis or database)
const oauthStates = new Map();

// Callback URL for Twitter OAuth - USE YOUR PUBLISHED APP URL
const CALLBACK_URL = process.env.TWITTER_CALLBACK_URL 
  || 'https://nine-lives-network.replit.app/auth/twitter/callback';

/**
 * GET /auth/twitter
 * Initiates Twitter OAuth 2.0 flow
 */
router.get('/twitter', async (req, res) => {
  try {
    const { url, codeVerifier, state } = authClient.generateOAuth2AuthLink(
      CALLBACK_URL,
      { scope: ['tweet.read', 'users.read'] }
    );

    // Store the codeVerifier for later use
    oauthStates.set(state, {
      codeVerifier,
      createdAt: Date.now()
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
      { scope: ['tweet.read', 'users.read'] }
    );

    // Store the codeVerifier for later use
    oauthStates.set(state, {
      codeVerifier,
      createdAt: Date.now()
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

    console.log('Callback received:', { code: code?.substring(0,10), state: state?.substring(0,10), error });

    // Check for Twitter error
    if (error) {
      console.log('Twitter returned error:', error);
      return res.redirect(`/register.html?error=${error}`);
    }

    // Verify state exists
    const storedState = oauthStates.get(state);
    console.log('Stored states:', oauthStates.size, 'Looking for:', state?.substring(0,10));

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
      'user.fields': ['created_at', 'public_metrics', 'description', 'profile_image_url']
    });

    console.log('Got user:', twitterUser.username, twitterUser.id);

    // Check if user already exists in database
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('twitter_id', twitterUser.id)
      .single();

    console.log('Existing player check:', existingPlayer ? 'Found' : 'Not found');

    if (existingPlayer) {
      // User already registered - redirect to dashboard
      console.log('Redirecting to dashboard with player_id:', existingPlayer.id);
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
      profile_image: twitterUser.profile_image_url?.replace('_normal', '_400x400') || '',
      access_token: accessToken,
      refresh_token: refreshToken || '',
      step: 'choose_school'
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
 * Completes registration with school selection and optional community tag
 */
router.post('/complete-registration', express.json(), async (req, res) => {
  try {
    const { twitter_id, twitter_handle, school_id, community_tag, profile_image } = req.body;

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

    // Validate school exists
    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('id', school_id)
      .single();

    if (!school) {
      return res.status(400).json({ error: 'Invalid school' });
    }

    // Create player record
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        twitter_id,
        twitter_handle,
        school_id: parseInt(school_id),
        community_tag: community_tag || null,
        profile_image: profile_image || null,
        mana: 3,
        lifetime_points: 0,
        seasonal_points: 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      return res.status(500).json({ error: 'Failed to create player' });
    }

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