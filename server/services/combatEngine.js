// ══════════════════════════════════════════════════════════════════════
// server/services/combatEngine.js  —  9LV Combat Engine V3
// Sequential rotation · Range-based targeting · Spatial positions
// ══════════════════════════════════════════════════════════════════════
'use strict';

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── CONSTANTS ────────────────────────────────────────────────────────
const TICK_MS        = 200;   // 200ms ticks — 5 server updates/sec
const ROUND_CAP_MS   = 5 * 60 * 1000;    // 5 min hard cap — rounds end early on last guild standing
const INTERMISSION_MS = 25 * 1000;       // 25s between rounds
const SESSION_MS     = 1 * 60 * 60 * 1000; // 1hr session timer before auto-withdraw
const SPD_FLOOR     = 5.5;   // card cycle floor (effects stay deliberate)
const ATK_FLOOR     = 2.5;   // auto-attack floor (constant visual activity)
const CORRODE_CD    = 5.0;  // 5 second cooldown — time-based, tick-rate independent
const ZONE_W        = 900;
const ZONE_H        = 500;
const ZONE_MARGIN   = 80;  // increased from 40 — keeps nines away from edges that may be outside canvas polygon

const SPELL_RANGE = { melee:90, mid:220, ranged:380, self:0, aoe_self:120, zone:9999 };

const CARD_TYPE_CONFIG = {
  attack:  { range: SPELL_RANGE.melee,    prefer:'random', moveTo:'preferred_enemy' },
  control: { range: SPELL_RANGE.mid,      prefer:'random', moveTo:'preferred_enemy' },
  dot:     { range: SPELL_RANGE.ranged,   prefer:'random', moveTo:'preferred_enemy' },
  support: { range: SPELL_RANGE.aoe_self, prefer:'random_ally', moveTo:'ally_cluster' },
  utility: { range: SPELL_RANGE.self,     prefer:'self',   moveTo:'hold'            },
};

const HOUSE_STATS = {
  stormrage:   { atk:40, hp:280, spd:30, def:5,  luck:15 },
  smoulders:   { atk:35, hp:350, spd:25, def:10, luck:10 },
  stonebark:   { atk:12, hp:700, spd:10, def:40, luck:5  },
  ashenvale:   { atk:20, hp:380, spd:22, def:12, luck:15 },
  nighthollow: { atk:25, hp:360, spd:30, def:12, luck:25 },
  dawnbringer: { atk:15, hp:620, spd:15, def:30, luck:5  },
  manastorm:   { atk:30, hp:380, spd:25, def:15, luck:10 },
  plaguemire:  { atk:20, hp:450, spd:20, def:25, luck:10 },
  darktide:    { atk:25, hp:450, spd:20, def:20, luck:10 },
};

// ─── ZONE PRESENCE BONUSES ────────────────────────────────────────────
// Applied globally to ALL fighters on a zone. Recalculated nightly from
// yesterday's dominant house (by fighter count, not HP).
const HOUSE_BONUSES = {
  smoulders:   { key: 'atk',        mult: 1.20 },
  darktide:    { key: 'regen',      pct:  0.03  }, // 3% maxHP per minute (every 30 ticks)
  stonebark:   { key: 'hp',         mult: 1.25  },
  ashenvale:   { key: 'spd',        mult: 1.15  },
  stormrage:   { key: 'crit_mult',  value: 3    }, // crits deal 3× instead of 2×
  nighthollow: { key: 'luck',       bonus: 10   },
  dawnbringer: { key: 'heal_amp',   mult: 1.50  },
  manastorm:   { key: 'effect_amp', mult: 1.30  },
  plaguemire:  { key: 'poison_aura' },             // enemies start with 1 POISON stack
};

// In-memory cache: zoneId → { house, bonus } loaded at startup + refreshed nightly
const zoneBonusCache = new Map();

// ─── SCHOOL_ID → HOUSE KEY (DB stores numeric IDs, engine needs strings) ──────
const SCHOOL_TO_HOUSE = {
  1:'smoulders', 2:'darktide',  3:'stonebark', 4:'ashenvale', 5:'stormrage',
  6:'nighthollow', 7:'dawnbringer', 8:'manastorm', 9:'plaguemire',
};
function resolveHouseKey(raw) {
  if (!raw) return 'stormrage';
  if (typeof raw === 'string' && HOUSE_STATS[raw]) return raw;
  const n = parseInt(raw);
  if (!isNaN(n) && SCHOOL_TO_HOUSE[n]) return SCHOOL_TO_HOUSE[n];
  if (SCHOOL_TO_HOUSE[raw]) return SCHOOL_TO_HOUSE[raw];
  return 'stormrage';
}

const atkInterval  = spd => Math.max(ATK_FLOOR, 7.5 - spd * 0.10);  // faster: 2.5–6.5s range
const cardInterval = spd => Math.max(5.5, 12.0 - spd * 0.10);
const dist         = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
const clamp        = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
const inRange      = (a,b,r) => dist(a,b) <= r;
const baseDmg      = (atk,def) => atk+def<=0 ? 1 : Math.max(1, Math.floor(atk*atk/(atk+def)));

function slotMult(slot, hpPct) {
  if (slot === 0) return 1.35;
  if (slot === 2 && hpPct < 0.40) return 1.5;
  return 1.0;
}

// ─── ZONE BONUS CACHE ─────────────────────────────────────────────────
async function refreshZoneBonusCache() {
  try {
    const { data } = await supabaseAdmin
      .from('zone_control')
      .select('zone_id, dominant_house');
    (data || []).forEach(row => {
      const bonus = row.dominant_house ? HOUSE_BONUSES[row.dominant_house] : null;
      zoneBonusCache.set(String(row.zone_id), { house: row.dominant_house, bonus });
    });
    console.log(`✅ Zone bonus cache refreshed — ${data?.length || 0} zones`);
  } catch(e) {
    console.error('❌ Zone bonus cache refresh failed:', e.message);
  }
}

function getZoneBonus(zoneId) {
  return zoneBonusCache.get(String(zoneId)) || null;
}

// ─── ENGINE STATE ─────────────────────────────────────────────────────
const zones = new Map();
let _tickInt=null;

