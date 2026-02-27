/**
 * NERM ENGINE — Nine Lives Network V5
 * 
 * Nerm is a sarcastic floating cat head who commentates
 * on arena battles. Watches combat events and generates
 * one-liners emitted as chat bubbles.
 * 
 * Rate limited: max 1 comment every 8 seconds.
 */

// ============================================
// COMMENTARY TEMPLATES
// ============================================

const TEMPLATES = {

  // --- KILLS ---
  ko: [
    "{killer} just sent {victim} to the shadow realm. No coming back from that.",
    "And {victim} is DOWN. {killer} shows zero mercy.",
    "{killer} deleted {victim}. That was personal.",
    "Rest in peace, {victim}. {killer} said no.",
    "{victim} has been removed from the conversation by {killer}.",
    "That's a wrap for {victim}. {killer} didn't even flinch.",
  ],

  // --- CRITS ---
  crit: [
    "OH. {attacker} just CRIT {target}. That's gonna leave a mark.",
    "{attacker} rolled the big numbers. {target} felt every single one.",
    "CRITICAL HIT from {attacker}! {target} is questioning their life choices.",
    "The LUCK gods smiled on {attacker}. {target}? Not so much.",
    "{attacker} said 'watch this' and absolutely obliterated {target}.",
  ],

  // --- KILL STREAKS ---
  killStreak: [
    "{killer} is on a RAMPAGE. Someone stop this cat.",
    "Three kills for {killer}. This is getting embarrassing for everyone else.",
    "{killer} is farming KOs at this point. Genuinely unfair.",
    "Is anyone going to do something about {killer}? No? Okay then.",
  ],

  // --- ANCHOR SAVES ---
  anchorSave: [
    "{nine} survives with 1 HP. That's not skill, that's ANCHOR.",
    "1 HP. ONE. {nine} refuses to die and honestly? Annoying.",
    "{nine} clings to life with 1 HP. The cockroach of Nethara.",
    "ANCHOR saves {nine} at 1 HP. That card is doing WORK.",
  ],

  // --- SHATTER ---
  shatter: [
    "{nine} died and took half the arena with them. Respect.",
    "SHATTER goes off! {nine} said 'if I'm going down, you're coming with me.'",
    "{nine} explodes on death. That's the most useful they've been all round.",
  ],

  // --- WARD POP ---
  wardPop: [
    "{nine}'s WARD just popped. They're naked out there now.",
    "Shield's down on {nine}. Open season.",
  ],

  // --- SILENCE ---
  silence: [
    "{target} has been SILENCED. All those fancy effects? Gone.",
    "SILENCE on {target}. {source} said 'no abilities for you.'",
    "{target} is silenced. Just a cat with stats now. Sad.",
  ],

  // --- REFLECT ---
  reflect: [
    "{nine} said 'no u' and REFLECTED that attack. Beautiful.",
    "REFLECT! {attacker} just hit themselves. Comedy.",
    "{nine}'s REFLECT sends it right back. {attacker} played themselves.",
  ],

  // --- DODGE ---
  dodge: [
    "{nine} DODGED. Can't hit what you can't catch.",
    "Miss! {nine} is built different.",
    "{attacker} swung at air. {nine} wasn't there.",
  ],

  // --- POISON STACKS ---
  poisonMax: [
    "{nine} has 3 stacks of POISON. That's the maximum. That's death.",
    "Full POISON stacks on {nine}. Plaguemire sends their regards.",
    "{nine} is melting. Three poison stacks will do that.",
  ],

  // --- INFECT SPREAD ---
  infect: [
    "INFECT triggers! {source} died but the POISON lives on. In everyone.",
    "{source}'s death spreads POISON to the whole arena. Even from the grave.",
  ],

  // --- DRAIN / VAMPIRE ---
  drain: [
    "{attacker} just DRAINED {target}. Stealing health like it's nothing.",
    "DRAIN from {attacker}. Taking HP and giving nothing back.",
  ],

  // --- LONE WOLF ---
  loneWolfKill: [
    "{killer} doesn't need a guild. Apparently.",
    "Lone Wolf {killer} out here solo carrying. Bold move.",
    "{killer} fights alone and wins alone. Guild recruitment just got harder.",
  ],

  // --- ROUND START ---
  roundStart: [
    "Round {round}. Let's see who's still standing.",
    "Round {round} begins. The survivors are getting desperate.",
    "Round {round}. Fresh round, same chaos.",
    "Here we go again. Round {round}.",
    "Round {round}. Some of you won't make it. That's just math.",
  ],

  // --- ROUND END ---
  roundWin: [
    "{guild} takes Round {round}. Dominant.",
    "Round {round} goes to {guild}. Surprised? I'm not.",
    "{guild} wins Round {round}. The other guilds should be embarrassed.",
  ],

  // --- CLOSE ROUND (tight HP difference) ---
  closeRound: [
    "That was CLOSE. {guild} barely scraped that round.",
    "Round {round} decided by a hair. {guild} survives. Barely.",
    "If that round was any closer it'd be a tie. {guild} takes it.",
  ],

  // --- CYCLE END ---
  cycleEnd: [
    "{guild} controls {zone}. For now.",
    "Cycle over. {guild} holds {zone}. See you in 5 minutes.",
    "{zone} belongs to {guild}. Everyone else? Try harder.",
  ],

  // --- NO CONTEST (one guild dominates) ---
  domination: [
    "{guild} is running this zone unopposed. Where IS everyone?",
    "This isn't a battle, it's a {guild} victory lap.",
    "{guild} owns this zone. The rest of you are just visiting.",
  ],

  // --- GENERIC HYPE ---
  hype: [
    "This zone is CHAOS and I am HERE for it.",
    "Twenty cats in a pit throwing spells. This is peak Nethara.",
    "If you're not watching {zone} right now, you're missing out.",
    "The damage numbers flying around right now are OBSCENE.",
  ],

  // --- SUPPORT PLAYS ---
  support: [
    "{nine} just BLESSED the whole squad. Wholesome AND tactical.",
    "INSPIRE from {nine}. The guild's ATK just went up. You're welcome.",
    "{nine} out here healing teammates. The real MVP.",
  ],

  // --- TAUNT ---
  taunt: [
    "{nine} activates TAUNT. 'Come at me.' Brave or stupid? Yes.",
    "TAUNT from {nine}. Every enemy is now forced to fight them. Bold.",
  ],

  // --- CORRODE ---
  corrode: [
    "{nine}'s max HP is shrinking. CORRODE doesn't care about your feelings.",
    "CORRODE is eating {nine} alive. Their max HP is gone and it's not coming back.",
  ],

  // --- CHAIN ---
  chain: [
    "CHAIN hit! {attacker} hit {target1} AND {target2}. Two for one.",
    "{attacker}'s attack bounces to {target2}. CHAIN doesn't play fair.",
  ],
};

