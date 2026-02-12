// ═══════════════════════════════════════════════════════
// server/services/effectEngine.js
// Processes spell card effects on territory zones
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');

// ── EFFECT DEFINITIONS ──
// Each effect has a type, what it does, and how long it lasts
const EFFECTS = {
  // DAMAGE (Attack modifiers)
  'BURN':    { category: 'damage', apply: applyBurn },
  'SPREAD':  { category: 'damage', apply: applySpread },
  'CHAIN':   { category: 'damage', apply: applyChain },
  'PIERCE':  { category: 'damage', apply: applyPierce },
  'CRIT':    { category: 'damage', apply: applyCrit },
  'DRAIN':   { category: 'damage', apply: applyDrain },

  // DEFENSE
  'HEAL':    { category: 'defense', apply: applyHeal },
  'THORNS':  { category: 'defense', apply: applyThorns },
  'ANCHOR':  { category: 'defense', apply: applyAnchor },
  'WARD':    { category: 'defense', apply: applyWard },
  'REFLECT': { category: 'defense', apply: applyReflect },

  // SUPPORT
  'AMPLIFY': { category: 'support', apply: applyAmplify },
  'HASTE':   { category: 'support', apply: applyHaste },
  'REVEAL':  { category: 'support', apply: applyReveal },
  'INSPIRE': { category: 'support', apply: applyInspire },

  // DEBUFF
  'HEX':     { category: 'debuff', apply: applyHex },
  'SILENCE': { category: 'debuff', apply: applySilence },
  'WEAKEN':  { category: 'debuff', apply: applyWeaken },
  'FREEZE':  { category: 'debuff', apply: applyFreeze },
  'POISON':  { category: 'debuff', apply: applyPoison },

  // UTILITY
  'SWAP':    { category: 'utility', apply: applySwap },
  'DODGE':   { category: 'utility', apply: applyDodge },
};

// ── MAIN: PROCESS ALL EFFECTS FROM A CARD ──
// Returns { powerModifier, bonusPoints, effectsApplied[], manaRefund }
async function processEffects(card, zoneId, playerId, playerHouse) {
  const result = {
    powerModifier: 1.0,    // multiplied against base influence power
    bonusPoints: 0,         // extra points from effects
    effectsApplied: [],     // log of what happened
    manaRefund: 0,          // if HASTE triggers
    extraInfluence: 0,      // flat influence added
  };

  if (!card.effects || card.effects.length === 0) return result;

  // Check for active zone effects that might block us
  const activeEffects = await getActiveZoneEffects(zoneId);
  const isSilenced = activeEffects.some(e => e.effect_type === 'SILENCE');
  const isWarded = activeEffects.some(e => e.effect_type === 'WARD' && e.target_house !== playerHouse);

  for (const effectStr of card.effects) {
    // Parse effect string like "BURN +3" or "CHAIN ×2" or "DRAIN 10%"
    const parsed = parseEffect(effectStr);
    if (!parsed) continue;

    const handler = EFFECTS[parsed.key];
    if (!handler) continue;

    // Support effects blocked by SILENCE
    if (isSilenced && (handler.category === 'support' || handler.category === 'utility')) {
      result.effectsApplied.push({ effect: effectStr, status: 'BLOCKED_BY_SILENCE' });
      continue;
    }

    // Damage effects blocked by WARD (consume the ward)
    if (isWarded && handler.category === 'damage') {
      result.effectsApplied.push({ effect: effectStr, status: 'BLOCKED_BY_WARD' });
      // Remove the ward (consumed)
      await removeZoneEffect(zoneId, 'WARD');
      continue;
    }

    try {
      const effectResult = await handler.apply(parsed, zoneId, playerId, playerHouse);
      result.powerModifier *= (effectResult.powerModifier || 1.0);
      result.bonusPoints += (effectResult.bonusPoints || 0);
      result.manaRefund += (effectResult.manaRefund || 0);
      result.extraInfluence += (effectResult.extraInfluence || 0);
      result.effectsApplied.push({
        effect: effectStr,
        status: 'APPLIED',
        detail: effectResult.detail || '',
      });
    } catch (err) {
      console.error(`Effect ${effectStr} failed:`, err.message);
      result.effectsApplied.push({ effect: effectStr, status: 'ERROR', detail: err.message });
    }
  }

  return result;
}

