// ═══════════════════════════════════════════════════════
// server/services/packSystem.js
// Daily Pack Generation + Card Collection + Pack Inventory
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

// Tier-specific rarity weights (T3 cards have better odds)
const TIER_RARITY_WEIGHTS = {
  0: { common: 100, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
  1: { common: 55, uncommon: 25, rare: 12, epic: 6, legendary: 2 },
  2: { common: 55, uncommon: 25, rare: 12, epic: 6, legendary: 2 },
  3: { common: 25, uncommon: 25, rare: 25, epic: 17, legendary: 8 },
};

// V3: Durability charges by rarity
const CHARGES_BY_RARITY = {
  common: 5,
  uncommon: 8,
  rare: 12,
  epic: 18,
  legendary: 30,
};

// Rarity stat bonuses (applied on top of base stats)
const RARITY_BONUSES = {
  common:    { atk: 0, hp: 0 },
  uncommon:  { atk: 1, hp: 0 },  // +1 to one stat
  rare:      { atk: 1, hp: 1 },
  epic:      { atk: 2, hp: 2 },
  legendary: { atk: 3, hp: 3 },
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
function rollRarity(tier = 1) {
  const weights = TIER_RARITY_WEIGHTS[tier] || TIER_RARITY_WEIGHTS[1];
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [rarity, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll < cumulative) return rarity;
  }
  return 'common';
}

// Roll rarity with a guaranteed minimum (for special packs)
function rollRarityGuaranteed(minRarity) {
  const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const minIdx = order.indexOf(minRarity);
  const roll = Math.random() * 100;
  if (roll < 45) return order[minIdx];
  if (roll < 75) return order[Math.min(minIdx + 1, 4)];
  if (roll < 92) return order[Math.min(minIdx + 2, 4)];
  return order[Math.min(minIdx + 3, 4)];
}

// ── GET RARITY MULTIPLIERS ──
function getRarityMultipliers(rarity) {
  return RARITIES[rarity] || RARITIES.common;
}

// ── GET AFFINITY MULTIPLIER ──
function getAffinityMultiplier(playerHouse, spellHouse) {
  if (spellHouse === 'universal') return 1.1;
  if (spellHouse === playerHouse) return 1.3;
  if (ALLIANCES[playerHouse] === spellHouse) return 1.1;
  return 1.0;
}

// ═══════════════════════════════════════════════════════
// PACK INVENTORY SYSTEM
// ═══════════════════════════════════════════════════════

// ── GRANT A PACK TO A PLAYER ──
// Use this to give packs as rewards, drops, daily login, etc.
async function grantPack(playerId, packType = 'daily', source = 'daily_login', packData = null) {
  try {
    const { data, error } = await supabase
      .from('pack_inventory')
      .insert({
        player_id: playerId,
        pack_type: packType,
        source: source,
        pack_data: packData,
      })
      .select()
      .single();

    if (error) {
      console.error('Grant pack error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, pack: data };
  } catch (err) {
    console.error('grantPack error:', err);
    return { success: false, error: 'Server error' };
  }
}

// ── GRANT DAILY PACK ──
// Gives player 1 daily pack if they haven't received one today
async function grantDailyPack(playerId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if already granted today
    const { data: existing } = await supabase
      .from('pack_inventory')
      .select('id')
      .eq('player_id', playerId)
      .eq('pack_type', 'daily')
      .eq('source', 'daily_login')
      .gte('granted_at', today + 'T00:00:00Z')
      .lte('granted_at', today + 'T23:59:59Z')
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: 'Already received daily pack today', already_granted: true };
    }

    return await grantPack(playerId, 'daily', 'daily_login');
  } catch (err) {
    console.error('grantDailyPack error:', err);
    return { success: false, error: 'Server error' };
  }
}

