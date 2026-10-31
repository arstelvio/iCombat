/* Choc des Légendes — squelette 2D animé et rendu procédural des combattants.
   Conventions (repère local, personnage tourné vers la droite, y vers le bas, origine aux pieds) :
   - angles des membres mesurés depuis la verticale descendante, positifs vers l'avant ;
   - torse : inclinaison vers l'avant ; bras relatifs au torse, avant-bras relatifs au bras ;
   - cuisses absolues, tibias relatifs à la cuisse (négatif = genou plié). */
(function (C) {
  'use strict';
  const U = C.U;
  const PI = Math.PI;
  const OUT = 2.6; // épaisseur du contour
  const OUTLINE = '#160d1f';

  const BUILDS = {
    normal: { thigh: 48, shin: 48, torso: 62, uarm: 36, farm: 34, head: 17, neck: 7, armW: 13, legW: 16, tTop: 44, tBot: 34 },
    slim: { thigh: 48, shin: 49, torso: 60, uarm: 35, farm: 33, head: 16, neck: 7, armW: 11, legW: 13, tTop: 38, tBot: 30 },
    heavy: { thigh: 46, shin: 46, torso: 66, uarm: 38, farm: 36, head: 17, neck: 6, armW: 18, legW: 21, tTop: 60, tBot: 44 },
    old: { thigh: 46, shin: 46, torso: 58, uarm: 34, farm: 32, head: 16, neck: 7, armW: 11, legW: 13, tTop: 40, tBot: 36 },
    small: { thigh: 15, shin: 15, torso: 30, uarm: 15, farm: 14, head: 27, neck: 4, armW: 9, legW: 12, tTop: 26, tBot: 32 },
    dragon: { thigh: 40, shin: 40, torso: 72, uarm: 26, farm: 24, head: 20, neck: 22, armW: 14, legW: 26, tTop: 52, tBot: 62 },
    psy: { thigh: 52, shin: 52, torso: 62, uarm: 38, farm: 36, head: 16, neck: 10, armW: 11, legW: 17, tTop: 40, tBot: 46 },
    titan: { thigh: 50, shin: 50, torso: 70, uarm: 40, farm: 38, head: 18, neck: 8, armW: 17, legW: 20, tTop: 58, tBot: 44 }
  };

  function dims(look) {
    if (look._dims) return look._dims;
    const b = Object.assign({}, BUILDS[look.build || 'normal'], look.dims || {});
    b.hipH = b.thigh + b.shin;
    b.height = b.hipH + b.torso + b.neck + b.head * 2;
    look._dims = b;
    return b;
  }

  // ---------------------------------------------------------------- poses
  const KEYS = ['x', 'y', 'rot', 'lie', 'torso', 'head', 'ua1', 'la1', 'ua2', 'la2', 'th1', 'sh1', 'th2', 'sh2', 'wing', 'tail'];
  const BASE = { x: 0, y: 0, rot: 0, lie: 0, torso: 0, head: 0, ua1: 0.1, la1: 0.2, ua2: 0.05, la2: 0.2, th1: 0.05, sh1: -0.05, th2: -0.05, sh2: -0.05, wing: 0.3, tail: 0, wa: null, wa2: null, plant: true };

  function defaultWa(p) { return (p.ua1 - p.torso + p.la1) + PI / 2; }
  function defaultWa2(p) { return (p.ua2 - p.torso + p.la2) + PI / 2; }

  function lerpPose(a, b, t, out) {
    out = out || {};
    for (let i = 0; i < KEYS.length; i++) {
      const k = KEYS[i];
      const va = a[k] !== undefined ? a[k] : BASE[k];
      const vb = b[k] !== undefined ? b[k] : BASE[k];
      out[k] = va + (vb - va) * t;
    }
    const wa = a.wa != null ? a.wa : defaultWa(fill(a));
    const wb = b.wa != null ? b.wa : defaultWa(fill(b));
    out.wa = wa + (wb - wa) * t;
    const w2a = a.wa2 != null ? a.wa2 : defaultWa2(fill(a));
    const w2b = b.wa2 != null ? b.wa2 : defaultWa2(fill(b));
    out.wa2 = w2a + (w2b - w2a) * t;
    out.plant = t < 0.5 ? (a.plant !== false) : (b.plant !== false);
    out.hidden = t < 0.5 ? a.hidden : b.hidden;
    return out;
  }
  const fillTmp = {};
  function fill(p) {
    for (let i = 0; i < KEYS.length; i++) { const k = KEYS[i]; fillTmp[k] = p[k] !== undefined ? p[k] : BASE[k]; }
    return fillTmp;
  }
  function completePose(p) {
    const o = {};
    for (let i = 0; i < KEYS.length; i++) { const k = KEYS[i]; o[k] = p[k] !== undefined ? p[k] : BASE[k]; }
    o.wa = p.wa != null ? p.wa : defaultWa(o);
    o.wa2 = p.wa2 != null ? p.wa2 : defaultWa2(o);
    o.plant = p.plant !== false;
    o.hidden = p.hidden;
    return o;
  }

  // ------------------------------------------------------------- cinématique
  function vecDown(a, L) { return [Math.sin(a) * L, Math.cos(a) * L]; }

  function solve(p, d, J) {
    J = J || {};
    const hipY = U.lerp(-d.hipH + p.y, -d.legW * 0.6 - 6, p.lie || 0);
    const hip = [p.x, hipY];
    // Jambes
    const k1 = vecDown(p.th1, d.thigh), f1 = vecDown(p.th1 + p.sh1, d.shin);
    const k2 = vecDown(p.th2, d.thigh), f2 = vecDown(p.th2 + p.sh2, d.shin);
    J.knee1 = [hip[0] + k1[0], hip[1] + k1[1]];
    J.foot1 = [J.knee1[0] + f1[0], J.knee1[1] + f1[1]];
    J.knee2 = [hip[0] + k2[0], hip[1] + k2[1]];
    J.foot2 = [J.knee2[0] + f2[0], J.knee2[1] + f2[1]];
    J.shinA1 = p.th1 + p.sh1; J.shinA2 = p.th2 + p.sh2;
    // Ancrage des pieds au sol
    let dy = 0;
    if (p.plant && !p.rot && !p.lie) {
      const low = Math.max(J.foot1[1], J.foot2[1]);
      dy = -low;
    }
    hip[1] += dy;
    J.knee1[1] += dy; J.foot1[1] += dy; J.knee2[1] += dy; J.foot2[1] += dy;
    J.hip = hip;
    // Torse
    const t = p.torso;
    J.neck = [hip[0] + Math.sin(t) * d.torso, hip[1] - Math.cos(t) * d.torso];
    J.shoulder = [hip[0] + Math.sin(t) * (d.torso - 7), hip[1] - Math.cos(t) * (d.torso - 7)];
    const ha = t + p.head;
    J.headA = ha;
    J.head = [J.neck[0] + Math.sin(ha) * (d.neck + d.head * 0.85), J.neck[1] - Math.cos(ha) * (d.neck + d.head * 0.85)];
    // Bras
    const A1 = p.ua1 - t, B1 = A1 + p.la1;
    const A2 = p.ua2 - t, B2 = A2 + p.la2;
    const e1 = vecDown(A1, d.uarm), h1 = vecDown(B1, d.farm);
    const e2 = vecDown(A2, d.uarm), h2 = vecDown(B2, d.farm);
    J.elbow1 = [J.shoulder[0] + e1[0], J.shoulder[1] + e1[1]];
    J.hand1 = [J.elbow1[0] + h1[0], J.elbow1[1] + h1[1]];
    J.elbow2 = [J.shoulder[0] + e2[0], J.shoulder[1] + e2[1]];
    J.hand2 = [J.elbow2[0] + h2[0], J.elbow2[1] + h2[1]];
    J.farmA1 = B1; J.farmA2 = B2;
    J.wa = p.wa; J.wa2 = p.wa2;
    J.torsoA = t;
    J.rot = p.rot || 0;
    return J;
  }

  // ---------------------------------------------------------------- dessin
  let flashAmt = 0;
  let shadowMode = null;
  function P(c) {
    if (!c) return c;
    if (shadowMode) c = U.mix(c, shadowMode, 0.72);
    if (flashAmt > 0) return U.shade(c, Math.min(0.95, flashAmt));
    return c;
  }
  function dark(c, a) { return P(U.shade(c, -(a || 0.28))); }

  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  // Membre en deux segments + extrémité, avec contour commun
  function limb(ctx, a, b, c, w1, w2, col1, col2, endCol, endR, endType, endA, tip) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = w1 + OUT * 2; line(ctx, a[0], a[1], b[0], b[1]);
    ctx.lineWidth = w2 + OUT * 2; line(ctx, b[0], b[1], c[0], c[1]);
    if (endType === 'hand') {
      ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(c[0], c[1], endR + OUT, 0, PI * 2); ctx.fill();
    } else if (endType === 'foot') {
      footPath(ctx, c, endA, endR, OUT); ctx.fillStyle = OUTLINE; ctx.fill();
    }
    ctx.strokeStyle = col1; ctx.lineWidth = w1; line(ctx, a[0], a[1], b[0], b[1]);
    ctx.strokeStyle = col2; ctx.lineWidth = w2; line(ctx, b[0], b[1], c[0], c[1]);
    if (tip) {
      // Gants / bottes : dernière portion du segment
      const t = tip.from;
      const mx = b[0] + (c[0] - b[0]) * t, my = b[1] + (c[1] - b[1]) * t;
      ctx.strokeStyle = tip.col; ctx.lineWidth = w2 + (tip.extra || 1);
      line(ctx, mx, my, c[0], c[1]);
    }
    if (endType === 'hand') {
      ctx.fillStyle = endCol; ctx.beginPath(); ctx.arc(c[0], c[1], endR, 0, PI * 2); ctx.fill();
    } else if (endType === 'foot') {
      footPath(ctx, c, endA, endR, 0); ctx.fillStyle = endCol; ctx.fill();
    }
  }
  function footPath(ctx, c, a, r, grow) {
    // Pied orienté vers l'avant, perpendiculaire au tibia
    const fa = a + PI / 2;
    const fx = Math.sin(fa), fy = Math.cos(fa);
    const len = r * 2.1 + grow, h = r * 0.95 + grow;
    ctx.beginPath();
    ctx.ellipse(c[0] + fx * r * 0.7, c[1] + fy * r * 0.7, len / 1.6, h / 1.4, Math.atan2(fy, fx), 0, PI * 2);
  }
  function plate(ctx, a, b, w, col, t0, t1) {
    const x1 = a[0] + (b[0] - a[0]) * t0, y1 = a[1] + (b[1] - a[1]) * t0;
    const x2 = a[0] + (b[0] - a[0]) * t1, y2 = a[1] + (b[1] - a[1]) * t1;
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = w + OUT * 2; line(ctx, x1, y1, x2, y2);
    ctx.strokeStyle = col; ctx.lineWidth = w; line(ctx, x1, y1, x2, y2);
  }
  function circle(ctx, x, y, r, fill, outline) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2);
    if (outline !== false) { ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); }
    ctx.fillStyle = fill; ctx.fill();
  }
  function poly(ctx, pts, fill, stroke, close) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close !== false) ctx.closePath();
    if (stroke !== false) { ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.stroke(); }
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }

  // ------------------------------------------------------------- torse
  function torsoPts(J, d, wTop, wBot) {
    const t = J.torsoA;
    const px = Math.cos(t), py = Math.sin(t); // perpendiculaire (vers l'avant)
    const h = J.hip, n = J.neck;
    const wt = (wTop || d.tTop) / 2, wb = (wBot || d.tBot) / 2;
    const mid = [h[0] + (n[0] - h[0]) * 0.55, h[1] + (n[1] - h[1]) * 0.55];
    return {
      pts: [
        [h[0] - px * wb, h[1] - py * wb],
        [mid[0] - px * (wt * 0.95), mid[1] - py * (wt * 0.95)],
        [n[0] - px * wt * 0.8, n[1] - py * wt * 0.8],
        [n[0] + px * wt * 0.85, n[1] + py * wt * 0.85],
        [mid[0] + px * wt, mid[1] + py * wt],
        [h[0] + px * wb, h[1] + py * wb]
      ],
      px, py, wt, wb, mid
    };
  }
  function smoothPoly(ctx, pts) {
    ctx.beginPath();
    const n = pts.length;
    const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  }

  function drawTorso(ctx, J, d, L, c, time) {
    const T = torsoPts(J, d);
    smoothPoly(ctx, T.pts);
    ctx.lineWidth = OUT * 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.fillStyle = P(c.top); ctx.fill();
    ctx.save();
    smoothPoly(ctx, T.pts); ctx.clip();
    const h = J.hip, n = J.neck, px = T.px, py = T.py;
    const along = (t, off) => [h[0] + (n[0] - h[0]) * t + px * off, h[1] + (n[1] - h[1]) * t + py * off];
    const chest = L.chest;
    // Ombrage arrière
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    poly(ctx, [along(-0.1, -T.wb * 1.2), along(1.1, -T.wt * 1.2), along(1.1, -T.wt * 0.35), along(-0.1, -T.wb * 0.3)], 'rgba(0,0,0,0.16)', false);
    if (chest === 'gi') {
      poly(ctx, [along(1.05, T.wt * 0.15), along(1.05, T.wt * 1.1), along(0.62, T.wt * 1.1)], P(c.inner || '#222'), false);
      ctx.strokeStyle = P(dark(c.top, 0.35)); ctx.lineWidth = 3;
      line(ctx, ...along(1.0, T.wt * 0.1), ...along(0.25, T.wb * 0.9));
    } else if (chest === 'plate' || chest === 'tabard') {
      const m = P(c.metal || '#b8bec8');
      ctx.fillStyle = m; ctx.fillRect(-200, -400, 400, 600);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      poly(ctx, [along(0.9, T.wt * 0.2), along(0.9, T.wt * 0.7), along(0.4, T.wt * 0.55), along(0.4, T.wt * 0.15)], 'rgba(255,255,255,0.28)', false);
      if (chest === 'tabard') {
        poly(ctx, [along(0.85, -T.wt * 0.15), along(0.85, T.wt * 1.2), along(-0.2, T.wb * 1.2), along(-0.2, -T.wb * 0.1)], P(c.top), false);
        // emblème
        const e = along(0.55, T.wt * 0.6);
        ctx.fillStyle = P(c.accent || '#f2c94c');
        ctx.beginPath(); ctx.moveTo(e[0], e[1] - 12); ctx.lineTo(e[0] + 7, e[1]); ctx.lineTo(e[0], e[1] + 12); ctx.lineTo(e[0] - 7, e[1]); ctx.closePath(); ctx.fill();
      }
    } else if (chest === 'samurai') {
      ctx.strokeStyle = P(c.accent || '#f2c94c'); ctx.lineWidth = 2.5;
      for (let i = 0; i < 5; i++) { const a = along(0.2 + i * 0.16, -60), b = along(0.2 + i * 0.16, 60); line(ctx, a[0], a[1], b[0], b[1]); }
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) { const a = along(0.24 + i * 0.16, -60), b = along(0.24 + i * 0.16, 60); line(ctx, a[0], a[1], b[0], b[1]); }
    } else if (chest === 'marine') {
      const e = along(0.62, T.wt * 0.45);
      ctx.fillStyle = P(c.accent || '#e0b84a');
      ctx.beginPath();
      ctx.moveTo(e[0] - 22, e[1] - 4); ctx.quadraticCurveTo(e[0] - 6, e[1] - 16, e[0], e[1] - 2);
      ctx.quadraticCurveTo(e[0] + 6, e[1] - 16, e[0] + 22, e[1] - 4); ctx.lineTo(e[0], e[1] + 6); ctx.closePath(); ctx.fill();
      circle(ctx, e[0], e[1] - 2, 5, P('#e9e2cf'));
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      poly(ctx, [along(0.95, T.wt * 0.2), along(0.95, T.wt * 0.8), along(0.75, T.wt * 0.7)], 'rgba(255,255,255,0.18)', false);
    } else if (chest === 'trooper') {
      ctx.fillStyle = P('#1b1b20');
      ctx.fillRect(-200, -400, 400, 600);
      poly(ctx, [along(1.02, -T.wt), along(1.02, T.wt * 1.1), along(0.5, T.wt * 1.1), along(0.5, -T.wt)], P(c.top), false);
      poly(ctx, [along(0.42, -T.wt), along(0.42, T.wt * 1.1), along(0.1, T.wb * 1.1), along(0.1, -T.wb)], P(c.top), false);
      ctx.strokeStyle = P('#9aa3ad'); ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { const a = along(0.62 + i * 0.1, T.wt * 0.2), b = along(0.62 + i * 0.1, T.wt * 0.9); line(ctx, a[0], a[1], b[0], b[1]); }
    } else if (chest === 'darklord') {
      const e = along(0.66, T.wt * 0.55);
      ctx.fillStyle = P('#2d2f36'); ctx.fillRect(e[0] - 9, e[1] - 8, 18, 16);
      const lights = ['#e33', '#3c3', '#39f', '#fd3'];
      for (let i = 0; i < 4; i++) { ctx.fillStyle = lights[(i + Math.floor(time * 3)) % 4]; ctx.fillRect(e[0] - 6 + i * 4, e[1] - 4, 3, 3); }
      ctx.fillStyle = '#888'; ctx.fillRect(e[0] - 6, e[1] + 2, 12, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      poly(ctx, [along(0.98, T.wt * 0.1), along(0.98, T.wt * 0.9), along(0.75, T.wt * 0.8)], 'rgba(255,255,255,0.14)', false);
    } else if (chest === 'tunic') {
      ctx.strokeStyle = P(dark(c.top, 0.3)); ctx.lineWidth = 3;
      line(ctx, ...along(1.0, -T.wt * 0.2), ...along(0.25, T.wb * 0.95));
      line(ctx, ...along(1.0, T.wt * 0.5), ...along(0.35, T.wb * 0.2));
      poly(ctx, [along(1.0, T.wt * 0.0), along(1.05, T.wt * 0.9), along(0.7, T.wt * 0.5)], P(c.inner || dark(c.top, 0.15)), false);
    } else if (chest === 'robe') {
      ctx.strokeStyle = P(dark(c.top, 0.3)); ctx.lineWidth = 2.5;
      line(ctx, ...along(1.0, T.wt * 0.55), ...along(0.0, T.wb * 0.5));
      if (c.inner) poly(ctx, [along(1.05, T.wt * 0.2), along(1.05, T.wt * 1.0), along(0.7, T.wt * 0.8)], P(c.inner), false);
    } else if (chest === 'belly') {
      const e = along(0.42, T.wb * 0.55);
      ctx.fillStyle = P(c.belly || '#f4e3b0');
      ctx.beginPath(); ctx.ellipse(e[0], e[1], T.wb * 0.6, d.torso * 0.48, J.torsoA, 0, PI * 2); ctx.fill();
      if (L.bellyStripes) {
        ctx.strokeStyle = P(dark(c.belly || '#f4e3b0', 0.2)); ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) { const a = along(0.12 + i * 0.13, T.wb * 0.25), b = along(0.12 + i * 0.13, T.wb * 1.1); line(ctx, a[0], a[1], b[0], b[1]); }
      }
    } else if (chest === 'ninja') {
      ctx.strokeStyle = P(dark(c.top, 0.4)); ctx.lineWidth = 3;
      line(ctx, ...along(1.0, -T.wt * 0.1), ...along(0.3, T.wb));
      line(ctx, ...along(1.0, T.wt * 0.7), ...along(0.55, -T.wt * 0.3));
    } else if (chest === 'void') {
      const rnd = U.seeded(77);
      for (let i = 0; i < 14; i++) {
        const tt = rnd(), oo = (rnd() * 2 - 1) * T.wt;
        const pp = along(tt, oo);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i))) + ')';
        ctx.fillRect(pp[0], pp[1], 2, 2);
      }
      const e = along(0.6, T.wt * 0.5);
      ctx.fillStyle = U.rgba('#ff3df2', 0.5 + 0.3 * Math.sin(time * 4));
      ctx.beginPath(); ctx.arc(e[0], e[1], 8, 0, PI * 2); ctx.fill();
    }
    // Ceinture
    if (c.belt) {
      const a = along(0.1, -T.wb * 1.3), b = along(0.1, T.wb * 1.3);
      ctx.strokeStyle = P(c.belt); ctx.lineWidth = 9; line(ctx, a[0], a[1], b[0], b[1]);
      if (L.beltKnot) {
        const k = along(0.08, T.wb * 0.95);
        ctx.fillStyle = P(c.belt);
        poly(ctx, [[k[0], k[1]], [k[0] + 4, k[1] + 22], [k[0] + 10, k[1] + 20]], P(c.belt));
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- têtes
  function eye(ctx, r, x, y, opt) {
    const style = opt.eyeStyle || 'normal';
    if (style === 'glow' || style === 'slit') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = U.rgba(opt.eyeCol || '#ffd23f', 0.5);
      ctx.beginPath(); ctx.ellipse(x * r, y * r, r * 0.3, r * 0.2, -0.15, 0, PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = opt.eyeCol || '#ffd23f';
      ctx.beginPath(); ctx.ellipse(x * r, y * r, r * 0.2, r * (style === 'slit' ? 0.07 : 0.12), -0.15, 0, PI * 2); ctx.fill();
      return;
    }
    if (style === 'big') {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(x * r, y * r, r * 0.27, r * 0.36, 0, 0, PI * 2); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
      ctx.fillStyle = opt.eyeCol || '#3aa0ff';
      ctx.beginPath(); ctx.ellipse((x + 0.06) * r, (y + 0.03) * r, r * 0.17, r * 0.25, 0, 0, PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse((x + 0.09) * r, (y + 0.04) * r, r * 0.09, r * 0.15, 0, 0, PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc((x + 0.02) * r, (y - 0.1) * r, r * 0.07, 0, PI * 2); ctx.fill();
      return;
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x * r, y * r, r * 0.19, r * 0.24, 0, 0, PI * 2); ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.fillStyle = opt.eyeCol || '#222';
    ctx.beginPath(); ctx.arc((x + 0.07) * r, (y + 0.02) * r, r * 0.11, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc((x + 0.09) * r, (y + 0.02) * r, r * 0.055, 0, PI * 2); ctx.fill();
  }
  function brow(ctx, r, x, y, ang, col) {
    ctx.strokeStyle = col || OUTLINE; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round';
    line(ctx, (x - 0.22) * r, (y - 0.06 * ang) * r, (x + 0.22) * r, (y + 0.08 * ang) * r);
  }

  function spikes(ctx, r, tips, base, col, scaleY) {
    // Cheveux en pointes : alternance pointes / creux sur le crâne
    ctx.beginPath();
    const sy = scaleY || 1;
    ctx.moveTo(base[0][0] * r, base[0][1] * r);
    for (let i = 0; i < tips.length; i++) {
      ctx.lineTo(tips[i][0] * r, tips[i][1] * r * sy);
      if (base[i + 1]) ctx.lineTo(base[i + 1][0] * r, base[i + 1][1] * r);
    }
    ctx.closePath();
    ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = col; ctx.fill();
  }

  const HAIR = {
    spiky: {
      base: [[-0.6, 0.75], [-1.05, 0.0], [-0.95, -0.55], [-0.6, -0.85], [-0.1, -1.0], [0.35, -0.95], [0.7, -0.75], [0.95, -0.35], [0.85, -0.15], [0.55, -0.4]],
      tips: [[-1.45, 0.45], [-1.6, -0.45], [-1.25, -1.35], [-0.6, -1.95], [0.15, -1.85], [0.75, -1.5], [1.2, -0.75], [1.1, 0.05], [0.7, -0.05]]
    },
    golden: {
      base: [[-0.6, 0.75], [-1.05, 0.0], [-0.95, -0.55], [-0.6, -0.85], [-0.1, -1.0], [0.35, -0.95], [0.7, -0.75], [0.95, -0.35], [0.85, -0.15], [0.55, -0.4]],
      tips: [[-1.6, 0.2], [-1.9, -0.9], [-1.4, -1.9], [-0.6, -2.5], [0.2, -2.35], [0.8, -1.9], [1.25, -1.0], [1.1, 0.0], [0.75, -0.1]]
    },
    flame: {
      base: [[-0.7, 0.4], [-0.95, -0.3], [-0.75, -0.75], [-0.35, -0.95], [0.1, -1.0], [0.5, -0.85], [0.85, -0.55], [0.9, -0.4]],
      tips: [[-1.15, -0.5], [-1.15, -1.5], [-0.7, -2.35], [-0.05, -2.75], [0.45, -2.2], [0.75, -1.4], [1.05, -0.75]]
    },
    messy: {
      base: [[-0.7, 0.55], [-1.0, 0.0], [-0.9, -0.6], [-0.5, -0.9], [0.0, -1.0], [0.45, -0.9], [0.8, -0.6], [0.95, -0.3], [0.7, -0.35]],
      tips: [[-1.2, 0.25], [-1.3, -0.45], [-1.0, -1.15], [-0.4, -1.4], [0.15, -1.38], [0.65, -1.15], [1.1, -0.65], [1.05, -0.1]]
    },
    cap: {
      base: [[-0.8, 0.45], [-1.0, -0.2], [-0.7, -0.75], [0.0, -1.0], [0.6, -0.8], [0.9, -0.45]],
      tips: [[-1.1, 0.1], [-1.08, -0.6], [-0.4, -1.12], [0.35, -1.08], [0.95, -0.7]]
    }
  };

  function drawHead(ctx, J, d, L, c, opt, time) {
    const r = d.head;
    ctx.save();
    ctx.translate(J.head[0], J.head[1]);
    ctx.rotate(J.headA * 0.9);
    const H = L.head || 'human';
    const skin = P(c.skin || '#f0c8a0');
    const awakened = opt.awakened && L.awaken;

    if (H === 'human' || H === 'ninja' || H === 'hooded' || H === 'samurai' || H === 'pale') {
      // Cheveux arrière (longs)
      if (L.hairBack) {
        poly(ctx, L.hairBack.map((p) => [p[0] * r, p[1] * r]), P(c.hair));
      }
      if (L.hat === 'hood') {
        ctx.fillStyle = P(c.hood || c.top);
        ctx.beginPath(); ctx.ellipse(-0.15 * r, -0.12 * r, r * 1.42, r * 1.5, 0.15, 0, PI * 2);
        ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fill();
        poly(ctx, [[-1.2 * r, 0.4 * r], [-0.5 * r, 1.9 * r], [0.4 * r, 1.2 * r]], P(c.hood || c.top));
      }
      // Visage
      ctx.beginPath(); ctx.arc(0, 0, r, 0, PI * 2);
      ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke();
      ctx.fillStyle = skin; ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.32 * r, 0.42 * r, 0.68 * r, 0.55 * r, 0.2, 0, PI * 2);
      ctx.stroke(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, PI * 2); ctx.fill();
      // Nez
      ctx.beginPath(); ctx.moveTo(0.92 * r, -0.05 * r); ctx.lineTo(1.13 * r, 0.22 * r); ctx.lineTo(0.9 * r, 0.3 * r);
      ctx.fillStyle = skin; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
      // Oreille
      ctx.fillStyle = P(U.shade(c.skin || '#f0c8a0', -0.12));
      ctx.beginPath(); ctx.ellipse(-0.18 * r, 0.12 * r, 0.17 * r, 0.25 * r, 0, 0, PI * 2); ctx.fill();
      if (L.wrinkles) {
        ctx.strokeStyle = P(U.shade(c.skin, -0.3)); ctx.lineWidth = 1.2;
        line(ctx, 0.3 * r, 0.25 * r, 0.6 * r, 0.6 * r); line(ctx, 0.2 * r, -0.45 * r, 0.6 * r, -0.5 * r); line(ctx, 0.25 * r, -0.6 * r, 0.55 * r, -0.65 * r);
      }
      if (L.hat === 'hood') {
        // ombre du capuchon sur le visage
        const g = ctx.createLinearGradient(0, -r, 0, r * 0.5);
        g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0.05)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0.15 * r, 0, r * 1.02, 0, PI * 2); ctx.fill();
      }
      // Yeux
      const eopt = { eyeStyle: awakened ? 'normal' : L.eyeStyle, eyeCol: awakened ? '#2ad3c6' : (c.eye || '#222') };
      eye(ctx, r, 0.52, -0.08, eopt);
      if (L.eyeStyle !== 'glow' && L.eyeStyle !== 'slit') brow(ctx, r, 0.5, -0.42, L.browAngle != null ? L.browAngle : 1.4, P(c.brow || c.hair || OUTLINE));
      // Bouche
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6;
      line(ctx, 0.55 * r, 0.55 * r, 0.82 * r, opt.mouth === 'open' ? 0.62 * r : 0.5 * r);
      if (opt.mouth === 'open') { ctx.fillStyle = '#5a1020'; ctx.beginPath(); ctx.ellipse(0.72 * r, 0.56 * r, 0.12 * r, 0.09 * r, 0, 0, PI * 2); ctx.fill(); }
      if (H === 'pale') {
        // narines en fente
        ctx.fillStyle = OUTLINE; ctx.fillRect(0.95 * r, 0.12 * r, 0.09 * r, 0.04 * r); ctx.fillRect(0.95 * r, 0.2 * r, 0.09 * r, 0.04 * r);
      }
      if (L.glasses) {
        ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0.55 * r, -0.08 * r, 0.3 * r, 0, PI * 2); ctx.stroke();
        line(ctx, 0.25 * r, -0.1 * r, -0.2 * r, -0.05 * r);
      }
      if (H === 'ninja') {
        // Cagoule : tout sauf la bande des yeux
        ctx.fillStyle = P(c.mask || '#1d1d28');
        ctx.beginPath();
        ctx.arc(0, 0, r + 1, 0, PI * 2);
        ctx.rect(1.3 * r, -0.33 * r, -1.25 * r, 0.52 * r);
        ctx.fill('evenodd');
        ctx.beginPath(); ctx.ellipse(0.32 * r, 0.42 * r, 0.7 * r, 0.57 * r, 0.2, 0, PI * 2); ctx.fill();
        ctx.fillRect(0.6 * r, 0.19 * r, 0.6 * r, 0.6 * r);
        eye(ctx, r, 0.52, -0.08, { eyeCol: c.eye || '#222' });
        brow(ctx, r, 0.5, -0.36, 1.6, OUTLINE);
        // Bandeau
        ctx.fillStyle = P(c.band || '#c62828');
        ctx.fillRect(-r * 1.02, -0.62 * r, r * 2.0, 0.26 * r);
        const wave = Math.sin(time * 9) * 0.25;
        poly(ctx, [[-r, -0.6 * r], [-1.9 * r, (-0.6 + wave) * r], [-2.3 * r, (-0.2 + wave * 1.5) * r], [-r, -0.4 * r]], P(c.band || '#c62828'));
        ctx.fillStyle = P('#c9ced6'); ctx.fillRect(0.35 * r, -0.62 * r, 0.32 * r, 0.26 * r);
      }
      // Cheveux
      if (L.hair && L.hair !== 'bald') {
        let hs = L.hair;
        let hc = c.hair;
        if (awakened) { hs = 'golden'; hc = L.awakenHair || '#ffd84a'; }
        const hd = HAIR[hs];
        if (hd) spikes(ctx, r, hd.tips, hd.base, P(hc));
        if (L.hair === 'topknot') {
          spikes(ctx, r, HAIR.cap.tips, HAIR.cap.base, P(hc));
          circle(ctx, -0.45 * r, -1.2 * r, 0.32 * r, P(hc));
        }
      }
      if (L.beard) {
        poly(ctx, [[0.95 * r, 0.15 * r], [1.05 * r, 0.9 * r], [0.75 * r, 2.0 * r], [0.35 * r, 2.6 * r], [0.15 * r, 1.7 * r], [-0.25 * r, 1.0 * r], [-0.15 * r, 0.4 * r], [0.3 * r, 0.65 * r]], P(c.beard || '#e8e8ee'));
        ctx.strokeStyle = P(U.shade(c.beard || '#e8e8ee', -0.2)); ctx.lineWidth = 1.2;
        line(ctx, 0.6 * r, 0.9 * r, 0.55 * r, 2.0 * r); line(ctx, 0.25 * r, 0.9 * r, 0.3 * r, 1.8 * r);
        // moustache
        poly(ctx, [[0.55 * r, 0.42 * r], [1.15 * r, 0.32 * r], [1.2 * r, 0.62 * r], [0.75 * r, 0.6 * r]], P(c.beard || '#e8e8ee'));
      }
      if (L.hat === 'wizard') {
        const hc = P(c.hat || c.top);
        ctx.fillStyle = hc;
        ctx.beginPath();
        ctx.moveTo(-0.95 * r, -0.62 * r);
        ctx.quadraticCurveTo(-0.6 * r, -2.0 * r, -1.7 * r, -3.3 * r);
        ctx.quadraticCurveTo(0.05 * r, -2.6 * r, 0.9 * r, -0.72 * r);
        ctx.closePath();
        ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0.0, -0.66 * r, 1.75 * r, 0.32 * r, -0.08, 0, PI * 2);
        ctx.stroke(); ctx.fill();
        ctx.fillStyle = P(U.shade(c.hat || c.top, -0.25));
        ctx.beginPath(); ctx.ellipse(-0.05 * r, -0.85 * r, 0.95 * r, 0.16 * r, -0.08, 0, PI * 2); ctx.fill();
      }
      if (L.hat === 'kabuto') {
        const hc = P(c.helm || '#2b2b2b');
        // couvre-nuque
        poly(ctx, [[-0.9 * r, -0.4 * r], [-1.6 * r, 0.55 * r], [-0.9 * r, 0.8 * r], [-0.35 * r, -0.2 * r]], hc);
        ctx.strokeStyle = P(c.accent || '#d4a017'); ctx.lineWidth = 2;
        line(ctx, -1.45 * r, 0.3 * r, -0.75 * r, 0.5 * r);
        ctx.beginPath(); ctx.arc(0, -0.05 * r, r * 1.08, PI * 1.02, PI * 1.98);
        ctx.closePath(); ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fillStyle = hc; ctx.fill();
        ctx.fillStyle = P(c.accent || '#d4a017'); ctx.fillRect(-1.1 * r, -0.2 * r, 2.25 * r, 0.18 * r);
        // croissant doré
        ctx.beginPath();
        ctx.moveTo(0.3 * r, -0.9 * r);
        ctx.quadraticCurveTo(1.6 * r, -1.3 * r, 1.4 * r, -2.4 * r);
        ctx.quadraticCurveTo(1.15 * r, -1.55 * r, 0.25 * r, -1.15 * r);
        ctx.closePath(); ctx.fillStyle = P(c.accent || '#d4a017'); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
      }
    } else if (H === 'knight') {
      const m = P(c.metal || '#b8bec8');
      // Plumet
      const sway = Math.sin(time * 5) * 0.15;
      ctx.fillStyle = P(c.plume || '#c62828');
      ctx.beginPath(); ctx.moveTo(-0.2 * r, -1.1 * r);
      ctx.quadraticCurveTo(-1.2 * r, (-2.2 + sway) * r, -2.6 * r, (-0.6 + sway) * r);
      ctx.quadraticCurveTo(-1.4 * r, -1.0 * r, -0.6 * r, -0.8 * r); ctx.closePath();
      ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fill();
      // Heaume
      ctx.beginPath();
      ctx.moveTo(-1.0 * r, 0.9 * r); ctx.lineTo(-1.05 * r, -0.6 * r);
      ctx.quadraticCurveTo(-0.9 * r, -1.25 * r, 0.1 * r, -1.25 * r);
      ctx.quadraticCurveTo(1.15 * r, -1.2 * r, 1.15 * r, -0.2 * r);
      ctx.lineTo(1.2 * r, 0.6 * r); ctx.quadraticCurveTo(0.8 * r, 1.15 * r, 0.0, 1.1 * r); ctx.closePath();
      ctx.stroke(); ctx.fillStyle = m; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-0.6 * r, -1.0 * r, 0.3 * r, 1.7 * r);
      // Fente de vision
      ctx.fillStyle = '#0b0b10'; ctx.fillRect(0.15 * r, -0.28 * r, 1.05 * r, 0.2 * r);
      ctx.fillStyle = OUTLINE; ctx.fillRect(0.55 * r, -0.2 * r, 0.08 * r, 1.1 * r);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0.85 * r, (0.25 + i * 0.22) * r, 0.05 * r, 0, PI * 2); ctx.fill(); }
    } else if (H === 'darklord') {
      const k = P(c.helm || '#121216');
      ctx.fillStyle = k;
      // Casque en dôme avec évasement
      ctx.beginPath();
      ctx.moveTo(-1.55 * r, 1.05 * r);
      ctx.quadraticCurveTo(-1.35 * r, -1.35 * r, 0.1 * r, -1.3 * r);
      ctx.quadraticCurveTo(1.25 * r, -1.2 * r, 1.15 * r, -0.2 * r);
      ctx.lineTo(1.3 * r, 0.9 * r); ctx.lineTo(0.2 * r, 1.25 * r);
      ctx.closePath(); ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.ellipse(-0.25 * r, -0.75 * r, 0.6 * r, 0.22 * r, -0.4, 0, PI * 2); ctx.fill();
      // Masque
      ctx.fillStyle = P('#2a2a31');
      poly(ctx, [[0.25 * r, -0.4 * r], [1.2 * r, -0.4 * r], [1.25 * r, 0.6 * r], [0.85 * r, 1.15 * r], [0.35 * r, 0.9 * r]], P('#26262c'));
      ctx.fillStyle = '#050507';
      ctx.beginPath(); ctx.ellipse(0.78 * r, -0.12 * r, 0.32 * r, 0.22 * r, 0.25, 0, PI * 2); ctx.fill();
      ctx.fillStyle = U.rgba('#ff3030', 0.35 + 0.25 * Math.sin(time * 3));
      ctx.beginPath(); ctx.arc(0.85 * r, -0.12 * r, 0.08 * r, 0, PI * 2); ctx.fill();
      // Grille buccale
      poly(ctx, [[0.65 * r, 0.35 * r], [1.15 * r, 0.35 * r], [0.95 * r, 0.95 * r]], '#3d3d44');
      ctx.strokeStyle = '#777'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) line(ctx, (0.75 + i * 0.12) * r, 0.42 * r, (0.85 + i * 0.05) * r, 0.8 * r);
    } else if (H === 'trooper') {
      const w = P(c.top || '#eef0f2');
      ctx.beginPath();
      ctx.moveTo(-1.0 * r, 0.85 * r); ctx.quadraticCurveTo(-1.25 * r, -1.25 * r, 0.1 * r, -1.2 * r);
      ctx.quadraticCurveTo(1.2 * r, -1.1 * r, 1.15 * r, 0.0);
      ctx.lineTo(1.1 * r, 0.75 * r); ctx.lineTo(0.2 * r, 1.05 * r); ctx.closePath();
      ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fillStyle = w; ctx.fill();
      ctx.fillStyle = '#0d0d12';
      ctx.beginPath(); ctx.moveTo(0.35 * r, -0.35 * r); ctx.lineTo(1.12 * r, -0.3 * r); ctx.lineTo(1.0 * r, 0.05 * r); ctx.lineTo(0.55 * r, 0.1 * r); ctx.closePath(); ctx.fill();
      ctx.fillStyle = P('#8a929c'); ctx.fillRect(0.65 * r, 0.42 * r, 0.45 * r, 0.32 * r);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) line(ctx, (0.72 + i * 0.13) * r, 0.45 * r, (0.72 + i * 0.13) * r, 0.72 * r);
      ctx.fillStyle = P('#9aa3ad'); ctx.beginPath(); ctx.arc(-0.2 * r, 0.15 * r, 0.3 * r, 0, PI * 2); ctx.fill();
      ctx.fillStyle = P(c.accent || '#4a5a8a'); ctx.fillRect(-0.9 * r, -0.55 * r, 1.0 * r, 0.12 * r);
    } else if (H === 'marine') {
      const m = P(c.metal || c.top);
      ctx.beginPath();
      ctx.moveTo(-1.0 * r, 0.9 * r); ctx.quadraticCurveTo(-1.2 * r, -1.2 * r, 0.1 * r, -1.15 * r);
      ctx.quadraticCurveTo(1.05 * r, -1.05 * r, 1.0 * r, -0.1 * r);
      ctx.lineTo(1.45 * r, 0.35 * r); ctx.lineTo(1.2 * r, 0.95 * r); ctx.lineTo(0.2 * r, 1.05 * r); ctx.closePath();
      ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fillStyle = m; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-0.3 * r, -0.65 * r, 0.5 * r, 0.2 * r, -0.3, 0, PI * 2); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = U.rgba(c.lens || '#ff2a2a', 0.6);
      ctx.beginPath(); ctx.ellipse(0.62 * r, -0.2 * r, 0.32 * r, 0.2 * r, 0, 0, PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = P(c.lens || '#ff2a2a'); ctx.beginPath(); ctx.ellipse(0.62 * r, -0.2 * r, 0.2 * r, 0.12 * r, 0, 0, PI * 2); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillRect(1.05 * r, 0.3 * r, 0.3 * r, 0.4 * r);
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1; line(ctx, 1.1 * r, 0.4 * r, 1.3 * r, 0.4 * r); line(ctx, 1.1 * r, 0.55 * r, 1.3 * r, 0.55 * r);
    } else if (H === 'dragon') {
      const sk = skin;
      // Cornes
      poly(ctx, [[-0.4 * r, -0.75 * r], [-1.7 * r, -1.55 * r], [-0.75 * r, -0.4 * r]], P(c.horn || '#f2e6c4'));
      poly(ctx, [[0.0, -0.9 * r], [-1.1 * r, -1.9 * r], [-0.35 * r, -0.65 * r]], P(U.shade(c.horn || '#f2e6c4', -0.15)));
      ctx.beginPath(); ctx.arc(0, 0, r, 0, PI * 2); ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fillStyle = sk; ctx.fill();
      ctx.beginPath(); ctx.ellipse(1.0 * r, 0.25 * r, 1.05 * r, 0.55 * r, 0.12, 0, PI * 2); ctx.stroke(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 0, PI * 2); ctx.fill();
      ctx.fillStyle = P(c.belly || '#f4e3b0');
      ctx.beginPath(); ctx.ellipse(0.9 * r, 0.6 * r, 0.9 * r, 0.22 * r, 0.12, 0, PI * 2); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; line(ctx, 0.5 * r, 0.42 * r, 1.85 * r, 0.42 * r);
      ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(1.75 * r, 0.05 * r, 0.07 * r, 0, PI * 2); ctx.fill();
      eye(ctx, r, 0.35, -0.3, { eyeCol: c.eye || '#2b7bd6' });
      brow(ctx, r, 0.35, -0.62, 1.8, OUTLINE);
      if (opt.mouth === 'open') {
        ctx.fillStyle = '#7a1010'; ctx.beginPath(); ctx.moveTo(0.6 * r, 0.45 * r); ctx.lineTo(1.9 * r, 0.45 * r); ctx.lineTo(1.5 * r, 0.85 * r); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; poly(ctx, [[1.2 * r, 0.45 * r], [1.3 * r, 0.62 * r], [1.4 * r, 0.45 * r]], '#fff', false);
      }
    } else if (H === 'cat') {
      const sk = skin;
      poly(ctx, [[-0.75 * r, -0.55 * r], [-1.05 * r, -1.55 * r], [-0.15 * r, -0.95 * r]], sk);
      poly(ctx, [[-0.1 * r, -0.95 * r], [0.25 * r, -1.75 * r], [0.55 * r, -0.75 * r]], sk);
      ctx.fillStyle = P(U.shade(c.skin, -0.18));
      poly(ctx, [[-0.72 * r, -0.7 * r], [-0.92 * r, -1.3 * r], [-0.35 * r, -0.95 * r]], P(U.shade(c.skin, -0.15)), false);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.02, r * 0.95, 0, 0, PI * 2);
      ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fillStyle = sk; ctx.fill();
      eye(ctx, r, 0.48, -0.05, { eyeStyle: 'big', eyeCol: c.eye || '#3aa0ff' });
      eye(ctx, r, 0.02, -0.05, { eyeStyle: 'big', eyeCol: c.eye || '#3aa0ff' });
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0.42 * r, 0.42 * r, 0.1 * r, 0.2, PI - 0.2); ctx.stroke();
    } else if (H === 'psy') {
      const sk = skin;
      poly(ctx, [[-0.55 * r, -0.6 * r], [-0.8 * r, -1.55 * r], [-0.1 * r, -0.85 * r]], sk);
      poly(ctx, [[0.05 * r, -0.85 * r], [0.25 * r, -1.6 * r], [0.55 * r, -0.7 * r]], sk);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * 0.95, 0, 0, PI * 2);
      ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fillStyle = sk; ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.45 * r, 0.3 * r, 0.6 * r, 0.45 * r, 0.2, 0, PI * 2); ctx.stroke(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.0, r * 0.9, 0, 0, PI * 2); ctx.fill();
      eye(ctx, r, 0.5, -0.1, { eyeCol: opt.awakened ? '#6ef' : (c.eye || '#7b2fd0') });
      brow(ctx, r, 0.48, -0.42, 2.2, OUTLINE);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; line(ctx, 0.62 * r, 0.52 * r, 0.9 * r, 0.48 * r);
    } else if (H === 'void') {
      for (let i = 0; i < 5; i++) {
        const a = -PI * 0.9 + i * 0.35;
        poly(ctx, [[Math.cos(a - 0.12) * r, Math.sin(a - 0.12) * r], [Math.cos(a) * r * 2.1, Math.sin(a) * r * 2.1], [Math.cos(a + 0.12) * r, Math.sin(a + 0.12) * r]], P(c.horn || '#3a1458'));
      }
      ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, PI * 2);
      ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fillStyle = skin; ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const ec = c.eye || '#ff3df2';
      [[0.55, -0.15], [0.15, -0.2], [0.38, -0.55]].forEach((e, i) => {
        ctx.fillStyle = U.rgba(ec, 0.45); ctx.beginPath(); ctx.arc(e[0] * r, e[1] * r, r * 0.24, 0, PI * 2); ctx.fill();
        ctx.fillStyle = ec; ctx.beginPath(); ctx.ellipse(e[0] * r, e[1] * r, r * (i === 2 ? 0.08 : 0.13), r * 0.08, 0, 0, PI * 2); ctx.fill();
      });
      ctx.restore();
      ctx.strokeStyle = U.rgba(ec, 0.8); ctx.lineWidth = 1.6; line(ctx, 0.35 * r, 0.5 * r, 0.9 * r, 0.42 * r);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- armes
  function drawWeapon(ctx, w, hand, ang, c, opt, time) {
    if (!w || w.type === 'none') return;
    const dx = Math.sin(ang), dy = Math.cos(ang);
    const hx = hand[0], hy = hand[1];
    const at = (t) => [hx + dx * t, hy + dy * t];
    const len = w.len || 90;
    ctx.lineCap = 'round';
    switch (w.type) {
      case 'sword': {
        const g = at(6), tip = at(6 + len), pom = at(-14);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 10; line(ctx, g[0], g[1], tip[0], tip[1]);
        ctx.strokeStyle = P(w.color || '#dfe5ee'); ctx.lineWidth = 6.5; line(ctx, g[0], g[1], tip[0], tip[1]);
        ctx.strokeStyle = 'rgba(120,130,150,0.8)'; ctx.lineWidth = 1.5; line(ctx, g[0], g[1], at(len * 0.85)[0], at(len * 0.85)[1]);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 6; line(ctx, pom[0], pom[1], g[0], g[1]);
        ctx.strokeStyle = P('#5a3b1c'); ctx.lineWidth = 3.5; line(ctx, pom[0], pom[1], g[0], g[1]);
        const px = -dy, py = dx; // perpendiculaire
        const gc = at(6);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 7; line(ctx, gc[0] - px * 13, gc[1] - py * 13, gc[0] + px * 13, gc[1] + py * 13);
        ctx.strokeStyle = P(w.guard || '#d4a017'); ctx.lineWidth = 4; line(ctx, gc[0] - px * 12, gc[1] - py * 12, gc[0] + px * 12, gc[1] + py * 12);
        circle(ctx, pom[0], pom[1], 4, P(w.guard || '#d4a017'));
        break;
      }
      case 'katana': {
        const g = at(10), pom = at(-22);
        const px = -dy, py = dx;
        const tip = at(10 + len);
        const mid = at(10 + len * 0.55);
        const cx = mid[0] + px * 7, cy = mid[1] + py * 7;
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.quadraticCurveTo(cx, cy, tip[0], tip[1]); ctx.stroke();
        ctx.strokeStyle = P('#e8edf3'); ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.quadraticCurveTo(cx, cy, tip[0], tip[1]); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(g[0] + px * 1.5, g[1] + py * 1.5); ctx.quadraticCurveTo(cx + px * 1.5, cy + py * 1.5, tip[0], tip[1]); ctx.stroke();
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 7; line(ctx, pom[0], pom[1], g[0], g[1]);
        ctx.strokeStyle = P(w.grip || '#1d1d40'); ctx.lineWidth = 4.5; line(ctx, pom[0], pom[1], g[0], g[1]);
        ctx.fillStyle = P('#d4a017'); ctx.beginPath(); ctx.ellipse(g[0], g[1], 7, 3, ang, 0, PI * 2); ctx.fill();
        break;
      }
      case 'saber': {
        const h0 = at(-14), h1 = at(12), tip = at(12 + len);
        const col = w.color || '#3fa9ff';
        if (!opt.weaponOff) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const fl = 0.85 + Math.sin(time * 40) * 0.08;
          ctx.strokeStyle = U.rgba(col, 0.22 * fl); ctx.lineWidth = 20; line(ctx, h1[0], h1[1], tip[0], tip[1]);
          ctx.strokeStyle = U.rgba(col, 0.55 * fl); ctx.lineWidth = 10; line(ctx, h1[0], h1[1], tip[0], tip[1]);
          ctx.restore();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4.2; line(ctx, h1[0], h1[1], tip[0], tip[1]);
        }
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 8.5; line(ctx, h0[0], h0[1], h1[0], h1[1]);
        ctx.strokeStyle = P(w.hilt || '#9aa3ad'); ctx.lineWidth = 5.5; line(ctx, h0[0], h0[1], h1[0], h1[1]);
        ctx.strokeStyle = '#222'; ctx.lineWidth = 5.5; const m = at(-3); line(ctx, m[0], m[1], at(2)[0], at(2)[1]);
        break;
      }
      case 'staff': {
        const grip = w.grip || 0.35;
        const b = at(-len * grip), tip = at(len * (1 - grip));
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 8.5; line(ctx, b[0], b[1], tip[0], tip[1]);
        ctx.strokeStyle = P(w.color || '#7a5230'); ctx.lineWidth = 5; line(ctx, b[0], b[1], tip[0], tip[1]);
        // tête noueuse
        const k = at(len * (1 - grip) - 6);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(tip[0], tip[1], 9, 0, PI * 2); ctx.stroke();
        ctx.strokeStyle = P(w.color || '#7a5230'); ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(tip[0], tip[1], 9, 0.5, PI * 1.6); ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const gl = w.glow || '#e9f4ff';
        ctx.fillStyle = U.rgba(gl, 0.25 + (opt.glow || 0) * 0.5); ctx.beginPath(); ctx.arc(tip[0], tip[1], 16 + (opt.glow || 0) * 18, 0, PI * 2); ctx.fill();
        ctx.fillStyle = U.rgba(gl, 0.9); ctx.beginPath(); ctx.arc(tip[0], tip[1], 5, 0, PI * 2); ctx.fill();
        ctx.restore();
        void k;
        break;
      }
      case 'wand': {
        const b = at(-6), tip = at(len);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5.5; line(ctx, b[0], b[1], tip[0], tip[1]);
        ctx.strokeStyle = P(w.color || '#6b4423'); ctx.lineWidth = 3; line(ctx, b[0], b[1], tip[0], tip[1]);
        if (opt.glow) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = U.rgba(w.glow || '#ff5a5a', 0.6 * opt.glow); ctx.beginPath(); ctx.arc(tip[0], tip[1], 10 + opt.glow * 8, 0, PI * 2); ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'rifle': {
        const px = -dy, py = dx;
        const back = at(-22), front = at(58), muzzle = at(74);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 13; line(ctx, back[0], back[1], front[0], front[1]);
        ctx.strokeStyle = P('#26262c'); ctx.lineWidth = 9; line(ctx, back[0], back[1], front[0], front[1]);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 6; line(ctx, front[0], front[1], muzzle[0], muzzle[1]);
        ctx.strokeStyle = P('#3a3a44'); ctx.lineWidth = 3.5; line(ctx, front[0], front[1], muzzle[0], muzzle[1]);
        const sc = at(18), sc2 = at(38);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 6; line(ctx, sc[0] - px * 9, sc[1] - py * 9, sc2[0] - px * 9, sc2[1] - py * 9);
        ctx.strokeStyle = P('#555'); ctx.lineWidth = 3.5; line(ctx, sc[0] - px * 9, sc[1] - py * 9, sc2[0] - px * 9, sc2[1] - py * 9);
        const mg = at(10);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 6; line(ctx, mg[0], mg[1], mg[0] + px * 14, mg[1] + py * 14);
        ctx.strokeStyle = '#444'; ctx.lineWidth = 3.5; line(ctx, mg[0], mg[1], mg[0] + px * 14, mg[1] + py * 14);
        break;
      }
      case 'bolter': {
        const px = -dy, py = dx;
        const back = at(-12), front = at(40), muzzle = at(50);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 19; line(ctx, back[0], back[1], front[0], front[1]);
        ctx.strokeStyle = P(w.color || '#3a3a3a'); ctx.lineWidth = 15; line(ctx, back[0], back[1], front[0], front[1]);
        ctx.strokeStyle = P('#c9a227'); ctx.lineWidth = 3; line(ctx, at(0)[0] - px * 5, at(0)[1] - py * 5, at(30)[0] - px * 5, at(30)[1] - py * 5);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 9; line(ctx, front[0], front[1], muzzle[0], muzzle[1]);
        ctx.strokeStyle = '#222'; ctx.lineWidth = 6; line(ctx, front[0], front[1], muzzle[0], muzzle[1]);
        const mg = at(12);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 10; line(ctx, mg[0], mg[1], mg[0] + px * 18, mg[1] + py * 18);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 7; line(ctx, mg[0], mg[1], mg[0] + px * 18, mg[1] + py * 18);
        break;
      }
      case 'chainsword': {
        const px = -dy, py = dx;
        const g = at(8), tip = at(8 + len), pom = at(-16);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 16; line(ctx, g[0], g[1], tip[0], tip[1]);
        ctx.strokeStyle = P('#4b4f57'); ctx.lineWidth = 12; line(ctx, g[0], g[1], tip[0], tip[1]);
        // dents animées
        ctx.fillStyle = P('#c8ccd2');
        const n = 9, off = (time * 40) % 1;
        for (let i = 0; i < n; i++) {
          const t = 10 + ((i + off) / n) * (len - 4);
          const a = at(t);
          ctx.beginPath(); ctx.moveTo(a[0] + px * 6, a[1] + py * 6); ctx.lineTo(a[0] + px * 11 + dx * 3, a[1] + py * 11 + dy * 3); ctx.lineTo(a[0] + px * 6 + dx * 6, a[1] + py * 6 + dy * 6); ctx.fill();
        }
        ctx.strokeStyle = P('#c9a227'); ctx.lineWidth = 3; line(ctx, g[0], g[1], at(len * 0.8)[0], at(len * 0.8)[1]);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 7; line(ctx, pom[0], pom[1], g[0], g[1]);
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 4.5; line(ctx, pom[0], pom[1], g[0], g[1]);
        break;
      }
      case 'shield': {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(-ang + PI / 2 + (w.tilt || 0));
        ctx.beginPath();
        ctx.moveTo(-6, -34); ctx.quadraticCurveTo(22, -36, 26, -30);
        ctx.quadraticCurveTo(28, 10, 4, 42); ctx.quadraticCurveTo(-22, 10, -24, -30);
        ctx.quadraticCurveTo(-18, -36, -6, -34); ctx.closePath();
        ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke();
        ctx.fillStyle = P(w.color || '#1f4fa8'); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = P(w.trim || '#d4a017'); ctx.stroke();
        ctx.fillStyle = P(w.trim || '#d4a017');
        ctx.fillRect(-3, -26, 6, 52); ctx.fillRect(-16, -8, 32, 6);
        ctx.restore();
        break;
      }
      case 'claws': break;
    }
  }

  // ------------------------------------------------------------- appendices
  function drawTail(ctx, J, d, L, c, time, pose) {
    const T = L.tail; if (!T) return;
    const h = J.hip;
    let x = h[0] - d.tBot * 0.42, y = h[1] + 2;
    let a = (T.angle != null ? T.angle : -2.0) + (pose.tail || 0);
    const n = T.segs || 9, seg = T.len / n;
    const pts = [[x, y]];
    for (let i = 0; i < n; i++) {
      a += (T.curl || 0.12) + Math.sin(time * (T.speed || 3) + i * 0.7) * (T.wave || 0.12);
      x += Math.sin(a) * seg; y += Math.cos(a) * seg;
      pts.push([x, y]);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        const w = U.lerp(T.w0, T.w1, i / n);
        ctx.strokeStyle = pass === 0 ? OUTLINE : P(T.color || c.skin);
        ctx.lineWidth = pass === 0 ? w + OUT * 2 : w;
        line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      }
    }
    const tip = pts[n];
    if (T.tip === 'ball') {
      circle(ctx, tip[0], tip[1], T.w1 * 1.1 + 3, P(T.color || c.skin));
    } else if (T.tip === 'flame') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fl = 1 + Math.sin(time * 18) * 0.15;
      for (let i = 0; i < 3; i++) {
        const s = (14 - i * 4) * fl * (T.flameScale || 1);
        ctx.fillStyle = ['rgba(255,80,0,0.7)', 'rgba(255,170,0,0.8)', 'rgba(255,250,200,0.9)'][i];
        ctx.beginPath();
        ctx.moveTo(tip[0] - s * 0.7, tip[1]);
        ctx.quadraticCurveTo(tip[0] - s * 0.6, tip[1] - s * 1.6, tip[0] + Math.sin(time * 11) * 3, tip[1] - s * 2.6);
        ctx.quadraticCurveTo(tip[0] + s * 0.6, tip[1] - s * 1.6, tip[0] + s * 0.7, tip[1]);
        ctx.arc(tip[0], tip[1], s * 0.7, 0, PI);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawWings(ctx, J, d, L, c, time, pose, back) {
    const W = L.wings; if (!W) return;
    const s = J.shoulder;
    const ox = s[0] - d.tTop * 0.35, oy = s[1] + 6;
    const spread = U.clamp(pose.wing != null ? pose.wing : 0.3, 0, 1.2);
    const flap = Math.sin(time * (spread > 0.7 ? 14 : 2)) * (spread > 0.7 ? 0.35 : 0.06);
    const k = back ? 0.85 : 1;
    const ang = -2.3 + spread * 0.9 + flap;
    const L1 = W.len * k;
    const wrist = [ox + Math.sin(ang) * L1 * 0.55, oy + Math.cos(ang) * L1 * 0.55];
    const tipA = ang - 0.3 + spread * 0.2;
    const tip = [wrist[0] + Math.sin(tipA) * L1 * 0.75, wrist[1] + Math.cos(tipA) * L1 * 0.75];
    const f2 = [wrist[0] + Math.sin(tipA - 0.7) * L1 * 0.6, wrist[1] + Math.cos(tipA - 0.7) * L1 * 0.6];
    const f3 = [wrist[0] + Math.sin(tipA - 1.3) * L1 * 0.45, wrist[1] + Math.cos(tipA - 1.3) * L1 * 0.45];
    const base2 = [ox - 6, oy + 40 * k];
    const mem = back ? P(U.shade(W.membrane, -0.3)) : P(W.membrane);
    ctx.beginPath();
    ctx.moveTo(ox, oy); ctx.lineTo(wrist[0], wrist[1]); ctx.lineTo(tip[0], tip[1]);
    ctx.quadraticCurveTo((tip[0] + f2[0]) / 2 + 6, (tip[1] + f2[1]) / 2 + 6, f2[0], f2[1]);
    ctx.quadraticCurveTo((f2[0] + f3[0]) / 2 + 6, (f2[1] + f3[1]) / 2 + 6, f3[0], f3[1]);
    ctx.quadraticCurveTo((f3[0] + base2[0]) / 2 + 4, (f3[1] + base2[1]) / 2 + 8, base2[0], base2[1]);
    ctx.closePath();
    ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = mem; ctx.fill();
    const bone = back ? P(U.shade(c.skin, -0.3)) : P(c.skin);
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 9; line(ctx, ox, oy, wrist[0], wrist[1]);
    ctx.strokeStyle = bone; ctx.lineWidth = 5.5; line(ctx, ox, oy, wrist[0], wrist[1]);
    ctx.lineWidth = 3; ctx.strokeStyle = bone;
    line(ctx, wrist[0], wrist[1], tip[0], tip[1]); line(ctx, wrist[0], wrist[1], f2[0], f2[1]); line(ctx, wrist[0], wrist[1], f3[0], f3[1]);
  }

  function drawCape(ctx, J, d, L, c, time, opt) {
    const K = L.cape; if (!K) return;
    const s = J.shoulder, h = J.hip;
    const vx = opt.vx || 0;
    const trail = U.clamp(Math.abs(vx) * 2.2, 0, 40) + 8;
    const sway = Math.sin(time * 3.2) * 5;
    const len = K.len || 100;
    const top1 = [s[0] - d.tTop * 0.45, s[1] - 2];
    const top2 = [s[0] + d.tTop * 0.1, s[1] + 2];
    const hemF = [h[0] - d.tBot * 0.3 + sway * 0.5, s[1] + len];
    const hemB = [h[0] - d.tBot * 0.5 - trail + sway, s[1] + len * 0.92];
    ctx.beginPath();
    ctx.moveTo(top2[0], top2[1]);
    ctx.quadraticCurveTo(h[0] - d.tBot * 0.1, (s[1] + hemF[1]) / 2, hemF[0], hemF[1]);
    ctx.quadraticCurveTo((hemF[0] + hemB[0]) / 2, hemF[1] + 8 + Math.sin(time * 4) * 3, hemB[0], hemB[1]);
    ctx.quadraticCurveTo(top1[0] - trail * 0.4 - 10, (top1[1] + hemB[1]) / 2, top1[0], top1[1]);
    ctx.closePath();
    ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.stroke();
    const g = ctx.createLinearGradient(top1[0], top1[1], hemB[0], hemB[1]);
    g.addColorStop(0, P(K.color)); g.addColorStop(1, P(U.shade(K.color, -0.35)));
    ctx.fillStyle = g; ctx.fill();
    if (K.inner) {
      ctx.strokeStyle = P(K.inner); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hemF[0], hemF[1]); ctx.quadraticCurveTo((hemF[0] + hemB[0]) / 2, hemF[1] + 8 + Math.sin(time * 4) * 3, hemB[0], hemB[1]); ctx.stroke();
    }
  }

  function drawRobe(ctx, J, d, L, c, time) {
    const R = L.robe; if (!R) return;
    const h = J.hip, t = J.torsoA;
    const px = Math.cos(t), py = Math.sin(t);
    const wb = d.tBot / 2 + 3;
    const wf = [h[0] + px * wb, h[1] + py * wb - 6];
    const wbk = [h[0] - px * wb, h[1] - py * wb - 6];
    const k1 = J.knee1, k2 = J.knee2, f1 = J.foot1, f2 = J.foot2;
    const hemY = Math.max(f1[1], f2[1]) - (R.short ? 34 : 10);
    const frontX = Math.max(k1[0], f1[0], k2[0], f2[0]) + 10;
    const backX = Math.min(k1[0], f1[0], k2[0], f2[0]) - 12;
    const wave = Math.sin(time * 3) * 3;
    ctx.beginPath();
    ctx.moveTo(wbk[0], wbk[1]);
    ctx.lineTo(wf[0], wf[1]);
    ctx.quadraticCurveTo(Math.max(wf[0], k1[0] + 14), (wf[1] + hemY) / 2, frontX + 4, hemY);
    ctx.quadraticCurveTo((frontX + backX) / 2, hemY + 6 + wave, backX - 6, hemY - 2);
    ctx.quadraticCurveTo(Math.min(wbk[0], k2[0] - 14), (wbk[1] + hemY) / 2, wbk[0], wbk[1]);
    ctx.closePath();
    ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.stroke();
    const g = ctx.createLinearGradient(0, wf[1], 0, hemY);
    g.addColorStop(0, P(R.color)); g.addColorStop(1, P(U.shade(R.color, -0.25)));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = P(U.shade(R.color, -0.35)); ctx.lineWidth = 2;
    line(ctx, (wf[0] + wbk[0]) / 2 + 4, wf[1] + 10, (frontX + backX) / 2 + 2, hemY - 4);
    if (R.trim) { ctx.strokeStyle = P(R.trim); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(frontX + 4, hemY); ctx.quadraticCurveTo((frontX + backX) / 2, hemY + 6 + wave, backX - 6, hemY - 2); ctx.stroke(); }
  }

  // ------------------------------------------------------------- rendu complet
  /**
   * Dessine un combattant. Le contexte doit être positionné aux pieds du personnage.
   * opt: { facing, time, flash, awakened, alpha, vx, weaponOff, glow, mouth, shadowTint }
   */
  function draw(ctx, look, pose, opt) {
    opt = opt || {};
    const d = dims(look);
    const p = pose.ua1 !== undefined && pose.wa !== undefined ? pose : completePose(pose);
    const J = solve(p, d, opt.joints);
    if (p.hidden) return J;
    const c = look.colors;
    const time = opt.time || 0;
    flashAmt = opt.flash || 0;
    shadowMode = opt.shadowTint || null;
    ctx.save();
    if (opt.alpha != null && opt.alpha < 1) ctx.globalAlpha = opt.alpha;
    const sc = (look.scale || 1) * (opt.scale || 1);
    ctx.scale((opt.facing || 1) * sc, sc);
    if (J.rot) {
      ctx.translate(J.hip[0], J.hip[1]);
      ctx.rotate(J.rot);
      ctx.translate(-J.hip[0], -J.hip[1]);
    }
    const awakened = opt.awakened && look.awaken;
    const limbsTop = (sh) => (sh ? dark(c.top, sh) : P(c.top));
    const sleeve = c.sleeve || c.top;
    const pants = c.bottom || c.top;
    const armCol = c.armSkin ? c.skin : sleeve;

    // 1. Queue, ailes, cape
    drawTail(ctx, J, d, look, c, time, p);
    if (look.wings) drawWings(ctx, J, d, look, c, time, p, true);
    drawCape(ctx, J, d, look, c, time, opt);
    if (look.jetpack) {
      const s = J.shoulder;
      ctx.save(); ctx.translate(s[0] - d.tTop * 0.55, s[1] + 18); ctx.rotate(J.torsoA);
      poly(ctx, [[-14, -26], [10, -30], [12, 30], [-16, 26]], P(c.metal || c.top));
      ctx.fillStyle = '#333'; ctx.fillRect(-14, 24, 9, 10); ctx.fillRect(0, 24, 9, 10);
      ctx.restore();
    }
    if (look.wings) drawWings(ctx, J, d, look, c, time, p, false);

    // 2. Bras arrière
    const w2 = look.weapon2;
    if (w2 && w2.layer !== 'front') drawWeapon(ctx, w2, J.hand2, J.wa2, c, opt, time);
    limb(ctx, J.shoulder, J.elbow2, J.hand2, d.armW, d.armW * 0.88, dark(armCol, 0.3), dark(armCol, 0.3), dark(c.gloves || c.skin, 0.3), d.armW * 0.62, 'hand', 0,
      c.gloves ? { from: 0.55, col: dark(c.gloves, 0.3) } : null);
    if (look.armorLimbs) plate(ctx, J.elbow2, J.hand2, d.armW + 3, dark(c.metal || c.top, 0.3), 0.15, 0.7);

    // 3. Jambe arrière
    const bootT = c.boots ? { from: look.bootFrom || 0.45, col: dark(c.boots, 0.3), extra: 2 } : null;
    limb(ctx, J.hip, J.knee2, J.foot2, d.legW, d.legW * 0.85, dark(pants, 0.3), dark(pants, 0.3), dark(c.boots || pants, 0.3), d.legW * 0.55, 'foot', J.shinA2, bootT);
    if (look.armorLimbs) { plate(ctx, J.knee2, J.foot2, d.legW + 3, dark(c.metal || c.top, 0.3), 0.1, 0.6); }

    // 4. Jambe avant
    const bootF = c.boots ? { from: look.bootFrom || 0.45, col: P(c.boots), extra: 2 } : null;
    limb(ctx, J.hip, J.knee1, J.foot1, d.legW, d.legW * 0.85, P(pants), P(pants), P(c.boots || pants), d.legW * 0.55, 'foot', J.shinA1, bootF);
    if (look.armorLimbs) {
      plate(ctx, J.hip, J.knee1, d.legW + 3, P(c.metal || c.top), 0.25, 0.85);
      plate(ctx, J.knee1, J.foot1, d.legW + 3, P(c.metal || c.top), 0.1, 0.6);
      circle(ctx, J.knee1[0], J.knee1[1], d.legW * 0.55, P(c.metal2 || c.metal || c.top));
    }
    if (look.trooperLimbs) {
      plate(ctx, J.hip, J.knee1, d.legW, P(c.top), 0.2, 0.8);
      plate(ctx, J.knee1, J.foot1, d.legW, P(c.top), 0.15, 0.55);
    }

    // 5. Robe
    drawRobe(ctx, J, d, look, c, time);

    // 6. Torse
    drawTorso(ctx, J, d, look, c, time);
    if (look.tube) {
      const s = J.shoulder, hd = J.head;
      ctx.lineCap = 'round';
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(hd[0] - d.head * 0.7, hd[1] + d.head * 0.4); ctx.quadraticCurveTo(s[0] - 30, s[1] - 6, s[0] - d.tTop * 0.4, s[1] + 18); ctx.stroke();
      ctx.strokeStyle = P(c.skin); ctx.lineWidth = 5.5; ctx.stroke();
    }
    // Cou
    ctx.lineCap = 'round';
    if (d.neck > 9) {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = d.armW * 1.3 + OUT * 2; line(ctx, J.neck[0], J.neck[1], J.head[0] - 4, J.head[1] + 4);
      ctx.strokeStyle = P(c.skin); ctx.lineWidth = d.armW * 1.3; line(ctx, J.neck[0], J.neck[1], J.head[0] - 4, J.head[1] + 4);
    }
    if (look.scarf) {
      const n = J.neck;
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 13; line(ctx, n[0] - 10, n[1] + 2, n[0] + 10, n[1] + 2);
      ctx.strokeStyle = P(look.scarf[0]); ctx.lineWidth = 10; line(ctx, n[0] - 10, n[1] + 2, n[0] + 10, n[1] + 2);
      const sw = Math.sin(time * 6) * 4 - U.clamp((opt.vx || 0) * 2, -14, 14);
      ctx.lineWidth = 8;
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = P(look.scarf[i % 2]);
        line(ctx, n[0] - 8 + sw * i * 0.3, n[1] + 4 + i * 8, n[0] - 10 + sw * (i + 1) * 0.3, n[1] + 4 + (i + 1) * 8);
      }
    }

    // 7. Tête
    drawHead(ctx, J, d, look, c, opt, time);

    // 8. Arme principale + bras avant
    const w = look.weapon;
    const wHand = w && w.hand === 2 ? J.hand2 : J.hand1;
    const wAng = w && w.hand === 2 ? J.wa2 : J.wa;
    if (w && w.behind) drawWeapon(ctx, w, wHand, wAng, c, opt, time);
    limb(ctx, J.shoulder, J.elbow1, J.hand1, d.armW, d.armW * 0.88, P(armCol), P(armCol), P(c.gloves || c.skin), d.armW * 0.62, 'hand', 0,
      c.gloves ? { from: 0.55, col: P(c.gloves) } : null);
    if (look.armorLimbs) {
      plate(ctx, J.shoulder, J.elbow1, d.armW + 3, P(c.metal || c.top), 0.3, 0.9);
      plate(ctx, J.elbow1, J.hand1, d.armW + 3, P(c.metal || c.top), 0.15, 0.7);
      circle(ctx, J.elbow1[0], J.elbow1[1], d.armW * 0.55, P(c.metal2 || c.metal || c.top));
    }
    if (look.trooperLimbs) {
      plate(ctx, J.shoulder, J.elbow1, d.armW, P(c.top), 0.3, 0.85);
      plate(ctx, J.elbow1, J.hand1, d.armW, P(c.top), 0.15, 0.6);
    }
    if (look.pads) {
      const s = J.shoulder;
      const pr = look.pads.r || 16;
      ctx.save(); ctx.translate(s[0], s[1] + 4); ctx.rotate(J.torsoA * 0.5 - 0.15);
      ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.25, pr, 0, PI, 0); ctx.lineTo(pr * 1.25, pr * 0.45);
      ctx.quadraticCurveTo(0, pr * 0.8, -pr * 1.25, pr * 0.45); ctx.closePath();
      ctx.lineWidth = OUT; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.fillStyle = P(look.pads.color || c.metal || c.top); ctx.fill();
      if (look.pads.trim) { ctx.strokeStyle = P(look.pads.trim); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.15, pr * 0.9, 0, PI, 0); ctx.stroke(); }
      ctx.restore();
    }
    if (w && !w.behind && !opt.weaponHidden) {
      drawWeapon(ctx, w, wHand, wAng, c, opt, time);
      if (w.hand !== 2) circle(ctx, J.hand1[0], J.hand1[1], d.armW * 0.62, P(c.gloves || c.skin));
    }
    if (w2 && w2.layer === 'front') drawWeapon(ctx, w2, J.hand2, J.wa2, c, opt, time);

    ctx.restore();
    flashAmt = 0;
    shadowMode = null;
    return J;
  }

  // Position monde d'une articulation (après draw/solve)
  function worldPoint(J, name, look, facing, ox, oy) {
    const p = J[name];
    const sc = look.scale || 1;
    if (!p) return [ox, oy];
    let x = p[0], y = p[1];
    if (J.rot) {
      const hx = J.hip[0], hy = J.hip[1];
      const c = Math.cos(J.rot), s = Math.sin(J.rot);
      const dx = x - hx, dy = y - hy;
      x = hx + dx * c - dy * s; y = hy + dx * s + dy * c;
    }
    return [ox + x * sc * facing, oy + y * sc];
  }

  function weaponTip(J, look, facing, ox, oy) {
    const w = look.weapon;
    const sc = look.scale || 1;
    if (!w) return worldPoint(J, 'hand1', look, facing, ox, oy);
    const hand = w.hand === 2 ? J.hand2 : J.hand1;
    const a = w.hand === 2 ? J.wa2 : J.wa;
    const len = (w.len || 60) * (w.type === 'staff' ? 0.65 : 1) + 10;
    return [ox + (hand[0] + Math.sin(a) * len) * sc * facing, oy + (hand[1] + Math.cos(a) * len) * sc];
  }

  // Portrait (buste) pour les menus
  const portraitCache = {};
  function portrait(look, size, opts) {
    opts = opts || {};
    const key = look.id + '|' + size + '|' + (opts.costume || 0) + '|' + (opts.shadow ? 1 : 0) + '|' + (opts.silhouette ? 1 : 0) + '|' + (opts.full ? 1 : 0) + '|' + (opts.flip ? 1 : 0);
    if (portraitCache[key]) return portraitCache[key];
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    const d = dims(look);
    const sc = look.scale || 1;
    const pose = completePose(Object.assign({}, look.portraitPose || C.Poses.get('portrait', look)));
    const J = solve(pose, d, {});
    // cadrage
    let k, cx, cy;
    if (opts.full) {
      const h = d.height * sc + 30;
      k = size / h * 0.92;
      cx = size / 2; cy = size * 0.97;
    } else {
      const head = J.head;
      const focusY = (head[1] + d.head * 0.4) * sc;
      k = size / ((d.head * 7.2 + 30) * sc) * (look.portraitZoom || 1);
      cx = size * 0.42 - head[0] * sc * k; cy = size * 0.5 - focusY * k;
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k * (opts.flip ? -1 : 1), k);
    draw(ctx, look, pose, { facing: 1, time: 0.3, shadowTint: opts.shadow ? '#2a0c3f' : null });
    ctx.restore();
    if (opts.silhouette) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#120a1c';
      ctx.fillRect(0, 0, size, size);
    }
    portraitCache[key] = cv;
    return cv;
  }

  C.Rig = { dims, solve, draw, lerpPose, completePose, worldPoint, weaponTip, portrait, BUILDS, BASE };
})(window.CDL = window.CDL || {});
