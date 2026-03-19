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
const TICK_MS       = 2000;
const SNAPSHOT_MS   = 15 * 60 * 1000;
const SPD_FLOOR     = 5.5;
const CORRODE_CD    = 10;
const ZONE_W        = 900;
const ZONE_H        = 500;
const ZONE_MARGIN   = 40;

const SPELL_RANGE = { melee:90, mid:220, ranged:380, self:0, aoe_self:120, zone:9999 };

const CARD_TYPE_CONFIG = {
  attack:  { range: SPELL_RANGE.melee,    prefer:'lowest_hp',      moveTo:'preferred_enemy' },
  control: { range: SPELL_RANGE.mid,      prefer:'highest_atk',    moveTo:'preferred_enemy' },
  dot:     { range: SPELL_RANGE.ranged,   prefer:'highest_hp',     moveTo:'preferred_enemy' },
  support: { range: SPELL_RANGE.aoe_self, prefer:'lowest_hp_ally', moveTo:'ally_cluster'    },
  utility: { range: SPELL_RANGE.self,     prefer:'self',           moveTo:'hold'            },
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

const atkInterval  = spd => Math.max(SPD_FLOOR, 10.5 - spd * 0.12);
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
let _tickInt=null, _snapInt=null, _nextSnap=Date.now()+SNAPSHOT_MS;

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
    guildTag: dep.guild_tag||'lone_wolf', playerName: nine.name||'Unknown', houseKey,
    stats:{atk,hp,spd,def,luck}, cards,
    hp, maxHp:hp, x, y, destX:x, destY:y,
    moveSpeed: 30 + spd*1.2,
    atkTimer:  atkInterval(spd),
    cardTimer: cardInterval(spd),
    cardIdx:0,
    burnStacks:0, poisonStacks:0, poisonTimer:0, corrodeCd:0,
    wardUp:false, anchorUp:false, barrierHp:0, dodgeReady:false, reflectReady:false, tauntActive:false,
    silenced:0, weakened:0, marked:0, hexAmt:0,
    hasteBonus:0, hasteTurns:0, tetherActive:false, tetherTurns:0,
    drainActive:false, witherActive:0, blindTurns:0,
    zoneId: String(dep.zone_id),
    _zoneBonus: zoneBonus || null,
    _koProcessed:false,
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
  const taunter = all.find(n=>n.hp>0 && n.guildTag!==nine.guildTag && n.tauntActive);
  if (taunter) return taunter;
  const cfg = cardCfg(nine);
  const enemies = all.filter(n=>n.hp>0 && n.guildTag!==nine.guildTag && (cfg.range>=SPELL_RANGE.zone || inRange(nine,n,cfg.range)));
  if (!enemies.length) return null;
  switch(cfg.prefer) {
    case 'lowest_hp':   return enemies.reduce((b,e)=>e.hp<b.hp?e:b);
    case 'highest_atk': return enemies.reduce((b,e)=>e.stats.atk>b.stats.atk?e:b);
    case 'highest_hp':  return enemies.reduce((b,e)=>e.hp>b.hp?e:b);
    default:            return enemies[Math.floor(Math.random()*enemies.length)];
  }
}

function pickHealTarget(nine, all) {
  const allies = all.filter(n=>n.hp>0 && n.guildTag===nine.guildTag && inRange(nine,n,SPELL_RANGE.aoe_self));
  if (!allies.length) return nine;
  return allies.reduce((b,a)=>a.hp<b.hp?a:b);
}

