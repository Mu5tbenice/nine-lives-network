// UI — HUD, start screen (auth → 9-house picker → 2-card draft), level-up
// modal, game-over modal.
//
// The start screen is rendered as a 3-step flow inside #sv-start:
//   1. BLOCKED  → "open your starter packs" CTA when collection < 2
//   2. HOUSE    → 3×3 picker of all 9 houses (canonical .house-btn style)
//   3. DRAFT    → collection grid via the canonical buildCardV4 (window.*)
//
// On confirm: onStart({ house, draftedCardIds }) is invoked and the screen
// hides. main.js owns the run lifecycle from there.
//
// PR-B (Survivors Mode v2). PRD: tasks/prd-survivors-mode.md §4.1, §6.

import { HOUSES, PASSIVE_DEFS, WEAPON_DEFS, xpForLevel } from "./data.js";

// --- Player auth (canonical 9LN pattern) ---

function getPlayerId() {
  try {
    const url = new URLSearchParams(window.location.search);
    const fromQuery = url.get("player_id");
    if (fromQuery) {
      localStorage.setItem("player_id", fromQuery);
      return parseInt(fromQuery, 10) || null;
    }
    const stored = localStorage.getItem("player_id");
    return stored ? parseInt(stored, 10) || null : null;
  } catch {
    return null;
  }
}

const NAME_KEY = "sv.displayName";
export function getSavedName() {
  try { return (localStorage.getItem(NAME_KEY) || "").slice(0, 24); } catch { return ""; }
}
export function saveName(v) {
  try { localStorage.setItem(NAME_KEY, (v || "").trim().slice(0, 24)); } catch {}
}

// --- Start screen entry point ---
//
// onStart receives `{ house, draftedCardIds }`. `house` is the matching entry
// from data.js HOUSES (so the engine's outfit/hat/weapon/tint/startingWeapon
// mapping still works). `draftedCardIds` is an array of two `player_cards.id`s
// that the run-end POST sends as `drafted_card_ids`.

export function showStartScreen(onStart) {
  const root = document.getElementById("sv-start");
  root.style.display = "flex";

  const playerId = getPlayerId();
  if (!playerId) {
    renderNoAuth(root);
    return;
  }

  // Loading state while we fetch the player's collection + house catalogue.
  root.innerHTML = `
    <div class="sv-start-panel">
      <h1>Nine Lives: Survive</h1>
      <p class="sv-sub">Loading your collection…</p>
    </div>
  `;

  fetch(`/api/survivors/start?player_id=${encodeURIComponent(playerId)}`, {
    cache: "no-store",
  })
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`start ${r.status}`)))
    .then(data => {
      if (!data.canPlay && data.blockReason === "insufficient_collection") {
        renderBlocked(root, data);
        return;
      }
      renderHousePicker(root, data, onStart);
    })
    .catch(err => {
      console.warn("[survivors] /start fetch failed:", err && err.message);
      renderError(root, err && err.message);
    });
}

// --- Step 0: no auth ---

function renderNoAuth(root) {
  root.innerHTML = `
    <div class="sv-start-panel">
      <h1>Nine Lives: Survive</h1>
      <p class="sv-sub">Sign in to play. Survivors uses your card collection, so it needs a registered Nine.</p>
      <a class="sv-btn" href="/" style="display:inline-block;text-decoration:none;text-align:center;">Sign In</a>
    </div>
  `;
}

function renderError(root, msg) {
  root.innerHTML = `
    <div class="sv-start-panel">
      <h1>Nine Lives: Survive</h1>
      <p class="sv-sub">Couldn't load your collection${msg ? ` (${escapeHtml(msg)})` : ""}.</p>
      <button class="sv-btn" id="sv-retry">Retry</button>
    </div>
  `;
  document.getElementById("sv-retry")?.addEventListener("click", () => {
    showStartScreen(window.__svOnStart || (() => {}));
  });
}

// --- Step 1: blocked (collection < 2) ---

function renderBlocked(root, data) {
  const have = (data.cards || []).length;
  const need = data.min_collection_size || 2;
  root.innerHTML = `
    <div class="sv-start-panel">
      <h1>Nine Lives: Survive</h1>
      <p class="sv-sub">Survivors uses your card collection. You need at least ${need} cards to draft a starting build.</p>
      <p class="sv-sub" style="margin-top:0">You have <b>${have}</b> ${have === 1 ? "card" : "cards"} so far.</p>
      <a class="sv-btn" href="/packs.html" style="display:inline-block;text-decoration:none;text-align:center;">Open Your Packs</a>
    </div>
  `;
}

