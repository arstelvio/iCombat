/* Choc des Légendes — jeu en ligne : salle d'attente et combat à deux, chacun sur son téléphone.

   Connexion : deux chemins, essayés en même temps.
   - Le relais : un serveur public de messages (MQTT sur WebSocket sécurisé : EMQX, HiveMQ ou Mosquitto). Il
     fonctionne à travers n'importe quel réseau (Wi-Fi, 4G, box…). Les messages y sont chiffrés (AES-GCM) avec une
     clé tirée du code de la salle, et le nom des canaux n'est pas le code : le relais ne voit que des données
     illisibles.
   - La liaison directe d'un téléphone à l'autre (WebRTC, bibliothèque PeerJS, licence MIT), plus rapide, quand
     les réseaux la permettent (souvent sur le même Wi-Fi). Dès qu'elle s'ouvre, les messages passent par elle ;
     si elle se coupe, le relais prend le relais.

   Combat : « lockstep ». Chaque téléphone calcule tout le combat de son côté (voir det.js) ; ils ne s'échangent
   que les commandes des joueurs (10 boutons par image). La commande d'une image est appliquée D images plus tard
   (D : délai choisi d'après le temps d'aller-retour) ; si celle de l'adversaire n'est pas encore arrivée, on
   l'attend. Une empreinte de l'état est échangée deux fois par seconde : si les deux calculs divergent malgré
   tout, l'hôte fait reprendre la manche à l'identique des deux côtés. */
