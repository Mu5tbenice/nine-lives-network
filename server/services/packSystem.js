// ═══════════════════════════════════════════════════════
// server/services/packSystem.js
// Daily Pack Generation + Card Collection
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');

// ── RARITY CONFIG ──
const RARITIES = {
  common:    { weight: 55, pointMult: 1.0,  infMult: 1.0  },
  uncommon:  { weight: 25, pointMult: 1.25, infMult: 1.1  },
  rare:      { weight: 12, pointMult: 1.5,  infMult: 1.25 },
  epic:      { weight: 6,  pointMult: 2.0,  infMult: 1.5  },
  legendary: { weight: 2,  pointMult: 3.0,  infMult: 2.0  },
};

// V3: Durability charges by rarity
const CHARGES_BY_RARITY = {
  common: 5,
  uncommon: 8,
  rare: 12,
  epic: 18,
  legendary: 30,
};

// ── HOUSE ALLIANCES ──
const ALLIANCES = {
  smoulders: 'stormrage',
  stormrage: 'smoulders',
  darktide: 'nighthollow',
  nighthollow: 'darktide',
  stonebark: 'ashenvale',
  ashenvale: 'stonebark',
  dawnbringer: 'manastorm',
  manastorm: 'dawnbringer',
  plaguemire: null,
};

// ── ROLL RARITY ──
function rollRarity() {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [rarity, config] of Object.entries(RARITIES)) {
    cumulative += config.weight;
    if (roll < cumulative) return rarity;
  }
  return 'common';
}

// ── GET RARITY MULTIPLIERS ──
function getRarityMultipliers(rarity) {
  return RARITIES[rarity] || RARITIES.common;
}

// ── GET AFFINITY MULTIPLIER ──
function getAffinityMultiplier(playerHouse, spellHouse) {
  if (spellHouse === 'universal') return 1.1;  // small universal bonus
  if (spellHouse === playerHouse) return 1.3;   // own house = +30%
  if (ALLIANCES[playerHouse] === spellHouse) return 1.1; // ally = +10%
  return 1.0; // no bonus
}

// ── GENERATE A DAILY PACK ──
// Returns 5 cards: 1 Basic Attack, 1 Basic Defend, 3 random from all spells
async function generateDailyPack(playerId) {
  try {
    // Check if player already opened today's pack
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('card_packs')
      .select('*')
      .eq('player_id', playerId)
      .eq('game_day', today)
      .eq('pack_type', 'daily')
      .single();

    if (existing) {
      return { success: false, error: 'Already opened today\'s pack', pack: existing };
    }

    // Get all active spells from the pool
    const { data: allSpells, error: spellErr } = await supabase
      .from('spells')
      .select('*')
      .eq('is_active', true)
      .eq('in_pack_pool', true);

    if (spellErr || !allSpells || allSpells.length === 0) {
      return { success: false, error: 'No spells available in pool' };
    }

    // Separate basics from the rest
    const basics = allSpells.filter(s => s.tier === 0);
    const nonBasics = allSpells.filter(s => s.tier > 0);

    // Find one basic attack and one basic defend
    const basicAttack = basics.find(s => s.spell_type === 'attack') || {
      id: null, name: 'Basic Attack', house: 'universal', spell_type: 'attack',
      tier: 0, mana_cost: 1, base_effect: '+10 influence', bonus_effects: []
    };
    const basicDefend = basics.find(s => s.spell_type === 'defend') || {
      id: null, name: 'Basic Defend', house: 'universal', spell_type: 'defend',
      tier: 0, mana_cost: 1, base_effect: '+10 defense', bonus_effects: []
    };

    // Build the 5 cards
    const cards = [];

    // Card 1: Basic Attack (always common)
    cards.push(buildCard(basicAttack, 'common'));

    // Card 2: Basic Defend (always common)
    cards.push(buildCard(basicDefend, 'common'));

    // Cards 3-5: Random spells from entire pool with rolled rarity
    for (let i = 0; i < 3; i++) {
      const randomSpell = nonBasics[Math.floor(Math.random() * nonBasics.length)];
      const rarity = rollRarity();
      cards.push(buildCard(randomSpell, rarity));
    }

    // Save pack to database
    const { data: pack, error: packErr } = await supabase
      .from('card_packs')
      .insert({
        player_id: playerId,
        pack_type: 'daily',
        cards: cards,
        game_day: today,
      })
      .select()
      .single();

    if (packErr) {
      console.error('Pack save error:', packErr);
      return { success: false, error: 'Failed to save pack' };
    }

    // Create daily hand
    const handCards = cards.map((c, i) => ({ ...c, index: i, used: false }));
    await supabase
      .from('daily_hands')
      .upsert({
        player_id: playerId,
        game_day: today,
        cards: handCards,
      }, { onConflict: 'player_id,game_day' });

    // Add cards to permanent collection
    // V3: Now includes durability charges!
    const collectionCards = cards.map(c => {
      const maxCharges = CHARGES_BY_RARITY[c.rarity] || 5;
      return {
        player_id: playerId,
        spell_id: c.spell_id,
        spell_name: c.name,
        spell_house: c.house,
        spell_type: c.type,
        spell_tier: c.tier,
        spell_effects: c.effects,
        rarity: c.rarity,
        source: 'pack',
        current_charges: maxCharges,   // V3: starts fully charged
        max_charges: maxCharges,       // V3: max charges for this rarity
        is_exhausted: false,           // V3: not exhausted
      };
    });

    await supabase.from('player_cards').insert(collectionCards);

    return { success: true, pack: pack, cards: cards };
  } catch (err) {
    console.error('generateDailyPack error:', err);
    return { success: false, error: 'Server error generating pack' };
  }
}

