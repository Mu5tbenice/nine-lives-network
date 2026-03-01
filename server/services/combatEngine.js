// ═══════════════════════════════════════════════════════════════
// server/services/combatEngine.js
// V5 Auto-Battle Combat Engine — 3 Rounds Per Cycle
// Runs 5-minute cycles on all active zones with 2+ deployed Nines
// Each cycle = 3 combat rounds with healing between rounds
// ═══════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ——— CONFIG ———
const CYCLE_INTERVAL_MS = 5 * 60 * 1000;   // 5 minutes between cycles
const ROUNDS_PER_CYCLE = 3;                  // 3 combat rounds per cycle
const HEAL_BETWEEN_ROUNDS_PCT = 0.25;        // Heal 25% of max HP between rounds
const ROUND_DELAY_MS = 8000;                 // 8 seconds between rounds (for animations)
const SHARPNESS_LOSS_PER_CYCLE = 1;          // -1% sharpness per cycle (not per round)
const LONE_WOLF_ATK_BONUS = 1.5;             // V5: Lone wolves get 1.5x ATK
const HOUSE_AFFINITY_BONUS = 1.3;            // V5: House affinity cards get 1.3x effect

// House ID → key mapping
const HOUSE_MAP = {
  1: 'smoulders', 2: 'darktide', 3: 'stonebark', 4: 'ashenvale',
  5: 'stormrage', 6: 'nighthollow', 7: 'dawnbringer', 8: 'manastorm', 9: 'plaguemire'
};

// Track cycle counts per zone
const zoneCycles = {};

// ——— MAIN LOOP ———
let running = false;
let intervalHandle = null;

function startCombatEngine() {
  if (running) return;
  running = true;
  console.log(`⚔️ Combat Engine started — ${ROUNDS_PER_CYCLE} rounds per cycle, every ${CYCLE_INTERVAL_MS / 1000}s`);

  // Run immediately once, then on interval
  runAllZoneCycles();
  intervalHandle = setInterval(runAllZoneCycles, CYCLE_INTERVAL_MS);
}

function stopCombatEngine() {
  running = false;
  if (intervalHandle) clearInterval(intervalHandle);
  console.log('⚔️ Combat Engine stopped');
}

// ——— RUN ALL ZONES ———
async function runAllZoneCycles() {
  try {
    const { data: activeZones } = await supabase
      .from('zone_deployments')
      .select('zone_id')
      .eq('is_active', true);

    if (!activeZones || activeZones.length === 0) return;

    const zoneIds = [...new Set(activeZones.map(d => d.zone_id))];

    for (const zoneId of zoneIds) {
      try {
        await runZoneCycle(zoneId);
      } catch (e) {
        console.error(`⚔️ Combat error zone ${zoneId}:`, e.message);
      }
    }
  } catch (e) {
    console.error('⚔️ Combat Engine error:', e.message);
  }
}