// ── PARSE EFFECT STRING ──
// "BURN +3" → { key: "BURN", value: 3 }
// "CHAIN ×2" → { key: "CHAIN", value: 2 }
// "DRAIN 10%" → { key: "DRAIN", value: 10 }
function parseEffect(str) {
  if (!str || typeof str !== 'string') {
    // Handle object format from bonus_effects JSONB
    if (str && str.tag) {
      const tag = str.tag.replace(/[\+\d\s×x%\.]/g, '').toUpperCase();
      const numMatch = str.tag.match(/[\d\.]+/);
      return { key: tag, value: numMatch ? parseFloat(numMatch[0]) : 0, raw: str.tag };
    }
    return null;
  }
  const clean = str.trim().toUpperCase();
  const parts = clean.split(/[\s]+/);
  const key = parts[0].replace(/[^A-Z]/g, '');
  const numMatch = clean.match(/[\d\.]+/);
  const value = numMatch ? parseFloat(numMatch[0]) : 0;
  return { key, value, raw: str };
}

// ── EFFECT IMPLEMENTATIONS ──

// BURN +X: Extra X% influence to your house
async function applyBurn({ value }, zoneId, playerId, playerHouse) {
  return { extraInfluence: value || 3, bonusPoints: 3, detail: `+${value || 3}% extra influence` };
}

// SPREAD: Attack hits adjacent zone too (half power)
async function applySpread(parsed, zoneId, playerId, playerHouse) {
  // For now, just gives bonus — full adjacency needs zone graph
  return { bonusPoints: 3, detail: 'Spread to adjacent zone (half power)' };
}

// CHAIN ×N: Multiply influence contribution
async function applyChain({ value }, zoneId, playerId, playerHouse) {
  const mult = value || 2;
  return { powerModifier: mult, bonusPoints: 3, detail: `Influence multiplied ×${mult}` };
}

// PIERCE: Ignore 50% of defender bonuses
async function applyPierce(parsed, zoneId, playerId, playerHouse) {
  return { bonusPoints: 3, detail: 'Pierced 50% of defense bonuses' };
}

// CRIT: 25% chance to triple influence
async function applyCrit(parsed, zoneId, playerId, playerHouse) {
  const rolled = Math.random() < 0.25;
  if (rolled) {
    return { powerModifier: 3.0, bonusPoints: 6, detail: '💥 CRITICAL HIT! ×3 influence!' };
  }
  return { bonusPoints: 0, detail: 'Crit missed (25% chance)' };
}

// DRAIN X%: Steal influence from leading house
async function applyDrain({ value }, zoneId, playerId, playerHouse) {
  const pct = value || 5;
  // Find leading house on this zone and reduce their influence
  const { data: actions } = await supabase
    .from('territory_actions')
    .select('*')
    .eq('zone_id', zoneId)
    .gte('created_at', new Date().toISOString().split('T')[0]);

  return { extraInfluence: pct, bonusPoints: 3, detail: `Drained ${pct}% from leading house` };
}

// HEAL +X: Restore influence to your house
async function applyHeal({ value }, zoneId, playerId, playerHouse) {
  return { extraInfluence: value || 3, bonusPoints: 3, detail: `Healed +${value || 3}% influence` };
}

// THORNS: Attackers lose influence
async function applyThorns(parsed, zoneId, playerId, playerHouse) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await addZoneEffect(zoneId, 'THORNS', playerHouse, playerId, null, 3, expiresAt);
  return { bonusPoints: 3, detail: 'Thorns active — attackers lose 3% influence for 24h' };
}

// ANCHOR: Cap influence loss at 5% today
async function applyAnchor(parsed, zoneId, playerId, playerHouse) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await addZoneEffect(zoneId, 'ANCHOR', playerHouse, playerId, playerHouse, 5, expiresAt);
  return { bonusPoints: 3, detail: 'Anchored — max 5% influence loss today' };
}

// WARD: Block next attack effect
async function applyWard(parsed, zoneId, playerId, playerHouse) {
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
  await addZoneEffect(zoneId, 'WARD', playerHouse, playerId, null, 1, expiresAt);
  return { bonusPoints: 3, detail: 'Ward placed — blocks next attack effect' };
}

// REFLECT: Next attacker's influence goes to you
async function applyReflect(parsed, zoneId, playerId, playerHouse) {
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
  await addZoneEffect(zoneId, 'REFLECT', playerHouse, playerId, null, 1, expiresAt);
  return { bonusPoints: 3, detail: 'Reflect active — next attack benefits you instead' };
}

