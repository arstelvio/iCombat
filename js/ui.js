/* Choc des Légendes — interface (menus en DOM) */
(function (C) {
  'use strict';
  const U = C.U;
  const S = () => C.Store.current;
  const DIFF = ['Facile', 'Normal', 'Difficile', 'Légendaire'];
  const TIPS = [
    'Touchez GARDE juste avant un coup pour réussir une PARADE et contre-attaquer.',
    'Maintenez la direction opposée à l\'adversaire pour bloquer automatiquement.',
    'Les coups bas (↓) doivent être bloqués accroupi, les attaques sautées debout.',
    'Une projection (SAISIE) passe à travers la garde. Appuyez sur SAISIE pour vous dégager !',
    'Double-tapez vers l\'avant pour une ruée, vers l\'arrière pour un pas de recul.',
    'Annulez vos coups normaux en techniques spéciales quand ils touchent.',
    'Avec 3 barres d\'ULTRA, déclenchez votre ULTIME. Maintenez ↓ pour garder vos barres et lancer un simple Super.',
    'Bloquer trop longtemps use votre jauge de garde : attention à la GARDE BRISÉE !',
    'Après un Lanceur (↑ + Lourd), sautez pour poursuivre le combo en l\'air.',
    'Kaïro et Zarkan peuvent se transformer grâce à l\'Éveil Doré (ULTRA avec 1 barre).',
    'Terminez les chapitres du mode Histoire pour débloquer de nouveaux combattants.',
    'Gagnez des orbes ◆ pour acheter costumes, arènes et combattants dans la Boutique.',
    'Maintenez ULTRA pour CHARGER votre aura : la jauge se remplit, jusqu\'à 3 barres !',
    'Presque K.O. ? Votre héros se RÉVEILLE : plus fort, un peu de vie et une barre d\'ULTRA en cadeau !',
    'Touchez ULTRA d\'un coup sec pour lancer votre Super, ou votre Ultime avec 3 barres.'
  ];

  // ------------------------------------------------------------------ DOM
  function h(sel, props, ...kids) {
    const parts = sel.split('.');
    const el = document.createElement(parts[0] || 'div');
    if (parts.length > 1) el.className = parts.slice(1).join(' ');
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'onclick') el.addEventListener('click', (e) => { e.stopPropagation(); C.Audio.init(); v(e); });
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat(3)) {
      if (kid == null || kid === false) continue;
      el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return el;
  }
  function btn(label, onclick, cls, extra) {
    return h('button.btn.nav' + (cls ? '.' + cls : ''), Object.assign({ onclick: (e) => { C.Audio.play('confirm'); onclick(e); }, type: 'button' }, extra || {}), label);
  }
  const imgCache = {};
  function portraitImg(id, costume, size, opts) {
    opts = opts || {};
    const ch = C.Roster.get(id);
    const key = id + '|' + ((ch && ch.rev) || 0) + '|' + (costume || 0) + '|' + size + '|' + JSON.stringify(opts);
    if (!imgCache[key]) {
      const look = C.Roster.look(id, costume || 0, opts.shadow);
      imgCache[key] = C.Rig.portrait(look, size, opts).toDataURL();
    }
    return h('img.portrait', { src: imgCache[key], draggable: 'false', alt: '' });
  }
  // Portrait d'un personnage de sauvegarde (le héros d'une autre partie a sa propre apparence)
  function slotPortrait(d, size) {
    if (d.lastChar !== 'hero') return portraitImg(d.lastChar && C.Roster.get(d.lastChar) ? d.lastChar : 'kairo', 0, size);
    if (!d.hero) return portraitImg('kairo', 0, size);
    const key = 'slot|' + JSON.stringify(d.hero) + '|' + size;
    if (!imgCache[key]) {
      const look = C.Roster.heroLook(Object.assign({}, C.Roster.HERO_DEFAULT, d.hero));
      look.id = key;
      imgCache[key] = C.Rig.portrait(look, size, {}).toDataURL();
    }
    return h('img.portrait', { src: imgCache[key], draggable: 'false', alt: '' });
  }
  // Niveau du joueur : badge, titre et barre d'expérience
  function levelBadge(d) {
    const L = C.Store.levelInfo(d);
    return h('div.lvl', null,
      h('span.lvl-num', null, 'Niv. ' + L.level),
      h('span.lvl-title', null, L.title),
      h('span.lvl-bar', null, h('span.lvl-fill', { style: { width: Math.round(L.frac * 100) + '%' } })));
  }
  // Gains d'expérience affichés en fin de combat
  function xpLine(rw) {
    if (!rw || !rw.xp) return null;
    const ups = rw.levels || [];
    const last = ups[ups.length - 1];
    const title = ups.map((l) => l.title).filter(Boolean).pop();
    return h('div.reward.xp', null, '⭐ +', rw.xp, ' XP',
      last ? h('span.lvl-up', null, ' · NIVEAU ' + last.level + ' !' + (title ? ' « ' + title + ' »' : '')) : null);
  }
  const thumbCache = {};
  function stageThumb(id, w, hgt) {
    const key = id + w + 'x' + hgt;
    if (!thumbCache[key]) thumbCache[key] = C.Stages.Stage.thumb(C.Stages.get(id), w, hgt).toDataURL('image/jpeg', 0.85);
    return thumbCache[key];
  }
  function orbs() { return h('div.orbs', null, h('span.orb', null, '◆'), String(S() ? S().orbs : 0)); }
  function topbar(title, backFn, extra) {
    return h('div.topbar', null,
      backFn ? h('button.btn.back.nav', { onclick: () => { C.Audio.play('back'); backFn(); }, type: 'button' }, '◀') : h('div'),
      h('div.tb-title', null, title),
      h('div.tb-right', null, extra || null, S() ? orbs() : null));
  }
  function stars(n, max) {
    const out = [];
    for (let i = 0; i < (max || 3); i++) out.push(h('span.star' + (i < n ? '.on' : ''), null, '★'));
    return h('span.stars', null, out);
  }
  function chips(options, value, onchange, cls) {
    const wrap = h('div.chips' + (cls ? '.' + cls : ''));
    options.forEach((o, i) => {
      const val = o.value != null ? o.value : i;
      const c = h('button.chip.nav' + (val === value ? '.on' : ''), { type: 'button', onclick: () => {
        C.Audio.play('select');
        wrap.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
        c.classList.add('on');
        onchange(val);
      } }, o.label || o);
      wrap.appendChild(c);
    });
    return wrap;
  }
  function bar(v, max, cls) { return h('div.bar' + (cls ? '.' + cls : ''), null, h('div.fill', { style: { width: Math.round(U.clamp(v / max, 0, 1) * 100) + '%' } })); }

  // ------------------------------------------------------------------ aperçus animés
  const rem = (n) => n * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
  const previews = [];
  function preview(look, w, hgt, opts) {
    const cv = h('canvas.preview');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = hgt * dpr;
    cv.style.width = w + 'px'; cv.style.height = hgt + 'px';
    const p = { cv, look, t: Math.random() * 3, opts: opts || {}, pose: C.Rig.completePose(C.Poses.get('idle', look)), dpr, cycle: 0 };
    previews.push(p);
    cv._p = p;
    return cv;
  }
  function tickPreviews(dt) {
    for (let i = previews.length - 1; i >= 0; i--) {
      const p = previews[i];
      if (!p.cv.isConnected) { if (p.t > 1) previews.splice(i, 1); p.t += dt; continue; }
      p.t += dt;
      const ctx = p.cv.getContext('2d');
      const W = p.cv.width, H = p.cv.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const look = p.look;
      const d = C.Rig.dims(look);
      const hv = look.hover ? look.hover + Math.sin(p.t * 3) * 4 : 0;
      const totalH = (d.height + 30) * (look.scale || 1) + hv + 20;
      const k = Math.min(H / totalH * 0.92, W / ((look.wings ? 330 : 230) * (look.scale || 1)));
      let target;
      if (p.opts.cycle) {
        const list = ['idle', 'taunt', 'cast', 'victory', 'charge', 'victory2'];
        const idx = Math.floor(p.t / 2.4) % list.length;
        target = list[idx] === 'idle' ? C.Poses.breathe(look, p.t) : C.Poses.get(list[idx], look);
      } else if (p.opts.pose) target = C.Poses.get(p.opts.pose, look);
      else target = C.Poses.breathe(look, p.t);
      C.Rig.lerpPose(p.pose, target, 0.12, p.pose);
      ctx.translate(W / 2, H - 10 * p.dpr);
      ctx.scale(k, k);
      // ombre
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 0, 60 * (look.scale || 1), 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(0, -hv);
      C.Rig.draw(ctx, look, p.pose, { facing: p.opts.flip ? -1 : 1, time: p.t, awakened: p.opts.awakened, shadowTint: look.shadow ? '#3b0f5c' : null });
    }
  }

  // ------------------------------------------------------------------ gestion des écrans
  const root = () => document.getElementById('ui');
  const UI = { stack: [], screens: {}, current: null, previews };

  UI.go = function (name, params, opts) {
    opts = opts || {};
    const entry = { name, params: params || {} };
    if (opts.reset) UI.stack = [entry];
    else if (opts.replace && UI.stack.length) UI.stack[UI.stack.length - 1] = entry;
    else UI.stack.push(entry);
    UI.render(entry, opts);
  };
  UI.render = function (entry, opts) {
    const r = root();
    r.innerHTML = '';
    r.classList.add('show');
    r.classList.toggle('overlay', !!(opts && opts.overlay) || !!(C.Game.battle && C.Game.battle.paused));
    const def = UI.screens[entry.name];
    UI.current = { name: entry.name, def, params: entry.params };
    const el = def.render(entry.params);
    el.classList.add('screen', 'scr-' + entry.name);
    r.appendChild(el);
    if (def.music) C.Audio.music(def.music);
    document.body.dataset.screen = entry.name;
    setTimeout(() => UI.focusFirst(), 30);
  };
  UI.refresh = function () { const top = UI.stack[UI.stack.length - 1]; if (top) UI.render(top, {}); };
  UI.back = function () {
    if (UI.modalEl) { UI.closeModal(); return true; }
    const cur = UI.current;
    if (!cur) return false;
    if (cur.def.onBack) { cur.def.onBack(cur.params); return true; }
    if (UI.stack.length > 1) {
      UI.stack.pop();
      C.Audio.play('back');
      UI.render(UI.stack[UI.stack.length - 1], {});
      return true;
    }
    return false;
  };
  UI.hide = function () { const r = root(); r.innerHTML = ''; r.classList.remove('show', 'overlay'); UI.current = null; document.body.dataset.screen = 'battle'; };
  UI.visible = () => root().classList.contains('show');

  // Fenêtre modale
  UI.modal = function (title, body, buttons) {
    UI.closeModal();
    const m = h('div.modal', null, h('div.modal-box', null,
      h('div.modal-title', null, title),
      h('div.modal-body', null, body),
      h('div.modal-btns', null, buttons.map((b) => btn(b.label, () => { if (!b.keep) UI.closeModal(); b.fn && b.fn(); }, b.cls)))));
    document.body.appendChild(m);
    UI.modalEl = m;
    setTimeout(() => UI.focusFirst(), 30);
  };
  UI.closeModal = function () { if (UI.modalEl) { UI.modalEl.remove(); UI.modalEl = null; } };

  // Notifications
  UI.toast = function (title, sub) {
    const t = h('div.toast', null, h('div.toast-title', null, title), sub ? h('div.toast-sub', null, sub) : null);
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3800);
  };

  // ------------------------------------------------------------------ navigation clavier / manette
  UI.focusables = function () {
    const scope = UI.modalEl || root();
    return Array.from(scope.querySelectorAll('.nav')).filter((e) => !e.disabled && e.offsetParent !== null);
  };
  UI.focusFirst = function () {
    const list = UI.focusables();
    if (!list.length) return;
    const pref = list.find((e) => e.classList.contains('primary')) || list.find((e) => e.classList.contains('sel')) || list[0];
    UI.setFocus(pref, true);
  };
  UI.setFocus = function (el, silent) {
    document.querySelectorAll('.focus').forEach((e) => e.classList.remove('focus'));
    if (!el) return;
    el.classList.add('focus');
    UI.focused = el;
    if (C.Input.lastDevice !== 'touch') el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (!silent) C.Audio.play('select');
  };
  UI.nav = function (dx, dy) {
    const list = UI.focusables();
    if (!list.length) return;
    let cur = UI.focused && list.indexOf(UI.focused) >= 0 ? UI.focused : null;
    if (!cur) { UI.focusFirst(); return; }
    const r0 = cur.getBoundingClientRect();
    const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bs = 1e9;
    for (const e of list) {
      if (e === cur) continue;
      const r = e.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const ddx = ex - cx, ddy = ey - cy;
      if (dx && Math.sign(ddx) !== dx) continue;
      if (dy && Math.sign(ddy) !== dy) continue;
      if (dx && Math.abs(ddx) < 4) continue;
      if (dy && Math.abs(ddy) < 4) continue;
      const score = dx ? Math.abs(ddx) + Math.abs(ddy) * 2.5 : Math.abs(ddy) + Math.abs(ddx) * 2.5;
      if (score < bs) { bs = score; best = e; }
    }
    if (best) UI.setFocus(best);
  };
  UI.activate = function () {
    if (UI.focused && UI.focused.isConnected) UI.focused.click();
    else if (UI.current && UI.current.def.onAny) UI.current.def.onAny();
  };

  // ------------------------------------------------------------------ écrans
  const SC = UI.screens;

  SC.title = {
    music: 'menu',
    render() {
      const el = h('div', { onclick: () => { C.Audio.init(); C.Audio.music('menu'); C.Audio.play('confirm'); UI.go('slots', {}, { reset: true }); } },
        h('div.logo', null,
          h('div.logo-top', null, 'CHOC DES'),
          h('div.logo-main', null, 'LEGENDES'),
          h('div.logo-sub', null, 'Le tournoi des mondes')),
        h('div.press.blink', null, C.touchDevice ? 'Touchez l\'écran pour commencer' : 'Appuyez sur une touche pour commencer'),
        C.Pwa && C.Pwa.iosBrowser ? h('div.install-tip', null, '📲 Plein écran et hors ligne : Partager → « Sur l\'écran d\'accueil »') : null,
        h('div.footer', null, 'v1.2 · 17 combattants + ton héros · 10 arènes · Créations originales'));
      return el;
    },
    onAny() { C.Audio.init(); C.Audio.music('menu'); UI.go('slots', {}, { reset: true }); },
    onBack() { if (window.AndroidBridge) window.AndroidBridge.exit(); }
  };

  SC.slots = {
    music: 'menu',
    render() {
      C.Store.loadSlots();
      const cards = [];
      for (let i = 0; i < C.Store.SLOT_COUNT; i++) {
        const d = C.Store.slots[i];
        if (d) {
          const stars = C.Story.totalStars(d);
          cards.push(h('div.slot', null,
            h('div.slot-head', null, h('span.slot-num', null, 'PARTIE ' + (i + 1)), h('span.slot-pct', null, C.Store.progressPercent(d) + ' %')),
            h('div.slot-name', null, d.name),
            h('div.slot-row', null, slotPortrait(d, 96)),
            h('div.slot-info', null,
              h('div', null, '⭐ Niv. ', C.Store.levelInfo(d).level, ' · ', C.Store.levelInfo(d).title),
              h('div', null, '◆ ', d.orbs, ' orbes'),
              h('div', null, '👤 ', d.unlocked.length, ' / ', C.Roster.list.length, ' combattants'),
              h('div', null, '★ ', stars, ' / ', C.Story.chapters.length * 3, ' étoiles'),
              h('div', null, '⏱ ', U.fmtTime(d.playTime))),
            h('div.slot-btns', null,
              btn('JOUER', () => { C.Store.useSlot(i); UI.go('main', {}, { reset: true }); }, 'primary'),
              btn('🗑', () => UI.modal('Supprimer la partie ?', 'La progression de « ' + d.name + ' » sera définitivement effacée.', [
                { label: 'Annuler' }, { label: 'Supprimer', cls: 'danger', fn: () => { C.Store.deleteSlot(i); UI.refresh(); } }]), 'small danger'))));
        } else {
          cards.push(h('div.slot.empty', null,
            h('div.slot-head', null, h('span.slot-num', null, 'PARTIE ' + (i + 1))),
            h('div.slot-empty', null, 'Emplacement libre'),
            btn('NOUVELLE PARTIE', () => newGame(i), 'primary')));
        }
      }
      return h('div', null, topbar('Choisir une partie', () => UI.go('title', {}, { reset: true })), h('div.slots', null, cards));
    }
  };
  function newGame(i) {
    const input = h('input.name-input', { type: 'text', maxlength: '14', value: 'Joueur ' + (i + 1), autocomplete: 'off' });
    UI.modal('Nouvelle partie', h('div', null, h('p', null, 'Nom du joueur :'), input), [
      { label: 'Annuler' },
      { label: 'Créer', cls: 'primary', fn: () => {
        const name = (input.value || '').trim() || 'Joueur ' + (i + 1);
        C.Store.createSlot(i, name);
        C.Store.useSlot(i);
        UI.go('main', {}, { reset: true });
        UI.toast('Bienvenue, ' + name + ' !', 'Commence par l\'ÉCOLE pour apprendre à combattre, puis crée ton héros !');
      } }]);
    setTimeout(() => { input.focus(); input.select(); }, 60);
  }

  SC.main = {
    music: 'menu',
    render() {
      const d = S();
      const ch = C.Story.chapters.filter((c) => d.story.done[c.id]).length;
      const tile = (icon, label, sub, fn, cls) => h('button.tile.nav' + (cls ? '.' + cls : ''), { type: 'button', onclick: () => { C.Audio.play('confirm'); fn(); } },
        h('span.tile-icon', null, icon), h('span.tile-label', null, label), h('span.tile-sub', null, sub));
      return h('div', null,
        h('div.topbar', null,
          h('button.btn.small.nav', { type: 'button', onclick: () => { C.Audio.play('back'); C.Store.save(); UI.go('slots', {}, { reset: true }); } }, '⇄ Partie'),
          h('div.tb-title', null, h('span.player', null, d.name), levelBadge(d)),
          h('div.tb-right', null, orbs())),
        h('div.logo.small', null, h('div.logo-top', null, 'CHOC DES'), h('div.logo-main', null, 'LEGENDES')),
        h('div.tiles', null,
          tile('📖', 'HISTOIRE', 'Chapitre ' + Math.min(ch + 1, C.Story.chapters.length) + ' / ' + C.Story.chapters.length, () => UI.go('story'), 'primary big'),
          tile('⚔️', 'COMBAT', '1 joueur ou 2 joueurs', () => UI.go('select', { mode: 'versus', step: 1 }), 'big'),
          tile('🦸', 'MON HÉROS', d.hero ? d.hero.name : 'Crée ton héros !', () => UI.go('hero'), 'hero'),
          tile('🎓', 'ÉCOLE', 'Apprends à combattre', () => C.Game.startSchool && C.Game.startSchool(), 'school'),
          tile('🏆', 'ARCADE', '8 combats jusqu\'au boss', () => UI.go('select', { mode: 'arcade', step: 1 })),
          tile('🔥', 'SURVIE', 'Record : ' + d.survival.best + ' victoires', () => UI.go('select', { mode: 'survival', step: 1 })),
          tile('🥋', 'ENTRAÎNEMENT', 'Combos et techniques', () => UI.go('select', { mode: 'training', step: 1 }))),
        h('div.menu-row', null,
          btn('👥 Personnages', () => UI.go('gallery')),
          btn('🛒 Boutique', () => UI.go('shop', { tab: 'costumes' })),
          btn('🏅 Succès', () => UI.go('achievements')),
          btn('📊 Statistiques', () => UI.go('stats')),
          btn('⚙️ Options', () => UI.go('options'))));
    },
    onBack() { C.Store.save(); UI.go('slots', {}, { reset: true }); }
  };

  // ------------------------------------------------------------------ Crée ton héros
  const HERO_SW = {
    hair: ['#161616', '#5a3418', '#c98a3a', '#f2d16b', '#e8e8ee', '#d6382a', '#2e6fd8', '#2fa84f', '#8e44d6', '#ff6fb5'],
    skin: ['#f6d7b8', '#f2c69b', '#d9a274', '#b07a4f', '#7a4e2d'],
    outfit: ['#d63a2a', '#ff8a1a', '#f2b705', '#2fa84f', '#2e6fd8', '#1f2a44', '#7b3fb0', '#ff4fd8', '#f2f2f2', '#22222e'],
    aura: ['#5fd3ff', '#ffd84a', '#ff4040', '#7dff8a', '#b86cff', '#ff4fd8', '#ffffff', '#ff8a1a']
  };
  const HAIR_OPTS = [{ value: 'spiky', label: 'En pics' }, { value: 'flame', label: 'Flammes' }, { value: 'messy', label: 'Ébouriffés' },
    { value: 'cap', label: 'Courts' }, { value: 'topknot', label: 'Chignon' }, { value: 'bald', label: 'Sans' }];
  const EXTRA_OPTS = [{ value: 'none', label: 'Rien' }, { value: 'glasses', label: 'Lunettes' }, { value: 'hat', label: 'Chapeau magique' }];
  const ULT_A = ['Rayon', 'Tempête', 'Explosion', 'Poing', 'Vague', 'Comète', 'Lame', 'Tornade', 'Éclair', 'Météore', 'Souffle', 'Choc'];
  const ULT_B = ['du Dragon', 'des Étoiles', 'du Tonnerre', 'du Phénix', 'de la Galaxie', 'Arc-en-ciel', 'du Soleil', 'de Cristal', 'des Ombres', 'du Volcan', 'du Loup', 'Céleste'];
  function swatches(list, value, onchange) {
    const wrap = h('div.swatches');
    list.forEach((col) => {
      const b = h('button.sw.nav' + (col === value ? '.on' : ''), { type: 'button', style: { background: col }, 'aria-label': col, onclick: () => {
        C.Audio.play('select');
        wrap.querySelectorAll('.sw').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        onchange(col);
      } });
      wrap.appendChild(b);
    });
    return wrap;
  }
  SC.hero = {
    music: 'select',
    render() {
      const d = S();
      const isNew = !d.hero;
      const hd = Object.assign({}, C.Roster.HERO_DEFAULT, { name: (d.name || 'Héros').slice(0, 12) }, d.hero || {});
      let awake = false;
      const cv = preview(C.Roster.heroLook(hd), rem(12), rem(13.5));
      const titleEl = h('div.sel-title');
      const refresh = () => {
        const p = cv._p;
        p.look = C.Roster.heroLook(hd);
        p.opts.awakened = awake;
        titleEl.textContent = C.Roster.HERO_POWERS[hd.power].title;
      };
      const nameIn = h('input.name-input.hero-name', { type: 'text', maxlength: '12', value: hd.name, autocomplete: 'off', 'aria-label': 'Nom du héros',
        oninput: (e) => { hd.name = e.target.value; } });
      const ultIn = h('input.name-input.hero-ult', { type: 'text', maxlength: '24', value: hd.ult, autocomplete: 'off', 'aria-label': 'Nom de l\'attaque ultime',
        oninput: (e) => { hd.ult = e.target.value; } });
      const group = (title, ...kids) => h('div.opt-group', null, h('div.opt-head', null, title), kids);
      const powers = h('div.powers', null, Object.keys(C.Roster.HERO_POWERS).map((k) => {
        const P = C.Roster.HERO_POWERS[k];
        const b = h('button.power.nav' + (k === hd.power ? '.on' : ''), { type: 'button', onclick: () => {
          C.Audio.play('select');
          powers.querySelectorAll('.power').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          hd.power = k; refresh();
        } }, h('span.power-icon', null, P.icon), h('span.power-name', null, P.label), h('span.power-desc', null, P.desc));
        return b;
      }));
      const set = (key) => (v) => { hd[key] = v; refresh(); };
      const done = () => {
        hd.name = (hd.name || '').trim().slice(0, 12) || 'Héros';
        hd.ult = (hd.ult || '').trim().slice(0, 24) || 'Attaque Légendaire';
        const data = { name: hd.name, power: hd.power, hair: hd.hair, hairColor: hd.hairColor, skin: hd.skin, outfit: hd.outfit, outfit2: hd.outfit2, aura: hd.aura, extra: hd.extra, ult: hd.ult };
        C.Store.saveHero(data);
        C.Achievements.grant('heros');
        C.Audio.play('unlock');
        C.Voice.say(hd.ult + ' !', { who: 'hero', shout: true });
        UI.toast(isNew ? hd.name + ' est né !' : hd.name + ' est prêt !', 'Choisis-le dans COMBAT, ARCADE, SURVIE ou ENTRAÎNEMENT.');
        UI.go('main', {}, { reset: true });
      };
      setTimeout(refresh, 0);
      return h('div', null,
        topbar(isNew ? '🦸 Crée ton héros' : '🦸 Mon héros', () => UI.back()),
        h('div.sel-body.hero-body', null,
          h('div.sel-left', null, cv, titleEl, nameIn,
            h('div.hero-left-btns', null,
              btn('✨ Éveil', () => { awake = !awake; refresh(); if (awake) { C.Audio.play('transform'); C.Voice.say('Mon pouvoir se réveille !', { who: 'hero', shout: true }); } }, 'small'),
              btn('✔ C\'est mon héros !', done, 'primary small'))),
          h('div.options.hero-opts', null,
            group('⚡ Pouvoir', powers),
            group('💇 Cheveux', chips(HAIR_OPTS, hd.hair, set('hair'), 'wrap'), swatches(HERO_SW.hair, hd.hairColor, set('hairColor'))),
            group('🎨 Tenue', swatches(HERO_SW.outfit, hd.outfit, set('outfit')), h('div.opt-note', null, 'Deuxième couleur :'), swatches(HERO_SW.outfit, hd.outfit2, set('outfit2'))),
            group('🌟 Aura et Éveil', swatches(HERO_SW.aura, hd.aura, set('aura')), h('div.opt-note', null, 'Couleur des attaques, et des cheveux une fois éveillé.')),
            group('💥 Attaque ultime', ultIn, h('div.hero-left-btns', null,
              btn('🎲 Au hasard', () => { hd.ult = U.choice(ULT_A) + ' ' + U.choice(ULT_B); ultIn.value = hd.ult; }, 'small'),
              btn('🔊 Écouter', () => C.Voice.say((hd.ult || '') + ' !', { who: 'hero', shout: true }), 'small'))),
            group('🙂 Visage', swatches(HERO_SW.skin, hd.skin, set('skin')), chips(EXTRA_OPTS, hd.extra, set('extra'), 'wrap')))));
    }
  };

  // ------------------------------------------------------------------ Histoire
  SC.story = {
    music: 'story',
    render() {
      const d = S();
      const list = C.Story.chapters.map((ch) => {
        const avail = C.Story.available(d, ch.id);
        const st = d.story.done[ch.id] || 0;
        return h('button.chapter.nav' + (avail ? '' : '.locked') + (avail && !st ? '.sel' : ''), {
          type: 'button',
          style: { backgroundImage: 'url(' + stageThumb(ch.stage, 320, 180) + ')' },
          onclick: () => {
            if (!avail) { C.Audio.play('error'); UI.toast('Chapitre verrouillé', 'Terminez le chapitre ' + (ch.id - 1) + ' d\'abord.'); return; }
            C.Audio.play('confirm');
            playChapter(ch);
          }
        },
        h('div.ch-num', null, 'CHAPITRE ' + ch.id),
        h('div.ch-title', null, ch.title),
        h('div.ch-vs', null, portraitImg(ch.hero, 0, 96), h('span.vs-mini', null, 'VS'), avail ? portraitImg(ch.foe, 0, 96, { shadow: !!ch.foeShadow, flip: true }) : h('div.unknown', null, '?')),
        h('div.ch-stars', null, stars(st)),
        avail ? null : h('div.lock', null, '🔒'));
      });
      const total = C.Story.totalStars(d);
      return h('div', null,
        topbar('Mode Histoire — La Faille des Mondes', () => UI.go('main', {}, { reset: true })),
        h('div.story-head', null,
          h('div.diff-label', null, 'Difficulté :'),
          chips(DIFF, d.story.difficulty, (v) => { d.story.difficulty = v; C.Store.save(); }),
          h('div.story-stars', null, '★ ', total, ' / ', C.Story.chapters.length * 3),
          btn('Prologue', () => UI.go('dialog', { lines: C.Story.prologue, title: 'Prologue', stage: 'neant', next: () => UI.back() }), 'small')),
        h('div.chapters', null, list));
    },
    onBack() { UI.go('main', {}, { reset: true }); }
  };
  function playChapter(ch) {
    const d = S();
    const lines = (!d.story.seenIntro && ch.id === 1 ? C.Story.prologue : []).concat(ch.intro);
    d.story.seenIntro = true;
    UI.go('dialog', {
      lines, hero: ch.hero, foe: ch.foe, foeShadow: ch.foeShadow, stage: ch.stage, title: 'Chapitre ' + ch.id + ' — ' + ch.title,
      next: () => UI.go('vs', { p1: ch.hero, p2: ch.foe, p2shadow: ch.foeShadow, stage: ch.stage, onDone: () => C.Game.startChapter(ch) }, { replace: true })
    });
  }

  SC.dialog = {
    render(p) {
      let idx = 0, typing = null, full = '';
      const textEl = h('div.dlg-text');
      const nameEl = h('div.dlg-name');
      const left = p.hero ? h('div.dlg-portrait.left', null, portraitImg(p.hero, 0, 320)) : h('div');
      const right = p.foe ? h('div.dlg-portrait.right', null, portraitImg(p.foe, 0, 320, { shadow: !!p.foeShadow, flip: true })) : h('div');
      const show = () => {
        const line = p.lines[idx];
        const sp = C.Story.speaker(line.who);
        nameEl.textContent = sp.name;
        nameEl.className = 'dlg-name' + (sp.narrator ? ' narrator' : '');
        const isLeft = sp.id && sp.id === p.hero && !sp.shadow;
        const isRight = sp.id && (sp.id === p.foe);
        left.classList.toggle('active', !!isLeft); right.classList.toggle('active', !!isRight);
        left.classList.toggle('dim', !isLeft); right.classList.toggle('dim', !isRight);
        full = line.text; let n = 0;
        textEl.textContent = '';
        C.Voice.say(full, { who: sp.narrator ? 'narrator' : (sp.ch && sp.ch.voice) || sp.id });
        textEl.classList.toggle('narr', !!sp.narrator);
        clearInterval(typing);
        typing = setInterval(() => {
          n += 2;
          textEl.textContent = full.slice(0, n);
          if (n >= full.length) { clearInterval(typing); typing = null; }
        }, 22);
      };
      const advance = () => {
        if (typing) { clearInterval(typing); typing = null; textEl.textContent = full; return; }
        idx++;
        C.Audio.play('select');
        if (idx >= p.lines.length) { clearInterval(typing); C.Voice.stop(); p.next(); return; }
        show();
      };
      const el = h('div', { onclick: advance, style: { backgroundImage: p.stage ? 'linear-gradient(rgba(8,4,20,0.35), rgba(8,4,20,0.85)), url(' + stageThumb(p.stage, 640, 360) + ')' : null } },
        h('div.dlg-title', null, p.title || ''),
        h('button.btn.small.skip.nav', { type: 'button', onclick: (e) => { e.stopPropagation(); clearInterval(typing); C.Voice.stop(); C.Audio.play('confirm'); p.next(); } }, 'Passer ▶▶'),
        h('div.dlg-stage', null, left, right),
        h('div.dlg-box', null, nameEl, textEl, h('div.dlg-next.blink', null, '▼')));
      setTimeout(show, 50);
      SC.dialog._advance = advance;
      return el;
    },
    onAny() { SC.dialog._advance && SC.dialog._advance(); },
    onBack(p) { C.Voice.stop(); p.next(); }
  };

  SC.vs = {
    render(p) {
      const st = C.Stages.get(p.stage);
      const el = h('div', { onclick: () => done() },
        h('div.vs-side.left', null, portraitImg(p.p1, p.c1 || 0, 360), h('div.vs-name', null, C.Roster.get(p.p1).name), h('div.vs-title', null, C.Roster.get(p.p1).title)),
        h('div.vs-mid', null, h('div.vs-big', null, 'VS'), h('div.vs-stage', null, st.name)),
        h('div.vs-side.right', null, portraitImg(p.p2, p.c2 || 0, 360, { shadow: !!p.p2shadow, flip: true }), h('div.vs-name', null, (p.p2shadow ? 'Ombre de ' : '') + C.Roster.get(p.p2).name), h('div.vs-title', null, C.Roster.get(p.p2).title)),
        h('div.vs-tip', null, 'Astuce : ' + U.choice(TIPS)));
      let fired = false;
      const done = () => { if (fired) return; fired = true; clearTimeout(timer); p.onDone(); };
      const timer = setTimeout(done, 2600);
      C.Audio.play('announce');
      return el;
    },
    onBack() { }
  };

  // ------------------------------------------------------------------ Sélection des combattants
  SC.select = {
    music: 'select',
    render(p) {
      const d = S();
      const mode = p.mode;
      const isP2 = p.step === 2;
      const titles = {
        versus: isP2 ? 'Choisissez l\'adversaire' : 'Combat libre — Joueur 1',
        arcade: 'Arcade — Choisissez votre combattant',
        survival: 'Survie — Choisissez votre combattant',
        training: isP2 ? 'Entraînement — Mannequin' : 'Entraînement — Votre combattant'
      };
      const cfg = p.cfg || (p.cfg = { p2human: false, diff: C.Store.settings.defaultDifficulty });
      let selId = p.sel || (isP2 ? (p.p1 === 'takeda' ? 'kairo' : 'takeda') : (d.lastChar && C.Store.isUnlocked(d.lastChar) ? d.lastChar : 'kairo'));
      if (!C.Store.isUnlocked(selId) && !(isP2 && mode !== 'training' && false)) selId = 'kairo';
      let costume = 0;
      const info = h('div.sel-info');
      const prevBox = h('div.sel-preview');
      const costumeBox = h('div.costumes');
      const update = () => {
        const ch = C.Roster.get(selId);
        const look = C.Roster.look(selId, costume);
        prevBox.innerHTML = '';
        prevBox.appendChild(preview(look, rem(15), rem(15.5), { flip: isP2 }));
        info.innerHTML = '';
        info.appendChild(h('div.sel-name', null, ch.name));
        info.appendChild(h('div.sel-title', null, ch.title + ' · ' + ch.world));
        const R = ch.rating;
        info.appendChild(h('div.ratings', null, Object.keys(R).map((k) => h('div.rating', null, h('span', null, k.replace('portee', 'portée').replace('defense', 'défense')), bar(R[k], 5)))));
        costumeBox.innerHTML = '';
        const owned = C.Store.costumesOf(selId);
        ch.palettes.forEach((pal, i) => {
          const has = owned.indexOf(i) >= 0;
          const col = (pal.top || ch.look.colors.top || ch.look.colors.skin);
          costumeBox.appendChild(h('button.costume.nav' + (i === costume ? '.on' : '') + (has ? '' : '.locked'), {
            type: 'button', title: has ? 'Costume ' + (i + 1) : 'À acheter dans la Boutique',
            style: { background: col }, onclick: () => {
              if (!has) { C.Audio.play('error'); UI.toast('Costume verrouillé', 'Disponible dans la Boutique'); return; }
              costume = i; C.Audio.play('select'); update();
            } }, has ? String(i + 1) : '🔒'));
        });
        grid.querySelectorAll('.ctile').forEach((t) => t.classList.toggle('sel', t.dataset.id === selId));
        bioBox.textContent = ch.bio;
      };
      const grid = h('div.cgrid');
      // Le héros du joueur en premier (ou une case pour le créer)
      if (C.Roster.get('hero')) {
        const hc = C.Roster.get('hero');
        grid.appendChild(h('button.ctile.nav.hero-tile', { type: 'button', 'data-id': 'hero', onclick: () => {
          if (selId === 'hero' && C.Input.lastDevice === 'touch') { confirm(); return; }
          selId = 'hero'; costume = 0; C.Audio.play('select'); update();
        } }, portraitImg('hero', 0, 96), h('span.ctile-name', null, hc.name)));
      } else {
        grid.appendChild(h('button.ctile.nav.hero-tile.create', { type: 'button', onclick: () => UI.go('hero') },
          h('span.rnd', null, '＋'), h('span.ctile-name', null, 'Ton héros')));
      }
      C.Roster.list.forEach((ch) => {
        const un = C.Store.isUnlocked(ch.id);
        const t = h('button.ctile.nav' + (un ? '' : '.locked'), { type: 'button', 'data-id': ch.id, onclick: () => {
          if (!un) {
            C.Audio.play('error');
            const chap = C.Story.chapters.find((c) => c.unlock === ch.id);
            UI.toast(ch.name + ' est verrouillé', chap ? 'Terminez le chapitre ' + chap.id + ' du mode Histoire, ou achetez-le dans la Boutique.' : 'Disponible dans la Boutique.');
            return;
          }
          if (selId === ch.id && C.Input.lastDevice === 'touch') { confirm(); return; }
          selId = ch.id; costume = 0; C.Audio.play('select'); update();
        } }, portraitImg(ch.id, 0, 96, { silhouette: !un }), h('span.ctile-name', null, un ? (ch.short || ch.name) : '???'));
        grid.appendChild(t);
      });
      grid.appendChild(h('button.ctile.nav.random', { type: 'button', onclick: () => {
        const pool = C.Roster.list.filter((c) => C.Store.isUnlocked(c.id));
        selId = U.choice(pool).id; costume = 0; C.Audio.play('select'); update();
      } }, h('span.rnd', null, '?'), h('span.ctile-name', null, 'Hasard')));

      const options = h('div.sel-options');
      const bioBox = h('div.sel-bio');
      if (mode === 'versus' && isP2) {
        options.appendChild(h('div.opt-line', null, h('span', null, 'Adversaire :'), chips([{ label: 'CPU', value: false }, { label: 'Joueur 2 (manette/clavier)', value: true }], cfg.p2human, (v) => { cfg.p2human = v; })));
      }
      if ((mode === 'versus' && isP2) || (mode === 'arcade')) {
        options.appendChild(h('div.opt-line', null, h('span', null, 'Difficulté :'), chips(DIFF, cfg.diff, (v) => { cfg.diff = v; })));
      }
      const confirm = () => {
        C.Audio.play('confirm');
        const pick = { char: selId, costume };
        if (mode === 'versus') {
          if (!isP2) UI.go('select', { mode, step: 2, p1: pick.char, c1: pick.costume, cfg });
          else UI.go('stage', { onPick: (stage) => {
            const ctx = { mode: 'versus', p1: { char: p.p1, costume: p.c1 }, p2: { char: pick.char, costume: pick.costume, human: cfg.p2human }, stage, difficulty: cfg.diff };
            UI.go('vs', { p1: p.p1, c1: p.c1, p2: pick.char, c2: pick.costume, stage, onDone: () => C.Game.start(ctx) }, { replace: true });
          } });
        } else if (mode === 'training') {
          if (!isP2) UI.go('select', { mode, step: 2, p1: pick.char, c1: pick.costume, cfg });
          else UI.go('stage', { onPick: (stage) => {
            C.Game.start({ mode: 'training', p1: { char: p.p1, costume: p.c1 }, p2: { char: pick.char, costume: pick.costume }, stage, difficulty: 1, rounds: 1, time: 0, dummy: 'stand',
              training: { infiniteHp: true, infiniteMeter: true, dummyLabel: 'Debout' } });
          } });
        } else if (mode === 'arcade') {
          const A = C.Game.newArcade(pick.char, pick.costume, cfg.diff);
          UI.go('ladder', { A });
        } else if (mode === 'survival') {
          const Sv = C.Game.newSurvival(pick.char, pick.costume);
          C.Game.survivalFight(Sv);
        }
      };
      setTimeout(update, 0);
      return h('div', null,
        topbar(titles[mode], () => UI.back()),
        h('div.sel-body', null,
          h('div.sel-left', null, prevBox, info, h('div.costume-line', null, h('span', null, 'Costume :'), costumeBox)),
          h('div.sel-right', null, grid, bioBox, options, h('div.sel-confirm', null, btn(isP2 || mode === 'arcade' || mode === 'survival' ? 'COMBATTRE ▶' : 'VALIDER ▶', confirm, 'primary big')))));
    }
  };

  SC.stage = {
    music: 'select',
    render(p) {
      const tiles = C.Stages.list.map((st) => {
        const un = C.Store.hasStage(st.id);
        return h('button.stile.nav' + (un ? '' : '.locked'), { type: 'button', style: { backgroundImage: 'url(' + stageThumb(st.id, 320, 180) + ')' }, onclick: () => {
          if (!un) { C.Audio.play('error'); UI.toast('Arène verrouillée', 'Progressez dans l\'Histoire ou achetez-la dans la Boutique.'); return; }
          C.Audio.play('confirm'); p.onPick(st.id);
        } }, h('span.stile-name', null, un ? st.name : '🔒 ' + st.name));
      });
      tiles.unshift(h('button.stile.nav.random.primary', { type: 'button', onclick: () => {
        const pool = C.Stages.list.filter((s) => C.Store.hasStage(s.id));
        C.Audio.play('confirm'); p.onPick(U.choice(pool).id);
      } }, h('span.rnd', null, '?'), h('span.stile-name', null, 'Arène au hasard')));
      return h('div', null, topbar('Choisissez l\'arène', () => UI.back()), h('div.sgrid', null, tiles));
    }
  };

  // ------------------------------------------------------------------ Pause
  SC.pause = {
    render() {
      const b = C.Game.battle;
      const ctx = C.Game.ctx;
      const items = [
        btn('▶ Reprendre', () => C.Game.resume(), 'primary'),
        btn('📜 Liste des coups', () => UI.go('movelist', { char: ctx.p1.char })),
        btn('↻ Recommencer', () => { UI.hide(); C.Game.restart(); }),
        btn('⚙️ Options', () => UI.go('options', { inGame: true }))
      ];
      let extra = null;
      if (ctx.mode === 'training' && !ctx.school) {
        const T = b.training;
        extra = h('div.training-opts', null,
          h('div.opt-line', null, h('span', null, 'Mannequin :'), chips(C.AI.Dummy.MODES.map((m) => ({ label: m.label, value: m.id })), b.f[1].controller.mode, (v) => {
            b.f[1].controller = new C.AI.Dummy(v); T.dummyLabel = C.AI.Dummy.MODES.find((m) => m.id === v).label;
          }, 'wrap')),
          h('div.opt-line', null, h('span', null, 'Vie infinie :'), chips([{ label: 'Oui', value: true }, { label: 'Non', value: false }], !!T.infiniteHp, (v) => { T.infiniteHp = v; })),
          h('div.opt-line', null, h('span', null, 'Jauge ULTRA infinie :'), chips([{ label: 'Oui', value: true }, { label: 'Non', value: false }], !!T.infiniteMeter, (v) => { T.infiniteMeter = v; if (!v) b.f[0].meter = 0; })),
          h('div.opt-line', null, h('span', null, 'Boîtes de collision :'), chips([{ label: 'Masquées', value: false }, { label: 'Visibles', value: true }], !!b.debugBoxes, (v) => { b.debugBoxes = v; })),
          btn('⟲ Replacer les combattants', () => { b.f[0].x = -200; b.f[1].x = 200; b.f[0].hp = b.f[0].maxHp; b.f[1].hp = b.f[1].maxHp; b.entities.length = 0; C.Game.resume(); }, 'small'));
      }
      items.push(btn('✖ Quitter le combat', () => UI.modal('Quitter le combat ?', ctx.mode === 'story' ? 'Vous pourrez rejouer ce chapitre plus tard.' : 'Le combat en cours sera perdu.', [
        { label: 'Annuler' }, { label: 'Quitter', cls: 'danger', fn: () => C.Game.quit(ctx.mode === 'story' ? 'story' : 'main') }]), 'danger'));
      return h('div', null, h('div.pause-panel', null, h('div.pause-title', null, 'PAUSE'), h('div.pause-btns', null, items), extra));
    },
    onBack() { C.Game.resume(); }
  };

  SC.movelist = {
    render(p) {
      const ch = C.Roster.get(p.char);
      const list = C.Moves.moveList(p.char);
      const kindLabel = { special: 'Spécial', super: 'Super', ultimate: 'Ultime', normal: 'Normal', grab: 'Projection', charge: 'Aura' };
      return h('div', null,
        topbar('Liste des coups — ' + ch.name, () => UI.back()),
        h('div.movelist', null,
          h('div.ml-help', null, 'Contrôles : joystick pour se déplacer (↑ saut, ↓ accroupi), double-tap → ruée. ',
            h('b', null, 'LÉGER'), ' · ', h('b', null, 'LOURD'), ' · ', h('b', null, 'SPÉCIAL'), ' · ', h('b', null, 'GARDE'), ' (au bon moment = PARADE) · ', h('b', null, 'SAISIE'), ' · ', h('b', null, 'ULTRA'), '.'),
          h('table.ml', null, list.map((m) => h('tr.ml-' + m.kind, null, h('td.ml-in', null, m.input), h('td.ml-name', null, m.name), h('td.ml-kind', null, kindLabel[m.kind] || ''))))));
    }
  };

  // ------------------------------------------------------------------ Résultats
  SC.results = {
    music: null,
    render(p) {
      const r = p.result, ctx = p.ctx;
      const won = r.winner === 0;
      const two = !!ctx.p2.human;
      const wf = won ? r.p1 : r.p2;
      const title = two ? (won ? 'JOUEUR 1 GAGNE !' : 'JOUEUR 2 GAGNE !') : (won ? 'VICTOIRE !' : 'DÉFAITE…');
      const s1 = r.stats, s2 = r.oppStats;
      const row = (label, a, b) => h('tr', null, h('td', null, label), h('td.v', null, String(a)), h('td.v', null, String(b)));
      const rw = p.rewards || {};
      return h('div', null,
        h('div.res-left', null, portraitImg(wf.ch.id, wf.cfg.costume || 0, 360, { flip: !won, shadow: !!wf.cfg.shadow }), h('div.res-title' + (won || two ? '.win' : '.lose'), null, title), h('div.res-quote', null, '« ' + wf.ch.quotes.win + ' »')),
        h('div.res-right', null,
          h('table.res-table', null,
            h('tr.head', null, h('td'), h('td.v', null, r.p1.ch.name), h('td.v', null, r.p2.name)),
            row('Manches gagnées', r.roundsWon, r.roundsLost),
            row('Dégâts infligés', s1.dmg, s2.dmg),
            row('Combo maximum', s1.maxCombo, s2.maxCombo),
            row('Parades', s1.parries, s2.parries),
            row('Projections', s1.throws, s2.throws),
            row('Supers / Ultimes', s1.supers, s2.supers)),
          rw.orbs ? h('div.reward', null, '◆ +', rw.orbs, ' orbes') : null,
          xpLine(rw),
          (rw.achievements || []).length ? h('div.reward-ach', null, rw.achievements.map((id) => h('div', null, '🏆 ', C.Achievements.byId[id].name))) : null,
          h('div.res-btns', null,
            btn('↻ Revanche', () => { ctx.boost = false; C.Game.start(ctx); }, 'primary'),
            !won && !two && ctx.mode === 'versus' ? btn('⭐ Revanche avec un coup de pouce', () => { ctx.boost = true; C.Game.start(ctx); }) : null,
            btn('👥 Changer de combattants', () => { C.Game.leave(); C.Audio.music('select'); UI.go('select', { mode: ctx.mode === 'versus' ? 'versus' : ctx.mode, step: 1 }, { reset: false }); }),
            btn('🏠 Menu principal', () => C.Game.quit('main')))));
    },
    onBack() { C.Game.quit('main'); }
  };

  SC.schoolDone = {
    music: 'victory',
    render(p) {
      return h('div', null, h('div.center-panel.wide', null,
        h('div.res-title.win', null, '🎓 DIPLÔMÉ !'),
        h('p', null, 'Maître Shen est fier de toi ! Tu sais marcher, sauter, enchaîner les coups, te protéger, charger ton aura et lancer tes attaques ULTRA.'),
        h('div.reward', null, '◆ +', p.orbs, ' orbes'),
        xpLine({ xp: p.xp, levels: p.levels }),
        h('div.res-btns', null,
          btn('📖 Partir à l\'aventure (Histoire)', () => UI.go('story', {}, { reset: true }), 'primary'),
          S() && !S().hero ? btn('🦸 Créer mon héros', () => UI.go('hero')) : null,
          btn('🏠 Menu principal', () => UI.go('main', {}, { reset: true })))));
    },
    onBack() { UI.go('main', {}, { reset: true }); }
  };

  SC.storyLose = {
    render(p) {
      return h('div', null, h('div.center-panel', null,
        h('div.res-title.lose', null, 'DÉFAITE…'),
        h('p', null, 'Ne baisse pas les bras ! Un vrai héros se relève toujours.'),
        h('p.boost-help', null, '⭐ Coup de pouce : +40 % de vie, coups plus forts et 1 barre d\'ULTRA dès le départ.'),
        h('div.res-btns', null,
          btn('⭐ Réessayer avec un coup de pouce', () => C.Game.startChapter(p.ch, true), 'primary'),
          btn('↻ Réessayer', () => C.Game.startChapter(p.ch)),
          btn('📖 Retour à l\'Histoire', () => C.Game.quit('story')))));
    },
    onBack() { C.Game.quit('story'); }
  };

  SC.storyReward = {
    music: 'victory',
    render(p) {
      const ch = p.ch, rw = p.rewards;
      const unlockCards = rw.unlocks.map((id) => h('div.unlock-card', null, h('div.unlock-label', null, 'NOUVEAU COMBATTANT !'), portraitImg(id, 0, 200), h('div.unlock-name', null, C.Roster.get(id).name), h('div.unlock-sub', null, C.Roster.get(id).title)));
      const stageCards = rw.stages.map((id) => h('div.unlock-card.stage', null, h('div.unlock-label', null, 'NOUVELLE ARÈNE !'), h('img.stage-img', { src: stageThumb(id, 320, 180) }), h('div.unlock-name', null, C.Stages.get(id).name)));
      const last = ch.id === C.Story.chapters.length;
      return h('div', null, h('div.center-panel.wide', null,
        h('div.res-title.win', null, 'CHAPITRE ' + ch.id + ' TERMINÉ !'),
        h('div.big-stars', null, stars(p.stars)),
        h('div.star-help', null, '★ Victoire   ★ Aucune manche perdue   ★ Plus de 50 % de vie'),
        h('div.reward', null, '◆ +', rw.orbs, ' orbes'),
        xpLine(rw),
        h('div.unlocks', null, unlockCards, stageCards),
        (rw.achievements || []).length ? h('div.reward-ach', null, rw.achievements.map((id) => h('div', null, '🏆 ', C.Achievements.byId[id].name))) : null,
        h('div.res-btns', null,
          last ? btn('🎬 Épilogue', () => { C.Game.leave(); UI.go('credits', { epilogue: true }); }, 'primary') : btn('▶ Chapitre suivant', () => { C.Game.leave(); C.Audio.music('story'); UI.go('story', {}, { reset: true }); const nx = C.Story.get(ch.id + 1); if (nx) { UI.stack = [{ name: 'main', params: {} }, { name: 'story', params: {} }]; playChapter(nx); } }, 'primary'),
          btn('📖 Retour à l\'Histoire', () => C.Game.quit('story')))));
    },
    onBack() { C.Game.quit('story'); }
  };

  // ------------------------------------------------------------------ Arcade
  SC.ladder = {
    music: 'select',
    render(p) {
      const A = p.A;
      const slots = A.opps.map((id, i) => h('div.ladder-slot' + (i < A.idx ? '.done' : i === A.idx ? '.cur' : ''), null,
        portraitImg(id, 0, 96, { silhouette: i > A.idx + 1 && id === 'omega' }), h('span', null, i === A.opps.length - 1 ? 'BOSS' : String(i + 1))));
      return h('div', null,
        topbar('Arcade — ' + DIFF[A.diff], () => UI.modal('Abandonner l\'Arcade ?', 'Votre progression dans l\'échelle sera perdue.', [{ label: 'Non' }, { label: 'Abandonner', cls: 'danger', fn: () => C.Game.quit('main') }])),
        h('div.ladder-head', null, portraitImg(A.char, A.costume, 160), h('div', null, h('div.sel-name', null, C.Roster.get(A.char).name), h('div.score', null, 'Score : ', A.score), h('div', null, 'Combat ', A.idx + 1, ' / ', A.opps.length))),
        h('div.ladder', null, slots),
        h('div.res-btns', null, btn('⚔️ Combattre : ' + C.Roster.get(A.opps[A.idx]).name, () => UI.go('vs', { p1: A.char, c1: A.costume, p2: A.opps[A.idx], stage: A.stages[A.idx], onDone: () => C.Game.arcadeFight(A) }, { replace: true }), 'primary big')));
    },
    onBack(p) { UI.modal('Abandonner l\'Arcade ?', 'Votre progression sera perdue.', [{ label: 'Non' }, { label: 'Abandonner', cls: 'danger', fn: () => C.Game.quit('main') }]); }
  };
  SC.arcadeContinue = {
    render(p) {
      const A = p.A;
      let n = 10;
      const cnt = h('div.countdown', null, '10');
      const timer = setInterval(() => { n--; cnt.textContent = String(n); C.Audio.play('tick'); if (n <= 0) { clearInterval(timer); end(); } }, 1000);
      const end = () => { clearInterval(timer); UI.go('arcadeEnding', { A, lost: true }); };
      return h('div', null, h('div.center-panel', null,
        h('div.res-title.lose', null, 'CONTINUER ?'), cnt,
        h('p', null, 'Continuer remet votre score à zéro pour ce combat.'),
        h('div.res-btns', null,
          btn('⭐ Oui, avec un coup de pouce', () => { clearInterval(timer); A.continues++; A.score = Math.round(A.score * 0.5); A.boostNext = true; C.Game.arcadeFight(A); }, 'primary'),
          btn('✔ Oui', () => { clearInterval(timer); A.continues++; A.score = Math.round(A.score * 0.5); C.Game.arcadeFight(A); }),
          btn('✖ Non', end))));
    },
    onBack(p) { UI.go('arcadeEnding', { A: p.A, lost: true }); }
  };
  SC.arcadeEnding = {
    music: 'victory',
    render(p) {
      const A = p.A;
      const ch = C.Roster.get(A.char);
      const text = p.lost
        ? ch.name + ' tombe au combat après ' + A.idx + ' victoire' + (A.idx > 1 ? 's' : '') + '. Le tournoi continue sans lui… pour l\'instant.'
        : 'Oméga s\'effondre ! ' + ch.name + ' a triomphé de tous les guerriers des mondes. De retour dans ' + ch.world + ', une nouvelle légende est née… mais les failles pourraient bien se rouvrir un jour.';
      return h('div', null, h('div.center-panel.wide', null,
        h('div.res-title' + (p.lost ? '.lose' : '.win'), null, p.lost ? 'FIN DE PARTIE' : 'ARCADE TERMINÉE !'),
        portraitImg(A.char, A.costume, 220),
        h('p.ending', null, text),
        h('div.score', null, 'Score final : ', A.score),
        h('div.reward', null, '◆ +', A.total, ' orbes gagnés'),
        h('div.res-btns', null, btn('🏠 Menu principal', () => C.Game.quit('main'), 'primary'))));
    },
    onBack() { C.Game.quit('main'); }
  };

  // ------------------------------------------------------------------ Survie
  SC.survivalNext = {
    render(p) {
      const Sv = p.Sv;
      return h('div', null, h('div.center-panel', null,
        h('div.res-title.win', null, 'VICTOIRE N° ' + Sv.wins),
        portraitImg(Sv.char, Sv.costume, 180),
        h('div', null, 'Vie récupérée (+30 %) :'), bar(Sv.hp, 1, 'life'),
        h('div.reward', null, '◆ ', Sv.total, ' orbes cumulés'),
        h('div.res-btns', null,
          btn('⚔️ Combat suivant', () => C.Game.survivalFight(Sv), 'primary'),
          btn('🏳 S\'arrêter ici', () => UI.go('survivalOver', { Sv })))));
    },
    onBack(p) { UI.go('survivalOver', { Sv: p.Sv }); }
  };
  SC.survivalOver = {
    music: 'menu',
    render(p) {
      const Sv = p.Sv, d = S();
      return h('div', null, h('div.center-panel', null,
        h('div.res-title', null, 'SURVIE TERMINÉE'),
        h('div.big-num', null, Sv.wins), h('div', null, 'victoire' + (Sv.wins > 1 ? 's' : '') + ' consécutive' + (Sv.wins > 1 ? 's' : '')),
        h('div', null, 'Record : ', d.survival.best, ' (', d.survival.bestChar ? C.Roster.get(d.survival.bestChar).name : '—', ')'),
        h('div.reward', null, '◆ +', Sv.total, ' orbes'),
        h('div.res-btns', null, btn('↻ Recommencer', () => C.Game.survivalFight(C.Game.newSurvival(Sv.char, Sv.costume)), 'primary'), btn('🏠 Menu', () => C.Game.quit('main')))));
    },
    onBack() { C.Game.quit('main'); }
  };

  // ------------------------------------------------------------------ Galerie
  SC.gallery = {
    music: 'menu',
    render() {
      const grid = h('div.cgrid.gallery');
      C.Roster.list.forEach((ch) => {
        const un = C.Store.isUnlocked(ch.id);
        grid.appendChild(h('button.ctile.nav' + (un ? '' : '.locked'), { type: 'button', onclick: () => UI.go('charDetail', { id: ch.id }) },
          portraitImg(ch.id, 0, 96, { silhouette: !un }), h('span.ctile-name', null, un ? (ch.short || ch.name) : '???')));
      });
      const d = S();
      return h('div', null, topbar('Personnages (' + d.unlocked.length + ' / ' + C.Roster.list.length + ')', () => UI.back()), grid);
    }
  };
  SC.charDetail = {
    render(p) {
      const ch = C.Roster.get(p.id);
      const un = C.Store.isUnlocked(ch.id);
      const chap = C.Story.chapters.find((c) => c.unlock === ch.id);
      if (!un) {
        return h('div', null, topbar('???', () => UI.back()), h('div.center-panel', null,
          portraitImg(ch.id, 0, 240, { silhouette: true }),
          h('p', null, 'Combattant mystère.'),
          h('p', null, chap ? 'Se débloque au chapitre ' + chap.id + ' du mode Histoire (« ' + chap.title + ' »).' : 'Se débloque dans la Boutique.'),
          btn('🛒 Voir dans la Boutique', () => UI.go('shop', { tab: 'chars' }))));
      }
      const R = ch.rating;
      const moves = C.Moves.moveList(ch.id).filter((m) => m.kind !== 'normal' && m.kind !== 'grab');
      const cs = S().stats.byChar[ch.id] || { used: 0, wins: 0 };
      return h('div', null,
        topbar(ch.name + ' — ' + ch.title, () => UI.back()),
        h('div.detail', null,
          h('div.detail-left', null, preview(C.Roster.look(ch.id, 0), rem(16), rem(20), { cycle: true })),
          h('div.detail-right', null,
            h('div.sel-title', null, ch.world),
            h('p.bio', null, ch.bio),
            h('div.ratings', null, Object.keys(R).map((k) => h('div.rating', null, h('span', null, k.replace('portee', 'portée').replace('defense', 'défense')), bar(R[k], 5)))),
            h('div.detail-stats', null, 'Utilisé ', cs.used, ' fois · ', cs.wins, ' victoire' + (cs.wins > 1 ? 's' : '')),
            h('table.ml', null, moves.map((m) => h('tr.ml-' + m.kind, null, h('td.ml-in', null, m.input), h('td.ml-name', null, m.name)))),
            h('div.res-btns', null, btn('📜 Tous les coups', () => UI.go('movelist', { char: ch.id })), btn('🛒 Costumes', () => UI.go('shop', { tab: 'costumes', char: ch.id }))))));
    }
  };

  // ------------------------------------------------------------------ Boutique
  SC.shop = {
    music: 'menu',
    render(p) {
      const d = S();
      const tab = p.tab || 'costumes';
      const buy = (price, fn, label) => {
        if (d.orbs < price) { C.Audio.play('error'); UI.toast('Pas assez d\'orbes', 'Il vous manque ' + (price - d.orbs) + ' ◆'); return; }
        UI.modal('Confirmer l\'achat', label + ' pour ' + price + ' ◆ ?', [{ label: 'Annuler' }, { label: 'Acheter', cls: 'primary', fn: () => {
          d.orbs -= price; fn(); C.Audio.play('coin'); C.Store.save(); UI.refresh();
        } }]);
      };
      let items = [];
      if (tab === 'costumes') {
        C.Roster.list.forEach((ch) => {
          if (p.char && ch.id !== p.char) return;
          const owned = C.Store.costumesOf(ch.id);
          for (let i = 1; i < ch.palettes.length; i++) {
            const has = owned.indexOf(i) >= 0;
            const price = i === 1 ? 300 : 500;
            const un = C.Store.isUnlocked(ch.id);
            items.push(h('div.shop-item' + (has ? '.owned' : ''), null,
              portraitImg(ch.id, i, 128, { silhouette: !un }),
              h('div.shop-name', null, (un ? ch.name : '???') + ' — Costume ' + (i + 1)),
              has ? h('div.shop-owned', null, '✔ Acquis') : btn('◆ ' + price, () => buy(price, () => { C.Store.unlockCostume(ch.id, i); C.Achievements.grant('costume'); }, 'Costume ' + (i + 1) + ' de ' + ch.name), un && d.orbs >= price ? 'primary small' : 'small', un ? null : { disabled: 'disabled' })));
          }
        });
      } else if (tab === 'stages') {
        C.Stages.list.forEach((st) => {
          const has = C.Store.hasStage(st.id);
          const price = st.id === 'neant' ? 1200 : 450;
          items.push(h('div.shop-item.wide' + (has ? '.owned' : ''), null,
            h('img.stage-img', { src: stageThumb(st.id, 320, 180) }),
            h('div.shop-name', null, st.name),
            h('div.shop-desc', null, st.desc),
            has ? h('div.shop-owned', null, '✔ Acquise') : btn('◆ ' + price, () => buy(price, () => C.Store.unlockStage(st.id), 'L\'arène « ' + st.name + ' »'), d.orbs >= price ? 'primary small' : 'small')));
        });
      } else {
        C.Roster.list.forEach((ch) => {
          const has = C.Store.isUnlocked(ch.id);
          const price = ch.id === 'omega' ? 4000 : 1500;
          items.push(h('div.shop-item' + (has ? '.owned' : ''), null,
            portraitImg(ch.id, 0, 128, { silhouette: !has }),
            h('div.shop-name', null, has ? ch.name : '???'),
            has ? h('div.shop-owned', null, '✔ Débloqué') : btn('◆ ' + price, () => buy(price, () => { C.Store.unlockChar(ch.id); C.Achievements.checkStats(); }, 'Débloquer ce combattant mystère'), d.orbs >= price ? 'primary small' : 'small')));
        });
      }
      const tabs = h('div.tabs', null,
        [['costumes', '👕 Costumes'], ['stages', '🏞 Arènes'], ['chars', '👤 Combattants']].map(([id, label]) => h('button.tab.nav' + (id === tab ? '.on' : ''), { type: 'button', onclick: () => { C.Audio.play('select'); UI.go('shop', { tab: id }, { replace: true }); } }, label)));
      return h('div', null, topbar('Boutique', () => UI.back()), tabs, p.char ? h('div.shop-filter', null, 'Costumes de ' + C.Roster.get(p.char).name + ' · ', h('a.nav', { onclick: () => UI.go('shop', { tab: 'costumes' }, { replace: true }) }, 'tout afficher')) : null, h('div.shop', null, items));
    }
  };

  // ------------------------------------------------------------------ Succès / Statistiques
  SC.achievements = {
    music: 'menu',
    render() {
      const d = S();
      const got = Object.keys(d.achievements).length;
      return h('div', null, topbar('Succès (' + got + ' / ' + C.Achievements.list.length + ')', () => UI.back()),
        h('div.ach-list', null, C.Achievements.list.map((a) => {
          const has = !!d.achievements[a.id];
          const prog = a.progress ? a.progress(d) : null;
          return h('div.ach' + (has ? '.got' : ''), null,
            h('div.ach-icon', null, has ? '🏆' : '🔒'),
            h('div.ach-body', null, h('div.ach-name', null, a.name), h('div.ach-desc', null, a.desc), prog && !has ? h('div.ach-prog', null, bar(prog[0], prog[1]), h('span', null, Math.min(prog[0], prog[1]) + ' / ' + prog[1])) : null),
            h('div.ach-reward', null, '◆ ' + a.reward));
        })));
    }
  };
  SC.stats = {
    music: 'menu',
    render() {
      const d = S(), s = d.stats;
      const fav = Object.keys(s.byChar).sort((a, b) => s.byChar[b].used - s.byChar[a].used)[0];
      const row = (k, v) => h('tr', null, h('td', null, k), h('td.v', null, String(v)));
      return h('div', null, topbar('Statistiques', () => UI.back()),
        h('div.stats-wrap', null,
          h('table.stats', null,
            row('Temps de jeu', U.fmtTime(d.playTime + (performance.now() - (C.Store.sessionStart || performance.now())) / 1000)),
            row('Combats', s.fights), row('Victoires', s.wins), row('Défaites', s.losses),
            row('Taux de victoire', s.fights ? Math.round(s.wins / s.fights * 100) + ' %' : '—'),
            row('Manches gagnées', s.kos), row('Manches parfaites', s.perfects), row('Combo record', s.maxCombo),
            row('Parades', s.parries), row('Gardes brisées', s.guardCrushes), row('Projections', s.throws), row('K.O. par Ultime', s.ultimateKOs),
            row('Record en Survie', d.survival.best), row('Meilleur score Arcade', d.arcade.best),
            row('Étoiles (Histoire)', C.Story.totalStars(d) + ' / ' + C.Story.chapters.length * 3),
            row('Combattant favori', fav ? C.Roster.get(fav).name : '—')),
          h('div.char-stats', null, Object.keys(s.byChar).sort((a, b) => s.byChar[b].used - s.byChar[a].used).slice(0, 8).map((id) => h('div.cs', null, portraitImg(id, 0, 64), h('span', null, s.byChar[id].wins + ' V / ' + s.byChar[id].used))))));
    }
  };

  // ------------------------------------------------------------------ Options
  SC.options = {
    music: null,
    render(p) {
      const s = C.Store.settings;
      const save = () => { C.Store.saveSettings(); C.Audio.applyVolumes(); if (C.Input.relayout) C.Input.relayout(C.Input.W, C.Input.H); };
      const slider = (label, key, min, max, step, fmt) => {
        const val = h('span.sl-val', null, fmt(s[key]));
        const inp = h('input.nav', { type: 'range', min, max, step, value: s[key], oninput: (e) => { s[key] = parseFloat(e.target.value); val.textContent = fmt(s[key]); save(); } });
        return h('div.opt-line', null, h('span', null, label), inp, val);
      };
      const toggle = (label, key) => h('div.opt-line', null, h('span', null, label), chips([{ label: 'Oui', value: true }, { label: 'Non', value: false }], !!s[key], (v) => { s[key] = v; save(); }));
      const pct = (v) => Math.round(v * 100) + ' %';
      return h('div', null, topbar('Options', () => UI.back()),
        h('div.options', null,
          h('div.opt-group', null, h('div.opt-head', null, '🔊 Son'),
            slider('Musique', 'music', 0, 1, 0.05, pct),
            slider('Effets sonores', 'sfx', 0, 1, 0.05, pct),
            C.Voice.ok ? toggle('Voix (histoire lue, attaques criées)', 'voice') : null,
            C.Pwa && !C.Pwa.canVibrate ? null : toggle('Vibrations', 'vibration')),
          h('div.opt-group', null, h('div.opt-head', null, '🎮 Commandes tactiles'),
            slider('Taille des boutons', 'controlSize', 0.75, 1.3, 0.05, pct),
            slider('Opacité', 'controlOpacity', 0.25, 1, 0.05, pct),
            toggle('Coups spéciaux faciles', 'easySpecials'),
            h('div.opt-note', null, 'Coups spéciaux faciles : SPÉCIAL seul choisit la bonne technique selon la distance, et Léger ×4 termine le combo par une technique.'),
            toggle('Mode gaucher', 'leftHanded'),
            h('div.opt-note', null, 'Clavier : ZQSD/WASD + J (Léger) K (Lourd) L (Spécial) I (Garde) U (Saisie) O (Ultra) · Manettes Bluetooth compatibles.')),
          h('div.opt-group', null, h('div.opt-head', null, '⚔️ Combat'),
            h('div.opt-line', null, h('span', null, 'Manches gagnantes'), chips([{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }], s.rounds, (v) => { s.rounds = v; save(); })),
            h('div.opt-line', null, h('span', null, 'Durée d\'une manche'), chips([{ label: '60 s', value: 60 }, { label: '99 s', value: 99 }, { label: '∞', value: 0 }], s.time, (v) => { s.time = v; save(); })),
            h('div.opt-line', null, h('span', null, 'Difficulté par défaut'), chips(DIFF, s.defaultDifficulty, (v) => { s.defaultDifficulty = v; save(); })),
            toggle('Chiffres de dégâts', 'damageNumbers'),
            toggle('Tremblements d\'écran', 'shake')),
          h('div.opt-group', null, h('div.opt-head', null, '🖥 Affichage'),
            h('div.opt-line', null, h('span', null, 'Qualité graphique'), chips([{ label: 'Auto', value: 'auto' }, { label: 'Basse', value: 'low' }, { label: 'Moyenne', value: 'medium' }, { label: 'Haute', value: 'high' }], s.quality, (v) => { s.quality = v; save(); if (C.resize) C.resize(); }))),
          h('div.res-btns', null,
            btn('Réinitialiser les options', () => { C.Store.resetSettings(); C.Audio.applyVolumes(); UI.refresh(); }, 'small'),
            btn('Crédits', () => UI.go('credits'), 'small'))));
    }
  };

  SC.credits = {
    music: 'story',
    render(p) {
      return h('div', null, topbar(p.epilogue ? 'Épilogue' : 'Crédits', () => (p.epilogue ? C.Game.quit('story') : UI.back())),
        h('div.center-panel.wide.credits', null,
          p.epilogue ? h('div.res-title.win', null, 'FÉLICITATIONS !') : null,
          p.epilogue ? h('p', null, 'Vous avez vaincu Oméga et refermé la Faille des Mondes. Oméga est désormais jouable ! Essayez l\'Arcade en Légendaire, la Survie, et collectionnez tous les costumes.') : null,
          h('div.logo.small', null, h('div.logo-top', null, 'CHOC DES'), h('div.logo-main', null, 'LEGENDES')),
          h('p', null, 'Un jeu de combat 2D en HTML5 pour Android.'),
          h('p', null, 'Tous les personnages, arènes, musiques et effets sont des créations originales générées par le code, inspirées des grands archétypes de la fiction : guerriers à aura, magiciens, chevaliers, ninjas, samouraïs, chevaliers stellaires et créatures légendaires.'),
          h('p', null, 'Polices : Bangers et Russo One (SIL Open Font License).'),
          btn(p.epilogue ? '📖 Retour à l\'Histoire' : 'Retour', () => (p.epilogue ? C.Game.quit('story') : UI.back()), 'primary')));
    }
  };

  UI.tickPreviews = tickPreviews;
  UI.h = h;
  C.UI = UI;
})(window.CDL = window.CDL || {});