// ─── BUILD NINE STATE ─────────────────────────────────────────────────
function buildNineState(dep, nine, cards, zoneBonus) {
  const houseKey = resolveHouseKey(nine.house_key || nine.house_id);
  const h = HOUSE_STATS[houseKey] || HOUSE_STATS.stormrage;
  const atk  = h.atk  + cards.reduce((s,c)=>s+(c.base_atk ||0),0);
  let   hp   = h.hp   + cards.reduce((s,c)=>s+(c.base_hp  ||0),0);
  let   spd  = h.spd  + cards.reduce((s,c)=>s+(c.base_spd ||0),0);
  const def  = h.def  + cards.reduce((s,c)=>s+(c.base_def ||0),0);
  const luck = h.luck + cards.reduce((s,c)=>s+(c.base_luck||0),0);

  // Apply zone bonuses that affect base pool at spawn time
  const bk = zoneBonus?.bonus?.key;
  if (bk === 'hp')  hp  = Math.round(hp  * (zoneBonus.bonus.mult || 1));
  if (bk === 'spd') spd = Math.round(spd * (zoneBonus.bonus.mult || 1));

  const x = ZONE_MARGIN + Math.random()*(ZONE_W-ZONE_MARGIN*2);
  const y = ZONE_MARGIN + Math.random()*(ZONE_H-ZONE_MARGIN*2);
  return {
    deploymentId: String(dep.id), playerId: dep.player_id, nineId: dep.nine_id,
    guildTag: dep.guild_tag||'lone_wolf', playerName: nine.name||'Unknown', houseKey, // no lone_wolf ATK bonus — FFA makes it irrelevant
    waitingForRound: false,   // true = KO'd this round, waiting to rejoin
    stats:{atk,hp,spd,def,luck}, cards,
    hp, maxHp:hp, x, y, destX:x, destY:y,
    moveSpeed: 6 + spd*0.15,   // slow shuffle: ~7-11 units/tick → 5-7s per wander step
    atkTimer:  atkInterval(spd),
    cardTimer: cardInterval(spd),
    cardIdx:0,
    burnStacks:0, burnTimer:0, poisonStacks:0, poisonTimer:0, corrodeCd:0,
    wardUp:false, anchorUp:false, barrierHp:0, dodgeReady:false, reflectReady:false, tauntActive:false,
    silenced:0, weakened:0, marked:0, hexAmt:0,
    hasteBonus:0, hasteTurns:0, tetherActive:false, tetherTurns:0,
    drainActive:false, witherActive:0, blindTurns:0,
    zoneId: String(dep.zone_id),
    _zoneBonus: zoneBonus || null,
    _koProcessed:false,
    _currentTarget: null,
    _targetLockedUntil: 0,
    _deployedAt: Date.now(),
    _lastHitBy: null, _lastHitById: null,
  };
}

// ─── TARGETING ────────────────────────────────────────────────────────
function activeCard(nine) {
  return nine.cards[nine.cardIdx % Math.max(1,nine.cards.length)];
}

function cardCfg(nine) {
  return CARD_TYPE_CONFIG[activeCard(nine)?.card_type] || CARD_TYPE_CONFIG.attack;
}

function pickTarget(nine, all) {
  // TAUNT overrides everything
  const taunter = all.find(n=>n.hp>0 && n.guildTag!==nine.guildTag && n.tauntActive);
  if (taunter) { nine._currentTarget = taunter.deploymentId; return taunter; }

  // All attacks are ranged — no distance check needed. Any enemy on the zone is valid.
  const enemies = all.filter(n => n.hp > 0 && n.guildTag !== nine.guildTag);
  if (!enemies.length) { nine._currentTarget = null; return null; }

  // Sticky target lock 6–9s — prevents focus-switching every tick
  const now = Date.now() / 1000;
  if (nine._currentTarget && nine._targetLockedUntil && now < nine._targetLockedUntil) {
    const locked = enemies.find(e => e.deploymentId === nine._currentTarget);
    if (locked) return locked;
  }

  // Random target selection — no focus-firing on lowest HP (per game design)
  const chosen = enemies[Math.floor(Math.random() * enemies.length)];
  nine._currentTarget = chosen.deploymentId;
  nine._targetLockedUntil = now + 6 + Math.random() * 3;
  return chosen;
}

function pickHealTarget(nine, all) {
  const allies = all.filter(n=>n.hp>0 && n.guildTag===nine.guildTag && inRange(nine,n,SPELL_RANGE.aoe_self));
  if (!allies.length) return nine;
  return allies.reduce((b,a)=>a.hp<b.hp?a:b);
}

// ─── MOVEMENT — intention-based positioning ──────────────────────────
// Each Nine has a preferred combat position based on card type.
// They drift toward that position continuously, with micro-wander layered on top.
// Attack lunge and hit flinch are applied as temporary destX/Y offsets.
function updateDest(nine, all) {
  if (nine.tauntActive) { nine.destX=ZONE_W/2; nine.destY=ZONE_H/2; return; }
  const cfg = cardCfg(nine);
  if (cfg.moveTo==='hold') {
    // Utility/self: hold position with tiny micro-drift only
    nine.destX = clamp(nine.x + (Math.random()-0.5)*20, ZONE_MARGIN, ZONE_W-ZONE_MARGIN);
    nine.destY = clamp(nine.y + (Math.random()-0.5)*20, ZONE_MARGIN, ZONE_H-ZONE_MARGIN);
    return;
  }

  const enemies = all.filter(n=>n.hp>0&&n.guildTag!==nine.guildTag);
  const allies  = all.filter(n=>n.hp>0&&n.guildTag===nine.guildTag&&n.deploymentId!==nine.deploymentId);

  // Support: orbit the most wounded nearby ally
  if (cfg.moveTo==='ally_cluster') {
    const target = allies.length
      ? allies.reduce((b,a)=>a.hp<b.hp?a:b)
      : null;
    if (target) {
      const ang = Math.atan2(nine.y-target.y, nine.x-target.x) + (Math.random()-0.5)*1.2;
      const orbitR = 55 + Math.random()*20;
      nine.destX = clamp(target.x + Math.cos(ang)*orbitR, ZONE_MARGIN, ZONE_W-ZONE_MARGIN);
      nine.destY = clamp(target.y + Math.sin(ang)*orbitR, ZONE_MARGIN, ZONE_H-ZONE_MARGIN);
    } else {
      // No allies — wander center
      nine.destX = clamp(ZONE_W/2 + (Math.random()-0.5)*120, ZONE_MARGIN, ZONE_W-ZONE_MARGIN);
      nine.destY = clamp(ZONE_H/2 + (Math.random()-0.5)*80,  ZONE_MARGIN, ZONE_H-ZONE_MARGIN);
    }
    return;
  }

  // Pick a preferred enemy to position around
  const anchor = enemies.length
    ? enemies[Math.floor(Math.random()*Math.min(3,enemies.length))]  // one of nearest 3
    : null;

  if (anchor) {
    // Preferred standoff distance by card type:
    // attack=80 (close, aggressive), control=150 (mid), dot=220 (ranged backline)
    const standoff = cfg.moveTo==='preferred_enemy'
      ? (nine.cards[0]?.card_type==='dot' ? 220
         : nine.cards[0]?.card_type==='control' ? 150 : 80)
      : 120;

    // Position at standoff distance on a slightly random angle from anchor
    const baseAng = Math.atan2(nine.y-anchor.y, nine.x-anchor.x);
    const jitter  = (Math.random()-0.5)*1.4; // ±~80° arc — more flanking movement
    const ang     = baseAng + jitter;
    const drift   = (Math.random()-0.5)*50;  // larger overshoot = more canvas coverage
    nine.destX = clamp(anchor.x + Math.cos(ang)*(standoff+drift), ZONE_MARGIN, ZONE_W-ZONE_MARGIN);
    nine.destY = clamp(anchor.y + Math.sin(ang)*(standoff+drift), ZONE_MARGIN, ZONE_H-ZONE_MARGIN);
  } else {
    // No enemies — patrol anywhere on the full zone (not just nearby)
    nine.destX = ZONE_MARGIN + Math.random()*(ZONE_W - ZONE_MARGIN*2);
    nine.destY = ZONE_MARGIN + Math.random()*(ZONE_H - ZONE_MARGIN*2);
  }
}

