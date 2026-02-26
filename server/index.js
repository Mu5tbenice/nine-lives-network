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
  console.log("✅ Zones V3 routes loaded");
} catch (e) {
  console.error("❌ Failed to load zones V3 routes:", e.message);
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
  const levelingRoutes = require("./routes/leveling");
  app.use("/api/levels", levelingRoutes);
  console.log("✅ Leveling routes loaded");
} catch (e) {
  console.error("❌ Failed to load leveling routes:", e.message);
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

// Chronicle
try {
  const chronicleRoutes = require("./routes/chronicle");
  app.use("/api/chronicle", chronicleRoutes);
  console.log("✅ Chronicle routes loaded");
} catch (e) {
  console.error("❌ Failed to load chronicle routes:", e.message);
}

try {
  const dropTicketRoutes = require("./routes/drop-tickets");
  app.use("/api/drop-tickets", dropTicketRoutes);
  console.log("✅ Drop Ticket routes loaded");
} catch (e) {
  console.error("❌ Failed to load drop ticket routes:", e.message);
}

// Sorting Hat
try {
  const sortingHatRoutes = require("./routes/sortingHat");
  app.use("/api/sorting-hat", sortingHatRoutes);
  console.log("✅ Sorting Hat routes loaded");

// Items
try {
  const itemsRoutes = require("./routes/items");
  app.use("/api/items", itemsRoutes);
  console.log("✅ Items routes loaded");
} catch (e) {
  console.error("❌ Failed to load items routes:", e.message);
}

// Items
try {
  const itemsRoutes = require("./routes/items");
  app.use("/api/items", itemsRoutes);
  console.log("✅ Items routes loaded");
} catch (e) {
  console.error("❌ Failed to load items routes:", e.message);
}
} catch (e) {
  console.error("❌ Failed to load sorting hat routes:", e.message);
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

// Start Nerm Telegram bot
try {
  const { startNermBot } = require("./services/nerm-telegram");
  startNermBot();
} catch (e) {
  console.error("❌ Failed to load Nerm Telegram bot:", e.message);
}

// Start server (use `server` instead of `app` for Socket.io)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🐱 Nine Lives Network server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  if (io) console.log(`⚔️ Real-time duels active (Socket.io)`);
});

module.exports = app;