// ─── MOVEMENT ─────────────────────────────────────────────────────────
function updateDest(nine, all) {
  if (nine.tauntActive) { nine.destX=ZONE_W/2; nine.destY=ZONE_H/2; return; }
  const cfg = cardCfg(nine);
  if (cfg.moveTo==='hold') return;
  if (cfg.moveTo==='ally_cluster') {
    const allies = all.filter(n=>n.hp>0&&n.guildTag===nine.guildTag&&n.deploymentId!==nine.deploymentId);
    if (allies.length) {
      const ax=allies.reduce((s,a)=>s+a.x,0)/allies.length, ay=allies.reduce((s,a)=>s+a.y,0)/allies.length;
      nine.destX=clamp(ax+(Math.random()-.5)*60,ZONE_MARGIN,ZONE_W-ZONE_MARGIN);
      nine.destY=clamp(ay+(Math.random()-.5)*60,ZONE_MARGIN,ZONE_H-ZONE_MARGIN);
    }
    return;
  }
  const enemies=all.filter(n=>n.hp>0&&n.guildTag!==nine.guildTag);
  if (!enemies.length) return;
  let tgt;
  switch(cfg.prefer){
    case 'lowest_hp':   tgt=enemies.reduce((b,e)=>e.hp<b.hp?e:b); break;
    case 'highest_atk': tgt=enemies.reduce((b,e)=>e.stats.atk>b.stats.atk?e:b); break;
    case 'highest_hp':  tgt=enemies.reduce((b,e)=>e.hp>b.hp?e:b); break;
    default: tgt=enemies[0];
  }
  const dx=tgt.x-nine.x, dy=tgt.y-nine.y, d=Math.hypot(dx,dy)||1;
  const desiredDist = cfg.range===SPELL_RANGE.melee?70 : cfg.range===SPELL_RANGE.mid?180 : 300;
  if (d<=cfg.range) {
    const ang=Math.random()*Math.PI*2;
    nine.destX=clamp(tgt.x+Math.cos(ang)*desiredDist*.6,ZONE_MARGIN,ZONE_W-ZONE_MARGIN);
    nine.destY=clamp(tgt.y+Math.sin(ang)*desiredDist*.6,ZONE_MARGIN,ZONE_H-ZONE_MARGIN);
  } else {
    nine.destX=clamp(tgt.x-(dx/d)*desiredDist,ZONE_MARGIN,ZONE_W-ZONE_MARGIN);
    nine.destY=clamp(tgt.y-(dy/d)*desiredDist,ZONE_MARGIN,ZONE_H-ZONE_MARGIN);
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
    case 'BURN':    target.burnStacks=Math.min(3,target.burnStacks+1); break;
    case 'POISON':  target.poisonStacks=Math.min(3,(target.poisonStacks||0)+1); target.poisonTimer=Math.max(target.poisonTimer||0,18); break;
    case 'CORRODE': if(caster.corrodeCd<=0){target.maxHp=Math.max(50,target.maxHp-Math.round(15*amp));target.hp=Math.min(target.hp,target.maxHp);caster.corrodeCd=CORRODE_CD;} break;
    case 'HEAL':    {const a=pickHealTarget(caster,all);const amt=Math.floor(caster.maxHp*.07*amp*hamp);a.hp=Math.min(a.maxHp,a.hp+(a.witherActive>0?Math.floor(amt*.5):amt));} break;
    case 'BLESS':   {const amt=Math.floor(caster.maxHp*.04*amp*hamp);all.filter(n=>n.hp>0&&n.guildTag===caster.guildTag&&inRange(caster,n,SPELL_RANGE.aoe_self)).forEach(a=>{a.hp=Math.min(a.maxHp,a.hp+(a.witherActive>0?Math.floor(amt*.5):amt));});} break;
    case 'WARD':    caster.wardUp=true; break;
    case 'BARRIER': caster.barrierHp=caster.witherActive>0?25:Math.round(50*amp); break;
    case 'ANCHOR':  caster.anchorUp=true; break;
    case 'DODGE':   caster.dodgeReady=true; break;
    case 'REFLECT': caster.reflectReady=true; break;
    case 'TAUNT':   caster.tauntActive=true; break;
    case 'SILENCE': {const st=all.filter(n=>n.hp>0&&n.guildTag!==caster.guildTag&&inRange(caster,n,SPELL_RANGE.mid)).reduce((b,n)=>n.stats.atk>b.stats.atk?n:b,{stats:{atk:-1}});if(st.stats)st.silenced=Math.max(st.silenced||0,2);break;}
    case 'HEX':     target.hexAmt=Math.min((target.hexAmt||0)+Math.round(12*amp),35); break;
    case 'WEAKEN':  target.weakened=Math.max(target.weakened||0,2); break;
    case 'MARK':    target.marked=Math.max(target.marked||0,3); break;
    case 'TETHER':  caster.tetherActive=true;caster.tetherTurns=3; break;
    case 'DRAIN':   caster.drainActive=true; break;
    case 'HASTE':   caster.hasteBonus=10;caster.hasteTurns=3; break;
    case 'WITHER':  target.witherActive=Math.max(target.witherActive||0,3); break;
    case 'BLIND':   target.blindTurns=Math.max(target.blindTurns||0,2); break;
    case 'NULLIFY': if(target.wardUp){target.wardUp=false;}else if(target.barrierHp){target.barrierHp=0;}else if(target.anchorUp){target.anchorUp=false;}else if(target.hasteBonus){target.hasteBonus=0;target.hasteTurns=0;}else if(target.dodgeReady){target.dodgeReady=false;} break;
    case 'CHAIN':   {const others=all.filter(n=>n.hp>0&&n.guildTag!==caster.guildTag&&n.deploymentId!==target?.deploymentId&&inRange(caster,n,SPELL_RANGE.melee*1.5));if(others.length){const ct=others[Math.floor(Math.random()*others.length)];const d=baseDmg(caster.stats.atk,ct.stats.def);ct.hp=Math.max(0,ct.hp-d);broadcast(caster.zoneId,'combat:attack',{attacker:caster.playerName,defender:ct.playerName,dmg:d,effect:'CHAIN',hp:ct.hp,maxHp:ct.maxHp,x:caster.x,y:caster.y,tx:ct.x,ty:ct.y});}} break;
    case 'INSPIRE': all.filter(n=>n.hp>0&&n.guildTag===caster.guildTag).forEach(a=>{a.stats.atk+=Math.round(2*amp);a.stats.spd+=Math.round(2*amp);}); break;
    case 'CLEANSE': caster.burnStacks=caster.poisonStacks=caster.poisonTimer=caster.hexAmt=caster.weakened=caster.silenced=caster.marked=caster.witherActive=caster.blindTurns=0; break;
    case 'SURGE':   caster._surge=true; break;
    case 'CRIT':    caster._crit=true; break;
    case 'PIERCE':  caster._pierce=true; break;
    case 'EXECUTE': caster._execute=true; break;
    default: break;
  }
  broadcast(caster.zoneId,'combat:effect',{effect:e,by:caster.playerName,on:target?.playerName||null,x:caster.x,y:caster.y});
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
  if(defender.hp>0&&defender.cards.some(c=>c.effect_1==='THORNS')) caster.hp=Math.max(0,caster.hp-Math.floor(dmg*.18));
  if(defender.burnStacks>0&&defender.hp>0) defender.hp=Math.max(0,defender.hp-defender.burnStacks*6);
  if(caster.drainActive&&dmg>0){caster.hp=Math.min(caster.maxHp,caster.hp+Math.max(1,Math.floor(dmg*.20)));caster.drainActive=false;}
  if(caster.hexAmt>0) caster.hexAmt=Math.max(0,caster.hexAmt-3);

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
  broadcast(zoneId,'combat:ko',{nine:nine.playerName,nineId:nine.playerId,guildTag:nine.guildTag,x:nine.x,y:nine.y});
  if(nine.cards.some(c=>c.effect_1==='SHATTER')){const d=Math.floor(nine.maxHp*.10);all.filter(n=>n.hp>0&&n.guildTag!==nine.guildTag&&inRange(nine,n,120)).forEach(n=>n.hp=Math.max(0,n.hp-d));broadcast(zoneId,'combat:effect',{effect:'SHATTER',by:nine.playerName,dmg:d,x:nine.x,y:nine.y});}
  if(nine.cards.some(c=>c.effect_1==='INFECT')){all.filter(n=>n.hp>0&&n.guildTag!==nine.guildTag).forEach(n=>{n.poisonStacks=Math.min(3,(n.poisonStacks||0)+1);n.poisonTimer=Math.max(n.poisonTimer||0,12);});broadcast(zoneId,'combat:effect',{effect:'INFECT',by:nine.playerName});}
  all.filter(n=>n.hp>0&&n.guildTag!==nine.guildTag&&n.cards.some(c=>c.effect_1==='FEAST')).forEach(n=>n.hp=Math.min(n.maxHp,n.hp+Math.floor(nine.maxHp*.15)));
  supabaseAdmin.from('zone_deployments').update({is_active:false,current_hp:0,ko_until:new Date(Date.now()+60000).toISOString()}).eq('id',nine.deploymentId).then(({error})=>{if(error)console.error('❌ KO:',error.message);});
}

