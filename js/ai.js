/* Choc des Légendes — intelligence artificielle des adversaires et mannequin d'entraînement */
(function (C) {
  'use strict';
  const U = C.U;

  const LEVELS = [
    { name: 'Facile', react: 26, think: 30, block: 0.12, parry: 0, anti: 0.12, combo: 0.25, punish: 0.15, special: 0.22, super: 0.25, aggro: 0.35, mistakes: 0.3, tech: 0.05, jump: 0.12 },
    { name: 'Normal', react: 17, think: 18, block: 0.4, parry: 0.02, anti: 0.32, combo: 0.55, punish: 0.4, special: 0.32, super: 0.5, aggro: 0.5, mistakes: 0.14, tech: 0.2, jump: 0.14 },
    { name: 'Difficile', react: 11, think: 11, block: 0.66, parry: 0.08, anti: 0.6, combo: 0.82, punish: 0.72, special: 0.4, super: 0.75, aggro: 0.6, mistakes: 0.06, tech: 0.45, jump: 0.12 },
    { name: 'Légendaire', react: 6, think: 7, block: 0.86, parry: 0.2, anti: 0.85, combo: 0.96, punish: 0.92, special: 0.45, super: 0.92, aggro: 0.66, mistakes: 0.02, tech: 0.7, jump: 0.1 }
  ];

  const COMBOS = {
    martial: [['L1', 'L2', 'L3', 'F'], ['L1', 'L2', 'H', 'N'], ['DL', 'DL', 'L1', 'L2', 'F'], ['L1', 'L2', 'L3', 'S'], ['H', 'U']],
    blade: [['L1', 'L2', 'L3', 'F'], ['DL', 'L1', 'L2', 'H'], ['L1', 'L2', 'H', 'N'], ['L1', 'L2', 'L3', 'S']],
    zone: [['L1', 'L2', 'N'], ['DL', 'DL', 'N'], ['L1', 'L2', 'L3', 'S']]
  };

  function emptyInput() { return { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, c: 0, g: 0, s: 0, t: 0 }; }

  class CPU {
    constructor(level, opts) {
      this.level = U.clamp(level | 0, 0, LEVELS.length - 1);
      this.P = Object.assign({}, LEVELS[this.level], (opts && opts.tweak) || {});
      this.isCPU = true;
      this.t = 0;
      this.hold = { dir: 0, until: 0, down: false, up: false, guard: false };
      this.pulse = null;
      this.nextThink = 0;
      this.plan = null; this.planIdx = 0;
      this.threatSeen = 0; this.threatKey = null; this.threatDecision = null;
      this.lastOppState = null;
      this.techDecided = false;
      this.out = emptyInput();
    }

    press(id, f) {
      // Traduit un identifiant de coup en entrées
      const fwd = f.facing > 0 ? 'r' : 'l';
      const p = { dir: null, btn: null };
      switch (id) {
        case 'L1': case 'L2': case 'L3': case 'AL': p.btn = 'a'; break;
        case 'H': case 'AH': p.btn = 'b'; break;
        case 'UH': p.btn = 'b'; p.dir = 'mu'; break;
        case 'DH': p.btn = 'b'; p.dir = 'md'; break;
        case 'DL': p.btn = 'a'; p.dir = 'md'; break;
        case 'N': p.btn = 'c'; break;
        case 'F': p.btn = 'c'; p.dir = fwd; break;
        case 'U': p.btn = 'c'; p.dir = 'mu'; break;
        case 'D': p.btn = 'c'; p.dir = 'md'; break;
        case 'S': case 'S2': p.btn = 's'; p.dir = f.meter >= 300 ? 'd' : null; break;
        case 'X': p.btn = 's'; break;
        case 'GRAB': p.btn = 't'; break;
      }
      this.pulse = { btn: p.btn, dir: p.dir, frames: 2 };
    }

    has(f, id) { return !!f.moves[id]; }
    role(f, role) {
      const out = [];
      // (les techniques en recharge, comme les téléportations, ne sont pas proposées)
      ['N', 'F', 'U', 'D'].forEach((k) => { const m = f.moves[k]; if (m && m.ai && m.ai.role === role && (!f.ready || f.ready(m))) out.push(k); });
      return out;
    }
    reach(f, id) {
      const m = f.moves[id];
      if (!m || !m.hits || !m.hits.length) return 0;
      let r = 0;
      m.hits.forEach((h) => { r = Math.max(r, (h.box[0] + h.box[2]) * f.size); });
      return r;
    }

    // Menace entrante : coup au corps-à-corps, projectile, saut
    threat(f, o, b) {
      const dist = Math.abs(o.x - f.x);
      if (o.state === 'move' && o.move.hits && o.move.kind !== 'throw') {
        const m = o.move;
        let first = 999, last = -1, reach = 0, level = 'mid';
        m.hits.forEach((h) => { first = Math.min(first, h.f0); last = Math.max(last, h.f1); reach = Math.max(reach, (h.box[0] + h.box[2]) * o.size); if (h.level !== 'mid') level = h.level; });
        const facingMe = (f.x - o.x) * o.facing > -30;
        const moving = m.vel ? 220 : 0;
        if (facingMe && o.mf <= last && dist < reach + 70 + moving) return { type: 'melee', key: 'm' + o.frame + m.id, until: Math.max(0, first - o.mf), level, kind: m.kind };
      }
      if (o.state === 'move' && o.move.kind === 'grab' && dist < 150) return { type: 'grab', key: 'g' + o.frame };
      for (const e of b.entities) {
        if (e.owner !== o || e.dead) continue;
        if (e.isProjectile) {
          const dx = f.x - e.x;
          if (Math.sign(dx) === Math.sign(e.vx) || Math.abs(e.vx) < 0.5) {
            const tt = Math.abs(dx) / Math.max(1, Math.abs(e.vx));
            if (tt < 34 && e.y > f.y - f.height() - 40) return { type: 'proj', key: 'p' + (e._id || (e._id = Math.random())), until: tt, low: e.hit.level === 'low', ent: e };
          }
        } else if (e.isBeam || (e.hitbox && e.hitbox())) {
          const r = e.hitbox && e.hitbox();
          if (r && Math.abs((r.x + r.w / 2) - f.x) < r.w / 2 + 300) return { type: 'beam', key: 'b' + e.life, until: 5 };
        }
      }
      if (!o.onGround && o.vy > -4 && dist < 260 && (o.x - f.x) * (o.vx || 1) < 0 || (!o.onGround && dist < 140)) return { type: 'air', key: 'a' + o.frame, until: 8 };
      return null;
    }

    get(f) {
      const b = f.battle, o = f.opp, P = this.P;
      this.t++;
      const out = this.out;
      out.l = out.r = out.u = out.d = out.a = out.b = out.c = out.g = out.s = out.t = 0; out.dash = 0;
      out.mu = 0; out.md = 0;
      if (b.phase !== 'fight') { this.plan = null; return out; }
      const dist = Math.abs(o.x - f.x);
      const dirTo = o.x > f.x ? 1 : -1;
      const fwdKey = dirTo > 0 ? 'r' : 'l', backKey = dirTo > 0 ? 'l' : 'r';

      // Dégagement de projection
      if (f.state === 'grabbed') {
        if (!this.techDecided) { this.techDecided = true; this.techOk = Math.random() < P.tech; this.techAt = U.randi(2, 9); }
        if (this.techOk && f.st >= this.techAt && f.st <= this.techAt + 1) out.t = 1;
        return out;
      }
      this.techDecided = false;
      // Récupération au sol
      if (f.state === 'airhit' && f.y > -30 && Math.random() < P.tech * 0.5) out.g = 1;

      // Impulsion en cours
      if (this.pulse) {
        const p = this.pulse;
        if (p.dir) out[p.dir] = 1;
        if (p.frames === 2 && p.btn) out[p.btn] = 1;
        if (--p.frames <= 0) this.pulse = null;
        return out;
      }

      // Suite de combo
      if (f.state === 'move' && this.plan) {
        const m = f.move;
        if (f.moveHit && m.cancel && f.mf >= m.cancel.from && f.mf <= m.cancel.to) {
          const next = this.plan[this.planIdx];
          if (next && Math.random() < (P.combo + 0.04)) {
            if ((next === 'S' || next === 'X') && f.meter < 100) { this.plan = null; return out; }
            this.planIdx++;
            this.press(next, f);
            return out;
          }
          this.plan = null;
        }
        if (!f.moveHit && f.mf > 4) this.plan = null;
        return out;
      }
      if (f.state === 'move' && f.move.loopWhile) { if (f.meter < 300 && dist > 380 && !this.threat(f, o, b)) out.c = 1; return out; }

      const actionable = f.state === 'idle' || f.state === 'guard' || f.state === 'air' || f.state === 'blockstun' || f.state === 'landing' || f.state === 'dash';

      // Défense
      const th = this.threat(f, o, b);
      if (th) {
        if (this.threatKey !== th.key) { this.threatKey = th.key; this.threatSeen = this.t; this.threatDecision = null; }
        const seen = this.t - this.threatSeen;
        if (seen >= P.react && actionable) {
          if (!this.threatDecision) this.threatDecision = this.decideDefense(f, o, th, dist);
          const d = this.threatDecision;
          if (d === 'block' || d === 'blocklow') {
            out[backKey] = 1; out.g = (this.level >= 1 && f.state !== 'idle') ? 1 : 0;
            if (d === 'blocklow' || th.level === 'low' || (th.type === 'proj' && th.low)) out.d = 1;
            if (th.level === 'overhead') out.d = 0;
            return out;
          }
          if (d === 'parry') { if (th.until <= 3 || th.type === 'proj') { out.g = 1; this.threatDecision = 'block'; } else out[backKey] = 1; return out; }
          if (d === 'jump') { out.u = 1; out[fwdKey] = 1; this.threatDecision = 'done'; return out; }
          if (d && d.length <= 2 && f.moves[d]) { this.threatDecision = 'done'; this.press(d, f); return out; }
          if (d === 'anti') {
            const anti = this.role(f, 'anti');
            const id = anti.length && Math.random() < 0.6 ? anti[0] : 'UH';
            this.threatDecision = 'done';
            this.press(id, f);
            return out;
          }
        } else if (seen >= P.react && (f.state === 'blockstun')) {
          out[backKey] = 1; if (th.level === 'low') out.d = 1; return out;
        }
      } else this.threatKey = null;

      if (!actionable) return out;
      if (f.state === 'blockstun') { out[backKey] = 1; return out; }

      // Punition
      if (o.state === 'move' && o.move.hits) {
        let last = 0; o.move.hits.forEach((h) => { last = Math.max(last, h.f1); });
        const left = o.move.frames - o.mf;
        if (o.mf > last && left > 10 && dist < 220 && Math.random() < P.punish * 0.25) return this.attack(f, o, dist, true);
      }
      if ((o.state === 'stun' || (o.state === 'getup' && o.st > 10)) && dist < 260 && Math.random() < P.punish * 0.3) return this.attack(f, o, dist, true);

      if (this.t < this.nextThink) {
        // Mouvement maintenu
        if (this.hold.until > this.t) {
          if (this.hold.dir) out[this.hold.dir > 0 ? fwdKey : backKey] = 1;
          if (this.hold.down) out.d = 1;
          if (this.hold.guard) { out.g = 1; out[backKey] = 1; }
        }
        return out;
      }
      this.nextThink = this.t + P.think + U.randi(0, Math.round(P.think * 0.6));
      return this.neutral(f, o, b, dist, out, fwdKey, backKey);
    }

    decideDefense(f, o, th, dist) {
      const P = this.P;
      if (Math.random() < P.mistakes * 0.5) return null;
      if (th.type === 'air') {
        if (Math.random() < P.anti && f.onGround) return 'anti';
        return Math.random() < P.block ? 'block' : null;
      }
      if (th.type === 'grab') return Math.random() < P.block * 0.4 ? 'jump' : null;
      if (th.type === 'beam') return f.onGround ? (Math.random() < P.block + 0.1 ? 'block' : 'jump') : null;
      if (th.type === 'proj') {
        const r = Math.random();
        const refl = this.role(f, 'reflect');
        if (refl.length && r < P.special * 0.3 && th.until > 6) return refl[0];
        if (r < P.parry * 1.5) return 'parry';
        if (dist > 300 && r < 0.25 + P.jump && th.until > 10 && !th.ent.ground) return 'jump';
        if (Math.random() < P.block + 0.2) return th.low ? 'blocklow' : 'block';
        return null;
      }
      // corps-à-corps
      const counters = this.role(f, 'counter');
      const r = Math.random();
      if (r < P.parry) return 'parry';
      if (counters.length && r < P.parry + P.special * 0.18 && th.until > 4) return counters[0];
      if (f.meter >= 300 && th.kind !== 'normal' && Math.random() < P.super * 0.15 && f.moves.X && f.moves.X.invuln) return 'X';
      if (Math.random() < P.block) return th.level === 'low' ? 'blocklow' : 'block';
      return null;
    }

    attack(f, o, dist, punish) {
      const P = this.P;
      // Super / ultime
      if (f.meter >= 300 && f.moves.X && Math.random() < P.super * (punish ? 0.6 : 0.25)) {
        const ai = f.moves.X.ai || {};
        if (dist <= (ai.max || 9999)) { this.press('X', f); return this.out; }
      }
      if (f.meter >= 100 && f.moves.S && Math.random() < P.super * (punish ? 0.3 : 0.12)) {
        const m = f.moves.S;
        const ok = !(m.cond && !m.cond(f)) || f.moves.S2;
        if (ok && dist <= ((m.ai && m.ai.max) || 9999)) { this.press('S', f); return this.out; }
      }
      const style = f.ch.style === 'blade' || f.ch.style === 'heavy' ? 'blade' : (f.ch.style === 'wand' || f.ch.style === 'caster' || f.ch.style === 'staff' || f.ch.style === 'rifle') ? 'zone' : 'martial';
      const L1r = this.reach(f, 'L1');
      if (dist < L1r + 40) {
        const plans = COMBOS[style];
        this.plan = U.choice(plans).filter((id) => !!f.moves[id]);
        this.planIdx = 1;
        this.press(this.plan[0], f);
        return this.out;
      }
      const app = this.role(f, 'approach').concat(this.role(f, 'poke'));
      if (app.length && dist < 520) { this.press(U.choice(app), f); return this.out; }
      this.hold = { dir: 1, until: this.t + 12 };
      return this.out;
    }

    neutral(f, o, b, dist, out, fwdKey, backKey) {
      const P = this.P;
      const r = Math.random();
      if (r < P.mistakes * 0.3) { this.hold = { dir: U.choice([-1, 1, 0]), until: this.t + 20 }; return out; }
      // Transformation
      if (f.moves.S && f.moves.S.cond && f.moves.S.cond(f) && f.meter >= 100 && dist > 300 && Math.random() < P.super * 0.6) { this.press('S', f); return out; }
      // Projection si l'adversaire garde beaucoup
      if (dist < 110 && (o.state === 'guard' || o.state === 'blockstun' || o.state === 'idle') && Math.random() < 0.25 + P.aggro * 0.2) { this.press('GRAB', f); return out; }
      if (dist < this.reach(f, 'L1') + 50) {
        if (Math.random() < P.aggro + 0.15) return this.attack(f, o, dist, false);
        if (Math.random() < 0.3) { this.hold = { guard: true, until: this.t + 16 }; return out; }
        // technique de dégagement (roulade arrière du Soldat…), sinon pas de recul
        const esc = this.role(f, 'escape');
        if (esc.length && Math.random() < 0.3 + P.special * 0.3) { this.press(esc[0], f); return out; }
        if (Math.random() < 0.3) { out.dash = -1; return out; }
        this.hold = { dir: -1, until: this.t + 14 };
        return out;
      }
      const zone = this.role(f, 'zone');
      const charge = this.role(f, 'charge');
      const buff = this.role(f, 'buff');
      void buff;
      if (dist > 420) {
        if (charge.length && f.meter < 250 && Math.random() < 0.35 && !b.entities.some((e) => e.owner === o)) { this.press(charge[0], f); return out; }
        if (zone.length && Math.random() < P.special + 0.15) {
          const id = U.choice(zone);
          const m = f.moves[id];
          if (!m.ai || dist <= m.ai.max) { this.press(id, f); return out; }
        }
        if (f.meter >= 100 && f.moves.S && f.moves.S.ai && f.moves.S.ai.role === 'zone' && Math.random() < P.super * 0.2) { this.press('S', f); return out; }
        if (Math.random() < P.aggro) {
          if (Math.random() < 0.35) { out.dash = 1; return out; }
          this.hold = { dir: 1, until: this.t + 24 };
          return out;
        }
        this.hold = { dir: Math.random() < 0.5 ? 1 : 0, until: this.t + 20 };
        return out;
      }
      // Distance moyenne
      if (Math.random() < P.jump) { out.u = 1; out[fwdKey] = 1; this.airPlan = true; return out; }
      const app = this.role(f, 'approach').concat(this.role(f, 'poke'));
      if (app.length && Math.random() < P.special) {
        const id = U.choice(app);
        const m = f.moves[id];
        if (!m.ai || (dist >= (m.ai.min || 0) && dist <= m.ai.max)) { this.press(id, f); return out; }
      }
      if (zone.length && Math.random() < P.special * 0.6) {
        const id = U.choice(zone); const m = f.moves[id];
        if (!m.ai || (dist >= (m.ai.min || 0) && dist <= m.ai.max)) { this.press(id, f); return out; }
      }
      if (Math.random() < P.aggro) { if (Math.random() < 0.3) { out.dash = 1; return out; } this.hold = { dir: 1, until: this.t + 16 }; return out; }
      if (Math.random() < 0.3) { this.hold = { guard: true, until: this.t + 18 }; return out; }
      this.hold = { dir: -1, until: this.t + 12 };
      return out;
    }

    // Attaques aériennes automatiques
    airLogic(f, o, out) {
      if (!f.onGround && this.airPlan && f.state === 'air' && f.vy > -2 && Math.abs(o.x - f.x) < 170) {
        this.airPlan = false;
        this.press(Math.random() < 0.5 ? 'AL' : 'AH', f);
      }
    }
  }
  // Intègre la logique aérienne dans get()
  const baseGet = CPU.prototype.get;
  CPU.prototype.get = function (f) {
    const out = baseGet.call(this, f);
    if (!this.pulse) this.airLogic(f, f.opp, out);
    return out;
  };

  // Mannequin d'entraînement
  class Dummy {
    constructor(mode) { this.mode = mode || 'stand'; this.isCPU = true; this.t = 0; this.cpu = null; }
    get(f) {
      this.t++;
      const out = emptyInput();
      const o = f.opp;
      const backKey = o.x > f.x ? 'l' : 'r';
      switch (this.mode) {
        case 'crouch': out.d = 1; break;
        case 'jump': out.u = 1; break;
        case 'block': out[backKey] = 1; if (o.state === 'move' && o.move.low) out.d = 1; break;
        case 'blocklow': out[backKey] = 1; out.d = 1; break;
        case 'cpu1': case 'cpu2': case 'cpu3':
          if (!this.cpu) this.cpu = new CPU(+this.mode.slice(3));
          return this.cpu.get(f);
      }
      return out;
    }
  }
  Dummy.MODES = [
    { id: 'stand', label: 'Debout' }, { id: 'crouch', label: 'Accroupi' }, { id: 'jump', label: 'Saute' },
    { id: 'block', label: 'Garde auto' }, { id: 'blocklow', label: 'Garde basse' },
    { id: 'cpu1', label: 'CPU Normal' }, { id: 'cpu2', label: 'CPU Difficile' }, { id: 'cpu3', label: 'CPU Légendaire' }
  ];

  C.AI = { CPU, Dummy, LEVELS };
})(window.CDL = window.CDL || {});
