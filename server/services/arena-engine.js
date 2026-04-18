/**
 * ARENA ENGINE — Nine Lives Network V5
 *
 * Server-side combat engine for zone battles.
 * Runs rounds within cycles, emits events via Socket.io.
 *
 * CYCLE (5 minutes) = 3-4 ROUNDS (~60-90 sec each)
 * Between rounds: 50% HP heal, clear temp effects
 * Between cycles: full heal, sharpness degrades, points awarded
 */

// ============================================
// EFFECT VALUES — All 36 effects, locked in
// ============================================
const EFFECT_VALUES = {
  // Attack
  BURN: { damage_per_cycle: 2 },
  CHAIN: { targets: 2 },
  CRIT: {
    chance: 0.25,
    multiplier: 2,
  } /** Execute an attack from attacker to target */,
  SURGE: { atk_bonus: 0.5, extra_sharpness_cost: 1 },
  PIERCE: { ignores: ['WARD', 'BARRIER'] },

  // Defense
  HEAL: { base_heal: 3 },
  WARD: { type: 'binary' },
  ANCHOR: { type: 'binary', min_hp: 1 },
  THORNS: { reflect_damage: 2 },
  BARRIER: { absorb_total: 5 },

  // Control
  SILENCE: { type: 'binary' },
  HEX: { atk_reduction: 2 },
  WEAKEN: { damage_multiplier: 0.5 },
  DRAIN: { min: 2, max: 4 },
  SIPHON: { hp_per_enemy: 1 },
  SLOW: { spd_reduction: 3 },
  TETHER: { damage_share: 0.5 },
  MARK: { damage_increase: 0.25 },

  // Tempo
  HASTE: { spd_bonus: 3 },
  SWIFT: { deploy_multiplier: 2 },
  DODGE: { chance: 0.3 },
  PHASE: { skip_cycle: true, next_cycle_bonus: 0.5 },
  STEALTH: { duration_cycles: 1 },

  // Attrition
  POISON: { damage_per_cycle: 2, max_stacks: 3 },
  CORRODE: { max_hp_reduction: 1 },
  INFECT: { spread_value: 2 },

  // Team
  AMPLIFY: { effect_bonus: 0.5 },
  INSPIRE: { atk_bonus_allies: 1 },
  BLESS: { heal_allies: 2 },
  TAUNT: { type: 'binary' },
  SHATTER: { on_ko_damage: 3 },
  REFLECT: { type: 'binary' },

  // Utility
  CLEANSE: {
    removes: [
      'BURN',
      'POISON',
      'CORRODE',
      'WEAKEN',
      'HEX',
      'SLOW',
      'SILENCE',
      'TETHER',
      'MARK',
    ],
  },
  LEECH_FIELD: { hp_per_enemy_per_cycle: 1 },
  OVERCHARGE: { trigger_count: 2, extra_sharpness_cost: 1 },
};