(function (C) {
  'use strict';
  const PROTO = 2;
  const PREFIX = 'choc-legendes-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // ni I, O, 0, 1 : impossibles à confondre
  const CODE_LEN = 5;
  const KEYS = ['l', 'r', 'u', 'd', 'a', 'b', 'c', 'g', 's', 't'];
  const HASH_EVERY = 30;
  const PING_EVERY = 1000;
  const TIMEOUT_ROOM = 9000, TIMEOUT_FIGHT = 12000, JOIN_TIMEOUT = 20000;
  // Relais publics (MQTT sur WebSocket sécurisé), essayés dans cet ordre
  const RELAYS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];

  const now = () => performance.now();
  const te = new TextEncoder(), td = new TextDecoder();
  function encode(o) { let m = 0; for (let i = 0; i < KEYS.length; i++) if (o && o[KEYS[i]]) m |= 1 << i; return m; }
  function decode(m) { const o = {}; for (let i = 0; i < KEYS.length; i++) o[KEYS[i]] = (m >> i) & 1; return o; }
  function randomId(n) {
    const a = crypto.getRandomValues(new Uint8Array(n));
    let s = '';
    for (let i = 0; i < n; i++) s += CODE_CHARS[a[i] % CODE_CHARS.length];
    return s.toLowerCase();
  }
  function newCode() {
    let s = '';
    for (let i = 0; i < CODE_LEN; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }
  // Code tapé par l'enfant : majuscules, sans espaces ni tirets
  function cleanCode(s) {
    return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN);
  }
  // Réglage dans l'adresse (tests) ; si le réglage est répété, la dernière valeur l'emporte
  function param(name) { try { const v = new URLSearchParams(location.search).getAll(name); return v.length ? v[v.length - 1] : null; } catch (e) { return null; } }

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
    const q = param('peerserver');
    const m = q && /^([^:/]+):(\d+)(\/.*)?$/.exec(q);
    if (m) Object.assign(o, { host: m[1], port: +m[2], path: m[3] || '/', secure: false, config: { iceServers: [] } });
    return o;
  }
  // Relais : liste par défaut ; ?relay=url1,url2 pour un relais local (tests), ?relay=none pour s'en passer
  function relayUrls() {
    const q = param('relay');
    if (q === 'none') return [];
    return q ? q.split(',') : RELAYS.slice();
  }
  const directAllowed = () => !Net.noDirect && param('direct') !== 'none' && typeof window.Peer === 'function' && typeof RTCPeerConnection === 'function';
  const relayAllowed = () => relayUrls().length > 0 && !!(window.crypto && crypto.subtle) && typeof WebSocket === 'function';

  // ================================================================== client MQTT minimal (version 3.1.1, sur WebSocket)
  function mqStr(s) {
    const b = typeof s === 'string' ? te.encode(s) : s;
    const out = new Uint8Array(2 + b.length);
    out[0] = b.length >> 8; out[1] = b.length & 255; out.set(b, 2);
    return out;
  }
  function mqPacket(type, flags, parts) {
    let len = 0;
    for (const p of parts) len += p.length;
    const lb = [];
    let x = len;
    do { let d = x % 128; x = Math.floor(x / 128); if (x > 0) d |= 128; lb.push(d); } while (x > 0);
    const out = new Uint8Array(1 + lb.length + len);
    out[0] = (type << 4) | flags; out.set(lb, 1);
    let o = 1 + lb.length;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  class Mqtt {
    constructor(url) {
      this.url = url; this.ws = null; this.open = false; this.pid = 1;
      this.buf = new Uint8Array(0);
      this.onmessage = null; this.onclose = null;
    }
    connect(will, timeout) {
      return new Promise((resolve, reject) => {
        let ws;
        try { ws = new WebSocket(this.url, ['mqtt']); } catch (e) { reject(e); return; }
        ws.binaryType = 'arraybuffer';
        this.ws = ws;
        let done = false;
        const finish = (err) => { if (done) return; done = true; clearTimeout(t); if (err) { try { ws.close(); } catch (e) { /* ignore */ } reject(err); } else resolve(this); };
        const t = setTimeout(() => finish(new Error('délai')), timeout || 6000);
        ws.onopen = () => {
          let flags = 0x02;
          const parts = [new Uint8Array([0, 4, 77, 81, 84, 84, 4]), null, new Uint8Array([0, 30]), mqStr('cdl' + randomId(12))];
          if (will) { flags |= 0x04 | (will.retain ? 0x20 : 0); parts.push(mqStr(will.topic), mqStr(will.payload)); }
          parts[1] = new Uint8Array([flags]);
          ws.send(mqPacket(1, 0, parts));
        };
        ws.onmessage = (e) => this.data(new Uint8Array(e.data), finish);
        ws.onerror = () => {};
        ws.onclose = () => {
          const was = this.open;
          this.open = false;
          clearInterval(this.ka);
          if (!done) finish(new Error('fermé'));
          else if (was && this.onclose) this.onclose();
        };
      });
    }
    data(chunk, finish) {
      const b = new Uint8Array(this.buf.length + chunk.length);
      b.set(this.buf); b.set(chunk, this.buf.length);
      let o = 0;
      for (;;) {
        if (b.length - o < 2) break;
        let len = 0, mul = 1, i = o + 1, ok = false;
        for (let k = 0; k < 4 && i < b.length; k++, i++) { len += (b[i] & 127) * mul; mul *= 128; if (!(b[i] & 128)) { ok = true; i++; break; } }
        if (!ok || b.length - i < len) break;
        const type = b[o] >> 4, flags = b[o] & 15, body = b.subarray(i, i + len);
        o = i + len;
        if (type === 2) {
          if (body[1] === 0) {
            this.open = true;
            this.ka = setInterval(() => this.raw(new Uint8Array([0xC0, 0])), 20000);
            finish();
          } else finish(new Error('refus ' + body[1]));
        } else if (type === 3) {
          const qos = (flags >> 1) & 3;
          const tl = (body[0] << 8) | body[1];
          const topic = td.decode(body.subarray(2, 2 + tl));
          let p = 2 + tl;
          if (qos) { const id = body.subarray(p, p + 2); p += 2; if (qos === 1) this.raw(mqPacket(4, 0, [id])); }
          if (this.onmessage) this.onmessage(topic, body.slice(p));
        }
      }
      this.buf = b.slice(o);
    }
    raw(bytes) { try { if (this.ws && this.ws.readyState === 1) this.ws.send(bytes); } catch (e) { /* ignore */ } }
    subscribe(topic) {
      const id = this.pid = (this.pid % 65000) + 1;
      this.raw(mqPacket(8, 2, [new Uint8Array([id >> 8, id & 255]), mqStr(topic), new Uint8Array([0])]));
    }
    publish(topic, payload, retain) { this.raw(mqPacket(3, retain ? 1 : 0, [mqStr(topic), payload])); }
    close() {
      this.onclose = null;
      this.raw(new Uint8Array([0xE0, 0]));
      clearInterval(this.ka);
      const ws = this.ws;
      setTimeout(() => { try { ws.close(); } catch (e) { /* ignore */ } }, 50);
      this.open = false;
    }
  }

  // ---------------------------------------------------------------- chiffrement (clé tirée du code de la salle)
  async function roomSecrets(code) {
    const base = await crypto.subtle.importKey('raw', te.encode('choc-legendes|salle|' + code), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: te.encode('cdl-relais-v2'), iterations: 40000, hash: 'SHA-256' }, base, 384));
    let hex = '';
    for (let i = 0; i < 12; i++) hex += bits[i].toString(16).padStart(2, '0');
    const key = await crypto.subtle.importKey('raw', bits.slice(12, 44), 'AES-GCM', false, ['encrypt', 'decrypt']);
    return { topic: 'cdl2/' + hex, key };
  }
  async function seal(key, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj))));
    const out = new Uint8Array(12 + ct.length);
    out.set(iv); out.set(ct, 12);
    return out;
  }
  async function unseal(key, bytes) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, key, bytes.subarray(12));
    return JSON.parse(td.decode(pt));
  }

  // ================================================================== relais
  // Canaux : <base>/room (annonce de la salle, message retenu), <base>/h (boîte de l'hôte), <base>/g/<id> (invité)
  class Relay {
    constructor(room) {
      this.room = room; this.mq = null; this.base = null; this.key = null;
      this.sq = Promise.resolve(); this.rq = Promise.resolve();
      this.url = null; this.closed = false;
    }
    // Se connecte à tous les relais à la fois ; garde le premier qui répond (hôte) ou celui où se trouve la salle (invité)
    async start(code) {
      const s = await roomSecrets(code);
      this.base = s.topic; this.key = s.key;
      const room = this.room, host = room.role === 'host';
      const urls = relayUrls();
      // L'hôte laisse une « dernière volonté » au relais : si sa connexion se coupe, l'annonce de la salle est effacée
      // (elle est republiée dès qu'il se reconnecte). L'invité n'en laisse pas : une courte coupure n'est pas un départ.
      const will = this.will = host ? { topic: this.base + '/room', payload: new Uint8Array(0), retain: true } : null;
      return new Promise((resolve) => {
        let pending = urls.length, settled = false, connected = 0;
        const clients = [];
        const settle = (res, keep) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          for (const c of clients) if (c !== keep) c.close();
          if (keep) this.use(keep);
          resolve(res);
        };
        const timer = setTimeout(() => settle(connected ? 'none' : 'unreachable'), host ? 9000 : 7000);
        urls.forEach((url) => {
          const mq = new Mqtt(url);
          clients.push(mq);
          mq.connect(will, 6000).then(() => {
            if (settled || this.closed) { mq.close(); return; }
            connected++;
            if (host) { settle('ok', mq); return; }
            // invité : la salle est-elle annoncée sur ce relais ?
            mq.onmessage = (topic, payload) => {
              if (topic !== this.base + '/room' || !payload.length) return;
              unseal(this.key, payload).then((m) => {
                if (m && m.t === 'room' && m.host) { room.hostId = m.host; settle('ok', mq); }
              }).catch(() => {});
            };
            mq.subscribe(this.base + '/room');
            setTimeout(() => { if (--pending === 0 && !settled) settle('none'); }, 2500);
          }).catch(() => { if (--pending === 0 && !settled) settle(connected ? 'none' : 'unreachable'); });
        });
      });
    }
    use(mq) {
      this.mq = mq; this.url = mq.url;
      const room = this.room;
      mq.onmessage = (topic, payload) => this.incoming(topic, payload);
      mq.onclose = () => { this.mq = null; if (!this.closed) room.relayLost(); };
      mq.subscribe(this.base + '/room');
      mq.subscribe(room.role === 'host' ? this.base + '/h' : this.base + '/g/' + room.id);
    }
    get ready() { return !!(this.mq && this.mq.open); }
    // Reconnexion après une coupure (téléphone revenu de veille, réseau changé) : même relais d'abord
    async resume() {
      if (this.resuming || this.closed || !this.url) return false;
      this.resuming = true;
      try {
        const urls = [this.url].concat(this.room.role === 'host' && !this.room.other ? relayUrls().filter((u) => u !== this.url) : []);
        for (const url of urls) {
          const mq = new Mqtt(url);
          try {
            await mq.connect(this.will, 6000);
            if (this.closed) { mq.close(); return false; }
            this.use(mq);
            return true;
          } catch (e) { /* relais suivant */ }
        }
        return false;
      } finally { this.resuming = false; }
    }
    incoming(topic, payload) {
      const room = this.room;
      if (topic === this.base + '/room') {
        // annonce effacée : l'hôte a quitté la salle (ou son application a été fermée)
        if (!payload.length && room.role === 'guest' && room.state !== 'connecting') room.peerGone('bye');
        return;
      }
      this.rq = this.rq.then(() => unseal(this.key, payload)).then((m) => room.receive(m, 'relay')).catch(() => {});
    }
    send(to, m) {
      if (!this.ready) return;
      const topic = this.room.role === 'host' ? this.base + '/g/' + to : this.base + '/h';
      this.sq = this.sq.then(() => seal(this.key, m)).then((b) => { if (this.mq) this.mq.publish(topic, b, false); }).catch(() => {});
    }
    announce() {
      if (!this.ready) return;
      this.sq = this.sq.then(() => seal(this.key, { t: 'room', host: this.room.id, proto: PROTO })).then((b) => { if (this.mq) this.mq.publish(this.base + '/room', b, true); }).catch(() => {});
    }
    // L'hôte part : on efface l'annonce de la salle
    unannounce() { if (this.ready) this.sq = this.sq.then(() => { if (this.mq) this.mq.publish(this.base + '/room', new Uint8Array(0), true); }); }
    close() {
      this.closed = true;
      const mq = this.mq;
      this.mq = null;
      if (mq) this.sq.then(() => mq.close(), () => mq.close());
    }
  }

  // ================================================================== salle
  class Room {
    constructor(role) {
      this.role = role;              // 'host' (crée la salle, joueur 1) ou 'guest' (joueur 2)
      this.id = randomId(12);        // identifiant de ce téléphone dans la salle
      this.code = null;
      this.state = 'connecting';     // connecting → waiting (hôte seul) → lobby (à deux) → fight ; closed
      this.step = role === 'host' ? 'Ouverture de la salle…' : 'Recherche de la salle…';
      this.error = null;
      this.notice = null;            // message à afficher dans la salle (ex. : « Léa a quitté la salle »)
      this.relay = null; this.relayState = null;
      this.peer = null; this.direct = null; this.directState = null;
      this.otherId = null; this.hostId = null;
      this.seq = 0; this.lastQ = {};
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

    // ---------------------------------------------------------------- ouverture (hôte)
    host(attempt) {
      attempt = attempt || 0;
      const code = newCode();
      this.code = code;
      const useRelay = relayAllowed(), useDirect = directAllowed();
      if (!useRelay && !useDirect) { this.fail('Ce navigateur ne permet pas de jouer en ligne. Mets à jour ton téléphone ou utilise Safari / Chrome.'); return; }
      const retry = () => {
        if (this.state !== 'connecting' || attempt >= 5) return false;
        if (this.relay) { this.relay.close(); this.relay = null; }
        if (this.peer) { try { this.peer.destroy(); } catch (e) { /* ignore */ } this.peer = null; }
        this.relayState = this.directState = null;
        this.host(attempt + 1);
        return true;
      };
      if (useRelay) {
        const r = this.relay = new Relay(this);
        this.relayState = 'connecting';
        r.start(code).then((res) => {
          if (this.relay !== r || this.state === 'closed') return;
          if (res !== 'ok') { this.relayState = 'failed'; this.opened(); return; }
          // une autre salle porte déjà ce code ? (annonce retenue d'un autre hôte)
          let taken = false;
          const prev = r.mq.onmessage;
          r.mq.onmessage = (topic, payload) => {
            if (topic === r.base + '/room' && payload.length) unseal(r.key, payload).then((m) => { if (m && m.host && m.host !== this.id) taken = true; }).catch(() => {});
            else prev(topic, payload);
          };
          setTimeout(() => {
            if (this.relay !== r || this.state === 'closed') return;
            r.mq && (r.mq.onmessage = prev);
            if (taken && retry()) return;
            r.announce();
            this.relayState = 'ok';
            this.opened();
          }, 800);
        }).catch(() => { if (this.relay === r) { this.relayState = 'failed'; this.opened(); } });
      }
      if (useDirect) {
        let p;
        try { p = new window.Peer(PREFIX + code, peerOptions()); } catch (e) { p = null; }
        if (p) {
          this.peer = p;
          this.directState = 'connecting';
          p.on('open', () => { if (this.peer === p) { this.directState = 'ok'; this.opened(); } });
          p.on('connection', (c) => this.incoming(c));
          p.on('error', (e) => {
            if (this.peer !== p || this.state === 'closed') return;
            if (e.type === 'unavailable-id' && this.state === 'connecting' && retry()) return;
            if (this.directState === 'connecting') { this.directState = 'failed'; this.opened(); }
          });
          // Perte du serveur de rendez-vous : on s'y reconnecte (la salle reste joignable par le relais)
          p.on('disconnected', () => { if (this.state !== 'closed') setTimeout(() => { try { if (!p.destroyed && p.disconnected) p.reconnect(); } catch (e) { /* ignore */ } }, 1500); });
        } else this.directState = 'failed';
      }
    }
    // La salle est ouverte dès qu'un des deux chemins est prêt ; échec si aucun ne l'est
    opened() {
      if (this.state !== 'connecting') return;
      if (this.relayState === 'ok' || this.directState === 'ok') {
        this.state = 'waiting';
        this.startTimer();
        this.emit('change');
        return;
      }
      const busy = this.relayState === 'connecting' || this.directState === 'connecting';
      if (!busy) this.fail('Impossible de joindre les serveurs du jeu en ligne. Vérifie que le téléphone est connecté à Internet (Wi-Fi ou 4G).');
    }

    // ---------------------------------------------------------------- entrée dans une salle (invité)
    join(code) {
      this.code = code;
      const useRelay = relayAllowed(), useDirect = directAllowed();
      if (!useRelay && !useDirect) { this.fail('Ce navigateur ne permet pas de jouer en ligne. Mets à jour ton téléphone ou utilise Safari / Chrome.'); return; }
      const hello = () => this.send({ t: 'hello', proto: PROTO, fp: Net.testFp || fingerprint(), info: this.me });
      if (useRelay) {
        const r = this.relay = new Relay(this);
        this.relayState = 'connecting';
        r.start(code).then((res) => {
          if (this.relay !== r || this.state === 'closed') return;
          this.relayState = res;
          if (res === 'ok') { this.step = 'Salle trouvée, on entre…'; this.emit('change'); hello(); this.startTimer(); }
          this.joinCheck();
        }).catch(() => { this.relayState = 'unreachable'; this.joinCheck(); });
      }
      if (useDirect) {
        let p;
        try { p = new window.Peer(peerOptions()); } catch (e) { p = null; }
        if (p) {
          this.peer = p;
          this.directState = 'connecting';
          p.on('open', () => {
            if (this.peer !== p || this.state === 'closed') return;
            const c = p.connect(PREFIX + code, { reliable: true, serialization: 'json', metadata: { id: this.id } });
            c.on('open', () => {
              if (this.state === 'closed') { try { c.close(); } catch (e) { /* ignore */ } return; }
              this.direct = c; this.directState = 'ok';
              this.lastRecv = now();
              hello();
              this.startTimer();
              this.emit('change');
            });
            c.on('data', (m) => this.receive(m, 'direct'));
            c.on('close', () => { if (this.direct === c) { this.direct = null; this.directLost(); } });
            c.on('error', () => {});
          });
          p.on('error', (e) => {
            if (this.peer !== p || this.state === 'closed') return;
            if (this.directState === 'connecting') { this.directState = e.type === 'peer-unavailable' ? 'none' : 'unreachable'; this.joinCheck(); }
          });
        } else this.directState = 'unreachable';
      }
      setTimeout(() => {
        if (this.state !== 'connecting') return;
        this.fail(this.relayState === 'ok' || this.directState === 'connecting'
          ? 'La salle ' + code + ' a été trouvée, mais elle ne répond pas. Le téléphone de ton ami est peut-être en veille : qu\'il revienne dans le jeu, puis réessaie.'
          : 'La salle ' + code + ' ne répond pas. Vérifie le code et la connexion Internet des deux téléphones.');
      }, JOIN_TIMEOUT);
    }
    // Échec rapide quand les deux chemins ont répondu « pas de salle » ou « injoignable »
    joinCheck() {
      if (this.state !== 'connecting') return;
      const r = this.relayState, d = this.directState;
      const doneR = r == null || r === 'none' || r === 'unreachable';
      const doneD = d == null || d === 'none' || d === 'unreachable';
      if (!doneR || !doneD) return;
      if (r === 'none' || d === 'none') this.fail('Aucune salle ne porte le code ' + this.code + '. Vérifie les lettres, ou demande à ton ami de créer une nouvelle salle.');
      else this.fail('Impossible de joindre les serveurs du jeu en ligne. Vérifie que le téléphone est connecté à Internet (Wi-Fi ou 4G).');
    }

    // Liaison directe proposée par l'invité (hôte)
    incoming(c) {
      if (this.state === 'closed') { try { c.close(); } catch (e) { /* ignore */ } return; }
      c.on('data', (m) => {
        if (m && m.t === 'hello') {
          const fresh = !this.other || m.from === this.otherId;
          if (fresh) { if (this.direct && this.direct !== c) { try { this.direct.close(); } catch (e) { /* ignore */ } } this.direct = c; }
          else { try { c.send({ t: 'full', from: this.id }); } catch (e) { /* ignore */ } setTimeout(() => { try { c.close(); } catch (e) { /* ignore */ } }, 400); return; }
        }
        if (this.direct === c) this.receive(m, 'direct');
      });
      c.on('close', () => { if (this.direct === c) { this.direct = null; this.directLost(); } });
      c.on('error', () => {});
    }
    // La liaison directe s'est coupée : on continue par le relais s'il est là
    directLost() {
      if (this.state === 'closed') return;
      if (this.relay && this.relay.ready) { this.emit('change'); return; }
      if (this.other) this.peerGone('close');
    }
    // Le relais s'est coupé : on s'y reconnecte (en attendant, la liaison directe suffit si elle est ouverte ;
    // sinon l'autre téléphone attend, et ne déclare la connexion perdue qu'au bout de quelques secondes)
    relayLost() {
      if (this.state === 'closed') return;
      this.emit('change');
      this.relayBackoff = 1000;
      this.scheduleRelay(500);
    }
    scheduleRelay(ms) {
      if (this.relayTimer || this.state === 'closed') return;
      this.relayTimer = setTimeout(() => { this.relayTimer = null; this.resumeRelay(); }, ms);
    }
    resumeRelay() {
      const r = this.relay;
      if (this.state === 'closed' || !r || r.ready || r.resuming) return;
      r.resume().then((ok) => {
        if (this.state === 'closed' || this.relay !== r) return;
        if (ok) {
          if (this.role === 'host') r.announce();
          this.lastRecv = Math.max(this.lastRecv, now() - 2000);
          // ce qui a été envoyé pendant la coupure est perdu : on réclame les commandes manquantes,
          // et on renvoie l'état de la salle
          if (this.ls) { this.ls.lastNeed = 0; this.send({ t: 'need', f: this.ls.next }); }
          else if (this.other) { this.send({ t: 'info', info: this.me }); if (this.role === 'host') this.send({ t: 'cfg', cfg: this.cfg }); }
          this.emit('change');
        } else {
          this.relayBackoff = Math.min(10000, (this.relayBackoff || 1000) * 2);
          this.scheduleRelay(this.relayBackoff);
        }
      });
    }
    // Retour au premier plan (l'iPhone coupe les connexions des applications en arrière-plan)
    wake() {
      if (this.state === 'closed') return;
      this.lastRecv = now();
      if (this.relay && !this.relay.ready && this.relay.url) { clearTimeout(this.relayTimer); this.relayTimer = null; this.resumeRelay(); }
      const p = this.peer;
      try { if (p && !p.destroyed && p.disconnected) p.reconnect(); } catch (e) { /* ignore */ }
    }

    startTimer() {
      if (this.timer) return;
      this.lastRecv = now();
      this.timer = setInterval(() => this.tick(), PING_EVERY);
    }
    tick() {
      if (this.state === 'closed' || !this.other) return;
      this.send({ t: 'ping', ts: now() });
      // téléphone en veille : on ne compte pas le temps passé en arrière-plan
      if (document.visibilityState === 'hidden') { this.lastRecv = now(); return; }
      const limit = this.state === 'fight' ? TIMEOUT_FIGHT : TIMEOUT_ROOM;
      if (now() - this.lastRecv > limit) this.peerGone('timeout');
    }

    // ---------------------------------------------------------------- messages
    relayed() { return !(this.direct && this.direct.open); }
    send(m, to) {
      m.from = this.id;
      m.q = ++this.seq;
      const lag = Net.testLag;
      if (lag) {
        // latence simulée (tests) : l'ordre des messages est conservé
        const at = Math.max(this.sendAt, now() + lag + Math.random() * (Net.testJitter || 0));
        this.sendAt = at;
        setTimeout(() => this.transmit(m, to), at - now());
        return;
      }
      this.transmit(m, to);
    }
    transmit(m, to) {
      const d = this.direct, relayOk = !!(this.relay && this.relay.ready);
      if (d && d.open && (!to || to === this.otherId || !relayOk)) { try { d.send(m); return; } catch (e) { /* relais */ } }
      if (this.relay) this.relay.send(to || this.otherId, m);
    }
    receive(m, via) {
      if (!m || typeof m !== 'object' || m.from === this.id || this.state === 'closed') return;
      if (this.role === 'host') {
        if (m.t === 'hello') {
          if (this.other && this.otherId && m.from !== this.otherId) {
            // salle pleine : on prévient le troisième joueur
            if (via === 'relay') this.send({ t: 'full' }, m.from);
            return;
          }
        } else if (m.from !== this.otherId) return;
      } else {
        if (m.t === 'welcome' && !this.hostId) this.hostId = m.from;
        if (this.hostId && m.from !== this.hostId) return;
      }
      // réglages et infos : on ne garde que le plus récent (les deux chemins peuvent livrer dans le désordre)
      if (m.t === 'info' || m.t === 'cfg') {
        if (m.q <= (this.lastQ[m.t] || 0)) return;
        this.lastQ[m.t] = m.q;
      }
      this.lastRecv = now();
      this.onMsg(m);
    }

    onMsg(m) {
      switch (m.t) {
        case 'in': if (this.ls) this.ls.receive(m); break;
        case 'need': if (this.ls) this.ls.resend(m.f); break;
        case 'ping': this.send({ t: 'pong', ts: m.ts }); break;
        case 'pong': {
          const r = now() - m.ts;
          this.rttDev = this.rtt ? this.rttDev * 0.7 + Math.abs(r - this.rtt) * 0.3 : r / 4;
          this.rtt = this.rtt ? this.rtt * 0.7 + r * 0.3 : r;
          this.emit('ping');
          break;
        }
        case 'hello': {
          if (this.role !== 'host') break;
          if (m.proto !== PROTO || m.fp !== fingerprint()) {
            this.send({ t: 'refuse', why: 'version' }, m.from);
            const c = this.direct;
            if (c && m.from !== this.otherId) { this.direct = null; setTimeout(() => { try { c.close(); } catch (e) { /* ignore */ } }, 400); }
            this.notice = 'Un ami a essayé d\'entrer, mais son jeu n\'a pas la même version que le tien.';
            this.emit('change');
            break;
          }
          // (le même invité peut dire bonjour deux fois : par le relais et par la liaison directe)
          const again = !!this.other && m.from === this.otherId;
          this.otherId = m.from; this.other = m.info;
          if (!again) { this.state = this.state === 'fight' ? 'fight' : 'lobby'; this.notice = null; this.me.ready = false; this.lastQ = {}; }
          this.send({ t: 'welcome', proto: PROTO, info: this.me, cfg: this.cfg });
          this.emit(again ? 'change' : 'joined');
          break;
        }
        case 'welcome':
          this.other = m.info; this.cfg = m.cfg;
          if (this.state === 'connecting') { this.state = 'lobby'; this.emit('joined'); } else this.emit('change');
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
      const d = this.direct;
      this.direct = null;
      try { if (d) d.close(); } catch (e) { /* ignore */ }
      this.other = null; this.otherId = null; this.lastQ = {};
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
      if (this.other) this.send({ t: 'bye' });
      if (this.role === 'host' && this.relay) this.relay.unannounce();
      this.state = 'closed';
      if (this.ls) { this.ls.stop(); this.ls = null; }
      setTimeout(() => this.close(), 200);
    }
    close() {
      this.state = 'closed';
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      clearTimeout(this.relayTimer);
      if (this.ls) { this.ls.stop(); this.ls = null; }
      const d = this.direct;
      this.direct = null;
      try { if (d) d.close(); } catch (e) { /* ignore */ }
      try { if (this.peer) this.peer.destroy(); } catch (e) { /* ignore */ }
      if (this.relay) this.relay.close();
      if (Net.room === this) { Net.room = null; Net.lastRoom = this; }
    }
    // Chemin utilisé : liaison directe d'un téléphone à l'autre, ou relais
    route() { return Promise.resolve(this.direct && this.direct.open ? 'directe' : this.relay && this.relay.ready ? 'par relais' : null); }
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
    // L'autre téléphone réclame nos commandes à partir de l'image f : on les renvoie (avec la reprise en cours)
    resend(f) {
      if (this.stopped) return;
      const k = [];
      for (let i = f; i < this.sent; i++) { const v = this.inp[this.me].get(i); if (v == null) { k.length = 0; break; } k.push(v); }
      if (!k.length) return;
      const msg = { t: 'in', f, k, a: this.advantage(), d: this.D };
      if (this.lastCmd && this.lastCmd.f >= f) msg.c = this.lastCmd;
      this.room.send(msg);
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
      // par le relais, on groupe les commandes de deux images par message (moins de messages à faire suivre)
      if (!this.room.relayed() || this.ticks % 2 === 0 || this.pendingCmd || this.out.length >= 3) this.flush();
      const other = 1 - this.me;
      if (!this.inp[other].has(this.next)) {
        this.stallTicks++;
        if (!this.stallSince) this.stallSince = now();
        this.stalled = now() - this.stallSince > 250;
        // commande toujours absente : elle s'est peut-être perdue pendant une coupure, on la réclame
        if (now() - this.stallSince > 300 && now() - (this.lastNeed || 0) > 500) { this.lastNeed = now(); this.room.send({ t: 'need', f: this.next }); }
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
      this.pendingCmd = this.lastCmd = { f: F, cmd };
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
  // ================================================================== interface publique
  const Net = {
    PROTO, CODE_LEN, CODE_CHARS,
    room: null,
    onEvent: null,
    testLag: 0, testJitter: 0, testInput: null, testFp: null, onHash: null, noDirect: false,
    available() { return directAllowed() || relayAllowed(); },
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
    Room, Lockstep, Mqtt, roomSecrets, seal, unseal, RELAYS,
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

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Net.room) Net.room.wake(); });
  window.addEventListener('online', () => { if (Net.room) Net.room.wake(); });

  C.Net = Net;
})(window.CDL = window.CDL || {});
