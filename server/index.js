require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const {
  captureBootFailure,
  getBootFailures,
} = require('./services/bootFailures');
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server (needed for Socket.io)
const server = http.createServer(app);

// Socket.io setup
let io = null;
try {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  console.log('✅ Socket.io initialized');
} catch (e) {
  console.log('⚠️ Socket.io not installed — duels will use REST only');
  captureBootFailure('socket.io', e);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(
  express.static('public', {
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    },
  }),
);

// Load routes with error handling
try {
  const authRoutes = require('./routes/auth');
  app.use('/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (e) {
  console.error('❌ Failed to load auth routes:', e.message);
  captureBootFailure('./routes/auth', e);
}

// V3 routes
try {
  const ninesRoutes = require('./routes/nines');
  app.use('/api/nines', ninesRoutes);
  console.log('✅ Nines routes loaded');
} catch (e) {
  console.error('❌ Failed to load nines routes:', e.message);
  captureBootFailure('./routes/nines', e);
}

try {
  const craftingRoutes = require('./routes/crafting');
  app.use('/api/crafting', craftingRoutes);
  console.log('✅ Crafting routes loaded');
} catch (e) {
  console.error('❌ Failed to load crafting routes:', e.message);
  captureBootFailure('./routes/crafting', e);
}

try {
  const zonesRoutes = require('./routes/zones');
  app.use('/api/zones', zonesRoutes);
  console.log('✅ Zones routes loaded');
} catch (e) {
  console.error('❌ Failed to load zones routes:', e.message);
  captureBootFailure('./routes/zones', e);
}

try {
  const gauntletRoutes = require('./routes/gauntlet');
  app.use('/api/gauntlet', gauntletRoutes);
  console.log('✅ Gauntlet routes loaded');
} catch (e) {
  console.error('❌ Failed to load gauntlet routes:', e.message);
  captureBootFailure('./routes/gauntlet', e);
}

try {
  const bossRoutes = require('./routes/boss');
  app.use('/api/boss', bossRoutes);
  console.log('✅ Boss routes loaded');
} catch (e) {
  console.error('❌ Failed to load boss routes:', e.message);
  captureBootFailure('./routes/boss', e);
}

try {
  const playerRoutes = require('./routes/players');
  app.use('/api/players', playerRoutes);
  console.log('✅ Player routes loaded');
} catch (e) {
  console.error('❌ Failed to load player routes:', e.message);
  captureBootFailure('./routes/players', e);
}

try {
  const territoryRoutes = require('./routes/territory');
  app.use('/api/territory', territoryRoutes);
  console.log('✅ Territory routes loaded');
} catch (e) {
  console.error('❌ Failed to load territory routes:', e.message);
  captureBootFailure('./routes/territory', e);
}

try {
  const duelRoutes = require('./routes/duels');
  app.use('/api/duels', duelRoutes);
  // Wire up Socket.io for real-time duels
  if (io && duelRoutes.setupDuelSockets) {
    duelRoutes.setupDuelSockets(io);
  }
  console.log('✅ Duel routes loaded');
} catch (e) {
  console.error('❌ Failed to load duel routes:', e.message);
  captureBootFailure('./routes/duels', e);
}

try {
  const mapRoutes = require('./routes/map');
  app.use('/api/map', mapRoutes);
  console.log('✅ Map routes loaded');
} catch (e) {
  console.error('❌ Failed to load map routes:', e.message);
  captureBootFailure('./routes/map', e);
}

try {
  const leaderboardRoutes = require('./routes/leaderboards');
  app.use('/api/leaderboards', leaderboardRoutes);
  console.log('✅ Leaderboard routes loaded');
} catch (e) {
  console.error('❌ Failed to load leaderboard routes:', e.message);
  captureBootFailure('./routes/leaderboards', e);
}

try {
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes loaded');
} catch (e) {
  console.error('❌ Failed to load admin routes:', e.message);
  captureBootFailure('./routes/admin', e);
}

try {
  const spellRoutes = require('./routes/spells');
  app.use('/api/spells', spellRoutes);
  console.log('✅ Spell routes loaded');
} catch (e) {
  console.error('❌ Failed to load spell routes:', e.message);
  captureBootFailure('./routes/spells', e);
}

try {
  const clashesRoutes = require('./routes/clashes');
  app.use('/api/clashes', clashesRoutes);
  console.log('✅ Clashes routes loaded');
} catch (e) {
  console.error('❌ Failed to load clashes routes:', e.message);
  captureBootFailure('./routes/clashes', e);
}

try {
  const packsRoutes = require('./routes/packs');
  app.use('/api/packs', packsRoutes);
  console.log('✅ Packs routes loaded');
} catch (e) {
  console.error('❌ Failed to load packs routes:', e.message);
  captureBootFailure('./routes/packs', e);
}

// Sorting Hat — FIXED: was accidentally nesting items inside this try block
try {
  const sortingHatRoutes = require('./routes/sortingHat');
  app.use('/api/sorting-hat', sortingHatRoutes);
  console.log('✅ Sorting Hat routes loaded');
} catch (e) {
  console.error('❌ Failed to load sorting hat routes:', e.message);
  captureBootFailure('./routes/sortingHat', e);
}

// Items — FIXED: now its own try/catch, no longer nested or duplicated
try {
  const itemsRoutes = require('./routes/items');
  app.use('/api/items', itemsRoutes);
  console.log('✅ Items routes loaded');
} catch (e) {
  console.error('❌ Failed to load items routes:', e.message);
  captureBootFailure('./routes/items', e);
}

try {
  const questRoutes = require('./routes/quests');
  app.use('/api/quests', questRoutes);
  console.log('✅ Quest routes loaded');
} catch (e) {
  console.error('❌ Failed to load quest routes:', e.message);
  captureBootFailure('./routes/quests', e);
}

// ── COMBAT ENGINE ──
let combatEngine = null;
try {
  combatEngine = require('./services/combatEngine');
  console.log('✅ Combat engine loaded');
} catch (e) {
  console.error('❌ Failed to load combat engine:', e.message);
  captureBootFailure('./services/combatEngine', e);
}

// ── ARENA SOCKET NAMESPACE ──
if (io) {
  const arenaNamespace = io.of('/arena');

  arenaNamespace.on('connection', (socket) => {
    console.log('⚔️ Arena client connected:', socket.id);

    // Auto-join zone from query string (e.g. /arena?zoneId=15)
    const qZone = socket.handshake.query?.zoneId;
    if (qZone) {
      socket.join(`zone_${qZone}`);
      console.log(`⚔️ ${socket.id} auto-joined zone_${qZone}`);
    }

    socket.on('join_zone', (data) => {
      const zoneId = data.zoneId || data.zone_id;
      if (!zoneId) return;
      const room = `zone_${zoneId}`;
      socket.join(room);
      console.log(`⚔️ ${socket.id} joined ${room}`);

      // Send initial state with countdown timing
      socket.emit('arena:state', {
        active: true,
        cycle: combatEngine ? combatEngine._zoneCycles?.[zoneId] || 0 : 0,
        next_cycle_at: combatEngine?.getNextCycleAt
          ? combatEngine.getNextCycleAt()
          : Date.now() + 5 * 60 * 1000,
        cycle_interval_ms: combatEngine?.getCycleIntervalMs
          ? combatEngine.getCycleIntervalMs()
          : 5 * 60 * 1000,
      });
    });

    socket.on('leave_zone', (data) => {
      const zoneId = data.zoneId || data.zone_id;
      if (zoneId) {
        socket.leave(`zone_${zoneId}`);
        console.log(`⚔️ ${socket.id} left zone_${zoneId}`);
      }
    });

    // ── ZONE CHAT ──
    // §9.61: listen + emit `zone:chat` to match the client's event name
    // (client uses one symmetric name for both directions). Previously
    // server used `chat:send` inbound + `chat:message` outbound, which the
    // client didn't know about — chat was silently broken both ways.
    socket.on('zone:chat', (data) => {
      const zoneId = data.zoneId || data.zone_id;
      if (!zoneId || !data.message) return;
      const safeMsg = String(data.message)
        .slice(0, 200)
        .replace(/<[^>]*>/g, '');
      const handle = String(data.handle || 'Anon')
        .slice(0, 32)
        .replace(/<[^>]*>/g, '');
      const guildTag = String(data.guildTag || '')
        .slice(0, 16)
        .replace(/<[^>]*>/g, '');
      arenaNamespace.to(`zone_${zoneId}`).emit('zone:chat', {
        handle,
        guildTag,
        message: safeMsg,
        playerId: data.playerId || null,
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      console.log('⚔️ Arena client disconnected:', socket.id);
    });
  });

  // Set up global broadcast function so combat engine can send events
  global.__arenaSocket = {
    _broadcastToZone: function (zoneId, event, data) {
      // §9.32: arena:positions fires every tick (~6 Hz per zone) — gate
      // the log behind DEBUG_BROADCASTS=1 so steady-state logs aren't flooded
      if (event === 'arena:positions' && process.env.DEBUG_BROADCASTS === '1')
        console.log(
          `📡 ${event} → zone_${zoneId}, nines: ${data?.nines?.length}`,
        );
      arenaNamespace.to(`zone_${zoneId}`).emit(event, data);
    },
  };

  console.log('✅ Arena socket namespace ready');
}

// ── COMBAT TIMER ROUTE ──
app.get('/api/combat/next-cycle', (req, res) => {
  try {
    res.json({
      next_cycle_at: combatEngine?.getNextCycleAt
        ? combatEngine.getNextCycleAt()
        : Date.now() + 5 * 60 * 1000,
      cycle_interval_ms: combatEngine?.getCycleIntervalMs
        ? combatEngine.getCycleIntervalMs()
        : 5 * 60 * 1000,
      server_time: Date.now(),
    });
  } catch (e) {
    res.json({
      next_cycle_at: Date.now() + 5 * 60 * 1000,
      cycle_interval_ms: 5 * 60 * 1000,
      server_time: Date.now(),
    });
  }
});

// ── V3 SNAPSHOT TIMER ALIAS ──
app.get('/api/combat/next-snapshot', (req, res) => {
  try {
    res.json({
      next_snapshot_at: combatEngine?.getNextCycleAt
        ? combatEngine.getNextCycleAt()
        : Date.now() + 15 * 60 * 1000,
      snapshot_interval_ms: combatEngine?.getCycleIntervalMs
        ? combatEngine.getCycleIntervalMs()
        : 15 * 60 * 1000,
      server_time: Date.now(),
    });
  } catch (e) {
    res.json({
      next_snapshot_at: Date.now() + 15 * 60 * 1000,
      server_time: Date.now(),
    });
  }
});

// ── START COMBAT ENGINE ──
if (combatEngine && combatEngine.startCombatEngine) {
  combatEngine.startCombatEngine();
}
// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    failed_requires: getBootFailures(),
  });
});

