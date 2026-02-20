/* ═══════════════════════════════════════════════════════════
   card-particles.js — House particle effects for spell cards
   Nine Lives Network — v4.2

   This file provides THREE functions that pages use:

   1. initSpellCard(cardElement)  — sets up ONE card (particles + foil)
   2. initAllSpellCards()         — sets up ALL cards on the page
   3. initParticles(canvas, type, color) — low-level canvas drawing

   The existing pages call initSpellCard() and initAllSpellCards().
   The new card-v4.js calls initParticles() via initCards().
   Both patterns work.
   ═══════════════════════════════════════════════════════════ */

/* ─── initSpellCard(cardEl) ───
   Called by every page's render() function.
   Reads data attributes from the card div, sets up particles + foil.
*/
function initSpellCard(cardEl) {
  if (!cardEl) return;

  // ── Particles ──
  var canvas = cardEl.querySelector('canvas.sc-particles');
  if (canvas && !canvas._particlesInit) {
    canvas._particlesInit = true;
    var pType = cardEl.dataset.particle || 'mote';
    var color = cardEl.dataset.color || cardEl.dataset.glow || '#D4A64B';
    initParticles(canvas, pType, color);
  }

  // ── Foil mouse-follow ──
  if (!cardEl._foilInit) {
    cardEl._foilInit = true;
    cardEl.addEventListener('mousemove', function(e) {
      var r = cardEl.getBoundingClientRect();
      var mx = (e.clientX - r.left) / r.width;
      var my = (e.clientY - r.top) / r.height;
      var angle = 135 + (mx - 0.5) * 60 + (my - 0.5) * 40;

      var foil = cardEl.querySelector('.sc-foil');
      var rainbow = cardEl.querySelector('.sc-rainbow');
      var glow = cardEl.querySelector('.sc-glow');
      var border = cardEl.querySelector('.sc-border');
      var foilMult = parseFloat(cardEl.style.getPropertyValue('--foil-mult')) || 0;

      if (foil) {
        foil.style.background = 'linear-gradient(' + angle + 'deg,transparent 0%,rgba(255,255,255,0) 20%,rgba(255,255,255,' + (foilMult * 0.2) + ') 40%,rgba(255,230,180,' + (foilMult * 0.14) + ') 50%,rgba(255,255,255,' + (foilMult * 0.2) + ') 60%,rgba(255,255,255,0) 80%,transparent 100%)';
      }
      if (rainbow) {
        rainbow.style.background = 'linear-gradient(' + angle + 'deg,transparent 10%,rgba(255,50,50,' + (foilMult * 0.07) + ') 22%,rgba(255,165,0,' + (foilMult * 0.07) + ') 30%,rgba(255,255,0,' + (foilMult * 0.07) + ') 38%,rgba(0,255,120,' + (foilMult * 0.07) + ') 46%,rgba(0,180,255,' + (foilMult * 0.07) + ') 54%,rgba(128,0,255,' + (foilMult * 0.07) + ') 62%,rgba(255,0,180,' + (foilMult * 0.07) + ') 70%,transparent 85%)';
      }
      if (glow) {
        var hc = cardEl.dataset.color || '#D4A64B';
        glow.style.background = 'radial-gradient(circle at ' + (mx * 100) + '% ' + (my * 100) + '%,' + hc + '1a,transparent 45%)';
      }
      if (border) {
        var hc2 = cardEl.dataset.color || '#D4A64B';
        var isLeg = cardEl.classList.contains('spell-card--legendary');
        border.style.background = isLeg
          ? 'conic-gradient(from ' + angle + 'deg,transparent,' + hc2 + ',#FFD700,' + hc2 + ',transparent)'
          : 'conic-gradient(from ' + angle + 'deg,transparent,' + hc2 + ' 8%,transparent 16%)';
      }
    });
  }
}

/* ─── initAllSpellCards() ───
   Convenience: init every .spell-card on the page.
*/
function initAllSpellCards() {
  document.querySelectorAll('.spell-card').forEach(function(c) {
    initSpellCard(c);
  });
}

