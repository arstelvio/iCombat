/* Choc des Légendes — gestion d'un combat : manches, caméra, collisions, HUD */
(function (C) {
  'use strict';
  const U = C.U, FX = C.FX;
  const COMIC = {
    punch: ['BAM !', 'POW !', 'BOUM !', 'WHAM !', 'PAF !', 'VLAN !', 'BONG !', 'KRAK !'],
    slash: ['TCHAK !', 'ZING !', 'SHLAK !', 'VZIIING !', 'KLANG !'],
    magic: ['ZAP !', 'BZZZT !', 'FLASH !', 'KABOUM !', 'PCHIOU !', 'WOUSH !'],
    colors: ['#ffd23f', '#ff5a3c', '#3fb6ff', '#ff4fd8', '#2fd06a', '#ff8a1a']
  };
  const NO_THROW_STATES = { hitstun: 1, blockstun: 1, airhit: 1, knockdown: 1, getup: 1, grabbed: 1, locked: 1, ko: 1, intro: 1, win: 1, lose: 1 };

  class Battle {
    constructor(cfg) {
      this.cfg = cfg;
      this.mode = cfg.mode || 'versus';
      this.time = 0;
      this.frame = 0;
      this.entities = [];
      this.stageDef = C.Stages.get(cfg.stage);
      this.stage = new C.Stages.Stage(this.stageDef, cfg.quality || 1);
      this.roundsToWin = cfg.rounds || 2;
      this.timeLimit = cfg.time == null ? 99 : cfg.time;
      this.difficulty = cfg.difficulty == null ? 1 : cfg.difficulty;
      this.parryWindow = 6;
      FX.reset();
      this.f = [new C.Fighter(this, 0, cfg.p1), new C.Fighter(this, 1, cfg.p2)];
      this.round = 0;
      this.drawCount = 0;
      this.cam = { x: 0, y: 0, zoom: 1, groundY: 0, baseGroundY: 0, shake: 0, sx: 0, sy: 0 };
      this.flashFx = null;
      this.freeze = null;
      this.slowmo = 0;
      this.combo = [null, null];
      this.announce = null;
      this.paused = false;
      this.result = null;
      this.roundLog = [];
      this.portraits = this.f.map((f) => C.Rig.portrait(f.look, 128, { shadow: !!f.shadowTint }));
      this.training = cfg.training || null;
      this.trainingInfo = { lastDmg: 0, lastCombo: 0 };
      this.events = [];
      this.startRound();
    }

    opponentOf(f) { return f === this.f[0] ? this.f[1] : this.f[0]; }
    addEntity(e) { this.entities.push(e); return e; }
    shake(n) { if (C.Store.settings.shake) this.cam.shake = Math.max(this.cam.shake, n); }
    flash(color, a) { this.flashFx = { color, a: a || 0.5 }; }
    say(text, sub, dur, color, size) { this.announce = { text, sub, t: 0, dur: dur || 70, color: color || '#ffd23f', size: size || 1 }; }
    emit(type, data) { this.events.push(Object.assign({ type }, data)); }
    // Voix (pas pendant les démonstrations du menu)
    voice(text, opts) { if (this.mode !== 'demo' && C.Voice) C.Voice.say(text, opts); }

    startRound() {
      this.round++;
      this.entities.length = 0;
      FX.reset();
      const [a, b] = this.f;
      a.resetRound(-260, 1); b.resetRound(260, -1);
      if (this.round > 1) { a.state = 'idle'; b.state = 'idle'; }
      this.clock = this.timeLimit * 60;
      this.phase = this.round === 1 ? 'intro' : 'ready';
      this.pt = 0;
      this.koInfo = null;
      this.cam.x = 0; this.cam.zoom = 1;
      if (this.training) { this.phase = 'fight'; a.state = 'idle'; b.state = 'idle'; this.clock = Infinity; }
      if (this.mode === 'demo') { this.phase = 'fight'; a.state = 'idle'; b.state = 'idle'; this.clock = Infinity; }
    }

    // =============================================================== BOUCLE
    update() {
      if (this.paused || this.result) return;
      this.frame++;
      // Gel « super »
      if (this.freeze) {
        const fz = this.freeze;
        fz.t++;
        if (fz.t >= fz.dur) this.freeze = null;
        if (this.flashFx) { this.flashFx.a -= 0.05; if (this.flashFx.a <= 0) this.flashFx = null; }
        this.updateCamera(true);
        return;
      }
      if (this.slowmo > 0) {
        this.slowmo--;
        if (this.slowmo % 3 !== 0) { this.updateCamera(); return; }
      }
      this.time += 1 / 60;
      this.pt++;
      this.stepPhase();
      const [a, b] = this.f;
      const fighting = this.phase === 'fight' || this.phase === 'ko' || this.phase === 'koWait' || this.phase === 'roundEnd' || this.phase === 'timeout';
      if (fighting || this.phase === 'intro' || this.phase === 'ready' || this.phase === 'go' || this.phase === 'matchEnd') {
        a.update(); b.update();
      }
      if (fighting) {
        this.handleThrows();
        this.checkLocks();
        this.updateEntities();
        this.resolveHits();
        this.resolvePush();
        this.checkAwakenings();
      }
      FX.update();
      this.updateCamera();
      if (this.combo[0]) { this.combo[0].t--; if (this.combo[0].t <= 0) this.combo[0] = null; }
      if (this.combo[1]) { this.combo[1].t--; if (this.combo[1].t <= 0) this.combo[1] = null; }
      if (this.announce) { this.announce.t++; if (this.announce.t > this.announce.dur) this.announce = null; }
      if (this.flashFx) { this.flashFx.a -= 0.04; if (this.flashFx.a <= 0) this.flashFx = null; }
      if (this.training) this.trainingStep();
    }

    stepPhase() {
      const [a, b] = this.f;
      switch (this.phase) {
        case 'intro':
          if (this.pt === 1) { C.Audio.play('announce'); }
          if (this.pt > 110) { this.phase = 'ready'; this.pt = 0; a.state = 'idle'; b.state = 'idle'; }
          break;
        case 'ready':
          if (this.pt === 1) {
            const last = this.f[0].wins === this.roundsToWin - 1 && this.f[1].wins === this.roundsToWin - 1;
            this.say(last ? 'MANCHE FINALE' : 'MANCHE ' + this.round, null, 60);
            C.Audio.play('announce');
            this.voice(last ? 'Manche finale !' : 'Manche ' + this.round, { who: 'announcer' });
          }
          if (this.pt > 62) { this.phase = 'go'; this.pt = 0; this.say('COMBAT !', null, 40, '#ff5a3c', 1.25); C.Audio.play('fight'); this.voice('Combat !', { who: 'announcer', shout: true }); }
          a.inp = b.inp = C.Fighter.EMPTY;
          break;
        case 'go':
          this.phase = 'fight'; this.pt = 0;
          break;
        case 'fight':
          if (this.clock !== Infinity && this.clock > 0) {
            this.clock--;
            if (this.clock <= 600 && this.clock % 60 === 0 && this.clock > 0) C.Audio.play('tick');
            if (this.clock <= 0) this.timeOut();
          }
          break;
        case 'ko':
          if (this.pt > 40) { this.phase = 'koWait'; this.pt = 0; }
          break;
        case 'koWait': {
          const loser = this.koInfo.loser;
          const settled = !loser || ((loser.state === 'ko' || loser.state === 'knockdown') && loser.onGround);
          if ((settled && this.pt > 50) || this.pt > 240) this.endRound();
          break;
        }
        case 'timeout':
          if (this.pt > 90) this.endRound();
          break;
        case 'roundEnd':
          if (this.pt > 130) this.nextRound();
          break;
        case 'matchEnd':
          if (this.pt > 200 && !this.result) this.finish();
          break;
      }
    }

    timeOut() {
      const [a, b] = this.f;
      this.phase = 'timeout'; this.pt = 0;
      this.say('TEMPS ÉCOULÉ !', null, 90, '#ffd23f');
      C.Audio.play('announce');
      const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
      if (Math.abs(ra - rb) < 0.001) this.koInfo = { winner: null, loser: null, timeout: true };
      else this.koInfo = ra > rb ? { winner: a, loser: b, timeout: true } : { winner: b, loser: a, timeout: true };
    }

    onKO(att, tgt) {
      if (this.phase !== 'fight') return;
      if (this.training) { tgt.hp = tgt.maxHp; return; }
      this.phase = 'ko'; this.pt = 0;
      this.slowmo = 70;
      this.koInfo = { winner: att, loser: tgt, byUlt: att.move && att.move.kind === 'ultimate' };
      this.say('K.O. !', null, 110, '#ff3c3c', 1.5);
      C.Audio.play('ko');
      this.voice('K.O. !', { who: 'announcer', shout: true });
      C.Audio.vibrate(120);
      this.flash('#ffffff', 0.8);
      this.shake(20);
    }

    endRound() {
      const info = this.koInfo || {};
      const w = info.winner;
      this.phase = 'roundEnd'; this.pt = 0;
      if (!w) {
        this.say('ÉGALITÉ', 'Les deux combattants restent debout', 120, '#cfd8dc');
        this.drawCount++;
        this.roundLog.push({ winner: null });
        if (this.drawCount >= 2) { this.f[0].wins = Math.max(this.f[0].wins, this.roundsToWin - 1); this.f[1].wins = Math.max(this.f[1].wins, this.roundsToWin - 1); }
        this.f.forEach((f) => { if (f.state !== 'ko') f.state = 'idle'; });
        return;
      }
      w.wins++;
      const perfect = w.hp >= w.maxHp;
      this.roundLog.push({ winner: w.side, perfect, timeout: !!info.timeout, ult: !!info.byUlt, hp: w.hp / w.maxHp });
      if (w.state !== 'ko') { w.state = 'win'; w.st = 0; w.winPose = Math.random() < 0.5 ? 'victory' : 'victory2'; }
      const l = info.loser;
      if (l && l.state !== 'ko' && l.state !== 'knockdown') { l.state = 'lose'; l.st = 0; }
      if (perfect) { this.say('PARFAIT !', null, 120, '#7dff8a', 1.3); C.Audio.play('unlock'); }
      else this.say(w.side === 0 ? 'J1 GAGNE LA MANCHE' : (this.mode === 'versus2p' ? 'J2 GAGNE LA MANCHE' : (this.f[1].controller && this.f[1].controller.isCPU ? 'CPU' : 'J2') + ' GAGNE LA MANCHE'), null, 120, '#ffd23f', 0.8);
      if (w.wins >= this.roundsToWin) {
        this.phase = 'matchEnd'; this.pt = 0;
        w.state = 'win'; w.st = 0;
        C.Audio.stopMusic();
        if (w.side === 0 || this.mode === 'versus2p') C.Audio.music('victory');
        this.winner = w;
        const q = w.ch.quotes && w.ch.quotes.win;
        if (q) this.voice(q, { who: w.ch.voice || w.ch.id });
      }
    }

    nextRound() {
      if (this.f[0].wins >= this.roundsToWin && this.f[1].wins >= this.roundsToWin) { this.finish(); return; }
      this.startRound();
    }

    finish() {
      const w = this.winner || (this.f[0].wins >= this.f[1].wins ? this.f[0] : this.f[1]);
      const p = this.f[0], e = this.f[1];
      this.result = {
        winner: w.side, p1: p, p2: e,
        perfectRounds: this.roundLog.filter((r) => r.winner === 0 && r.perfect).length,
        roundsWon: p.wins, roundsLost: e.wins,
        ultKO: this.roundLog.some((r) => r.winner === 0 && r.ult),
        timeoutWin: this.roundLog.some((r) => r.winner === 0 && r.timeout),
        lastHp: p.hp / p.maxHp,
        stats: p.matchStats, oppStats: e.matchStats
      };
      if (this.cfg.onEnd) this.cfg.onEnd(this.result);
    }

    // =============================================================== ÉVEIL DU HÉROS
    // Une fois par manche, sous 25 % de vie : le combattant se relève plus fort (comme dans les shonen).
    // Toujours pour les joueurs ; pour le CPU seulement en Difficile et Légendaire.
    canAwaken(f) {
      if (this.training || this.mode === 'demo' || f.heroAwake || !f.moves.AWAKEN) return false;
      const cpu = f.controller && f.controller.isCPU;
      return !cpu || this.difficulty >= 2;
    }
    checkAwakenings() {
      if (this.phase !== 'fight' || this.freeze) return;
      for (const f of this.f) {
        if (f.hp <= 0 || f.hp > f.maxHp * 0.25 || !this.canAwaken(f)) continue;
        // On attend que le combattant touche le sol et ne soit plus tenu
        const ok = f.onGround && (f.state === 'idle' || f.state === 'guard' || f.state === 'hitstun' || f.state === 'blockstun' ||
          f.state === 'landing' || f.state === 'getup' || f.state === 'stun' || f.state === 'dash' || f.state === 'knockdown');
        if (!ok) continue;
        f.heroAwake = true;
        f.crouching = false;
        f.startMove('AWAKEN');
      }
    }

    // =============================================================== GELS / VERROUILLAGES
    superFlash(f, def) {
      const ult = def.kind === 'ultimate';
      const name = def.cineName ? def.cineName(f) : def.name;
      this.freeze = { f, t: 0, dur: ult ? 72 : 40, name, ult, label: def.cineLabel || (ult ? 'ULTIME' : 'SUPER') };
      // Le héros crie le nom de son attaque, comme dans les dessins animés
      this.voice(name + (/[!?]$/.test(name) ? '' : ' !'), { who: f.ch.voice || f.ch.id, shout: true });
      C.Audio.play('super');
      C.Audio.vibrate(ult ? 90 : 40);
      FX.glow(f.x, f.y - 110, ult ? 520 : 320, f.ch.aura, 30);
      this.flash(ult ? '#ffffff' : f.ch.aura, ult ? 0.6 : 0.35);
      this.emit('super', { side: f.side, ult });
      if (f.controller && f.controller.isCPU) f.controller.onSuper && f.controller.onSuper();
    }
    lock(a, t) {
      t.state = 'locked'; t.lockedBy = a; t.st = 0; t.move = null; t.vx = 0; t.vy = 0; t.hidden = false; t.auraColor = null;
      t.grabbedBy = null;
    }
    release(a, t, h) {
      if (t.state !== 'locked' && t.state !== 'grabbed') return;
      t.state = 'airhit'; t.lockedBy = null; t.grabbedBy = null;
      const dir = a.facing;
      this.dealHit(a, t, h, dir, false, [t.x, t.y - t.height() * 0.55]);
    }
    autoHit(a, t, o) {
      const dmg = Math.max(1, Math.round(o.dmg * a.power() * t.stats.defense * Math.max(0.55, this.comboScale(t))));
      t.hp = Math.max(1, t.hp - dmg);
      if (this.training && this.training.infiniteHp) t.hp = Math.max(1, t.hp);
      t.comboHits++; t.comboDmg += dmg;
      a.matchStats.dmg += dmg; a.matchStats.hits++;
      a.matchStats.maxCombo = Math.max(a.matchStats.maxCombo, t.comboHits);
      a.gainMeter(dmg * 0.15);
      t.flash = 0.7;
      const px = t.x + U.rand(-25, 25), py = t.y - t.height() * 0.55 + U.rand(-30, 30);
      if (o.spark === 'slash' || o.spark === 'slashbig') FX.slashSpark(px, py, a.facing, o.spark === 'slashbig' ? 1.3 : 1, o.color);
      else FX.hitSpark(px, py, a.facing, o.spark === 'small' ? 0.6 : 1.1, o.color || '#ffe27a');
      C.Audio.play(o.sfx || 'hit_heavy');
      this.shake(5);
      this.showCombo(a, t);
      if (C.Store.settings.damageNumbers) FX.text(px, py - 40, String(dmg), '#fff3c0', 22, 34);
    }
    checkLocks() {
      for (const t of this.f) {
        if (t.state === 'locked') {
          const a = t.lockedBy;
          if (!a || a.state !== 'move' || t.st > 260) this.release(a || this.opponentOf(t), t, C.Moves.hit({ dmg: 1, kb: [6, -6], launch: true }));
          else t.st++;
        }
      }
    }

    // =============================================================== PROJECTIONS
    handleThrows() {
      for (const a of this.f) {
        const t = this.opponentOf(a);
        if (a.state === 'move' && a.move.grab && !a.md.grabbed) {
          const g = a.move.grab;
          if (a.mf >= g.f0 && a.mf < g.f1) {
            const d = (t.x - a.x) * a.facing;
            const reach = g.range * a.size + t.pushWidth() / 2;
            if (d > -10 && d < reach && t.onGround && !t.invulnerable() && !NO_THROW_STATES[t.state] && !(t.state === 'move' && t.mf < 4 && t.move.kind === 'grab')) {
              a.md.grabbed = true;
              const back = a.holdBack();
              a.startMove(a.moves.THROW);
              a.md.throwBack = back;
              t.state = 'grabbed'; t.st = 0; t.grabbedBy = a; t.move = null; t.vx = 0; t.vy = 0; t.auraColor = null;
              t.buf.t = 0; t.buf.a = 0;
              C.Audio.play('grab');
            }
          }
        }
        if (a.state === 'move' && a.move.kind === 'throw' && t.state === 'grabbed' && t.grabbedBy === a) {
          // Dégagement : Saisie (ou Garde+Léger) dans les 10 premières images
          if (a.mf <= 10 && (t.buf.t || (t.inp.g && t.buf.a))) {
            t.buf.t = 0; t.buf.a = 0;
            t.state = 'idle'; t.grabbedBy = null;
            a.endMove();
            a.vx = -a.facing * 9; t.vx = a.facing * 9;
            FX.text((a.x + t.x) / 2, a.y - 200, 'DÉGAGÉ !', '#9fe8ff', 30, 40);
            C.Audio.play('block');
            this.emit('tech', { side: t.side });
            continue;
          }
          const lift = a.mf > 8 ? Math.min(60, (a.mf - 8) * 8) : 0;
          t.x = a.x + a.facing * 62 * a.size;
          t.y = -10 - lift;
          t.facing = -a.facing;
          if (a.mf === a.move.throwAt) {
            const back = a.md.throwBack;
            const dir = back ? -a.facing : a.facing;
            if (back) { t.x = a.x + dir * 60; a.facing = dir; }
            t.state = 'airhit'; t.grabbedBy = null;
            this.dealHit(a, t, a.move.throwHit, dir, false, [t.x, t.y - 80]);
            a.matchStats.throws++;
            C.Audio.play('throw');
            this.shake(10);
            this.emit('throw', { side: a.side });
          }
        }
        if (t.state === 'grabbed' && (!t.grabbedBy || t.grabbedBy.state !== 'move')) { t.state = 'air'; t.grabbedBy = null; }
      }
    }

    // =============================================================== ENTITÉS
    updateEntities() {
      const E = this.entities;
      for (let i = 0; i < E.length; i++) E[i].update();
      // Chocs entre projectiles
      for (let i = 0; i < E.length; i++) {
        const p = E[i];
        if (p.dead || !p.isProjectile) continue;
        for (let j = 0; j < E.length; j++) {
          const q = E[j];
          if (i === j || q.dead || q.owner === p.owner || !(q.isProjectile || q.isBeam)) continue;
          const rq = q.hitbox ? q.hitbox() : null;
          if (!rq) continue;
          if (U.overlap(p.hitbox(), rq)) {
            const sp = p.strength || 1, sq = q.strength || 1;
            if (sp <= sq) { p.dead = true; if (!q.isBeam) q.strength = sq - sp; }
            if (sq <= sp && !q.isBeam) { q.dead = true; p.strength = sp - sq; }
            if (q.isProjectile && q.strength <= 0) q.dead = true;
            FX.energyBurst(p.x, p.y, '#ffffff', 14, 8);
            FX.glow(p.x, p.y, 120, p.color, 10);
            C.Audio.play('explosion');
          }
        }
      }
      for (let i = E.length - 1; i >= 0; i--) if (E[i].dead) E.splice(i, 1);
    }

    // =============================================================== COUPS
    resolveHits() {
      const pending = [];
      for (const a of this.f) {
        const hits = a.activeHits();
        if (!hits) continue;
        const t = this.opponentOf(a);
        const hb = t.hurtbox();
        // Contact avec un réflecteur au corps-à-corps → bloqué
        for (const ah of hits) {
          if (!hb || !U.overlap(ah.rect, hb)) continue;
          a.moveHitIds[ah.idx] = a.mf;
          const px = (Math.max(ah.rect.x, hb.x) + Math.min(ah.rect.x + ah.rect.w, hb.x + hb.w)) / 2;
          const py = (Math.max(ah.rect.y, hb.y) + Math.min(ah.rect.y + ah.rect.h, hb.y + hb.h)) / 2;
          pending.push({ a, t, h: ah.hit, point: [px, py] });
          if (!ah.hit.multi) break;
        }
      }
      for (const p of pending) this.applyHit(p.a, p.t, p.h, { point: p.point });
      // Entités
      for (const e of this.entities) {
        if (e.dead || !e.hitbox || e.cool > 0) continue;
        const r = e.hitbox();
        if (!r) continue;
        const t = this.opponentOf(e.owner);
        // réflecteurs
        if (e.isProjectile && t.state === 'move' && t.move.reflect && t.mf >= t.move.reflect[0] && t.mf < t.move.reflect[1] && e.reflectable) {
          const H = t.dims.height * t.size;
          const zone = { x: t.x - 90, y: t.y - H - 30 - t.hover(), w: 180, h: H + 60 };
          if (U.overlap(r, zone)) { e.reflect(t); this.emit('reflect', { side: t.side }); continue; }
        }
        if (e.isProjectile && t.projInvulnerable()) continue;
        const hb = t.hurtbox();
        if (!hb || !U.overlap(r, hb)) continue;
        const h = e.currentHit ? e.currentHit() : e.hit;
        const px = U.clamp(e.x != null ? e.x : t.x, hb.x, hb.x + hb.w);
        const py = U.clamp(e.y != null ? e.y : hb.y + hb.h / 2, hb.y, hb.y + hb.h);
        const res = this.applyHit(e.owner, t, h, { entity: e, isProj: true, point: [px, py] });
        if (e.onHitTarget) e.onHitTarget(t, res);
      }
    }

    comboScale(t) { const n = t.comboHits; return n < 2 ? 1 : Math.max(0.32, 1 - (n - 1) * 0.085); }

    applyHit(a, t, h, src) {
      const isProj = !!src.isProj;
      const ent = src.entity;
      const srcX = ent && ent.x != null ? ent.x : a.x;
      let dir = ent ? (ent.dir || (t.x >= srcX ? 1 : -1)) : a.facing;
      if (ent && (ent.isBeam)) dir = ent.dir;
      if (ent && !ent.isProjectile && !ent.isBeam) dir = t.x >= srcX ? 1 : -1;
      const tm = t.state === 'move' ? t.move : null;
      // 1. Posture de contre
      if (tm && tm.counter && t.mf >= tm.counter[0] && t.mf < tm.counter[1] && (!isProj || tm.counterProj) && !h.unblockable) {
        if (isProj && ent) ent.dead = true;
        FX.parry(t.x, t.y - 110);
        C.Audio.play('parry');
        if (!isProj) { FX.text(t.x, t.y - 230, 'CONTRE-ATTAQUE !', '#ffd23f', 30, 45); a.hitstop = 8; t.hitstop = 8; }
        // Un projectile est simplement absorbé : pas de punition à distance du tireur
        if (!isProj) tm.onCounter(t, a, this, src);
        else { FX.text(t.x, t.y - 200, 'ABSORBÉ', '#9fe8ff', 24, 30); }
        this.emit('counter', { side: t.side });
        return 'counter';
      }
      // 2. Renvoi au corps-à-corps → bloqué
      const reflecting = tm && tm.reflect && t.mf >= tm.reflect[0] && t.mf < tm.reflect[1];
      // 3. Parade parfaite
      const parryable = !h.unblockable && !(ent && (ent.unparryable || ent.isBeam || ent instanceof C.Proj.Pillar)) && t.onGround &&
        (t.state === 'idle' || t.state === 'guard' || t.state === 'blockstun' || t.state === 'landing');
      if (t.parryWin > 0 && parryable) {
        t.parryWin = 0; t.parryCool = 0;
        FX.parry(src.point[0], src.point[1]);
        C.Audio.play('parry');
        C.Audio.vibrate(30);
        FX.text(t.x, t.y - 230, 'PARADE !', '#9fe8ff', 36, 45);
        t.gainMeter(20);
        t.hitstop = 10;
        t.guard = Math.min(100, t.guard + 15);
        t.matchStats.parries++;
        if (!isProj) { a.state = 'stun'; a.st = 0; a.stunTime = 26; a.move = null; a.auraColor = null; a.vx = -a.facing * 2; a.hitstop = 10; a.stunPose = 'stunned'; }
        else if (ent) ent.dead = true;
        this.flash('#bff4ff', 0.25);
        this.emit('parry', { side: t.side });
        return 'parry';
      }
      // 4. Garde
      if (reflecting || t.isBlockingAgainst(srcX, h)) {
        const chip = Math.round((h.dmg || 0) * (h.chip != null ? h.chip : (a.move && a.move.kind !== 'normal' ? 0.12 : 0)) * a.power());
        if (chip > 0 && !this.training) t.hp = Math.max(1, t.hp - chip);
        const grd = h.grd != null ? h.grd : (h.dmg || 30) * 0.42;
        t.guard -= reflecting ? 0 : grd;
        const kb = (h.kb ? Math.abs(h.kb[0]) : 4) * 0.8 + 2;
        if (t.state === 'move' && reflecting) { /* reste en posture */ } else t.enterBlockstun(Math.round(h.bstun || 12), dir * kb);
        if (t.atWall && !isProj) a.vx = -a.facing * kb;
        FX.blockSpark(src.point[0], src.point[1], -dir);
        C.Audio.play('block');
        t.hitstop = 5; if (!isProj) a.hitstop = 5;
        a.gainMeter((h.dmg || 20) * 0.12); t.gainMeter((h.dmg || 20) * 0.08);
        a.moveContact = true;
        t.matchStats.blocks++;
        if (t.guard <= 0) {
          t.guard = 100;
          t.state = 'stun'; t.st = 0; t.stunTime = 70; t.stunPose = 'guardcrush'; t.move = null;
          FX.text(t.x, t.y - 230, 'GARDE BRISÉE !', '#ff6a6a', 34, 60);
          FX.energyBurst(t.x, t.y - 110, '#9fe8ff', 24, 12);
          C.Audio.play('guardbreak');
          this.shake(10);
          this.emit('guardcrush', { side: a.side });
        }
        return 'block';
      }
      // 5. Super armure
      if (tm && tm.armor && t.mf >= tm.armor[0] && t.mf < tm.armor[1] && (t.md.armorUsed || 0) < tm.armor[2] && !h.unblockable) {
        t.md.armorUsed = (t.md.armorUsed || 0) + 1;
        const dmg = Math.round((h.dmg || 0) * a.power() * t.stats.defense * 0.7);
        t.hp = Math.max(1, t.hp - dmg);
        t.flash = 1;
        FX.hitSpark(src.point[0], src.point[1], dir, 0.8, '#ff8a8a');
        FX.text(t.x, t.y - 230, 'ARMURE', '#ffb0b0', 24, 30);
        C.Audio.play('block');
        t.hitstop = 6; if (!isProj) a.hitstop = 6;
        a.moveContact = true;
        return 'armor';
      }
      // 6. Coup qui porte
      this.dealHit(a, t, h, dir, isProj, src.point);
      return 'hit';
    }

    dealHit(a, t, h, dir, isProj, point) {
      const tm = t.state === 'move' ? t.move : null;
      let counterHit = false;
      if (tm && tm.hits && tm.hits.length && t.mf < tm.hits[0].f0 && tm.kind !== 'throw') counterHit = true;
      const diffMul = a.side === 1 && this.cfg.p2.dmgMul ? 1 : 1;
      let dmg = (h.dmg || 0) * a.power() * t.stats.defense * this.comboScale(t) * diffMul;
      if (counterHit) dmg *= 1.2;
      dmg = Math.max(1, Math.round(dmg));
      if (this.training && this.training.infiniteHp) dmg = Math.min(dmg, t.hp - 1 > 0 ? dmg : 0);
      t.hp = Math.max(0, t.hp - dmg);
      t.comboHits++; t.comboDmg += dmg;
      a.matchStats.dmg += dmg; a.matchStats.hits++;
      a.matchStats.maxCombo = Math.max(a.matchStats.maxCombo, t.comboHits);
      a.gainMeter(dmg * 0.3); t.gainMeter(dmg * 0.22);
      let stun = (h.stun || 16) * Math.max(0.55, 1 - t.comboHits * 0.035) + (counterHit ? 6 : 0) + (h.stunExtra || 0);
      const hh = Object.assign({}, h);
      if (h.spike && !t.onGround) { hh.kb = [h.kb[0], 14]; hh.kd = true; }
      t.enterHit(hh, dir, Math.round(stun));
      if (hh.kd && t.onGround === false) t.kdOnLand = true;
      const hs = h.hitstop || 7;
      t.hitstop = hs; if (!isProj) a.hitstop = hs;
      t.flash = 0.85;
      // effets
      const px = point ? point[0] : t.x, py = point ? point[1] : t.y - 100;
      const big = h.spark === 'big' || h.spark === 'slashbig' || dmg >= 70;
      const color = a.awakened > 0 ? '#ffe27a' : (h.spark === 'slash' || h.spark === 'slashbig' ? '#d8f0ff' : '#ffe27a');
      if (h.spark === 'slash' || h.spark === 'slashbig') FX.slashSpark(px, py, dir, big ? 1.35 : 1, color);
      else FX.hitSpark(px, py, dir, big ? 1.4 : h.spark === 'small' ? 0.6 : 1, color);
      C.Audio.play(h.sfx || 'hit_light');
      if (big) { this.shake(7); }
      if (a.side === 0 || t.side === 0) C.Audio.vibrate(big ? 35 : 15);
      if (counterHit) FX.text(t.x, t.y - 240, 'CONTRE !', '#ff9a3c', 30, 40);
      if (big || counterHit || t.hp <= 0) this.comicWord(px, py - 50, h, isProj);
      if (C.Store.settings.damageNumbers) FX.text(px + U.rand(-10, 10), py - 30, String(dmg), counterHit ? '#ffb070' : '#fff3c0', 22 + Math.min(14, dmg / 8), 36);
      a.moveHit = true; a.moveContact = true;
      if (a.state === 'move' && a.move && a.move.onHit && !isProj) a.move.onHit(a, t, this, h);
      if (h.lock && a.state === 'move' && a.move && a.move.onHit && isProj === false) { /* déjà géré */ }
      // Pas de verrouillage si l'attaquant subit un coup pendant une séquence
      if (a.state !== 'move') { /* rien */ }
      if (t.state === 'locked' && t.lockedBy !== a) t.state = 'airhit';
      this.showCombo(a, t);
      if (this.training) { this.trainingInfo.lastDmg = t.comboDmg; this.trainingInfo.lastCombo = t.comboHits; }
      if (t.hp <= 0) {
        t.hp = 0;
        if (t.state === 'hitstun') { t.state = 'airhit'; t.vy = -8; t.vx = dir * 6; t.onGround = false; }
        t.kdOnLand = true;
        this.onKO(a, t);
      }
      this.emit('hit', { side: a.side, dmg, combo: t.comboHits, counter: counterHit });
    }

    // Onomatopées façon bande dessinée sur les gros coups
    comicWord(x, y, h, isProj) {
      if (this.frame - (this.lastComic || -99) < 16) return;
      this.lastComic = this.frame;
      const slash = h.spark === 'slash' || h.spark === 'slashbig' || /slash|saber/.test(h.sfx || '');
      const words = slash ? COMIC.slash : isProj ? COMIC.magic : COMIC.punch;
      FX.comic(x + U.rand(-20, 20), y + U.rand(-20, 10), U.choice(words), U.choice(COMIC.colors));
    }

    showCombo(a, t) {
      if (t.comboHits >= 2) {
        this.combo[a.side] = { n: t.comboHits, dmg: t.comboDmg, t: 90 };
        if (t.comboHits === 5 || t.comboHits === 10 || t.comboHits === 15) C.Audio.play('coin');
      }
    }

    // =============================================================== POUSSÉE / CAMÉRA
    resolvePush() {
      const [a, b] = this.f;
      const skip = (f) => f.state === 'grabbed' || f.state === 'locked' || f.hidden || f.state === 'ko' ||
        (f.state === 'move' && f.move.through && f.mf >= f.move.through[0] && f.mf < f.move.through[1]);
      const st = this.stage;
      if (!skip(a) && !skip(b)) {
        const ha = a.dims.height * a.size, hb2 = b.dims.height * b.size;
        const vertical = a.y < b.y - hb2 * 0.75 || b.y < a.y - ha * 0.75;
        if (!vertical) {
          const minD = (a.pushWidth() + b.pushWidth()) / 2;
          const dx = b.x - a.x;
          if (Math.abs(dx) < minD) {
            const s = dx === 0 ? (a.facing > 0 ? 1 : -1) : Math.sign(dx);
            const push = (minD - Math.abs(dx)) / 2;
            a.x -= s * push; b.x += s * push;
            const lim = 34;
            if (a.x < st.left + lim) { b.x += st.left + lim - a.x; a.x = st.left + lim; }
            if (b.x < st.left + lim) { a.x += st.left + lim - b.x; b.x = st.left + lim; }
            if (a.x > st.right - lim) { b.x -= a.x - (st.right - lim); a.x = st.right - lim; }
            if (b.x > st.right - lim) { a.x -= b.x - (st.right - lim); b.x = st.right - lim; }
          }
        }
      }
      // Écart maximal (la caméra doit garder les deux combattants)
      const maxSep = 1020;
      const d = b.x - a.x;
      if (Math.abs(d) > maxSep) {
        const over = Math.abs(d) - maxSep, s = Math.sign(d);
        const am = Math.abs(a.vx) * (Math.sign(a.vx) === -s ? 1 : 0), bm = Math.abs(b.vx) * (Math.sign(b.vx) === s ? 1 : 0);
        const tot = am + bm || 2;
        a.x += s * over * ((am || 1) / tot);
        b.x -= s * over * ((bm || 1) / tot);
      }
    }

    updateCamera(frozen) {
      const c = this.cam;
      const [a, b] = this.f;
      let tx = (a.x + b.x) / 2;
      const dist = Math.abs(a.x - b.x);
      let tz = U.clamp(1150 / (dist + 520), 0.74, 1.12);
      const top = Math.min(a.y - a.height(), b.y - b.height());
      let ty = Math.min(0, top + 260);
      if (this.freeze && this.freeze.ult) { tx = this.freeze.f.x; tz = 1.45; ty = this.freeze.f.y; }
      else if (this.phase === 'ko' || (this.phase === 'koWait' && this.pt < 30)) { const l = this.koInfo && this.koInfo.loser; if (l) { tx = U.lerp(tx, l.x, 0.6); tz = Math.min(1.3, tz + 0.25); } }
      else if (this.phase === 'matchEnd' && this.winner) { tx = this.winner.x; tz = 1.35; }
      else if (this.phase === 'intro') { tz = 1.05; }
      const k = frozen ? 0.12 : 0.1;
      c.zoom = U.lerp(c.zoom, tz, k);
      c.x = U.lerp(c.x, tx, k * 1.4);
      c.y = U.lerp(c.y, ty, 0.08);
      if (c.shake > 0) { c.sx = U.rand(-c.shake, c.shake); c.sy = U.rand(-c.shake, c.shake) * 0.7; c.shake *= 0.86; if (c.shake < 0.5) c.shake = 0; }
      else { c.sx = c.sy = 0; }
    }

    // =============================================================== ENTRAÎNEMENT
    trainingStep() {
      const T = this.training;
      const d = this.f[1], p = this.f[0];
      if (T.infiniteMeter) { p.meter = 300; }
      if (T.infiniteHp) {
        for (const f of this.f) {
          if ((f.state === 'idle' || f.state === 'air' || f.state === 'guard') && f.comboHits === 0 && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + 20);
          if (f.hp <= 0) f.hp = f.maxHp;
        }
      }
      if (T.dummyMeter) d.meter = 300;
    }

    // =============================================================== RENDU
    render(ctx, W, H) {
      const c = this.cam;
      const z = c.zoom;
      c.baseGroundY = H * 0.84;
      const groundY = c.baseGroundY - c.y * z + c.sy;
      c.groundY = groundY;
      const camX = c.x - c.sx / z;
      // Décor
      this.stage.drawBack(ctx, { x: camX, zoom: z, groundY, baseGroundY: c.baseGroundY }, W, H);
      // Monde
      ctx.save();
      ctx.translate(W / 2, groundY);
      ctx.scale(z, z);
      ctx.translate(-camX, 0);
      const t = this.time;
      for (const f of this.f) f.renderShadow(ctx);
      for (const e of this.entities) if (e.bg && e.draw) e.draw(ctx, t);
      // Assombrissement pendant un super
      const fz = this.freeze;
      const order = this.drawOrder();
      if (fz) {
        for (const f of order) if (f !== fz.f) f.render(ctx);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(5,0,15,' + Math.min(0.7, fz.t / 10 * 0.7) + ')';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
        this.renderSuperLines(ctx, fz);
        fz.f.render(ctx);
      } else {
        for (const f of order) f.render(ctx);
      }
      for (const f of this.f) if (f.shieldFx) this.renderShield(ctx, f);
      for (const e of this.entities) if (!e.bg && e.draw) e.draw(ctx, t);
      FX.draw(ctx);
      if (this.debugBoxes) this.renderBoxes(ctx);
      FX.drawTexts(ctx);
      ctx.restore();
      this.stage.drawAmbient(ctx, c, W, H);
      // Flash plein écran
      if (this.flashFx) {
        ctx.fillStyle = U.rgba(this.flashFx.color, Math.max(0, this.flashFx.a));
        ctx.fillRect(0, 0, W, H);
      }
      if (fz) this.renderCutIn(ctx, fz, W, H);
      if (this.mode !== 'demo') this.renderHUD(ctx, W, H);
    }

    drawOrder() {
      const [a, b] = this.f;
      // Celui qui attaque est dessiné au premier plan
      if (b.state === 'move' && a.state !== 'move') return [a, b];
      if (a.state === 'move' && b.state !== 'move') return [b, a];
      return this.frame % 2 ? [a, b] : [a, b];
    }

    renderShield(ctx, f) {
      const s = f.shieldFx, H = f.dims.height * f.size;
      const cx = f.x, cy = f.y - H * 0.5 - f.hover();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (s.style === 'sphere') {
        ctx.strokeStyle = U.rgba(s.color, 0.8); ctx.lineWidth = 4;
        ctx.fillStyle = U.rgba(s.color, 0.18);
        ctx.beginPath(); ctx.ellipse(cx, cy, H * 0.48, H * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = U.rgba('#ffffff', 0.5); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, H * 0.4 + Math.sin(s.t * 0.5) * 6, H * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (s.style === 'shield') {
        const x = cx + f.facing * 60;
        ctx.strokeStyle = U.rgba(s.color, 0.9); ctx.lineWidth = 5;
        ctx.fillStyle = U.rgba(s.color, 0.22);
        ctx.beginPath(); ctx.ellipse(x, cy, 22, H * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (s.style === 'push') {
        const r = 40 + s.t * 9;
        ctx.strokeStyle = U.rgba(s.color, Math.max(0, 0.9 - s.t * 0.05)); ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(cx + f.facing * 20, cy, r, f.facing > 0 ? -0.9 : Math.PI - 0.9, f.facing > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke();
      }
      ctx.restore();
    }

    renderSuperLines(ctx, fz) {
      const f = fz.f;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const n = 26;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + fz.t * 0.02;
        const r1 = 160 + (i % 3) * 40, r2 = 900;
        ctx.strokeStyle = U.rgba(f.ch.aura, 0.25);
        ctx.lineWidth = 3 + (i % 4);
        ctx.beginPath();
        ctx.moveTo(f.x + Math.cos(a) * r1, f.y - 110 + Math.sin(a) * r1);
        ctx.lineTo(f.x + Math.cos(a) * r2, f.y - 110 + Math.sin(a) * r2);
        ctx.stroke();
      }
      ctx.restore();
    }

    renderCutIn(ctx, fz, W, H) {
      const f = fz.f;
      const t = fz.t;
      const k = U.clamp(t / 8, 0, 1) * U.clamp((fz.dur - t) / 8, 0, 1);
      const left = f.side === 0;
      const bh = fz.ult ? H * 0.32 : H * 0.2;
      const y = fz.ult ? H * 0.22 : H * 0.3;
      ctx.save();
      ctx.globalAlpha = k;
      // bandeau
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, U.rgba(f.ch.aura, 0.0)); g.addColorStop(0.15, U.rgba(f.ch.aura, 0.55)); g.addColorStop(0.85, U.rgba(f.ch.aura, 0.55)); g.addColorStop(1, U.rgba(f.ch.aura, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, y, W, bh);
      ctx.fillStyle = 'rgba(10,0,20,0.55)';
      ctx.fillRect(0, y + bh * 0.15, W, bh * 0.7);
      // portrait
      const ps = bh * 1.1;
      const slide = (1 - U.easeOut(U.clamp(t / 12, 0, 1))) * 300;
      const px = left ? W * 0.08 - slide : W * 0.92 - ps + slide;
      ctx.drawImage(this.portraits[f.side], px, y + bh / 2 - ps / 2, ps, ps);
      // nom
      ctx.textAlign = left ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      const tx = left ? px + ps + 20 : px - 20;
      let fsz = Math.round(bh * 0.34);
      ctx.font = fsz + 'px Bangers, Impact, sans-serif';
      const maxW = W - ps - W * 0.14;
      const tw = ctx.measureText(fz.name.toUpperCase()).width;
      if (tw > maxW) { fsz = Math.floor(fsz * maxW / tw); ctx.font = fsz + 'px Bangers, Impact, sans-serif'; }
      ctx.lineWidth = 6; ctx.strokeStyle = '#120818';
      ctx.strokeText(fz.name.toUpperCase(), tx, y + bh * 0.48);
      ctx.fillStyle = fz.ult ? '#ffd23f' : '#ffffff';
      ctx.fillText(fz.name.toUpperCase(), tx, y + bh * 0.48);
      ctx.font = Math.round(bh * 0.13) + 'px "Russo One", sans-serif';
      ctx.fillStyle = '#e8dcff';
      ctx.fillText(fz.label || (fz.ult ? 'ULTIME' : 'SUPER'), tx, y + bh * 0.76);
      ctx.restore();
    }

    renderBoxes(ctx) {
      ctx.lineWidth = 2;
      for (const f of this.f) {
        const hb = f.hurtbox();
        if (hb) { ctx.strokeStyle = '#3cff6a'; ctx.strokeRect(hb.x, hb.y, hb.w, hb.h); }
        const ah = f.activeHits();
        if (ah) for (const h of ah) { ctx.strokeStyle = '#ff3030'; ctx.strokeRect(h.rect.x, h.rect.y, h.rect.w, h.rect.h); }
      }
      for (const e of this.entities) { const r = e.hitbox && e.hitbox(); if (r) { ctx.strokeStyle = '#ffb030'; ctx.strokeRect(r.x, r.y, r.w, r.h); } }
    }

    renderHUD(ctx, W, H) {
      const [a, b] = this.f;
      // Marges élargies par les zones sûres (encoche et coins arrondis de l'iPhone)
      const sf = C.safe || { l: 0, r: 0, t: 0 };
      const pad = 18 + sf.l, padR = 18 + sf.r;
      const barW = Math.min(W * 0.36, 560, (W - pad - padR) / 2 - 74 - 50), barH = 26;
      const top = 22 + sf.t;
      this.drawLife(ctx, a, pad + 74, top, barW, barH, false);
      this.drawLife(ctx, b, W - padR - 74 - barW, top, barW, barH, true);
      // Portraits
      this.drawPortrait(ctx, 0, pad, top - 8, 70);
      this.drawPortrait(ctx, 1, W - padR - 70, top - 8, 70);
      // Chrono
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const clk = this.clock === Infinity ? '∞' : String(Math.ceil(Math.max(0, this.clock) / 60));
      ctx.fillStyle = 'rgba(10,5,20,0.75)';
      ctx.beginPath(); ctx.moveTo(W / 2 - 42, top - 10); ctx.lineTo(W / 2 + 42, top - 10); ctx.lineTo(W / 2 + 34, top + 50); ctx.lineTo(W / 2 - 34, top + 50); ctx.closePath(); ctx.fill();
      ctx.font = '48px Bangers, Impact, sans-serif';
      ctx.fillStyle = this.clock <= 600 && this.clock !== Infinity && this.frame % 30 < 15 ? '#ff5a5a' : '#ffffff';
      ctx.fillText(clk, W / 2, top + 22);
      // Manches gagnées
      for (let i = 0; i < this.roundsToWin; i++) {
        this.drawStar(ctx, W / 2 - 16 - i * 24, top + 66, 10, i < a.wins);
        this.drawStar(ctx, W / 2 + 16 + i * 24, top + 66, 10, i < b.wins);
      }
      // Jauges ULTRA
      const mw = Math.min(barW * 0.62, 300);
      this.drawMeter(ctx, a, pad + 74, top + barH + 44, mw, false);
      this.drawMeter(ctx, b, W - padR - 74 - mw, top + barH + 44, mw, true);
      // Combos
      for (let s = 0; s < 2; s++) {
        const cb = this.combo[s];
        if (!cb) continue;
        const x = s === 0 ? W * 0.1 : W * 0.9;
        const k = Math.min(1, cb.t / 15);
        ctx.globalAlpha = k;
        ctx.textAlign = s === 0 ? 'left' : 'right';
        ctx.font = '56px Bangers, Impact, sans-serif';
        ctx.lineWidth = 6; ctx.strokeStyle = '#120818';
        const xx = s === 0 ? Math.max(W * 0.04, pad) : Math.min(W * 0.96, W - padR);
        ctx.strokeText(cb.n + ' COUPS', xx, H * 0.34);
        ctx.fillStyle = cb.n >= 10 ? '#ff5a3c' : cb.n >= 5 ? '#ffb000' : '#ffe27a';
        ctx.fillText(cb.n + ' COUPS', xx, H * 0.34);
        ctx.font = '22px "Russo One", sans-serif';
        ctx.strokeText(cb.dmg + ' dégâts', xx, H * 0.34 + 40);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(cb.dmg + ' dégâts', xx, H * 0.34 + 40);
        ctx.globalAlpha = 1;
        void x;
      }
      // Annonces
      if (this.announce) {
        const A = this.announce;
        const k = A.t < 8 ? U.easeOutBack(A.t / 8) : A.t > A.dur - 10 ? (A.dur - A.t) / 10 : 1;
        ctx.save();
        ctx.translate(W / 2, H * 0.42);
        ctx.scale(Math.max(0.01, k), Math.max(0.01, k));
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const fs = Math.round(96 * A.size);
        ctx.font = fs + 'px Bangers, Impact, sans-serif';
        ctx.lineWidth = 10; ctx.strokeStyle = '#120818';
        ctx.strokeText(A.text, 0, 0);
        const g = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, A.color); g.addColorStop(1, U.shade(A.color, -0.35));
        ctx.fillStyle = g;
        ctx.fillText(A.text, 0, 0);
        if (A.sub) { ctx.font = '26px "Russo One", sans-serif'; ctx.lineWidth = 5; ctx.strokeText(A.sub, 0, fs * 0.65); ctx.fillStyle = '#fff'; ctx.fillText(A.sub, 0, fs * 0.65); }
        ctx.restore();
      }
      // Intro : noms
      const nxl = Math.max(W * 0.06, pad + 10), nxr = Math.min(W * 0.94, W - padR - 10);
      if (this.phase === 'intro') {
        const k = U.clamp(this.pt / 20, 0, 1);
        ctx.globalAlpha = k * U.clamp((110 - this.pt) / 15, 0, 1);
        ctx.font = '60px Bangers, Impact, sans-serif'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 7; ctx.strokeStyle = '#120818';
        ctx.textAlign = 'left';
        ctx.strokeText(a.name.toUpperCase(), nxl, H * 0.62); ctx.fillStyle = '#ffd23f'; ctx.fillText(a.name.toUpperCase(), nxl, H * 0.62);
        ctx.textAlign = 'right';
        ctx.strokeText(b.name.toUpperCase(), nxr, H * 0.62); ctx.fillStyle = '#ffd23f'; ctx.fillText(b.name.toUpperCase(), nxr, H * 0.62);
        ctx.font = '24px "Russo One", sans-serif'; ctx.lineWidth = 4;
        ctx.textAlign = 'left'; ctx.strokeText('« ' + a.ch.quotes.intro + ' »', nxl, H * 0.69); ctx.fillStyle = '#fff'; ctx.fillText('« ' + a.ch.quotes.intro + ' »', nxl, H * 0.69);
        ctx.textAlign = 'right'; ctx.strokeText('« ' + b.ch.quotes.intro + ' »', nxr, H * 0.69); ctx.fillText('« ' + b.ch.quotes.intro + ' »', nxr, H * 0.69);
        ctx.globalAlpha = 1;
      }
      // Citation de victoire
      if (this.phase === 'matchEnd' && this.winner && this.pt > 30) {
        const w = this.winner;
        ctx.globalAlpha = U.clamp((this.pt - 30) / 20, 0, 1);
        ctx.fillStyle = 'rgba(10,5,20,0.7)';
        ctx.fillRect(0, H * 0.72, W, 90);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '40px Bangers, Impact, sans-serif'; ctx.fillStyle = '#ffd23f';
        ctx.fillText(w.name.toUpperCase() + ' GAGNE !', W / 2, H * 0.72 + 28);
        ctx.font = '22px "Russo One", sans-serif'; ctx.fillStyle = '#fff';
        ctx.fillText('« ' + w.ch.quotes.win + ' »', W / 2, H * 0.72 + 66);
        ctx.globalAlpha = 1;
      }
      if (this.training && !this.training.school) this.renderTrainingInfo(ctx, W, H);
    }

    drawLife(ctx, f, x, y, w, h, flip) {
      const k = f.hp / f.maxHp, kd = f.dispHp / f.maxHp, kr = f.redHp / f.maxHp;
      ctx.save();
      ctx.fillStyle = 'rgba(10,5,20,0.8)';
      ctx.beginPath();
      if (!flip) { ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + w + 14, y - 4); ctx.lineTo(x + w + 4, y + h + 4); ctx.lineTo(x - 4, y + h + 4); }
      else { ctx.moveTo(x - 14, y - 4); ctx.lineTo(x + w + 4, y - 4); ctx.lineTo(x + w + 4, y + h + 4); ctx.lineTo(x - 4, y + h + 4); }
      ctx.closePath(); ctx.fill();
      const seg = (frac, color) => {
        const ww = w * U.clamp(frac, 0, 1);
        ctx.fillStyle = color;
        if (!flip) ctx.fillRect(x + w - ww, y, ww, h); else ctx.fillRect(x, y, ww, h);
      };
      // la vie se vide vers l'intérieur (vers le chrono)
      const segR = (frac, color) => {
        const ww = w * U.clamp(frac, 0, 1);
        ctx.fillStyle = color;
        if (!flip) ctx.fillRect(x, y, ww, h); else ctx.fillRect(x + w - ww, y, ww, h);
      };
      void seg;
      segR(kr, '#e53935');
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      const col = k > 0.5 ? ['#fff59d', '#ffd23f', '#e6a100'] : k > 0.25 ? ['#ffe0b2', '#ff9800', '#c66900'] : ['#ffcdd2', '#ff5252', '#b71c1c'];
      g.addColorStop(0, col[0]); g.addColorStop(0.45, col[1]); g.addColorStop(1, col[2]);
      segR(kd, g);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x, y + 2, w, 4);
      // Garde
      const gw = w * 0.5 * (f.guard / 100);
      ctx.fillStyle = 'rgba(10,5,20,0.8)';
      if (!flip) ctx.fillRect(x + w * 0.5 - 2, y + h + 4, w * 0.5 + 2, 8); else ctx.fillRect(x, y + h + 4, w * 0.5 + 2, 8);
      ctx.fillStyle = f.guard < 30 ? '#ff6a6a' : '#7fd1ff';
      if (!flip) ctx.fillRect(x + w - gw, y + h + 6, gw, 4); else ctx.fillRect(x, y + h + 6, gw, 4);
      // Nom
      ctx.font = '20px "Russo One", sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = flip ? 'right' : 'left';
      ctx.lineWidth = 4; ctx.strokeStyle = '#120818';
      const nx = flip ? x + w : x;
      ctx.strokeText(f.name, nx, y + h + 14);
      ctx.fillStyle = '#ffffff'; ctx.fillText(f.name, nx, y + h + 14);
      ctx.restore();
    }

    drawPortrait(ctx, side, x, y, s) {
      const f = this.f[side];
      ctx.save();
      ctx.fillStyle = 'rgba(10,5,20,0.85)';
      ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2 + 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = U.shade(f.ch.aura, -0.55); ctx.fillRect(x, y, s, s);
      if (side === 1) { ctx.translate(x + s, y); ctx.scale(-1, 1); ctx.drawImage(this.portraits[side], 0, 0, s, s); }
      else ctx.drawImage(this.portraits[side], x, y, s, s);
      ctx.restore();
      ctx.strokeStyle = f.awakened > 0 ? '#ffd84a' : '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2); ctx.stroke();
    }

    drawStar(ctx, x, y, r, on) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath();
      ctx.fillStyle = on ? '#ffd23f' : 'rgba(30,20,40,0.8)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = on ? '#fff3c0' : 'rgba(255,255,255,0.3)'; ctx.stroke();
    }

    drawMeter(ctx, f, x, y, w, flip) {
      const h = 14, segW = (w - 8) / 3;
      const full = Math.floor(f.meter / 100);
      for (let i = 0; i < 3; i++) {
        const sx = flip ? x + w - (i + 1) * segW - i * 4 : x + i * (segW + 4);
        ctx.fillStyle = 'rgba(10,5,20,0.8)';
        ctx.fillRect(sx - 2, y - 2, segW + 4, h + 4);
        const frac = U.clamp((f.meter - i * 100) / 100, 0, 1);
        if (frac > 0) {
          const ready = frac >= 1;
          const pulse = ready ? 0.75 + 0.25 * Math.sin(this.time * 8 + i) : 1;
          ctx.fillStyle = ready ? (full >= 3 ? 'rgba(255,210,63,' + pulse + ')' : 'rgba(80,200,255,' + pulse + ')') : 'rgba(80,140,200,0.85)';
          if (flip) ctx.fillRect(sx + segW * (1 - frac), y, segW * frac, h); else ctx.fillRect(sx, y, segW * frac, h);
        }
      }
      ctx.font = '20px Bangers, Impact, sans-serif';
      ctx.textBaseline = 'top';
      ctx.lineWidth = 4; ctx.strokeStyle = '#120818';
      const label = full >= 3 ? 'ULTIME PRÊTE !' : 'ULTRA ×' + full;
      const lx = flip ? x + w : x;
      ctx.textAlign = flip ? 'right' : 'left';
      ctx.strokeText(label, lx, y + h + 4);
      ctx.fillStyle = full >= 3 ? '#ffd23f' : full > 0 ? '#7fe3ff' : '#9a90b0';
      ctx.fillText(label, lx, y + h + 4);
    }

    renderTrainingInfo(ctx, W, H) {
      const T = this.training, I = this.trainingInfo;
      ctx.fillStyle = 'rgba(10,5,20,0.6)';
      ctx.fillRect(W / 2 - 200, 108, 400, 56);
      ctx.font = '18px "Russo One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText('Dernier combo : ' + I.lastCombo + ' coups — ' + I.lastDmg + ' dégâts', W / 2, 124);
      ctx.fillStyle = '#9fe8ff';
      ctx.fillText('Mannequin : ' + (T.dummyLabel || '') + (this.debugBoxes ? ' · Boîtes visibles' : ''), W / 2, 148);
    }
  }

  C.Battle = Battle;
})(window.CDL = window.CDL || {});
