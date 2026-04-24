/**
 * ═══════════════════════════════════════════════════════
 * server/services/dropTicketEngine.js
 * Nine Lives Network — Drop Ticket System
 *
 * Players earn tickets from Chronicle participation and daily actions.
 * At midnight UTC, tickets are rolled for rewards:
 *   - Bonus Card (with rarity roll)
 *   - Sharpening Kit (restores 50% sharpness)
 *   - Item Fragment (3 fragments = 1 random item)
 *   - Rare+ Card (guaranteed rare or better)
 *   - Nothing (better luck tomorrow)
 *
 * Max 6 tickets per day:
 *   4 Chronicle act replies + 1 RT/share + 1 daily login
 * ═══════════════════════════════════════════════════════
 */

const supabaseAdmin = require('../config/supabaseAdmin');

// ── Constants ──
const MAX_TICKETS_PER_DAY = 6;

const DROP_TABLE = [
  { type: 'nothing', weight: 35, label: 'Nothing' },
  { type: 'bonus_card', weight: 30, label: 'Bonus Card' },
  { type: 'sharpening_kit', weight: 15, label: 'Sharpening Kit' },
  { type: 'item_fragment', weight: 10, label: 'Item Fragment' },
  { type: 'rare_card', weight: 7, label: 'Rare+ Card' },
  { type: 'epic_card', weight: 3, label: 'Epic+ Card' },
];

const TOTAL_WEIGHT = DROP_TABLE.reduce((sum, d) => sum + d.weight, 0);

// Rarity weights for bonus cards
const CARD_RARITY_WEIGHTS = [
  { rarity: 'common', weight: 40 },
  { rarity: 'uncommon', weight: 30 },
  { rarity: 'rare', weight: 20 },
  { rarity: 'epic', weight: 8 },
  { rarity: 'legendary', weight: 2 },
];

const RARITY_TOTAL = CARD_RARITY_WEIGHTS.reduce((sum, r) => sum + r.weight, 0);

// ══════════════════════════════════
// EARNING TICKETS
// ══════════════════════════════════

/**
 * Earn a drop ticket for a player today.
 * Called when: Chronicle reply scored, RT detected, daily login.
 *
 * @param {number} playerId
 * @param {string} source - 'chronicle_reply', 'chronicle_rt', 'daily_login'
 * @returns {object} { success, tickets_today, maxed_out }
 */
