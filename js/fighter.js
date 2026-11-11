/* Choc des Légendes — logique d'un combattant (machine à états, physique, animation).
   Le combat se joue en 2D dans une arène rendue en 3D : chaque combattant a une position x le long de
   la ligne de combat et une hauteur y. On avance, on recule, on saute et on s'accroupit ; il n'y a pas de
   déplacement latéral (zl reste à 0, et la direction de visée « aim » pointe toujours vers l'adversaire). */
(function (C) {
  'use strict';
  const U = C.U, FX = C.FX, Rig = C.Rig, Poses = C.Poses;
  // Téléportations : deux de suite, puis une seconde (60 images) de recharge
  const TP_CHARGES = 2, TP_RELOAD = 60;
  const GRAV = 0.95, MAX_FALL = 22, BUFFER = 8;
  const ULTRA_HOLD = 12; // ULTRA maintenu plus longtemps : charge de l'aura au lieu du Super
  const BTN = ['a', 'b', 'c', 'g', 's', 't'];
  const EMPTY = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, c: 0, g: 0, s: 0, t: 0 };
  const ACTIONABLE = { idle: 1, air: 1, guard: 1 };

  class Fighter {
    constructor(battle, side, cfg) {
      this.battle = battle;
      this.side = side;
      this.cfg = cfg;
      this.ch = C.Roster.get(cfg.char);
      this.look = C.Roster.look(cfg.char, cfg.costume || 0, cfg.shadow);
      this.shadowTint = cfg.shadow ? '#3b0f5c' : null;
      this.size = this.look.scale || 1;
      this.dims = Rig.dims(this.look);
      this.stats = Object.assign({}, this.ch.stats);
      this.maxHp = Math.round(this.stats.hp * (cfg.hpMul || 1));
      this.dmgMul = cfg.dmgMul || 1;
      this.controller = cfg.controller || null;
      this.human = !!(this.controller && !this.controller.isCPU);
      // Coups spéciaux faciles (joueurs humains) : SPÉCIAL seul choisit la technique selon la situation
      this.easy = !!(cfg.easy && this.controller && !this.controller.isCPU);
      this.easyTurn = 0;
      this.name = cfg.shadow ? 'Ombre de ' + this.ch.name : this.ch.name;
      this.moves = C.Moves.build(this);
      this.wins = 0;
      this.meter = 0;
      this.J = {};
      this.pose = Rig.completePose(Poses.get('idle', this.look));
      this.tmpPose = {};
      this.matchStats = { dmg: 0, maxCombo: 0, hits: 0, parries: 0, blocks: 0, specials: 0, supers: 0, throws: 0 };
      this.resetRound(0, 1);
    }

    resetRound(x, facing) {
      this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
      this.zl = 0; this.vzl = 0;
      this.cool = {};
      this.tpLeft = TP_CHARGES; this.tpCool = 0; this.tpMsg = 0;
      this.facing = facing;
      this.aim = this.battle.dirYaw(this);
      this.hp = this.maxHp; this.dispHp = this.maxHp; this.redHp = this.maxHp;
      this.guard = 100; this.guardRegenDelay = 0;
      this.state = 'intro'; this.st = 0;
      this.move = null; this.mf = 0;
      this.onGround = true; this.airJumps = this.stats.airJumps || 0;
      this.hitstun = 0; this.blockstun = 0; this.hitstop = 0;
      this.comboHits = 0; this.comboDmg = 0; this.juggle = 0;
      this.invuln = 0; this.flash = 0;
      this.awakened = 0; this.charging = false;
      this.buf = { a: 0, b: 0, c: 0, g: 0, s: 0, t: 0 };
      this.sHold = 0; this.sPending = false; this.sCharge = false;
      this.heroAwake = false;
      this.inp = EMPTY; this.prev = EMPTY;
      this.lastTap = { dir: 0, t: -99 };
      this.frame = 0;
      this.parryWin = 0; this.parryCool = 0;
      this.hidden = false; this.weaponAway = false;
      this.grabbedBy = null; this.lockedBy = null;
      this.walkPhase = 0; this.crouching = false;
      this.kdOnLand = false; this.fastFall = false;
      this.counterHitWindow = false;
      this.auraColor = null; this.auraT = 0;
      this.lastHitLevel = 'mid';
      this.dashCool = 0;
      this.koDone = false;
      this.pose = Rig.completePose(Poses.get('idle', this.look));
    }

    // ------------------------------------------------------------ utilitaires
    get opp() { return this.battle.opponentOf(this); }
    height() { return this.dims.height * this.size * (this.crouching ? 0.62 : 1); }
    hover() { return this.look.hover ? this.look.hover + Math.sin(this.battle.time * 3 + this.side) * 4 : 0; }
    holdFwd() { return this.facing > 0 ? this.inp.r : this.inp.l; }
    holdBack() { return this.facing > 0 ? this.inp.l : this.inp.r; }
    isAir() { return !this.onGround; }
    isCrouching() { return this.crouching && this.onGround; }
    actionable() { return !!ACTIONABLE[this.state]; }
    power() { return this.stats.power * this.dmgMul * (this.awakened > 0 ? 1.2 : 1); }
    speedMul() { return this.awakened > 0 ? 1.12 : 1; }
    jointWorld(name) {
      if (!this.J || !this.J.hip) return [this.x + this.facing * 40 * this.size, this.y - this.height() * 0.6];
      return Rig.worldPoint(this.J, name, this.look, this.facing, this.x, this.y - this.hover());
    }
    weaponTipWorld() { return Rig.weaponTip(this.J, this.look, this.facing, this.x, this.y - this.hover()); }
    front(dist) { return this.x + this.facing * dist; }
    gainMeter(n) { this.meter = U.clamp(this.meter + n, 0, 300); }
    // ------------------------------------------------------------ visée (3D)
    // Direction regardée, en angle dans l'arène (sert à orienter le modèle 3D)
    aimYaw() { return this.aim; }
    // Écart entre la direction visée et la direction réelle de l'adversaire
    aimErr() {
      let e = (this.aim - this.battle.dirYaw(this)) % (Math.PI * 2);
      if (e > Math.PI) e -= Math.PI * 2; else if (e < -Math.PI) e += Math.PI * 2;
      return e;
    }
    // Distance latérale entre la ligne d'attaque et la cible : au-delà de la largeur du coup, il passe à côté
    aimMiss(t) {
      return Math.abs(Math.abs(t.x - this.x) * Math.sin(this.aimErr()));
    }
    updateAim() {
      const want = this.battle.dirYaw(this);
      let e = (this.aim - want) % (Math.PI * 2);
      if (e > Math.PI) e -= Math.PI * 2; else if (e < -Math.PI) e += Math.PI * 2;
      let rate = 9;
      if (this.state === 'move' && this.move) {
        const m = this.move;
        // on suit l'adversaire pendant la préparation du coup, plus (ou très peu) une fois le coup parti
        rate = this.mf < m._t0 ? (m.track != null ? m.track : 0.02) : (m.trackLate || 0);
      }
      this.aim = Math.abs(e) <= rate ? want : want + e - Math.sign(e) * rate;
    }
    faceOpponent() {
      const o = this.opp;
      if (Math.abs(o.x - this.x) > 4) this.facing = o.x > this.x ? 1 : -1;
    }
    invulnerable() {
      if (this.invuln > 0 || this.hidden) return true;
      if (this.state === 'knockdown' || this.state === 'getup' || this.state === 'intro' || this.state === 'win' || this.state === 'lose') return true;
      if (this.state === 'grabbed' || this.state === 'locked') return true;
      if (this.state === 'ko') return true;
      if (this.state === 'move' && this.move.invuln && this.mf >= this.move.invuln[0] && this.mf < this.move.invuln[1]) return true;
      if (this.state === 'airhit' && this.juggle > 9) return true;
      return false;
    }
    projInvulnerable() {
      return this.state === 'move' && this.move.projInvuln && this.mf >= this.move.projInvuln[0] && this.mf < this.move.projInvuln[1];
    }
    hurtbox() {
      if (this.invulnerable()) return null;
      const H = this.dims.height * this.size;
      const hv = this.hover();
      const big = this.look.build === 'heavy' || this.look.build === 'titan' || this.look.build === 'dragon';
      const w = (big ? 66 : this.look.build === 'small' ? 56 : 54) * this.size;
      let h = H * 0.95, y = this.y - h - hv;
      if (this.isCrouching() || (this.state === 'move' && this.move.low)) { h = H * 0.62; y = this.y - h - hv; }
      else if (!this.onGround) { h = H * 0.82; y = this.y - H * 0.92 - hv; }
      return { x: this.x - w / 2, y, w, h };
    }
    pushWidth() { return (this.look.build === 'small' ? 40 : this.look.build === 'heavy' || this.look.build === 'titan' || this.look.build === 'dragon' ? 62 : 50) * this.size; }

    // Boîtes de coups actives du mouvement courant
    activeHits() {
      if (this.state !== 'move' || !this.move.hits) return null;
      const out = [];
      const f = this.mf;
      const hits = this.move.hits;
      for (let i = 0; i < hits.length; i++) {
        const h = hits[i];
        if (f < h.f0 || f >= h.f1) continue;
        const last = this.moveHitIds[i];
        if (last !== undefined) {
          if (!h.multi || f - last < h.multi) continue;
        }
        const s = this.size * (h.fixedSize ? 1 : 1);
        const bx = h.box[0] * s, by = h.box[1] * s, bw = h.box[2] * s, bh = h.box[3] * s;
        const rx = this.facing > 0 ? this.x + bx : this.x - bx - bw;
        out.push({ idx: i, hit: h, rect: { x: rx, y: this.y - this.hover() * (h.hoverRel ? 1 : 0) + by, w: bw, h: bh } });
      }
      return out;
    }

    // ------------------------------------------------------------ entrées
    readInput() {
      // copie dans un tampon alterné (les contrôleurs peuvent renvoyer le même objet)
      this.prev = this.inp;
      const src = this.controller ? (this.controller.get(this) || EMPTY) : EMPTY;
      const dst = this.prev === this._inA ? (this._inB || (this._inB = {})) : (this._inA || (this._inA = {}));
      for (const k in dst) dst[k] = 0;
      for (const k in src) dst[k] = src[k];
      this.inp = dst;
      const i = this.inp, p = this.prev;
      for (let k = 0; k < BTN.length; k++) {
        const b = BTN[k];
        if (b === 's') continue;
        if (i[b] && !p[b]) this.buf[b] = BUFFER;
        else if (this.buf[b] > 0) this.buf[b]--;
      }
      // ULTRA : appui bref = Super / Ultime ; maintenu = charge de l'aura.
      // Avec au moins une barre et les mains libres, on attend de savoir s'il s'agit d'un appui bref.
      if (this.buf.s > 0) this.buf.s--;
      if (i.s && !p.s) {
        this.sHold = 1;
        const free = this.onGround && (this.state === 'idle' || this.state === 'guard' || this.state === 'dash');
        if (this.meter >= 100 && free && this.meter < 300 && this.moves.CHARGE) this.sPending = true;
        else this.buf.s = BUFFER;
      } else if (i.s) {
        this.sHold++;
        if (this.sPending && this.sHold >= ULTRA_HOLD) { this.sPending = false; this.sCharge = true; this.buf.s = BUFFER; }
      } else if (p.s) {
        if (this.sPending) this.buf.s = BUFFER;
        this.sPending = false; this.sCharge = false;
      }
      // double-tap pour les ruées
      const fwdNow = this.holdFwd(), backNow = this.holdBack();
      const fwdPrev = this.facing > 0 ? p.r : p.l, backPrev = this.facing > 0 ? p.l : p.r;
      this.dashReq = 0;
      if (fwdNow && !fwdPrev) {
        if (this.lastTap.dir === 1 && this.frame - this.lastTap.t < 13) this.dashReq = 1;
        this.lastTap = { dir: 1, t: this.frame };
      } else if (backNow && !backPrev) {
        if (this.lastTap.dir === -1 && this.frame - this.lastTap.t < 13) this.dashReq = -1;
        this.lastTap = { dir: -1, t: this.frame };
      }
      if (i.g && !p.g) {
        if (this.parryCool <= 0) { this.parryWin = this.battle.parryWindow || 6; this.parryCool = 22; }
      }
      this.upPressed = i.u && !p.u;
      this.downPressed = i.d && !p.d;
      if (i.dash) this.dashReq = i.dash;
    }

    // Choix d'un coup selon les boutons en mémoire (peek = sans consommer)
    pickMove(peek) {
      const b = this.buf, i = this.inp, M = this.moves;
      const air = !this.onGround;
      const fwd = this.holdFwd(), back = this.holdBack();
      // Variantes des coups : joystick vers le haut = coups « vers le haut » (lanceur, envol…),
      // joystick vers le bas = coups bas et techniques défensives. L'IA les demande directement (mu / md).
      const modU = !!(i.mu || i.u);
      const modD = !!(i.md || i.d);
      let id = null, key = null;
      if (b.s) {
        key = 's';
        if (this.sCharge || this.meter < 100) { if (M.CHARGE && i.s && !air && this.meter < 300) id = 'CHARGE'; }
        else if (this.meter >= 300 && !i.d && M.X && (!air || M.X.air)) id = 'X';
        else if (this.meter >= 100 && M.S && (!air || M.S.air)) id = (M.S.cond && !M.S.cond(this) && M.S2) ? 'S2' : 'S';
      }
      if (!id && b.t) { key = 't'; id = air ? (b.a || b.b ? null : 'AL') : 'GRAB'; }
      if (!id && b.c) {
        key = 'c';
        id = modU ? 'U' : modD ? 'D' : (fwd || back) ? 'F' : (this.easy ? this.autoSpecial() : 'N');
        if (air && M['A' + id]) id = 'A' + id;
        else if (air && M[id] && !M[id].air) id = null;
        else if (!air && M[id] && M[id].air === 'only') id = null;
      }
      if (!id && b.b) { key = 'b'; id = air ? 'AH' : modU ? 'UH' : modD ? 'DH' : (fwd && M.FH ? 'FH' : 'H'); }
      if (!id && b.a) {
        key = 'a'; id = air ? 'AL' : modD ? 'DL' : 'L1';
        // Léger → Léger → Léger : chaque appui pendant le coup enchaîne le suivant
        // (coups spéciaux faciles : un 4e appui termine par une technique spéciale)
        if (id === 'L1' && this.state === 'move' && this.move) {
          const cur = this.move.id;
          if (cur === 'L1' && M.L2) id = 'L2';
          else if (cur === 'L2' && M.L3) id = 'L3';
          else if (cur === 'L3' && this.easy) id = this.autoSpecial() || 'L1';
        }
      }
      if (!id || !M[id]) return null;
      if (!peek) b[key] = 0;
      return id;
    }

    // Technique choisie automatiquement (mode « coups spéciaux faciles »)
    // Le coup peut-il partir maintenant ? (temps de recharge : roulade, téléportations)
    ready(def) {
      if (!def) return false;
      if (def.teleport && this.tpCool > 0) return false;
      if (def.cooldown && this.cool[def.id] > 0) return false;
      return true;
    }
    // Téléportation demandée pendant la recharge : le joueur voit pourquoi rien ne se passe
    teleportRefused() {
      if (!this.human || this.frame - this.tpMsg < 40) return;
      this.tpMsg = this.frame;
      FX.text(this.x, this.y - this.height() - 40, 'TÉLÉPORTATION EN RECHARGE', '#9fe8ff', 22, 40);
    }
    autoSpecial() {
      const M = this.moves, o = this.opp, air = !this.onGround;
      const dist = o ? Math.abs(o.x - this.x) : 400;
      // Seulement des techniques offensives (pas de bouclier, de contre ni de concentration)
      const ok = (k) => M[k] && (air ? M[k].air : M[k].air !== 'only') && !M[k].reflect && !M[k].counter &&
        !(M[k].ai && M[k].ai.role === 'charge') && this.ready(M[k]);
      let pick;
      if (o && !o.onGround && dist < 240) pick = ['U', 'N'];
      else if (dist > 380) pick = ['N', 'F'];
      else if (dist > 170) pick = ['F', 'N'];
      else pick = (this.easyTurn++ % 2) ? ['U', 'F'] : ['F', 'U'];
      for (const k of pick) if (ok(k)) return k;
      return ok('N') ? 'N' : null;
    }

    // ------------------------------------------------------------ mise à jour
    update() {
      this.frame++;
      if (this.hitstop > 0) { this.hitstop--; this.updatePose(true); return; }
      this.readInput();
      this.updateAim();
      if (this.flash > 0) this.flash -= 0.12;
      if (this.invuln > 0) this.invuln--;
      if (this.parryWin > 0) this.parryWin--;
      if (this.parryCool > 0) this.parryCool--;
      if (this.dashCool > 0) this.dashCool--;
      for (const k in this.cool) if (this.cool[k] > 0) this.cool[k]--;
      if (this.tpCool > 0) this.tpCool--;
      if (this.awakened > 0) {
        this.awakened--;
        if (this.awakened % 3 === 0) {
          const H = this.dims.height * this.size;
          FX.auraParticle(this.x + U.rand(-30, 30) * this.size, this.y - U.rand(0, H * 0.9), this.ch.awakenAura || '#ffd84a');
        }
        if (this.awakened % 47 === 0) FX.lightning(this.x + U.rand(-30, 30), this.y - U.rand(60, 180), this.x + U.rand(-40, 40), this.y - U.rand(20, 120), '#9fe8ff', 2, 4);
        if (this.awakened === 0) { FX.energyBurst(this.x, this.y - 100, this.ch.awakenAura || '#ffd84a', 12); }
      }
      // Régénération (Rouge Immortel) : la vie remonte doucement après deux secondes sans prendre de coup
      const rg = this.ch.stats.regen;
      if (rg) {
        if (this.hp < (this.hpSeen != null ? this.hpSeen : this.hp)) this.calm = 0; else this.calm = (this.calm || 0) + 1;
        if (this.calm > 120 && this.hp > 0 && this.hp < this.maxHp && this.state !== 'ko' && this.battle.phase === 'fight') {
          this.hp = Math.min(this.maxHp, this.hp + rg);
          if (this.frame % 22 === 0) FX.text(this.x + U.rand(-26, 26), this.y - this.height() * U.rand(0.4, 0.9), '+', '#7dff8a', 22, 26);
        }
        this.hpSeen = this.hp;
      }
      // Régénération de la garde
      if (this.guardRegenDelay > 0) this.guardRegenDelay--;
      else if (this.guard < 100) this.guard = Math.min(100, this.guard + 0.3);
      // barre de vie affichée
      this.dispHp = U.approach(this.dispHp, this.hp, Math.max(4, (this.dispHp - this.hp) * 0.25));
      if (this.comboHits === 0 || this.state === 'idle') this.redHp = U.approach(this.redHp, this.hp, 6);

      this.st++;
      this.stepState();
      this.physics();
      this.updatePose(false);
    }

    stepState() {
      const s = this.state;
      switch (s) {
        case 'intro': case 'win': case 'lose': this.vx *= 0.8; break;
        case 'idle': this.stepIdle(); break;
        case 'guard': this.stepGuard(); break;
        case 'jumpsquat': {
          const id = this.pickMove(true);
          if (id === 'UH' || id === 'U' || id === 'X' || id === 'S') { this.pickMove(false); this.startMove(id); break; }
          if (this.st >= 3) this.doJump(this.jumpDir);
          break;
        }
        case 'air': this.stepAir(); break;
        case 'landing': if (this.st >= this.landLag) this.toIdle(); break;
        case 'dash': {
          const sp = this.stats.dash * this.speedMul();
          this.vx = this.facing * sp * (this.st < 10 ? 1 : 0.5);
          if (this.st % 4 === 0) FX.dust(this.x, 0, this.facing, 1);
          if (this.st >= 14) this.toIdle();
          else if (this.st > 3) { const id = this.pickMove(false); if (id) this.startMove(id); }
          break;
        }
        case 'backdash': {
          if (this.st === 1) { this.vx = -this.facing * this.stats.dash * 0.85; this.vy = -5; this.onGround = false; }
          if (this.st >= 18 && this.onGround) this.toIdle();
          break;
        }
        case 'move': this.stepMove(); break;
        case 'hitstun':
          if (--this.hitstun <= 0) this.toIdle();
          break;
        case 'blockstun':
          if (--this.blockstun <= 0) { this.state = this.inp.g ? 'guard' : 'idle'; this.st = 0; }
          break;
        case 'airhit':
          // atterrissage géré dans land()
          if (this.st > 200) this.state = 'air';
          break;
        case 'knockdown':
          this.vx *= 0.85;
          if (this.hp <= 0) break;
          if (this.st >= (this.kdTime || 36)) { this.state = 'getup'; this.st = 0; }
          break;
        case 'getup':
          if (this.st >= 16) { this.invuln = 4; this.toIdle(); }
          break;
        case 'stun':
          this.vx *= 0.8;
          if (this.st >= this.stunTime) this.toIdle();
          break;
        case 'grabbed': case 'locked': break;
        case 'ko': this.vx *= 0.9; break;
      }
    }

    toIdle() {
      this.move = null;
      this.state = this.onGround ? 'idle' : 'air';
      this.st = 0;
      if (this.onGround) { this.comboHits = 0; this.comboDmg = 0; this.juggle = 0; }
    }

    stepIdle() {
      const i = this.inp;
      this.faceOpponent();
      this.crouching = !!i.d;
      // coups
      const id = this.pickMove(false);
      if (id && this.startMove(id)) return;
      if (i.u) { this.state = 'jumpsquat'; this.st = 0; this.jumpDir = this.holdFwd() ? 1 : this.holdBack() ? -1 : 0; this.crouching = false; return; }
      if (i.g) { this.state = 'guard'; this.st = 0; return; }
      if (this.dashReq === 1 && this.dashCool <= 0) { this.state = 'dash'; this.st = 0; this.dashCool = 6; C.Audio.play('dash'); FX.dust(this.x, 0, this.facing, 4); return; }
      if (this.dashReq === -1 && this.dashCool <= 0) { this.state = 'backdash'; this.st = 0; this.invuln = 6; this.dashCool = 10; C.Audio.play('dash'); FX.dust(this.x, 0, -this.facing, 4); return; }
      if (this.crouching) { this.vx *= 0.6; this.walking = 0; return; }
      const sp = this.stats.walk * this.speedMul();
      if (this.holdFwd()) { this.vx = this.facing * sp; this.walking = 1; }
      else if (this.holdBack()) { this.vx = -this.facing * sp * 0.82; this.walking = -1; }
      else { this.vx *= 0.6; this.walking = 0; }
      if (this.walking && this.st % 18 === 0) C.Audio.play('footstep');
    }

    stepGuard() {
      const i = this.inp;
      this.faceOpponent();
      this.vx *= 0.7;
      this.crouching = !!i.d;
      if (!i.g) { this.toIdle(); return; }
      // Projection depuis la garde (Garde + Léger)
      if (this.buf.a && this.st > 1) { this.buf.a = 0; this.startMove('GRAB'); return; }
      const id = this.pickMove(true);
      if (id === 'X' || id === 'S' || (id && this.moves[id] && this.moves[id].kind === 'special')) { this.pickMove(false); this.startMove(id); return; }
      if (i.u) { this.state = 'jumpsquat'; this.st = 0; this.jumpDir = this.holdFwd() ? 1 : this.holdBack() ? -1 : 0; }
    }

    doJump(dir) {
      this.state = 'air'; this.st = 0;
      this.onGround = false;
      this.vy = -this.stats.jump;
      this.vx = dir * (this.stats.walk * 1.05 + 1.5) * this.speedMul();
      this.crouching = false;
      this.fastFall = false;
      C.Audio.play('jump');
      FX.dust(this.x, 0, -dir || 1, 3);
    }

    stepAir() {
      const i = this.inp;
      const id = this.pickMove(false);
      if (id && this.startMove(id)) return;
      if (this.upPressed && this.airJumps > 0 && this.st > 4) {
        this.airJumps--;
        this.vy = -this.stats.jump * 0.88;
        const dir = this.holdFwd() ? 1 : this.holdBack() ? -1 : 0;
        if (dir) this.vx = dir * this.facing * (this.stats.walk * 1.05 + 1.5);
        this.faceOpponent();
        FX.ring && FX.add({ t: 'ring', x: this.x, y: this.y, size: 10, grow: 3, color: '#ffffff', life: 10, width: 3 });
        C.Audio.play('jump');
        this.st = 0;
      }
      // contrôle aérien léger
      if (i.l) this.vx = U.approach(this.vx, -this.stats.walk * 1.1, 0.25);
      if (i.r) this.vx = U.approach(this.vx, this.stats.walk * 1.1, 0.25);
      if (this.downPressed && this.vy > -4) this.fastFall = true;
    }

    // ------------------------------------------------------------ coups
    startMove(id) {
      const def = typeof id === 'string' ? this.moves[id] : id;
      if (!def) return false;
      if (def.cost && this.meter < def.cost) return false;
      if (def.air === 'only' && this.onGround) return false;
      if (!def.air && !this.onGround) return false;
      if (def.cond && !def.cond(this, this.battle)) return false;
      if (this.weaponAway && def.needWeapon) return false;
      // temps de recharge propre à certains coups (compté à partir de la fin du coup)
      if (def.cooldown) {
        if (this.cool[def.id] > 0) return false;
        this.cool[def.id] = (def.frames || 0) + def.cooldown;
      }
      // Téléportations (toutes celles du combattant comptent ensemble) : deux de suite au plus, puis une
      // seconde de recharge qui commence à la fin de la deuxième ; ensuite, de nouveau deux.
      if (def.teleport) {
        if (this.tpCool > 0) { this.teleportRefused(); return false; }
        if (--this.tpLeft <= 0) { this.tpLeft = TP_CHARGES; this.tpCool = (def.frames || 0) + TP_RELOAD; }
      }
      if (def.cost) this.meter -= def.cost;
      if (def._t0 == null) {
        // première image active : jusque-là, le combattant peut encore ajuster sa visée
        let t0 = 99;
        if (def.hits) def.hits.forEach((h) => { t0 = Math.min(t0, h.f0); });
        if (def.spawn) def.spawn.forEach((sp) => { t0 = Math.min(t0, sp.f); });
        def._t0 = t0 === 99 ? 8 : t0;
      }
      this.move = def; this.mf = 0; this.state = 'move'; this.st = 0;
      this.moveHit = false; this.moveContact = false; this.moveHitIds = {}; this.md = {};
      this.animFrom = Object.assign({}, this.pose);
      this.crouching = !!def.low;
      if (def.kind === 'special') this.matchStats.specials++;
      if (def.kind === 'super' || def.kind === 'ultimate') this.matchStats.supers++;
      if (def.face !== false && this.onGround) this.faceOpponent();
      if (def.cine) this.battle.superFlash(this, def);
      if (def.onStart) def.onStart(this, this.battle);
      if (def.whiffSfx) C.Audio.play(def.whiffSfx);
      return true;
    }

    stepMove() {
      const m = this.move, f = this.mf;
      if (m.vel) {
        for (let k = 0; k < m.vel.length; k++) {
          const v = m.vel[k];
          if (f >= v[0] && f <= (v[3] != null ? v[3] : v[0])) {
            if (v[1] != null) this.vx = v[1] * this.facing * (m.kind === 'normal' ? 1 : this.speedMul());
            if (v[2] != null) { this.vy = v[2]; if (v[2] < 0) this.onGround = false; }
          }
        }
      }
      if (m.sfx) for (let k = 0; k < m.sfx.length; k++) if (m.sfx[k][0] === f) C.Audio.play(m.sfx[k][1]);
      if (m.spawn) for (let k = 0; k < m.spawn.length; k++) if (m.spawn[k].f === f) m.spawn[k].fn(this, this.battle);
      if (m.onFrame) m.onFrame(this, this.battle, f);
      if (this.state !== 'move' || this.move !== m) return;
      if (m.aura) {
        this.auraColor = m.aura === true ? this.ch.aura : m.aura;
        if (f % 2 === 0) FX.auraParticle(this.x + U.rand(-28, 28) * this.size, this.y - U.rand(0, this.height() * 0.9), this.auraColor);
      }
      if (this.tryCancel(m, f)) return;
      this.mf++;
      if (this.mf >= m.frames) {
        if (m.loopWhile && m.loopWhile(this, this.battle)) { this.mf = m.loopFrom || 0; return; }
        this.endMove();
      }
    }

    tryCancel(m, f) {
      // Annulation en saut après un lanceur
      if (m.jumpCancel && this.moveHit && f >= m.jumpCancel && this.inp.u) {
        this.move = null; this.state = 'air'; this.doJump(this.holdFwd() ? 1 : this.holdBack() ? -1 : 0); return true;
      }
      const c = m.cancel;
      if (!c) return false;
      if (f < c.from || f > c.to) return false;
      const ok = c.on === 'any' || (c.on === 'hit' && this.moveHit) || (c.on !== 'hit' && this.moveContact);
      if (!ok) return false;
      const id = this.pickMove(true);
      if (!id) return false;
      const def = this.moves[id];
      if (!def) return false;
      const into = c.into;
      const allowed = into.indexOf(id) >= 0 || into.indexOf(def.kind) >= 0 ||
        (def.kind === 'ultimate' && into.indexOf('super') >= 0);
      if (!allowed) return false;
      if (def.cost && this.meter < def.cost) return false;
      if (!this.ready(def)) { if (def.teleport) this.teleportRefused(); return false; }
      this.pickMove(false);
      return this.startMove(id);
    }

    endMove() {
      const m = this.move;
      this.auraColor = null;
      if (m && m.onEnd) m.onEnd(this, this.battle);
      this.move = null;
      if (this.state === 'move') {
        this.state = this.onGround ? 'idle' : 'air';
        this.st = 0;
        if (this.onGround && m && m.recover) { this.state = 'landing'; this.landLag = m.recover; }
      }
      this.hidden = false;
    }

    // ------------------------------------------------------------ physique
    physics() {
      const s = this.state;
      if (s === 'grabbed' || s === 'locked') return;
      const m = this.move;
      const noGrav = s === 'move' && m && m.noGrav && this.mf >= m.noGrav[0] && this.mf < m.noGrav[1];
      if (!this.onGround && !noGrav) {
        let g = GRAV;
        if (this.stats.float && (s === 'air' || s === 'move')) g *= 0.72;
        if (this.fastFall && s === 'air') g *= 1.7;
        if (s === 'airhit' || s === 'ko') g *= 0.92;
        this.vy = Math.min(this.vy + g, MAX_FALL);
      } else if (noGrav) {
        this.vy *= 0.85;
      }
      if (s === 'move' && this.vx) {
        // un coup en déplacement part dans la direction visée, pas forcément vers l'adversaire
        const e = this.aimErr();
        this.x += this.vx * Math.cos(e);
        this.zl += this.vx * Math.sin(e);
      } else this.x += this.vx;
      this.zl += this.vzl;
      if (this.onGround) this.vzl = 0;
      this.y += this.vy;
      if (this.y >= 0) {
        this.y = 0;
        const was = this.onGround;
        this.onGround = true;
        if (!was) this.land();
        if (this.vy > 0) this.vy = 0;
      } else {
        this.onGround = false;
      }
      if (this.onGround) {
        if (s === 'hitstun' || s === 'blockstun') this.vx *= 0.86;
        else if (s === 'move') this.vx *= (m && m.slide) ? m.slide : 0.78;
        else if (s === 'landing' || s === 'getup' || s === 'stun' || s === 'guard') this.vx *= 0.7;
      }
      const st = this.battle.stage;
      const lim = 40 * this.size;
      if (this.x < st.left + lim) { this.x = st.left + lim; this.atWall = -1; }
      else if (this.x > st.right - lim) { this.x = st.right - lim; this.atWall = 1; }
      else this.atWall = 0;
    }

    land() {
      const s = this.state;
      this.airJumps = this.stats.airJumps || 0;
      this.fastFall = false;
      if (s === 'air' || s === 'backdash') {
        this.state = 'landing'; this.st = 0; this.landLag = 3; this.vx *= 0.5;
        FX.dust(this.x, 0, 1, 3); FX.dust(this.x, 0, -1, 3);
        C.Audio.play('land');
      } else if (s === 'move') {
        const m = this.move;
        if (m.onLand) { m.onLand(this, this.battle); return; }
        if (m.air || m.landEnd) {
          this.auraColor = null;
          this.move = null; this.hidden = false;
          this.state = 'landing'; this.st = 0; this.landLag = m.landLag || 5; this.vx *= 0.4;
          FX.dust(this.x, 0, 1, 3); FX.dust(this.x, 0, -1, 3);
          C.Audio.play('land');
        }
      } else if (s === 'airhit' || s === 'ko') {
        C.Audio.play('land');
        FX.dust(this.x, 0, 1, 5, true); FX.dust(this.x, 0, -1, 5, true);
        this.battle.shake(4);
        if (this.hp <= 0) { this.state = 'ko'; this.st = 0; this.vx *= 0.5; return; }
        const tech = !this.kdOnLand && (this.inp.g || this.inp.a || this.inp.b) && this.controller;
        if (tech) {
          this.state = 'getup'; this.st = 8; this.invuln = 12;
          FX.text(this.x, this.y - 140, 'RÉCUPÉRATION', '#9fe8ff', 22, 30);
        } else {
          this.state = 'knockdown'; this.st = 0; this.kdTime = this.kdOnLand ? 40 : 26;
        }
        this.kdOnLand = false;
        this.juggle = 0;
        this.vx *= 0.4;
      } else if (s === 'hitstun') {
        // reste en hitstun
      } else if (s === 'jumpsquat' || s === 'landing') {
        // rien
      } else if (s === 'grabbed' || s === 'locked') {
        // rien
      }
    }

    // ------------------------------------------------------------ réactions aux coups
    isBlockingAgainst(srcX, hit) {
      if (hit.unblockable) return false;
      const s = this.state;
      if (!this.onGround) return false;
      const dirToSrc = srcX > this.x ? 1 : -1;
      let blocking = false;
      if (s === 'guard' || s === 'blockstun') blocking = true;
      else if ((s === 'idle' || s === 'landing') && (dirToSrc > 0 ? this.inp.l : this.inp.r)) blocking = true;
      if (!blocking) return false;
      const crouch = !!this.inp.d;
      // Garde haute (debout) : arrête les coups normaux et les coups plongeants, pas les coups bas.
      // Garde basse (accroupi) : arrête les coups normaux et les coups bas, pas les coups plongeants.
      if ((hit.level === 'low' && !crouch) || (hit.level === 'overhead' && crouch)) {
        // le joueur gardait, mais à la mauvaise hauteur : on lui dit pourquoi le coup est passé
        if (this.human) FX.text(this.x, this.y - this.height() - 34, hit.level === 'low' ? 'COUP BAS : GARDE BASSE !' : 'COUP PLONGEANT : GARDE HAUTE !', '#ffb347', 24, 46);
        return false;
      }
      this.crouching = crouch;
      return true;
    }

    enterBlockstun(frames, pushX) {
      this.state = 'blockstun'; this.st = 0;
      this.move = null; this.auraColor = null;
      this.blockstun = frames;
      this.vx = pushX;
      this.guardRegenDelay = 70;
    }

    enterHit(hit, dirX, stunFrames) {
      this.move = null; this.auraColor = null; this.hidden = false;
      this.vzl = 0;
      this.charging = false;
      const kbx = (hit.kb ? hit.kb[0] : 4) * dirX * (1.15 - this.stats.weight * 0.15);
      const kby = hit.kb ? hit.kb[1] : 0;
      const airborne = !this.onGround || hit.launch || hit.kd;
      this.lastHitLevel = hit.level;
      if (airborne) {
        this.state = 'airhit'; this.st = 0;
        this.vx = kbx;
        this.vy = kby !== 0 ? kby * (1.1 - this.stats.weight * 0.1) : (this.onGround ? -7 : Math.min(this.vy, -4));
        if (this.onGround && this.vy > -3) this.vy = -6;
        this.onGround = false;
        this.kdOnLand = !!hit.kd || this.kdOnLand;
        this.juggle += hit.juggle != null ? hit.juggle : 1;
      } else {
        this.state = 'hitstun'; this.st = 0;
        this.hitstun = stunFrames;
        this.vx = kbx;
      }
      this.crouching = this.crouching && !airborne;
    }

    // ------------------------------------------------------------ animation
    updatePose(frozen) {
      if (frozen) return;
      const L = this.look, s = this.state, t = this.battle.time;
      let target, blend = 0.32;
      switch (s) {
        case 'intro': target = Poses.get(this.st < 60 ? 'intro' : 'idle', L); blend = 0.15; break;
        case 'idle':
          if (this.crouching) { target = Poses.get('crouch', L); blend = 0.4; }
          else if (this.walking && Math.abs(this.vx) > 0.5) {
            this.walkPhase += Math.abs(this.vx) * 0.075;
            target = Poses.walk(L, this.walkPhase, this.walking, this.tmpPose);
            blend = 0.45;
          } else target = Poses.breathe(L, t + this.side, this.tmpPose);
          break;
        case 'guard': case 'blockstun': target = Poses.get(this.crouching ? 'crouch_block' : 'block', L); blend = 0.55; break;
        case 'jumpsquat': target = Poses.get('crouch', L); blend = 0.6; break;
        case 'landing': target = Poses.get('crouch', L); blend = 0.5; break;
        case 'air': target = Poses.get(this.vy < 0 ? 'jump' : 'fall', L); blend = 0.2; break;
        case 'dash': this.walkPhase += 0.45; target = Poses.run(L, this.walkPhase, this.tmpPose); blend = 0.5; break;
        case 'backdash': target = Poses.get('backdash', L); blend = 0.4; break;
        case 'move': target = this.animPose(); blend = 1; break;
        case 'hitstun': {
          const name = this.crouching ? 'hit_crouch' : this.lastHitLevel === 'low' ? 'hit_low' : 'hit';
          target = Poses.get(name, L); blend = this.st < 3 ? 0.7 : 0.15;
          break;
        }
        case 'airhit': target = Poses.get('air_hit', L); blend = 0.35; break;
        case 'knockdown': case 'ko': target = Poses.get('knockdown', L); blend = 0.3; break;
        case 'getup': target = Poses.get('getup', L); blend = 0.3; break;
        case 'stun': target = Poses.get(this.stunPose || 'stunned', L); blend = 0.25; break;
        case 'grabbed': target = Poses.get('grabbed', L); blend = 0.4; break;
        case 'locked': target = Poses.get(this.st % 16 < 8 ? 'hit' : 'air_hit', L); blend = 0.5; break;
        case 'win': target = Poses.get(this.winPose || 'victory', L); blend = 0.12; break;
        case 'lose': target = Poses.get('defeat', L); blend = 0.12; break;
        default: target = Poses.get('idle', L);
      }
      Rig.lerpPose(this.pose, target, blend, this.pose);
      Rig.solve(this.pose, this.dims, this.J);
    }

    animPose() {
      const m = this.move, f = this.mf, A = m.anim;
      let acc = 0, prev = this.animFrom;
      for (let k = 0; k < A.length; k++) {
        const a = A[k];
        const p = a._p || (a._p = {});
        const pose = p[this.look.id] || (p[this.look.id] = typeof a[0] === 'string' ? Poses.get(a[0], this.look) : Rig.completePose(a[0]));
        const dur = a[1];
        if (f < acc + dur) {
          const t = (f - acc + 1) / dur;
          return Rig.lerpPose(prev, pose, a[2] === 'lin' ? t : U.easeOut(t), this.tmpPose);
        }
        acc += dur; prev = pose;
      }
      return prev;
    }

  }

  Fighter.EMPTY = EMPTY;
  C.Fighter = Fighter;
})(window.CDL = window.CDL || {});
