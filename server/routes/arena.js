/**
 * ARENA ROUTES — Nine Lives Network V5
 * 
 * API endpoints for arena deploy/withdraw/status.
 * The ArenaManager is injected from index.js.
 * 
 * Usage in server/index.js:
 *   const arenaRoutes = require('./routes/arena');
 *   arenaRoutes.setArenaManager(arenaManager);
 *   app.use('/api/arena', arenaRoutes.router);
 */

const express = require('express');
const router = express.Router();

let arenaManager = null;
let supabase = null;

function setArenaManager(manager) {
  arenaManager = manager;
}

function setSupabase(client) {
  supabase = client;
}

// ============================================
// GET /api/arena/status/:zoneId
// Returns current arena state for a zone
// ============================================
router.get('/status/:zoneId', (req, res) => {
  try {
    const zoneId = parseInt(req.params.zoneId);
    if (!arenaManager) return res.status(500).json({ error: 'Arena not initialized' });

    const status = arenaManager.getStatus(zoneId);
    res.json(status);
  } catch (err) {
    console.error('Arena status error:', err);
    res.status(500).json({ error: 'Failed to get arena status' });
  }
});

// ============================================
// GET /api/arena/active
// Returns all active arenas
// ============================================
router.get('/active', (req, res) => {
  try {
    if (!arenaManager) return res.status(500).json({ error: 'Arena not initialized' });

    const active = arenaManager.getAllActive();
    res.json({ arenas: active });
  } catch (err) {
    console.error('Arena active error:', err);
    res.status(500).json({ error: 'Failed to get active arenas' });
  }
});