// --- Step 2: house picker ---

function renderHousePicker(root, data, onStart) {
  const houses = data.houses || [];
  root.innerHTML = `
    <div class="sv-start-panel">
      <h1>Pick a House</h1>
      <p class="sv-sub">Each house brings a different feel. Cross-house play is allowed — your draft pulls from the cards you actually own.</p>
      <div class="house-grid" id="sv-house-grid"></div>
      <div class="sv-help" style="justify-content:flex-start">
        <span>Step 1 of 2 — house</span>
      </div>
    </div>
  `;

  const grid = document.getElementById("sv-house-grid");
  for (const h of houses) {
    grid.appendChild(buildHouseBtn(h));
  }

  grid.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".house-btn");
    if (!btn) return;
    const id = btn.dataset.id;
    const houseUI = houses.find(h => h.id === id);
    const houseEngine = HOUSES.find(h => h.id === id);
    if (!houseUI || !houseEngine) return;
    renderDraftPicker(root, data, houseUI, houseEngine, onStart);
  });
}

function buildHouseBtn(h) {
  // Mirrors the register.html .house-btn structure with stat bars.
  const wrap = document.createElement("div");
  wrap.className = "house-btn";
  wrap.dataset.id = h.id;
  wrap.style.borderColor = h.color;
  wrap.style.background = `${h.color}10`;
  wrap.style.boxShadow = `0 0 18px ${h.color}28, inset 0 0 30px ${h.color}06`;
  wrap.style.padding = "14px 8px 10px";
  wrap.style.position = "relative";

  const stats = h.base || {};
  const max = 9; // soft normalization for the bars (matches register.html feel)
  const row = (label, val, hue) => `
    <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">
      <span style="font-family:var(--font-data,monospace);font-size:9px;width:28px;text-align:right;opacity:0.8;">${label}</span>
      <div style="flex:1;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
        <div style="height:100%;border-radius:2px;width:${Math.min(100, (val / max) * 100)}%;background:${hue};"></div>
      </div>
      <span style="font-family:var(--font-data,monospace);font-size:11px;width:14px;text-align:right;font-weight:700;">${val}</span>
    </div>
  `;

  wrap.innerHTML = `
    <img src="${h.img}" onerror="this.style.display='none'"
         style="width:44px;height:44px;object-fit:contain;margin:0 auto 6px;display:block;filter:drop-shadow(0 0 8px ${h.color}60);" />
    <div class="house-name-${h.id}" style="color:${h.color};letter-spacing:1px;margin-bottom:2px;text-transform:uppercase;font-size:13px;font-weight:700;">${escapeHtml(h.name)}</div>
    <div style="font-family:var(--font-data,monospace);font-size:9px;color:var(--text-muted,#9aa7b5);margin-bottom:6px;letter-spacing:0.5px;">${escapeHtml(h.role || "")}</div>
    <div style="padding:0 1px;">
      ${row("ATK", stats.atk ?? 0, "#e85a6a")}
      ${row("HP",  stats.hp  ?? 0, "#5cb338")}
      ${row("SPD", stats.spd ?? 0, "#5b8fe0")}
      ${row("DEF", stats.def ?? 0, "#9aa7b5")}
      ${row("LCK", stats.luck ?? 0, "#ffc800")}
    </div>
    <div style="font-family:var(--font-data,monospace);font-size:9px;color:var(--text-faint,#6a7686);margin-top:6px;">${escapeHtml(h.passive_hint || "")}</div>
  `;
  return wrap;
}

// --- Step 3: 2-card draft (canonical buildCardV4) ---

