// Survivors — canonical data tables.
// URL-encoded path to the sprite folder (folder name contains a space).
export const SPRITE_BASE = "/assets/3d%20sprites/sprites";

export const ANGLES = ["000", "045", "090", "135", "180", "225", "270", "315"];

// Sprite families (prefix → display name). Used by sprite.js to build URLs.
export const OUTFITS = [
  "APPRENTICEROBE", "ARCANEREGALIA", "BATTLEARMOR", "BONETUNIC",
  "CELESTIALVESTMENTS", "DEATHSHROUD", "EMBERROBES", "FROSTMANTLE",
  "INFERNOCLOAK", "NULLWRAPPINGS", "RADIANT_GARB", "ROBEOFTHENINE",
  "ROYALCAPE", "SIMPLETUNIC", "STARWEAVERROBE", "STONEPLATE",
  "TATTEREDCLOAK", "TIDALROBE", "TIDALWEAVE", "UMBRALSHROUD",
  "VERDANTTUNIC", "VERDANTVESTMENTS", "VOIDLORDARMOR", "WILDCAARCHAOSCOAT",
];

export const HATS = [
  "APPRENTICE", "ARCANECIRCLET", "BATTLEHELM", "CLOTHWRAP",
  "CROWNOFTHENINE", "CROWNOFTHORNS", "CRYSTALTIARA", "EARRING",
  "EMBER_HAT", "EYEPATCH", "FROSTHOOD", "INFERNOCROWN",
  "MONICLE", "NULLVEIL", "RADIANT_HALO", "STARWEAVERCROWN",
  "STONEHELM", "TIDALCREST", "UMBRALCOWL", "VERDANTCROWN",
  "VOIDKINGCROWN", "WILDCATEARS", "WITCHHAT", "WORNHOOD",
];

export const WEAPONS_HELD = [
  "ARCANESTAFF", "CHAOSWAND", "CRYSTAL_STAFF", "DAGGER",
  "DUALDAGGER", "ELEGANTWAND", "EMBERSTAFF", "FLAMEBLADE",
  "FROSTBLADE", "FROSTSTAFF", "GNARLEDBRANCH", "LIGHTBRINGER",
  "MACE", "MOONSTAFF", "MUSHROOM_STAFF", "ORB",
  "RADIANTWAND", "SCYTHE", "SHADOWWAND", "SHORTSWORD.001",
  "SIMPLEWAND", "STAFFOFSTORMS", "STAFFOFTHENINE", "TOME",
  "TRIDENT", "VERDANTSTAFF", "VOIDCLEAVER", "VOID_STAFF",
  "WARHAMMER", "WOODENSTAFF",
];

export const FACIALS = ["CAT_MASK.001"];

// All 9 houses. Ids match register.html / card-v4.js / server's HOUSE_CATALOGUE.
// `startingWeapon` is a placeholder used by the engine until PR-C wires
// drafted cards in as the actual run weapons.
export const HOUSES = [
  {
    id: "smoulders",   name: "Smoulders",   tagline: "Fire burns hottest when cornered.",
    outfit: "EMBERROBES",       hat: "EMBER_HAT",        weapon: "EMBERSTAFF",
    tint: [224, 60, 49],
    startingWeapon: "ember_toss",
  },
  {
    id: "darktide",    name: "Darktide",    tagline: "The deep keeps its secrets.",
    outfit: "TIDALROBE",        hat: "TIDALCREST",       weapon: "TRIDENT",
    tint: [0, 180, 216],
    startingWeapon: "mana_bolt",
  },
  {
    id: "stonebark",   name: "Stonebark",   tagline: "What stands, stays.",
    outfit: "STONEPLATE",       hat: "STONEHELM",        weapon: "GNARLEDBRANCH",
    tint: [92, 179, 56],
    startingWeapon: "terraform_slam",
  },
  {
    id: "ashenvale",   name: "Ashenvale",   tagline: "Roots remember the rain.",
    outfit: "VERDANTTUNIC",     hat: "VERDANTCROWN",     weapon: "VERDANTSTAFF",
    tint: [176, 196, 222],
    startingWeapon: "spore_cloud",
  },
  {
    id: "stormrage",   name: "Stormrage",   tagline: "Lightning chooses no friend.",
    outfit: "ROYALCAPE",        hat: "STARWEAVERCROWN",  weapon: "STAFFOFSTORMS",
    tint: [255, 200, 0],
    startingWeapon: "mana_bolt",
  },
  {
    id: "nighthollow", name: "Nighthollow", tagline: "Some doors only open in the dark.",
    outfit: "UMBRALSHROUD",     hat: "UMBRALCOWL",       weapon: "SHADOWWAND",
    tint: [123, 45, 142],
    startingWeapon: "arcane_shield",
  },
  {
    id: "dawnbringer", name: "Dawnbringer", tagline: "A first light is still a fire.",
    outfit: "CELESTIALVESTMENTS", hat: "RADIANT_HALO",   weapon: "RADIANTWAND",
    tint: [255, 140, 0],
    startingWeapon: "firewall",
  },
  {
    id: "manastorm",   name: "Manastorm",   tagline: "Will is the only currency that bends.",
    outfit: "ARCANEREGALIA",    hat: "ARCANECIRCLET",    weapon: "ARCANESTAFF",
    tint: [91, 143, 224],
    startingWeapon: "petrify_pulse",
  },
  {
    id: "plaguemire",  name: "Plaguemire",  tagline: "The rot remembers.",
    outfit: "DEATHSHROUD",      hat: "NULLVEIL",         weapon: "SCYTHE",
    tint: [232, 67, 147],
    startingWeapon: "plague_aura",
  },
];