function stepPos(nine) {
  const dx=nine.destX-nine.x, dy=nine.destY-nine.y, d=Math.hypot(dx,dy);
  if (d<2) return;
  const s=Math.min(nine.moveSpeed,d);
  nine.x=clamp(nine.x+(dx/d)*s,ZONE_MARGIN,ZONE_W-ZONE_MARGIN);
  nine.y=clamp(nine.y+(dy/d)*s,ZONE_MARGIN,ZONE_H-ZONE_MARGIN);
}

// ─── APPLY EFFECT ─────────────────────────────────────────────────────
function effectAmp(caster) {
  // manastorm zone bonus: all effects +30%
  const bk = caster._zoneBonus?.bonus?.key;
  return bk === 'effect_amp' ? (caster._zoneBonus.bonus.mult || 1.30) : 1.0;
}
function healAmp(caster) {
  // dawnbringer zone bonus: HEAL and BLESS +50%
  const bk = caster._zoneBonus?.bonus?.key;
  return bk === 'heal_amp' ? (caster._zoneBonus.bonus.mult || 1.50) : 1.0;
}

function applyEffect(caster, target, card, all) {
  const e=card?.effect_1; if(!e) return;
  if(caster.silenced>0){caster.silenced=Math.max(0,caster.silenced-1);return;}
  const amp = effectAmp(caster);
  const hamp = healAmp(caster);
  switch(e){
    case 'BURN':    target.burnStacks=Math.min(3,target.burnStacks+1); target.burnTimer=Math.max(target.burnTimer||0, cardInterval(caster.stats.spd)*2); target._dotAppliedBy=caster.playerName; target._dotAppliedById=caster.playerId; break;
    case 'POISON':  target.poisonStacks=Math.min(3,(target.poisonStacks||0)+1); if(!target._poisonNextAt||Date.now()>target._poisonNextAt) target._poisonNextAt=Date.now()+1500; target._dotAppliedBy=caster.playerName; target._dotAppliedById=caster.playerId; break;
    case 'CORRODE': if(caster.corrodeCd<=0){target.maxHp=Math.max(50,target.maxHp-Math.round(15*amp));target.hp=Math.min(target.hp,target.maxHp);caster.corrodeCd=CORRODE_CD;} break;
    case 'HEAL':    {const a=pickHealTarget(caster,all);const amt=Math.floor(caster.maxHp*.07*amp*hamp);a.hp=Math.min(a.maxHp,a.hp+(a.witherActive>0?Math.floor(amt*.5):amt));} break;
    case 'BLESS':   {const amt=Math.floor(caster.maxHp*.04*amp*hamp);all.filter(n=>n.hp>0&&n.guildTag===caster.guildTag&&inRange(caster,n,SPELL_RANGE.aoe_self)).forEach(a=>{a.hp=Math.min(a.maxHp,a.hp+(a.witherActive>0?Math.floor(amt*.5):amt));});} break;
    case 'WARD':    if(!caster.wardUp) caster.wardUp=true; break; // no reapply if already active
    case 'BARRIER': caster.barrierHp=caster.witherActive>0?25:Math.round(50*amp); break;
    case 'ANCHOR':  caster.anchorUp=true; break;
    case 'DODGE':   caster.dodgeReady=true; break;
    case 'REFLECT': caster.reflectReady=true; break;
    case 'TAUNT':   caster.tauntActive=true; break;
    case 'SILENCE': {const st=all.filter(n=>n.hp>0&&n.guildTag!==caster.guildTag&&inRange(caster,n,SPELL_RANGE.mid)).reduce((b,n)=>n.stats.atk>b.stats.atk?n:b,{stats:{atk:-1}});if(st.stats)st.silenced=Math.max(st.silenced||0,2);break;}
    case 'HEX':     target.hexAmt=Math.min((target.hexAmt||0)+Math.round(8*amp),24); break; // -8/stack max -24 (was -12 max -36 — too dominant)
    case 'WEAKEN':  target.weakened=Math.max(target.weakened||0,2); break;
    case 'MARK':    target.marked=Math.max(target.marked||0,3); break;
    case 'TETHER':  caster.tetherActive=true;caster.tetherTurns=3; break;
    case 'DRAIN':   caster.drainActive=true; break;
    case 'HASTE':   caster.hasteBonus=10;caster.hasteTurns=3; break;
    case 'WITHER':  target.witherActive=Math.max(target.witherActive||0,3); break;
    case 'BLIND':   target.blindTurns=Math.max(target.blindTurns||0,2); break;
    case 'NULLIFY': if(target.wardUp){target.wardUp=false;}else if(target.barrierHp){target.barrierHp=0;}else if(target.anchorUp){target.anchorUp=false;}else if(target.hasteBonus){target.hasteBonus=0;target.hasteTurns=0;}else if(target.dodgeReady){target.dodgeReady=false;} break;
    case 'CHAIN':   {const others=all.filter(n=>n.hp>0&&n.guildTag!==caster.guildTag&&n.deploymentId!==target?.deploymentId&&inRange(caster,n,SPELL_RANGE.melee*1.5));if(others.length){const ct=others[Math.floor(Math.random()*others.length)];const d=baseDmg(caster.stats.atk,ct.stats.def);ct.hp=Math.max(0,ct.hp-d);ct._lastHitBy=caster.playerName;ct._lastHitById=caster.playerId;if(ct.hp<=0)caster._killsThisRound=(caster._killsThisRound||0)+1;broadcast(caster.zoneId,'combat:attack',{attacker:caster.playerName,defender:ct.playerName,dmg:d,effect:'CHAIN',hp:ct.hp,maxHp:ct.maxHp,x:caster.x,y:caster.y,tx:ct.x,ty:ct.y});}} break;
    case 'INSPIRE': all.filter(n=>n.hp>0&&n.guildTag===caster.guildTag).forEach(a=>{a.stats.atk+=Math.round(2*amp);a.stats.spd+=Math.round(2*amp);}); break;
    case 'CLEANSE': caster.burnStacks=caster.poisonStacks=caster.poisonTimer=caster.burnTimer=caster.hexAmt=caster.weakened=caster.silenced=caster.marked=caster.witherActive=caster.blindTurns=0;caster._poisonNextAt=0;caster._burnNextAt=0;caster._poisonFires=0; break;
    case 'SURGE':   caster._surge=true; break;
    case 'CRIT':    caster._crit=true; break;
    case 'PIERCE':  caster._pierce=true; break;
    case 'EXECUTE': caster._execute=true; break;
    default: break;
  }
  broadcast(caster.zoneId,'combat:effect',{
    effect:e,
    by:caster.playerName, casterId:caster.playerId,
    on:target?.playerName||null, targetId:target?.playerId||null,
    x:caster.x, y:caster.y,
    tx:target?.x, ty:target?.y,
  });
}

