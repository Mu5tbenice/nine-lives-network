// ═══════════════════════════════════════════════════════════════
// server/services/combatEngine.js
// V2 Continuous Combat Engine
// Source: 9LV_COMBAT_V2_LOCKED.md + 9LV_EFFECTS_V2_LOCKED.md
//
// 2-second tick loop, SPD-based attack timers, V2 damage formula
// Phase 1: Core effects (BURN, HEAL, WARD, POISON, SILENCE,
//          EXECUTE, CHAIN, THORNS, BARRIER, HEX, WEAKEN, HASTE,
//          SLOW, ANCHOR, DRAIN, MARK, DODGE, STEALTH, SURGE,
//          INSPIRE, BLESS, CORRODE, INFECT, FEAST, SHATTER, CLEANSE)
// ═══════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── CONFIG ────────────────────────────────────────────
const TICK_MS = 2000;               // Server tick every 2 seconds
const SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000; // 15-min scoring snapshot
const KO_COOLDOWN_MS = 60 * 1000;   // 1-min zone-specific cooldown
const SHARPNESS_LOSS_PER_SNAPSHOT = 1;
const MAX_ZONE_POP = 50;

// Effect duration by rarity (seconds)
const EFFECT_DURATION = { common: 8, uncommon: 9, rare: 10, epic: 11, legendary: 12 };
const DEFAULT_EFFECT_DURATION = 10;

// ─── STATE ─────────────────────────────────────────────
const zones = {};        // zoneId → { nines: Map, lastSnapshot }
let running = false;
let tickHandle = null;
let nextSnapshotAt = null;

// ─── COMBAT FORMULAS (from V2 doc) ────────────────────
// Auto-attack: fast, weak, no effects
function autoAttackInterval(spd) {
  return Math.max(1.5, 4.0 - spd * 0.05);
}

// Spell cast: slower, triggers card effects, blocked by SILENCE
function spellCastInterval(spd) {
  return Math.max(3.0, 8.0 - spd * 0.08);
}

// Keep old name as alias for any remaining references
function attackInterval(spd) { return autoAttackInterval(spd); }

function calcDamage(atk, def) {
  if (atk + def <= 0) return 1;
  return Math.max(1, Math.floor((atk * atk) / (atk + def)));
}

function rollCrit(luck) {
  return Math.random() < (luck / 100);
}

function applySharpness(baseStat, sharpness) {
  if (!baseStat) return 0;
  const pct = Math.max(0, Math.min(100, sharpness || 100));
  return Math.round(baseStat * (0.5 + pct / 200));
}

// ─── BROADCAST HELPER ──────────────────────────────────
function broadcast(zoneId, event, data) {
  try {
    if (global.__arenaSocket) {
      global.__arenaSocket._broadcastToZone(zoneId, event, data);
    }
  } catch (e) { /* non-critical */ }
}

// ─── NINE STATE CLASS ──────────────────────────────────
class CombatNine {
  constructor(data) {
    this.playerId = data.player_id;
    this.nineId = data.nine_id;
    this.deploymentId = data.deployment_id;
    this.name = data.name || 'Unknown';
    this.house = data.house || 'universal';
    this.guildTag = data.guild_tag || 'Lone Wolf';

    // Stats (from statCalculation)
    this.atk = data.atk || 0;
    this.hp = data.hp || 0;
    this.maxHp = data.hp || 0;
    this.spd = data.spd || 0;
    this.def = data.def || 0;
    this.luck = data.luck || 0;

    // Combat state
    this.alive = true;
    this.attackTimer = 0;        // seconds until next auto-attack
    this.spellTimer = 1.0;       // seconds until next spell cast (stagger start)
    this.cardIndex = 0;          // which card casts next (round-robin)
    this.attackIntervalBase = autoAttackInterval(this.spd);

    // Effects
    this.effects = [];     // active timed effects [{name, expiresAt, value, sourceId}]
    this.cards = data.cards || [];  // equipped card data with effects
    this.isSilenced = false;

    // SURGE passive
    this.hasSurge = false;

    // BARRIER shield
    this.barrier = 0;

    // DODGE cooldown
    this.dodgeCooldownUntil = 0;
    this.dodgeActiveUntil = 0;

    // PHASE
    this.phasedUntil = 0;

    // KO tracking
    this.koUntil = 0;     // timestamp when zone cooldown expires

    // Parse card effects
    this._parseCardEffects();
  }

  _parseCardEffects() {
    this.cardEffects = [];
    this.hasSurge = false;
    this.barrier = 0;

    for (const card of this.cards) {
      const effects = card.bonus_effects || [];
      const rarity = (card.rarity || 'common').toLowerCase();
      for (const eff of effects) {
        const tag = (typeof eff === 'string' ? eff : (eff.tag || '')).toUpperCase();
        const match = tag.match(/^([A-Z_]+)\s*\+?(\d+)?/);
        if (!match) continue;
        const name = match[1];
        const value = parseInt(match[2]) || 0;
        this.cardEffects.push({ name, value, rarity });

        // Passive setup
        if (name === 'SURGE') this.hasSurge = true;
        if (name === 'BARRIER') this.barrier += (value || 40);
        if (name === 'THORNS') this.thornsValue = (this.thornsValue || 0) + (value || 15);
      }
    }
  }

