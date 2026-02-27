/**
 * ARENA SOCKETS — Nine Lives Network V5
 * Loads real Nines from DB, starts combat when 2+ present
 */

const { ArenaManager } = require('./arena-engine');
const { NermEngine } = require('./nerm-engine');

const HOUSE_MAP = {
  1: 'smoulders', 2: 'darktide', 3: 'stonebark', 4: 'ashenvale',
  5: 'stormrage', 6: 'nighthollow', 7: 'dawnbringer', 8: 'manastorm', 9: 'plaguemire',
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

      // Load arena if not running
      let arena = arenaManager.arenas.get(zoneId);
      if (!arena) {
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

    socket.on('disconnect', () => {});
  });

  async function loadArena(zoneId, manager, db, nermEngine) {
    if (!db) {
      console.error('⚠️ No supabase client for arena');
      return null;
    }

    try {
      const { data: deployments, error } = await db
        .from('zone_deployments')
        .select(`*, player:player_id(twitter_handle, school_id, guild_tag, profile_image), nine:nine_id(name, base_atk, base_hp, base_spd, base_def, base_luck, house_id)`)
        .eq('zone_id', zoneId)
        .eq('is_active', true);

      if (error || !deployments) {
        console.error('Arena DB error:', error);
        return null;
      }

      const arena = manager.getArena(zoneId);

      for (const d of deployments) {
        const nine = d.nine || {};
        const player = d.player || {};
        arena.addNine({
          id: d.player_id,
          name: nine.name || player.twitter_handle || 'Unknown',
          house: HOUSE_MAP[nine.house_id] || 'smoulders',
          guild_id: d.guild_tag || null,
          guild_name: d.guild_tag || 'Lone Wolf',
          items: {},
          cards: [],
          isFirstDeploy: false,
        });
      }

      // Patch emit for Nerm commentary
      const origEmit = arena.emit.bind(arena);
      arena.emit = (event, data) => {
        origEmit(event, data);
        if (event === 'arena:events' && data.events) {
          const c = nermEngine.processEvents(data.events, arena.getNinesSnapshot());
          if (c) origEmit('arena:nerm', c);
        }
      };

      console.log(`⚔️ Zone ${zoneId}: ${arena.nines.size} nines loaded`);
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