// ── GET PLAYER'S UNOPENED PACKS ──
async function getPackInventory(playerId) {
  try {
    const { data, error } = await supabase
      .from('pack_inventory')
      .select('*')
      .eq('player_id', playerId)
      .eq('opened', false)
      .order('granted_at', { ascending: true });

    if (error) {
      console.error('getPackInventory error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('getPackInventory error:', err);
    return [];
  }
}

// ── GET PACK INVENTORY SUMMARY ──
// Returns counts grouped by pack_type
async function getPackInventorySummary(playerId) {
  const packs = await getPackInventory(playerId);
  const summary = {};
  packs.forEach(p => {
    if (!summary[p.pack_type]) {
      summary[p.pack_type] = { count: 0, packs: [] };
    }
    summary[p.pack_type].count++;
    summary[p.pack_type].packs.push(p);
  });
  return summary;
}

// ── OPEN A PACK FROM INVENTORY ──
// This is the main function the frontend calls
async function openPackFromInventory(playerId, packInventoryId) {
  try {
    // 1. Verify the pack belongs to this player and is unopened
    const { data: pack, error: fetchErr } = await supabase
      .from('pack_inventory')
      .select('*')
      .eq('id', packInventoryId)
      .eq('player_id', playerId)
      .eq('opened', false)
      .single();

    if (fetchErr || !pack) {
      return { success: false, error: 'Pack not found or already opened' };
    }

    // 2. Get all active spells from the pool
    const { data: allSpells, error: spellErr } = await supabase
      .from('spells')
      .select('*')
      .eq('is_active', true)
      .eq('in_pack_pool', true);

    if (spellErr || !allSpells || allSpells.length === 0) {
      return { success: false, error: 'No spells available in pool' };
    }

    const basics = allSpells.filter(s => s.tier === 0);
    const nonBasics = allSpells.filter(s => s.tier > 0);

    // 3. Generate cards based on pack type
    const cards = generateCardsForPackType(pack.pack_type, pack.pack_data, basics, nonBasics);

    // 4. Mark pack as opened
    await supabase
      .from('pack_inventory')
      .update({ opened: true, opened_at: new Date().toISOString() })
      .eq('id', packInventoryId);

    // 5. Save to card_packs history
    const today = new Date().toISOString().split('T')[0];
    const { data: savedPack } = await supabase
      .from('card_packs')
      .insert({
        player_id: playerId,
        pack_type: pack.pack_type,
        cards: cards,
        game_day: today,
      })
      .select()
      .single();

    // 6. Add cards to permanent collection (player_cards)
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
        current_charges: maxCharges,
        max_charges: maxCharges,
        is_exhausted: false,
      };
    });

    await supabase.from('player_cards').insert(collectionCards);

    return {
      success: true,
      pack_type: pack.pack_type,
      source: pack.source,
      cards: cards,
      pack_id: savedPack?.id || null,
    };
  } catch (err) {
    console.error('openPackFromInventory error:', err);
    return { success: false, error: 'Server error opening pack' };
  }
}

// ── GENERATE CARDS BASED ON PACK TYPE ──
function generateCardsForPackType(packType, packData, basics, nonBasics) {
  const cards = [];
  const guaranteedRarity = packData?.guaranteed_rarity || null;

  switch (packType) {
    case 'daily': {
      // 1 Basic Attack + 1 Basic Defend + 3 Random
      const basicAttack = basics.find(s => s.spell_type === 'attack') || basics[0];
      const basicDefend = basics.find(s => s.spell_type === 'defend') || basics[0];
      cards.push(buildCard(basicAttack, 'common'));
      cards.push(buildCard(basicDefend, 'common'));
      for (let i = 0; i < 3; i++) {
        const spell = nonBasics[Math.floor(Math.random() * nonBasics.length)];
        cards.push(buildCard(spell, rollRarity(spell.tier)));
      }
      break;
    }

    case 'boss': {
      // 5 Random, higher tier bias, guaranteed rare minimum on first card
      const t2Plus = nonBasics.filter(s => s.tier >= 2);
      const pool = t2Plus.length >= 5 ? t2Plus : nonBasics;
      for (let i = 0; i < 5; i++) {
        const spell = pool[Math.floor(Math.random() * pool.length)];
        const rarity = i === 0
          ? rollRarityGuaranteed(guaranteedRarity || 'rare')
          : rollRarity(spell.tier);
        cards.push(buildCard(spell, rarity));
      }
      break;
    }

    case 'event': {
      // 5 Random, guaranteed rare+ on first card
      for (let i = 0; i < 5; i++) {
        const spell = nonBasics[Math.floor(Math.random() * nonBasics.length)];
        const rarity = i === 0
          ? rollRarityGuaranteed(guaranteedRarity || 'rare')
          : rollRarity(spell.tier);
        cards.push(buildCard(spell, rarity));
      }
      break;
    }

    case 'seasonal': {
      // 5 Random, guaranteed epic+ on first card
      for (let i = 0; i < 5; i++) {
        const spell = nonBasics[Math.floor(Math.random() * nonBasics.length)];
        const rarity = i === 0
          ? rollRarityGuaranteed(guaranteedRarity || 'epic')
          : rollRarity(spell.tier);
        cards.push(buildCard(spell, rarity));
      }
      break;
    }

    case 'welcome':
    case 'reward':
    default: {
      // Same as daily for now — 1 basic atk + 1 basic def + 3 random
      const basicAttack = basics.find(s => s.spell_type === 'attack') || basics[0];
      const basicDefend = basics.find(s => s.spell_type === 'defend') || basics[0];
      cards.push(buildCard(basicAttack, 'common'));
      cards.push(buildCard(basicDefend, 'common'));
      for (let i = 0; i < 3; i++) {
        const spell = nonBasics[Math.floor(Math.random() * nonBasics.length)];
        cards.push(buildCard(spell, rollRarity(spell.tier)));
      }
      break;
    }
  }

  return cards;
}

