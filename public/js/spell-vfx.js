/**
 * SPELL VFX ENGINE — Nine Lives Network
 * Handles spell projectiles, sparkle trails, firework impacts
 * Used by: sprite-lab.html, zone battle page
 *
 * Usage:
 *   const vfx = new SpellVFX(canvasElement);
 *   vfx.fire(fromX, fromY, toX, toY, 'smoulders', onHitCallback);
 *   // Call vfx.update() in your animation loop
 */

window.SpellVFX = (function() {

  // ═══ 10 SPELL TYPES ═══
  const TYPES = {
    smoulders:   { name:'Ember Strike',    colors:['#FF4422','#FF8844','#FFCC33','#FF6600'], shape:'ball',   speed:[2.2,3],   trail:4, impact:14 },
    darktide:    { name:'Tidal Surge',     colors:['#00CCEE','#44DDFF','#88EEFF','#0099BB'], shape:'wave',   speed:[1.8,2.8], trail:3, impact:12 },
    stonebark:   { name:'Root Strike',     colors:['#55AA22','#88DD44','#AAEE66','#338811'], shape:'shard',  speed:[2.5,3.5], trail:3, impact:11 },
    ashenvale:   { name:'Gale Blade',      colors:['#C0DDEE','#E0F0FF','#AACCEE','#FFFFFF'], shape:'slash',  speed:[4,5.5],   trail:5, impact:10 },
    stormrage:   { name:'Chain Lightning', colors:['#FFE844','#FFFF88','#FFDD00','#FFFFFF'], shape:'bolt',   speed:[5,7],     trail:6, impact:13 },
    nighthollow: { name:'Void Bolt',       colors:['#9944DD','#BB66FF','#7722BB','#DD88FF'], shape:'orb',    speed:[2,3],     trail:3, impact:12 },
    dawnbringer: { name:'Radiance',        colors:['#FFCC66','#FFEEAA','#FFD700','#FFFFFF'], shape:'star',   speed:[2.5,3.5], trail:4, impact:14 },
    manastorm:   { name:'Arcane Rip',      colors:['#5588FF','#88AAFF','#3366DD','#AACCFF'], shape:'spiral', speed:[2,2.8],   trail:4, impact:12 },
    plaguemire:  { name:'Blight',          colors:['#EE4488','#FF66AA','#CC2266','#FF88CC'], shape:'cloud',  speed:[1.2,1.8], trail:2, impact:15 },
    universal:   { name:'Mana Bolt',       colors:['#D4A64B','#E8C675','#FFDD88','#FFE8AA'], shape:'ball',   speed:[2.8,3.8], trail:3, impact:10 },
  };

  // Card names for kill feed
  const CARD_NAMES = {
    smoulders:   ['Ember Strike','Firestorm Volley','Eruption','Scorched Earth','Kindle','Molten Shell'],
    darktide:    ['Riptide','Maelstrom','Sovereign Tide','Leech Current','Abyssal Whisper'],
    stonebark:   ['Root Strike','Quake','Earthshatter','Petrify','Bastion','Regrowth'],
    ashenvale:   ['Gust Blade','Cyclone Strike','Tempest','Windshear','Tailwind'],
    stormrage:   ['Spark','Chain Lightning','Overload','Short Circuit','Surge Tap'],
    nighthollow: ['Shadow Bolt','Revenant Surge','Oblivion','Abyssal Verdict','Sealed Decree'],
    dawnbringer: ['Radiant Strike','Solar Flare','Divine Wrath','Ascension','Blessing of Light'],
    manastorm:   ['Arcane Siphon','Reality Warp','Unravel','Counterspell','Resonance Tap'],
    plaguemire:  ['Toxic Dart','Blightfall','Pandemic','Wither','Creeping Doubt'],
    universal:   ['Mana Bolt','Arcane Bolt','Hex Bolt','Void Rend','Chaos Rift'],
  };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ═══ VFX ENGINE CLASS ═══
  function SpellVFXEngine() {
    this.spells = [];
    this.sparkles = [];
    this.dmgNums = [];
    this._id = 0;
  }

  SpellVFXEngine.prototype.nextId = function() { return this._id++; };

  // Fire a spell projectile
  SpellVFXEngine.prototype.fire = function(fromX, fromY, toX, toY, cardHouse, onHit) {
    var type = TYPES[cardHouse] || TYPES.universal;
    var color = pick(type.colors);
    var speed = type.speed[0] + Math.random() * (type.speed[1] - type.speed[0]);
    var spellName = pick(CARD_NAMES[cardHouse] || CARD_NAMES.universal);

    this.spells.push({
      id: this.nextId(),
      x: fromX, y: fromY,
      toX: toX, toY: toY,
      color: color,
      colors: type.colors,
      size: 5,
      speed: speed,
      shape: type.shape,
      trail: type.trail,
      impactSize: type.impact,
      wobble: (Math.random() - 0.5) * 1.5,
      age: 0,
      cardHouse: cardHouse,
      spellName: spellName,
      onHit: onHit,
    });

    return spellName;
  };

  // Spawn firework impact at position
  SpellVFXEngine.prototype.spawnFirework = function(x, y, colors, count) {
    count = count || 14;
    // Main ring
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
      var spd = 1.5 + Math.random() * 3;
      this.sparkles.push({
        id: this.nextId(),
        x: x, y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1.2,
        color: pick(colors),
        size: 1 + Math.floor(Math.random() * 3),
        life: 1,
        decay: 0.013 + Math.random() * 0.015,
      });
    }
    // White sparkle ring
    for (var j = 0; j < 6; j++) {
      var a2 = (Math.PI * 2 / 6) * j;
      this.sparkles.push({
        id: this.nextId(),
        x: x, y: y,
        vx: Math.cos(a2) * 0.8,
        vy: Math.sin(a2) * 0.8 - 0.5,
        color: '#FFFFFF',
        size: 1,
        life: 0.7,
        decay: 0.025,
      });
    }
  };

  // Spawn damage number
  SpellVFXEngine.prototype.spawnDmg = function(x, y, value, type) {
    this.dmgNums.push({
      id: this.nextId(),
      x: x + (Math.random() - 0.5) * 16,
      y: y,
      value: value,
      type: type || 'damage', // damage, heal, crit, ko
      born: Date.now(),
    });
  };

  // Update all particles — call every frame
  SpellVFXEngine.prototype.update = function() {
    var self = this;

    // Move spells
    var aliveSpells = [];
    this.spells.forEach(function(s) {
      var dx = s.toX - s.x;
      var dy = s.toY - s.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10) {
        // HIT — firework!
        self.spawnFirework(s.toX, s.toY, s.colors, s.impactSize);
        if (s.onHit) s.onHit(s);
        return;
      }

      // Move
      s.x += (dx / dist) * s.speed;
      s.y += (dy / dist) * s.speed + Math.sin(s.age * 0.25) * s.wobble;
      s.age++;

      // Trail sparkles
      if (s.age % 2 === 0) {
        for (var t = 0; t < s.trail; t++) {
          self.sparkles.push({
            id: self.nextId(),
            x: s.x + (Math.random() - 0.5) * 6,
            y: s.y + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6 - 0.2,
            color: pick(s.colors),
            size: 1 + Math.floor(Math.random() * 2),
            life: 1,
            decay: 0.02 + Math.random() * 0.015,
          });
        }
      }

      aliveSpells.push(s);
    });
    this.spells = aliveSpells;

    // Update sparkles
    this.sparkles = this.sparkles.filter(function(p) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.life -= p.decay;
      return p.life > 0;
    });

    // Expire damage numbers
    var now = Date.now();
    this.dmgNums = this.dmgNums.filter(function(d) {
      return now - d.born < 1500;
    });
  };

  // Render to a DOM container (absolute positioned children)
  SpellVFXEngine.prototype.render = function(container) {
    // Clear old vfx elements
    var old = container.querySelectorAll('.vfx-el');
    old.forEach(function(el) { el.remove(); });

    // Render spells
    this.spells.forEach(function(s) {
      var el = document.createElement('div');
      el.className = 'vfx-el';
      var isRound = ['cloud','orb','ball','star','spiral'].indexOf(s.shape) >= 0;
      var w = s.shape === 'bolt' ? s.size * 3 : (s.shape === 'slash' || s.shape === 'wave') ? s.size * 2 : s.size + 2;
      var h = s.shape === 'bolt' ? 2 : s.shape === 'cloud' ? s.size * 0.7 : s.size + 2;
      el.style.cssText = 'position:absolute;pointer-events:none;z-index:50;' +
        'left:' + (s.x - w/2) + 'px;top:' + (s.y - h/2) + 'px;' +
        'width:' + w + 'px;height:' + h + 'px;' +
        'background:' + s.color + ';' +
        'border-radius:' + (isRound ? '50%' : '1px') + ';' +
        'box-shadow:0 0 ' + (s.size*3) + 'px ' + s.color + 'cc,0 0 ' + (s.size*6) + 'px ' + s.color + '44;';
      container.appendChild(el);

      // Glow
      var glow = document.createElement('div');
      glow.className = 'vfx-el';
      var gs = s.size * 5;
      glow.style.cssText = 'position:absolute;pointer-events:none;z-index:49;' +
        'left:' + (s.x - gs/2) + 'px;top:' + (s.y - gs/2) + 'px;' +
        'width:' + gs + 'px;height:' + gs + 'px;border-radius:50%;' +
        'background:radial-gradient(' + s.color + '44,transparent 60%);';
      container.appendChild(glow);
    });

    // Render sparkles
    this.sparkles.forEach(function(p) {
      var el = document.createElement('div');
      el.className = 'vfx-el';
      el.style.cssText = 'position:absolute;pointer-events:none;z-index:55;' +
        'left:' + p.x + 'px;top:' + p.y + 'px;' +
        'width:' + p.size + 'px;height:' + p.size + 'px;' +
        'background:' + p.color + ';opacity:' + p.life + ';' +
        'border-radius:' + (p.size > 1 ? '50%' : '0') + ';' +
        (p.life > 0.5 ? 'box-shadow:0 0 ' + (p.size*2) + 'px ' + p.color + '88;' : '');
      container.appendChild(el);
    });

    // Render damage numbers
    var now = Date.now();
    this.dmgNums.forEach(function(d) {
      var age = now - d.born;
      var progress = Math.min(age / 1500, 1);
      var yOff = -progress * 50;
      var opacity = progress < 0.1 ? progress * 10 : Math.max(0, 1 - (progress - 0.1) / 0.9);
      var scale = progress < 0.1 ? 1 + progress * 4 : 1.4 - progress * 0.8;

      var colors = { damage:'#e85a6a', heal:'#6acd8a', crit:'#FFE844', ko:'#ff4444' };
      var prefixes = { damage:'-', heal:'+', crit:'-', ko:'' };

      var el = document.createElement('div');
      el.className = 'vfx-el';
      el.style.cssText = 'position:absolute;pointer-events:none;z-index:70;' +
        'left:' + d.x + 'px;top:' + (d.y + yOff) + 'px;' +
        'font-family:"Press Start 2P",monospace;font-size:' + (d.type === 'ko' ? 11 : d.type === 'crit' ? 10 : 8) + 'px;' +
        'color:' + (colors[d.type] || '#e85a6a') + ';' +
        'opacity:' + opacity + ';transform:scale(' + scale + ');' +
        'text-shadow:0 0 8px ' + (colors[d.type] || '#e85a6a') + '88,0 2px 6px rgba(0,0,0,0.9);white-space:nowrap;';
      el.textContent = (prefixes[d.type] || '') + d.value;
      container.appendChild(el);
    });
  };

  // ═══ PUBLIC ═══
  return {
    Engine: SpellVFXEngine,
    TYPES: TYPES,
    CARD_NAMES: CARD_NAMES,
  };

})();