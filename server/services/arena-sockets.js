/**
 * ARENA SOCKETS — Nine Lives Network V5
 * 
 * Wires the ArenaManager to Socket.io so clients
 * can watch live zone battles and deploy/withdraw.
 * 
 * Usage in server/index.js:
 *   const { setupArenaSockets } = require('./services/arena-sockets');
 *   const arenaManager = setupArenaSockets(io);
 */

const { ArenaManager } = require('./arena-engine');
const { NermEngine } = require('./nerm-engine');

function setupArenaSockets(io) {
  const arenaManager = new ArenaManager(io);
  const nerm = new NermEngine();

  // Arena namespace
  const arenaIO = io.of('/arena');

  arenaIO.on('connection', (socket) => {
    console.log(`👁️ Arena spectator connected: ${socket.id}`);

    // --- JOIN A ZONE (spectate or play) ---
    socket.on('join_zone', (data) => {
      const { zoneId } = data;
      if (!zoneId) return;

      // Leave any previous zone room
      for (const room of socket.rooms) {
        if (room.startsWith('zone_')) socket.leave(room);
      }

      // Join the zone room
      const room = `zone_${zoneId}`;
      socket.join(room);

      // Send current arena state
      const status = arenaManager.getStatus(zoneId);
      socket.emit('arena:state', status);

      console.log(`👁️ ${socket.id} watching zone ${zoneId} (${status.nines} nines)`);
    });

    // --- LEAVE A ZONE ---
    socket.on('leave_zone', (data) => {
      const { zoneId } = data;
      if (zoneId) socket.leave(`zone_${zoneId}`);
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
      console.log(`👁️ Arena spectator disconnected: ${socket.id}`);
    });
  });

  // --- HOOK NERM INTO ARENA EVENTS ---
  // Override the Arena emit to also check Nerm
  const originalArenaClass = arenaManager.constructor;

  // Patch arena event emission to include Nerm commentary
  const patchArena = (arena) => {
    const originalEmit = arena.emit.bind(arena);

    arena.emit = (event, data) => {
      // Send the original event
      originalEmit(event, data);

      // Check if Nerm has something to say
      if (event === 'arena:events' && data.events) {
        const snapshot = arena.getNinesSnapshot();
        const nermComment = nerm.processEvents(data.events, snapshot);
        if (nermComment) {
          originalEmit('arena:nerm', nermComment);
        }
      }

      // Round start commentary
      if (event === 'arena:round_start') {
        const comment = nerm.onRoundStart(data.round_number);
        if (comment) {
          setTimeout(() => originalEmit('arena:nerm', comment), 1500);
        }
      }

      // Round end commentary
      if (event === 'arena:round_end') {
        const wasClose = Object.values(data.guild_scores).filter(hp => hp > 0).length > 1;
        const winnerName = data.winner_guild || 'Nobody';
        const comment = nerm.onRoundEnd(data.round_number, winnerName, wasClose);
        if (comment) {
          setTimeout(() => originalEmit('arena:nerm', comment), 1000);
        }
      }

      // Cycle end commentary
      if (event === 'arena:cycle_end') {
        const comment = nerm.onCycleEnd('the winners', `Zone ${arena.zoneId}`);
        if (comment) {
          setTimeout(() => originalEmit('arena:nerm', comment), 2000);
        }
      }
    };
  };

  // Patch getArena to auto-patch new arenas
  const originalGetArena = arenaManager.getArena.bind(arenaManager);
  arenaManager.getArena = (zoneId) => {
    const isNew = !arenaManager.arenas.has(zoneId);
    const arena = originalGetArena(zoneId);
    if (isNew) patchArena(arena);
    return arena;
  };

  console.log('⚔️ Arena sockets initialized');
  return arenaManager;
}

module.exports = { setupArenaSockets };