  getEffectiveAtk() {
    let atk = this.atk;
    // SURGE: +50% ATK
    if (this.hasSurge) atk = Math.floor(atk * 1.5);
    // HEX debuff
    const hexStacks = this.effects.filter(e => e.name === 'HEX').length;
    if (hexStacks > 0) atk = Math.max(0, atk - (10 * hexStacks));
    // INSPIRE buff
    const inspire = this.effects.find(e => e.name === 'INSPIRE');
    if (inspire) atk += 3;
    return atk;
  }

  getEffectiveSpd() {
    let spd = this.spd;
    const slow = this.effects.find(e => e.name === 'SLOW');
    if (slow) spd = Math.max(0, spd - 15);
    const haste = this.effects.find(e => e.name === 'HASTE');
    if (haste) spd += 10;
    const inspire = this.effects.find(e => e.name === 'INSPIRE');
    if (inspire) spd += 3;
    return spd;
  }

  getAttackInterval() {
    return autoAttackInterval(this.getEffectiveSpd());
  }

  getSpellInterval() {
    return spellCastInterval(this.getEffectiveSpd());
  }

  isTargetable() {
    if (!this.alive) return false;
    if (this.phasedUntil > Date.now()) return false;
    const stealth = this.effects.find(e => e.name === 'STEALTH');
    if (stealth) return false; // still hit by AOE/CHAIN
    return true;
  }

  hasEffect(name) {
    return this.effects.some(e => e.name === name);
  }

  addTimedEffect(name, value, durationMs, sourceId) {
    // Binary effects: replace, don't stack
    const binary = ['SILENCE', 'WARD', 'ANCHOR', 'STEALTH', 'TAUNT', 'WEAKEN', 'MARK', 'HASTE', 'SLOW', 'INSPIRE'];
    if (binary.includes(name)) {
      this.effects = this.effects.filter(e => e.name !== name);
    }
    // Numeric stacking: max 3
    const numericStackable = ['HEX', 'BURN', 'POISON'];
    if (numericStackable.includes(name)) {
      const existing = this.effects.filter(e => e.name === name);
      if (existing.length >= 3) return; // cap
    }
    this.effects.push({ name, value, expiresAt: Date.now() + durationMs, sourceId });
  }

  tickEffects(now) {
    // Remove expired effects
    this.effects = this.effects.filter(e => e.expiresAt > now);
    // Update silence state
    this.isSilenced = this.hasEffect('SILENCE');
  }
}

// ─── ZONE COMBAT STATE ─────────────────────────────────
class ZoneCombat {
  constructor(zoneId) {
    this.zoneId = zoneId;
    this.nines = new Map(); // playerId → CombatNine
    this.tickEvents = [];   // collected events for this tick
  }

  addNine(nine) {
    this.nines.set(nine.playerId, nine);
  }

  removeNine(playerId) {
    this.nines.delete(playerId);
  }

  getAliveEnemies(guildTag) {
    return [...this.nines.values()].filter(n => n.alive && n.guildTag !== guildTag);
  }

  getAliveAllies(guildTag, excludeId) {
    return [...this.nines.values()].filter(n => n.alive && n.guildTag === guildTag && n.playerId !== excludeId);
  }

  getTargetableEnemies(guildTag) {
    return this.getAliveEnemies(guildTag).filter(n => n.isTargetable());
  }

  // Target: random enemy (with TAUNT override)
  pickTarget(attacker) {
    const enemies = this.getTargetableEnemies(attacker.guildTag);
    if (enemies.length === 0) return null;

    // TAUNT override
    const taunter = enemies.find(e => e.hasEffect('TAUNT'));
    if (taunter) return taunter;

    // Random enemy
    return enemies[Math.floor(Math.random() * enemies.length)];
  }

  // Target: highest ATK enemy (for SILENCE)
  pickHighestAtkEnemy(guildTag) {
    const enemies = this.getAliveEnemies(guildTag);
    if (enemies.length === 0) return null;
    enemies.sort((a, b) => b.getEffectiveAtk() - a.getEffectiveAtk());
    return enemies[0];
  }

  // Target: highest HP enemy (for MARK)
  pickHighestHpEnemy(guildTag) {
    const enemies = this.getAliveEnemies(guildTag);
    if (enemies.length === 0) return null;
    enemies.sort((a, b) => b.hp - a.hp);
    return enemies[0];
  }

  // Target: lowest HP ally (for HEAL)
  pickLowestHpAlly(guildTag, selfId) {
    const allies = [...this.nines.values()].filter(n => n.alive && n.guildTag === guildTag);
    if (allies.length === 0) return null;
    allies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
    return allies[0];
  }

  emit(event) {
    this.tickEvents.push(event);
  }
}

