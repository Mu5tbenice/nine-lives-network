// ═══════════════════════════════════════════════════════
// server/routes/duels.js
// Duel V2 — Lobby Team Battles (1v1, 3v3, 5v5)
//
// REST:
//   POST /api/duels/create          — Create a lobby
//   POST /api/duels/join            — Join a lobby team
//   POST /api/duels/leave           — Leave a lobby
//   POST /api/duels/pick-cards      — Pick your 3 cards
//   POST /api/duels/start           — Start the fight
//   GET  /api/duels/lobbies         — List open lobbies
//   GET  /api/duels/lobby/:lobbyId  — Get lobby state
//   GET  /api/duels/history/:playerId — Duel history
//   GET  /api/duels/elo/:playerId   — Get Elo rating
//
// Socket.io: /duels namespace for real-time lobby + fight events
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const duelEngine = require('../services/duelEngine');

// ── POST /api/duels/create ──
// Body: { player_id, mode: '1v1' | '3v3' | '5v5', team: 'A' | 'B' }
router.post('/create', async (req, res) => {
  try {
    const { player_id, mode, team } = req.body;
    if (!player_id || !mode) {
      return res.status(400).json({ error: 'player_id and mode required' });
    }

    const result = await duelEngine.createLobby(player_id, mode);
    if (result.error) return res.status(400).json(result);

    // Auto-join creator to their chosen team (default A)
    const joinResult = await duelEngine.joinLobby(result.lobby.id, player_id, team || 'A');
    if (joinResult.error) return res.status(400).json(joinResult);

    // Broadcast to socket
    broadcastLobbyUpdate(result.lobby.id);

    res.json({
      success: true,
      lobby: joinResult.lobby,
      message: `${duelEngine.MODES[mode].label} lobby created! Share the lobby ID for others to join.`,
    });
  } catch (err) {
    console.error('Create lobby error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/duels/join ──
// Body: { player_id, lobby_id, team: 'A' | 'B' }
router.post('/join', async (req, res) => {
  try {
    const { player_id, lobby_id, team } = req.body;
    if (!player_id || !lobby_id || !team) {
      return res.status(400).json({ error: 'player_id, lobby_id, and team required' });
    }

    const result = await duelEngine.joinLobby(lobby_id, player_id, team);
    if (result.error) return res.status(400).json(result);

    broadcastLobbyUpdate(lobby_id);

    res.json(result);
  } catch (err) {
    console.error('Join lobby error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/duels/leave ──
// Body: { player_id }
router.post('/leave', async (req, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) return res.status(400).json({ error: 'player_id required' });

    const lobbyId = duelEngine.playerLobby.get(player_id);
    const result = duelEngine.leaveLobby(player_id);
    if (result.error) return res.status(400).json(result);

    if (lobbyId) broadcastLobbyUpdate(lobbyId);

    res.json(result);
  } catch (err) {
    console.error('Leave lobby error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/duels/pick-cards ──
// Body: { player_id, lobby_id, card_ids: [id1, id2, id3] }
router.post('/pick-cards', async (req, res) => {
  try {
    const { player_id, lobby_id, card_ids } = req.body;
    if (!player_id || !lobby_id || !card_ids) {
      return res.status(400).json({ error: 'player_id, lobby_id, and card_ids required' });
    }

    const result = await duelEngine.pickCards(lobby_id, player_id, card_ids);
    if (result.error) return res.status(400).json(result);

    broadcastLobbyUpdate(lobby_id);

    // If all ready, notify via socket
    if (result.allReady) {
      broadcastToLobby(lobby_id, 'duel:all_ready', { lobby_id });
    }

    res.json(result);
  } catch (err) {
    console.error('Pick cards error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/duels/start ──
// Body: { lobby_id }
// Only works when all players have picked cards
router.post('/start', async (req, res) => {
  try {
    const { lobby_id } = req.body;
    if (!lobby_id) return res.status(400).json({ error: 'lobby_id required' });

    const result = await duelEngine.startFight(lobby_id);
    if (result.error) return res.status(400).json(result);

    // Broadcast fight result to all connected viewers
    broadcastToLobby(lobby_id, 'duel:fight_result', {
      duelId: result.duelId,
      mode: result.mode,
      winner: result.winner,
      isPerfect: result.isPerfect,
      durationMs: result.durationMs,
      results: result.results,
      fightLog: result.fightLog,
      finalState: result.finalState,
    });

    res.json(result);
  } catch (err) {
    console.error('Start fight error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/duels/lobbies ──
// List all open lobbies
router.get('/lobbies', (req, res) => {
  try {
    const open = duelEngine.listOpenLobbies();
    res.json({ lobbies: open, count: open.length });
  } catch (err) {
    console.error('List lobbies error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/duels/lobby/:lobbyId ──
// Get a specific lobby's state
router.get('/lobby/:lobbyId', (req, res) => {
  try {
    const lobby = duelEngine.lobbies.get(req.params.lobbyId);
    if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
    res.json({ lobby: lobby.toJSON() });
  } catch (err) {
    console.error('Get lobby error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/duels/my-lobby/:playerId ──
// Check if player is in a lobby
router.get('/my-lobby/:playerId', (req, res) => {
  try {
    const lobbyId = duelEngine.playerLobby.get(req.params.playerId);
    if (!lobbyId) return res.json({ inLobby: false });

    const lobby = duelEngine.lobbies.get(lobbyId);
    if (!lobby) return res.json({ inLobby: false });

    res.json({
      inLobby: true,
      lobby: lobby.toJSON(),
      team: lobby.getPlayerTeam(req.params.playerId),
    });
  } catch (err) {
    console.error('My lobby error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/duels/history/:playerId ──
// Get duel history for a player
router.get('/history/:playerId', async (req, res) => {
  try {
    const supabase = require('../config/supabase');
    const playerId = req.params.playerId;

    const { data, error } = await supabase
      .from('duel_history')
      .select('duel_id, mode, winner_team, is_perfect, team_a, team_b, duration_ms, results, created_at')
      .or(`team_a.cs.{${playerId}},team_b.cs.{${playerId}}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Duel history error:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    // Annotate each entry with this player's result
    const history = (data || []).map(d => {
      const isTeamA = (d.team_a || []).includes(playerId);
      const playerTeam = isTeamA ? 'A' : 'B';
      const won = d.winner_team === playerTeam;
      const playerResult = (d.results || []).find(r => r.playerId === playerId);

      return {
        duelId: d.duel_id,
        mode: d.mode,
        won,
        isPerfect: d.is_perfect && won,
        points: playerResult?.points || 0,
        durationMs: d.duration_ms,
        createdAt: d.created_at,
      };
    });

    res.json({ history, total: history.length });
  } catch (err) {
    console.error('Duel history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/duels/elo/:playerId ──
router.get('/elo/:playerId', async (req, res) => {
  try {
    const supabase = require('../config/supabase');
    const { data } = await supabase
      .from('players')
      .select('duel_elo')
      .eq('id', req.params.playerId)
      .single();

    res.json({ elo: data?.duel_elo || 1000 });
  } catch (err) {
    console.error('Elo fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// SOCKET.IO — Real-time lobby events
// ═══════════════════════════════════════════

let duelNamespace = null;

function setupDuelSockets(io) {
  duelNamespace = io.of('/duels');

  duelNamespace.on('connection', (socket) => {
    console.log('🎯 Duel client connected:', socket.id);

    // Join a lobby room for updates
    socket.on('join_lobby', (data) => {
      const lobbyId = data.lobbyId || data.lobby_id;
      if (lobbyId) {
        socket.join(`lobby_${lobbyId}`);
        console.log(`🎯 ${socket.id} watching lobby ${lobbyId}`);
      }
    });

    socket.on('leave_lobby', (data) => {
      const lobbyId = data.lobbyId || data.lobby_id;
      if (lobbyId) {
        socket.leave(`lobby_${lobbyId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('🎯 Duel client disconnected:', socket.id);
    });
  });

  console.log('🎯 Duel socket namespace ready');
}

// Broadcast helpers
function broadcastLobbyUpdate(lobbyId) {
  if (!duelNamespace) return;
  const lobby = duelEngine.lobbies.get(lobbyId);
  if (lobby) {
    duelNamespace.to(`lobby_${lobbyId}`).emit('duel:lobby_update', lobby.toJSON());
  }
}

function broadcastToLobby(lobbyId, event, data) {
  if (!duelNamespace) return;
  duelNamespace.to(`lobby_${lobbyId}`).emit(event, data);
}

// Attach socket setup to router for index.js to call
router.setupDuelSockets = setupDuelSockets;

module.exports = router;