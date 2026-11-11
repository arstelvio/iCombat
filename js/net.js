/* Choc des Légendes — jeu en ligne : salle d'attente et combat à deux, chacun sur son téléphone.

   Connexion : bibliothèque PeerJS (licence MIT, web/lib/peerjs.min.js). Le serveur public gratuit de PeerJS
   sert seulement à se retrouver grâce au code de la salle ; ensuite les deux téléphones se parlent directement
   (WebRTC), ou par un relais quand les réseaux ne le permettent pas.

   Combat : « lockstep ». Chaque téléphone calcule tout le combat de son côté (voir det.js) ; ils ne s'échangent
   que les commandes des joueurs (10 boutons par image). La commande d'une image est appliquée D images plus tard
   (D : délai choisi d'après le temps d'aller-retour) ; si celle de l'adversaire n'est pas encore arrivée, on
   l'attend. Une empreinte de l'état est échangée deux fois par seconde : si les deux calculs divergent malgré
   tout, l'hôte fait reprendre la manche à l'identique des deux côtés. */
(function (C) {
  'use strict';
  const PROTO = 1;
  const PREFIX = 'choc-legendes-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // ni I, O, 0, 1 : impossibles à confondre
  const CODE_LEN = 5;
  const KEYS = ['l', 'r', 'u', 'd', 'a', 'b', 'c', 'g', 's', 't'];
  const HASH_EVERY = 30;
  const PING_EVERY = 1000;
  const TIMEOUT_ROOM = 9000, TIMEOUT_FIGHT = 12000, CONNECT_TIMEOUT = 15000;

  const now = () => performance.now();
  function encode(o) { let m = 0; for (let i = 0; i < KEYS.length; i++) if (o && o[KEYS[i]]) m |= 1 << i; return m; }
  function decode(m) { const o = {}; for (let i = 0; i < KEYS.length; i++) o[KEYS[i]] = (m >> i) & 1; return o; }

  function newCode() {
    let s = '';
    for (let i = 0; i < CODE_LEN; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }
  // Code tapé par l'enfant : majuscules, sans espaces ni tirets
  function cleanCode(s) {
    return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN);
  }

  // Empreinte du jeu : les deux téléphones doivent avoir exactement les mêmes règles (code et données du combat)
  let fpCache = null;
  function fingerprint() {
    if (fpCache) return fpCache;
    const rep = (k, v) => (typeof v === 'function' ? String(v) : v);
    let s = PROTO + '|' + String(C.Battle) + String(C.Fighter) + String(C.Det.run) + String(C.Det.battleHash) + JSON.stringify(C.Det.math, rep);
    for (const k in C.Proj) s += String(C.Proj[k]);
    s += String(C.Rig.solve) + JSON.stringify(C.Poses.lib) + JSON.stringify(C.Poses.sets);
    for (const ch of C.Roster.list) {
      s += JSON.stringify({ id: ch.id, stats: ch.stats, tune: ch.tune, style: ch.style, look: ch.look });
      s += JSON.stringify(C.Moves.build({ ch }), rep);
    }
    s += JSON.stringify(C.Roster.HERO_POWERS) + String(C.Roster.setHero) + String(C.Roster.heroLook);
    const H = new C.Det.Hash();
    H.str(s);
    fpCache = H.value().toString(36) + s.length.toString(36);
    return fpCache;
  }

  // Options PeerJS : serveur public par défaut ; ?peerserver=hôte:port/chemin pour un serveur local (tests)
  function peerOptions() {
    const o = { debug: 0 };
    let q = null;
    try { q = new URLSearchParams(location.search).get('peerserver'); } catch (e) { /* ignore */ }
    const m = q && /^([^:/]+):(\d+)(\/.*)?$/.exec(q);
    if (m) Object.assign(o, { host: m[1], port: +m[2], path: m[3] || '/', secure: false, config: { iceServers: [] } });
    return o;
  }

  function errorText(e) {
    const t = e && e.type;
    if (t === 'peer-unavailable') return 'Aucune salle ne porte ce code. Vérifie les lettres, ou demande à ton ami de créer une nouvelle salle.';
    if (t === 'browser-incompatible') return 'Ce navigateur ne permet pas de jouer en ligne. Mets à jour ton téléphone ou utilise Safari / Chrome.';
    if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed')
      return 'Impossible de joindre le serveur des salles. Vérifie que le téléphone est connecté à Internet.';
    if (t === 'webrtc') return 'La connexion entre les deux téléphones a échoué. Essayez sur le même Wi-Fi.';
    return 'La connexion a échoué (' + (t || 'erreur inconnue') + ').';
  }

  // ================================================================== salle
  class Room {
    constructor(role) {
      this.role = role;              // 'host' (crée la salle, joueur 1) ou 'guest' (joueur 2)
      this.code = null;
      this.peer = null; this.conn = null;
      this.state = 'connecting';     // connecting → waiting (hôte seul) → lobby (à deux) → fight ; closed
      this.error = null;
      this.notice = null;            // message à afficher dans la salle (ex. : « Léa a quitté la salle »)
      const save = C.Store.current, S = C.Store.settings;
      this.me = {
        name: (save && save.name) || 'Joueur',
        char: (save && save.lastChar && (C.Roster.get(save.lastChar) || save.lastChar === 'hero') && C.Store.canPlay(save.lastChar)) ? save.lastChar : 'kairo',
        costume: 0, hero: (save && save.hero) || null, ready: false, easy: S.easySpecials !== false
      };
      if (this.me.char === 'hero' && !this.me.hero) this.me.char = 'kairo';
      this.other = null;
      this.cfg = { stage: (save && save.lastStage && C.Store.canUseStage && C.Store.canUseStage(save.lastStage)) ? save.lastStage : 'temple', rounds: S.rounds || 2, time: S.time == null ? 99 : S.time };
      this.rtt = 0; this.rttDev = 0; this.lastRecv = 0; this.sendAt = 0;
      this.ls = null;
      this.timer = null;
      this.matches = 0;
    }

    // ---------------------------------------------------------------- ouverture
    host(attempt) {
      attempt = attempt || 0;
      const code = newCode();
      let p;
      try { p = new window.Peer(PREFIX + code, peerOptions()); } catch (e) { this.fail(errorText({ type: 'browser-incompatible' })); return; }
      this.peer = p;
      p.on('open', () => {
        if (this.state === 'closed') return;
        this.code = code; this.state = 'waiting';
        this.startTimer();
        this.emit('change');
      });
      p.on('connection', (c) => this.incoming(c));
      p.on('error', (e) => {
        if (this.state === 'closed') return;
        if (e.type === 'unavailable-id' && attempt < 5) { p.destroy(); this.host(attempt + 1); return; }
        if (this.state === 'connecting') this.fail(errorText(e));
      });
      // Perte du serveur des salles : la partie en cours continue, mais personne d'autre ne peut entrer
      p.on('disconnected', () => { if (this.state !== 'closed') setTimeout(() => { try { if (!p.destroyed && p.disconnected) p.reconnect(); } catch (e) { /* ignore */ } }, 1500); });
    }

    join(code) {
      this.code = code;
      let p;
      try { p = new window.Peer(peerOptions()); } catch (e) { this.fail(errorText({ type: 'browser-incompatible' })); return; }
      this.peer = p;
      p.on('open', () => {
        if (this.state === 'closed') return;
        this.attach(p.connect(PREFIX + code, { reliable: true, serialization: 'json' }));
      });
      p.on('error', (e) => { if (this.state === 'connecting' || e.type === 'peer-unavailable') this.fail(errorText(e)); });
      setTimeout(() => {
        if (this.state === 'connecting') this.fail('La salle ' + code + ' ne répond pas. Vérifie le code et la connexion Internet des deux téléphones.');
      }, CONNECT_TIMEOUT);
    }

    incoming(c) {
      if (this.state === 'closed') { try { c.close(); } catch (e) { /* ignore */ } return; }
      if (this.conn && this.other) {
        // salle pleine : on prévient le troisième joueur puis on raccroche
        c.on('open', () => { try { c.send({ t: 'full' }); } catch (e) { /* ignore */ } setTimeout(() => { try { c.close(); } catch (e) { /* ignore */ } }, 400); });
        return;
      }
      if (this.conn) { try { this.conn.close(); } catch (e) { /* ignore */ } }
      this.attach(c);
    }

    attach(c) {
      this.conn = c;
      c.on('open', () => {
        if (this.conn !== c) return;
        this.lastRecv = now();
        if (this.role === 'guest') this.send({ t: 'hello', proto: PROTO, fp: Net.testFp || fingerprint(), info: this.me });
        this.startTimer();
      });
      c.on('data', (m) => { if (this.conn === c) this.onMsg(m); });
      c.on('close', () => { if (this.conn === c) this.peerGone('close'); });
      c.on('error', () => { if (this.conn === c && this.state === 'connecting') this.fail(errorText({ type: 'webrtc' })); });
    }

    startTimer() {
      if (this.timer) return;
      this.timer = setInterval(() => this.tick(), PING_EVERY);
    }
    tick() {
      if (this.state === 'closed') return;
      if (!this.conn || !this.other) return;
      this.send({ t: 'ping', ts: now() });
      // téléphone en veille : on ne compte pas le temps passé en arrière-plan
      if (document.visibilityState === 'hidden') { this.lastRecv = now(); return; }
      const limit = this.state === 'fight' ? TIMEOUT_FIGHT : TIMEOUT_ROOM;
      if (now() - this.lastRecv > limit) this.peerGone('timeout');
    }

    // ---------------------------------------------------------------- messages
    send(m) {
      const c = this.conn;
      if (!c || !c.open) return;
      const lag = Net.testLag;
      if (lag) {
        // latence simulée (tests) : l'ordre des messages est conservé
        const at = Math.max(this.sendAt, now() + lag + Math.random() * (Net.testJitter || 0));
        this.sendAt = at;
        setTimeout(() => { try { if (c.open) c.send(m); } catch (e) { /* ignore */ } }, at - now());
        return;
      }
      try { c.send(m); } catch (e) { /* ignore */ }
    }

    onMsg(m) {
      if (!m || typeof m !== 'object') return;
      this.lastRecv = now();
      switch (m.t) {
        case 'in': if (this.ls) this.ls.receive(m); break;
        case 'ping': this.send({ t: 'pong', ts: m.ts }); break;
        case 'pong': {
          const r = now() - m.ts;
          this.rttDev = this.rtt ? this.rttDev * 0.7 + Math.abs(r - this.rtt) * 0.3 : r / 4;
          this.rtt = this.rtt ? this.rtt * 0.7 + r * 0.3 : r;
          this.emit('ping');
          break;
        }
        case 'hello':
          if (this.role !== 'host') break;
          if (m.proto !== PROTO || m.fp !== fingerprint()) {
            this.send({ t: 'refuse', why: 'version' });
            const c = this.conn; this.conn = null;
            setTimeout(() => { try { c.close(); } catch (e) { /* ignore */ } }, 400);
            this.notice = 'Un ami a essayé d\'entrer, mais son jeu n\'a pas la même version que le tien.';
            this.emit('change');
            break;
          }
          this.other = m.info; this.state = 'lobby'; this.notice = null;
          this.me.ready = false;
          this.send({ t: 'welcome', proto: PROTO, info: this.me, cfg: this.cfg });
          this.emit('joined');
          break;
        case 'welcome':
          this.other = m.info; this.cfg = m.cfg; this.state = 'lobby';
          this.emit('joined');
          break;
        case 'refuse':
          this.fail(m.why === 'version'
            ? 'Vos deux jeux n\'ont pas la même version. Ouvrez le jeu avec Internet sur les deux téléphones et revenez à l\'écran titre : la mise à jour s\'installe. Puis réessayez.'
            : 'Ton ami n\'a pas pu t\'accueillir dans sa salle.');
          break;
        case 'full': this.fail('Cette salle est déjà pleine : deux joueurs y sont déjà.'); break;
        case 'info': this.other = m.info; this.emit('change'); if (this.role === 'host') this.maybeStart(); break;
        case 'cfg': if (this.role === 'guest') { this.cfg = m.cfg; this.emit('change'); } break;
        case 'start': if (this.role === 'guest' && this.state === 'lobby') this.begin(m); break;
        case 'end': if (this.ls) this.ls.remoteEnd(m); break;
        case 'abort':
          if (this.state === 'fight') { this.endFight(); this.notice = (this.other ? this.other.name : 'Ton ami') + ' a quitté le combat.'; this.emit('aborted'); }
          break;
        case 'bye': this.peerGone('bye'); break;
      }
    }

    // ---------------------------------------------------------------- salle d'attente
    setInfo(patch) {
      Object.assign(this.me, patch);
      this.send({ t: 'info', info: this.me });
      this.emit('change');
      if (this.role === 'host') this.maybeStart();
    }
    setCfg(patch) {
      if (this.role !== 'host') return;
      Object.assign(this.cfg, patch);
      // un changement de réglage annule « prêt »
      this.send({ t: 'cfg', cfg: this.cfg });
      this.emit('change');
    }
    // Délai des commandes : assez pour couvrir un aller simple et ses variations, sans plus (en images de 1/60 s)
    delay() {
      const rtt = this.rtt || 120;
      return Math.max(2, Math.min(12, Math.ceil((rtt / 2 + this.rttDev * 1.5) / 16.67) + 1));
    }
    maybeStart() {
      if (this.role !== 'host' || this.state !== 'lobby' || !this.other) return;
      if (!this.me.ready || !this.other.ready) return;
      const m = { t: 'start', seed: C.Det.seed(), delay: this.delay(), cfg: Object.assign({}, this.cfg), p: [Object.assign({}, this.me), Object.assign({}, this.other)] };
      this.send(m);
      this.begin(m);
    }
    begin(m) {
      this.state = 'fight';
      this.me.ready = false;
      this.matches++;
      this.notice = null;
      this.ls = new Lockstep(this, this.role === 'host' ? 0 : 1, m.delay);
      this.emit('start', m);
    }
    endFight() {
      if (this.ls) this.ls.stop();
      this.ls = null;
      if (this.state === 'fight') this.state = this.other ? 'lobby' : (this.role === 'host' ? 'waiting' : 'closed');
      if (this.other) this.other.ready = false;
      this.me.ready = false;
    }
    // Quitter le combat en cours (on reste dans la salle)
    abortFight() {
      if (this.state !== 'fight') return;
      this.send({ t: 'abort' });
      this.endFight();
    }

    // ---------------------------------------------------------------- départs et erreurs
    peerGone(why) {
      if (this.state === 'closed') return;
      const name = this.other ? this.other.name : 'Ton ami';
      const fighting = this.state === 'fight';
      if (this.ls) { this.ls.stop(); this.ls = null; }
      try { if (this.conn) this.conn.close(); } catch (e) { /* ignore */ }
      this.conn = null; this.other = null;
      const text = why === 'timeout' ? 'La connexion avec ' + name + ' est perdue.' : name + ' a quitté la salle.';
      if (this.role === 'host') {
        this.state = 'waiting';
        this.me.ready = false;
        this.notice = text + ' La salle reste ouverte : un ami peut la rejoindre avec le même code.';
        this.emit(fighting ? 'aborted' : 'change');
      } else {
        this.close();
        this.error = text;
        this.emit(fighting ? 'aborted' : 'closed');
      }
    }
    fail(text) {
      if (this.state === 'closed') return;
      const fighting = this.state === 'fight';
      this.close();
      this.error = text;
      this.emit(fighting ? 'aborted' : 'error');
    }
    // Quitter la salle
    leave() {
      if (this.state === 'closed') return;
      this.send({ t: 'bye' });
      const c = this.conn;
      setTimeout(() => this.close(), c ? 150 : 0);
      this.state = 'closed';
      if (this.ls) { this.ls.stop(); this.ls = null; }
    }
    close() {
      this.state = 'closed';
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      if (this.ls) { this.ls.stop(); this.ls = null; }
      try { if (this.conn) this.conn.close(); } catch (e) { /* ignore */ }
      try { if (this.peer) this.peer.destroy(); } catch (e) { /* ignore */ }
      this.conn = null;
      if (Net.room === this) { Net.room = null; Net.lastRoom = this; }
    }
    // Connexion directe (WebRTC d'un téléphone à l'autre) ou par un relais
    route() {
      try {
        const pc = this.conn && this.conn.peerConnection;
        if (!pc || !pc.getStats) return Promise.resolve(null);
        return pc.getStats().then((st) => {
          let pair = null;
          st.forEach((r) => { if (r.type === 'transport' && r.selectedCandidatePairId) pair = st.get(r.selectedCandidatePairId); });
          if (!pair) st.forEach((r) => { if (r.type === 'candidate-pair' && (r.selected || r.nominated) && r.state === 'succeeded') pair = r; });
          if (!pair) return null;
          const loc = st.get(pair.localCandidateId), rem = st.get(pair.remoteCandidateId);
          const relay = (loc && loc.candidateType === 'relay') || (rem && rem.candidateType === 'relay');
          return relay ? 'relais' : 'directe';
        }).catch(() => null);
      } catch (e) { return Promise.resolve(null); }
    }
    emit(type, data) { if (Net.onEvent) Net.onEvent(type, this, data); }
  }

  // ================================================================== combat synchronisé
  class Lockstep {
    constructor(room, me, delay) {
      this.room = room;
      this.me = me;                 // 0 : hôte, 1 : invité
      this.D = delay;
      this.inp = [new Map(), new Map()];
      for (let f = 0; f < delay; f++) { this.inp[0].set(f, 0); this.inp[1].set(f, 0); }
      this.next = 0;                // prochaine image à calculer
      this.cur = 0;                 // image en cours de calcul (lue par les contrôleurs)
      this.sent = delay;            // prochaine image dont on enregistre la commande locale
      this.out = [];
      this.myHash = new Map(); this.theirHash = new Map();
      this.pendingHash = null; this.pendingCmd = null;
      this.cmds = new Map();
      this.remoteMax = delay - 1; this.remoteAdv = 0;
      this.ticks = 0; this.stallSince = 0; this.stalled = false;
      this.stallTicks = 0; this.paceTicks = 0;
      this.desyncs = 0; this.resyncs = 0; this.resyncAt = -1;
      this.flip = me === 1;         // l'invité voit le combat de l'autre côté : gauche et droite sont inversées
      this.remoteEnded = null;
      this.stopped = false;
      this.b = null;
    }
    controller(side) {
      const ls = this;
      return { isCPU: false, net: true, get() { return decode(ls.inp[side].get(ls.cur) || 0); } };
    }
    attach(b) { this.b = b; }
    stop() { this.stopped = true; }

    capture() {
      const f = this.b.f[this.me];
      const raw = Object.assign({}, C.Input.p1.get(f) || {});
      if (this.flip) { const l = raw.l; raw.l = raw.r; raw.r = l; }
      if (Net.testInput) Object.assign(raw, Net.testInput(this.sent, this.me) || {});
      const m = encode(raw);
      this.inp[this.me].set(this.sent, m);
      this.out.push(m);
      this.sent++;
    }
    flush() {
      if (!this.out.length && !this.pendingHash && !this.pendingCmd) return;
      const msg = { t: 'in', f: this.sent - this.out.length, k: this.out, a: this.advantage(), d: this.D };
      if (this.pendingHash) msg.h = this.pendingHash;
      if (this.pendingCmd) msg.c = this.pendingCmd;
      this.pendingHash = null; this.pendingCmd = null;
      this.out = [];
      this.room.send(msg);
    }
    receive(m) {
      if (this.stopped) return;
      const other = 1 - this.me;
      if (m.k) {
        for (let i = 0; i < m.k.length; i++) this.inp[other].set(m.f + i, m.k[i]);
        this.remoteMax = Math.max(this.remoteMax, m.f + m.k.length - 1);
      }
      if (m.a != null) this.remoteAdv = m.a;
      if (m.d != null) this.remoteD = m.d;
      if (m.c) this.cmds.set(m.c.f, m.c.cmd);
      if (m.h) {
        const mine = this.myHash.get(m.h[0]);
        if (mine == null) this.theirHash.set(m.h[0], m.h[1]);
        else if (mine !== m.h[1]) this.onDesync(m.h[0]);
      }
    }
    // Le délai de nos propres commandes suit la qualité de la connexion. Chaque commande porte le numéro de
    // l'image où elle s'applique : chaque téléphone peut changer son délai sans prévenir l'autre.
    adapt() {
      if (this.ticks % 30 !== 0 || !this.room.rtt) return;
      const want = this.room.delay();
      const t = now();
      if (want > this.D) { this.D = want; this.lastDelayDown = t; }
      else if (want < this.D - 1 && t - (this.lastDelayDown || 0) > 3000) { this.D--; this.lastDelayDown = t; }
    }
    // Images d'avance sur l'adversaire (estimation d'après ses commandes reçues)
    advantage() { return this.next - (this.remoteMax - (this.remoteD || this.D)); }

    // Calcule une image si possible : 1 = image calculée, 2 = pause d'une image (on attend l'adversaire,
    // trop en retard), 0 = bloqué (commande de l'adversaire pas encore arrivée)
    step() {
      if (this.stopped || !this.b || this.b.result) return 0;
      this.ticks++;
      this.adapt();
      while (this.sent <= this.next + this.D) this.capture();
      // Trop d'avance sur l'adversaire : on ralentit un peu pour qu'il nous rattrape sans à-coups
      const lead = (this.advantage() - this.remoteAdv) / 2;
      if (lead >= 2 && this.ticks % 4 === 0) { this.flush(); this.paceTicks++; return 2; }
      this.flush();
      const other = 1 - this.me;
      if (!this.inp[other].has(this.next)) {
        this.stallTicks++;
        if (!this.stallSince) this.stallSince = now();
        this.stalled = now() - this.stallSince > 250;
        this.checkRemoteEnd();
        return 0;
      }
      this.stallSince = 0; this.stalled = false;
      const cmd = this.cmds.get(this.next);
      if (cmd) { this.cmds.delete(this.next); this.apply(cmd); }
      this.cur = this.next;
      this.b.update();
      const f = this.next;
      if (f % HASH_EVERY === 0) {
        const h = this.b.hash();
        this.myHash.set(f, h);
        this.myHash.delete(f - HASH_EVERY * 40);
        this.pendingHash = [f, h];
        if (Net.onHash) Net.onHash(f, h, this);
        const th = this.theirHash.get(f);
        if (th != null) { this.theirHash.delete(f); if (th !== h) this.onDesync(f); }
      }
      this.inp[0].delete(f - 90); this.inp[1].delete(f - 90);
      this.next++;
      if (this.b.result && this.me === 0) this.room.send({ t: 'end', f: this.next, winner: this.b.result.winner });
      return 1;
    }

    // Les deux calculs ont divergé : l'hôte fait reprendre la manche, à l'identique, des deux côtés
    onDesync(f) {
      this.desyncs++;
      if (this.me !== 0 || this.stopped || !this.b || this.b.result) return;
      if (this.resyncAt >= this.next) return;
      const b = this.b;
      const F = this.sent;          // première image dont la commande n'est pas encore partie
      const cmd = {
        k: 'resync', seed: C.Det.seed(), round: b.round, time: b.time,
        wins: b.f.map((x) => x.wins), hp: b.f.map((x) => Math.round(x.hp)), meter: b.f.map((x) => Math.round(x.meter)),
        awake: b.f.map((x) => !!x.heroAwake), clock: b.clock === Infinity ? -1 : b.clock,
        roundLog: b.roundLog.slice(), drawCount: b.drawCount
      };
      this.cmds.set(F, cmd);
      this.pendingCmd = { f: F, cmd };
      this.resyncAt = F;
      void f;
    }
    apply(cmd) {
      if (cmd.k === 'resync') {
        this.resyncs++;
        this.myHash.clear(); this.theirHash.clear();
        this.b.netResync(cmd);
      }
    }
    // L'hôte a fini le combat : si notre calcul n'y arrive pas (divergence), on termine avec son résultat
    remoteEnd(m) { this.remoteEnded = m; }
    checkRemoteEnd() {
      const m = this.remoteEnded;
      if (!m || !this.b || this.b.result || this.me === 0) return;
      if (this.next >= m.f + this.D && now() - this.stallSince > 1500) this.b.forceFinish(m.winner);
    }
  }

  // ================================================================== interface publique
  const Net = {
    PROTO, CODE_LEN, CODE_CHARS,
    room: null,
    onEvent: null,
    testLag: 0, testJitter: 0, testInput: null, testFp: null, onHash: null,
    available() { return typeof window.Peer === 'function' && typeof RTCPeerConnection === 'function'; },
    createRoom() {
      if (Net.room) Net.room.leave();
      const r = new Room('host');
      Net.room = r;
      r.host(0);
      return r;
    },
    joinRoom(code) {
      if (Net.room) Net.room.leave();
      const r = new Room('guest');
      Net.room = r;
      r.join(cleanCode(code));
      return r;
    },
    leave() { if (Net.room) Net.room.leave(); Net.room = null; },
    cleanCode, fingerprint, encode, decode,
    Room, Lockstep,
    // Lien à partager : ouvre le jeu directement sur l'écran « Rejoindre » avec le code
    shareLink(code) {
      const base = location.href.split('#')[0].split('?')[0];
      return base + '#salle=' + code;
    },
    codeFromLink() {
      const m = /[#&]salle=([A-Za-z0-9]+)/.exec(location.hash || '');
      return m ? cleanCode(m[1]) : null;
    }
  };

  C.Net = Net;
})(window.CDL = window.CDL || {});
