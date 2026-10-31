/* Choc des Légendes — mode Histoire : « La Faille des Mondes » */
(function (C) {
  'use strict';
  const N = 'narrator';
  const L = (who, text) => ({ who, text });

  const PROLOGUE = [
    L(N, 'Au commencement, le Cœur des Mondes maintenait chaque réalité à sa place : les montagnes des arts célestes, les royaumes de chevalerie, les galaxies lointaines…'),
    L(N, 'Mais une nuit, le Cœur vola en éclats. Des failles s\'ouvrirent dans le ciel et arrachèrent les plus grands guerriers à leurs univers.'),
    L(N, 'Désormais réunis dans un monde étrange, ils s\'affrontent sans savoir qui tire les ficelles de ce tournoi…')
  ];

  const CHAPTERS = [
    {
      id: 1, title: 'La Faille', hero: 'kairo', foe: 'takeda', stage: 'dojo', unlock: 'takeda',
      intro: [
        L('kairo', 'Hé ! Où est-ce que je suis ? Il y a une seconde, je m\'entraînais tranquillement sur ma montagne…'),
        L('takeda', 'Étranger. Tu as franchi le portail de ce temple sans y être invité.'),
        L('kairo', 'Le portail ? Je suis tombé du ciel, moi ! Mais tu as l\'air costaud… Un petit combat pour faire connaissance ?'),
        L('takeda', 'Si tel est ton souhait. Ma lame ne retient jamais ses coups.')
      ],
      outro: [
        L('takeda', 'Ta force est… sincère. Pardonne-moi, guerrier. Ces failles rendent tout le monde méfiant.'),
        L('kairo', 'Pas de souci ! Mais d\'où viennent ces failles ?'),
        L('takeda', 'Je l\'ignore. Je sens pourtant une volonté maléfique derrière elles. Je t\'accompagne.')
      ]
    },
    {
      id: 2, title: 'Invasion au Château', hero: 'godefroy', foe: 'tk7', stage: 'chateau', unlock: 'tk7',
      intro: [
        L('tk7', 'Halte ! Ce secteur est désormais sous contrôle impérial !'),
        L('godefroy', 'Impérial ? Ce château appartient au royaume de Valombre, étrange soldat de porcelaine.'),
        L('tk7', 'Porcelaine ?! C\'est une armure réglementaire ! Rendez-vous, ou j\'ouvre le feu !'),
        L('godefroy', 'Pour l\'honneur et le royaume !')
      ],
      outro: [
        L('tk7', 'Aïe… Vous n\'auriez pas vu mon escouade ? Je me suis perdu dans une espèce de tourbillon violet…'),
        L('godefroy', 'Toi aussi, tu as traversé une faille ? Alors nous sommes dans le même bateau, soldat.'),
        L('tk7', 'Bon… Je vous suis. Mais je vise beaucoup mieux quand on ne me frappe pas.')
      ]
    },
    {
      id: 3, title: 'L\'Élève et le Magicien', hero: 'leo', foe: 'aldaron', stage: 'academie', unlock: 'aldaron', unlockStage: 'academie',
      intro: [
        L('leo', 'Monsieur ! Vous n\'êtes pas professeur ici. Je connais tout le monde à Ombrelune !'),
        L('aldaron', 'Ah, un jeune sorcier plein de fougue. Je cherche l\'origine de ces déchirures dans le monde.'),
        L('leo', 'Vous êtes peut-être un espion du Mage Noir… Désolé, mais je dois vérifier !'),
        L('aldaron', 'Fort bien. Voyons ce que l\'on t\'enseigne dans cette école.')
      ],
      outro: [
        L('aldaron', 'Tu as du talent, mon garçon, et un cœur courageux. Mais le danger qui approche dépasse nos querelles.'),
        L('leo', 'Vous parlez des failles ? Elles sont apparues juste après la disparition du Mage Noir…'),
        L('aldaron', 'Alors restons ensemble. La lumière est plus forte quand elle est partagée.')
      ]
    },
    {
      id: 4, title: 'L\'Ombre et l\'Esprit', hero: 'kage', foe: 'lumi', stage: 'bambous', unlock: 'lumi',
      intro: [
        L(N, 'Dans la forêt de bambous, une petite créature rose flotte en riant, une poignée de shurikens entre les pattes.'),
        L('lumi', 'Miou ? Miou miou !'),
        L('kage', '… Tu m\'as volé mes shurikens. Rends-les-moi.'),
        L('lumi', 'Miouuu ! (elle tire la langue et file entre les tiges)')
      ],
      outro: [
        L('lumi', 'Miou… (elle rend les shurikens, l\'air boudeur)'),
        L('kage', '… Tu n\'es pas méchante. Juste perdue. Comme moi.'),
        L('lumi', 'Miou ! (elle se pose sur l\'épaule du ninja)')
      ]
    },
    {
      id: 5, title: 'Le Prince Déchu', hero: 'kairo', foe: 'zarkan', stage: 'temple', unlock: 'zarkan',
      intro: [
        L('zarkan', 'Kaïro ! Même dans un autre monde, il faut que je te trouve sur mon chemin.'),
        L('kairo', 'Zarkan ! Toi aussi, tu as été aspiré par une faille ?'),
        L('zarkan', 'Une voix m\'a promis une puissance infinie si je t\'éliminais. Je n\'ai besoin de personne pour te battre… mais l\'offre est tentante.'),
        L('kairo', 'Une voix ? Ça ne me dit rien qui vaille. Allez, viens !')
      ],
      outro: [
        L('zarkan', 'Grr… Cette voix… elle m\'a menti. Elle se nourrit de nos combats.'),
        L('kairo', 'Alors on a un ennemi commun. Bats-toi avec nous !'),
        L('zarkan', 'Je ne me bats aux côtés de personne. Mais je te suivrai… pour être le premier à te vaincre.')
      ]
    },
    {
      id: 6, title: 'Feu et Écailles', hero: 'takeda', foe: 'pyrodrake', stage: 'volcan', unlock: 'pyrodrake', unlockStage: 'volcan',
      intro: [
        L('takeda', 'Une créature ailée garde ce volcan. Ses flammes ont déjà réduit trois villages en cendres.'),
        L('pyrodrake', 'RRRAAAOOOR !'),
        L('takeda', 'Ses yeux brillent d\'une lueur violette… Quelque chose le contrôle.')
      ],
      outro: [
        L('pyrodrake', 'Grrr… (la lueur violette s\'éteint dans ses yeux)'),
        L('takeda', 'Te voilà libéré. Ta flamme est noble, dragon. Combats à nos côtés.'),
        L('pyrodrake', 'Grraou ! (il incline fièrement la tête)')
      ]
    },
    {
      id: 7, title: 'Deux Chevaliers', hero: 'godefroy', foe: 'cassius', stage: 'forge', unlock: 'cassius', unlockStage: 'forge',
      intro: [
        L('cassius', 'Un chevalier en armure de fer… Es-tu un hérétique, ou un allié de l\'Imperium ?'),
        L('godefroy', 'Je ne connais pas ton empire, mais je reconnais un homme d\'honneur. Ton monde brûle, mon frère.'),
        L('cassius', 'Mon monde brûle depuis dix mille ans. Prouve ta valeur, et je t\'écouterai.')
      ],
      outro: [
        L('cassius', 'Ta foi est solide, chevalier. Ton bras aussi.'),
        L('godefroy', 'Les failles relient nos mondes. Ensemble, nous trouverons celui qui les a ouvertes.'),
        L('cassius', 'Alors que l\'Imperium et Valombre marchent côte à côte. Pour une fois.')
      ]
    },
    {
      id: 8, title: 'Le Gardien du Flux', hero: 'leo', foe: 'kael', stage: 'vaisseau', unlock: 'kael', unlockStage: 'vaisseau',
      intro: [
        L('kael', 'Je sens une perturbation dans le Flux. Elle vient de toi.'),
        L('leo', 'De moi ? Je ne suis qu\'un élève ! C\'est votre vaisseau qui s\'est écrasé près de l\'académie ?'),
        L('kael', 'Ta magie ressemble au côté obscur… Je dois m\'en assurer.')
      ],
      outro: [
        L('kael', 'Je me suis trompé. Ta magie est lumineuse. Pardonne-moi.'),
        L('leo', 'Pas grave ! Mais si ce n\'est pas moi, d\'où vient votre perturbation ?'),
        L('kael', 'D\'un seigneur noir au service de l\'Empereur… et peut-être d\'un maître plus ancien encore.')
      ]
    },
    {
      id: 9, title: 'Ténèbres Mécaniques', hero: 'kael', foe: 'noctis', stage: 'vaisseau', unlock: 'noctis',
      intro: [
        L('noctis', '(souffle mécanique) Kael Orin. Le dernier des Chevaliers Astraux.'),
        L('kael', 'Seigneur Noir. Ces failles portent ta signature.'),
        L('noctis', 'Mon maître sert désormais une puissance plus grande que le Flux lui-même. Rejoins-nous… ou péris.')
      ],
      outro: [
        L('noctis', 'Le Néant… m\'avait promis… de me libérer de cette armure…'),
        L('kael', 'Il t\'a menti, comme il ment à tous. Il reste du bien en toi.'),
        L('noctis', '… Peut-être. Mais l\'Empereur, lui, n\'a plus rien à sauver.')
      ]
    },
    {
      id: 10, title: 'Le Sans-Nom', hero: 'aldaron', foe: 'mordrak', stage: 'ruines', unlock: 'mordrak', unlockStage: 'ruines',
      intro: [
        L('mordrak', 'Un vieux magicien au chapeau ridicule. Sais-tu seulement à qui tu t\'adresses ?'),
        L('aldaron', 'À un homme qui a tant craint la mort qu\'il en a oublié de vivre.'),
        L('mordrak', 'Le Néant m\'offre l\'immortalité ! Écarte-toi, ou rejoins les ombres !')
      ],
      outro: [
        L('mordrak', 'Ma magie… elle s\'est retournée contre moi…'),
        L('aldaron', 'Le Néant ne donne rien. Il prend. Tu l\'apprendras à tes dépens.'),
        L('mordrak', 'Hmpf… Alors je l\'utiliserai avant qu\'il ne m\'utilise. Pour cette fois, je serai votre… allié.')
      ]
    },
    {
      id: 11, title: 'L\'Empereur des Ténèbres', hero: 'noctis', foe: 'malvar', stage: 'vaisseau', unlock: 'malvar',
      intro: [
        L('malvar', 'Mon fidèle serviteur… tu as échoué. Le maître Oméga est très déçu.'),
        L('noctis', 'Je ne vous servirai plus, maître. Ni vous, ni cette chose venue du Néant.'),
        L('malvar', 'Ha ha ha ! Alors goûte à mon POUVOIR ABSOLU !')
      ],
      outro: [
        L('malvar', 'Impossible… ma puissance… illimitée…'),
        L('noctis', 'C\'est terminé. Où se cache Oméga ?'),
        L('malvar', 'Au cœur des Ruines Célestes… là où le Cœur des Mondes s\'est brisé… ha… ha…')
      ]
    },
    {
      id: 12, title: 'Le Clone Parfait', hero: 'lumi', foe: 'psykron', stage: 'ruines', unlock: 'psykron',
      intro: [
        L('psykron', 'Lumi. L\'originale. Celle dont on m\'a tiré, comme on arrache une page à un livre.'),
        L('lumi', 'Miou… ? (elle tend la patte vers lui)'),
        L('psykron', 'Ne me regarde pas avec pitié ! Oméga m\'a montré la vérité : je ne suis qu\'une copie. Prouve-moi le contraire !')
      ],
      outro: [
        L('psykron', 'Pourquoi… pourquoi ne m\'as-tu pas achevé ?'),
        L('lumi', 'Miou miou. (elle se blottit contre lui)'),
        L('psykron', '… Je ne suis pas une copie. Je suis moi. Et Oméga paiera pour ses mensonges.')
      ]
    },
    {
      id: 13, title: 'L\'Armée des Ombres', hero: 'psykron', foe: 'kairo', foeShadow: true, stage: 'neant', unlockStage: 'neant',
      intro: [
        L(N, 'Au seuil du Néant, les héros découvrent une armée d\'ombres façonnées à partir de leurs propres combats.'),
        L('psykron', 'Ces ombres… Oméga les crée en absorbant l\'énergie de chacun de nos affrontements.'),
        L('kairo#shadow', '(un rire déformé résonne dans le vide)'),
        L('psykron', 'Je m\'occupe de celle-ci. Avancez, vous autres !')
      ],
      outro: [
        L('psykron', 'L\'ombre se dissipe. La voie vers Oméga est ouverte.'),
        L(N, 'Au loin, une silhouette colossale attend, assise sur un trône d\'éclats de mondes.')
      ]
    },
    {
      id: 14, title: 'Le Dévoreur de Mondes', hero: 'kairo', foe: 'omega', stage: 'neant', unlock: 'omega', boss: true,
      intro: [
        L('omega', 'Vous voilà enfin. Chacun de vos combats a nourri ma puissance.'),
        L('kairo', 'Alors c\'était toi depuis le début ! C\'est toi qui as brisé le Cœur des Mondes !'),
        L('omega', 'Vos univers ne sont que des repas. Et toi, Guerrier Céleste, tu seras le dessert.'),
        L('kairo', 'Tous les autres m\'ont prêté leur force. Je vais te montrer ce qu\'elle vaut !')
      ],
      outro: [
        L('omega', 'Impossible… Le Néant… est éternel…'),
        L('kairo', 'Peut-être. Mais l\'espoir aussi !'),
        L(N, 'Les éclats du Cœur des Mondes se rassemblent. Une à une, les failles se referment…'),
        L(N, 'Pourtant, certains guerriers choisissent de rester, pour l\'honneur du combat. Le tournoi des légendes ne fait que commencer !')
      ]
    }
  ];

  const Story = {
    prologue: PROLOGUE,
    chapters: CHAPTERS,
    get: (id) => CHAPTERS.find((c) => c.id === id),
    // Un chapitre est jouable si le précédent est terminé
    available(save, id) { return id === 1 || !!(save.story.done[id - 1]); },
    stars(save, id) { return save.story.done[id] || 0; },
    totalStars(save) { return CHAPTERS.reduce((s, c) => s + (save.story.done[c.id] || 0), 0); },
    completed(save) { return !!save.story.done[CHAPTERS.length]; },
    // Étoiles : victoire ; sans perdre de manche ; en finissant avec plus de 50 % de vie
    computeStars(result) {
      let s = 1;
      if (result.roundsLost === 0) s++;
      if (result.lastHp >= 0.5) s++;
      return s;
    },
    speaker(who) {
      if (who === N) return { name: 'Narrateur', narrator: true };
      const shadow = who.indexOf('#shadow') > 0;
      const id = who.replace('#shadow', '');
      const ch = C.Roster.get(id);
      return { id, shadow, name: shadow ? 'Ombre de ' + ch.name : ch.name, ch };
    }
  };

  C.Story = Story;
})(window.CDL = window.CDL || {});