async function earnTicket(playerId, source) {
  if (!playerId) return { success: false, error: 'No player ID' };

  const today = new Date().toISOString().split('T')[0];

  try {
    // Get or create today's record
    let { data: ticket, error: fetchErr } = await supabaseAdmin
      .from('drop_tickets')
      .select('*')
      .eq('player_id', playerId)
      .eq('ticket_date', today)
      .single();

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected for first ticket)
      console.error('[DropTickets] Fetch error:', fetchErr.message);
    }

    if (!ticket) {
      // Create new record for today
      const { data: newTicket, error: insertErr } = await supabaseAdmin
        .from('drop_tickets')
        .insert({
          player_id: playerId,
          ticket_date: today,
          tickets_earned: 1,
          rolled: false,
          results: [],
        })
        .select()
        .single();

      if (insertErr) {
        // Might be unique constraint violation (race condition)
        if (insertErr.code === '23505') {
          // Re-fetch and increment
          const { data: existing } = await supabaseAdmin
            .from('drop_tickets')
            .select('*')
            .eq('player_id', playerId)
            .eq('ticket_date', today)
            .single();
          ticket = existing;
        } else {
          console.error('[DropTickets] Insert error:', insertErr.message);
          return { success: false, error: insertErr.message };
        }
      } else {
        return { success: true, tickets_today: 1, maxed_out: false };
      }
    }

    // Check if already at max
    if (ticket.tickets_earned >= MAX_TICKETS_PER_DAY) {
      return {
        success: true,
        tickets_today: ticket.tickets_earned,
        maxed_out: true,
      };
    }

    // Increment
    const newCount = ticket.tickets_earned + 1;
    await supabaseAdmin
      .from('drop_tickets')
      .update({ tickets_earned: newCount })
      .eq('id', ticket.id);

    return {
      success: true,
      tickets_today: newCount,
      maxed_out: newCount >= MAX_TICKETS_PER_DAY,
    };
  } catch (err) {
    console.error('[DropTickets] earnTicket error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get a player's ticket status for today.
 */
async function getTicketStatus(playerId) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Today's tickets
  const { data: todayData } = await supabaseAdmin
    .from('drop_tickets')
    .select('tickets_earned, rolled')
    .eq('player_id', playerId)
    .eq('ticket_date', today)
    .single();

  // Yesterday's results (to show "you earned..." notification)
  const { data: yesterdayData } = await supabaseAdmin
    .from('drop_tickets')
    .select('tickets_earned, results, rolled')
    .eq('player_id', playerId)
    .eq('ticket_date', yesterday)
    .single();

  return {
    today: {
      tickets_earned: todayData?.tickets_earned || 0,
      max_tickets: MAX_TICKETS_PER_DAY,
      rolled: todayData?.rolled || false,
    },
    yesterday: yesterdayData?.rolled
      ? {
          tickets_rolled: yesterdayData.tickets_earned,
          results: yesterdayData.results || [],
        }
      : null,
  };
}

// ══════════════════════════════════
// MIDNIGHT ROLL PROCESSING
// ══════════════════════════════════

/**
 * Process all unrolled tickets from today (called at midnight).
 * For each player with tickets, roll the drop table per ticket.
 * Awards: cards to player_cards, kits to player_levels, fragments to player_levels.
 */
async function processAllTickets() {
  const today = new Date().toISOString().split('T')[0];

  // Get all unrolled tickets for today
  const { data: tickets, error } = await supabaseAdmin
    .from('drop_tickets')
    .select('*')
    .eq('ticket_date', today)
    .eq('rolled', false)
    .gt('tickets_earned', 0);

  if (error) {
    console.error('[DropTickets] Fetch unrolled error:', error.message);
    return { processed: 0, error: error.message };
  }

  if (!tickets || tickets.length === 0) {
    return { processed: 0, message: 'No tickets to process' };
  }

  let totalProcessed = 0;
  let totalRewards = { cards: 0, kits: 0, fragments: 0, nothing: 0 };

  for (const ticket of tickets) {
    try {
      const results = await rollTickets(
        ticket.player_id,
        ticket.tickets_earned,
      );

      // Mark as rolled
      await supabaseAdmin
        .from('drop_tickets')
        .update({ rolled: true, results })
        .eq('id', ticket.id);

      // Count rewards
      for (const r of results) {
        if (r.type === 'nothing') totalRewards.nothing++;
        else if (r.type === 'sharpening_kit') totalRewards.kits++;
        else if (r.type === 'item_fragment') totalRewards.fragments++;
        else totalRewards.cards++;
      }

      totalProcessed++;
    } catch (err) {
      console.error(
        `[DropTickets] Roll error for player ${ticket.player_id}:`,
        err.message,
      );
    }
  }

  console.log(
    `[DropTickets] Processed ${totalProcessed} players: ${totalRewards.cards} cards, ${totalRewards.kits} kits, ${totalRewards.fragments} frags, ${totalRewards.nothing} nothing`,
  );
  return { processed: totalProcessed, rewards: totalRewards };
}

/**
 * Roll N tickets for one player. Returns array of results.
 */
async function rollTickets(playerId, ticketCount) {
  const results = [];

  for (let i = 0; i < ticketCount; i++) {
    const drop = rollDrop();
    const result = await awardDrop(playerId, drop);
    results.push(result);
  }

  return results;
}

/**
 * Roll the drop table once. Returns { type, label }.
 */
function rollDrop() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const entry of DROP_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) return { type: entry.type, label: entry.label };
  }
  return DROP_TABLE[0]; // fallback
}

/**
 * Award a single drop to a player.
 */
