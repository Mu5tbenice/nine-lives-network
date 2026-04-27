// Survivors — boot, main loop, state machine.

import { attachInput, axis, endFrame, isDown, wasPressed } from "./input.js";
import {
  entities, resetEntities, makePlayer, makePickup, makeEffect,
  addPickup, addEffect, addProjectile, makeProjectile, rebuildHash, enemiesInRadius, compact,
} from "./entities.js";
import {
  HOUSES, CHAPTERS, WORLD, WEAPON_DEFS, PASSIVE_DEFS, xpForLevel,
  XP_GEM_SPRITES, FAMILIAR, ENEMY_DEFS,
} from "./data.js";
import { getAtlas, angleIndex, drawChar } from "./sprite.js";
import { camera, followCamera, loadBiome, drawWorldBackground, worldToScreen, clampToWorld } from "./world.js";
import { grantWeapon, grantWeaponFromCard, fireActivated, updateWeapons, damage, drawOrbits } from "./weapons.js";
import {
  fetchSpecs, lookupSpec, bumpRarity, isAtMaxRarity,
  recomputeSpecWeapon, recomputeActivatedSlot, rarityMultiplier,
} from "./specs.js";
import { updateSpawner, state as spawnState, resetSpawner, currentChapter, advanceChapter } from "./spawner.js";
import {
  buildOffers, pickOffers, applyOffer, recomputePassiveStats,
  CRYSTAL_REROLL_BASE, CRYSTAL_REROLL_MULT, CRYSTAL_UPGRADE_COST,
  CRYSTAL_LEGENDARY_PAYOUT, BUILD_CAP,
} from "./cards.js";
import { showStartScreen, updateHUD, showLevelUp, showGameOver, playChapterBanner, updateFps, getSavedName } from "./ui.js";

// Game state machine: BOOT → MENU → PLAY ⇄ LEVELUP → GAMEOVER → MENU
let phase = "BOOT";
let runStart = 0;
let lastT = 0;
let fpsAcc = 0, fpsFrames = 0, fpsShown = 0;

const canvas = document.getElementById("sv-canvas");
const ctx = canvas.getContext("2d", { alpha: false });

// Image cache for small sprites (pickups, boss, projectile icons)
const imgs = new Map();
function img(url) {
  if (!url) return null;
  let x = imgs.get(url);
  if (!x) {
    x = new Image();
    x.src = url;
    imgs.set(url, x);
  }
  return x;
}

// Stable atlas lookup by character key — caches getAtlas result.
function atlasFor(char) { return getAtlas(char); }

// ------- Lifecycle -------

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = Math.floor(window.innerWidth  * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width  = window.innerWidth  + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);

async function boot() {
  resize();
  attachInput();
  phase = "MENU";
  showStartScreen(startRun);
  requestAnimationFrame(tick);
}

async function startRun(args) {
  // PR-B: showStartScreen invokes onStart({ house, draftedCardIds, draftedCards }).
  // PR-C2: draftedCards carries the full card objects so the runtime can
  // look up each spell's spec and grant the right weapon.
  // Game-over → restart path passes a bare house and we fall back to
  // whatever was drafted at the start of this session.
  let house, draftedCardIds, draftedCards, collection;
  if (args && args.house) {
    house = args.house;
    draftedCardIds = Array.isArray(args.draftedCardIds) ? args.draftedCardIds : [];
    draftedCards   = Array.isArray(args.draftedCards)   ? args.draftedCards   : [];
    collection     = Array.isArray(args.collection)     ? args.collection     : draftedCards;
  } else {
    house = args; // legacy
    draftedCardIds = currentDraftedCardIds || [];
    draftedCards   = currentDraftedCards   || [];
    collection     = currentCollection     || draftedCards;
  }

  currentHouse = house;
  currentDraftedCardIds = draftedCardIds;
  currentDraftedCards   = draftedCards;
  currentCollection     = collection;

  // Pre-load the spec catalogue so the per-card lookups below resolve.
  let specsLoaded = true;
  try { await fetchSpecs(); } catch (e) {
    console.warn("[survivors] specs fetch failed; falling back to house starter:", e && e.message);
    specsLoaded = false;
  }

  resetEntities();
  resetSpawner();
  const player = makePlayer(house);
  entities.player = player;

  // PR-C2: drafted cards become the run's starting weapons. Activated
  // specs bind to Q (first) / E (second); continuous specs auto-fire.
  let grantedAny = false;
  if (specsLoaded) {
    for (const card of draftedCards) {
      const spell_id = card && (card.spell_id ?? (card.spell && card.spell.id));
      if (!spell_id) continue;
      const spec = lookupSpec(spell_id);
      if (!spec) continue;
      grantWeaponFromCard(player, card, spec);
      grantedAny = true;
    }
  }

  // Safety net — if the spec fetch failed or the player drafted only
  // activated cards (or zero viable cards), still grant the house's legacy
  // starting weapon so the run isn't soft-locked.
  if (!grantedAny || player.specWeapons.length === 0 && player.activatedSlots.length === 0) {
    grantWeapon(player, house.startingWeapon);
  } else if (player.specWeapons.length === 0) {
    // Activated-only draft — give them the house starter for auto-fire.
    grantWeapon(player, house.startingWeapon);
  }

  recomputePassiveStats(player);

  // Prewarm the player's atlas so we don't blink on first render.
  getAtlas(player.char).ready.catch(() => {});

  // Load first round biome.
  const ch = currentChapter();
  await loadBiome([ch.biome, ch.biomeFallback]);
  playChapterBanner(`Round ${ch.id} — ${ch.name}`);

  runStart = performance.now();
  phase = "PLAY";
}

