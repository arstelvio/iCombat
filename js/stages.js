/* Choc des Légendes — arènes : définitions, décors peints (enroulés autour de l'arène 3D par render3d.js),
   particules d'ambiance et vignettes des menus */
(function (C) {
  'use strict';
  const U = C.U;
  const PI = Math.PI;
  const GROUND = 600; // ligne du sol dans les calques (unités logiques)

  // ---------------------------------------------------------------- outils de dessin
  function mountains(ctx, w, base, peak, color, seed, jag) {
    const r = U.seeded(seed);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, base);
    let x = 0;
    while (x < w) {
      const pw = 120 + r() * 260;
      const h = peak * (0.45 + r() * 0.55);
      ctx.lineTo(x + pw * 0.5 + (jag ? (r() - 0.5) * 40 : 0), base - h);
      x += pw;
      ctx.lineTo(x, base - h * (0.2 + r() * 0.3));
    }
    ctx.lineTo(w, base); ctx.closePath(); ctx.fill();
  }
  function hills(ctx, w, base, amp, color, seed) {
    const r = U.seeded(seed);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, base + 400);
    const a1 = r() * 6, a2 = r() * 6;
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, base - amp * (0.5 + 0.3 * Math.sin(x * 0.004 + a1) + 0.2 * Math.sin(x * 0.011 + a2)));
    ctx.lineTo(w, base + 400); ctx.closePath(); ctx.fill();
  }
  function cloud(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 30 * s, 0, PI * 2); ctx.arc(x + 35 * s, y - 15 * s, 38 * s, 0, PI * 2);
    ctx.arc(x + 75 * s, y, 30 * s, 0, PI * 2); ctx.arc(x + 40 * s, y + 8 * s, 30 * s, 0, PI * 2);
    ctx.fill();
  }
  function pagoda(ctx, x, base, s, wall, roof, trim) {
    const floors = 3;
    let y = base;
    for (let i = 0; i < floors; i++) {
      const fw = (140 - i * 30) * s, fh = 60 * s;
      ctx.fillStyle = wall; ctx.fillRect(x - fw / 2, y - fh, fw, fh);
      ctx.fillStyle = trim; for (let k = -1; k <= 1; k++) ctx.fillRect(x + k * fw * 0.3 - 6 * s, y - fh * 0.75, 12 * s, fh * 0.55);
      y -= fh;
      ctx.fillStyle = roof;
      ctx.beginPath(); ctx.moveTo(x - fw * 0.85, y + 6 * s); ctx.quadraticCurveTo(x - fw * 0.5, y - 4 * s, x - fw * 0.35, y - 28 * s);
      ctx.lineTo(x + fw * 0.35, y - 28 * s); ctx.quadraticCurveTo(x + fw * 0.5, y - 4 * s, x + fw * 0.85, y + 6 * s); ctx.closePath(); ctx.fill();
      y -= 28 * s;
    }
    ctx.fillStyle = trim; ctx.fillRect(x - 3 * s, y - 40 * s, 6 * s, 40 * s);
  }
  function tree(ctx, x, base, s, trunk, leaves, seed, blossom) {
    const r = U.seeded(seed);
    ctx.strokeStyle = trunk; ctx.lineCap = 'round';
    ctx.lineWidth = 16 * s;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x - 10 * s, base - 80 * s, x + 6 * s, base - 150 * s); ctx.stroke();
    ctx.lineWidth = 7 * s;
    for (let i = 0; i < 4; i++) {
      const a = -PI / 2 + (r() - 0.5) * 1.8;
      ctx.beginPath(); ctx.moveTo(x + 4 * s, base - (100 + r() * 50) * s);
      ctx.lineTo(x + Math.cos(a) * 90 * s, base - 150 * s + Math.sin(a) * 60 * s); ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = blossom && r() < 0.3 ? U.shade(leaves, 0.25) : leaves;
      ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 200 * s, base - (150 + r() * 90) * s, (26 + r() * 30) * s, 0, PI * 2); ctx.fill();
    }
  }
  function stars(ctx, w, h, n, seed, color) {
    const r = U.seeded(seed);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = color || 'rgba(255,255,255,' + (0.3 + r() * 0.7) + ')';
      const s = r() < 0.08 ? 2.4 : 1.3;
      ctx.fillRect(r() * w, r() * h, s, s);
    }
  }
  function gothicSpire(ctx, x, base, s, color, windowCol) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 40 * s, base - 260 * s, 80 * s, 260 * s);
    ctx.beginPath(); ctx.moveTo(x - 50 * s, base - 260 * s); ctx.lineTo(x, base - 420 * s); ctx.lineTo(x + 50 * s, base - 260 * s); ctx.closePath(); ctx.fill();
    for (let i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(x + i * 52 * s, base - 200 * s); ctx.lineTo(x + i * 60 * s, base - 290 * s); ctx.lineTo(x + i * 44 * s, base - 200 * s); ctx.fill(); }
    if (windowCol) {
      ctx.fillStyle = windowCol;
      ctx.beginPath(); ctx.moveTo(x - 14 * s, base - 120 * s); ctx.lineTo(x - 14 * s, base - 180 * s); ctx.quadraticCurveTo(x, base - 210 * s, x + 14 * s, base - 180 * s); ctx.lineTo(x + 14 * s, base - 120 * s); ctx.fill();
    }
  }

  // ---------------------------------------------------------------- définitions
  const STAGES = [
    {
      id: 'temple', name: 'Temple des Nuages', desc: 'Une arène de pierre suspendue au-dessus des nuages.', music: 'battle1',
      sky: ['#5fb6ff', '#bfe6ff', '#fff1d6'], floor: { top: '#d9d2c3', bottom: '#8f8574', line: 'rgba(80,70,55,0.35)', tiles: true },
      far(ctx, w) {
        mountains(ctx, w, GROUND - 40, 300, '#93b6d8', 3, false);
        for (let i = 0; i < 12; i++) cloud(ctx, (i * 271) % w, GROUND - 60 - (i % 3) * 40, 1.3 + (i % 2) * 0.5, 'rgba(255,255,255,0.85)');
      },
      mid(ctx, w) {
        const r = U.seeded(9);
        for (let i = 0; i < 6; i++) {
          const x = 200 + i * (w / 6) + r() * 100, y = GROUND - 220 - r() * 140;
          ctx.fillStyle = '#7d8a6a'; ctx.beginPath(); ctx.moveTo(x - 70, y); ctx.lineTo(x + 70, y); ctx.lineTo(x + 20, y + 90); ctx.lineTo(x - 30, y + 70); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#5d8a4a'; ctx.fillRect(x - 72, y - 10, 144, 14);
        }
        pagoda(ctx, w * 0.5, GROUND - 20, 1.2, '#c8b89a', '#3b6b3b', '#8a2a1a');
        for (let i = 0; i < 10; i++) cloud(ctx, (i * 377 + 80) % w, GROUND + 10 - (i % 2) * 20, 1.6, 'rgba(255,255,255,0.95)');
      },
      ambient: 'leaves'
    },
    {
      id: 'chateau', name: 'Cour du Château', desc: 'La cour d\'honneur de Valombre, au crépuscule.', music: 'battle2',
      sky: ['#2b2350', '#c8506a', '#ffb36b'], floor: { top: '#8a7f73', bottom: '#4a4038', line: 'rgba(30,20,15,0.4)', tiles: true },
      far(ctx, w) {
        ctx.fillStyle = '#ffd38a'; ctx.beginPath(); ctx.arc(w * 0.62, GROUND - 160, 70, 0, PI * 2); ctx.fill();
        hills(ctx, w, GROUND - 40, 120, '#5a3a5a', 4);
        hills(ctx, w, GROUND, 70, '#432a48', 5);
      },
      mid(ctx, w) {
        const wall = '#6a5a5a', dark = '#4a3c40';
        ctx.fillStyle = wall; ctx.fillRect(0, GROUND - 230, w, 230);
        for (let x = 0; x < w; x += 46) { ctx.fillStyle = wall; ctx.fillRect(x, GROUND - 260, 28, 32); }
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        for (let y = GROUND - 230; y < GROUND; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        for (let i = 0; i < 6; i++) {
          const x = 150 + i * (w / 6);
          ctx.fillStyle = '#5c4c4e'; ctx.fillRect(x - 60, GROUND - 400, 120, 400);
          for (let k = -2; k <= 2; k++) ctx.fillRect(x + k * 26 - 10, GROUND - 430, 20, 30);
          ctx.fillStyle = '#ffcf6b'; ctx.fillRect(x - 10, GROUND - 330, 20, 34);
          ctx.fillStyle = i % 2 ? '#1f4fa8' : '#a3201b';
          ctx.beginPath(); ctx.moveTo(x + 70, GROUND - 260); ctx.lineTo(x + 130, GROUND - 260); ctx.lineTo(x + 130, GROUND - 120); ctx.lineTo(x + 100, GROUND - 145); ctx.lineTo(x + 70, GROUND - 120); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#e6c449'; ctx.fillRect(x + 92, GROUND - 230, 16, 40);
          // torche
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 100, GROUND - 170, 10, 40);
        }
      },
      torches: true, ambient: 'embers'
    },
    {
      id: 'bambous', name: 'Forêt de Bambous', desc: 'Sous la lune, les tiges murmurent les secrets des ninjas.', music: 'battle3',
      sky: ['#070a1c', '#1a2a4a', '#3a5a6a'], floor: { top: '#3a4a2a', bottom: '#1a2214', line: 'rgba(0,0,0,0.3)' },
      far(ctx, w) {
        stars(ctx, w, GROUND - 100, 160, 12);
        ctx.fillStyle = '#f4f1d0'; ctx.beginPath(); ctx.arc(w * 0.4, GROUND - 330, 80, 0, PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(244,241,208,0.15)'; ctx.beginPath(); ctx.arc(w * 0.4, GROUND - 330, 130, 0, PI * 2); ctx.fill();
        const r = U.seeded(21);
        for (let i = 0; i < 70; i++) { ctx.fillStyle = '#1c3a2c'; const x = r() * w; ctx.fillRect(x, GROUND - 600, 10 + r() * 8, 600); }
      },
      mid(ctx, w) {
        const r = U.seeded(33);
        for (let i = 0; i < 46; i++) {
          const x = r() * w, bw = 16 + r() * 14;
          ctx.fillStyle = r() < 0.5 ? '#2f6a3a' : '#28583a';
          ctx.fillRect(x, GROUND - 720, bw, 720);
          ctx.fillStyle = '#1a3a22';
          for (let y = GROUND - 700; y < GROUND; y += 80 + r() * 40) ctx.fillRect(x - 2, y, bw + 4, 5);
          ctx.fillStyle = '#3f8a4a';
          for (let k = 0; k < 3; k++) { const ly = GROUND - 200 - r() * 400; ctx.beginPath(); ctx.ellipse(x + bw + 20, ly, 28, 6, 0.4, 0, PI * 2); ctx.fill(); }
        }
      },
      ambient: 'fireflies'
    },
    {
      id: 'dojo', name: 'Jardin des Cerisiers', desc: 'Un dojo paisible où tombent les pétales du soir.', music: 'battle4',
      sky: ['#ff9a8b', '#ffc3a0', '#ffe6c7'], floor: { top: '#b98a5a', bottom: '#6a4a2a', line: 'rgba(60,35,15,0.45)', planks: true },
      far(ctx, w) {
        ctx.fillStyle = '#ffefe0'; ctx.beginPath(); ctx.arc(w * 0.3, GROUND - 200, 60, 0, PI * 2); ctx.fill();
        mountains(ctx, w, GROUND - 20, 260, '#c88aa0', 8, false);
        ctx.fillStyle = '#e9e0ff'; ctx.beginPath(); ctx.moveTo(w * 0.7 - 120, GROUND - 120); ctx.lineTo(w * 0.7, GROUND - 330); ctx.lineTo(w * 0.7 + 120, GROUND - 120); ctx.fill();
      },
      mid(ctx, w) {
        pagoda(ctx, w * 0.32, GROUND, 1.4, '#e8dcc8', '#4a2a3a', '#a3201b');
        ctx.fillStyle = '#a3201b';
        const tx = w * 0.62;
        ctx.fillRect(tx - 90, GROUND - 220, 18, 220); ctx.fillRect(tx + 72, GROUND - 220, 18, 220);
        ctx.fillRect(tx - 120, GROUND - 230, 240, 20); ctx.fillRect(tx - 100, GROUND - 190, 200, 14);
        for (let i = 0; i < 7; i++) tree(ctx, 120 + i * (w / 7), GROUND, 1.1, '#4a2a2a', '#ffb7d0', 50 + i, true);
      },
      ambient: 'petals'
    },
    {
      id: 'academie', name: "Grande Salle d'Ombrelune", desc: 'Le réfectoire de l\'académie, éclairé par mille bougies flottantes.', music: 'battle4',
      sky: ['#0b0b24', '#1a1a3a', '#2a2a4a'], floor: { top: '#5a5560', bottom: '#2a2830', line: 'rgba(0,0,0,0.35)', tiles: true, checker: true },
      far(ctx, w) {
        ctx.fillStyle = '#1c1c34'; ctx.fillRect(0, 0, w, GROUND);
        stars(ctx, w, 300, 120, 44);
        for (let i = 0; i < 9; i++) {
          const x = 120 + i * (w / 9);
          ctx.fillStyle = '#2a2a50'; ctx.fillRect(x - 50, 80, 100, GROUND - 120);
          ctx.fillStyle = '#5a6aa8';
          ctx.beginPath(); ctx.moveTo(x - 35, GROUND - 120); ctx.lineTo(x - 35, 180); ctx.quadraticCurveTo(x, 110, x + 35, 180); ctx.lineTo(x + 35, GROUND - 120); ctx.fill();
          ctx.strokeStyle = '#1c1c34'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, GROUND - 120); ctx.moveTo(x - 35, 300); ctx.lineTo(x + 35, 300); ctx.stroke();
        }
      },
      mid(ctx, w) {
        for (let i = 0; i < 4; i++) {
          const y = GROUND - 30 - i * 2;
          ctx.fillStyle = '#4a2e1a'; ctx.fillRect(0, y - 40 + i * 10, w, 16);
        }
        const cols = ['#7b3fb0', '#1565c0', '#2e7d32', '#c62828'];
        for (let i = 0; i < 8; i++) {
          const x = 100 + i * (w / 8);
          ctx.fillStyle = cols[i % 4]; ctx.fillRect(x - 40, 60, 80, 220);
          ctx.beginPath(); ctx.moveTo(x - 40, 280); ctx.lineTo(x, 320); ctx.lineTo(x + 40, 280); ctx.fill();
          ctx.fillStyle = '#d9b44a'; ctx.beginPath(); ctx.arc(x, 160, 22, 0, PI * 2); ctx.fill();
        }
      },
      ambient: 'candles'
    },
    {
      id: 'vaisseau', name: 'Hangar Impérial', desc: 'À bord d\'un croiseur stellaire, face à une planète inconnue.', music: 'battle5',
      sky: ['#02030a', '#0a1020', '#141c30'], floor: { top: '#3a3f4a', bottom: '#15181f', line: 'rgba(120,180,255,0.25)', tiles: true, metal: true },
      far(ctx, w) {
        stars(ctx, w, GROUND, 300, 77);
        const g = ctx.createRadialGradient(w * 0.55, GROUND - 120, 20, w * 0.55, GROUND - 120, 260);
        g.addColorStop(0, '#6ad7ff'); g.addColorStop(0.6, '#2a5aa8'); g.addColorStop(1, 'rgba(10,20,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w * 0.55, GROUND - 120, 260, 0, PI * 2); ctx.fill();
        ctx.fillStyle = '#9fd8ff'; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.ellipse(w * 0.55, GROUND - 120, 340, 40, -0.2, 0, PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      },
      mid(ctx, w) {
        ctx.fillStyle = '#2a2e38';
        ctx.fillRect(0, 0, w, 90); ctx.fillRect(0, GROUND - 60, w, 60);
        for (let i = 0; i < 12; i++) {
          const x = i * (w / 12);
          ctx.fillStyle = '#353a46'; ctx.beginPath(); ctx.moveTo(x - 30, 90); ctx.lineTo(x + 30, 90); ctx.lineTo(x + 14, GROUND - 60); ctx.lineTo(x - 14, GROUND - 60); ctx.fill();
          ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 4, GROUND - 90, 8, 8);
          ctx.fillStyle = '#6ad7ff'; ctx.fillRect(x - 20, 70, 40, 4);
        }
        // chasseurs garés
        for (let i = 0; i < 3; i++) {
          const x = 300 + i * (w / 3), y = GROUND - 130;
          ctx.fillStyle = '#4a4e58';
          ctx.fillRect(x - 70, y - 50, 10, 100); ctx.fillRect(x + 60, y - 50, 10, 100); ctx.fillRect(x - 60, y - 4, 120, 8);
          ctx.beginPath(); ctx.arc(x, y, 26, 0, PI * 2); ctx.fill();
          ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y, 13, 0, PI * 2); ctx.fill();
        }
      },
      ambient: 'none'
    },
    {
      id: 'forge', name: 'Monde-Forge en Ruines', desc: 'Les cathédrales d\'un empire stellaire brûlent sous un ciel de cendres.', music: 'battle2',
      sky: ['#1a0a0a', '#6a1a0a', '#d4561a'], floor: { top: '#4a3a32', bottom: '#1f1612', line: 'rgba(0,0,0,0.4)' },
      far(ctx, w) {
        const r = U.seeded(91);
        for (let i = 0; i < 10; i++) gothicSpire(ctx, r() * w, GROUND - 40, 0.7 + r() * 0.5, '#3a1a14', null);
        for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(30,10,10,0.4)'; ctx.beginPath(); ctx.arc(r() * w, GROUND - 300 - r() * 200, 80 + r() * 100, 0, PI * 2); ctx.fill(); }
      },
      mid(ctx, w) {
        const r = U.seeded(92);
        for (let i = 0; i < 5; i++) gothicSpire(ctx, 200 + i * (w / 5) + r() * 80, GROUND, 1.1 + r() * 0.3, '#2a1612', '#ff8a3c');
        ctx.fillStyle = '#2a1612';
        for (let i = 0; i < 20; i++) { const x = r() * w; ctx.beginPath(); ctx.moveTo(x - 60, GROUND); ctx.lineTo(x - 20 + r() * 40, GROUND - 40 - r() * 70); ctx.lineTo(x + 60, GROUND); ctx.fill(); }
      },
      ambient: 'ash', fires: true
    },
    {
      id: 'volcan', name: 'Cœur du Volcan', desc: 'La lave rugit sous les ailes du dragon.', music: 'battle3',
      sky: ['#1a0505', '#3a0a05', '#8a2a0a'], floor: { top: '#3a2a26', bottom: '#120a08', line: 'rgba(255,90,0,0.25)', lava: true },
      far(ctx, w) {
        mountains(ctx, w, GROUND, 420, '#2a0f0a', 13, true);
        const r = U.seeded(14);
        for (let i = 0; i < 8; i++) { const x = r() * w; ctx.strokeStyle = 'rgba(255,90,0,0.6)'; ctx.lineWidth = 4 + r() * 6; ctx.beginPath(); ctx.moveTo(x, GROUND - 300 + r() * 100); ctx.quadraticCurveTo(x + 30, GROUND - 150, x + r() * 40, GROUND); ctx.stroke(); }
      },
      mid(ctx, w) {
        const r = U.seeded(15);
        ctx.fillStyle = '#1f0c08';
        for (let i = 0; i < 16; i++) { const x = r() * w; ctx.beginPath(); ctx.moveTo(x - 50, GROUND); ctx.lineTo(x, GROUND - 100 - r() * 200); ctx.lineTo(x + 40, GROUND); ctx.fill(); }
        for (let i = 0; i < 10; i++) { const x = r() * w; ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x, 80 + r() * 140); ctx.lineTo(x + 30, 0); ctx.fill(); }
      },
      ambient: 'embers'
    },
    {
      id: 'ruines', name: 'Ruines Célestes', desc: 'Des temples antiques flottent parmi les cristaux.', music: 'battle1',
      sky: ['#7a6ad8', '#c8a8f0', '#ffd6f0'], floor: { top: '#cfc6e0', bottom: '#7a6a9a', line: 'rgba(80,60,120,0.3)', tiles: true },
      far(ctx, w) {
        for (let i = 0; i < 10; i++) cloud(ctx, (i * 331) % w, GROUND - 100 - (i % 4) * 60, 1.4, 'rgba(255,240,255,0.7)');
        const r = U.seeded(61);
        for (let i = 0; i < 7; i++) {
          const x = r() * w, y = GROUND - 250 - r() * 200;
          ctx.fillStyle = '#b8a8d8'; ctx.beginPath(); ctx.moveTo(x - 60, y); ctx.lineTo(x + 60, y); ctx.lineTo(x, y + 80); ctx.fill();
          ctx.fillStyle = '#e8e0f8'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 40 + k * 32, y - 70, 12, 70);
          ctx.fillRect(x - 50, y - 80, 100, 12);
        }
      },
      mid(ctx, w) {
        const r = U.seeded(62);
        for (let i = 0; i < 12; i++) {
          const x = r() * w, s = 0.6 + r() * 0.9;
          ctx.fillStyle = r() < 0.5 ? 'rgba(160,220,255,0.85)' : 'rgba(255,170,230,0.85)';
          ctx.beginPath(); ctx.moveTo(x, GROUND - 160 * s); ctx.lineTo(x + 30 * s, GROUND - 60 * s); ctx.lineTo(x, GROUND); ctx.lineTo(x - 30 * s, GROUND - 60 * s); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(x, GROUND - 160 * s); ctx.lineTo(x + 8 * s, GROUND - 60 * s); ctx.lineTo(x, GROUND - 20 * s); ctx.fill();
        }
        for (let i = 0; i < 6; i++) { const x = 150 + i * (w / 6); ctx.fillStyle = '#e8e0f8'; ctx.fillRect(x - 15, GROUND - 260, 30, 260); ctx.fillRect(x - 25, GROUND - 270, 50, 14); }
      },
      ambient: 'sparkles'
    },
    {
      id: 'neant', name: 'Le Néant', desc: 'Au-delà de toutes les réalités, là où Oméga règne.', music: 'boss',
      sky: ['#000000', '#12021f', '#2a0a3f'], floor: { top: '#2a0c3f', bottom: '#05010a', line: 'rgba(255,61,242,0.35)', tiles: true, glow: true },
      far(ctx, w) {
        stars(ctx, w, GROUND + 100, 400, 101);
        const blobs = [['#ff3df2', 0.2], ['#3d7bff', 0.4], ['#8a2be2', 0.7]];
        blobs.forEach((b, i) => {
          const g = ctx.createRadialGradient(w * b[1], GROUND - 250, 10, w * b[1], GROUND - 250, 380);
          g.addColorStop(0, U.rgba(b[0], 0.45)); g.addColorStop(1, U.rgba(b[0], 0));
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, GROUND + 100);
        });
      },
      mid(ctx, w) {
        const r = U.seeded(103);
        for (let i = 0; i < 9; i++) {
          const x = r() * w, y = GROUND - 150 - r() * 350, s = 0.5 + r();
          ctx.fillStyle = ['#3a2a5a', '#2a4a3a', '#5a3a2a'][i % 3];
          ctx.beginPath(); ctx.moveTo(x - 80 * s, y); ctx.lineTo(x + 80 * s, y); ctx.lineTo(x + 30 * s, y + 90 * s); ctx.lineTo(x - 40 * s, y + 70 * s); ctx.closePath(); ctx.fill();
          ctx.fillStyle = ['#5a8a4a', '#8a8a9a', '#c88a4a'][i % 3]; ctx.fillRect(x - 82 * s, y - 8 * s, 164 * s, 12 * s);
        }
      },
      ambient: 'void'
    }
  ];

  // ---------------------------------------------------------------- moteur de décor
  class Stage {
    constructor(def, quality) {
      this.def = def;
      this.left = -1150; this.right = 1150;
      this.q = quality || 1;
      this.layers = [];
      this.parts = [];
      this.t = 0;
      this.build();
    }
    build() {
      const d = this.def;
      const mk = (w, fn, p) => {
        const cv = document.createElement('canvas');
        cv.width = Math.round(w * this.q); cv.height = Math.round(760 * this.q);
        const g = cv.getContext('2d');
        g.scale(this.q, this.q);
        fn(g, w);
        this.layers.push({ cv, w, p });
      };
      if (d.far) mk(2800, d.far.bind(d), 0.18);
      if (d.mid) mk(3400, d.mid.bind(d), 0.5);
    }
    // Sol (pour les vignettes des menus ; en combat, le sol est modélisé en 3D)
    drawFloor(ctx, cam, W, H) {
      const f = this.def.floor;
      const gy = cam.groundY;
      if (gy >= H) return;
      const g = ctx.createLinearGradient(0, gy, 0, H);
      g.addColorStop(0, f.top); g.addColorStop(1, f.bottom);
      ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy);
      ctx.strokeStyle = f.line; ctx.lineWidth = 2;
      const toX = (wx) => (wx - cam.x) * cam.zoom + W / 2;
      if (f.tiles || f.planks || f.metal) {
        const step = f.planks ? 70 : 140;
        const start = Math.floor((this.left - 600) / step) * step;
        ctx.beginPath();
        for (let x = start; x <= this.right + 600; x += step) {
          const sx = toX(x);
          if (f.planks) { ctx.moveTo(sx, gy); ctx.lineTo(W / 2 + (sx - W / 2) * 1.9, H); }
          else { ctx.moveTo(sx, gy); ctx.lineTo(W / 2 + (sx - W / 2) * 2.2, H); }
        }
        const rows = f.planks ? 0 : 4;
        for (let i = 1; i <= rows; i++) { const y = gy + (H - gy) * Math.pow(i / (rows + 1), 1.6); ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
      }
      if (f.checker) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        const step = 140;
        for (let x = Math.floor((this.left - 600) / step) * step, k = 0; x < this.right + 600; x += step, k++) {
          if (k % 2) continue;
          const a = toX(x), b = toX(x + step);
          ctx.beginPath(); ctx.moveTo(a, gy); ctx.lineTo(b, gy); ctx.lineTo(W / 2 + (b - W / 2) * 2.2, H); ctx.lineTo(W / 2 + (a - W / 2) * 2.2, H); ctx.fill();
        }
      }
      if (f.lava) {
        const t = this.t * 0.05;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
          const x = toX(this.left - 300 + i * 600 + Math.sin(t + i) * 30);
          ctx.fillStyle = 'rgba(255,90,0,' + (0.25 + 0.1 * Math.sin(t * 2 + i)) + ')';
          ctx.beginPath(); ctx.ellipse(x, gy + (H - gy) * 0.6, 160 * cam.zoom, 20, 0, 0, PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      if (f.glow) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,61,242,' + (0.12 + 0.05 * Math.sin(this.t * 0.05)) + ')';
        ctx.fillRect(0, gy, W, 4);
        ctx.globalCompositeOperation = 'source-over';
      }
      // limites de l'arène
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      const lx = toX(this.left), rx = toX(this.right);
      if (lx > 0) ctx.fillRect(0, gy, lx, H - gy);
      if (rx < W) ctx.fillRect(rx, gy, W - rx, H - gy);
    }
    // Particules d'ambiance en espace écran
    drawAmbient(ctx, cam, W, H) {
      const a = this.def.ambient;
      if (!a || a === 'none') return;
      if (this.parts.length < 40 && this.t % 4 === 0) {
        const p = { x: Math.random() * W, y: -20, vx: 0, vy: 0, s: 1, life: 600, ph: Math.random() * 6 };
        switch (a) {
          case 'petals': p.vx = U.rand(-1.6, -0.4); p.vy = U.rand(0.6, 1.4); p.c = U.choice(['#ffb7d0', '#ffd0e0', '#ff9ec0']); p.s = U.rand(4, 7); break;
          case 'leaves': p.vx = U.rand(-1.8, -0.6); p.vy = U.rand(0.5, 1.2); p.c = U.choice(['#7aa84a', '#a8c86a', '#d8b84a']); p.s = U.rand(4, 7); break;
          case 'embers': p.y = H + 10; p.vx = U.rand(-0.5, 0.5); p.vy = -U.rand(0.8, 2.2); p.c = U.choice(['#ff8a1a', '#ffb000', '#ff5a00']); p.s = U.rand(2, 4); p.glow = true; break;
          case 'ash': p.vx = U.rand(-1, 0.3); p.vy = U.rand(0.3, 0.9); p.c = '#8a8078'; p.s = U.rand(2, 4); break;
          case 'fireflies': p.y = U.rand(H * 0.3, H * 0.9); p.vx = U.rand(-0.3, 0.3); p.vy = U.rand(-0.3, 0.3); p.c = '#d8ff7a'; p.s = 3; p.glow = true; p.life = 300; break;
          case 'candles': p.y = U.rand(30, H * 0.45); p.vx = 0; p.vy = 0; p.c = '#ffd27a'; p.s = 5; p.glow = true; p.life = 400; p.candle = true; break;
          case 'sparkles': p.y = U.rand(0, H); p.vx = U.rand(-0.2, 0.2); p.vy = -U.rand(0.2, 0.6); p.c = U.choice(['#ffffff', '#ffd6f0', '#c8e8ff']); p.s = U.rand(2, 4); p.glow = true; p.life = 260; break;
          case 'void': p.y = U.rand(0, H); p.vx = U.rand(-0.4, 0.4); p.vy = U.rand(-0.4, 0.4); p.c = U.choice(['#ff3df2', '#8a2be2', '#3d7bff']); p.s = U.rand(2, 4); p.glow = true; p.life = 300; break;
        }
        this.parts.push(p);
      }
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.ph += 0.05;
        p.x += p.vx + Math.sin(p.ph) * 0.4; p.y += p.vy;
        if (--p.life <= 0 || p.y > H + 30 || p.y < -40 || p.x < -40 || p.x > W + 40) { this.parts.splice(i, 1); continue; }
        if (p.glow) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.6 + 0.4 * Math.sin(p.ph * 2);
          const s = p.s * 4;
          ctx.drawImage(C.FX.glowSprite(p.c), p.x - s, p.y - s, s * 2, s * 2);
          if (p.candle) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#f4f1e8'; ctx.fillRect(p.x - 3, p.y + 3, 6, 18); }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.fillStyle = p.c;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ph);
          ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, PI * 2); ctx.fill();
          ctx.restore();
        }
      }
    }
    // Vignette pour les menus
    static thumb(def, w, h) {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      const st = new Stage(def, 0.5);
      const zoom = h / 760 * 1.25;
      const cam = { x: 0, zoom, groundY: h * 0.82, baseGroundY: h * 0.82 };
      ctx.save();
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, def.sky[0]); g.addColorStop(0.55, def.sky[1]); g.addColorStop(1, def.sky[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (const L of st.layers) {
        const sx = w / 2 - (L.w / 2) * zoom;
        ctx.drawImage(L.cv, sx, cam.groundY - GROUND * zoom, L.w * zoom, 760 * zoom);
      }
      st.drawFloor(ctx, cam, w, h);
      ctx.restore();
      return cv;
    }
  }

  const byId = {};
  STAGES.forEach((s) => { byId[s.id] = s; });
  C.Stages = { list: STAGES, byId, Stage, get: (id) => byId[id] || STAGES[0] };
})(window.CDL = window.CDL || {});
