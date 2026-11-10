/* Choc des Légendes — galerie des combattants : apparence, statistiques, biographies.
   Tous les personnages sont des créations originales inspirées de grands archétypes
   (guerriers à aura, mages, chevaliers, ninjas, samouraïs, chevaliers stellaires, créatures…). */
(function (C) {
  'use strict';
  const U = C.U;

  const CHARS = [
    {
      id: 'kairo', name: 'Carotte', title: 'Guerrier Céleste', world: 'Monde des Arts Célestes',
      bio: "Combattant infatigable venu d'un monde où l'énergie vitale, le Ki, se maîtrise comme une arme. Lorsqu'il libère son Éveil Doré, ses cheveux s'embrasent d'or et sa puissance décuple.",
      quotes: { intro: 'Montre-moi ce que tu as dans le ventre !', win: "C'était un super combat ! On remet ça ?", lose: 'Je… je dois encore m\'entraîner…' },
      style: 'martial', aura: '#5fd3ff', awakenAura: '#ffd84a',
      stats: { hp: 1000, walk: 4.6, dash: 13, jump: 19, airJumps: 1, weight: 1.0, power: 1.029, defense: 0.972 },
      rating: { puissance: 4, vitesse: 4, defense: 3, portee: 3, technique: 3 },
      look: {
        build: 'normal', head: 'human', hair: 'spiky', awaken: true, chest: 'gi', beltKnot: true,
        colors: { skin: '#f2c69b', hair: '#161616', eye: '#161616', top: '#d63a2a', inner: '#1f1f2a', bottom: '#d63a2a', belt: '#1f1f2a', boots: '#1f1f2a', gloves: null }
      },
      palettes: [{}, { top: '#2e6fd8', bottom: '#2e6fd8', inner: '#f2f2f2', belt: '#f2f2f2', boots: '#f2f2f2' }, { top: '#f2f2f2', bottom: '#f2f2f2', inner: '#202020', belt: '#202020', hair: '#3a2a1a' }]
    },
    {
      id: 'zarkan', name: 'Légume', title: 'Prince Déchu', world: 'Monde des Arts Célestes',
      bio: "Prince d'une race guerrière éteinte, orgueilleux et implacable. Il a juré de surpasser Carotte, son éternel rival. Son énergie violette est aussi dévastatrice que sa fierté.",
      quotes: { intro: 'Incline-toi devant ton prince.', win: 'Pathétique. Un prince ne perd jamais.', lose: 'Impossible… Moi, battu ?!' },
      style: 'martial', aura: '#b86cff', awakenAura: '#ffd84a',
      stats: { hp: 980, walk: 4.8, dash: 13.5, jump: 19, airJumps: 1, weight: 0.95, power: 1.065, defense: 1.014 },
      rating: { puissance: 5, vitesse: 4, defense: 3, portee: 3, technique: 2 },
      look: {
        build: 'normal', head: 'human', hair: 'flame', awaken: true, chest: 'plate', browAngle: 2.2,
        dims: { tTop: 46 },
        pads: { color: '#d9b44a', r: 13 },
        colors: { skin: '#efc29a', hair: '#111111', eye: '#111', top: '#2b1f4a', metal: '#ecebf3', bottom: '#2b1f4a', boots: '#f0eef5', gloves: '#f0eef5', sleeve: '#2b1f4a' }
      },
      palettes: [{}, { top: '#1d3b2a', bottom: '#1d3b2a', sleeve: '#1d3b2a', 'pads.color': '#9a9a9a' }, { top: '#4a1010', bottom: '#4a1010', sleeve: '#4a1010', metal: '#2a2a2a', 'pads.color': '#c62828' }]
    },
    {
      id: 'aldaron', name: 'Le Sorcier', title: 'Mage Errant', world: 'Terres du Milieu-Monde',
      bio: "Vieux magicien au chapeau pointu et à la barbe d'argent, aussi sage que redoutable. Son bâton canalise une lumière ancienne capable de repousser les ténèbres les plus profondes.",
      quotes: { intro: 'Un magicien n\'est jamais en retard pour un combat.', win: 'Retourne dans l\'ombre d\'où tu viens.', lose: 'Même la lumière… vacille parfois.' },
      style: 'staff', aura: '#f2f6ff',
      stats: { hp: 960, walk: 3.8, dash: 11, jump: 17, airJumps: 1, weight: 0.95, power: 1.188, defense: 0.885 },
      rating: { puissance: 4, vitesse: 2, defense: 3, portee: 5, technique: 4 },
      look: {
        build: 'old', head: 'human', hair: 'bald', beard: true, hat: 'wizard', chest: 'robe', poseSet: 'staff',
        hairBack: [[-0.4, -0.7], [-1.15, 0.1], [-1.2, 1.6], [-0.4, 1.3], [0.1, 0.6]],
        robe: { color: '#80858f' }, cape: { color: '#666b75', len: 125 },
        poseAdd: { torso: 0.06 },
        weapon: { type: 'staff', len: 175, color: '#6e4a2c', glow: '#f6fbff', grip: 0.38 },
        colors: { skin: '#eccaa8', hair: '#d8d8de', beard: '#e6e6ec', eye: '#3a6ea5', top: '#8a8f99', hat: '#8a8f99', bottom: '#80858f', belt: '#5a4632', boots: '#3b2f25', brow: '#cfcfd6' }
      },
      palettes: [{}, { top: '#eeeeF2', hat: '#eeeef2', 'robe.color': '#e6e6ec', 'cape.color': '#d8d8de' }, { top: '#2e3f78', hat: '#2e3f78', 'robe.color': '#28376a', 'cape.color': '#1f2b55' }]
    },
    {
      id: 'godefroy', name: 'Chevalier', title: 'Lion de Valombre', world: 'Royaume de Valombre',
      bio: "Chevalier en armure de plates, fidèle à son serment de protéger les faibles. Lent mais inébranlable, son bouclier encaisse ce qu'aucun autre ne pourrait supporter.",
      quotes: { intro: 'Pour l\'honneur et le royaume !', win: 'Relève-toi, et va en paix.', lose: 'Mon serment… n\'est pas encore accompli.' },
      style: 'blade', aura: '#ffe08a',
      stats: { hp: 1150, walk: 3.6, dash: 10.5, jump: 16, airJumps: 0, weight: 1.3, power: 1, defense: 0.97 },
      rating: { puissance: 5, vitesse: 2, defense: 5, portee: 4, technique: 2 },
      look: {
        build: 'heavy', head: 'knight', chest: 'tabard', armorLimbs: true, poseSet: 'blade',
        pads: { color: '#b9c0ca', r: 15 },
        cape: { color: '#1a3f86', inner: '#e6c449', len: 112 },
        weapon: { type: 'sword', len: 92, guard: '#d4a017' },
        weapon2: { type: 'shield', color: '#1f4fa8', trim: '#e6c449' },
        colors: { metal: '#b9c0ca', metal2: '#9aa2ad', top: '#1f4fa8', accent: '#e6c449', plume: '#c62828', bottom: '#9aa2ad', sleeve: '#9aa2ad', boots: '#8a929c', gloves: '#8a929c', belt: '#5a3b1c', skin: '#e9c19c' }
      },
      palettes: [{}, { top: '#a3201b', 'cape.color': '#7a1714', 'weapon2.color': '#a3201b', plume: '#f2f2f2' }, { top: '#1d1d1d', metal: '#4a4d55', metal2: '#3a3d44', 'cape.color': '#111', 'weapon2.color': '#1d1d1d', plume: '#6a1b9a' }]
    },
    {
      id: 'kage', name: 'Le Ninja', title: 'Ombre du Clan Kurai', world: 'Archipel du Soleil Levant',
      bio: "Ninja d'élite, maître de la discrétion et des techniques de substitution. Il frappe avant même qu'on l'aperçoive et disparaît dans un nuage de fumée.",
      quotes: { intro: '…', win: 'Tu n\'as vu que mon ombre.', lose: 'Le clan… me pardonnera-t-il ?' },
      style: 'martial', aura: '#ff4a4a',
      stats: { hp: 900, walk: 5.4, dash: 15, jump: 20, airJumps: 2, weight: 0.85, power: 1.034, defense: 0.935 },
      rating: { puissance: 2, vitesse: 5, defense: 2, portee: 3, technique: 5 },
      look: {
        build: 'slim', head: 'ninja', chest: 'ninja', scarf: ['#c62828', '#9e1b1b'],
        colors: { skin: '#e9c19c', top: '#22222e', mask: '#22222e', band: '#c62828', bottom: '#22222e', boots: '#15151c', gloves: '#15151c', belt: '#c62828', eye: '#222' }
      },
      palettes: [{}, { top: '#e8e8ee', mask: '#e8e8ee', bottom: '#e8e8ee', band: '#1565c0', belt: '#1565c0' }, { top: '#2b3b1b', mask: '#2b3b1b', bottom: '#2b3b1b', band: '#f9a825', belt: '#f9a825' }]
    },
    {
      id: 'takeda', name: 'Samouraï', title: 'Lame du Shogun', world: 'Archipel du Soleil Levant',
      bio: "Samouraï au code d'honneur inflexible. Sa technique de dégainé éclair, l'Iaï, tranche avant que l'adversaire n'ait cligné des yeux.",
      quotes: { intro: 'Que nos lames parlent pour nous.', win: 'Un combat honorable. Je te salue.', lose: 'Ma lame… a manqué de résolution.' },
      style: 'blade', aura: '#ff8fb1',
      stats: { hp: 1000, walk: 4.3, dash: 13, jump: 17.5, airJumps: 1, weight: 1.05, power: 0.979, defense: 1.071 },
      rating: { puissance: 4, vitesse: 3, defense: 3, portee: 5, technique: 4 },
      look: {
        build: 'normal', head: 'samurai', hat: 'kabuto', hair: 'bald', chest: 'samurai', poseSet: 'blade',
        pads: { color: '#a3201b', trim: '#d4a017', r: 15 },
        robe: { color: '#2b2b38', short: true },
        weapon: { type: 'katana', len: 102, grip: '#1d1d40' },
        colors: { skin: '#e9c19c', hair: '#111', top: '#a3201b', accent: '#d4a017', bottom: '#2b2b38', sleeve: '#2b2b38', boots: '#2b2b2b', gloves: '#3a1010', helm: '#1e1e22', belt: '#d4a017' }
      },
      palettes: [{}, { top: '#1d3f8a', 'pads.color': '#1d3f8a', helm: '#d4a017' }, { top: '#1a1a1a', 'pads.color': '#1a1a1a', accent: '#c0c0c0', 'robe.color': '#5a1010' }]
    },
    {
      id: 'cassius', name: 'Marine Spatial', title: 'Templier Stellaire', world: 'Imperium des Mille Soleils',
      bio: "Super-soldat en armure énergétique d'un futur lointain et sombre. Armé d'un fusil à bolts et d'une épée tronçonneuse, il ne connaît ni la peur ni la retraite.",
      quotes: { intro: 'Pour l\'Imperium ! Aucune pitié !', win: 'L\'hérétique est purgé.', lose: 'Mon armure… a failli…' },
      style: 'heavy', aura: '#ff6a2a',
      stats: { hp: 1180, walk: 3.5, dash: 10, jump: 15, airJumps: 0, weight: 1.4, power: 0.996, defense: 0.951 },
      rating: { puissance: 5, vitesse: 2, defense: 5, portee: 4, technique: 2 },
      look: {
        build: 'titan', head: 'marine', chest: 'marine', armorLimbs: true, jetpack: true, poseSet: 'bolter', scale: 1.05,
        pads: { color: '#46607a', trim: '#d9b44a', r: 22 },
        weapon: { type: 'chainsword', len: 76 },
        weapon2: { type: 'bolter', layer: 'front' },
        colors: { top: '#46607a', metal: '#46607a', metal2: '#36495d', accent: '#d9b44a', bottom: '#46607a', sleeve: '#36495d', boots: '#2c3a4a', gloves: '#2c3a4a', lens: '#ff2a2a', belt: '#2a2a2a', skin: '#e9c19c' }
      },
      palettes: [{}, { top: '#8e1f22', metal: '#8e1f22', metal2: '#701a1c', sleeve: '#701a1c', bottom: '#8e1f22', 'pads.color': '#8e1f22' }, { top: '#1f4a2a', metal: '#1f4a2a', metal2: '#173a20', sleeve: '#173a20', bottom: '#1f4a2a', 'pads.color': '#1f4a2a', lens: '#3cff6a' }]
    },
    {
      id: 'leo', name: 'Le Jeune Sorcier', short: 'Jeune Sorcier', title: 'Élève d\'Ombrelune', world: "Académie d'Ombrelune",
      bio: "Élève prodige de l'Académie d'Ombrelune, il manie la baguette avec un instinct rare. Courageux jusqu'à l'imprudence, il a déjà affronté des sorciers bien plus âgés que lui.",
      quotes: { intro: 'Je n\'ai pas peur de toi !', win: 'Pas mal pour un élève de troisième année, hein ?', lose: 'J\'aurais dû réviser mes sortilèges…' },
      style: 'wand', aura: '#ff5a5a',
      stats: { hp: 1000, walk: 4.7, dash: 13.5, jump: 18.5, airJumps: 1, weight: 0.95, power: 1.016, defense: 0.994 },
      // Sorts : portée et dégâts accrus des coups normaux
      tune: { reach: 1.15, dmg: 1.05 },
      rating: { puissance: 4, vitesse: 4, defense: 3, portee: 5, technique: 4 },
      look: {
        build: 'slim', head: 'human', hair: 'messy', glasses: true, chest: 'robe', poseSet: 'wand',
        scarf: ['#7b3fb0', '#d9b44a'], robe: { color: '#1c1c26', trim: '#7b3fb0' },
        weapon: { type: 'wand', len: 30, color: '#6b4423', glow: '#ff5050' },
        colors: { skin: '#f0c8a2', hair: '#2a1b12', eye: '#2f8a4e', top: '#1c1c26', inner: '#e9e9ef', bottom: '#3a3a46', boots: '#2a2018' }
      },
      palettes: [{}, { scarf: ['#1565c0', '#b0bec5'], 'robe.trim': '#1565c0' }, { scarf: ['#2e7d32', '#c0c0c0'], 'robe.trim': '#2e7d32' }]
    },
    {
      id: 'mordrak', name: 'Le Mage Noir', title: 'Le Sans-Nom', world: "Académie d'Ombrelune",
      bio: "Sorcier noir au visage livide, obsédé par l'immortalité. Ses sortilèges funestes et son serpent maudit sèment la terreur dans tout le monde magique.",
      quotes: { intro: 'Tu oses me défier, moi ?', win: 'Il n\'y a ni bien ni mal. Seulement le pouvoir.', lose: 'Non… NON ! C\'est impossible !' },
      style: 'wand', aura: '#42ff7a',
      stats: { hp: 960, walk: 4.0, dash: 12, jump: 17, airJumps: 1, weight: 0.9, power: 1.255, defense: 0.912 },
      rating: { puissance: 5, vitesse: 3, defense: 2, portee: 5, technique: 3 },
      look: {
        build: 'slim', head: 'pale', hair: 'bald', eyeStyle: 'slit', chest: 'robe', poseSet: 'wand',
        dims: { torso: 64, thigh: 51, shin: 51 },
        robe: { color: '#141418' }, cape: { color: '#0d0d10', len: 130 },
        weapon: { type: 'wand', len: 36, color: '#e8e2d0', glow: '#42ff7a' },
        colors: { skin: '#dfe6e0', eye: '#ff2a2a', top: '#141418', bottom: '#141418', boots: '#0b0b0e' }
      },
      palettes: [{}, { top: '#1b2a1b', 'robe.color': '#1b2a1b', 'cape.color': '#0e1a0e' }, { top: '#3a0a0a', 'robe.color': '#3a0a0a', 'cape.color': '#200505' }]
    },
    {
      id: 'kael', name: 'Lucas Orin', short: 'Lucas', title: 'Chevalier Astral', world: 'Galaxie de la Bordure',
      bio: "Gardien de la paix d'un ordre ancien, Lucas ressent le Flux qui relie toute chose. Son sabre à plasma bleu et ses réflexes surhumains font de lui un adversaire redoutable.",
      quotes: { intro: 'Que le Flux me guide.', win: 'La colère mène à la défaite.', lose: 'Je n\'ai pas écouté le Flux…' },
      style: 'blade', aura: '#3fa9ff',
      stats: { hp: 1000, walk: 4.7, dash: 13.5, jump: 20, airJumps: 1, weight: 1.0, power: 0.919, defense: 1.089 },
      rating: { puissance: 3, vitesse: 4, defense: 3, portee: 4, technique: 5 },
      look: {
        build: 'normal', head: 'human', hair: 'cap', chest: 'tunic', poseSet: 'blade',
        cape: { color: '#6b4a2b', len: 118 },
        weapon: { type: 'saber', len: 100, color: '#3fa9ff', hilt: '#b0b8c2' },
        colors: { skin: '#e6bc94', hair: '#9a6a36', eye: '#3a5a8a', top: '#d8c7a3', inner: '#efe5cf', bottom: '#cdbb95', sleeve: '#d8c7a3', boots: '#5a3b22', belt: '#6b4a2b' }
      },
      palettes: [{}, { 'weapon.color': '#3cff5a', top: '#e8e2d2', 'cape.color': '#2b2b2b' }, { 'weapon.color': '#b45cff', top: '#4a3a2a', bottom: '#3a2a1a', sleeve: '#4a3a2a', 'cape.color': '#1a1a1a' }]
    },
    {
      id: 'noctis', name: 'Seigneur Noir', title: 'Main de l\'Empereur', world: 'Galaxie de la Bordure',
      bio: "Chevalier déchu engoncé dans une armure noire qui le maintient en vie. Son souffle mécanique annonce la fin de ceux qui osent le défier. Sa poigne psychique peut étouffer à distance.",
      quotes: { intro: 'Ta défaite est déjà écrite.', win: 'Tu as sous-estimé le côté obscur du Flux.', lose: 'Le maître… sera déçu.' },
      style: 'blade', aura: '#ff2323',
      stats: { hp: 1150, walk: 4.0, dash: 12, jump: 15.5, airJumps: 0, weight: 1.35, power: 1.031, defense: 0.941 },
      tune: { reach: 1.12 },
      rating: { puissance: 5, vitesse: 2, defense: 4, portee: 4, technique: 3 },
      look: {
        build: 'heavy', head: 'darklord', chest: 'darklord', poseSet: 'blade', scale: 1.08,
        dims: { thigh: 50, shin: 50 },
        pads: { color: '#141418', r: 13 },
        cape: { color: '#0c0c10', inner: '#3a0000', len: 138 },
        weapon: { type: 'saber', len: 102, color: '#ff2323', hilt: '#c8ccd2' },
        colors: { top: '#141418', metal: '#141418', bottom: '#141418', sleeve: '#141418', boots: '#0b0b0e', gloves: '#0b0b0e', belt: '#3a3a40', helm: '#101014', skin: '#ddd' }
      },
      palettes: [{}, { top: '#e8e8ec', helm: '#e8e8ec', sleeve: '#d0d0d6', bottom: '#d0d0d6', 'cape.color': '#b0b0b8', 'weapon.color': '#ff8c1a' }, { top: '#3a0a0a', helm: '#2a0505', sleeve: '#2a0505', bottom: '#2a0505', 'cape.color': '#1a0000' }]
    },
    {
      id: 'malvar', name: 'Empereur', title: 'Seigneur des Ténèbres', world: 'Galaxie de la Bordure',
      bio: "Vieillard encapuchonné qui règne sur une galaxie entière par la peur. Ses mains déchaînent des éclairs sombres d'une puissance illimitée. Son rire glace le sang.",
      quotes: { intro: 'Ta haine te rendra plus fort… à mon service.', win: 'Pouvoir… ABSOLU !', lose: 'Comment… est-ce possible ?!' },
      style: 'caster', aura: '#8ab4ff',
      stats: { hp: 940, walk: 3.7, dash: 12, jump: 16.5, airJumps: 1, weight: 0.9, power: 1.072, defense: 0.98 },
      rating: { puissance: 5, vitesse: 3, defense: 2, portee: 4, technique: 4 },
      look: {
        build: 'old', head: 'human', hat: 'hood', hair: 'bald', eyeStyle: 'glow', wrinkles: true, chest: 'robe',
        robe: { color: '#111116' }, poseAdd: { torso: 0.2, head: -0.12 },
        weapon: { type: 'saber', len: 92, color: '#ff2323', hilt: '#c8ccd2' }, weaponHidden: true,
        colors: { skin: '#d9cbb8', eye: '#ffcc1a', top: '#111116', hood: '#0e0e12', bottom: '#111116', boots: '#0b0b0e' }
      },
      palettes: [{}, { top: '#3a0a12', hood: '#2a050c', 'robe.color': '#2a050c' }, { top: '#2b2b33', hood: '#1f1f26', 'robe.color': '#1f1f26' }]
    },
    {
      id: 'tk7', name: 'Soldat Impérial', title: 'Matricule TK-7', world: 'Galaxie de la Bordure',
      bio: "Soldat d'élite de l'armée impériale en armure blanche. Ses tirs de blaster ne sont pas toujours précis… mais ils sont très nombreux. Il n'est jamais vraiment seul.",
      quotes: { intro: 'Halte ! Contrôle d\'identité !', win: 'Cible neutralisée. Je l\'ai eue, chef !', lose: 'Envoyez… des renforts…' },
      style: 'rifle', aura: '#ff4040',
      stats: { hp: 950, walk: 4.4, dash: 12.5, jump: 17, airJumps: 0, weight: 1.0, power: 1.05, defense: 0.904 },
      rating: { puissance: 3, vitesse: 3, defense: 3, portee: 5, technique: 3 },
      look: {
        build: 'normal', head: 'trooper', chest: 'trooper', trooperLimbs: true, poseSet: 'rifle',
        weapon: { type: 'rifle', hand: 2 },
        colors: { top: '#eef0f2', sleeve: '#1b1b20', bottom: '#1b1b20', boots: '#eef0f2', gloves: '#1b1b20', belt: '#e9ebee', accent: '#4a5a8a', skin: '#ccc' }
      },
      palettes: [{}, { top: '#8a8f99', boots: '#8a8f99', accent: '#c62828' }, { top: '#1a1a20', boots: '#1a1a20', sleeve: '#0b0b0e', bottom: '#0b0b0e', accent: '#c62828' }]
    },
    {
      id: 'pyrodrake', name: 'Dracoflamme', title: 'Dragon des Cendres', world: 'Monts Volcaniques',
      bio: "Créature ailée dont la queue porte une flamme éternelle. Fier et sauvage, il crache des torrents de feu capables de faire fondre la roche. Il vole avec une aisance déconcertante.",
      quotes: { intro: 'RRROOOAAAR !', win: 'Grrrr… (souffle une gerbe de flammes)', lose: 'Grrr… (sa flamme vacille)' },
      style: 'creature', aura: '#ff8a1a',
      stats: { hp: 1080, walk: 4.0, dash: 12, jump: 17, airJumps: 2, weight: 1.25, power: 1.014, defense: 1.002 },
      rating: { puissance: 5, vitesse: 3, defense: 4, portee: 4, technique: 2 },
      look: {
        build: 'dragon', head: 'dragon', chest: 'belly', bellyStripes: true, poseSet: 'creature', scale: 1.1,
        tail: { len: 95, w0: 17, w1: 7, tip: 'flame', color: '#f08a24', angle: -1.9, curl: 0.16, wave: 0.1 },
        wings: { len: 125, membrane: '#1f8a8f' },
        colors: { skin: '#f08a24', belly: '#f6dc8f', eye: '#2b7bd6', horn: '#f2e6c4', top: '#f08a24', bottom: '#f08a24', boots: null }
      },
      palettes: [{}, { skin: '#2a2a33', top: '#2a2a33', bottom: '#2a2a33', 'tail.color': '#2a2a33', 'wings.membrane': '#b71c1c', eye: '#ff3030' }, { skin: '#f2c230', top: '#f2c230', bottom: '#f2c230', 'tail.color': '#f2c230', 'wings.membrane': '#5c6bc0' }]
    },
    {
      id: 'lumi', name: 'Miaou', title: 'Esprit Primordial', world: 'Ruines Célestes',
      bio: "Minuscule créature rose qui flotte dans les airs, aussi espiègle que mystérieuse. On raconte qu'elle porte en elle le code génétique de toutes les créatures du monde.",
      quotes: { intro: 'Mew ? Miou !', win: 'Miouuu ! (fait une pirouette)', lose: 'Miou… (se roule en boule)' },
      style: 'tiny', aura: '#ff9ad6',
      stats: { hp: 860, walk: 4.8, dash: 14, jump: 16, airJumps: 4, weight: 0.65, power: 1.142, defense: 0.85, float: true },
      rating: { puissance: 2, vitesse: 4, defense: 1, portee: 4, technique: 5 },
      look: {
        build: 'small', head: 'cat', poseSet: 'float', hover: 46, armSkin: true, portraitZoom: 1.25,
        tail: { len: 125, w0: 6, w1: 3.5, tip: 'ball', color: '#ffb3d1', angle: -2.3, curl: 0.22, wave: 0.25, speed: 4 },
        colors: { skin: '#ffb3d1', eye: '#3aa0ff', top: '#ffb3d1', bottom: '#ffb3d1' }
      },
      palettes: [{}, { skin: '#a7d8ff', top: '#a7d8ff', bottom: '#a7d8ff', 'tail.color': '#a7d8ff', eye: '#7b2fd0' }, { skin: '#ffe680', top: '#ffe680', bottom: '#ffe680', 'tail.color': '#ffe680', eye: '#2e7d32' }]
    },
    {
      id: 'psykron', name: 'Super Miaou', title: 'Clone Psychique', world: 'Ruines Célestes',
      bio: "Créature psychique créée en laboratoire à partir de l'ADN de Miaou. Froid et surpuissant, il méprise ses créateurs et cherche le sens de sa propre existence.",
      quotes: { intro: 'Je n\'ai pas demandé à naître.', win: 'Ta volonté est aussi fragile que ton corps.', lose: 'Qui suis-je… vraiment ?' },
      style: 'martial', aura: '#b46cff',
      stats: { hp: 1000, walk: 4.3, dash: 13, jump: 18, airJumps: 1, weight: 1.0, power: 1.092, defense: 0.989, float: false },
      rating: { puissance: 5, vitesse: 4, defense: 3, portee: 4, technique: 3 },
      look: {
        build: 'psy', head: 'psy', chest: 'belly', armSkin: true, tube: true, scale: 1.05,
        tail: { len: 120, w0: 22, w1: 10, color: '#8b4fc8', angle: -1.7, curl: 0.1, wave: 0.1, speed: 2 },
        colors: { skin: '#d9d2e6', belly: '#8b4fc8', eye: '#7b2fd0', top: '#d9d2e6', bottom: '#d9d2e6' }
      },
      palettes: [{}, { skin: '#cfe3d0', top: '#cfe3d0', bottom: '#cfe3d0', belly: '#2e7d32', 'tail.color': '#2e7d32' }, { skin: '#3a3346', top: '#3a3346', bottom: '#3a3346', belly: '#ff3df2', 'tail.color': '#ff3df2', eye: '#ff3df2' }]
    },
    {
      id: 'napoleon', name: 'Napoléon', title: 'Empereur des Français', world: 'France, 1805', home: 'la France de 1805',
      bio: "Petit par la taille, immense par l'ambition. Napoléon Bonaparte commande ses batailles comme une partie d'échecs : son sabre ouvre la voie, ses canons font le reste, et sa Vieille Garde ne recule jamais.",
      quotes: { intro: 'Impossible n\'est pas français !', win: 'Du haut de cette arène, une victoire de plus me contemple.', lose: 'Ce n\'est qu\'un petit Waterloo…' },
      style: 'blade', aura: '#ffd23f',
      stats: { hp: 980, walk: 4.3, dash: 13, jump: 17.5, airJumps: 1, weight: 1.05, power: 1.028, defense: 0.973 },
      tune: { reach: 0.93 },
      rating: { puissance: 5, vitesse: 3, defense: 4, portee: 5, technique: 5 },
      look: {
        build: 'normal', head: 'human', hair: 'cap', hat: 'bicorne', chest: 'uniform', poseSet: 'blade', scale: 0.92, browAngle: 1.8,
        pads: { color: '#d4a017', r: 11 }, tails: { color: '#1f2f6b', len: 46 }, bootFrom: 0.2,
        weapon: { type: 'sword', len: 88, guard: '#d4a017', color: '#e8edf3' },
        colors: { skin: '#f0c8a0', hair: '#3a2416', eye: '#2a2a3a', top: '#1f2f6b', inner: '#f4f1e8', accent: '#d4a017', collar: '#b3141c', bottom: '#f4f1e8', sleeve: '#1f2f6b', boots: '#18181c', gloves: '#f4f1e8', belt: '#f4f1e8', hat: '#16161a' }
      },
      palettes: [{}, { top: '#1d5a2e', sleeve: '#1d5a2e', 'tails.color': '#1d5a2e', collar: '#b3141c' }, { top: '#6f7682', sleeve: '#6f7682', 'tails.color': '#6f7682', bottom: '#2a2a30', collar: '#16161a' }]
    },
    {
      id: 'zeus', name: 'Zeus', title: 'Roi de l\'Olympe', world: 'Grèce des Mythes', home: 'la Grèce des Mythes',
      bio: "Maître du ciel et père des dieux. Zeus lance la foudre comme d'autres lancent des cailloux, et sa colère fait trembler les montagnes. Les failles l'ont tiré de son trône… et il est de très mauvaise humeur.",
      quotes: { intro: 'Mortel, tu oses défier le roi de l\'Olympe ?', win: 'Que le tonnerre porte mon nom !', lose: 'Par ma barbe… les mortels ont bien changé.' },
      style: 'martial', aura: '#ffe14a',
      stats: { hp: 1080, walk: 3.9, dash: 11.5, jump: 16, airJumps: 1, weight: 1.3, power: 0.963, defense: 1.039 },
      tune: { reach: 1.05 },
      rating: { puissance: 5, vitesse: 2, defense: 4, portee: 5, technique: 3 },
      look: {
        build: 'titan', head: 'human', hair: 'cap', beard: 'full', hat: 'laurel', chest: 'toga', armSkin: true, scale: 1.1, browAngle: 2.0,
        hairBack: [[-0.4, -0.7], [-1.15, 0.1], [-1.2, 1.6], [-0.4, 1.3], [0.1, 0.6]],
        robe: { color: '#f4f1e8', trim: '#d4a017', short: true },
        weapon: { type: 'bolt', len: 74, color: '#ffe14a' }, weaponHidden: true,
        poseOver: { idle: { wa: 2.25 }, portrait: { wa: 2.25 }, victory: { wa: 3.14 }, taunt: { wa: 3.0 } },
        colors: { skin: '#e8b88a', hair: '#f2f2f6', beard: '#f2f2f6', brow: '#d8d8de', eye: '#3a8ad6', top: '#f4f1e8', accent: '#d4a017', bottom: '#f4f1e8', boots: '#b8862b', belt: '#d4a017' }
      },
      palettes: [{}, { top: '#3a5ab0', 'robe.color': '#3a5ab0', bottom: '#3a5ab0' }, { top: '#6a1b3a', 'robe.color': '#6a1b3a', bottom: '#6a1b3a', accent: '#c0c0c8', 'robe.trim': '#c0c0c8', belt: '#c0c0c8' }]
    },
    {
      id: 'rouge', name: 'Rouge Immortel', short: 'L\'Immortel', title: 'Mercenaire Bavard', world: 'Cité des Masques', home: 'la Cité des Masques',
      bio: "Personne ne sait qui se cache sous ce masque rouge, mais tout le monde l'a entendu : il parle sans arrêt, même à ceux qui regardent le combat ! Ses blessures se referment toutes seules, d'où son surnom.",
      quotes: { intro: 'Salut toi, derrière l\'écran ! Regarde-moi gagner !', win: 'Trop facile ! On remet une pièce dans la machine ?', lose: 'Aïe. Bon… ça repousse.' },
      style: 'blade', aura: '#ff3b3b',
      // regen : ses points de vie remontent tout seuls quand il n'est pas en train de prendre un coup
      stats: { hp: 940, walk: 4.9, dash: 14.5, jump: 19.5, airJumps: 1, weight: 0.95, power: 0.953, defense: 1.049, regen: 0.05 },
      tune: { reach: 0.93 },
      rating: { puissance: 4, vitesse: 5, defense: 3, portee: 4, technique: 5 },
      look: {
        build: 'normal', head: 'merc', chest: 'merc', poseSet: 'blade', backBlades: true, holsters: true, scarf: ['#1a1a1e', '#2a2a30'],
        weapon: { type: 'katana', len: 96, grip: '#1a1a1e' },
        colors: { skin: '#b3141c', top: '#b3141c', accent: '#1a1a1e', bottom: '#b3141c', sleeve: '#b3141c', boots: '#1a1a1e', gloves: '#1a1a1e', belt: '#6b5a3a', eye: '#ffffff', mask: '#b3141c' }
      },
      palettes: [{}, { top: '#1d3f8a', bottom: '#1d3f8a', sleeve: '#1d3f8a', skin: '#1d3f8a', mask: '#1d3f8a' }, { top: '#e8e8ee', bottom: '#e8e8ee', sleeve: '#e8e8ee', skin: '#e8e8ee', mask: '#e8e8ee', accent: '#b3141c', boots: '#b3141c', gloves: '#b3141c' }]
    },
    {
      id: 'omega', name: 'Oméga', title: 'Dévoreur de Mondes', world: 'Le Néant',
      bio: "Entité née du vide entre les univers. Oméga a brisé le Cœur des Mondes pour arracher les plus grands guerriers à leur réalité et absorber leur puissance. Rien ne lui résiste… pour l'instant.",
      quotes: { intro: 'Ton monde n\'est qu\'un repas de plus.', win: 'Tout retourne au Néant.', lose: 'Le Néant… est éternel…' },
      style: 'martial', aura: '#ff3df2', boss: true,
      stats: { hp: 1200, walk: 4.2, dash: 13, jump: 17, airJumps: 1, weight: 1.4, power: 0.87, defense: 1.139 },
      rating: { puissance: 5, vitesse: 3, defense: 5, portee: 5, technique: 4 },
      look: {
        build: 'titan', head: 'void', chest: 'void', armSkin: true, scale: 1.18,
        cape: { color: '#2a0c3f', inner: '#ff3df2', len: 140 },
        colors: { skin: '#1a0b2e', top: '#1a0b2e', bottom: '#1a0b2e', gloves: '#2a0c3f', horn: '#3a1458', eye: '#ff3df2', boots: '#2a0c3f' }
      },
      palettes: [{}, { skin: '#f2f2f6', top: '#f2f2f6', bottom: '#f2f2f6', eye: '#1e88e5', 'cape.color': '#cfd8dc', horn: '#90a4ae' }, { skin: '#3a0505', top: '#3a0505', bottom: '#3a0505', eye: '#ffd23f', 'cape.color': '#1a0000' }]
    }
  ];

  function setPath(obj, path, val) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]]) return; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = val;
  }

  const lookCache = {};
  function look(id, costume, shadow) {
    costume = costume || 0;
    const key = id + '#' + costume + (shadow ? 's' : '');
    if (lookCache[key]) return lookCache[key];
    const ch = byId[id];
    const L = U.deepClone(ch.look);
    L.id = key + (ch.rev ? '@' + ch.rev : '');
    const pal = ch.palettes[costume] || {};
    for (const k in pal) {
      if (k.indexOf('.') > 0) setPath(L, k, pal[k]);
      else if (k === 'scarf') L.scarf = pal[k];
      else L.colors[k] = pal[k];
    }
    L.charId = id;
    L.shadow = !!shadow;
    lookCache[key] = L;
    return L;
  }

  const byId = {};
  CHARS.forEach((c, i) => { byId[c.id] = c; c.index = i; });

  // Figurants (renforts appelés par certains Supers) : une apparence, pas un combattant jouable
  byId.grognard = {
    id: 'grognard', name: 'Grenadier', extra: true,
    look: {
      build: 'normal', head: 'human', hair: 'bald', hat: 'bearskin', chest: 'uniform', poseSet: 'rifle', browAngle: 1.6,
      pads: { color: '#b3141c', r: 10 }, tails: { color: '#1f2f6b', len: 44 }, bootFrom: 0.3,
      weapon: { type: 'rifle', hand: 2 },
      colors: { skin: '#eac09a', eye: '#222', top: '#1f2f6b', inner: '#f4f1e8', accent: '#d4a017', collar: '#b3141c', bottom: '#f4f1e8', sleeve: '#1f2f6b', boots: '#18181c', gloves: '#f4f1e8', belt: '#f4f1e8', hat: '#16161a', brow: '#3a2416' }
    },
    palettes: [{}]
  };

  // ---------------------------------------------------------------- « Crée ton héros »
  // Le héros du joueur reprend les coups et les statistiques d'un combattant modèle selon son pouvoir.
  const HERO_POWERS = {
    ki: { base: 'kairo', title: 'Guerrier du Ki', icon: '🔥', label: 'Ki', desc: 'Boules d\'énergie, ruées, rayon géant' },
    mage: { base: 'leo', title: 'Apprenti Mage', icon: '🪄', label: 'Magie', desc: 'Baguette, sortilèges, pluie d\'étoiles' },
    ninja: { base: 'kage', title: 'Ninja de l\'Ombre', icon: '🥷', label: 'Ninja', desc: 'Shurikens, téléportation, vitesse' },
    lame: { base: 'takeda', title: 'Lame Légendaire', icon: '⚔️', label: 'Lame', desc: 'Katana, dégainé éclair, grande portée' }
  };
  const HERO_DEFAULT = { name: 'Héros', power: 'ki', hair: 'spiky', hairColor: '#161616', skin: '#f2c69b', outfit: '#2e6fd8', outfit2: '#f2b705', aura: '#5fd3ff', extra: 'none', ult: 'Rayon du Dragon' };
  let heroRev = 0;

  function heroLook(h) {
    const boots = U.shade(h.outfit2, -0.35);
    const c = { skin: h.skin, hair: h.hairColor, eye: '#161616', top: h.outfit, inner: h.outfit2, bottom: h.outfit, belt: h.outfit2, boots, gloves: null };
    const L = { build: 'normal', head: 'human', hair: h.hair, awaken: true, awakenHair: U.shade(h.aura, 0.45), colors: c };
    if (h.extra === 'glasses') L.glasses = true;
    if (h.extra === 'hat') { L.hat = 'wizard'; c.hat = h.outfit; }
    if (h.power === 'mage') {
      Object.assign(L, { build: 'slim', chest: 'robe', poseSet: 'wand', robe: { color: h.outfit, trim: h.outfit2 }, scarf: [h.outfit2, U.shade(h.outfit2, -0.25)],
        weapon: { type: 'wand', len: 30, color: '#6b4423', glow: h.aura } });
      c.boots = '#2a2030';
    } else if (h.power === 'ninja') {
      Object.assign(L, { build: 'slim', chest: 'ninja', scarf: [h.outfit2, U.shade(h.outfit2, -0.25)] });
      c.mask = h.outfit; c.band = h.outfit2; c.boots = U.shade(h.outfit, -0.4); c.gloves = c.boots;
    } else if (h.power === 'lame') {
      Object.assign(L, { chest: 'gi', beltKnot: true, poseSet: 'blade', weapon: { type: 'katana', len: 102, grip: '#1d1d40' } });
    } else {
      Object.assign(L, { chest: 'gi', beltKnot: true });
    }
    return L;
  }

  // Crée (ou met à jour) le combattant « hero » d'après les choix du joueur ; null le retire
  function setHero(data) {
    if (!data) { delete byId.hero; return null; }
    const h = Object.assign({}, HERO_DEFAULT, data);
    const P = HERO_POWERS[h.power] || HERO_POWERS.ki;
    const base = byId[P.base];
    const ch = {
      id: 'hero', name: h.name, short: h.name, title: P.title, world: 'le Village des Héros', custom: true, voice: 'hero',
      bio: h.name + ' n\'est encore qu\'un ' + P.title.toLowerCase() + ', mais rêve de devenir une légende. Son attaque secrète : « ' + h.ult + ' » !',
      quotes: { intro: 'Je vais devenir le plus fort !', win: 'Ouais ! Je deviens une vraie légende !', lose: 'Je reviendrai encore plus fort !' },
      style: base.style, aura: h.aura, awakenAura: h.aura, power: h.power in HERO_POWERS ? h.power : 'ki', ultName: h.ult,
      stats: Object.assign({}, base.stats), rating: Object.assign({}, base.rating), tune: base.tune,
      look: heroLook(h), palettes: [{}], rev: ++heroRev, index: -1, data: h
    };
    byId.hero = ch;
    for (const k in lookCache) if (k.indexOf('hero#') === 0) delete lookCache[k];
    return ch;
  }

  C.Roster = {
    list: CHARS,
    byId,
    get: (id) => byId[id],
    look,
    playable: () => CHARS,
    HERO_POWERS,
    HERO_DEFAULT,
    heroLook,
    setHero
  };
})(window.CDL = window.CDL || {});
