/* ═══════════════════════════════════════════════════════════
   card-v4.js — THE card renderer for Nine Lives Network
   v4.3 — Stats moved below effects, art shifted up

   HOW TO USE:
   1. Include card-v4.css in your page
   2. Include card-particles.js (for particle effects)
   3. Include THIS file
   4. Call: buildCardV4(spellData)  → returns HTML string
   5. Call: buildCardV4(spellData, { size: 'mini' }) → mini size

   SIZES: 'normal' (240×380), 'mini' (200×316), 'tiny' (160×252), 'zoom' (340×530)

   EXPECTS your page to have: HOUSES, esc()
   (those stay in your page or in a shared config)
   ═══════════════════════════════════════════════════════════ */

// ── HOUSE DATA (fallback if page doesn't define HOUSES) ──
var CARD_HOUSES = {
  smoulders:   { name: "Smoulders",   color: "#E03C31", img: "/assets/images/houses/smoulders.png" },
  darktide:    { name: "Darktide",    color: "#00B4D8", img: "/assets/images/houses/darktide.png" },
  stonebark:   { name: "Stonebark",   color: "#5CB338", img: "/assets/images/houses/stonebark.png" },
  ashenvale:   { name: "Ashenvale",   color: "#B0C4DE", img: "/assets/images/houses/ashenvale.png" },
  stormrage:   { name: "Stormrage",   color: "#FFC800", img: "/assets/images/houses/stormrage.png" },
  nighthollow: { name: "Nighthollow", color: "#7B2D8E", img: "/assets/images/houses/nighthollow.png" },
  dawnbringer: { name: "Dawnbringer", color: "#FF8C00", img: "/assets/images/houses/dawnbringer.png" },
  manastorm:   { name: "Manastorm",   color: "#5B8FE0", img: "/assets/images/houses/manastorm.png" },
  plaguemire:  { name: "Plaguemire",  color: "#E84393", img: "/assets/images/houses/plaguemire.png" },
  universal:   { name: "Universal",   color: "#D4A64B", img: "" },
};

// ── STAT COLORS ──
var STAT_COLORS = { atk: '#e85a6a', hp: '#6acd8a', spd: '#6ac8d8', def: '#b088e8', luck: '#D4A64B' };

// ── RARITY CONFIG ──
var RARITY_CONFIG = {
  common:    { label: "Common",    cls: "sc-rarity--common",    foil: 0,    pMult: 0 },
  uncommon:  { label: "Uncommon",  cls: "sc-rarity--uncommon",  foil: 0.3,  pMult: 0.4 },
  rare:      { label: "Rare",      cls: "sc-rarity--rare",      foil: 0.55, pMult: 0.7 },
  epic:      { label: "Epic",      cls: "sc-rarity--epic",      foil: 0.8,  pMult: 1 },
  legendary: { label: "Legendary", cls: "sc-rarity--legendary", foil: 1.0,  pMult: 1.5 },
};

// ── EFFECT COLOUR MAP (V3 — unique colour per effect) ──
var EFFECT_HEX = {
  CHAIN:'#FFD700',CRIT:'#FFEE00',PIERCE:'#FFC040',
  BURN:'#FF6B35',SURGE:'#FF3355',EXECUTE:'#FF9500',
  WARD:'#8BC34A',ANCHOR:'#6D4C41',THORNS:'#558B2F',TAUNT:'#FF5252',SHATTER:'#FF1744',
  HASTE:'#00E5FF',DODGE:'#40C4FF',REFLECT:'#80D8FF',
  SILENCE:'#9C27B0',HEX:'#7B1FA2',BLIND:'#4A148C',MARK:'#E91E63',
  HEAL:'#66BB6A',BLESS:'#FFF176',INSPIRE:'#FFAB40',
  WEAKEN:'#5C6BC0',TETHER:'#3F51B5',NULLIFY:'#7986CB',DRAIN:'#4455BB',
  POISON:'#76FF03',CORRODE:'#C6FF00',WITHER:'#69F0AE',INFECT:'#AEEA00',
  FEAST:'#FF6090',BARRIER:'#B0BEC5',CLEANSE:'#E0E0E0',
};

function _effectHex(tag) {
  var k = (tag||'').replace(/\s.*$/,'').toUpperCase();
  return EFFECT_HEX[k] || '#D4A64B';
}

