// Spawner — wave director. Time-driven spawn ramp, elite intervals, chapter boss.

import { CHAPTERS, ENEMY_DEFS, BOSS_DEFS, FAMILIAR, OUTFITS, HATS, WEAPONS_HELD } from "./data.js";
import { entities, addEnemy, makeEnemy, makeBoss } from "./entities.js";

export const state = {
  chapterIdx: 0,
  chapterElapsed: 0,    // seconds
  spawnAcc: 0,          // accumulated spawn "tokens"
  eliteAcc: 0,
  bossSpawned: false,
  chapterComplete: false,
};

export function resetSpawner() {
  state.chapterIdx = 0;
  state.chapterElapsed = 0;
  state.spawnAcc = 0;
  state.eliteAcc = 0;
  state.bossSpawned = false;
  state.chapterComplete = false;
}

export function currentChapter() { return CHAPTERS[state.chapterIdx]; }

// Called from main each frame. dt in seconds.
export function updateSpawner(dt, player) {
  const ch = currentChapter();
  if (!ch) return;

  state.chapterElapsed += dt;
  const t = state.chapterElapsed;

  // Boss arrives at durationSec * 0.8 (roughly 2:30 of a 3:00 chapter)
  const bossT = ch.durationSec * 0.8;
  if (!state.bossSpawned && t >= bossT) {
    spawnBoss(ch, player);
    state.bossSpawned = true;
  }

  // Chapter is complete when boss is dead AND post-boss grace elapsed.
  if (state.bossSpawned && !entities.boss && !state.chapterComplete) {
    state.chapterComplete = true;
  }

  // Halt regular spawns during boss fight.
  if (state.bossSpawned) return;

  // Ramp: enemies per second
  const rate = Math.max(0, ch.spawnCurve(t));
  state.spawnAcc += rate * dt;
  while (state.spawnAcc >= 1) {
    state.spawnAcc -= 1;
    spawnWaveEnemy(ch, player);
  }

  // Elites at intervals
  state.eliteAcc += dt;
  if (state.eliteAcc >= ch.eliteEverySec) {
    state.eliteAcc = 0;
    spawnElite(ch, player);
  }
}

export function advanceChapter() {
  state.chapterIdx++;
  state.chapterElapsed = 0;
  state.spawnAcc = 0;
  state.eliteAcc = 0;
  state.bossSpawned = false;
  state.chapterComplete = false;
}

// ---------- Helpers ----------

function offScreenSpawnPos(player) {
  // Pick a point on a ring around the player, outside typical viewport (~ 500 px).
  const a = Math.random() * Math.PI * 2;
  const d = 520 + Math.random() * 120;
  return { x: player.x + Math.cos(a) * d, y: player.y + Math.sin(a) * d };
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomCatChar(scale = 0.3) {
  return {
    outfit: pick(OUTFITS),
    hat:    pick(HATS),
    weapon: pick(WEAPONS_HELD),
    facial: Math.random() < 0.25 ? "CAT_MASK.001" : null,
    tint: [
      100 + Math.floor(Math.random() * 155),
      100 + Math.floor(Math.random() * 155),
      100 + Math.floor(Math.random() * 155),
    ],
    scale,
  };
}

function spawnWaveEnemy(ch, player) {
  const archetype = pick(ch.enemyPool);
  const def = ENEMY_DEFS[archetype];
  if (!def) return;
  const pos = offScreenSpawnPos(player);
  const char = randomCatChar(def.scale);
  const e = makeEnemy({ ...def, id: archetype }, pos.x, pos.y, char);
  // Scale HP with chapter index for difficulty
  const hpMul = 1 + state.chapterIdx * 0.35;
  e.hpMax = Math.floor(def.hp * hpMul);
  e.hp = e.hpMax;
  addEnemy(e);
}

function spawnElite(ch, player) {
  const archetype = pick(ch.enemyPool);
  const def = ENEMY_DEFS[archetype];
  if (!def) return;
  const pos = offScreenSpawnPos(player);
  const char = randomCatChar(def.scale * 1.5);
  const e = makeEnemy({ ...def, id: archetype }, pos.x, pos.y, char);
  const hpMul = 1 + state.chapterIdx * 0.35;
  e.hpMax = Math.floor(def.hp * hpMul * 5);
  e.hp = e.hpMax;
  e.dmg *= 1.4;
  e.xp = Math.max(5, def.xp * 5);
  e.isElite = true;
  addEnemy(e);
}

function spawnBoss(ch, player) {
  const def = BOSS_DEFS[ch.boss];
  if (!def) return;
  const pos = offScreenSpawnPos(player);
  const url = FAMILIAR(ch.boss);
  entities.boss = makeBoss(def, url, pos.x, pos.y);
  entities.boss.hpMax = Math.floor(def.hp * (1 + state.chapterIdx * 0.2));
  entities.boss.hp = entities.boss.hpMax;
  entities.boss.name = ch.boss.replace(/_/g, " ");
}