function renderDraftPicker(root, data, houseUI, houseEngine, onStart) {
  const cards = data.cards || [];
  const draftSize = data.draft_size || 2;
  const picked = new Set(); // player_card.id values

  root.innerHTML = `
    <div class="sv-start-panel sv-draft-wrap">
      <h1>Draft 2 Cards</h1>
      <p class="sv-sub">Pick two from your collection. They start active when the run begins.</p>
      <div class="sv-draft-grid" id="sv-draft-grid"></div>
      <div class="sv-draft-summary">
        <button class="sv-back-btn" id="sv-back">← Back to houses</button>
        <span class="sv-draft-counter" id="sv-draft-counter">0 / ${draftSize} picked</span>
        <button class="sv-begin-btn" id="sv-begin" disabled>Begin Run</button>
      </div>
    </div>
  `;

  const grid = document.getElementById("sv-draft-grid");
  const counter = document.getElementById("sv-draft-counter");
  const beginBtn = document.getElementById("sv-begin");

  // Render each owned card via the canonical buildCardV4. Falls back to a
  // simple text-only tile if buildCardV4 isn't available (e.g. script load
  // race) so the player isn't soft-locked.
  const builder = (typeof window !== "undefined" && window.buildCardV4) || null;

  for (const c of cards) {
    const wrap = document.createElement("div");
    wrap.className = "sv-draft-card";
    wrap.dataset.id = String(c.id);

    const spell = c.spell || {};
    const cardObj = {
      name: spell.name || "Unknown",
      house: spell.house || houseUI.id,
      spell_type: spell.spell_type || "attack",
      rarity: c.rarity || "common",
      base_atk: spell.base_atk || 0,
      base_hp:  spell.base_hp  || 0,
      base_spd: spell.base_spd || 0,
      base_def: spell.base_def || 0,
      base_luck: spell.base_luck || 0,
      base_effect: spell.base_effect || "",
      effect_1:    spell.effect_1    || "",
      bonus_effects: spell.bonus_effects || [],
      flavor_text: spell.flavor_text || "",
      image_url: spell.image_url || "",
      sharpness: c.sharpness ?? 100,
    };

    if (builder) {
      wrap.innerHTML = builder(cardObj, { size: "mini" });
    } else {
      // Fallback when card-v4.js isn't loaded — minimal but selectable.
      wrap.innerHTML = `
        <div class="spell-card sc-mini-card" style="--hc:${escapeHtml(houseUI.color)};">
          <div class="sc-body" style="padding:14px;">
            <div class="sc-name">${escapeHtml(cardObj.name)}</div>
            <div class="sc-type-row"><span class="sc-type">${escapeHtml(cardObj.spell_type)}</span><span class="sc-rarity">${escapeHtml(cardObj.rarity)}</span></div>
          </div>
        </div>
      `;
    }
    grid.appendChild(wrap);
  }

  // Re-init card-v4 effects (foil, particles, etc.) after insertion.
  if (typeof window !== "undefined" && typeof window.initCards === "function") {
    try { window.initCards(grid); } catch {}
  }

  function refreshSummary() {
    counter.textContent = `${picked.size} / ${draftSize} picked`;
    beginBtn.disabled = picked.size !== draftSize;
    // Dim non-picked cards once the player hits the cap so the choice reads
    // as locked but reversible.
    const atCap = picked.size >= draftSize;
    grid.querySelectorAll(".sv-draft-card").forEach(el => {
      const id = parseInt(el.dataset.id, 10);
      const isPicked = picked.has(id);
      el.classList.toggle("is-picked", isPicked);
      el.classList.toggle("is-disabled", atCap && !isPicked);
    });
  }

  grid.addEventListener("click", (ev) => {
    const tile = ev.target.closest(".sv-draft-card");
    if (!tile) return;
    const id = parseInt(tile.dataset.id, 10);
    if (picked.has(id)) {
      picked.delete(id);
    } else if (picked.size < draftSize) {
      picked.add(id);
    }
    refreshSummary();
  });

  document.getElementById("sv-back").addEventListener("click", () => {
    renderHousePicker(root, data, onStart);
  });

  beginBtn.addEventListener("click", () => {
    if (picked.size !== draftSize) return;
    const draftedCardIds = Array.from(picked);
    root.style.display = "none";
    onStart({ house: houseEngine, draftedCardIds });
  });

  refreshSummary();
}

// --- Helpers ---

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// --- HUD ---