// Legacy pill class fallback (kept for any old cards still using bonus_effects)
function _pillColor(tag) { return 'gray'; }

// ── EFFECT TOOLTIPS (Combat V2 + Effects V2) ──
var EFFECT_TIPS = {
  BURN:    'Extra fire damage per attack (+3 to +8 by rarity)',
  CHAIN:   'Attack hits 2 targets instead of 1',
  EXECUTE: '+50% damage to enemies below 30% HP',
  SURGE:   '+50% ATK permanently, but take +25% damage',
  PIERCE:  'Ignores WARD and BARRIER shields',
  HEAL:    'Heal lowest HP ally per attack (+10 to +25 by rarity)',
  WARD:    'Block the next incoming hit (10s duration)',
  ANCHOR:  'Can\u2019t drop below 1 HP (10s duration)',
  THORNS:  'Reflect 15 damage to attacker per hit taken',
  BARRIER: 'Absorb 30-50 total damage (one shield, doesn\u2019t regenerate)',
  DRAIN:   'Heal self for 5% of damage dealt',
  FEAST:   'When any enemy is KO\u2019d, heal 15% of their max HP',
  WEAKEN:  'Target deals 50% damage (10s duration)',
  HEX:     '-10 ATK per stack, stacks x3 (10s duration)',
  SILENCE: 'Target card effects don\u2019t trigger (10s duration)',
  HASTE:   '+10 SPD (10s duration)',
  SWIFT:   'All card effects trigger at 2x for first 10s after deploy',
  DODGE:   '3s invulnerability after taking a hit (10s cooldown)',
  POISON:  'DOT ticking every 3s for 12s, stacks x3',
  CORRODE: 'All enemies lose 1 max HP every 10s while you\u2019re alive',
  INFECT:  'On KO, all enemies get POISON',
  LEECH_AURA: 'Steal small HP from all enemies each tick',
  AMPLIFY: 'Next ally to attack gets +50% effect strength',
  INSPIRE: 'All allies gain +3 ATK and +3 SPD (10s duration)',
  BLESS:   'Heal 3 lowest HP allies per attack (+5 HP each)',
  SHATTER: 'On death, deal 10% of max HP to all enemies',
  TETHER:  'Link to target, share all damage 50/50 (10s duration)',
  REFLECT: 'Next hit bounces back at full damage (10s duration)',
  PHASE:   'After attacking, untargetable for 3s (can\u2019t attack while phased)',
  MARK:    'Highest HP enemy takes +25% damage from all sources (10s)',
  CLEANSE: 'Remove all debuffs from self',
  OVERCHARGE: 'All card effects fire twice per attack (costs 2% sharpness/snapshot)',
  SLOW:    '-15 SPD (10s duration)',
  TAUNT:   'All enemies must attack this Nine (10s duration)',
  STEALTH: 'Can\u2019t be single-targeted (still takes AOE/CHAIN, 10s)',
  PARASITE: 'Attach to target, heal 3 HP every time they attack',
  RESURRECT: 'On KO, revive at 30% HP (5-min cooldown)',
  GRAVITY: 'On deploy, all enemies hit you once (incoming damage -50%)',
  MIRROR:  'When hit by an effect, copy it back to attacker (10s cooldown)',
};

// ── PARTICLE TYPE PER HOUSE ──
var PARTICLE_MAP = {
  smoulders: 'ember', darktide: 'bubble', stonebark: 'petal',
  ashenvale: 'leaf', stormrage: 'lightning', nighthollow: 'wisp',
  dawnbringer: 'mote', manastorm: 'rune', plaguemire: 'spore',
  universal: 'mote',
};

// ── SAFE ESCAPE (fallback if page doesn't define esc) ──
var _esc = (typeof esc === 'function') ? esc : function(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};


/* ═══════════════════════════════════════════════════════════
   buildCardV4(spell, options)

   spell = {
     name, house, spell_type, rarity,
     base_atk, base_hp, base_spd, base_def, base_luck,
     base_effect, bonus_effects (array or JSON string),
     flavor_text, image_url,
     sharpness (0-100, default 100), deployed_zone
   }

   options = {
     size: 'normal' | 'mini' | 'tiny' | 'zoom'  (default: 'normal')
     delay: 0  (transition delay in seconds)
   }

   Returns: HTML string
   ═══════════════════════════════════════════════════════════ */
