/* ═══════════════════════════════════════════════════════════
   card-v4.js — THE card renderer for Nine Lives Network
   v4.2 — Single source of truth

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

// ── PILL COLOR MAP ──
var PILL_MAP = {
  'BURN':'orange','SCALD':'orange','CHAIN':'orange','CRIT':'yellow','SURGE':'orange',
  'PIERCE':'red','HEAL':'green','WARD':'gold','ANCHOR':'brown','THORNS':'green',
  'DRAIN':'purple','SIPHON':'dark','WEAKEN':'pink','HEX':'purple','SILENCE':'dark',
  'HASTE':'green','SWIFT':'green','DODGE':'green','FREE':'green',
  'POISON':'toxic','CORRODE':'toxic','INFECT':'toxic',
  'AMPLIFY':'gold','INSPIRE':'orange','BLESS':'white',
  'SPREAD':'red','STRIP':'red','ERUPTION':'red','PULL':'blue','REFLECT':'cyan',
  'CLOAK':'dark','STEALTH':'dark','SWAP':'pink','CONVERT':'cyan','PERSIST':'gold',
  'REACH':'white','SWEEP':'gray','FIZZLE':'yellow','NIGHT':'dark',
  'STEAL':'red','FREEZE':'ice','ABSORB':'blue','RANDOMIZE':'pink','NEGATE':'white',
  'REFUND':'cyan','WITHER':'brown','PLAGUE':'toxic','TOXIC':'toxic','LOCKOUT':'red',
  'UNDERDOG':'gold','AURA':'gold','GIFT':'white','JUSTICE':'gold','SAFE':'gold',
  'RESTORE':'cyan','RESET':'cyan','REVEAL':'white','DOT':'green','BONUS':'gold',
  'PURGE':'orange','PUSH':'ice','SHUFFLE':'blue','CURSE':'purple','VANISH':'dark',
  'IMMUNE':'cyan','PUSH':'ice',
};

function _pillColor(tag) {
  var k = tag.replace(/[^A-Z]/g, '').toUpperCase();
  for (var p in PILL_MAP) {
    if (k.indexOf(p) !== -1) return PILL_MAP[p];
  }
  return 'gray';
}

// ── EFFECT TOOLTIPS (from Game Design V3 §15) ──
var EFFECT_TIPS = {
  BURN:    'Extra damage over time each cycle',
  CHAIN:   'Attack hits 2 targets instead of 1',
  CRIT:    '25% chance to deal double ATK',
  SURGE:   '+50% ATK but costs +1 extra mana',
  PIERCE:  'Ignore enemy shields and WARD',
  HEAL:    'Restore HP to self or lowest-HP ally',
  WARD:    'Absorb next hit — blocks one attack',
  ANCHOR:  "Can't drop below 1 HP this cycle",
  THORNS:  'Attackers take 3 damage back',
  DRAIN:   'Steal HP from target',
  SIPHON:  'Steal HP from ALL enemies on zone',
  WEAKEN:  'Target deals 50% damage this cycle',
  HEX:     'Target loses 2 ATK this cycle',
  SILENCE: "Target's card effect doesn't activate",
  HASTE:   '+3 SPD this cycle (act first)',
  SWIFT:   'First card of the day: effect doubled',
  DODGE:   '30% chance to avoid all damage',
  FREE:    'Card costs 0 mana this cast',
  POISON:  'Damage per cycle, stacks, ignores DEF',
  CORRODE: 'All enemies lose 1 max HP until midnight',
  INFECT:  'If target KO, POISON spreads',
  AMPLIFY: 'Next friendly effect is 50% stronger',
  INSPIRE: 'Allies get +1 ATK next cycle',
  BLESS:   'Allies heal +2 HP per cycle',
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
     mana_cost, base_atk, base_hp, base_spd, base_def, base_luck,
     base_effect, bonus_effects (array or JSON string),
     flavor_text, image_url,
     current_charges, max_charges, is_exhausted, deployed_zone
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
  try {
    bn = typeof s.bonus_effects === 'string' ? JSON.parse(s.bonus_effects) : (s.bonus_effects || []);
  } catch(e) { bn = []; }
  if (!Array.isArray(bn)) bn = [];

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

  // Exhausted / deployed classes
  var stateClasses = '';
  if (s.is_exhausted) stateClasses += ' spell-card--exhausted';
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

  // ── Mana pill (flex aligned) ──
  var manaHtml = '<div class="sc-mana"><span class="sc-mana-icon">💧</span><span class="sc-mana-num">' + s.mana_cost + '</span></div>';

  // ── Art image or gradient area ──
  var hasArt = s.image_url && s.image_url.length > 0;
  var artImg = hasArt
    ? '<div class="sc-art-img" style="background-image:url(/assets/images/spells/' + _esc(s.image_url) + ')"></div>'
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
  var effectHtml = '';
  if (s.base_effect && s.base_effect !== '—' && s.base_effect !== '-') {
    effectHtml = '<div class="sc-effect"><div class="sc-effect__base" style="color:' + hc + '">' + _esc(s.base_effect) + '</div></div>';
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
      pillsHtml += '<span class="pill p-' + _pillColor(tag) + '">'
        + _esc(tag)
        + '<span class="tip"><b style="font-family:\'Press Start 2P\',monospace;font-size:8px">' + _esc(baseTag) + '</b> — ' + _esc(tipText) + '</span>'
        + '</span>';
    });
    pillsHtml += '</div>';
  }

  // ── DURABILITY BAR ──
  var durHtml = '';
  if (s.max_charges && s.max_charges > 0) {
    var cur = s.current_charges || s.max_charges;
    var pct = Math.round((cur / s.max_charges) * 100);
    var rc2 = RARITY_CONFIG[rarity] || {};
    var durColor = ({ common:'#bbb', uncommon:'#66dd66', rare:'#55bbff', epic:'#bb88ff', legendary:'#ffd700' })[rarity] || '#888';
    durHtml = '<div class="sc-durability">'
      + '<div class="sc-dur-track"><div class="sc-dur-fill" style="width:' + pct + '%;background:linear-gradient(90deg,' + durColor + ',' + durColor + '88)"></div></div>'
      + '<span class="sc-dur-text">' + cur + '/' + s.max_charges + '</span>'
      + '</div>';
  }

  // ── FLAVOR TEXT ──
  var flavorHtml = '';
  if (s.flavor_text || s.motto) {
    flavorHtml = '<div class="sc-flavor">"' + _esc(s.flavor_text || s.motto) + '"</div>';
  }

  // ═══ ASSEMBLE ═══
  return '<div class="spell-card' + sizeClass + stateClasses + '"'
    + ' data-house="' + s.house + '"'
    + ' data-type="' + spellType + '"'
    + ' data-rarity="' + rarity + '"'
    + ' data-color="' + hc + '"'
    + ' data-glow="' + hc + '"'
    + ' data-particle="' + pType + '"'
    + ' data-foil-s="0.18" data-foil-w="0.1" data-num="50"'
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

    // Body
    + '<div class="sc-body">'
      + '<div class="sc-top">' + logoInline + '<div class="sc-name">' + _esc(s.name) + '</div>' + manaHtml + '</div>'
      + '<div style="flex:1"></div>'
      + statHtml
      + ruleHtml
      + '<div class="sc-info">'
        + '<div class="sc-type-row">' + typeHtml + '<span class="sc-type-spacer"></span>' + rarityHtml + '</div>'
        + effectHtml
        + pillsHtml
        + durHtml
        + flavorHtml
    + '<div class="sc-bottom sc-bottom--' + s.house + '" style="color:' + hc + '">' + houseName.toUpperCase() + '</div>'
      + '</div>'
      + '<div style="height:4px"></div>'
    + '</div>'

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
    // Remove ellipsis so we can measure true width
    el.style.textOverflow = 'clip';
    var baseSize = parseFloat(window.getComputedStyle(el).fontSize) || 15;
    var fs = baseSize;
    var safety = 0;
    while (el.scrollWidth > el.clientWidth && fs > 7 && safety < 20) {
      fs -= 0.5;
      el.style.fontSize = fs + 'px';
      safety++;
    }
    // Restore ellipsis as final fallback
    el.style.textOverflow = 'ellipsis';
  });
}

/* ═══ FIX 3: Flip tooltips below when card is near top of screen ═══ */
function fixTooltipPositions(container) {
  var pills = (container || document).querySelectorAll('.spell-card .pill');
  pills.forEach(function(pill) {
    if (pill._tipFixed) return;
    pill._tipFixed = true;
    pill.addEventListener('mouseenter', function() {
      var tip = pill.querySelector('.tip');
      if (!tip) return;
      tip.style.display = 'block';
      tip.style.visibility = 'hidden';
      var pr = pill.getBoundingClientRect();
      var tr = tip.getBoundingClientRect();
      var top = pr.top - tr.height - 8;
      var left = pr.left + (pr.width / 2) - (tr.width / 2);
      if (top < 8) top = pr.bottom + 8;
      if (left < 8) left = 8;
      if (left + tr.width > window.innerWidth - 8) left = window.innerWidth - tr.width - 8;
      tip.style.top = top + 'px';
      tip.style.left = left + 'px';
      tip.style.visibility = 'visible';
    });
    pill.addEventListener('mouseleave', function() {
      var tip = pill.querySelector('.tip');
      if (tip) tip.style.display = 'none';
    });
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