const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseAdmin');
const supabaseAdmin = require('../config/supabaseAdmin');
const {
  validateSolanaAddress,
  checkWalletChangeAllowed,
} = require('./walletValidator');

/**
 * GET /api/players/:id
 * Get a player's public data (including lives and duel stats)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: player, error } = await supabase
      .from('players')
      .select(
        `
        id,
        twitter_handle,
        twitter_id,
        school_id,
        guild_tag,
        profile_image,
        lives,
        lifetime_points,
        seasonal_points,
        duel_wins,
        duel_losses,
        created_at,
        last_cast_at,
        is_active,
        streak,
        wallet_address
      `,
      )
      .eq('id', id)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Default values for new columns if null
    player.lives = player.lives !== null ? player.lives : 3;
    player.duel_wins = player.duel_wins || 0;
    player.duel_losses = player.duel_losses || 0;

    res.json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

/**
 * GET /api/players/:id/casts
 * Get a player's cast history
 */
router.get('/:id/casts', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const { data: casts, error } = await supabase
      .from('casts')
      .select('*')
      .eq('player_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch casts' });
    }

    res.json(casts || []);
  } catch (error) {
    console.error('Error fetching casts:', error);
    res.status(500).json({ error: 'Failed to fetch casts' });
  }
});

/**
 * GET /api/players/:id/stats
 * Get a player's full stats including duel record
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get cast count
    const { count: castCount } = await supabase
      .from('casts')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', id);

    // Get territory action count
    const { count: actionCount } = await supabase
      .from('territory_actions')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', id);

    res.json({
      id: player.id,
      twitter_handle: player.twitter_handle,
      school_id: player.school_id,
      seasonal_points: player.seasonal_points || 0,
      lifetime_points: player.lifetime_points || 0,
      lives: player.lives !== null ? player.lives : 3,
      duel_wins: player.duel_wins || 0,
      duel_losses: player.duel_losses || 0,
      duel_win_rate:
        player.duel_wins + player.duel_losses > 0
          ? Math.round(
              (player.duel_wins / (player.duel_wins + player.duel_losses)) *
                100,
            )
          : 0,
      total_casts: castCount || 0,
      total_territory_actions: actionCount || 0,
      member_since: player.created_at,
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

/**
 * GET /api/players/by-twitter/:twitter_id
 * Get a player by their Twitter ID
 */
