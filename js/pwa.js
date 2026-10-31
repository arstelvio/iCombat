/* Choc des Légendes — application web : iPhone/iPad (écran d'accueil), hors ligne, mises à jour */
(function (C) {
  'use strict';
  const nav = window.navigator;
  const ua = nav.userAgent || '';
  const iOS = /iP(hone|od|ad)/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const standalone = nav.standalone === true ||
    !!(window.matchMedia && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
  const native = !!window.AndroidBridge;
  const web = !native && /^https?:$/.test(location.protocol);

  const Pwa = C.Pwa = {
    iOS, standalone, native,
    iosBrowser: iOS && !standalone && !native, // ouvert dans Safari : proposer l'ajout à l'écran d'accueil
    canVibrate: native || typeof nav.vibrate === 'function',
    offlineReady: false,
    updateReady: false,
    version: null
  };
  const root = document.documentElement.classList;
  if (iOS) root.add('ios');
  if (standalone) root.add('standalone');
  if (Pwa.iosBrowser) root.add('ios-browser');

  // Notification affichée dès que l'interface est prête
  function notify(title, sub) {
    const go = () => { if (C.UI && C.UI.toast && document.getElementById('toasts')) C.UI.toast(title, sub); else setTimeout(go, 500); };
    go();
  }

  // ------------------------------------------------------------ hors ligne (service worker)
  if (web && 'serviceWorker' in nav) {
    window.addEventListener('load', () => {
      const sw = nav.serviceWorker;
      const firstInstall = !sw.controller;
      sw.register('sw.js').then((reg) => {
        Pwa.registration = reg;
        // Vérifie les mises à jour quand on revient dans le jeu (iOS garde l'app en mémoire)
        let lastCheck = Date.now();
        document.addEventListener('visibilitychange', () => {
          if (document.hidden || Date.now() - lastCheck < 10 * 60 * 1000) return;
          lastCheck = Date.now();
          reg.update().catch(() => {});
        });
      }).catch(() => { /* hors ligne ou non pris en charge : le jeu marche quand même */ });

      sw.ready.then(() => {
        Pwa.offlineReady = true;
        if (sw.controller) sw.controller.postMessage('version');
        if (firstInstall && standalone) notify('Prêt à jouer hors ligne', 'Le jeu complet est enregistré sur l\'appareil.');
      });
      sw.addEventListener('message', (e) => { if (e.data && e.data.type === 'version') Pwa.version = e.data.version; });
      // Nouvelle version installée : on recharge dès que le joueur est sur l'écran titre
      sw.addEventListener('controllerchange', () => {
        if (firstInstall) return;
        Pwa.updateReady = true;
      });
      setInterval(() => {
        if (!Pwa.updateReady || document.hidden) return;
        const onTitle = C.UI && C.UI.current && C.UI.current.name === 'title' && !C.UI.modalEl && !(C.Game && C.Game.battle);
        if (!onTitle) return;
        Pwa.updateReady = false;
        try { if (C.Store) C.Store.save(); } catch (e) { /* ignore */ }
        location.reload();
      }, 1500);
    });
  }

  // Demande à garder les sauvegardes même si l'appareil manque de place
  if (web && nav.storage && nav.storage.persist) {
    nav.storage.persisted().then((p) => p || nav.storage.persist()).catch(() => {});
  }

  // ------------------------------------------------------------ confort iOS
  // Pas de zoom par pincement (Safari ignore user-scalable=no)
  ['gesturestart', 'gesturechange'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
  // Après la fermeture du clavier, iOS laisse parfois la page décalée
  document.addEventListener('focusout', () => setTimeout(() => {
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  }, 60));
})(window.CDL = window.CDL || {});
