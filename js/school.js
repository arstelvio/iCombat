/* Choc des Légendes — l'École du Maître : tutoriel guidé et lu à voix haute pour apprendre à combattre */
(function (C) {
  'use strict';
  const U = C.U;

  // Partenaire d'entraînement : immobile, ou qui avance et frappe pendant la leçon de garde
  class Sparring {
    constructor() { this.isCPU = true; this.mode = 'stand'; this.t = 0; }
    get(f) {
      this.t++;
      const out = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, c: 0, g: 0, s: 0, t: 0 };
      if (this.mode !== 'attack') return out;
      const o = f.opp, d = o.x - f.x;
      if (Math.abs(d) > 150) out[d > 0 ? 'r' : 'l'] = 1;
      else if (this.t % 55 === 0) out.a = 1;
      return out;
    }
  }

  const touch = () => C.touchDevice || C.Input.lastDevice === 'touch';
  const K = (name, key) => touch() ? name : name + ' (touche ' + key + ')';
  const seenAny = (s, ids) => ids.some((id) => s.seen[id]);

  const LESSONS = [
    { hl: 'stick',
      text: () => 'Bienvenue, jeune héros ! Je suis Maître Shen. ' + (touch() ? 'Pose ton pouce à gauche de l\'écran et fais-le glisser pour marcher vers ton adversaire.' : 'Marche vers ton adversaire avec Q et D, ou les flèches.'),
      check: (s, b) => Math.abs(b.f[0].x - s.x0) > 110 },
    { hl: 'stick',
      text: () => 'Bien ! Pour sauter, ' + (touch() ? 'glisse ton pouce vers le haut.' : 'appuie sur Z, ou sur la flèche du haut.'),
      check: (s, b) => !b.f[0].onGround },
    { hl: 'a',
      text: () => 'Approche-toi et frappe avec ' + K('LÉGER', 'J') + ', trois fois de suite : c\'est un combo !',
      check: (s, b) => s.seen.L3 || b.f[0].matchStats.hits - s.hits0 >= 3 },
    { hl: 'b',
      text: () => 'Un gros coup maintenant : appuie sur ' + K('LOURD', 'K') + ' !',
      check: (s) => seenAny(s, ['H', 'UH', 'DH', 'AH', 'FH']) },
    { hl: 'c',
      text: () => 'Lance une technique spéciale avec ' + K('SPÉCIAL', 'L') + ' ! Essaie aussi en poussant le joystick.',
      check: (s) => s.kinds.special },
    { hl: 'g', attack: true,
      text: () => 'Attention, il va t\'attaquer ! Reste appuyé sur ' + K('GARDE', 'I') + ' pour bloquer ses coups.',
      check: (s, b) => b.f[0].matchStats.blocks + b.f[0].matchStats.parries - s.blocks0 >= 2 },
    { hl: 's', meter: 0,
      text: () => 'Maintenant, le secret des grands guerriers : maintiens ' + K('ULTRA', 'O') + ' appuyé pour charger ton aura, jusqu\'à remplir une barre !',
      check: (s, b) => b.f[0].meter >= 100 },
    { hl: 's',
      text: () => 'Ta barre est pleine ! Touche ' + K('ULTRA', 'O') + ' d\'un coup sec pour lancer ta SUPER attaque !',
      check: (s) => s.kinds.super || s.kinds.ultimate },
    { hl: 's', meterMin: 160,
      text: () => 'Dernière leçon : avec trois barres, ' + K('ULTRA', 'O') + ' lance ton attaque ULTIME ! Charge ton aura à fond, puis touche ULTRA !',
      check: (s) => s.kinds.ultimate }
  ];
  const FINAL = 'Bravo ! Tu as réussi toutes mes leçons. Et souviens-toi : quand tu es presque K.O., ton héros se réveille. Ne baisse jamais les bras !';

  const School = {
    active: false,
    LESSONS,

    // Lance l'École : le héros du joueur (ou Carotte) contre un partenaire d'entraînement
    start() {
      const hero = C.Roster.get('hero') ? 'hero' : 'kairo';
      C.Game.start({
        mode: 'training', school: true,
        p1: { char: hero }, p2: { char: hero === 'kairo' ? 'takeda' : 'kairo' },
        stage: 'dojo', difficulty: 0, rounds: 1, time: 0, dummy: 'stand',
        training: { infiniteHp: true, infiniteMeter: false, dummyLabel: '', school: true }
      });
    },

    attach(b) {
      this.active = true;
      this.b = b;
      this.sparring = new Sparring();
      b.f[1].controller = this.sparring;
      this.idx = -1; this.wait = 50; this.doneT = 0;
      if (!this.el) {
        this.el = document.createElement('div');
        this.el.id = 'lesson';
        this.el.innerHTML = '<div class="lesson-master">🧙‍♂️</div><div class="lesson-body"><div class="lesson-head"><span class="lesson-name">Maître Shen</span><span class="lesson-step"></span></div><div class="lesson-text"></div></div>';
      }
      document.body.appendChild(this.el);
      this.show('Bienvenue à l\'École du Maître !', '');
    },
    detach() {
      this.active = false;
      this.b = null;
      if (C.Input) C.Input.highlight = null;
      if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    },

    show(text, step) {
      if (!this.el) return;
      this.el.querySelector('.lesson-text').textContent = text;
      this.el.querySelector('.lesson-step').textContent = step || '';
      this.el.classList.remove('pop'); void this.el.offsetWidth; this.el.classList.add('pop');
    },

    begin(i) {
      const b = this.b, p = b.f[0];
      this.idx = i;
      const L = LESSONS[i];
      this.s = { x0: p.x, hits0: p.matchStats.hits, blocks0: p.matchStats.blocks + p.matchStats.parries, seen: {}, kinds: {} };
      this.sparring.mode = L.attack ? 'attack' : 'stand';
      if (L.meter != null) p.meter = L.meter;
      if (L.meterMin != null) p.meter = Math.max(p.meter, L.meterMin);
      C.Input.highlight = L.hl;
      const text = L.text();
      this.show(text, 'Leçon ' + (i + 1) + ' / ' + LESSONS.length);
      C.Voice.say(text, { who: 'master' });
    },

    update(b) {
      if (!this.active || b !== this.b || b.paused) return;
      const p = b.f[0];
      if (this.doneT) { if (++this.doneT > 420) this.finish(); return; }
      if (this.wait > 0) {
        if (--this.wait === 0) {
          if (this.idx + 1 < LESSONS.length) this.begin(this.idx + 1);
          else this.complete();
        }
        return;
      }
      const s = this.s;
      if (p.state === 'move' && p.move) { s.seen[p.move.id] = true; s.kinds[p.move.kind] = true; }
      if (LESSONS[this.idx].check(s, b)) {
        C.Audio.play('unlock');
        C.FX.text(p.x, p.y - p.height() - 50, U.choice(['BRAVO !', 'SUPER !', 'GÉNIAL !', 'PARFAIT !']), '#7dff8a', 46, 70);
        C.Voice.say(U.choice(['Bravo !', 'Excellent !', 'Très bien !', 'Génial !']), { who: 'master' });
        this.sparring.mode = 'stand';
        C.Input.highlight = null;
        this.wait = 90;
      }
    },

    complete() {
      this.doneT = 1;
      C.Input.highlight = null;
      this.show(FINAL, 'Diplômé !');
      C.Voice.say(FINAL, { who: 'master' });
      C.Audio.play('unlock');
      const p = this.b.f[0];
      C.FX.text(p.x, p.y - p.height() - 60, 'DIPLÔMÉ !', '#ffd23f', 56, 120);
    },

    finish() {
      const first = C.Store.current && !(C.Store.current.achievements.ecole);
      const orbs = first ? 200 : 40;
      C.Store.addOrbs(orbs);
      const lv = C.Store.addXp(first ? 100 : 30);
      C.Achievements.grant('ecole');
      C.Store.save();
      this.detach();
      C.Game.leave();
      C.Audio.music('victory');
      C.UI.go('schoolDone', { orbs, xp: lv.xp, levels: lv.levels }, { reset: true });
    }
  };

  C.School = School;
  C.Game.startSchool = () => School.start();
})(window.CDL = window.CDL || {});
