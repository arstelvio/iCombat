/* Choc des Légendes — coups normaux, techniques spéciales, supers et ultimes */
(function (C) {
  'use strict';
  const U = C.U, FX = C.FX;
  const Proj = () => C.Proj;
  const play = (s) => C.Audio.play(s);

  function hit(o) {
    return Object.assign({ dmg: 40, stun: 16, bstun: 12, kb: [5, 0], level: 'mid', hitstop: 7, spark: 'hit', sfx: 'hit_light', juggle: 1 }, o);
  }
  function spawnPoint(f, joint) {
    if (joint === 'hands') { const a = f.jointWorld('hand1'), b = f.jointWorld('hand2'); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
    if (joint === 'tip') return f.weaponTipWorld();
    if (joint === 'mouth') { const h = f.jointWorld('head'); return [h[0] + f.facing * f.dims.head * 1.8 * f.size, h[1] + f.dims.head * 0.4 * f.size]; }
    if (joint === 'chest') { return [f.x + f.facing * 30 * f.size, f.y - f.hover() - f.dims.height * f.size * 0.6]; }
    return f.jointWorld(joint || 'hand1');
  }
  function auraOf(f) { return f.awakened > 0 && f.ch.awakenAura ? f.ch.awakenAura : f.ch.aura; }

  // ============================================================ COUPS NORMAUX
  const NORMALS = {
    martial: () => ({
      L1: { name: 'Direct', kind: 'normal', anim: [['jab_r', 3], ['jab', 2], ['jab', 3], ['idle', 7]], whiffSfx: 'whoosh',
        hits: [hit({ f0: 4, f1: 7, box: [15, -150, 80, 48], dmg: 30, stun: 15, bstun: 11, kb: [3, 0] })],
        cancel: { from: 4, to: 14, on: 'contact', into: ['L2', 'DL', 'special', 'super'] } },
      L2: { name: 'Crochet', kind: 'normal', anim: [['jab_r', 2], ['cross', 3], ['cross', 3], ['idle', 9]], whiffSfx: 'whoosh',
        hits: [hit({ f0: 4, f1: 8, box: [15, -150, 88, 48], dmg: 34, stun: 17, bstun: 12, kb: [3, 0] })],
        cancel: { from: 4, to: 16, on: 'contact', into: ['L3', 'H', 'special', 'super'] } },
      L3: { name: 'Coup de pied', kind: 'normal', anim: [['kick_r', 5], ['kick', 3], ['kick', 4], ['idle', 12]], whiffSfx: 'whoosh_heavy',
        hits: [hit({ f0: 6, f1: 10, box: [20, -130, 105, 50], dmg: 48, stun: 20, bstun: 14, kb: [9, 0], sfx: 'hit_heavy', hitstop: 9 })],
        cancel: { from: 6, to: 22, on: 'contact', into: ['special', 'super'] } },
      H: { name: 'Coup de pied retourné', kind: 'normal', anim: [['hkick_r', 9], ['hkick', 3], ['hkick', 4], ['idle', 16]], whiffSfx: 'whoosh_heavy',
        hits: [hit({ f0: 10, f1: 14, box: [20, -195, 112, 70], dmg: 80, stun: 22, bstun: 16, kb: [12, 0], sfx: 'hit_heavy', hitstop: 11, spark: 'big' })],
        cancel: { from: 10, to: 30, on: 'hit', into: ['special', 'super'] } },
      UH: { name: 'Lanceur', kind: 'normal', anim: [['upper_r', 7], ['upper', 4], ['upper', 6], ['idle', 14]], whiffSfx: 'whoosh_heavy', vel: [[7, 3, null]],
        hits: [hit({ f0: 7, f1: 12, box: [0, -235, 78, 140], dmg: 60, stun: 24, kb: [3, -17], launch: true, juggle: 0, sfx: 'hit_heavy', hitstop: 10 })],
        jumpCancel: 12, cancel: { from: 8, to: 28, on: 'hit', into: ['special', 'super'] } },
      DL: { name: 'Coup bas', kind: 'normal', low: true, anim: [['lowkick', 4], ['lowkick', 4], ['crouch', 8]], whiffSfx: 'whoosh',
        hits: [hit({ f0: 4, f1: 8, box: [18, -55, 100, 45], dmg: 25, stun: 15, bstun: 11, kb: [3, 0], level: 'low' })],
        cancel: { from: 4, to: 14, on: 'contact', into: ['DL', 'L1', 'special', 'super'] } },
      DH: { name: 'Balayette', kind: 'normal', low: true, anim: [['crouch', 6], ['sweep', 4], ['sweep', 6], ['crouch', 14]], whiffSfx: 'whoosh_heavy',
        hits: [hit({ f0: 8, f1: 13, box: [10, -42, 138, 42], dmg: 55, stun: 20, kb: [5, -7], kd: true, launch: true, level: 'low', sfx: 'hit_heavy', hitstop: 9 })] },
      AL: { name: 'Coup de pied sauté', kind: 'normal', air: 'only', anim: [['air_kick', 4], ['air_kick', 10], ['fall', 8]], whiffSfx: 'whoosh',
        hits: [hit({ f0: 4, f1: 14, box: [10, -120, 88, 70], dmg: 36, stun: 17, kb: [5, 0], level: 'overhead' })],
        cancel: { from: 5, to: 20, on: 'contact', into: ['AH', 'special', 'super'] } },
      AH: { name: 'Marteau aérien', kind: 'normal', air: 'only', anim: [['air_heavy_r', 7], ['air_heavy', 4], ['air_heavy', 8], ['fall', 8]], whiffSfx: 'whoosh_heavy',
        hits: [hit({ f0: 8, f1: 15, box: [0, -100, 92, 100], dmg: 60, stun: 20, kb: [7, 10], level: 'overhead', sfx: 'hit_heavy', hitstop: 10, spike: true })],
        cancel: { from: 9, to: 24, on: 'hit', into: ['special', 'super'] } }
    }),
    blade: () => ({
      L1: { name: 'Estoc', kind: 'normal', anim: [['b_poke_r', 4], ['b_poke', 2], ['b_poke', 4], ['idle', 8]], whiffSfx: 'slash',
        hits: [hit({ f0: 5, f1: 9, box: [20, -150, 125, 40], dmg: 32, stun: 15, bstun: 11, kb: [4, 0], sfx: 'hit_slash', spark: 'slash' })],
        cancel: { from: 5, to: 16, on: 'contact', into: ['L2', 'DL', 'special', 'super'] } },
      L2: { name: 'Taille', kind: 'normal', anim: [['b_side_r', 4], ['b_side', 3], ['b_side', 3], ['idle', 10]], whiffSfx: 'slash',
        hits: [hit({ f0: 5, f1: 9, box: [10, -190, 128, 115], dmg: 36, stun: 17, bstun: 12, kb: [4, 0], sfx: 'hit_slash', spark: 'slash' })],
        cancel: { from: 5, to: 18, on: 'contact', into: ['L3', 'H', 'special', 'super'] } },
      L3: { name: 'Fendoir', kind: 'normal', anim: [['b_over_r', 7], ['b_over', 3], ['b_over', 4], ['idle', 13]], whiffSfx: 'slash',
        hits: [hit({ f0: 8, f1: 13, box: [15, -215, 135, 175], dmg: 52, stun: 20, bstun: 14, kb: [9, 0], sfx: 'hit_slash', spark: 'slash', hitstop: 9 })],
        cancel: { from: 8, to: 24, on: 'contact', into: ['special', 'super'] } },
      H: { name: 'Taille puissante', kind: 'normal', anim: [['b_over_r', 10], ['b_over', 3], ['b_over', 6], ['idle', 16]], whiffSfx: 'whoosh_heavy', vel: [[10, 8, null]],
        hits: [hit({ f0: 11, f1: 16, box: [20, -215, 150, 185], dmg: 84, stun: 22, bstun: 16, kb: [13, 0], sfx: 'hit_slash', spark: 'slashbig', hitstop: 12 })],
        cancel: { from: 11, to: 32, on: 'hit', into: ['special', 'super'] } },
      UH: { name: 'Taille montante', kind: 'normal', anim: [['b_up_r', 7], ['b_upslash', 4], ['b_upslash', 6], ['idle', 14]], whiffSfx: 'slash',
        hits: [hit({ f0: 8, f1: 13, box: [0, -255, 120, 210], dmg: 62, stun: 24, kb: [3, -17], launch: true, juggle: 0, sfx: 'hit_slash', spark: 'slash', hitstop: 10 })],
        jumpCancel: 13, cancel: { from: 9, to: 28, on: 'hit', into: ['special', 'super'] } },
      DL: { name: 'Estoc bas', kind: 'normal', low: true, anim: [['b_low', 4], ['b_low', 4], ['crouch', 9]], whiffSfx: 'slash',
        hits: [hit({ f0: 4, f1: 8, box: [20, -60, 135, 42], dmg: 27, stun: 15, bstun: 11, kb: [4, 0], level: 'low', sfx: 'hit_slash', spark: 'slash' })],
        cancel: { from: 4, to: 15, on: 'contact', into: ['DL', 'L1', 'special', 'super'] } },
      DH: { name: 'Fauchage', kind: 'normal', low: true, anim: [['b_sweep_r', 7], ['b_sweep', 4], ['b_sweep', 6], ['crouch', 15]], whiffSfx: 'slash',
        hits: [hit({ f0: 9, f1: 14, box: [10, -48, 160, 46], dmg: 58, stun: 20, kb: [5, -7], kd: true, launch: true, level: 'low', sfx: 'hit_slash', spark: 'slash', hitstop: 9 })] },
      AL: { name: 'Taille aérienne', kind: 'normal', air: 'only', anim: [['b_air_r', 4], ['b_air', 3], ['b_air', 8], ['fall', 8]], whiffSfx: 'slash',
        hits: [hit({ f0: 5, f1: 14, box: [0, -150, 122, 115], dmg: 36, stun: 17, kb: [5, 0], level: 'overhead', sfx: 'hit_slash', spark: 'slash' })],
        cancel: { from: 6, to: 20, on: 'contact', into: ['AH', 'special', 'super'] } },
      AH: { name: 'Plongée tranchante', kind: 'normal', air: 'only', anim: [['b_air_r', 7], ['b_air_down', 4], ['b_air_down', 8], ['fall', 8]], whiffSfx: 'whoosh_heavy',
        hits: [hit({ f0: 8, f1: 15, box: [0, -110, 112, 125], dmg: 62, stun: 20, kb: [7, 10], level: 'overhead', sfx: 'hit_slash', spark: 'slashbig', hitstop: 10, spike: true })],
        cancel: { from: 9, to: 24, on: 'hit', into: ['special', 'super'] } }
    })
  };
  const COMMON = () => ({
    GRAB: { name: 'Saisie', kind: 'grab', anim: [['grab', 3], ['grab', 5], ['idle', 16]], grab: { f0: 2, f1: 7, range: 88 }, whiffSfx: 'grab' },
    THROW: { name: 'Projection', kind: 'throw', anim: [['grab', 8], ['toss', 8], ['toss', 10], ['idle', 10]], throwAt: 14, throwHit: hit({ dmg: 95, kb: [11, -9], kd: true, launch: true, hitstop: 10, sfx: 'hit_heavy', unblockable: true }) }
  });

  function scaleMove(m, k) {
    if (!m || k === 1) return m;
    const r = (v) => Math.max(1, Math.round(v * k));
    if (m.anim) m.anim = m.anim.map((a) => [a[0], r(a[1]), a[2]]);
    if (m.hits) m.hits.forEach((h) => { h.f0 = Math.round(h.f0 * k); h.f1 = Math.max(h.f0 + 1, Math.round(h.f1 * k)); });
    if (m.cancel) { m.cancel.from = Math.round(m.cancel.from * k); m.cancel.to = Math.round(m.cancel.to * k); }
    if (m.vel) m.vel = m.vel.map((v) => [Math.round(v[0] * k), v[1], v[2], v[3] != null ? Math.round(v[3] * k) : undefined]);
    if (m.jumpCancel) m.jumpCancel = Math.round(m.jumpCancel * k);
    return m;
  }
  function tune(m, o) {
    if (!m) return m;
    if (o.dmg) m.hits && m.hits.forEach((h) => { h.dmg = Math.round(h.dmg * o.dmg); });
    if (o.reach) m.hits && m.hits.forEach((h) => { h.box = [h.box[0], h.box[1], Math.round(h.box[2] * o.reach), h.box[3]]; });
    if (o.y) m.hits && m.hits.forEach((h) => { h.box = [h.box[0], h.box[1] + o.y, h.box[2], h.box[3]]; });
    return m;
  }

  // ============================================================ ARCHÉTYPES DE TECHNIQUES
  function fireProj(f, b, o, i, n) {
    const p = spawnPoint(f, o.joint || 'hand1');
    let vx = o.speed * f.facing, vy = o.vy || 0;
    if (!f.onGround && o.airAngle != null) { vx = Math.cos(o.airAngle) * o.speed * f.facing; vy = Math.sin(o.airAngle) * o.speed; }
    if (o.spread && n > 1) vy += (i - (n - 1) / 2) * o.spread;
    if (o.randomY) vy += U.rand(-o.randomY, o.randomY);
    const color = o.fixedColor || (f.awakened > 0 && f.ch.awakenAura && !o.noAwake ? f.ch.awakenAura : (o.color || f.ch.aura));
    const scale = (o.scale || 1) * (f.awakened > 0 && !o.noAwake ? 1.25 : 1);
    const pr = new (Proj().Projectile)(b, f, {
      kind: o.vis || 'ki', x: p[0] + f.facing * (o.ox || 8), y: o.groundY != null ? o.groundY : p[1] + (o.oy || 0), vx, vy,
      r: o.r || 16, w: o.w, h: o.h, life: o.life || 120, hits: o.hits || 1, interval: o.interval || 8,
      grav: o.grav || 0, ground: o.ground, homing: o.homing, wave: o.wave, explode: o.explode, pierce: o.pierce, trail: o.trail,
      boomerang: o.boomerang ? { dist: o.boomerang, speed: o.speed * 1.15, x0: p[0] } : null,
      color, scale, strength: o.strength,
      hit: Object.assign({ dmg: o.dmg || 50, stun: o.stun || 18, bstun: o.bstun || 14, kb: o.kb || [6, 0], level: o.level || 'mid', sfx: o.hitSfx || 'hit_light', hitstop: o.hitstop || 6, kd: o.kd, launch: o.launch, chip: o.chip != null ? o.chip : 0.15, grd: o.grd, spark: o.spark, stunExtra: o.stunExtra }, o.hitExtra)
    });
    if (f.move && (f.move.kind === 'super' || f.move.kind === 'ultimate')) pr.fromSuper = true;
    b.addEntity(pr);
    if (o.boomerang) f.weaponAway = true;
    if (o.muzzle) FX.glow(p[0], p[1], 50, color, 8);
    return pr;
  }

  function projectile(o) {
    const st = o.startup || 12, rec = o.recovery || 20, n = o.count || 1, every = o.every || 0;
    const ready = o.ready || 'cast_r', pose = o.pose || 'cast';
    const extra = (n - 1) * every;
    const def = {
      name: o.name, kind: o.kind || 'special', air: o.air || false, cost: o.cost || 0, cine: o.cine,
      // le bras atteint la pose de tir pile au moment où le projectile part
      anim: o.anim || [[ready, Math.max(1, st - 3)], [pose, 3], [pose, Math.max(1, rec - 9 + extra)], ['idle', 6]],
      frames: st + rec + extra,
      sfx: [], spawn: [],
      glow: o.glowWeapon, aura: o.aura, recover: o.recover,
      noGrav: o.air ? [0, st + 8 + extra] : null,
      ai: o.ai || { role: 'zone', min: 220, max: 2000 },
      cancel: o.cancel || null,
      invuln: o.invuln, showWeapon: o.showWeapon, needWeapon: o.boomerang ? true : undefined,
      // Règle classique : un seul projectile (technique spéciale) à l'écran par combattant
      cond: (o.kind || 'special') === 'special' ? (f, b) => !b.entities.some((e) => e.isProjectile && e.owner === f && !e.dead && !e.fromSuper) : undefined
    };
    for (let i = 0; i < n; i++) {
      def.sfx.push([st + i * every, o.sfx || 'ki']);
      def.spawn.push({ f: st + i * every, fn: (f, b) => fireProj(f, b, o, i, n) });
    }
    if (o.chargeFx) def.onFrame = (f, b, fr) => { if (fr < st && fr % 2 === 0) { const p = spawnPoint(f, o.joint || 'hand1'); FX.glow(p[0], p[1], 30 + fr * 2, auraOf(f), 4); } };
    return def;
  }

  function dashStrike(o) {
    const st = o.startup || 8, dash = o.dash || 14, rec = o.recovery || 18;
    const def = {
      name: o.name, kind: o.kind || 'special', air: o.air || false, cost: o.cost || 0, cine: o.cine,
      anim: o.anim || [[o.ready || 'dash', st], [o.pose || 'dash_punch', 3], [o.pose || 'dash_punch', dash - 3], ['idle', rec]],
      frames: st + dash + rec,
      vel: [[st, o.speed || 15, o.vy != null ? o.vy : null, st + dash - 1], [st + dash, 1, null]],
      hits: [hit({ f0: st, f1: st + dash, box: o.box || [0, -175, 95, 125], dmg: o.dmg || 70, stun: o.stun || 22, bstun: 14, kb: o.kb || [10, -4], launch: o.launch, kd: o.kd, multi: o.multi, hitstop: o.hitstop || 9, sfx: o.hitSfx || 'hit_heavy', spark: o.spark, juggle: 1 })],
      armor: o.armor ? [st - 4, st + dash, o.armor] : null,
      invuln: o.invuln, projInvuln: o.projInvuln, through: o.through ? [st, st + dash] : null,
      sfx: [[st, o.sfx || 'dash']], aura: o.aura, showWeapon: o.showWeapon,
      slide: 0.9, noGrav: o.air ? [st, st + dash] : null,
      onHit: o.multi ? null : (f) => { f.vx *= 0.25; },
      onFrame: (f, b, fr) => {
        if (fr >= st && fr < st + dash && fr % 2 === 0) {
          b.addEntity(new Afterimage(f, 0.45, o.trailColor || auraOf(f)));
          if (f.onGround) FX.dust(f.x, 0, f.facing, 1);
        }
        if (o.onFrame) o.onFrame(f, b, fr);
      },
      cancel: { from: st, to: st + dash + rec, on: 'hit', into: ['super'] },
      ai: o.ai || { role: 'approach', min: 130, max: 520 }
    };
    if (o.air) def.air = true;
    return def;
  }

  function rising(o) {
    const st = o.startup || 4, act = o.active || 14;
    return {
      name: o.name, kind: 'special', air: true, cost: o.cost || 0,
      anim: o.anim || [[o.ready || 'upper_r', st], [o.pose || 'rise', 6], [o.pose || 'rise', act], ['fall', 12]],
      frames: st + 6 + act + 12,
      vel: [[st, o.vx != null ? o.vx : 3, -(o.vy || 17)]],
      hits: [hit({ f0: st, f1: st + act, box: o.box || [-10, -235, 95, 205], dmg: o.dmg || 85, stun: 22, kb: o.kb || [4, -15], launch: true, kd: true, multi: o.multi, hitstop: o.hitstop || 10, sfx: o.hitSfx || 'hit_heavy', spark: o.spark, juggle: 0 })],
      invuln: [0, st + (o.invulnExtra != null ? o.invulnExtra : 5)],
      landEnd: true, landLag: o.landLag || 10,
      sfx: [[st, o.sfx || 'whoosh_heavy']], aura: o.aura, showWeapon: o.showWeapon,
      onFrame: (f, b, fr) => {
        if (fr >= st && fr < st + act && fr % 2 === 0) {
          if (o.trail) b.addEntity(new Afterimage(f, 0.4, o.trailColor || auraOf(f)));
          if (o.fx) o.fx(f, b, fr);
        }
      },
      ai: { role: 'anti', min: 0, max: 170 }
    };
  }

  function counter(o) {
    const w = o.window || 22;
    return {
      name: o.name, kind: 'special', air: false,
      anim: [[o.pose || 'block', 3], [o.pose || 'block', w], ['idle', 14]],
      frames: 3 + w + 14,
      counter: [2, 3 + w], counterProj: !!o.proj,
      onCounter: o.onCounter || ((f, a, b) => {
        a.state = 'stun'; a.st = 0; a.stunTime = 26; a.move = null; a.vx = 0; a.stunPose = 'stunned';
        f.startMove(f.moves._CS);
      }),
      onFrame: (f, b, fr) => {
        if (fr >= 2 && fr < 3 + w && fr % 3 === 0) {
          const p = f.jointWorld('hand1');
          FX.glow(p[0], p[1], 60, o.color || f.ch.aura, 5);
        }
      },
      ai: { role: 'counter', min: 0, max: 210 }
    };
  }
  function counterStrike(o) {
    return {
      name: o.name, kind: 'special', anim: o.anim || [['jab_r', 3], [o.pose || 'dash_punch', 3], [o.pose || 'dash_punch', 6], ['idle', 12]],
      frames: 24, invuln: [0, 10],
      onStart: (f, b) => {
        play('parry');
        if (o.teleport) {
          const a = f.opp;
          f.x = U.clamp(a.x - a.facing * 75, b.stage.left + 40, b.stage.right - 40);
          f.faceOpponent();
          FX.smoke(f.x, -80, 40, '#444', 25);
          play('teleport');
        }
      },
      hits: [hit({ f0: 3, f1: 9, box: [-20, -210, 150, 210], dmg: o.dmg || 80, stun: 22, kb: [10, -9], kd: true, launch: true, hitstop: 12, sfx: o.sfx || 'hit_heavy', spark: o.spark || 'big' })],
      showWeapon: true
    };
  }

  function reflector(o) {
    const w = o.window || 24;
    return {
      name: o.name, kind: 'special', air: !!o.air,
      anim: [[o.pose || 'cast', 3], [o.pose || 'cast', w], ['idle', 12]],
      frames: 3 + w + 12,
      reflect: [2, 3 + w],
      noGrav: o.air ? [0, w] : null,
      hits: o.push ? [hit({ f0: 4, f1: 9, box: [0, -200, 125, 200], dmg: o.push, stun: 22, kb: [16, -6], launch: true, kd: true, hitstop: 8, sfx: 'hit_heavy' })] : null,
      sfx: [[2, o.sfx || 'shield']],
      onFrame: (f, b, fr) => {
        if (fr >= 2 && fr < 3 + w) f.shieldFx = { color: o.color || f.ch.aura, style: o.style || 'sphere', t: fr };
        else f.shieldFx = null;
      },
      onEnd: (f) => { f.shieldFx = null; },
      ai: { role: 'reflect', min: 0, max: 9999 }
    };
  }

  function teleport(o) {
    const gap = o.gap || 10;
    const total = 6 + gap + (o.after || 14);
    return {
      name: o.name, kind: 'special', air: true,
      anim: [[o.pose || 'cast_up', 5], [o.pose || 'cast_up', gap + 1], [o.endPose || 'fall', o.after || 14]],
      frames: total,
      invuln: [3, 6 + gap + 3],
      noGrav: [0, 6 + gap + 2],
      onFrame: (f, b, fr) => {
        if (fr === 4) {
          f.hidden = true; f.vx = 0; f.vy = 0;
          FX.glow(f.x, f.y - 90, 160, o.color || f.ch.aura, 12);
          FX.energyBurst(f.x, f.y - 90, o.color || f.ch.aura, 10, 6);
          play(o.sfx || 'teleport');
        }
        if (fr === 5 + gap) {
          const a = f.opp, st = b.stage;
          let x = f.x, y = f.y;
          const dirToOpp = a.x > f.x ? 1 : -1;
          const mode = o.where === 'auto' ? (f.inp.u ? 'up' : f.inp.d ? 'down' : 'behind') : o.where;
          if (mode === 'behind') { x = a.x + dirToOpp * 85; y = Math.min(0, a.y); }
          else if (mode === 'forward') { x = f.x + dirToOpp * 300; }
          else if (mode === 'up') { x = f.x + (f.holdFwd() ? 1 : f.holdBack() ? -1 : 0) * 140 * f.facing; y = Math.min(f.y - 240, -200); }
          else if (mode === 'down') { y = 0; x = f.x + dirToOpp * 120; }
          else if (mode === 'above') { x = a.x - dirToOpp * 20; y = -260; }
          f.x = U.clamp(x, st.left + 40, st.right - 40); f.y = Math.min(0, y);
          f.onGround = f.y >= 0;
          f.hidden = false;
          f.faceOpponent();
          FX.glow(f.x, f.y - 90, 160, o.color || f.ch.aura, 12);
          FX.energyBurst(f.x, f.y - 90, o.color || f.ch.aura, 10, 6);
        }
      },
      hits: o.strike ? [hit(Object.assign({ f0: 6 + gap, f1: 6 + gap + 6, box: [-20, -200, 130, 200], dmg: 60, stun: 20, kb: [9, -6], launch: true, hitstop: 9, sfx: 'hit_heavy' }, o.strike))] : null,
      ai: { role: o.aiRole || 'mobility', min: 200, max: 9999 }
    };
  }

  function stream(o) {
    const st = o.startup || 10, dur = o.dur || 36, rec = o.recovery || 16;
    return {
      name: o.name, kind: o.kind || 'special', air: o.air || false, cost: o.cost || 0, cine: o.cine,
      anim: o.anim || [[o.ready || 'cast1_r', st], [o.pose || 'cast1', dur], ['idle', rec]],
      frames: st + dur + rec,
      noGrav: o.air ? [0, st + dur] : null,
      sfx: [[st, o.sfx || 'fire']],
      invuln: o.invuln,
      spawn: [{ f: st, fn: (f, b) => {
        b.addEntity(new (Proj().Beam)(b, f, {
          joint: o.joint || 'hand1', dy: o.dy || 0, len: o.len || 300, grow: o.grow || 40, width: o.width || 46,
          life: dur, interval: o.interval || 5, style: o.style || 'fire', color: o.color || f.ch.aura, color2: o.color2 || '#ffffff', angle: o.angle || 0,
          hit: Object.assign({ dmg: o.dmg || 9, stun: 14, bstun: 10, kb: [3, 0], hitstop: 2, sfx: o.hitSfx || 'hit_light', chip: 0.3, juggle: 0 }, o.hit),
          finalHit: o.finalHit
        }));
      } }],
      onFrame: (f, b, fr) => {
        if (fr >= st && fr < st + dur && fr % 9 === 0) play(o.sfx || 'fire');
        if (o.onFrame) o.onFrame(f, b, fr);
      },
      aura: o.aura, glow: o.glowWeapon,
      ai: o.ai || { role: 'zone', min: 80, max: (o.len || 300) * 0.9 }
    };
  }

  function chargeMeter(o) {
    return {
      name: o.name || 'Concentration', kind: 'special', anim: [['charge', 8], ['charge', 24]],
      frames: 32, loopWhile: (f) => f.inp.c && f.meter < 300, loopFrom: 8, aura: true,
      onFrame: (f, b, fr) => {
        if (fr >= 8) f.gainMeter(o.rate || 1.4);
        if (fr === 8 || (fr > 8 && b.time % 0.5 < 0.02)) play('charge');
        if (fr > 8 && fr % 6 === 0) FX.lightning(f.x + U.rand(-40, 40), f.y - U.rand(40, 200), f.x + U.rand(-40, 40), f.y - U.rand(20, 160), U.shade(f.ch.aura, 0.4), 2, 4);
      },
      ai: { role: 'charge', min: 450, max: 9999 }
    };
  }

  function transform(o) {
    return {
      name: o.name || 'Éveil Doré', kind: 'super', cost: 100, cine: true,
      anim: [['charge', 20], ['cast_up', 12], ['victory2', 20]],
      frames: 52, invuln: [0, 52], aura: o.color || '#ffd84a',
      cond: (f) => f.awakened <= 0,
      onFrame: (f, b, fr) => {
        if (fr === 22) {
          f.awakened = o.duration || 900;
          play('transform'); b.shake(14);
          FX.glow(f.x, f.y - 100, 420, o.color || '#ffd84a', 24);
          FX.energyBurst(f.x, f.y - 100, o.color || '#ffd84a', 30, 14);
          FX.text(f.x, f.y - 250, 'ÉVEIL !', '#ffd84a', 44, 60);
          b.flash('#fff6c0', 0.6);
        }
      },
      ai: { role: 'buff', min: 300, max: 9999 }
    };
  }

  function groundPound(o) {
    return {
      name: o.name, kind: o.kind || 'special', air: true, cost: o.cost || 0, cine: o.cine,
      anim: o.anim || [['crouch', 6], ['jump', 12], ['air_heavy', 30]],
      frames: 60,
      vel: [[6, o.vx || 4, -(o.up || 14)]],
      onStart: (f) => { if (!f.onGround) f.mf = 17; },
      onFrame: (f, b, fr) => {
        if (fr === 18) { f.vy = 24; f.vx = f.facing * (o.vx || 4) * 0.6; play('whoosh_heavy'); }
        if (fr > 18 && fr % 2 === 0) b.addEntity(new Afterimage(f, 0.35, o.color || f.ch.aura));
      },
      hits: [hit({ f0: 18, f1: 60, box: [-40, -150, 130, 160], dmg: o.dmg || 70, stun: 20, kb: [6, 9], level: 'overhead', hitstop: 10, sfx: 'hit_heavy', spike: true })],
      onLand: (f, b) => {
        if (f.mf < 17) return;
        f.move = null; f.state = 'landing'; f.st = 0; f.landLag = 14; f.vx = 0;
        play('explosion'); b.shake(12);
        FX.dust(f.x, 0, 1, 10, true); FX.dust(f.x, 0, -1, 10, true);
        const sh = o.shock || 60;
        [-1, 1].forEach((d) => b.addEntity(new (Proj().Area)(b, f, { x: f.x + d * 90, y: -40, r: 80, hit: { dmg: sh, kb: [9 * d * f.facing, -8], launch: true, kd: true, level: 'low' }, color: o.color || '#c9bca6', smoke: true })));
        if (o.onImpact) o.onImpact(f, b);
      },
      ai: { role: 'approach', min: 100, max: 350 }
    };
  }

  function pillars(o) {
    const st = o.startup || 16;
    return {
      name: o.name, kind: o.kind || 'special', cost: o.cost || 0, cine: o.cine, air: o.air || false,
      anim: o.anim || [[o.ready || 'cast_up', st], [o.pose || 'cast_up', o.hold || 20], ['idle', o.recovery || 16]],
      frames: st + (o.hold || 20) + (o.recovery || 16),
      invuln: o.invuln, aura: o.aura, glow: o.glowWeapon,
      sfx: [[st, o.sfx || 'magic']],
      spawn: [{ f: st, fn: (f, b) => {
        const a = f.opp;
        const n = o.count || 1;
        for (let i = 0; i < n; i++) {
          let x;
          if (o.from === 'self') x = f.x + f.facing * (o.first || 120 + i * (o.gap || 130));
          else x = a.x + (i - (n - 1) / 2) * (o.gap || 0) + (o.lead ? a.vx * 12 : 0);
          b.addEntity(new (Proj().Pillar)(b, f, { x: U.clamp(x, b.stage.left + 30, b.stage.right - 30), width: o.width || 90, delay: (o.delay || 22) + i * (o.stagger || 0), life: o.life || 26, interval: o.interval || 6,
            hit: Object.assign({ dmg: o.dmg || 14, stun: 16, kb: [2, -6], launch: true, hitstop: 4, chip: 0.25 }, o.hit), color: o.color || f.ch.aura, style: o.style || 'light', sfx: o.impactSfx || 'explosion', unblockable: o.unblockable }));
        }
      } }],
      ai: o.ai || { role: 'zone', min: 200, max: 2000 }
    };
  }

  function rain(o) {
    const st = o.startup || 18, n = o.count || 8, every = o.every || 5;
    const def = {
      name: o.name, kind: o.kind || 'super', cost: o.cost || 100, cine: o.cine !== false,
      anim: [[o.ready || 'cast_up', st], [o.pose || 'cast_up', n * every], ['idle', 16]],
      frames: st + n * every + 16, invuln: [0, st + 4], aura: o.aura || true, glow: true,
      spawn: [],
      ai: { role: 'zone', min: 0, max: 9999 }
    };
    for (let i = 0; i < n; i++) {
      def.spawn.push({ f: st + i * every, fn: (f, b) => {
        const a = f.opp;
        const x = a.x + U.rand(-(o.spread || 160), o.spread || 160) + a.vx * 8;
        const pr = new (Proj().Projectile)(b, f, {
          kind: o.vis || 'star', x: x - (o.slant || 0) * f.facing, y: -900, vx: (o.slant || 0) * f.facing / 50, vy: o.speed || 16, r: o.r || 18,
          life: 140, grav: 0.3, color: o.color || f.ch.aura, scale: o.scale || 1,
          explode: o.explode ? { r: o.explode, hit: { dmg: o.dmg || 30, kb: [5, -7], launch: true, chip: 0.3 }, color: o.color } : null,
          hit: { dmg: o.dmg || 30, stun: 18, kb: [4, -6], launch: true, chip: 0.3, sfx: o.hitSfx || 'hit_heavy' }
        });
        b.addEntity(pr);
        if (i % 2 === 0) play(o.sfx || 'magic');
      } });
    }
    return def;
  }

  // Ultime à verrouillage : une ruée, si elle touche → séquence cinématique
  function rushLock(o) {
    const st = o.startup || 6, dash = o.dash || 18, seq = o.seq || 60, rec = o.recovery || 28;
    const hitsN = o.hits || 8;
    return {
      name: o.name, kind: o.kind || 'ultimate', cost: o.cost || 300, cine: true, air: !!o.air,
      anim: o.anim || [[o.ready || 'dash', st], [o.pose || 'dash_punch', dash], [o.pose || 'dash_punch', seq], ['idle', rec]],
      frames: st + dash + seq + rec,
      invuln: [0, st + dash + seq],
      vel: o.speed ? [[st, o.speed, o.air ? 0 : null, st + dash - 1]] : null,
      noGrav: [0, st + dash + seq],
      showWeapon: true, aura: o.aura || true,
      hits: [hit({ f0: st, f1: st + dash, box: o.box || [-10, -200, 130, 200], dmg: o.firstDmg || 25, stun: 60, kb: [1, 0], lock: true, hitstop: 12, sfx: 'hit_heavy', unblockable: o.unblockable })],
      onFrame: (f, b, fr) => {
        const md = f.md;
        if (fr >= st && fr < st + dash && fr % 2 === 0) b.addEntity(new Afterimage(f, 0.5, o.color || auraOf(f)));
        if (!md.locked && fr === st + dash) { f.mf = st + dash + seq; f.vx = 0; return; }
        if (md.locked) {
          const k = fr - md.lockStart;
          const a = f.opp;
          if (o.hold) o.hold(f, a, b, k);
          if (k > 0 && k < seq - 12 && k % Math.floor((seq - 12) / hitsN) === 0) {
            const per = Math.round((o.totalDmg || 300) * 0.85 / hitsN);
            b.autoHit(f, a, { dmg: per, sfx: o.hitSfx || 'hit_heavy', spark: o.spark || 'big', color: o.color });
            if (o.step) o.step(f, a, b, k);
          }
          if (k === seq - 6) {
            const fin = Math.round((o.totalDmg || 300) * 0.15);
            if (o.finish) o.finish(f, a, b);
            b.release(f, a, hit({ dmg: fin, kb: o.finalKb || [16, -14], launch: true, kd: true, hitstop: 20, sfx: 'ko', unblockable: true }));
            md.locked = false;
          }
        }
      },
      onHit: (f, t, b, h) => {
        if (h.lock && !f.md.locked) {
          b.lock(f, t);
          f.md.locked = true; f.md.lockStart = f.mf;
          f.vx = 0; f.vy = 0;
          f.mf = st + dash;
          f.md.lockStart = st + dash;
          if (o.onLock) o.onLock(f, t, b);
        }
      },
      ai: { role: 'finisher', min: 0, max: o.aiRange || 380 }
    };
  }

  function beamUlt(o) {
    const st = o.startup || 26, dur = o.dur || 70;
    return {
      name: o.name, kind: o.kind || 'ultimate', cost: o.cost || 300, cine: true, air: !!o.air,
      anim: [[o.ready || 'cast_r', st], [o.pose || 'cast', dur], ['idle', 20]],
      frames: st + dur + 20, invuln: [0, st + dur], aura: o.aura || true,
      noGrav: o.air ? [0, st + dur] : null,
      sfx: [[st, 'beam'], [st + 30, 'beam']],
      onFrame: (f, b, fr) => {
        if (fr < st) {
          const p = spawnPoint(f, o.joint || 'hands');
          FX.glow(p[0], p[1], 40 + fr * 3, o.color || auraOf(f), 3);
          if (fr % 3 === 0) FX.energyBurst(p[0], p[1], o.color || auraOf(f), 3, 4);
        }
        if (fr >= st && fr < st + dur) b.shake(4);
      },
      spawn: [{ f: st, fn: (f, b) => {
        b.addEntity(new (Proj().Beam)(b, f, {
          joint: o.joint || 'hands', len: 2400, grow: 90, width: o.width || 110, life: dur, interval: o.interval || 5,
          style: o.style || 'ki', color: o.color || auraOf(f), color2: '#ffffff', angle: o.angle || 0,
          hit: { dmg: Math.round((o.totalDmg || 300) / (dur / (o.interval || 5))), stun: 14, bstun: 12, kb: [4, -1], hitstop: 2, sfx: 'hit_light', chip: 0.3, juggle: 0 },
          finalHit: { dmg: 30, kb: [18, -12], launch: true, kd: true, hitstop: 14, sfx: 'ko', juggle: 0 }
        }));
      } }],
      ai: { role: 'finisher', min: 0, max: 9999 }
    };
  }

  // Image rémanente (traînées de vitesse, clones)
  class Afterimage {
    constructor(f, alpha, tint, life, dx, facing) {
      this.look = f.look; this.pose = Object.assign({}, f.pose);
      this.x = f.x + (dx || 0); this.y = f.y - f.hover(); this.facing = facing || f.facing;
      this.alpha = alpha; this.tint = tint || '#ffffff';
      this.life = this.max = life || 12; this.dead = false; this.awake = f.awakened > 0;
      this.shadow = f.shadowTint;
      this.bg = true;
    }
    hitbox() { return null; }
    update() { if (--this.life <= 0) this.dead = true; }
    draw(ctx, t) {
      ctx.save(); ctx.translate(this.x, this.y);
      C.Rig.draw(ctx, this.look, this.pose, { facing: this.facing, time: t, alpha: this.alpha * (this.life / this.max), flash: 0.55, shadowTint: this.tint, awakened: this.awake });
      ctx.restore();
    }
  }
  C.Afterimage = Afterimage;

  // ============================================================ PERSONNAGES
  const SPECIALS = {
    kairo: () => ({
      N: projectile({ name: 'Boule de Ki', vis: 'ki', startup: 13, recovery: 22, speed: 11, dmg: 58, r: 17, joint: 'hands', ready: 'cast_r', pose: 'cast', air: true, airAngle: 0.6, chargeFx: true , strength: 2}),
      F: dashStrike({ name: 'Ruée Éclair', startup: 9, dash: 14, speed: 16, dmg: 72, kb: [11, -5], launch: true }),
      U: rising({ name: 'Poing Ascendant', dmg: 92, trail: true }),
      D: chargeMeter({ name: 'Concentration de Ki' }),
      S: transform({ name: 'Éveil Doré' }),
      S2: projectile({ name: 'Rafale de Ki', kind: 'super', cost: 100, cine: true, vis: 'ki', count: 8, every: 5, speed: 14, dmg: 26, r: 12, randomY: 2.5, startup: 10, recovery: 18, joint: 'hand1', ready: 'cast1_r', pose: 'cast1', invuln: [0, 12], ai: { role: 'zone', min: 0, max: 9999 } }),
      X: beamUlt({ name: 'Rayon Céleste', totalDmg: 320, width: 115 })
    }),
    zarkan: () => ({
      N: projectile({ name: 'Salve Royale', vis: 'violet', count: 3, every: 6, startup: 10, recovery: 18, speed: 13, dmg: 19, r: 11, joint: 'hand1', ready: 'cast1_r', pose: 'cast1', air: true, airAngle: 0.5 }),
      F: dashStrike({ name: 'Charge du Prince', startup: 10, dash: 15, speed: 15, dmg: 76, armor: 1, ready: 'shoulder', pose: 'shoulder', kb: [13, -4] }),
      U: rising({ name: 'Frappe Météore', dmg: 88, pose: 'dive_kick', vx: 5, trail: true }),
      D: reflector({ name: 'Barrière Royale', style: 'sphere', pose: 'charge', window: 22 }),
      S: transform({ name: 'Éveil Doré' }),
      S2: projectile({ name: 'Tempête Violette', kind: 'super', cost: 100, cine: true, vis: 'violet', count: 10, every: 4, speed: 15, dmg: 22, r: 12, randomY: 3, startup: 10, recovery: 16, joint: 'hand1', ready: 'cast1_r', pose: 'cast1', invuln: [0, 12], ai: { role: 'zone', min: 0, max: 9999 } }),
      X: beamUlt({ name: 'Éclat Final', totalDmg: 330, width: 130, startup: 30, ready: 'cast_up', joint: 'hands' })
    }),
    aldaron: () => ({
      N: projectile({ name: 'Lumière Blanche', vis: 'light', startup: 15, recovery: 20, speed: 9, dmg: 52, r: 17, joint: 'tip', ready: 's_strike_r', pose: 's_cast_low', color: '#f4f8ff', glowWeapon: true, air: true, airAngle: 0.5 , strength: 2}),
      F: dashStrike({ name: 'Coup du Bâton', startup: 11, dash: 9, speed: 13, dmg: 70, ready: 's_strike_r', pose: 's_strike', kb: [14, -3], trailColor: '#ffffff', hitSfx: 'hit_heavy', spark: 'big' }),
      U: rising({ name: 'Éclat Ascendant', dmg: 80, ready: 'crouch', pose: 's_raise', vx: 1, vy: 15, multi: 5, box: [-40, -260, 130, 260], fx: (f) => FX.glow(f.x, f.y - 100, 200, '#ffffff', 6) }),
      D: counter({ name: 'Rempart Arcanique', pose: 's_raise', color: '#ffffff', proj: true,
        onCounter: (f, a, b) => {
          a.state = 'stun'; a.st = 0; a.stunTime = 40; a.move = null; a.vx = -a.facing * 3;
          FX.glow(f.x, f.y - 100, 500, '#ffffff', 20); b.flash('#ffffff', 0.5); play('magic'); play('parry');
          b.autoHit(f, a, { dmg: 60, sfx: 'hit_heavy', spark: 'big', color: '#ffffff' });
        } }),
      S: pillars({ name: 'Feu Sacré', kind: 'super', cost: 100, cine: true, count: 3, from: 'self', first: 140, gap: 150, stagger: 10, delay: 12, ready: 's_raise', pose: 's_slam', style: 'fire', color: '#ff9a3c', dmg: 18, width: 100, invuln: [0, 20], ai: { role: 'zone', min: 0, max: 600 } }),
      X: pillars({ name: 'Colère des Anciens', kind: 'ultimate', cost: 300, cine: true, count: 1, delay: 30, ready: 's_raise', pose: 's_slam', hold: 40, width: 260, life: 50, interval: 5, dmg: 30, color: '#ffffff', style: 'light', invuln: [0, 60], unblockable: false, hit: { chip: 0.35 }, ai: { role: 'finisher', min: 0, max: 9999 } })
    }),
    godefroy: () => ({
      N: projectile({ name: 'Onde Tellurique', vis: 'wave', startup: 16, recovery: 22, speed: 9, dmg: 55, w: 50, h: 70, ground: true, level: 'low', ready: 'b_over_r', pose: 'b_over', sfx: 'explosion', color: '#ffe08a', life: 90, onFire: true, ai: { role: 'zone', min: 250, max: 2000 } }),
      F: dashStrike({ name: 'Charge au Bouclier', startup: 9, dash: 16, speed: 13, dmg: 64, armor: 2, ready: 'b_shield', pose: 'b_shield', kb: [12, -3], hitSfx: 'hit_heavy', trailColor: '#ffe08a' }),
      U: rising({ name: 'Fendoir Ascendant', dmg: 90, ready: 'b_up_r', pose: 'b_upslash', vy: 15, vx: 2, hitSfx: 'hit_slash', spark: 'slashbig' }),
      D: counter({ name: 'Rempart', pose: 'b_shield', color: '#ffe08a', window: 24 }),
      _CS: counterStrike({ name: 'Riposte', pose: 'b_over', anim: [['b_over_r', 3], ['b_over', 3], ['b_over', 6], ['idle', 12]], sfx: 'hit_slash', spark: 'slashbig' }),
      S: rushLock({ name: 'Jugement Royal', kind: 'super', cost: 100, hits: 3, totalDmg: 180, seq: 40, dash: 16, speed: 14, ready: 'b_over_r', pose: 'b_over', spark: 'slashbig', hitSfx: 'hit_slash', color: '#ffe08a',
        step: (f, a, b, k) => { FX.slashArc(a.x, a.y - 100, f.facing, 90, -2.2, 0.8, '#ffe08a', 14, 10); } }),
      X: pillars({ name: 'Croisade Céleste', kind: 'ultimate', cost: 300, cine: true, count: 1, delay: 34, hold: 40, ready: 's_raise', pose: 'b_over', width: 170, life: 40, interval: 4, dmg: 32, color: '#ffe08a', style: 'light', invuln: [0, 60], ai: { role: 'finisher', min: 0, max: 9999 } })
    }),
    kage: () => ({
      N: projectile({ name: 'Shuriken', vis: 'shuriken', startup: 8, recovery: 14, speed: 17, dmg: 30, r: 11, joint: 'hand1', ready: 'cast1_r', pose: 'cast1', air: true, airAngle: 0.65, sfx: 'whoosh', hitSfx: 'hit_slash', trail: false }),
      F: teleport({ name: "Pas de l'Ombre", where: 'behind', gap: 8, pose: 'cast_up', endPose: 'dash_punch', color: '#5a5a7a', strike: { dmg: 55, box: [-10, -190, 110, 190] }, aiRole: 'approach' }),
      U: rising({ name: 'Envol du Corbeau', dmg: 70, pose: 'spin2', ready: 'crouch', multi: 4, vy: 18, trail: true, trailColor: '#ff4a4a', box: [-60, -220, 140, 220] }),
      D: counter({ name: 'Substitution', pose: 'block', color: '#ff4a4a', window: 20,
        onCounter: (f, a, b) => {
          a.state = 'stun'; a.st = 0; a.stunTime = 24; a.move = null; a.vx = 0;
          FX.smoke(f.x, f.y - 80, 50, '#777', 30);
          b.addEntity(new Log(f.x, f.y));
          f.startMove(f.moves._CS);
        } }),
      _CS: counterStrike({ name: 'Frappe Fantôme', teleport: true, dmg: 75, pose: 'dash_punch' }),
      S: projectile({ name: 'Tempête de Kunaï', kind: 'super', cost: 100, cine: true, vis: 'kunai', count: 7, every: 2, spread: 1.4, speed: 18, dmg: 26, r: 12, startup: 10, recovery: 18, ready: 'cast1_r', pose: 'cast1', invuln: [0, 12], hitSfx: 'hit_slash', trail: false, air: true, airAngle: 0.5, ai: { role: 'zone', min: 0, max: 9999 } }),
      X: rushLock({ name: 'Danse des Mille Ombres', hits: 12, totalDmg: 330, seq: 72, dash: 16, speed: 19, color: '#ff4a4a',
        step: (f, a, b, k) => {
          const ang = U.rand(0, Math.PI * 2);
          b.addEntity(new Afterimage(f, 0.8, '#ff4a4a', 10, Math.cos(ang) * 90 + (a.x - f.x), U.choice([-1, 1])));
          FX.slashArc(a.x + U.rand(-30, 30), a.y - 100 + U.rand(-40, 40), U.choice([-1, 1]), 70, -2.4, 0.6, '#ff6a6a', 10, 8);
        },
        hold: (f, a, b, k) => { f.hidden = k > 4 && k < 60; a.y = Math.max(-60, a.y - 1); },
        finish: (f) => { f.hidden = false; } })
    }),
    takeda: () => ({
      N: { name: 'Iaï', kind: 'special', anim: [['b_iai_r', 14], ['b_iai', 3], ['b_iai', 8], ['idle', 12]], frames: 37, whiffSfx: null, sfx: [[14, 'slash']],
        hits: [hit({ f0: 14, f1: 18, box: [20, -175, 210, 90], dmg: 70, stun: 22, kb: [11, 0], hitstop: 12, sfx: 'hit_slash', spark: 'slashbig' })],
        onFrame: (f, b, fr) => { if (fr === 14) FX.slashArc(f.x + f.facing * 120, f.y - 130, f.facing, 110, -0.9, 0.5, '#ffd0e0', 12, 10); },
        cancel: { from: 15, to: 30, on: 'hit', into: ['super'] }, ai: { role: 'poke', min: 120, max: 240 } },
      F: dashStrike({ name: 'Ruée du Rōnin', startup: 10, dash: 12, speed: 18, dmg: 70, ready: 'b_iai_r', pose: 'b_dash', through: true, hitSfx: 'hit_slash', spark: 'slashbig', trailColor: '#ff8fb1' }),
      U: rising({ name: 'Lune Ascendante', dmg: 88, ready: 'b_up_r', pose: 'b_upslash', vy: 16, hitSfx: 'hit_slash', spark: 'slashbig', fx: (f) => FX.slashArc(f.x + f.facing * 30, f.y - 140, f.facing, 90, 1.2, -1.6, '#ffd0e0', 10, 6) }),
      D: counter({ name: 'Posture Zen', pose: 'b_iai_r', color: '#ff8fb1', window: 24 }),
      _CS: counterStrike({ name: 'Contre-Taille', anim: [['b_iai_r', 2], ['b_iai', 3], ['b_iai', 6], ['idle', 12]], dmg: 85, sfx: 'hit_slash', spark: 'slashbig' }),
      S: projectile({ name: 'Lame du Vent', kind: 'super', cost: 100, cine: true, vis: 'crescent', startup: 14, recovery: 20, speed: 16, dmg: 45, hits: 3, interval: 5, r: 50, w: 70, h: 150, ready: 'b_iai_r', pose: 'b_iai', color: '#ffb7d0', sfx: 'slash', hitSfx: 'hit_slash', invuln: [0, 16], strength: 3, ai: { role: 'zone', min: 0, max: 9999 } }),
      X: rushLock({ name: 'Mille Pétales', hits: 6, totalDmg: 340, seq: 80, dash: 12, speed: 22, ready: 'b_iai_r', pose: 'b_iai', color: '#ff8fb1', hitSfx: 'hit_slash', spark: 'slashbig',
        hold: (f, a, b, k) => { if (k % 2 === 0) for (let i = 0; i < 3; i++) FX.petal(a.x + U.rand(-200, 200), a.y - U.rand(0, 300)); if (k === 2) b.flash('#ffffff', 0.7); },
        step: (f, a, b) => FX.slashArc(a.x, a.y - 110, U.choice([-1, 1]), 120, U.rand(-3, -1), U.rand(0, 1), '#ffffff', 8, 8),
        onLock: (f, a, b) => { f.x = a.x + f.facing * 160; } })
    }),
    cassius: () => ({
      N: projectile({ name: 'Tir de Bolter', vis: 'bolt', count: 3, every: 5, startup: 10, recovery: 16, speed: 19, dmg: 20, r: 8, joint: 'hand2', ox: 50, ready: 'cast1_r', pose: 'cast1', sfx: 'bullet', hitSfx: 'hit_light', trail: true, randomY: 0.6, fixedColor: '#ffb347', muzzle: true }),
      F: dashStrike({ name: 'Lame Tronçonneuse', startup: 10, dash: 20, speed: 9, dmg: 16, multi: 4, armor: 1, ready: 'b_poke_r', pose: 'b_poke', sfx: 'chainsaw', hitSfx: 'hit_slash', spark: 'slash', kb: [3, 0], trailColor: '#ff6a2a', box: [10, -170, 130, 100] }),
      U: rising({ name: 'Réacteur Dorsal', dmg: 82, pose: 'b_upslash', ready: 'crouch', vy: 19, trail: true, trailColor: '#ff6a2a', fx: (f) => { const p = f.jointWorld('shoulder'); FX.ember(p[0] - f.facing * 25, p[1] + 30, '#ffb000', U.rand(-1, 1), 6, 10, 14); } }),
      D: projectile({ name: 'Grenade Frag', vis: 'grenade', startup: 12, recovery: 20, speed: 7, vy: -11, grav: 0.55, dmg: 60, r: 9, joint: 'hand1', ready: 'b_over_r', pose: 'b_over', sfx: 'whoosh', explode: { r: 75, hit: { dmg: 65, kb: [8, -9], launch: true, kd: true }, color: '#ff9a3c' }, life: 90, trail: false, fixedColor: '#ff9a3c', ai: { role: 'zone', min: 200, max: 500 } }),
      S: groundPound({ name: 'Assaut du Jump Pack', kind: 'super', cost: 100, cine: true, up: 18, vx: 8, dmg: 80, shock: 70, color: '#ff6a2a' }),
      X: pillars({ name: 'Frappe Orbitale', kind: 'ultimate', cost: 300, cine: true, count: 1, delay: 40, hold: 30, ready: 'taunt', pose: 'point', width: 160, life: 46, interval: 4, dmg: 30, color: '#9fe8ff', style: 'light', invuln: [0, 50], lead: true, ai: { role: 'finisher', min: 0, max: 9999 } })
    }),
    leo: () => ({
      N: projectile({ name: 'Éclair Stupéfiant', vis: 'stun', startup: 10, recovery: 16, speed: 16, dmg: 50, r: 12, joint: 'tip', ready: 'cast1_r', pose: 'cast_low', color: '#ff4040', sfx: 'magic', stunExtra: 10, glowWeapon: true, air: true, airAngle: 0.45, w: 40, h: 24 }),
      F: reflector({ name: 'Bourrasque', style: 'push', pose: 'cast1', window: 14, push: 55, color: '#cfe8ff', sfx: 'whoosh_heavy' }),
      U: rising({ name: 'Balai Volant', dmg: 88, pose: 'jump', vy: 19, vx: 6, trail: true, trailColor: '#cfa36b', multi: 6, invulnExtra: 9 }),
      D: reflector({ name: 'Bouclier Protecteur', style: 'shield', pose: 'cast1', window: 24, color: '#9fd8ff' }),
      S: projectile({ name: 'Esprit Gardien', kind: 'super', cost: 100, cine: true, vis: 'spirit', startup: 16, recovery: 22, speed: 12, dmg: 32, hits: 4, interval: 6, r: 40, w: 160, h: 90, joint: 'tip', ready: 'cast1_r', pose: 'cast1', color: '#bfe6ff', sfx: 'magic', hitSfx: 'hit_heavy', invuln: [0, 18], strength: 5, pierce: true, ai: { role: 'zone', min: 0, max: 9999 } }),
      X: rain({ name: "Pluie d'Étoiles", kind: 'ultimate', cost: 300, count: 14, every: 4, vis: 'star', color: '#ffe680', dmg: 26, explode: 50, spread: 140, ready: 'cast1_r', pose: 'cast_up' })
    }),
    mordrak: () => ({
      N: projectile({ name: 'Sortilège Funeste', vis: 'curse', startup: 14, recovery: 22, speed: 8.5, dmg: 52, r: 17, joint: 'tip', ready: 'cast1_r', pose: 'cast1', color: '#42ff7a', sfx: 'dark', homing: 0.3, glowWeapon: true, air: true, airAngle: 0.45 , strength: 2}),
      F: teleport({ name: 'Ombre Rampante', where: 'forward', gap: 14, after: 18, pose: 'crouch', endPose: 'cast1', color: '#1a1a1a', sfx: 'dark', strike: { dmg: 46, box: [0, -190, 115, 190], sfx: 'hit_heavy' }, aiRole: 'approach' }),
      U: teleport({ name: 'Envol Ténébreux', where: 'up', gap: 10, pose: 'cast_up', color: '#1a1a1a', sfx: 'dark' }),
      D: projectile({ name: 'Serpent Maudit', vis: 'snake', startup: 14, recovery: 20, speed: 6, dmg: 55, w: 70, h: 26, ground: true, level: 'low', life: 150, ready: 'crouch', pose: 'cast_down', color: '#42ff7a', sfx: 'dark', trail: false, ai: { role: 'zone', min: 200, max: 900 } }),
      S: stream({ name: 'Feu Démoniaque', kind: 'super', cost: 100, cine: true, style: 'fire', len: 480, width: 80, dur: 50, dmg: 11, interval: 4, color: '#42ff7a', joint: 'tip', invuln: [0, 14], ai: { role: 'zone', min: 0, max: 450 } }),
      X: pillars({ name: 'Éclipse Maudite', kind: 'ultimate', cost: 300, cine: true, count: 5, gap: 90, stagger: 6, delay: 30, hold: 50, ready: 'cast1_r', pose: 'cast_up', width: 80, life: 30, interval: 5, dmg: 16, color: '#42ff7a', style: 'lightning', invuln: [0, 60], ai: { role: 'finisher', min: 0, max: 9999 } })
    }),
    kael: () => ({
      N: projectile({ name: 'Lancer de Sabre', vis: 'saber', startup: 12, recovery: 24, speed: 13, dmg: 31, hits: 2, interval: 10, r: 30, w: 90, h: 60, boomerang: 360, joint: 'hand1', ready: 'b_side_r', pose: 'cast1', color: '#3fa9ff', sfx: 'saber', hitSfx: 'saber_hit', life: 160, trail: false, ai: { role: 'zone', min: 200, max: 700 } }),
      F: dashStrike({ name: 'Ruée Astrale', startup: 8, dash: 13, speed: 17, dmg: 66, ready: 'b_side_r', pose: 'b_side', hitSfx: 'saber_hit', spark: 'slashbig', sfx: 'saber', trailColor: '#3fa9ff' }),
      U: rising({ name: 'Bond Astral', dmg: 84, ready: 'crouch', pose: 'flip2', vy: 19, vx: 4, hitSfx: 'saber_hit', spark: 'slash', trail: true, trailColor: '#3fa9ff', multi: 6, box: [-50, -230, 150, 230] }),
      D: reflector({ name: 'Poussée Psychique', style: 'push', pose: 'cast1', window: 16, push: 35, color: '#9fd8ff', sfx: 'psy' }),
      S: { name: 'Onde du Flux', kind: 'super', cost: 100, cine: true, anim: [['cast1_r', 14], ['cast', 20], ['idle', 16]], frames: 50, invuln: [0, 20], reflect: [10, 34], sfx: [[14, 'psy']],
        spawn: [{ f: 14, fn: (f, b) => fireProj(f, b, { vis: 'wave', speed: 14, dmg: 70, w: 70, h: 220, color: '#9fd8ff', hits: 2, interval: 8, kb: [16, -8], launch: true, kd: true, joint: 'hands', groundY: -110, life: 80, strength: 5, trail: false, hitSfx: 'hit_heavy' }, 0, 1) }],
        ai: { role: 'zone', min: 0, max: 9999 } },
      X: rushLock({ name: 'Harmonie Astrale', hits: 10, totalDmg: 320, seq: 64, dash: 14, speed: 18, ready: 'b_side_r', pose: 'b_side', color: '#3fa9ff', hitSfx: 'saber_hit', spark: 'slashbig',
        step: (f, a, b, k) => {
          const side = (k / 6) % 2 < 1 ? 1 : -1;
          f.x = a.x - side * 90; f.facing = side; f.y = -U.rand(0, 60);
          FX.slashArc(a.x, a.y - 110, side, 85, -2.0, 1.0, '#3fa9ff', 12, 8);
        },
        finish: (f, a) => { f.y = 0; f.facing = a.x > f.x ? 1 : -1; } })
    }),
    noctis: () => ({
      N: projectile({ name: 'Lancer de Sabre', vis: 'saber', startup: 13, recovery: 20, speed: 13, dmg: 32, hits: 2, interval: 10, r: 30, w: 90, h: 60, boomerang: 340, joint: 'hand1', ready: 'b_side_r', pose: 'cast1', color: '#ff2323', sfx: 'saber', hitSfx: 'saber_hit', life: 170, trail: false, ai: { role: 'zone', min: 200, max: 700 } }),
      F: {
        name: 'Étreinte Psychique', kind: 'special', anim: [['point', 12], ['choke', 46], ['toss', 10], ['idle', 12]], frames: 80,
        onFrame: (f, b, fr) => {
          const a = f.opp, md = f.md;
          if (fr === 12) {
            const d = (a.x - f.x) * f.facing;
            if (d > 0 && d < 340 && a.onGround && !a.invulnerable() && a.state !== 'ko') {
              b.lock(f, a); md.locked = true; play('dark');
              FX.text(a.x, a.y - 230, 'ÉTREINTE !', '#ff4040', 30, 40);
            } else { f.mf = 66; return; }
          }
          if (md.locked) {
            a.y = U.lerp(a.y, -90, 0.08); a.x = U.lerp(a.x, f.x + f.facing * 220, 0.05);
            if (fr % 3 === 0) { const h = a.jointWorld('neck'); FX.lightning(h[0] - 14, h[1], h[0] + 14, h[1] + 4, '#ff6060', 1.5, 4); }
            if (fr > 14 && fr < 56 && fr % 10 === 0) b.autoHit(f, a, { dmg: 16, sfx: 'hit_light', spark: 'small', color: '#ff4040' });
            if (fr === 58) { b.release(f, a, hit({ dmg: 45, kb: [14, -10], launch: true, kd: true, hitstop: 12, sfx: 'hit_heavy', unblockable: true })); md.locked = false; }
          }
        },
        ai: { role: 'grab', min: 90, max: 330 }
      },
      U: rising({ name: 'Ascension Sombre', dmg: 86, ready: 'b_up_r', pose: 'b_upslash', vy: 14, hitSfx: 'saber_hit', spark: 'slashbig' }),
      D: counter({ name: 'Blocage du Sabre', pose: 'block', color: '#ff2323', window: 22, proj: true }),
      _CS: counterStrike({ name: 'Riposte Sombre', anim: [['b_over_r', 3], ['b_over', 3], ['b_over', 6], ['idle', 12]], dmg: 90, sfx: 'saber_hit', spark: 'slashbig' }),
      S: rushLock({ name: 'Rage Écarlate', kind: 'super', cost: 100, hits: 4, totalDmg: 190, seq: 40, dash: 14, speed: 13, ready: 'b_over_r', pose: 'b_over', color: '#ff2323', hitSfx: 'saber_hit', spark: 'slashbig',
        step: (f, a) => FX.slashArc(a.x, a.y - 110, f.facing, 95, -2.3, 0.9, '#ff3030', 14, 9) }),
      X: {
        name: 'Domination Absolue', kind: 'ultimate', cost: 300, cine: true, anim: [['point', 14], ['choke', 70], ['toss', 12], ['idle', 16]], frames: 112, invuln: [0, 100],
        onFrame: (f, b, fr) => {
          const a = f.opp, md = f.md;
          if (fr === 14) {
            if (a.state !== 'ko' && !a.invulnerable() || a.state === 'locked') { b.lock(f, a); md.locked = true; play('dark'); b.flash('#400000', 0.5); }
            else { f.mf = 96; return; }
          }
          if (md.locked) {
            a.y = U.lerp(a.y, -220, 0.06); a.x = U.lerp(a.x, f.x + f.facing * 260, 0.05);
            if (fr % 2 === 0) FX.lightning(a.x + U.rand(-50, 50), a.y - U.rand(40, 180), a.x + U.rand(-50, 50), a.y - U.rand(0, 140), '#ff4040', 2, 4);
            if (fr > 20 && fr < 82 && fr % 8 === 0) b.autoHit(f, a, { dmg: 30, sfx: 'hit_heavy', spark: 'big', color: '#ff4040' });
            if (fr === 84) { a.vy = 30; }
            if (fr === 86) { b.release(f, a, hit({ dmg: 60, kb: [10, 12], launch: true, kd: true, hitstop: 20, sfx: 'ko', unblockable: true })); md.locked = false; b.shake(18); }
          }
        },
        ai: { role: 'finisher', min: 0, max: 9999 }
      }
    }),
    malvar: () => ({
      N: stream({ name: 'Éclairs Sombres', style: 'lightning', len: 280, width: 60, dur: 30, dmg: 8, interval: 4, recovery: 24, color: '#8ab4ff', joint: 'hand1', sfx: 'lightning', ready: 'cast1_r', pose: 'cast1', air: true, ai: { role: 'zone', min: 60, max: 290 } }),
      F: dashStrike({ name: 'Tourbillon Pourpre', startup: 10, dash: 20, speed: 11, dmg: 18, multi: 5, ready: 'b_side_r', pose: 'spin2', anim: [['b_side_r', 10], ['spin1', 1], ['spin2', 19, 'lin'], ['idle', 16]], showWeapon: true, sfx: 'saber', hitSfx: 'saber_hit', spark: 'slash', kb: [4, -2], box: [-60, -190, 170, 190], trailColor: '#ff2323' }),
      U: teleport({ name: 'Ascension Sinistre', where: 'above', gap: 10, pose: 'cast_up', color: '#8ab4ff', sfx: 'lightning', strike: { dmg: 60, box: [-60, -120, 160, 200], kb: [4, 12], level: 'overhead' }, aiRole: 'approach' }),
      D: reflector({ name: 'Champ Sombre', style: 'sphere', pose: 'cast', window: 24, color: '#8ab4ff' }),
      S: pillars({ name: 'Orage Impérial', kind: 'super', cost: 100, cine: true, count: 3, gap: 0, stagger: 18, delay: 18, ready: 'cast1_r', pose: 'cast_up', width: 70, life: 16, interval: 4, dmg: 20, color: '#8ab4ff', style: 'lightning', lead: true, impactSfx: 'lightning', invuln: [0, 18], ai: { role: 'zone', min: 0, max: 9999 } }),
      X: stream({ name: 'Pouvoir Absolu', kind: 'ultimate', cost: 300, cine: true, style: 'lightning', len: 1500, width: 150, dur: 80, dmg: 16, interval: 4, color: '#9fc4ff', joint: 'hands', startup: 16, ready: 'cast_r', pose: 'cast', sfx: 'lightning', invuln: [0, 96], finalHit: { dmg: 30, kb: [16, -12], launch: true, kd: true, hitstop: 14, sfx: 'ko', juggle: 0 }, ai: { role: 'finisher', min: 0, max: 9999 } })
    }),
    tk7: () => ({
      N: projectile({ name: 'Tir de Blaster', vis: 'laser', count: 3, every: 6, startup: 9, recovery: 24, speed: 22, dmg: 17, r: 9, w: 40, h: 16, joint: 'hand2', ox: 70, oy: 0, randomY: 1.6, ready: 'cast1_r', pose: 'cast1', sfx: 'blaster', fixedColor: '#ff3030', trail: false, air: true, airAngle: 0.35 }),
      F: { name: 'Roulade Tactique', kind: 'special', anim: [['crouch', 3], ['roll1', 1], ['roll2', 18, 'lin'], ['crouch', 8]], frames: 30, vel: [[3, 13, null, 21], [22, 1, null]], projInvuln: [2, 22], through: [3, 22], sfx: [[3, 'dash']], ai: { role: 'mobility', min: 150, max: 600 } },
      U: rising({ name: 'Propulseur', dmg: 70, pose: 'kick', ready: 'crouch', vy: 18, vx: 4, trail: true, trailColor: '#ff6a2a', fx: (f) => FX.ember(f.x - f.facing * 15, f.y - 60, '#ffb000', 0, 6, 10, 14) }),
      D: projectile({ name: 'Détonateur Thermique', vis: 'detonator', startup: 12, recovery: 20, speed: 6.5, vy: -12, grav: 0.55, dmg: 60, r: 9, joint: 'hand1', ready: 'b_over_r', pose: 'toss', sfx: 'whoosh', explode: { r: 85, hit: { dmg: 70, kb: [8, -10], launch: true, kd: true }, color: '#ffd23f' }, life: 100, trail: false, fixedColor: '#ffd23f', ai: { role: 'zone', min: 200, max: 500 } }),
      S: {
        name: 'Renforts', kind: 'super', cost: 100, cine: true, anim: [['taunt', 20], ['idle', 16]], frames: 36, invuln: [0, 20],
        spawn: [{ f: 14, fn: (f, b) => {
          [80, 170].forEach((d, i) => b.addEntity(new (Proj().Summon)(b, f, { x: U.clamp(f.x - f.facing * d, b.stage.left + 40, b.stage.right - 40), life: 170, every: 16 + i * 3, costume: f.cfg.costume || 0,
            fire: (s) => {
              play('blaster');
              b.addEntity(new (Proj().Projectile)(b, f, { kind: 'laser', x: s.x + s.facing * 60, y: -128, vx: s.facing * 21, vy: U.rand(-1.4, 1.4), r: 9, w: 40, h: 16, life: 100, color: '#ff3030', trail: false, hit: { dmg: 16, stun: 16, kb: [4, 0], chip: 0.15 } }));
            } })));
        } }],
        ai: { role: 'zone', min: 0, max: 9999 }
      },
      X: {
        name: 'Frappe Aérienne', kind: 'ultimate', cost: 300, cine: true, anim: [['taunt', 16], ['point', 60], ['idle', 16]], frames: 92, invuln: [0, 80],
        spawn: [{ f: 16, fn: (f, b) => {
          [0, 1].forEach((i) => {
            const dir = i ? -f.facing : f.facing;
            const tx = f.opp.x;
            b.addEntity(new (Proj().Ship)(b, f, { dir, x: tx - dir * (760 + i * 260), y: -400 - i * 60, dropEvery: 6,
              drop: (s) => {
                if (s.x < b.stage.left || s.x > b.stage.right) return;
                b.addEntity(new (Proj().Projectile)(b, f, { kind: 'bomb', x: s.x, y: s.y + 20, vx: s.vx * 0.3, vy: 4, grav: 0.6, r: 12, life: 140, trail: false,
                  explode: { r: 90, hit: { dmg: 34, kb: [5, -9], launch: true, chip: 0.3 }, color: '#ff9a3c' }, hit: { dmg: 34, kb: [4, -8], launch: true } }));
              } }));
          });
        } }],
        ai: { role: 'finisher', min: 0, max: 9999 }
      }
    }),
    pyrodrake: () => ({
      N: stream({ name: 'Lance-Flammes', style: 'fire', len: 290, width: 70, dur: 36, dmg: 10, interval: 4, color: '#ff7a00', joint: 'mouth', ready: 'crouch', pose: 'cast1', sfx: 'fire', air: true, onFrame: (f, b, fr) => { if (fr === 6) play('roar'); } }),
      F: dashStrike({ name: 'Charge Aérienne', startup: 10, dash: 18, speed: 16, vy: 0, dmg: 74, ready: 'jump', pose: 'fly', anim: [['jump', 10], ['fly', 18], ['fall', 14]], air: true, kb: [13, -6], launch: true, trailColor: '#ff8a1a', recovery: 14 }),
      U: rising({ name: 'Envol', dmg: 72, ready: 'crouch', pose: 'fly', vy: 20, vx: 3, multi: 6, trail: true, trailColor: '#ff8a1a' }),
      D: groundPound({ name: 'Séisme', up: 13, vx: 3, dmg: 72, shock: 60, color: '#c98a4a' }),
      S: projectile({ name: 'Déflagration', kind: 'super', cost: 100, cine: true, vis: 'firestar', startup: 18, recovery: 20, speed: 11, dmg: 90, r: 30, joint: 'mouth', ready: 'crouch', pose: 'cast1', sfx: 'roar', fixedColor: '#ff7a00', strength: 5, explode: { r: 110, hit: { dmg: 70, kb: [9, -12], launch: true, kd: true }, color: '#ff6a00' }, invuln: [0, 18], ai: { role: 'zone', min: 0, max: 9999 } }),
      X: rushLock({ name: 'Rage du Dragon', hits: 8, totalDmg: 340, seq: 70, dash: 20, speed: 20, ready: 'jump', pose: 'fly', anim: [['jump', 6], ['fly', 20], ['fly', 70], ['idle', 28]], color: '#ff6a00', air: true,
        hold: (f, a, b, k) => {
          const ang = k * 0.25;
          f.x = a.x + Math.cos(ang) * 140; f.y = Math.min(0, a.y - 60 + Math.sin(ang) * 80); f.facing = a.x > f.x ? 1 : -1;
          a.y = U.lerp(a.y, -180, 0.08);
          if (k % 2 === 0) FX.ember(a.x + U.rand(-50, 50), a.y - U.rand(0, 150), U.choice(['#ff6a00', '#ffb000']), 0, -3, 12, 20);
        },
        finish: (f, a, b) => { f.y = 0; FX.explosion(a.x, a.y - 80, 140, '#ff6a00'); play('roar'); } })
    }),
    lumi: () => ({
      N: projectile({ name: 'Bulle Psy', vis: 'bubble', startup: 12, recovery: 18, speed: 5, dmg: 48, r: 22, joint: 'hand1', ready: 'cast1_r', pose: 'cast1', color: '#ff9ad6', sfx: 'psy', wave: 18, life: 160, air: true, airAngle: 0.2 }),
      F: teleport({ name: 'Téléport Espiègle', where: 'behind', gap: 8, pose: 'cast_up', color: '#ff9ad6', strike: { dmg: 40, box: [-30, -200, 110, 200] }, aiRole: 'approach' }),
      U: rising({ name: 'Vol Psychique', dmg: 64, ready: 'crouch', pose: 'flip2', vy: 18, vx: 3, multi: 5, trail: true, trailColor: '#ff9ad6', box: [-50, -230, 130, 230] }),
      D: reflector({ name: 'Protection', style: 'sphere', pose: 'cast', window: 26, color: '#ff9ad6', air: true }),
      S: projectile({ name: 'Psyko-Vague', kind: 'super', cost: 100, cine: true, vis: 'rainbow', startup: 14, recovery: 20, speed: 10, dmg: 30, hits: 4, interval: 6, r: 34, w: 90, h: 120, joint: 'hand1', ready: 'cast_r', pose: 'cast', color: '#ff9ad6', sfx: 'psy', invuln: [0, 16], strength: 5, pierce: true, ai: { role: 'zone', min: 0, max: 9999 } }),
      X: beamUlt({ name: 'Aurore Primordiale', totalDmg: 310, width: 120, style: 'rainbow', color: '#ff9ad6', joint: 'hand1' })
    }),
    psykron: () => ({
      N: projectile({ name: 'Sphère Psy', vis: 'psy', startup: 14, recovery: 22, speed: 10, dmg: 50, r: 20, joint: 'hands', ready: 'cast_r', pose: 'cast', color: '#b46cff', sfx: 'psy', air: true, airAngle: 0.5, chargeFx: true , strength: 2}),
      F: { name: 'Confusion', kind: 'special', anim: [['cast1_r', 10], ['cast1', 16], ['idle', 12]], frames: 38, sfx: [[10, 'psy']],
        spawn: [{ f: 10, fn: (f, b) => b.addEntity(new (Proj().Area)(b, f, { x: f.x + f.facing * 110, y: f.y - 100, r: 80, hit: { dmg: 62, kb: [15, -9], launch: true, kd: true, sfx: 'hit_heavy' }, color: '#b46cff', smoke: false })) }],
        ai: { role: 'poke', min: 40, max: 190 } },
      U: teleport({ name: 'Téléportation', where: 'auto', gap: 7, pose: 'cast_up', color: '#b46cff' }),
      D: counter({ name: 'Entrave', pose: 'cast', color: '#b46cff', proj: true,
        onCounter: (f, a, b) => {
          a.state = 'stun'; a.st = 0; a.stunTime = 48; a.move = null; a.vx = 0; a.stunPose = 'grabbed';
          FX.text(a.x, a.y - 230, 'ENTRAVÉ !', '#d9a8ff', 30, 45); play('psy'); play('stun');
          FX.glow(a.x, a.y - 100, 260, '#b46cff', 30);
        } }),
      S: {
        name: 'Psyko-Tempête', kind: 'super', cost: 100, cine: true, anim: [['cast_up', 30], ['cast', 30], ['idle', 14]], frames: 74, invuln: [0, 30],
        onFrame: (f, b, fr) => {
          if (fr === 10) f.md.orbs = [];
          if (fr >= 10 && fr <= 30 && fr % 4 === 2) {
            const p = fireProj(f, b, { vis: 'psy', speed: 0, dmg: 34, r: 14, color: '#b46cff', life: 200, hitExtra: { kb: [6, -4], launch: true } }, 0, 1);
            p.vx = 0; p.vy = 0; f.md.orbs.push(p); play('psy');
          }
          if (f.md.orbs) f.md.orbs.forEach((p, i) => {
            if (p.dead) return;
            if (fr < 32) { const a = fr * 0.15 + i * 1.256; p.x = f.x + Math.cos(a) * 90; p.y = f.y - 130 + Math.sin(a) * 70; }
            if (fr === 32 + i * 5) { const t = f.opp; const dx = t.x - p.x, dy = t.y - 100 - p.y, d = Math.hypot(dx, dy) || 1; p.vx = dx / d * 16; p.vy = dy / d * 16; play('ki'); }
          });
        },
        ai: { role: 'zone', min: 0, max: 9999 }
      },
      X: pillars({ name: 'Frappe Psychique', kind: 'ultimate', cost: 300, cine: true, count: 1, delay: 26, hold: 40, ready: 'cast_r', pose: 'cast', width: 200, life: 50, interval: 4, dmg: 30, color: '#b46cff', style: 'light', invuln: [0, 60], lead: true, ai: { role: 'finisher', min: 0, max: 9999 } })
    }),
    omega: () => ({
      N: projectile({ name: 'Orbe du Néant', vis: 'void', startup: 13, recovery: 22, speed: 9, dmg: 52, r: 20, joint: 'hand1', ready: 'cast1_r', pose: 'cast1', color: '#ff3df2', sfx: 'dark', homing: 0.6, air: true, airAngle: 0.5 , strength: 2}),
      F: teleport({ name: 'Charge du Vide', where: 'behind', gap: 6, pose: 'cast_up', endPose: 'dash_punch', color: '#ff3df2', sfx: 'dark', strike: { dmg: 70, box: [-20, -210, 140, 210] }, aiRole: 'approach' }),
      U: pillars({ name: 'Faille', count: 1, from: 'self', first: 90, delay: 8, hold: 10, ready: 'crouch', pose: 'cast_up', width: 100, life: 18, interval: 5, dmg: 22, color: '#ff3df2', style: 'light', invuln: [0, 12], ai: { role: 'anti', min: 0, max: 200 } }),
      D: counter({ name: 'Absorption', pose: 'cast', color: '#ff3df2', proj: true }),
      _CS: counterStrike({ name: 'Rejet du Néant', dmg: 95, teleport: true }),
      S: rain({ name: 'Pluie Stellaire', kind: 'super', cost: 100, count: 9, every: 5, vis: 'void', color: '#ff3df2', dmg: 28, explode: 50, spread: 180, ready: 'cast_up', pose: 'cast_up' }),
      X: beamUlt({ name: 'Fin des Mondes', totalDmg: 360, width: 160, color: '#ff3df2', style: 'ki', ready: 'cast_up', joint: 'hands' })
    })
  };

  // Bûche de substitution (Kage)
  class Log {
    constructor(x, y) { this.x = x; this.y = y; this.vy = -6; this.life = 50; this.dead = false; this.rot = 0; }
    hitbox() { return null; }
    update() { this.vy += 0.6; this.y = Math.min(0, this.y + this.vy); this.rot += 0.1; if (--this.life <= 0) this.dead = true; }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y - 20); ctx.rotate(this.rot); ctx.globalAlpha = Math.min(1, this.life / 10);
      ctx.fillStyle = '#8a5a2e'; ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.rect(-14, -50, 28, 100); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c99a5e'; ctx.beginPath(); ctx.ellipse(0, -50, 14, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // Normaux propres à certains styles
  function styleNormals(style, ch) {
    let N;
    if (style === 'blade' || style === 'heavy') N = NORMALS.blade();
    else N = NORMALS.martial();
    if (style === 'staff') {
      N.L1 = { name: 'Pointe du Bâton', kind: 'normal', anim: [['s_cast', 4], ['s_strike', 3], ['s_strike', 3], ['idle', 9]], whiffSfx: 'whoosh',
        hits: [hit({ f0: 5, f1: 9, box: [20, -160, 150, 40], dmg: 30, stun: 15, kb: [4, 0] })], cancel: { from: 5, to: 16, on: 'contact', into: ['L2', 'DL', 'special', 'super'] } };
      N.L3 = { name: 'Frappe du Bâton', kind: 'normal', anim: [['s_strike_r', 7], ['s_slam', 3], ['s_slam', 5], ['idle', 12]], whiffSfx: 'whoosh_heavy',
        hits: [hit({ f0: 8, f1: 13, box: [20, -210, 160, 200], dmg: 52, stun: 20, kb: [9, 0], sfx: 'hit_heavy', hitstop: 9 })], cancel: { from: 8, to: 24, on: 'contact', into: ['special', 'super'] } };
      N.H = { name: 'Coup du Sage', kind: 'normal', anim: [['s_strike_r', 10], ['s_strike', 4], ['s_strike', 6], ['idle', 15]], whiffSfx: 'whoosh_heavy', glow: true,
        hits: [hit({ f0: 11, f1: 17, box: [20, -185, 180, 70], dmg: 78, stun: 22, kb: [13, 0], sfx: 'hit_heavy', hitstop: 11, spark: 'big' })], cancel: { from: 11, to: 32, on: 'hit', into: ['special', 'super'] } };
      N.UH = { name: 'Bâton Ascendant', kind: 'normal', anim: [['crouch', 6], ['s_raise', 5], ['s_raise', 6], ['idle', 14]], whiffSfx: 'whoosh_heavy',
        hits: [hit({ f0: 7, f1: 13, box: [0, -285, 115, 225], dmg: 60, stun: 24, kb: [3, -17], launch: true, juggle: 0, sfx: 'hit_heavy', hitstop: 10 })], jumpCancel: 13, cancel: { from: 8, to: 28, on: 'hit', into: ['special', 'super'] } };
    }
    if (style === 'rifle') {
      N.L1 = { name: 'Crosse', kind: 'normal', anim: [['r_butt_r', 4], ['r_butt', 3], ['r_butt', 3], ['idle', 8]], whiffSfx: 'whoosh',
        hits: [hit({ f0: 5, f1: 9, box: [15, -165, 95, 55], dmg: 31, stun: 15, kb: [4, 0] })], cancel: { from: 5, to: 16, on: 'contact', into: ['L2', 'DL', 'special', 'super'] } };
      N.H = { name: 'Crosse puissante', kind: 'normal', anim: [['r_butt_r', 9], ['r_butt', 3], ['r_butt', 6], ['idle', 15]], whiffSfx: 'whoosh_heavy', vel: [[9, 6, null]],
        hits: [hit({ f0: 10, f1: 15, box: [15, -175, 110, 70], dmg: 78, stun: 22, kb: [12, 0], sfx: 'hit_heavy', hitstop: 11, spark: 'big' })], cancel: { from: 10, to: 30, on: 'hit', into: ['special', 'super'] } };
    }
    if (style === 'creature') {
      N.H = { name: 'Coup de Queue', kind: 'normal', anim: [['hkick_r', 8], ['spin1', 1], ['spin2', 14, 'lin'], ['idle', 12]], whiffSfx: 'whoosh_heavy',
        hits: [hit({ f0: 10, f1: 20, box: [-120, -150, 240, 100], dmg: 78, stun: 22, kb: [13, -3], sfx: 'hit_heavy', hitstop: 11, spark: 'big' })], cancel: { from: 12, to: 30, on: 'hit', into: ['special', 'super'] } };
      N.DH = { name: 'Fouet Caudal', kind: 'normal', low: true, anim: [['crouch', 6], ['sweep', 4], ['sweep', 8], ['crouch', 14]], whiffSfx: 'whoosh_heavy',
        hits: [hit({ f0: 8, f1: 15, box: [-60, -45, 210, 45], dmg: 58, stun: 20, kb: [5, -7], kd: true, launch: true, level: 'low', sfx: 'hit_heavy', hitstop: 9 })] };
    }
    if (style === 'tiny') {
      N.H = { name: 'Fouet de Queue', kind: 'normal', anim: [['kick_r', 5], ['spin1', 1], ['spin2', 12, 'lin'], ['idle', 10]], whiffSfx: 'whoosh',
        hits: [hit({ f0: 7, f1: 17, box: [-110, -190, 220, 150], dmg: 62, stun: 20, kb: [11, -2], sfx: 'hit_heavy', hitstop: 9 })], cancel: { from: 9, to: 26, on: 'hit', into: ['special', 'super'] } };
      ['L1', 'L2', 'L3'].forEach((k) => tune(N[k], { reach: 0.85, y: -10 }));
    }
    if (style === 'wand' || style === 'caster') {
      N.L1.name = 'Coup de Baguette';
      N.L1.anim = [['cast1_r', 3], ['cast1', 2], ['cast1', 3], ['idle', 7]];
      N.L1.hits[0].box = [15, -160, 92, 50];
      N.L1.onFrame = (f, b, fr) => { if (fr === 4) { const p = f.weaponTipWorld(); FX.glow(p[0], p[1], 40, f.ch.aura, 6); } };
    }
    return N;
  }

  function build(f) {
    const ch = f.ch;
    const style = ch.style;
    const N = styleNormals(style, ch);
    const moves = Object.assign({}, N, COMMON(), SPECIALS[ch.id] ? SPECIALS[ch.id]() : SPECIALS.kairo());
    // Ajustements selon le gabarit
    const slow = style === 'heavy' || ch.id === 'godefroy' || ch.id === 'noctis' ? 1.12 : ch.id === 'kage' || ch.id === 'lumi' ? 0.9 : 1;
    const dmgK = style === 'heavy' || ch.id === 'godefroy' || ch.id === 'noctis' ? 1.12 : ch.id === 'kage' ? 0.92 : style === 'tiny' ? 0.85 : 1;
    ['L1', 'L2', 'L3', 'H', 'UH', 'DL', 'DH', 'AL', 'AH'].forEach((k) => { scaleMove(moves[k], slow); tune(moves[k], { dmg: dmgK }); });
    if (style === 'heavy') {
      moves.H.armor = [4, 12, 1];
      moves.H.name = 'Taille Tronçonneuse';
      moves.H.hits[0].multi = 3; moves.H.hits[0].f1 += 4; moves.H.hits[0].dmg = 32; moves.H.sfx = [[8, 'chainsaw']];
    }
    if (ch.id === 'godefroy' || ch.id === 'noctis') moves.H.armor = [3, 12, 1];
    if (ch.tune) ['L1', 'L2', 'L3', 'H', 'UH', 'DL', 'DH', 'AL', 'AH'].forEach((k) => tune(moves[k], ch.tune));
    // Normalisation : durée totale & identifiants
    for (const id in moves) {
      const m = moves[id];
      if (!m) { delete moves[id]; continue; }
      m.id = id;
      if (!m.frames) m.frames = m.anim.reduce((s, a) => s + a[1], 0);
      if (m.hits) m.hits = m.hits.map((h) => Object.assign({}, h));
      if (!m.kind) m.kind = 'special';
    }
    return moves;
  }

  // Liste des coups lisible (écran « Liste des coups »)
  const INPUT_NAMES = {
    L1: 'Léger', L2: 'Léger ×2', L3: 'Léger ×3', H: 'Lourd', UH: '↑ + Lourd', DL: '↓ + Léger', DH: '↓ + Lourd', AL: 'En l\'air : Léger', AH: 'En l\'air : Lourd',
    GRAB: 'Saisie (près)', N: 'Spécial', F: '→ + Spécial', U: '↑ + Spécial', D: '↓ + Spécial', S: 'ULTRA (1 barre)', S2: 'ULTRA (1 barre, éveillé)', X: 'ULTRA (3 barres)'
  };
  function moveList(charId) {
    const fake = { ch: C.Roster.get(charId) };
    const moves = build(fake);
    const order = ['N', 'F', 'U', 'D', 'S', 'S2', 'X', 'L1', 'L2', 'L3', 'H', 'UH', 'DL', 'DH', 'AL', 'AH', 'GRAB'];
    return order.filter((k) => moves[k]).map((k) => ({ id: k, input: INPUT_NAMES[k], name: moves[k].name, kind: moves[k].kind }));
  }

  C.Moves = { build, moveList, hit, spawnPoint, fireProj };
})(window.CDL = window.CDL || {});
