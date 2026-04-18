// ═══════════════════════════════════════════════════════
// server/services/scoringV2.js
// Scoring engine for territory casts
// Used by territory.js to calculate points + influence
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');

// ── RARITY MULTIPLIERS ──
const RARITY_MULT = {
  common: { points: 1.0, power: 1.0 },
  uncommon: { points: 1.25, power: 1.1 },
  rare: { points: 1.5, power: 1.25 },
  epic: { points: 2.0, power: 1.5 },
  legendary: { points: 3.0, power: 2.0 },
};

// ── HOUSE ALLIANCES ──
const ALLIANCES = {
  1: 5, // Smoulders ↔ Stormrage
  5: 1,
  2: 6, // Darktide ↔ Nighthollow
  6: 2,
  3: 4, // Stonebark ↔ Ashenvale
  4: 3,
  7: 8, // Dawnbringer ↔ Manastorm
  8: 7,
  9: null, // Plaguemire = wildcard
};

// House slugs to IDs (for matching spell.house string to player school_id)
const HOUSE_SLUG_TO_ID = {
  smoulders: 1,
  darktide: 2,
  stonebark: 3,
  ashenvale: 4,
  stormrage: 5,
  nighthollow: 6,
  dawnbringer: 7,
  manastorm: 8,
  plaguemire: 9,
  universal: 0,
};

// ── CALCULATE TERRITORY CAST SCORE ──
// Called by territory.js after effect processing
function calculateTerritoryCast(card, playerSchoolId, zoneId, effectResult) {
  // Base points for any cast
  const basePoints = 10;

  // Base influence power (attack = 10, defend = 8)
  const isAttack = card.type === 'attack';
  const basePower = isAttack ? 10 : 8;

  // Rarity multiplier
  const rarity = card.rarity || 'common';
  const rarityConfig = RARITY_MULT[rarity] || RARITY_MULT.common;
  const rarityMult = rarityConfig.points;
  const rarityPowerMult = rarityConfig.power;

  // Affinity multiplier
  const affinityMult = getAffinityMult(playerSchoolId, card.house);

  // Effect bonuses
  const effectBonus = (effectResult && effectResult.bonusPoints) || 0;
  const effectPowerMod = (effectResult && effectResult.powerModifier) || 1.0;
  const extraInfluence = (effectResult && effectResult.extraInfluence) || 0;

  // Points per triggered effect (+3 each)
  let triggeredCount = 0;
  if (effectResult && effectResult.effectsApplied) {
    triggeredCount = effectResult.effectsApplied.filter(
      (e) => e.status === 'APPLIED',
    ).length;
  }
  const effectTriggerBonus = triggeredCount * 3;

  // Calculate totals
  const totalPoints = Math.round(
    basePoints * rarityMult * affinityMult + effectBonus + effectTriggerBonus,
  );

  const totalPower = Math.round(
    basePower * rarityPowerMult * affinityMult * effectPowerMod +
      extraInfluence,
  );

  return {
    basePoints,
    basePower,
    rarityMult,
    affinityMult,
    effectBonus: effectBonus + effectTriggerBonus,
    totalPoints,
    totalPower,
  };
}

// ── AFFINITY MULTIPLIER ──
function getAffinityMult(playerSchoolId, spellHouse) {
  if (!spellHouse || spellHouse === 'universal') return 1.1; // small universal bonus

  const spellSchoolId = HOUSE_SLUG_TO_ID[spellHouse.toLowerCase()];
  if (spellSchoolId === undefined) return 1.0;

  // Own house spell = +30%
  if (spellSchoolId === playerSchoolId) return 1.3;

  // Allied house = +10%
  if (ALLIANCES[playerSchoolId] === spellSchoolId) return 1.1;

  // Plaguemire wildcard: +5% on all cross-house
  if (playerSchoolId === 9 && spellSchoolId !== 9) return 1.05;

  return 1.0;
}

// ── CHECK COMBOS ──
// Called at end of cast to see if any combos triggered
async function checkCombos(zoneId, playerSchoolId, gameDay) {
  const combos = [];

  try {
    // Get all actions on this zone today
    const { data: actions } = await supabase
      .from('territory_actions')
      .select('player_id, school_id')
      .eq('zone_id', zoneId)
      .eq('game_day', gameDay);

    if (!actions || actions.length === 0) return combos;

    // ── HOUSE RESONANCE: 3+ from same house on same zone ──
    const bySchool = {};
    actions.forEach((a) => {
      bySchool[a.school_id] = (bySchool[a.school_id] || 0) + 1;
    });

    if (bySchool[playerSchoolId] >= 3) {
      combos.push({
        type: 'house_resonance',
        label: 'House Resonance ×' + bySchool[playerSchoolId],
        bonusPoints: 5,
        bonusInfluence: 20, // +20% retroactive
      });
    }

    // ── CONTESTED HOTSPOT: 5+ different houses on same zone ──
    const uniqueHouses = Object.keys(bySchool).length;
    if (uniqueHouses >= 5) {
      combos.push({
        type: 'contested_hotspot',
        label: 'Contested Hotspot! ' + uniqueHouses + ' houses',
        bonusPoints: 3,
        bonusInfluence: 0,
      });
    }

    // ── COMMUNITY RALLY: 3+ same community on same zone ──
    // (Would need community_tag join — skip for now, add later)
  } catch (err) {
    console.error('checkCombos error:', err.message);
  }

  return combos;
}

module.exports = {
  calculateTerritoryCast,
  getAffinityMult,
  checkCombos,
  RARITY_MULT,
  ALLIANCES,
  HOUSE_SLUG_TO_ID,
};