// ─── ZONE TICK ────────────────────────────────────────────────────────
async function tickZone(zoneId, zs) {
  zs.tick++;
  const all = Array.from(zs.nines.values());
  if(!all.length) return;

  // Timers
  all.forEach(n=>{
    if(n.hp<=0) return;
    n.atkTimer=Math.max(0,n.atkTimer-1);
    n.cardTimer=Math.max(0,n.cardTimer-1);
    if(n.corrodeCd>0) n.corrodeCd--;
  });

  // Poison DOT every 3 ticks
  if(zs.tick%3===0){
    all.forEach(n=>{
      if(n.hp>0&&n.poisonStacks>0){
        const dot=Math.floor(n.maxHp*.030*n.poisonStacks);
        n.hp=Math.max(0,n.hp-dot);
        n.poisonTimer=Math.max(0,(n.poisonTimer||0)-1);
        if(n.poisonTimer<=0) n.poisonStacks=0;
        broadcast(zoneId,'combat:dot',{nine:n.playerName,nineId:n.deploymentId,dmg:dot,hp:n.hp,maxHp:n.maxHp,x:n.x,y:n.y});
      }
    });
  }

  // Zone bonus: darktide regen — 3% maxHP per minute = every 30 ticks (60s / 2s per tick)
  const zBonus = getZoneBonus(zoneId);
  if(zBonus?.bonus?.key === 'regen' && zs.tick % 30 === 0){
    all.forEach(n=>{
      if(n.hp>0){
        const regen=Math.floor(n.maxHp*(zBonus.bonus.pct||0.03));
        n.hp=Math.min(n.maxHp,n.hp+regen);
        broadcast(zoneId,'combat:regen',{nine:n.playerName,amt:regen,hp:n.hp,maxHp:n.maxHp,x:n.x,y:n.y});
      }
    });
  }

  // Update movement targets every 2 ticks
  if(zs.tick%2===0) all.forEach(n=>{if(n.hp>0) updateDest(n,all);});

  // Step positions every tick
  all.forEach(n=>{if(n.hp>0) stepPos(n);});

  // Combat
  for(const nine of all){
    if(nine.hp<=0) continue;
    const enemies=all.filter(n=>n.hp>0&&n.guildTag!==nine.guildTag);
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

    // Auto-attack (must be in spell range)
    if(nine.atkTimer<=0){
      const tgt=pickTarget(nine,all);
      if(tgt) resolveAttack(nine,tgt,all);
      nine.atkTimer=atkInterval(nine.stats.spd+(nine.hasteBonus||0));
    }
  }

  // KO check
  for(const nine of all){
    if(nine.hp<=0&&!nine._koProcessed){
      nine._koProcessed=true;
      handleKO(nine,zoneId,all);
      zs.nines.delete(nine.deploymentId);
    }
  }

  // Broadcast positions every tick for PIXI
  broadcast(zoneId,'arena:positions',{
    zoneId,
    nines: Array.from(zs.nines.values()).map(n=>({
      id:n.playerId, deploymentId:n.deploymentId, x:Math.round(n.x), y:Math.round(n.y),
      hp:n.hp, maxHp:n.maxHp, guildTag:n.guildTag, houseKey:n.houseKey,
      cardSlot:n.cardIdx%Math.max(1,n.cards.length),
      activeEffect: n.cards[n.cardIdx%Math.max(1,n.cards.length)]?.effect_1||null,
      status:{burning:n.burnStacks>0,poisoned:n.poisonStacks>0,warded:n.wardUp,silenced:n.silenced>0,taunting:n.tauntActive},
    })),
  });

  // HP sync every 10 ticks — update each row individually to avoid upsert insert attempts
  if(zs.tick%10===0){
    const nineArr = Array.from(zs.nines.values());
    for (const n of nineArr) {
      await supabaseAdmin.from('zone_deployments')
        .update({ current_hp: Math.max(0, Math.round(n.hp)) })
        .eq('id', n.deploymentId)
        .then(({error}) => { if(error) console.error('❌ HP sync:', error.message); });
    }
  }
}