// ─── LOAD ZONE DATA ────────────────────────────────────
async function loadZoneState(zoneId) {
  const zone = new ZoneCombat(zoneId);

  // Get active deployments with Nine data and card slots
  const { data: deployments } = await supabase
    .from('zone_deployments')
    .select(`
      id, player_id, nine_id, zone_id, guild_tag, current_hp, max_hp, is_mercenary,
      nine:nine_id(name, house_id, base_atk, base_hp, base_spd, base_def, base_luck, equipped_images)
    `)
    .eq('zone_id', zoneId)
    .eq('is_active', true);

  if (!deployments || deployments.length === 0) return null;

  for (const dep of deployments) {
    const nine = dep.nine || {};

    // Get house stats (source of truth)
    const { data: house } = await supabase
      .from('houses')
      .select('slug, atk, hp, spd, def, luck')
      .eq('id', nine.house_id)
      .single();

    if (!house) continue;

    // Get equipped cards for this deployment
    let cards = [];
    const { data: slots, error: slotErr } = await supabase
      .from('zone_card_slots')
      .select('card_id, slot_number')
      .eq('deployment_id', dep.id)
      .eq('is_active', true);

    if (slots && slots.length > 0) {
      const cardIds = slots.map(s => s.card_id).filter(Boolean);
      if (cardIds.length > 0) {
        const { data: playerCards, error: cardErr } = await supabase
          .from('player_cards')
          .select('id, sharpness, rarity, spell:spell_id(name, spell_type, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects)')
          .in('id', cardIds);

          cards = playerCards.map(pc => {
            const spell = pc.spell || {};
            const sharp = pc.sharpness != null ? pc.sharpness : 100;
            return {
              id: pc.id,
              name: spell.name,
              rarity: pc.rarity || 'common',  // rarity is on player_cards, not spells
              spell_type: spell.spell_type,
              bonus_effects: spell.bonus_effects || [],
              atk: applySharpness(spell.base_atk || 0, sharp),
              hp: applySharpness(spell.base_hp || 0, sharp),
              spd: applySharpness(spell.base_spd || 0, sharp),
              def: applySharpness(spell.base_def || 0, sharp),
              luck: applySharpness(spell.base_luck || 0, sharp),
            };
          });
        }

        if (playerCards) {
          cards = playerCards.map(pc => {
            const spell = pc.spell || {};
            const sharp = pc.sharpness != null ? pc.sharpness : 100;
            return {
              id: pc.id,
              name: spell.name,
              rarity: spell.rarity || 'common',
              bonus_effects: spell.bonus_effects || [],
              atk: applySharpness(spell.base_atk || 0, sharp),
              hp: applySharpness(spell.base_hp || 0, sharp),
              spd: applySharpness(spell.base_spd || 0, sharp),
              def: applySharpness(spell.base_def || 0, sharp),
              luck: applySharpness(spell.base_luck || 0, sharp),
            };
          });
        }
      }
    }

    // Get equipped items
    let itemStats = { atk: 0, hp: 0, spd: 0, def: 0, luck: 0 };
    const slugFields = ['equipped_fur','equipped_expression','equipped_headwear','equipped_outfit','equipped_weapon','equipped_familiar','equipped_trinket_1','equipped_trinket_2'];
    const { data: nineData } = await supabase
      .from('player_nines')
      .select(slugFields.join(', '))
      .eq('id', dep.nine_id)
      .single();

    if (nineData) {
      const slugs = slugFields.map(f => nineData[f]).filter(Boolean).filter(s => s !== 'none');
      if (slugs.length > 0) {
        const { data: items } = await supabase
          .from('items')
          .select('bonus_atk, bonus_hp, bonus_spd, bonus_def, bonus_luck')
          .in('slug', slugs);
        if (items) {
          items.forEach(item => {
            itemStats.atk += item.bonus_atk || 0;
            itemStats.hp += item.bonus_hp || 0;
            itemStats.spd += item.bonus_spd || 0;
            itemStats.def += item.bonus_def || 0;
            itemStats.luck += item.bonus_luck || 0;
          });
        }
      }
    }

    // Pure addition: house + cards + items
    let totalAtk = house.atk, totalHp = house.hp, totalSpd = house.spd, totalDef = house.def, totalLuck = house.luck;
    for (const c of cards) {
      totalAtk += c.atk; totalHp += c.hp; totalSpd += c.spd; totalDef += c.def; totalLuck += c.luck;
    }
    totalAtk += itemStats.atk; totalHp += itemStats.hp; totalSpd += itemStats.spd;
    totalDef += itemStats.def; totalLuck += itemStats.luck;

    const combatNine = new CombatNine({
      player_id: dep.player_id,
      nine_id: dep.nine_id,
      deployment_id: dep.id,
      name: nine.name || 'Unknown',
      house: house.slug || 'universal',
      guild_tag: dep.guild_tag,
      atk: totalAtk,
      hp: dep.current_hp || totalHp,  // use current HP if mid-combat
      spd: totalSpd,
      def: totalDef,
      luck: totalLuck,
      cards,
    });
    // Preserve current HP if already fighting
    combatNine.maxHp = totalHp;
    if (dep.current_hp != null && dep.current_hp < totalHp) {
      combatNine.hp = dep.current_hp;
    }

    zone.addNine(combatNine);
  }

  return zone.nines.size > 0 ? zone : null;
}