function buildCardV4(s, options) {
  var opts = options || {};
  var size = opts.size || 'normal';
  var delay = opts.delay || 0;

  // Resolve house
  var houses = (typeof HOUSES !== 'undefined') ? HOUSES : CARD_HOUSES;
  var h = houses[s.house] || houses.universal || CARD_HOUSES.universal;
  var hc = h.color;
  var houseName = h.name || 'Universal';
  var houseImg = h.img || '';

  // Resolve effects
  var bn = [];
  bn = []; // V3: single effect only, shown via effect_1/base_effect above

  // Resolve rarity
  var rarity = s.rarity || 'common';
  var rc = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  var foilMult = rc.foil;
  var pType = PARTICLE_MAP[s.house] || 'mote';
  var spellType = s.spell_type || 'attack';

  // Size class
  var sizeClass = '';
  if (size === 'mini') sizeClass = ' sc-mini-card';
  else if (size === 'tiny') sizeClass = ' sc-tiny-card';
  else if (size === 'zoom') sizeClass = ' sc-zoom';

  // Sharpness value (V5)
  var sharpness = (s.sharpness !== undefined && s.sharpness !== null) ? s.sharpness : 100;
  var sharpPct = Math.max(0, Math.min(100, sharpness));

  // Sharpness / deployed classes
  var stateClasses = '';
  if (sharpPct === 0) stateClasses += ' spell-card--degraded';
  else if (sharpPct <= 50) stateClasses += ' spell-card--worn';
  if (sharpPct === 100) stateClasses += ' spell-card--pristine';
  if (s.deployed_zone) stateClasses += ' spell-card--deployed';
  if (rarity === 'legendary') stateClasses += ' spell-card--legendary';

  // ── House crest (inline) ──
  var logoInline = houseImg
    ? '<img class="sc-house-logo--inline" src="' + houseImg + '" onerror="this.style.display=\'none\'">'
    : '<span class="sc-house-logo--inline" style="display:flex;align-items:center;justify-content:center;font-size:16px;opacity:0.5;width:24px;height:24px;border-radius:4px;background:' + hc + '30;border:1px solid ' + hc + '50;color:' + hc + ';font-family:Cinzel,serif;font-weight:800;font-size:12px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.9))">' + houseName[0] + '</span>';

  // ── Crest watermark ──
  var crestWM = houseImg
    ? '<img class="sc-crest-watermark" src="' + houseImg + '" onerror="this.style.display=\'none\'">'
    : '';

  // ── Art image or gradient area ──
  var hasArt = s.image_url && s.image_url.length > 0;
  var artSrc = (s.image_url && s.image_url.indexOf('http') === 0) ? s.image_url : '/assets/images/spells/' + s.image_url;
  var artImg = hasArt
      ? '<div class="sc-art-img" style="background-image:url(' + _esc(artSrc) + ')"></div>'
      : '';

  // ── STAT ROW ──
  var statHtml = '';
  var stats = [];
  if (s.base_atk > 0)  stats.push({ k: 'atk',  v: s.base_atk });
  if (s.base_hp > 0)   stats.push({ k: 'hp',   v: s.base_hp });
  if (s.base_spd > 0)  stats.push({ k: 'spd',  v: s.base_spd });
  if (s.base_def > 0)  stats.push({ k: 'def',  v: s.base_def });
  if (s.base_luck > 0) stats.push({ k: 'luck', v: s.base_luck });

  if (stats.length > 0) {
    var lbls = { atk: 'ATK', hp: 'HP', spd: 'SPD', def: 'DEF', luck: 'LCK' };
    statHtml = '<div class="sc-stat-row">';
    stats.forEach(function(st, i) {
      if (i > 0) statHtml += '<div class="sc-stat-divider"></div>';
      statHtml += '<div class="sc-stat-item">'
        + '<div class="sc-stat-val sc-stat-val--' + st.k + '">' + st.v + '</div>'
        + '<div class="sc-stat-label sc-stat-label--' + st.k + '">' + lbls[st.k] + '</div>'
        + '</div>';
    });
    statHtml += '</div>';
  }

  // ── THIN RULE ──
  var ruleHtml = '<div class="sc-rule" style="--hc-rule:' + hc + '25"></div>';

  // ── RARITY BADGE ──
  var rarityHtml = '<span class="sc-rarity ' + rc.cls + '">' + rc.label + '</span>';

  // ── TYPE LABEL — abbreviate on small sizes ──
  var TYPE_SHORT = { manipulation: 'Manip.', attack: 'Attack', defend: 'Defend', support: 'Support', utility: 'Utility' };
  var typeDisplay = (size === 'mini' || size === 'tiny')
    ? (TYPE_SHORT[spellType] || spellType.charAt(0).toUpperCase() + spellType.slice(1))
    : spellType.charAt(0).toUpperCase() + spellType.slice(1);
  var typeHtml = '<span class="sc-type">' + typeDisplay + '</span>';

  // ── BASE EFFECT TEXT ──
  // ── BASE EFFECT — read effect_1 (V3), fallback to base_effect (legacy) ──
  var effectHtml = '';
  var primaryEffect = s.effect_1 || s.base_effect || '';
  if (primaryEffect && primaryEffect !== '—' && primaryEffect !== '-') {
    var eColor = _effectHex(primaryEffect);
    effectHtml = '<div class="sc-effect"><div class="sc-effect__base" style="color:' + eColor + '">' + _esc(primaryEffect) + '</div></div>';
  }

  // ── EFFECT PILLS with tooltips ──
  var pillsHtml = '';
  if (bn.length > 0) {
    pillsHtml = '<div class="sc-pills">';
    bn.forEach(function(b) {
      var tag = b.tag || b.key || b;
      if (typeof tag !== 'string') tag = String(tag);
      var origDesc = b.desc || b.description || tag;
      var baseTag = tag.replace(/[^A-Z]/gi, '').toUpperCase();
      var tipText = EFFECT_TIPS[baseTag] || origDesc;
      var pColor = _effectHex(baseTag);
      pillsHtml += '<span class="pill" style="color:' + pColor + ';background:' + pColor + '18;border:1px solid ' + pColor + '40">'
        + _esc(tag)
        + '<span class="tip"><b style="font-family:\'Press Start 2P\',monospace;font-size:8px">' + _esc(baseTag) + '</b> — ' + _esc(tipText) + '</span>'
        + '</span>';
    });
    pillsHtml += '</div>';
  }

  // ── SHARPNESS BAR (V5 — replaces durability) ──
  var sharpHtml = '';
  var sharpColor = sharpPct > 60 ? '#44cc88' : sharpPct > 30 ? '#ffcc44' : sharpPct > 0 ? '#ff5555' : '#555';
  sharpHtml = '<div class="sc-sharpness">'
    + '<div class="sc-sharp-track"><div class="sc-sharp-fill" style="width:' + sharpPct + '%;background:linear-gradient(90deg,' + sharpColor + ',' + sharpColor + '88)"></div></div>'
    + '<span class="sc-sharp-text">' + sharpPct + '%</span>'
    + '</div>';

  // ── FLAVOR TEXT ──
  var flavorHtml = '';
  if (s.flavor_text || s.motto) {
    flavorHtml = '<div class="sc-flavor">"' + _esc(s.flavor_text || s.motto) + '"</div>';
  }

  // ═══ ASSEMBLE ═══
  // v4.3 LAYOUT CHANGE: Stats moved below effects, above house rule
  // Old order: stats → rule → type/effects → house
  // New order: type/effects → stats → rule → house
  return '<div class="spell-card' + sizeClass + stateClasses + '"'
    + ' data-house="' + s.house + '"'
    + ' data-type="' + spellType + '"'
    + ' data-rarity="' + rarity + '"'
    + ' data-color="' + hc + '"'
    + ' data-glow="' + hc + '"'
    + ' data-particle="' + pType + '"'
    + ' data-foil-s="0.18" data-foil-w="0.1" data-num="50"'
    + ' data-sharpness="' + sharpPct + '"'
    + ' style="'
      + '--hc:' + hc + ';'
      + '--hc-shadow:' + hc + '30;'
      + '--edge-color:' + hc + '20;'
      + '--edge-hover:' + hc + '40;'
      + '--inner-glow:' + hc + '08;'
      + '--inner-glow-hover:' + hc + '15;'
      + '--foil-mult:' + foilMult + ';'
      + '--card-bg:linear-gradient(180deg,' + hc + '0A,#0c0a14 35%,#0a0810);'
      + 'transition-delay:' + delay + 's'
    + '">'

    // Layers
    + '<div class="sc-border"></div>'
    + '<div class="sc-face">'
    +   '<div class="sc-art-area"></div>'
    +   artImg
    +   '<div class="sc-inner-edge"></div>'
    +   '<div class="sc-foil"></div>'
    +   '<div class="sc-rainbow"></div>'
    +   '<canvas class="sc-particles"></canvas>'
    +   '<div class="sc-glow"></div>'
    + '</div>'
    + crestWM

    // Body — NEW ORDER: effects first, stats at bottom
    + '<div class="sc-body">'
      + '<div class="sc-top">' + logoInline + '<div class="sc-name">' + _esc(s.name) + '</div></div>'
      + '<div style="flex:1"></div>'
      + '<div class="sc-info-panel">'
        + '<div class="sc-info">'
          + '<div class="sc-type-row">' + typeHtml + '<span class="sc-type-spacer"></span>' + rarityHtml + '</div>'
          + effectHtml
          + pillsHtml
          + sharpHtml
          + flavorHtml
        + '</div>'
        + statHtml
        + ruleHtml
        + '<div class="sc-bottom house-name-' + s.house + '" style="color:' + hc + '">' + houseName.toUpperCase() + '</div>'
      + '</div>'
    + '</div>'

    // Sharpness overlays (full card, above everything)
    + (sharpPct < 50 ? '<div class="sc-degrade-overlay"></div>' : '')
    + (sharpPct === 100 ? '<div class="sc-pristine-gleam"></div>' : '')

  + '</div>';
}

