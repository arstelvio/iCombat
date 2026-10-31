/* Choc des Légendes — bibliothèque de poses (images clés) */
(function (C) {
  'use strict';
  const LEGS_IDLE = { th1: 0.42, sh1: -0.5, th2: -0.32, sh2: -0.3 };
  const LEGS_CROUCH = { th1: 1.35, sh1: -2.3, th2: 0.55, sh2: -2.45 };
  const LEGS_WIDE = { th1: 0.62, sh1: -0.5, th2: -0.62, sh2: -0.12 };
  const LEGS_TUCK = { th1: 1.0, sh1: -1.7, th2: 0.35, sh2: -1.4 };
  const LEGS_STAND = { th1: 0.17, sh1: -0.07, th2: -0.17, sh2: -0.05 };
  const m = (...o) => Object.assign({}, ...o);

  // --- Poses de base (style « arts martiaux ») ---
  const lib = {
    idle: m(LEGS_IDLE, { y: 6, torso: 0.15, head: -0.12, ua1: 0.5, la1: 2.2, ua2: 0.3, la2: 2.4 }),
    crouch: m(LEGS_CROUCH, { torso: 0.4, head: -0.3, ua1: 0.6, la1: 2.0, ua2: 0.4, la2: 2.2 }),
    jump: m(LEGS_TUCK, { torso: 0.05, head: -0.1, ua1: 0.9, la1: 1.6, ua2: -0.2, la2: 1.4, plant: false }),
    fall: { torso: 0.1, head: -0.05, ua1: 1.2, la1: 1.0, ua2: 0.4, la2: 1.2, th1: 0.5, sh1: -0.7, th2: -0.25, sh2: -0.6, plant: false },
    block: m(LEGS_IDLE, { y: 8, torso: -0.05, head: 0.15, ua1: 0.95, la1: 2.5, ua2: 0.75, la2: 2.6, th1: 0.48 }),
    crouch_block: m(LEGS_CROUCH, { torso: 0.2, head: 0.1, ua1: 0.95, la1: 2.5, ua2: 0.75, la2: 2.6 }),
    hit: { torso: -0.35, head: -0.45, ua1: 0.2, la1: 0.9, ua2: -0.5, la2: 0.7, th1: 0.25, sh1: -0.35, th2: -0.45, sh2: -0.2 },
    hit_low: { torso: 0.65, head: 0.4, ua1: 0.5, la1: 1.3, ua2: 0.3, la2: 1.2, th1: 0.3, sh1: -0.4, th2: -0.4, sh2: -0.2 },
    hit_crouch: m(LEGS_CROUCH, { torso: -0.1, head: -0.4, ua1: 0.3, la1: 1.0, ua2: -0.3, la2: 0.8 }),
    air_hit: { torso: -0.7, head: -0.5, ua1: -0.6, la1: 0.5, ua2: -0.9, la2: 0.4, th1: 0.7, sh1: -0.9, th2: 0.9, sh2: -0.4, plant: false },
    knockdown: { lie: 1, rot: -1.5, torso: 0, head: 0.25, ua1: -0.2, la1: 0.3, ua2: 0.6, la2: 0.5, th1: 0.15, sh1: -0.1, th2: 0.45, sh2: -0.6, plant: false },
    getup: m(LEGS_CROUCH, { torso: 0.6, head: -0.1, ua1: 0.9, la1: 0.3, ua2: 0.6, la2: 0.3 }),
    dash: { torso: 0.55, head: -0.3, ua1: -0.6, la1: 1.3, ua2: 0.9, la2: 1.4, th1: 0.95, sh1: -0.7, th2: -0.75, sh2: -0.5 },
    backdash: { torso: -0.25, head: 0.1, ua1: 0.6, la1: 1.8, ua2: 0.4, la2: 2.0, th1: 0.6, sh1: -0.4, th2: -0.2, sh2: -0.9 },
    jab_r: m(LEGS_IDLE, { y: 6, torso: 0.1, ua1: 0.35, la1: 2.4, ua2: 0.3, la2: 2.4 }),
    jab: { y: 6, torso: 0.3, head: -0.15, ua1: 1.6, la1: 0.08, ua2: 0.25, la2: 2.3, th1: 0.55, sh1: -0.45, th2: -0.45, sh2: -0.15 },
    cross: { y: 6, torso: 0.45, head: -0.2, ua1: 0.4, la1: 2.2, ua2: 1.65, la2: 0.05, th1: 0.55, sh1: -0.5, th2: -0.6, sh2: -0.05 },
    kick_r: { torso: -0.05, ua1: 0.6, la1: 2.0, ua2: 0.2, la2: 2.2, th1: 1.5, sh1: -2.0, th2: -0.1, sh2: -0.15 },
    kick: { torso: -0.3, head: 0.1, ua1: 0.6, la1: 1.9, ua2: -0.3, la2: 1.6, th1: 1.65, sh1: -0.05, th2: -0.1, sh2: -0.1 },
    hkick_r: { torso: -0.15, ua1: 0.8, la1: 1.6, ua2: 0.0, la2: 1.8, th1: 1.7, sh1: -2.2, th2: 0.0, sh2: -0.1 },
    hkick: { torso: -0.55, head: 0.25, ua1: 1.3, la1: 0.5, ua2: -0.6, la2: 0.7, th1: 2.25, sh1: -0.1, th2: 0.05, sh2: -0.08 },
    upper_r: { torso: 0.45, head: -0.2, ua1: 0.2, la1: 1.5, ua2: 0.4, la2: 2.0, th1: 1.1, sh1: -1.6, th2: 0.0, sh2: -1.4 },
    upper: { torso: -0.1, head: -0.3, ua1: 2.85, la1: 0.35, ua2: 0.3, la2: 1.8, th1: 0.35, sh1: -0.25, th2: -0.35, sh2: -0.6 },
    lowkick: { torso: 0.15, head: -0.2, ua1: 0.6, la1: 2.0, ua2: 0.4, la2: 2.2, th1: 1.5, sh1: -0.1, th2: 0.6, sh2: -2.4 },
    sweep: { torso: 0.6, head: -0.4, ua1: 1.3, la1: 0.2, ua2: 0.9, la2: 0.4, th1: 1.62, sh1: 0.0, th2: 1.0, sh2: -2.6 },
    air_kick: { torso: -0.15, ua1: 0.9, la1: 1.6, ua2: -0.3, la2: 1.5, th1: 1.5, sh1: -0.15, th2: 0.5, sh2: -1.7, plant: false },
    air_heavy_r: { torso: -0.1, ua1: 2.8, la1: 0.3, ua2: 2.7, la2: 0.3, th1: 0.8, sh1: -1.2, th2: 0.2, sh2: -1.2, plant: false },
    air_heavy: { torso: 0.45, head: 0.1, ua1: 1.2, la1: 0.1, ua2: 1.1, la2: 0.15, th1: 0.5, sh1: -0.8, th2: -0.1, sh2: -1.0, plant: false },
    grab: { torso: 0.35, head: -0.1, ua1: 1.45, la1: 0.35, ua2: 1.35, la2: 0.4, th1: 0.6, sh1: -0.5, th2: -0.5, sh2: -0.2 },
    toss: { torso: -0.35, head: -0.3, ua1: 2.5, la1: 0.4, ua2: 2.3, la2: 0.5, th1: 0.3, sh1: -0.2, th2: -0.5, sh2: -0.3 },
    cast_r: m(LEGS_WIDE, { y: 10, torso: -0.1, head: -0.1, ua1: -0.5, la1: 1.9, ua2: -0.45, la2: 2.0 }),
    cast: m(LEGS_WIDE, { y: 10, torso: 0.25, head: -0.15, ua1: 1.55, la1: 0.0, ua2: 1.5, la2: 0.05 }),
    cast1_r: m(LEGS_IDLE, { torso: 0.0, ua1: 0.0, la1: 1.8, ua2: 0.3, la2: 2.2 }),
    cast1: { torso: 0.25, head: -0.1, ua1: 1.6, la1: 0.0, ua2: 0.2, la2: 2.2, th1: 0.55, sh1: -0.45, th2: -0.5, sh2: -0.15 },
    cast_low: { torso: 0.3, head: 0.05, ua1: 1.2, la1: 0.05, ua2: 0.2, la2: 2.2, th1: 0.55, sh1: -0.45, th2: -0.5, sh2: -0.15 },
    cast_up: { torso: -0.15, head: -0.4, ua1: 2.95, la1: 0.1, ua2: 2.75, la2: 0.2, th1: 0.3, sh1: -0.2, th2: -0.3, sh2: -0.2 },
    cast_down: m(LEGS_WIDE, { y: 12, torso: 0.5, head: 0.2, ua1: 0.9, la1: 0.1, ua2: 0.8, la2: 0.15 }),
    charge: { y: 16, torso: 0.08, head: 0.05, ua1: 0.45, la1: 1.1, ua2: 0.4, la2: 1.1, th1: 0.5, sh1: -0.45, th2: -0.5, sh2: -0.4 },
    dash_punch: { torso: 0.6, head: -0.35, ua1: 1.75, la1: 0.05, ua2: -0.7, la2: 1.0, th1: 0.9, sh1: -0.4, th2: -0.8, sh2: -0.4 },
    rise: { torso: -0.15, head: -0.35, ua1: 3.0, la1: 0.2, ua2: 0.1, la2: 1.6, th1: 1.3, sh1: -1.8, th2: -0.1, sh2: -0.5, plant: false },
    dive_kick: { torso: -0.2, ua1: 1.4, la1: 1.0, ua2: -0.2, la2: 1.2, th1: 0.9, sh1: -0.1, th2: 0.2, sh2: -1.6, plant: false },
    shoulder: m(LEGS_WIDE, { torso: 0.55, head: 0.0, ua1: 0.2, la1: 1.8, ua2: -0.1, la2: 1.9 }),
    victory: m(LEGS_STAND, { torso: -0.05, head: -0.2, ua1: 3.05, la1: 0.15, ua2: 0.25, la2: 0.9 }),
    victory2: m(LEGS_STAND, { torso: -0.05, head: -0.15, ua1: 0.75, la1: 1.95, ua2: 0.6, la2: 2.05 }),
    defeat: { torso: 0.75, head: 0.5, ua1: 0.15, la1: 0.2, ua2: 0.1, la2: 0.3, th1: 1.45, sh1: -1.45, th2: 0.25, sh2: -1.75 },
    taunt: m(LEGS_STAND, { torso: -0.05, head: -0.1, ua1: 1.5, la1: 1.2, ua2: 0.4, la2: 2.0 }),
    stunned: { torso: 0.3, head: 0.5, ua1: 0.1, la1: 0.3, ua2: 0.0, la2: 0.3, th1: 0.3, sh1: -0.5, th2: -0.2, sh2: -0.4 },
    guardcrush: { torso: -0.45, head: -0.5, ua1: 2.0, la1: 0.6, ua2: 1.6, la2: 0.7, th1: 0.4, sh1: -0.4, th2: -0.5, sh2: -0.2 },
    grabbed: { torso: -0.2, head: -0.5, ua1: 1.9, la1: 1.3, ua2: 1.7, la2: 1.4, th1: 0.15, sh1: -0.3, th2: -0.15, sh2: -0.4, plant: false },
    spin1: { rot: 0, torso: 0.1, ua1: 1.57, la1: 0.0, ua2: -1.57, la2: 0.0, th1: 0.2, sh1: -0.3, th2: -0.2, sh2: -0.3, plant: false },
    spin2: { rot: Math.PI * 2, torso: 0.1, ua1: 1.57, la1: 0.0, ua2: -1.57, la2: 0.0, th1: 0.2, sh1: -0.3, th2: -0.2, sh2: -0.3, plant: false },
    flip1: m(LEGS_TUCK, { rot: 0, torso: 0.3, ua1: 1.2, la1: 1.0, ua2: 1.0, la2: 1.0, plant: false }),
    flip2: m(LEGS_TUCK, { rot: -Math.PI * 2, torso: 0.3, ua1: 1.2, la1: 1.0, ua2: 1.0, la2: 1.0, plant: false }),
    roll1: m(LEGS_TUCK, { rot: 0, torso: 0.9, head: 0.5, ua1: 1.0, la1: 1.5, ua2: 0.8, la2: 1.5, plant: false, y: 30 }),
    roll2: m(LEGS_TUCK, { rot: Math.PI * 2, torso: 0.9, head: 0.5, ua1: 1.0, la1: 1.5, ua2: 0.8, la2: 1.5, plant: false, y: 30 }),
    point: m(LEGS_IDLE, { torso: 0.1, head: -0.1, ua1: 1.65, la1: 0.0, ua2: 0.3, la2: 2.2 }),
    choke: m(LEGS_IDLE, { torso: -0.05, head: -0.1, ua1: 1.9, la1: 0.5, ua2: 0.3, la2: 1.0 }),
    fly: { torso: 1.1, head: -0.8, ua1: 1.0, la1: 0.6, ua2: 0.8, la2: 0.6, th1: 0.9, sh1: -0.6, th2: 0.6, sh2: -0.5, wing: 1.0, plant: false },
    meditate: { torso: 0.0, head: 0.1, ua1: 0.9, la1: 1.6, ua2: 0.8, la2: 1.7, th1: 1.5, sh1: -2.6, th2: 1.3, sh2: -2.5, plant: false }
  };
  lib.portrait = lib.idle;
  lib.intro = lib.taunt;

  // --- Variantes par style ---
  const sets = {
    blade: {
      idle: { ua1: 0.7, la1: 1.25, wa: 2.45, ua2: 0.25, la2: 1.9 },
      block: { ua1: 1.15, la1: 1.55, wa: 3.5, ua2: 0.5, la2: 2.0 },
      crouch_block: { ua1: 1.15, la1: 1.55, wa: 3.5 },
      crouch: { ua1: 0.9, la1: 0.9, wa: 2.1 },
      victory: { wa: 3.1 },
      victory2: { ua1: 0.4, la1: 0.6, wa: 0.4, ua2: 0.5, la2: 1.9 },
      taunt: { ua1: 1.3, la1: 0.3, wa: 1.57 },
      dash: { ua1: 0.2, la1: 0.6, wa: -1.0 },
      jump: { wa: 3.6 },
      fall: { wa: 2.6 },
      charge: { ua1: 0.5, la1: 0.6, wa: 0.6 }
    },
    staff: {
      idle: { ua1: 0.45, la1: 1.3, wa: 3.05, ua2: 0.2, la2: 1.5 },
      block: { ua1: 1.05, la1: 1.4, wa: 3.2, ua2: 0.9, la2: 1.6 },
      crouch_block: { ua1: 1.05, la1: 1.4, wa: 3.2 },
      crouch: { ua1: 0.7, la1: 1.0, wa: 3.0 },
      victory: { ua1: 2.9, la1: 0.3, wa: 3.14 },
      victory2: { ua1: 0.5, la1: 1.2, wa: 3.1, ua2: 0.3, la2: 1.2 },
      taunt: { ua1: 0.6, la1: 1.1, wa: 3.1, ua2: 1.4, la2: 1.2 },
      dash: { ua1: 0.4, la1: 1.0, wa: 2.2 },
      cast1: { wa: 1.75 },
      cast_up: { wa: 3.14 },
      charge: { ua1: 0.5, la1: 1.2, wa: 3.1 }
    },
    wand: {
      idle: { ua1: 0.6, la1: 1.5, wa: 2.2 },
      block: { wa: 3.0 },
      cast1: { wa: 1.6 },
      cast_low: { wa: 1.45 },
      cast1_r: { ua1: 2.4, la1: 1.3, wa: 3.9 },
      victory: { wa: 3.1 },
      taunt: { ua1: 1.4, la1: 0.4, wa: 1.7 }
    },
    rifle: {
      idle: m(LEGS_IDLE, { y: 4, torso: 0.08, ua2: 0.55, la2: 1.55, wa2: 1.62, ua1: 1.15, la1: 0.55 }),
      block: { ua2: 0.9, la2: 1.9, wa2: 2.6, ua1: 1.0, la1: 1.8 },
      crouch: { ua2: 0.55, la2: 1.55, wa2: 1.62, ua1: 1.15, la1: 0.55 },
      crouch_block: { ua2: 0.9, la2: 1.9, wa2: 2.6, ua1: 1.0, la1: 1.8 },
      cast1_r: { ua2: 0.55, la2: 1.55, wa2: 1.62, ua1: 1.15, la1: 0.55 },
      cast1: { torso: 0.05, ua2: 0.6, la2: 1.45, wa2: 1.58, ua1: 1.2, la1: 0.45 },
      jump: { ua2: 0.6, la2: 1.5, wa2: 1.8, ua1: 1.1, la1: 0.6 },
      fall: { ua2: 0.6, la2: 1.5, wa2: 1.4, ua1: 1.1, la1: 0.6 },
      victory: { ua2: 0.5, la2: 1.9, wa2: 2.9, ua1: 1.0, la1: 1.6 },
      taunt: { ua2: 0.4, la2: 1.9, wa2: 2.7, ua1: 1.6, la1: 0.3 }
    },
    bolter: {
      idle: { ua2: 1.3, la2: 0.25, wa2: 1.62, ua1: 0.7, la1: 1.25, wa: 2.45 },
      block: { ua2: 0.9, la2: 1.9, wa2: 2.6, ua1: 1.15, la1: 1.55, wa: 3.5 },
      crouch: { ua2: 1.3, la2: 0.25, wa2: 1.62, ua1: 0.9, la1: 0.9, wa: 2.1 },
      cast1_r: { ua1: 0.5, la1: 1.2, ua2: 1.3, la2: 0.25, wa2: 1.62 },
      cast1: { ua1: 0.5, la1: 1.2, ua2: 1.55, la2: 0.05, wa2: 1.58, torso: 0.1 },
      victory: { ua2: 1.0, la2: 1.0, wa2: 2.8, wa: 3.1 },
      taunt: { ua2: 1.6, la2: 0.0, wa2: 1.6 }
    },
    creature: {
      idle: { y: 4, torso: 0.2, ua1: 0.9, la1: 1.4, ua2: 0.7, la2: 1.5, th1: 0.35, sh1: -0.55, th2: -0.25, sh2: -0.5 }
    },
    float: {
      idle: { torso: 0.1, ua1: 0.9, la1: 1.2, ua2: 0.6, la2: 1.4, th1: 0.6, sh1: -1.0, th2: 0.2, sh2: -1.1 }
    }
  };

  // --- Poses d'attaque spécifiques aux armes (référencées par les coups) ---
  Object.assign(lib, {
    b_poke_r: m(LEGS_IDLE, { y: 6, torso: 0.1, ua1: 0.5, la1: 1.0, wa: 1.75, ua2: 0.25, la2: 2.0 }),
    b_poke: { y: 8, torso: 0.4, head: -0.15, ua1: 1.6, la1: 0.05, wa: 1.62, ua2: 0.0, la2: 1.8, th1: 0.75, sh1: -0.6, th2: -0.6, sh2: -0.05 },
    b_up_r: m(LEGS_IDLE, { y: 14, torso: 0.3, ua1: 0.3, la1: 0.25, wa: 0.6, ua2: 0.3, la2: 1.8 }),
    b_upslash: { torso: -0.15, head: -0.3, ua1: 2.7, la1: 0.3, wa: 3.15, ua2: 0.3, la2: 1.6, th1: 0.4, sh1: -0.3, th2: -0.35, sh2: -0.5 },
    b_over_r: { torso: -0.15, head: -0.1, ua1: 2.7, la1: 0.7, wa: 4.3, ua2: 0.4, la2: 1.6, th1: 0.4, sh1: -0.4, th2: -0.35, sh2: -0.2 },
    b_over: { torso: 0.45, head: 0.0, ua1: 1.25, la1: 0.15, wa: 1.25, ua2: -0.2, la2: 1.2, th1: 0.8, sh1: -0.7, th2: -0.65, sh2: -0.05 },
    b_side_r: m(LEGS_IDLE, { torso: -0.05, ua1: 0.9, la1: 2.2, wa: 4.6, ua2: 0.3, la2: 1.8 }),
    b_side: { torso: 0.35, head: -0.1, ua1: 1.45, la1: 0.1, wa: 0.9, ua2: -0.3, la2: 1.2, th1: 0.7, sh1: -0.55, th2: -0.55, sh2: -0.1 },
    b_low: m(LEGS_CROUCH, { torso: 0.45, ua1: 1.35, la1: 0.1, wa: 1.5, ua2: 0.4, la2: 1.8 }),
    b_sweep_r: m(LEGS_CROUCH, { torso: 0.2, ua1: 0.4, la1: 0.6, wa: -1.3, ua2: 0.4, la2: 1.8 }),
    b_sweep: { torso: 0.6, head: -0.3, ua1: 1.45, la1: 0.0, wa: 1.45, ua2: 0.6, la2: 0.6, th1: 1.62, sh1: -0.05, th2: 1.0, sh2: -2.6 },
    b_air_r: m(LEGS_TUCK, { torso: -0.1, ua1: 2.6, la1: 0.6, wa: 3.9, ua2: 0.3, la2: 1.5, plant: false }),
    b_air: m(LEGS_TUCK, { torso: 0.3, ua1: 1.5, la1: 0.2, wa: 1.0, ua2: -0.2, la2: 1.3, plant: false }),
    b_air_down: m(LEGS_TUCK, { torso: 0.2, ua1: 0.9, la1: 0.1, wa: 0.15, ua2: 0.2, la2: 1.3, plant: false }),
    b_dash: { torso: 0.55, head: -0.3, ua1: 1.6, la1: 0.1, wa: 1.6, ua2: -0.6, la2: 1.2, th1: 0.95, sh1: -0.7, th2: -0.75, sh2: -0.5 },
    b_iai_r: m(LEGS_WIDE, { y: 16, torso: 0.35, head: -0.1, ua1: 0.05, la1: 1.7, wa: -1.45, ua2: 0.2, la2: 1.9 }),
    b_iai: m(LEGS_WIDE, { y: 18, torso: 0.4, head: -0.15, ua1: 1.7, la1: 0.0, wa: 1.95, ua2: -0.5, la2: 0.9 }),
    b_shield: m(LEGS_WIDE, { torso: 0.3, ua1: 0.3, la1: 1.2, wa: 1.9, ua2: 1.5, la2: 0.4 }),
    s_cast: m(LEGS_IDLE, { torso: 0.2, ua1: 1.45, la1: 0.55, wa: 2.2, ua2: 0.4, la2: 1.5 }),
    s_cast_low: m(LEGS_IDLE, { torso: 0.2, head: 0.05, ua1: 1.2, la1: 0.2, wa: 1.6, ua2: 0.5, la2: 1.4 }),
    s_raise: m(LEGS_STAND, { torso: -0.1, head: -0.3, ua1: 2.9, la1: 0.3, wa: 3.14, ua2: 0.6, la2: 1.2 }),
    s_strike_r: m(LEGS_IDLE, { torso: -0.1, ua1: 2.4, la1: 0.8, wa: 4.2, ua2: 0.3, la2: 1.4 }),
    s_strike: { torso: 0.45, head: -0.1, ua1: 1.35, la1: 0.15, wa: 1.6, ua2: 1.0, la2: 0.6, th1: 0.75, sh1: -0.6, th2: -0.6, sh2: -0.1 },
    s_slam: m(LEGS_WIDE, { y: 10, torso: 0.55, head: 0.1, ua1: 1.0, la1: 0.1, wa: 0.6, ua2: 0.9, la2: 0.3 }),
    r_shoot: m(LEGS_IDLE, { torso: 0.02, ua2: 0.6, la2: 1.45, wa2: 1.58, ua1: 1.2, la1: 0.45 }),
    r_butt_r: m(LEGS_IDLE, { torso: -0.1, ua2: 0.3, la2: 2.2, wa2: 4.0, ua1: 0.8, la1: 1.6 }),
    r_butt: { torso: 0.4, ua2: 1.4, la2: 0.3, wa2: 1.0, ua1: 1.4, la1: 0.3, th1: 0.7, sh1: -0.55, th2: -0.55, sh2: -0.1 }
  });

  const cache = {};
  function get(name, look) {
    const key = (look ? look.id : '') + '|' + name;
    if (cache[key]) return cache[key];
    let base = lib[name] || lib.idle;
    const style = look && look.poseSet;
    let p = Object.assign({}, base);
    if (style && sets[style] && sets[style][name]) Object.assign(p, sets[style][name]);
    if (look && look.poseOver && look.poseOver[name]) Object.assign(p, look.poseOver[name]);
    if (look && look.poseAdd && name !== 'knockdown') {
      for (const k in look.poseAdd) p[k] = (p[k] || 0) + look.poseAdd[k];
    }
    cache[key] = C.Rig.completePose(p);
    return cache[key];
  }

  // Marche procédurale à partir de la garde
  function walk(look, phase, dir, out) {
    const base = get('idle', look);
    out = Object.assign(out || {}, base);
    const s = Math.sin(phase), c = Math.cos(phase);
    const amp = 0.28;
    out.th1 = base.th1 + s * amp * dir;
    out.th2 = base.th2 - s * amp * dir;
    out.sh1 = base.sh1 - Math.max(0, c) * 0.45;
    out.sh2 = base.sh2 - Math.max(0, -c) * 0.45;
    out.y = base.y + Math.abs(s) * 3;
    out.torso = base.torso + 0.04 * dir;
    return out;
  }
  function run(look, phase, out) {
    const base = get('dash', look);
    out = Object.assign(out || {}, base);
    const s = Math.sin(phase), c = Math.cos(phase);
    out.th1 = 0.1 + s * 0.85;
    out.th2 = 0.1 - s * 0.85;
    out.sh1 = -0.3 - Math.max(0, -c) * 1.4;
    out.sh2 = -0.3 - Math.max(0, c) * 1.4;
    out.ua1 = base.ua1 + s * 0.4;
    out.ua2 = base.ua2 - s * 0.4;
    return out;
  }
  function breathe(look, t, out) {
    const base = get('idle', look);
    out = Object.assign(out || {}, base);
    const b = Math.sin(t * 3.2);
    out.y = base.y + b * 2;
    out.la1 = base.la1 + b * 0.05;
    out.la2 = base.la2 + b * 0.05;
    out.head = base.head + b * 0.03;
    return out;
  }

  C.Poses = { lib, sets, get, walk, run, breathe };
})(window.CDL = window.CDL || {});