let currentHouse = null;
let currentDraftedCardIds = [];
let currentDraftedCards = [];
let currentCollection = []; // PR-C3: full /api/survivors/start.cards for level-up offers
let rerollCostThisLevelUp = CRYSTAL_REROLL_BASE;

function endRun(won) {
  const player = entities.player;
  const summary = {
    won,
    timeSec: (performance.now() - runStart) / 1000,
    level: player?.level || 1,
    kills: player?.kills || 0,
    chapter: (currentChapter() && currentChapter().id) || 1,
  };
  submitRunResult(summary);
  phase = "GAMEOVER";
  showGameOver(summary, () => {
    phase = "MENU";
    showStartScreen(startRun);
  });
}

// Fire-and-forget submission. Failures are logged but don't block the UI.
// PR-B: includes player_id (server requires it post-§9.111) and
// drafted_card_ids (the 2 cards the player picked at run start).
function submitRunResult(summary) {
  try {
    const playerId = getPlayerId();
    if (!playerId) {
      console.warn("[survivors] no player_id — skipping run submit");
      return;
    }
    fetch("/api/survivors/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: playerId,
        house: currentHouse?.id || null,
        display_name: getSavedName() || null,
        time_sec: Math.floor(summary.timeSec),
        level: summary.level,
        kills: summary.kills,
        // PR-D — `chapter` field on the wire is the round number now.
        chapter: summary.chapter,
        won: !!summary.won,
        drafted_card_ids: currentDraftedCardIds,
        ended_reason: summary.won ? null : "death",
        client_version: "survivors-v2-pr-d",
      }),
    }).catch(err => console.warn("[survivors] submit fail:", err.message));
  } catch (err) {
    console.warn("[survivors] submit exception:", err && err.message);
  }
}

function getPlayerId() {
  try {
    const url = new URLSearchParams(window.location.search);
    const fromQuery = url.get("player_id");
    if (fromQuery) return parseInt(fromQuery, 10) || null;
    const stored = localStorage.getItem("player_id");
    return stored ? parseInt(stored, 10) || null : null;
  } catch {
    return null;
  }
}

// ------- Main loop -------

function tick(t) {
  requestAnimationFrame(tick);
  if (!lastT) lastT = t;
  const dtMs = Math.min(40, t - lastT);  // clamp to avoid huge jumps on tab switch
  const dt = dtMs / 1000;
  lastT = t;

  fpsFrames++;
  fpsAcc += dtMs;
  if (fpsAcc >= 500) { fpsShown = (fpsFrames * 1000) / fpsAcc; fpsFrames = 0; fpsAcc = 0; updateFps(fpsShown); }

  const cw = window.innerWidth, ch = window.innerHeight;

  if (phase === "PLAY") update(dt);
  render(cw, ch);
  endFrame();
}

