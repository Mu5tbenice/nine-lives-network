// ═══════════════════════════════════════════════════════
// server/services/packSystem.js
// Daily Pack Generation + Card Collection + Pack Inventory
// V5 UPDATE: Removed tier/mana_cost references, uses rarity_weights from spells table
// FIX: supabaseAdmin for player_cards inserts (RLS bypass)
// FIX: Random basic card selection (no more same 2 cards every pack)
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');

// ── RARITY CONFIG ──
const RARITIES = {
  common:    { weight: 55, pointMult: 1.0,  infMult: 1.0  },
  uncommon:  { weight: 25, pointMult: 1.25, infMult: 1.1  },
  rare:      { weight: 12, pointMult: 1.5,  infMult: 1.25 },
  epic:      { weight: 6,  pointMult: 2.0,  infMult: 1.5  },
  legendary: { weight: 2,  pointMult: 3.0,  infMult: 2.0  },
};

// V5: Default rarity weights (used when spell has no rarity_weights column)
const DEFAULT_RARITY_WEIGHTS = { common: 55, uncommon: 25, rare: 12, epic: 6, legendary: 2 };

// V5: Durability charges by rarity (kept from V3)
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
  uncommon:  { atk: 1, hp: 0 },
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

// ── HELPER: Parse rarity_weights from a spell ──
function parseRarityWeights(spell) {
  if (!spell || !spell.rarity_weights) return DEFAULT_RARITY_WEIGHTS;
  try {
    const w = typeof spell.rarity_weights === 'string'
      ? JSON.parse(spell.rarity_weights)
      : spell.rarity_weights;
    return w || DEFAULT_RARITY_WEIGHTS;
  } catch {
    return DEFAULT_RARITY_WEIGHTS;
  }
}

// ── HELPER: Check if a spell is a "basic" (always-common) spell ──
function isBasicSpell(spell) {
  const weights = parseRarityWeights(spell);
  // Basic spells only have { common: 100 }
  return weights.common === 100 && !weights.uncommon && !weights.rare && !weights.epic && !weights.legendary;
}

// ── HELPER: Split spells into basics and non-basics ──
function splitSpellPool(allSpells) {
  const basics = allSpells.filter(s => isBasicSpell(s));
  const nonBasics = allSpells.filter(s => !isBasicSpell(s));
  return { basics, nonBasics };
}

