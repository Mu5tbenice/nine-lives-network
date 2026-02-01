require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Load routes with error handling
try {
  const authRoutes = require('./routes/auth');
  app.use('/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (e) {
  console.error('❌ Failed to load auth routes:', e.message);
}

try {
  const playerRoutes = require('./routes/players');
  app.use('/api/players', playerRoutes);
  console.log('✅ Player routes loaded');
} catch (e) {
  console.error('❌ Failed to load player routes:', e.message);
}

try {
  const territoryRoutes = require('./routes/territory');
  app.use('/api/territory', territoryRoutes);
  console.log('✅ Territory routes loaded');
} catch (e) {
  console.error('❌ Failed to load territory routes:', e.message);
}

try {
  const duelRoutes = require('./routes/duels');
  app.use('/api/duels', duelRoutes);
  console.log('✅ Duel routes loaded');
} catch (e) {
  console.error('❌ Failed to load duel routes:', e.message);
}

try {
  const mapRoutes = require('./routes/map');
  app.use('/api/map', mapRoutes);
  app.use('/api/zones', mapRoutes);
  console.log('✅ Map routes loaded');
} catch (e) {
  console.error('❌ Failed to load map routes:', e.message);
}

try {
  const leaderboardRoutes = require('./routes/leaderboards');
  app.use('/api/leaderboards', leaderboardRoutes);
  console.log('✅ Leaderboard routes loaded');
} catch (e) {
  console.error('❌ Failed to load leaderboard routes:', e.message);
}

try {
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes loaded');
} catch (e) {
  console.error('❌ Failed to load admin routes:', e.message);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Redirect old map.html to world.html
app.get('/map.html', (req, res) => res.redirect('/world.html'));

// Start scheduler for automated tasks
try {
  const scheduler = require('./services/scheduler');
  console.log('✅ Scheduler loaded');
} catch (e) {
  console.error('❌ Failed to load scheduler:', e.message);
}

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐱 Nine Lives Network server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});

module.exports = app;