// ============================================
// HOUSE BASE STATS
// ============================================
const HOUSE_STATS = {
  smoulders: { atk: 6, hp: 12, spd: 5, def: 0, luck: 1 },
  darktide: { atk: 4, hp: 16, spd: 4, def: 1, luck: 1 },
  stonebark: { atk: 2, hp: 24, spd: 2, def: 3, luck: 0 },
  ashenvale: { atk: 3, hp: 14, spd: 8, def: 0, luck: 2 },
  stormrage: { atk: 7, hp: 10, spd: 6, def: 0, luck: 2 },
  nighthollow: { atk: 4, hp: 13, spd: 7, def: 0, luck: 3 },
  dawnbringer: { atk: 3, hp: 18, spd: 3, def: 2, luck: 0 },
  manastorm: { atk: 5, hp: 14, spd: 5, def: 1, luck: 1 },
  plaguemire: { atk: 3, hp: 15, spd: 4, def: 2, luck: 1 },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get sharpness modifier (0.5 to 1.0) */
function getSharpnessModifier(sharpness) {
  return 0.5 + sharpness / 200;
}

/** Get attack cooldown in seconds based on SPD */
function getAttackCooldown(spd) {
  return Math.max(5, 10 - spd * 0.5);
}

/** Roll a percentage chance (0-1) */
function roll(chance) {
  return Math.random() < chance;
}

/** Get random int between min and max (inclusive) */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Calculate distance between two positions (isometric grid) */
function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Apply stacking diminishing returns: 1st=100%, 2nd=75%, 3rd=50% */
function getStackedValue(baseValue, stackCount) {
  const multipliers = [1.0, 0.75, 0.5];
  const idx = Math.min(stackCount, 2); // cap at 3rd stack (index 2)
  return Math.round(baseValue * multipliers[idx]);
}

/** Scale effect value by sharpness and house affinity */
function scaleEffectValue(baseValue, sharpness, isOwnHouse, isAlliedHouse) {
  let value = baseValue * getSharpnessModifier(sharpness);
  if (isOwnHouse) value *= 1.3;
  else if (isAlliedHouse) value *= 1.1;
  return Math.round(value);
}

// ============================================
// NINE (A combatant in the arena)
// ============================================
class ArenaNine {
  constructor(data) {
    this.id = data.id; // player_id or nine_id
    this.name = data.name; // display name
    this.house = data.house; // house key
    this.guild_id = data.guild_id || null; // guild or null (Lone Wolf)
    this.guild_name = data.guild_name || 'Lone Wolf';
    this.items = data.items || {}; // equipped items
    this.cards = data.cards || []; // 3-card loadout [{spell data + sharpness}]
    this.isFirstDeploy = data.isFirstDeploy || false; // for SWIFT

    // Calculate combat stats from house base + cards
    const base = HOUSE_STATS[this.house] || HOUSE_STATS.smoulders;
    this.base_atk = base.atk;
    this.base_hp = base.hp;
    this.base_spd = base.spd;
    this.base_def = base.def;
    this.base_luck = base.luck;

    // Add card stats (scaled by sharpness)
    let card_atk = 0,
      card_hp = 0,
      card_spd = 0,
      card_def = 0,
      card_luck = 0;
    for (const card of this.cards) {
      const mod = getSharpnessModifier(card.sharpness || 100);
      card_atk += Math.round((card.atk || 0) * mod);
      card_hp += Math.round((card.hp || 0) * mod);
      card_spd += Math.round((card.spd || 0) * mod);
      card_def += Math.round((card.def || 0) * mod);
      card_luck += Math.round((card.luck || 0) * mod);
    }

    this.total_atk = this.base_atk + card_atk;
    this.total_hp = this.base_hp + card_hp;
    this.total_spd = this.base_spd + card_spd;
    this.total_def = this.base_def + card_def;
    this.total_luck = this.base_luck + card_luck;

    // Lone Wolf bonus
    if (!this.guild_id) {
      this.total_atk = Math.round(this.total_atk * 1.5);
    }

    // Combat state
    this.max_hp = this.total_hp;
    this.current_hp = this.max_hp;
    this.alive = true;
    this.attack_cooldown = getAttackCooldown(this.total_spd);
    this.time_since_attack = 0;

    // Position (set by arena)
    this.position = { x: 0, y: 0 };

    // Active effects / status
    this.effects = {}; // { BURN: { value: 2, stacks: 1 }, POISON: { value: 2, stacks: 2 }, ... }
    this.has_ward = false;
    this.has_anchor = false;
    this.has_stealth = false;
    this.has_taunt = false;
    this.has_reflect = false;
    this.barrier_hp = 0;
    this.is_phased = false;
    this.phase_bonus_next = false;
    this.is_silenced = false;
    this.tether_target = null;
    this.is_marked = false;
    this.swift_active = false;

    // Stats tracking
    this.damage_dealt = 0;
    this.damage_taken = 0;
    this.kills = 0;
    this.rounds_survived = 0;
  }

  /** Get all effects from cards, returning categorized effect list */
  getCardEffects() {
    const effects = [];
    for (const card of this.cards) {
      if (!card.bonus_effects) continue;
      for (const effect of card.bonus_effects) {
        effects.push({
          tag: effect.tag.split(' ')[0], // "BURN +3" → "BURN"
          value: parseInt(effect.tag.split('+')[1]) || 0, // "BURN +3" → 3
          card_house: card.house,
          card_sharpness: card.sharpness || 100,
          card_type: card.spell_type,
        });
      }
    }
    return effects;
  }

  /** Check if this Nine is allied with another (same guild) */
  isAlly(other) {
    return this.guild_id && other.guild_id && this.guild_id === other.guild_id;
  }

  /** Check if a card is from this Nine's own house */
  isOwnHouseCard(card) {
    return card.card_house === this.house;
  }

  /** Check if a card is from an allied house */
  isAlliedHouseCard(card) {
    // TODO: define allied house pairs
    return false;
  }

  /** Take damage (handles DEF, WARD, BARRIER, ANCHOR, MARK, TETHER) */
  takeDamage(amount, source, options = {}) {
    const events = [];
    let finalDamage = amount;

    // MARK increases incoming damage
    if (this.is_marked && !options.isEffectDamage) {
      finalDamage = Math.round(
        finalDamage * (1 + EFFECT_VALUES.MARK.damage_increase),
      );
    }

    // DEF reduces auto-attack damage (not effect damage)
    if (!options.isEffectDamage && !options.isPierce) {
      finalDamage = Math.max(1, finalDamage - this.total_def);
    }

    // DODGE check (for auto-attacks only)
    if (!options.isEffectDamage && !options.cantDodge) {
      const dodgeChance = EFFECT_VALUES.DODGE.chance + this.total_luck * 0.01;
      if (this.effects.DODGE && roll(dodgeChance)) {
        events.push({
          type: 'dodge',
          nine_id: this.id,
          attacker_id: source?.id,
        });
        return events;
      }
    }

    // WARD blocks one hit entirely
    if (this.has_ward && !options.isPierce && !options.isEffectDamage) {
      this.has_ward = false;
      events.push({ type: 'ward_pop', nine_id: this.id });
      return events;
    }

    // BARRIER absorbs cumulative damage
    if (this.barrier_hp > 0 && !options.isPierce) {
      const absorbed = Math.min(this.barrier_hp, finalDamage);
      this.barrier_hp -= absorbed;
      finalDamage -= absorbed;
      if (this.barrier_hp <= 0) {
        events.push({
          type: 'effect',
          nine_id: this.id,
          effect_type: 'BARRIER_BREAK',
        });
      }
      if (finalDamage <= 0) return events;
    }

    // REFLECT bounces back full damage
    if (this.has_reflect && !options.isEffectDamage && source) {
      this.has_reflect = false;
      events.push({
        type: 'effect',
        nine_id: this.id,
        effect_type: 'REFLECT',
        target_id: source.id,
      });
      const reflectEvents = source.takeDamage(amount, this, {
        isEffectDamage: true,
        cantDodge: true,
      });
      return [...events, ...reflectEvents];
    }

    // Apply damage
    this.current_hp -= finalDamage;
    this.damage_taken += finalDamage;
    if (source) source.damage_dealt += finalDamage;

    events.push({
      type: 'damage',
      target_id: this.id,
      source_id: source?.id,
      amount: finalDamage,
      new_hp: this.current_hp,
    });

    // TETHER shares damage
    if (
      this.tether_target &&
      this.tether_target.alive &&
      !options.isTetherDamage
    ) {
      const sharedDamage = Math.round(
        finalDamage * EFFECT_VALUES.TETHER.damage_share,
      );
      const tetherEvents = this.tether_target.takeDamage(sharedDamage, null, {
        isEffectDamage: true,
        isTetherDamage: true,
      });
      events.push({
        type: 'effect',
        effect_type: 'TETHER_SHARE',
        source_id: this.id,
        target_id: this.tether_target.id,
        amount: sharedDamage,
      });
      events.push(...tetherEvents);
    }

    // THORNS reflects damage to attacker
    if (this.effects.THORNS && source && !options.isEffectDamage) {
      const thornsDmg = EFFECT_VALUES.THORNS.reflect_damage;
      events.push({
        type: 'effect',
        effect_type: 'THORNS',
        source_id: this.id,
        target_id: source.id,
        amount: thornsDmg,
      });
      source.current_hp -= thornsDmg;
      source.damage_taken += thornsDmg;
    }

    // ANCHOR prevents dropping below 1 HP
    if (this.current_hp <= 0 && this.has_anchor) {
      this.current_hp = 1;
      this.has_anchor = false; // consumed
      events.push({
        type: 'effect',
        nine_id: this.id,
        effect_type: 'ANCHOR_SAVE',
      });
    }

    // KO check
    if (this.current_hp <= 0) {
      this.current_hp = 0;
      this.alive = false;
      if (source) source.kills += 1;
      events.push({ type: 'ko', nine_id: this.id, killer_id: source?.id });
    }

    return events;
  }

  /** Heal this Nine */
  heal(amount) {
    if (!this.alive) return [];
    const before = this.current_hp;
    this.current_hp = Math.min(this.max_hp, this.current_hp + amount);
    const healed = this.current_hp - before;
    if (healed > 0) {
      return [
        {
          type: 'heal',
          nine_id: this.id,
          amount: healed,
          new_hp: this.current_hp,
        },
      ];
    }
    return [];
  }

  /** Reset for between rounds (50% heal, clear temp effects) */
  betweenRoundReset() {
    if (!this.alive) return;
    const healAmount = Math.round(this.max_hp * 0.5);
    this.current_hp = Math.min(this.max_hp, this.current_hp + healAmount);

    // Clear temporary effects (keep POISON stacks and CORRODE)
    this.has_ward = false;
    this.has_anchor = false;
    this.has_stealth = false;
    this.has_taunt = false;
    this.has_reflect = false;
    this.barrier_hp = 0;
    this.is_phased = false;
    this.is_silenced = false;
    this.is_marked = false;
    this.tether_target = null;
    this.time_since_attack = 0;

    // Clear temp numeric effects but keep persistent ones
    const persistent = ['POISON', 'CORRODE'];
    const tempEffects = Object.keys(this.effects).filter(
      (e) => !persistent.includes(e),
    );
    for (const e of tempEffects) {
      delete this.effects[e];
    }
  }

  /** Full reset for between cycles */
  betweenCycleReset() {
    this.current_hp = this.max_hp;
    this.alive = true;
    this.effects = {};
    this.has_ward = false;
    this.has_anchor = false;
    this.has_stealth = false;
    this.has_taunt = false;
    this.has_reflect = false;
    this.barrier_hp = 0;
    this.is_phased = false;
    this.phase_bonus_next = false;
    this.is_silenced = false;
    this.tether_target = null;
    this.is_marked = false;
    this.time_since_attack = 0;
  }
}

// ============================================
// ARENA — One zone's combat instance
// ============================================
class Arena {
  constructor(zoneId, io) {
    this.zoneId = zoneId;
    this.io = io; // Socket.io instance
    this.room = `zone_${zoneId}`; // Socket.io room name

    this.nines = new Map(); // id → ArenaNine
    this.round = 0;
    this.cycle = 0;
    this.roundTimer = 0; // seconds elapsed in current round
    this.cycleTimer = 0; // seconds elapsed in current cycle
    this.isRunning = false;
    this.tickInterval = null;

    // Config
    this.ROUND_DURATION = 90; // seconds per round
    this.CYCLE_DURATION = 300; // seconds per cycle (5 min)
    this.ROUNDS_PER_CYCLE = 4; // max rounds per cycle
    this.TICK_RATE = 1000; // ms between ticks (1 second)
    this.SUPPORT_PULSE_INTERVAL = 10; // seconds between support card pulses
  }

  // --- NINE MANAGEMENT ---

  /** Add a Nine to the arena */
  addNine(nineData) {
    const nine = new ArenaNine(nineData);
    nine.isFirstDeploy = true; // for SWIFT
    nine.position = this.getSpawnPosition(nine.guild_id);
    this.nines.set(nine.id, nine);

    this.emit('arena:nine_joined', {
      nine_id: nine.id,
      player_name: nine.name,
      guild: nine.guild_name,
      guild_id: nine.guild_id,
      house: nine.house,
      cards: nine.cards.map((c) => ({
        name: c.name,
        type: c.spell_type,
        effects: c.bonus_effects,
      })),
      items: nine.items,
      position: nine.position,
      stats: {
        atk: nine.total_atk,
        hp: nine.total_hp,
        spd: nine.total_spd,
        def: nine.total_def,
        luck: nine.total_luck,
      },
    });

    // Start engine if this is the first Nine
    if (this.nines.size >= 2 && !this.isRunning) {
      this.start();
    }

    return nine;
  }

  /** Remove a Nine from the arena */
  removeNine(nineId, reason = 'withdraw') {
    this.nines.delete(nineId);
    this.emit('arena:nine_left', { nine_id: nineId, reason });

    // Stop engine if less than 2 Nines
    if (this.nines.size < 2 && this.isRunning) {
      this.stop();
    }
  }

  /** Get spawn position for a guild (cluster guilds together) */
  getSpawnPosition(guildId) {
    // Simple isometric positioning — spread guilds around arena edges
    const guildNines = [...this.nines.values()].filter(
      (n) => n.guild_id === guildId,
    );
    const guildIndex = this.getGuildIndex(guildId);
    const angleBase = (guildIndex / this.getGuildCount()) * Math.PI * 2;
    const radius = 200;
    const offset = guildNines.length * 30; // spread within guild cluster

    return {
      x: 400 + Math.cos(angleBase) * radius + (Math.random() - 0.5) * offset,
      y: 300 + Math.sin(angleBase) * radius + (Math.random() - 0.5) * offset,
    };
  }

  /** Get unique guild count */
  getGuildCount() {
    const guilds = new Set(
      [...this.nines.values()].map((n) => n.guild_id || n.id),
    );
    return Math.max(guilds.size, 1);
  }

  /** Get a consistent index for a guild */
  getGuildIndex(guildId) {
    const guilds = [
      ...new Set([...this.nines.values()].map((n) => n.guild_id || n.id)),
    ];
    return guilds.indexOf(guildId || 'lone');
  }

  // --- ENGINE CONTROL ---

  /** Start the arena engine */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.cycle = 1;
    this.startCycle();
    console.log(`⚔️ Arena started for zone ${this.zoneId}`);
  }

  /** Stop the arena engine */
  stop() {
    this.isRunning = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    console.log(`🛑 Arena stopped for zone ${this.zoneId}`);
  }

  /** Start a new cycle */
  startCycle() {
    this.cycleTimer = 0;
    this.round = 0;

    // Reset all Nines for new cycle
    for (const nine of this.nines.values()) {
      nine.betweenCycleReset();
    }

    this.emit('arena:cycle_start', {
      cycle_number: this.cycle,
      zone_id: this.zoneId,
      deployed_nines: this.getNinesSnapshot(),
    });

    this.startRound();
  }

  /** Start a new round within the cycle */
  startRound() {
    this.round += 1;
    this.roundTimer = 0;

    // Apply round-start effects
    const startEvents = this.applyRoundStartEffects();

    this.emit('arena:round_start', {
      round_number: this.round,
      nines: this.getNinesSnapshot(),
      start_effects: startEvents,
    });

    // Start the tick loop
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => this.tick(), this.TICK_RATE);
  }

  /** Main game tick — runs every second */
  tick() {
    if (!this.isRunning) return;

    this.roundTimer += 1;
    this.cycleTimer += 1;

    const events = [];

    // Get alive Nines
    const alive = [...this.nines.values()].filter((n) => n.alive);
    if (alive.length < 2) {
      this.endRound();
      return;
    }

    // Process each alive Nine
    for (const nine of alive) {
      if (nine.is_phased) continue; // PHASE: skip this round

      // Check attack cooldown
      nine.time_since_attack += 1;
      if (nine.time_since_attack >= nine.attack_cooldown) {
        nine.time_since_attack = 0;
        const attackEvents = this.processAutoAttack(nine, alive);
        events.push(...attackEvents);
      }
    }

    // Support card pulse (every 10 seconds)
    if (this.roundTimer % this.SUPPORT_PULSE_INTERVAL === 0) {
      const supportEvents = this.processSupportPulse(alive);
      events.push(...supportEvents);
    }

    // Effect ticks (every 5 seconds — BURN, POISON)
    if (this.roundTimer % 5 === 0) {
      const effectEvents = this.processEffectTicks(alive);
      events.push(...effectEvents);
    }

    // Emit batched events
    if (events.length > 0) {
      this.emit('arena:events', { tick: this.roundTimer, events });
    }

    // Check for KOs that happened this tick
    this.processKOEffects(alive);

    // Check round end conditions
    if (this.roundTimer >= this.ROUND_DURATION) {
      this.endRound();
    } else {
      // Check if all but one guild is wiped
      const aliveGuilds = new Set(
        [...this.nines.values()]
          .filter((n) => n.alive)
          .map((n) => n.guild_id || n.id),
      );
      if (aliveGuilds.size <= 1) {
        this.endRound();
      }
    }
  }

  // --- COMBAT LOGIC ---

  /** Process an auto-attack for a Nine */
  processAutoAttack(attacker, aliveNines) {
    const events = [];
    const target = this.findNearestEnemy(attacker, aliveNines);
    if (!target) return events;

    // Check STEALTH — can't target stealthed Nines
    if (target.has_stealth) {
      // Find next nearest non-stealthed enemy
      const altTarget = this.findNearestEnemy(
        attacker,
        aliveNines.filter((n) => !n.has_stealth),
      );
      if (!altTarget) return events;
      return this.executeAttack(attacker, altTarget);
    }

    return this.executeAttack(attacker, target);
  }

  /** Execute an attack from attacker to target */
  executeAttack(attacker, target) {
    const events = [];
    let atk = attacker.total_atk;

    // Pick a card for this attack (round-robin through loadout)
    attacker._cardIndex =
      ((attacker._cardIndex || 0) + 1) % Math.max(attacker.cards.length, 1);
    const activeCard = attacker.cards[attacker._cardIndex] || null;
    const cardName = activeCard?.name || 'Auto Attack';
    const cardType = activeCard?.spell_type || 'attack';
    const cardEffects = activeCard?.bonus_effects || [];

    // Helper: check if active card has a given effect tag
    const cardHas = (tag) =>
      cardEffects.some((e) => e.tag && e.tag.split(' ')[0] === tag);
    // Also check persistent runtime effects (WARD, BARRIER etc applied at round start)
    const hasEffect = (tag) =>
      cardHas(tag) || this.nineHasEffect(attacker, tag);

    // PHASE bonus from last round
    if (attacker.phase_bonus_next) {
      atk = Math.round(atk * 1.5);
      attacker.phase_bonus_next = false;
    }

    // SURGE bonus (+50% ATK)
    if (hasEffect('SURGE') && !attacker.is_silenced) {
      atk = Math.round(atk * (1 + EFFECT_VALUES.SURGE.atk_bonus));
    }

    // WEAKEN debuff (target deals 50% damage — but this is on ATTACKER's damage if attacker is weakened)
    if (attacker.effects.WEAKEN) {
      atk = Math.round(atk * EFFECT_VALUES.WEAKEN.damage_multiplier);
    }

    // CRIT check
    const critChance = EFFECT_VALUES.CRIT.chance + attacker.total_luck * 0.01;
    let isCrit = false;
    if (hasEffect('CRIT') && !attacker.is_silenced && roll(critChance)) {
      atk = Math.round(atk * EFFECT_VALUES.CRIT.multiplier);
      isCrit = true;
    }

    // SWIFT bonus (first attack after deploy = double effect)
    if (attacker.swift_active) {
      atk = Math.round(atk * EFFECT_VALUES.SWIFT.deploy_multiplier);
      attacker.swift_active = false;
    }

    // Check PIERCE
    const isPierce = hasEffect('PIERCE') && !attacker.is_silenced;

    // Deal damage
    const damageEvents = target.takeDamage(atk, attacker, { isPierce });
    events.push({
      type: 'attack',
      from: attacker.id,
      to: target.id,
      damage: atk,
      crit: isCrit,
      from_pos: attacker.position,
      to_pos: target.position,
      card_name: cardName,
      card_type: cardType,
      card_effects: cardEffects,
    });
    events.push(...damageEvents);

    // CHAIN — hit a second target
    if (hasEffect('CHAIN') && !attacker.is_silenced) {
      const aliveEnemies = [...this.nines.values()].filter(
        (n) =>
          n.alive &&
          n.id !== attacker.id &&
          n.id !== target.id &&
          !attacker.isAlly(n),
      );
      if (aliveEnemies.length > 0) {
        const chainTarget = this.findNearest(target, aliveEnemies);
        if (chainTarget) {
          const chainDmg = Math.round(atk * 0.75); // chain does 75% damage
          const chainEvents = chainTarget.takeDamage(chainDmg, attacker, {
            isPierce,
          });
          events.push({
            type: 'effect',
            effect_type: 'CHAIN',
            from: target.id,
            to: chainTarget.id,
            damage: chainDmg,
          });
          events.push(...chainEvents);
        }
      }
    }

    // ON-HIT CARD EFFECTS — check active card's effects directly
    if (!attacker.is_silenced && cardEffects.length > 0) {
      const hasEffect = (tag) =>
        cardEffects.some((e) => e.tag && e.tag.split(' ')[0] === tag);

      // BURN — apply on hit
      if (hasEffect('BURN')) {
        this.applyStackingEffect(
          target,
          'BURN',
          EFFECT_VALUES.BURN.damage_per_cycle,
        );
        events.push({
          type: 'effect',
          effect_type: 'BURN_APPLY',
          target_id: target.id,
          stacks: target.effects.BURN?.stacks || 1,
        });
      }

      // POISON — apply on hit
      if (hasEffect('POISON')) {
        this.applyStackingEffect(
          target,
          'POISON',
          EFFECT_VALUES.POISON.damage_per_cycle,
        );
        events.push({
          type: 'effect',
          effect_type: 'POISON_APPLY',
          target_id: target.id,
          stacks: target.effects.POISON?.stacks || 1,
        });
      }

      // DRAIN — steal HP
      if (hasEffect('DRAIN')) {
        const drainAmount = randInt(
          EFFECT_VALUES.DRAIN.min,
          EFFECT_VALUES.DRAIN.max,
        );
        target.current_hp = Math.max(0, target.current_hp - drainAmount);
        const healEvents = attacker.heal(drainAmount);
        events.push({
          type: 'effect',
          effect_type: 'DRAIN',
          from: attacker.id,
          to: target.id,
          amount: drainAmount,
        });
        events.push(...healEvents);
      }

      // SIPHON — steal HP from all enemies
      if (hasEffect('SIPHON')) {
        let totalSiphoned = 0;
        for (const enemy of [...this.nines.values()].filter(
          (n) => n.alive && n.id !== attacker.id && !attacker.isAlly(n),
        )) {
          enemy.current_hp = Math.max(
            0,
            enemy.current_hp - EFFECT_VALUES.SIPHON.hp_per_enemy,
          );
          totalSiphoned += EFFECT_VALUES.SIPHON.hp_per_enemy;
        }
        attacker.heal(totalSiphoned);
        events.push({
          type: 'effect',
          effect_type: 'SIPHON',
          nine_id: attacker.id,
          total: totalSiphoned,
        });
      }

      // OVERCHARGE — visual trigger
      if (hasEffect('OVERCHARGE')) {
        events.push({
          type: 'effect',
          effect_type: 'OVERCHARGE',
          nine_id: attacker.id,
        });
      }
    }

    return events;
  }

  /** Find nearest enemy to a Nine */
  findNearestEnemy(nine, aliveNines) {
    // Check TAUNT first — if anyone is taunting, must target them
    const taunters = aliveNines.filter(
      (n) => n.has_taunt && n.id !== nine.id && !nine.isAlly(n),
    );
    if (taunters.length > 0) {
      return this.findNearest(nine, taunters);
    }

    const enemies = aliveNines.filter(
      (n) => n.id !== nine.id && !nine.isAlly(n),
    );
    return this.findNearest(nine, enemies);
  }

  /** Find nearest Nine from a list */
  findNearest(from, candidates) {
    if (candidates.length === 0) return null;
    let nearest = candidates[0];
    let nearestDist = distance(from.position, nearest.position);
    for (let i = 1; i < candidates.length; i++) {
      const dist = distance(from.position, candidates[i].position);
      if (dist < nearestDist) {
        nearest = candidates[i];
        nearestDist = dist;
      }
    }
    return nearest;
  }

  /** Check if a Nine has a specific effect from their cards */
  nineHasEffect(nine, effectName) {
    for (const card of nine.cards) {
      if (!card.bonus_effects) continue;
      for (const effect of card.bonus_effects) {
        if (effect.tag.startsWith(effectName)) return true;
      }
    }
    return false;
  }

  /** Apply a stacking numeric effect (diminishing returns, cap 3) */
  applyStackingEffect(nine, effectName, baseValue) {
    if (!nine.effects[effectName]) {
      nine.effects[effectName] = { value: baseValue, stacks: 1 };
    } else if (nine.effects[effectName].stacks < 3) {
      nine.effects[effectName].stacks += 1;
      const newValue = getStackedValue(
        baseValue,
        nine.effects[effectName].stacks - 1,
      );
      nine.effects[effectName].value += newValue;
    }
    // else: capped at 3, do nothing
  }

  // --- ROUND-START EFFECTS ---

  /** Apply effects that trigger at the start of a round */
  applyRoundStartEffects() {
    const events = [];
    const alive = [...this.nines.values()].filter((n) => n.alive);

    for (const nine of alive) {
      if (nine.is_silenced) continue; // SILENCE blocks effect activation

      const cardEffects = nine.getCardEffects();

      for (const effect of cardEffects) {
        switch (effect.tag) {
          case 'WARD':
            nine.has_ward = true;
            events.push({
              type: 'effect',
              effect_type: 'WARD',
              nine_id: nine.id,
            });
            break;
          case 'ANCHOR':
            nine.has_anchor = true;
            events.push({
              type: 'effect',
              effect_type: 'ANCHOR',
              nine_id: nine.id,
            });
            break;
          case 'BARRIER':
            nine.barrier_hp = EFFECT_VALUES.BARRIER.absorb_total;
            events.push({
              type: 'effect',
              effect_type: 'BARRIER',
              nine_id: nine.id,
              value: nine.barrier_hp,
            });
            break;
          case 'STEALTH':
            nine.has_stealth = true;
            events.push({
              type: 'effect',
              effect_type: 'STEALTH',
              nine_id: nine.id,
            });
            break;
          case 'TAUNT':
            nine.has_taunt = true;
            events.push({
              type: 'effect',
              effect_type: 'TAUNT',
              nine_id: nine.id,
            });
            break;
          case 'REFLECT':
            nine.has_reflect = true;
            events.push({
              type: 'effect',
              effect_type: 'REFLECT',
              nine_id: nine.id,
            });
            break;
          case 'HASTE':
            nine.attack_cooldown = getAttackCooldown(
              nine.total_spd + EFFECT_VALUES.HASTE.spd_bonus,
            );
            events.push({
              type: 'effect',
              effect_type: 'HASTE',
              nine_id: nine.id,
            });
            break;
          case 'PHASE':
            nine.is_phased = true;
            nine.phase_bonus_next = true;
            events.push({
              type: 'effect',
              effect_type: 'PHASE',
              nine_id: nine.id,
            });
            break;
          case 'DODGE':
            nine.effects.DODGE = { active: true };
            break;
          case 'SWIFT':
            if (nine.isFirstDeploy) {
              nine.swift_active = true;
              nine.isFirstDeploy = false;
              events.push({
                type: 'effect',
                effect_type: 'SWIFT',
                nine_id: nine.id,
              });
            }
            break;
          case 'CLEANSE':
            const removed = Object.keys(nine.effects);
            nine.effects = {};
            nine.is_silenced = false;
            nine.is_marked = false;
            nine.tether_target = null;
            if (removed.length > 0) {
              events.push({
                type: 'effect',
                effect_type: 'CLEANSE',
                nine_id: nine.id,
                removed,
              });
            }
            break;
          case 'SILENCE': {
            // Apply SILENCE to nearest enemy
            const target = this.findNearestEnemy(nine, alive);
            if (target) {
              target.is_silenced = true;
              events.push({
                type: 'effect',
                effect_type: 'SILENCE',
                source_id: nine.id,
                target_id: target.id,
              });
            }
            break;
          }
          case 'HEX': {
            const target = this.findNearestEnemy(nine, alive);
            if (target) {
              target.total_atk = Math.max(
                0,
                target.total_atk - EFFECT_VALUES.HEX.atk_reduction,
              );
              target.effects.HEX = true;
              events.push({
                type: 'effect',
                effect_type: 'HEX',
                source_id: nine.id,
                target_id: target.id,
              });
            }
            break;
          }
          case 'WEAKEN': {
            const target = this.findNearestEnemy(nine, alive);
            if (target) {
              target.effects.WEAKEN = true;
              events.push({
                type: 'effect',
                effect_type: 'WEAKEN',
                source_id: nine.id,
                target_id: target.id,
              });
            }
            break;
          }
          case 'SLOW': {
            const target = this.findNearestEnemy(nine, alive);
            if (target) {
              target.attack_cooldown = getAttackCooldown(
                Math.max(
                  0,
                  target.total_spd - EFFECT_VALUES.SLOW.spd_reduction,
                ),
              );
              events.push({
                type: 'effect',
                effect_type: 'SLOW',
                source_id: nine.id,
                target_id: target.id,
              });
            }
            break;
          }
          case 'MARK': {
            const target = this.findNearestEnemy(nine, alive);
            if (target) {
              target.is_marked = true;
              events.push({
                type: 'effect',
                effect_type: 'MARK',
                source_id: nine.id,
                target_id: target.id,
              });
            }
            break;
          }
          case 'TETHER': {
            const target = this.findNearestEnemy(nine, alive);
            if (target) {
              nine.tether_target = target;
              events.push({
                type: 'effect',
                effect_type: 'TETHER',
                source_id: nine.id,
                target_id: target.id,
              });
            }
            break;
          }
        }
      }
    }

    // AMPLIFY — boosts next ally's effect (applied after all start effects)
    for (const nine of alive) {
      if (this.nineHasEffect(nine, 'AMPLIFY') && !nine.is_silenced) {
        const allies = alive.filter((n) => n.id !== nine.id && nine.isAlly(n));
        if (allies.length > 0) {
          // TODO: mark one ally as amplified (next effect +50%)
          events.push({
            type: 'effect',
            effect_type: 'AMPLIFY',
            source_id: nine.id,
            target_id: allies[0].id,
          });
        }
      }
    }

    return events;
  }

  // --- PERIODIC EFFECTS ---

  /** Support card pulse (every 10 seconds) */
  processSupportPulse(alive) {
    const events = [];

    for (const nine of alive) {
      if (nine.is_silenced) continue;

      // HEAL self
      if (this.nineHasEffect(nine, 'HEAL')) {
        const healEvents = nine.heal(EFFECT_VALUES.HEAL.base_heal);
        events.push(...healEvents);
      }

      // INSPIRE allies (+1 ATK)
      if (this.nineHasEffect(nine, 'INSPIRE')) {
        const allies = alive.filter((n) => n.id !== nine.id && nine.isAlly(n));
        for (const ally of allies) {
          ally.total_atk += EFFECT_VALUES.INSPIRE.atk_bonus_allies;
          events.push({
            type: 'effect',
            effect_type: 'INSPIRE',
            source_id: nine.id,
            target_id: ally.id,
          });
        }
      }

      // BLESS allies (+2 HP heal)
      if (this.nineHasEffect(nine, 'BLESS')) {
        const allies = alive.filter((n) => n.id !== nine.id && nine.isAlly(n));
        for (const ally of allies) {
          const healEvents = ally.heal(EFFECT_VALUES.BLESS.heal_allies);
          events.push({
            type: 'effect',
            effect_type: 'BLESS',
            source_id: nine.id,
            target_id: ally.id,
          });
          events.push(...healEvents);
        }
      }

      // LEECH FIELD — steal 1 HP from every enemy per pulse
      if (this.nineHasEffect(nine, 'LEECH_FIELD')) {
        let totalLeeched = 0;
        const enemies = alive.filter(
          (n) => n.id !== nine.id && !nine.isAlly(n),
        );
        for (const enemy of enemies) {
          enemy.current_hp = Math.max(
            0,
            enemy.current_hp - EFFECT_VALUES.LEECH_FIELD.hp_per_enemy_per_cycle,
          );
          totalLeeched += EFFECT_VALUES.LEECH_FIELD.hp_per_enemy_per_cycle;
        }
        nine.heal(totalLeeched);
        events.push({
          type: 'effect',
          effect_type: 'LEECH_FIELD',
          nine_id: nine.id,
          total: totalLeeched,
        });
      }
    }

    return events;
  }

  /** Process effect ticks (BURN, POISON damage) every 5 seconds */
  processEffectTicks(alive) {
    const events = [];

    for (const nine of alive) {
      // BURN tick
      if (nine.effects.BURN) {
        const burnDmg = nine.effects.BURN.value;
        const dmgEvents = nine.takeDamage(burnDmg, null, {
          isEffectDamage: true,
        });
        events.push({
          type: 'effect',
          effect_type: 'BURN_TICK',
          nine_id: nine.id,
          damage: burnDmg,
        });
        events.push(...dmgEvents);
      }

      // POISON tick
      if (nine.effects.POISON) {
        const poisonDmg = nine.effects.POISON.value;
        const dmgEvents = nine.takeDamage(poisonDmg, null, {
          isEffectDamage: true,
        });
        events.push({
          type: 'effect',
          effect_type: 'POISON_TICK',
          nine_id: nine.id,
          damage: poisonDmg,
        });
        events.push(...dmgEvents);
      }

      // CORRODE — reduce max HP
      if (nine.effects.CORRODE) {
        nine.max_hp = Math.max(
          1,
          nine.max_hp - EFFECT_VALUES.CORRODE.max_hp_reduction,
        );
        if (nine.current_hp > nine.max_hp) nine.current_hp = nine.max_hp;
        events.push({
          type: 'effect',
          effect_type: 'CORRODE_TICK',
          nine_id: nine.id,
          new_max_hp: nine.max_hp,
        });
      }
    }

    return events;
  }

  /** Process KO effects (SHATTER, INFECT) */
  processKOEffects() {
    const justDied = [...this.nines.values()].filter(
      (n) => !n.alive && n.current_hp <= 0,
    );

    for (const dead of justDied) {
      // Mark as processed (set HP to -1 so we don't re-trigger)
      dead.current_hp = -1;

      // SHATTER — splash damage on KO
      if (this.nineHasEffect(dead, 'SHATTER')) {
        const alive = [...this.nines.values()].filter(
          (n) => n.alive && !dead.isAlly(n),
        );
        for (const enemy of alive) {
          const dmgEvents = enemy.takeDamage(
            EFFECT_VALUES.SHATTER.on_ko_damage,
            dead,
            { isEffectDamage: true },
          );
          this.emit('arena:events', {
            tick: this.roundTimer,
            events: [
              {
                type: 'effect',
                effect_type: 'SHATTER',
                source_id: dead.id,
                target_id: enemy.id,
                damage: EFFECT_VALUES.SHATTER.on_ko_damage,
              },
              ...dmgEvents,
            ],
          });
        }
      }

      // INFECT — spread POISON on KO
      if (this.nineHasEffect(dead, 'INFECT')) {
        const alive = [...this.nines.values()].filter(
          (n) => n.alive && !dead.isAlly(n),
        );
        for (const enemy of alive) {
          this.applyStackingEffect(
            enemy,
            'POISON',
            EFFECT_VALUES.INFECT.spread_value,
          );
          this.emit('arena:events', {
            tick: this.roundTimer,
            events: [
              {
                type: 'effect',
                effect_type: 'INFECT',
                source_id: dead.id,
                target_id: enemy.id,
              },
            ],
          });
        }
      }
    }
  }

  // --- ROUND / CYCLE MANAGEMENT ---

  /** End the current round */
  endRound() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // Calculate round winner
    const guildHP = {};
    for (const nine of this.nines.values()) {
      const key = nine.guild_id || nine.id;
      guildHP[key] = (guildHP[key] || 0) + (nine.alive ? nine.current_hp : 0);
    }

    let winnerGuild = null;
    let maxHP = 0;
    for (const [guild, hp] of Object.entries(guildHP)) {
      if (hp > maxHP) {
        maxHP = hp;
        winnerGuild = guild;
      }
    }

    // Track rounds survived
    for (const nine of this.nines.values()) {
      if (nine.alive) nine.rounds_survived += 1;
    }

    this.emit('arena:round_end', {
      round_number: this.round,
      winner_guild: winnerGuild,
      guild_scores: guildHP,
      survivors: this.getNinesSnapshot().filter((n) => n.alive),
      duration: this.roundTimer,
    });

    // Check if cycle should end
    if (
      this.round >= this.ROUNDS_PER_CYCLE ||
      this.cycleTimer >= this.CYCLE_DURATION
    ) {
      setTimeout(() => this.endCycle(), 3000); // 3 sec pause before cycle end
    } else {
      // Between-round heal and reset
      for (const nine of this.nines.values()) {
        nine.betweenRoundReset();
      }

      this.emit('arena:round_heal', {
        nines: [...this.nines.values()]
          .filter((n) => n.alive)
          .map((n) => ({
            id: n.id,
            hp_before: n.current_hp, // already healed at this point but good for display
            hp_after: n.current_hp,
          })),
      });

      // 5 second pause then start next round
      setTimeout(() => {
        if (this.isRunning) this.startRound();
      }, 5000);
    }
  }

  /** End the current cycle */
  endCycle() {
    // Calculate zone control
    const guildRoundWins = {};
    // TODO: track round wins per guild across the cycle

    // Degrade sharpness on all deployed cards
    const sharpnessChanges = [];
    for (const nine of this.nines.values()) {
      for (const card of nine.cards) {
        const before = card.sharpness;
        card.sharpness = Math.max(0, (card.sharpness || 100) - 1);

        // SURGE extra sharpness cost
        if (
          nine.cards.some((c) =>
            c.bonus_effects?.some((e) => e.tag.startsWith('SURGE')),
          )
        ) {
          card.sharpness = Math.max(
            0,
            card.sharpness - EFFECT_VALUES.SURGE.extra_sharpness_cost,
          );
        }

        // OVERCHARGE extra sharpness cost
        if (
          nine.cards.some((c) =>
            c.bonus_effects?.some((e) => e.tag.startsWith('OVERCHARGE')),
          )
        ) {
          card.sharpness = Math.max(
            0,
            card.sharpness - EFFECT_VALUES.OVERCHARGE.extra_sharpness_cost,
          );
        }

        sharpnessChanges.push({
          nine_id: nine.id,
          card_name: card.name,
          before,
          after: card.sharpness,
        });
      }
    }

    // Award points and XP
    const rewards = this.calculateRewards();

    this.emit('arena:cycle_end', {
      cycle_number: this.cycle,
      zone_id: this.zoneId,
      sharpness_changes: sharpnessChanges,
      rewards,
    });

    // TODO: Update database — sharpness, points, XP, zone control

    // Start next cycle
    this.cycle += 1;
    setTimeout(() => {
      if (this.isRunning) this.startCycle();
    }, 5000);
  }

  /** Calculate rewards for all Nines this cycle */
  calculateRewards() {
    const rewards = [];
    for (const nine of this.nines.values()) {
      rewards.push({
        nine_id: nine.id,
        points: {
          survived: nine.rounds_survived > 0 ? 3 : 0,
          wins: 0, // TODO: track individual round wins
          kills: nine.kills * 10,
        },
        xp: {
          survived: nine.rounds_survived > 0 ? 2 : 0,
          wins: 0,
          kills: nine.kills * 5,
        },
        stats: {
          damage_dealt: nine.damage_dealt,
          damage_taken: nine.damage_taken,
          kills: nine.kills,
          rounds_survived: nine.rounds_survived,
        },
      });

      // Reset per-cycle stats
      nine.damage_dealt = 0;
      nine.damage_taken = 0;
      nine.kills = 0;
      nine.rounds_survived = 0;
    }
    return rewards;
  }

  // --- UTILITY ---

  /** Emit a Socket.io event to all clients watching this zone */
  emit(event, data) {
    if (this.io) {
      this.io.of('/arena').to(this.room).emit(event, data);
    }
  }

  /** Get a snapshot of all Nines for sending to clients */
  getNinesSnapshot() {
    return [...this.nines.values()].map((n) => ({
      id: n.id,
      name: n.name,
      house: n.house,
      guild_id: n.guild_id,
      guild_name: n.guild_name,
      items: n.items,
      alive: n.alive,
      current_hp: n.current_hp,
      max_hp: n.max_hp,
      total_atk: n.total_atk,
      total_spd: n.total_spd,
      total_def: n.total_def,
      total_luck: n.total_luck,
      position: n.position,
      effects: Object.keys(n.effects),
      has_ward: n.has_ward,
      has_stealth: n.has_stealth,
      has_taunt: n.has_taunt,
      is_phased: n.is_phased,
      is_silenced: n.is_silenced,
      is_marked: n.is_marked,
    }));
  }
}

