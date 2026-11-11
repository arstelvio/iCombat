/* Choc des Légendes — déroulement des modes de jeu, statistiques et récompenses */
(function (C) {
  'use strict';
  const U = C.U;
  const DIFF = ['Facile', 'Normal', 'Difficile', 'Légendaire'];
  const DIFF_DMG = [0.72, 0.92, 1.05, 1.18];

  const Game = {
    battle: null,
    ctx: null,
    DIFF,

    quality() {
      const q = C.Store.settings.quality;
      if (q === 'low') return 0.6;
      if (q === 'medium') return 0.85;
      if (q === 'high') return 1.25;
      return Math.min(1.25, Math.max(0.7, (window.devicePixelRatio || 1) * 0.6));
    },

    // ------------------------------------------------------------------ lancement
    start(ctx) {
      const S = C.Store.settings;
      this.ctx = ctx;
      ctx.transformed = false;
      ctx.heroAwoke = false;
      const p2human = !!ctx.p2.human;
      C.Input.twoPlayers = p2human;
      let p2ctrl;
      if (p2human) p2ctrl = C.Input.p2;
      else if (ctx.mode === 'training') p2ctrl = new C.AI.Dummy(ctx.dummy || 'stand');
      else p2ctrl = new C.AI.CPU(ctx.difficulty);
      const diff = ctx.difficulty == null ? 1 : ctx.difficulty;
      const cfg = {
        mode: p2human ? 'versus2p' : ctx.mode,
        p1: { char: ctx.p1.char, costume: ctx.p1.costume || 0, controller: C.Input.p1, easy: S.easySpecials !== false,
          hpMul: ctx.boost ? 1.4 : 1, dmgMul: ctx.boost ? 1.15 : 1 },
        p2: {
          char: ctx.p2.char, costume: ctx.p2.costume || 0, controller: p2ctrl, shadow: !!ctx.p2.shadow, easy: p2human && S.easySpecials !== false,
          hpMul: ctx.p2.hpMul || 1, dmgMul: p2human ? 1 : DIFF_DMG[diff] * (ctx.p2.dmgMul || 1)
        },
        stage: ctx.stage,
        rounds: ctx.rounds || S.rounds,
        time: ctx.time != null ? ctx.time : S.time,
        difficulty: diff,
        quality: this.quality(),
        training: ctx.mode === 'training' ? (ctx.training || { infiniteHp: true, infiniteMeter: false, dummyLabel: 'Debout' }) : null,
        onEnd: (r) => this.onEnd(r)
      };
      if (S.time === 0 && ctx.time == null) cfg.time = 0;
      if (cfg.time === 0) cfg.time = Infinity;
      this.battle = new C.Battle(cfg);
      if (cfg.time === Infinity) this.battle.clock = Infinity;
      if (C.School) { if (ctx.school) C.School.attach(this.battle); else if (C.School.active) C.School.detach(); }
      if (ctx.p1.hpFrac != null) { const f = this.battle.f[0]; f.hp = f.dispHp = f.redHp = Math.max(1, Math.round(f.maxHp * ctx.p1.hpFrac)); }
      if (ctx.p1.meter) this.battle.f[0].meter = ctx.p1.meter;
      if (ctx.boost) { this.battle.f[0].meter = Math.max(this.battle.f[0].meter, 100); }
      if (cfg.training) this.battle.parryWindow = 8;
      if (diff === 0) this.battle.parryWindow = 8;
      C.inBattle = true;
      C.Input.resetTouch();
      C.Input.touch.visible = C.touchDevice || C.Input.lastDevice === 'touch';
      C.UI.hide();
      const st = C.Stages.get(ctx.stage);
      C.Audio.music(ctx.music || st.music || U.choice(C.Audio.battleSongs));
      this.trainingStart = performance.now();
      if (ctx.boost) C.UI.toast('⭐ Coup de pouce !', '+40 % de vie, coups plus forts et 1 barre d\'ULTRA dès le départ');
    },

    tick() {
      const b = this.battle;
      if (!b) return;
      if (C.School && C.School.active) C.School.update(b);
      // combattant de ce téléphone (en ligne, l'invité est le joueur 2)
      const me = b.me || 0;
      if (b.f[me].awakened > 0) this.ctx.transformed = true;
      if (b.events.length) {
        for (const e of b.events) {
          if (e.type === 'guardcrush' && e.side === me && C.Store.current) C.Store.current.stats.guardCrushes++;
          if (e.type === 'charge' && e.side === me && e.bar >= 3 && C.Store.current) C.Achievements.grant('aura_max');
          if (e.type === 'awaken' && e.side === me) this.ctx.heroAwoke = true;
          if (e.type === 'lowblock' && e.side === me && C.Store.current && this.ctx.mode !== 'training') {
            const st = C.Store.current.stats;
            st.lowBlocks = (st.lowBlocks || 0) + 1;
            if (st.lowBlocks >= 10) C.Achievements.grant('gardebasse');
          }
        }
        b.events.length = 0;
      }
    },

    pause() {
      if (!this.battle || this.battle.result) return;
      // En ligne, le combat ne s'arrête pas : on propose seulement de le quitter
      if (this.net) { C.UI.onlineQuitPrompt(); return; }
      this.battle.paused = true;
      C.Input.resetTouch();
      C.UI.go('pause', {}, { overlay: true });
    },
    resume() {
      if (!this.battle) return;
      C.UI.hide();
      this.battle.paused = false;
    },
    restart() {
      const ctx = this.ctx;
      this.battle = null;
      this.start(ctx);
    },
    // Quitte le combat terminé sans changer d'écran (ex. : retour à la sélection)
    leave() {
      if (C.School && C.School.active) C.School.detach();
      this.net = null;
      this.battle = null;
      C.inBattle = false;
      C.Input.touch.visible = false;
    },
    quit(toScreen) {
      if (C.School && C.School.active) C.School.detach();
      this.net = null;
      if (this.ctx && this.ctx.mode === 'training' && !this.ctx.school && C.Store.current) {
        const s = C.Store.current.stats;
        s.trainings = (s.trainings || 0) + 1;
        C.Store.addXp(15);
        C.Achievements.checkStats();
        C.Store.save();
      }
      this.battle = null;
      C.inBattle = false;
      C.Input.touch.visible = false;
      C.Audio.music('menu');
      C.UI.go(toScreen || 'main', {}, { reset: true });
    },

    // ------------------------------------------------------------------ en ligne
    // m : message « start » de l'hôte (graine, délai, réglages, infos des deux joueurs)
    startOnline(room, m) {
      const S = C.Store.settings;
      const me = room.role === 'host' ? 0 : 1;
      const pl = m.p;
      // héros personnalisés : enregistrés des deux côtés sous le même nom (heroA pour l'hôte, heroB pour l'invité)
      const chars = pl.map((p, i) => {
        if (p.char === 'hero' && p.hero) { C.Roster.setHero(p.hero, i ? 'heroB' : 'heroA'); return i ? 'heroB' : 'heroA'; }
        return C.Roster.get(p.char) && !C.Roster.get(p.char).extra ? p.char : 'kairo';
      });
      const cos = pl.map((p, i) => { const ch = C.Roster.get(chars[i]); return Math.max(0, Math.min((ch.palettes || [{}]).length - 1, p.costume | 0)); });
      if (chars[0] === chars[1] && cos[0] === cos[1]) cos[1] = (cos[0] + 1) % (C.Roster.get(chars[1]).palettes || [{}]).length;
      const ls = room.ls;
      const cfgM = m.cfg || {};
      const time = cfgM.time === 0 || cfgM.time === Infinity ? Infinity : (cfgM.time || 99);
      const cfg = {
        mode: 'online', det: true, seed: m.seed, viewFlip: me === 1, me,
        p1: { char: chars[0], costume: cos[0], controller: ls.controller(0), easy: !!pl[0].easy, player: pl[0].name },
        p2: { char: chars[1], costume: cos[1], controller: ls.controller(1), easy: !!pl[1].easy, player: pl[1].name },
        stage: C.Stages.get(cfgM.stage) ? cfgM.stage : 'temple', rounds: cfgM.rounds || 2, time, difficulty: 1,
        quality: this.quality(),
        onEnd: (r) => this.onlineEnd(r)
      };
      this.ctx = { mode: 'online', room, me, chars, p1: { char: pl[me].char }, p2: { char: pl[1 - me].char, human: true }, stage: cfg.stage, players: pl.map((p) => p.name) };
      this.battle = new C.Battle(cfg);
      if (time === Infinity) this.battle.clock = Infinity;
      this.battle.net = ls;
      ls.attach(this.battle);
      this.net = ls;
      if (C.School && C.School.active) C.School.detach();
      C.inBattle = true;
      C.Input.twoPlayers = false;
      C.Input.resetTouch();
      C.Input.touch.visible = C.touchDevice || C.Input.lastDevice === 'touch';
      C.UI.closeModal && C.UI.closeModal();
      C.UI.hide();
      const st = C.Stages.get(cfg.stage);
      C.Audio.music(st.music || U.choice(C.Audio.battleSongs));
      void S;
    },
    onlineEnd(r) {
      const ctx = this.ctx, room = ctx.room;
      const won = r.winner === ctx.me;
      const save = C.Store.current;
      const rewards = { orbs: 0, xp: 0, levels: 0 };
      if (save) {
        const s = save.stats;
        s.fights++; if (won) s.wins++; else s.losses++;
        s.online = (s.online || 0) + 1;
        const cs = C.Store.charStats(ctx.p1.char);
        cs.used++; if (won) cs.wins++;
        rewards.orbs = won ? 30 : 15;
        C.Store.addOrbs(rewards.orbs);
        const lv = C.Store.addXp(won ? 40 : 25);
        rewards.xp = lv.xp; rewards.levels = lv.levels;
        C.Achievements.checkStats && C.Achievements.checkStats();
        C.Store.save();
      }
      const me = this.battle.f[ctx.me], other = this.battle.f[1 - ctx.me];
      const info = { won, draw: false, me: { name: ctx.players[ctx.me], char: me.ch.name, wins: me.wins }, other: { name: ctx.players[1 - ctx.me], char: other.ch.name, wins: other.wins }, rewards, desyncs: this.net ? this.net.resyncs : 0 };
      this.net = null;
      this.battle = null;
      if (room) room.endFight();
      C.inBattle = false;
      C.Input.touch.visible = false;
      C.Audio.music(won ? 'victory' : 'menu');
      C.UI.go('onlineResult', { info }, { reset: false });
    },
    // Fin forcée (départ de l'adversaire, connexion perdue, ou « Quitter le combat »)
    onlineStop() {
      this.net = null;
      this.battle = null;
      C.inBattle = false;
      C.Input.touch.visible = false;
      C.Audio.music('menu');
    },

    // ------------------------------------------------------------------ fin de combat
    onEnd(result) {
      const ctx = this.ctx;
      ctx.result = result;
      const rewards = this.record(ctx, result);
      C.inBattle = false;
      C.Input.touch.visible = false;
      switch (ctx.mode) {
        case 'story': return this.storyEnd(ctx, result, rewards);
        case 'arcade': return this.arcadeEnd(ctx, result, rewards);
        case 'survival': return this.survivalEnd(ctx, result, rewards);
        default: C.UI.go('results', { ctx, result, rewards }, { reset: false });
      }
    },

    // Statistiques & orbes communes
    record(ctx, r) {
      const save = C.Store.current;
      const rewards = { orbs: 0, unlocks: [], stages: [], achievements: [] };
      if (!save || ctx.mode === 'training') return rewards;
      const s = save.stats;
      const won = r.winner === 0;
      const before = Object.keys(save.achievements).length;
      s.fights++;
      if (won) s.wins++; else s.losses++;
      s.kos += r.roundsWon;
      s.perfects += r.perfectRounds;
      s.maxCombo = Math.max(s.maxCombo, r.stats.maxCombo);
      s.parries += r.stats.parries;
      s.throws += r.stats.throws;
      if (r.ultKO) s.ultimateKOs++;
      const cs = C.Store.charStats(ctx.p1.char);
      cs.used++; if (won) cs.wins++;
      save.lastChar = ctx.p1.char;
      save.lastStage = ctx.stage;
      if (!ctx.p2.human) {
        const d = ctx.difficulty || 0;
        if (ctx.mode === 'versus') rewards.orbs = won ? 40 + d * 25 : 10;
        if (ctx.mode === 'arcade') rewards.orbs = won ? 30 + d * 15 : 0;
        if (ctx.mode === 'survival') rewards.orbs = won ? 25 + d * 10 : 0;
        if (ctx.mode === 'story') rewards.orbs = 0;
        rewards.orbs += r.perfectRounds * 20;
      } else {
        rewards.orbs = 20;
      }
      C.Store.addOrbs(rewards.orbs);
      // Expérience : on progresse même en perdant
      let xp = ctx.p2.human ? 25 : (won ? 50 + 15 * (ctx.difficulty || 0) : 20);
      xp += r.perfectRounds * 15 + (ctx.heroAwoke ? 10 : 0);
      const lv = C.Store.addXp(xp);
      rewards.xp = lv.xp; rewards.levels = lv.levels;
      C.Achievements.afterFight({ result: r, difficulty: ctx.p2.human ? 0 : ctx.difficulty, transformed: ctx.transformed });
      if (won && ctx.heroAwoke) C.Achievements.grant('eveil_heros');
      rewards.achievements = Object.keys(save.achievements).slice(before);
      C.Store.save();
      return rewards;
    },

    // ------------------------------------------------------------------ Histoire
    startChapter(ch, boost) {
      const save = C.Store.current;
      const diff = save.story.difficulty;
      const ctx = {
        mode: 'story', chapter: ch.id, boost: !!boost,
        p1: { char: ch.hero, costume: 0 },
        p2: { char: ch.foe, costume: 0, shadow: !!ch.foeShadow, hpMul: ch.boss ? [1.2, 1.4, 1.55, 1.7][diff] : 1 },
        stage: ch.stage, difficulty: diff, rounds: 2, time: 99,
        music: ch.boss ? 'boss' : null
      };
      this.start(ctx);
    },
    storyEnd(ctx, r, rewards) {
      const save = C.Store.current;
      const ch = C.Story.get(ctx.chapter);
      if (r.winner !== 0) {
        C.UI.go('storyLose', { ctx, ch });
        return;
      }
      const stars = C.Story.computeStars(r);
      const prev = save.story.done[ch.id] || 0;
      const first = !prev;
      save.story.done[ch.id] = Math.max(prev, stars);
      const diff = save.story.difficulty;
      let orbs = (first ? 150 : 30) + Math.max(0, stars - prev) * 60;
      orbs = Math.round(orbs * [0.8, 1, 1.3, 1.6][diff]);
      C.Store.addOrbs(orbs);
      rewards.orbs += orbs;
      rewards.stars = stars; rewards.first = first;
      if (first) { const lv = C.Store.addXp(60); rewards.xp = (rewards.xp || 0) + lv.xp; rewards.levels = (rewards.levels || []).concat(lv.levels); }
      if (ch.unlock && C.Store.unlockChar(ch.unlock)) rewards.unlocks.push(ch.unlock);
      if (ch.unlockStage && C.Store.unlockStage(ch.unlockStage)) rewards.stages.push(ch.unlockStage);
      if (C.Store.unlockStage(ch.stage)) rewards.stages.push(ch.stage);
      const before = Object.keys(save.achievements).length;
      C.Achievements.checkStats();
      rewards.achievements = rewards.achievements.concat(Object.keys(save.achievements).slice(before));
      C.Store.save();
      C.UI.go('dialog', { lines: ch.outro, hero: ch.hero, foe: ch.foe, foeShadow: ch.foeShadow, stage: ch.stage, title: 'Chapitre ' + ch.id + ' — ' + ch.title,
        next: () => C.UI.go('storyReward', { ch, rewards, stars }, { reset: false }) });
    },

    // ------------------------------------------------------------------ Arcade
    newArcade(char, costume, diff) {
      const pool = C.Roster.list.filter((c) => c.id !== char && c.id !== 'omega').map((c) => c.id);
      const opps = U.shuffle(pool).slice(0, 7);
      opps.push('omega');
      const stages = opps.map((id) => {
        const map = { kairo: 'temple', zarkan: 'temple', aldaron: 'academie', godefroy: 'chateau', kage: 'bambous', takeda: 'dojo', cassius: 'forge', leo: 'academie', mordrak: 'ruines', kael: 'vaisseau', noctis: 'vaisseau', malvar: 'vaisseau', tk7: 'vaisseau', pyrodrake: 'volcan', lumi: 'ruines', psykron: 'ruines', napoleon: 'chateau', zeus: 'ruines', rouge: 'vaisseau', omega: 'neant' };
        return map[id] || 'temple';
      });
      return { char, costume, diff, opps, stages, idx: 0, score: 0, continues: 0, total: 0 };
    },
    arcadeFight(A) {
      const last = A.idx === A.opps.length - 1;
      this.start({
        mode: 'arcade', arcade: A, boost: !!A.boostNext,
        p1: { char: A.char, costume: A.costume },
        p2: { char: A.opps[A.idx], costume: U.randi(0, 2), hpMul: last ? 1.3 : 1 },
        stage: A.stages[A.idx],
        difficulty: Math.min(3, A.diff + (A.idx >= 5 && A.diff < 3 ? 1 : 0) * 0),
        rounds: 2, time: 99, music: last ? 'boss' : null
      });
    },
    arcadeEnd(ctx, r, rewards) {
      const A = ctx.arcade;
      A.boostNext = false;
      if (r.winner === 0) {
        const pts = Math.round(1000 + r.lastHp * 2000 + r.stats.maxCombo * 100 + r.perfectRounds * 1500) * (1 + A.diff * 0.5);
        A.score += Math.round(pts);
        A.idx++;
        A.total += rewards.orbs;
        if (A.idx >= A.opps.length) {
          const save = C.Store.current;
          const bonus = [250, 400, 600, 900][A.diff];
          C.Store.addOrbs(bonus);
          A.total += bonus;
          save.arcade.cleared[A.char] = Math.max(save.arcade.cleared[A.char] == null ? -1 : save.arcade.cleared[A.char], A.diff);
          save.arcade.best = Math.max(save.arcade.best, A.score);
          C.Achievements.grant('arcade');
          if (A.diff >= 3) C.Achievements.grant('arcade_legend');
          C.Store.save();
          C.UI.go('arcadeEnding', { A, bonus });
          return;
        }
        C.Store.save();
        C.UI.go('ladder', { A, justWon: true, rewards });
      } else {
        C.UI.go('arcadeContinue', { A });
      }
    },

    // ------------------------------------------------------------------ Survie
    newSurvival(char, costume) {
      return { char, costume, wins: 0, hp: 1, meter: 0, total: 0, used: [] };
    },
    survivalFight(Sv) {
      const pool = C.Roster.list.filter((c) => c.id !== Sv.char).map((c) => c.id);
      const opp = U.choice(pool);
      const diff = Sv.wins < 3 ? 1 : Sv.wins < 7 ? 2 : 3;
      const stage = U.choice(C.Stages.list).id;
      this.start({
        mode: 'survival', survival: Sv,
        p1: { char: Sv.char, costume: Sv.costume, hpFrac: Sv.hp, meter: Sv.meter },
        p2: { char: opp, costume: U.randi(0, 2), dmgMul: 1 + Math.max(0, Sv.wins - 7) * 0.04 },
        stage, difficulty: diff, rounds: 1, time: 99
      });
    },
    survivalEnd(ctx, r, rewards) {
      const Sv = ctx.survival;
      const p = r.p1;
      Sv.total += rewards.orbs;
      if (r.winner === 0) {
        Sv.wins++;
        Sv.hp = Math.min(1, p.hp / p.maxHp + 0.3);
        Sv.meter = p.meter;
        const save = C.Store.current;
        if (Sv.wins > save.survival.best) { save.survival.best = Sv.wins; save.survival.bestChar = Sv.char; }
        C.Achievements.checkStats();
        C.Store.save();
        C.UI.go('survivalNext', { Sv });
      } else {
        C.Store.save();
        C.UI.go('survivalOver', { Sv });
      }
    }
  };

  C.Game = Game;
})(window.CDL = window.CDL || {});
