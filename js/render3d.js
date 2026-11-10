/* Choc des Légendes — rendu 3D (three.js) : arènes, combattants, caméra, portraits des menus.
   La logique du combat fournit des positions dans le « plan de combat » (x le long de l'axe entre les
   combattants, y vertical, zl latéral) et l'orientation de ce plan dans l'arène ; ce module les place
   dans le monde 3D et donne à la couche 2D (effets, projectiles, interface) de quoi s'y projeter. */
(function (C) {
  'use strict';
  const U = C.U;
  const PI = Math.PI;
  const ARENA_R = 1150;
  let T3 = null;
  let renderer = null, canvas = null, scene, camera, actors, stageG, sun, hemi, failed = false;
  let pr = null, pscene, pcam, pcur = null, pBlack = null;
  const PSIZE = 512;
  let cur = null;           // combat actuellement affiché
  let models = [];          // modèles des deux combattants
  let shadows = [];
  let extras = new Map();   // entités représentées en 3D (renforts, images rémanentes)
  let stageKey = null, stageDisposables = [], stageAnim = [];
  let skyTex = null, darkBg = null;
  const tmpJ = {};

  // ------------------------------------------------------------------ décors
  // outer : sol autour de l'arène ('ground'), vide ('void') ou lave ('lava')
  const SETS = {
    temple: { outer: 'void', sun: '#fff6e0', sky: '#cfe8ff', props: [['pillar', 10, 1420, '#d9d2c3'], ['lantern', 10, 1290, '#ffcf6a'], ['cloud', 16, 2300, '#ffffff']] },
    chateau: { outer: 'ground', sun: '#ffd0a0', sky: '#c8708a', props: [['torch', 12, 1330, '#ff8a1a'], ['banner', 10, 2550, '#a3201b'], ['pillar', 12, 2800, '#6a5a5a']] },
    bambous: { outer: 'ground', sun: '#cfe0ff', sky: '#3a5a7a', dim: 0.85, props: [['bamboo', 90, 2500, '#4f8a3a'], ['lantern', 8, 1300, '#d8ff7a'], ['rock', 18, 1420, '#3a4234']] },
    dojo: { outer: 'ground', sun: '#fff0e0', sky: '#ffc3a0', props: [['tree', 14, 2550, '#ffb7d0'], ['torii', 2, 2500, '#c0392b'], ['lantern', 8, 1300, '#ffd27a'], ['rock', 12, 1420, '#8a7a6a']] },
    academie: { outer: 'ground', sun: '#ffe8c0', sky: '#3a3a6a', dim: 0.9, props: [['pillar', 14, 1420, '#5a5560'], ['pillar', 12, 2700, '#4a4658'], ['candle', 40, 900, '#ffd27a'], ['banner', 10, 2550, '#7b3fb0']] },
    vaisseau: { outer: 'ground', sun: '#cfe4ff', sky: '#27324a', dim: 0.9, props: [['crate', 22, 1450, '#4a5260'], ['pylon', 12, 1320, '#7fb8ff'], ['pillar', 10, 2700, '#2a2f3a']] },
    forge: { outer: 'ground', sun: '#ffc090', sky: '#8a2a1a', props: [['torch', 12, 1330, '#ff6a1a'], ['rock', 18, 1550, '#3a2a26'], ['pillar', 10, 2700, '#3a2a26'], ['crate', 10, 1500, '#4a3a32']] },
    volcan: { outer: 'lava', sun: '#ffb080', sky: '#8a2a0a', props: [['spike', 26, 2450, '#2a1c18'], ['rock', 18, 1420, '#3a2a26'], ['lavapool', 10, 1900, '#ff5a00']] },
    ruines: { outer: 'void', sun: '#ffffff', sky: '#c8a8f0', props: [['broken', 14, 1400, '#cfc6e0'], ['crystal', 16, 1650, '#b88aff'], ['cloud', 12, 2400, '#ffe6fa']] },
    neant: { outer: 'void', sun: '#e8c8ff', sky: '#3a1a5f', dim: 0.9, props: [['crystal', 22, 1500, '#ff3df2'], ['spike', 16, 2450, '#1a0828'], ['crystal', 14, 2600, '#3d7bff']] }
  };

  function mk(geometry, material, x, y, z) {
    const m = new T3.Mesh(geometry, material);
    m.position.set(x || 0, y || 0, z || 0);
    stageDisposables.push(geometry);
    return m;
  }
  function lit(color, opts) {
    const m = new T3.MeshLambertMaterial(Object.assign({ color }, opts));
    stageDisposables.push(m);
    return m;
  }
  function glowM(color, opacity, add) {
    const m = new T3.MeshBasicMaterial({ color, transparent: true, opacity: opacity == null ? 1 : opacity, fog: false });
    if (add) { m.blending = T3.AdditiveBlending; m.depthWrite = false; }
    stageDisposables.push(m);
    return m;
  }
  function canvasTex(cv) {
    const t = new T3.CanvasTexture(cv);
    t.colorSpace = T3.SRGBColorSpace;
    stageDisposables.push(t);
    return t;
  }

  // Texture du sol de l'arène, vue de dessus
  function floorTexture(def) {
    const f = def.floor, S = 1024, k = S / (ARENA_R * 2 + 200);
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.55);
    rg.addColorStop(0, f.top); rg.addColorStop(1, U.mix(f.top, f.bottom, 0.65));
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    const step = (f.planks ? 70 : 140) * k;
    if (f.checker) {
      g.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = 0; i * step < S; i++) for (let j = 0; j * step < S; j++) if ((i + j) % 2) g.fillRect(i * step, j * step, step, step);
    }
    g.strokeStyle = f.line; g.lineWidth = 2;
    g.beginPath();
    if (f.tiles || f.metal || f.checker) {
      for (let x = (S / 2) % step; x < S; x += step) { g.moveTo(x, 0); g.lineTo(x, S); g.moveTo(0, x); g.lineTo(S, x); }
    } else if (f.planks) {
      for (let x = 0; x < S; x += step) { g.moveTo(0, x); g.lineTo(S, x); }
      for (let x = 0, i = 0; x < S; x += step, i++) for (let y = (i % 2) * 90; y < S; y += 180) { g.moveTo(y, x); g.lineTo(y, x + step); }
    } else {
      const rnd = U.seeded(5);
      for (let i = 0; i < 90; i++) { const x = rnd() * S, y = rnd() * S; g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 60); }
    }
    g.stroke();
    if (f.lava) {
      const rnd = U.seeded(8);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 50;
        const lg = g.createRadialGradient(x, y, 0, x, y, r);
        lg.addColorStop(0, 'rgba(255,120,0,0.55)'); lg.addColorStop(1, 'rgba(255,60,0,0)');
        g.fillStyle = lg; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = 'source-over';
    }
    // cercle de combat
    g.strokeStyle = f.glow ? 'rgba(255,61,242,0.85)' : 'rgba(255,255,255,0.28)';
    g.lineWidth = f.glow ? 6 : 4;
    g.beginPath(); g.arc(S / 2, S / 2, ARENA_R * k, 0, PI * 2); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.arc(S / 2, S / 2, 300 * k, 0, PI * 2); g.stroke();
    return cv;
  }

  function buildProps(set, def) {
    const rnd = U.seeded(def.id.length * 31 + def.name.length);
    for (const pd of set.props) {
      const kind = pd[0], n = pd[1], R = pd[2], col = pd[3];
      const group = new T3.Group();
      stageG.add(group);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * PI * 2 + rnd() * 0.25, r = R + rnd() * (kind === 'bamboo' || kind === 'rock' || kind === 'spike' || kind === 'crate' ? 900 : 120);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const g = new T3.Group(); g.position.set(x, 0, z); g.rotation.y = -a + PI / 2; group.add(g);
        switch (kind) {
          case 'pillar': {
            const h = R > 2000 ? 900 + rnd() * 500 : 105;
            g.add(mk(new T3.CylinderGeometry(R > 2000 ? 70 : 34, R > 2000 ? 80 : 40, h, 10), lit(col), 0, h / 2, 0));
            g.add(mk(new T3.BoxGeometry(R > 2000 ? 190 : 96, 18, R > 2000 ? 190 : 96), lit(U.shade(col, 0.08)), 0, h + 9, 0));
            break;
          }
          case 'broken': {
            const h = 60 + rnd() * 70;
            const m = mk(new T3.CylinderGeometry(34, 40, h, 9), lit(col), 0, h / 2, 0);
            m.rotation.z = (rnd() - 0.5) * 0.25; g.add(m);
            g.add(mk(new T3.CylinderGeometry(32, 34, 40, 9), lit(U.shade(col, -0.1)), 70 * (rnd() - 0.5), 18, 60 + rnd() * 30).rotateZ(PI / 2));
            break;
          }
          case 'lantern': case 'torch': case 'pylon': {
            const h = kind === 'pylon' ? 100 : 90;
            g.add(mk(new T3.CylinderGeometry(5, 7, h, 6), lit(kind === 'pylon' ? '#3a3f4a' : '#4a3a2a'), 0, h / 2, 0));
            const lamp = mk(kind === 'torch' ? new T3.ConeGeometry(13, 34, 6) : new T3.BoxGeometry(20, 22, 20), glowM(col, 1), 0, h + 14, 0);
            g.add(lamp);
            const halo = mk(new T3.SphereGeometry(38, 10, 8), glowM(col, 0.28, true), 0, h + 14, 0);
            g.add(halo);
            stageAnim.push((t) => { const k = 1 + Math.sin(t * 9 + i * 2) * (kind === 'torch' ? 0.18 : 0.05); halo.scale.setScalar(k); if (kind === 'torch') lamp.scale.y = k; });
            break;
          }
          case 'candle': {
            const y = 420 + rnd() * 380, rr = 350 + rnd() * 1500, aa = rnd() * PI * 2;
            g.position.set(Math.cos(aa) * rr, 0, Math.sin(aa) * rr);
            g.add(mk(new T3.CylinderGeometry(4, 4, 22, 6), glowM('#f4f1e8', 1), 0, y, 0));
            const fl = mk(new T3.SphereGeometry(13, 8, 6), glowM(col, 0.6, true), 0, y + 18, 0);
            g.add(fl);
            stageAnim.push((t) => { g.position.y = Math.sin(t * 0.8 + i) * 12; fl.scale.setScalar(1 + Math.sin(t * 11 + i * 3) * 0.2); });
            break;
          }
          case 'bamboo': {
            const h = 700 + rnd() * 600;
            const m = mk(new T3.CylinderGeometry(9, 12, h, 6), lit(U.shade(col, (rnd() - 0.5) * 0.3)), 0, h / 2, 0);
            m.rotation.z = (rnd() - 0.5) * 0.1; g.add(m);
            g.add(mk(new T3.SphereGeometry(70, 7, 5), lit(U.shade(col, 0.1)), 0, h, 0));
            break;
          }
          case 'tree': {
            g.add(mk(new T3.CylinderGeometry(32, 46, 420, 7), lit('#4a2c2a'), 0, 210, 0));
            for (let k = 0; k < 6; k++) g.add(mk(new T3.SphereGeometry(150 + rnd() * 80, 8, 6), lit(k % 3 ? col : U.shade(col, 0.2)), (rnd() - 0.5) * 360, 480 + rnd() * 200, (rnd() - 0.5) * 360));
            break;
          }
          case 'torii': {
            g.position.set(Math.cos(i * PI) * R, 0, Math.sin(i * PI) * R); g.rotation.y = PI / 2;
            g.add(mk(new T3.CylinderGeometry(34, 40, 800, 8), lit(col), -350, 400, 0));
            g.add(mk(new T3.CylinderGeometry(34, 40, 800, 8), lit(col), 350, 400, 0));
            g.add(mk(new T3.BoxGeometry(1040, 60, 84), lit(col), 0, 800, 0));
            g.add(mk(new T3.BoxGeometry(820, 42, 60), lit(col), 0, 650, 0));
            break;
          }
          case 'rock': {
            const s = 30 + rnd() * 55;
            const m = mk(new T3.DodecahedronGeometry(s, 0), lit(U.shade(col, (rnd() - 0.5) * 0.2)), 0, s * 0.35, 0);
            m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); m.scale.y = 0.7; g.add(m);
            break;
          }
          case 'spike': {
            const h = 120 + rnd() * 260;
            const m = mk(new T3.ConeGeometry(40 + rnd() * 40, h, 6), lit(col), 0, h / 2 - 6, 0);
            m.rotation.z = (rnd() - 0.5) * 0.4; g.add(m);
            break;
          }
          case 'lavapool': {
            const m = mk(new T3.CircleGeometry(150 + rnd() * 160, 16), glowM(col, 0.75, true), 0, 2, 0);
            m.rotation.x = -PI / 2; g.add(m);
            stageAnim.push((t) => { m.material.opacity = 0.55 + Math.sin(t * 2 + i) * 0.2; });
            break;
          }
          case 'crate': {
            const s = 50 + rnd() * 45;
            const m = mk(new T3.BoxGeometry(s * 1.3, s, s), lit(U.shade(col, (rnd() - 0.5) * 0.25)), 0, s / 2, 0);
            m.rotation.y = rnd() * 3; g.add(m);
            break;
          }
          case 'crystal': {
            const s = 40 + rnd() * 60, y = 120 + rnd() * (R > 2000 ? 900 : 260);
            const m = mk(new T3.OctahedronGeometry(s, 0), glowM(col, 0.8), 0, y, 0);
            m.scale.y = 1.9; g.add(m);
            g.add(mk(new T3.SphereGeometry(s * 1.5, 8, 6), glowM(col, 0.16, true), 0, y, 0));
            stageAnim.push((t) => { m.rotation.y = t * 0.6 + i; m.position.y = y + Math.sin(t * 0.9 + i) * 18; });
            break;
          }
          case 'banner': {
            g.add(mk(new T3.CylinderGeometry(9, 11, 600, 6), lit('#3a2a22'), 0, 300, 0));
            g.add(mk(new T3.BoxGeometry(130, 310, 6), lit(col, { side: T3.DoubleSide }), 0, 430, 14));
            break;
          }
          case 'cloud': {
            const y = -260 - rnd() * 260;
            for (let k = 0; k < 4; k++) g.add(mk(new T3.SphereGeometry(190 + rnd() * 160, 8, 6), glowM(col, 0.9), (rnd() - 0.5) * 560, y + (rnd() - 0.5) * 80, (rnd() - 0.5) * 300));
            break;
          }
        }
      }
    }
  }

  function buildStage(stage) {
    const def = stage.def;
    for (const d of stageDisposables) d.dispose();
    stageDisposables = []; stageAnim = [];
    while (stageG.children.length) stageG.remove(stageG.children[0]);
    const set = SETS[def.id] || SETS.temple;
    // ciel en dégradé
    const sk = document.createElement('canvas'); sk.width = 4; sk.height = 256;
    const sg = sk.getContext('2d');
    const gr = sg.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, def.sky[0]); gr.addColorStop(0.55, def.sky[1]); gr.addColorStop(1, def.sky[2]);
    sg.fillStyle = gr; sg.fillRect(0, 0, 4, 256);
    skyTex = canvasTex(sk);
    scene.fog = new T3.Fog(new T3.Color(def.sky[2]), 5200, 17000);
    // décors lointains : les calques peints sont enroulés autour de l'arène
    stage.layers.forEach((L, i) => {
      const r = i === 0 ? 9000 : 5200, n = 4;
      const s = (2 * PI * r / n) / L.w, h = 760 * s;
      const tex = canvasTex(L.cv);
      tex.wrapS = T3.MirroredRepeatWrapping; tex.repeat.x = n;
      const mat = new T3.MeshBasicMaterial({ map: tex, transparent: true, side: T3.BackSide, depthWrite: false, fog: false });
      stageDisposables.push(mat);
      const m = mk(new T3.CylinderGeometry(r, r, h, 64, 1, true), mat, 0, h * (0.5 - 160 / 760), 0);
      m.renderOrder = -3 + i;
      stageG.add(m);
    });
    // sol de l'arène
    const fl = mk(new T3.CircleGeometry(ARENA_R + 100, 72), new T3.MeshLambertMaterial({ map: canvasTex(floorTexture(def)) }), 0, 0, 0);
    stageDisposables.push(fl.material);
    fl.rotation.x = -PI / 2;
    stageG.add(fl);
    const edge = U.mix(def.floor.top, def.floor.bottom, 0.5);
    if (set.outer === 'void') {
      stageG.add(mk(new T3.CylinderGeometry(ARENA_R + 100, ARENA_R - 60, 300, 72, 1, true), lit(edge), 0, -150.5, 0));
      stageG.add(mk(new T3.TorusGeometry(ARENA_R + 100, 9, 6, 72), lit(U.shade(edge, 0.15)), 0, 0, 0).rotateX(PI / 2));
    } else {
      const outer = mk(new T3.CircleGeometry(9400, 48), set.outer === 'lava' ? glowM('#b83200', 1) : lit(U.mix(def.floor.bottom, def.sky[2], 0.25)), 0, -1.5, 0);
      outer.rotation.x = -PI / 2;
      stageG.add(outer);
      stageG.add(mk(new T3.TorusGeometry(ARENA_R + 100, 7, 6, 72), lit(U.shade(edge, -0.2)), 0, 0, 0).rotateX(PI / 2));
    }
    buildProps(set, def);
    const dim = set.dim || 1;
    sun.color.set(set.sun); sun.intensity = 2.6 * dim;
    hemi.color.set(U.mix(set.sky, '#ffffff', 0.55)); hemi.groundColor.set(U.mix(def.floor.bottom, '#8a8a9a', 0.5)); hemi.intensity = 2.3 * dim;
  }

  // ------------------------------------------------------------------ initialisation
  function init() {
    if (renderer) return true;
    if (failed) return false;
    T3 = C.Rig.three();
    if (!T3) { failed = true; return false; }
    try {
      canvas = document.getElementById('game3d') || document.createElement('canvas');
      renderer = new T3.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { failed = true; renderer = null; return false; }
    renderer.setPixelRatio(1);
    if (!canvas.id) renderer.setSize(640, 360, false);
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    scene = new T3.Scene();
    camera = new T3.PerspectiveCamera(36, 16 / 9, 20, 30000);
    hemi = new T3.HemisphereLight('#ffffff', '#777788', 2.3);
    sun = new T3.DirectionalLight('#ffffff', 2.6);
    scene.add(hemi, sun, sun.target);
    stageG = new T3.Group(); actors = new T3.Group();
    scene.add(stageG, actors);
    darkBg = new T3.Color('#0a0416');
    return true;
  }

  function initPortraits() {
    if (pr) return true;
    if (failed) return false;
    T3 = C.Rig.three();
    if (!T3) return false;
    try {
      pr = new T3.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { pr = null; return false; }
    pr.setPixelRatio(1); pr.setSize(PSIZE, PSIZE, false);
    pr.setClearColor(0x000000, 0);
    pscene = new T3.Scene();
    pcam = new T3.PerspectiveCamera(22, 1, 10, 6000);
    const h = new T3.HemisphereLight('#ffffff', '#8a84a0', 2.4);
    const s = new T3.DirectionalLight('#ffffff', 2.4);
    s.position.set(300, 500, 700);
    pscene.add(h, s);
    pBlack = new T3.MeshBasicMaterial({ color: '#120a1c' });
    return true;
  }

  // ------------------------------------------------------------------ combat affiché
  function shadowMesh() {
    const m = new T3.Mesh(new T3.CircleGeometry(46, 20), new T3.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.32, depthWrite: false }));
    m.rotation.x = -PI / 2;
    m.renderOrder = 1;
    return m;
  }
  function clearActors() {
    for (const m of models) m.dispose();
    models = [];
    for (const s of shadows) { actors.remove(s); s.geometry.dispose(); s.material.dispose(); }
    shadows = [];
    extras.forEach((x) => x.model.dispose());
    extras.clear();
  }
  function bind(b) {
    clearActors();
    cur = b;
    for (const f of b.f) {
      const m = new C.Rig.Model(f.look);
      actors.add(m.root);
      m.yaw = null;
      models.push(m);
      const s = shadowMesh();
      actors.add(s); shadows.push(s);
    }
    // le décor n'est reconstruit que si l'arène (ou sa finesse) change
    const key = b.stage.def.id + '|' + b.stage.q;
    if (stageKey !== key) { buildStage(b.stage); stageKey = key; }
  }

  function angLerp(a, b, t) {
    let d = (b - a) % (PI * 2);
    if (d > PI) d -= PI * 2; else if (d < -PI) d += PI * 2;
    return a + d * t;
  }

  const V = {
    ok: false, W: 1280, H: 720, base: 1, sx: 0, sy: 0, k: 1, vis: true,
    e: null, f: 1, ct: 1, st: 0, ox: 0, oz: 0,
    // Projette un point du plan de combat : résultat dans V.sx, V.sy (pixels logiques) et V.k (échelle)
    pt(x, y, zl) {
      const e = this.e;
      const wx = this.ox + x * this.ct - zl * this.st, wz = this.oz + x * this.st + zl * this.ct, wy = -y;
      const X = e[0] * wx + e[4] * wy + e[8] * wz + e[12];
      const Y = e[1] * wx + e[5] * wy + e[9] * wz + e[13];
      let Wc = e[3] * wx + e[7] * wy + e[11] * wz + e[15];
      this.vis = Wc > 30;
      if (Wc < 30) Wc = 30;
      this.sx = (X / Wc * 0.5 + 0.5) * this.W;
      this.sy = (0.5 - Y / Wc * 0.5) * this.H;
      this.k = this.H * 0.5 * this.f / Wc;
      return this;
    },
    // Place le contexte 2D pour dessiner en coordonnées du plan autour du point (x, y, zl) :
    // même échelle dans toutes les directions, aligné sur la direction de l'axe à l'écran
    at(ctx, x, y, zl) {
      zl = zl || 0;
      this.pt(x + 40, y, zl);
      const x1 = this.sx, y1 = this.sy;
      this.pt(x, y, zl);
      const k = this.k, b = this.base;
      let dx = x1 - this.sx, dy = y1 - this.sy, m = 1, a = 0;
      if (Math.hypot(dx, dy) > 40 * k * 0.25) {
        if (dx < 0) { m = -1; dx = -dx; dy = -dy; }
        a = U.clamp(Math.atan2(dy, dx), -1.1, 1.1);
      }
      const c = Math.cos(a) * k, s = Math.sin(a) * k;
      const a11 = c * m, a12 = -s, a21 = s * m, a22 = c;
      ctx.setTransform(b * a11, b * a21, b * a12, b * a22, b * (this.sx - (a11 * x + a12 * y)), b * (this.sy - (a21 * x + a22 * y)));
      return this.vis;
    },
    // Même chose sans rotation ni miroir (textes)
    flat(ctx, x, y, zl) {
      this.pt(x, y, zl || 0);
      const k = this.k, b = this.base;
      ctx.setTransform(b * k, 0, 0, b * k, b * (this.sx - k * x), b * (this.sy - k * y));
      return this.vis;
    },
    // Rayon : le segment local (0,0)→(L,0) est posé entre deux points du monde
    seg(ctx, x0, y0, z0, x1, y1, z1, L) {
      this.pt(x1, y1, z1);
      const ex = this.sx, ey = this.sy, k1 = this.k;
      this.pt(x0, y0, z0);
      const dx = ex - this.sx, dy = ey - this.sy, len = Math.hypot(dx, dy) || 1;
      const kx = len / L, ky = (this.k + k1) * 0.5, b = this.base;
      const c = dx / len, s = dy / len;
      ctx.setTransform(b * c * kx, b * s * kx, -b * s * ky, b * c * ky, b * this.sx, b * this.sy);
      return this.vis;
    },
    reset(ctx) { ctx.setTransform(this.base, 0, 0, this.base, 0, 0); }
  };

  function place(obj, b, x, y, zl) {
    const A = b.ax, ct = Math.cos(A.th), st = Math.sin(A.th);
    obj.position.set(A.ox + x * ct - zl * st, -y, A.oz + x * st + zl * ct);
  }

  function syncExtras(b) {
    const seen = new Set();
    for (const e of b.entities) {
      if (!(e.isSummon || e.isGhost) || e.dead) continue;
      let x = extras.get(e);
      if (!x) {
        if (extras.size >= 8) continue;
        x = { model: new C.Rig.Model(e.isGhost ? Object.assign({}, e.look, { id: e.look.id + '~g', ghost: e.tint || '#ffffff' }) : e.look) };
        actors.add(x.model.root);
        extras.set(e, x);
      }
      seen.add(e);
      const m = x.model;
      if (e.isSummon) {
        const pose = C.Poses.get(e.age % e.every < 6 && e.age > 18 ? 'cast1' : 'idle', e.look);
        m.apply(pose, C.Rig.solve(pose, m.d, tmpJ), { time: b.time });
        place(m.root, b, e.x, 0, e.zl || 0);
        m.root.rotation.y = -(b.ax.th + (e.facing > 0 ? 0 : PI));
        m.root.scale.setScalar((e.look.scale || 1) * 0.88 * Math.min(1, e.age / 10, e.life / 10));
      } else {
        m.apply(e.pose, C.Rig.solve(e.pose, m.d, tmpJ), { time: b.time, awakened: e.awake });
        place(m.root, b, e.x, e.y, e.zl || 0);
        m.root.rotation.y = -(b.ax.th + (e.facing > 0 ? 0 : PI));
        m.ghostMat.opacity = 0.55 * e.alpha * (e.life / e.max);
      }
    }
    extras.forEach((x, e) => { if (!seen.has(e)) { x.model.dispose(); extras.delete(e); } });
  }

  // Affiche le combat en 3D et renvoie la « vue » qui sert à projeter la couche 2D (ou null sans WebGL)
  function renderBattle(b, W, H, base) {
    if (!init()) return null;
    if (cur !== b) bind(b);
    const A = b.ax, c = b.cam, t = b.time;
    // caméra
    const aspect = W / H;
    if (camera.aspect !== aspect || camera.fov !== c.fov) { camera.aspect = aspect; camera.fov = c.fov; camera.updateProjectionMatrix(); }
    camera.position.set(c.px + c.sx, c.py + c.sy, c.pz);
    camera.lookAt(c.tx, c.ty, c.tz);
    camera.updateMatrixWorld();
    // lumière principale : vient de derrière la caméra, en hauteur
    const lx = c.px - c.tx, lz = c.pz - c.tz, ll = Math.hypot(lx, lz) || 1;
    sun.position.set(c.tx + (lx / ll) * 600 - (lz / ll) * 420, c.ty + 900, c.tz + (lz / ll) * 600 + (lx / ll) * 420);
    sun.target.position.set(c.tx, c.ty, c.tz);
    // combattants
    for (let i = 0; i < 2; i++) {
      const f = b.f[i], m = models[i];
      const hv = f.hover();
      place(m.root, b, f.x, f.y - hv, f.zl);
      const yaw = -f.aimYaw();
      m.yaw = m.yaw == null ? yaw : angLerp(m.yaw, yaw, 0.4);
      m.root.rotation.y = m.yaw;
      const moving = f.state === 'move' && f.move;
      const blink = (f.state === 'getup' || f.invuln > 0) && f.frame % 4 < 2;
      const aura = f.awakened > 0 ? (f.ch.awakenAura || '#ffd84a') : f.auraColor;
      m.apply(f.pose, f.J.hip ? f.J : C.Rig.solve(f.pose, m.d, f.J), {
        time: t, flash: f.flash > 0 ? f.flash : 0, awakened: f.awakened > 0, vx: f.vx * f.facing,
        weaponHidden: f.weaponAway || (moving && f.move.hideWeapon) || (f.look.weaponHidden && !(moving && f.move.showWeapon)),
        glow: moving && f.move.glow ? 1 : 0,
        mouth: (moving && f.move.kind !== 'normal') || f.state === 'hitstun' || f.state === 'airhit' ? 'open' : null,
        aura, auraK: f.awakened > 0 ? 1 : 0.85
      });
      m.root.visible = !f.hidden && !f.pose.hidden && !blink;
      const s = shadows[i];
      place(s, b, f.x, 0, f.zl);
      s.position.y = 1.2;
      const k = U.clamp(1 + f.y / 500, 0.35, 1) * f.size;
      s.scale.set(k, k, k);
      s.visible = !f.hidden;
    }
    syncExtras(b);
    for (let i = 0; i < stageAnim.length; i++) stageAnim[i](t);
    // pendant un Super : décor masqué, fond sombre, les combattants restent éclairés
    const fz = !!b.freeze;
    stageG.visible = !fz;
    scene.background = fz ? darkBg : skyTex;
    renderer.render(scene, camera);
    // vue pour la couche 2D
    V.ok = true; V.W = W; V.H = H; V.base = base || 1;
    V.ct = Math.cos(A.th); V.st = Math.sin(A.th); V.ox = A.ox; V.oz = A.oz;
    V.f = camera.projectionMatrix.elements[5];
    if (!V.m) V.m = new T3.Matrix4();
    V.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    V.e = V.m.elements;
    return V;
  }

  // Dessine un personnage (portrait ou corps entier) dans un canevas 2D des menus
  function drawModel(cv, look, pose, o) {
    o = o || {};
    if (!initPortraits()) return false;
    const m = C.Rig.sharedModel(look);
    if (!m) return false;
    if (pcur !== m) {
      if (pcur) pscene.remove(pcur.root);
      pscene.add(m.root); pcur = m;
    }
    const d = m.d, sc = look.scale || 1, hv = look.hover || 0;
    const p = pose.wa !== undefined && pose.ua1 !== undefined ? pose : C.Rig.completePose(pose);
    const J = C.Rig.solve(p, d, tmpJ);
    m.apply(p, J, { time: o.time || 0, awakened: o.awakened, aura: o.awakened ? (look.awakenHair || '#ffd84a') : null, auraK: 0.8 });
    m.root.position.set(0, hv, 0);
    m.root.visible = true;
    let w = cv.width, h = cv.height, q = 1;
    if (w > PSIZE || h > PSIZE) { q = PSIZE / Math.max(w, h); w = Math.floor(w * q); h = Math.floor(h * q); }
    let vh, ty, tx = 0, yaw;
    if (o.portrait) {
      vh = (d.head * 4.3 + 44) * sc / (look.portraitZoom || 1);
      ty = hv + (-J.head[1] - d.head * 0.55) * sc;
      yaw = -0.72;
      tx = J.head[0] * sc * Math.cos(yaw) + vh * 0.06;
    } else {
      vh = (d.height + 34) * sc + hv + (look.wings ? 40 : 0);
      ty = vh * 0.47;
      yaw = o.yaw != null ? o.yaw : -0.55 + (o.spin ? Math.sin((o.time || 0) * 0.7) * 0.55 : 0);
    }
    if (o.flip) { yaw = -(PI - (-yaw)); tx = -tx; }
    m.root.rotation.y = yaw;
    const dist = (vh / 2) / Math.tan((pcam.fov * PI / 180) / 2);
    pcam.aspect = w / h; pcam.updateProjectionMatrix();
    pcam.position.set(tx, ty + vh * 0.04, dist);
    pcam.lookAt(tx, ty, 0);
    pr.setViewport(0, 0, w, h); pr.setScissor(0, 0, w, h); pr.setScissorTest(true);
    pscene.overrideMaterial = o.silhouette ? pBlack : null;
    pr.clear();
    pr.render(pscene, pcam);
    pscene.overrideMaterial = null;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(pr.domElement, 0, PSIZE - h, w, h, 0, 0, cv.width, cv.height);
    return true;
  }

  C.R3 = {
    ARENA_R,
    available() { return init(); },
    resize(w, h) { if (init()) renderer.setSize(Math.max(1, w), Math.max(1, h), false); },
    renderBattle, drawModel,
    release(b) { if (cur === b) { clearActors(); cur = null; } },
    view: V
  };
})(window.CDL = window.CDL || {});
