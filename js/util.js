/* Choc des Légendes — utilitaires communs */
(function (C) {
  'use strict';
  const U = {};

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  // Hasard : Math.random par défaut ; pendant un combat en ligne, le générateur à graine commune (voir det.js)
  let rnd = Math.random;
  U.setRandom = (fn) => { rnd = fn || Math.random; };
  U.getRandom = () => rnd;
  U.random = () => rnd();
  U.rand = (a, b) => a + rnd() * (b - a);
  U.randi = (a, b) => Math.floor(a + rnd() * (b - a + 1));
  U.choice = (arr) => arr[Math.floor(rnd() * arr.length)];
  U.chance = (p) => rnd() < p;
  U.approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
  U.easeOut = (t) => 1 - (1 - t) * (1 - t);
  U.easeIn = (t) => t * t;
  U.easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  U.easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.TAU = Math.PI * 2;

  // Générateur pseudo-aléatoire déterministe (pour les décors / musiques)
  U.seeded = function (seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return (s % 100000) / 100000;
    };
  };

  // Couleurs
  const cache = {};
  U.hexToRgb = function (hex) {
    if (cache[hex]) return cache[hex];
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    const r = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    cache[hex] = r;
    return r;
  };
  U.rgbToHex = function (r, g, b) {
    const t = (v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + t(r) + t(g) + t(b);
  };
  // amt > 0 éclaircit, amt < 0 assombrit (-1..1)
  const shadeCache = {};
  U.shade = function (hex, amt) {
    const key = hex + amt;
    if (shadeCache[key]) return shadeCache[key];
    const c = U.hexToRgb(hex);
    let r, g, b;
    if (amt >= 0) {
      r = c.r + (255 - c.r) * amt; g = c.g + (255 - c.g) * amt; b = c.b + (255 - c.b) * amt;
    } else {
      r = c.r * (1 + amt); g = c.g * (1 + amt); b = c.b * (1 + amt);
    }
    return (shadeCache[key] = U.rgbToHex(r, g, b));
  };
  U.rgba = function (hex, a) {
    const c = U.hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  };
  U.mix = function (h1, h2, t) {
    const a = U.hexToRgb(h1), b = U.hexToRgb(h2);
    return U.rgbToHex(U.lerp(a.r, b.r, t), U.lerp(a.g, b.g, t), U.lerp(a.b, b.b, t));
  };

  // Rectangles {x,y,w,h}
  U.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  U.fmtTime = function (sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + 'h ' : '') + String(m).padStart(h ? 2 : 1, '0') + 'min ' + String(s).padStart(2, '0') + 's';
  };

  U.deepClone = (o) => JSON.parse(JSON.stringify(o));

  U.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  C.U = U;
})(window.CDL = window.CDL || {});
