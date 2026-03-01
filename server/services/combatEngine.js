// ═══════════════════════════════════════════════════════════════
// server/services/combatEngine.js
// V6 Wave-Based Combat — Royal Rumble Edition
// 3 rounds per cycle, 3 waves per round (1 per card slot)
// All Nines fire simultaneously, SPD = head start stagger
// HP ×10 for longer fights and survival streaks
// ═══════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ——— CONFIG ———
const CYCLE_INTERVAL_MS = 5 * 60 * 1000;
const ROUNDS_PER_CYCLE = 3;
const WAVES_PER_ROUND = 3;
const HEAL_BETWEEN_ROUNDS_PCT = 0.20;
const SHARPNESS_LOSS_PER_CYCLE = 1;
const LONE_WOLF_ATK_BONUS = 1.5;
const HP_SCALE = 10;

const HOUSE_MAP = {
  1: 'smoulders', 2: 'darktide', 3: 'stonebark', 4: 'ashenvale',
  5: 'stormrage', 6: 'nighthollow', 7: 'dawnbringer', 8: 'manastorm', 9: 'plaguemire'
};

// State
const zoneCycles = {};
const survivalStreaks = {};
let nextCycleAt = null;
let running = false;
let intervalHandle = null;

// ——— LIFECYCLE ———
function startCombatEngine() {
  if (running) return;
  running = true;
  console.log(`⚔️ V6 Combat Engine — ${ROUNDS_PER_CYCLE}R × ${WAVES_PER_ROUND}W, HP×${HP_SCALE}, every ${CYCLE_INTERVAL_MS/1000}s`);
  nextCycleAt = Date.now() + CYCLE_INTERVAL_MS;
  runAllZoneCycles();
  intervalHandle = setInterval(runAllZoneCycles, CYCLE_INTERVAL_MS);
}

function stopCombatEngine() {
  running = false;
  if (intervalHandle) clearInterval(intervalHandle);
}

function getNextCycleAt() { return nextCycleAt || (Date.now() + CYCLE_INTERVAL_MS); }
function getCycleIntervalMs() { return CYCLE_INTERVAL_MS; }

async function runAllZoneCycles() {
  try {
    const { data: activeZones } = await supabase
      .from('zone_deployments').select('zone_id').eq('is_active', true);
    if (!activeZones || activeZones.length === 0) {
      nextCycleAt = Date.now() + CYCLE_INTERVAL_MS;
      return;
    }
    const zoneIds = [...new Set(activeZones.map(d => d.zone_id))];
    for (const zoneId of zoneIds) {
      try { await runZoneCycle(zoneId); }
      catch (e) { console.error(`⚔️ Zone ${zoneId} error:`, e.message); }
    }
    nextCycleAt = Date.now() + CYCLE_INTERVAL_MS;
  } catch (e) {
    console.error('⚔️ Engine error:', e.message);
    nextCycleAt = Date.now() + CYCLE_INTERVAL_MS;
  }
}