// ── STREAK PING ──
// Called by dashboard on load. Updates login streak.
// streak=0→1 first visit, +=1 if last login was yesterday, reset to 1 if gap >1 day
app.post('/api/players/:id/streak-ping', async (req, res) => {
  const supabase = require('./config/supabase');
  const { createClient } = require('@supabase/supabase-js');
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  try {
    const playerId = parseInt(req.params.id);
    const { data: player, error } = await supabaseAdmin
      .from('players')
      .select('streak, last_login')
      .eq('id', playerId)
      .single();

    if (error || !player)
      return res.status(404).json({ error: 'Player not found' });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const lastLogin = player.last_login ? new Date(player.last_login) : null;
    const lastLoginStr = lastLogin
      ? lastLogin.toISOString().slice(0, 10)
      : null;

    if (lastLoginStr === todayStr) {
      return res.json({ streak: player.streak, updated: false });
    }

    let newStreak;
    if (!lastLoginStr) {
      newStreak = 1;
    } else {
      const daysDiff = Math.round((now - lastLogin) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        newStreak = (player.streak || 0) + 1;
      } else {
        newStreak = 1;
      }
    }

    await supabaseAdmin
      .from('players')
      .update({ streak: newStreak, last_login: now.toISOString() })
      .eq('id', playerId);

    res.json({ streak: newStreak, updated: true });
  } catch (err) {
    console.error('Streak ping error:', err.message);
    res.status(500).json({ error: 'Failed to update streak' });
  }
});

