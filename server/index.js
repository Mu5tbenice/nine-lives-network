require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server (needed for Socket.io)
const server = http.createServer(app);

// Socket.io setup
let io = null;
try {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });
  console.log("✅ Socket.io initialized");
} catch (e) {
  console.log("⚠️ Socket.io not installed — duels will use REST only");
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.static('public', { 
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }
}));

// Load routes with error handling
try {
  const authRoutes = require("./routes/auth");
  app.use("/auth", authRoutes);
  console.log("✅ Auth routes loaded");
} catch (e) {
  console.error("❌ Failed to load auth routes:", e.message);
}

// V3 routes
try {
  const ninesRoutes = require('./routes/nines');
  app.use('/api/nines', ninesRoutes);
  console.log("✅ Nines routes loaded");
} catch (e) {
  console.error("❌ Failed to load nines routes:", e.message);
}

try {
  const manaRoutes = require('./routes/mana');
  app.use('/api/mana', manaRoutes);
  console.log("✅ Mana routes loaded");
} catch (e) {
  console.error("❌ Failed to load mana routes:", e.message);
}

try {
  const craftingRoutes = require('./routes/crafting');
  app.use('/api/crafting', craftingRoutes);
  console.log("✅ Crafting routes loaded");
} catch (e) {
  console.error("❌ Failed to load crafting routes:", e.message);
}

try {
  const zonesRoutes = require('./routes/zones');
  app.use('/api/zones', zonesRoutes);
  console.log("✅ Zones routes loaded");
} catch (e) {
  console.error("❌ Failed to load zones routes:", e.message);
}

try {
  const gauntletRoutes = require('./routes/gauntlet');
  app.use('/api/gauntlet', gauntletRoutes);
  console.log("✅ Gauntlet routes loaded");
} catch (e) {
  console.error("❌ Failed to load gauntlet routes:", e.message);
}

try {
  const bossRoutes = require('./routes/boss');
  app.use('/api/boss', bossRoutes);
  console.log("✅ Boss routes loaded");
} catch (e) {
  console.error("❌ Failed to load boss routes:", e.message);
}

try {
  const playerRoutes = require("./routes/players");
  app.use("/api/players", playerRoutes);
  console.log("✅ Player routes loaded");
} catch (e) {
  console.error("❌ Failed to load player routes:", e.message);
}

try {
  const territoryRoutes = require("./routes/territory");
  app.use("/api/territory", territoryRoutes);
  console.log("✅ Territory routes loaded");
} catch (e) {
  console.error("❌ Failed to load territory routes:", e.message);
}

try {
  const duelRoutes = require("./routes/duels");
  app.use("/api/duels", duelRoutes);
  // Wire up Socket.io for real-time duels
  if (io && duelRoutes.setupDuelSockets) {
    duelRoutes.setupDuelSockets(io);
  }
  console.log("✅ Duel routes loaded");
} catch (e) {
  console.error("❌ Failed to load duel routes:", e.message);
}

try {
  const mapRoutes = require("./routes/map");
  app.use("/api/map", mapRoutes);
  console.log("✅ Map routes loaded");
} catch (e) {
  console.error("❌ Failed to load map routes:", e.message);
}

try {
  const leaderboardRoutes = require("./routes/leaderboards");
  app.use("/api/leaderboards", leaderboardRoutes);
  console.log("✅ Leaderboard routes loaded");
} catch (e) {
  console.error("❌ Failed to load leaderboard routes:", e.message);
}

try {
  const adminRoutes = require("./routes/admin");
  app.use("/api/admin", adminRoutes);
  console.log("✅ Admin routes loaded");
} catch (e) {
  console.error("❌ Failed to load admin routes:", e.message);
}

try {
  const spellRoutes = require("./routes/spells");
  app.use("/api/spells", spellRoutes);
  console.log("✅ Spell routes loaded");
} catch (e) {
  console.error("❌ Failed to load spell routes:", e.message);
}

try {
  const clashesRoutes = require("./routes/clashes");
  app.use("/api/clashes", clashesRoutes);
  console.log("✅ Clashes routes loaded");
} catch (e) {
  console.error("❌ Failed to load clashes routes:", e.message);
}

try {
  const packsRoutes = require("./routes/packs");
  app.use("/api/packs", packsRoutes);
  console.log("✅ Packs routes loaded");
} catch (e) {
  console.error("❌ Failed to load packs routes:", e.message);
}

// Sorting Hat — FIXED: was accidentally nesting items inside this try block
try {
  const sortingHatRoutes = require("./routes/sortingHat");
  app.use("/api/sorting-hat", sortingHatRoutes);
  console.log("✅ Sorting Hat routes loaded");
} catch (e) {
  console.error("❌ Failed to load sorting hat routes:", e.message);
}