// ── BUILD A CARD OBJECT ──
function buildCard(spell, rarity) {
  const rarityConfig = RARITIES[rarity];
  let effects = [];
  try {
    effects = typeof spell.bonus_effects === 'string'
      ? JSON.parse(spell.bonus_effects)
      : (spell.bonus_effects || []);
  } catch (e) {
    effects = [];
  }

  return {
    spell_id: spell.id || null,
    name: spell.name,
    house: spell.house,
    type: spell.spell_type,
    tier: spell.tier || 0,
    cost: spell.mana_cost || 1,
    base_effect: spell.base_effect || '',
    effects: effects,
    rarity: rarity,
    point_multiplier: rarityConfig.pointMult,
    influence_multiplier: rarityConfig.infMult,
    image_url: spell.image_url || null,
    // V3: Include ATK/HP from spell (for display in pack opening)
    base_atk: spell.base_atk || 3,
    base_hp: spell.base_hp || 2,
  };
}

// ── GET TODAY'S HAND ──
async function getTodaysHand(playerId) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_hands')
    .select('*')
    .eq('player_id', playerId)
    .eq('game_day', today)
    .single();

  if (error || !data) return null;
  return data;
}

// ── MARK CARD AS USED IN HAND ──
async function useCardFromHand(playerId, cardIndex) {
  const hand = await getTodaysHand(playerId);
  if (!hand) return { success: false, error: 'No hand found for today' };

  const cards = hand.cards;
  if (cardIndex < 0 || cardIndex >= cards.length) {
    return { success: false, error: 'Invalid card index' };
  }
  if (cards[cardIndex].used) {
    return { success: false, error: 'Card already used today' };
  }

  cards[cardIndex].used = true;

  // Check if all mana would be spent
  const allUsed = cards.every(c => c.used);

  await supabase
    .from('daily_hands')
    .update({ cards: cards, all_mana_spent: allUsed })
    .eq('id', hand.id);

  return { success: true, card: cards[cardIndex], allManaSpent: allUsed };
}

// ── GET PLAYER COLLECTION ──
// V3: Removed is_burned filter (cards no longer burn)
// V3: Joins with spells table to get ATK/HP stats
async function getCollection(playerId, filters = {}) {
  let query = supabase
    .from('player_cards')
    .select('*, spell:spell_id(name, base_atk, base_hp)')
    .eq('player_id', playerId)
    .order('acquired_at', { ascending: false });

  if (filters.rarity) query = query.eq('rarity', filters.rarity);
  if (filters.house) query = query.eq('spell_house', filters.house);
  if (filters.type) query = query.eq('spell_type', filters.type);

  const { data, error } = await query;
  return data || [];
}

// ── COLLECTION STATS ──
async function getCollectionStats(playerId) {
  const cards = await getCollection(playerId);
  const stats = {
    total: cards.length,
    byRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
    byHouse: {},
    byType: { attack: 0, defend: 0, support: 0, utility: 0, debuff: 0, control: 0 },
    // V3: Durability stats
    exhausted: 0,
    totalCharges: 0,
  };

  cards.forEach(c => {
    if (stats.byRarity[c.rarity] !== undefined) stats.byRarity[c.rarity]++;
    stats.byHouse[c.spell_house] = (stats.byHouse[c.spell_house] || 0) + 1;
    if (stats.byType[c.spell_type] !== undefined) stats.byType[c.spell_type]++;
    if (c.is_exhausted) stats.exhausted++;
    stats.totalCharges += (c.current_charges || 0);
  });

  return stats;
}

// ── MIDNIGHT UPGRADE CHECK ──
// Called by scheduler at midnight UTC
async function processUpgrades() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Find hands where both conditions met but upgrade not yet applied
  const { data: eligible } = await supabase
    .from('daily_hands')
    .select('*')
    .eq('game_day', yesterdayStr)
    .eq('all_mana_spent', true)
    .eq('energy_threshold_met', true)
    .eq('upgrade_applied', false);

  if (!eligible || eligible.length === 0) return { upgraded: 0 };

  let upgraded = 0;
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  for (const hand of eligible) {
    // Pick a random non-legendary card from yesterday's pack to upgrade
    const upgradeable = hand.cards.filter(c => c.rarity !== 'legendary');
    if (upgradeable.length === 0) continue;

    const target = upgradeable[Math.floor(Math.random() * upgradeable.length)];
    const currentIdx = rarityOrder.indexOf(target.rarity);
    const newRarity = rarityOrder[Math.min(currentIdx + 1, rarityOrder.length - 1)];

    // Update the card in player_cards collection
    // V3: Also update max_charges when rarity changes
    const newMaxCharges = CHARGES_BY_RARITY[newRarity] || 5;
    await supabase
      .from('player_cards')
      .update({
        rarity: newRarity,
        max_charges: newMaxCharges,
        current_charges: newMaxCharges,  // fully recharge on upgrade
      })
      .eq('player_id', hand.player_id)
      .eq('spell_name', target.name)
      .eq('rarity', target.rarity)
      .limit(1);

    // Mark upgrade as applied
    await supabase
      .from('daily_hands')
      .update({ upgrade_applied: true })
      .eq('id', hand.id);

    upgraded++;
  }

  console.log(`[PackSystem] Processed ${upgraded} card upgrades`);
  return { upgraded };
}

module.exports = {
  rollRarity,
  getRarityMultipliers,
  getAffinityMultiplier,
  generateDailyPack,
  getTodaysHand,
  useCardFromHand,
  getCollection,
  getCollectionStats,
  processUpgrades,
  RARITIES,
  ALLIANCES,
  CHARGES_BY_RARITY,
};