async function awardDrop(playerId, drop) {
  switch (drop.type) {
    case 'nothing':
      return {
        type: 'nothing',
        label: 'Nothing',
        detail: 'Better luck tomorrow!',
      };

    case 'bonus_card':
      return await awardRandomCard(playerId, 'any');

    case 'rare_card':
      return await awardRandomCard(playerId, 'rare_plus');

    case 'epic_card':
      return await awardRandomCard(playerId, 'epic_plus');

    case 'sharpening_kit':
      return await awardSharpeningKit(playerId);

    case 'item_fragment':
      return await awardItemFragment(playerId);

    default:
      return { type: 'nothing', label: 'Unknown', detail: 'Error' };
  }
}

/**
 * Award a random card to the player.
 * @param {string} tier - 'any' (normal rarity roll), 'rare_plus' (rare+), 'epic_plus' (epic+)
 */
async function awardRandomCard(playerId, tier) {
  try {
    // Get a random spell
    const { data: spells } = await supabaseAdmin
      .from('spells')
      .select('id, name, house, spell_type')
      .limit(100);

    if (!spells || spells.length === 0) {
      return {
        type: 'bonus_card',
        label: 'Bonus Card',
        detail: 'No spells available',
      };
    }

    const spell = spells[Math.floor(Math.random() * spells.length)];

    // Roll rarity
    let rarity;
    if (tier === 'epic_plus') {
      rarity = Math.random() < 0.7 ? 'epic' : 'legendary';
    } else if (tier === 'rare_plus') {
      const r = Math.random();
      if (r < 0.6) rarity = 'rare';
      else if (r < 0.9) rarity = 'epic';
      else rarity = 'legendary';
    } else {
      // Normal roll
      let roll = Math.random() * RARITY_TOTAL;
      for (const entry of CARD_RARITY_WEIGHTS) {
        roll -= entry.weight;
        if (roll <= 0) {
          rarity = entry.rarity;
          break;
        }
      }
      if (!rarity) rarity = 'common';
    }

    // Insert card into player's collection
    const { error: insertErr } = await supabaseAdmin
      .from('player_cards')
      .insert({
        player_id: playerId,
        spell_id: spell.id,
        spell_name: spell.name,
        spell_house: spell.house,
        spell_type: spell.spell_type,
        rarity,
        sharpness: 100,
        is_exhausted: false,
      });

    if (insertErr) {
      console.error('[DropTickets] Card insert error:', insertErr.message);
      return {
        type: 'bonus_card',
        label: 'Bonus Card',
        detail: 'Award failed',
      };
    }

    const labelMap = {
      any: 'Bonus Card',
      rare_plus: 'Rare+ Card',
      epic_plus: 'Epic+ Card',
    };
    return {
      type:
        tier === 'epic_plus'
          ? 'epic_card'
          : tier === 'rare_plus'
            ? 'rare_card'
            : 'bonus_card',
      label: labelMap[tier] || 'Bonus Card',
      detail: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${spell.name}`,
      rarity,
      spell_name: spell.name,
    };
  } catch (err) {
    console.error('[DropTickets] awardRandomCard error:', err.message);
    return { type: 'bonus_card', label: 'Bonus Card', detail: 'Error' };
  }
}

/**
 * Award a sharpening kit (restores 50% sharpness on one card).
 */
async function awardSharpeningKit(playerId) {
  try {
    await supabaseAdmin
      .rpc('increment_column', {
        table_name: 'player_levels',
        column_name: 'sharpening_kits',
        row_id: playerId,
        amount: 1,
      })
      .catch(async () => {
        // Fallback if RPC doesn't exist
        const { data } = await supabaseAdmin
          .from('player_levels')
          .select('sharpening_kits')
          .eq('player_id', playerId)
          .single();

        await supabaseAdmin
          .from('player_levels')
          .update({ sharpening_kits: (data?.sharpening_kits || 0) + 1 })
          .eq('player_id', playerId);
      });

    return {
      type: 'sharpening_kit',
      label: 'Sharpening Kit',
      detail: 'Restores 50% sharpness on any card',
    };
  } catch (err) {
    console.error('[DropTickets] Kit error:', err.message);
    return {
      type: 'sharpening_kit',
      label: 'Sharpening Kit',
      detail: 'Award failed',
    };
  }
}

/**
 * Award an item fragment. 3 fragments auto-convert to 1 random item.
 */
async function awardItemFragment(playerId) {
  try {
    // Get current fragments
    const { data } = await supabaseAdmin
      .from('player_levels')
      .select('item_fragments')
      .eq('player_id', playerId)
      .single();

    const currentFrags = (data?.item_fragments || 0) + 1;

    if (currentFrags >= 3) {
      // Convert to item!
      await supabaseAdmin
        .from('player_levels')
        .update({ item_fragments: 0 })
        .eq('player_id', playerId);

      // Award random item
      const item = await awardRandomItem(playerId);
      return {
        type: 'item_fragment',
        label: 'Item Fragment (3/3!)',
        detail: `Fragments combined into: ${item.name || 'a new item'}!`,
        item_awarded: true,
        item_name: item.name,
      };
    } else {
      // Just increment
      await supabaseAdmin
        .from('player_levels')
        .update({ item_fragments: currentFrags })
        .eq('player_id', playerId);

      return {
        type: 'item_fragment',
        label: `Item Fragment (${currentFrags}/3)`,
        detail: `${3 - currentFrags} more to forge an item`,
      };
    }
  } catch (err) {
    console.error('[DropTickets] Fragment error:', err.message);
    return {
      type: 'item_fragment',
      label: 'Item Fragment',
      detail: 'Award failed',
    };
  }
}

/**
 * Award a random item from the items table.
 */
async function awardRandomItem(playerId) {
  try {
    const { data: items } = await supabaseAdmin
      .from('items')
      .select('id, name, slot, rarity')
      .limit(200);

    if (!items || items.length === 0) return { name: 'Unknown Item' };

    const item = items[Math.floor(Math.random() * items.length)];

    await supabaseAdmin.from('player_items').insert({
      player_id: playerId,
      item_id: item.id,
      equipped: false,
    });

    return item;
  } catch (err) {
    console.error('[DropTickets] Item award error:', err.message);
    return { name: 'Unknown Item' };
  }
}

// ══════════════════════════════════
// SHARPENING KIT USAGE
// ══════════════════════════════════

/**
 * Use a sharpening kit on a card. Restores 50 sharpness points.
 */
async function useSharpeningKit(playerId, cardId) {
  try {
    // Check player has kits
    const { data: levelData } = await supabaseAdmin
      .from('player_levels')
      .select('sharpening_kits')
      .eq('player_id', playerId)
      .single();

    if (!levelData || (levelData.sharpening_kits || 0) <= 0) {
      return { success: false, error: 'No sharpening kits available' };
    }

    // Check card exists and belongs to player
    const { data: card } = await supabaseAdmin
      .from('player_cards')
      .select('id, sharpness, player_id')
      .eq('id', cardId)
      .single();

    if (!card || card.player_id !== playerId) {
      return { success: false, error: 'Card not found' };
    }

    if (card.sharpness >= 100) {
      return { success: false, error: 'Card already at full sharpness' };
    }

    // Apply kit: +50 sharpness, cap at 100
    const newSharpness = Math.min(100, (card.sharpness || 0) + 50);

    await supabaseAdmin
      .from('player_cards')
      .update({ sharpness: newSharpness })
      .eq('id', cardId);

    // Decrement kits
    await supabaseAdmin
      .from('player_levels')
      .update({ sharpening_kits: levelData.sharpening_kits - 1 })
      .eq('player_id', playerId);

    return {
      success: true,
      new_sharpness: newSharpness,
      kits_remaining: levelData.sharpening_kits - 1,
    };
  } catch (err) {
    console.error('[DropTickets] useSharpeningKit error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  earnTicket,
  getTicketStatus,
  processAllTickets,
  rollTickets,
  useSharpeningKit,
  MAX_TICKETS_PER_DAY,
};
