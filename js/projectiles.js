/* Choc des Légendes — projectiles, rayons, piliers, invocations.
   En plus de x (le long de l'axe de combat) et y (hauteur), chaque entité a un décalage latéral zl :
   elle continue tout droit quand les combattants tournent, ce qui permet de l'esquiver sur le côté. */
(function (C) {
  'use strict';
  const U = C.U, FX = C.FX;
  const PI = Math.PI;

  function baseHit(h) {
    return Object.assign({ dmg: 40, stun: 18, bstun: 14, kb: [6, 0], level: 'mid', hitstop: 6, spark: 'hit', sfx: 'hit_light', proj: true }, h);
  }

  // -------------------------------------------------------------- Projectile
  class Projectile {
    constructor(battle, owner, o) {
      this.battle = battle; this.owner = owner;
      this.isProjectile = true;
      this.kind = o.kind || 'ki';
      this.x = o.x; this.y = o.y;
      this.vx = o.vx || 0; this.vy = o.vy || 0;
      this.zl = o.zl || 0; this.vzl = o.vzl || 0;
      // léger guidage latéral : un simple pas de côté ne suffit pas toujours, il faut vraiment se décaler
      this.track = o.track != null ? o.track : 2.1;
      this.r = o.r || 16;
      this.w = o.w || this.r * 1.6; this.h = o.h || this.r * 1.6;
      this.life = o.life || 120; this.age = 0;
      this.grav = o.grav || 0;
      this.hitsLeft = o.hits || 1;
      this.interval = o.interval || 8;
      this.cool = 0;
      this.hit = baseHit(o.hit);
      this.color = o.color || owner.ch.aura || '#6cf';
      this.color2 = o.color2 || '#ffffff';
      this.strength = o.strength != null ? o.strength : this.hitsLeft;
      this.latR = o.latR != null ? o.latR : U.clamp(Math.max(this.r, Math.min(this.w, this.h) * 0.5), 14, 60);
      this.ground = o.ground || false;
      this.homing = o.homing || 0;
      this.boomerang = o.boomerang || null;
      this.explode = o.explode || null;
      this.wave = o.wave || 0;
      this.spin = 0;
      this.scale = o.scale || 1;
      this.dir = U.sign(this.vx) || owner.facing;
      this.reflectable = o.reflectable !== false;
      this.pierce = o.pierce || false;
      this.trail = o.trail != null ? o.trail : true;
      this.onDeath = o.onDeath || null;
      this.baseY = this.y;
      this.dead = false;
      this.unparryable = !!o.unparryable;
    }
    hitbox() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
    update() {
      this.age++;
      if (this.cool > 0) this.cool--;
      if (this.homing) {
        const t = this.battle.opponentOf(this.owner);
        const ty = t.y - t.height() * 0.5;
        this.vy += U.clamp((ty - this.y) * 0.004, -0.4, 0.4) * this.homing;
        this.vy *= 0.96;
      }
      if (this.boomerang) {
        const b = this.boomerang;
        const ow = this.owner;
        if (!b.back && Math.abs(this.x - b.x0) > b.dist) b.back = true;
        if (b.back) {
          const hx = ow.x, hy = ow.y - ow.height() * 0.55;
          const dx = hx - this.x, dy = hy - this.y;
          const d = Math.hypot(dx, dy) || 1;
          this.vx = U.lerp(this.vx, dx / d * b.speed, 0.15);
          this.vy = U.lerp(this.vy, dy / d * b.speed, 0.15);
          this.zl = U.lerp(this.zl, ow.zl, 0.15);
          if (d < 40) { this.dead = true; ow.weaponAway = false; }
        }
      }
      this.vy += this.grav;
      this.x += this.vx; this.y += this.vy;
      this.zl += this.vzl;
      if (this.track && !(this.boomerang && this.boomerang.back)) {
        const tg = this.battle.opponentOf(this.owner);
        if ((tg.x - this.x) * this.vx > 0) this.zl += U.clamp(tg.zl - this.zl, -this.track, this.track);
        this.vzl *= 0.94;
      }
      if (this.wave) this.y = this.baseY + Math.sin(this.age * 0.12) * this.wave + (this.vy ? 0 : 0);
      if (this.ground) this.y = -this.h / 2;
      this.spin += 0.45;
      const st = this.battle.stage;
      if (this.y >= -2 && this.grav > 0) this.die(true);
      if (this.x < st.left - 200 || this.x > st.right + 200) this.die(false);
      if (--this.life <= 0) this.die(true);
      if (this.trail && this.age % 2 === 0) this.emitTrail();
    }
    emitTrail() {
      const k = this.kind;
      if (k === 'fire' || k === 'firestar') FX.ember(this.x - this.vx * 2 + U.rand(-6, 6), this.y + U.rand(-6, 6), U.choice(['#ff6a00', '#ffb000', '#ffe08a']), -this.vx * 0.1, U.rand(-1, 0.5), U.rand(4, 9) * this.scale, 14);
      else if (k === 'ki' || k === 'violet' || k === 'psy' || k === 'light' || k === 'stun' || k === 'curse' || k === 'void' || k === 'star' || k === 'spirit')
        FX.ember(this.x - this.vx * 1.5, this.y + U.rand(-this.r * 0.4, this.r * 0.4), this.color, -this.vx * 0.05, U.rand(-0.5, 0.5), this.r * 0.45 * this.scale, 12);
      else if (k === 'bolt') FX.smoke(this.x - this.vx, this.y, 4, '#888', 14, 0, -0.3);
      else if (k === 'snake') { /* rien */ }
      else if (k === 'wave') FX.dust(this.x, 0, this.dir, 1);
    }
    die(explode) {
      if (this.dead) return;
      this.dead = true;
      if (this.boomerang) this.owner.weaponAway = false;
      if (explode && this.explode) {
        const e = this.explode;
        this.battle.addEntity(new Area(this.battle, this.owner, { x: this.x, zl: this.zl, y: Math.min(this.y, -e.r * 0.4), r: e.r, hit: e.hit, color: e.color || '#ff9a3c' }));
        C.Audio.play('explosion');
        this.battle.shake(8);
      } else if (!explode) {
        // sortie d'écran
      } else {
        FX.energyBurst(this.x, this.y, this.color, 8, 5);
      }
      if (this.onDeath) this.onDeath(this);
    }
    onHitTarget(target, result) {
      if (result === 'reflect') return;
      this.hitsLeft--;
      this.cool = this.interval;
      if (this.explode && this.hitsLeft <= 0) { this.die(true); return; }
      if (this.hitsLeft <= 0 && !this.pierce) {
        this.dead = true;
        if (this.boomerang) this.owner.weaponAway = false;
        FX.energyBurst(this.x, this.y, this.color, 10, 7);
      }
    }
    reflect(newOwner) {
      this.owner = newOwner;
      this.vx = -this.vx * 1.15; this.vy = -this.vy * 0.5;
      this.vzl = -this.vzl;
      this.dir = -this.dir;
      if (this.boomerang) { this.boomerang = null; this.life = 80; }
      this.hit = Object.assign({}, this.hit);
      FX.parry(this.x, this.y);
      C.Audio.play('reflect');
    }
    draw(ctx, t) { DRAW[this.kind] ? DRAW[this.kind](ctx, this, t) : DRAW.ki(ctx, this, t); }
  }

  // -------------------------------------------------------------- dessins
  function glow(ctx, x, y, s, c, a) {
    ctx.globalAlpha = a == null ? 1 : a;
    ctx.drawImage(FX.glowSprite(c), x - s / 2, y - s / 2, s, s);
    ctx.globalAlpha = 1;
  }
  const DRAW = {
    ki(ctx, p, t) {
      const r = p.r * p.scale, pul = 1 + Math.sin(p.age * 0.6) * 0.08;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p.x, p.y, r * 5 * pul, p.color, 0.8);
      glow(ctx, p.x, p.y, r * 2.4, p.color, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.75 * pul, 0, PI * 2); ctx.fill();
    },
    violet(ctx, p, t) { DRAW.ki(ctx, p, t); },
    light(ctx, p, t) {
      const r = p.r * p.scale;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p.x, p.y, r * 6, p.color, 0.7);
      ctx.strokeStyle = U.rgba('#ffffff', 0.7); ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = p.spin * 0.3 + i * PI / 4, l = r * (1.6 + 0.5 * Math.sin(p.age * 0.5 + i));
        ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r * 0.8, p.y + Math.sin(a) * r * 0.8); ctx.lineTo(p.x + Math.cos(a) * l * 1.4, p.y + Math.sin(a) * l * 1.4); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.8, 0, PI * 2); ctx.fill();
    },
    fire(ctx, p, t) {
      const r = p.r * p.scale;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p.x, p.y, r * 4.5, '#ff5a00', 0.8);
      for (let i = 0; i < 4; i++) glow(ctx, p.x + U.rand(-r * 0.4, r * 0.4), p.y + U.rand(-r * 0.4, r * 0.4), r * U.rand(1.5, 2.5), i % 2 ? '#ffb000' : '#ff7a00', 0.9);
      glow(ctx, p.x, p.y, r * 1.4, '#fff2c0', 1);
      ctx.globalCompositeOperation = 'source-over';
    },
    firestar(ctx, p, t) {
      DRAW.fire(ctx, p, t);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin * 0.2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,200,80,0.8)';
      const r = p.r * p.scale * 1.8;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * PI / 5, rr = i % 2 ? r * 0.4 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    },
    shuriken(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
      const r = p.r * 1.1;
      ctx.fillStyle = '#c9ced6'; ctx.strokeStyle = '#160d1f'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * PI / 4, rr = i % 2 ? r * 0.3 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, PI * 2); ctx.fill();
      ctx.restore();
    },
    kunai(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = '#c9ced6'; ctx.strokeStyle = '#160d1f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(2, -5); ctx.lineTo(2, 5); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = '#5a1010'; ctx.fillRect(-14, -2.5, 16, 5);
      ctx.strokeStyle = '#c9ced6'; ctx.beginPath(); ctx.arc(-17, 0, 3.5, 0, PI * 2); ctx.stroke();
      ctx.restore();
    },
    bolt(ctx, p) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p.x, p.y, 34, '#ffb347', 0.8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#d9b44a'; ctx.strokeStyle = '#160d1f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 9, 4, 0, 0, PI * 2); ctx.stroke(); ctx.fill();
    },
    laser(ctx, p) {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba(p.color, 0.5); ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    },
    stun(ctx, p) {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, 60, p.color, 0.8);
      ctx.strokeStyle = U.rgba(p.color, 0.8); ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    },
    curse(ctx, p) {
      const r = p.r * p.scale;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p.x, p.y, r * 5, p.color, 0.7);
      glow(ctx, p.x, p.y, r * 2.2, '#b8ffcc', 0.9);
      ctx.globalCompositeOperation = 'source-over';
      // crâne stylisé
      ctx.fillStyle = 'rgba(10,40,20,0.85)';
      ctx.beginPath(); ctx.arc(p.x, p.y - 2, r * 0.55, 0, PI * 2); ctx.fill();
      ctx.fillRect(p.x - r * 0.3, p.y, r * 0.6, r * 0.45);
      ctx.fillStyle = '#b8ffcc';
      ctx.beginPath(); ctx.arc(p.x - r * 0.2, p.y - 3, r * 0.13, 0, PI * 2); ctx.arc(p.x + r * 0.2, p.y - 3, r * 0.13, 0, PI * 2); ctx.fill();
    },
    snake(ctx, p) {
      const dir = p.dir;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const pts = [];
      for (let i = 0; i < 9; i++) pts.push([p.x - dir * i * 9, p.y + Math.sin(p.age * 0.5 - i * 0.9) * 6]);
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? '#2f8a3a' : '#0d1f10'; ctx.lineWidth = pass ? 9 : 13;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
      }
      ctx.fillStyle = '#2f8a3a'; ctx.strokeStyle = '#0d1f10'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x + dir * 6, p.y - 2, 10, 7, 0, 0, PI * 2); ctx.stroke(); ctx.fill();
      ctx.fillStyle = '#ffdd33'; ctx.beginPath(); ctx.arc(p.x + dir * 9, p.y - 5, 2, 0, PI * 2); ctx.fill();
      ctx.strokeStyle = '#c62828'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x + dir * 15, p.y); ctx.lineTo(p.x + dir * 22, p.y + (p.age % 10 < 5 ? -2 : 2)); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, p.x, p.y, 50, '#42ff7a', 0.3); ctx.globalCompositeOperation = 'source-over';
    },
    saber(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin * 1.1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = U.rgba(p.color, 0.3); ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(70, 0); ctx.stroke();
      ctx.strokeStyle = U.rgba(p.color, 0.6); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(70, 0); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(70, 0); ctx.stroke();
      ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-6, 0); ctx.stroke();
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, p.x, p.y, 140, p.color, 0.25); ctx.globalCompositeOperation = 'source-over';
    },
    bubble(ctx, p) {
      const r = p.r * p.scale * (1 + Math.sin(p.age * 0.2) * 0.06);
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, p.x, p.y, r * 3.5, p.color, 0.45); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = U.rgba(p.color, 0.3); ctx.strokeStyle = U.rgba('#ffffff', 0.85); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(p.x - r * 0.35, p.y - r * 0.4, r * 0.25, r * 0.15, -0.6, 0, PI * 2); ctx.fill();
    },
    psy(ctx, p) {
      const r = p.r * p.scale;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p.x, p.y, r * 5, p.color, 0.7);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#1a0630'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, PI * 2); ctx.fill();
      ctx.strokeStyle = U.rgba(p.color, 0.9); ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(p.x, p.y, r * (0.4 + i * 0.25), p.spin * (i % 2 ? 1 : -1) + i, p.spin * (i % 2 ? 1 : -1) + i + 3.5); ctx.stroke(); }
    },
    void(ctx, p) {
      const r = p.r * p.scale;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p.x, p.y, r * 5, '#ff3df2', 0.6);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#05010a'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff3df2'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,61,242,0.5)';
      for (let i = 0; i < 4; i++) { const a = p.spin * 0.6 + i * PI / 2; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * r * 1.5, p.y + Math.sin(a) * r * 1.5, 3, 0, PI * 2); ctx.stroke(); }
    },
    wave(ctx, p) {
      const dir = p.dir, h = p.h;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = U.rgba(p.color, 0.35 + i * 0.2);
        const s = 1 - i * 0.25;
        ctx.beginPath();
        ctx.moveTo(p.x - dir * 30 * s, 0);
        ctx.quadraticCurveTo(p.x + dir * 4, -h * 1.3 * s - Math.sin(p.age) * 4, p.x + dir * 22 * s, 0);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    crescent(ctx, p) {
      const dir = p.dir, r = p.r * p.scale;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, r * 3, p.color, 0.5);
      ctx.fillStyle = U.rgba(p.color, 0.75);
      ctx.beginPath(); ctx.arc(-r * 0.4, 0, r, -1.2, 1.2); ctx.arc(-r * 0.75, 0, r * 0.8, 1.1, -1.1, true); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(-r * 0.4, 0, r, -0.9, 0.9); ctx.arc(-r * 0.55, 0, r * 0.88, 0.85, -0.85, true); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    },
    grenade(ctx, p) {
      ctx.fillStyle = '#2d3a2a'; ctx.strokeStyle = '#160d1f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, PI * 2); ctx.stroke(); ctx.fill();
      ctx.fillStyle = p.age % 10 < 5 ? '#ff3030' : '#601010'; ctx.beginPath(); ctx.arc(p.x + 2, p.y - 3, 2.5, 0, PI * 2); ctx.fill();
    },
    detonator(ctx, p) {
      ctx.fillStyle = '#6b7078'; ctx.strokeStyle = '#160d1f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, PI * 2); ctx.stroke(); ctx.fill();
      ctx.fillStyle = p.age % 8 < 4 ? '#ff3030' : '#ffdd33'; ctx.fillRect(p.x - 5, p.y - 1.5, 10, 3);
    },
    spirit(ctx, p) {
      const dir = p.dir, s = p.scale;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir * s, s);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, 220, p.color, 0.5);
      const flap = Math.sin(p.age * 0.35) * 0.8;
      ctx.fillStyle = U.rgba('#e8f6ff', 0.75);
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 14, 0, 0, PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(34, -8, 11, 0, PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(44, -8); ctx.lineTo(58, -4); ctx.lineTo(44, -2); ctx.fill();
      ctx.fillStyle = U.rgba(p.color, 0.7);
      ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-20, -70 * flap - 20, -70, -60 * flap - 10); ctx.quadraticCurveTo(-30, -12, 10, -2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-90, -18); ctx.lineTo(-80, 6); ctx.lineTo(-92, 22); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    },
    star(ctx, p) {
      const r = p.r * p.scale;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p.x, p.y, r * 5, p.color, 0.8);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin * 0.3);
      ctx.fillStyle = '#fffbe0';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * PI / 5 - PI / 2, rr = i % 2 ? r * 0.45 : r * 1.1; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    },
    bomb(ctx, p) {
      ctx.fillStyle = '#26262c'; ctx.strokeStyle = '#160d1f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 7, 13, 0, 0, PI * 2); ctx.stroke(); ctx.fill();
      ctx.fillStyle = '#c62828'; ctx.fillRect(p.x - 7, p.y - 14, 14, 4);
    },
    rainbow(ctx, p) {
      const r = p.r * p.scale;
      const cols = ['#ff5a5a', '#ffb347', '#fff275', '#7dff8a', '#6ad7ff', '#b88aff'];
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < cols.length; i++) glow(ctx, p.x, p.y + (i - 2.5) * r * 0.3, r * 3, cols[(i + Math.floor(p.age / 3)) % 6], 0.55);
      glow(ctx, p.x, p.y, r * 2, '#ffffff', 0.9);
      ctx.globalCompositeOperation = 'source-over';
    },
    rock(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin * 0.2);
      ctx.fillStyle = '#6a5a4a'; ctx.strokeStyle = '#160d1f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-p.r, -p.r * 0.4); ctx.lineTo(-p.r * 0.3, -p.r); ctx.lineTo(p.r * 0.8, -p.r * 0.6); ctx.lineTo(p.r, p.r * 0.4); ctx.lineTo(0, p.r); ctx.lineTo(-p.r * 0.8, p.r * 0.6); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.restore();
    }
  };

  // -------------------------------------------------------------- Rayon
  class Beam {
    constructor(battle, owner, o) {
      this.battle = battle; this.owner = owner;
      this.isBeam = true;
      this.selfView = true;   // se place lui-même à l'écran (segment entre deux points de l'arène)
      this.latR = (o.width || 50) * 0.5;
      this.joint = o.joint || 'hand1';
      this.dy = o.dy || 0;
      this.maxLen = o.len || 1400;
      this.len = 0;
      this.grow = o.grow || 70;
      this.width = o.width || 50;
      this.life = this.max = o.life || 60;
      this.interval = o.interval || 5;
      this.cool = 0;
      this.hit = baseHit(Object.assign({ stun: 12, bstun: 10, kb: [3, 0], hitstop: 3, sfx: 'hit_light', chip: 0.25 }, o.hit));
      this.finalHit = o.finalHit ? baseHit(o.finalHit) : null;
      this.color = o.color || '#6cf';
      this.color2 = o.color2 || '#ffffff';
      this.style = o.style || 'ki';
      this.strength = 99;
      this.dir = owner.facing;
      this.angle = o.angle || 0; // inclinaison (vers le bas > 0)
      this.dead = false;
      this.age = 0;
      this.unblockable = !!o.unblockable;
      this.origin = [owner.x, owner.y];
      this.updateOrigin();
    }
    updateOrigin() {
      const o = this.owner;
      if (this.fixed) return;
      const p = C.Moves.spawnPoint(o, this.joint);
      this.origin = [p[0] + this.dir * 8, p[1] + this.dy];
    }
    hitbox() {
      const w = this.width * (this.life < 10 ? this.life / 10 : 1);
      const x0 = this.origin[0], y0 = this.origin[1];
      const ex = x0 + Math.cos(this.angle) * this.len * this.dir, ey = y0 + Math.sin(this.angle) * this.len;
      return { x: Math.min(x0, ex), y: Math.min(y0, ey) - w / 2, w: Math.abs(ex - x0), h: Math.abs(ey - y0) + w };
    }
    update() {
      this.age++;
      if (this.cool > 0) this.cool--;
      if (this.owner.state !== 'move' && this.owner.state !== 'locked') { this.life = Math.min(this.life, 6); }
      this.updateOrigin();
      this.len = Math.min(this.maxLen, this.len + this.grow);
      const st = this.battle.stage;
      const limit = this.dir > 0 ? st.right + 100 - this.origin[0] : this.origin[0] - (st.left - 100);
      this.len = Math.min(this.len, limit / Math.max(0.3, Math.cos(this.angle)));
      if (--this.life <= 0) this.dead = true;
      if (this.age % 2 === 0) {
        const x = this.origin[0] + this.dir * U.rand(0, this.len), y = this.origin[1] + Math.sin(this.angle) * (x - this.origin[0]) * this.dir + U.rand(-this.width / 2, this.width / 2);
        FX.ember(x, y, this.color, this.dir * U.rand(2, 6), U.rand(-2, 2), U.rand(4, 9), 14);
      }
    }
    onHitTarget(target) {
      this.cool = this.interval;
      if (this.finalHit && this.life <= this.interval + 2) this.useFinal = true;
    }
    // Le rayon part dans la direction visée par son lanceur : distance latérale à la cible
    lateral(t) { return Math.abs(Math.abs(t.x - this.origin[0]) * Math.sin(this.owner.aimErr())); }
    currentHit() { return (this.finalHit && this.life <= this.interval * 2) ? this.finalHit : this.hit; }
    draw(ctx, t, V) {
      const k = this.life < 10 ? this.life / 10 : Math.min(1, this.age / 6);
      const w = this.width * k * (1 + Math.sin(this.age * 0.9) * 0.08);
      const x0 = this.origin[0], y0 = this.origin[1];
      const L = Math.max(1, this.len);
      ctx.save();
      if (V) {
        const o = this.owner, e = o.aimErr(), ca = Math.cos(this.angle) * L * this.dir;
        if (!V.seg(ctx, x0, y0, o.zl, x0 + ca * Math.cos(e), y0 + Math.sin(this.angle) * L, o.zl + ca * Math.sin(e), L)) { ctx.restore(); return; }
      } else { ctx.translate(x0, y0); ctx.rotate(this.dir > 0 ? this.angle : PI - this.angle); }
      ctx.globalCompositeOperation = 'lighter';
      if (this.style === 'lightning') {
        for (let i = 0; i < 3; i++) {
          FX.drawBolt(ctx, { x: 0, y: (i - 1) * w * 0.25, x2: L, y2: (i - 1) * w * 0.3 + U.rand(-w * 0.3, w * 0.3), seed: i * 99 + this.age, color: this.color, width: 2.5 + (i === 1 ? 1.5 : 0) }, k);
        }
        glow(ctx, 0, 0, w * 3, this.color, 0.8);
      } else if (this.style === 'fire') {
        for (let i = 0; i < 12; i++) {
          const t = (i / 12 + (this.age * 0.04) % (1 / 12)) * L;
          const s = w * (0.5 + t / L * 1.1);
          glow(ctx, t, Math.sin(this.age * 0.7 + i) * w * 0.15, s * 2.2, i % 3 === 0 ? '#ffb000' : '#ff5a00', 0.75);
        }
        glow(ctx, 0, 0, w * 2, '#fff2c0', 0.9);
      } else {
        const cols = this.style === 'rainbow' ? ['#ff5a5a', '#ffb347', '#fff275', '#7dff8a', '#6ad7ff', '#b88aff'] : null;
        const g = ctx.createLinearGradient(0, -w, 0, w);
        const c1 = cols ? cols[Math.floor(this.age / 3) % 6] : this.color;
        g.addColorStop(0, U.rgba(c1, 0)); g.addColorStop(0.3, U.rgba(c1, 0.6)); g.addColorStop(0.5, U.rgba(this.color2, 1)); g.addColorStop(0.7, U.rgba(c1, 0.6)); g.addColorStop(1, U.rgba(c1, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, -w * 0.5); ctx.lineTo(L, -w * 0.75); ctx.arc(L, 0, w * 0.75, -PI / 2, PI / 2); ctx.lineTo(0, w * 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(0, -w * 0.16, L, w * 0.32);
        glow(ctx, 0, 0, w * 3.2, c1, 0.9);
        glow(ctx, L, 0, w * 3, c1, 0.8);
      }
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // -------------------------------------------------------------- Pilier (frappe verticale à une position)
  class Pillar {
    constructor(battle, owner, o) {
      this.battle = battle; this.owner = owner;
      this.x = o.x; this.width = o.width || 90;
      this.zl = o.zl || 0; this.latR = this.width * 0.5;
      this.delay = o.delay || 20; this.life = this.max = o.life || 30;
      this.interval = o.interval || 6; this.cool = 0;
      this.hit = baseHit(Object.assign({ stun: 14, kb: [2, -4], launch: true, hitstop: 4 }, o.hit));
      this.color = o.color || '#ffffff';
      this.style = o.style || 'light';
      this.top = o.top || -1400;
      this.age = 0; this.dead = false;
      this.strength = 99;
      this.sfx = o.sfx || 'explosion';
      this.unblockable = !!o.unblockable;
    }
    hitbox() { return this.delay > 0 ? null : { x: this.x - this.width / 2, y: this.top, w: this.width, h: -this.top }; }
    update() {
      this.age++;
      if (this.cool > 0) this.cool--;
      if (this.delay > 0) {
        this.delay--;
        if (this.delay === 0) { C.Audio.play(this.sfx); this.battle.shake(10); FX.dust(this.x, 0, 1, 8, true); FX.dust(this.x, 0, -1, 8, true); }
        return;
      }
      if (--this.life <= 0) this.dead = true;
      if (this.age % 2 === 0) FX.ember(this.x + U.rand(-this.width / 2, this.width / 2), U.rand(-500, 0), this.color, 0, -U.rand(3, 8), U.rand(5, 10), 16);
    }
    onHitTarget() { this.cool = this.interval; }
    draw(ctx) {
      ctx.globalCompositeOperation = 'lighter';
      if (this.delay > 0) {
        const a = 0.3 + 0.3 * Math.sin(this.age * 0.6);
        ctx.fillStyle = U.rgba(this.color, a * 0.4);
        ctx.fillRect(this.x - this.width / 2, this.top, this.width, -this.top);
        glow(ctx, this.x, -4, this.width * 2, this.color, a);
      } else {
        const k = Math.min(1, this.life / 8);
        const w = this.width * (0.8 + Math.sin(this.age * 0.8) * 0.1) * k;
        if (this.style === 'lightning') {
          for (let i = 0; i < 3; i++) FX.drawBolt(ctx, { x: this.x + U.rand(-10, 10), y: this.top, x2: this.x + U.rand(-w * 0.3, w * 0.3), y2: 0, seed: this.age * 3 + i, color: this.color, width: 4 }, k);
        } else {
          const g = ctx.createLinearGradient(this.x - w, 0, this.x + w, 0);
          g.addColorStop(0, U.rgba(this.color, 0)); g.addColorStop(0.35, U.rgba(this.color, 0.7)); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(0.65, U.rgba(this.color, 0.7)); g.addColorStop(1, U.rgba(this.color, 0));
          ctx.fillStyle = g;
          ctx.fillRect(this.x - w, this.top, w * 2, -this.top);
        }
        glow(ctx, this.x, -10, this.width * 3.5 * k, this.color, 0.9);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // -------------------------------------------------------------- Zone (explosion, onde de choc)
  class Area {
    constructor(battle, owner, o) {
      this.battle = battle; this.owner = owner;
      this.x = o.x; this.y = o.y; this.r = o.r || 60;
      this.zl = o.zl || 0; this.latR = this.r;
      this.life = o.life || 6; this.hits = o.hits || 1; this.interval = o.interval || 6; this.cool = 0;
      this.hit = baseHit(Object.assign({ dmg: 60, kb: [8, -8], launch: true, hitstop: 8, sfx: 'hit_heavy' }, o.hit));
      this.dead = false; this.strength = 0;
      this.visual = o.visual !== false;
      this.dir = U.sign(battle.opponentOf(owner).x - this.x) || owner.facing;
      if (this.visual) FX.explosion(this.x, this.y, this.r, o.color || '#ff9a3c', o.smoke);
    }
    hitbox() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
    update() { if (this.cool > 0) this.cool--; if (--this.life <= 0) this.dead = true; }
    onHitTarget() { this.hits--; this.cool = this.interval; if (this.hits <= 0) this.dead = true; }
    draw() { }
  }

  // -------------------------------------------------------------- Invocation (soldats en renfort)
  class Summon {
    constructor(battle, owner, o) {
      this.battle = battle; this.owner = owner;
      this.x = o.x; this.y = 0; this.zl = o.zl || 0; this.facing = owner.facing;
      this.life = o.life || 150; this.age = 0; this.dead = false;
      this.every = o.every || 22;
      this.look = C.Roster.look(o.char || 'tk7', o.costume || 0);
      this.fire = o.fire;
      this.isSummon = true;
      FX.smoke(this.x, -60, 40, '#ddd', 30);
    }
    hitbox() { return null; }
    update() {
      this.age++;
      const t = this.battle.opponentOf(this.owner);
      this.facing = t.x > this.x ? 1 : -1;
      if (this.age > 18 && this.age % this.every === 0 && this.life > 20) this.fire(this);
      if (--this.life <= 0) { this.dead = true; FX.smoke(this.x, -60, 40, '#ddd', 30); }
    }
    // (dessiné en 3D par le moteur de rendu)
  }

  // -------------------------------------------------------------- Vaisseau (frappe aérienne)
  class Ship {
    constructor(battle, owner, o) {
      this.battle = battle; this.owner = owner;
      this.dir = o.dir; this.x = o.x; this.y = o.y; this.vx = o.dir * 16;
      this.zl = 0; this.vzl = 0; this.isShip = true; this.latR = 0;
      this.dropEvery = o.dropEvery || 9; this.age = 0; this.dead = false;
      this.drop = o.drop;
      C.Audio.play('beam');
    }
    hitbox() { return null; }
    update() {
      this.age++;
      this.x += this.vx;
      if (this.age % this.dropEvery === 0) this.drop(this);
      const st = this.battle.stage;
      if (this.x < st.left - 400 || this.x > st.right + 400) this.dead = true;
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.dir, 1);
      ctx.fillStyle = '#3a3d44'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-50, -34); ctx.lineTo(-38, 0); ctx.lineTo(-50, 34); ctx.lineTo(-44, 34); ctx.lineTo(-30, 0); ctx.lineTo(-44, -34); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(50, -34); ctx.lineTo(38, 0); ctx.lineTo(50, 34); ctx.lineTo(44, 34); ctx.lineTo(30, 0); ctx.lineTo(44, -34); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = '#5c6068'; ctx.fillRect(-36, -3, 72, 6);
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, PI * 2); ctx.stroke(); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, PI * 2); ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, this.x - this.dir * 50, this.y, 50, '#ff4040', 0.6); ctx.globalCompositeOperation = 'source-over';
    }
  }

  C.Proj = { Projectile, Beam, Pillar, Area, Summon, Ship, baseHit, DRAW };
})(window.CDL = window.CDL || {});
