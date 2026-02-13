// ═══════════════════════════════════════════════════════
// server/services/effectEngine.js
// Processes spell card effects on territory zones
// Uses zone_daily_state table with JSONB flags
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── EFFECT HANDLERS ──
const EFFECTS = {
  // ATTACK (Smoulders, Stormrage)
  'BURN':    { category: 'attack',  apply: applyBurn },
  'CHAIN':   { category: 'attack',  apply: applyChain },
  'PIERCE':  { category: 'attack',  apply: applyPierce },
  'CRIT':    { category: 'attack',  apply: applyCrit },
  'SURGE':   { category: 'attack',  apply: applySurge },

  // DEFENSE (Stonebark)
  'HEAL':    { category: 'defense', apply: applyHeal },
  'ANCHOR':  { category: 'defense', apply: applyAnchor },
  'THORNS':  { category: 'defense', apply: applyThorns },
  'WARD':    { category: 'defense', apply: applyWard },

  // MANIPULATION (Darktide, Nighthollow, Manastorm)
  'DRAIN':   { category: 'manipulation', apply: applyDrain },
  'SIPHON':  { category: 'manipulation', apply: applySiphon },
  'WEAKEN':  { category: 'manipulation', apply: applyWeaken },
  'HEX':     { category: 'manipulation', apply: applyHex },
  'SILENCE': { category: 'manipulation', apply: applySilence },

  // UTILITY (Ashenvale)
  'HASTE':   { category: 'utility', apply: applyHaste },
  'SWIFT':   { category: 'utility', apply: applySwift },
  'DODGE':   { category: 'utility', apply: applyDodge },
  'FREE':    { category: 'utility', apply: applyFree },

  // ATTRITION (Plaguemire)
  'POISON':  { category: 'attrition', apply: applyPoison },
  'CORRODE': { category: 'attrition', apply: applyCorrode },
  'INFECT':  { category: 'attrition', apply: applyInfect },

  // SUPPORT (Dawnbringer)
  'AMPLIFY': { category: 'support', apply: applyAmplify },
  'INSPIRE': { category: 'support', apply: applyInspire },
  'BLESS':   { category: 'support', apply: applyBless },
};

