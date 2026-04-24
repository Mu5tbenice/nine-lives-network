// Weapons — each active weapon ticks cooldowns and emits projectiles / effects.
// Passive cards mutate player stats directly; those are applied in main.js on card pick.

import { WEAPON_DEFS } from "./data.js";
import {
  entities, addProjectile, addEffect, enemiesInRadius, nearestEnemy, makeProjectile, makeEffect,
} from "./entities.js";

// Add a new weapon instance to the player (or level-up an existing one).
export function grantWeapon(player, weaponId) {
  let w = player.weapons.find(x => x.id === weaponId);
  if (w) {
    if (w.level < 5) w.level++;
    return;
  }
  w = {
    id: weaponId,
    level: 1,
    cdLeft: 0,
    angleCursor: 0,   // for rotating / orbiting weapons
    puddleCdLeft: 0,
  };
  player.weapons.push(w);
}

// Effective level stats with passive modifiers applied.
function stats(def, w, player) {
  const lv = def.levels[Math.min(w.level - 1, def.levels.length - 1)];
  return {
    ...lv,
    cd:  (lv.cd  || 0) * (player.cdMul || 1),
    dmg: (lv.dmg || 0) * (player.dmgMul || 1),
    tickMs: (lv.tickMs || 0) * (player.cdMul || 1),
  };
}

// Tick all player weapons. dt in seconds.
export function updateWeapons(player, dt, now) {
  for (const w of player.weapons) {
    const def = WEAPON_DEFS[w.id];
    if (!def) continue;
    const s = stats(def, w, player);
    w.cdLeft -= dt * 1000;
    switch (def.kind) {
      case "projectile":   if (w.cdLeft <= 0) { fireProjectile(player, def, w, s); w.cdLeft = s.cd; } break;
      case "rotating":     if (w.cdLeft <= 0) { fireRotating(player, def, w, s); w.cdLeft = s.cd; } break;
      case "slam":         if (w.cdLeft <= 0) { fireSlam(player, def, w, s); w.cdLeft = s.cd; } break;
      case "stun":         if (w.cdLeft <= 0) { firePetrify(player, def, w, s); w.cdLeft = s.cd; } break;
      case "puddle":       if (w.cdLeft <= 0) { firePuddle(player, def, w, s); w.cdLeft = s.cd; } break;
      case "orbit":        updateOrbit(player, def, w, s, dt); break;
      case "aura":         updateAura(player, def, w, s, dt); break;
    }
  }
}

function fireProjectile(player, def, w, s) {
  const count = s.count || 1;
  const target = nearestEnemy(player.x, player.y, 800) || { x: player.x + 1, y: player.y };
  let baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
  const spread = count > 1 ? 0.35 : 0;
  const lob = (def.id === "ember_toss");
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (count === 1 ? 0 : (i - (count - 1) / 2) * spread);
    const vx = Math.cos(a) * s.spd;
    const vy = Math.sin(a) * s.spd;
    addProjectile(makeProjectile("player", player.x, player.y, vx, vy, {
      r: lob ? 14 : 10,
      dmg: s.dmg,
      life: lob ? 700 : 1800,
      pierce: s.pierce || 0,
      aoe: s.aoe || 0,
      icon: def.art || null,
      bounce: false,
      color: def.id === "mana_bolt" ? "#8cd0ff"
           : def.id === "ember_toss" ? "#ff9050"
           : "#ffd27f",
      gravity: lob ? 700 : 0,
      vz: lob ? 200 : 0,
      homing: s.homing || 0,
    }));
  }
  player.lastShotAt = performance.now();
}

function fireRotating(player, def, w, s) {
  // A sweeping arc that damages every enemy within its swing cone.
  w.angleCursor += Math.PI / 2;   // rotate 90° each swing
  const hits = enemiesInRadius(player.x, player.y, s.length || 160);
  for (const e of hits) {
    const dx = e.x - player.x, dy = e.y - player.y;
    const ang = Math.atan2(dy, dx);
    const diff = Math.abs(normAngle(ang - w.angleCursor));
    if (diff <= Math.PI * 0.5) damage(e, s.dmg, player);
  }
  addEffect(makeEffect("ring", player.x, player.y, {
    rMax: s.length || 160, ttl: s.sweepMs || 700,
    color: "rgba(255,120,60,0.5)",
  }));
}