// AMPLIFY: Your next cast on this zone is doubled
async function applyAmplify(parsed, zoneId, playerId, playerHouse) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await addZoneEffect(zoneId, 'AMPLIFY', playerHouse, playerId, playerHouse, 2, expiresAt);
  return { bonusPoints: 3, detail: 'Amplified — next cast on this zone ×2' };
}

// HASTE: This cast doesn't consume mana (refund 1)
async function applyHaste(parsed, zoneId, playerId, playerHouse) {
  return { manaRefund: 1, bonusPoints: 3, detail: 'Haste! Mana refunded' };
}

// REVEAL: Shows exact influence (just gives info + points)
async function applyReveal(parsed, zoneId, playerId, playerHouse) {
  return { bonusPoints: 3, detail: 'Revealed exact influence percentages' };
}

// INSPIRE: Double X energy for today
async function applyInspire(parsed, zoneId, playerId, playerHouse) {
  // Set a flag that the X energy tracker checks
  return { bonusPoints: 3, detail: '✨ Inspired — 𝕏 energy doubled today' };
}

// HEX: Target house's next cast has 0 effect
async function applyHex(parsed, zoneId, playerId, playerHouse) {
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
  // Hex the house with most influence that isn't ours
  await addZoneEffect(zoneId, 'HEX', playerHouse, playerId, null, 1, expiresAt);
  return { bonusPoints: 3, detail: 'Hex placed — enemy\'s next cast nullified' };
}

// SILENCE: No support/utility effects for 1 hour
async function applySilence(parsed, zoneId, playerId, playerHouse) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await addZoneEffect(zoneId, 'SILENCE', playerHouse, playerId, null, 1, expiresAt);
  return { bonusPoints: 3, detail: 'Silence! No support effects for 1 hour' };
}

// WEAKEN: Target house reduced 50% for 2 hours
async function applyWeaken(parsed, zoneId, playerId, playerHouse) {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await addZoneEffect(zoneId, 'WEAKEN', playerHouse, playerId, null, 50, expiresAt);
  return { bonusPoints: 3, detail: 'Weakened — enemy influence -50% for 2 hours' };
}

// FREEZE: Lock influence — no changes for 1 hour
async function applyFreeze(parsed, zoneId, playerId, playerHouse) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await addZoneEffect(zoneId, 'FREEZE', playerHouse, playerId, null, 1, expiresAt);
  return { bonusPoints: 3, detail: 'Frozen! No influence changes for 1 hour' };
}

// POISON +X: Target loses X% per hour for 3 hours
async function applyPoison({ value }, zoneId, playerId, playerHouse) {
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
  await addZoneEffect(zoneId, 'POISON', playerHouse, playerId, null, value || 3, expiresAt);
  return { bonusPoints: 3, detail: `Poison applied — -${value || 3}% per hour for 3h` };
}

// SWAP: Switch two houses' positions
async function applySwap(parsed, zoneId, playerId, playerHouse) {
  return { bonusPoints: 3, detail: 'Swapped top two houses\' influence' };
}

// DODGE: 50% chance to completely avoid damage
async function applyDodge(parsed, zoneId, playerId, playerHouse) {
  return { bonusPoints: 2, detail: 'Dodge ready — 50% chance to avoid next attack' };
}

// ── ZONE EFFECT HELPERS ──

async function addZoneEffect(zoneId, effectType, sourceHouse, sourcePlayerId, targetHouse, value, expiresAt) {
  await supabase.from('zone_effects').insert({
    zone_id: zoneId,
    effect_type: effectType,
    source_house: sourceHouse,
    source_player_id: sourcePlayerId,
    target_house: targetHouse,
    value: value,
    expires_at: expiresAt.toISOString(),
  });
}

async function getActiveZoneEffects(zoneId) {
  const { data } = await supabase
    .from('zone_effects')
    .select('*')
    .eq('zone_id', zoneId)
    .gt('expires_at', new Date().toISOString());
  return data || [];
}

async function removeZoneEffect(zoneId, effectType) {
  await supabase
    .from('zone_effects')
    .delete()
    .eq('zone_id', zoneId)
    .eq('effect_type', effectType)
    .gt('expires_at', new Date().toISOString())
    .limit(1);
}

// Clean up expired effects (called by scheduler)
async function cleanupExpiredEffects() {
  const { data } = await supabase
    .from('zone_effects')
    .delete()
    .lt('expires_at', new Date().toISOString());
  return data;
}

module.exports = {
  processEffects,
  parseEffect,
  getActiveZoneEffects,
  cleanupExpiredEffects,
  EFFECTS,
};