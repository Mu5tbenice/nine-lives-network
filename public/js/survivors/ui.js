// UI — HUD, start screen (house picker), level-up modal, game-over modal.

import { HOUSES, PASSIVE_DEFS, WEAPON_DEFS, xpForLevel } from "./data.js";

// --- Start screen ---

const NAME_KEY = "sv.displayName";
export function getSavedName() {
  try { return (localStorage.getItem(NAME_KEY) || "").slice(0, 24); } catch { return ""; }
}
export function saveName(v) {
  try { localStorage.setItem(NAME_KEY, (v || "").trim().slice(0, 24)); } catch {}
}

export function showStartScreen(onStart) {
  const root = document.getElementById("sv-start");
  root.style.display = "flex";
  const savedName = getSavedName();

  root.innerHTML = `
    <div class="sv-start-panel">
      <h1>Nine Lives: Survive</h1>
      <p class="sv-sub">Pick a house. Survive six chapters of Nethara.</p>
      <label class="sv-name-label">
        <span>Name on the leaderboard</span>
        <input id="sv-name" class="sv-name-input" maxlength="24"
               placeholder="anon cat" value="${escapeHtml(savedName)}" autocomplete="off" />
      </label>
      <div class="sv-house-grid">
        ${HOUSES.map(h => `
          <button class="sv-house" data-id="${h.id}">
            <div class="sv-house-name">${h.name}</div>
            <div class="sv-house-tag">${h.tagline}</div>
          </button>`).join("")}
      </div>
      <div class="sv-top-runs">
        <div class="sv-top-runs-head">
          <span>Top Runs</span>
          <span id="sv-top-meta" class="sv-top-meta">loading…</span>
        </div>
        <ol class="sv-top-list" id="sv-top-list"></ol>
      </div>
      <div class="sv-help">
        <span>WASD / Arrows — move</span><span>Auto-fire</span><span>On phone: drag left side to move</span>
      </div>
    </div>
  `;

  // Fire-and-forget leaderboard fetch.
  loadTopRuns().catch(() => {
    const meta = document.getElementById("sv-top-meta");
    if (meta) meta.textContent = "offline";
  });

  root.querySelectorAll(".sv-house").forEach(btn => {
    btn.addEventListener("click", () => {
      const nameEl = document.getElementById("sv-name");
      if (nameEl) saveName(nameEl.value);
      const h = HOUSES.find(x => x.id === btn.dataset.id);
      root.style.display = "none";
      onStart(h);
    });
  });
}

async function loadTopRuns() {
  const meta = document.getElementById("sv-top-meta");
  const list = document.getElementById("sv-top-list");
  if (!list) return;
  const r = await fetch("/api/survivors/runs/top?limit=10", { cache: "no-store" });
  if (!r.ok) throw new Error("top runs fetch failed");
  const rows = await r.json();
  list.innerHTML = "";
  if (!rows.length) {
    if (meta) meta.textContent = "be first";
    list.innerHTML = `<li class="sv-top-empty">No runs yet — go set the bar.</li>`;
    return;
  }
  for (const row of rows) {
    const m = Math.floor(row.time_sec / 60), s = Math.floor(row.time_sec % 60);
    const when = friendlyDate(row.created_at);
    list.insertAdjacentHTML("beforeend", `
      <li class="sv-top-row ${row.won ? "is-win" : ""}">
        <span class="sv-top-name">${escapeHtml(row.display_name || "anon cat")}</span>
        <span class="sv-top-house">${escapeHtml(row.house)}</span>
        <span class="sv-top-time">${m}:${String(s).padStart(2,"0")}</span>
        <span class="sv-top-lv">Lv ${row.level}</span>
        <span class="sv-top-ch">Ch ${row.chapter}${row.won ? " ★" : ""}</span>
        <span class="sv-top-when">${when}</span>
      </li>
    `);
  }
  if (meta) meta.textContent = `top ${rows.length}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function friendlyDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
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

  // Boss bar
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

// --- Level-up modal ---

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
  // force reflow
  void banner.offsetWidth;
  banner.classList.add("show");
  setTimeout(() => banner.classList.remove("show"), 2600);
}

// --- Debug FPS overlay ---

export function updateFps(fps) {
  const el = document.getElementById("sv-fps");
  if (el) el.textContent = `${Math.round(fps)} fps`;
}
