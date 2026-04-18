// ═══════════════════════════════════════════════════════
// server/routes/duels.js
// V3 Quick Duels — REST endpoints + Socket.io events
//
// REST (for starting/viewing):
//   POST /api/duels/challenge
//   POST /api/duels/accept
//   POST /api/duels/decline
//   POST /api/duels/submit-card
//   GET  /api/duels/active/:playerId
//   GET  /api/duels/pending/:playerId
//   GET  /api/duels/history/:playerId
//
// Socket.io events are handled in setupDuelSockets()
// which gets called from index.js after server starts
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const duelEngine = require('../services/duelEngine');
const { addXP, XP_REWARDS } = require('../services/xp-engine');

// ── POST /api/duels/challenge ──
// Body: { challenger_id, opponent_id }
router.post('/challenge', async (req, res) => {
  try {
    const { challenger_id, opponent_id } = req.body;
    if (!challenger_id || !opponent_id) {
      return res
        .status(400)
        .json({ error: 'challenger_id and opponent_id required' });
    }
    const result = await duelEngine.createChallenge(challenger_id, opponent_id);
    res.json(result);
  } catch (err) {
    console.error('Challenge error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/duels/accept ──
// Body: { challenge_id, player_id }
router.post('/accept', async (req, res) => {
  try {
    const { challenge_id, player_id } = req.body;
    if (!challenge_id || !player_id) {
      return res
        .status(400)
        .json({ error: 'challenge_id and player_id required' });
    }
    const result = await duelEngine.acceptChallenge(challenge_id, player_id);
    res.json(result);
  } catch (err) {
    console.error('Accept error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/duels/decline ──
// Body: { challenge_id, player_id }
router.post('/decline', async (req, res) => {
  try {
    const { challenge_id, player_id } = req.body;
    const result = duelEngine.declineChallenge(challenge_id, player_id);
    res.json(result);
  } catch (err) {
    console.error('Decline error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/duels/submit-card ──
// Body: { duel_id, player_id, card_id }
router.post('/submit-card', async (req, res) => {
  try {
    const { duel_id, player_id, card_id } = req.body;
    if (!duel_id || !player_id || !card_id) {
      return res
        .status(400)
        .json({ error: 'duel_id, player_id, and card_id required' });
    }
    const result = await duelEngine.submitCard(duel_id, player_id, card_id);

    // V5: Award XP when duel completes
    if (result && result.winner_id) {
      await addXP(result.winner_id, XP_REWARDS.duel_win, 'duel_win').catch(
        () => {},
      );
      const loserId =
        result.winner_id === result.challenger_id
          ? result.opponent_id
          : result.challenger_id;
      if (loserId)
        await addXP(loserId, XP_REWARDS.duel_lose, 'duel_lose').catch(() => {});
    }

    res.json(result);
  } catch (err) {
    console.error('Submit card error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/duels/active/:playerId ──
router.get('/active/:playerId', (req, res) => {
  try {
    const duel = duelEngine.getActiveDuel(parseInt(req.params.playerId));
    res.json({ active: !!duel, duel: duel || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/duels/pending/:playerId ──
router.get('/pending/:playerId', (req, res) => {
  try {
    const challenges = duelEngine.getPendingChallenges(
      parseInt(req.params.playerId),
    );
    res.json({ challenges });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/duels/history/:playerId ──
router.get('/history/:playerId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await duelEngine.getDuelHistory(
      parseInt(req.params.playerId),
      limit,
    );
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
// Socket.io setup — call from index.js
// ═══════════════════════════════════════════
function setupDuelSockets(io) {
  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    // Player identifies themselves
    socket.on('duel:register', (data) => {
      if (data && data.player_id) {
        duelEngine.registerSocket(data.player_id, socket);
        console.log(`⚔️ Player ${data.player_id} registered for duels`);
      }
    });

    // Player submits a card via socket (alternative to REST)
    socket.on('duel:submit_card', async (data) => {
      if (data && data.duel_id && data.player_id && data.card_id) {
        const result = await duelEngine.submitCard(
          data.duel_id,
          data.player_id,
          data.card_id,
        );
        socket.emit('duel:card_submitted', result);
      }
    });

    // Challenge via socket
    socket.on('duel:challenge', async (data) => {
      if (data && data.challenger_id && data.opponent_id) {
        const result = await duelEngine.createChallenge(
          data.challenger_id,
          data.opponent_id,
        );
        socket.emit('duel:challenge_sent', result);
      }
    });

    // Accept via socket
    socket.on('duel:accept', async (data) => {
      if (data && data.challenge_id && data.player_id) {
        const result = await duelEngine.acceptChallenge(
          data.challenge_id,
          data.player_id,
        );
        socket.emit('duel:accepted', result);
      }
    });

    // Decline via socket
    socket.on('duel:decline', (data) => {
      if (data && data.challenge_id && data.player_id) {
        const result = duelEngine.declineChallenge(
          data.challenge_id,
          data.player_id,
        );
        socket.emit('duel:declined_ack', result);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      // Find which player this socket belongs to and unregister
      // (handled by checking all registered sockets)
      console.log('🔌 Socket disconnected:', socket.id);
    });
  });

  console.log('⚔️ Duel socket handlers registered');
}

module.exports = router;
module.exports.setupDuelSockets = setupDuelSockets;