// ─── RESOLVE AUTO-ATTACK (no card effects, always fires) ───
function resolveAutoAttack(attacker, zone) {
  if (!attacker.alive) return;
  if (attacker.phasedUntil > Date.now()) return;

  const target = zone.pickTarget(attacker);
  if (!target) return;

  const atk = attacker.getEffectiveAtk();
  let damage = calcDamage(atk, target.def);

  // WEAKEN debuff
  if (attacker.hasEffect('WEAKEN')) damage = Math.floor(damage / 2);
  // MARK on target
  if (target.hasEffect('MARK')) damage = Math.floor(damage * 1.25);

  // Crit check
  const isCrit = rollCrit(attacker.luck);
  if (isCrit) damage *= 2;

  // DODGE check
  const now = Date.now();
  if (target.dodgeActiveUntil > now) {
    zone.emit({ type: 'dodge', target: target.playerId, targetName: target.name });
    return;
  }

  // WARD blocks (unless PIERCE)
  if (target.hasEffect('WARD') && !attacker.cardEffects.some(e => e.name === 'PIERCE')) {
    target.effects = target.effects.filter(e => e.name !== 'WARD');
    zone.emit({ type: 'effect_applied', effect: 'WARD', target: target.playerId, targetName: target.name, message: 'blocked!' });
    damage = 0;
  }

  // BARRIER absorb
  if (target.barrier > 0 && !attacker.cardEffects.some(e => e.name === 'PIERCE')) {
    const absorbed = Math.min(damage, target.barrier);
    target.barrier -= absorbed;
    damage -= absorbed;
    if (absorbed > 0) zone.emit({ type: 'effect_applied', effect: 'BARRIER', target: target.playerId, targetName: target.name, value: absorbed });
  }

  const anchorActive = target.hasEffect('ANCHOR');
  if (damage > 0) {
    if (anchorActive && target.hp - damage < 1) damage = Math.max(0, target.hp - 1);
    target.hp = Math.max(anchorActive ? 1 : 0, target.hp - damage);
  }

  zone.emit({
    type: 'attack', is_auto: true,
    source: attacker.playerId, sourceName: attacker.name, from_house: attacker.house,
    target: target.playerId, targetName: target.name,
    damage, isCrit,
    targetHp: target.hp, targetMaxHp: target.maxHp,
  });

  // THORNS reflect
  if (target.thornsValue && target.alive && damage > 0) {
    const thornsDmg = target.thornsValue;
    attacker.hp = Math.max(0, attacker.hp - thornsDmg);
    zone.emit({ type: 'reflected_damage', source: target.playerId, target: attacker.playerId, damage: thornsDmg, effect: 'THORNS', targetHp: attacker.hp, targetMaxHp: attacker.maxHp });
  }

  // PHASE: go untargetable after attacking
  if (attacker.cardEffects.some(e => e.name === 'PHASE')) {
    attacker.phasedUntil = Date.now() + 3000;
  }

  checkKO(target, attacker, zone);
  if (attacker.hp <= 0) checkKO(attacker, target, zone);
}