// ─── ATTACK RESOLUTION ───────────────────────────────────────────────
function resolveAttack(caster, defender, all) {
  if(!defender||defender.hp<=0) return;
  caster._surge=caster._pierce=caster._execute=caster._crit=false;

  const slot = caster.cardIdx % Math.max(1,caster.cards.length);
  const card  = caster.cards[slot];
  applyEffect(caster, defender, card, all);

  // Zone bonus: smoulders +20% ATK
  const bk = caster._zoneBonus?.bonus?.key;
  const atkMult = bk === 'atk' ? (caster._zoneBonus.bonus.mult || 1.20) : 1.0;
  const atkStat = Math.max(1, Math.round((caster.stats.atk - (caster.hexAmt||0)) * atkMult));

  let dmg = baseDmg(atkStat, defender.stats.def);
  dmg = Math.floor(dmg * slotMult(slot, defender.hp/Math.max(1,defender.maxHp)));
  if(caster._surge)   dmg=Math.floor(dmg*1.5);
  if(caster.weakened>0){dmg=Math.floor(dmg*.5);caster.weakened=Math.max(0,caster.weakened-1);}
  if(defender.marked>0){dmg=Math.floor(dmg*1.25);defender.marked=Math.max(0,defender.marked-1);}
  if(caster._execute && defender.hp/Math.max(1,defender.maxHp)<.30) dmg=Math.floor(dmg*1.5);

  // Zone bonus: nighthollow +10 LUCK
  const luckBonus = bk === 'luck' ? (caster._zoneBonus.bonus.bonus || 10) : 0;
  const luck = defender.blindTurns>0 ? 0 : caster.stats.luck + luckBonus;
  const isCrit = caster._crit ? Math.random()*100<luck : Math.random()*100<luck*.3;

  // Zone bonus: stormrage crits deal 3× instead of 2×
  const critMult = (isCrit && bk === 'crit_mult') ? (caster._zoneBonus.bonus.value || 3) : (isCrit ? 2 : 1);
  if(isCrit) dmg = Math.floor(dmg * critMult);

  if(defender.blindTurns>0) defender.blindTurns=Math.max(0,defender.blindTurns-1);

  if(defender.dodgeReady){defender.dodgeReady=false;return;}
  if(defender.reflectReady&&!caster._pierce){defender.reflectReady=false;caster.hp=Math.max(0,caster.hp-dmg);broadcast(caster.zoneId,'combat:attack',{attacker:defender.playerName,defender:caster.playerName,dmg,effect:'REFLECT',hp:caster.hp,maxHp:caster.maxHp,x:defender.x,y:defender.y,tx:caster.x,ty:caster.y});return;}
  if(defender.wardUp&&!caster._pierce){defender.wardUp=false;return;}
  defender.wardUp=false;
  if(defender.barrierHp>0&&!caster._pierce){const ab=Math.min(defender.barrierHp,dmg);defender.barrierHp-=ab;dmg-=ab;if(dmg<=0)return;}
  if(caster.tetherActive){const h=Math.floor(dmg/2);dmg=h;caster.hp=Math.max(0,caster.hp-h);caster.tetherTurns=Math.max(0,caster.tetherTurns-1);if(caster.tetherTurns===0)caster.tetherActive=false;}
  if(defender.anchorUp&&defender.hp-dmg<=0){dmg=defender.hp-1;defender.anchorUp=false;}
  defender.hp=Math.max(0,defender.hp-dmg);
  // Hit flinch: push defender away from attacker
  if(defender.hp>0){
    const _fa=Math.atan2(defender.y-caster.y,defender.x-caster.x);
    defender.destX=clamp(defender.x+Math.cos(_fa)*12,ZONE_MARGIN,ZONE_W-ZONE_MARGIN);
    defender.destY=clamp(defender.y+Math.sin(_fa)*12,ZONE_MARGIN,ZONE_H-ZONE_MARGIN);
  }
  if(defender.hp>0&&defender.cards.some(c=>c.effect_1==='THORNS')) caster.hp=Math.max(0,caster.hp-Math.floor(dmg*.18));
  // BURN damage handled in tick loop (like POISON) — removed from here
  if(caster.drainActive&&dmg>0){caster.hp=Math.min(caster.maxHp,caster.hp+Math.max(1,Math.floor(dmg*.20)));caster.drainActive=false;}
  if(caster.hexAmt>0) caster.hexAmt=Math.max(0,caster.hexAmt-3);

  // Track who last hit this Nine (for KO credit)
  if(dmg>0){ defender._lastHitBy=caster.playerName; defender._lastHitById=caster.playerId;
  // Track kills for round KO board
  if(defender.hp<=0 && !defender.waitingForRound) {
    caster._killsThisRound=(caster._killsThisRound||0)+1;
  }
}

  broadcast(caster.zoneId,'combat:attack',{
    attacker:caster.playerName, attackerId:caster.playerId,
    defender:defender.playerName, defenderId:defender.playerId,
    dmg, crit:isCrit, critMult, slot:slot+1, effect:card?.effect_1||null,
    hp:defender.hp, maxHp:defender.maxHp,
    guildA:caster.guildTag, guildB:defender.guildTag,
    x:caster.x, y:caster.y, tx:defender.x, ty:defender.y,
  });
}

