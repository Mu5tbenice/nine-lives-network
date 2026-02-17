// ═══════════════════════════════════════════════════════
// server/services/gauntletEngine.js
// V3 The Gauntlet — Solo PvE Roguelike
//
// How it works:
//   1. Player pays 1 mana to start a run
//   2. Each floor: pick a card, fight an AI enemy
//   3. Your Nine keeps its HP between floors (no full heal!)
//   4. AI gets harder each floor
//   5. Run ends when your Nine hits 0 HP
//   6. Rewards based on highest floor reached
//   7. Daily reset — one run per day
//
// Cards NOT consumed (no durability cost)
// ═══════════════════════════════════════════════════════

const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const { spendMana } = require('./manaRegen');
const { getNine } = require('./nineSystem');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── AI ENEMY TEMPLATES ──
const ENEMY_TEMPLATES = [
  { name: 'Stray Kitten',        type: 'basic',    emoji: '🐱' },
  { name: 'Alley Scratcher',     type: 'basic',    emoji: '😼' },
  { name: 'Shadow Pouncer',      type: 'fast',     emoji: '🌑' },
  { name: 'Feral Howler',        type: 'attack',   emoji: '🐺' },
  { name: 'Ember Imp',           type: 'burn',     emoji: '🔥' },
  { name: 'Voidling',            type: 'drain',    emoji: '👻' },
  { name: 'Thornbeast',          type: 'thorns',   emoji: '🌿' },
  { name: 'Hex Wraith',          type: 'hex',      emoji: '💀' },
  { name: 'Plague Crawler',      type: 'poison',   emoji: '🐛' },
  { name: 'Storm Elemental',     type: 'fast',     emoji: '⚡' },
  { name: 'Bone Colossus',       type: 'tank',     emoji: '🦴' },
  { name: 'Nether Drake',        type: 'burn',     emoji: '🐉' },
  { name: 'Abyssal Lurker',      type: 'drain',    emoji: '🕳️' },
  { name: 'Doom Herald',         type: 'hex',      emoji: '☠️' },
  { name: 'The Veilbreaker',     type: 'boss',     emoji: '👑' },
];

const AI_EFFECTS = {
  basic:   [],
  fast:    ['HASTE'],
  attack:  ['SURGE'],
  burn:    ['BURN'],
  drain:   ['DRAIN'],
  thorns:  ['THORNS'],
  hex:     ['HEX', 'WEAKEN'],
  poison:  ['POISON'],
  tank:    ['WARD', 'ANCHOR'],
  boss:    ['BURN', 'SILENCE', 'SURGE'],
};

// ── EFFECT LOGIC ──
const EFFECTS = {
  BURN:    { damage: 3 },
  POISON:  { damage: 2 },
  DRAIN:   { damage: 2, selfHeal: 2 },
  SIPHON:  { damage: 1, selfHeal: 1 },
  LEECH:   { damage: 2, selfHeal: 1 },
  DOOM:    { damage: 5 },
  HEAL:    { selfHeal: 3 },
  BLESS:   { selfHeal: 2, atkBoost: 1 },
  INSPIRE: { selfHeal: 2 },
  CLEANSE: { selfHeal: 1 },
  SILENCE: { oppEffectsBlocked: true },
  HEX:     { oppAtkReduce: 2 },
  WEAKEN:  { oppAtkReduce: 3 },
  FEAR:    { oppAtkReduce: 4 },
  STUN:    { oppSkipAttack: true },
  WARD:    { shield: 3 },
  BARRIER: { shield: 5 },
  ANCHOR:  { damageReduce: 2 },
  THORNS:  { reflect: 2 },
  REFLECT: { reflectPct: 50 },
  AMPLIFY: { atkBoost: 2 },
  SURGE:   { atkBoost: 3 },
  CRIT:    { critChance: 50 },
  HASTE:   { extraAttack: true },
};

