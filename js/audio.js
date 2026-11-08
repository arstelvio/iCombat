/* Choc des Légendes — audio 100 % synthétisé (WebAudio) : bruitages et musiques procédurales */
(function (C) {
  'use strict';
  const U = C.U;
  const A = { ready: false, musicName: null };
  let ctx = null, master, sfxBus, musicBus, comp, noiseBuf;
  const lastPlayed = {};

  // iOS : le contexte peut aussi être « interrupted » (appel, retour d'arrière-plan)
  function wake() {
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') return;
    const p = ctx.resume();
    if (p && p.catch) p.catch(() => {});
  }
  // iOS ne débloque le son qu'en jouant quelque chose pendant un geste de l'utilisateur
  function unlock() {
    try {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) { /* ignore */ }
  }

  A.init = function () {
    if (ctx) { if (ctx.state !== 'running') { wake(); unlock(); } return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6;
    comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.9;
    sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    sfxBus.connect(comp); musicBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
    // Tampon de bruit blanc réutilisable
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    unlock();
    A.ready = true;
    A.applyVolumes();
    if (A.pendingMusic) { const m = A.pendingMusic; A.pendingMusic = null; A.music(m); }
  };

  A.applyVolumes = function () {
    if (!ctx) return;
    const s = C.Store.settings;
    sfxBus.gain.value = s.sfx;
    musicBus.gain.value = s.music * 0.55;
  };
  A.suspend = function () { if (ctx && ctx.state === 'running') ctx.suspend(); };
  A.resume = wake;

  // --- Briques de synthèse -------------------------------------------------
  function env(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.setValueAtTime(Math.max(peak, 0.0002), t + a + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur + rel);
  }
  function tone(o) {
    const t = o.t || ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.slide || o.d || 0.1));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    env(g, t, o.a || 0.005, o.v || 0.3, o.d || 0.1, o.r || 0.08);
    let node = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || 1;
      if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + (o.d || 0.1));
      osc.connect(f); node = f;
    }
    if (o.vib) {
      const lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = o.vib; lg.gain.value = o.vibAmt || 20;
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + (o.a || 0.005) + (o.d || 0.1) + (o.r || 0.08) + 0.05);
    }
    node.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + (o.a || 0.005) + (o.d || 0.1) + (o.r || 0.08) + 0.05);
  }
  function noise(o) {
    const t = o.t || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.ft || 'lowpass';
    f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.d || 0.1) + (o.r || 0.1));
    f.Q.value = o.q || 0.8;
    const g = ctx.createGain();
    env(g, t, o.a || 0.003, o.v || 0.3, o.d || 0.05, o.r || 0.1);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + (o.a || 0.003) + (o.d || 0.05) + (o.r || 0.1) + 0.05);
  }

  // --- Bruitages -----------------------------------------------------------
  const SFX = {
    hit_light() {
      noise({ ft: 'bandpass', f: 2200, q: 1.2, v: 0.5, d: 0.02, r: 0.07 });
      tone({ type: 'square', f: 220, f2: 70, v: 0.18, d: 0.03, r: 0.05 });
    },
    hit_heavy() {
      noise({ ft: 'lowpass', f: 2500, f2: 300, v: 0.7, d: 0.05, r: 0.2 });
      tone({ type: 'sine', f: 160, f2: 38, v: 0.6, d: 0.08, r: 0.18 });
      tone({ type: 'square', f: 90, f2: 40, v: 0.15, d: 0.05, r: 0.1 });
    },
    hit_slash() {
      noise({ ft: 'highpass', f: 2500, v: 0.45, d: 0.03, r: 0.12 });
      tone({ type: 'sawtooth', f: 900, f2: 200, v: 0.12, d: 0.05, r: 0.08 });
      tone({ type: 'sine', f: 140, f2: 50, v: 0.4, d: 0.05, r: 0.12 });
    },
    block() {
      tone({ type: 'triangle', f: 1100, f2: 700, v: 0.25, d: 0.03, r: 0.08 });
      noise({ ft: 'highpass', f: 3500, v: 0.25, d: 0.02, r: 0.05 });
    },
    parry() {
      tone({ type: 'square', f: 1500, f2: 2400, v: 0.18, d: 0.06, r: 0.1 });
      tone({ type: 'sine', f: 2400, v: 0.3, d: 0.15, r: 0.3 });
      tone({ type: 'sine', f: 3600, v: 0.12, d: 0.1, r: 0.3 });
    },
    whoosh() { noise({ ft: 'bandpass', f: 700, f2: 2600, q: 1.5, v: 0.22, a: 0.02, d: 0.04, r: 0.08 }); },
    whoosh_heavy() { noise({ ft: 'bandpass', f: 400, f2: 1500, q: 1.2, v: 0.32, a: 0.03, d: 0.06, r: 0.12 }); },
    jump() { tone({ type: 'sine', f: 260, f2: 520, v: 0.12, d: 0.06, r: 0.05 }); noise({ ft: 'lowpass', f: 900, v: 0.12, d: 0.02, r: 0.05 }); },
    land() { noise({ ft: 'lowpass', f: 500, v: 0.3, d: 0.02, r: 0.08 }); },
    dash() { noise({ ft: 'bandpass', f: 1500, f2: 400, q: 1, v: 0.28, d: 0.05, r: 0.12 }); },
    ki() {
      tone({ type: 'sawtooth', f: 300, f2: 900, v: 0.16, d: 0.12, r: 0.15, lp: 2500 });
      tone({ type: 'sine', f: 600, f2: 1300, v: 0.2, d: 0.1, r: 0.2, vib: 30, vibAmt: 40 });
      noise({ ft: 'bandpass', f: 3000, v: 0.12, d: 0.1, r: 0.15 });
    },
    fire() {
      noise({ ft: 'lowpass', f: 1800, f2: 600, v: 0.45, a: 0.02, d: 0.25, r: 0.25 });
      noise({ ft: 'bandpass', f: 400, q: 0.6, v: 0.3, d: 0.2, r: 0.2 });
    },
    explosion() {
      noise({ ft: 'lowpass', f: 1400, f2: 90, v: 0.9, d: 0.12, r: 0.6 });
      tone({ type: 'sine', f: 110, f2: 28, v: 0.7, d: 0.15, r: 0.45 });
    },
    beam() {
      tone({ type: 'sawtooth', f: 110, v: 0.2, a: 0.05, d: 0.9, r: 0.4, lp: 1600, vib: 9, vibAmt: 8 });
      tone({ type: 'sawtooth', f: 165, v: 0.12, a: 0.05, d: 0.9, r: 0.4, lp: 2400, detune: 9 });
      noise({ ft: 'bandpass', f: 1800, q: 0.7, v: 0.35, a: 0.05, d: 0.9, r: 0.4 });
    },
    charge() { tone({ type: 'sawtooth', f: 90, f2: 240, v: 0.12, a: 0.05, d: 0.4, r: 0.2, lp: 900, vib: 14, vibAmt: 12 }); },
    slash() {
      noise({ ft: 'highpass', f: 2800, f2: 1200, v: 0.32, a: 0.01, d: 0.04, r: 0.08 });
    },
    saber() {
      tone({ type: 'sawtooth', f: 95, f2: 140, v: 0.14, a: 0.01, d: 0.12, r: 0.12, lp: 900 });
      tone({ type: 'sawtooth', f: 97, f2: 150, v: 0.1, a: 0.01, d: 0.12, r: 0.12, lp: 1200 });
      noise({ ft: 'bandpass', f: 900, f2: 2200, v: 0.12, d: 0.05, r: 0.1 });
    },
    saber_hit() {
      tone({ type: 'sawtooth', f: 180, f2: 60, v: 0.3, d: 0.06, r: 0.15, lp: 1800 });
      noise({ ft: 'highpass', f: 2000, v: 0.4, d: 0.03, r: 0.12 });
    },
    blaster() {
      tone({ type: 'square', f: 2200, f2: 180, v: 0.16, d: 0.1, r: 0.06 });
      tone({ type: 'sawtooth', f: 1400, f2: 120, v: 0.08, d: 0.12, r: 0.05 });
    },
    bullet() {
      noise({ ft: 'bandpass', f: 1800, q: 0.8, v: 0.45, d: 0.015, r: 0.06 });
      tone({ type: 'square', f: 140, f2: 50, v: 0.25, d: 0.02, r: 0.05 });
    },
    lightning() {
      for (let i = 0; i < 5; i++) {
        noise({ t: ctx.currentTime + i * 0.05 + Math.random() * 0.02, ft: 'bandpass', f: 2500 + Math.random() * 2000, q: 2, v: 0.3, d: 0.01, r: 0.04 });
      }
      tone({ type: 'sawtooth', f: 60, v: 0.18, d: 0.25, r: 0.1, lp: 3000, vib: 40, vibAmt: 30 });
    },
    magic() {
      const t = ctx.currentTime;
      [880, 1320, 1760, 2640].forEach((f, i) => tone({ t: t + i * 0.035, type: 'sine', f: f, v: 0.12, d: 0.03, r: 0.15 }));
      noise({ ft: 'highpass', f: 5000, v: 0.1, d: 0.1, r: 0.15 });
    },
    dark() {
      tone({ type: 'sawtooth', f: 220, f2: 70, v: 0.18, d: 0.2, r: 0.2, lp: 900 });
      tone({ type: 'sine', f: 110, f2: 55, v: 0.25, d: 0.2, r: 0.2, vib: 6, vibAmt: 10 });
    },
    psy() {
      tone({ type: 'sine', f: 400, f2: 900, v: 0.2, d: 0.2, r: 0.2, vib: 22, vibAmt: 60 });
      tone({ type: 'triangle', f: 600, f2: 300, v: 0.12, d: 0.2, r: 0.2, vib: 17, vibAmt: 40 });
    },
    teleport() {
      tone({ type: 'sine', f: 2400, f2: 300, v: 0.14, d: 0.08, r: 0.05 });
      tone({ t: ctx.currentTime + 0.08, type: 'sine', f: 300, f2: 2400, v: 0.14, d: 0.08, r: 0.06 });
    },
    chainsaw() {
      tone({ type: 'sawtooth', f: 55, v: 0.25, d: 0.3, r: 0.1, lp: 1200, vib: 32, vibAmt: 18 });
      noise({ ft: 'bandpass', f: 1200, q: 2, v: 0.25, d: 0.3, r: 0.1 });
    },
    roar() {
      tone({ type: 'sawtooth', f: 140, f2: 70, v: 0.35, a: 0.04, d: 0.4, r: 0.3, lp: 1100, vib: 18, vibAmt: 12 });
      noise({ ft: 'lowpass', f: 900, v: 0.35, a: 0.04, d: 0.35, r: 0.3 });
    },
    stun() {
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i++) tone({ t: t + i * 0.07, type: 'square', f: 1400 - i * 150, v: 0.08, d: 0.03, r: 0.03 });
    },
    throw() {
      noise({ ft: 'bandpass', f: 600, f2: 1800, v: 0.25, a: 0.02, d: 0.06, r: 0.1 });
      tone({ t: ctx.currentTime + 0.12, type: 'sine', f: 120, f2: 40, v: 0.5, d: 0.06, r: 0.2 });
    },
    grab() { tone({ type: 'square', f: 300, f2: 180, v: 0.12, d: 0.04, r: 0.05 }); },
    guardbreak() {
      noise({ ft: 'highpass', f: 3000, v: 0.55, d: 0.05, r: 0.3 });
      tone({ type: 'triangle', f: 1600, f2: 300, v: 0.3, d: 0.15, r: 0.2 });
      tone({ type: 'sine', f: 90, f2: 40, v: 0.5, d: 0.1, r: 0.25 });
    },
    ko() {
      noise({ ft: 'lowpass', f: 1800, f2: 80, v: 0.9, d: 0.2, r: 0.9 });
      tone({ type: 'sine', f: 90, f2: 25, v: 0.8, d: 0.3, r: 0.8 });
      tone({ type: 'sawtooth', f: 220, f2: 55, v: 0.18, d: 0.4, r: 0.6, lp: 1200 });
    },
    super() {
      tone({ type: 'sawtooth', f: 150, f2: 1200, v: 0.18, a: 0.02, d: 0.45, r: 0.2, lp: 3000, slide: 0.45 });
      noise({ ft: 'bandpass', f: 500, f2: 5000, q: 1.2, v: 0.3, a: 0.05, d: 0.4, r: 0.2 });
      const t = ctx.currentTime + 0.5;
      [523, 659, 784, 1046].forEach((f) => tone({ t: t, type: 'square', f: f, v: 0.08, d: 0.2, r: 0.4 }));
    },
    transform() {
      tone({ type: 'sawtooth', f: 80, f2: 400, v: 0.2, a: 0.1, d: 0.7, r: 0.3, lp: 2000, vib: 12, vibAmt: 20, slide: 0.8 });
      noise({ ft: 'bandpass', f: 300, f2: 4000, v: 0.35, a: 0.1, d: 0.6, r: 0.3 });
      tone({ t: ctx.currentTime + 0.8, type: 'sine', f: 1046, v: 0.2, d: 0.3, r: 0.6 });
    },
    select() { tone({ type: 'square', f: 660, v: 0.07, d: 0.02, r: 0.04 }); },
    confirm() {
      tone({ type: 'square', f: 880, v: 0.09, d: 0.04, r: 0.05 });
      tone({ t: ctx.currentTime + 0.06, type: 'square', f: 1320, v: 0.09, d: 0.06, r: 0.1 });
    },
    back() { tone({ type: 'square', f: 520, f2: 330, v: 0.08, d: 0.05, r: 0.06 }); },
    error() { tone({ type: 'square', f: 180, v: 0.1, d: 0.12, r: 0.06 }); },
    coin() {
      tone({ type: 'square', f: 1320, v: 0.08, d: 0.04, r: 0.03 });
      tone({ t: ctx.currentTime + 0.07, type: 'square', f: 1760, v: 0.08, d: 0.1, r: 0.15 });
    },
    unlock() {
      const t = ctx.currentTime;
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ t: t + i * 0.09, type: 'square', f: f, v: 0.08, d: 0.06, r: 0.2 }));
    },
    announce() {
      const t = ctx.currentTime;
      [220, 277, 330, 440].forEach((f) => tone({ t: t, type: 'sawtooth', f: f, v: 0.08, a: 0.01, d: 0.25, r: 0.3, lp: 600, lp2: 4000 }));
      noise({ ft: 'lowpass', f: 600, v: 0.3, d: 0.05, r: 0.3 });
    },
    fight() {
      const t = ctx.currentTime;
      [330, 415, 494, 659].forEach((f) => tone({ t: t, type: 'sawtooth', f: f, v: 0.09, a: 0.01, d: 0.3, r: 0.5, lp: 900, lp2: 5000 }));
      tone({ type: 'sine', f: 82, f2: 41, v: 0.5, d: 0.2, r: 0.4 });
    },
    tick() { tone({ type: 'square', f: 1000, v: 0.05, d: 0.01, r: 0.02 }); },
    shield() {
      tone({ type: 'sine', f: 700, f2: 1100, v: 0.15, d: 0.1, r: 0.2, vib: 25, vibAmt: 50 });
      noise({ ft: 'highpass', f: 4000, v: 0.08, d: 0.1, r: 0.1 });
    },
    reflect() {
      tone({ type: 'triangle', f: 900, f2: 1800, v: 0.2, d: 0.06, r: 0.1 });
      tone({ type: 'sine', f: 1800, v: 0.15, d: 0.05, r: 0.2 });
    },
    footstep() { noise({ ft: 'lowpass', f: 300, v: 0.08, d: 0.01, r: 0.03 }); }
  };

  A.play = function (name, vol) {
    if (!ctx || !A.ready || C.Store.settings.sfx <= 0) return;
    const fn = SFX[name];
    if (!fn) return;
    // Anti-saturation : pas plus d'un même son toutes les 35 ms
    const now = ctx.currentTime;
    if (lastPlayed[name] && now - lastPlayed[name] < 0.035) return;
    lastPlayed[name] = now;
    try { fn(vol); } catch (e) { /* ignore */ }
  };

  A.vibrate = function (ms) {
    if (!C.Store.settings.vibration) return;
    try {
      if (navigator.vibrate) navigator.vibrate(ms | 0);
    } catch (e) { /* ignore */ }
  };

  // --- Musique procédurale -------------------------------------------------
  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
    major: [0, 2, 4, 5, 7, 9, 11],
    mixo: [0, 2, 4, 5, 7, 9, 10]
  };
  const DRUMS = {
    rock: { k: '1000000010100000', s: '0000100000001000', h: '1010101010101010' },
    drive: { k: '1000001010000010', s: '0000100000001001', h: '1111111111111111' },
    half: { k: '1000000000100000', s: '0000000010000000', h: '1010101010101010' },
    epic: { k: '1000000010000000', s: '0000100000001000', h: '0010001000100010' },
    calm: { k: '1000000000000000', s: '0000000000000000', h: '0000100000001000' },
    boss: { k: '1010001010100010', s: '0000100000001010', h: '1111111111111111' },
    none: { k: '0000000000000000', s: '0000000000000000', h: '0000000000000000' }
  };
  const SONGS = {
    menu: { bpm: 104, root: 45, scale: 'harmonic', prog: [0, 5, 3, 4], drums: 'epic', seed: 11, lead: 'square', arp: true, pad: true },
    story: { bpm: 84, root: 50, scale: 'dorian', prog: [0, 3, 5, 4], drums: 'calm', seed: 7, lead: 'triangle', arp: true, pad: true },
    select: { bpm: 120, root: 47, scale: 'minor', prog: [0, 6, 5, 6], drums: 'rock', seed: 23, lead: 'square', arp: true },
    battle1: { bpm: 142, root: 45, scale: 'minor', prog: [0, 5, 6, 4], drums: 'drive', seed: 31, lead: 'square', arp: true },
    battle2: { bpm: 150, root: 43, scale: 'dorian', prog: [0, 6, 3, 4], drums: 'rock', seed: 47, lead: 'sawtooth', arp: true },
    battle3: { bpm: 136, root: 48, scale: 'phrygian', prog: [0, 1, 0, 6], drums: 'drive', seed: 59, lead: 'square', arp: true },
    battle4: { bpm: 128, root: 46, scale: 'harmonic', prog: [0, 3, 4, 0], drums: 'half', seed: 71, lead: 'triangle', arp: true, pad: true },
    battle5: { bpm: 158, root: 44, scale: 'mixo', prog: [0, 6, 3, 0], drums: 'drive', seed: 83, lead: 'square', arp: true },
    boss: { bpm: 164, root: 41, scale: 'phrygian', prog: [0, 1, 6, 1], drums: 'boss', seed: 97, lead: 'sawtooth', arp: true, pad: true },
    victory: { bpm: 132, root: 48, scale: 'major', prog: [0, 3, 4, 0], drums: 'epic', seed: 5, lead: 'square', arp: true, once: true }
  };

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const seq = { song: null, step: 0, next: 0, timer: null, data: null };

  function buildSong(def) {
    const rnd = U.seeded(def.seed * 7919);
    const scale = SCALES[def.scale];
    const deg = (d) => { const o = Math.floor(d / 7); const i = ((d % 7) + 7) % 7; return scale[i] + 12 * o; };
    const bars = def.prog.length * 2;
    const lead = [];
    const rhythms = ['1010101010101010', '1001001010010010', '1000101010001010', '1010001010100010', '1110101011101010', '1000100010001000'];
    let cur = 4;
    for (let b = 0; b < bars; b++) {
      const chord = def.prog[b % def.prog.length];
      const rh = rhythms[Math.floor(rnd() * rhythms.length)];
      const bar = [];
      for (let s = 0; s < 16; s++) {
        if (rh[s] === '1' && !(b % 4 === 3 && s > 10)) {
          if (s % 4 === 0) {
            const tones = [chord, chord + 2, chord + 4, chord + 7];
            cur = tones[Math.floor(rnd() * tones.length)];
          } else {
            cur += rnd() < 0.5 ? (rnd() < 0.5 ? 1 : -1) : (rnd() < 0.5 ? 2 : -2);
          }
          cur = U.clamp(cur, -1, 11);
          bar.push(deg(cur));
        } else bar.push(null);
      }
      lead.push(bar);
    }
    return { def, deg, bars, lead };
  }

  function playStep(step, t) {
    const S = seq.data, def = S.def;
    const bus = musicBus;
    const s16 = step % 16;
    const bar = Math.floor(step / 16) % S.bars;
    const chord = def.prog[bar % def.prog.length];
    const root = def.root;
    const dr = DRUMS[def.drums];
    const spb = 60 / def.bpm / 4;
    if (dr.k[s16] === '1') tone({ t, bus, type: 'sine', f: 150, f2: 40, slide: 0.12, v: 0.55, d: 0.04, r: 0.12 });
    if (dr.s[s16] === '1') {
      noise({ t, bus, ft: 'bandpass', f: 1800, q: 0.6, v: 0.32, d: 0.02, r: 0.12 });
      tone({ t, bus, type: 'triangle', f: 220, f2: 140, v: 0.15, d: 0.02, r: 0.06 });
    }
    if (dr.h[s16] === '1') noise({ t, bus, ft: 'highpass', f: 7000, v: s16 % 4 === 2 ? 0.1 : 0.06, d: 0.005, r: 0.03 });
    // Basse
    if (s16 % 4 === 0 || (def.drums === 'drive' && s16 % 2 === 0) || (def.drums === 'boss' && s16 % 2 === 0)) {
      const n = root - 12 + S.deg(chord) + (s16 % 8 === 6 ? 12 : 0);
      tone({ t, bus, type: 'sawtooth', f: mtof(n), v: 0.16, d: spb * 1.4, r: 0.05, lp: 500, lp2: 260 });
    }
    // Arpège
    if (def.arp && s16 % 2 === 0) {
      const arp = [0, 2, 4, 7, 4, 2, 0, 4];
      const n = root + 12 + S.deg(chord + arp[(s16 / 2) % 8]);
      tone({ t, bus, type: 'triangle', f: mtof(n), v: 0.045, d: spb * 0.6, r: 0.04 });
    }
    // Nappe
    if (def.pad && s16 === 0) {
      [0, 2, 4].forEach((d) => tone({ t, bus, type: 'triangle', f: mtof(root + S.deg(chord + d)), v: 0.035, a: 0.2, d: spb * 13, r: 0.4 }));
    }
    // Mélodie
    const note = S.lead[bar][s16];
    if (note !== null && note !== undefined) {
      tone({ t, bus, type: def.lead, f: mtof(root + 12 + note), v: def.lead === 'sawtooth' ? 0.05 : 0.06, d: spb * 1.2, r: 0.08, lp: def.lead === 'sawtooth' ? 2600 : 0 || undefined });
    }
  }

  function scheduler() {
    if (!seq.data || !ctx) return;
    const spb = 60 / seq.data.def.bpm / 4;
    while (seq.next < ctx.currentTime + 0.15) {
      if (seq.data.def.once && seq.step >= seq.data.bars * 16 / 2) { A.stopMusic(); return; }
      playStep(seq.step, seq.next);
      seq.next += spb;
      seq.step++;
    }
  }

  A.music = function (name) {
    if (!ctx) { A.pendingMusic = name; return; }
    if (A.musicName === name && seq.timer) return;
    A.stopMusic();
    const def = SONGS[name];
    if (!def) return;
    A.musicName = name;
    seq.data = buildSong(def);
    seq.step = 0;
    seq.next = ctx.currentTime + 0.08;
    seq.timer = setInterval(scheduler, 30);
  };
  A.stopMusic = function () {
    if (seq.timer) clearInterval(seq.timer);
    seq.timer = null;
    seq.data = null;
    A.musicName = null;
  };
  A.battleSongs = ['battle1', 'battle2', 'battle3', 'battle4', 'battle5'];

  C.Audio = A;
})(window.CDL = window.CDL || {});