// Redirect old world.html to map.html
app.get('/world.html', (req, res) => res.redirect('/map.html'));

// Start scheduler for automated tasks
try {
  const scheduler = require('./services/scheduler');
  console.log('✅ Scheduler loaded');
} catch (e) {
  console.error('❌ Failed to load scheduler:', e.message);
  captureBootFailure('./services/scheduler', e);
}

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server (use `server` instead of `app` for Socket.io)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🐱 Nine Lives Network server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  if (io) console.log(`⚔️ Real-time duels + arena active (Socket.io)`);
});

app.get('/api/debug/engine/:zoneId', (req, res) => {
  const zoneState = combatEngine?.getZoneState
    ? combatEngine.getZoneState(req.params.zoneId)
    : null;
  if (!zoneState)
    return res.json({ error: 'No zone state', zone: req.params.zoneId });
  const nines = Array.from(zoneState.nines.values()).map((n) => ({
    name: n.playerName,
    house: n.houseKey,
    cards: n.cards.length,
    cardNames: n.cards.map((c) => c.name),
    hp: n.hp,
  }));
  res.json({ tick: zoneState.tick, nines });
});

app.get('/api/debug/cards/:deploymentId', async (req, res) => {
  const { createClient } = require('@supabase/supabase-js');
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const depId = parseInt(req.params.deploymentId);

  const { data: slots, error: e1 } = await admin
    .from('zone_card_slots')
    .select('slot_number, card_id')
    .eq('deployment_id', depId)
    .eq('is_active', true);

  const cardIds = (slots || []).map((s) => s.card_id).filter(Boolean);

  const { data: playerCards, error: e2 } = await admin
    .from('player_cards')
    .select('id, spell_id')
    .in('id', cardIds.length ? cardIds : [0]);

  const spellIds = (playerCards || []).map((c) => c.spell_id).filter(Boolean);

  const { data: spells, error: e3 } = await admin
    .from('spells')
    .select('id, name, effect_1, card_type')
    .in('id', spellIds.length ? spellIds : [0]);

  res.json({
    depId,
    slots,
    e1: e1?.message,
    cardIds,
    playerCards,
    e2: e2?.message,
    spellIds,
    spells,
    e3: e3?.message,
  });
});

module.exports = app;
