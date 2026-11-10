# ⚔️ Choc des Légendes — version iPhone

Jeu de combat **en 3D** : 17 combattants, 10 arènes, mode Histoire, Arcade, Survie, Entraînement.
Cette version se joue **sans installation** : pas d'App Store, pas de Mac, pas de compte Apple,
pas de limite de 7 jours.

## ▶️ Jouer

**https://arstelvio.github.io/iCombat/**

## 🧊 Nouveau : le jeu est en 3D

- **Arènes et combattants en 3D**, style dessin animé, avec une caméra qui tourne autour du combat et plonge
  en gros plan pour les attaques Ultimes.
- **On se déplace librement** : pousse le joystick dans la direction où tu veux aller. Vers le haut ou le bas de
  l'écran, tu tournes autour de ton adversaire et tu **esquives** ses attaques.
- **Nouveau bouton SAUT**. Le joystick sur le côté ou en arrière change tes coups (lanceur, balayette…).
- L'**École du Maître** t'apprend tout ça en 10 leçons.

## 🌟 Pour les jeunes héros

- **🦸 Mon héros** : crée ton combattant (pouvoir Ki, Magie, Ninja ou Lame, coiffure, couleurs, aura) et invente le nom de ton attaque ultime.
- **🎓 École du Maître** : Maître Shen t'apprend à jouer, leçon par leçon, à voix haute.
- **⚡ Charge ton aura** en maintenant ULTRA, jusqu'à 3 barres, puis lance ton Ultime.
- **🔥 Éveil du héros** : presque K.O., ton héros se relève plus fort, une fois par manche.
- **🗣️ Voix** : histoire lue à voix haute, attaques criées. **💥 BAM ! POW !** sur les gros coups.
- **⭐ Coup de pouce** après une défaite, **coups spéciaux faciles**, **niveaux et titres**.

## 📲 Mettre le jeu sur l'écran d'accueil de l'iPhone

1. Ouvrez le lien ci-dessus dans **Safari**.
2. Touchez **Partager** (ou le menu **•••** puis **Partager**), puis **Sur l'écran d'accueil** → **Ajouter**.
   Si une option « app web » apparaît, laissez-la activée.
3. Lancez le jeu depuis sa nouvelle icône, **une première fois avec Internet** : il s'enregistre en entier sur
   l'iPhone (message « Prêt à jouer hors ligne »).

Le jeu a alors son icône, s'ouvre en plein écran, en paysage, et fonctionne **hors ligne**.

### Bon à savoir
- **Sauvegardes** : celles de l'icône sont séparées de celles de Safari, jouez depuis l'icône.
  Supprimer l'icône efface ses sauvegardes.
- **Pas de son ?** Désactivez le mode silencieux de l'iPhone.
- **Pas de voix ?** Vérifiez l'option *Voix* dans les réglages du jeu et le volume de l'iPhone.
- **L'écran reste en portrait ?** Ouvrez le Centre de contrôle et désactivez le verrouillage de la rotation.
- **Jouer tous les combattants sans finir l'Histoire** : **Options → 🔓 Tout débloquer (hors Histoire)**.
  Tous les combattants (et les arènes, si on le souhaite) deviennent jouables en Combat, Arcade, Survie et
  Entraînement ; l'Histoire, la boutique et les succès ne changent pas.
- **Mises à jour** : quand une nouvelle version est en ligne, le jeu la télécharge tout seul (avec Internet)
  et l'applique la prochaine fois que vous revenez sur l'écran titre.
- Fonctionne aussi sur iPad, Android (Chrome → « Ajouter à l'écran d'accueil ») et ordinateur.
- Manettes Bluetooth reconnues.

## 🛠️ Ce dépôt

Ce dépôt contient uniquement la version web du jeu, **générée automatiquement** depuis le dépôt du jeu
(`tools/build-web.js`) : ne modifiez pas ces fichiers ici, ils seraient remplacés à la prochaine publication.
Le site est servi par **GitHub Pages**.

Pour activer GitHub Pages (une seule fois) : **Settings → Pages → Build and deployment →
Source : Deploy from a branch**, choisissez la branche du dépôt et le dossier **/ (root)**, puis **Save**.
Le lien fonctionne une à deux minutes plus tard.

Polices : Bangers et Russo One, sous licence SIL Open Font License (voir `fonts/`).
Rendu 3D : [three.js](https://threejs.org), licence MIT (voir `lib/LICENSE-three.txt`).
