// ═══ SHARED SPELL CARD BUILDER ═══
// Include this file on any page that renders spell cards.
// Requires: HOUSES object (slug-keyed), pillCol(), esc() functions, 
//           spell-particles.js, components-v2.css
//
// Usage:  buildSpellCard(spell, { delay, rarity, mini, onclick })
//   spell   = spell data object from API
//   options = { delay: 0, rarity: 'common', mini: false, onclick: null }

// Fallback pillCol if page doesn't define one
if (typeof pillCol === 'undefined') {
  var _PC={'BURN':'orange','SCALD':'orange','SPREAD':'red','ERUPTION':'red','DRAIN':'purple','PULL':'blue','REFLECT':'cyan','CLOAK':'dark','SWAP':'pink','WEAKEN':'orange','ANCHOR':'brown','HEAL':'green','THORNS':'green','CONVERT':'cyan','SWIFT':'white','HASTE':'cyan','FREE':'cyan','DODGE':'ice','CRIT':'yellow','CHAIN':'blue','AMPLIFY':'purple','HEX':'purple','SILENCE':'gray','FREEZE':'ice','PIERCE':'white','ABSORB':'blue','INFECT':'toxic','CORRODE':'toxic','POISON':'toxic','SURGE':'yellow','WARD':'gold','INSPIRE':'gold','BLESS':'gold','SIPHON':'purple'};
  window.pillCol = function(tag){var k=tag.replace(/[\+\d\s×x\.]/g,'').toUpperCase();for(var p in _PC){if(k.indexOf(p)!==-1)return _PC[p];}return'gray';};
}
// Fallback esc if page doesn't define one
if (typeof esc === 'undefined') {
  window.esc = function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
}

var RARITY_COLORS = {
  common:    { color: '#bbb',    border: '#bbb30', label: 'COMMON',    mult: '×1.0' },
  uncommon:  { color: '#66dd66', border: '#66dd6630', label: 'UNCOMMON',  mult: '×1.25' },
  rare:      { color: '#55bbff', border: '#55bbff30', label: 'RARE',      mult: '×1.5' },
  epic:      { color: '#bb88ff', border: '#bb88ff30', label: 'EPIC',      mult: '×2.0' },
  legendary: { color: '#ffd700', border: '#ffd70030', label: 'LEGENDARY', mult: '×3.0' }
};

var PARTICLE_MAP = {
  universal: 'stardust', smoulders: 'embers', darktide: 'bubbles',
  stonebark: 'spores', ashenvale: 'wind', stormrage: 'sparks',
  nighthollow: 'shadows', dawnbringer: 'rays', manastorm: 'arcane',
  plaguemire: 'toxic'
};