router.get('/by-twitter/:twitter_id', async (req, res) => {
  try {
    const { twitter_id } = req.params;

    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('twitter_id', twitter_id)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Default values
    player.lives = player.lives !== null ? player.lives : 3;
    player.duel_wins = player.duel_wins || 0;
    player.duel_losses = player.duel_losses || 0;

    res.json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

/**
 * POST /api/players/complete-registration
 * Complete player registration after Twitter OAuth
 */
router.post('/complete-registration', async (req, res) => {
  try {
    const { twitter_id, twitter_handle, school_id, guild_tag, profile_image } =
      req.body;

    if (!twitter_id || !twitter_handle || !school_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if player already exists
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('twitter_id', twitter_id)
      .single();

    if (existing) {
      return res
        .status(400)
        .json({ error: 'Player already registered', player_id: existing.id });
    }

    // Create new player with default lives
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        twitter_id,
        twitter_handle,
        school_id,
        guild_tag: guild_tag || null,
        profile_image: profile_image || null,
        lives: 3,
        seasonal_points: 0,
        lifetime_points: 0,
        duel_wins: 0,
        duel_losses: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Failed to register player' });
    }

    res.json({ success: true, player });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register player' });
  }
});

// ═══════════════════════════════════════════
// ADD THIS to server/routes/players.js (or any route file mounted in index.js)
// POST /api/players/update-guild
// Update a player's guild tag (or set to null for Lone Wolf)
// Body: { player_id, guild_tag }
// ═══════════════════════════════════════════

router.post('/update-guild', async (req, res) => {
  try {
    const { player_id, guild_tag } = req.body;
    if (!player_id) {
      return res.status(400).json({ error: 'player_id required' });
    }

    // Clean the tag — allow null for Lone Wolf
    const cleanTag = guild_tag ? guild_tag.trim().substring(0, 16) : null;

    // Update player
    const { data, error } = await supabaseAdmin
      .from('players')
      .update({ guild_tag: cleanTag })
      .eq('id', player_id)
      .select('id, guild_tag')
      .single();

    if (error) {
      console.error('Guild tag update error:', error);
      return res.status(500).json({ error: 'Failed to update guild tag' });
    }

    // Also update any active zone deployments with new tag
    // (so combat engine uses the right faction)
    const newDeployTag = cleanTag || '@' + (data.twitter_handle || 'lone_wolf');
    await supabaseAdmin
      .from('zone_deployments')
      .update({
        guild_tag: newDeployTag,
        is_mercenary: !cleanTag,
      })
      .eq('player_id', player_id)
      .eq('is_active', true);

    res.json({
      success: true,
      guild_tag: cleanTag,
      is_lone_wolf: !cleanTag,
      message: cleanTag
        ? `Guild set to ${cleanTag}`
        : 'Gone Lone Wolf! 1.5x ATK in zones.',
    });
  } catch (err) {
    console.error('Update guild error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// POST /api/players/link-wallet
// Body: { player_id, wallet_address }
// Links a Solana wallet to a player. Validates base58 / length, enforces
// uniqueness via DB partial unique index (migration 007), rate-limits
// changes to once per 7 days. The wallet powers the future points→token
// withdrawal flow (see project_nft_as_withdrawal_key.md) — no value is
// sent to the wallet here; sign-message verification happens at NFT drop
// time, not at link time.
// ═══════════════════════════════════════════

router.post('/link-wallet', async (req, res) => {
  try {
    const { player_id, wallet_address } = req.body || {};
    if (!player_id) {
      return res.status(400).json({ error: 'player_id required', code: 'NO_PLAYER' });
    }

    const v = validateSolanaAddress(wallet_address);
    if (!v.ok) {
      return res.status(400).json({ error: v.error, code: v.code });
    }
    const normalized = v.normalized;

    const { data: current, error: readErr } = await supabaseAdmin
      .from('players')
      .select('id, wallet_address, wallet_changed_at')
      .eq('id', player_id)
      .single();

    if (readErr || !current) {
      return res.status(404).json({ error: 'Player not found', code: 'NO_PLAYER' });
    }

    if (current.wallet_address === normalized) {
      return res.json({
        success: true,
        wallet_address: normalized,
        no_change: true,
        message: 'Wallet already linked',
      });
    }

    const rl = checkWalletChangeAllowed(current.wallet_changed_at);
    if (!rl.ok) {
      return res.status(429).json({
        error: `Wallet was changed recently — try again in ${rl.days_left} day${rl.days_left === 1 ? '' : 's'}.`,
        code: 'RATE_LIMITED',
        days_left: rl.days_left,
      });
    }

    const { data: updated, error: writeErr } = await supabaseAdmin
      .from('players')
      .update({
        wallet_address: normalized,
        wallet_changed_at: new Date().toISOString(),
      })
      .eq('id', player_id)
      .select('id, wallet_address')
      .single();

    if (writeErr) {
      // Postgres unique-violation — wallet already linked to another player
      if (writeErr.code === '23505') {
        return res.status(409).json({
          error: 'That wallet is already linked to another player.',
          code: 'ALREADY_LINKED',
        });
      }
      console.error('[link-wallet] write error:', writeErr);
      return res.status(500).json({ error: 'Failed to link wallet', code: 'WRITE_ERROR' });
    }

    console.log(
      `[link-wallet] player_id=${player_id} old=${current.wallet_address || 'null'} new=${normalized}`,
    );

    return res.json({
      success: true,
      wallet_address: updated.wallet_address,
      message: current.wallet_address ? 'Wallet updated.' : 'Wallet linked.',
      previous: current.wallet_address || null,
    });
  } catch (err) {
    console.error('[link-wallet] server error:', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