// ─── SNAPSHOT ─────────────────────────────────────────────────────────
async function runSnapshot(){
  console.log('📸 Zone snapshot...');
  const now = new Date().toISOString();

  for(const [zoneId,zs] of zones){
    if(!zs.nines.size) continue;
    const all = Array.from(zs.nines.values());

    // Guild HP totals — for zone control scoring
    const guildHp={};
    all.forEach(n=>{if(!guildHp[n.guildTag])guildHp[n.guildTag]=0;guildHp[n.guildTag]+=n.hp;});
    const [controllingGuild,topHp]=Object.entries(guildHp).reduce((b,[t,h])=>h>b[1]?[t,h]:b,['',-1]);

    // House fighter counts — for zone identity (not HP — house neutral)
    const houseCounts={};
    all.forEach(n=>{const h=n.houseKey||'unknown';houseCounts[h]=(houseCounts[h]||0)+1;});
    const [dominantHouse]=Object.entries(houseCounts).sort((a,b)=>b[1]-a[1])[0]||[];

    // Guild presence count — for branding (who had the most fighters, period)
    const guildCounts={};
    all.forEach(n=>{guildCounts[n.guildTag]=(guildCounts[n.guildTag]||0)+1;});
    const [brandedGuild]=Object.entries(guildCounts).sort((a,b)=>b[1]-a[1])[0]||[];

    if(!controllingGuild) continue;

    // Upsert current state
    await supabaseAdmin.from('zone_control')
      .upsert({zone_id:zoneId,controlling_guild:controllingGuild,snapshot_hp:topHp,dominant_house:dominantHouse,updated_at:now},{onConflict:'zone_id'})
      .then(({error})=>{if(error)console.error('❌ Snapshot upsert:',error.message);});

    // Append to history log
    await supabaseAdmin.from('zone_control_history')
      .insert({zone_id:zoneId,controlling_guild:controllingGuild,snapshot_hp:topHp,dominant_house:dominantHouse,branded_guild:brandedGuild,snapped_at:now})
      .then(({error})=>{if(error)console.error('❌ Snapshot history:',error.message);});

    broadcast(zoneId,'arena:snapshot',{zoneId,controllingGuild,dominantHouse,brandedGuild,guildHp});
    console.log(`📸 Zone ${zoneId} → [${controllingGuild}] | house: ${dominantHouse} | brand: [${brandedGuild}]`);
  }
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
  if(!zones.has(zoneId)) zones.set(zoneId,{nines:new Map(),tick:0});

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
          existing.poisonTimer  = Math.max(existing.poisonTimer||0, 18);
        }
      }
    }
  }

  zones.get(zoneId).nines.set(String(dep.id),state);
  console.log(`⚔️  ${state.playerName} (${state.houseKey}) → zone ${zoneId} [${cards.length} cards]${zoneBonus?.house ? ` | zone bonus: ${zoneBonus.house}` : ''}`);
}