// ============================================
// NERM ENGINE
// ============================================

class NermEngine {
  constructor() {
    this.lastCommentTime = 0;
    this.MIN_INTERVAL = 8000;  // 8 seconds between comments
    this.killCounts = {};       // track kills per Nine for streak detection
    this.roundStartCommented = false;
  }

  /** Process a batch of arena events and maybe generate a Nerm comment */
  processEvents(events, arenaState) {
    const now = Date.now();
    if (now - this.lastCommentTime < this.MIN_INTERVAL) return null;

    // Priority order — check most exciting events first
    let comment = null;

    for (const event of events) {
      if (comment) break; // one comment per batch

      switch (event.type) {
        case 'ko':
          comment = this.onKO(event, arenaState);
          break;
        case 'attack':
          if (event.crit) comment = this.onCrit(event, arenaState);
          break;
        case 'effect':
          comment = this.onEffect(event, arenaState);
          break;
        case 'dodge':
          comment = this.onDodge(event, arenaState);
          break;
      }
    }

    if (comment) {
      this.lastCommentTime = now;
      return { message: comment, tone: 'snarky' };
    }

    return null;
  }

  /** Generate comment for a KO event */
  onKO(event, state) {
    const killer = this.getName(event.killer_id, state);
    const victim = this.getName(event.nine_id, state);

    if (!killer || !victim) return null;

    // Track kill streaks
    this.killCounts[event.killer_id] = (this.killCounts[event.killer_id] || 0) + 1;

    // Kill streak (3+)
    if (this.killCounts[event.killer_id] >= 3) {
      return this.pick(TEMPLATES.killStreak, { killer });
    }

    // Lone Wolf kill
    const killerNine = this.getNine(event.killer_id, state);
    if (killerNine && !killerNine.guild_id) {
      return this.pick(TEMPLATES.loneWolfKill, { killer });
    }

    // SHATTER death
    if (event.shatter) {
      return this.pick(TEMPLATES.shatter, { nine: victim });
    }

    // INFECT death
    if (event.infect) {
      return this.pick(TEMPLATES.infect, { source: victim });
    }

    // Normal KO
    return this.pick(TEMPLATES.ko, { killer, victim });
  }