function buildSpellCard(s, opts) {
  opts = opts || {};
  var delay = opts.delay || 0;
  var rarity = opts.rarity || s.rarity || null;
  var mini = opts.mini || false;
  var onclick = opts.onclick || null;

  // Resolve house - check slug-keyed HOUSES, then SLUG_MAP, then HOUSES_BY_SLUG
  var h;
  if (typeof HOUSES === 'object' && HOUSES[s.house]) {
    h = HOUSES[s.house];
  } else if (typeof SLUG_MAP === 'object' && SLUG_MAP[s.house]) {
    h = SLUG_MAP[s.house];
  } else if (typeof HOUSES_BY_SLUG === 'object' && HOUSES_BY_SLUG[s.house]) {
    h = HOUSES_BY_SLUG[s.house];
  } else {
    // Fallback - try HOUSES.universal or a default
    h = (typeof HOUSES === 'object' && HOUSES.universal) || { name: 'Universal', color: '#D4A64B', img: null };
  }

  // Parse effects - handle multiple field names from different API shapes
  var bn = [];
  try {
    var ef = s.effects || s.bonus_effects || [];
    bn = typeof ef === 'string' ? JSON.parse(ef) : ef;
    if (!Array.isArray(bn)) bn = [];
  } catch (e) { bn = []; }

  // Mana cost - handle different field names
  var cost = s.cost || s.mana_cost || 1;
  var mo = '<div class="sc-mana' + (mini ? ' sc-mana--mini' : '') + '">' + cost + ' MP</div>';

  // Spell type
  var spellType = s.type || s.spell_type || 'attack';

  // Art icon
  var ai = h.img ? '<img src="' + h.img + '" onerror="this.style.display=\'none\'">' : '<span style="font-size:' + (mini ? '18' : '28') + 'px;position:relative;z-index:1">\u2726</span>';

  // Rarity badge
  var rb = '';
  if (rarity && RARITY_COLORS[rarity]) {
    var rc = RARITY_COLORS[rarity];
    rb = '<span class="sc-rarity sc-rarity--' + rarity + '">' + rc.label + ' ' + rc.mult + '</span>';
  }

  // Pills
  var pl = '';
  if (bn.length > 0) {
    pl = '<div class="sc-pills">';
    bn.forEach(function (b) {
      var tag = (typeof b === 'string') ? b : (b.tag || b.key || '');
      var desc = (typeof b === 'string') ? tag : (b.desc || b.description || tag);
      pl += '<span class="pill p-' + pillCol(tag) + '">' + esc(tag) + '<span class="tip">' + esc(desc) + '</span></span>';
    });
    pl += '</div>';
  }

  // Base effect
  var be = '';
  if (s.base_effect && s.base_effect !== '\u2014' && s.base_effect !== '-') {
    be = '<div class="sc-effect"><div class="sc-effect__base" style="color:' + h.color + '">' + esc(s.base_effect) + '</div></div>';
  }

  // Art block
  var hasArt = s.image_url && s.image_url.length > 0;
  var artImg = hasArt ? '<div class="sc-art-img" style="background-image:url(/assets/images/spells/' + esc(s.image_url) + ')"></div>' : '';
  var artH = mini ? '60px' : null;
  var artBlock;
  if (hasArt) {
    artBlock = '<div class="sc-art-spacer"></div>';
  } else {
    artBlock = '<div class="sc-art"' + (artH ? ' style="height:' + artH + '"' : '') + '>'
      + '<div class="sc-art__bg" style="background:radial-gradient(ellipse at 50% 40%,' + h.color + '12,transparent 65%),linear-gradient(180deg,rgba(10,8,6,0.5),rgba(14,12,10,0.7))"></div>'
      + '<div class="sc-art__glow" style="background:radial-gradient(circle,' + h.color + '0A,transparent 70%)"></div>'
      + ai
      + '<div class="sc-art__corner sc-art__corner--tl" style="background:' + h.color + '25"></div>'
      + '<div class="sc-art__corner sc-art__corner--tr" style="background:' + h.color + '25"></div>'
      + '<div class="sc-art__corner sc-art__corner--bl" style="background:' + h.color + '25"></div>'
      + '<div class="sc-art__corner sc-art__corner--br" style="background:' + h.color + '25"></div>'
      + '</div>';
  }

  // House decorations
  var pType = PARTICLE_MAP[s.house] || 'stardust';
  var houseLogo = h.img ? '<img class="sc-house-logo" src="' + h.img + '" onerror="this.style.display=\'none\'">' : '';
  var crestWM = h.img ? '<img class="sc-crest-watermark" src="' + h.img + '" onerror="this.style.display=\'none\'">' : '';

  // Flavor
  var flavor = s.flavor_text || s.motto || '';

  // Card size
  var numParticles = mini ? 25 : 35;
  var showClass = mini ? ' show' : '';

  // Type row: type badge + spacer + rarity (if present) or house tag
  var typeRow = '<div class="sc-type-row">'
    + '<span class="sc-type sc-type--' + spellType + '">' + spellType + '</span>'
    + '<span class="sc-type-spacer"></span>'
    + (rb || '<span class="sc-house-tag" style="color:' + h.color + '">' + (h.name || '').toUpperCase() + '</span>')
    + '</div>';

  // Onclick
  var onclickAttr = onclick ? ' onclick="' + onclick + '"' : '';

  return '<div class="spell-card' + showClass + '"'
    + ' data-house="' + s.house + '"'
    + ' data-type="' + spellType + '"'
    + (rarity ? ' data-rarity="' + rarity + '"' : '')
    + ' data-color="' + h.color + '"'
    + ' data-glow="' + h.color + '"'
    + ' data-particle="' + pType + '"'
    + ' data-foil-s="0.18" data-foil-w="0.1"'
    + ' data-num="' + numParticles + '"'
    + ' style="--hc:' + h.color + ';--hc-shadow:' + h.color + '30;--edge-color:' + h.color + '20;--edge-hover:' + h.color + '40;--inner-glow:' + h.color + '08;--inner-glow-hover:' + h.color + '15;--card-bg:linear-gradient(180deg,' + h.color + '0A,#0c0a14 35%,#0a0810);transition-delay:' + delay + 's"'
    + onclickAttr + '>'
    + '<div class="sc-border"></div><div class="sc-edge"></div>'
    + '<div class="sc-face">' + artImg + '<div class="sc-inner-edge"></div>'
    + '<div class="sc-foil"></div><div class="sc-rainbow"></div>'
    + '<canvas class="sc-particles"></canvas><div class="sc-glow"></div></div>'
    + houseLogo + crestWM
    + '<div class="sc-body">'
    + '<div class="sc-top"><div class="sc-name">' + esc(s.name) + '</div>' + mo + '</div>'
    + artBlock
    + '<div class="sc-info">'
    + typeRow
    + be + pl
    + (flavor ? '<div class="sc-flavor">"' + esc(flavor) + '"</div>' : '')
    + '<div class="sc-bottom" style="color:' + h.color + '">' + (h.name || '').toUpperCase() + '</div>'
    + '</div></div></div>';
}