/* ─── initParticles(canvas, type, color) ───
   Low-level canvas particle drawing.
   Called by initSpellCard above, and also by card-v4.js initCards().
*/
function initParticles(canvas, type, color) {
  if (!canvas || !canvas.getContext) return;
  if (!color || typeof color !== 'string' || color.length < 4) return;

  var ctx = canvas.getContext('2d');
  var parent = canvas.parentElement;
  var W = parent ? parent.offsetWidth : 240;
  var H = parent ? parent.offsetHeight : 380;
  if (W === 0 || H === 0) return;
  canvas.width = W;
  canvas.height = H;

  var cr = parseInt(color.slice(1, 3), 16) || 200;
  var cg = parseInt(color.slice(3, 5), 16) || 180;
  var cb = parseInt(color.slice(5, 7), 16) || 100;

  // Particle count based on rarity
  var card = canvas.closest('.spell-card');
  var rarity = card ? (card.dataset.rarity || 'common') : 'common';
  var countMap = { common: 0, basic: 0, uncommon: 5, rare: 8, epic: 12, legendary: 18 };
  var count = countMap[rarity] || 6;
  if (count === 0) return;

  var pts = [];
  var tick = 0;
  var raf;

  // Normalize old type names to new ones for drawing
  var drawType = type;
  var typeMap = { rain: 'bubble', spark: 'lightning', wind: 'leaf', shadow: 'wisp', arcane: 'rune', toxic: 'spore', light: 'mote', stardust: 'mote' };
  if (typeMap[type]) drawType = typeMap[type];

  function makePt() {
    switch (drawType) {
      case 'ember':
        return { x: Math.random() * W, y: H + Math.random() * 20, r: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 0.6, vy: -(Math.random() * 1.2 + 0.4), phase: Math.random() * Math.PI * 2 };
      case 'bubble':
        return { x: Math.random() * W, y: H + Math.random() * 30, rd: Math.random() * 3 + 1.5, vy: -(Math.random() * 0.5 + 0.2), phase: Math.random() * Math.PI * 2 };
      case 'lightning':
        return { x: Math.random() * W, y: Math.random() * H, len: Math.random() * 18 + 6, angle: Math.random() * Math.PI * 2, a: 0, maxA: Math.random() * 0.8 + 0.2, timer: Math.random() * 120, cooldown: Math.random() * 80 + 30, branches: Math.floor(Math.random() * 3) + 1 };
      case 'leaf':
        return { x: Math.random() * W, y: -Math.random() * 20, rd: Math.random() * 4 + 2.5, vx: Math.random() * 0.3 + 0.1, vy: Math.random() * 0.4 + 0.2, a: Math.random() * 0.4 + 0.3, phase: Math.random() * Math.PI * 2, spin: Math.random() * 0.03 + 0.01 };
      case 'wisp':
        return { cx: W * 0.3 + Math.random() * W * 0.4, cy: H * 0.3 + Math.random() * H * 0.4, radius: Math.random() * 40 + 15, angle: Math.random() * Math.PI * 2, speed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1), rd: Math.random() * 2 + 0.5, a: Math.random() * 0.4 + 0.1, trail: [] };
      case 'rune':
        return { x: Math.random() * W, y: Math.random() * H, maxA: Math.random() * 0.6 + 0.25, timer: Math.random() * 80, duration: Math.random() * 60 + 40, cooldown: Math.random() * 50 + 20, size: Math.random() * 10 + 5, glyph: Math.floor(Math.random() * 6) };
      case 'spore':
        return { x: Math.random() * W, y: H + Math.random() * 20, rd: Math.random() * 2 + 1, vx: (Math.random() - 0.5) * 0.4, vy: -(Math.random() * 0.6 + 0.15), a: Math.random() * 0.4 + 0.1, phase: Math.random() * Math.PI * 2, expand: Math.random() * 0.008 + 0.002, maxR: Math.random() * 4 + 2 };
      case 'petal':
        return { x: Math.random() * W, y: -Math.random() * 20, rd: Math.random() * 3 + 1.2, vx: (Math.random() - 0.5) * 0.2, vy: Math.random() * 0.4 + 0.15, a: Math.random() * 0.35 + 0.25, rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.02 };
      default:
        return { x: Math.random() * W, y: Math.random() * H, rd: Math.random() * 2 + 0.8, vx: (Math.random() - 0.5) * 0.15, vy: -(Math.random() * 0.3 + 0.05), phase: Math.random() * Math.PI * 2, pulse: Math.random() * 0.02 + 0.01 };
    }
  }

  for (var i = 0; i < count; i++) pts.push(makePt());

  function draw() {
    ctx.clearRect(0, 0, W, H);
    tick++;

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];

      switch (drawType) {
        case 'ember':
          p.x += p.vx + Math.sin(p.phase) * 0.3; p.y += p.vy; p.phase += 0.04;
          var fl = 0.5 + Math.sin(tick * 0.2 + p.phase) * 0.5;
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
          var gd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
          gd.addColorStop(0, 'rgba(255,200,50,' + (fl * 0.6) + ')');
          gd.addColorStop(0.4, 'rgba(255,100,20,' + (fl * 0.35) + ')');
          gd.addColorStop(1, 'rgba(255,50,0,0)');
          ctx.fillStyle = gd;
          ctx.fillRect(p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,240,200,' + (fl * 0.7) + ')'; ctx.fill();
          break;

        case 'bubble':
          p.x += Math.sin(p.phase) * 0.3; p.y += p.vy; p.phase += 0.02;
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; p.rd = Math.random() * 3 + 1.5; }
          ctx.beginPath(); ctx.arc(p.x, p.y, p.rd, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
          ctx.beginPath(); ctx.arc(p.x - p.rd * 0.3, p.y - p.rd * 0.3, p.rd * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200,240,255,0.3)'; ctx.fill();
          break;

        case 'lightning':
          p.timer--;
          if (p.timer <= 0) { p.a = p.maxA; p.timer = p.cooldown; p.x = Math.random() * W; p.y = Math.random() * H; p.angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; }
          if (p.a > 0) {
            ctx.strokeStyle = 'rgba(255,255,100,' + p.a + ')'; ctx.lineWidth = 1.5;
            ctx.shadowColor = 'rgba(255,255,150,0.5)'; ctx.shadowBlur = 6;
            var bx = p.x, by = p.y;
            ctx.beginPath(); ctx.moveTo(bx, by);
            for (var s = 0; s < p.branches + 2; s++) {
              bx += Math.cos(p.angle) * p.len / (p.branches + 2) + (Math.random() - 0.5) * 6;
              by += Math.sin(p.angle) * p.len / (p.branches + 2) + (Math.random() - 0.5) * 4;
              ctx.lineTo(bx, by);
            }
            ctx.stroke(); ctx.shadowBlur = 0;
            p.a *= 0.8; if (p.a < 0.02) p.a = 0;
          }
          break;

        case 'leaf':
          p.x += p.vx + Math.sin(p.phase) * 0.4; p.y += p.vy; p.phase += p.spin;
          if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
          ctx.save(); ctx.translate(p.x, p.y);
          ctx.rotate(Math.sin(p.phase) * 0.5);
          ctx.scale(1, 0.5 + Math.abs(Math.sin(p.phase)) * 0.5);
          ctx.beginPath(); ctx.ellipse(0, 0, p.rd, p.rd * 0.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + p.a + ')'; ctx.fill();
          ctx.restore();
          break;

        case 'wisp':
          p.angle += p.speed;
          var wx = p.cx + Math.cos(p.angle) * p.radius;
          var wy = p.cy + Math.sin(p.angle) * p.radius * 0.6;
          p.trail.push({ x: wx, y: wy, a: p.a });
          if (p.trail.length > 8) p.trail.shift();
          for (var t = 0; t < p.trail.length; t++) {
            var pt = p.trail[t];
            var fade = (t / p.trail.length) * pt.a;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, p.rd * (0.3 + t / p.trail.length * 0.7), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (fade * 0.5) + ')'; ctx.fill();
          }
          var wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, p.rd * 2.5);
          wg.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + p.a + ')');
          wg.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
          ctx.fillStyle = wg; ctx.fillRect(wx - p.rd * 2.5, wy - p.rd * 2.5, p.rd * 5, p.rd * 5);
          break;

        case 'rune':
          var gl = ['\u25C6', '\u2726', '\u2B21', '\u25B3', '\u263D', '\u2295'];
          p.timer--;
          if (p.timer <= 0) { p.timer = p.duration + p.cooldown; p.x = 10 + Math.random() * (W - 20); p.y = 10 + Math.random() * (H - 20); p.glyph = Math.floor(Math.random() * gl.length); }
          if (p.timer > p.cooldown) {
            var pr2 = (p.timer - p.cooldown) / p.duration;
            var fa = pr2 < 0.2 ? pr2 / 0.2 : pr2 > 0.7 ? (1 - pr2) / 0.3 : 1;
            ctx.font = p.size + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (fa * p.maxA) + ')';
            ctx.shadowColor = 'rgba(' + cr + ',' + cg + ',' + cb + ',0.4)'; ctx.shadowBlur = 8;
            ctx.fillText(gl[p.glyph], p.x, p.y); ctx.shadowBlur = 0;
          }
          break;

        case 'spore':
          p.x += p.vx + Math.sin(p.phase) * 0.2; p.y += p.vy; p.phase += 0.025;
          p.rd = Math.min(p.rd + p.expand, p.maxR); p.a *= 0.998;
          if (p.y < -10 || p.a < 0.02) { p.y = H + 10; p.x = Math.random() * W; p.rd = Math.random() * 2 + 1; p.a = Math.random() * 0.4 + 0.1; }
          var sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rd * 2);
          sg.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (p.a * 0.6) + ')');
          sg.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
          ctx.fillStyle = sg; ctx.fillRect(p.x - p.rd * 2, p.y - p.rd * 2, p.rd * 4, p.rd * 4);
          break;

        case 'petal':
          p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed;
          if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + p.a + ')';
          ctx.beginPath(); ctx.moveTo(-p.rd, 0); ctx.lineTo(0, -p.rd * 0.7);
          ctx.lineTo(p.rd, p.rd * 0.3); ctx.lineTo(-p.rd * 0.3, p.rd * 0.6);
          ctx.closePath(); ctx.fill(); ctx.restore();
          break;

        default:
          p.x += p.vx; p.y += p.vy; p.phase += p.pulse;
          var ma = 0.35 + Math.sin(p.phase) * 0.35;
          if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
          var mg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rd * 4);
          mg.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + ma + ')');
          mg.addColorStop(0.4, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (ma * 0.4) + ')');
          mg.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
          ctx.fillStyle = mg; ctx.fillRect(p.x - p.rd * 4, p.y - p.rd * 4, p.rd * 8, p.rd * 8);
          break;
      }
    }
    raf = requestAnimationFrame(draw);
  }

  draw();
  canvas._stopParticles = function() { cancelAnimationFrame(raf); };
}