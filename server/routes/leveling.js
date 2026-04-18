/**
 * Leveling Routes — Nine Lives Network V5
 * GET /api/levels/:playerId — current XP, level, progress
 * GET /api/levels/:playerId/unlocks — what's unlocked at current level
 */

const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../config/supabase');
const {
  getLevel,
  getXPForLevel,
  getMaxZones,
  getUnlocks,
  XP_CURVE,
  MAX_LEVEL,
} = require('../services/xp-engine');

// ═══════════════════════════════════════
// GET /api/levels/:playerId
// Returns: xp, level, xp to next level, progress %
// ═══════════════════════════════════════
router.get('/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    if (!playerId) return res.status(400).json({ error: 'Invalid player ID' });

    let { data: row, error } = await supabaseAdmin
      .from('player_levels')
      .select('xp, level')
      .eq('player_id', playerId)
      .single();

    // If no row, create one (new player)
    if (!row) {
      const { data: newRow, error: insertErr } = await supabaseAdmin
        .from('player_levels')
        .insert({ player_id: playerId, xp: 0, level: 1 })
        .select('xp, level')
        .single();

      if (insertErr) {
        return res.status(500).json({ error: 'Failed to create level data' });
      }
      row = newRow;
    }

    const currentXP = row.xp;
    const currentLevel = row.level;
    const isMaxLevel = currentLevel >= MAX_LEVEL;

    const xpForCurrentLevel = getXPForLevel(currentLevel);
    const xpForNextLevel = isMaxLevel
      ? getXPForLevel(MAX_LEVEL)
      : getXPForLevel(currentLevel + 1);

    const xpIntoLevel = currentXP - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
    const progressPercent = isMaxLevel
      ? 100
      : Math.min(100, Math.floor((xpIntoLevel / xpNeededForLevel) * 100));

    res.json({
      player_id: playerId,
      xp: currentXP,
      level: currentLevel,
      max_level: isMaxLevel,
      xp_for_current_level: xpForCurrentLevel,
      xp_for_next_level: xpForNextLevel,
      xp_into_level: xpIntoLevel,
      xp_needed: xpNeededForLevel,
      progress_percent: progressPercent,
      max_zones: getMaxZones(currentLevel),
    });
  } catch (err) {
    console.error('[Leveling] GET error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════
// GET /api/levels/:playerId/unlocks
// Returns: unlocked zones, item slots, next unlock
// ═══════════════════════════════════════
router.get('/:playerId/unlocks', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    if (!playerId) return res.status(400).json({ error: 'Invalid player ID' });

    let { data: row } = await supabaseAdmin
      .from('player_levels')
      .select('level')
      .eq('player_id', playerId)
      .single();

    const level = row?.level || 1;
    const unlocks = getUnlocks(level);

    res.json({
      player_id: playerId,
      level,
      ...unlocks,
    });
  } catch (err) {
    console.error('[Leveling] Unlocks error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