// ─── KO ───────────────────────────────────────────────────────────────
function handleKO(nine, zoneId, all) {
  // Mark as waiting — will become withdrawn at round start (must click rejoin)
  nine.waitingForRound = true;
  nine._wasKOdThisRound = true;

  broadcast(zoneId,'combat:ko',{nine:nine.playerName,nineId:nine.playerId,guildTag:nine.guildTag,killerName:killerName||nine._lastHitBy||null,killerId:killerId||nine._lastHitById||null,x:nine.x,y:nine.y,waitingForRound:true,dotKill:!nine._lastHitById&&!!nine._dotAppliedById});

  // On-death effects
  if(nine.cards.some(c=>c.effect_1==='SHATTER')){const d=Math.floor(nine.maxHp*.10);all.filter(n=>n.hp>0&&n.guildTag!==nine.guildTag&&inRange(nine,n,120)).forEach(n=>{n.hp=Math.max(0,n.hp-d);n._lastHitBy=nine.playerName;n._lastHitById=nine.playerId;if(n.hp<=0)nine._killsThisRound=(nine._killsThisRound||0)+1;});broadcast(zoneId,'combat:effect',{effect:'SHATTER',by:nine.playerName,dmg:d,x:nine.x,y:nine.y});}
  if(nine.cards.some(c=>c.effect_1==='INFECT')){all.filter(n=>n.hp>0&&n.guildTag!==nine.guildTag).forEach(n=>{n.poisonStacks=Math.min(3,(n.poisonStacks||0)+1);n.poisonTimer=Math.max(n.poisonTimer||0,12);});broadcast(zoneId,'combat:effect',{effect:'INFECT',by:nine.playerName});}
  all.filter(n=>n.hp>0&&n.guildTag!==nine.guildTag&&n.cards.some(c=>c.effect_1==='FEAST')).forEach(n=>n.hp=Math.min(n.maxHp,n.hp+Math.floor(nine.maxHp*.15)));

  // KO points — +10 to killer immediately (per design doc)
  supabaseAdmin.from('zone_deployments')
    .update({is_active:false,current_hp:0,ko_until:new Date(Date.now()+60000).toISOString()})
    .eq('id',nine.deploymentId)
    .then(({error})=>{if(error)console.error('❌ KO:',error.message);});
  // Award 25 pts to killer (identified by _lastHitById)
  if(killerId){
    supabaseAdmin.rpc('increment_season_points',{p_player_id:killerId,p_pts:10})
      .then(({error})=>{if(error)console.error('❌ KO pts:',error.message);});
  }
}

