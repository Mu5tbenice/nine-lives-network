/* ═══════════════════════════════════════════════════════════
   card-particles.js — House particle effects for spell cards
   Nine Lives Network

   Called by card-v4.js via: initParticles(canvas, type, color)
   Types: ember, bubble, lightning, leaf, wisp, mote, rune, spore, petal
   ═══════════════════════════════════════════════════════════ */

function initParticles(canvas, type, color) {
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.parentElement ? canvas.parentElement.offsetWidth : 240;
  var H = canvas.parentElement ? canvas.parentElement.offsetHeight : 380;
  canvas.width = W;
  canvas.height = H;

  var r = parseInt(color.slice(1, 3), 16) || 200;
  var g = parseInt(color.slice(3, 5), 16) || 180;
  var b = parseInt(color.slice(5, 7), 16) || 100;

  // Particle count based on card rarity (read from data attribute)
  var card = canvas.closest('.spell-card');
  var rarity = card ? card.dataset.rarity : 'common';
  var countMap = { common: 0, uncommon: 5, rare: 8, epic: 12, legendary: 18 };
  var count = countMap[rarity] || 0;
  if (count === 0) return; // No particles for common

  var pts = [];
  var tick = 0;
  var raf;

  // Initialize particles based on type
  function initPts() {
    pts = [];
    for (var i = 0; i < count; i++) {
      switch (type) {
        case 'ember':
          pts.push({ x: Math.random() * W, y: H + Math.random() * 20, r: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 0.6, vy: -(Math.random() * 1.2 + 0.4), phase: Math.random() * Math.PI * 2 });
          break;
        case 'bubble':
          pts.push({ x: Math.random() * W, y: H + Math.random() * 30, rd: Math.random() * 3 + 1.5, vy: -(Math.random() * 0.5 + 0.2), phase: Math.random() * Math.PI * 2 });
          break;
        case 'lightning':
          pts.push({ x: Math.random() * W, y: Math.random() * H, len: Math.random() * 18 + 6, angle: Math.random() * Math.PI * 2, a: 0, maxA: Math.random() * 0.8 + 0.2, timer: Math.random() * 120, cooldown: Math.random() * 80 + 30, branches: Math.floor(Math.random() * 3) + 1 });
          break;
        case 'leaf':
          pts.push({ x: Math.random() * W, y: -Math.random() * 20, rd: Math.random() * 4 + 2.5, vx: Math.random() * 0.3 + 0.1, vy: Math.random() * 0.4 + 0.2, a: Math.random() * 0.4 + 0.3, phase: Math.random() * Math.PI * 2, spin: Math.random() * 0.03 + 0.01 });
          break;
        case 'wisp':
          pts.push({ cx: W * 0.3 + Math.random() * W * 0.4, cy: H * 0.3 + Math.random() * H * 0.4, radius: Math.random() * 40 + 15, angle: Math.random() * Math.PI * 2, speed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1), rd: Math.random() * 2 + 0.5, a: Math.random() * 0.4 + 0.1, trail: [] });
          break;
        case 'rune':
          pts.push({ x: Math.random() * W, y: Math.random() * H, maxA: Math.random() * 0.6 + 0.25, timer: Math.random() * 80, duration: Math.random() * 60 + 40, cooldown: Math.random() * 50 + 20, size: Math.random() * 10 + 5, glyph: Math.floor(Math.random() * 6) });
          break;
        case 'spore':
          pts.push({ x: Math.random() * W, y: H + Math.random() * 20, rd: Math.random() * 2 + 1, vx: (Math.random() - 0.5) * 0.4, vy: -(Math.random() * 0.6 + 0.15), a: Math.random() * 0.4 + 0.1, phase: Math.random() * Math.PI * 2, expand: Math.random() * 0.008 + 0.002, maxR: Math.random() * 4 + 2 });
          break;
        case 'petal':
          pts.push({ x: Math.random() * W, y: -Math.random() * 20, rd: Math.random() * 3 + 1.2, vx: (Math.random() - 0.5) * 0.2, vy: Math.random() * 0.4 + 0.15, a: Math.random() * 0.35 + 0.25, rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.02 });
          break;
        default: // mote
          pts.push({ x: Math.random() * W, y: Math.random() * H, rd: Math.random() * 2 + 0.8, vx: (Math.random() - 0.5) * 0.15, vy: -(Math.random() * 0.3 + 0.05), phase: Math.random() * Math.PI * 2, pulse: Math.random() * 0.02 + 0.01 });
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    tick++;

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];

      switch (type) {
        case 'ember':
          p.x += p.vx + Math.sin(p.phase) * 0.3;
          p.y += p.vy;
          p.phase += 0.04;
          var fl = 0.5 + Math.sin(tick * 0.2 + p.phase) * 0.5;
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
          var gd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
          gd.addColorStop(0, 'rgba(255,200,50,' + (fl * 0.6) + ')');
          gd.addColorStop(0.4, 'rgba(255,100,20,' + (fl * 0.35) + ')');
          gd.addColorStop(1, 'rgba(255,50,0,0)');
          ctx.fillStyle = gd;
          ctx.fillRect(p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,240,200,' + (fl * 0.7) + ')';
          ctx.fill();
          break;

        case 'bubble':
          p.x += Math.sin(p.phase) * 0.3;
          p.y += p.vy;
          p.phase += 0.02;
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; p.rd = Math.random() * 3 + 1.5; }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.rd, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.35)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(p.x - p.rd * 0.3, p.y - p.rd * 0.3, p.rd * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200,240,255,0.3)';
          ctx.fill();
          break;

        case 'lightning':
          p.timer--;
          if (p.timer <= 0) { p.a = p.maxA; p.timer = p.cooldown; p.x = Math.random() * W; p.y = Math.random() * H; p.angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; }
          if (p.a > 0) {
            ctx.strokeStyle = 'rgba(255,255,100,' + p.a + ')';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = 'rgba(255,255,150,0.5)';
            ctx.shadowBlur = 6;
            var bx = p.x, by = p.y;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            for (var s = 0; s < p.branches + 2; s++) {
              bx += Math.cos(p.angle) * p.len / (p.branches + 2) + (Math.random() - 0.5) * 6;
              by += Math.sin(p.angle) * p.len / (p.branches + 2) + (Math.random() - 0.5) * 4;
              ctx.lineTo(bx, by);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            p.a *= 0.8;
            if (p.a < 0.02) p.a = 0;
          }
          break;

        case 'leaf':
          p.x += p.vx + Math.sin(p.phase) * 0.4;
          p.y += p.vy;
          p.phase += p.spin;
          if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.sin(p.phase) * 0.5);
          ctx.scale(1, 0.5 + Math.abs(Math.sin(p.phase)) * 0.5);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.rd, p.rd * 0.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + p.a + ')';
          ctx.fill();
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
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, p.rd * (0.3 + t / p.trail.length * 0.7), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (fade * 0.5) + ')';
            ctx.fill();
          }
          var wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, p.rd * 2.5);
          wg.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + p.a + ')');
          wg.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
          ctx.fillStyle = wg;
          ctx.fillRect(wx - p.rd * 2.5, wy - p.rd * 2.5, p.rd * 5, p.rd * 5);
          break;

        case 'rune':
          var glyphs = ['\u25C6', '\u2726', '\u2B21', '\u25B3', '\u263D', '\u2295'];
          p.timer--;
          if (p.timer <= 0) { p.timer = p.duration + p.cooldown; p.x = 10 + Math.random() * (W - 20); p.y = 10 + Math.random() * (H - 20); p.glyph = Math.floor(Math.random() * glyphs.length); }
          if (p.timer > p.cooldown) {
            var pr = (p.timer - p.cooldown) / p.duration;
            var fa = pr < 0.2 ? pr / 0.2 : pr > 0.7 ? (1 - pr) / 0.3 : 1;
            ctx.font = p.size + 'px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (fa * p.maxA) + ')';
            ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',0.4)';
            ctx.shadowBlur = 8;
            ctx.fillText(glyphs[p.glyph], p.x, p.y);
            ctx.shadowBlur = 0;
          }
          break;

        case 'spore':
          p.x += p.vx + Math.sin(p.phase) * 0.2;
          p.y += p.vy;
          p.phase += 0.025;
          p.rd = Math.min(p.rd + p.expand, p.maxR);
          p.a *= 0.998;
          if (p.y < -10 || p.a < 0.02) { p.y = H + 10; p.x = Math.random() * W; p.rd = Math.random() * 2 + 1; p.a = Math.random() * 0.4 + 0.1; }
          var sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rd * 2);
          sg.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + (p.a * 0.6) + ')');
          sg.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
          ctx.fillStyle = sg;
          ctx.fillRect(p.x - p.rd * 2, p.y - p.rd * 2, p.rd * 4, p.rd * 4);
          break;

        case 'petal':
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.rotSpeed;
          if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + p.a + ')';
          ctx.beginPath();
          ctx.moveTo(-p.rd, 0);
          ctx.lineTo(0, -p.rd * 0.7);
          ctx.lineTo(p.rd, p.rd * 0.3);
          ctx.lineTo(-p.rd * 0.3, p.rd * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;

        default: // mote
          p.x += p.vx;
          p.y += p.vy;
          p.phase += p.pulse;
          var ma = 0.35 + Math.sin(p.phase) * 0.35;
          if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
          var mg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rd * 4);
          mg.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + ma + ')');
          mg.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',' + (ma * 0.4) + ')');
          mg.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
          ctx.fillStyle = mg;
          ctx.fillRect(p.x - p.rd * 4, p.y - p.rd * 4, p.rd * 8, p.rd * 8);
          break;
      }
    }

    raf = requestAnimationFrame(draw);
  }

  initPts();
  draw();

  // Cleanup if canvas is removed
  canvas._stopParticles = function () {
    cancelAnimationFrame(raf);
  };
}