// ── MAIN: PROCESS ALL EFFECTS FROM A CARD ──
async function processEffects(card, zoneId, playerId, playerHouse) {
  const result = {
    powerModifier: 1.0,
    bonusPoints: 0,
    effectsApplied: [],
    manaRefund: 0,
    extraInfluence: 0,
  };

  if (!card.effects || card.effects.length === 0) return result;

  // Get current zone flags
  const flags = await getZoneFlags(zoneId);

  // Check SILENCE — blocks support + utility effects
  const isSilenced = !!flags.silence;

  // Check WARD — blocks attack effects (consumed on use)
  const isWarded = !!flags.ward;

  // Check HEX — extra mana cost (handled by territory.js, we just flag it)
  if (flags.hex) {
    result.effectsApplied.push({ effect: 'HEX', status: 'ZONE_HEXED', detail: '+1 mana cost' });
  }

  // Check AMPLIFY — boost if same house as setter
  if (flags.amplify && flags.amplify.house_id === playerHouse) {
    result.powerModifier *= (flags.amplify.multiplier || 1.5);
    result.effectsApplied.push({ effect: 'AMPLIFY', status: 'APPLIED', detail: 'Amplified ×' + (flags.amplify.multiplier || 1.5) });
    // Consume amplify
    await removeFlag(zoneId, 'amplify');
  }

  // Check WEAKEN — reduce enemy gains
  if (flags.weaken && flags.weaken.house_id !== playerHouse) {
    result.powerModifier *= (flags.weaken.factor || 0.75);
    result.effectsApplied.push({ effect: 'WEAKEN', status: 'APPLIED', detail: 'Weakened ×' + (flags.weaken.factor || 0.75) });
  }

  // Check THORNS — attacker loses influence
  if (flags.thorns && card.type === 'attack') {
    result.extraInfluence -= (flags.thorns.damage || 3);
    result.effectsApplied.push({ effect: 'THORNS', status: 'APPLIED', detail: 'Took ' + (flags.thorns.damage || 3) + '% thorn damage' });
  }

  // Process each effect on the card
  for (const effectStr of card.effects) {
    const parsed = parseEffect(effectStr);
    if (!parsed) continue;

    const handler = EFFECTS[parsed.key];
    if (!handler) continue;

    // SILENCE blocks support + utility
    if (isSilenced && (handler.category === 'support' || handler.category === 'utility')) {
      result.effectsApplied.push({ effect: parsed.raw, status: 'BLOCKED_BY_SILENCE' });
      // Consume silence
      await removeFlag(zoneId, 'silence');
      continue;
    }

    // WARD blocks attack effects (consumed)
    if (isWarded && handler.category === 'attack') {
      // Check if card has PIERCE — ignores 50% of ward
      const hasPierce = card.effects.some(e => {
        const p = parseEffect(e);
        return p && p.key === 'PIERCE';
      });

      if (!hasPierce) {
        result.effectsApplied.push({ effect: parsed.raw, status: 'BLOCKED_BY_WARD' });
        await removeFlag(zoneId, 'ward');
        continue;
      }
      // PIERCE present — ward only blocks 50%, continue processing
    }

    try {
      const ctx = { zoneId, playerId, playerHouse, flags };
      const effectResult = await handler.apply(parsed, ctx);

      result.powerModifier *= (effectResult.powerModifier || 1.0);
      result.bonusPoints += (effectResult.bonusPoints || 0);
      result.manaRefund += (effectResult.manaRefund || 0);
      result.extraInfluence += (effectResult.extraInfluence || 0);

      result.effectsApplied.push({
        effect: parsed.raw,
        status: 'APPLIED',
        detail: effectResult.detail || '',
      });
    } catch (err) {
      console.error('Effect ' + parsed.raw + ' error:', err.message);
      result.effectsApplied.push({ effect: parsed.raw, status: 'ERROR', detail: err.message });
    }
  }

  return result;
}

// ── PARSE EFFECT STRING ──
// "BURN +3" → { key: "BURN", value: 3 }
// { tag: "BURN +3" } → { key: "BURN", value: 3 }
function parseEffect(str) {
  if (!str) return null;

  // Handle object format from bonus_effects JSONB: { tag: "BURN +3", desc: "..." }
  if (typeof str === 'object' && str.tag) {
    str = str.tag;
  }

  if (typeof str !== 'string') return null;

  const clean = str.trim().toUpperCase();
  const parts = clean.split(/[\s]+/);
  const key = parts[0].replace(/[^A-Z]/g, '');
  const numMatch = clean.match(/[\d\.]+/);
  const value = numMatch ? parseFloat(numMatch[0]) : 0;
  return { key, value, raw: str };
}


// ═══════════════════════════════════
// EFFECT IMPLEMENTATIONS
// ═══════════════════════════════════

// ── ATTACK EFFECTS ──

async function applyBurn({ value }, ctx) {
  const extra = value || 3;
  return { extraInfluence: extra, bonusPoints: 3, detail: '+' + extra + '% extra influence' };
}

async function applyChain({ value }, ctx) {
  const mult = value || 2;
  return { powerModifier: mult, bonusPoints: 3, detail: 'Influence ×' + mult };
}

async function applyPierce({ value }, ctx) {
  // PIERCE halves defensive flags (WARD, ANCHOR)
  if (ctx.flags.anchor) {
    ctx.flags.anchor.max_loss = (ctx.flags.anchor.max_loss || 5) * 2; // double allowed loss
    await setFlag(ctx.zoneId, 'anchor', ctx.flags.anchor);
  }
  return { bonusPoints: 3, detail: 'Pierced defenses — 50% reduction' };
}