function update(dt) {
  const p = entities.player;
  if (!p) return;
  const now = performance.now();

  // --- Input → player motion ---
  const ax = axis();
  p.vx = ax.x * p.speed;
  p.vy = ax.y * p.speed;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  clampToWorld(p, 24);
  if (Math.abs(ax.x) + Math.abs(ax.y) > 0.05) {
    p.facing = angleIndex(ax.x, ax.y);
  }
  p.flash = Math.max(0, p.flash - dt * 3);
  p.iframe = Math.max(0, p.iframe - dt);
  if (p.regen > 0) p.hp = Math.min(p.hpMax, p.hp + p.regen * dt);

  // Camera
  followCamera(p.x, p.y, dt);

  // --- Spawner ---
  updateSpawner(dt, p);

  // --- Hash for collision queries ---
  rebuildHash();

  // --- Weapons ---
  updateWeapons(p, dt, now);

  // PR-C2 — activated card key triggers (Q / E). Cooldowns tick inside
  // updateWeapons; firing happens here when the player presses the bound
  // key edge-trigger. Keys come through normalize() in input.js as their
  // lowercased event.code (e.g. "keyq").
  for (const slot of p.activatedSlots) {
    const code = slot.key === 'Q' ? 'keyq' : slot.key === 'E' ? 'keye' : null;
    if (code && wasPressed(code)) fireActivated(p, slot);
  }

  // --- Enemies move & act ---
  for (const e of entities.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt * 3);
    e.stun = Math.max(0, e.stun - dtMsFromSec(dt));
    if (e.stun > 0) continue;
    const dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.vx = (dx / d) * e.spd;
    e.vy = (dy / d) * e.spd;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.facing = angleIndex(e.vx, e.vy);

    // Ranged enemies fire at range
    if (e.ranged) {
      e.cdLeft = Math.max(0, e.cdLeft - dtMsFromSec(dt));
      if (e.cdLeft <= 0 && d <= e.range) {
        const a = Math.atan2(dy, dx);
        addProjectile(makeProjectile("enemy", e.x, e.y,
          Math.cos(a) * e.projSpd, Math.sin(a) * e.projSpd,
          { r: 8, dmg: e.dmg, life: 2200, color: "#ff6666" }));
        e.cdLeft = e.cd;
      }
    }

    // Touch damage
    if (d < p.r + e.r && p.iframe <= 0) {
      if (Math.random() < p.dodge) {
        addEffect(makeEffect("number", p.x, p.y - 20, { text: "MISS", color: "#9cf", ttl: 500 }));
      } else {
        p.hp -= e.dmg;
        p.iframe = 0.5;
        p.flash = 0.8;
        if (p.hp <= 0) { endRun(false); return; }
      }
    }
  }

  // Boss
  if (entities.boss) {
    const b = entities.boss;
    b.flash = Math.max(0, b.flash - dt * 3);
    const dx = p.x - b.x, dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    b.vx = (dx / d) * b.spd;
    b.vy = (dy / d) * b.spd;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (d < p.r + b.r && p.iframe <= 0) {
      if (Math.random() < p.dodge) {
        addEffect(makeEffect("number", p.x, p.y - 20, { text: "MISS", color: "#9cf", ttl: 500 }));
      } else {
        p.hp -= b.dmg;
        p.iframe = 0.6;
        p.flash = 0.9;
        if (p.hp <= 0) { endRun(false); return; }
      }
    }
  }

  // --- Projectiles ---
  for (const pr of entities.projectiles) {
    pr.life -= dtMsFromSec(dt);
    if (pr.life <= 0) { pr.dead = true; continue; }
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;

    // lobbed arc
    if (pr.gravity) {
      pr.z = (pr.z || 0) + (pr.vz || 0) * dt;
      pr.vz = (pr.vz || 0) - pr.gravity * dt;
      if (pr.z <= 0 && (pr.vz || 0) < 0) {
        // AoE on land
        const hits = enemiesInRadius(pr.x, pr.y, pr.aoe || 40);
        for (const e of hits) damage(e, pr.dmg, entities.player);
        addEffect(makeEffect("ring", pr.x, pr.y, { rMax: pr.aoe || 40, ttl: 240, color: "rgba(255,120,60,0.5)" }));
        pr.dead = true; continue;
      }
    }

    if (pr.src === "player") {
      const hits = enemiesInRadius(pr.x, pr.y, pr.r);
      for (const e of hits) {
        if (pr.hits.has(e.id)) continue;
        pr.hits.add(e.id);
        damage(e, pr.dmg, entities.player);
        if (pr.aoe && !pr.gravity) {
          const area = enemiesInRadius(pr.x, pr.y, pr.aoe);
          for (const a of area) if (a.id !== e.id) damage(a, Math.round(pr.dmg * 0.5), entities.player);
          addEffect(makeEffect("ring", pr.x, pr.y, { rMax: pr.aoe, ttl: 220, color: "rgba(255,150,90,0.4)" }));
        }
        if (pr.hits.size > pr.pierce) { pr.dead = true; break; }
      }
    } else {
      // enemy projectile → player
      if (p.iframe <= 0) {
        const dx = p.x - pr.x, dy = p.y - pr.y;
        if (dx * dx + dy * dy < (p.r + pr.r) * (p.r + pr.r)) {
          if (Math.random() < p.dodge) {
            addEffect(makeEffect("number", p.x, p.y - 20, { text: "MISS", color: "#9cf", ttl: 500 }));
          } else {
            p.hp -= pr.dmg;
            p.iframe = 0.3;
            p.flash = 0.7;
            if (p.hp <= 0) { endRun(false); return; }
          }
          pr.dead = true;
        }
      }
    }

    // Homing
    if (pr.src === "player" && pr.homing > 0 && pr.life > 0 && !pr.gravity) {
      const target = nearestEnemyByPos(pr.x, pr.y, 600);
      if (target) {
        const ax2 = target.x - pr.x, ay2 = target.y - pr.y;
        const d2 = Math.hypot(ax2, ay2) || 1;
        const h = pr.homing;
        const spd = Math.hypot(pr.vx, pr.vy);
        pr.vx = pr.vx * (1 - h) + (ax2 / d2) * spd * h;
        pr.vy = pr.vy * (1 - h) + (ay2 / d2) * spd * h;
      }
    }
  }

  // --- Pickups ---
  for (const pu of entities.pickups) {
    pu.life -= dtMsFromSec(dt);
    if (pu.life <= 0) { pu.dead = true; continue; }
    const dx = p.x - pu.x, dy = p.y - pu.y;
    const d = Math.hypot(dx, dy);
    const magnetR = 90 * p.pickup;
    const grabR = 28;
    if (d < magnetR || pu.magnet) {
      pu.magnet = true;
      const s = 420;
      pu.x += (dx / (d || 1)) * s * dt;
      pu.y += (dy / (d || 1)) * s * dt;
    }
    if (d < grabR) {
      collectPickup(p, pu);
      pu.dead = true;
    }
  }

  // --- Effects ---
  for (const fx of entities.effects) {
    fx.life -= dtMsFromSec(dt);
    if (fx.life <= 0) { fx.dead = true; continue; }
    if (fx.type === "ring") {
      const k = 1 - fx.life / fx.ttl;
      fx.r = fx.rMax * k;
    } else if (fx.type === "puddle") {
      fx.tickLeft -= dtMsFromSec(dt);
      if (fx.tickLeft <= 0) {
        fx.tickLeft = fx.tickCd;
        const hits = enemiesInRadius(fx.x, fx.y, fx.r);
        for (const e of hits) damage(e, fx.dmg, entities.player);
      }
    }
  }

  // --- Kill processing ---
  for (const e of entities.enemies) {
    if (e.dead) {
      entities.player.kills++;
      dropXP(e.x, e.y, e.xp);
      // PR-C3 — every kill drops 1 crystal pickup. Elite/boss tagging
      // would scale this; PR-D's spawner adds elite tier ramping.
      dropCrystal(e.x, e.y, 1);
      if (Math.random() < 0.04) dropHeal(e.x, e.y);
    }
  }
  if (entities.boss && entities.boss.dead) {
    entities.player.kills++;
    for (let i = 0; i < 8; i++) dropXP(entities.boss.x + (Math.random()-0.5)*80, entities.boss.y + (Math.random()-0.5)*80, Math.max(3, Math.floor(entities.boss.xp / 8)));
    // PR-C3 — boss kill drops a crystal pile.
    for (let i = 0; i < 5; i++) dropCrystal(entities.boss.x + (Math.random()-0.5)*60, entities.boss.y + (Math.random()-0.5)*60, 4);
    // PR-D — endless rounds. advanceChapter() wraps the biome index and
    // increments state.round; currentChapter() always returns a valid
    // entry (no win-condition path).
    advanceChapter();
    const next = currentChapter();
    if (next) {
      loadBiome([next.biome, next.biomeFallback]);
      playChapterBanner(`Round ${next.id} Cleared — ${next.name}`);
    }
  }

  compact();

  // --- HUD ---
  updateHUD(p, currentChapter(), (performance.now() - runStart) / 1000, spawnState.chapterElapsed, entities.boss);

  // --- Level-up check (PR-C3 rewrite — see presentLevelUp below) ---
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    phase = "LEVELUP";
    rerollCostThisLevelUp = CRYSTAL_REROLL_BASE; // reset per level-up
    presentLevelUp(p);
    break; // show one at a time
  }
}

