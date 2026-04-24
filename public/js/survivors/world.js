// World — camera + biome background + edge vignette.
import { WORLD } from "./data.js";

let biomePattern = null;
let biomeImg = null;
let biomeUrl = null;
let loadSeq = 0;

export const camera = { x: WORLD.w / 2, y: WORLD.h / 2, zoom: 1 };

// Lerp camera toward target each frame.
export function followCamera(targetX, targetY, dt) {
  const a = Math.min(1, dt * 6);   // ~6 Hz lerp
  camera.x += (targetX - camera.x) * a;
  camera.y += (targetY - camera.y) * a;
  // clamp to world bounds
  camera.x = Math.max(0, Math.min(WORLD.w, camera.x));
  camera.y = Math.max(0, Math.min(WORLD.h, camera.y));
}

// Load biome. `urls` = [primary, fallback]. Lazy — returns a promise.
export async function loadBiome(urls) {
  const [primary, fallback] = Array.isArray(urls) ? urls : [urls];
  loadSeq++;
  const mySeq = loadSeq;

  const img = await tryLoad(primary).catch(() => null)
           || await tryLoad(fallback).catch(() => null);
  if (!img) {
    biomeImg = null; biomePattern = null; biomeUrl = null;
    return;
  }
  if (mySeq !== loadSeq) return; // a newer load superseded us

  biomeImg = img;
  biomeUrl = primary;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const cx = c.getContext("2d");
  cx.drawImage(img, 0, 0);
  const tmp = document.createElement("canvas").getContext("2d");
  biomePattern = tmp.createPattern(c, "repeat");
}

function tryLoad(url) {
  if (!url) return Promise.reject(new Error("no url"));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load fail: " + url));
    img.src = url;
  });
}

// Draw the visible world background (biome + subtle tint + vignette).
// ctx is in screen space; applies camera transform before drawing entities.
export function drawWorldBackground(ctx, canvasW, canvasH, tint) {
  // Solid fill first (so gaps don't flash black)
  ctx.fillStyle = "#0b0d11";
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (biomePattern) {
    // Align pattern so it scrolls with the camera.
    ctx.save();
    ctx.translate(-camera.x + canvasW / 2, -camera.y + canvasH / 2);
    ctx.fillStyle = biomePattern;
    // Fill a rect covering the visible world area.
    ctx.fillRect(camera.x - canvasW / 2 - 4, camera.y - canvasH / 2 - 4,
                 canvasW + 8, canvasH + 8);
    ctx.restore();

    if (tint && tint.length === 3) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.35)`;
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.restore();
    }
  }

  // Soft world-edge darkening: when camera approaches world bounds, fade to black.
  drawWorldEdgeMask(ctx, canvasW, canvasH);

  // Radial vignette
  const g = ctx.createRadialGradient(
    canvasW/2, canvasH/2, Math.min(canvasW, canvasH) * 0.35,
    canvasW/2, canvasH/2, Math.max(canvasW, canvasH) * 0.75,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvasW, canvasH);
}

function drawWorldEdgeMask(ctx, cw, ch) {
  // Where the visible rect meets world edges, darken.
  const left   = camera.x - cw / 2;
  const right  = camera.x + cw / 2;
  const top    = camera.y - ch / 2;
  const bottom = camera.y + ch / 2;
  const fade = 280; // px

  const shade = (sx, sy, sw, sh, alpha) => {
    if (alpha <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.85, alpha)})`;
    ctx.fillRect(sx, sy, sw, sh);
  };

  if (left < fade) {
    const a = (fade - left) / fade;
    shade(0, 0, (fade - left), ch, a * 0.7);
  }
  if (right > WORLD.w - fade) {
    const over = right - (WORLD.w - fade);
    const a = over / fade;
    shade(cw - over, 0, over, ch, a * 0.7);
  }
  if (top < fade) {
    const a = (fade - top) / fade;
    shade(0, 0, cw, (fade - top), a * 0.7);
  }
  if (bottom > WORLD.h - fade) {
    const over = bottom - (WORLD.h - fade);
    const a = over / fade;
    shade(0, ch - over, cw, over, a * 0.7);
  }
}

// Convert world → screen, given current camera and canvas center.
export function worldToScreen(x, y, cw, ch) {
  return { x: x - camera.x + cw / 2, y: y - camera.y + ch / 2 };
}

// Bound an entity to the world. Returns true if it bumped the edge.
export function clampToWorld(e, pad = 24) {
  let hit = false;
  if (e.x < pad) { e.x = pad; hit = true; }
  if (e.y < pad) { e.y = pad; hit = true; }
  if (e.x > WORLD.w - pad) { e.x = WORLD.w - pad; hit = true; }
  if (e.y > WORLD.h - pad) { e.y = WORLD.h - pad; hit = true; }
  return hit;
}
