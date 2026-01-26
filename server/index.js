const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Nine Lives Network server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/zones', require('./routes/map'));
app.use('/api/leaderboards', require('./routes/leaderboards'));
app.use('/api/admin', require('./routes/admin'));
// app.use('/api/spells', require('./routes/spells'));
// app.use('/api/bounties', require('./routes/bounties'));

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server - bind to 0.0.0.0 for deployment
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✨ Nine Lives Network server running on port ${PORT}`);
  console.log(`🐱 Visit: http://localhost:${PORT}`);

  // Initialize services in background (non-blocking)
  setTimeout(async () => {
    // Test Twitter bot connection
    try {
      const twitterBot = require('./services/twitterBot');
      const user = await twitterBot.testConnection();
      if (user) {
        console.log(`🐦 Bot connected as: ${user.username}`);
      }
    } catch (error) {
      console.log('⚠️ Twitter bot not connected:', error.message);
    }

    // Initialize scheduled jobs
    try {
      const scheduler = require('./services/scheduler');
      scheduler.initializeScheduledJobs();
    } catch (error) {
      console.log('⚠️ Scheduler not initialized:', error.message);
    }
  }, 100);
});

module.exports = app;