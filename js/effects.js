/* Choc des Légendes — particules et effets visuels */
(function (C) {
  'use strict';
  // Hasard des effets visuels : toujours celui du navigateur, jamais celui du combat (voir det.js)
  const vrand = (a, b) => a + Math.random() * (b - a);
  const vrandi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const U = C.U;
  const PI = Math.PI;
  const MAX = 420;

  // Sprites de halo pré-rendus (dégradés radiaux) par couleur
  const glowCache = {};
  function glowSprite(color) {
    if (glowCache[color]) return glowCache[color];
    const s = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rg.addColorStop(0, U.rgba(color, 1));
    rg.addColorStop(0.35, U.rgba(color, 0.55));
    rg.addColorStop(1, U.rgba(color, 0));
    g.fillStyle = rg; g.fillRect(0, 0, s, s);
    glowCache[color] = cv;
    return cv;
  }

  const FX = { parts: [], texts: [], time: 0 };

  FX.reset = function () { FX.parts.length = 0; FX.texts.length = 0; };

  function add(p) {
    if (FX.parts.length >= MAX) FX.parts.shift();
    p.life = p.max = p.life || 20;
    p.vx = p.vx || 0; p.vy = p.vy || 0;
    p.size = p.size || 6;
    p.drag = p.drag != null ? p.drag : 0.92;
    p.grav = p.grav || 0;
    p.rot = p.rot || 0; p.vr = p.vr || 0;
    FX.parts.push(p);
    return p;
  }
  FX.add = add;

  FX.glow = (x, y, size, color, life, opts) => add(Object.assign({ t: 'glow', x, y, size, color, life: life || 12, add: true }, opts));

  FX.hitSpark = function (x, y, dir, power, color) {
    color = color || '#ffe27a';
    power = power || 1;
    add({ t: 'glow', x, y, size: 50 * power, color, life: 8, add: true, grow: 1.5 });
    add({ t: 'glow', x, y, size: 26 * power, color: '#ffffff', life: 6, add: true });
    add({ t: 'ring', x, y, size: 10, grow: 6 * power, color: '#ffffff', life: 9, width: 4 });
    const n = Math.round(7 + power * 6);
    for (let i = 0; i < n; i++) {
      const a = (dir > 0 ? 0 : PI) + vrand(-1.2, 1.2);
      const sp = vrand(6, 15) * power;
      add({ t: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color: i % 3 === 0 ? '#ffffff' : color, life: vrandi(8, 15), size: vrand(2, 4), add: true, drag: 0.86 });
    }
    // Éclat en étoile
    add({ t: 'star', x, y, size: 34 * power, color: '#ffffff', life: 6, rot: vrand(0, PI) });
  };
  FX.slashSpark = function (x, y, dir, power, color) {
    color = color || '#bfe8ff';
    add({ t: 'cut', x, y, size: 70 * (power || 1), color, life: 10, rot: vrand(-0.9, -0.3) * dir, add: true });
    FX.hitSpark(x, y, dir, (power || 1) * 0.8, color);
  };
  FX.blockSpark = function (x, y, dir) {
    add({ t: 'shield', x, y, size: 42, color: '#7fd1ff', life: 12, dir, add: true });
    for (let i = 0; i < 6; i++) {
      const a = (dir > 0 ? PI : 0) + vrand(-0.9, 0.9);
      add({ t: 'spark', x, y, vx: Math.cos(a) * vrand(4, 9), vy: Math.sin(a) * vrand(4, 9), color: '#bfe9ff', life: 10, size: 2.5, add: true, drag: 0.85 });
    }
  };
  FX.parry = function (x, y) {
    add({ t: 'ring', x, y, size: 20, grow: 10, color: '#ffffff', life: 14, width: 6 });
    add({ t: 'ring', x, y, size: 10, grow: 6, color: '#7fe8ff', life: 18, width: 3 });
    add({ t: 'glow', x, y, size: 120, color: '#9ef0ff', life: 12, add: true });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * PI * 2;
      add({ t: 'spark', x, y, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, color: '#e0fbff', life: 14, size: 3, add: true, drag: 0.88 });
    }
  };
  FX.dust = function (x, y, dir, n, big) {
    n = n || 5;
    for (let i = 0; i < n; i++) {
      add({ t: 'smoke', x: x + vrand(-10, 10), y: y - vrand(0, 8), vx: -dir * vrand(0.5, 3.5) + vrand(-1, 1), vy: -vrand(0.3, 2), size: vrand(8, 16) * (big ? 1.8 : 1), grow: 0.6, color: '#c9bca6', life: vrandi(18, 30), alpha: 0.5, drag: 0.94 });
    }
  };
  FX.explosion = function (x, y, r, color, smoke) {
    color = color || '#ff9a3c';
    add({ t: 'glow', x, y, size: r * 2.6, color, life: 14, add: true, grow: 1.02 });
    add({ t: 'glow', x, y, size: r * 1.2, color: '#ffffff', life: 8, add: true });
    add({ t: 'ring', x, y, size: r * 0.4, grow: r * 0.12, color: U.shade(color, 0.4), life: 14, width: 7 });
    for (let i = 0; i < 18; i++) {
      const a = vrand(0, PI * 2), sp = vrand(3, 11) * r / 60;
      add({ t: 'ember', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, color: i % 2 ? color : '#ffe08a', life: vrandi(16, 30), size: vrand(3, 7), add: true, grav: 0.18, drag: 0.94 });
    }
    if (smoke !== false) {
      for (let i = 0; i < 8; i++) {
        add({ t: 'smoke', x: x + vrand(-r * 0.4, r * 0.4), y: y + vrand(-r * 0.4, r * 0.2), vx: vrand(-1.5, 1.5), vy: -vrand(0.5, 2.5), size: r * vrand(0.3, 0.6), grow: 0.8, color: '#3a3238', life: vrandi(30, 50), alpha: 0.55, drag: 0.95 });
      }
    }
  };
  FX.energyBurst = function (x, y, color, n, speed) {
    for (let i = 0; i < (n || 16); i++) {
      const a = vrand(0, PI * 2), sp = vrand(2, speed || 9);
      add({ t: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color: i % 3 ? color : '#fff', life: vrandi(12, 24), size: vrand(2, 4), add: true, drag: 0.9 });
    }
  };
  FX.auraParticle = function (x, y, color) {
    add({ t: 'flame', x, y, vx: vrand(-0.5, 0.5), vy: -vrand(2, 4.5), size: vrand(6, 13), color, life: vrandi(14, 24), add: true, drag: 0.97, shrink: true });
  };
  FX.ember = function (x, y, color, vx, vy, size, life) {
    add({ t: 'ember', x, y, vx: vx || 0, vy: vy || 0, size: size || 4, color, life: life || 20, add: true, drag: 0.95 });
  };
  FX.smoke = function (x, y, size, color, life, vx, vy) {
    add({ t: 'smoke', x, y, vx: vx || vrand(-1, 1), vy: vy || -vrand(0.5, 2), size, grow: 0.5, color: color || '#555', life: life || 30, alpha: 0.6, drag: 0.95 });
  };
  FX.petal = function (x, y, color) {
    add({ t: 'petal', x, y, vx: vrand(-3, 3), vy: vrand(-3, 1), size: vrand(4, 7), color: color || '#ffb7d0', life: vrandi(40, 70), rot: vrand(0, PI), vr: vrand(-0.2, 0.2), grav: 0.05, drag: 0.98 });
  };
  FX.lightning = function (x1, y1, x2, y2, color, width, life) {
    add({ t: 'bolt', x: x1, y: y1, x2, y2, color: color || '#bcd7ff', width: width || 3, life: life || 5, seed: Math.random() * 1000, add: true });
  };
  FX.slashArc = function (x, y, dir, r, a0, a1, color, width, life) {
    add({ t: 'arc', x, y, size: r, a0, a1, dir, color: color || '#ffffff', width: width || 10, life: life || 8, add: true });
  };
  FX.speedLine = function (x, y, len, color) {
    add({ t: 'line', x, y, vx: 0, vy: 0, len, color: color || '#fff', life: 8, add: true });
  };
  FX.text = function (x, y, str, color, size, life, opts) {
    const t = Object.assign({ x, y, str, color: color || '#fff', size: size || 30, life: life || 50, max: life || 50, vy: -1.2 }, opts);
    FX.texts.push(t);
    if (FX.texts.length > 40) FX.texts.shift();
  };
  // Onomatopée de bande dessinée (« BAM ! ») dans une étoile qui éclate
  FX.comic = function (x, y, str, color) {
    FX.text(x, y, str, color || '#ffe14a', 46, 36, { comic: true, rot: (Math.random() - 0.5) * 0.5, vy: -0.5 });
  };
  FX.flashScreen = null;

  FX.update = function () {
    FX.time++;
    const ps = FX.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life--;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.grav;
      p.x += p.vx; p.y += p.vy;
      if (p.vzl) p.zl = (p.zl || 0) + p.vzl;
      p.rot += p.vr;
      if (p.grow) p.size += p.t === 'ring' ? p.grow : p.grow;
    }
    const ts = FX.texts;
    for (let i = ts.length - 1; i >= 0; i--) {
      const t = ts[i];
      t.life--;
      t.y += t.vy; t.vy *= 0.94;
      if (t.life <= 0) ts.splice(i, 1);
    }
  };

  function drawBolt(ctx, p, k) {
    const rnd = U.seeded(Math.floor(p.seed + FX.time * 0.7));
    const dx = p.x2 - p.x, dy = p.y2 - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const segs = Math.max(4, Math.round(len / 22));
    const pts = [[p.x, p.y]];
    for (let i = 1; i < segs; i++) {
      const t = i / segs, off = (rnd() * 2 - 1) * Math.min(26, len * 0.12);
      pts.push([p.x + dx * t + nx * off, p.y + dy * t + ny * off]);
    }
    pts.push([p.x2, p.y2]);
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    path(); ctx.strokeStyle = U.rgba(p.color, 0.35 * k); ctx.lineWidth = p.width * 4; ctx.stroke();
    path(); ctx.strokeStyle = U.rgba(p.color, 0.9 * k); ctx.lineWidth = p.width * 1.6; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(255,255,255,' + k + ')'; ctx.lineWidth = p.width * 0.6; ctx.stroke();
  }
  FX.drawBolt = drawBolt;

  // V : vue 3D (C.R3.view). Chaque particule est projetée à sa place dans l'arène.
  FX.draw = function (ctx, V) {
    const ps = FX.parts;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (V && !V.at(ctx, p.x, p.y, p.zl || 0)) continue;
      const k = p.life / p.max;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      switch (p.t) {
        case 'glow': {
          const s = p.size * (p.grow ? 1 : (0.6 + 0.4 * k));
          ctx.globalAlpha = Math.min(1, k * 1.3) * (p.alpha || 1);
          ctx.drawImage(glowSprite(p.color), p.x - s / 2, p.y - s / 2, s, s);
          break;
        }
        case 'spark': {
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.stroke();
          break;
        }
        case 'ember': case 'flame': {
          const s = p.shrink ? p.size * k : p.size;
          ctx.globalAlpha = Math.min(1, k * 1.5);
          ctx.drawImage(glowSprite(p.color), p.x - s, p.y - s, s * 2, s * 2);
          break;
        }
        case 'smoke': {
          ctx.globalAlpha = (p.alpha || 0.5) * k;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, PI * 2); ctx.fill();
          break;
        }
        case 'ring': {
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color; ctx.lineWidth = (p.width || 3) * k + 0.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.size), 0, PI * 2); ctx.stroke();
          break;
        }
        case 'star': {
          ctx.globalAlpha = k;
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          const s = p.size * (0.5 + k * 0.5);
          ctx.beginPath();
          for (let j = 0; j < 8; j++) {
            const a = j * PI / 4, r = j % 2 ? s * 0.18 : s;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath(); ctx.fill(); ctx.restore();
          break;
        }
        case 'cut': {
          ctx.globalAlpha = k;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          const s = p.size * (1.2 - k * 0.2);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -6 * k, s, 0); ctx.quadraticCurveTo(0, 6 * k, -s, 0); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.quadraticCurveTo(0, -2.5 * k, s * 0.8, 0); ctx.quadraticCurveTo(0, 2.5 * k, -s * 0.8, 0); ctx.fill();
          ctx.restore();
          break;
        }
        case 'shield': {
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color; ctx.lineWidth = 5 * k + 1;
          ctx.beginPath(); ctx.arc(p.x - p.dir * 10, p.y, p.size * (1.2 - k * 0.2), p.dir > 0 ? -1.1 : PI - 1.1, p.dir > 0 ? 1.1 : PI + 1.1); ctx.stroke();
          break;
        }
        case 'petal': {
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, PI * 2); ctx.fill(); ctx.restore();
          break;
        }
        case 'bolt': {
          ctx.globalAlpha = 1;
          drawBolt(ctx, p, k);
          break;
        }
        case 'arc': {
          ctx.globalAlpha = k;
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.dir, 1);
          ctx.strokeStyle = p.color; ctx.lineCap = 'round';
          ctx.lineWidth = p.width * k;
          ctx.beginPath(); ctx.arc(0, 0, p.size, p.a0, p.a1, p.a1 < p.a0); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = p.width * 0.35 * k;
          ctx.beginPath(); ctx.arc(0, 0, p.size, p.a0, p.a1, p.a1 < p.a0); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'line': {
          ctx.globalAlpha = k * 0.8;
          ctx.strokeStyle = p.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.len, p.y); ctx.stroke();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  function drawComic(ctx, t, pop) {
    const size = Math.round(t.size * (t.life > t.max - 6 ? 0.6 + (t.max - t.life) * 0.08 : 1));
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.rot || 0);
    ctx.font = size + 'px Bangers, Impact, sans-serif';
    const w = ctx.measureText(t.str).width;
    const rx = Math.max(size * 1.05, w * 0.72), ry = size * 0.95;
    ctx.beginPath();
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * Math.PI * 2;
      const r = k % 2 ? 0.66 : 1.0;
      const px = Math.cos(a) * rx * r, py = Math.sin(a) * ry * r;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#120818'; ctx.lineWidth = 4;
    ctx.fill(); ctx.stroke();
    ctx.lineWidth = 7; ctx.strokeStyle = '#120818';
    ctx.strokeText(t.str, 0, 2);
    ctx.fillStyle = t.color;
    ctx.fillText(t.str, 0, 2);
    ctx.restore();
  }

  FX.drawTexts = function (ctx, V) {
    const ts = FX.texts;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      if (V && !V.flat(ctx, t.x, t.y, t.zl || 0)) continue;
      const k = t.life / t.max;
      const pop = t.life > t.max - 6 ? 1 + (t.life - (t.max - 6)) * 0.08 : 1;
      ctx.globalAlpha = Math.min(1, k * 3);
      if (t.comic) { drawComic(ctx, t, pop); continue; }
      ctx.font = Math.round(t.size * pop) + 'px Bangers, Impact, sans-serif';
      ctx.lineWidth = 5; ctx.strokeStyle = '#120818';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  };

  FX.glowSprite = glowSprite;
  C.FX = FX;
})(window.CDL = window.CDL || {});