// ─── RESOLVE SPELL CAST (round-robin cards, triggers effects) ───
function resolveSpellCast(attacker, zone) {
  try {
    if (!attacker.alive) return;
    if (attacker.isSilenced) return;
    if (attacker.phasedUntil > Date.now()) return;
    if (!attacker.cards || attacker.cards.length === 0) {
      return;
    }

    // Pick next card in rotation
    const card = attacker.cards[attacker.cardIndex % attacker.cards.length];
    attacker.cardIndex = (attacker.cardIndex + 1) % attacker.cards.length;



  const target = zone.pickTarget(attacker);
  const anchorActive = target && target.hasEffect('ANCHOR');

  // Spell damage uses this card's ATK stat contribution
  let spellDamage = 0;
  if (card.atk > 0 && target) {
    spellDamage = calcDamage(card.atk, target.def || 0);
    if (attacker.hasEffect('WEAKEN')) spellDamage = Math.floor(spellDamage / 2);
    if (target.hasEffect('MARK')) spellDamage = Math.floor(spellDamage * 1.25);
    const isCrit = rollCrit(attacker.luck);
    if (isCrit) spellDamage *= 2;

    // WARD check on spell too
    if (target.hasEffect('WARD') && !attacker.cardEffects.some(e => e.name === 'PIERCE')) {
      target.effects = target.effects.filter(e => e.name !== 'WARD');
      spellDamage = 0;
    }
    if (anchorActive && target.hp - spellDamage < 1) spellDamage = Math.max(0, target.hp - 1);
    if (spellDamage > 0) target.hp = Math.max(anchorActive ? 1 : 0, target.hp - spellDamage);
  }

  // Broadcast spell cast event
  zone.emit({
    type: 'spell_cast',
    source: attacker.playerId, sourceName: attacker.name, from_house: attacker.house,
    target: target?.playerId || null, targetName: target?.name || null,
    card_name: card.name || 'Spell',
    card_type: card.spell_type || 'attack',
    card_rarity: card.rarity || 'common',
    damage: spellDamage,
    effects: (card.bonus_effects || []).map(e => typeof e === 'string' ? e : e.tag),
    targetHp: target?.hp, targetMaxHp: target?.maxHp,
  });

  // Trigger card effects
  const effectDurationMs = (EFFECT_DURATION[(card.rarity || 'common').toLowerCase()] || DEFAULT_EFFECT_DURATION) * 1000;
  const cardEffects = attacker.cardEffects.filter(e => {
    // Only trigger effects from THIS card in this cast
    const cardBonusEffects = (card.bonus_effects || []).map(e => typeof e === 'string' ? e.split(' ')[0] : (e.tag || '').split(' ')[0]);
    return cardBonusEffects.includes(e.name);
  });

  for (const eff of cardEffects) {
    switch (eff.name) {
      case 'BURN': {
        if (!target) break;
        const burnDmg = eff.value || 5;
        target.hp = Math.max(anchorActive ? 1 : 0, target.hp - burnDmg);
        zone.emit({ type: 'dot_damage', target: target.playerId, targetName: target.name, damage: burnDmg, effect: 'BURN', targetHp: target.hp });
        break;
      }
      case 'CHAIN': {
        if (!target) break;
        const others = zone.getAliveEnemies(attacker.guildTag).filter(e => e.playerId !== target.playerId && e.isTargetable());
        if (others.length > 0) {
          const chainTarget = others[Math.floor(Math.random() * others.length)];
          const chainDmg = Math.floor(spellDamage * 0.5);
          chainTarget.hp = Math.max(0, chainTarget.hp - chainDmg);
          zone.emit({ type: 'effect_applied', effect: 'CHAIN', source: attacker.playerId, sourceName: attacker.name, target: chainTarget.playerId, targetName: chainTarget.name, damage: chainDmg, from_house: attacker.house, targetHp: chainTarget.hp, targetMaxHp: chainTarget.maxHp });
        }
        break;
      }
      case 'HEAL': {
        const healTarget = zone.pickLowestHpAlly(attacker.guildTag, attacker.playerId);
        if (healTarget && healTarget.hp < healTarget.maxHp) {
          const healAmt = eff.value || 15;
          healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healAmt);
          zone.emit({ type: 'heal', target: healTarget.playerId, targetName: healTarget.name, amount: healAmt, effect: 'HEAL', targetHp: healTarget.hp, targetMaxHp: healTarget.maxHp });
        }
        break;
      }
      case 'BLESS': {
        const allies = [...zone.nines.values()].filter(n => n.alive && n.guildTag === attacker.guildTag).sort((a, b) => (a.hp/a.maxHp) - (b.hp/b.maxHp)).slice(0, 3);
        const blessAmt = eff.value || 5;
        for (const ally of allies) {
          ally.hp = Math.min(ally.maxHp, ally.hp + blessAmt);
          zone.emit({ type: 'heal', target: ally.playerId, targetName: ally.name, amount: blessAmt, effect: 'BLESS' });
        }
        break;
      }
      case 'POISON': {
        if (!target) break;
        target.addTimedEffect('POISON', eff.value || 3, 12000, attacker.playerId);
        zone.emit({ type: 'effect_applied', effect: 'POISON', target: target.playerId, targetName: target.name, value: eff.value || 3, source: attacker.playerId });
        break;
      }
      case 'SILENCE': {
        const silTarget = zone.pickHighestAtkEnemy(attacker.guildTag);
        if (silTarget) {
          silTarget.addTimedEffect('SILENCE', 0, effectDurationMs, attacker.playerId);
          zone.emit({ type: 'effect_applied', effect: 'SILENCE', target: silTarget.playerId, targetName: silTarget.name, source: attacker.playerId });
        }
        break;
      }
      case 'HEX': {
        if (!target) break;
        target.addTimedEffect('HEX', 10, effectDurationMs, attacker.playerId);
        zone.emit({ type: 'effect_applied', effect: 'HEX', target: target.playerId, targetName: target.name });
        break;
      }
      case 'WEAKEN': {
        if (!target) break;
        target.addTimedEffect('WEAKEN', 0, effectDurationMs, attacker.playerId);
        zone.emit({ type: 'effect_applied', effect: 'WEAKEN', target: target.playerId, targetName: target.name });
        break;
      }
      case 'SLOW': {
        if (!target) break;
        target.addTimedEffect('SLOW', 15, effectDurationMs, attacker.playerId);
        zone.emit({ type: 'effect_applied', effect: 'SLOW', target: target.playerId, targetName: target.name });
        break;
      }
      case 'HASTE': {
        attacker.addTimedEffect('HASTE', 10, effectDurationMs, attacker.playerId);
        zone.emit({ type: 'effect_applied', effect: 'HASTE', target: attacker.playerId, targetName: attacker.name });
        break;
      }
      case 'MARK': {
        const markTarget = zone.pickHighestHpEnemy(attacker.guildTag);
        if (markTarget) {
          markTarget.addTimedEffect('MARK', 0, effectDurationMs, attacker.playerId);
          zone.emit({ type: 'effect_applied', effect: 'MARK', target: markTarget.playerId, targetName: markTarget.name });
        }
        break;
      }
      case 'INSPIRE': {
        const allies = zone.getAliveAllies(attacker.guildTag, attacker.playerId);
        for (const ally of allies) ally.addTimedEffect('INSPIRE', 0, effectDurationMs, attacker.playerId);
        if (allies.length > 0) zone.emit({ type: 'effect_applied', effect: 'INSPIRE', target: attacker.playerId, targetName: attacker.name, message: `+3 ATK/SPD to ${allies.length} allies` });
        break;
      }
      case 'WARD': {
        if (!attacker.hasEffect('WARD')) attacker.addTimedEffect('WARD', 0, effectDurationMs, attacker.playerId);
        zone.emit({ type: 'effect_applied', effect: 'WARD', target: attacker.playerId, targetName: attacker.name });
        break;
      }
      case 'ANCHOR': {
        if (!attacker.hasEffect('ANCHOR')) attacker.addTimedEffect('ANCHOR', 0, effectDurationMs, attacker.playerId);
        zone.emit({ type: 'effect_applied', effect: 'ANCHOR', target: attacker.playerId, targetName: attacker.name });
        break;
      }
      case 'STEALTH': {
        if (!attacker.hasEffect('STEALTH')) attacker.addTimedEffect('STEALTH', 0, effectDurationMs, attacker.playerId);
        zone.emit({ type: 'effect_applied', effect: 'STEALTH', target: attacker.playerId, targetName: attacker.name });
        break;
      }
      case 'CLEANSE': {
        const debuffs = ['BURN', 'POISON', 'HEX', 'WEAKEN', 'SLOW', 'SILENCE', 'TETHER', 'MARK'];
        const before = attacker.effects.length;
        attacker.effects = attacker.effects.filter(e => !debuffs.includes(e.name));
        if (attacker.effects.length < before) zone.emit({ type: 'effect_applied', effect: 'CLEANSE', target: attacker.playerId, targetName: attacker.name });
        break;
      }
      case 'DRAIN': {
        if (spellDamage > 0) {
          const healAmt = Math.max(1, Math.floor(spellDamage * 0.05));
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
          zone.emit({ type: 'heal', target: attacker.playerId, targetName: attacker.name, amount: healAmt, effect: 'DRAIN' });
        }
        break;
      }
      default: break;
    }
  }

  if (target) checkKO(target, attacker, zone);
  if (attacker.hp <= 0) checkKO(attacker, target, zone);

  } catch(err) {
    console.error(`[SPELL ERROR] ${attacker?.name}:`, err.message, err.stack);
  }
}
// ─── POISON TICK (independent of attacks) ──────────────
function tickPoisons(zone) {
  const now = Date.now();
  for (const nine of zone.nines.values()) {
    if (!nine.alive) continue;
    const poisons = nine.effects.filter(e => e.name === 'POISON');
    if (poisons.length === 0) continue;

    // Poison ticks every 3s — check if 3s has elapsed (we tick every 2s, so ~2/3 chance per tick)
    // Simplified: tick every other engine tick for ~3s average
    if (Math.random() < 0.66) {
      let totalDmg = 0;
      for (let i = 0; i < poisons.length; i++) {
        const stackMult = i === 0 ? 1 : i === 1 ? 0.75 : 0.5;
        totalDmg += Math.floor((poisons[i].value || 3) * stackMult);
      }
      const anchorActive = nine.hasEffect('ANCHOR');
      nine.hp = Math.max(anchorActive ? 1 : 0, nine.hp - totalDmg);
      zone.emit({ type: 'dot_damage', target: nine.playerId, targetName: nine.name, damage: totalDmg, effect: 'POISON', targetHp: nine.hp, targetMaxHp: nine.maxHp });
      checkKO(nine, null, zone);
    }
  }
}

