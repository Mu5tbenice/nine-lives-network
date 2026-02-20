/* ═══════════════════════════════════════════════════════
   card-global.js — Shared HOUSES object for spell-card-builder.js
   SAFE: Won't conflict with pages that define their own HOUSES
   ═══════════════════════════════════════════════════════ */

(function() {
  var _H = {
    universal:   { name:'Universal',   color:'#D4A64B', rgb:'212,166,75',  img:null, element:'ALL HOUSES' },
    smoulders:   { name:'Smoulders',   color:'#E03C31', rgb:'224,60,49',   img:'/assets/images/houses/House-smoulders.png', element:'FIRE' },
    darktide:    { name:'Darktide',    color:'#00B4D8', rgb:'0,180,216',   img:'/assets/images/houses/House-darktide.png',  element:'WATER' },
    stonebark:   { name:'Stonebark',   color:'#5CB338', rgb:'92,179,56',   img:'/assets/images/houses/House-stonebark.png', element:'EARTH' },
    ashenvale:   { name:'Ashenvale',   color:'#B0C4DE', rgb:'144,224,239', img:'/assets/images/houses/House-Ashenvale.png', element:'WIND' },
    stormrage:   { name:'Stormrage',   color:'#FFC800', rgb:'255,200,0',   img:'/assets/images/houses/House-stormrage.png', element:'LIGHTNING' },
    nighthollow: { name:'Nighthollow', color:'#7B2D8E', rgb:'123,45,142',  img:'/assets/images/houses/House-nighthollow.png', element:'SHADOW' },
    dawnbringer: { name:'Dawnbringer', color:'#FF8C00', rgb:'255,140,0',   img:'/assets/images/houses/House-dawnbringer.png', element:'LIGHT' },
    manastorm:   { name:'Manastorm',   color:'#5B8FE0', rgb:'91,143,224',  img:'/assets/images/houses/House-manastorm.png',  element:'ARCANE' },
    plaguemire:  { name:'Plaguemire',  color:'#E84393', rgb:'232,67,147',  img:'/assets/images/houses/House-plaguemire.png', element:'POISON' }
  };

  // Only set HOUSES if it doesn't exist OR if it's an array (game mode pages use array format)
  // buildSpellCard needs the slug-keyed object format
  if (typeof window.HOUSES === 'undefined') {
    window.HOUSES = _H;
  }
  // Always set HOUSES_BY_SLUG so buildSpellCard can find it as fallback
  window.HOUSES_BY_SLUG = _H;

  if (typeof window.HO === 'undefined') {
    window.HO = ['universal','smoulders','darktide','stonebark','ashenvale','stormrage','nighthollow','dawnbringer','manastorm','plaguemire'];
  }
  if (typeof window.esc === 'undefined') {
    window.esc = function(s) {
      return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    };
  }
})();