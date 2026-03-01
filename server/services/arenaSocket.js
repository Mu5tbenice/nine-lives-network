// ═══════════════════════════════════════════════════════
// server/services/arenaSocket.js
// Socket.io /arena namespace for real-time zone combat
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');

// Track who is watching which zone
// Map<zoneId, Set<socketId>>
const zoneViewers = new Map();

// Track which zone each socket is in
// Map<socketId, zoneId>
const socketZones = new Map();

function setupArenaSocket(io) {
  const arena = io.of('/arena');

  arena.on('connection', (socket) => {
    console.log(`⚔️ Arena socket connected: ${socket.id}`);

    // ─── JOIN ZONE ───
    socket.on('join_zone', async (data) => {
      const zoneId = parseInt(data?.zoneId);
      if (!zoneId) return;

      // Leave previous zone if any
      const prevZone = socketZones.get(socket.id);
      if (prevZone) {
        socket.leave(`zone_${prevZone}`);
        const viewers = zoneViewers.get(prevZone);
        if (viewers) viewers.delete(socket.id);
      }

      // Join new zone room
      socket.join(`zone_${zoneId}`);
      socketZones.set(socket.id, zoneId);

      if (!zoneViewers.has(zoneId)) zoneViewers.set(zoneId, new Set());
      zoneViewers.get(zoneId).add(socket.id);

      console.log(`⚔️ Socket ${socket.id} joined zone ${zoneId} (${zoneViewers.get(zoneId).size} viewers)`);

      // Send current zone state snapshot
      try {
        const snapshot = await getZoneSnapshot(zoneId);
        socket.emit('arena:state', {
          zone_id: zoneId,
          snapshot: snapshot.nines,
          active: snapshot.nines.length > 0,
          round: 1,
          cycle: 1,
          viewers: zoneViewers.get(zoneId).size,
        });
      } catch (e) {
        console.error('Failed to send zone snapshot:', e.message);
        socket.emit('arena:state', { zone_id: zoneId, snapshot: [], active: false });
      }
    });

    // ─── LEAVE ZONE ───
    socket.on('leave_zone', (data) => {
      const zoneId = parseInt(data?.zoneId) || socketZones.get(socket.id);
      if (zoneId) {
        socket.leave(`zone_${zoneId}`);
        const viewers = zoneViewers.get(zoneId);
        if (viewers) viewers.delete(socket.id);
        socketZones.delete(socket.id);
      }
    });

    // ─── DISCONNECT ───
    socket.on('disconnect', () => {
      const zoneId = socketZones.get(socket.id);
      if (zoneId) {
        const viewers = zoneViewers.get(zoneId);
        if (viewers) viewers.delete(socket.id);
        socketZones.delete(socket.id);
      }
    });
  });

  // ─── PUBLIC API: Let other services broadcast combat events ───
  // Usage from combat engine:
  //   const arenaSocket = require('./arenaSocket');
  //   arenaSocket.broadcastToZone(zoneId, 'arena:attack', { from, to, damage });
  arena._broadcastToZone = function(zoneId, event, data) {
    arena.to(`zone_${zoneId}`).emit(event, data);
  };

  arena._getViewerCount = function(zoneId) {
    return zoneViewers.get(zoneId)?.size || 0;
  };

  // Store reference globally so combat engine can access it
  global.__arenaSocket = arena;

  return arena;
}

// ─── ZONE SNAPSHOT ───
// Fetch all deployed Nines on a zone for initial state
async function getZoneSnapshot(zoneId) {
  const { data: deployments, error } = await supabase
    .from('zone_deployments')
    .select(`
      player_id,
      current_hp,
      max_hp,
      guild_tag,
      is_mercenary,
      nine:nine_id(name, base_atk, base_hp, base_spd, base_def, base_luck, house_id, equipped_images),
      player:player_id(twitter_handle, profile_image)
    `)
    .eq('zone_id', zoneId)
    .eq('is_active', true);

  if (error || !deployments) {
    return { nines: [] };
  }

  const HOUSE_MAP = {
    1: 'smoulders', 2: 'darktide', 3: 'stonebark', 4: 'ashenvale',
    5: 'stormrage', 6: 'nighthollow', 7: 'dawnbringer', 8: 'manastorm', 9: 'plaguemire'
  };

  const nines = deployments.map(d => {
    const nine = d.nine || {};
    const player = d.player || {};
    return {
      id: d.player_id,
      name: nine.name || player.twitter_handle || 'Unknown',
      house: HOUSE_MAP[nine.house_id] || 'smoulders',
      guild_name: d.guild_tag || 'Lone Wolf',
      guild_id: d.guild_tag,
      current_hp: d.current_hp || nine.base_hp || 10,
      max_hp: d.max_hp || nine.base_hp || 10,
      alive: (d.current_hp || 10) > 0,
      stats: {
        atk: nine.base_atk || 0,
        hp: nine.base_hp || 0,
        spd: nine.base_spd || 0,
        def: nine.base_def || 0,
        luck: nine.base_luck || 0,
      },
      is_mercenary: d.is_mercenary || false,
      equipped_images: nine.equipped_images || {},
    };
  });

  return { nines };
}

module.exports = setupArenaSocket;