// ═══════════════════════════════════════════════════════════════
// SINGLE ZONE CYCLE
// ═══════════════════════════════════════════════════════════════
async function runZoneCycle(zoneId) {
  if (!zoneCycles[zoneId]) zoneCycles[zoneId] = 0;
  zoneCycles[zoneId]++;
  const cycleNum = zoneCycles[zoneId];

  // Load deployments
  const { data: deployments, error } = await supabase
    .from('zone_deployments')
    .select(`
      id, player_id, nine_id, guild_tag, current_hp, max_hp, is_mercenary, is_active,
      nine:nine_id(name, base_atk, base_hp, base_spd, base_def, base_luck, house_id),
      player:player_id(twitter_handle)
    `)
    .eq('zone_id', zoneId).eq('is_active', true).gt('current_hp', 0);

  if (error || !deployments || deployments.length < 2) return;

  // Build fighters with per-slot card data
  const fighters = [];
  for (const d of deployments) {
    const nine = d.nine || {};
    const { data: cardSlots } = await supabase
      .from('zone_card_slots')
      .select(`
        card_id, slot_number,
        card:card_id(
          id, sharpness, spell_id,
          spell:spell_id(name, spell_type, house, rarity, base_atk, base_hp, base_spd, base_def, base_luck, bonus_effects)
        )
      `)
      .eq('deployment_id', d.id).eq('is_active', true)
      .order('slot_number', { ascending: true });

    let totalAtk = nine.base_atk || 0;
    let totalHp = (nine.base_hp || 0) * HP_SCALE;
    let totalSpd = nine.base_spd || 0;
    let totalDef = nine.base_def || 0;
    let totalLuck = nine.base_luck || 0;
    const allEffects = [];
    const slotCards = [null, null, null];

    for (const slot of (cardSlots || [])) {
      const card = slot.card;
      if (!card || !card.spell) continue;
      const spell = card.spell;
      const sharp = (card.sharpness != null ? card.sharpness : 100) / 100;
      const sharpMult = 0.5 + sharp / 2;

      totalAtk += Math.round((spell.base_atk || 0) * sharpMult);
      totalHp += Math.round((spell.base_hp || 0) * HP_SCALE * sharpMult);
      totalSpd += Math.round((spell.base_spd || 0) * sharpMult);
      totalDef += Math.round((spell.base_def || 0) * sharpMult);
      totalLuck += Math.round((spell.base_luck || 0) * sharpMult);

      const cardEffects = [];
      if (spell.bonus_effects && Array.isArray(spell.bonus_effects)) {
        for (const eff of spell.bonus_effects) {
          const obj = { tag: eff.tag || eff.name || '', desc: eff.desc || '', source: spell.name, sharpness: sharp };
          cardEffects.push(obj);
          allEffects.push(obj);
        }
      }

      const idx = Math.min(2, Math.max(0, (slot.slot_number || 1) - 1));
      slotCards[idx] = {
        name: spell.name,
        type: (spell.spell_type || 'attack').toLowerCase(),
        house: (spell.house || '').toLowerCase(),
        effects: cardEffects,
      };
    }

    if (d.is_mercenary) totalAtk = Math.round(totalAtk * LONE_WOLF_ATK_BONUS);

    const scaledMax = Math.max(totalHp, HP_SCALE * 5);
    // On first cycle or if DB has old unscaled HP, use calculated max
    const hp = (d.max_hp >= scaledMax * 0.5) ? Math.min(d.current_hp, scaledMax) : scaledMax;

    fighters.push({
      deployment_id: d.id,
      player_id: d.player_id,
      nine_id: d.nine_id,
      name: nine.name || d.player?.twitter_handle || 'Unknown',
      guild: d.guild_tag || 'Lone Wolf',
      house: HOUSE_MAP[nine.house_id] || 'unknown',
      house_id: nine.house_id,
      hp, maxHp: scaledMax,
      baseAtk: Math.max(1, totalAtk), atk: Math.max(1, totalAtk),
      baseSpd: totalSpd, spd: totalSpd,
      def: totalDef, luck: totalLuck,
      effects: allEffects,
      slotCards,
      alive: true,
      cards: (cardSlots || []).map(s => s.card_id),
      _hasWard: false, _hasAnchor: false, _silenced: false,
      _hasThorns: 0, _hasTaunt: false, _hasStealth: false,
    });
  }

  const uniqueGuilds = new Set(fighters.map(f => f.guild));
  if (uniqueGuilds.size < 2) return;

  const maxSpd = Math.max(...fighters.map(f => f.spd), 1);

  // ——— CYCLE START ———
  broadcastToZone(zoneId, 'arena:cycle_start', {
    cycle_number: cycleNum,
    total_rounds: ROUNDS_PER_CYCLE,
    waves_per_round: WAVES_PER_ROUND,
    max_spd: maxSpd,
    nines: fighters.map(f => ({
      id: f.player_id, name: f.name, house: f.house,
      current_hp: f.hp, max_hp: f.maxHp, spd: f.spd, alive: f.alive,
      slot_cards: f.slotCards,
    })),
  });

  // ——— RUN ROUNDS ———
  for (let round = 1; round <= ROUNDS_PER_CYCLE; round++) {
    const aliveGuilds = new Set(fighters.filter(f => f.alive).map(f => f.guild));
    if (aliveGuilds.size < 2) break;

    // Reset per-round temps
    for (const f of fighters) {
      f._hasWard = false; f._hasAnchor = false; f._silenced = false;
      f._hasThorns = 0; f._hasTaunt = false; f._hasStealth = false;
      f.atk = f.baseAtk; f.spd = f.baseSpd;
    }

    broadcastToZone(zoneId, 'arena:round_start', {
      round_number: round, total_rounds: ROUNDS_PER_CYCLE,
      cycle_number: cycleNum, max_spd: maxSpd,
      nines: fighters.map(f => ({
        id: f.player_id, current_hp: f.hp, max_hp: f.maxHp, spd: f.spd, alive: f.alive,
      })),
    });

    await sleep(1500);

    // Run all 3 waves — returns full event list
    const events = runWaveRound(fighters, round, maxSpd);

    // Send ALL events at once — frontend choreographs timing from wave + spd
    broadcastToZone(zoneId, 'arena:round_events', {
      round_number: round, cycle_number: cycleNum,
      max_spd: maxSpd, events,
    });

    // Wait for frontend animations (3 waves × ~1.8s + buffer)
    await sleep(7000);

    broadcastToZone(zoneId, 'arena:round_end', {
      round_number: round, total_rounds: ROUNDS_PER_CYCLE, cycle_number: cycleNum,
      nines: fighters.map(f => ({
        id: f.player_id, current_hp: f.hp, max_hp: f.maxHp, alive: f.alive,
      })),
    });

    // Heal between rounds
    if (round < ROUNDS_PER_CYCLE) {
      await sleep(1500);
      const heals = [];
      for (const f of fighters) {
        if (!f.alive) continue;
        const amt = Math.round(f.maxHp * HEAL_BETWEEN_ROUNDS_PCT);
        const old = f.hp;
        f.hp = Math.min(f.maxHp, f.hp + amt);
        if (f.hp > old) heals.push({ type: 'heal', nine_id: f.player_id, amount: f.hp - old, new_hp: f.hp, source: 'round_heal' });
      }
      broadcastToZone(zoneId, 'arena:heal_phase', {
        round_just_ended: round, next_round: round + 1, heals,
        nines: fighters.map(f => ({ id: f.player_id, current_hp: f.hp, max_hp: f.maxHp, alive: f.alive })),
      });
      await sleep(2500);
    }
  }

  // ——— CYCLE END ———
  const guildScores = {};
  for (const f of fighters) {
    if (!guildScores[f.guild]) guildScores[f.guild] = 0;
    if (f.alive) guildScores[f.guild] += f.hp;
  }
  const sorted = Object.entries(guildScores).sort((a, b) => b[1] - a[1]);
  const winnerGuild = sorted.length > 0 ? sorted[0][0] : null;

  // Survival streaks
  for (const f of fighters) {
    if (f.alive) {
      survivalStreaks[f.player_id] = (survivalStreaks[f.player_id] || 0) + 1;
    } else {
      survivalStreaks[f.player_id] = 0;
    }
  }

  broadcastToZone(zoneId, 'arena:cycle_end', {
    cycle_number: cycleNum, winner_guild: winnerGuild, guild_scores: guildScores,
    next_cycle_at: getNextCycleAt(), cycle_interval_ms: CYCLE_INTERVAL_MS,
    nines: fighters.map(f => ({
      id: f.player_id, current_hp: f.hp, max_hp: f.maxHp,
      alive: f.alive, guild: f.guild, streak: survivalStreaks[f.player_id] || 0,
    })),
  });

  // DB updates
  for (const f of fighters) {
    await supabase.from('zone_deployments').update({
      current_hp: f.hp, max_hp: f.maxHp, is_active: f.alive,
      updated_at: new Date().toISOString(),
    }).eq('id', f.deployment_id);
  }

  // Sharpness
  for (const f of fighters) {
    for (const cid of (f.cards || [])) {
      if (!cid) continue;
      await supabase.rpc('decrease_sharpness', { card_id_input: cid, amount: SHARPNESS_LOSS_PER_CYCLE }).catch(() => {
        supabase.from('player_cards').update({ sharpness: Math.max(0, 100 - SHARPNESS_LOSS_PER_CYCLE) }).eq('id', cid).then(() => {});
      });
    }
  }

  // Points + streaks
  try {
    let addPoints;
    try { addPoints = require('./pointsService').addPoints; } catch(e) { addPoints = null; }
    if (addPoints) {
      for (const f of fighters) {
        if (f.alive) {
          await addPoints(f.player_id, 3, 'zone_survive', `Survived cycle ${cycleNum}`);
          if (f.guild === winnerGuild) await addPoints(f.player_id, 5, 'zone_win', `Won cycle ${cycleNum}`);
          const s = survivalStreaks[f.player_id] || 0;
          if (s === 3) await addPoints(f.player_id, 5, 'streak_3', '3 cycle streak');
          if (s === 5) await addPoints(f.player_id, 10, 'streak_5', '5 cycle streak');
          if (s === 10) await addPoints(f.player_id, 20, 'streak_10', '10 cycle streak!');
          if (s === 20) await addPoints(f.player_id, 50, 'streak_20', 'LEGENDARY 20 cycle streak!');
        }
      }
      for (const ko of fighters.filter(f => !f.alive)) {
        const killers = fighters.filter(f => f.guild !== ko.guild && f.alive);
        if (killers.length > 0) {
          const killer = killers[Math.floor(Math.random() * killers.length)];
          await addPoints(killer.player_id, 10, 'zone_ko', `KO'd ${ko.name}`);
        }
      }
    }
  } catch(e) { console.error('⚔️ Points error:', e.message); }

  console.log(`⚔️ Zone ${zoneId} C${cycleNum}: ${fighters.length}f, winner=${winnerGuild}, ${fighters.filter(f=>!f.alive).length} KOs`);
}