async function applyCrit({ value }, ctx) {
  const chance = 0.25;
  if (Math.random() < chance) {
    return { powerModifier: 3.0, bonusPoints: 6, detail: '💥 CRIT! ×3 influence!' };
  }
  return { bonusPoints: 0, detail: 'Crit missed (25% chance)' };
}

async function applySurge({ value }, ctx) {
  // +50% influence but costs 1 extra mana (manaRefund = -1 means extra cost)
  return { powerModifier: 1.5, bonusPoints: 3, manaRefund: -1, detail: 'Surge! ×1.5 power, +1 mana cost' };
}

// ── DEFENSE EFFECTS ──

async function applyHeal({ value }, ctx) {
  const heal = value || 3;
  return { extraInfluence: heal, bonusPoints: 3, detail: 'Healed +' + heal + '% influence' };
}

async function applyAnchor({ value }, ctx) {
  await setFlag(ctx.zoneId, 'anchor', { house_id: ctx.playerHouse, max_loss: value || 5 });
  return { bonusPoints: 3, detail: 'Anchored — max ' + (value || 5) + '% loss today' };
}

async function applyThorns({ value }, ctx) {
  await setFlag(ctx.zoneId, 'thorns', { house_id: ctx.playerHouse, damage: value || 3 });
  return { bonusPoints: 3, detail: 'Thorns — attackers lose ' + (value || 3) + '%' };
}

async function applyWard({ value }, ctx) {
  await setFlag(ctx.zoneId, 'ward', true);
  return { bonusPoints: 3, detail: 'Ward placed — blocks next attack effect' };
}

// ── MANIPULATION EFFECTS ──

async function applyDrain({ value }, ctx) {
  const pct = value || 5;
  // Steal from leading house (actual influence shift happens in territory processing)
  return { extraInfluence: pct, bonusPoints: 3, detail: 'Drained ' + pct + '% from leader' };
}

async function applySiphon({ value }, ctx) {
  // Steal 2% from every other house
  return { extraInfluence: 6, bonusPoints: 3, detail: 'Siphoned 2% from each rival house' };
}

async function applyWeaken({ value }, ctx) {
  const factor = value ? (1 - value / 100) : 0.75;
  await setFlag(ctx.zoneId, 'weaken', { house_id: ctx.playerHouse, factor: factor });
  return { bonusPoints: 3, detail: 'Weakened — enemy gains ×' + factor + ' today' };
}

async function applyHex({ value }, ctx) {
  await setFlag(ctx.zoneId, 'hex', true);
  return { bonusPoints: 3, detail: 'Hex — next cast here costs +1 mana' };
}

async function applySilence({ value }, ctx) {
  await setFlag(ctx.zoneId, 'silence', true);
  return { bonusPoints: 3, detail: 'Silence — next card\'s effects blocked' };
}

// ── UTILITY EFFECTS ──

async function applyHaste({ value }, ctx) {
  return { manaRefund: 1, bonusPoints: 3, detail: 'Haste! −1 mana cost' };
}

async function applySwift({ value }, ctx) {
  // Check if this is first cast today
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('territory_actions')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', ctx.playerId)
    .eq('game_day', today);

  if (count === 0 || count === 1) { // 0 or 1 (current one being processed)
    return { manaRefund: 1, bonusPoints: 3, detail: 'Swift! First cast — +1 mana refund' };
  }
  return { bonusPoints: 0, detail: 'Swift — not first cast (no refund)' };
}

async function applyDodge({ value }, ctx) {
  if (Math.random() < 0.3) {
    return { manaRefund: 1, bonusPoints: 2, detail: 'Dodge! 🎲 Mana refunded' };
  }
  return { bonusPoints: 0, detail: 'Dodge missed (30% chance)' };
}

async function applyFree({ value }, ctx) {
  return { manaRefund: 99, bonusPoints: 2, detail: 'Free cast! 0 mana' };
  // manaRefund 99 = territory.js caps refund at card cost, so effectively free
}

// ── ATTRITION EFFECTS (processed at midnight) ──