function removeDeploymentFromEngine(deploymentId,zoneId){
  const zs=zones.get(String(zoneId));
  if(zs) zs.nines.delete(String(deploymentId));
}

// ─── BROADCAST ────────────────────────────────────────────────────────
function broadcast(zoneId,event,data){
  try{if(global.__arenaSocket)global.__arenaSocket._broadcastToZone(zoneId,event,data);}catch(e){}
}

// ─── LIFECYCLE ────────────────────────────────────────────────────────
function startCombatEngine(){
  if(_tickInt) return;
  refreshZoneBonusCache(); // load zone bonuses before deployments
  loadActiveDeployments();
  _tickInt=setInterval(async()=>{for(const [id,zs] of zones){try{await tickZone(id,zs);}catch(e){console.error(`❌ Zone ${id}:`,e.message);}}},TICK_MS);
  _snapInt=setInterval(async()=>{_nextSnap=Date.now()+SNAPSHOT_MS;await runSnapshot();},SNAPSHOT_MS);
  console.log('✅ Combat engine V3 started — spatial combat, 2s ticks, 15min snapshots');
}
function stopCombatEngine(){clearInterval(_tickInt);clearInterval(_snapInt);_tickInt=_snapInt=null;}

module.exports={
  startCombatEngine,stopCombatEngine,
  getNextCycleAt:()=>_nextSnap,
  getCycleIntervalMs:()=>SNAPSHOT_MS,
  loadDeploymentIntoEngine,
  removeDeploymentFromEngine,
  getZoneState:id=>zones.get(String(id))||null,
  refreshZoneBonusCache,
};