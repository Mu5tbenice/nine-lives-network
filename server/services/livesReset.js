const supabase = require('../config/supabaseAdmin');

/**
 * Reset all player lives to 3
 * Should be called at midnight UTC daily
 */
async function resetAllLives() {
  try {
    console.log('🔄 Resetting all player lives...');

    const { data, error } = await supabase
      .from('players')
      .update({
        lives: 3,
        lives_last_reset: new Date().toISOString(),
      })
      .lt('lives', 3); // Only update players who need it

    if (error) {
      console.error('❌ Failed to reset lives:', error);
      return { success: false, error };
    }

    console.log('✅ Player lives reset to 3');
    return { success: true };
  } catch (error) {
    console.error('❌ Lives reset error:', error);
    return { success: false, error };
  }
}

/**
 * Expire old pending duels (older than 24 hours)
 */
async function expirePendingDuels() {
  try {
    console.log('🔄 Expiring old pending duels...');

    const { data, error } = await supabase
      .from('duels')
      .update({
        status: 'expired',
        resolved_at: new Date().toISOString(),
      })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('❌ Failed to expire duels:', error);
      return { success: false, error };
    }

    console.log('✅ Expired old pending duels');
    return { success: true };
  } catch (error) {
    console.error('❌ Expire duels error:', error);
    return { success: false, error };
  }
}

module.exports = {
  resetAllLives,
  expirePendingDuels,
};
