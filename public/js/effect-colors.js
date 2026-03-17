// ══════════════════════════════════════════════════════════════════════
// EFFECT COLOURS — V3 Final
// Every effect has a unique colour grouped by house palette
// Import or include this before any effect pill rendering
// ══════════════════════════════════════════════════════════════════════

const EFFECT_COLORS = {
  // ── Stormrage ⚡ electric yellow / gold ──────────────────────────
  CHAIN:   '#FFD700',
  CRIT:    '#FFEE00',
  PIERCE:  '#FFC040',

  // ── Smoulders 🔥 fire orange / red ───────────────────────────────
  BURN:    '#FF6B35',
  SURGE:   '#FF3355',
  EXECUTE: '#FF9500',

  // ── Stonebark 🌿 earth green / bark brown ─────────────────────────
  WARD:    '#8BC34A',
  ANCHOR:  '#6D4C41',
  THORNS:  '#558B2F',
  TAUNT:   '#FF5252',
  SHATTER: '#FF1744',

  // ── Ashenvale 💨 wind cyan / sky blue ─────────────────────────────
  HASTE:   '#00E5FF',
  DODGE:   '#40C4FF',
  REFLECT: '#80D8FF',

  // ── Nighthollow 🌙 shadow purple / dark violet ─────────────────────
  SILENCE: '#9C27B0',
  HEX:     '#7B1FA2',
  BLIND:   '#4A148C',
  MARK:    '#E91E63',

  // ── Dawnbringer ☀️ holy amber / warm gold ─────────────────────────
  HEAL:    '#66BB6A',
  BLESS:   '#FFF176',
  INSPIRE: '#FFAB40',

  // ── Manastorm 🔮 arcane blue / indigo ─────────────────────────────
  WEAKEN:  '#5C6BC0',
  TETHER:  '#3F51B5',
  NULLIFY: '#7986CB',
  DRAIN:   '#4455BB',  // lightened from #1A237E for readability

  // ── Plaguemire ☠️ acid green / sickly lime ─────────────────────────
  POISON:  '#76FF03',
  CORRODE: '#C6FF00',
  WITHER:  '#69F0AE',
  INFECT:  '#AEEA00',

  // ── Darktide 🌊 blood pink / deep teal ────────────────────────────
  FEAST:   '#FF6090',

  // ── Universal ─────────────────────────────────────────────────────
  BARRIER: '#B0BEC5',
  CLEANSE: '#E0E0E0',  // off-white so it shows on light backgrounds
};

// Helper — get colour for an effect, fallback to gold
function getEffectColor(effect) {
  if (!effect) return '#D4A64B';
  const key = effect.toString().toUpperCase().split(' ')[0];
  return EFFECT_COLORS[key] || '#D4A64B';
}

// Helper — render an effect pill as HTML string
function effectPillHTML(effect) {
  if (!effect) return '';
  const tag = effect.toString().toUpperCase().split(' ')[0];
  const color = EFFECT_COLORS[tag] || '#D4A64B';
  return `<span class="effect-pill" style="color:${color};background:${color}18;border:1px solid ${color}40">${tag}</span>`;
}

// Export for Node.js environments (card builder, combat engine logging)
if (typeof module !== 'undefined') {
  module.exports = { EFFECT_COLORS, getEffectColor, effectPillHTML };
}