export function updateHUD(player, chapter, runTimeSec, chapterElapsed, boss) {
  const hp = document.getElementById("sv-hp-fill");
  const hpText = document.getElementById("sv-hp-text");
  const xp = document.getElementById("sv-xp-fill");
  const xpText = document.getElementById("sv-xp-text");
  const timer = document.getElementById("sv-timer");
  const chapLbl = document.getElementById("sv-chapter");
  const gold = document.getElementById("sv-gold");
  const weaps = document.getElementById("sv-weapons");
  const pass = document.getElementById("sv-passives");
  const kills = document.getElementById("sv-kills");

  if (hp && hpText) {
    hp.style.width = `${Math.max(0, player.hp / player.hpMax) * 100}%`;
    hpText.textContent = `${Math.max(0, Math.round(player.hp))} / ${player.hpMax}`;
  }
  if (xp && xpText) {
    const need = xpForLevel(player.level);
    xp.style.width = `${Math.min(1, player.xp / need) * 100}%`;
    xpText.textContent = `Lv ${player.level}  ·  ${Math.floor(player.xp)} / ${need}`;
  }
  if (timer) {
    const m = Math.floor(runTimeSec / 60), s = Math.floor(runTimeSec % 60);
    timer.textContent = `${m}:${String(s).padStart(2, "0")}`;
  }
  if (chapLbl) {
    const secsInChapter = Math.max(0, chapter.durationSec - chapterElapsed);
    const mm = Math.floor(secsInChapter / 60), ss = Math.floor(secsInChapter % 60);
    chapLbl.textContent = `Chapter ${chapter.id} — ${chapter.name}  ·  ${mm}:${String(ss).padStart(2,"0")}`;
  }
  if (gold) gold.textContent = `★ ${player.gold}`;
  if (kills) kills.textContent = `☠ ${player.kills}`;

  if (weaps) {
    weaps.innerHTML = player.weapons.map(w => {
      const def = WEAPON_DEFS[w.id];
      if (!def) return "";
      return `<div class="sv-icon" title="${def.name} Lv ${w.level}">
        <img src="${def.art}" alt="">
        <span class="sv-lv">${w.level}</span>
      </div>`;
    }).join("");
  }
  if (pass) {
    pass.innerHTML = Object.entries(player.passives).map(([id, lv]) => {
      const def = PASSIVE_DEFS[id];
      if (!def) return "";
      return `<div class="sv-passive" title="${def.name} Lv ${lv}">${def.symbol}<span>${lv}</span></div>`;
    }).join("");
  }

  const bossBar = document.getElementById("sv-boss");
  if (bossBar) {
    if (boss) {
      bossBar.style.display = "flex";
      bossBar.querySelector(".sv-boss-name").textContent = boss.name || "Boss";
      bossBar.querySelector(".sv-boss-fill").style.width = `${(boss.hp / boss.hpMax) * 100}%`;
    } else {
      bossBar.style.display = "none";
    }
  }
}

// --- Level-up modal (PR-C will rewrite this to use buildCardV4) ---

export function showLevelUp(offers, onPick) {
  const modal = document.getElementById("sv-modal");
  modal.style.display = "flex";
  modal.innerHTML = `
    <div class="sv-card-panel">
      <div class="sv-card-head">Level Up!</div>
      <div class="sv-cards">
        ${offers.map((o, i) => `
          <button class="sv-card ${o.isNew ? "is-new" : ""}" data-i="${i}">
            <div class="sv-card-art">
              ${o.kind === "weapon"
                ? `<img src="${o.art}" alt="" />`
                : `<div class="sv-card-symbol">${o.symbol || "◈"}</div>`}
            </div>
            <div class="sv-card-name">${o.name}</div>
            <div class="sv-card-text">${o.text}</div>
            ${o.isNew ? `<div class="sv-new-tag">NEW</div>` : ""}
          </button>
        `).join("")}
      </div>
    </div>
  `;
  modal.querySelectorAll(".sv-card").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.i, 10);
      modal.style.display = "none";
      modal.innerHTML = "";
      onPick(offers[i]);
    });
  });
}

// --- Game-over modal ---

export function showGameOver(summary, onRestart) {
  const over = document.getElementById("sv-over");
  over.style.display = "flex";
  const m = Math.floor(summary.timeSec / 60), s = Math.floor(summary.timeSec % 60);
  over.innerHTML = `
    <div class="sv-over-panel">
      <h2>${summary.won ? "The Nine Prevail" : "A Life Claimed"}</h2>
      <div class="sv-stats">
        <div><span>Time</span><b>${m}:${String(s).padStart(2,"0")}</b></div>
        <div><span>Level</span><b>${summary.level}</b></div>
        <div><span>Kills</span><b>${summary.kills}</b></div>
        <div><span>Chapter</span><b>${summary.chapter}</b></div>
      </div>
      <button class="sv-btn" id="sv-restart">Run Again</button>
    </div>
  `;
  document.getElementById("sv-restart").addEventListener("click", () => {
    over.style.display = "none";
    over.innerHTML = "";
    onRestart();
  });
}

// --- Chapter cross-fade ---

export function playChapterBanner(name) {
  const banner = document.getElementById("sv-banner");
  if (!banner) return;
  banner.textContent = name;
  banner.classList.remove("show");
  void banner.offsetWidth;
  banner.classList.add("show");
  setTimeout(() => banner.classList.remove("show"), 2600);
}

// --- Debug FPS overlay ---

export function updateFps(fps) {
  const el = document.getElementById("sv-fps");
  if (el) el.textContent = `${Math.round(fps)} fps`;
}