// ═══════════════════════════════════════════
// Generate AI enemy for a floor
// ═══════════════════════════════════════════
function generateAI(floorNumber) {
  const templateIndex = Math.min(floorNumber - 1, ENEMY_TEMPLATES.length - 1);
  const template = ENEMY_TEMPLATES[templateIndex];

  const atk = 2 + Math.floor(floorNumber * 1.5);
  const hp = 5 + Math.floor(floorNumber * 3);
  const spd = 3 + Math.floor(floorNumber * 0.5);

  return {
    name: template.name,
    emoji: template.emoji,
    type: template.type,
    atk, hp, maxHp: hp, spd,
    effects: AI_EFFECTS[template.type] || [],
    floor: floorNumber,
  };
}

// ═══════════════════════════════════════════
// Start a gauntlet run (costs 1 mana)
// ═══════════════════════════════════════════
async function startRun(playerId) {
  const today = new Date().toISOString().split('T')[0];

  const { data: existingRun } = await supabase
    .from('gauntlet_runs')
    .select('id, status')
    .eq('player_id', playerId)
    .eq('run_date', today)
    .single();

  if (existingRun) {
    if (existingRun.status === 'active') {
      return { success: false, error: 'You already have an active run today. Keep fighting!', run_id: existingRun.id };
    }
    return { success: false, error: 'You already did your gauntlet run today. Come back tomorrow!' };
  }

  const nine = await getNine(playerId);
  if (!nine) return { success: false, error: 'No Nine found — complete registration first' };

  const manaResult = await spendMana(playerId, 1);
  if (!manaResult.success) return { success: false, error: manaResult.error };

  const enemy = generateAI(1);

  const { data: run, error: runErr } = await supabaseAdmin
    .from('gauntlet_runs')
    .insert({
      player_id: playerId,
      run_date: today,
      status: 'active',
      current_floor: 1,
      nine_hp: nine.base_hp,
      nine_max_hp: nine.base_hp,
      nine_atk: nine.base_atk,
      nine_spd: nine.base_spd,
      highest_floor: 0,
      combat_log: [],
    })
    .select()
    .single();

  if (runErr) {
    console.error('Gauntlet start error:', runErr);
    return { success: false, error: 'Failed to start run' };
  }

  return {
    success: true,
    run_id: run.id,
    floor: 1,
    nine: { hp: nine.base_hp, maxHp: nine.base_hp, atk: nine.base_atk, spd: nine.base_spd },
    enemy,
    mana_remaining: manaResult.mana,
  };
}

