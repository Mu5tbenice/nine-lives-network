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
  const chronicleRoutes = require("./routes/chronicle");
  app.use("/api/chronicle", chronicleRoutes);
  console.log("✅ Chronicle routes loaded");
} catch (e) {
  console.error("❌ Failed to load chronicle routes:", e.message);
}

try {
  const questsRoutes = require("./routes/quests");
  app.use("/api/quests", questsRoutes);
  console.log("✅ Quests routes loaded");
} catch (e) {
  console.error("❌ Failed to load quests routes:", e.message);
}

// Stats — V2 stat calculation API (house + cards + items)
try {
  const statsRoutes = require("./routes/stats");
  app.use("/api/stats", statsRoutes);
  console.log("✅ Stats routes loaded");
} catch (e) {
  console.error("❌ Failed to load stats routes:", e.message);
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
  const supabase = require('./config/supabase');
  const { ArenaManager } = require('./services/arena-engine');
  const arenaManager = new ArenaManager(io);
  const arenaNamespace = io.of('/arena');

  const HOUSE_MAP = {
    1: 'smoulders', 2: 'darktide', 3: 'stonebark', 4: 'ashenvale',
    5: 'stormrage', 6: 'nighthollow', 7: 'dawnbringer', 8: 'manastorm', 9: 'plaguemire',
  };

  async function loadArena(zoneId) {
    try {
      const { data: deployments, error } = await supabase
        .from('zone_deployments')
        .select(`*, player:player_id(twitter_handle, guild_tag, profile_image), nine:nine_id(name, base_atk, base_hp, base_spd, base_def, base_luck, house_id)`)
        .eq('zone_id', zoneId)
        .eq('is_active', true);
      if (error || !deployments || deployments.length === 0) return null;

      const deploymentIds = deployments.map(d => d.id);
      const { data: cardSlots } = await supabase
        .from('zone_card_slots')
        .select(`id, deployment_id, slot_number, sharpness, spell:spell_id(name, spell_type, rarity, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects)`)
        .in('deployment_id', deploymentIds)
        .eq('is_active', true);

      const cardsByDeployment = {};
      for (const slot of (cardSlots || [])) {
        if (!cardsByDeployment[slot.deployment_id]) cardsByDeployment[slot.deployment_id] = [];
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

      const arena = arenaManager.getArena(zoneId);
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
        });
        console.log(`⚔️ Loaded ${cards.length} cards for ${nine.name || player.twitter_handle}`);
      }

      if (!arena.isRunning && arena.nines.size >= 1) {
        arena.start();
        console.log(`⚔️ Zone ${zoneId}: Arena started with ${arena.nines.size} nines`);
      }
      return arena;
    } catch (err) {
      console.error('Arena load error:', err);
      return null;
    }
  }

  arenaNamespace.on('connection', (socket) => {
    console.log('⚔️ Arena client connected:', socket.id);

    socket.on('join_zone', async (data) => {
      const zoneId = parseInt(data.zoneId || data.zone_id);
      if (!zoneId) return;

      for (const room of socket.rooms) {
        if (room.startsWith('zone_')) socket.leave(room);
      }
      socket.join(`zone_${zoneId}`);
      console.log(`⚔️ ${socket.id} joined zone_${zoneId}`);

      // Reload arena if not running
      let arena = arenaManager.arenas.get(zoneId);
      if (!arena || !arena.isRunning) {
        if (arena && !arena.isRunning) {
          arena.stop();
          arenaManager.arenas.delete(zoneId);
        }
        arena = await loadArena(zoneId);
      }

      socket.emit('arena:state', {
        active: arena?.isRunning || false,
        nines: arena?.nines.size || 0,
        round: arena?.round || 1,
        cycle: arena?.cycle || 1,
        snapshot: arena?.getNinesSnapshot() || [],
        next_cycle_at: combatEngine?.getNextCycleAt ? combatEngine.getNextCycleAt() : (Date.now() + 5 * 60 * 1000),
        cycle_interval_ms: combatEngine?.getCycleIntervalMs ? combatEngine.getCycleIntervalMs() : (5 * 60 * 1000),
      });
    });

    socket.on('leave_zone', (data) => {
      const zoneId = data.zoneId || data.zone_id;
      if (zoneId) socket.leave(`zone_${zoneId}`);
    });

    socket.on('chat:send', (data) => {
      const zoneId = data.zoneId;
      const message = (data.message || '').trim().substring(0, 120);
      const handle = (data.handle || 'Anon').substring(0, 30);
      const guildTag = (data.guildTag || '').substring(0, 16);
      if (!zoneId || !message) return;
      arenaNamespace.to(`zone_${zoneId}`).emit('chat:message', { handle, guildTag, message, ts: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log('⚔️ Arena client disconnected:', socket.id);
    });
  });

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
  console.log("⚔️ Combat engine started — V2 continuous combat");
}
// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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