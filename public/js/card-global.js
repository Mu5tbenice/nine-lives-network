/* ═══════════════════════════════════════════════════════
   card-globals.js — Shared constants for card-builder-v4.js
   SAFE: Only defines variables if they don't already exist
   ═══════════════════════════════════════════════════════ */

/* === HOUSES (for buildCard) === */
if (typeof window._CARD_HOUSES === 'undefined') {
  window._CARD_HOUSES = {
    universal:   { name:'Universal',   color:'#D4A64B', rgb:'212,166,75',  img:null, element:'ALL HOUSES' },
    smoulders:   { name:'Smoulders',   color:'#E03C31', rgb:'224,60,49',   img:'/assets/images/houses/House-smoulders.png', element:'FIRE \u00b7 AGGRESSION' },
    darktide:    { name:'Darktide',    color:'#00B4D8', rgb:'0,180,216',   img:'/assets/images/houses/House-darktide.png',  element:'WATER \u00b7 CONTROL' },
    stonebark:   { name:'Stonebark',   color:'#5CB338', rgb:'92,179,56',   img:'/assets/images/houses/House-stonebark.png', element:'EARTH \u00b7 ENDURANCE' },
    ashenvale:   { name:'Ashenvale',   color:'#90E0EF', rgb:'144,224,239', img:'/assets/images/houses/House-Ashenvale.png', element:'WIND \u00b7 SPEED' },
    stormrage:   { name:'Stormrage',   color:'#FFC800', rgb:'255,200,0',   img:'/assets/images/houses/House-stormrage.png', element:'LIGHTNING \u00b7 HIGH RISK' },
    nighthollow: { name:'Nighthollow', color:'#7B2D8E', rgb:'123,45,142',  img:'/assets/images/houses/House-nighthollow.png', element:'SHADOW \u00b7 DISRUPTION' },
    dawnbringer: { name:'Dawnbringer', color:'#FF8C00', rgb:'255,140,0',   img:'/assets/images/houses/House-dawnbringer.png', element:'LIGHT \u00b7 SUPPORT' },
    manastorm:   { name:'Manastorm',   color:'#5B8FE0', rgb:'91,143,224',  img:'/assets/images/houses/House-manastorm.png',  element:'ARCANE \u00b7 MANIPULATION' },
    plaguemire:  { name:'Plaguemire',  color:'#E84393', rgb:'232,67,147',  img:'/assets/images/houses/House-plaguemire.png', element:'POISON \u00b7 ATTRITION' }
  };
}

/* Expose as HOUSES only if page hasn't already defined it */
if (typeof HOUSES === 'undefined') {
  try { HOUSES = window._CARD_HOUSES; } catch(e) { /* const already exists */ }
}

/* === House order === */
if (typeof HO === 'undefined') {
  try { HO = ['universal','smoulders','darktide','stonebark','ashenvale','stormrage','nighthollow','dawnbringer','manastorm','plaguemire']; } catch(e) {}
}

/* === HTML escape === */
if (typeof esc === 'undefined') {
  window.esc = function(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  };
}

/* === Rarity ladder (for spellbook cycling) === */
if (typeof RARITY_LADDER === 'undefined') {
  try { RARITY_LADDER = ['common','uncommon','rare','epic','legendary']; } catch(e) {}
}