// ─── CORRODE AURA (passive: -1 max HP to all enemies every 10s) ─
function tickCorrode(zone) {
  // Runs every tick but we only apply every ~10s (1 in 5 ticks)
  if (Math.random() > 0.2) return;

  for (const nine of zone.nines.values()) {
    if (!nine.alive) continue;
    if (!nine.cardEffects.some(e => e.name === 'CORRODE')) continue;

    const enemies = zone.getAliveEnemies(nine.guildTag);
    for (const enemy of enemies) {
      enemy.maxHp = Math.max(1, enemy.maxHp - 1);
      if (enemy.hp > enemy.maxHp) enemy.hp = enemy.maxHp;
    }
    if (enemies.length > 0) {
      zone.emit({ type: 'effect_applied', effect: 'CORRODE', source: nine.playerId, sourceName: nine.name, message: `-1 max HP to ${enemies.length} enemies` });
    }
  }
}

// ─── KO HANDLING ───────────────────────────────────────
function checkKO(nine, killer, zone) {
  if (nine.hp > 0 || !nine.alive) return;
  nine.alive = false;

  zone.emit({
    type: 'ko',
    target: nine.playerId, targetName: nine.name,
    source: killer?.playerId || null, sourceName: killer?.name || null,
  });

  // SHATTER: on death, deal 10% max HP to all enemies
  if (nine.cardEffects.some(e => e.name === 'SHATTER')) {
    const shatterDmg = Math.floor(nine.maxHp * 0.1);
    const enemies = zone.getAliveEnemies(nine.guildTag);
    for (const enemy of enemies) {
      enemy.hp = Math.max(0, enemy.hp - shatterDmg);
      zone.emit({ type: 'dot_damage', target: enemy.playerId, damage: shatterDmg, effect: 'SHATTER', targetHp: enemy.hp, targetMaxHp: enemy.maxHp });
    }
  }

  // INFECT: on KO, spread POISON to all enemies
  if (nine.cardEffects.some(e => e.name === 'INFECT')) {
    const enemies = zone.getAliveEnemies(nine.guildTag);
    for (const enemy of enemies) {
      enemy.addTimedEffect('POISON', 3, 12000, nine.playerId);
      zone.emit({ type: 'effect_applied', effect: 'INFECT', target: enemy.playerId, targetName: enemy.name });
    }
  }

  // FEAST: all enemies with FEAST heal 15% of dead Nine's max HP
  for (const n of zone.nines.values()) {
    if (!n.alive || n.guildTag === nine.guildTag) continue;
    if (n.cardEffects.some(e => e.name === 'FEAST')) {
      const healAmt = Math.floor(nine.maxHp * 0.15);
      n.hp = Math.min(n.maxHp, n.hp + healAmt);
      zone.emit({ type: 'heal', target: n.playerId, targetName: n.name, amount: healAmt, effect: 'FEAST' });
    }
  }

  // Mark deployment as KO'd in DB (async, non-blocking)
  supabase
    .from('zone_deployments')
    .update({ current_hp: 0, is_active: false, ko_at: new Date().toISOString() })
    .eq('id', nine.deploymentId)
    .then(() => {})
    .catch(e => console.error('KO DB update failed:', e.message));

  // Broadcast respawn timer
  zone.emit({
    type: 'respawn',
    target: nine.playerId, targetName: nine.name,
    respawnAt: Date.now() + KO_COOLDOWN_MS,
  });
}