// ─── ZONE TICK ────────────────────────────────────────────────────────
async function tickZone(zoneId, zs) {
  zs.tick++;
  const all = Array.from(zs.nines.values());
  if(!all.length) return;

  // Timers — decrement by elapsed seconds so intervals are tick-rate independent
  const TICK_S = TICK_MS / 1000;
  all.forEach(n=>{
    if(n.hp<=0) return;
    n.atkTimer=Math.max(0,n.atkTimer-TICK_S);
    n.cardTimer=Math.max(0,n.cardTimer-TICK_S);
    if(n.corrodeCd>0) n.corrodeCd-=TICK_S;
  });

  // ── DOT EFFECTS — time-based, tick-rate independent ────────────────
  const nowTs = Date.now();
  all.forEach(n=>{
    if(n.hp<=0||n.waitingForRound) return;

    // POISON — fires every 1.5s, 3% maxHp per stack
    // Duration: 3 applications per stack group (~4.5s), then stacks decay
    if(n.poisonStacks>0){
      if(!n._poisonNextAt||nowTs>=n._poisonNextAt){
        const dot=Math.floor(n.maxHp*.03*n.poisonStacks);
        n.hp=Math.max(0,n.hp-dot);
        n._poisonNextAt=nowTs+1500;
        n._poisonFires=(n._poisonFires||0)+1;
        if(n._poisonFires>=3){ // decay one stack after 3 fires
          n.poisonStacks=Math.max(0,n.poisonStacks-1);
          n._poisonFires=0;
          if(n.poisonStacks<=0) n._poisonNextAt=0;
        }
        broadcast(zoneId,'combat:dot',{nine:n.playerName,nineId:n.deploymentId,dmg:dot,hp:n.hp,maxHp:n.maxHp,effect:'POISON',x:n.x,y:n.y});
      }
    } else { n._poisonNextAt=0; n._poisonFires=0; }

    // BURN — fires every 1.0s, flat 6 per stack
    // Duration controlled by burnTimer (seconds remaining)
    if(n.burnStacks>0&&(n.burnTimer||0)>0){
      if(!n._burnNextAt||nowTs>=n._burnNextAt){
        const bdot=n.burnStacks*6;
        n.hp=Math.max(0,n.hp-bdot);
        n._burnNextAt=nowTs+1000;
        n.burnTimer=Math.max(0,n.burnTimer-1.0); // burn timer in seconds
        if(n.burnTimer<=0) n.burnStacks=0;
        broadcast(zoneId,'combat:dot',{nine:n.playerName,nineId:n.deploymentId,dmg:bdot,hp:n.hp,maxHp:n.maxHp,effect:'BURN',x:n.x,y:n.y});
      }
    } else if(n.burnTimer<=0){ n.burnStacks=0; n._burnNextAt=0; }
  });

  // Zone bonus: darktide regen — 3% maxHP per minute = every 120 ticks (60s / 0.5s per tick)
  const zBonus = getZoneBonus(zoneId);
  if(zBonus?.bonus?.key === 'regen' && zs.tick % 300 === 0){ // 300 ticks × 200ms = 60s
    all.forEach(n=>{
      if(n.hp>0){
        const regen=Math.floor(n.maxHp*(zBonus.bonus.pct||0.03));
        n.hp=Math.min(n.maxHp,n.hp+regen);
        broadcast(zoneId,'combat:regen',{nine:n.playerName,amt:regen,hp:n.hp,maxHp:n.maxHp,x:n.x,y:n.y});
      }
    });
  }

  // Update movement targets every 10 ticks (= 5s at 500ms per tick) — slow deliberate shuffle
  // Update dest only when Nine has nearly reached its current dest (within 18px)
  // This stops the jitter caused by recalculating dest before arrival
  all.forEach(n=>{
    if(n.hp<=0||n.waitingForRound) return;
    const distToDest = Math.hypot(n.destX-n.x, n.destY-n.y);
    if(distToDest < 18) updateDest(n, all); // arrived — pick new dest
    else if(zs.tick%30===0) updateDest(n, all); // safety refresh every 6s so stuck Nines don't freeze
  });

  // Step positions every tick
  all.forEach(n=>{if(n.hp>0) stepPos(n);});

  // Combat — skip nines waiting for next round
  for(const nine of all){
    if(nine.hp<=0||nine.waitingForRound||nine.withdrawn) continue;
    const enemies=all.filter(n=>n.hp>0&&!n.waitingForRound&&!n.withdrawn&&n.guildTag!==nine.guildTag);
    if(!enemies.length) continue;

    // Card effect rotation
    if(nine.cardTimer<=0){
      const slot = nine.cardIdx%Math.max(1,nine.cards.length);
      const card  = nine.cards[slot];
      const tgt   = pickTarget(nine,all);
      if(card) applyEffect(nine,tgt||nine,card,all);
      nine.cardIdx++;
      nine.drainActive=false;
      const spd=nine.stats.spd+(nine.hasteBonus||0);
      nine.cardTimer=cardInterval(spd);
      if(nine.hasteTurns>0){nine.hasteTurns--;if(nine.hasteTurns===0)nine.hasteBonus=0;}
    }

    // Auto-attack
    if(nine.atkTimer<=0){
      const tgt=pickTarget(nine,all);
      if(tgt){
        resolveAttack(nine,tgt,all);
        // Attack lunge: briefly push destX/Y 18px toward target, snaps back on next updateDest
        const lungeAng=Math.atan2(tgt.y-nine.y,tgt.x-nine.x);
        nine.destX=clamp(nine.x+Math.cos(lungeAng)*18,ZONE_MARGIN,ZONE_W-ZONE_MARGIN);
        nine.destY=clamp(nine.y+Math.sin(lungeAng)*18,ZONE_MARGIN,ZONE_H-ZONE_MARGIN);
      }
      nine.atkTimer=atkInterval(nine.stats.spd+(nine.hasteBonus||0));
    }
  }

  // ── SESSION TIMER — server-side enforcement ─────────────────────────
  const nowMs = Date.now();
  for(const nine of all){
    if(!nine.waitingForRound && nine._deployedAt && (nowMs - nine._deployedAt) >= SESSION_MS){
      // Session expired — force withdraw
      nine.waitingForRound = true;
      zs.nines.delete(nine.deploymentId);
      await supabaseAdmin.from('zone_deployments')
        .update({is_active:false, current_hp: Math.round(nine.hp)})
        .eq('id', nine.deploymentId)
        .then(({error})=>{if(error)console.error('❌ Session expire:',error.message);});
      broadcast(zoneId,'arena:session_expired',{nineId:nine.playerId,deploymentId:nine.deploymentId,name:nine.playerName});
      console.log(`⏰ Session expired: ${nine.playerName} on zone ${zoneId}`);
    }
  }

  // ── KO CHECK + ROUND END EVALUATION ─────────────────────────────────
  // Process all deaths this tick, then check if round should end
  let anyKO = false;
  for(const nine of all){
    if(nine.hp<=0&&!nine.waitingForRound){
      nine.waitingForRound=true;
      handleKO(nine,zoneId,all);
      zs.nines.delete(nine.deploymentId);
      anyKO=true;
    }
  }

  const now = Date.now();

  // Intermission check — start new round when countdown expires
  if(zs.roundState==='INTERMISSION'){
    if(now >= zs.roundEndsAt) startRound(zoneId, zs, Array.from(zs.nines.values()));
    return;
  }

  // Hard cap — 5 minutes, end regardless
  if(zs.roundState==='FIGHTING' && now >= zs.roundEndsAt){
    await endRound(zoneId, zs, Array.from(zs.nines.values()), 'cap');
    return;
  }

  // Last guild standing — check after any KO this tick
  if(anyKO && zs.roundState==='FIGHTING'){
    const alive = Array.from(zs.nines.values()).filter(n=>!n.waitingForRound&&n.hp>0);
    if(alive.length>0){
      const guilds = new Set(alive.map(n=>n.guildTag));
      if(guilds.size<=1){
        // Only one guild (or one lone wolf) remains — end round immediately
        await endRound(zoneId, zs, Array.from(zs.nines.values()), 'last_standing');
        return;
      }
    }
  }

    broadcast(zoneId,'arena:positions',{
    zoneId,
    nines: Array.from(zs.nines.values()).map(n=>({
      id:n.playerId, deploymentId:n.deploymentId, playerName:n.playerName,
      x:Math.round(n.x), y:Math.round(n.y),
      hp:n.hp, maxHp:n.maxHp, guildTag:n.guildTag, houseKey:n.houseKey,
      cardSlot:n.cardIdx%Math.max(1,n.cards.length),
      activeEffect: n.cards[n.cardIdx%Math.max(1,n.cards.length)]?.effect_1||null,
      status:{burning:n.burnStacks>0,poisoned:n.poisonStacks>0,warded:n.wardUp,silenced:n.silenced>0,taunting:n.tauntActive},
      waitingForRound: !!n.waitingForRound || !!n.withdrawn,
    })),
  });

  // HP sync every 40 ticks (= 20s at 500ms per tick)
  if(zs.tick%40===0){
    const nineArr = Array.from(zs.nines.values());
    for (const n of nineArr) {
      await supabaseAdmin.from('zone_deployments')
        .update({ current_hp: Math.max(0, Math.round(n.hp)) })
        .eq('id', n.deploymentId)
        .then(({error}) => { if(error) console.error('❌ HP sync:', error.message); });
    }
  }
}

