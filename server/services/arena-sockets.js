/**
 * ARENA SOCKETS — Nine Lives Network V5
 * Loads real Nines from DB, starts combat when 2+ present
 */

const { ArenaManager } = require('./arena-engine');
const { NermEngine } = require('./nerm-engine');

const HOUSE_MAP = {
  1: 'smoulders',
  2: 'darktide',
  3: 'stonebark',
  4: 'ashenvale',
  5: 'stormrage',
  6: 'nighthollow',
  7: 'dawnbringer',
  8: 'manastorm',
  9: 'plaguemire',
};

function setupArenaSockets(io, supabase) {
  const arenaManager = new ArenaManager(io);
  const nerm = new NermEngine();
  const arenaIO = io.of('/arena');

  arenaIO.on('connection', (socket) => {
    console.log(`👁️ Arena spectator connected: ${socket.id}`);

    socket.on('join_zone', async (data) => {
      const { zoneId } = data;
      if (!zoneId) return;

      // Leave previous rooms
      for (const room of socket.rooms) {
        if (room.startsWith('zone_')) socket.leave(room);
      }
      socket.join(`zone_${zoneId}`);

      // Load arena — reload if stale/not running so cards get loaded fresh
      let arena = arenaManager.arenas.get(zoneId);
      console.log(
        `🔍 Arena check zone ${zoneId}: exists=${!!arena} running=${arena?.isRunning}`,
      );
      if (!arena || !arena.isRunning) {
        if (arena && !arena.isRunning) {
          arena.stop();
          arenaManager.arenas.delete(zoneId);
        }
        arena = await loadArena(zoneId, arenaManager, supabase, nerm);
      }

      // Send current state
      if (arena) {
        socket.emit('arena:state', {
          active: arena.isRunning,
          nines: arena.nines.size,
          round: arena.round,
          cycle: arena.cycle,
          snapshot: arena.getNinesSnapshot(),
        });
      } else {
        socket.emit('arena:state', { active: false, nines: 0 });
      }
    });

    socket.on('leave_zone', (data) => {
      if (data && data.zoneId) socket.leave(`zone_${data.zoneId}`);
    });

    // §9.61: aligned on `zone:chat` (single symmetric name the client uses);
    // this file is currently orphan (no import path from server/index.js) but
    // keeping it consistent in case it's wired up later.
    socket.on('zone:chat', (data) => {
      const zoneId = data.zoneId;
      const message = (data.message || '').trim().substring(0, 120);
      const handle = (data.handle || 'Anon').substring(0, 30);
      const guildTag = (data.guildTag || '').substring(0, 16);
      if (!zoneId || !message) return;
      arenaIO
        .to(`zone_${zoneId}`)
        .emit('zone:chat', { handle, guildTag, message, ts: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log(`⚔️ Arena client disconnected: ${socket.id}`);
    });
  });

  // Expose broadcast API globally so deploy route can push events mid-combat
  arenaIO._broadcastToZone = function (zoneId, event, data) {
    arenaIO.to(`zone_${zoneId}`).emit(event, data);
  };
  global.__arenaSocket = arenaIO;

  async function loadArena(zoneId, manager, db, nermEngine) {
    if (!db) {
      console.error('⚠️ No supabase client for arena');
      return null;
    }
    try {
      // Load deployments with nine stats
      const { data: deployments, error } = await db
        .from('zone_deployments')
        .select(
          `*, player:player_id(twitter_handle, school_id, guild_tag, profile_image), nine:nine_id(name, base_atk, base_hp, base_spd, base_def, base_luck, house_id)`,
        )
        .eq('zone_id', zoneId)
        .eq('is_active', true);
      if (error || !deployments) {
        console.error('Arena DB error:', error);
        return null;
      }

      // Load card slots for all deployments in one query
      const deploymentIds = deployments.map((d) => d.id);
      const { data: cardSlots } = await db
        .from('zone_card_slots')
        .select(
          `id, deployment_id, slot_number, sharpness, spell:spell_id(name, spell_type, rarity, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects)`,
        )
        .in('deployment_id', deploymentIds)
        .eq('is_active', true);

      // Index card slots by deployment_id
      const cardsByDeployment = {};
      for (const slot of cardSlots || []) {
        if (!cardsByDeployment[slot.deployment_id])
          cardsByDeployment[slot.deployment_id] = [];
        const spell = slot.spell || {};
        cardsByDeployment[slot.deployment_id].push({
          name: spell.name || 'Unknown Card',
          spell_type: spell.spell_type || 'attack',
          rarity: spell.rarity || 'common',
          atk: spell.base_atk || 0,
          hp: spell.base_hp || 0,
          spd: spell.base_spd || 0,
          def: spell.base_def || 0,
          luck: spell.base_luck || 0,
          bonus_effects: spell.bonus_effects || [],
          sharpness: slot.sharpness || 100,
        });
      }

      const arena = manager.getArena(zoneId);
      for (const d of deployments) {
        const nine = d.nine || {};
        const player = d.player || {};
        const cards = cardsByDeployment[d.id] || [];
        arena.addNine({
          id: d.player_id,
          name: nine.name || player.twitter_handle || 'Unknown',
          house: HOUSE_MAP[nine.house_id] || 'smoulders',
          guild_id: d.guild_tag || null,
          guild_name: d.guild_tag || 'Lone Wolf',
          items: {},
          cards,
          isFirstDeploy: false,
        });
        console.log(
          `⚔️ Loaded ${cards.length} cards for ${nine.name || player.twitter_handle}`,
        );
      }

      // Patch emit for Nerm commentary
      const origEmit = arena.emit.bind(arena);
      arena.emit = (event, data) => {
        origEmit(event, data);
        if (event === 'arena:events' && data.events) {
          const c = nermEngine.processEvents(
            data.events,
            arena.getNinesSnapshot(),
          );
          if (c) origEmit('arena:nerm', c);
        }
      };

      // Start the arena if not already running
      if (!arena.isRunning && arena.nines.size >= 1) {
        arena.start();
        console.log(
          `⚔️ Zone ${zoneId}: Arena started with ${arena.nines.size} nines`,
        );
      } else {
        console.log(
          `⚔️ Zone ${zoneId}: ${arena.nines.size} nines loaded (already running)`,
        );
      }
      return arena;
    } catch (err) {
      console.error('Arena load error:', err);
      return null;
    }
  }

  console.log('⚔️ Arena sockets initialized');
  return arenaManager;
}

module.exports = { setupArenaSockets };