// ── BUILD A CARD OBJECT ──
function buildCard(spell, rarity) {
  const rarityConfig = RARITIES[rarity];
  const bonus = RARITY_BONUSES[rarity] || { atk: 0, hp: 0 };
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
    flavor_text: spell.flavor_text || null,
    // Stats with rarity bonus applied
    base_atk: (spell.base_atk || 3) + bonus.atk,
    base_hp: (spell.base_hp || 2) + bonus.hp,
    base_spd: spell.base_spd || 0,
    base_def: spell.base_def || 0,
    base_luck: spell.base_luck || 0,
    // Charges
    current_charges: CHARGES_BY_RARITY[rarity] || 5,
    max_charges: CHARGES_BY_RARITY[rarity] || 5,
  };
}

// ═══════════════════════════════════════════════════════
// LEGACY: generateDailyPack — now uses inventory system
// Grants a daily pack to inventory, then auto-opens it
// for backwards compatibility with existing code
// ═══════════════════════════════════════════════════════
async function generateDailyPack(playerId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if player already opened today's pack
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

    const basics = allSpells.filter(s => s.tier === 0);
    const nonBasics = allSpells.filter(s => s.tier > 0);

    const cards = generateCardsForPackType('daily', null, basics, nonBasics);

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
        current_charges: maxCharges,
        max_charges: maxCharges,
        is_exhausted: false,
      };
    });

    await supabase.from('player_cards').insert(collectionCards);

    return { success: true, pack: pack, cards: cards };
  } catch (err) {
    console.error('generateDailyPack error:', err);
    return { success: false, error: 'Server error generating pack' };
  }
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
  const allUsed = cards.every(c => c.used);

  await supabase
    .from('daily_hands')
    .update({ cards: cards, all_mana_spent: allUsed })
    .eq('id', hand.id);

  return { success: true, card: cards[cardIndex], allManaSpent: allUsed };
}

// ── GET PLAYER COLLECTION ──
async function getCollection(playerId, filters = {}) {
  let query = supabase
    .from('player_cards')
    .select('*, spell:spell_id(name, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects, flavor_text, image_url, mana_cost, tier)')
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
async function processUpgrades() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

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
    const upgradeable = hand.cards.filter(c => c.rarity !== 'legendary');
    if (upgradeable.length === 0) continue;

    const target = upgradeable[Math.floor(Math.random() * upgradeable.length)];
    const currentIdx = rarityOrder.indexOf(target.rarity);
    const newRarity = rarityOrder[Math.min(currentIdx + 1, rarityOrder.length - 1)];
    const newMaxCharges = CHARGES_BY_RARITY[newRarity] || 5;

    await supabase
      .from('player_cards')
      .update({
        rarity: newRarity,
        max_charges: newMaxCharges,
        current_charges: newMaxCharges,
      })
      .eq('player_id', hand.player_id)
      .eq('spell_name', target.name)
      .eq('rarity', target.rarity)
      .limit(1);

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
  rollRarityGuaranteed,
  getRarityMultipliers,
  getAffinityMultiplier,
  generateDailyPack,
  getTodaysHand,
  useCardFromHand,
  getCollection,
  getCollectionStats,
  processUpgrades,
  // New inventory functions
  grantPack,
  grantDailyPack,
  getPackInventory,
  getPackInventorySummary,
  openPackFromInventory,
  generateCardsForPackType,
  buildCard,
  RARITIES,
  ALLIANCES,
  CHARGES_BY_RARITY,
};