// ─── ROUND END ────────────────────────────────────────────────────────
async function endRound(zoneId, zs, all, endReason) {
  zs.roundState = 'INTERMISSION';
  zs.roundEndsAt = Date.now() + INTERMISSION_MS;

  // Guild control: most alive members wins. Ties by total HP.
  const guildAlive = {}, guildHp = {};
  all.forEach(n => {
    if(n.hp > 0 && !n.waitingForRound) {
      guildAlive[n.guildTag] = (guildAlive[n.guildTag] || 0) + 1;
      guildHp[n.guildTag]    = (guildHp[n.guildTag]    || 0) + n.hp;
    }
  });

  // Sort: most alive, tiebreak by HP
  const guilds = Object.entries(guildAlive).sort((a,b) =>
    b[1]!==a[1] ? b[1]-a[1] : (guildHp[b[0]]||0)-(guildHp[a[0]]||0));

  const winner    = guilds[0]?.[0] || null;
  const prevWinner = zs._lastRoundWinner || null;
  zs._lastRoundWinner = winner;

  // Track round wins for daily guild branding
  if(winner) zs.roundWins[winner] = (zs.roundWins[winner] || 0) + 1;

  // Track house presence for daily house bonus
  all.forEach(n => {
    const h = n.houseKey||'unknown';
    zs.housePresence[h] = (zs.housePresence[h]||0) + 1;
  });

  // ── ROUND SCORING ──────────────────────────────────────────────────
  // Alive at end: +3 pts  |  Guild controls: +5  |  Guild flips: +10 bonus
  // KO points (+10) already awarded in handleKO immediately
  const flipped = winner && winner !== prevWinner;
  const pointsLog = [];

  const now = new Date().toISOString();
  for(const n of all) {
    if(n.hp <= 0 || n.waitingForRound) continue;
    let pts = 5; // alive at round end (+5)
    if(winner && n.guildTag === winner) {
      pts += 8;              // guild controls (+8)
      if(flipped) pts += 15; // guild flipped control (+15)
    }
    pointsLog.push({playerId:n.playerId, deploymentId:n.deploymentId, pts, name:n.playerName});

    // Write to DB
    await supabaseAdmin.rpc('increment_season_points',{p_player_id:n.playerId,p_pts:pts})
      .then(({error})=>{if(error)console.error(`❌ Round pts ${n.playerId}:`,error.message);});
  }

  // KO leaderboard for this round — derive from _killsThisRound
  const koBoard = [];
  all.forEach(n => { if((n._killsThisRound||0)>0) koBoard.push({name:n.playerName,guild:n.guildTag,kos:n._killsThisRound}); });
  koBoard.sort((a,b)=>b.kos-a.kos);

  // Upsert zone control
  await supabaseAdmin.from('zone_control')
    .upsert({zone_id:zoneId,controlling_guild:winner,updated_at:now},{onConflict:'zone_id'})
    .then(({error})=>{if(error)console.error('❌ Zone control upsert:',error.message);});

  // Append round history
  await supabaseAdmin.from('zone_control_history')
    .insert({zone_id:zoneId,controlling_guild:winner,round_number:zs.roundNumber,snapped_at:now})
    .then(({error})=>{if(error){/* non-fatal if column missing */}});

  // Broadcast cinematic round end to all clients on zone
  const elapsedMs = Date.now() - (zs.roundStartedAt || Date.now());
  broadcast(zoneId, 'arena:round_end', {
    zoneId,
    roundNumber:    zs.roundNumber,
    winner,
    flipped,
    guildAlive,
    guildHp,
    koBoard:        koBoard.slice(0,5),
    pointsLog,
    intermissionMs: INTERMISSION_MS,
    nextRoundIn:    INTERMISSION_MS,
    endReason:      endReason || 'cap',  // 'last_standing' | 'cap'
    elapsedMs,
  });

  console.log(`🔔 Zone ${zoneId} Round ${zs.roundNumber} END — winner: [${winner||'none'}]${flipped?' (FLIP)':''} | ${pointsLog.length} pts awarded`);
  zs.roundNumber++;
}

// ─── ROUND START ────────────────────────────────────────────────────────
function startRound(zoneId, zs, all) {
  zs.roundState = 'FIGHTING';
  zs.roundStartedAt = Date.now();
  zs.roundEndsAt = Date.now() + ROUND_CAP_MS;  // 5min hard cap

  // Full HP reset for survivors — KO'd Nines become 'withdrawn' (must click rejoin)
  all.forEach(n => {
    if(n._wasKOdThisRound) {
      // KO'd last round → withdrawn state. Remove from zone engine until player rejoins.
      // They are kept in zs.nines for the broadcast but flagged as withdrawn.
      n.withdrawn = true;
      n.waitingForRound = false; // clear old flag
      return; // don't reset HP or stats yet
    }
    // Survivors auto-continue into next round at full HP
    n.hp = n.maxHp;
    n.waitingForRound = false;
    n._koProcessed    = false;
    n._killsThisRound = 0;
    // Clear all status effects for clean round start (survivors only)
    n.poisonStacks=0;n.poisonTimer=0;n.burnStacks=0;n.burnTimer=0;
    n._poisonNextAt=0;n._poisonFires=0;n._burnNextAt=0;
    n.silenced=0;n.hexAmt=0;n.weakened=0;n.blindTurns=0;n.witherActive=0;
    n.wardUp=false;n.barrierHp=0;n.anchorUp=false;n.dodgeReady=false;
    n.reflectReady=false;n.hasteBonus=0;n.hasteTurns=0;n.tetherActive=false;
    n.marked=0;n.tauntActive=false;n.drainActive=false;
    n.lx=0;n.ly=0;
    n._wasKOdThisRound=false;
  });

  broadcast(zoneId, 'arena:round_start', {
    zoneId,
    roundNumber: zs.roundNumber,
    roundMs: ROUND_MS,
    nines: all.map(n=>({id:n.deploymentId,playerId:n.playerId,hp:n.hp,maxHp:n.maxHp,guildTag:n.guildTag,houseKey:n.houseKey})),
  });

  console.log(`⚔️  Zone ${zoneId} Round ${zs.roundNumber} START — ${all.length} Nines`);
}


// ─── LOAD / UNLOAD ────────────────────────────────────────────────────
async function loadActiveDeployments(){
  console.log('⚔️ Loading deployments...');
  const {data,error}=await supabaseAdmin.from('zone_deployments').select('id,player_id,nine_id,zone_id,guild_tag,current_hp,nine:nine_id(house_id,name)').eq('is_active',true);
  if(error){console.error('❌',error.message);return;}
  for(const dep of (data||[])) await loadDeploymentIntoEngine(dep);
  console.log(`✅ ${data?.length||0} deployments loaded`);
}