// ─── TICK: Run one 2-second tick for a zone ────────────
function tickZone(zone) {
  const now = Date.now();
  zone.tickEvents = [];

  // Check if there are at least 2 different guilds fighting
  const guilds = new Set();
  for (const nine of zone.nines.values()) {
    if (nine.alive) guilds.add(nine.guildTag);
  }
  if (guilds.size < 2) return; // no combat if only 1 guild

  // Tick effects (expire old ones)
  for (const nine of zone.nines.values()) {
    if (nine.alive) nine.tickEffects(now);
  }

  // Tick auto-attack timers
  for (const nine of zone.nines.values()) {
    if (!nine.alive) continue;
    if (nine.phasedUntil > now) continue;

    nine.attackTimer -= TICK_MS / 1000;
    if (nine.attackTimer <= 0) {
      resolveAutoAttack(nine, zone);
      nine.attackTimer = nine.getAttackInterval();
    }
  }

  // Tick spell cast timers (independent of auto-attack)
  for (const nine of zone.nines.values()) {
    if (!nine.alive) continue;

    nine.spellTimer -= TICK_MS / 1000;
    if (nine.spellTimer <= 0) {
      resolveSpellCast(nine, zone);
      nine.spellTimer = nine.getSpellInterval();
    }
  }

  // Tick DOTs
  tickPoisons(zone);
  tickCorrode(zone);

  // DODGE: anyone who was hit this tick activates dodge
  for (const nine of zone.nines.values()) {
    if (!nine.alive) continue;
    if (nine.cardEffects.some(e => e.name === 'DODGE') && nine.dodgeCooldownUntil <= now) {
      // Check if they were hit this tick (simplified: activate periodically)
      // Real implementation would track hits per tick
    }
  }

  // Broadcast all events for this tick
  if (zone.tickEvents.length > 0) {
    broadcast(zone.zoneId, 'arena:tick', {
      events: zone.tickEvents,
      state: [...zone.nines.values()].filter(n => n.alive).map(n => ({
        id: n.playerId, hp: n.hp, maxHp: n.maxHp, isAlive: n.alive,
      })),
    });
  }

  // Update HP in DB periodically (every ~10 ticks = 20s)
  if (Math.random() < 0.1) {
    for (const nine of zone.nines.values()) {
      if (nine.alive) {
        supabase.from('zone_deployments')
          .update({ current_hp: nine.hp })
          .eq('id', nine.deploymentId)
          .then(() => {}).catch(() => {});
      }
    }
  }
}

