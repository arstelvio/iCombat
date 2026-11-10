/* Choc des Légendes — succès et récompenses */
(function (C) {
  'use strict';

  const LIST = [
    { id: 'premier_sang', name: 'Premier sang', desc: 'Remporter un combat.', reward: 50 },
    { id: 'perfection', name: 'Perfection', desc: 'Gagner une manche sans subir le moindre dégât.', reward: 150 },
    { id: 'combo10', name: 'Enchaînement', desc: 'Réussir un combo de 10 coups.', reward: 100 },
    { id: 'combo20', name: 'Virtuose', desc: 'Réussir un combo de 20 coups.', reward: 200 },
    { id: 'parade10', name: 'Parade parfaite', desc: 'Réussir 10 parades (au total).', reward: 120, progress: (s) => [s.stats.parries, 10] },
    { id: 'ultime_ko', name: 'Coup de grâce', desc: 'Achever un adversaire avec une Ultime.', reward: 150 },
    { id: 'eveil', name: 'Éveil Doré', desc: 'Déclencher une transformation en combat.', reward: 50 },
    { id: 'temps', name: 'Patience', desc: 'Gagner une manche au temps.', reward: 80 },
    { id: 'garde10', name: 'Briseur de garde', desc: 'Briser la garde adverse 10 fois.', reward: 100, progress: (s) => [s.stats.guardCrushes, 10] },
    { id: 'projections25', name: 'Lutteur', desc: 'Réussir 25 projections.', reward: 100, progress: (s) => [s.stats.throws, 25] },
    { id: 'chapitre5', name: 'En route !', desc: 'Terminer le chapitre 5 du mode Histoire.', reward: 150 },
    { id: 'histoire', name: 'Légende vivante', desc: 'Terminer le mode Histoire.', reward: 500 },
    { id: 'histoire_3', name: 'Perfectionniste', desc: 'Obtenir 3 étoiles sur tous les chapitres.', reward: 800, progress: (s) => [C.Story.totalStars(s), C.Story.chapters.length * 3] },
    { id: 'arcade', name: 'Champion d\'arcade', desc: 'Terminer le mode Arcade.', reward: 300 },
    { id: 'arcade_legend', name: 'Légendaire !', desc: 'Terminer l\'Arcade en difficulté Légendaire.', reward: 800 },
    { id: 'survie10', name: 'Survivant', desc: 'Enchaîner 10 victoires en Survie.', reward: 300, progress: (s) => [s.survival.best, 10] },
    { id: 'difficile', name: 'Sans peur', desc: 'Vaincre un adversaire de niveau Légendaire.', reward: 250 },
    { id: 'collection', name: 'Collectionneur', desc: 'Débloquer tous les combattants.', reward: 500, progress: (s) => [s.unlocked.length, C.Roster.list.length] },
    { id: 'polyvalent', name: 'Touche-à-tout', desc: 'Gagner avec 10 combattants différents.', reward: 300, progress: (s) => [Object.keys(s.stats.byChar).filter((k) => s.stats.byChar[k].wins > 0).length, 10] },
    { id: 'centurion', name: 'Centurion', desc: 'Remporter 100 combats.', reward: 500, progress: (s) => [s.stats.wins, 100] },
    { id: 'costume', name: 'Garde-robe', desc: 'Acheter un costume dans la boutique.', reward: 60 },
    { id: 'assidu', name: 'Assidu', desc: 'Terminer 5 séances d\'entraînement.', reward: 60, progress: (s) => [s.stats.trainings || 0, 5] },
    { id: 'heros', name: 'Un héros est né', desc: 'Créer son propre héros.', reward: 100 },
    { id: 'ecole', name: 'Diplômé', desc: 'Terminer l\'École du Maître.', reward: 100 },
    { id: 'esquive10', name: 'Insaisissable', desc: 'Esquiver 10 attaques en se décalant sur le côté.', reward: 120, progress: (s) => [s.stats.dodges || 0, 10] },
    { id: 'aura_max', name: 'Puissance maximale', desc: 'Charger son aura jusqu\'à 3 barres.', reward: 80 },
    { id: 'eveil_heros', name: 'Jamais abandonner', desc: 'Gagner un combat après l\'Éveil du héros.', reward: 120 }
  ];

  const byId = {};
  LIST.forEach((a) => { byId[a.id] = a; });

  const Ach = {
    list: LIST,
    byId,
    has(id) { const s = C.Store.current; return !!(s && s.achievements[id]); },
    // Débloque un succès (retourne true si nouveau)
    grant(id) {
      const s = C.Store.current;
      if (!s || s.achievements[id] || !byId[id]) return false;
      s.achievements[id] = Date.now();
      C.Store.addOrbs(byId[id].reward);
      if (C.UI && C.UI.toast) C.UI.toast('🏆 Succès : ' + byId[id].name, '+' + byId[id].reward + ' orbes');
      C.Audio.play('unlock');
      return true;
    },
    // Vérifie les succès basés sur les statistiques cumulées
    checkStats() {
      const s = C.Store.current;
      if (!s) return;
      for (const a of LIST) {
        if (a.progress && !s.achievements[a.id]) {
          const [v, max] = a.progress(s);
          if (v >= max) this.grant(a.id);
        }
      }
      if (C.Story.completed(s)) this.grant('histoire');
      if (s.story.done[5]) this.grant('chapitre5');
    },
    // Après un combat contre le CPU (ou en local)
    afterFight(ctx) {
      const r = ctx.result;
      if (!r) return;
      if (r.winner === 0) {
        this.grant('premier_sang');
        if (r.perfectRounds > 0) this.grant('perfection');
        if (r.ultKO) this.grant('ultime_ko');
        if (r.timeoutWin) this.grant('temps');
        if (ctx.difficulty >= 3) this.grant('difficile');
      }
      if (r.stats.maxCombo >= 10) this.grant('combo10');
      if (r.stats.maxCombo >= 20) this.grant('combo20');
      if (ctx.transformed) this.grant('eveil');
      this.checkStats();
    }
  };

  C.Achievements = Ach;
})(window.CDL = window.CDL || {});
