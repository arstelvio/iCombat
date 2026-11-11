/* Choc des Légendes — commandes : tactile, clavier, manette.
   Le déplacement est libre dans l'arène 3D : on pousse le joystick dans la direction où l'on veut aller
   à l'écran (relatif à la caméra). Le saut est sur un bouton. */
(function (C) {
  'use strict';
  const U = C.U;

  const keys = {};
  const tapped = {}; // touches enfoncées puis relâchées entre deux images : comptées une fois
  const KEYMAP_P1 = {
    KeyJ: 'a', KeyK: 'b', KeyL: 'c', KeyI: 'g', KeyU: 't', KeyO: 's',
    Space: 'u', ShiftLeft: 'g', KeyN: 'a', KeyM: 'b', Comma: 'c'
  };
  // Déplacement : [droite, bas] à l'écran (ZQSD / WASD, flèches)
  const MOVE_P1 = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };
  const ARROWS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const KEYMAP_P2 = {
    Numpad1: 'a', Numpad2: 'b', Numpad3: 'c', Numpad4: 'g', Numpad5: 't', Numpad6: 's', Numpad0: 'u', NumpadEnter: 'u'
  };

  const Input = {
    twoPlayers: false,
    touch: { active: false, stick: null, buttons: {}, pointers: {}, pending: {}, visible: false },
    layout: null,
    W: 1280, H: 720,
    lastDevice: 'keyboard'
  };

  function blank() { return { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, c: 0, g: 0, s: 0, t: 0 }; }

  // ------------------------------------------------------------ clavier
  window.addEventListener('keydown', (e) => {
    if (e.repeat) { if (gameKeys(e.code)) e.preventDefault(); return; }
    keys[e.code] = true; tapped[e.code] = true;
    Input.lastDevice = 'keyboard';
    if (gameKeys(e.code) && C.inBattle) e.preventDefault();
    if (C.onKey) C.onKey(e);
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  const down = (code) => { if (keys[code] || tapped[code]) { tapped[code] = false; return true; } return false; };
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  function gameKeys(code) { return KEYMAP_P1[code] || MOVE_P1[code] || ARROWS[code] || KEYMAP_P2[code]; }

  // ------------------------------------------------------------ manettes
  function readPad(index) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && pads[index];
    if (!p || !p.connected) return null;
    const b = (i) => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5));
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const o = blank();
    // l, r, u, d : pour les menus ; mx, my : déplacement dans l'arène ; jump : bouton de saut
    o.l = b(14) || ax < -0.45; o.r = b(15) || ax > 0.45;
    o.u = b(12) || ay < -0.55; o.d = b(13) || ay > 0.55;
    o.mx = (b(15) ? 1 : 0) - (b(14) ? 1 : 0) + (Math.abs(ax) > 0.25 ? ax : 0);
    o.my = (b(13) ? 1 : 0) - (b(12) ? 1 : 0) + (Math.abs(ay) > 0.25 ? ay : 0);
    o.jump = b(0);
    o.a = b(2); o.b = b(3); o.c = b(1);
    o.g = b(5) || b(6); o.t = b(4); o.s = b(7);
    o.start = b(9); o.select = b(8);
    if (Object.keys(o).some((k) => o[k])) Input.lastDevice = 'pad';
    return o;
  }
  Input.readPad = readPad;

  // ------------------------------------------------------------ tactile
  function layout() {
    const s = C.Store.settings;
    const W = Input.W, H = Input.H;
    const k = s.controlSize || 1;
    const left = !!s.leftHanded;
    // Décalage si les boutons les plus au bord touchent une zone non sûre (encoche, coins arrondis)
    const sf = C.safe || { l: 0, r: 0, b: 0 };
    const edge = 60 + 66 * k; // distance du bord de l'écran au bord des boutons extérieurs
    const shift = Math.max(0, (left ? sf.l : sf.r) + 8 - edge);
    const ax = left ? 60 + shift : W - 60 - shift, ay = H - 60;
    const mx = left ? -1 : 1;
    const btn = (id, label, dx, dy, r) => ({ id, label, x: ax - mx * dx * k, y: ay + dy * k, r: r * k });
    return {
      stickZone: left ? { x0: W * 0.55, x1: W } : { x0: 0, x1: W * 0.45 },
      stickR: 88 * k,
      buttons: [
        btn('g', 'GARDE', 372, -44, 44),
        btn('a', 'LÉGER', 252, -58, 58),
        btn('j', 'SAUT', 118, -48, 52),
        btn('t', 'SAISIE', 384, -156, 38),
        btn('c', 'SPÉCIAL', 268, -192, 54),
        btn('b', 'LOURD', 138, -170, 56),
        btn('s', 'ULTRA', 150, -298, 46)
      ],
      pause: { id: 'pause', x: W / 2, y: H - 46 - sf.b, r: 30 } // au-dessus de la barre d'accueil iOS
    };
  }
  Input.relayout = function (W, H) { Input.W = W; Input.H = H; Input.layout = layout(); };

  function toLogical(e, el) {
    const r = el.getBoundingClientRect();
    return [(e.clientX - r.left) * (Input.W / r.width), (e.clientY - r.top) * (Input.H / r.height)];
  }
  function hitButton(x, y) {
    const L = Input.layout;
    if (!L) return null;
    let best = null, bd = 1e9;
    for (const b of L.buttons) {
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < b.r * 1.22 && d < bd) { best = b; bd = d; }
    }
    return best;
  }
  Input.attachTouch = function (el) {
    const T = Input.touch;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && !T.visible) return;
      if (!C.inBattle) return;
      T.active = true;
      Input.lastDevice = 'touch';
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const [x, y] = toLogical(e, el);
      const L = Input.layout;
      if (Math.hypot(x - L.pause.x, y - L.pause.y) < L.pause.r * 1.4) { if (C.onPauseRequest) C.onPauseRequest(); return; }
      const b = hitButton(x, y);
      if (b) { T.pointers[e.pointerId] = { type: 'btn', id: b.id }; T.buttons[b.id] = (T.buttons[b.id] || 0) + 1; T.pending[b.id] = true; if (C.Store.settings.vibration) C.Audio.vibrate(8); return; }
      const z = L.stickZone;
      if (x >= z.x0 && x <= z.x1 && !T.stick) {
        T.stick = { id: e.pointerId, ox: x, oy: y, x, y };
        T.pointers[e.pointerId] = { type: 'stick' };
      }
    }, { passive: false });
    el.addEventListener('pointermove', (e) => {
      const p = T.pointers[e.pointerId];
      if (!p) return;
      e.preventDefault();
      const [x, y] = toLogical(e, el);
      if (p.type === 'stick' && T.stick) {
        const R = Input.layout.stickR;
        let dx = x - T.stick.ox, dy = y - T.stick.oy;
        const d = Math.hypot(dx, dy);
        if (d > R * 1.25) { // la base suit le doigt
          T.stick.ox = x - dx / d * R * 1.25; T.stick.oy = y - dy / d * R * 1.25;
        }
        T.stick.x = x; T.stick.y = y;
      } else if (p.type === 'btn') {
        const b = hitButton(x, y);
        if (b && b.id !== p.id) {
          T.buttons[p.id] = Math.max(0, (T.buttons[p.id] || 1) - 1);
          p.id = b.id; T.buttons[b.id] = (T.buttons[b.id] || 0) + 1; T.pending[b.id] = true;
        }
      }
    }, { passive: false });
    const up = (e) => {
      const p = T.pointers[e.pointerId];
      if (!p) return;
      if (p.type === 'stick') T.stick = null;
      else if (p.type === 'btn') T.buttons[p.id] = Math.max(0, (T.buttons[p.id] || 1) - 1);
      delete T.pointers[e.pointerId];
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  };
  Input.resetTouch = function () {
    const T = Input.touch;
    T.stick = null; T.buttons = {}; T.pointers = {}; T.pending = {};
    for (const k in tapped) tapped[k] = false;
  };

  function touchState() {
    const T = Input.touch;
    const o = blank();
    o.mx = 0; o.my = 0;
    if (T.stick) {
      const R = Input.layout.stickR;
      const dx = (T.stick.x - T.stick.ox) / R, dy = (T.stick.y - T.stick.oy) / R;
      if (Math.hypot(dx, dy) > 0.28) { o.mx = dx; o.my = dy; }
    }
    for (const k in T.buttons) if (T.buttons[k] > 0) o[k] = 1;
    // Un appui très bref (plus court qu'une image) est tout de même pris en compte
    for (const k in T.pending) { if (T.pending[k]) { o[k] = 1; T.pending[k] = false; } }
    if (o.j) o.u = 1;   // bouton SAUT
    return o;
  }

  // ------------------------------------------------------------ contrôleurs
  const BTNS = ['a', 'b', 'c', 'g', 's', 't', 'u'];
  // Rassemble clavier, manette et tactile. Le joystick commande un déplacement en 2D :
  // gauche / droite pour avancer ou reculer, haut pour sauter, bas pour s'accroupir (garde basse, coups bas)
  function control(f, keymap, moves, padIndex, touch) {
    const o = blank();
    let sx = 0, sy = 0;
    for (const code in keymap) if (down(code)) o[keymap[code]] = 1;
    for (let i = 0; i < moves.length; i++) for (const code in moves[i]) if (keys[code]) { sx += moves[i][code][0]; sy += moves[i][code][1]; }
    const p = readPad(padIndex);
    if (p) {
      for (let i = 0; i < 6; i++) if (p[BTNS[i]]) o[BTNS[i]] = 1;
      if (p.jump) o.u = 1;
      sx += p.mx; sy += p.my;
    }
    if (touch) {
      const t = touchState();
      for (let i = 0; i < BTNS.length; i++) if (t[BTNS[i]]) o[BTNS[i]] = 1;
      sx += t.mx; sy += t.my;
    }
    const m = Math.hypot(sx, sy);
    if (m > 0.3) {
      const k = m > 1 ? 1 / m : 1, x = sx * k, y = sy * k;
      if (x > 0.38) o.r = 1; else if (x < -0.38) o.l = 1;
      if (y < -0.6) o.u = 1; else if (y > 0.45) o.d = 1;
    }
    return o;
  }

  Input.p1 = {
    isCPU: false,
    get(f) { return control(f, KEYMAP_P1, Input.twoPlayers ? [MOVE_P1] : [MOVE_P1, ARROWS], 0, true); }
  };
  Input.p2 = {
    isCPU: false,
    get(f) { return control(f, KEYMAP_P2, [ARROWS], 1, false); }
  };
  Input.anyKey = () => Object.keys(keys).some((k) => keys[k]);

  // ------------------------------------------------------------ rendu des commandes tactiles
  const ICON = { a: 'A', b: 'B', c: 'C', g: 'G', t: 'S', s: '★', j: '▲' };
  const COLORS = { a: '#4fc3f7', b: '#ff7043', c: '#ba68c8', g: '#81c784', t: '#ffd54f', s: '#ffd23f', j: '#f4f4f8' };
  Input.drawTouch = function (ctx, W, H, battle) {
    const T = Input.touch;
    if (!T.visible) return;
    const L = Input.layout;
    const op = C.Store.settings.controlOpacity;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // stick
    if (T.stick) {
      const R = L.stickR;
      ctx.globalAlpha = op;
      ctx.fillStyle = 'rgba(20,10,40,0.5)'; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(T.stick.ox, T.stick.oy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      let dx = T.stick.x - T.stick.ox, dy = T.stick.y - T.stick.oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      ctx.globalAlpha = Math.min(1, op + 0.25);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(T.stick.ox + dx, T.stick.oy + dy, R * 0.42, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.globalAlpha = op * 0.55;
      const z = L.stickZone;
      const cx = (z.x0 + z.x1) / 2 * 0.6 + (C.Store.settings.leftHanded ? W * 0.35 : 0), cy = H - 150;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.arc(C.Store.settings.leftHanded ? W - 200 : 200, cy, L.stickR, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '18px "Russo One", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('DÉPLACEMENT', C.Store.settings.leftHanded ? W - 200 : 200, cy);
      void cx;
    }
    // Bouton (ou joystick) à utiliser pendant une leçon de l'École du Maître : il pulse
    const hl = Input.highlight;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    if (hl === 'stick' && !T.stick) {
      ctx.save(); ctx.globalAlpha = 0.5 + pulse * 0.5; ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6;
      const sx = C.Store.settings.leftHanded ? W - 200 : 200;
      ctx.beginPath(); ctx.arc(sx, H - 150, L.stickR + 8 + pulse * 10, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    // boutons
    const me = battle && battle.f[battle.me || 0];
    for (const b of L.buttons) {
      const pressed = T.buttons[b.id] > 0;
      let col = COLORS[b.id];
      let ready = true;
      // Jauge vide : le bouton ULTRA sert à charger l'aura (maintenir)
      const charge = b.id === 's' && me && me.meter < 100;
      if (charge) col = '#7fe3ff';
      ctx.globalAlpha = pressed ? Math.min(1, op + 0.35) : op * (ready ? 1 : 0.55);
      ctx.fillStyle = pressed ? U.rgba(col, 0.75) : 'rgba(20,10,40,0.55)';
      ctx.strokeStyle = col; ctx.lineWidth = pressed ? 5 : 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (hl === b.id) {
        ctx.save(); ctx.globalAlpha = 0.55 + pulse * 0.45; ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 8 + pulse * 9, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      if (b.id === 's' && me) {
        const frac = me.meter / 300;
        ctx.strokeStyle = me.meter >= 300 ? '#ffd23f' : '#7fe3ff'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 6, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
        if (me.meter >= 300) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(C.FX.glowSprite('#ffd23f'), b.x - b.r * 1.6, b.y - b.r * 1.6, b.r * 3.2, b.r * 3.2); ctx.globalCompositeOperation = 'source-over'; }
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = Math.round(b.r * 0.62) + 'px Bangers, Impact, sans-serif';
      ctx.fillText(charge ? '⚡' : ICON[b.id], b.x, b.y - b.r * 0.12);
      ctx.font = Math.round(b.r * 0.26) + 'px "Russo One", sans-serif';
      ctx.fillText(charge ? 'CHARGER' : b.label, b.x, b.y + b.r * 0.45);
    }
    // pause
    const p = L.pause;
    ctx.globalAlpha = op;
    ctx.fillStyle = 'rgba(20,10,40,0.6)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 9, p.y - 11, 6, 22); ctx.fillRect(p.x + 3, p.y - 11, 6, 22);
    ctx.restore();
  };

  C.Input = Input;
})(window.CDL = window.CDL || {});
