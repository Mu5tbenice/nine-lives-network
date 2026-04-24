// Input — keyboard + virtual touch joystick. Exposes a stable `axis` each frame.
const keys = new Set();
const edgeDown = new Set();  // keys pressed this frame (for UI confirms)

let joyActive = false;
let joyStart = { x: 0, y: 0 };
let joyCur   = { x: 0, y: 0 };
let joyId    = -1;
const JOY_RADIUS = 80;

let joyEl, joyThumbEl;

export function attachInput() {
  window.addEventListener("keydown", e => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
    const k = normalize(e.code);
    if (!keys.has(k)) edgeDown.add(k);
    keys.add(k);
  }, { passive: false });

  window.addEventListener("keyup", e => {
    keys.delete(normalize(e.code));
  });

  window.addEventListener("blur", () => keys.clear());

  // Build a touch joystick overlay, hidden until a touch starts.
  joyEl = document.createElement("div");
  joyEl.id = "sv-joystick";
  joyEl.innerHTML = `<div class="sv-joy-thumb"></div>`;
  joyEl.style.cssText = `
    position: fixed; width: 160px; height: 160px;
    border: 2px solid rgba(255,255,255,0.25);
    background: rgba(0,0,0,0.25);
    border-radius: 50%; pointer-events: none;
    display: none; z-index: 30;
    transform: translate(-50%, -50%);
  `;
  joyThumbEl = joyEl.firstElementChild;
  joyThumbEl.style.cssText = `
    position: absolute; left: 50%; top: 50%;
    width: 60px; height: 60px; border-radius: 50%;
    background: rgba(255,255,255,0.5);
    transform: translate(-50%, -50%);
  `;
  document.body.appendChild(joyEl);

  // Only activate joystick from touches that start on the left half of the screen,
  // so right-side taps (modal buttons) don't steal input.
  window.addEventListener("touchstart", e => {
    for (const t of e.changedTouches) {
      if (joyActive) continue;
      if (t.clientX > window.innerWidth / 2) continue;
      // skip touches inside modals
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && el.closest(".sv-modal, .sv-start, .sv-over")) continue;
      joyActive = true;
      joyId = t.identifier;
      joyStart = { x: t.clientX, y: t.clientY };
      joyCur   = { x: t.clientX, y: t.clientY };
      joyEl.style.left = joyStart.x + "px";
      joyEl.style.top  = joyStart.y + "px";
      joyEl.style.display = "block";
      joyThumbEl.style.left = "50%";
      joyThumbEl.style.top  = "50%";
    }
  }, { passive: true });

  window.addEventListener("touchmove", e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      joyCur = { x: t.clientX, y: t.clientY };
      let dx = joyCur.x - joyStart.x;
      let dy = joyCur.y - joyStart.y;
      const d = Math.hypot(dx, dy);
      if (d > JOY_RADIUS) { dx = dx * JOY_RADIUS / d; dy = dy * JOY_RADIUS / d; }
      joyThumbEl.style.left = `calc(50% + ${dx}px)`;
      joyThumbEl.style.top  = `calc(50% + ${dy}px)`;
    }
  }, { passive: true });

  const endTouch = e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      joyActive = false; joyId = -1;
      joyEl.style.display = "none";
    }
  };
  window.addEventListener("touchend",    endTouch, { passive: true });
  window.addEventListener("touchcancel", endTouch, { passive: true });
}

function normalize(code) {
  if (code === "KeyW" || code === "ArrowUp")    return "up";
  if (code === "KeyS" || code === "ArrowDown")  return "down";
  if (code === "KeyA" || code === "ArrowLeft")  return "left";
  if (code === "KeyD" || code === "ArrowRight") return "right";
  return code.toLowerCase();
}

export function axis() {
  let x = 0, y = 0;
  if (keys.has("left"))  x -= 1;
  if (keys.has("right")) x += 1;
  if (keys.has("up"))    y -= 1;
  if (keys.has("down"))  y += 1;
  const m = Math.hypot(x, y);
  if (m > 0) { x /= m; y /= m; }

  if (joyActive) {
    const dx = joyCur.x - joyStart.x;
    const dy = joyCur.y - joyStart.y;
    const d = Math.hypot(dx, dy);
    if (d > 10) {
      const s = Math.min(1, d / JOY_RADIUS);
      x = (dx / d) * s;
      y = (dy / d) * s;
    }
  }
  return { x, y };
}

export function wasPressed(name) {
  const had = edgeDown.has(name);
  return had;
}

// Call at the end of each frame to clear edge-trigger set.
export function endFrame() {
  edgeDown.clear();
}

export function isDown(name) { return keys.has(name); }
