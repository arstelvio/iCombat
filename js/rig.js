/* Choc des Légendes — squelette animé et modèles 3D procéduraux des combattants (three.js, style dessin animé).
   La logique du jeu travaille dans le plan de combat (vue de profil) ; le modèle 3D reprend ces poses.
   Conventions des poses (personnage tourné vers la droite, y vers le bas, origine aux pieds) :
   - angles des membres mesurés depuis la verticale descendante, positifs vers l'avant ;
   - torse : inclinaison vers l'avant ; bras relatifs au torse, avant-bras relatifs au bras ;
   - cuisses absolues, tibias relatifs à la cuisse (négatif = genou plié). */
(function (C) {
  'use strict';
  const U = C.U;
  const PI = Math.PI;

  const BUILDS = {
    normal: { thigh: 48, shin: 48, torso: 62, uarm: 36, farm: 34, head: 17, neck: 7, armW: 13, legW: 16, tTop: 44, tBot: 34 },
    slim: { thigh: 48, shin: 49, torso: 60, uarm: 35, farm: 33, head: 16, neck: 7, armW: 11, legW: 13, tTop: 38, tBot: 30 },
    heavy: { thigh: 46, shin: 46, torso: 66, uarm: 38, farm: 36, head: 17, neck: 6, armW: 18, legW: 21, tTop: 60, tBot: 44 },
    old: { thigh: 46, shin: 46, torso: 58, uarm: 34, farm: 32, head: 16, neck: 7, armW: 11, legW: 13, tTop: 40, tBot: 36 },
    small: { thigh: 15, shin: 15, torso: 30, uarm: 15, farm: 14, head: 27, neck: 4, armW: 9, legW: 12, tTop: 26, tBot: 32 },
    dragon: { thigh: 40, shin: 40, torso: 72, uarm: 26, farm: 24, head: 20, neck: 22, armW: 14, legW: 26, tTop: 52, tBot: 62 },
    psy: { thigh: 52, shin: 52, torso: 62, uarm: 38, farm: 36, head: 16, neck: 10, armW: 11, legW: 17, tTop: 40, tBot: 46 },
    titan: { thigh: 50, shin: 50, torso: 70, uarm: 40, farm: 38, head: 18, neck: 8, armW: 17, legW: 20, tTop: 58, tBot: 44 }
  };

  function dims(look) {
    if (look._dims) return look._dims;
    const b = Object.assign({}, BUILDS[look.build || 'normal'], look.dims || {});
    b.hipH = b.thigh + b.shin;
    b.height = b.hipH + b.torso + b.neck + b.head * 2;
    look._dims = b;
    return b;
  }

  // ---------------------------------------------------------------- poses
  const KEYS = ['x', 'y', 'rot', 'yaw', 'lie', 'torso', 'head', 'ua1', 'la1', 'ua2', 'la2', 'th1', 'sh1', 'th2', 'sh2', 'wing', 'tail'];
  const BASE = { x: 0, y: 0, rot: 0, yaw: 0, lie: 0, torso: 0, head: 0, ua1: 0.1, la1: 0.2, ua2: 0.05, la2: 0.2, th1: 0.05, sh1: -0.05, th2: -0.05, sh2: -0.05, wing: 0.3, tail: 0, wa: null, wa2: null, plant: true };

  function defaultWa(p) { return (p.ua1 - p.torso + p.la1) + PI / 2; }
  function defaultWa2(p) { return (p.ua2 - p.torso + p.la2) + PI / 2; }

  function lerpPose(a, b, t, out) {
    out = out || {};
    for (let i = 0; i < KEYS.length; i++) {
      const k = KEYS[i];
      const va = a[k] !== undefined ? a[k] : BASE[k];
      const vb = b[k] !== undefined ? b[k] : BASE[k];
      out[k] = va + (vb - va) * t;
    }
    const wa = a.wa != null ? a.wa : defaultWa(fill(a));
    const wb = b.wa != null ? b.wa : defaultWa(fill(b));
    out.wa = wa + (wb - wa) * t;
    const w2a = a.wa2 != null ? a.wa2 : defaultWa2(fill(a));
    const w2b = b.wa2 != null ? b.wa2 : defaultWa2(fill(b));
    out.wa2 = w2a + (w2b - w2a) * t;
    out.plant = t < 0.5 ? (a.plant !== false) : (b.plant !== false);
    out.hidden = t < 0.5 ? a.hidden : b.hidden;
    return out;
  }
  const fillTmp = {};
  function fill(p) {
    for (let i = 0; i < KEYS.length; i++) { const k = KEYS[i]; fillTmp[k] = p[k] !== undefined ? p[k] : BASE[k]; }
    return fillTmp;
  }
  function completePose(p) {
    const o = {};
    for (let i = 0; i < KEYS.length; i++) { const k = KEYS[i]; o[k] = p[k] !== undefined ? p[k] : BASE[k]; }
    o.wa = p.wa != null ? p.wa : defaultWa(o);
    o.wa2 = p.wa2 != null ? p.wa2 : defaultWa2(o);
    o.plant = p.plant !== false;
    o.hidden = p.hidden;
    return o;
  }

  // ------------------------------------------------------------- cinématique
  function vecDown(a, L) { return [Math.sin(a) * L, Math.cos(a) * L]; }

  function solve(p, d, J) {
    J = J || {};
    const hipY = U.lerp(-d.hipH + p.y, -d.legW * 0.6 - 6, p.lie || 0);
    const hip = [p.x, hipY];
    // Jambes
    const k1 = vecDown(p.th1, d.thigh), f1 = vecDown(p.th1 + p.sh1, d.shin);
    const k2 = vecDown(p.th2, d.thigh), f2 = vecDown(p.th2 + p.sh2, d.shin);
    J.knee1 = [hip[0] + k1[0], hip[1] + k1[1]];
    J.foot1 = [J.knee1[0] + f1[0], J.knee1[1] + f1[1]];
    J.knee2 = [hip[0] + k2[0], hip[1] + k2[1]];
    J.foot2 = [J.knee2[0] + f2[0], J.knee2[1] + f2[1]];
    J.shinA1 = p.th1 + p.sh1; J.shinA2 = p.th2 + p.sh2;
    // Ancrage des pieds au sol
    let dy = 0;
    if (p.plant && !p.rot && !p.lie) {
      const low = Math.max(J.foot1[1], J.foot2[1]);
      dy = -low;
    }
    hip[1] += dy;
    J.knee1[1] += dy; J.foot1[1] += dy; J.knee2[1] += dy; J.foot2[1] += dy;
    J.hip = hip;
    // Torse
    const t = p.torso;
    J.neck = [hip[0] + Math.sin(t) * d.torso, hip[1] - Math.cos(t) * d.torso];
    J.shoulder = [hip[0] + Math.sin(t) * (d.torso - 7), hip[1] - Math.cos(t) * (d.torso - 7)];
    const ha = t + p.head;
    J.headA = ha;
    J.head = [J.neck[0] + Math.sin(ha) * (d.neck + d.head * 0.85), J.neck[1] - Math.cos(ha) * (d.neck + d.head * 0.85)];
    // Bras
    const A1 = p.ua1 - t, B1 = A1 + p.la1;
    const A2 = p.ua2 - t, B2 = A2 + p.la2;
    const e1 = vecDown(A1, d.uarm), h1 = vecDown(B1, d.farm);
    const e2 = vecDown(A2, d.uarm), h2 = vecDown(B2, d.farm);
    J.elbow1 = [J.shoulder[0] + e1[0], J.shoulder[1] + e1[1]];
    J.hand1 = [J.elbow1[0] + h1[0], J.elbow1[1] + h1[1]];
    J.elbow2 = [J.shoulder[0] + e2[0], J.shoulder[1] + e2[1]];
    J.hand2 = [J.elbow2[0] + h2[0], J.elbow2[1] + h2[1]];
    J.farmA1 = B1; J.farmA2 = B2;
    J.wa = p.wa; J.wa2 = p.wa2;
    J.torsoA = t;
    J.rot = p.rot || 0;
    return J;
  }

  // ================================================================ MODÈLES 3D
  // Repère local d'un modèle : X = vers l'avant, Y = vers le haut, Z = côté droit du personnage.
  // Les angles 2D des poses deviennent des rotations autour de Z ; on ajoute un peu d'écartement
  // des membres et une torsion du buste pour donner du volume.
  let T3 = null, gradMap = null, outlineMat = null;
  const geoCache = {};
  const OUTLINE = '#160d1f';
  const SHADOW_TINT = '#3b0f5c';

  function three() {
    if (T3) return T3;
    if (!window.THREE) return null;
    T3 = window.THREE;
    gradMap = new T3.DataTexture(new Uint8Array([120, 120, 120, 255, 196, 196, 196, 255, 255, 255, 255, 255]), 3, 1, T3.RGBAFormat);
    gradMap.minFilter = gradMap.magFilter = T3.NearestFilter;
    gradMap.needsUpdate = true;
    // Contour noir : faces arrière gonflées le long des normales
    outlineMat = new T3.ShaderMaterial({
      uniforms: { t: { value: 1.5 }, col: { value: new T3.Color(OUTLINE) } },
      vertexShader: 'uniform float t; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normalize(normal) * t, 1.0); }',
      fragmentShader: 'uniform vec3 col; void main() { gl_FragColor = vec4(col, 1.0); }',
      side: T3.BackSide
    });
    return T3;
  }

  const r1 = (v) => Math.round(v * 10) / 10;
  function geo(key, make) { return geoCache[key] || (geoCache[key] = make()); }
  const G = {
    capsule(r, len) { r = r1(r); len = r1(Math.max(0.2, len)); return geo('ca' + r + '_' + len, () => new T3.CapsuleGeometry(r, len, 3, 10)); },
    sphere(r) { r = r1(r); return geo('sp' + r, () => new T3.SphereGeometry(r, 14, 10)); },
    ell(rx, ry, rz) {
      rx = r1(rx); ry = r1(ry); rz = r1(rz);
      return geo('el' + rx + '_' + ry + '_' + rz, () => { const g = new T3.SphereGeometry(1, 16, 12); g.scale(rx, ry, rz); return g; });
    },
    box(x, y, z) { x = r1(x); y = r1(y); z = r1(z); return geo('bx' + x + '_' + y + '_' + z, () => new T3.BoxGeometry(x, y, z)); },
    cone(r, h, seg) { r = r1(r); h = r1(h); return geo('co' + r + '_' + h + '_' + (seg || 8), () => new T3.ConeGeometry(r, h, seg || 8)); },
    cyl(rt, rb, h, seg, open) { rt = r1(rt); rb = r1(rb); h = r1(h); return geo('cy' + rt + '_' + rb + '_' + h + '_' + (seg || 12) + (open ? 'o' : ''), () => new T3.CylinderGeometry(rt, rb, h, seg || 12, 1, !!open)); },
    torus(r, t, arc) { r = r1(r); t = r1(t); return geo('to' + r + '_' + t + '_' + r1(arc || 7), () => new T3.TorusGeometry(r, t, 6, 18, arc || PI * 2)); },
    // Tronc de cône elliptique : rayons (x, z) en bas puis en haut
    taper(rx0, rz0, rx1, rz1, h, open) {
      rx0 = r1(rx0); rz0 = r1(rz0); rx1 = r1(rx1); rz1 = r1(rz1); h = r1(h);
      return geo('tp' + [rx0, rz0, rx1, rz1, h, open ? 1 : 0].join('_'), () => {
        const g = new T3.CylinderGeometry(1, 1, h, 16, 2, !!open);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const t = p.getY(i) / h + 0.5;
          p.setX(i, p.getX(i) * (rx0 + (rx1 - rx0) * t));
          p.setZ(i, p.getZ(i) * (rz0 + (rz1 - rz0) * t));
        }
        g.computeVertexNormals();
        return g;
      });
    },
    // Portion de sphère (casques, capuches, cheveux courts)
    shell(r, phi0, phiL, th0, thL) {
      r = r1(r);
      return geo('sh' + [r, r1(phi0), r1(phiL), r1(th0), r1(thL)].join('_'), () => new T3.SphereGeometry(r, 18, 10, phi0, phiL, th0, thL));
    }
  };

  function grp(parent, x, y, z) {
    const g = new T3.Group();
    if (x != null) g.position.set(x, y || 0, z || 0);
    parent.add(g);
    return g;
  }

  class Model {
    constructor(look) {
      three();
      this.look = look;
      this.d = dims(look);
      this.tint = look.shadow ? SHADOW_TINT : null;
      this.mats = {}; this.matList = []; this.glows = [];
      // « fantôme » : silhouette lumineuse d'une seule couleur (images rémanentes)
      this.ghostMat = look.ghost ? new T3.MeshBasicMaterial({ color: look.ghost, transparent: true, opacity: 0.5, blending: T3.AdditiveBlending, depthWrite: false }) : null;
      this.root = new T3.Group();
      this.build();
    }
    P(c) { return this.tint ? U.mix(c, this.tint, 0.72) : c; }
    mat(color, o) {
      if (this.ghostMat) return this.ghostMat;
      o = o || {};
      const key = color + (o.em ? '|e' + o.em : '') + (o.double ? '|d' : '');
      let m = this.mats[key];
      if (!m) {
        m = this.mats[key] = new T3.MeshToonMaterial({ color: this.P(color), gradientMap: gradMap });
        if (o.double) m.side = T3.DoubleSide;
        m.userData.em = new T3.Color(o.em ? this.P(o.em) : '#000000');
        m.emissive.copy(m.userData.em);
        this.matList.push(m);
      }
      return m;
    }
    // Matière lumineuse (sabres, yeux, flammes) : pas d'ombrage, addition de lumière possible
    glowMat(color, opacity, add) {
      if (this.ghostMat) return this.ghostMat;
      const m = new T3.MeshBasicMaterial({ color: this.P(color), transparent: opacity < 1 || !!add, opacity: opacity == null ? 1 : opacity });
      if (add) { m.blending = T3.AdditiveBlending; m.depthWrite = false; }
      this.glows.push(m);
      return m;
    }
    part(parent, geometry, color, x, y, z, o) {
      o = o || {};
      const m = new T3.Mesh(geometry, o.mat || this.mat(color, o));
      m.position.set(x || 0, y || 0, z || 0);
      if (o.rx) m.rotation.x = o.rx;
      if (o.ry) m.rotation.y = o.ry;
      if (o.rz) m.rotation.z = o.rz;
      parent.add(m);
      if (!o.mat && !o.plain && !this.ghostMat) m.add(new T3.Mesh(geometry, outlineMat));
      return m;
    }
    // Segment (capsule) entre deux points d'un même repère
    between(parent, a, b, r, color, o) {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      const m = this.part(parent, G.capsule(r, Math.max(0.2, len - r * 2)), color, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, o);
      m.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), new T3.Vector3(dx / len, dy / len, dz / len));
      return m;
    }
    // Pointe (cheveux, cornes, oreilles) plantée sur une sphère de rayon r, dans la direction dir
    spike(parent, dir, r, base, h, color, o) {
      const v = new T3.Vector3(dir[0], dir[1], dir[2]).normalize();
      const m = this.part(parent, G.cone(base, h, 7), color, v.x * (r + h * 0.42), v.y * (r + h * 0.42), v.z * (r + h * 0.42), o);
      m.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), v);
      return m;
    }

    build() {
      const L = this.look, d = this.d, c = L.colors || {};
      const skin = c.skin || '#f0c8a0';
      const top = c.top || skin, pants = c.bottom || top;
      const metal = c.metal || top;
      const armCol = L.armorLimbs ? metal : (L.trooperLimbs ? '#1b1b20' : (L.armSkin ? skin : (c.sleeve || top)));
      const legCol = L.armorLimbs ? (c.metal2 || metal) : (L.trooperLimbs ? '#1b1b20' : pants);
      const W = d.tTop, D = Math.max(16, d.tTop * 0.58), hipD = Math.max(14, d.tBot * 0.6);
      const shZ = this.shZ = W * 0.5 + d.armW * 0.2, hipZ = d.tBot * 0.27;
      const sc = L.scale || 1;
      this.root.scale.setScalar(sc);
      const body = this.body = grp(this.root);
      const lean = this.lean = grp(body);
      const twist = this.twist = grp(lean);
      const chest = L.chest;

      // ---------------------------------------------------------- bassin et buste
      const creature = chest === 'belly';
      const torsoCol = chest === 'plate' || chest === 'tabard' || chest === 'marine' ? metal : chest === 'trooper' ? '#1b1b20' : creature ? skin : top;
      this.part(body, G.ell(hipD * 0.5, d.legW * 0.72, d.tBot * 0.5), L.robe ? L.robe.color : (creature ? skin : pants), 0, 0, 0);
      const tH = d.torso;
      this.part(twist, G.taper(hipD * 0.48, d.tBot * 0.46, D * 0.52, W * 0.5, tH * 0.92), torsoCol, 0, tH * 0.5, 0);
      this.part(twist, G.ell(D * 0.5, tH * 0.2, W * 0.52), torsoCol, 0, tH * 0.9, 0);
      if (chest === 'gi' || chest === 'tunic' || chest === 'robe') {
        // revers croisés
        if (c.inner) this.part(twist, G.ell(D * 0.2, tH * 0.2, W * 0.2), c.inner, D * 0.4, tH * 0.86, 0, { plain: true });
        this.between(twist, [D * 0.5, tH * 0.98, W * 0.26], [D * 0.52, tH * 0.38, -W * 0.14], 2.2, U.shade(top, -0.3), { plain: true });
        this.between(twist, [D * 0.5, tH * 0.98, -W * 0.26], [D * 0.52, tH * 0.55, W * 0.05], 2.2, U.shade(top, -0.3), { plain: true });
      } else if (chest === 'ninja') {
        this.between(twist, [D * 0.5, tH * 0.98, W * 0.28], [D * 0.5, tH * 0.3, -W * 0.3], 2.4, U.shade(top, 0.25), { plain: true });
      } else if (chest === 'tabard') {
        this.part(twist, G.box(3, tH * 0.95, W * 0.62), top, D * 0.5 + 1, tH * 0.48, 0);
        this.part(twist, G.box(3, tH * 0.95, W * 0.62), top, -D * 0.5 - 1, tH * 0.48, 0);
        this.part(twist, G.cone(6, 12, 4), c.accent || '#f2c94c', D * 0.5 + 3.5, tH * 0.62, 0, { plain: true, rz: -PI / 2 });
      } else if (chest === 'plate') {
        this.part(twist, G.ell(D * 0.3, tH * 0.2, W * 0.34), U.shade(metal, 0.18), D * 0.3, tH * 0.72, 0, { plain: true });
      } else if (chest === 'samurai') {
        for (let i = 0; i < 4; i++) {
          const t = 0.2 + i * 0.19, k = 0.48 + (0.52 - 0.48) * t;
          this.part(twist, G.taper(D * k + 1.4, W * (0.46 + 0.04 * t) + 1.4, D * k + 1.4, W * (0.46 + 0.04 * t) + 1.4, 3.2), c.accent || '#f2c94c', 0, tH * t, 0, { plain: true });
        }
      } else if (chest === 'marine') {
        this.part(twist, G.ell(D * 0.42, tH * 0.34, W * 0.5), metal, D * 0.12, tH * 0.68, 0);
        this.part(twist, G.box(3, 7, 30), c.accent || '#e0b84a', D * 0.55, tH * 0.72, 0, { plain: true });
        this.part(twist, G.sphere(4.5), '#e9e2cf', D * 0.58, tH * 0.72, 0, { plain: true });
      } else if (chest === 'trooper') {
        this.part(twist, G.taper(D * 0.53, W * 0.5, D * 0.56, W * 0.54, tH * 0.48), top, 0, tH * 0.74, 0);
        this.part(twist, G.taper(hipD * 0.52, d.tBot * 0.5, D * 0.5, W * 0.47, tH * 0.26), top, 0, tH * 0.22, 0);
      } else if (chest === 'darklord') {
        this.part(twist, G.box(4, 15, 18), '#2d2f36', D * 0.5, tH * 0.66, W * 0.1);
        ['#ee3333', '#33cc33', '#3399ff', '#ffdd33'].forEach((col, i) => this.part(twist, G.box(1.5, 3, 3), col, D * 0.5 + 2.4, tH * 0.7, W * 0.1 - 6 + i * 4, { mat: this.glowMat(col, 1) }));
      } else if (creature) {
        this.part(twist, G.ell(D * 0.36, tH * 0.44, d.tBot * 0.36), c.belly || '#f4e3b0', D * 0.24, tH * 0.42, 0, { plain: true });
      } else if (chest === 'void') {
        this.core = this.part(twist, G.sphere(8), '#ff3df2', D * 0.46, tH * 0.62, 0, { mat: this.glowMat(c.eye || '#ff3df2', 0.9, true) });
        const rnd = U.seeded(77);
        for (let i = 0; i < 12; i++) {
          const a = rnd() * PI * 2, y = tH * (0.1 + rnd() * 0.85);
          this.part(twist, G.sphere(1.3), '#ffffff', Math.cos(a) * D * 0.53, y, Math.sin(a) * W * 0.5, { mat: this.glowMat('#ffffff', 0.9) });
        }
      }
      if (c.belt) {
        this.part(body, G.taper(hipD * 0.5 + 1.6, d.tBot * 0.48 + 1.6, hipD * 0.5 + 1.6, d.tBot * 0.47 + 1.6, 9), c.belt, 0, tH * 0.1, 0);
        if (L.beltKnot) this.part(body, G.box(4, 22, 5), c.belt, hipD * 0.5 + 2, tH * 0.1 - 10, d.tBot * 0.2, { rx: 0.25 });
      }

      // ---------------------------------------------------------- cou et tête
      const neckR = Math.max(4, d.armW * 0.48) * (d.neck > 12 ? 1.3 : 1);
      this.between(twist, [0, tH - 3, 0], [0, tH + d.neck + d.head * 0.3, 0], neckR, creature || L.head === 'psy' || L.head === 'cat' ? skin : (L.head === 'ninja' ? (c.mask || top) : skin));
      const headG = this.headG = grp(twist, 0, tH, 0);
      const head = this.head = grp(headG, 0, d.neck + d.head * 0.85, 0);
      this.buildHead(head, d.head, c, skin);
      if (L.scarf) {
        this.part(twist, G.taper(neckR + 4, neckR + 5, neckR + 3.5, neckR + 4.5, 9), L.scarf[0], 0, tH + 1, 0);
        this.scarf = grp(twist, -neckR - 2, tH + 2, 0);
        this.part(this.scarf, G.box(3, 30, 9), L.scarf[1] || L.scarf[0], 0, -15, 0);
      }
      if (L.pads) {
        const pr = L.pads.r || 16;
        for (const s of [1, -1]) {
          this.part(twist, G.ell(pr * 0.95, pr * 0.72, pr * 1.0), L.pads.color || metal, 0, tH - 2, s * (shZ + 1));
          if (L.pads.trim) this.part(twist, G.torus(pr * 0.86, 1.6), L.pads.trim, 0, tH - 6, s * (shZ + 1), { plain: true, rx: PI / 2 });
        }
      }
      if (L.jetpack) {
        this.part(twist, G.box(20, 54, 34), metal, -D * 0.5 - 10, tH * 0.62, 0);
        for (const s of [1, -1]) this.part(twist, G.cyl(6, 7.5, 12), '#2a2a2e', -D * 0.5 - 10, tH * 0.62 - 32, s * 9);
      }
      if (L.tube) this.between(twist, [-d.head * 0.6, tH + d.neck + d.head * 0.7, 0], [-D * 0.5, tH - 16, 0], 3, skin);
      if (L.cape) {
        const K = L.cape, len = K.len || 100;
        this.cape = grp(twist, -D * 0.5 - 2, tH - 5, 0);
        this.part(this.cape, G.taper(2.4, W * 0.66, 1.6, W * 0.5, len), K.color, 0, -len / 2, 0);
        if (K.inner) this.part(this.cape, G.taper(2.8, W * 0.67, 2.8, W * 0.66, 5), K.inner, 0, -len + 2, 0, { plain: true });
      }
      if (L.wings) this.buildWings(twist, D, tH, W, skin);

      // ---------------------------------------------------------- bras
      this.arms = [];
      for (const s of [1, -1]) {
        const sh = grp(twist, 0, tH - 7, s * shZ);
        sh.rotation.x = -s * 0.12;
        const upper = grp(sh);
        const aw = d.armW * (L.armorLimbs ? 1.12 : 1);
        this.part(upper, G.capsule(aw * 0.5, d.uarm - aw * 0.7), armCol, 0, -d.uarm / 2, 0);
        const fore = grp(upper, 0, -d.uarm, 0);
        this.part(fore, G.capsule(aw * 0.46, d.farm - aw * 0.7), armCol, 0, -d.farm / 2, 0);
        if (L.armorLimbs) this.part(fore, G.sphere(aw * 0.56), c.metal2 || metal, 0, 0, 0);
        if (L.trooperLimbs) {
          this.part(upper, G.capsule(aw * 0.58, d.uarm * 0.3), top, 0, -d.uarm * 0.55, 0);
          this.part(fore, G.capsule(aw * 0.54, d.farm * 0.28), top, 0, -d.farm * 0.42, 0);
        }
        if (c.gloves) this.part(fore, G.capsule(aw * 0.5, d.farm * 0.26), c.gloves, 0, -d.farm * 0.76, 0);
        const hand = grp(fore, 0, -d.farm, 0);
        this.part(hand, G.sphere(d.armW * 0.62), c.gloves || (L.trooperLimbs ? '#1b1b20' : skin), 0, 0, 0);
        this.arms.push({ upper, fore, hand });
      }

      // ---------------------------------------------------------- jambes
      this.legs = [];
      for (const s of [1, -1]) {
        const hipJ = grp(body, 0, 0, s * hipZ);
        hipJ.rotation.x = -s * 0.06;
        const thigh = grp(hipJ);
        const lw = d.legW * (L.armorLimbs ? 1.1 : 1);
        this.part(thigh, G.capsule(lw * 0.5, Math.max(1, d.thigh - lw * 0.7)), creature ? skin : legCol, 0, -d.thigh / 2, 0);
        const shin = grp(thigh, 0, -d.thigh, 0);
        const from = L.bootFrom || 0.45;
        const bootCol = c.boots || (creature ? skin : legCol);
        this.part(shin, G.capsule(lw * 0.44, Math.max(1, d.shin * from - lw * 0.3)), creature ? skin : legCol, 0, -d.shin * from / 2, 0);
        this.part(shin, G.capsule(lw * 0.47, Math.max(1, d.shin * (1 - from) - lw * 0.5)), bootCol, 0, -d.shin * (from + 1) / 2, 0);
        if (L.armorLimbs) this.part(shin, G.sphere(lw * 0.56), c.metal2 || metal, lw * 0.15, 0, 0);
        if (L.trooperLimbs) {
          this.part(thigh, G.capsule(lw * 0.57, d.thigh * 0.34), top, 0, -d.thigh * 0.5, 0);
          this.part(shin, G.capsule(lw * 0.54, d.shin * 0.3), top, 0, -d.shin * 0.38, 0);
        }
        this.part(shin, G.ell(lw * 0.95, lw * 0.44, lw * 0.56), bootCol, lw * 0.45, -d.shin + lw * 0.08, 0);
        this.legs.push({ thigh, shin });
      }
      if (L.robe) {
        const R = L.robe, h = d.hipH - (R.short ? 34 : 9);
        this.robe = grp(body);
        this.part(this.robe, G.taper(hipD * 0.5 + 20, d.tBot * 0.5 + 15, hipD * 0.5 + 2, d.tBot * 0.5 + 2, h, true), R.color, 0, 5 - h / 2, 0, { double: true });
        if (R.trim) this.part(this.robe, G.taper(hipD * 0.5 + 21, d.tBot * 0.5 + 16, hipD * 0.5 + 20.6, d.tBot * 0.5 + 15.6, 5, true), R.trim, 0, 7.5 - h, 0, { double: true, plain: true });
      }
      if (L.tail) this.buildTail(body, c, skin);

      // ---------------------------------------------------------- armes
      const w = L.weapon, w2 = L.weapon2;
      if (w && w.type !== 'none') {
        const side = w.hand === 2 ? 1 : 0;
        this.wG = grp(this.arms[side].hand);
        this.wSide = side;
        this.buildWeapon(this.wG, w, c);
      }
      if (w2) {
        this.w2G = grp(this.arms[1].hand);
        this.buildWeapon(this.w2G, w2, c);
      }

      // ---------------------------------------------------------- aura (flammes d'énergie)
      const H = d.height;
      const aura = this.aura = grp(this.root);
      this.auraMat = this.glowMat('#ffffff', 0.2, true);
      this.auraMat.side = T3.DoubleSide;
      this.auraParts = [];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * PI * 2;
        const m = new T3.Mesh(G.cone(24, H * 1.0, 6), this.auraMat);
        m.position.set(Math.cos(a) * 26, H * 0.5, Math.sin(a) * 26);
        aura.add(m);
        this.auraParts.push(m);
      }
      const shellM = new T3.Mesh(G.ell(46, H * 0.62, 46), this.auraMat);
      shellM.position.y = H * 0.55;
      aura.add(shellM);
      aura.visible = false;
    }

    // -------------------------------------------------------------- têtes
    // Yeux posés à plat sur la tête (bien écartés pour rester lisibles de profil comme de face)
    eyes(hd, r, o) {
      const style = o.style || 'normal';
      const z = o.z != null ? o.z : 0.5, x = o.x != null ? o.x : 0.8, y = o.y != null ? o.y : 0.1;
      const col = o.col || '#222222';
      if (!this.irisMat) this.irisMat = this.glowMat(col, 1);
      const k = (o.rad || 1) * r, X = new T3.Vector3(1, 0, 0);
      for (const s of [1, -1]) {
        const n = new T3.Vector3(x, y, s * z).normalize();
        const g = grp(hd, n.x * k * 0.98, n.y * k * 0.98, n.z * k * 0.98);
        g.quaternion.setFromUnitVectors(X, n);
        if (style === 'glow' || style === 'slit') {
          this.part(g, G.ell(0.05 * r, (style === 'slit' ? 0.06 : 0.11) * r, 0.19 * r), col, 0, 0, 0, { mat: this.glowMat(col, 1) });
          this.part(g, G.ell(0.08 * r, 0.2 * r, 0.3 * r), col, 0, 0, 0, { mat: this.glowMat(col, 0.35, true) });
        } else if (style === 'big') {
          this.part(g, G.ell(0.07 * r, 0.33 * r, 0.25 * r), '#ffffff', 0, 0, 0, { plain: true });
          this.part(g, G.ell(0.06 * r, 0.24 * r, 0.17 * r), col, 0.035 * r, -0.03 * r, 0, { mat: this.irisMat });
          this.part(g, G.ell(0.05 * r, 0.14 * r, 0.09 * r), '#111111', 0.06 * r, -0.04 * r, 0, { mat: this.glowMat('#111111', 1) });
          this.part(g, G.sphere(0.05 * r), '#ffffff', 0.09 * r, 0.09 * r, 0.05 * r, { mat: this.glowMat('#ffffff', 1) });
        } else {
          this.part(g, G.ell(0.06 * r, 0.22 * r, 0.18 * r), '#ffffff', 0, 0, 0, { plain: true });
          this.part(g, G.ell(0.05 * r, 0.13 * r, 0.1 * r), col, 0.03 * r, -0.01 * r, 0, { mat: this.irisMat });
          this.part(g, G.sphere(0.035 * r), '#ffffff', 0.065 * r, 0.05 * r, 0.03 * r, { mat: this.glowMat('#ffffff', 1) });
        }
        if (o.brow != null) {
          const b = this.part(g, G.box(0.05 * r, 0.07 * r, 0.4 * r), o.browCol || OUTLINE, 0.03 * r, 0.31 * r, 0, { plain: true });
          b.rotation.x = s * o.brow * 0.16;
        }
      }
    }

    humanFace(hd, r, c, skin, o) {
      const L = this.look;
      o = o || {};
      this.part(hd, G.sphere(r), skin, 0, 0, 0);
      this.part(hd, G.ell(0.7 * r, 0.56 * r, 0.66 * r), skin, 0.26 * r, -0.44 * r, 0);
      this.part(hd, G.cone(0.14 * r, 0.3 * r, 6), skin, 1.02 * r, -0.12 * r, 0, { rz: -PI / 2, plain: true });
      for (const s of [1, -1]) this.part(hd, G.ell(0.12 * r, 0.22 * r, 0.1 * r), U.shade(skin, -0.12), -0.1 * r, -0.05 * r, s * 0.97 * r, { plain: true });
      if (!o.noEyes) this.eyes(hd, r, { style: L.eyeStyle, col: c.eye || '#222222', brow: L.eyeStyle === 'glow' || L.eyeStyle === 'slit' ? null : (L.browAngle != null ? L.browAngle : 1.4), browCol: c.brow || c.hair || OUTLINE });
      this.mouth = this.part(hd, G.box(0.08 * r, 0.07 * r, 0.34 * r), '#5a1020', 0.88 * r, -0.56 * r, 0, { plain: true });
    }

    hair(hd, r, style, col) {
      const g = grp(hd);
      const sp = (dir, base, h) => this.spike(g, dir, r * 0.72, base * r, h * r, col);
      if (style === 'spiky') {
        [[0.5, 1, 0.3], [0.5, 1, -0.3], [-0.1, 1, 0], [-0.6, 0.8, 0.45], [-0.6, 0.8, -0.45], [0.1, 0.75, 0.85], [0.1, 0.75, -0.85],
          [-0.95, 0.35, 0], [-0.75, 0.2, 0.7], [-0.75, 0.2, -0.7], [0.85, 0.75, 0]].forEach((v, i) => sp(v, 0.42, 0.95 + (i % 3) * 0.15));
      } else if (style === 'flame') {
        [[0.25, 1, 0], [-0.15, 1, 0.3], [-0.15, 1, -0.3], [0.45, 1, 0.3], [0.45, 1, -0.3], [-0.5, 0.9, 0], [0, 0.9, 0.6], [0, 0.9, -0.6]]
          .forEach((v, i) => sp(v, 0.4, 1.5 - (i % 4) * 0.18));
        this.part(g, G.shell(r * 1.05, 0, PI * 2, 0, 1.25), col, 0, 0, 0, { rz: 0.3 });
      } else if (style === 'messy') {
        const rnd = U.seeded(41);
        for (let i = 0; i < 16; i++) {
          const a = rnd() * PI * 2, e = 0.25 + rnd() * 0.8;
          const v = [Math.cos(a) * Math.cos(e) - 0.15, Math.sin(e) + 0.1, Math.sin(a) * Math.cos(e)];
          sp(v, 0.36, 0.55 + rnd() * 0.3);
        }
        this.part(g, G.shell(r * 1.05, 0, PI * 2, 0, 1.3), col, 0, 0, 0, { rz: 0.35 });
      } else if (style === 'cap' || style === 'topknot') {
        this.part(g, G.shell(r * 1.07, 0, PI * 2, 0, 1.5), col, 0, 0, 0, { rz: 0.42 });
        if (style === 'topknot') this.part(g, G.sphere(0.34 * r), col, -0.4 * r, 1.15 * r, 0);
      } else if (style === 'golden') {
        [[0.2, 1, 0], [-0.25, 1, 0.35], [-0.25, 1, -0.35], [0.5, 1, 0.3], [0.5, 1, -0.3], [-0.6, 0.85, 0], [0, 0.85, 0.7], [0, 0.85, -0.7],
          [0.8, 0.9, 0], [-0.9, 0.4, 0.4], [-0.9, 0.4, -0.4]].forEach((v, i) => sp(v, 0.44, 1.75 - (i % 4) * 0.2));
        this.part(g, G.shell(r * 1.06, 0, PI * 2, 0, 1.3), col, 0, 0, 0, { rz: 0.3 });
      }
      return g;
    }

    buildHead(hd, r, c, skin) {
      const L = this.look, H = L.head || 'human';
      if (H === 'human' || H === 'ninja' || H === 'hooded' || H === 'samurai' || H === 'pale') {
        if (H === 'ninja') {
          const mask = c.mask || '#1d1d28';
          this.part(hd, G.sphere(r), mask, 0, 0, 0);
          this.part(hd, G.ell(0.7 * r, 0.56 * r, 0.66 * r), mask, 0.26 * r, -0.44 * r, 0);
          this.part(hd, G.shell(r * 1.02, PI - 1.25, 2.5, 1.12, 0.55), skin, 0, 0, 0, { plain: true });
          this.eyes(hd, r, { col: c.eye || '#222222', brow: 1.6, rad: 1.03 });
          this.part(hd, G.taper(r * 1.04, r * 1.04, r * 1.0, r * 1.0, 0.26 * r), c.band || '#c62828', 0, 0.5 * r, 0);
          this.band = grp(hd, -1.0 * r, 0.5 * r, 0);
          this.part(this.band, G.box(0.9 * r, 0.2 * r, 0.1 * r), c.band || '#c62828', -0.45 * r, 0, 0.12 * r);
          this.part(this.band, G.box(0.75 * r, 0.2 * r, 0.1 * r), c.band || '#c62828', -0.38 * r, -0.12 * r, -0.12 * r);
        } else {
          if (L.hairBack) this.part(hd, G.ell(0.55 * r, 1.25 * r, 0.9 * r), c.hair || '#d8d8de', -0.62 * r, -0.55 * r, 0);
          this.humanFace(hd, r, c, skin);
          if (H === 'pale') this.part(hd, G.sphere(0.2 * r), skin, 0.9 * r, -0.12 * r, 0, { plain: true });
        }
        if (L.hair && L.hair !== 'bald') {
          this.hairN = this.hair(hd, r, L.hair, c.hair || '#222222');
          if (L.awaken) { this.hairA = this.hair(hd, r, 'golden', L.awakenHair || '#ffd84a'); this.hairA.visible = false; }
        } else if (L.awaken && L.hair === 'bald') {
          this.hairA = this.hair(hd, r, 'golden', L.awakenHair || '#ffd84a'); this.hairA.visible = false;
        }
        if (L.beard) {
          this.part(hd, G.cone(0.62 * r, 2.3 * r, 8), c.beard || '#e8e8ee', 0.5 * r, -1.55 * r, 0, { rz: PI - 0.12 });
          this.part(hd, G.box(0.16 * r, 0.16 * r, 0.8 * r), c.beard || '#e8e8ee', 0.95 * r, -0.4 * r, 0, { plain: true });
        }
        if (L.glasses) {
          for (const s of [1, -1]) this.part(hd, G.torus(0.3 * r, 0.045 * r), '#1b1b1b', 0.97 * r, 0.1 * r, s * 0.38 * r, { plain: true, ry: PI / 2 });
          this.part(hd, G.box(0.05 * r, 0.05 * r, 0.2 * r), '#1b1b1b', 1.0 * r, 0.12 * r, 0, { plain: true });
        }
        if (L.hat === 'wizard') {
          const hc = c.hat || c.top;
          const hat = grp(hd, -0.05 * r, 0.6 * r, 0);
          hat.rotation.z = 0.14;
          this.part(hat, G.cyl(1.8 * r, 1.8 * r, 0.14 * r, 18), hc, 0, 0, 0);
          this.part(hat, G.cone(0.98 * r, 2.2 * r, 12), hc, 0, 1.12 * r, 0);
          const tip = this.part(hat, G.cone(0.42 * r, 1.0 * r, 8), hc, -0.28 * r, 2.35 * r, 0);
          tip.rotation.z = 0.75;
          this.part(hat, G.taper(1.0 * r, 1.0 * r, 0.9 * r, 0.9 * r, 0.24 * r), U.shade(hc, -0.25), 0, 0.2 * r, 0, { plain: true });
        } else if (L.hat === 'hood') {
          const hc = c.hood || c.top;
          this.part(hd, G.shell(r * 1.34, PI + 0.95, PI * 2 - 1.9, 0, 2.5), hc, -0.05 * r, 0.05 * r, 0, { double: true });
          this.part(hd, G.cone(0.75 * r, 1.5 * r, 8), hc, -1.1 * r, 0.5 * r, 0, { rz: 1.9 });
        } else if (L.hat === 'kabuto') {
          const hc = c.helm || '#2b2b2b';
          this.part(hd, G.shell(r * 1.12, 0, PI * 2, 0, 1.62), hc, 0, -0.05 * r, 0);
          this.part(hd, G.taper(r * 1.14, r * 1.14, r * 1.1, r * 1.1, 0.18 * r), c.accent || '#d4a017', 0, -0.12 * r, 0, { plain: true });
          this.part(hd, G.shell(r * 1.5, -1.25, 2.5, 1.5, 0.75), hc, 0.08 * r, 0, 0, { double: true });
          this.part(hd, G.torus(0.95 * r, 0.09 * r, PI), c.accent || '#d4a017', 0.85 * r, 0.75 * r, 0, { ry: PI / 2 });
        }
        return;
      }
      if (H === 'knight') {
        const m = c.metal || '#b8bec8';
        this.part(hd, G.ell(1.1 * r, 1.2 * r, 1.05 * r), m, 0, 0, 0);
        this.part(hd, G.taper(1.02 * r, 0.98 * r, 1.1 * r, 1.05 * r, 0.9 * r), m, 0.02 * r, -0.6 * r, 0);
        this.part(hd, G.box(0.2 * r, 0.2 * r, 1.5 * r), '#0b0b10', 1.0 * r, 0.16 * r, 0, { plain: true });
        this.part(hd, G.box(0.12 * r, 1.0 * r, 0.1 * r), OUTLINE, 1.1 * r, -0.4 * r, 0, { plain: true });
        this.plume = grp(hd, -0.15 * r, 1.1 * r, 0);
        this.part(this.plume, G.ell(1.2 * r, 0.42 * r, 0.3 * r), c.plume || '#c62828', -0.95 * r, 0.25 * r, 0, { rz: -0.45 });
        this.part(this.plume, G.ell(0.7 * r, 0.3 * r, 0.24 * r), c.plume || '#c62828', -1.9 * r, -0.35 * r, 0, { rz: 0.7 });
      } else if (H === 'darklord') {
        const k = c.helm || '#121216';
        this.part(hd, G.shell(r * 1.3, 0, PI * 2, 0, 1.75), k, -0.05 * r, 0, 0);
        this.part(hd, G.taper(1.62 * r, 1.5 * r, 1.26 * r, 1.26 * r, 0.9 * r, true), k, -0.3 * r, -0.62 * r, 0, { double: true });
        this.part(hd, G.ell(0.6 * r, 0.9 * r, 0.75 * r), '#26262c', 0.62 * r, -0.15 * r, 0);
        for (const s of [1, -1]) {
          this.part(hd, G.ell(0.14 * r, 0.24 * r, 0.3 * r), '#050507', 1.08 * r, 0.12 * r, s * 0.36 * r, { mat: this.glowMat('#050507', 1) });
          this.part(hd, G.sphere(0.07 * r), '#ff3030', 1.2 * r, 0.12 * r, s * 0.36 * r, { mat: this.glowMat('#ff3030', 0.9) });
        }
        this.part(hd, G.cone(0.34 * r, 0.6 * r, 3), '#3d3d44', 1.05 * r, -0.62 * r, 0, { rz: PI, plain: true });
      } else if (H === 'trooper') {
        const w = c.top || '#eef0f2';
        this.part(hd, G.ell(1.12 * r, 1.15 * r, 1.08 * r), w, 0, 0.05 * r, 0);
        this.part(hd, G.taper(0.95 * r, 0.9 * r, 1.1 * r, 1.05 * r, 0.8 * r), w, 0.03 * r, -0.6 * r, 0);
        this.part(hd, G.box(0.3 * r, 0.4 * r, 1.55 * r), '#0d0d12', 0.92 * r, 0.12 * r, 0, { plain: true });
        this.part(hd, G.box(0.36 * r, 0.34 * r, 0.6 * r), '#8a929c', 0.95 * r, -0.58 * r, 0);
        for (const s of [1, -1]) this.part(hd, G.cyl(0.28 * r, 0.28 * r, 0.14 * r), '#9aa3ad', -0.1 * r, -0.2 * r, s * 1.05 * r, { rx: PI / 2, plain: true });
        this.part(hd, G.taper(1.14 * r, 1.1 * r, 1.14 * r, 1.1 * r, 0.12 * r), c.accent || '#4a5a8a', 0, 0.55 * r, 0, { plain: true });
      } else if (H === 'marine') {
        const m = c.metal || c.top;
        this.part(hd, G.ell(1.12 * r, 1.12 * r, 1.08 * r), m, 0, 0.05 * r, 0);
        this.part(hd, G.taper(1.0 * r, 0.95 * r, 1.1 * r, 1.06 * r, 0.8 * r), m, 0.03 * r, -0.55 * r, 0);
        this.part(hd, G.box(0.6 * r, 0.6 * r, 0.75 * r), m, 1.0 * r, -0.5 * r, 0);
        this.part(hd, G.box(0.3 * r, 0.4 * r, 0.5 * r), '#222222', 1.25 * r, -0.5 * r, 0, { plain: true });
        for (const s of [1, -1]) {
          this.part(hd, G.ell(0.12 * r, 0.14 * r, 0.24 * r), c.lens || '#ff2a2a', 1.0 * r, 0.18 * r, s * 0.42 * r, { mat: this.glowMat(c.lens || '#ff2a2a', 1) });
          this.part(hd, G.ell(0.16 * r, 0.24 * r, 0.36 * r), c.lens || '#ff2a2a', 1.0 * r, 0.18 * r, s * 0.42 * r, { mat: this.glowMat(c.lens || '#ff2a2a', 0.4, true) });
        }
      } else if (H === 'dragon') {
        this.part(hd, G.sphere(r), skin, 0, 0, 0);
        this.part(hd, G.ell(1.05 * r, 0.52 * r, 0.62 * r), skin, 1.0 * r, -0.22 * r, 0);
        this.jaw = this.part(hd, G.ell(0.9 * r, 0.22 * r, 0.5 * r), c.belly || '#f4e3b0', 0.9 * r, -0.62 * r, 0);
        for (const s of [1, -1]) {
          this.spike(hd, [-1, 0.75, s * 0.5], r * 0.6, 0.3 * r, 1.4 * r, c.horn || '#f2e6c4');
          this.part(hd, G.sphere(0.07 * r), OUTLINE, 1.92 * r, -0.05 * r, s * 0.25 * r, { plain: true });
        }
        this.eyes(hd, r, { col: c.eye || '#2b7bd6', x: 0.6, y: 0.35, z: 0.72, brow: 1.8 });
      } else if (H === 'cat') {
        this.part(hd, G.ell(1.02 * r, 0.95 * r, 1.05 * r), skin, 0, 0, 0);
        for (const s of [1, -1]) {
          this.spike(hd, [-0.1, 1, s * 0.62], r * 0.62, 0.36 * r, 0.9 * r, skin);
          this.spike(hd, [0.05, 1, s * 0.62], r * 0.66, 0.2 * r, 0.6 * r, U.shade(skin, -0.16), { plain: true });
        }
        this.eyes(hd, r, { style: 'big', col: c.eye || '#3aa0ff', x: 0.8, y: 0.05, z: 0.5, rad: 1.02 });
        this.part(hd, G.sphere(0.07 * r), '#d4607a', 1.02 * r, -0.2 * r, 0, { plain: true });
      } else if (H === 'psy') {
        this.part(hd, G.ell(1.05 * r, 0.95 * r, 1.0 * r), skin, 0, 0, 0);
        this.part(hd, G.ell(0.6 * r, 0.45 * r, 0.55 * r), skin, 0.5 * r, -0.32 * r, 0);
        for (const s of [1, -1]) this.spike(hd, [-0.25, 1, s * 0.55], r * 0.62, 0.3 * r, 0.95 * r, skin);
        this.eyes(hd, r, { col: c.eye || '#7b2fd0', brow: 2.2, x: 0.8, y: 0.12, z: 0.5, rad: 1.02 });
      } else if (H === 'void') {
        this.part(hd, G.sphere(r * 1.05), skin, 0, 0, 0);
        for (let i = 0; i < 6; i++) {
          const a = -0.9 + i * 0.36;
          this.spike(hd, [-Math.cos(a) * 0.8, 0.9, Math.sin(a) * 1.2], r * 0.7, 0.26 * r, 1.25 * r, U.shade(skin, 0.12));
        }
        const ec = c.eye || '#ff3df2';
        [[0.98, 0.15, 0.4], [0.98, 0.15, -0.4], [1.0, 0.52, 0]].forEach((e) => {
          this.part(hd, G.ell(0.08 * r, 0.09 * r, 0.15 * r), ec, e[0] * r, e[1] * r, e[2] * r, { mat: this.glowMat(ec, 1) });
          this.part(hd, G.sphere(0.24 * r), ec, e[0] * r, e[1] * r, e[2] * r, { mat: this.glowMat(ec, 0.35, true) });
        });
      }
    }

    // -------------------------------------------------------------- appendices
    buildTail(body, c, skin) {
      const T = this.look.tail, d = this.d;
      const n = T.segs || 9, seg = T.len / n;
      const col = T.color || skin;
      let g = grp(body, -d.tBot * 0.34, 2, 0);
      this.tail = [];
      for (let i = 0; i < n; i++) {
        const w = U.lerp(T.w0, T.w1, i / n);
        this.part(g, G.capsule(w * 0.5, seg), col, 0, -seg / 2, 0);
        this.tail.push(g);
        g = grp(g, 0, -seg, 0);
      }
      if (T.tip === 'ball') this.part(g, G.sphere(T.w1 * 1.1 + 3), col, 0, 0, 0);
      else if (T.tip === 'flame') {
        const s = 14 * (T.flameScale || 1);
        this.flame = grp(g);
        this.part(this.flame, G.cone(s * 0.75, s * 2.6, 7), '#ff5a00', 0, s * 1.0, 0, { mat: this.glowMat('#ff5a00', 0.75, true) });
        this.part(this.flame, G.cone(s * 0.5, s * 1.8, 7), '#ffb000', 0, s * 0.7, 0, { mat: this.glowMat('#ffb000', 0.85, true) });
        this.part(this.flame, G.sphere(s * 0.42), '#fff2c0', 0, s * 0.15, 0, { mat: this.glowMat('#fff2c0', 0.95) });
      }
    }

    buildWings(twist, D, tH, W, skin) {
      const Wd = this.look.wings, Lw = Wd.len;
      const pts = [[0, 0], [-0.5, 0.36], [-1.28, 0.55], [-1.0, -0.06], [-0.62, -0.3], [-0.06, -0.36]];
      const shape = new T3.Shape();
      shape.moveTo(0, 0);
      for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0] * Lw, pts[i][1] * Lw);
      const sg = geo('wing' + r1(Lw), () => new T3.ShapeGeometry(shape));
      this.wings = [];
      for (const s of [1, -1]) {
        const g = grp(twist, -D * 0.35, tH - 12, s * W * 0.28);
        const m = new T3.Mesh(sg, this.mat(s > 0 ? Wd.membrane : U.shade(Wd.membrane, -0.2), { double: true }));
        g.add(m);
        this.between(g, [0, 0, 0], [pts[1][0] * Lw, pts[1][1] * Lw, 0], 3, skin);
        this.between(g, [pts[1][0] * Lw, pts[1][1] * Lw, 0], [pts[2][0] * Lw, pts[2][1] * Lw, 0], 2, skin);
        this.between(g, [pts[1][0] * Lw, pts[1][1] * Lw, 0], [pts[3][0] * Lw, pts[3][1] * Lw, 0], 1.6, skin, { plain: true });
        this.between(g, [pts[1][0] * Lw, pts[1][1] * Lw, 0], [pts[4][0] * Lw, pts[4][1] * Lw, 0], 1.6, skin, { plain: true });
        this.wings.push({ g, s });
      }
    }

    // L'arme part de la main le long de -Y (comme un membre) ; son plat est tourné vers Z
    buildWeapon(g, w, c) {
      const len = w.len || 90;
      switch (w.type) {
        case 'sword':
          this.part(g, G.box(6.5, len, 2.2), w.color || '#dfe5ee', 0, -6 - len / 2, 0);
          this.part(g, G.box(26, 4, 4), w.guard || '#d4a017', 0, -6, 0);
          this.part(g, G.cyl(2, 2, 18, 8), '#5a3b1c', 0, 4, 0);
          this.part(g, G.sphere(4), w.guard || '#d4a017', 0, 14, 0);
          break;
        case 'katana':
          this.part(g, G.box(4.6, len, 1.6), '#e8edf3', 0, -10 - len / 2, 0);
          this.part(g, G.cyl(7, 7, 2.4, 12), '#d4a017', 0, -10, 0);
          this.part(g, G.cyl(2.5, 2.5, 30, 8), w.grip || '#1d1d40', 0, 6, 0);
          break;
        case 'saber': {
          const col = w.color || '#3fa9ff';
          this.part(g, G.cyl(3, 3, 26, 8), w.hilt || '#9aa3ad', 0, 1, 0);
          this.blade = grp(g);
          this.part(this.blade, G.cyl(2.3, 2.3, len, 8), '#ffffff', 0, -12 - len / 2, 0, { mat: this.glowMat('#ffffff', 1) });
          this.part(this.blade, G.capsule(5.5, len), col, 0, -12 - len / 2, 0, { mat: this.glowMat(col, 0.5, true) });
          this.part(this.blade, G.capsule(9.5, len), col, 0, -12 - len / 2, 0, { mat: this.glowMat(col, 0.2, true) });
          break;
        }
        case 'staff': {
          const grip = w.grip || 0.35, gl = w.glow || '#e9f4ff';
          this.part(g, G.cyl(2.6, 3, len, 8), w.color || '#7a5230', 0, len * (grip - 0.5), 0);
          this.part(g, G.torus(8, 2.4, PI * 1.5), w.color || '#7a5230', 0, -len * (1 - grip), 0, { rz: 0.4 });
          this.part(g, G.sphere(4.5), gl, 0, -len * (1 - grip), 0, { mat: this.glowMat(gl, 1) });
          this.orb = this.part(g, G.sphere(12), gl, 0, -len * (1 - grip), 0, { mat: this.glowMat(gl, 0.35, true) });
          break;
        }
        case 'wand':
          this.part(g, G.cyl(1.2, 1.8, len + 6, 6), w.color || '#6b4423', 0, -(len - 6) / 2, 0);
          this.orb = this.part(g, G.sphere(7), w.glow || '#ff5a5a', 0, -len, 0, { mat: this.glowMat(w.glow || '#ff5a5a', 0.6, true) });
          this.orb.visible = false;
          break;
        case 'rifle':
          this.part(g, G.box(9, 80, 6), '#26262c', 0, -18, 0);
          this.part(g, G.cyl(1.8, 1.8, 16, 6), '#3a3a44', 0, -66, 0);
          this.part(g, G.box(4, 20, 4), '#555555', -7, -28, 0);
          this.part(g, G.box(12, 6, 5), '#444444', 8, -10, 0);
          break;
        case 'bolter':
          this.part(g, G.box(15, 52, 10), w.color || '#3a3a3a', 0, -14, 0);
          this.part(g, G.cyl(3, 3, 10, 8), '#222222', 0, -45, 0);
          this.part(g, G.box(16, 9, 7), '#333333', 12, -12, 0);
          this.part(g, G.box(2, 30, 10.6), '#c9a227', -5, -15, 0, { plain: true });
          break;
        case 'chainsword':
          this.part(g, G.box(12, len, 4.5), '#4b4f57', 0, -8 - len / 2, 0);
          for (let i = 0; i < 8; i++) this.part(g, G.cone(2.6, 6, 4), '#c8ccd2', 8, -14 - (i / 8) * (len - 8), 0, { rz: -PI / 2, plain: true });
          this.part(g, G.box(3, len * 0.8, 5), '#c9a227', -2, -8 - len * 0.4, 0, { plain: true });
          this.part(g, G.cyl(2.6, 2.6, 22, 8), '#2a2a2a', 0, 4, 0);
          break;
        case 'shield': {
          this.shield = grp(g);
          this.part(this.shield, G.cyl(27, 27, 5, 18), w.color || '#1f4fa8', 0, 6, -9, { rx: PI / 2 });
          this.part(this.shield, G.torus(25, 2.4), w.trim || '#e6c449', 0, 6, -12, { plain: true });
          this.part(this.shield, G.sphere(6), w.trim || '#e6c449', 0, 6, -12, { plain: true });
          break;
        }
      }
    }

    // -------------------------------------------------------------- animation
    /**
     * Applique une pose. J : articulations calculées par solve().
     * o : { time, flash, awakened, vx, weaponHidden, glow, mouth, aura (couleur ou null), auraK }
     */
    apply(p, J, o) {
      o = o || {};
      const d = this.d, t = o.time || 0;
      const A = this.arms, Lg = this.legs;
      this.body.position.set(J.hip[0], -J.hip[1], 0);
      this.body.rotation.set(0, p.yaw || 0, -(J.rot || 0));
      this.lean.rotation.z = -p.torso;
      this.twist.rotation.y = U.clamp((p.ua1 - p.ua2) * 0.2, -0.5, 0.5);
      this.headG.rotation.z = -p.head * 0.9;
      A[0].upper.rotation.z = p.ua1; A[0].fore.rotation.z = p.la1;
      A[1].upper.rotation.z = p.ua2; A[1].fore.rotation.z = p.la2;
      Lg[0].thigh.rotation.z = p.th1; Lg[0].shin.rotation.z = p.sh1;
      Lg[1].thigh.rotation.z = p.th2; Lg[1].shin.rotation.z = p.sh2;
      if (this.wG) {
        this.wG.rotation.z = this.wSide ? (p.wa2 - J.farmA2) : (p.wa - J.farmA1);
        this.wG.visible = !o.weaponHidden;
      }
      if (this.w2G) this.w2G.rotation.z = p.wa2 - J.farmA2;
      if (this.shield) this.shield.rotation.z = -p.wa2 + 0.2;
      if (this.orb) {
        const k = o.glow || 0;
        if (this.look.weapon.type === 'wand') { this.orb.visible = k > 0; this.orb.scale.setScalar(1 + k); }
        else this.orb.scale.setScalar(1 + k * 1.2 + Math.sin(t * 6) * 0.06);
      }
      if (this.blade) this.blade.scale.x = this.blade.scale.z = 0.92 + Math.sin(t * 40) * 0.08;
      if (this.robe) {
        // la robe suit l'écartement des jambes
        const f1 = J.foot1[0] - J.hip[0], f2 = J.foot2[0] - J.hip[0];
        const spread = Math.abs(f1 - f2);
        this.robe.scale.x = U.clamp(0.8 + spread / 70, 1, 2.6);
        this.robe.position.x = (f1 + f2) * 0.3;
      }
      const vx = U.clamp((o.vx || 0) * 0.05, -0.7, 0.9);
      if (this.cape) this.cape.rotation.z = p.torso * 0.9 - 0.1 - Math.max(0, vx) + Math.sin(t * 3.2) * 0.04;
      if (this.scarf) this.scarf.rotation.z = p.torso - 0.25 - Math.max(0, vx) * 1.3 + Math.sin(t * 6) * 0.1;
      if (this.band) this.band.rotation.z = -0.2 - Math.max(0, vx) + Math.sin(t * 9) * 0.15;
      if (this.plume) this.plume.rotation.z = Math.sin(t * 5) * 0.08;
      if (this.tail) {
        const T = this.look.tail;
        for (let i = 0; i < this.tail.length; i++) {
          const w = (T.curl || 0.12) + Math.sin(t * (T.speed || 3) + i * 0.7) * (T.wave || 0.12);
          this.tail[i].rotation.z = i === 0 ? (T.angle != null ? T.angle : -2.0) + (p.tail || 0) + w : w;
          this.tail[i].rotation.x = Math.sin(t * (T.speed || 3) * 0.7 + i) * (T.wave || 0.12) * 0.6;
        }
      }
      if (this.flame) { const k = 1 + Math.sin(t * 18) * 0.15; this.flame.scale.set(k, k, k); this.flame.rotation.z = -this.flameWorldTilt(p); }
      if (this.wings) {
        const spread = U.clamp(p.wing != null ? p.wing : 0.3, 0, 1.2);
        const flap = Math.sin(t * (spread > 0.7 ? 14 : 2)) * (spread > 0.7 ? 0.4 : 0.06);
        for (const w of this.wings) {
          w.g.rotation.y = w.s * (0.25 + spread * 0.85);
          w.g.rotation.x = -w.s * flap;
          w.g.rotation.z = 0.2 - spread * 0.25;
        }
      }
      if (this.core) this.core.scale.setScalar(1 + Math.sin(t * 4) * 0.2);
      if (this.mouth) this.mouth.scale.y = o.mouth === 'open' ? 3.2 : 1;
      if (this.jaw) this.jaw.rotation.z = o.mouth === 'open' ? -0.3 : 0;
      // Éveil : cheveux dorés et regard clair
      const aw = !!(o.awakened && this.look.awaken);
      if (this.hairA) { this.hairA.visible = aw; if (this.hairN) this.hairN.visible = !aw; }
      if (this.irisMat && !this.ghostMat && this.aw !== aw) { this.aw = aw; this.irisMat.color.set(aw ? '#2ad3c6' : this.P((this.look.colors && this.look.colors.eye) || '#222222')); }
      // Éclair blanc quand un coup porte
      const fl = Math.max(0, Math.min(1, o.flash || 0)) * 0.85;
      if (fl !== this.fl) {
        this.fl = fl;
        for (let i = 0; i < this.matList.length; i++) {
          const m = this.matList[i], e = m.userData.em;
          m.emissive.setRGB(e.r + fl, e.g + fl, e.b + fl);
        }
      }
      // Aura
      if (o.aura) {
        this.aura.visible = true;
        this.auraMat.color.set(o.aura);
        this.auraMat.opacity = 0.2 * (o.auraK || 1);
        for (let i = 0; i < this.auraParts.length; i++) {
          const m = this.auraParts[i];
          m.scale.y = 0.75 + 0.32 * Math.sin(t * 9 + i * 1.7);
          m.position.y = d.height * 0.5 * m.scale.y;
        }
        this.aura.rotation.y = t * 2.2;
      } else this.aura.visible = false;
    }
    // La flamme de la queue reste à peu près verticale
    flameWorldTilt() {
      let a = 0;
      for (let i = 0; i < this.tail.length; i++) a += this.tail[i].rotation.z;
      return a;
    }
    dispose() {
      for (const m of this.matList) m.dispose();
      for (const m of this.glows) m.dispose();
      if (this.ghostMat) this.ghostMat.dispose();
      if (this.root.parent) this.root.parent.remove(this.root);
    }
  }

  // Modèle partagé pour les portraits et aperçus (un par apparence)
  const sharedModels = {};
  function sharedModel(look) {
    if (!three()) return null;
    const key = look.id;
    if (!sharedModels[key]) {
      const keys = Object.keys(sharedModels);
      if (keys.length > 40) { sharedModels[keys[0]].dispose(); delete sharedModels[keys[0]]; }
      sharedModels[key] = new Model(look);
    }
    return sharedModels[key];
  }

  // Portrait (buste) pour les menus : rendu 3D copié dans un canevas 2D
  const portraitCache = {};
  function portrait(look, size, opts) {
    opts = opts || {};
    const key = look.id + '|' + size + '|' + (opts.shadow ? 1 : 0) + '|' + (opts.silhouette ? 1 : 0) + '|' + (opts.full ? 1 : 0) + '|' + (opts.flip ? 1 : 0);
    if (portraitCache[key]) return portraitCache[key];
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    if (C.R3 && C.R3.drawModel) {
      const pose = completePose(Object.assign({}, look.portraitPose || C.Poses.get('portrait', look)));
      C.R3.drawModel(cv, look, pose, { portrait: !opts.full, flip: opts.flip, silhouette: opts.silhouette, time: 0.3 });
    }
    portraitCache[key] = cv;
    return cv;
  }
  // Aperçu animé (corps entier) dessiné dans un canevas 2D des menus
  function renderPreview(cv, look, pose, opts) {
    if (C.R3 && C.R3.drawModel) C.R3.drawModel(cv, look, pose, opts || {});
  }

  // Position monde d'une articulation (après draw/solve)
  function worldPoint(J, name, look, facing, ox, oy) {
    const p = J[name];
    const sc = look.scale || 1;
    if (!p) return [ox, oy];
    let x = p[0], y = p[1];
    if (J.rot) {
      const hx = J.hip[0], hy = J.hip[1];
      const c = Math.cos(J.rot), s = Math.sin(J.rot);
      const dx = x - hx, dy = y - hy;
      x = hx + dx * c - dy * s; y = hy + dx * s + dy * c;
    }
    return [ox + x * sc * facing, oy + y * sc];
  }

  function weaponTip(J, look, facing, ox, oy) {
    const w = look.weapon;
    const sc = look.scale || 1;
    if (!w) return worldPoint(J, 'hand1', look, facing, ox, oy);
    const hand = w.hand === 2 ? J.hand2 : J.hand1;
    const a = w.hand === 2 ? J.wa2 : J.wa;
    const len = (w.len || 60) * (w.type === 'staff' ? 0.65 : 1) + 10;
    return [ox + (hand[0] + Math.sin(a) * len) * sc * facing, oy + (hand[1] + Math.cos(a) * len) * sc];
  }

  C.Rig = { dims, solve, lerpPose, completePose, worldPoint, weaponTip, portrait, renderPreview, Model, sharedModel, three, BUILDS, BASE };
})(window.CDL = window.CDL || {});