// ============================================
// POST /api/arena/deploy
// Deploy a Nine to a zone with a 3-card loadout
// 
// Body: { player_id, zone_id, card_ids: [id, id, id] }
// ============================================
router.post('/deploy', async (req, res) => {
  try {
    const { player_id, zone_id, card_ids } = req.body;

    if (!player_id || !zone_id || !card_ids || card_ids.length !== 3) {
      return res.status(400).json({ error: 'Need player_id, zone_id, and exactly 3 card_ids' });
    }

    if (!arenaManager) return res.status(500).json({ error: 'Arena not initialized' });
    if (!supabase) return res.status(500).json({ error: 'Database not initialized' });

    // 1. Get player data
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .select('id, username, house, guild_id, level')
      .eq('id', player_id)
      .single();

    if (playerErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // 2. Check zone deployment limit (2 zones under level 10, 3 at level 10+)
    const maxZones = player.level >= 10 ? 3 : 2;
    const currentDeployments = arenaManager.getPlayerDeployments
      ? arenaManager.getPlayerDeployments(player_id)
      : [];

    // Count existing deployments (from all arenas)
    let deployedZones = 0;
    for (const [zId, arena] of arenaManager.arenas) {
      if (arena.nines.has(player_id)) deployedZones++;
    }

    if (deployedZones >= maxZones) {
      return res.status(400).json({
        error: `Max ${maxZones} zone deployments (level ${player.level}). Withdraw from a zone first.`
      });
    }

    // 3. Check player isn't already on this zone
    const existingArena = arenaManager.arenas.get(zone_id);
    if (existingArena && existingArena.nines.has(player_id)) {
      return res.status(400).json({ error: 'Already deployed on this zone' });
    }

    // 4. Check cards aren't deployed elsewhere
    for (const [zId, arena] of arenaManager.arenas) {
      if (zId === zone_id) continue;
      const nine = arena.nines.get(player_id);
      if (nine) {
        const deployedCardIds = nine.cards.map(c => c.id);
        const overlap = card_ids.filter(id => deployedCardIds.includes(id));
        if (overlap.length > 0) {
          return res.status(400).json({
            error: 'One or more cards are deployed on another zone. Withdraw first.'
          });
        }
      }
    }

    // 5. Get card data from database
    const { data: cards, error: cardErr } = await supabase
      .from('player_cards')
      .select(`
        id, spell_id, sharpness,
        spells (
          id, name, house, spell_type, rarity,
          base_atk, base_hp, base_spd, base_def, base_luck,
          base_effect, bonus_effects, flavor_text, image_url
        )
      `)
      .in('id', card_ids)
      .eq('player_id', player_id);

    if (cardErr || !cards || cards.length !== 3) {
      return res.status(400).json({ error: 'Could not find all 3 cards in your collection' });
    }

    // 6. Get guild data
    let guildName = null;
    let guildId = null;
    if (player.guild_id) {
      const { data: guild } = await supabase
        .from('guilds')
        .select('id, name')
        .eq('id', player.guild_id)
        .single();

      if (guild) {
        guildName = guild.name;
        guildId = guild.id;
      }
    }

    // 7. Get equipped items
    const { data: items } = await supabase
      .from('player_items')
      .select('slot, item_id, items(name, rarity, slot, trigger_effect)')
      .eq('player_id', player_id)
      .eq('equipped', true);

    // 8. Format card data for arena engine
    const formattedCards = cards.map(pc => ({
      id: pc.id,
      name: pc.spells.name,
      house: pc.spells.house,
      spell_type: pc.spells.spell_type,
      rarity: pc.spells.rarity,
      atk: pc.spells.base_atk || 0,
      hp: pc.spells.base_hp || 0,
      spd: pc.spells.base_spd || 0,
      def: pc.spells.base_def || 0,
      luck: pc.spells.base_luck || 0,
      bonus_effects: pc.spells.bonus_effects || [],
      sharpness: pc.sharpness || 100,
    }));

    // 9. Deploy to arena
    const nineData = {
      id: player_id,
      name: player.username,
      house: player.house,
      guild_id: guildId,
      guild_name: guildName,
      items: items || [],
      cards: formattedCards,
    };

    const nine = arenaManager.deployNine(zone_id, nineData);

    // 10. Record deployment in database
    await supabase
      .from('zone_deployments')
      .upsert({
        player_id,
        zone_id,
        card_ids,
        deployed_at: new Date().toISOString(),
        config_locked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h lock
      });

    res.json({
      success: true,
      message: `Deployed to zone ${zone_id}`,
      nine: {
        id: nine.id,
        stats: {
          atk: nine.total_atk,
          hp: nine.total_hp,
          spd: nine.total_spd,
          def: nine.total_def,
          luck: nine.total_luck,
        },
        position: nine.position,
        config_locked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
    });

  } catch (err) {
    console.error('Arena deploy error:', err);
    res.status(500).json({ error: 'Failed to deploy' });
  }
});

// ============================================
// POST /api/arena/withdraw
// Withdraw a Nine from a zone
// 
// Body: { player_id, zone_id }
// ============================================
router.post('/withdraw', async (req, res) => {
  try {
    const { player_id, zone_id } = req.body;

    if (!player_id || !zone_id) {
      return res.status(400).json({ error: 'Need player_id and zone_id' });
    }

    if (!arenaManager) return res.status(500).json({ error: 'Arena not initialized' });

    // Withdraw from arena
    arenaManager.withdrawNine(zone_id, player_id);

    // Update database
    if (supabase) {
      await supabase
        .from('zone_deployments')
        .delete()
        .eq('player_id', player_id)
        .eq('zone_id', zone_id);
    }

    res.json({ success: true, message: `Withdrawn from zone ${zone_id}` });

  } catch (err) {
    console.error('Arena withdraw error:', err);
    res.status(500).json({ error: 'Failed to withdraw' });
  }
});

// ============================================
// GET /api/arena/deployments/:playerId
// Get all zones a player is deployed to
// ============================================
router.get('/deployments/:playerId', (req, res) => {
  try {
    const playerId = req.params.playerId;
    if (!arenaManager) return res.status(500).json({ error: 'Arena not initialized' });

    const deployments = [];
    for (const [zoneId, arena] of arenaManager.arenas) {
      const nine = arena.nines.get(playerId);
      if (nine) {
        deployments.push({
          zone_id: zoneId,
          stats: {
            atk: nine.total_atk,
            hp: nine.total_hp,
            spd: nine.total_spd,
            def: nine.total_def,
            luck: nine.total_luck,
          },
          cards: nine.cards.map(c => ({
            name: c.name,
            sharpness: c.sharpness,
          })),
          alive: nine.alive,
          current_hp: nine.current_hp,
          max_hp: nine.max_hp,
        });
      }
    }

    res.json({ deployments });

  } catch (err) {
    console.error('Arena deployments error:', err);
    res.status(500).json({ error: 'Failed to get deployments' });
  }
});

module.exports = { router, setArenaManager, setSupabase };