async function applyPoison({ value }, ctx) {
  await setFlag(ctx.zoneId, 'poison', { pct: value || 2, source_house: ctx.playerHouse });
  return { bonusPoints: 3, detail: 'Poison — leader loses ' + (value || 2) + '% at midnight' };
}

async function applyCorrode({ value }, ctx) {
  await setFlag(ctx.zoneId, 'corrode', { pct: value || 3, source_house: ctx.playerHouse });
  return { bonusPoints: 3, detail: 'Corrode — all houses lose ' + (value || 3) + '% at midnight' };
}

async function applyInfect({ value }, ctx) {
  await setFlag(ctx.zoneId, 'infect', { source_house: ctx.playerHouse });
  return { bonusPoints: 3, detail: 'Infect — poison spreads if zone flips' };
}

// ── SUPPORT EFFECTS ──

async function applyAmplify({ value }, ctx) {
  const mult = value || 1.5;
  await setFlag(ctx.zoneId, 'amplify', { house_id: ctx.playerHouse, multiplier: mult });
  return { bonusPoints: 3, detail: 'Amplify — next housemate cast ×' + mult };
}

async function applyInspire({ value }, ctx) {
  // Set player flag for doubled 𝕏 energy today
  try {
    await supabaseAdmin
      .from('players')
      .update({ inspired_today: true })
      .eq('id', ctx.playerId);
  } catch (e) { /* column might not exist yet */ }
  return { bonusPoints: 3, detail: '✨ Inspired — 𝕏 energy ×2 today' };
}

async function applyBless({ value }, ctx) {
  await setFlag(ctx.zoneId, 'bless', { house_id: ctx.playerHouse, bonus: value || 2 });
  return { bonusPoints: 3, detail: 'Bless — housemates get +' + (value || 2) + ' pts today' };
}


// ═══════════════════════════════════
// ZONE FLAG HELPERS (zone_daily_state)
// ═══════════════════════════════════

async function getZoneFlags(zoneId) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data } = await supabase
      .from('zone_daily_state')
      .select('flags')
      .eq('zone_id', zoneId)
      .eq('date', today)
      .single();
    return (data && data.flags) || {};
  } catch (e) {
    return {};
  }
}

async function setFlag(zoneId, key, value) {
  const today = new Date().toISOString().split('T')[0];
  try {
    // Get current flags
    const flags = await getZoneFlags(zoneId);
    flags[key] = value;

    // Upsert
    await supabaseAdmin
      .from('zone_daily_state')
      .upsert(
        { zone_id: zoneId, date: today, flags: flags },
        { onConflict: 'zone_id,date' }
      );
  } catch (e) {
    console.error('setFlag error:', e.message);
  }
}

async function removeFlag(zoneId, key) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const flags = await getZoneFlags(zoneId);
    delete flags[key];

    await supabaseAdmin
      .from('zone_daily_state')
      .upsert(
        { zone_id: zoneId, date: today, flags: flags },
        { onConflict: 'zone_id,date' }
      );
  } catch (e) {
    console.error('removeFlag error:', e.message);
  }
}

// ── CLEAN UP (called by scheduler at midnight) ──
async function clearAllDailyFlags() {
  const today = new Date().toISOString().split('T')[0];
  try {
    await supabaseAdmin
      .from('zone_daily_state')
      .delete()
      .lt('date', today); // delete yesterday and older
    console.log('[EffectEngine] Cleared old zone flags');
  } catch (e) {
    console.error('clearAllDailyFlags error:', e.message);
  }
}

// ── GET ALL FLAGS FOR MIDNIGHT PROCESSING ──
async function getAllZoneFlagsForDate(date) {
  try {
    const { data } = await supabase
      .from('zone_daily_state')
      .select('zone_id, flags')
      .eq('date', date);
    return data || [];
  } catch (e) {
    return [];
  }
}

module.exports = {
  processEffects,
  parseEffect,
  getZoneFlags,
  setFlag,
  removeFlag,
  clearAllDailyFlags,
  getAllZoneFlagsForDate,
  EFFECTS,
};