// Weapons — each is a stat table by level (1..5).
// kind: projectile | orbit | aura | rotating | slam | puddle | stun
// art: path relative to /assets/images/spells/
export const WEAPON_DEFS = {
  mana_bolt: {
    id: "mana_bolt", name: "Mana Bolt", kind: "projectile",
    art: "/assets/images/spells/MANABOLT.png",
    // levels: cooldown(ms), damage, projectiles, speed, pierce, homing
    levels: [
      { cd: 900, dmg: 10, count: 1, spd: 520, pierce: 0, homing: 0.03 },
      { cd: 800, dmg: 14, count: 1, spd: 560, pierce: 0, homing: 0.04 },
      { cd: 700, dmg: 18, count: 2, spd: 600, pierce: 1, homing: 0.05 },
      { cd: 600, dmg: 22, count: 2, spd: 640, pierce: 1, homing: 0.06 },
      { cd: 500, dmg: 28, count: 3, spd: 680, pierce: 2, homing: 0.07 },
    ],
  },
  ember_toss: {
    id: "ember_toss", name: "Ember Toss", kind: "projectile",
    art: "/assets/images/spells/embertoss.jpeg",
    levels: [
      { cd: 1100, dmg: 18, count: 1, spd: 360, pierce: 1, homing: 0, aoe: 60 },
      { cd: 1000, dmg: 24, count: 2, spd: 380, pierce: 1, homing: 0, aoe: 64 },
      { cd: 900,  dmg: 30, count: 2, spd: 400, pierce: 2, homing: 0, aoe: 70 },
      { cd: 800,  dmg: 38, count: 3, spd: 420, pierce: 2, homing: 0, aoe: 76 },
      { cd: 700,  dmg: 48, count: 4, spd: 440, pierce: 3, homing: 0, aoe: 84 },
    ],
  },
  firewall: {
    id: "firewall", name: "Firewall", kind: "rotating",
    art: "/assets/images/spells/firewall.jpeg",
    // sweep around the player
    levels: [
      { cd: 1400, dmg: 6, length: 140, width: 40, sweepMs: 700 },
      { cd: 1300, dmg: 8, length: 160, width: 44, sweepMs: 700 },
      { cd: 1200, dmg: 10, length: 180, width: 48, sweepMs: 700 },
      { cd: 1100, dmg: 13, length: 200, width: 52, sweepMs: 700 },
      { cd: 1000, dmg: 17, length: 220, width: 56, sweepMs: 700 },
    ],
  },
  arcane_shield: {
    id: "arcane_shield", name: "Arcane Shield", kind: "orbit",
    art: "/assets/images/spells/ARCANESHIELD.jpeg",
    levels: [
      { orbs: 2, dmg: 6, radius: 80, rotSpd: 2.2 },
      { orbs: 3, dmg: 8, radius: 90, rotSpd: 2.4 },
      { orbs: 3, dmg: 11, radius: 100, rotSpd: 2.6 },
      { orbs: 4, dmg: 14, radius: 110, rotSpd: 2.8 },
      { orbs: 5, dmg: 18, radius: 120, rotSpd: 3.0 },
    ],
  },
  spore_cloud: {
    id: "spore_cloud", name: "Spore Cloud", kind: "puddle",
    art: "/assets/images/spells/SPORE.jpeg",
    levels: [
      { cd: 1800, dmg: 4, radius: 70, ttl: 3500 },
      { cd: 1700, dmg: 5, radius: 76, ttl: 3800 },
      { cd: 1500, dmg: 6, radius: 84, ttl: 4200 },
      { cd: 1300, dmg: 8, radius: 92, ttl: 4600 },
      { cd: 1100, dmg: 11, radius: 100, ttl: 5000 },
    ],
  },
  petrify_pulse: {
    id: "petrify_pulse", name: "Petrify Pulse", kind: "stun",
    art: "/assets/images/spells/PETRIFY.png",
    levels: [
      { cd: 3000, dmg: 12, radius: 120, stunMs: 700 },
      { cd: 2800, dmg: 16, radius: 135, stunMs: 800 },
      { cd: 2600, dmg: 20, radius: 150, stunMs: 900 },
      { cd: 2400, dmg: 26, radius: 165, stunMs: 1000 },
      { cd: 2200, dmg: 34, radius: 180, stunMs: 1200 },
    ],
  },
  terraform_slam: {
    id: "terraform_slam", name: "Terraform Slam", kind: "slam",
    art: "/assets/images/spells/TERRAFORM.jpeg",
    levels: [
      { cd: 2400, dmg: 18, radius: 150, knockback: 180 },
      { cd: 2200, dmg: 24, radius: 165, knockback: 200 },
      { cd: 2000, dmg: 32, radius: 180, knockback: 220 },
      { cd: 1800, dmg: 42, radius: 200, knockback: 240 },
      { cd: 1600, dmg: 54, radius: 220, knockback: 260 },
    ],
  },
  plague_aura: {
    id: "plague_aura", name: "Plague Aura", kind: "aura",
    art: "/assets/images/spells/PLAGUEDOCTOR.jpeg",
    levels: [
      { tickMs: 400, dmg: 3, radius: 90 },
      { tickMs: 380, dmg: 4, radius: 100 },
      { tickMs: 360, dmg: 5, radius: 110 },
      { tickMs: 340, dmg: 7, radius: 120 },
      { tickMs: 320, dmg: 9, radius: 130 },
    ],
  },
};

