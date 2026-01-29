<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>World | Nine Lives Network</title>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/nav.css">
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(180deg, #0a0a14 0%, #0d1a2d 50%, #0a0a14 100%);
      color: #fff;
      min-height: 100vh;
    }

    /* ===== MAIN CONTAINER ===== */
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 72px 16px 40px;
    }

    /* ===== PLAYER STATUS BAR ===== */
    .player-status {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .status-card {
      background: rgba(20, 35, 60, 0.8);
      border: 1px solid rgba(255, 215, 0, 0.2);
      border-radius: 10px;
      padding: 12px 16px;
      flex: 1;
      min-width: 140px;
    }

    .status-card.school-card {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .school-crystal {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .school-details {
      flex: 1;
    }

    .school-name {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
      color: #fff;
      margin-bottom: 4px;
    }

    .school-territories {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.3rem;
      color: #a0a0b0;
    }

    .status-label {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.3rem;
      color: #a0a0b0;
      margin-bottom: 8px;
    }

    .resource-display {
      display: flex;
      gap: 4px;
    }

    .mana-orb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(180deg, #00D4FF 0%, #0099cc 100%);
      box-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
    }

    .mana-orb.empty {
      background: rgba(30, 40, 60, 0.8);
      box-shadow: none;
      border: 2px solid #2a2a4a;
    }

    .life-heart {
      width: 20px;
      height: 20px;
      font-size: 1rem;
      line-height: 20px;
      text-align: center;
    }

    .life-heart.empty {
      opacity: 0.3;
    }

    /* ===== ACTIVE BOUNTY BANNER ===== */
    .bounty-banner {
      background: linear-gradient(135deg, rgba(255, 100, 50, 0.3), rgba(255, 50, 100, 0.3));
      border: 2px solid #ff6644;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      animation: bounty-pulse 2s infinite;
    }

    @keyframes bounty-pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(255, 100, 50, 0.3); }
      50% { box-shadow: 0 0 30px rgba(255, 100, 50, 0.5); }
    }

    .bounty-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bounty-icon {
      font-size: 2rem;
    }

    .bounty-details h3 {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.5rem;
      color: #ff6644;
      margin-bottom: 4px;
    }

    .bounty-zone {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.6rem;
      color: #fff;
      margin-bottom: 4px;
    }

    .bounty-timer {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
      color: #ffaa88;
    }

    .bounty-btn {
      background: linear-gradient(180deg, #ff6644 0%, #cc4422 100%);
      border: none;
      border-radius: 6px;
      padding: 12px 20px;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
      color: #fff;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 0 #992211;
      transition: all 0.2s;
    }

    .bounty-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 0 #992211;
    }

    .no-bounty {
      text-align: center;
      padding: 20px;
      color: #606070;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
      background: rgba(20, 35, 60, 0.5);
      border: 1px dashed #2a2a4a;
      border-radius: 12px;
      margin-bottom: 20px;
    }

    /* ===== CRYSTAL TOWER ===== */
    .crystal-tower-section {
      background: rgba(20, 35, 60, 0.6);
      border: 1px solid rgba(255, 215, 0, 0.2);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .section-title {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.5rem;
      color: #FFD700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .crystal-tower {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 8px;
      height: 150px;
      padding: 20px 10px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }

    .crystal {
      width: 30px;
      border-radius: 4px 4px 0 0;
      position: relative;
      transition: height 0.5s ease;
      cursor: pointer;
      min-height: 20px;
    }

    .crystal::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%);
      border-radius: 4px 4px 0 0;
    }

    .crystal:hover {
      filter: brightness(1.2);
      box-shadow: 0 0 20px currentColor;
    }

    .crystal-label {
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.8rem;
    }

    .crystal.pulse {
      animation: crystal-pulse 0.5s ease;
    }

    @keyframes crystal-pulse {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.5); box-shadow: 0 0 30px currentColor; }
    }

    /* ===== TABS ===== */
    .world-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .tab-btn {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
      padding: 12px 16px;
      background: rgba(30, 30, 50, 0.8);
      border: 2px solid #2a2a4a;
      color: #a0a0b0;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      border-color: #FFD700;
      color: #fff;
    }

    .tab-btn.active {
      background: #FFD700;
      border-color: #FFD700;
      color: #0a0a14;
    }

    /* ===== TAB CONTENT ===== */
    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    /* ===== ZONE CARDS GRID ===== */
    .zones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }

    .zone-card {
      background: rgba(20, 35, 60, 0.8);
      border: 2px solid #2a2a4a;
      border-radius: 10px;
      overflow: hidden;
      transition: all 0.3s;
    }

    .zone-card:hover {
      border-color: rgba(255, 215, 0, 0.5);
      transform: translateY(-2px);
    }

    .zone-card.controlled-by-you {
      border-color: #00D4FF;
      box-shadow: 0 0 15px rgba(0, 212, 255, 0.2);
    }

    .zone-card.contested {
      border-color: #ff4444;
      animation: contested-pulse 1.5s infinite;
    }

    @keyframes contested-pulse {
      0%, 100% { box-shadow: 0 0 10px rgba(255, 68, 68, 0.3); }
      50% { box-shadow: 0 0 20px rgba(255, 68, 68, 0.5); }
    }

    .zone-header {
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
      min-height: 80px;
      background-size: cover;
      background-position: center;
    }

    .zone-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);
      border-radius: 12px 12px 0 0;
    }

    .zone-header > * {
      position: relative;
      z-index: 1;
    }

    .zone-name {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.45rem;
      color: #fff;
      margin-bottom: 4px;
    }

    .zone-controller {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.3rem;
      color: #a0a0b0;
    }

    .controller-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .zone-status-badge {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.25rem;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.3);
    }

    .zone-status-badge.contested {
      background: rgba(255, 68, 68, 0.3);
      color: #ff6666;
    }

    .zone-status-badge.yours {
      background: rgba(0, 212, 255, 0.3);
      color: #00D4FF;
    }

    .zone-body {
      padding: 12px;
    }

    .zone-battle {
      margin-bottom: 12px;
    }

    .battle-label {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.25rem;
      color: #606070;
      margin-bottom: 6px;
    }

    .battle-bar-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .battle-power {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.35rem;
      min-width: 45px;
    }

    .battle-power.attack {
      color: #ff6666;
    }

    .battle-power.defend {
      color: #6688ff;
      text-align: right;
    }

    .battle-bar {
      flex: 1;
      height: 8px;
      background: #1a1a2e;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
    }

    .battle-bar-attack {
      background: linear-gradient(90deg, #ff4444, #ff6666);
      height: 100%;
      transition: width 0.3s;
    }

    .battle-bar-defend {
      background: linear-gradient(90deg, #6666ff, #4444ff);
      height: 100%;
      transition: width 0.3s;
    }

    .zone-participants {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.25rem;
      color: #a0a0b0;
    }

    .participant-count {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .your-faction-count {
      color: #00D4FF;
    }

    .zone-actions {
      display: flex;
      gap: 8px;
    }

    .zone-btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 6px;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.35rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .zone-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .zone-btn.attack {
      background: linear-gradient(180deg, #cc3333, #991111);
      color: white;
      border: 2px solid #ff4444;
    }

    .zone-btn.defend {
      background: linear-gradient(180deg, #3333cc, #111199);
      color: white;
      border: 2px solid #4444ff;
    }

    .zone-btn:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    /* ===== ACTIVITY & DUELS ===== */
    .activity-section {
      background: rgba(20, 35, 60, 0.6);
      border: 1px solid rgba(255, 215, 0, 0.2);
      border-radius: 12px;
      padding: 16px;
    }

    .activity-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      transition: background 0.2s;
    }

    .activity-item:hover {
      background: rgba(255, 215, 0, 0.05);
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
      cursor: pointer;
      position: relative;
    }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-text {
      font-size: 0.85rem;
      color: #a0a0b0;
      line-height: 1.4;
    }

    .activity-text a {
      color: #00D4FF;
      text-decoration: none;
    }

    .activity-text .zone-name {
      color: #FFD700;
      font-size: 0.85rem;
    }

    .activity-action-badge {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.25rem;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .activity-action-badge.attack {
      background: rgba(255, 68, 68, 0.3);
      color: #ff6666;
    }

    .activity-action-badge.defend {
      background: rgba(68, 68, 255, 0.3);
      color: #6666ff;
    }

    .activity-action-badge.duel {
      background: rgba(255, 215, 0, 0.3);
      color: #FFD700;
    }

    .activity-time {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.25rem;
      color: #606070;
      margin-top: 4px;
    }

    .challenge-btn {
      background: linear-gradient(180deg, #FFD700, #cc9900);
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.25rem;
      color: #000;
      cursor: pointer;
      white-space: nowrap;
    }

    .challenge-btn:hover {
      filter: brightness(1.1);
    }

    .challenge-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .no-activity {
      text-align: center;
      padding: 30px;
      color: #606070;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
    }

    /* ===== DUEL MODAL ===== */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      padding: 20px;
    }

    .modal-overlay.active {
      display: flex;
    }

    .duel-modal {
      background: linear-gradient(180deg, #12121f, #0a0a14);
      border: 3px solid #FFD700;
      border-radius: 16px;
      max-width: 400px;
      width: 100%;
      padding: 24px;
      text-align: center;
      box-shadow: 0 0 60px rgba(255, 215, 0, 0.3);
    }

    .duel-title {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.7rem;
      color: #FFD700;
      margin-bottom: 20px;
    }

    .duel-fighters {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }

    .fighter {
      text-align: center;
    }

    .fighter-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      margin: 0 auto 8px;
      border: 3px solid;
    }

    .fighter-name {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
      color: #fff;
    }

    .vs-text {
      font-family: 'Press Start 2P', monospace;
      font-size: 1rem;
      color: #ff4444;
      text-shadow: 0 0 10px #ff4444;
    }

    .duel-status {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.5rem;
      color: #a0a0b0;
      margin-bottom: 20px;
    }

    .duel-result {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.6rem;
      margin-bottom: 20px;
      padding: 16px;
      border-radius: 8px;
    }

    .duel-result.win {
      background: rgba(0, 255, 136, 0.2);
      color: #00ff88;
      border: 2px solid #00ff88;
    }

    .duel-result.lose {
      background: rgba(255, 68, 68, 0.2);
      color: #ff4444;
      border: 2px solid #ff4444;
    }

    .duel-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .duel-btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .duel-btn.accept {
      background: linear-gradient(180deg, #00ff88, #00cc66);
      color: #000;
    }

    .duel-btn.decline {
      background: linear-gradient(180deg, #ff4444, #cc2222);
      color: #fff;
    }

    .duel-btn.close {
      background: linear-gradient(180deg, #444, #222);
      color: #fff;
    }

    .duel-btn:hover {
      transform: translateY(-2px);
    }

    /* ===== PENDING DUELS ===== */
    .pending-duels {
      background: rgba(255, 215, 0, 0.1);
      border: 2px solid rgba(255, 215, 0, 0.3);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 16px;
    }

    .pending-title {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
      color: #FFD700;
      margin-bottom: 10px;
    }

    .pending-duel-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .pending-duel-item:last-child {
      margin-bottom: 0;
    }

    .pending-challenger {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pending-actions {
      display: flex;
      gap: 6px;
    }

    /* ===== LOADING ===== */
    .loading {
      text-align: center;
      padding: 40px;
      color: #606070;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #2a2a4a;
      border-top-color: #FFD700;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ===== TOAST ===== */
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #12121f;
      border: 2px solid #FFD700;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.4rem;
      z-index: 3000;
      transition: transform 0.3s ease;
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
    }

    .toast.success { border-color: #00ff88; }
    .toast.error { border-color: #ff4444; }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 600px) {
      .player-status {
        flex-direction: column;
      }

      .status-card {
        min-width: 100%;
      }

      .bounty-banner {
        flex-direction: column;
        text-align: center;
      }

      .bounty-info {
        flex-direction: column;
      }

      .crystal-tower {
        height: 120px;
      }

      .crystal {
        width: 24px;
      }

      .zones-grid {
        grid-template-columns: 1fr;
      }

      .duel-fighters {
        gap: 12px;
      }

      .fighter-avatar {
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <!-- Top Navigation -->
  <nav class="top-nav">
    <div class="top-nav-content">
      <a href="/" class="nav-logo">Nine Lives Network</a>
      <ul class="nav-links">
        <li><a href="/dashboard.html">Dashboard</a></li>
        <li><a href="/world.html" class="active">World</a></li>
        <li><a href="/leaderboards.html">Leaderboards</a></li>
        <li><a href="/how-to-play.html">Help</a></li>
        <li><a href="#" class="logout-btn" id="logoutBtn">Logout</a></li>
      </ul>
      <button class="hamburger" id="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </nav>

  <!-- Mobile Menu -->
  <div class="mobile-menu" id="mobileMenu">
    <a href="/dashboard.html"><span class="menu-icon">📊</span> Dashboard</a>
    <a href="/world.html" class="active"><span class="menu-icon">🌍</span> World</a>
    <a href="/leaderboards.html"><span class="menu-icon">🏆</span> Leaderboards</a>
    <a href="/how-to-play.html"><span class="menu-icon">❓</span> Help</a>
    <a href="#" class="logout-btn" id="mobileLogoutBtn"><span class="menu-icon">🚪</span> Logout</a>
  </div>

  <!-- Main Content -->
  <main class="container">
    <!-- Player Status -->
    <div class="player-status">
      <div class="status-card school-card">
        <div class="school-crystal" id="schoolCrystal">✨</div>
        <div class="school-details">
          <div class="school-name" id="schoolName">Loading...</div>
          <div class="school-territories" id="schoolTerritories">0 territories</div>
        </div>
      </div>
      <div class="status-card">
        <div class="status-label">MANA</div>
        <div class="resource-display" id="manaDisplay"></div>
      </div>
      <div class="status-card">
        <div class="status-label">LIVES</div>
        <div class="resource-display" id="livesDisplay"></div>
      </div>
    </div>

    <!-- Active Bounty Banner -->
    <div id="bountySection">
      <div class="no-bounty">No active bounty right now. Check @9LVNetwork for announcements!</div>
    </div>

    <!-- Crystal Tower -->
    <div class="crystal-tower-section">
      <div class="section-title">⚡ Faction Power</div>
      <div class="crystal-tower" id="crystalTower">
        <!-- Crystals rendered by JS -->
      </div>
    </div>

    <!-- Tabs -->
    <div class="world-tabs">
      <button class="tab-btn active" data-tab="zones">🗺️ Territories</button>
      <button class="tab-btn" data-tab="activity">📡 Activity</button>
      <button class="tab-btn" data-tab="duels">⚔️ Duels</button>
    </div>

    <!-- Zones Tab -->
    <div class="tab-content active" id="zones-tab">
      <div class="zones-grid" id="zonesGrid">
        <div class="loading">
          <div class="loading-spinner"></div>
          Loading territories...
        </div>
      </div>
    </div>

    <!-- Activity Tab -->
    <div class="tab-content" id="activity-tab">
      <div class="activity-section">
        <div class="activity-list" id="activityList">
          <div class="no-activity">No activity yet today...</div>
        </div>
      </div>
    </div>

    <!-- Duels Tab -->
    <div class="tab-content" id="duels-tab">
      <!-- Pending Duels -->
      <div class="pending-duels" id="pendingDuels" style="display: none;">
        <div class="pending-title">⚔️ Pending Challenges</div>
        <div id="pendingDuelsList"></div>
      </div>

      <!-- Duel Activity / History -->
      <div class="activity-section">
        <div class="section-title">⚔️ Recent Duels</div>
        <div class="activity-list" id="duelHistory">
          <div class="no-activity">No duels yet. Challenge someone!</div>
        </div>
      </div>
    </div>
  </main>

  <!-- Duel Modal -->
  <div class="modal-overlay" id="duelModal">
    <div class="duel-modal">
      <div class="duel-title" id="duelModalTitle">⚔️ DUEL CHALLENGE</div>
      <div class="duel-fighters">
        <div class="fighter">
          <div class="fighter-avatar" id="fighter1Avatar">🐱</div>
          <div class="fighter-name" id="fighter1Name">Player 1</div>
        </div>
        <div class="vs-text">VS</div>
        <div class="fighter">
          <div class="fighter-avatar" id="fighter2Avatar">🐱</div>
          <div class="fighter-name" id="fighter2Name">Player 2</div>
        </div>
      </div>
      <div class="duel-status" id="duelStatus">Waiting for response...</div>
      <div class="duel-result" id="duelResult" style="display: none;"></div>
      <div class="duel-actions" id="duelActions">
        <button class="duel-btn close" onclick="closeDuelModal()">Close</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast"></div>

  <script>
    // ===== SCHOOL DATA =====
    const schools = {
      1: { name: 'Ember Covenant', emoji: '🔥', color: '#FF4500' },
      2: { name: 'Tidal Conclave', emoji: '🌊', color: '#00BFFF' },
      3: { name: 'Stone Covenant', emoji: '🪨', color: '#8B4513' },
      4: { name: 'Zephyr Circle', emoji: '💨', color: '#98FB98' },
      5: { name: 'Storm Assembly', emoji: '⚡', color: '#FFD700' },
      6: { name: 'Umbral Syndicate', emoji: '🌑', color: '#9932CC' },
      7: { name: 'Radiant Order', emoji: '✨', color: '#FFFACD' },
      8: { name: 'Arcane Spire', emoji: '🔮', color: '#00FFFF' },
      9: { name: 'WildCat Path', emoji: '🐱', color: '#FF1493' }
    };

    // ===== ZONE IMAGES =====
    const zoneImages = {
      // Neutral Zones
      10: '/assets/images/environments/the-twin-spires.png',
      11: '/assets/images/environments/the-veiled-cascade.png',
      12: '/assets/images/environments/the-sunken-archives.png',
      13: '/assets/images/environments/the-whispering-woods.png',
      14: '/assets/images/environments/the-fallen-wyrm.jpg',
      15: '/assets/images/environments/the-grassy-knoll.png',
      16: '/assets/images/environments/the-gathering-grove.png',
      17: '/assets/images/environments/the-breach.png',
      18: '/assets/images/environments/the-great-divide.png',
      19: '/assets/images/environments/the-chambers-keep.png',
      20: '/assets/images/environments/the-eastern-exchange.png',
      21: '/assets/images/environments/the-memorial-arch.png',
      22: '/assets/images/environments/lunar-sanctum.png',
      23: '/assets/images/environments/the-divide.png',
      24: '/assets/images/environments/the-silent-valley.png',
      25: '/assets/images/environments/the-torn-veil.png',
      // School Home Zones
      1: '/assets/images/environments/ashen-approach.jpg',
      2: '/assets/images/environments/the-drowning-spiral.png',
      3: '/assets/images/environments/crimson-overlook.jpg',
      4: '/assets/images/environments/the-floating-citadel.png',
      5: '/assets/images/environments/violet-storm.png',
      6: '/assets/images/environments/the-lone-spire.png',
      7: '/assets/images/environments/azure-expanse.png',
      8: '/assets/images/environments/shattered-stream.png',
      9: '/assets/images/environments/the-quiet-woods.png',
    };

    // ===== STATE =====
    let player = null;
    let zones = [];
    let allActions = [];
    let factionPower = {};
    let pendingDuels = [];
    let duelHistory = [];

    // ===== UTILITIES =====
    function getPlayerId() {
      return localStorage.getItem('player_id');
    }

    function showToast(message, type = 'info') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = `toast ${type} show`;
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function getTimeAgo(ts) {
      const diff = Date.now() - new Date(ts).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      return `${Math.floor(mins / 60)}h ago`;
    }

    // ===== NAVIGATION =====
    document.getElementById('hamburger').addEventListener('click', () => {
      document.getElementById('hamburger').classList.toggle('active');
      document.getElementById('mobileMenu').classList.toggle('active');
    });

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('player_id');
      window.location.href = '/';
    });

    document.getElementById('mobileLogoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('player_id');
      window.location.href = '/';
    });

    // ===== TABS =====
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
      });
    });

    // ===== RENDER FUNCTIONS =====
    function renderPlayerStatus() {
      if (!player) {
        document.getElementById('schoolName').innerHTML = '<a href="/register.html" style="color:#00D4FF">Login to play</a>';
        return;
      }

      const school = schools[player.school_id];
      document.getElementById('schoolCrystal').textContent = school.emoji;
      document.getElementById('schoolCrystal').style.background = school.color;
      document.getElementById('schoolName').textContent = school.name;

      // Count territories
      const controlled = zones.filter(z => z.controlling_school_id === player.school_id).length;
      document.getElementById('schoolTerritories').textContent = `${controlled} territories`;

      // Mana
      const manaContainer = document.getElementById('manaDisplay');
      manaContainer.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const orb = document.createElement('div');
        orb.className = `mana-orb ${i < (player.mana || 0) ? '' : 'empty'}`;
        manaContainer.appendChild(orb);
      }

      // Lives (default 3)
      const lives = player.lives !== undefined ? player.lives : 3;
      const livesContainer = document.getElementById('livesDisplay');
      livesContainer.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const heart = document.createElement('div');
        heart.className = `life-heart ${i < lives ? '' : 'empty'}`;
        heart.textContent = '❤️';
        livesContainer.appendChild(heart);
      }
    }

    function renderCrystalTower() {
      const tower = document.getElementById('crystalTower');
      tower.innerHTML = '';

      // Calculate power for each faction (based on zones controlled + today's activity)
      const maxPower = 100;

      Object.keys(schools).forEach(schoolId => {
        const school = schools[schoolId];
        const zonesControlled = zones.filter(z => z.controlling_school_id == schoolId).length;
        const power = Math.min((zonesControlled / zones.length) * 100 + 10, maxPower);

        const crystal = document.createElement('div');
        crystal.className = 'crystal';
        crystal.style.background = school.color;
        crystal.style.height = `${Math.max(power, 15)}%`;
        crystal.style.color = school.color;
        crystal.title = `${school.name}: ${zonesControlled} zones`;

        const label = document.createElement('div');
        label.className = 'crystal-label';
        label.textContent = school.emoji;
        crystal.appendChild(label);

        tower.appendChild(crystal);
      });
    }

    function renderZones() {
      const grid = document.getElementById('zonesGrid');

      if (zones.length === 0) {
        grid.innerHTML = '<div class="no-activity">No territories loaded</div>';
        return;
      }

      grid.innerHTML = zones.map(zone => {
        const controller = zone.controlling_school_id ? schools[zone.controlling_school_id] : null;
        const isYours = player && zone.controlling_school_id === player.school_id;
        const isContested = zone.attack_power > 0 && zone.defend_power > 0;

        const attackPower = zone.attack_power || 0;
        const defendPower = zone.defend_power || 0;
        const totalPower = attackPower + defendPower || 1;
        const attackWidth = (attackPower / totalPower) * 100;
        const defendWidth = (defendPower / totalPower) * 100;

        // Count your faction's participants
        const yourFactionAttackers = zone.your_faction_attackers || 0;
        const yourFactionDefenders = zone.your_faction_defenders || 0;

        let cardClass = 'zone-card';
        if (isYours) cardClass += ' controlled-by-you';
        if (isContested) cardClass += ' contested';

        // Get zone image
        const zoneImage = zoneImages[zone.id] || '/assets/images/environments/the-breach.png';

        return `
          <div class="${cardClass}" data-zone-id="${zone.id}">
            <div class="zone-header" style="background-image: url('${zoneImage}')">
              <div>
                <div class="zone-name">${zone.name}</div>
                <div class="zone-controller">
                  ${controller 
                    ? `<div class="controller-dot" style="background:${controller.color}"></div>${controller.name}`
                    : '<span style="color:#606070">Unclaimed</span>'}
                </div>
              </div>
              ${isContested ? '<span class="zone-status-badge contested">⚔️ CONTESTED</span>' : ''}
              ${isYours ? '<span class="zone-status-badge yours">🛡️ YOURS</span>' : ''}
            </div>
            <div class="zone-body">
              <div class="zone-battle">
                <div class="battle-label">TODAY'S BATTLE</div>
                <div class="battle-bar-container">
                  <span class="battle-power attack">⚔️ ${attackPower}</span>
                  <div class="battle-bar">
                    <div class="battle-bar-attack" style="width:${attackWidth}%"></div>
                    <div class="battle-bar-defend" style="width:${defendWidth}%"></div>
                  </div>
                  <span class="battle-power defend">🛡️ ${defendPower}</span>
                </div>
              </div>
              <div class="zone-participants">
                <div class="participant-count">
                  Total: ${attackPower + defendPower} wizards
                </div>
                ${player ? `<div class="participant-count your-faction-count">Your faction: ${yourFactionAttackers + yourFactionDefenders}</div>` : ''}
              </div>
              <div class="zone-actions">
                <button class="zone-btn attack" onclick="zoneAction(${zone.id}, 'attack')" ${!player || player.mana < 1 ? 'disabled' : ''}>
                  ⚔️ Attack
                </button>
                <button class="zone-btn defend" onclick="zoneAction(${zone.id}, 'defend')" ${!player || player.mana < 1 ? 'disabled' : ''}>
                  🛡️ Defend
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderActivity() {
      const list = document.getElementById('activityList');

      if (allActions.length === 0) {
        list.innerHTML = '<div class="no-activity">No activity yet today...</div>';
        return;
      }

      list.innerHTML = allActions.slice(0, 30).map(action => {
        const school = schools[action.school_id] || {};
        const playerName = action.player?.twitter_handle || 'Unknown';
        const isYou = player && action.player_id === player.id;
        const canChallenge = player && !isYou && player.lives > 0;

        return `
          <div class="activity-item">
            <div class="activity-avatar" style="background:${school.color || '#444'}">
              ${school.emoji || '🐱'}
            </div>
            <div class="activity-content">
              <div class="activity-text">
                <a href="https://twitter.com/${playerName}" target="_blank">@${playerName}</a>
                <span class="activity-action-badge ${action.action_type}">${action.action_type === 'attack' ? '⚔️ ATK' : '🛡️ DEF'}</span>
                <span class="zone-name">${action.zone_name || 'Unknown'}</span>
              </div>
              <div class="activity-time">${getTimeAgo(action.created_at)}</div>
            </div>
            ${canChallenge ? `<button class="challenge-btn" onclick="challengePlayer('${action.player_id}', '${playerName}', ${action.school_id})">⚔️ Duel</button>` : ''}
          </div>
        `;
      }).join('');
    }

    function renderDuels() {
      // Pending duels
      const pendingSection = document.getElementById('pendingDuels');
      const pendingList = document.getElementById('pendingDuelsList');

      if (pendingDuels.length > 0) {
        pendingSection.style.display = 'block';
        pendingList.innerHTML = pendingDuels.map(duel => {
          const challenger = schools[duel.challenger_school_id] || {};
          return `
            <div class="pending-duel-item">
              <div class="pending-challenger">
                <div class="activity-avatar" style="background:${challenger.color || '#444'};width:28px;height:28px;font-size:0.9rem;">
                  ${challenger.emoji || '🐱'}
                </div>
                <span style="font-size:0.8rem;">@${duel.challenger_name} challenges you!</span>
              </div>
              <div class="pending-actions">
                <button class="duel-btn accept" style="padding:6px 12px;font-size:0.3rem;" onclick="acceptDuel('${duel.id}')">Accept</button>
                <button class="duel-btn decline" style="padding:6px 12px;font-size:0.3rem;" onclick="declineDuel('${duel.id}')">Decline</button>
              </div>
            </div>
          `;
        }).join('');
      } else {
        pendingSection.style.display = 'none';
      }

      // Duel history
      const historyList = document.getElementById('duelHistory');
      if (duelHistory.length === 0) {
        historyList.innerHTML = '<div class="no-activity">No duels yet. Challenge someone from the Activity tab!</div>';
        return;
      }

      historyList.innerHTML = duelHistory.map(duel => {
        const winner = schools[duel.winner_school_id] || {};
        const loser = schools[duel.loser_school_id] || {};
        return `
          <div class="activity-item">
            <div class="activity-avatar" style="background:${winner.color || '#444'}">
              ${winner.emoji || '🐱'}
            </div>
            <div class="activity-content">
              <div class="activity-text">
                <a href="#">@${duel.winner_name}</a>
                <span class="activity-action-badge duel">⚔️ VICTORY</span>
                defeated @${duel.loser_name}
              </div>
              <div class="activity-time">${getTimeAgo(duel.created_at)}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    // ===== ACTIONS =====
    async function zoneAction(zoneId, actionType) {
      if (!player || player.mana < 1) {
        showToast('Not enough mana!', 'error');
        return;
      }

      try {
        const res = await fetch('/api/territory/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_id: player.id,
            zone_id: zoneId,
            action_type: actionType
          })
        });

        const result = await res.json();

        if (result.success) {
          showToast(`${actionType === 'attack' ? '⚔️ Attack' : '🛡️ Defend'} successful! +${result.points} points`, 'success');
          player.mana = result.mana_remaining;
          loadData();
        } else {
          showToast(result.error || 'Action failed', 'error');
        }
      } catch (err) {
        showToast('Network error', 'error');
      }
    }

    // ===== DUELS =====
    function challengePlayer(targetId, targetName, targetSchoolId) {
      if (!player || player.lives < 1) {
        showToast('No lives remaining!', 'error');
        return;
      }

      const school = schools[targetSchoolId] || {};
      const mySchool = schools[player.school_id] || {};

      // Show modal
      document.getElementById('duelModalTitle').textContent = '⚔️ CHALLENGE SENT';
      document.getElementById('fighter1Avatar').textContent = mySchool.emoji;
      document.getElementById('fighter1Avatar').style.borderColor = mySchool.color;
      document.getElementById('fighter1Name').textContent = `@${player.twitter_handle}`;
      document.getElementById('fighter2Avatar').textContent = school.emoji;
      document.getElementById('fighter2Avatar').style.borderColor = school.color;
      document.getElementById('fighter2Name').textContent = `@${targetName}`;
      document.getElementById('duelStatus').textContent = 'Waiting for response...';
      document.getElementById('duelResult').style.display = 'none';
      document.getElementById('duelActions').innerHTML = '<button class="duel-btn close" onclick="closeDuelModal()">Close</button>';

      document.getElementById('duelModal').classList.add('active');

      // TODO: Send challenge to backend
      showToast(`Challenge sent to @${targetName}!`, 'success');
    }

    function acceptDuel(duelId) {
      // TODO: Accept duel via API, resolve with RNG
      // For now, simulate
      const won = Math.random() > 0.5;

      document.getElementById('duelModalTitle').textContent = '⚔️ DUEL RESULT';
      document.getElementById('duelStatus').style.display = 'none';

      const resultEl = document.getElementById('duelResult');
      resultEl.style.display = 'block';
      resultEl.className = `duel-result ${won ? 'win' : 'lose'}`;
      resultEl.textContent = won ? '🎉 VICTORY! +10 points' : '💀 DEFEAT! -10 points';

      document.getElementById('duelActions').innerHTML = '<button class="duel-btn close" onclick="closeDuelModal()">Close</button>';
      document.getElementById('duelModal').classList.add('active');

      showToast(won ? 'You won the duel! +10 points' : 'You lost the duel. -10 points', won ? 'success' : 'error');
    }

    function declineDuel(duelId) {
      // TODO: Decline via API
      showToast('Duel declined', 'info');
      pendingDuels = pendingDuels.filter(d => d.id !== duelId);
      renderDuels();
    }

    function closeDuelModal() {
      document.getElementById('duelModal').classList.remove('active');
    }

    // Close modal on overlay click
    document.getElementById('duelModal').addEventListener('click', (e) => {
      if (e.target.id === 'duelModal') closeDuelModal();
    });

    // ===== LOAD DATA =====
    async function loadData() {
      try {
        const playerId = getPlayerId();

        // Load player
        if (playerId) {
          const playerRes = await fetch(`/api/players/${playerId}`);
          if (playerRes.ok) {
            player = await playerRes.json();
          }
        }

        // Load zones
        const zonesRes = await fetch('/api/zones');
        if (zonesRes.ok) {
          zones = await zonesRes.json();
        }

        // Load activity
        try {
          const actionsRes = await fetch('/api/territory/actions/today');
          if (actionsRes.ok) {
            const todayActions = await actionsRes.json();
            allActions = [];
            Object.values(todayActions).forEach(za => {
              if (Array.isArray(za)) allActions.push(...za);
            });
            allActions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          }
        } catch (e) {
          console.log('Activity API not ready');
        }

        // Render everything
        renderPlayerStatus();
        renderCrystalTower();
        renderZones();
        renderActivity();
        renderDuels();

      } catch (err) {
        console.error('Load error:', err);
      }
    }

    // ===== INIT =====
    loadData();
    setInterval(loadData, 30000);
  </script>
</body>
</html>