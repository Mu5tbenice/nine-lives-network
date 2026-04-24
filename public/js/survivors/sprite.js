// Sprite compositor + atlas cache.
// Ports the viewer_app.py layer logic: Base (RGB-tintable) + Outfit + Weapon + Hat + Facial
// composited at each of 8 compass angles, cached on-demand.

import { SPRITE_BASE, ANGLES } from "./data.js";

const SRC_SIZE = 512;          // native sprite size
const TILE     = 192;          // atlas tile size (sprites trimmed + scaled to fit)
const COLS     = 8;            // 8 angles laid out left-to-right
const imgCache = new Map();    // url → Promise<HTMLImageElement>
const atlasCache = new Map();  // key → { canvas, ready: Promise<true>, tileW, tileH }

function loadImage(url) {
  let p = imgCache.get(url);
  if (p) return p;
  p = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Missing-layer fallback: resolve a 1×1 transparent canvas wrapped in an image-like.
      const c = document.createElement("canvas");
      c.width = 1; c.height = 1;
      resolve(c);
    };
    img.src = url;
  });
  imgCache.set(url, p);
  return p;
}

// Key for the atlas cache. Sharing an atlas between entities is the whole point.
export function charKey(c) {
  const t = c.tint || [255, 255, 255];
  return [
    c.outfit || "-",
    c.hat    || "-",
    c.weapon || "-",
    c.facial || "-",
    t[0] | 0, t[1] | 0, t[2] | 0,
  ].join("|");
}

// Build (and cache) the 8-angle atlas for a character descriptor.
// Returns { canvas, ready, tileW, tileH }.
export function getAtlas(c) {
  const key = charKey(c);
  let rec = atlasCache.get(key);
  if (rec) return rec;

  const canvas = document.createElement("canvas");
  canvas.width  = TILE * COLS;
  canvas.height = TILE;

  rec = {
    canvas,
    ready: buildAtlas(canvas, c),
    tileW: TILE,
    tileH: TILE,
  };
  atlasCache.set(key, rec);
  return rec;
}

async function buildAtlas(canvas, c) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < ANGLES.length; i++) {
    const angle = ANGLES[i];
    const tile = await composeAngle(angle, c);
    // Draw tile into atlas, scaled down to TILE×TILE.
    ctx.drawImage(tile, i * TILE, 0, TILE, TILE);
  }
  return true;
}

// Compose one angle at native 512×512 onto an offscreen canvas.
async function composeAngle(angle, c) {
  const off = document.createElement("canvas");
  off.width = SRC_SIZE; off.height = SRC_SIZE;
  const octx = off.getContext("2d");

  // 1) Base layer with RGB multiply-tint.
  const baseUrl = `${SPRITE_BASE}/BASE/BASE_${angle}.png`;
  const baseImg = await loadImage(baseUrl);
  if (baseImg && baseImg.width > 1) {
    const t = c.tint || [255, 255, 255];
    // Draw base into a temp canvas, multiply tint, restore alpha.
    const tmp = document.createElement("canvas");
    tmp.width = SRC_SIZE; tmp.height = SRC_SIZE;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(baseImg, 0, 0, SRC_SIZE, SRC_SIZE);
    tctx.globalCompositeOperation = "multiply";
    tctx.fillStyle = `rgb(${t[0]|0},${t[1]|0},${t[2]|0})`;
    tctx.fillRect(0, 0, SRC_SIZE, SRC_SIZE);
    tctx.globalCompositeOperation = "destination-in";
    tctx.drawImage(baseImg, 0, 0, SRC_SIZE, SRC_SIZE);
    tctx.globalCompositeOperation = "source-over";
    octx.drawImage(tmp, 0, 0);
  }

  // Render order (bottom to top): Base, Outfit, Weapon, Hat, Facial.
  if (c.outfit) await drawLayer(octx, `${SPRITE_BASE}/OUTFITS/OUTFITS_${c.outfit}_${angle}.png`);
  if (c.weapon) await drawLayer(octx, `${SPRITE_BASE}/WEAPONSHOLDING/WEAPONSHOLDING_${c.weapon}_${angle}.png`);
  if (c.hat)    await drawLayer(octx, `${SPRITE_BASE}/HATSHEADWEAR/HATSHEADWEAR_${c.hat}_${angle}.png`);
  if (c.facial) await drawLayer(octx, `${SPRITE_BASE}/FACIAL/FACIAL_${c.facial}_${angle}.png`);

  return off;
}

async function drawLayer(ctx, url) {
  const img = await loadImage(url);
  if (img && img.width > 1) ctx.drawImage(img, 0, 0, SRC_SIZE, SRC_SIZE);
}

// Nearest-of-8 picker from a velocity vector.
// Angle convention (matches viewer_app.py): 000 = down (south), 090 = right, 180 = up, 270 = left.
export function angleIndex(vx, vy) {
  // If stationary, keep last index (caller tracks that).
  if (vx === 0 && vy === 0) return 0;
  // atan2 with y down and 000 = south (facing forward, moves down):
  // vx=0,vy=+1 → south → 000; vx=+1,vy=0 → east → 090 … etc.
  let a = Math.atan2(vx, vy); // swap to make 0 = south
  if (a < 0) a += Math.PI * 2;
  return Math.round(a / (Math.PI / 4)) % 8;
}

// Draw a character's current angle tile from its atlas at world-space (x,y),
// with scale and optional flash tint. Call inside a translated/camera ctx.
export function drawChar(ctx, atlas, angle, x, y, scale = 1, flash = 0) {
  const sw = atlas.tileW;
  const sh = atlas.tileH;
  const dw = sw * scale;
  const dh = sh * scale;
  // Feet anchor: draw so the bottom of the tile sits at y.
  ctx.drawImage(atlas.canvas, angle * sw, 0, sw, sh, x - dw / 2, y - dh + dh * 0.1, dw, dh);
  if (flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = flash;
    ctx.drawImage(atlas.canvas, angle * sw, 0, sw, sh, x - dw / 2, y - dh + dh * 0.1, dw, dh);
    ctx.restore();
  }
}