// ── HELPER: Pick a random spell from an array ──
// FIX: prevents always picking same first spell in pool
function pickRandom(arr, fallback = null) {
  if (!arr || arr.length === 0) return fallback;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── ROLL RARITY ──
// V5: Uses spell's own rarity_weights instead of tier
function rollRarity(spell = null) {
  const weights = spell ? parseRarityWeights(spell) : DEFAULT_RARITY_WEIGHTS;
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
async function grantPack(playerId, packType = 'daily', source = 'daily_login', packData = null) {
  try {
    const { data, error } = await supabaseAdmin
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
async function grantDailyPack(playerId) {
  try {
    const today = new Date().toISOString().split('T')[0];

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

// ── CHECK IF DAILY PACK WAS CLAIMED TODAY ──
async function isDailyClaimedToday(playerId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('pack_inventory')
      .select('id')
      .eq('player_id', playerId)
      .eq('pack_type', 'daily')
      .eq('source', 'daily_login')
      .gte('granted_at', today + 'T00:00:00Z')
      .lte('granted_at', today + 'T23:59:59Z')
      .limit(1);
    return data && data.length > 0;
  } catch (err) {
    console.error('isDailyClaimedToday error:', err);
    return false;
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
async function openPackFromInventory(playerId, packInventoryId) {
  try {
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

    const { data: allSpells, error: spellErr } = await supabase
      .from('spells')
      .select('*')
      .eq('is_active', true)
      .eq('in_pack_pool', true);

    if (spellErr || !allSpells || allSpells.length === 0) {
      return { success: false, error: 'No spells available in pool' };
    }

    const { basics, nonBasics } = splitSpellPool(allSpells);
    const cards = generateCardsForPackType(pack.pack_type, pack.pack_data, basics, nonBasics);

    await supabase
      .from('pack_inventory')
      .update({ opened: true, opened_at: new Date().toISOString() })
      .eq('id', packInventoryId);

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

    const collectionCards = cards.map(c => ({
      player_id: playerId,
      spell_id: c.spell_id,
      spell_name: c.name,
      spell_house: c.house,
      spell_type: c.type,
      spell_tier: 0,
      spell_effects: c.effects || [],
      rarity: c.rarity,
      source: 'pack',
      sharpness: 100,
      is_exhausted: false,
    }));

    const { error: insertErr } = await supabaseAdmin.from('player_cards').insert(collectionCards);
    if (insertErr) {
      console.error('[PackSystem] player_cards insert error (openPackFromInventory):', insertErr);
      console.error('[PackSystem] detail:', JSON.stringify(insertErr));
    } else {
      console.log('[PackSystem] openPackFromInventory saved:', collectionCards.length, 'cards for player', playerId);
    }

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

  const safeNonBasics = nonBasics.length > 0 ? nonBasics : basics;

  // FIX: filter basics by type then pick RANDOMLY — no more same card every time
  const attackBasics = basics.filter(s => s.spell_type === 'attack');
  const defendBasics = basics.filter(s => s.spell_type === 'defend');

  switch (packType) {
    case 'daily': {
      // 5 random cards from the full pool — rarity rolled per-card
      for (let i = 0; i < 5; i++) {
        const spell = pickRandom(safeNonBasics);
        cards.push(buildCard(spell, rollRarity(spell)));
      }
      break;
    }

    case 'boss': {
      for (let i = 0; i < 5; i++) {
        const spell = pickRandom(safeNonBasics);
        const rarity = i === 0
          ? rollRarityGuaranteed(guaranteedRarity || 'rare')
          : rollRarity(spell);
        cards.push(buildCard(spell, rarity));
      }
      break;
    }

    case 'event': {
      for (let i = 0; i < 5; i++) {
        const spell = pickRandom(safeNonBasics);
        const rarity = i === 0
          ? rollRarityGuaranteed(guaranteedRarity || 'rare')
          : rollRarity(spell);
        cards.push(buildCard(spell, rarity));
      }
      break;
    }

    case 'seasonal': {
      for (let i = 0; i < 5; i++) {
        const spell = pickRandom(safeNonBasics);
        const rarity = i === 0
          ? rollRarityGuaranteed(guaranteedRarity || 'epic')
          : rollRarity(spell);
        cards.push(buildCard(spell, rarity));
      }
      break;
    }

    case 'welcome': {
      // Welcome pack: 5 random cards, with 1 guaranteed uncommon or better
      for (let i = 0; i < 5; i++) {
        const spell = pickRandom(safeNonBasics);
        const rarity = i === 0 ? rollRarityGuaranteed('uncommon') : rollRarity(spell);
        cards.push(buildCard(spell, rarity));
      }
      break;
    }

    case 'reward':
    default: {
      // 5 random cards from the full pool — rarity rolled per-card
      for (let i = 0; i < 5; i++) {
        const spell = pickRandom(safeNonBasics);
        cards.push(buildCard(spell, rollRarity(spell)));
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
    tier: 0,
    cost: 1,
    base_effect: spell.base_effect || '',
    effects: effects,
    rarity: rarity,
    point_multiplier: rarityConfig.pointMult,
    influence_multiplier: rarityConfig.infMult,
    image_url: spell.image_url || null,
    flavor_text: spell.flavor_text || null,
    base_atk: (spell.base_atk || 3) + bonus.atk,
    base_hp: (spell.base_hp || 2) + bonus.hp,
    base_spd: spell.base_spd || 0,
    base_def: spell.base_def || 0,
    base_luck: spell.base_luck || 0,
    current_charges: CHARGES_BY_RARITY[rarity] || 5,
    max_charges: CHARGES_BY_RARITY[rarity] || 5,
  };
}

// ═══════════════════════════════════════════════════════
// LEGACY: generateDailyPack — called by POST /api/packs/open
// ═══════════════════════════════════════════════════════
async function generateDailyPack(playerId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('card_packs')
      .select('*')
      .eq('player_id', playerId)
      .eq('game_day', today)
      .eq('pack_type', 'daily')
      .single();

    if (existing) {
      // Repair pass: check if cards from this pack made it into player_cards
      // (they may have been missed if supabaseAdmin was broken on first open)
      try {
        const existingCards = existing.cards || [];
        if (existingCards.length > 0) {
          // Check how many player_cards we already have from today's pack
          const { data: alreadySaved } = await supabaseAdmin
            .from('player_cards')
            .select('id')
            .eq('player_id', playerId)
            .eq('source', 'pack')
            .gte('acquired_at', today + 'T00:00:00.000Z');

          if (!alreadySaved || alreadySaved.length === 0) {
            // Cards missing — re-insert them now
            console.log('[PackSystem] Repair: re-inserting missing player_cards for player', playerId);
            const repairCards = existingCards.map(c => ({
              player_id: playerId,
              spell_id: c.spell_id,
              spell_name: c.name,
              spell_house: c.house,
              spell_type: c.type,
              spell_tier: 0,
              spell_effects: c.effects || [],
              rarity: c.rarity,
              source: 'pack',
              sharpness: 100,
              is_exhausted: false,
            }));
            const { error: repairErr } = await supabaseAdmin.from('player_cards').insert(repairCards);
            if (repairErr) console.error('[PackSystem] Repair insert error:', repairErr);
            else console.log('[PackSystem] Repair: inserted', repairCards.length, 'cards for player', playerId);
          }
        }
      } catch (repairEx) {
        console.error('[PackSystem] Repair check error:', repairEx);
      }
      return { success: false, error: 'Already opened today\'s pack', pack: existing };
    }

    const { data: allSpells, error: spellErr } = await supabase
      .from('spells')
      .select('*')
      .eq('is_active', true)
      .eq('in_pack_pool', true);

    if (spellErr || !allSpells || allSpells.length === 0) {
      return { success: false, error: 'No spells available in pool' };
    }

    const { basics, nonBasics } = splitSpellPool(allSpells);
    const cards = generateCardsForPackType('daily', null, basics, nonBasics);

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

    const handCards = cards.map((c, i) => ({ ...c, index: i, used: false }));
    await supabase
      .from('daily_hands')
      .upsert({
        player_id: playerId,
        game_day: today,
        cards: handCards,
      }, { onConflict: 'player_id,game_day' });

    // Insert into player_cards — columns must match table exactly
    const collectionCards = cards.map(c => ({
      player_id: playerId,
      spell_id:  c.spell_id,
      spell_name: c.name,
      spell_house: c.house,
      spell_type: c.type,
      spell_tier: 0,
      spell_effects: c.effects || [],
      rarity: c.rarity,
      source: 'pack',
      sharpness: 100,
      is_exhausted: false,
    }));

    const { error: insertErr } = await supabaseAdmin.from('player_cards').insert(collectionCards);
    if (insertErr) {
      console.error('[PackSystem] player_cards insert error (generateDailyPack):', insertErr);
      console.error('[PackSystem] insert error detail:', JSON.stringify(insertErr));
    } else {
      console.log('[PackSystem] player_cards saved:', collectionCards.length, 'cards for player', playerId);
    }

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
  let query = supabaseAdmin
    .from('player_cards')
    .select('*, spell:spell_id(name, house, spell_type, base_atk, base_hp, base_spd, base_def, base_luck, effect_1, base_effect, bonus_effects, flavor_text, image_url)')
    .eq('player_id', playerId)
    .order('acquired_at', { ascending: false });

  if (filters.rarity) query = query.eq('rarity', filters.rarity);
  if (filters.house) query = query.eq('spell_house', filters.house);
  if (filters.type) query = query.eq('spell_type', filters.type);

  const { data, error } = await query;
  if (error) console.error('[PackSystem] getCollection error:', error);
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

    await supabaseAdmin
      .from('player_cards')
      .update({
        rarity: newRarity,
        sharpness: 100,
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
  grantPack,
  grantDailyPack,
  isDailyClaimedToday,
  getPackInventory,
  getPackInventorySummary,
  openPackFromInventory,
  generateCardsForPackType,
  buildCard,
  RARITIES,
  ALLIANCES,
  CHARGES_BY_RARITY,
};