// ─── SNAPSHOT: Score zone control every 15 min ─────────
async function runSnapshot() {
  console.log('📸 Running 15-minute snapshot...');

  for (const [zoneId, zone] of Object.entries(zones)) {
    if (!zone || zone.nines.size === 0) continue;

    // Calculate guild HP totals
    const guildHp = {};
    for (const nine of zone.nines.values()) {
      if (!nine.alive) continue;
      if (!guildHp[nine.guildTag]) guildHp[nine.guildTag] = 0;
      guildHp[nine.guildTag] += nine.hp;
    }

    // Find winner
    let winner = null, maxHp = 0;
    for (const [guild, hp] of Object.entries(guildHp)) {
      if (hp > maxHp) { winner = guild; maxHp = hp; }
    }

    // Broadcast snapshot
    broadcast(parseInt(zoneId), 'arena:snapshot', {
      winner_guild: winner,
      guild_power: guildHp,
      next_snapshot_at: Date.now() + SNAPSHOT_INTERVAL_MS,
    });

    // Degrade sharpness on all deployed cards
    try {
      const { data: deps } = await supabase
        .from('zone_deployments')
        .select('id')
        .eq('zone_id', parseInt(zoneId))
        .eq('is_active', true);

      if (deps) {
        for (const dep of deps) {
          const { data: cardSlots } = await supabase
            .from('zone_card_slots')
            .select('card_id')
            .eq('deployment_id', dep.id)
            .eq('is_active', true);

          if (cardSlots) {
            for (const slot of cardSlots) {
              await supabase.rpc('decrement_sharpness', {
                p_card_id: slot.card_id,
                p_amount: SHARPNESS_LOSS_PER_SNAPSHOT,
              }).catch(() => {
                // Fallback if RPC doesn't exist
                supabase.from('player_cards')
                  .select('sharpness')
                  .eq('id', slot.card_id)
                  .single()
                  .then(({ data }) => {
                    if (data) {
                      const newSharp = Math.max(0, (data.sharpness || 100) - SHARPNESS_LOSS_PER_SNAPSHOT);
                      supabase.from('player_cards').update({ sharpness: newSharp }).eq('id', slot.card_id).then(() => {});
                    }
                  });
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(`Snapshot sharpness error zone ${zoneId}:`, e.message);
    }

    console.log(`📸 Zone ${zoneId}: ${winner || 'No winner'} controls (${maxHp} HP)`);
  }

  nextSnapshotAt = Date.now() + SNAPSHOT_INTERVAL_MS;
}

// ─── MAIN TICK LOOP ────────────────────────────────────
async function mainTick() {
  if (!running) return;

  try {
    // Get active zone IDs
    const { data: activeZones } = await supabase
      .from('zone_deployments')
      .select('zone_id')
      .eq('is_active', true);

    if (!activeZones || activeZones.length === 0) {
      // No active zones
      return;
    }

    const zoneIds = [...new Set(activeZones.map(d => d.zone_id))];

    // Load/refresh zone state periodically (every ~30s = 15 ticks)
    for (const zoneId of zoneIds) {
      if (!zones[zoneId] || Math.random() < 0.067) {
        const zoneState = await loadZoneState(zoneId);
        if (zoneState) {
          // Preserve existing combat state if zone already loaded
          if (zones[zoneId]) {
            for (const [pid, existingNine] of zones[zoneId].nines) {
              const newNine = zoneState.nines.get(pid);
              if (newNine && existingNine.alive) {
                // Preserve in-combat HP and effects
                newNine.hp = existingNine.hp;
                newNine.effects = existingNine.effects;
                newNine.attackTimer = existingNine.attackTimer;
                newNine.spellTimer = existingNine.spellTimer;
                newNine.cardIndex = existingNine.cardIndex;
                newNine.barrier = existingNine.barrier;
                newNine.alive = existingNine.alive;
              }
            }
          }
          zones[zoneId] = zoneState;
        }
      }
    }

    // Remove zones that are no longer active
    for (const zoneId of Object.keys(zones)) {
      if (!zoneIds.includes(parseInt(zoneId))) {
        delete zones[zoneId];
      }
    }

    // Tick each active zone
    for (const zoneId of zoneIds) {
      if (zones[zoneId]) {
        tickZone(zones[zoneId]);
      }
    }

    // Snapshot check
    if (nextSnapshotAt && Date.now() >= nextSnapshotAt) {
      await runSnapshot();
    }
  } catch (e) {
    console.error('⚔️ Combat tick error:', e.message);
  }
}

// ─── LIFECYCLE ─────────────────────────────────────────
function startCombatEngine() {
  if (running) return;
  running = true;
  nextSnapshotAt = Date.now() + SNAPSHOT_INTERVAL_MS;

  console.log(`⚔️ V2 Combat Engine started — ${TICK_MS}ms ticks, continuous combat`);
  console.log(`📸 Next snapshot in ${SNAPSHOT_INTERVAL_MS / 60000} minutes`);

  tickHandle = setInterval(() => {
    mainTick().catch(e => console.error('⚔️ Tick error:', e.message));
  }, TICK_MS);
}

function stopCombatEngine() {
  running = false;
  if (tickHandle) clearInterval(tickHandle);
  console.log('⚔️ Combat engine stopped');
}

function getNextCycleAt() { return nextSnapshotAt || (Date.now() + SNAPSHOT_INTERVAL_MS); }
function getCycleIntervalMs() { return SNAPSHOT_INTERVAL_MS; }

// ─── EXPORTS ───────────────────────────────────────────
module.exports = {
  startCombatEngine,
  stopCombatEngine,
  getNextCycleAt,
  getCycleIntervalMs,
  runCombatCycle: mainTick,  // alias for scheduler compatibility
  _zones: zones,
};