// ═══════════════════════════════════════════
// Fight the current floor
// ═══════════════════════════════════════════
async function fightFloor(runId, playerId, cardId) {
  const { data: run } = await supabase
    .from('gauntlet_runs')
    .select('*')
    .eq('id', runId)
    .eq('player_id', playerId)
    .single();

  if (!run) return { success: false, error: 'Run not found' };
  if (run.status !== 'active') return { success: false, error: 'Run is over' };

  // Get player's card
  const { data: card } = await supabase
    .from('player_cards')
    .select('*, spell:spell_id(base_atk, base_hp, name)')
    .eq('id', cardId)
    .eq('player_id', playerId)
    .single();

  if (!card) return { success: false, error: 'Card not found' };

  let cardEffects = [];
  try {
    if (card.spell_effects) {
      cardEffects = Array.isArray(card.spell_effects) ? card.spell_effects : JSON.parse(card.spell_effects);
    }
  } catch (e) { cardEffects = []; }

  // Generate enemy
  const enemy = generateAI(run.current_floor);

  // Player stats: Nine base + card bonus
  let pAtk = run.nine_atk + (card.spell?.base_atk || 0);
  let pHp = run.nine_hp;
  let pMaxHp = run.nine_max_hp;
  let pSpd = run.nine_spd;

  // Enemy stats
  let eAtk = enemy.atk;
  let eHp = enemy.hp;
  let eSpd = enemy.spd;

  const log = [];

  // ── Modifiers ──
  let pShield = 0, pDmgReduce = 0, pReflect = 0, pExtraAtk = false;
  let eShield = 0, eDmgReduce = 0, eReflect = 0;
  let pSkipAtk = false, eSkipAtk = false;
  let eEffectsBlocked = false;

  // ── Player effects ──
  for (const eff of cardEffects) {
    const e = EFFECTS[eff];
    if (!e) continue;

    if (e.damage) { eHp = Math.max(0, eHp - e.damage); log.push(`Your ${eff} deals ${e.damage}!`); }
    if (e.selfHeal) { pHp = Math.min(pMaxHp, pHp + e.selfHeal); log.push(`You heal ${e.selfHeal} HP!`); }
    if (e.atkBoost) { pAtk += e.atkBoost; log.push(`+${e.atkBoost} ATK!`); }
    if (e.shield) { pShield += e.shield; log.push(`Shield: ${e.shield}`); }
    if (e.damageReduce) pDmgReduce += e.damageReduce;
    if (e.reflect) pReflect += e.reflect;
    if (e.oppEffectsBlocked) { eEffectsBlocked = true; log.push('Enemy SILENCED!'); }
    if (e.oppAtkReduce) { eAtk = Math.max(1, eAtk - e.oppAtkReduce); log.push(`Enemy -${e.oppAtkReduce} ATK`); }
    if (e.oppSkipAttack) { eSkipAtk = true; log.push('Enemy STUNNED!'); }
    if (e.extraAttack) pExtraAtk = true;
    if (e.critChance && Math.random() * 100 < e.critChance) {
      pAtk = Math.floor(pAtk * 1.5);
      log.push('CRITICAL HIT!');
    }
  }

  // ── Enemy effects ──
  if (!eEffectsBlocked) {
    for (const eff of enemy.effects) {
      const e = EFFECTS[eff];
      if (!e) continue;

      if (e.damage) {
        let dmg = e.damage;
        if (pShield > 0) { const abs = Math.min(pShield, dmg); dmg -= abs; pShield -= abs; }
        pHp = Math.max(0, pHp - dmg);
        log.push(`${enemy.name}'s ${eff} deals ${dmg}!`);
      }
      if (e.selfHeal) eHp = Math.min(enemy.maxHp, eHp + e.selfHeal);
      if (e.atkBoost) eAtk += e.atkBoost;
      if (e.shield) eShield += e.shield;
      if (e.damageReduce) eDmgReduce += e.damageReduce;
      if (e.reflect) eReflect += e.reflect;
      if (e.oppAtkReduce) { pAtk = Math.max(1, pAtk - e.oppAtkReduce); log.push(`Your ATK -${e.oppAtkReduce}`); }
      if (e.oppSkipAttack) { pSkipAtk = true; log.push('You were STUNNED!'); }
    }
  }

  // ── Auto-attacks (SPD order) ──
  const playerFirst = pSpd >= eSpd;

  function playerAttacks() {
    if (pSkipAtk) { log.push('You are STUNNED!'); return; }
    let dmg = Math.max(0, pAtk - eDmgReduce);
    if (eShield > 0) { const abs = Math.min(eShield, dmg); dmg -= abs; eShield -= abs; }
    if (eReflect > 0) { pHp = Math.max(0, pHp - eReflect); log.push(`Thorns reflect ${eReflect}!`); }
    eHp = Math.max(0, eHp - dmg);
    log.push(`You hit for ${dmg}! (Enemy: ${eHp} HP)`);
    if (pExtraAtk && eHp > 0) {
      const bonus = Math.floor(pAtk * 0.5);
      eHp = Math.max(0, eHp - bonus);
      log.push(`HASTE bonus: ${bonus}!`);
    }
  }

  function enemyAttacks() {
    if (eSkipAtk) { log.push(`${enemy.name} is STUNNED!`); return; }
    let dmg = Math.max(0, eAtk - pDmgReduce);
    if (pShield > 0) { const abs = Math.min(pShield, dmg); dmg -= abs; pShield -= abs; }
    if (pReflect > 0) { eHp = Math.max(0, eHp - pReflect); }
    pHp = Math.max(0, pHp - dmg);
    log.push(`${enemy.name} hits for ${dmg}! (You: ${pHp} HP)`);
  }

  if (playerFirst) {
    playerAttacks();
    if (eHp > 0) enemyAttacks();
  } else {
    enemyAttacks();
    if (pHp > 0) playerAttacks();
  }

  // ── Build result ──
  const floorResult = {
    floor: run.current_floor,
    enemy: { name: enemy.name, emoji: enemy.emoji, atk: enemy.atk, hp: enemy.hp },
    card_used: card.spell_name || card.spell?.name || 'Unknown',
    player_hp_before: run.nine_hp,
    player_hp_after: pHp,
    enemy_hp_after: eHp,
    log,
  };

  const updatedLog = [...(run.combat_log || []), floorResult];

  // ── Player defeated ──
  if (pHp <= 0) {
    await supabaseAdmin
      .from('gauntlet_runs')
      .update({
        status: 'defeated',
        nine_hp: 0,
        highest_floor: run.current_floor,
        combat_log: updatedLog,
      })
      .eq('id', runId);

    return {
      success: true,
      result: 'defeated',
      floor: run.current_floor,
      floor_result: floorResult,
      message: `${enemy.emoji} ${enemy.name} defeated you on floor ${run.current_floor}!`,
    };
  }

  // ── Enemy defeated → next floor ──
  if (eHp <= 0) {
    const healBonus = Math.floor(run.nine_max_hp * 0.1);
    const healedHp = Math.min(run.nine_max_hp, pHp + healBonus);
    if (healBonus > 0) log.push(`Floor cleared! +${healBonus} HP!`);

    // Floor 15 = final boss victory
    if (run.current_floor >= 15) {
      await supabaseAdmin
        .from('gauntlet_runs')
        .update({
          status: 'completed',
          nine_hp: healedHp,
          highest_floor: 15,
          combat_log: updatedLog,
        })
        .eq('id', runId);

      return {
        success: true,
        result: 'victory',
        floor: 15,
        floor_result: floorResult,
        message: '👑 You defeated The Veilbreaker! Gauntlet COMPLETE!',
      };
    }

    const nextFloor = run.current_floor + 1;
    const nextEnemy = generateAI(nextFloor);

    await supabaseAdmin
      .from('gauntlet_runs')
      .update({
        current_floor: nextFloor,
        nine_hp: healedHp,
        highest_floor: Math.max(run.highest_floor || 0, run.current_floor),
        combat_log: updatedLog,
      })
      .eq('id', runId);

    return {
      success: true,
      result: 'floor_cleared',
      floor: run.current_floor,
      next_floor: nextFloor,
      nine_hp: healedHp,
      next_enemy: nextEnemy,
      floor_result: floorResult,
      message: `Floor ${run.current_floor} cleared! Next: ${nextEnemy.emoji} ${nextEnemy.name}`,
    };
  }

  // Both alive = stalemate (shouldn't happen often)
  return { success: true, result: 'draw', floor_result: floorResult, message: 'Stalemate!' };
}

// ═══════════════════════════════════════════
// Get active run for a player
// ═══════════════════════════════════════════
async function getActiveRun(playerId) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('gauntlet_runs')
    .select('*')
    .eq('player_id', playerId)
    .eq('run_date', today)
    .single();

  if (!data) return null;

  if (data.status === 'active') {
    data.current_enemy = generateAI(data.current_floor);
  }

  return data;
}

// ═══════════════════════════════════════════
// Get run history + best floor
// ═══════════════════════════════════════════
async function getHistory(playerId, limit = 20) {
  const { data: runs } = await supabase
    .from('gauntlet_runs')
    .select('id, run_date, status, highest_floor, current_floor, created_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Get best floor ever
  const { data: best } = await supabase
    .from('gauntlet_runs')
    .select('highest_floor')
    .eq('player_id', playerId)
    .order('highest_floor', { ascending: false })
    .limit(1)
    .single();

  return {
    runs: runs || [],
    best_floor: best?.highest_floor || 0,
  };
}

module.exports = {
  startRun,
  fightFloor,
  getActiveRun,
  getHistory,
  generateAI,
};