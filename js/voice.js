/* Choc des Légendes — voix : synthèse vocale de l'appareil (iPhone, Android, ordinateur).
   L'histoire est lue à voix haute, les héros crient le nom de leurs attaques, le Maître parle à l'élève. */
(function (C) {
  'use strict';
  const synth = window.speechSynthesis;
  const V = { ok: !!(synth && window.SpeechSynthesisUtterance), voice: null, last: '' };
  let unlocked = false;

  function pickVoice() {
    if (!V.ok) return null;
    let vs = [];
    try { vs = synth.getVoices() || []; } catch (e) { vs = []; }
    const fr = vs.filter((v) => /^fr([-_]|$)/i.test(v.lang || ''));
    V.voice = fr.find((v) => /fr[-_]FR/i.test(v.lang) && v.localService) || fr.find((v) => /fr[-_]FR/i.test(v.lang)) || fr[0] || null;
    return V.voice;
  }
  if (V.ok) {
    pickVoice();
    try {
      if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice);
      else synth.onvoiceschanged = pickVoice;
    } catch (e) { /* ignore */ }
  }

  // Timbre de chaque personnage : hauteur (pitch) et débit (rate)
  const PROFILES = {
    narrator: [1.0, 0.95], master: [0.8, 0.92], announcer: [0.9, 1.0], hero: [1.3, 1.08],
    kairo: [1.2, 1.08], zarkan: [0.9, 1.02], aldaron: [0.7, 0.88], godefroy: [0.8, 0.95], kage: [0.95, 1.05],
    takeda: [0.85, 0.92], cassius: [0.65, 0.95], leo: [1.35, 1.1], mordrak: [0.6, 0.9], kael: [1.0, 1.0],
    noctis: [0.45, 0.85], malvar: [0.5, 0.85], tk7: [1.1, 1.15], pyrodrake: [0.4, 0.9], lumi: [1.9, 1.2],
    psykron: [0.7, 0.9], omega: [0.35, 0.8]
  };

  V.enabled = () => V.ok && C.Store && C.Store.settings.voice !== false;

  // Retire les indications de jeu entre parenthèses et la ponctuation décorative
  function clean(t) {
    return String(t || '').replace(/\([^)]*\)/g, ' ').replace(/[«»]/g, '').replace(/…/g, '... ').replace(/\s+/g, ' ').trim();
  }
  V.clean = clean;

  // opts : { who, shout, interrupt (true par défaut), rate, pitch }
  V.say = function (text, opts) {
    opts = opts || {};
    const t = clean(text);
    if (!V.enabled() || !t || /^[.!?\s]*$/.test(t)) return false;
    try {
      if (opts.interrupt !== false) synth.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'fr-FR';
      if (V.voice || pickVoice()) u.voice = V.voice;
      const pr = PROFILES[opts.who] || PROFILES.hero;
      u.pitch = Math.max(0, Math.min(2, opts.pitch != null ? opts.pitch : pr[0] + (opts.shout ? 0.1 : 0)));
      u.rate = Math.max(0.5, Math.min(1.6, opts.rate != null ? opts.rate : pr[1] * (opts.shout ? 1.12 : 1)));
      u.volume = 1;
      V.last = t;
      synth.speak(u);
      return true;
    } catch (e) { return false; }
  };
  V.stop = function () { try { if (V.ok) synth.cancel(); } catch (e) { /* ignore */ } };

  // iOS : la voix n'est autorisée qu'après un premier énoncé lancé pendant un toucher
  V.unlock = function () {
    if (unlocked || !V.ok) return;
    unlocked = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) { /* ignore */ }
  };

  C.Voice = V;
})(window.CDL = window.CDL || {});