/* ═══ BACKWARD COMPAT — old buildCard(s, delay) signature ═══ */
function buildCard(s, delay) {
  return buildCardV4(s, { delay: delay || 0 });
}

/* ═══ HELPER: Init particles on all cards in a container ═══ */
function initCardParticles(container) {
  if (typeof initParticles !== 'function') return;
  var cards = (container || document).querySelectorAll('.spell-card canvas.sc-particles');
  cards.forEach(function(canvas) {
    var card = canvas.closest('.spell-card');
    if (!card || canvas._particlesInit) return;
    canvas._particlesInit = true;
    initParticles(canvas, card.dataset.particle || 'mote', card.dataset.color || '#D4A64B');
  });
}

/* ═══ HELPER: Init foil mouse-follow on all cards ═══ */
function initCardFoil(container) {
  var cards = (container || document).querySelectorAll('.spell-card');
  cards.forEach(function(card) {
    if (card._foilInit) return;
    card._foilInit = true;
    card.addEventListener('mousemove', function(e) {
      var r = card.getBoundingClientRect();
      var mx = (e.clientX - r.left) / r.width;
      var my = (e.clientY - r.top) / r.height;
      var angle = 135 + (mx - 0.5) * 60 + (my - 0.5) * 40;

      var foil = card.querySelector('.sc-foil');
      var rainbow = card.querySelector('.sc-rainbow');
      var glow = card.querySelector('.sc-glow');
      var border = card.querySelector('.sc-border');
      var foilMult = parseFloat(card.style.getPropertyValue('--foil-mult')) || 0;

      if (foil) {
        foil.style.background = 'linear-gradient(' + angle + 'deg,transparent 0%,rgba(255,255,255,0) 20%,rgba(255,255,255,' + (foilMult * 0.2) + ') 40%,rgba(255,230,180,' + (foilMult * 0.14) + ') 50%,rgba(255,255,255,' + (foilMult * 0.2) + ') 60%,rgba(255,255,255,0) 80%,transparent 100%)';
      }
      if (rainbow) {
        rainbow.style.background = 'linear-gradient(' + angle + 'deg,transparent 10%,rgba(255,50,50,' + (foilMult * 0.07) + ') 22%,rgba(255,165,0,' + (foilMult * 0.07) + ') 30%,rgba(255,255,0,' + (foilMult * 0.07) + ') 38%,rgba(0,255,120,' + (foilMult * 0.07) + ') 46%,rgba(0,180,255,' + (foilMult * 0.07) + ') 54%,rgba(128,0,255,' + (foilMult * 0.07) + ') 62%,rgba(255,0,180,' + (foilMult * 0.07) + ') 70%,transparent 85%)';
      }
      if (glow) {
        var hc = card.dataset.color || '#D4A64B';
        glow.style.background = 'radial-gradient(circle at ' + (mx * 100) + '% ' + (my * 100) + '%,' + hc + '08,transparent 45%)';
      }
      if (border) {
        var hc2 = card.dataset.color || '#D4A64B';
        var isLeg = card.classList.contains('spell-card--legendary');
        border.style.background = isLeg
          ? 'conic-gradient(from ' + angle + 'deg,transparent,' + hc2 + ',#FFD700,' + hc2 + ',transparent)'
          : 'conic-gradient(from ' + angle + 'deg,transparent,' + hc2 + ' 8%,transparent 16%)';
      }
    });
  });
}