// Passive cards modify player stats. Each stacks via level (1..5).
export const PASSIVE_DEFS = {
  haste:    { id: "haste",    name: "Haste",    symbol: "»", desc: "+8% move speed", perLevel: { moveSpd: 0.08 } },
  might:    { id: "might",    name: "Might",    symbol: "✚", desc: "+10% damage",    perLevel: { dmgMul:   0.10 } },
  veil:     { id: "veil",     name: "Veil",     symbol: "◈", desc: "+5% dodge",      perLevel: { dodge:    0.05 } },
  recovery: { id: "recovery", name: "Recovery", symbol: "♥", desc: "+0.4 HP/s",      perLevel: { regen:    0.4  } },
  magnet:   { id: "magnet",   name: "Magnet",   symbol: "◉", desc: "+25% pickup range", perLevel: { pickup: 0.25 } },
  greed:    { id: "greed",    name: "Greed",    symbol: "✦", desc: "+15% XP gain",    perLevel: { xpMul:   0.15 } },
  fortune:  { id: "fortune",  name: "Fortune",  symbol: "★", desc: "+5% crit chance", perLevel: { crit:    0.05 } },
  tome:     { id: "tome",     name: "Tome",     symbol: "✺", desc: "-6% cooldowns",   perLevel: { cdMul:  -0.06 } },
};

