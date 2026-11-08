/* Choc des Légendes — démarrage, boucle de jeu, redimensionnement, navigation globale */
(function (C) {
  'use strict';
  const U = C.U;
  const STEP = 1 / 60;
  let canvas, ctx, W = 1280, H = 720, scale = 1;
  let demo = null, demoTimer = 0;
  let last = 0, acc = 0;

  C.touchDevice = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);

  // Zones sûres de l'écran (encoche, coins arrondis, barre d'accueil), en unités du jeu (hauteur 720)
  C.safe = { l: 0, r: 0, t: 0, b: 0 };
  let safeProbe = null;
  function readSafe(ch) {
    if (!safeProbe) {
      safeProbe = document.createElement('div');
      safeProbe.id = 'safe-probe';
      safeProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      document.body.appendChild(safeProbe);
    }
    const cs = getComputedStyle(safeProbe);
    const k = 720 / Math.max(1, ch);
    const v = (x) => Math.max(0, parseFloat(x) || 0) * k;
    C.safe = { l: v(cs.paddingLeft), r: v(cs.paddingRight), t: v(cs.paddingTop), b: v(cs.paddingBottom) };
  }

  function resize() {
    const cw = window.innerWidth, ch = window.innerHeight;
    const q = C.Store.settings.quality;
    const cap = q === 'low' ? 1 : q === 'medium' ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    H = 720;
    W = Math.round(H * Math.max(1, cw / Math.max(1, ch)));
    scale = canvas.height / H;
    readSafe(ch);
    C.Input.relayout(W, H);
    // Taille de police de base pour l'interface (paysage : on se cale sur la hauteur)
    const base = U.clamp(Math.min(ch / 30, cw / 52), 10, 22);
    document.documentElement.style.setProperty('--fs', base + 'px');
  }
  C.resize = resize;

  // Combat de démonstration en arrière-plan des menus
  function newDemo() {
    const ids = C.Roster.list.map((c) => c.id);
    const a = U.choice(ids);
    let b = U.choice(ids); while (b === a) b = U.choice(ids);
    demo = new C.Battle({
      mode: 'demo',
      p1: { char: a, costume: U.randi(0, 2), controller: new C.AI.CPU(2) },
      p2: { char: b, costume: U.randi(0, 2), controller: new C.AI.CPU(2) },
      stage: U.choice(C.Stages.list).id, rounds: 1, time: 0, quality: 0.6,
      onEnd: () => { demoTimer = 120; }
    });
    demo.clock = Infinity;
    demoTimer = 0;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.2) dt = 0.2;
    acc += dt;
    pollPad();
    const b = C.Game.battle;
    let n = 0;
    while (acc >= STEP && n < 4) {
      acc -= STEP; n++;
      if (b) { b.update(); C.Game.tick(); }
      else if (demo) {
        demo.update();
        if (demo.result || demo.phase === 'ko') { if (++demoTimer > 150) newDemo(); }
        else if (demo.frame > 60 * 45) newDemo();
      }
    }
    if (acc > STEP * 4) acc = 0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (b) {
      b.render(ctx, W, H);
      if (!b.paused && !b.result) C.Input.drawTouch(ctx, W, H, b);
    } else if (demo) {
      demo.render(ctx, W, H);
      ctx.fillStyle = 'rgba(8,4,22,0.62)';
      ctx.fillRect(0, 0, W, H);
    }
    C.UI.tickPreviews(dt);
  }

  // ---------------------------------------------------------------- navigation globale
  function inMenu() { return !C.Game.battle || C.Game.battle.paused || C.UI.visible(); }

  C.onKey = function (e) {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' && e.target.type === 'text') {
      if (e.code === 'Enter') { const p = document.querySelector('.modal .btn.primary'); if (p) p.click(); }
      if (e.code === 'Escape') C.UI.closeModal();
      return;
    }
    C.Audio.init();
    if (C.Game.battle && !C.Game.battle.paused && !C.UI.visible()) {
      if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Enter') { e.preventDefault(); C.Game.pause(); }
      return;
    }
    const k = e.code;
    if (k === 'ArrowUp' || k === 'KeyW') { e.preventDefault(); C.UI.nav(0, -1); }
    else if (k === 'ArrowDown' || k === 'KeyS') { e.preventDefault(); C.UI.nav(0, 1); }
    else if (k === 'ArrowLeft' || k === 'KeyA') { e.preventDefault(); C.UI.nav(-1, 0); }
    else if (k === 'ArrowRight' || k === 'KeyD') { e.preventDefault(); C.UI.nav(1, 0); }
    else if (k === 'Enter' || k === 'Space' || k === 'KeyJ') { e.preventDefault(); C.UI.activate(); }
    else if (k === 'Escape' || k === 'Backspace' || k === 'KeyK') { e.preventDefault(); C.UI.back(); }
  };

  const padPrev = {};
  let padRepeat = 0;
  function pollPad() {
    const p = C.Input.readPad(0);
    if (!p) return;
    const edge = (k) => p[k] && !padPrev[k];
    if (C.Game.battle && !C.Game.battle.paused && !C.UI.visible()) {
      if (edge('start')) C.Game.pause();
    } else {
      const dir = p.u ? 'u' : p.d ? 'd' : p.l ? 'l' : p.r ? 'r' : null;
      if (dir) {
        if (!padPrev.dir || padPrev.dir !== dir || --padRepeat <= 0) {
          C.Input.lastDevice = 'pad';
          if (dir === 'u') C.UI.nav(0, -1); else if (dir === 'd') C.UI.nav(0, 1); else if (dir === 'l') C.UI.nav(-1, 0); else C.UI.nav(1, 0);
          padRepeat = padPrev.dir === dir ? 8 : 22;
        }
      }
      padPrev.dir = dir;
      if (edge('a') || edge('start') || edge('c') && false) C.UI.activate();
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const raw = pads[0];
      if (raw) {
        const a0 = raw.buttons[0] && raw.buttons[0].pressed, b1 = raw.buttons[1] && raw.buttons[1].pressed;
        if (a0 && !padPrev.a0) { C.Audio.init(); C.UI.activate(); }
        if (b1 && !padPrev.b1) C.UI.back();
        padPrev.a0 = a0; padPrev.b1 = b1;
      }
    }
    for (const k in p) padPrev[k] = p[k];
  }

  C.onAppPause = function () {
    if (C.Game.battle && !C.Game.battle.paused && !C.Game.battle.result) C.Game.pause();
    C.Store.save();
    C.Audio.suspend();
    if (C.Voice) C.Voice.stop();
  };
  C.onAppResume = function () { C.Audio.resume(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) C.onAppPause(); else C.onAppResume(); });
  // iOS : l'app peut être fermée depuis le sélecteur d'apps sans autre avertissement
  window.addEventListener('pagehide', () => { try { C.Store.save(); } catch (e) { /* ignore */ } });
  C.onPauseRequest = () => C.Game.pause();

  // ---------------------------------------------------------------- démarrage
  function boot() {
    C.Store.init();
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d', { alpha: false });
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 200));
    C.Input.attachTouch(canvas);
    document.addEventListener('pointerdown', () => C.Audio.init(), { once: false, passive: true });
    // iOS (Safari) n'autorise le son et la voix qu'à la fin d'un toucher
    document.addEventListener('touchend', () => { C.Audio.init(); C.Voice.unlock(); }, { passive: true });
    document.addEventListener('click', () => C.Voice.unlock(), { passive: true });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    newDemo();
    C.UI.go('title', {}, { reset: true });
    last = performance.now();
    requestAnimationFrame(frame);
    const ld = document.getElementById('loading');
    if (ld) ld.remove();
  }
  C.boot = boot;

  window.addEventListener('load', () => {
    const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('40px Bangers'), document.fonts.load('20px "Russo One"')]).catch(() => null) : Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(boot);
  });
})(window.CDL = window.CDL || {});
