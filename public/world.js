<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The World of Avaloris | Nine Lives Network</title>
  <meta name="description" content="Explore the fantasy world of Avaloris - nine magical schools, mystical territories, and the grumpy floating cat Nerm.">

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">

  <!-- Styles -->
  <link rel="stylesheet" href="/css/styles.css">

  <style>
    .world-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      padding: var(--space-lg);
      padding-top: 80px;
      position: relative;
      overflow-x: hidden;
    }

    /* Back Button */
    .back-nav {
      position: fixed;
      top: var(--space-md);
      left: var(--space-md);
      z-index: 100;
    }

    .back-btn {
      font-family: var(--font-main);
      font-size: 0.625rem;
      padding: 0.75rem 1rem;
      background: rgba(10, 10, 15, 0.9);
      border: 2px solid var(--accent-gold);
      color: var(--accent-gold);
      text-decoration: none;
      text-transform: uppercase;
      transition: all 0.3s ease;
    }

    .back-btn:hover {
      background: var(--accent-gold);
      color: var(--bg-dark);
    }

    /* Magical Background */
    .magic-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: 
        radial-gradient(ellipse at 20% 80%, rgba(138, 43, 226, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(0, 212, 255, 0.05) 0%, transparent 70%),
        var(--bg-dark);
      z-index: -2;
    }

    /* Floating Particles */
    .particles {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    }

    .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: var(--accent-gold);
      border-radius: 50%;
      animation: particleFloat 8s ease-in-out infinite;
      opacity: 0.6;
    }

    @keyframes particleFloat {
      0%, 100% { 
        transform: translateY(0) translateX(0); 
        opacity: 0.6;
      }
      25% { 
        transform: translateY(-100px) translateX(20px); 
        opacity: 1;
      }
      50% { 
        transform: translateY(-200px) translateX(-10px); 
        opacity: 0.8;
      }
      75% { 
        transform: translateY(-100px) translateX(-20px); 
        opacity: 0.4;
      }
    }

    /* Wizard Cat Video Container */
    .wizard-cat-container {
      position: relative;
      width: 100%;
      max-width: 500px;
      margin-bottom: var(--space-md);
      perspective: 1000px;
    }

    .wizard-cat-wrapper {
      position: relative;
      animation: float 4s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .wizard-cat-video {
      width: 100%;
      height: auto;
      display: block;
      transition: transform 0.15s ease-out;
      -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 45%, black 30%, transparent 70%);
      mask-image: radial-gradient(ellipse 70% 70% at 50% 45%, black 30%, transparent 70%);
    }

    .wizard-cat-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      height: 80%;
      background: radial-gradient(circle, rgba(138, 43, 226, 0.3) 0%, rgba(255, 215, 0, 0.15) 30%, transparent 60%);
      animation: pulse 3s ease-in-out infinite;
      z-index: -1;
      pointer-events: none;
      border-radius: 50%;
      filter: blur(20px);
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
    }

    /* Title */
    .world-title {
      font-size: 2rem;
      text-align: center;
      margin-bottom: var(--space-sm);
      background: linear-gradient(135deg, var(--accent-gold), var(--accent-cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .world-subtitle {
      font-family: var(--font-body);
      font-size: 1.5rem;
      color: var(--text-secondary);
      text-align: center;
      margin-bottom: var(--space-xl);
      max-width: 600px;
    }

    /* Sections */
    .world-section {
      max-width: 900px;
      width: 100%;
      margin-bottom: var(--space-xl);
    }

    .world-section h2 {
      text-align: center;
      margin-bottom: var(--space-lg);
      color: var(--accent-gold);
    }

    /* Features Grid */
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-lg);
    }

    .feature {
      padding: var(--space-lg);
      background: var(--bg-medium);
      border: 1px solid var(--bg-light);
      border-radius: var(--radius-md);
      transition: all 0.3s ease;
      text-align: center;
    }

    .feature:hover {
      border-color: var(--accent-gold);
      transform: translateY(-5px);
    }

    .feature-icon {
      font-size: 2.5rem;
      margin-bottom: var(--space-md);
    }

    .feature h3 {
      font-size: 0.75rem;
      color: var(--accent-gold);
      margin-bottom: var(--space-sm);
    }

    .feature p {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Environment Grid */
    .env-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-md);
    }

    .env-card {
      position: relative;
      border-radius: var(--radius-md);
      overflow: hidden;
      aspect-ratio: 16/9;
    }

    .env-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .env-card:hover img {
      transform: scale(1.05);
    }

    .env-label {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: var(--space-sm);
      background: linear-gradient(transparent, rgba(0,0,0,0.8));
      font-family: var(--font-main);
      font-size: 0.625rem;
    }

    /* Nerm Section */
    .nerm-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-lg);
      flex-wrap: wrap;
      padding: var(--space-lg);
      background: var(--bg-medium);
      border-radius: var(--radius-md);
    }

    .nerm-img {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      border: 3px solid var(--accent-purple);
      object-fit: cover;
    }

    .nerm-info {
      max-width: 400px;
    }

    .nerm-info h2 {
      color: var(--accent-purple);
      margin-bottom: var(--space-sm);
      text-align: left;
    }

    .nerm-info p {
      color: var(--text-secondary);
      margin-bottom: var(--space-md);
    }

    .nerm-link {
      color: var(--accent-purple);
      font-size: 0.875rem;
    }

    /* Footer */
    .world-footer {
      margin-top: var(--space-xl);
      padding-top: var(--space-lg);
      border-top: 1px solid var(--bg-light);
      text-align: center;
    }

    .social-links {
      display: flex;
      justify-content: center;
      gap: var(--space-lg);
      margin-bottom: var(--space-md);
    }

    .social-links a {
      color: var(--text-secondary);
      font-size: 1.5rem;
      transition: color 0.2s ease;
    }

    .social-links a:hover {
      color: var(--accent-gold);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .world-title {
        font-size: 1.5rem;
      }

      .world-subtitle {
        font-size: 1.125rem;
      }

      .wizard-cat-container {
        max-width: 350px;
      }

      .env-grid {
        grid-template-columns: 1fr;
      }

      .nerm-section {
        flex-direction: column;
        text-align: center;
      }

      .nerm-info h2 {
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <!-- Back Navigation -->
  <nav class="back-nav">
    <a href="/" class="back-btn">← Back</a>
  </nav>

  <!-- Magic Background -->
  <div class="magic-bg"></div>

  <!-- Floating Particles -->
  <div class="particles" id="particles"></div>

  <!-- Main Content -->
  <main class="world-container">

    <!-- Wizard Cat Video -->
    <div class="wizard-cat-container">
      <div class="wizard-cat-glow"></div>
      <div class="wizard-cat-wrapper">
        <video 
          class="wizard-cat-video"
          autoplay 
          loop 
          muted 
          playsinline
        >
          <source src="/assets/images/wizard-cat.mp4" type="video/mp4">
          <img src="/assets/images/wizard-cat.png" alt="Nine Lives Network Wizard Cat">
        </video>
      </div>
    </div>

    <!-- Title -->
    <h1 class="world-title">The World of Avaloris</h1>
    <p class="world-subtitle">
      A realm of floating islands, crystal caverns, and volcanic peaks. 
      Nine schools of magic battle for control of its territories.
    </p>

    <!-- How It Works -->
    <section class="world-section">
      <h2>How It Works</h2>
      <div class="features">
        <div class="feature">
          <div class="feature-icon">🐱</div>
          <h3>Join a School</h3>
          <p>Choose from 9 magical schools, each with unique spells and playstyles</p>
        </div>
        <div class="feature">
          <div class="feature-icon">✨</div>
          <h3>Cast Spells</h3>
          <p>Reply to daily objectives on Twitter to cast spells and earn points</p>
        </div>
        <div class="feature">
          <div class="feature-icon">🗺️</div>
          <h3>Control Territory</h3>
          <p>Compete with other schools to dominate the map of Avaloris</p>
        </div>
        <div class="feature">
          <div class="feature-icon">🏆</div>
          <h3>Win Rewards</h3>
          <p>Climb leaderboards and earn rewards for your school and community</p>
        </div>
      </div>
    </section>

    <!-- Environments -->
    <section class="world-section">
      <h2>Explore the Realm</h2>
      <div class="env-grid">
        <div class="env-card">
          <img src="/assets/images/env-crystal-cave.jpg" alt="Crystal Caverns">
          <div class="env-label" style="color: var(--accent-cyan);">Crystal Caverns</div>
        </div>
        <div class="env-card">
          <img src="/assets/images/env-ember-peaks.jpg" alt="Ember Peaks">
          <div class="env-label" style="color: #FF4500;">Ember Peaks</div>
        </div>
        <div class="env-card">
          <img src="/assets/images/env-storm-citadel.jpg" alt="Storm Citadel">
          <div class="env-label" style="color: #FFD700;">Storm Citadel</div>
        </div>
        <div class="env-card">
          <img src="/assets/images/env-mystic-valley.jpg" alt="Mystic Valley">
          <div class="env-label" style="color: #98FB98;">Mystic Valley</div>
        </div>
      </div>
    </section>

    <!-- Nerm Section -->
    <section class="world-section">
      <div class="nerm-section">
        <img src="/assets/images/nerm.jpg" alt="Nerm" class="nerm-img">
        <div class="nerm-info">
          <h2>Meet Nerm</h2>
          <p>
            A grumpy floating cat head who's been watching wizards fail for 400 years. 
            He follows players around Avaloris, judging their every spell. 
            He's not helpful. He's just... there.
          </p>
          <a href="https://twitter.com/9LV_Nerm" target="_blank" class="nerm-link">Follow @9LV_Nerm →</a>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="world-footer">
      <div class="social-links">
        <a href="https://twitter.com/9LVNetwork" target="_blank" title="Follow @9LVNetwork">𝕏</a>
      </div>
      <p style="color: var(--text-muted); font-size: 0.875rem;">
        <a href="https://twitter.com/9LVNetwork" target="_blank" style="color: var(--text-muted);">@9LVNetwork</a> · 
        <a href="https://twitter.com/9LV_Nerm" target="_blank" style="color: var(--text-muted);">@9LV_Nerm</a>
      </p>
      <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: var(--space-sm);">© 2025 Nine Lives Network</p>
    </footer>

  </main>

  <script>
    // Create floating particles
    function createParticles() {
      const container = document.getElementById('particles');
      const particleCount = 25;

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (6 + Math.random() * 4) + 's';

        const colors = ['#FFD700', '#8A2BE2', '#00D4FF', '#FF6B35'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];

        container.appendChild(particle);
      }
    }

    createParticles();
  </script>
</body>
</html>