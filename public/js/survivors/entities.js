// Entities — pooled players / enemies / projectiles / pickups.
// A spatial hash accelerates enemy queries from projectiles and the player.

export const entities = {
  player: null,
  enemies:  [],
  projectiles: [],
  pickups: [],   // xp gems, gold, health
  effects: [],   // short-lived visual FX (expanding rings, damage numbers, puddles)
  boss: null,
};

// Caps — over-cap spawns are dropped.
export const CAPS = { enemies: 400, projectiles: 250, pickups: 300, effects: 200 };

let nextId = 1;
function id() { return nextId++; }

// Factory — creates a player entity.
export function makePlayer(loadout) {
  return {
    id: id(),
    kind: "player",
    x: 2000, y: 2000,       // spawn in world center
    vx: 0, vy: 0,
    r: 18,
    facing: 0,
    char: {
      outfit: loadout.outfit, hat: loadout.hat, weapon: loadout.weapon,
      facial: "CAT_MASK.001", tint: loadout.tint,
    },
    hp: 100, hpMax: 100,
    xp: 0, level: 1,
    speed: 210,
    scale: 1.0,
    iframe: 0,
    regen: 0,
    dmgMul: 1,
    cdMul: 1,
    pickup: 1,
    xpMul: 1,
    crit: 0,
    dodge: 0,
    gold: 0,
    kills: 0,
    weapons: [],      // [{id, level, state}]
    passives: {},     // { id: level }
    flash: 0,
  };
}

export function makeEnemy(def, x, y, char) {
  return {
    id: id(),
    kind: "enemy",
    archetype: def.id || "basic_rat",
    x, y, vx: 0, vy: 0,
    r: 18 * (char.scale || 1),
    facing: 0,
    char,
    hp: def.hp, hpMax: def.hp,
    dmg: def.dmg, spd: def.spd,
    scale: char.scale || 1,
    xp: def.xp,
    ranged: def.ranged || false,
    range:  def.range  || 0,
    cd:     def.cd     || 0,
    cdLeft: 0,
    projSpd: def.projSpd || 0,
    stun: 0,
    flash: 0,
    slow: 1,
  };
}

export function makeBoss(def, spriteUrl, x, y) {
  return {
    id: id(),
    kind: "boss",
    x, y, vx: 0, vy: 0,
    r: 42 * (def.scale || 1),
    hp: def.hp, hpMax: def.hp,
    dmg: def.dmg, spd: def.spd,
    scale: def.scale || 1,
    xp: def.xp,
    spriteUrl,
    stun: 0,
    flash: 0,
    slow: 1,
  };
}

export function makeProjectile(src, x, y, vx, vy, opts) {
  return {
    id: id(),
    kind: "projectile",
    src,              // "player" | "enemy"
    x, y, vx, vy,
    r: opts.r || 8,
    dmg: opts.dmg,
    life: opts.life || 1800,    // ms
    pierce: opts.pierce || 0,
    hits: new Set(),
    aoe: opts.aoe || 0,
    icon: opts.icon || null,    // image reference
    bounce: opts.bounce || false,
    gravity: opts.gravity || 0, // for lobbed
    z: opts.z || 0,             // pseudo-height
    vz: opts.vz || 0,
    color: opts.color || "#ffd27f",
    homing: opts.homing || 0,
  };
}

export function makePickup(type, x, y, value, spriteUrl) {
  return {
    id: id(),
    kind: "pickup",
    type,             // "xp" | "gold" | "heal"
    x, y,
    r: 10,
    value,
    vx: 0, vy: 0,
    magnet: false,
    spriteUrl,
    life: 30000,
  };
}

export function makeEffect(type, x, y, opts = {}) {
  return {
    id: id(),
    kind: "effect",
    type,             // "ring" | "puddle" | "flash" | "number"
    x, y,
    r: opts.r || 0,
    rMax: opts.rMax || 120,
    ttl: opts.ttl || 300,
    life: opts.ttl || 300,
    color: opts.color || "#fff",
    text: opts.text || "",
    dmg: opts.dmg || 0,
    tickCd: opts.tickMs || 0,
    tickLeft: 0,
    hits: new Set(),
  };
}

export function addEnemy(e)     { if (entities.enemies.length    < CAPS.enemies)    entities.enemies.push(e); }
export function addProjectile(p){ if (entities.projectiles.length< CAPS.projectiles)entities.projectiles.push(p); }
export function addPickup(p)    { if (entities.pickups.length    < CAPS.pickups)    entities.pickups.push(p); }
export function addEffect(e)    { if (entities.effects.length    < CAPS.effects)    entities.effects.push(e); }

export function resetEntities() {
  entities.player = null;
  entities.enemies.length = 0;
  entities.projectiles.length = 0;
  entities.pickups.length = 0;
  entities.effects.length = 0;
  entities.boss = null;
}

// Spatial hash for enemy lookups. Rebuilt each frame.
const CELL = 96;
const grid = new Map();
function key(cx, cy) { return cx * 100000 + cy; }

export function rebuildHash() {
  grid.clear();
  for (const e of entities.enemies) {
    const k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    let arr = grid.get(k);
    if (!arr) { arr = []; grid.set(k, arr); }
    arr.push(e);
  }
  if (entities.boss) {
    const k = key(Math.floor(entities.boss.x / CELL), Math.floor(entities.boss.y / CELL));
    let arr = grid.get(k);
    if (!arr) { arr = []; grid.set(k, arr); }
    arr.push(entities.boss);
  }
}

// Query all enemies within a world-space radius.
export function enemiesInRadius(x, y, r) {
  const out = [];
  const minCx = Math.floor((x - r) / CELL), maxCx = Math.floor((x + r) / CELL);
  const minCy = Math.floor((y - r) / CELL), maxCy = Math.floor((y + r) / CELL);
  const r2 = r * r;
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const arr = grid.get(key(cx, cy));
      if (!arr) continue;
      for (const e of arr) {
        const dx = e.x - x, dy = e.y - y;
        if (dx * dx + dy * dy <= r2) out.push(e);
      }
    }
  }
  return out;
}

// Nearest live enemy to (x, y). O(k) scan — caller decides when this is cheap enough.
export function nearestEnemy(x, y, maxR = 800) {
  let best = null, bestD = maxR * maxR;
  for (const e of entities.enemies) {
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bestD) { bestD = d; best = e; }
  }
  if (entities.boss) {
    const d = (entities.boss.x - x) ** 2 + (entities.boss.y - y) ** 2;
    if (d < bestD) { bestD = d; best = entities.boss; }
  }
  return best;
}

// Compact arrays — drop entries where dead=true.
export function compact() {
  entities.enemies     = entities.enemies.filter(e => !e.dead);
  entities.projectiles = entities.projectiles.filter(p => !p.dead);
  entities.pickups     = entities.pickups.filter(p => !p.dead);
  entities.effects     = entities.effects.filter(e => !e.dead);
  if (entities.boss && entities.boss.dead) entities.boss = null;
}