  /** Generate comment for a CRIT */
  onCrit(event, state) {
    const attacker = this.getName(event.from, state);
    const target = this.getName(event.to, state);
    if (!attacker || !target) return null;
    return this.pick(TEMPLATES.crit, { attacker, target });
  }

  /** Generate comment for an effect event */
  onEffect(event, state) {
    switch (event.effect_type) {
      case 'ANCHOR_SAVE':
        return this.pick(TEMPLATES.anchorSave, { nine: this.getName(event.nine_id, state) });

      case 'REFLECT':
        return this.pick(TEMPLATES.reflect, {
          nine: this.getName(event.nine_id, state),
          attacker: this.getName(event.target_id, state), // the one who got reflected on
        });

      case 'SILENCE':
        return this.pick(TEMPLATES.silence, {
          target: this.getName(event.target_id, state),
          source: this.getName(event.source_id, state),
        });

      case 'POISON_APPLY': {
        if (event.stacks >= 3) {
          return this.pick(TEMPLATES.poisonMax, { nine: this.getName(event.target_id, state) });
        }
        return null;
      }

      case 'INFECT':
        return this.pick(TEMPLATES.infect, { source: this.getName(event.source_id, state) });

      case 'DRAIN':
        return this.pick(TEMPLATES.drain, {
          attacker: this.getName(event.from, state),
          target: this.getName(event.to, state),
        });

      case 'TAUNT':
        return this.pick(TEMPLATES.taunt, { nine: this.getName(event.nine_id, state) });

      case 'CORRODE_TICK':
        return this.pick(TEMPLATES.corrode, { nine: this.getName(event.nine_id, state) });

      case 'CHAIN':
        return this.pick(TEMPLATES.chain, {
          attacker: this.getName(event.from, state),
          target1: this.getName(event.from, state), // original target
          target2: this.getName(event.to, state),
        });

      case 'BLESS':
      case 'INSPIRE':
        return this.pick(TEMPLATES.support, { nine: this.getName(event.source_id, state) });

      default:
        return null;
    }
  }

  /** Generate comment for a dodge */
  onDodge(event, state) {
    const nine = this.getName(event.nine_id, state);
    const attacker = this.getName(event.attacker_id, state);
    if (!nine) return null;
    return this.pick(TEMPLATES.dodge, { nine, attacker });
  }

  /** Generate round start comment */
  onRoundStart(roundNumber) {
    this.killCounts = {}; // reset streaks each round
    return {
      message: this.pick(TEMPLATES.roundStart, { round: roundNumber }),
      tone: 'narrator',
    };
  }

  /** Generate round end comment */
  onRoundEnd(roundNumber, winnerGuild, wasClose) {
    if (wasClose) {
      return {
        message: this.pick(TEMPLATES.closeRound, { guild: winnerGuild, round: roundNumber }),
        tone: 'excited',
      };
    }
    return {
      message: this.pick(TEMPLATES.roundWin, { guild: winnerGuild, round: roundNumber }),
      tone: 'snarky',
    };
  }

  /** Generate cycle end comment */
  onCycleEnd(winnerGuild, zoneName) {
    return {
      message: this.pick(TEMPLATES.cycleEnd, { guild: winnerGuild, zone: zoneName }),
      tone: 'narrator',
    };
  }

  /** Generate random hype comment (for when nothing special is happening) */
  getHypeComment(zoneName) {
    return {
      message: this.pick(TEMPLATES.hype, { zone: zoneName }),
      tone: 'hype',
    };
  }

  // --- HELPERS ---

  /** Pick a random template and fill in variables */
  pick(templates, vars = {}) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value || '???');
    }
    return result;
  }

  /** Get a Nine's display name from arena state */
  getName(nineId, state) {
    if (!state || !nineId) return null;
    const nine = state.find(n => n.id === nineId);
    return nine ? nine.name : null;
  }

  /** Get a Nine object from arena state */
  getNine(nineId, state) {
    if (!state || !nineId) return null;
    return state.find(n => n.id === nineId);
  }
}

module.exports = { NermEngine };