/* ═══ FIX 6: Auto-scale card names to fit available space ═══ */
function fitCardNames(container) {
  var names = (container || document).querySelectorAll('.spell-card .sc-name');
  names.forEach(function(el) {
    if (el._fitDone) return;
    el._fitDone = true;
    el.style.textOverflow = 'clip';
    var baseSize = parseFloat(window.getComputedStyle(el).fontSize) || 15;
    var fs = baseSize;
    var safety = 0;
    while (el.scrollWidth > el.clientWidth && fs > 7 && safety < 20) {
      fs -= 0.5;
      el.style.fontSize = fs + 'px';
      safety++;
    }
    el.style.textOverflow = 'ellipsis';
  });
}

/* ═══ TOOLTIPS — render at body level to escape card overflow:hidden ═══ */
var _scTooltip = null;

function _showTooltip(pill) {
  var tip = pill.querySelector('.tip');
  if (!tip) return;

  if (!_scTooltip) {
    _scTooltip = document.createElement('div');
    _scTooltip.className = 'sc-tooltip';
    document.body.appendChild(_scTooltip);
  }

  _scTooltip.innerHTML = tip.innerHTML;
  _scTooltip.style.display = 'block';
  _scTooltip.style.visibility = 'hidden';

  var pr = pill.getBoundingClientRect();
  var tr = _scTooltip.getBoundingClientRect();

  var top = pr.top - tr.height - 8;
  var left = pr.left + (pr.width / 2) - (tr.width / 2);

  if (top < 8) top = pr.bottom + 8;
  if (left < 8) left = 8;
  if (left + tr.width > window.innerWidth - 8) left = window.innerWidth - tr.width - 8;

  _scTooltip.style.top = top + 'px';
  _scTooltip.style.left = left + 'px';
  _scTooltip.style.visibility = 'visible';
}