function nearestEnemyByPos(x, y, maxR) {
  let best = null, bestD = maxR * maxR;
  for (const e of entities.enemies) {
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function dtMsFromSec(dt) { return dt * 1000; }

function collectPickup(p, pu) {
  if (pu.type === "xp")      p.xp += pu.value * (p.xpMul || 1);
  if (pu.type === "gold")    p.gold += pu.value;
  if (pu.type === "heal")    p.hp   = Math.min(p.hpMax, p.hp + pu.value);
  if (pu.type === "crystal") p.crystals = (p.crystals || 0) + pu.value;
}

function dropXP(x, y, value) {
  // pick gem size by value
  const idx = value >= 8 ? 2 : value >= 3 ? 1 : 0;
  addPickup(makePickup("xp", x, y, value, XP_GEM_SPRITES[idx]));
}

// PR-C3 — crystal pickup. Reuses the heal sprite for now (visual will be
// replaced when crystal art lands; see project_round_end_dopamine memory).
function dropCrystal(x, y, value) {
  addPickup(makePickup("crystal", x, y, value, FAMILIAR("ORB_DAWNBRINGER")));
}

function dropHeal(x, y) {
  addPickup(makePickup("heal", x, y, 15, FAMILIAR("SHIELD_HOLY")));
}

// ------- Render -------

function render(cw, ch) {
  drawWorldBackground(ctx, cw, ch, currentChapter()?.tint);

  const p = entities.player;

  // Pickups (under entities)
  for (const pu of entities.pickups) {
    const s = worldToScreen(pu.x, pu.y, cw, ch);
    const sprite = img(pu.spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 1) {
      const siz = 26;
      ctx.drawImage(sprite, s.x - siz/2, s.y - siz/2, siz, siz);
    } else {
      ctx.fillStyle = pu.type === "heal" ? "#ff6a8a" : "#aeffae";
      ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI*2); ctx.fill();
    }
  }

  // Ground effects (puddles, rings)
  for (const fx of entities.effects) {
    const s = worldToScreen(fx.x, fx.y, cw, ch);
    if (fx.type === "puddle") {
      ctx.fillStyle = fx.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, fx.r, 0, Math.PI*2); ctx.fill();
    } else if (fx.type === "ring") {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(s.x, s.y, fx.r, 0, Math.PI*2); ctx.stroke();
    }
  }

  // Sort enemies by y so closer ones render on top (pseudo-depth).
  const sortable = entities.enemies.slice();
  if (entities.boss) sortable.push(entities.boss);
  if (p) sortable.push(p);
  sortable.sort((a, b) => a.y - b.y);

  for (const e of sortable) {
    if (e.kind === "boss") {
      drawBoss(e, cw, ch);
    } else {
      drawEntityChar(e, cw, ch);
    }
  }

  // Orbit weapons
  if (p) drawOrbits(ctx, p, worldToScreen, cw, ch);

  // Projectiles
  for (const pr of entities.projectiles) {
    const s = worldToScreen(pr.x, pr.y - (pr.z || 0) * 0.5, cw, ch);
    ctx.save();
    ctx.fillStyle = pr.color;
    ctx.shadowColor = pr.color;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(s.x, s.y, pr.r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Damage numbers
  for (const fx of entities.effects) {
    if (fx.type !== "number") continue;
    const s = worldToScreen(fx.x, fx.y - (1 - fx.life / fx.ttl) * 30, cw, ch);
    ctx.save();
    ctx.fillStyle = fx.color;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.globalAlpha = Math.max(0, fx.life / fx.ttl);
    ctx.fillText(fx.text, s.x, s.y);
    ctx.restore();
  }
}

function drawEntityChar(e, cw, ch) {
  const atlas = atlasFor(e.char);
  if (!atlas.canvas) return;
  const s = worldToScreen(e.x, e.y, cw, ch);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, 18 * (e.scale || 1), 6 * (e.scale || 1), 0, 0, Math.PI*2); ctx.fill();
  drawChar(ctx, atlas, e.facing || 0, s.x, s.y, e.scale || 1, e.flash || 0);

  // HP bar for enemies (small)
  if (e.kind === "enemy" && e.hp < e.hpMax) {
    const w = 34 * (e.scale || 1);
    const x = s.x - w/2, y = s.y - 44 * (e.scale || 1);
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = e.isElite ? "#ffd75a" : "#ff6666";
    ctx.fillRect(x, y, w * (e.hp / e.hpMax), 3);
  }
}

function drawBoss(b, cw, ch) {
  const sprite = img(b.spriteUrl);
  const s = worldToScreen(b.x, b.y, cw, ch);
  const size = 180 * (b.scale || 1);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 14, size * 0.35, 10, 0, 0, Math.PI*2); ctx.fill();

  if (sprite && sprite.complete && sprite.naturalWidth > 1) {
    ctx.drawImage(sprite, s.x - size/2, s.y - size + 20, size, size);
  } else {
    ctx.fillStyle = "#b4a0ff";
    ctx.fillRect(s.x - 30, s.y - 60, 60, 80);
  }
  if (b.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = b.flash;
    if (sprite && sprite.complete && sprite.naturalWidth > 1) {
      ctx.drawImage(sprite, s.x - size/2, s.y - size + 20, size, size);
    }
    ctx.restore();
  }
}