// 6 chapters → 6 biome backgrounds (webp copies baked by scripts/bake-biomes.js)
// Until the bake runs, paths fall back to /assets/images/zones/*.png thumbnails.
export const CHAPTERS = [
  {
    id: 1, name: "Grassy Gnoll",
    biome: "/assets/images/biomes/web/twilight-grove.webp",
    biomeFallback: "/assets/images/zones/grassy-gnoll.png",
    tint: [230, 230, 210],
    durationSec: 180,
    spawnCurve: t => 0.6 + t / 60,            // enemies/sec over time
    eliteEverySec: 30,
    boss: "BABYDRAGON_GREEN",
    enemyPool: ["basic_rat", "basic_fast"],
  },
  {
    id: 2, name: "Scorched Plains",
    biome: "/assets/images/biomes/web/scorched-plains.webp",
    biomeFallback: "/assets/images/zones/scorched-plains.jpg",
    tint: [255, 200, 150],
    durationSec: 180,
    spawnCurve: t => 1.2 + t / 40,
    eliteEverySec: 28,
    boss: "BABYDRAGON_RED",
    enemyPool: ["basic_rat", "basic_tank", "basic_fast"],
  },
  {
    id: 3, name: "Mystic Falls",
    biome: "/assets/images/biomes/web/misty-falls.webp",
    biomeFallback: "/assets/images/zones/mystic-falls.png",
    tint: [180, 220, 230],
    durationSec: 180,
    spawnCurve: t => 1.6 + t / 36,
    eliteEverySec: 26,
    boss: "FROSTSPRITE",
    enemyPool: ["basic_rat", "basic_fast", "basic_shooter"],
  },
  {
    id: 4, name: "Twilight Grove",
    biome: "/assets/images/biomes/web/twilight-grove.webp",
    biomeFallback: "/assets/images/zones/mystic-falls.png",
    tint: [180, 170, 210],
    durationSec: 180,
    spawnCurve: t => 2.0 + t / 32,
    eliteEverySec: 24,
    boss: "OWL",
    enemyPool: ["basic_rat", "basic_tank", "basic_shooter", "basic_fast"],
  },
  {
    id: 5, name: "Abyssal Edge",
    biome: "/assets/images/biomes/web/abysal-edge.webp",
    biomeFallback: "/assets/images/zones/tidal-depths.png",
    tint: [130, 140, 180],
    durationSec: 180,
    spawnCurve: t => 2.5 + t / 28,
    eliteEverySec: 22,
    boss: "VOIDTENTACLE",
    enemyPool: ["basic_rat", "basic_tank", "basic_shooter", "basic_fast"],
  },
  {
    id: 6, name: "Void Tear",
    biome: "/assets/images/biomes/web/chaos-rift.webp",
    biomeFallback: "/assets/images/zones/void-tear.png",
    tint: [190, 160, 220],
    durationSec: 180,
    spawnCurve: t => 3.0 + t / 24,
    eliteEverySec: 20,
    boss: "FLOATINGSKULL",
    enemyPool: ["basic_rat", "basic_tank", "basic_shooter", "basic_fast"],
  },
];

// Enemy archetypes. Cats are randomly styled; stats come from here.
export const ENEMY_DEFS = {
  basic_rat:     { hp: 14,  spd: 80,  dmg: 6,  xp: 1, scale: 0.28, ranged: false },
  basic_fast:    { hp: 10,  spd: 135, dmg: 5,  xp: 1, scale: 0.26, ranged: false },
  basic_tank:    { hp: 45,  spd: 55,  dmg: 10, xp: 3, scale: 0.38, ranged: false },
  basic_shooter: { hp: 18,  spd: 70,  dmg: 4,  xp: 2, scale: 0.30, ranged: true, range: 260, cd: 2200, projSpd: 260 },
};

// Boss archetypes keyed by familiar-sprite filename (no extension).
export const BOSS_DEFS = {
  BABYDRAGON_GREEN: { hp: 800,  spd: 70, dmg: 14, xp: 30, scale: 1.4,  melee: true },
  BABYDRAGON_RED:   { hp: 1400, spd: 75, dmg: 18, xp: 40, scale: 1.5,  melee: true },
  FROSTSPRITE:      { hp: 1900, spd: 90, dmg: 16, xp: 50, scale: 1.2,  melee: true },
  OWL:              { hp: 2400, spd: 110,dmg: 20, xp: 60, scale: 1.25, melee: true },
  VOIDTENTACLE:     { hp: 3200, spd: 65, dmg: 26, xp: 70, scale: 1.6,  melee: true },
  FLOATINGSKULL:    { hp: 4200, spd: 80, dmg: 30, xp: 80, scale: 1.45, melee: true },
};

// Familiar sprite paths (for bosses + XP gems).
export const FAMILIAR = name => `/assets/nine/familiar/${name}.png`;
export const XP_GEM_SPRITES = [
  FAMILIAR("ORB_MANASTORM"),  // small
  FAMILIAR("ORB_STORMRAGE"),  // mid
  FAMILIAR("ORB_DAWNBRINGER"),// large
];

// XP curve: xp to reach level N → N * 4 + N^1.5 * 2
export const xpForLevel = n => Math.floor(n * 4 + Math.pow(n, 1.5) * 2);

// World size (soft bounds at the edges).
export const WORLD = { w: 4000, h: 4000 };