function _hideTooltip() {
  if (_scTooltip) _scTooltip.style.display = 'none';
}

function fixTooltipPositions(container) {
  var pills = (container || document).querySelectorAll('.spell-card .pill');
  pills.forEach(function(pill) {
    if (pill._tipFixed) return;
    pill._tipFixed = true;
    pill.addEventListener('mouseenter', function() { _showTooltip(pill); });
    pill.addEventListener('mouseleave', _hideTooltip);
  });
}

/* ═══ MASTER INIT — call once after rendering cards ═══ */
function initCards(container) {
  initCardParticles(container);
  initCardFoil(container);
  fitCardNames(container);
  fixTooltipPositions(container);
}

/* ═══ BACKWARD COMPAT — aliases for existing pages ═══ */
var buildSpellCard = buildCardV4;

/* ═══ AUTO-INIT — watches for new cards, inits them automatically ═══ */
(function(){
  if (!('MutationObserver' in window)) return;
  var timer = null;
  var obs = new MutationObserver(function(mutations) {
    var found = false;
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var n = added[j];
        if (n.nodeType === 1 && (n.classList && n.classList.contains('spell-card') || n.querySelector && n.querySelector('.spell-card'))) {
          found = true; break;
        }
      }
      if (found) break;
    }
    if (found) {
      clearTimeout(timer);
      timer = setTimeout(function(){ initCards(); }, 120);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();