// Debug: press F10 to spawn 200 enemies in a ring around the player.
window.addEventListener("keydown", e => {
  if (e.code !== "F10" || phase !== "PLAY") return;
  e.preventDefault();
  const p = entities.player;
  if (!p) return;
  for (let i = 0; i < 200; i++) {
    const a = (i / 200) * Math.PI * 2;
    const d = 600 + Math.random() * 200;
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    const def = ENEMY_DEFS.basic_rat;
    const char = {
      outfit: null, hat: null, weapon: null, facial: null,
      tint: [100 + ((i * 37) % 155), 100 + ((i * 71) % 155), 100 + ((i * 113) % 155)],
      scale: 0.28,
    };
    entities.enemies.push({
      id: Date.now() + i, kind: "enemy", archetype: "basic_rat",
      x, y, vx: 0, vy: 0, r: 14,
      facing: 0, char,
      hp: def.hp, hpMax: def.hp, dmg: def.dmg, spd: def.spd, scale: 0.28,
      xp: def.xp, stun: 0, flash: 0, slow: 1,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// PR-C3 — Level-up modal handlers.
//
// presentLevelUp(p) builds the offer pool from currentCollection and wires
// the per-modal callbacks (reroll, upgrade, swap, skip). All paths set
// phase back to "PLAY" so the engine resumes ticking.

function presentLevelUp(p) {
  const offers = pickOffers(buildOffers(p, currentCollection), 3);

  showLevelUp(offers, p, {
    upgradeCost: CRYSTAL_UPGRADE_COST,

    rerollCost: () => rerollCostThisLevelUp,

    onPick(offer) {
      applyCardOrPassive(p, offer);
      if (p.hp < p.hpMax) p.hp = Math.min(p.hpMax, p.hp + 10);
      phase = "PLAY";
    },

    onReroll() {
      p.crystals = (p.crystals || 0) - rerollCostThisLevelUp;
      rerollCostThisLevelUp *= CRYSTAL_REROLL_MULT;
      return pickOffers(buildOffers(p, currentCollection), 3);
    },

    upgradeTargets() {
      const t = [];
      for (const w of p.specWeapons) {
        const r = (w.def && w.def.rarity) || "common";
        if (isAtMaxRarity(r)) continue;
        const card = findOriginalCard(w.spellId);
        t.push({
          card,
          name: (card && card.spell && card.spell.name) || w.def.name,
          rarity: r,
          nextRarity: bumpRarity(r),
          slotRef: w,
          isActivated: false,
        });
      }
      for (const slot of p.activatedSlots) {
        const r = slot.rarity || "common";
        if (isAtMaxRarity(r)) continue;
        const card = findOriginalCard(slot.spellId);
        t.push({
          card,
          name: (card && card.spell && card.spell.name) || slot.name,
          rarity: r,
          nextRarity: bumpRarity(r),
          slotRef: slot,
          isActivated: true,
        });
      }
      return t;
    },

    onUpgradeBuildCard(target) {
      p.crystals = (p.crystals || 0) - CRYSTAL_UPGRADE_COST;
      const spec = lookupSpec(target.slotRef.spellId);
      if (target.isActivated) {
        recomputeActivatedSlot(target.slotRef, spec, target.nextRarity);
      } else {
        recomputeSpecWeapon(target.slotRef, spec, target.nextRarity);
      }
      if (p.hp < p.hpMax) p.hp = Math.min(p.hpMax, p.hp + 10);
      phase = "PLAY";
    },

    shouldSwap(offer) {
      if (offer.kind !== "card") return false;
      // Duplicates never swap — they bump rarity (or pay legendary crystals).
      if (isOwnedSpellId(p, offer.spellId)) return false;
      const buildSize = p.specWeapons.length + p.activatedSlots.length;
      return buildSize >= BUILD_CAP;
    },

    swapTargets() {
      const t = [];
      for (const w of p.specWeapons) {
        const card = findOriginalCard(w.spellId);
        t.push({
          card,
          name: (card && card.spell && card.spell.name) || w.def.name,
          rarity: (w.def && w.def.rarity) || "common",
          slotRef: w,
          isActivated: false,
        });
      }
      for (const slot of p.activatedSlots) {
        const card = findOriginalCard(slot.spellId);
        t.push({
          card,
          name: (card && card.spell && card.spell.name) || slot.name,
          rarity: slot.rarity || "common",
          slotRef: slot,
          isActivated: true,
        });
      }
      return t;
    },

    onSwap(discard, newOffer) {
      if (discard.isActivated) {
        const idx = p.activatedSlots.indexOf(discard.slotRef);
        if (idx >= 0) p.activatedSlots.splice(idx, 1);
        // Re-bind keys after removal — first remaining → Q, second → E.
        p.activatedSlots.forEach((s, i) => { s.key = i === 0 ? "Q" : "E"; });
      } else {
        const idx = p.specWeapons.indexOf(discard.slotRef);
        if (idx >= 0) p.specWeapons.splice(idx, 1);
      }
      applyCardOrPassive(p, newOffer);
      if (p.hp < p.hpMax) p.hp = Math.min(p.hpMax, p.hp + 10);
      phase = "PLAY";
    },

    onSkip() {
      phase = "PLAY";
    },
  });
}

function applyCardOrPassive(p, offer) {
  if (!offer) return;
  if (offer.kind === "passive" || offer.kind === "weapon") {
    applyOffer(p, offer, grantWeapon);
    return;
  }
  if (offer.kind !== "card") return;

  const spec = lookupSpec(offer.spellId);
  if (!spec) return;

  // Duplicate of an already-owned spell → rarity bump (or legendary payout).
  if (isOwnedSpellId(p, offer.spellId)) {
    bumpExistingCardRarity(p, offer.spellId);
    return;
  }
  // New card → grant via PR-C2's weapon-or-activated-slot dispatcher.
  grantWeaponFromCard(p, offer.card, spec);
}

function isOwnedSpellId(p, spellId) {
  const id = Number(spellId);
  return p.specWeapons.some(w => Number(w.spellId) === id) ||
    p.activatedSlots.some(s => Number(s.spellId) === id);
}

function bumpExistingCardRarity(p, spellId) {
  const spec = lookupSpec(spellId);
  if (!spec) return;
  const id = Number(spellId);

  const specW = p.specWeapons.find(w => Number(w.spellId) === id);
  if (specW) {
    const cur = (specW.def && specW.def.rarity) || "common";
    if (isAtMaxRarity(cur)) {
      p.crystals = (p.crystals || 0) + CRYSTAL_LEGENDARY_PAYOUT;
      return;
    }
    recomputeSpecWeapon(specW, spec, bumpRarity(cur));
    return;
  }

  const actS = p.activatedSlots.find(s => Number(s.spellId) === id);
  if (actS) {
    const cur = actS.rarity || "common";
    if (isAtMaxRarity(cur)) {
      p.crystals = (p.crystals || 0) + CRYSTAL_LEGENDARY_PAYOUT;
      return;
    }
    recomputeActivatedSlot(actS, spec, bumpRarity(cur));
  }
}

function findOriginalCard(spellId) {
  return currentCollection.find(c => Number(c.spell_id) === Number(spellId)) || null;
}

boot();
