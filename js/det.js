/* Choc des Légendes — simulation déterministe (jeu en ligne).
   En ligne, chaque téléphone calcule le combat de son côté à partir des seules commandes des deux joueurs :
   les deux calculs doivent donner exactement le même résultat, image après image.
   - Le hasard du combat (U.rand, U.choice…) vient d'un générateur à graine commune, en arithmétique entière.
   - Les fonctions trigonométriques des navigateurs (Math.sin, Math.cos…) peuvent différer d'un iPhone à un
     téléphone Android au dernier chiffre près : pendant la simulation, on les remplace par des versions écrites
     ici avec les seules opérations exactes (+ − × ÷ et racine carrée), identiques partout.
   - Les effets visuels, les sons et les réglages de chaque téléphone ne touchent pas à ce hasard. */
(function (C) {
  'use strict';
  const U = C.U;

  // ---------------------------------------------------------------- générateur (mulberry32)
  class Rng {
    constructor(seed) { this.s = (seed >>> 0) || 0x9e3779b9; }
    next() {
      let t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  }

  // ---------------------------------------------------------------- trigonométrie déterministe
  const PI = 3.141592653589793, PIO2 = 1.5707963267948966, PIO4 = 0.7853981633974483;
  const PIO2_1 = 1.57079632673412561417e+00, PIO2_2 = 6.07710050630396597660e-11, PIO2_3 = 2.02226624871116645580e-21;
  const INVPIO2 = 6.36619772367581382433e-01;
  const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
    S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
  const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
    C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
  const ksin = (r) => { const z = r * r; return r + r * z * (S1 + z * (S2 + z * (S3 + z * (S4 + z * (S5 + z * S6))))); };
  const kcos = (r) => { const z = r * r; return 1 - 0.5 * z + z * z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6))))); };
  // x = k·π/2 + r, avec |r| ≤ π/4 (réduction en trois morceaux : exacte pour les angles du jeu)
  function reduce(x) {
    const k = Math.round(x * INVPIO2);
    const r = ((x - k * PIO2_1) - k * PIO2_2) - k * PIO2_3;
    return [((k % 4) + 4) % 4, r];
  }
  function dsin(x) {
    x = +x;
    if (x !== x || x === Infinity || x === -Infinity) return NaN;
    if (x === 0) return x;
    const [n, r] = reduce(x);
    return n === 0 ? ksin(r) : n === 1 ? kcos(r) : n === 2 ? -ksin(r) : -kcos(r);
  }
  function dcos(x) {
    x = +x;
    if (x !== x || x === Infinity || x === -Infinity) return NaN;
    const [n, r] = reduce(x);
    return n === 0 ? kcos(r) : n === 1 ? -ksin(r) : n === 2 ? -kcos(r) : ksin(r);
  }
  function dtan(x) { return dsin(x) / dcos(x); }
  // arc tangente (approximation rationnelle de Cephes) et réduction de l'argument
  const P0 = -8.750608600031904122785e-01, P1 = -1.615753718733365076637e+01, P2 = -7.500855792314704667340e+01,
    P3 = -1.228866684490136173410e+02, P4 = -6.485021904942025371773e+01;
  const Q0 = 2.485846490142306297962e+01, Q1 = 1.650270098316988542046e+02, Q2 = 4.328810604912902668951e+02,
    Q3 = 4.853903996359136964868e+02, Q4 = 1.945506571482613964425e+02;
  const T3P8 = 2.41421356237309504880, MOREBITS = 6.123233995736765886130e-17;
  function datan(x) {
    x = +x;
    if (x !== x) return NaN;
    if (x === 0) return x;
    const neg = x < 0;
    if (neg) x = -x;
    let y0 = 0, extra = 0;
    if (x > T3P8) { y0 = PIO2; extra = MOREBITS; x = -1 / x; }
    else if (x > 0.66) { y0 = PIO4; extra = 0.5 * MOREBITS; x = (x - 1) / (x + 1); }
    const z = x * x;
    let y = x + x * z * ((((P0 * z + P1) * z + P2) * z + P3) * z + P4) / (((((z + Q0) * z + Q1) * z + Q2) * z + Q3) * z + Q4);
    y = y0 + (y + extra);
    return neg ? -y : y;
  }
  function datan2(y, x) {
    y = +y; x = +x;
    if (y !== y || x !== x) return NaN;
    if (x === 0) {
      if (y === 0) return (1 / x < 0) ? (1 / y < 0 ? -PI : PI) : y;
      return y > 0 ? PIO2 : -PIO2;
    }
    if (x === Infinity) return y === Infinity ? PIO4 : y === -Infinity ? -PIO4 : (1 / y < 0 ? -0 : 0);
    if (x === -Infinity) return y === Infinity ? 3 * PIO4 : y === -Infinity ? -3 * PIO4 : (1 / y < 0 ? -PI : PI);
    if (y === Infinity) return PIO2;
    if (y === -Infinity) return -PIO2;
    const a = datan(y / x);
    if (x > 0) return a;
    return y < 0 || (y === 0 && 1 / y < 0) ? a - PI : a + PI;
  }
  // exponentielle et logarithme (pour les puissances non entières)
  const LN2_HI = 6.93147180369123816490e-01, LN2_LO = 1.90821492927058770002e-10, INVLN2 = 1.44269504088896338700e+00;
  function scale2(v, k) {
    while (k > 30) { v *= 1073741824; k -= 30; }
    while (k < -30) { v /= 1073741824; k += 30; }
    let p = 1;
    if (k >= 0) { for (let i = 0; i < k; i++) p *= 2; return v * p; }
    for (let i = 0; i < -k; i++) p *= 2;
    return v / p;
  }
  function dexp(x) {
    x = +x;
    if (x !== x) return NaN;
    if (x > 709.78) return Infinity;
    if (x < -745.2) return 0;
    const k = Math.round(x * INVLN2);
    const r = (x - k * LN2_HI) - k * LN2_LO;
    let s = 1, t = 1;
    for (let i = 1; i <= 16; i++) { t = t * r / i; s += t; }
    return scale2(s, k);
  }
  function dlog(x) {
    x = +x;
    if (x !== x || x < 0) return NaN;
    if (x === 0) return -Infinity;
    if (x === Infinity) return Infinity;
    let e = 0;
    while (x >= 1.4142135623730951) { x /= 2; e++; }
    while (x < 0.7071067811865476) { x *= 2; e--; }
    const s = (x - 1) / (x + 1), z = s * s;
    let sum = 0, p = s;
    for (let i = 1; i <= 41; i += 2) { sum += p / i; p *= z; }
    return 2 * sum + e * LN2_HI + e * LN2_LO;
  }
  function dpow(x, y) {
    x = +x; y = +y;
    if (y === 0) return 1;
    if (x !== x || y !== y) return NaN;
    if (Number.isInteger(y) && Math.abs(y) <= 1024) {
      let n = Math.abs(y), b = x, r = 1;
      while (n > 0) { if (n & 1) r *= b; b *= b; n = Math.floor(n / 2); }
      return y < 0 ? 1 / r : r;
    }
    if (x < 0) return NaN;
    if (x === 0) return y > 0 ? 0 : Infinity;
    return dexp(y * dlog(x));
  }
  function dhypot() {
    let s = 0;
    for (let i = 0; i < arguments.length; i++) { const v = +arguments[i]; if (v === Infinity || v === -Infinity) return Infinity; s += v * v; }
    return Math.sqrt(s);
  }

  const NATIVE = { sin: Math.sin, cos: Math.cos, tan: Math.tan, atan: Math.atan, atan2: Math.atan2, exp: Math.exp, log: Math.log, pow: Math.pow, hypot: Math.hypot };
  const DET = { sin: dsin, cos: dcos, tan: dtan, atan: datan, atan2: datan2, exp: dexp, log: dlog, pow: dpow, hypot: dhypot };

  // ---------------------------------------------------------------- empreinte de l'état (FNV-1a sur les octets exacts)
  const f64 = new Float64Array(1), u8 = new Uint8Array(f64.buffer);
  class Hash {
    constructor() { this.h = 0x811c9dc5; }
    num(v) {
      f64[0] = typeof v === 'number' ? v : v ? 1 : 0;
      let h = this.h;
      for (let i = 0; i < 8; i++) { h ^= u8[i]; h = Math.imul(h, 16777619); }
      this.h = h;
      return this;
    }
    str(s) {
      s = String(s == null ? '' : s);
      let h = this.h;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 255; h = Math.imul(h, 16777619); h ^= s.charCodeAt(i) >> 8; h = Math.imul(h, 16777619); }
      this.h = h;
      return this;
    }
    value() { return this.h >>> 0; }
  }

  // Empreinte d'un combat : tout ce qui décide de la suite (positions, vies, états, projectiles, hasard)
  function battleHash(b) {
    const H = new Hash();
    H.num(b.frame).str(b.phase).num(b.pt).num(b.clock === Infinity ? -1 : b.clock).num(b.round).num(b.slowmo).num(b.freeze ? b.freeze.t : -1);
    if (b.rng) H.num(b.rng.s);
    for (const f of b.f) {
      H.num(f.x).num(f.y).num(f.vx).num(f.vy).num(f.hp).num(f.meter).num(f.guard).num(f.facing).str(f.state).num(f.st)
        .str(f.move ? f.move.id : '').num(f.mf || 0).num(f.hitstun || 0).num(f.hitstop || 0).num(f.invuln || 0).num(f.wins)
        .num(f.awakened || 0).num(f.comboHits || 0).num(f.onGround).num(f.crouching);
    }
    H.num(b.entities.length);
    for (const e of b.entities) { H.num(e.x || 0).num(e.y || 0).num(e.dead); if (e.hp != null) H.num(e.hp); }
    return H.value();
  }

  // ---------------------------------------------------------------- exécution déterministe
  const Det = {
    active: false,
    Rng,
    Hash,
    battleHash,
    math: DET,
    // Exécute fn avec le hasard du combat et les fonctions mathématiques déterministes
    run(rng, fn) {
      if (Det.active) return fn();
      Det.active = true;
      const prevRandom = U.getRandom();
      U.setRandom(() => rng.next());
      for (const k in DET) Math[k] = DET[k];
      try { return fn(); } finally {
        for (const k in NATIVE) Math[k] = NATIVE[k];
        U.setRandom(prevRandom);
        Det.active = false;
      }
    },
    // Graine aléatoire pour un nouveau combat (choisie par l'hôte)
    seed() { return (Math.floor(Math.random() * 4294967295) >>> 0) || 1; }
  };

  C.Det = Det;
})(window.CDL = window.CDL || {});