async function loadDeploymentIntoEngine(dep){
  const zoneId=String(dep.zone_id);
  if(!zones.has(zoneId)) zones.set(zoneId,{
    nines:new Map(), tick:0,
    roundState:'FIGHTING',  // FIGHTING | INTERMISSION
    roundStartedAt: Date.now(),
    roundEndsAt: Date.now()+ROUND_CAP_MS,
    roundNumber: 1,
    roundWins: {},          // guildTag → round wins today (for branding calc)
    housePresence: {},      // houseKey → fighter-days (for house bonus)
  });

  // Step 1: Get active card slots for this deployment
  const {data:slots} = await supabaseAdmin
    .from('zone_card_slots')
    .select('slot_number, card_id')
    .eq('deployment_id', dep.id)
    .eq('is_active', true)
    .order('slot_number');


  let cards = [];

  if (slots && slots.length > 0) {
    const cardIds = slots.map(s => s.card_id).filter(Boolean);

    // Step 2: Get player_cards to find spell_ids
    const {data:playerCards} = await supabaseAdmin
      .from('player_cards')
      .select('id, spell_id')
      .in('id', cardIds);


    if (playerCards && playerCards.length > 0) {
      const spellIds = playerCards.map(c => c.spell_id).filter(Boolean);

      // Step 3: Get spell data
      const {data:spells} = await supabaseAdmin
        .from('spells')
        .select('id, slug, name, card_type, house, base_atk, base_hp, base_spd, base_def, base_luck, effect_1')
        .in('id', spellIds);


      // Step 4: Assemble — match slots → player_cards → spells
      const pcMap = {};
      (playerCards||[]).forEach(pc => { pcMap[pc.id] = pc; });
      const spellMap = {};
      (spells||[]).forEach(s => { spellMap[s.id] = s; });

      cards = slots
        .map(slot => {
          const pc    = pcMap[slot.card_id];
          const spell = pc ? spellMap[pc.spell_id] : null;
          if (!spell) return null;
          return { slot_number: slot.slot_number, ...spell };
        })
        .filter(Boolean)
        .sort((a,b) => a.slot_number - b.slot_number);
    }
  }

  const nine=dep.nine||{};
  const zoneBonus = getZoneBonus(String(dep.zone_id));
  const state=buildNineState(dep,{house_key: resolveHouseKey(nine.house_id||nine.house_key), name:nine.name||'Unknown'},cards,zoneBonus);
  if(dep.current_hp>0) state.hp=Math.min(state.maxHp,dep.current_hp);

  // Zone bonus: plaguemire — newly deployed Nine enters with enemies pre-poisoned
  // We apply 1 POISON stack to all existing enemies on the zone
  if(zoneBonus?.bonus?.key === 'poison_aura'){
    const zs = zones.get(zoneId);
    if(zs){
      for(const existing of zs.nines.values()){
        if(existing.guildTag !== state.guildTag && existing.hp > 0){
          existing.poisonStacks = Math.min(3, (existing.poisonStacks||0) + 1);
          if(!existing._poisonNextAt||Date.now()>existing._poisonNextAt) existing._poisonNextAt=Date.now()+1500;
        }
      }
    }
  }

  zones.get(zoneId).nines.set(String(dep.id),state);
  console.log(`⚔️  ${state.playerName} (${state.houseKey}) → zone ${zoneId} [${cards.length} cards]${zoneBonus?.house ? ` | zone bonus: ${zoneBonus.house}` : ''}`);
}

// ── REJOIN — player clicks rejoin after being KO'd ───────────────────
function rejoinRound(deploymentId, zoneId, newCards) {
  const zs = zones.get(String(zoneId));
  if(!zs) return false;
  const nine = zs.nines.get(String(deploymentId));
  if(!nine) return false;
  if(!nine.withdrawn) return false; // already active or not withdrawn

  // Restore to fighting state with full HP
  nine.hp = nine.maxHp;
  nine.withdrawn = false;
  nine.waitingForRound = false;
  nine._wasKOdThisRound = false;
  nine._killsThisRound = 0;

  // Apply new cards if provided (loadout swap on rejoin)
  if(newCards && newCards.length) nine.cards = newCards;

  // Reset timers so they don't immediately fire
  nine.atkTimer  = atkInterval(nine.stats.spd);
  nine.cardTimer = cardInterval(nine.stats.spd);
  nine.cardIdx   = 0;

  broadcast(zoneId, 'arena:nine_rejoined', {
    deploymentId: String(deploymentId),
    playerId: nine.playerId,
    name: nine.playerName,
    hp: nine.hp, maxHp: nine.maxHp,
    guildTag: nine.guildTag, houseKey: nine.houseKey,
  });
  console.log(`🔄 ${nine.playerName} rejoined zone ${zoneId}`);
  return true;
}

function removeDeploymentFromEngine(deploymentId,zoneId){
  const zs=zones.get(String(zoneId));
  if(!zs) return;
  // Find the nine by deploymentId to get their playerId for broadcast
  const nine = Array.from(zs.nines.values()).find(n => n.deploymentId === String(deploymentId));
  zs.nines.delete(String(deploymentId));
  // Broadcast removal so other clients remove the sprite immediately
  if(nine) broadcast(zoneId,'arena:nine_left',{nine_id: nine.playerId, deploymentId: String(deploymentId)});
}

// ─── BROADCAST ────────────────────────────────────────────────────────
function broadcast(zoneId,event,data){
  try{if(global.__arenaSocket)global.__arenaSocket._broadcastToZone(zoneId,event,data);}catch(e){}
}

// ─── LIFECYCLE ────────────────────────────────────────────────────────
function startCombatEngine(){
  if(_tickInt) return;
  refreshZoneBonusCache();
  loadActiveDeployments();
  _tickInt=setInterval(async()=>{
    for(const [id,zs] of zones){
      try{ await tickZone(id,zs); }
      catch(e){ console.error(`❌ Zone ${id}:`,e.message); }
    }
  },TICK_MS);
  console.log('✅ Combat engine V3 started — round-based combat, 200ms ticks, 3min rounds');
}
function stopCombatEngine(){ clearInterval(_tickInt); _tickInt=null; }

module.exports={
  startCombatEngine,stopCombatEngine,
  getRoundMs:()=>ROUND_MS,
  getIntermissionMs:()=>INTERMISSION_MS,
  loadDeploymentIntoEngine,
  rejoinRound,
  removeDeploymentFromEngine,
  getZoneState:id=>zones.get(String(id))||null,
  refreshZoneBonusCache,
};