// ============================================
// ARENA MANAGER — Manages all active arenas
// ============================================
class ArenaManager {
  constructor(io) {
    this.io = io;
    this.arenas = new Map(); // zoneId → Arena
  }

  /** Get or create an arena for a zone */
  getArena(zoneId) {
    if (!this.arenas.has(zoneId)) {
      this.arenas.set(zoneId, new Arena(zoneId, this.io));
    }
    return this.arenas.get(zoneId);
  }

  /** Deploy a Nine to a zone */
  deployNine(zoneId, nineData) {
    const arena = this.getArena(zoneId);
    return arena.addNine(nineData);
  }

  /** Withdraw a Nine from a zone */
  withdrawNine(zoneId, nineId) {
    const arena = this.arenas.get(zoneId);
    if (arena) {
      arena.removeNine(nineId, 'withdraw');
      // Clean up empty arenas
      if (arena.nines.size === 0) {
        arena.stop();
        this.arenas.delete(zoneId);
      }
    }
  }

  /** Get arena status for a zone */
  getStatus(zoneId) {
    const arena = this.arenas.get(zoneId);
    if (!arena) return { active: false, nines: 0 };
    return {
      active: arena.isRunning,
      nines: arena.nines.size,
      round: arena.round,
      cycle: arena.cycle,
      roundTimer: arena.roundTimer,
      snapshot: arena.getNinesSnapshot(),
    };
  }

  /** Get all active arenas */
  getAllActive() {
    const active = [];
    for (const [zoneId, arena] of this.arenas) {
      if (arena.isRunning) {
        active.push({
          zoneId,
          nines: arena.nines.size,
          round: arena.round,
          cycle: arena.cycle,
        });
      }
    }
    return active;
  }
}

module.exports = { ArenaManager, Arena, ArenaNine, EFFECT_VALUES, HOUSE_STATS };