function fireSlam(player, def, w, s) {
  const ring = makeEffect("ring", player.x, player.y, {
    rMax: s.radius, ttl: 500, color: "rgba(200,160,100,0.7)",
  });
  addEffect(ring);
  const hits = enemiesInRadius(player.x, player.y, s.radius);
  for (const e of hits) {
    damage(e, s.dmg, player);
    // knockback
    const dx = e.x - player.x, dy = e.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * (s.knockback || 120);
    e.y += (dy / d) * (s.knockback || 120);
  }
}

function firePetrify(player, def, w, s) {
  addEffect(makeEffect("ring", player.x, player.y, {
    rMax: s.radius, ttl: 400, color: "rgba(180,180,210,0.8)",
  }));
  const hits = enemiesInRadius(player.x, player.y, s.radius);
  for (const e of hits) {
    damage(e, s.dmg, player);
    e.stun = Math.max(e.stun || 0, s.stunMs);
  }
}

function firePuddle(player, def, w, s) {
  // Drop a DoT puddle in front of the player.
  addEffect(makeEffect("puddle", player.x, player.y, {
    rMax: s.radius, r: s.radius, ttl: s.ttl,
    color: "rgba(120,200,120,0.35)",
    dmg: s.dmg, tickMs: 250,
  }));
}

function updateOrbit(player, def, w, s, dt) {
  w.angleCursor += (s.rotSpd || 2.5) * dt;
  // Orbs are virtual — we don't spawn projectiles; we damage on proximity each frame.
  const orbs = s.orbs || 3;
  for (let i = 0; i < orbs; i++) {
    const a = w.angleCursor + (i / orbs) * Math.PI * 2;
    const ox = player.x + Math.cos(a) * s.radius;
    const oy = player.y + Math.sin(a) * s.radius;
    const hits = enemiesInRadius(ox, oy, 22);
    for (const e of hits) {
      if (!e._orbitHit) e._orbitHit = {};
      const k = w.id + ":" + i;
      const last = e._orbitHit[k] || 0;
      if (performance.now() - last > 300) {
        damage(e, s.dmg, player);
        e._orbitHit[k] = performance.now();
      }
    }
  }
}

function updateAura(player, def, w, s, dt) {
  w._auraAcc = (w._auraAcc || 0) + dt * 1000;
  if (w._auraAcc < (s.tickMs || 400)) return;
  w._auraAcc -= (s.tickMs || 400);
  const hits = enemiesInRadius(player.x, player.y, s.radius);
  for (const e of hits) damage(e, s.dmg, player);
}

// Apply damage to a target. Handles player crit + flash.
export function damage(target, amount, player) {
  const isCrit = player && player.crit && Math.random() < player.crit;
  const final = Math.max(1, Math.round(amount * (isCrit ? 2 : 1)));
  target.hp -= final;
  target.flash = 0.6;
  if (target.hp <= 0) target.dead = true;
}

// Helpers
function normAngle(a) {
  while (a > Math.PI)  a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Orbit renderer (drawn by main's render pass via this helper).
export function drawOrbits(ctx, player, worldToScreen, cw, ch) {
  for (const w of player.weapons) {
    if (WEAPON_DEFS[w.id] && WEAPON_DEFS[w.id].kind === "orbit") {
      const s = WEAPON_DEFS[w.id].levels[Math.min(w.level - 1, 4)];
      const orbs = s.orbs;
      for (let i = 0; i < orbs; i++) {
        const a = w.angleCursor + (i / orbs) * Math.PI * 2;
        const ox = player.x + Math.cos(a) * s.radius;
        const oy = player.y + Math.sin(a) * s.radius;
        const p = worldToScreen(ox, oy, cw, ch);
        ctx.save();
        ctx.fillStyle = "#8fc6ff";
        ctx.shadowColor = "#8fc6ff";
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }
}