// ═══════════════════════════════════════════════════════════════
// WAVE ROUND — 3 waves, all Nines simultaneous, SPD = stagger
// ═══════════════════════════════════════════════════════════════
function runWaveRound(fighters, roundNum, maxSpd) {
  const events = [];

  for (let wave = 1; wave <= WAVES_PER_ROUND; wave++) {
    const alive = fighters.filter(f => f.alive);
    alive.sort((a, b) => b.spd - a.spd);

    for (const f of alive) {
      const card = f.slotCards[wave - 1];
      const cardType = card ? card.type : 'attack';
      const cardName = card ? card.name : 'Auto-Attack';
      const cardEffects = card ? card.effects : [];
      const ev = { wave, spd: f.spd, from: f.player_id, from_name: f.name, from_house: f.house };

      // ——— CARD EFFECTS (if not silenced) ———
      if (!f._silenced) {
        for (const eff of cardEffects) {
          const tag = (eff.tag || '').toUpperCase();

          // Self/ally buffs
          if (tag.startsWith('HEAL')) {
            const amt = parseVal(tag, 3) * HP_SCALE;
            f.hp = Math.min(f.maxHp, f.hp + amt);
            events.push({ ...ev, type: 'cast', card_type: 'support', card_name: cardName, effect: 'HEAL', to: f.player_id, to_name: f.name, heal: amt, new_hp: f.hp });
          }
          if (tag.startsWith('WARD')) {
            f._hasWard = true;
            events.push({ ...ev, type: 'cast', card_type: 'defend', card_name: cardName, effect: 'WARD', to: f.player_id, to_name: f.name });
          }
          if (tag.startsWith('ANCHOR')) {
            f._hasAnchor = true;
            events.push({ ...ev, type: 'cast', card_type: 'defend', card_name: cardName, effect: 'ANCHOR', to: f.player_id, to_name: f.name });
          }
          if (tag.startsWith('BARRIER')) {
            events.push({ ...ev, type: 'cast', card_type: 'defend', card_name: cardName, effect: 'BARRIER', to: f.player_id, to_name: f.name });
          }
          if (tag.startsWith('THORNS')) { f._hasThorns = parseVal(tag, 2); }
          if (tag.startsWith('TAUNT')) {
            f._hasTaunt = true;
            events.push({ ...ev, type: 'cast', card_type: 'defend', card_name: cardName, effect: 'TAUNT', to: f.player_id, to_name: f.name });
          }
          if (tag.startsWith('HASTE')) {
            f.spd += 3;
            events.push({ ...ev, type: 'cast', card_type: 'utility', card_name: cardName, effect: 'HASTE', to: f.player_id, to_name: f.name });
          }
          if (tag.startsWith('STEALTH') && roundNum === 1) {
            f._hasStealth = true;
            events.push({ ...ev, type: 'cast', card_type: 'utility', card_name: cardName, effect: 'STEALTH', to: f.player_id, to_name: f.name });
          }
          if (tag.startsWith('CLEANSE')) {
            events.push({ ...ev, type: 'cast', card_type: 'utility', card_name: cardName, effect: 'CLEANSE', to: f.player_id, to_name: f.name });
          }
          if (tag.startsWith('REFLECT')) {
            events.push({ ...ev, type: 'cast', card_type: 'defend', card_name: cardName, effect: 'REFLECT', to: f.player_id, to_name: f.name });
          }

          // Team buffs
          if (tag.startsWith('INSPIRE')) {
            const amt = parseVal(tag, 1);
            for (const a of fighters.filter(x => x.guild === f.guild && x.player_id !== f.player_id && x.alive)) {
              a.atk += amt;
              events.push({ ...ev, type: 'cast', card_type: 'support', card_name: cardName, effect: 'INSPIRE', to: a.player_id, to_name: a.name });
            }
          }
          if (tag.startsWith('BLESS')) {
            const amt = parseVal(tag, 2) * HP_SCALE;
            for (const a of fighters.filter(x => x.guild === f.guild && x.alive)) {
              a.hp = Math.min(a.maxHp, a.hp + amt);
              events.push({ ...ev, type: 'cast', card_type: 'support', card_name: cardName, effect: 'BLESS', to: a.player_id, to_name: a.name, heal: amt, new_hp: a.hp });
            }
          }
          if (tag.startsWith('AMPLIFY')) {
            events.push({ ...ev, type: 'cast', card_type: 'support', card_name: cardName, effect: 'AMPLIFY', to: f.player_id, to_name: f.name });
          }

          // Enemy debuffs
          const enemies = fighters.filter(x => x.guild !== f.guild && x.alive && !x._hasStealth);
          if (enemies.length > 0) {
            const t = enemies[Math.floor(Math.random() * enemies.length)];
            if (tag.startsWith('SILENCE')) {
              t._silenced = true;
              events.push({ ...ev, type: 'cast', card_type: 'manipulation', card_name: cardName, effect: 'SILENCE', to: t.player_id, to_name: t.name });
            }
            if (tag.startsWith('HEX')) {
              t.atk = Math.max(0, t.atk - parseVal(tag, 2));
              events.push({ ...ev, type: 'cast', card_type: 'manipulation', card_name: cardName, effect: 'HEX', to: t.player_id, to_name: t.name });
            }
            if (tag.startsWith('WEAKEN')) {
              t.atk = Math.round(t.atk * 0.5);
              events.push({ ...ev, type: 'cast', card_type: 'manipulation', card_name: cardName, effect: 'WEAKEN', to: t.player_id, to_name: t.name });
            }
            if (tag.startsWith('DRAIN')) {
              const amt = parseVal(tag, 3) * HP_SCALE;
              const stolen = Math.min(amt, t.hp);
              t.hp -= stolen; f.hp = Math.min(f.maxHp, f.hp + stolen);
              events.push({ ...ev, type: 'cast', card_type: 'manipulation', card_name: cardName, effect: 'DRAIN', to: t.player_id, to_name: t.name, damage: stolen, new_hp: t.hp });
            }
            if (tag.startsWith('SLOW')) {
              t.spd = Math.max(0, t.spd - parseVal(tag, 3));
              events.push({ ...ev, type: 'cast', card_type: 'manipulation', card_name: cardName, effect: 'SLOW', to: t.player_id, to_name: t.name });
            }
            if (tag.startsWith('SIPHON')) {
              for (const en of enemies) { const s = Math.min(HP_SCALE, en.hp); en.hp -= s; f.hp = Math.min(f.maxHp, f.hp + s); }
              events.push({ ...ev, type: 'cast', card_type: 'manipulation', card_name: cardName, effect: 'SIPHON', to: t.player_id, to_name: t.name });
            }
            if (tag.startsWith('MARK')) {
              events.push({ ...ev, type: 'cast', card_type: 'manipulation', card_name: cardName, effect: 'MARK', to: t.player_id, to_name: t.name });
            }
          }
        }
      }

      // ——— AUTO-ATTACK (every Nine, every wave) ———
      let enemies = fighters.filter(x => x.guild !== f.guild && x.alive && !x._hasStealth);
      if (enemies.length === 0) continue;
      const taunters = enemies.filter(x => x._hasTaunt);
      if (taunters.length > 0) enemies = taunters;
      enemies.sort((a, b) => a.hp - b.hp);
      const target = enemies[0];

      let dmg = Math.max(1, Math.round(f.atk / WAVES_PER_ROUND));
      let isCrit = false;
      if (Math.random() < Math.min(0.5, f.luck * 0.03)) { dmg *= 2; isCrit = true; }
      dmg = Math.max(1, dmg - Math.round(target.def / WAVES_PER_ROUND));

      // Dodge
      if (Math.random() < Math.min(0.4, target.luck * 0.02)) {
        events.push({ type: 'dodge', wave, spd: f.spd, nine_id: target.player_id, from: f.player_id });
        continue;
      }
      // Ward
      if (target._hasWard) {
        target._hasWard = false;
        events.push({ type: 'ward_pop', wave, spd: f.spd, nine_id: target.player_id, from: f.player_id });
        continue;
      }

      target.hp = Math.max(0, target.hp - dmg);
      events.push({
        type: 'cast', wave, spd: f.spd,
        card_type: cardType, card_name: cardName,
        from: f.player_id, from_name: f.name, from_house: f.house,
        to: target.player_id, to_name: target.name,
        damage: dmg, crit: isCrit, effect: null, new_hp: target.hp, round: roundNum,
      });

      // BURN on hit
      for (const eff of cardEffects) {
        const tag = (eff.tag || '').toUpperCase();
        if (tag.startsWith('BURN')) {
          const bd = parseVal(tag, 3);
          target.hp = Math.max(0, target.hp - bd);
          events.push({ type: 'effect_tick', wave, spd: f.spd, effect: 'BURN', target_id: target.player_id, damage: bd, new_hp: target.hp });
        }
        if (tag.startsWith('CHAIN')) {
          const others = fighters.filter(x => x.guild !== f.guild && x.alive && x.player_id !== target.player_id);
          if (others.length > 0) {
            const t2 = others[Math.floor(Math.random() * others.length)];
            const cd = Math.round(dmg * 0.6);
            t2.hp = Math.max(0, t2.hp - cd);
            events.push({ type: 'cast', wave, spd: f.spd, card_type: 'attack', card_name: 'Chain',
              from: f.player_id, from_name: f.name, from_house: f.house,
              to: t2.player_id, to_name: t2.name, damage: cd, effect: 'CHAIN', new_hp: t2.hp, round: roundNum });
          }
        }
        if (tag.startsWith('PIERCE')) {
          // Pierce ignores WARD/BARRIER - already applied since we skip ward check above
        }
      }

      // Thorns
      if (target._hasThorns && target.alive) {
        f.hp = Math.max(0, f.hp - target._hasThorns);
        events.push({ type: 'effect_tick', wave, spd: f.spd, effect: 'THORNS', target_id: f.player_id, damage: target._hasThorns, new_hp: f.hp });
      }
    }

    // KO check after each wave
    for (const f of fighters) {
      if (f.hp <= 0 && f.alive) {
        if (f._hasAnchor) {
          f.hp = 1; f._hasAnchor = false;
          events.push({ type: 'anchor_save', wave, nine_id: f.player_id });
        } else {
          f.alive = false; f.hp = 0;
          events.push({ type: 'ko', wave, nine_id: f.player_id, round: roundNum });
          // Shatter
          for (const eff of f.effects) {
            if ((eff.tag||'').toUpperCase().startsWith('SHATTER')) {
              const sd = parseVal(eff.tag, 3);
              for (const en of fighters.filter(x => x.guild !== f.guild && x.alive)) {
                en.hp = Math.max(0, en.hp - sd);
                events.push({ type: 'effect_tick', wave, effect: 'SHATTER', target_id: en.player_id, damage: sd, new_hp: en.hp });
              }
            }
          }
        }
      }
    }
  }

  // DOT ticks end of round
  for (const f of fighters) {
    if (!f.alive) continue;
    for (const en of fighters) {
      if (en.guild === f.guild || !en.alive) continue;
      for (const eff of en.effects) {
        const tag = (eff.tag||'').toUpperCase();
        if (tag.startsWith('POISON')) {
          const d = parseVal(tag, 2);
          f.hp = Math.max(0, f.hp - d);
          events.push({ type: 'effect_tick', wave: 3, spd: 0, effect: 'POISON', target_id: f.player_id, damage: d, new_hp: f.hp });
        }
        if (tag.startsWith('CORRODE')) {
          f.maxHp = Math.max(HP_SCALE, f.maxHp - HP_SCALE);
          f.hp = Math.min(f.hp, f.maxHp);
          events.push({ type: 'effect_tick', wave: 3, spd: 0, effect: 'CORRODE', target_id: f.player_id, new_hp: f.hp });
        }
      }
    }
  }

  // Final KO check
  for (const f of fighters) {
    if (f.hp <= 0 && f.alive) {
      if (f._hasAnchor) { f.hp = 1; f._hasAnchor = false; events.push({ type: 'anchor_save', wave: 3, nine_id: f.player_id }); }
      else { f.alive = false; f.hp = 0; events.push({ type: 'ko', wave: 3, nine_id: f.player_id, round: roundNum }); }
    }
  }

  return events;
}


// ——— HELPERS ———
function parseVal(tag, def) { const m = (tag||'').match(/[+-]?\d+/); return m ? parseInt(m[0]) : def; }
function broadcastToZone(zoneId, event, data) {
  try { if (global.__arenaSocket) global.__arenaSocket._broadcastToZone(zoneId, event, data); } catch(e) {}
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { startCombatEngine, stopCombatEngine, runZoneCycle, getNextCycleAt, getCycleIntervalMs };