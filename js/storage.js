/* Choc des Légendes — sauvegardes (3 emplacements) et réglages */
(function (C) {
  'use strict';
  const PREFIX = 'cdl_';
  const SLOT_COUNT = 3;

  const backend = {
    get(key) {
      try {
        if (window.AndroidBridge && window.AndroidBridge.load) {
          const v = window.AndroidBridge.load(PREFIX + key);
          if (v !== null && v !== undefined) return v;
        }
      } catch (e) { /* ignore */ }
      try { return window.localStorage.getItem(PREFIX + key); } catch (e) { return null; }
    },
    set(key, value) {
      try { if (window.AndroidBridge && window.AndroidBridge.save) window.AndroidBridge.save(PREFIX + key, value); } catch (e) { /* ignore */ }
      try { window.localStorage.setItem(PREFIX + key, value); } catch (e) { /* ignore */ }
    },
    remove(key) {
      try { if (window.AndroidBridge && window.AndroidBridge.remove) window.AndroidBridge.remove(PREFIX + key); } catch (e) { /* ignore */ }
      try { window.localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
    }
  };

  const DEFAULT_SETTINGS = {
    music: 0.6,
    sfx: 0.8,
    vibration: true,
    shake: true,
    damageNumbers: true,
    controlSize: 1.0,
    controlOpacity: 0.55,
    leftHanded: false,
    quality: 'auto',      // auto | high | medium | low
    rounds: 2,            // manches gagnantes
    time: 99,             // 60 | 99 | 0 (infini)
    defaultDifficulty: 1, // 0..3
    showInputs: false,
    autoBlockHint: true,
    language: 'fr'
  };

  const STARTERS = ['kairo', 'godefroy', 'kage', 'leo'];
  const START_STAGES = ['temple', 'chateau', 'bambous', 'dojo'];

  function newSaveData(name) {
    const now = Date.now();
    return {
      v: 1,
      name: name || 'Joueur',
      created: now,
      updated: now,
      playTime: 0,
      orbs: 300,
      unlocked: STARTERS.slice(),
      costumes: {},
      stages: START_STAGES.slice(),
      story: { done: {}, difficulty: 1, seenIntro: false },
      arcade: { cleared: {}, best: 0 },
      survival: { best: 0, bestChar: null },
      stats: {
        fights: 0, wins: 0, losses: 0, kos: 0, perfects: 0, maxCombo: 0,
        parries: 0, ultimateKOs: 0, guardCrushes: 0, throws: 0, byChar: {}
      },
      achievements: {},
      lastChar: 'kairo',
      lastStage: 'temple'
    };
  }

  function migrate(d) {
    const base = newSaveData(d.name);
    for (const k in base) if (d[k] === undefined) d[k] = base[k];
    for (const k in base.stats) if (d.stats[k] === undefined) d.stats[k] = base.stats[k];
    if (!d.story.done) d.story.done = {};
    return d;
  }

  const Store = {
    SLOT_COUNT,
    settings: Object.assign({}, DEFAULT_SETTINGS),
    slots: [],
    current: null,
    currentIndex: -1,

    init() {
      this.loadSettings();
      this.loadSlots();
      const last = parseInt(backend.get('lastSlot'), 10);
      if (!isNaN(last) && this.slots[last]) {
        this.lastSlot = last;
      }
    },

    loadSettings() {
      const raw = backend.get('settings');
      if (raw) {
        try { Object.assign(this.settings, JSON.parse(raw)); } catch (e) { /* défaut */ }
      }
    },
    saveSettings() { backend.set('settings', JSON.stringify(this.settings)); },
    resetSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS); this.saveSettings(); },

    loadSlots() {
      this.slots = [];
      for (let i = 0; i < SLOT_COUNT; i++) {
        const raw = backend.get('slot' + i);
        let d = null;
        if (raw) { try { d = migrate(JSON.parse(raw)); } catch (e) { d = null; } }
        this.slots.push(d);
      }
    },

    createSlot(i, name) {
      const d = newSaveData(name);
      this.slots[i] = d;
      this.writeSlot(i);
      return d;
    },
    useSlot(i) {
      this.currentIndex = i;
      this.current = this.slots[i];
      backend.set('lastSlot', String(i));
      this.sessionStart = performance.now();
    },
    writeSlot(i) {
      const d = this.slots[i];
      if (!d) return;
      d.updated = Date.now();
      backend.set('slot' + i, JSON.stringify(d));
    },
    deleteSlot(i) {
      backend.remove('slot' + i);
      this.slots[i] = null;
      if (this.currentIndex === i) { this.current = null; this.currentIndex = -1; }
    },
    // Sauvegarde automatique de la partie courante (avec cumul du temps de jeu)
    save() {
      if (!this.current) return;
      const now = performance.now();
      if (this.sessionStart) {
        this.current.playTime += (now - this.sessionStart) / 1000;
        this.sessionStart = now;
      }
      this.writeSlot(this.currentIndex);
    },

    // Aides de progression
    isUnlocked(charId) { return !!this.current && this.current.unlocked.indexOf(charId) >= 0; },
    unlockChar(charId) {
      if (!this.current || this.isUnlocked(charId)) return false;
      this.current.unlocked.push(charId);
      return true;
    },
    hasStage(id) { return !!this.current && this.current.stages.indexOf(id) >= 0; },
    unlockStage(id) {
      if (!this.current || this.hasStage(id)) return false;
      this.current.stages.push(id);
      return true;
    },
    costumesOf(charId) {
      if (!this.current) return [0];
      return [0].concat(this.current.costumes[charId] || []);
    },
    unlockCostume(charId, idx) {
      const c = this.current.costumes[charId] || (this.current.costumes[charId] = []);
      if (c.indexOf(idx) < 0) c.push(idx);
    },
    addOrbs(n) { if (this.current) this.current.orbs = Math.max(0, this.current.orbs + Math.round(n)); },
    progressPercent(d) {
      d = d || this.current;
      if (!d) return 0;
      const totalChars = C.Roster ? C.Roster.list.length : 17;
      const totalChapters = C.Story ? C.Story.chapters.length : 14;
      const totalAch = C.Achievements ? C.Achievements.list.length : 20;
      const stars = Object.keys(d.story.done).reduce((s, k) => s + (d.story.done[k] || 0), 0);
      const p = (d.unlocked.length / totalChars) * 0.4 +
        (stars / (totalChapters * 3)) * 0.4 +
        (Object.keys(d.achievements).length / totalAch) * 0.2;
      return Math.round(Math.min(1, p) * 100);
    },
    charStats(id) {
      const s = this.current.stats.byChar;
      return s[id] || (s[id] = { used: 0, wins: 0 });
    }
  };

  C.Store = Store;
  C.STARTERS = STARTERS;
})(window.CDL = window.CDL || {});