// ——— SINGLE ZONE CYCLE (3 ROUNDS) ———
async function runZoneCycle(zoneId) {
  if (!zoneCycles[zoneId]) zoneCycles[zoneId] = 0;
  zoneCycles[zoneId]++;
  const cycleNum = zoneCycles[zoneId];

  // 1. Load all active deployments with Nine stats and equipped cards
  const { data: deployments, error } = await supabase
    .from('zone_deployments')
    .select(`
      id, player_id, nine_id, guild_tag, current_hp, max_hp, is_mercenary, is_active,
      nine:nine_id(name, base_atk, base_hp, base_spd, base_def, base_luck, house_id),
      player:player_id(twitter_handle)
    `)
    .eq('zone_id', zoneId)
    .eq('is_active', true)
    .gt('current_hp', 0);

  if (error || !deployments || deployments.length < 2) return;

  // 2. Build fighters array with stats from cards
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
      .eq('deployment_id', d.id)
      .eq('is_active', true);

    let totalAtk = nine.base_atk || 0;
    let totalHp = nine.base_hp || 0;
    let totalSpd = nine.base_spd || 0;
    let totalDef = nine.base_def || 0;
    let totalLuck = nine.base_luck || 0;
    const effects = [];

    for (const slot of (cardSlots || [])) {
      const card = slot.card;
      if (!card || !card.spell) continue;
      const spell = card.spell;
      const sharpness = (card.sharpness != null ? card.sharpness : 100) / 100;
      const sharpMult = 0.5 + sharpness / 2;

      totalAtk += Math.round((spell.base_atk || 0) * sharpMult);
      totalHp += Math.round((spell.base_hp || 0) * sharpMult);
      totalSpd += Math.round((spell.base_spd || 0) * sharpMult);
      totalDef += Math.round((spell.base_def || 0) * sharpMult);
      totalLuck += Math.round((spell.base_luck || 0) * sharpMult);

      if (spell.bonus_effects && Array.isArray(spell.bonus_effects)) {
        for (const eff of spell.bonus_effects) {
          effects.push({
            tag: eff.tag || eff.name || '',
            desc: eff.desc || '',
            source: spell.name,
            sharpness: sharpness,
          });
        }
      }
    }

    if (d.is_mercenary) {
      totalAtk = Math.round(totalAtk * LONE_WOLF_ATK_BONUS);
    }

    fighters.push({
      deployment_id: d.id,
      player_id: d.player_id,
      nine_id: d.nine_id,
      name: nine.name || d.player?.twitter_handle || 'Unknown',
      guild: d.guild_tag || 'Lone Wolf',
      house_id: nine.house_id,
      hp: d.current_hp,
      maxHp: d.max_hp,
      baseAtk: Math.max(1, totalAtk),
      atk: Math.max(1, totalAtk),
      baseSpd: totalSpd,
      spd: totalSpd,
      def: totalDef,
      luck: totalLuck,
      effects: effects,
      alive: d.current_hp > 0,
      cards: (cardSlots || []).map(s => s.card_id),
    });
  }

  // Need fighters from different guilds
  const uniqueGuilds = new Set(fighters.map(f => f.guild));
  if (uniqueGuilds.size < 2) return;

  // ——— BROADCAST CYCLE START ———
  broadcastToZone(zoneId, 'arena:cycle_start', {
    cycle_number: cycleNum,
    total_rounds: ROUNDS_PER_CYCLE,
    nines: fighters.map(f => ({
      id: f.player_id,
      current_hp: f.hp,
      max_hp: f.maxHp,
      alive: f.alive,
    })),
  });

  // ——— RUN 3 ROUNDS ———
  for (let round = 1; round <= ROUNDS_PER_CYCLE; round++) {
    // Check if there are still fighters from 2+ guilds alive
    const aliveGuilds = new Set(fighters.filter(f => f.alive).map(f => f.guild));
    if (aliveGuilds.size < 2) {
      console.log(`⚔️ Zone ${zoneId} cycle ${cycleNum}: combat ended early at round ${round} — only 1 guild remaining`);
      break;
    }

    // Reset per-round temporary effects
    for (const f of fighters) {
      f._hasWard = false;
      f._hasAnchor = false;
      f._silenced = false;
      f._hasThorns = 0;
      f._hasTaunt = false;
      f._hasStealth = false;
      // Reset ATK/SPD to base (buffs/debuffs are per-round)
      f.atk = f.baseAtk;
      f.spd = f.baseSpd;
    }

    // Broadcast round start
    broadcastToZone(zoneId, 'arena:round_start', {
      round_number: round,
      total_rounds: ROUNDS_PER_CYCLE,
      cycle_number: cycleNum,
      nines: fighters.map(f => ({
        id: f.player_id,
        current_hp: f.hp,
        max_hp: f.maxHp,
        alive: f.alive,
      })),
    });

    // Small delay so frontend shows round banner
    await sleep(1500);

    // Run the actual combat round
    const events = runSingleRound(fighters, round);

    // Stagger broadcast events for animation
    let delay = 0;
    for (const ev of events) {
      const stagger = ev.type === 'attack' ? 900 : 600;
      await sleep(stagger);
      broadcastToZone(zoneId, 'arena:event', ev);
      delay += stagger;
    }

    // Wait for last animations
    await sleep(2000);

    // Broadcast round end
    broadcastToZone(zoneId, 'arena:round_end', {
      round_number: round,
      total_rounds: ROUNDS_PER_CYCLE,
      cycle_number: cycleNum,
      nines: fighters.map(f => ({
        id: f.player_id,
        current_hp: f.hp,
        max_hp: f.maxHp,
        alive: f.alive,
      })),
    });

    // ——— HEAL PHASE between rounds (not after last round) ———
    if (round < ROUNDS_PER_CYCLE) {
      await sleep(2000);

      const healEvents = [];
      for (const f of fighters) {
        if (!f.alive) continue; // KO'd Nines stay down
        const healAmt = Math.round(f.maxHp * HEAL_BETWEEN_ROUNDS_PCT);
        const oldHp = f.hp;
        f.hp = Math.min(f.maxHp, f.hp + healAmt);
        const actualHeal = f.hp - oldHp;
        if (actualHeal > 0) {
          healEvents.push({
            type: 'heal',
            nine_id: f.player_id,
            amount: actualHeal,
            new_hp: f.hp,
            source: 'round_heal',
          });
        }
      }

      broadcastToZone(zoneId, 'arena:heal_phase', {
        round_just_ended: round,
        next_round: round + 1,
        heals: healEvents,
        nines: fighters.map(f => ({
          id: f.player_id,
          current_hp: f.hp,
          max_hp: f.maxHp,
          alive: f.alive,
        })),
      });

      // Wait for heal animations
      await sleep(3000);
    }
  }

  // ——— CYCLE END: Power Calculation ———
  await sleep(1000);

  const guildScores = {};
  for (const f of fighters) {
    if (!guildScores[f.guild]) guildScores[f.guild] = 0;
    if (f.alive) guildScores[f.guild] += f.hp;
  }

  const sortedGuilds = Object.entries(guildScores).sort((a, b) => b[1] - a[1]);
  const winnerGuild = sortedGuilds.length > 0 ? sortedGuilds[0][0] : null;

  broadcastToZone(zoneId, 'arena:cycle_end', {
    cycle_number: cycleNum,
    winner_guild: winnerGuild,
    guild_scores: guildScores,
    nines: fighters.map(f => ({
      id: f.player_id,
      current_hp: f.hp,
      max_hp: f.maxHp,
      alive: f.alive,
      guild: f.guild,
    })),
  });

  // ——— UPDATE DATABASE ———
  for (const f of fighters) {
    await supabase
      .from('zone_deployments')
      .update({
        current_hp: f.hp,
        is_active: f.alive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', f.deployment_id);
  }

  // ——— DEGRADE SHARPNESS (once per cycle, not per round) ———
  for (const f of fighters) {
    if (f.cards && f.cards.length > 0) {
      for (const cardId of f.cards) {
        if (!cardId) continue;
        await supabase.rpc('decrease_sharpness', { card_id_input: cardId, amount: SHARPNESS_LOSS_PER_CYCLE }).catch(() => {
          supabase
            .from('player_cards')
            .update({ sharpness: Math.max(0, 100 - SHARPNESS_LOSS_PER_CYCLE) })
            .eq('id', cardId)
            .then(() => {});
        });
      }
    }
  }

  // ——— AWARD POINTS ———
  try {
    let addPoints;
    try { addPoints = require('./pointsService').addPoints; } catch(e) { addPoints = null; }

    if (addPoints) {
      for (const f of fighters) {
        if (f.alive) {
          await addPoints(f.player_id, 3, 'zone_survive', `Survived cycle ${cycleNum} on zone ${zoneId}`);
          if (f.guild === winnerGuild) {
            await addPoints(f.player_id, 5, 'zone_win', `Won cycle ${cycleNum} on zone ${zoneId}`);
          }
        }
      }

      const koFighters = fighters.filter(f => !f.alive);
      for (const ko of koFighters) {
        const killers = fighters.filter(f => f.guild !== ko.guild && f.alive);
        if (killers.length > 0) {
          const killer = killers[Math.floor(Math.random() * killers.length)];
          await addPoints(killer.player_id, 10, 'zone_ko', `KO'd ${ko.name} on zone ${zoneId}`);
        }
      }
    }
  } catch (e) {
    console.error('⚔️ Points award error:', e.message);
  }

  console.log(`⚔️ Zone ${zoneId} cycle ${cycleNum}: ${fighters.length} fighters, ${ROUNDS_PER_CYCLE} rounds, winner: ${winnerGuild}, ${fighters.filter(f => !f.alive).length} KOs`);
}


// ═══════════════════════════════════════════════════════════════
// SINGLE ROUND — All combat phases (no DB writes, just in-memory)
// ═══════════════════════════════════════════════════════════════
function runSingleRound(fighters, roundNum) {
  const events = [];

  // Sort by SPD (highest first)
  fighters.sort((a, b) => b.spd - a.spd);

  // ——— PHASE 1: Card effects resolve ———
  for (const fighter of fighters) {
    if (!fighter.alive) continue;
    for (const eff of fighter.effects) {
      const tag = (eff.tag || '').toUpperCase();

      if (tag.startsWith('HEAL')) {
        const healAmt = parseEffectValue(tag, 3);
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmt);
        events.push({ type: 'heal', nine_id: fighter.player_id, amount: healAmt, new_hp: fighter.hp });
      }

      if (tag.startsWith('HASTE')) {
        fighter.spd += 3;
        events.push({ type: 'effect', effect_type: 'HASTE', target_id: fighter.player_id });
      }

      if (tag.startsWith('WARD')) {
        fighter._hasWard = true;
        events.push({ type: 'effect', effect_type: 'WARD', target_id: fighter.player_id });
      }

      if (tag.startsWith('ANCHOR')) {
        fighter._hasAnchor = true;
      }

      if (tag.startsWith('INSPIRE')) {
        const inspireAmt = parseEffectValue(tag, 1);
        for (const ally of fighters) {
          if (ally.guild === fighter.guild && ally.player_id !== fighter.player_id && ally.alive) {
            ally.atk += inspireAmt;
            events.push({ type: 'effect', effect_type: 'INSPIRE', target_id: ally.player_id });
          }
        }
      }

      if (tag.startsWith('BLESS')) {
        const blessAmt = parseEffectValue(tag, 2);
        for (const ally of fighters) {
          if (ally.guild === fighter.guild && ally.alive) {
            ally.hp = Math.min(ally.maxHp, ally.hp + blessAmt);
            events.push({ type: 'heal', nine_id: ally.player_id, amount: blessAmt, new_hp: ally.hp });
          }
        }
      }

      if (tag.startsWith('SILENCE')) {
        const enemies = fighters.filter(f => f.guild !== fighter.guild && f.alive);
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          target._silenced = true;
          events.push({ type: 'effect', effect_type: 'SILENCE', target_id: target.player_id });
        }
      }

      if (tag.startsWith('HEX')) {
        const hexAmt = parseEffectValue(tag, 2);
        const enemies = fighters.filter(f => f.guild !== fighter.guild && f.alive);
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          target.atk = Math.max(0, target.atk - hexAmt);
          events.push({ type: 'effect', effect_type: 'HEX', target_id: target.player_id });
        }
      }

      if (tag.startsWith('WEAKEN')) {
        const enemies = fighters.filter(f => f.guild !== fighter.guild && f.alive);
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          target.atk = Math.round(target.atk * 0.5);
          events.push({ type: 'effect', effect_type: 'WEAKEN', target_id: target.player_id });
        }
      }

      if (tag.startsWith('DRAIN')) {
        const drainAmt = parseEffectValue(tag, 3);
        const enemies = fighters.filter(f => f.guild !== fighter.guild && f.alive);
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          const stolen = Math.min(drainAmt, target.hp);
          target.hp -= stolen;
          fighter.hp = Math.min(fighter.maxHp, fighter.hp + stolen);
          events.push({ type: 'effect', effect_type: 'DRAIN', target_id: target.player_id });
          events.push({ type: 'heal', nine_id: fighter.player_id, amount: stolen, new_hp: fighter.hp });
          events.push({ type: 'damage', target_id: target.player_id, new_hp: target.hp });
        }
      }

      if (tag.startsWith('SLOW')) {
        const slowAmt = parseEffectValue(tag, 3);
        const enemies = fighters.filter(f => f.guild !== fighter.guild && f.alive);
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          target.spd = Math.max(0, target.spd - slowAmt);
          events.push({ type: 'effect', effect_type: 'SLOW', target_id: target.player_id });
        }
      }

      if (tag.startsWith('THORNS')) {
        fighter._hasThorns = parseEffectValue(tag, 2);
      }

      if (tag.startsWith('TAUNT')) {
        fighter._hasTaunt = true;
        events.push({ type: 'effect', effect_type: 'TAUNT', target_id: fighter.player_id });
      }

      if (tag.startsWith('STEALTH') && roundNum === 1) {
        fighter._hasStealth = true;
        events.push({ type: 'effect', effect_type: 'STEALTH', target_id: fighter.player_id });
      }
    }
  }

  // ——— PHASE 2: Auto-attack ———
  fighters.sort((a, b) => b.spd - a.spd);

  for (const attacker of fighters) {
    if (!attacker.alive) continue;
    if (attacker._silenced) continue;

    let enemies = fighters.filter(f => f.guild !== attacker.guild && f.alive && !f._hasStealth);
    if (enemies.length === 0) continue;

    // TAUNT forces targeting
    const taunters = enemies.filter(f => f._hasTaunt);
    if (taunters.length > 0) enemies = taunters;

    // Target lowest HP
    enemies.sort((a, b) => a.hp - b.hp);
    const target = enemies[0];

    let damage = Math.max(1, attacker.atk);

    // CRIT
    let isCrit = false;
    const critChance = Math.min(0.5, attacker.luck * 0.03);
    if (Math.random() < critChance) {
      damage = Math.round(damage * 2);
      isCrit = true;
    }

    // DEF
    damage = Math.max(1, damage - target.def);

    // DODGE
    const dodgeChance = Math.min(0.4, target.luck * 0.02);
    if (Math.random() < dodgeChance) {
      events.push({ type: 'dodge', nine_id: target.player_id });
      continue;
    }

    // WARD
    if (target._hasWard) {
      target._hasWard = false;
      events.push({ type: 'ward_pop', nine_id: target.player_id });
      continue;
    }

    // Apply damage
    target.hp = Math.max(0, target.hp - damage);

    events.push({
      type: 'attack',
      from: attacker.player_id,
      to: target.player_id,
      damage: damage,
      crit: isCrit,
      round: roundNum,
    });

    events.push({ type: 'damage', target_id: target.player_id, new_hp: target.hp });

    // THORNS
    if (target._hasThorns && target.alive) {
      const thornsDmg = target._hasThorns;
      attacker.hp = Math.max(0, attacker.hp - thornsDmg);
      events.push({ type: 'effect', effect_type: 'THORNS', target_id: attacker.player_id });
      events.push({ type: 'damage', target_id: attacker.player_id, new_hp: attacker.hp });
    }

    // BURN on attack
    for (const eff of attacker.effects) {
      const tag = (eff.tag || '').toUpperCase();
      if (tag.startsWith('BURN')) {
        const burnDmg = parseEffectValue(tag, 3);
        target.hp = Math.max(0, target.hp - burnDmg);
        events.push({ type: 'effect', effect_type: 'BURN_APPLY', target_id: target.player_id });
        events.push({ type: 'damage', target_id: target.player_id, new_hp: target.hp });
      }
    }
  }

  // ——— PHASE 3: DOT ticks ———
  for (const fighter of fighters) {
    if (!fighter.alive) continue;
    for (const enemy of fighters) {
      if (enemy.guild === fighter.guild || !enemy.alive) continue;
      for (const eff of enemy.effects) {
        const tag = (eff.tag || '').toUpperCase();
        if (tag.startsWith('POISON')) {
          const poisonDmg = parseEffectValue(tag, 2);
          fighter.hp = Math.max(0, fighter.hp - poisonDmg);
          events.push({ type: 'effect', effect_type: 'POISON_TICK', target_id: fighter.player_id });
          events.push({ type: 'damage', target_id: fighter.player_id, new_hp: fighter.hp });
        }
        if (tag.startsWith('CORRODE')) {
          fighter.maxHp = Math.max(1, fighter.maxHp - 1);
          fighter.hp = Math.min(fighter.hp, fighter.maxHp);
          events.push({ type: 'effect', effect_type: 'CORRODE', target_id: fighter.player_id });
        }
      }
    }
  }

  // ——— PHASE 4: KO check ———
  for (const fighter of fighters) {
    if (fighter.hp <= 0 && fighter.alive) {
      if (fighter._hasAnchor) {
        fighter.hp = 1;
        fighter._hasAnchor = false;
        events.push({ type: 'effect', effect_type: 'ANCHOR_SAVE', target_id: fighter.player_id });
      } else {
        fighter.alive = false;
        fighter.hp = 0;
        events.push({ type: 'ko', nine_id: fighter.player_id, round: roundNum });

        // SHATTER
        for (const eff of fighter.effects) {
          if ((eff.tag || '').toUpperCase().startsWith('SHATTER')) {
            const shatterDmg = parseEffectValue(eff.tag, 3);
            for (const enemy of fighters) {
              if (enemy.guild !== fighter.guild && enemy.alive) {
                enemy.hp = Math.max(0, enemy.hp - shatterDmg);
                events.push({ type: 'effect', effect_type: 'SHATTER', target_id: enemy.player_id });
                events.push({ type: 'damage', target_id: enemy.player_id, new_hp: enemy.hp });
              }
            }
          }
        }

        // INFECT
        for (const eff of fighter.effects) {
          if ((eff.tag || '').toUpperCase().startsWith('INFECT')) {
            for (const enemy of fighters) {
              if (enemy.guild !== fighter.guild && enemy.alive) {
                events.push({ type: 'effect', effect_type: 'INFECT', target_id: enemy.player_id });
              }
            }
          }
        }
      }
    }
  }

  return events;
}


// ——— HELPERS ———

function parseEffectValue(tag, defaultVal) {
  const match = (tag || '').match(/[+-]?\d+/);
  return match ? parseInt(match[0]) : defaultVal;
}

function broadcastToZone(zoneId, event, data) {
  try {
    if (global.__arenaSocket && global.__arenaSocket._broadcastToZone) {
      global.__arenaSocket._broadcastToZone(zoneId, event, data);
    }
  } catch (e) {
    // Socket broadcast is non-critical
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { startCombatEngine, stopCombatEngine, runZoneCycle };