// Items — FIXED: now its own try/catch, no longer nested or duplicated
try {
  const itemsRoutes = require("./routes/items");
  app.use("/api/items", itemsRoutes);
  console.log("✅ Items routes loaded");
} catch (e) {
  console.error("❌ Failed to load items routes:", e.message);
}

try {
  const questRoutes = require("./routes/quests");
  app.use("/api/quests", questRoutes);
  console.log("✅ Quest routes loaded");
} catch (e) {
  console.error("❌ Failed to load quest routes:", e.message);
}

// ── COMBAT ENGINE ──
let combatEngine = null;
try {
  combatEngine = require("./services/combatEngine");
  console.log("✅ Combat engine loaded");
} catch (e) {
  console.error("❌ Failed to load combat engine:", e.message);
}

// ── ARENA SOCKET NAMESPACE ──
if (io) {
  const arenaNamespace = io.of('/arena');

  arenaNamespace.on('connection', (socket) => {
    console.log('⚔️ Arena client connected:', socket.id);

    socket.on('join_zone', (data) => {
      const zoneId = data.zoneId || data.zone_id;
      if (!zoneId) return;

      const room = `zone_${zoneId}`;
      socket.join(room);
      console.log(`⚔️ ${socket.id} joined ${room}`);

      // Send initial state with countdown timing
      socket.emit('arena:state', {
        active: true,
        cycle: combatEngine ? (combatEngine._zoneCycles?.[zoneId] || 0) : 0,
        next_cycle_at: combatEngine?.getNextCycleAt ? combatEngine.getNextCycleAt() : (Date.now() + 5 * 60 * 1000),
        cycle_interval_ms: combatEngine?.getCycleIntervalMs ? combatEngine.getCycleIntervalMs() : (5 * 60 * 1000),
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
    socket.on('chat:send', (data) => {
      const zoneId = data.zoneId || data.zone_id;
      if (!zoneId || !data.message) return;
      const safeMsg = String(data.message).slice(0, 200).replace(/<[^>]*>/g, '');
      const handle = String(data.handle || 'Anon').slice(0, 32).replace(/<[^>]*>/g, '');
      const guildTag = String(data.guildTag || '').slice(0, 16).replace(/<[^>]*>/g, '');
      arenaNamespace.to(`zone_${zoneId}`).emit('chat:message', {
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
    _broadcastToZone: function(zoneId, event, data) {
      arenaNamespace.to(`zone_${zoneId}`).emit(event, data);
    }
  };

  console.log("✅ Arena socket namespace ready");
}

// ── COMBAT TIMER ROUTE ──
app.get('/api/combat/next-cycle', (req, res) => {
  try {
    res.json({
      next_cycle_at: combatEngine?.getNextCycleAt ? combatEngine.getNextCycleAt() : (Date.now() + 5 * 60 * 1000),
      cycle_interval_ms: combatEngine?.getCycleIntervalMs ? combatEngine.getCycleIntervalMs() : (5 * 60 * 1000),
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

// ── START COMBAT ENGINE ──
if (combatEngine && combatEngine.startCombatEngine) {
  combatEngine.startCombatEngine();
  console.log("⚔️ Combat engine started — V6 wave combat, 30s buffer");
}
// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── STREAK PING ──
// Called by dashboard on load. Updates login streak.
// streak=0→1 first visit, +=1 if last login was yesterday, reset to 1 if gap >1 day
app.post("/api/players/:id/streak-ping", async (req, res) => {
  const supabase = require("./config/supabase");
  const { createClient } = require("@supabase/supabase-js");
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  try {
    const playerId = parseInt(req.params.id);
    const { data: player, error } = await supabaseAdmin
      .from("players")
      .select("streak, last_login")
      .eq("id", playerId)
      .single();

    if (error || !player) return res.status(404).json({ error: "Player not found" });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const lastLogin = player.last_login ? new Date(player.last_login) : null;
    const lastLoginStr = lastLogin ? lastLogin.toISOString().slice(0, 10) : null;

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
      .from("players")
      .update({ streak: newStreak, last_login: now.toISOString() })
      .eq("id", playerId);

    res.json({ streak: newStreak, updated: true });
  } catch (err) {
    console.error("Streak ping error:", err.message);
    res.status(500).json({ error: "Failed to update streak" });
  }
});

// Redirect old world.html to map.html
app.get("/world.html", (req, res) => res.redirect("/map.html"));

// Start scheduler for automated tasks
try {
  const scheduler = require("./services/scheduler");
  console.log("✅ Scheduler loaded");
} catch (e) {
  console.error("❌ Failed to load scheduler:", e.message);
}

// Serve index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Start server (use `server` instead of `app` for Socket.io)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🐱 Nine Lives Network server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  if (io) console.log(`⚔️ Real-time duels + arena active (Socket.io)`);
});

module.exports = app;