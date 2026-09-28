# Calincr

[![CI](https://github.com/Chorkbambi/Cali-Incr/actions/workflows/ci.yml/badge.svg)](https://github.com/Chorkbambi/Cali-Incr/actions/workflows/ci.yml)

Application de fitness gamifiée (Ring Fit × jeu incrémental) : chaque répétition de pompes, squats, tractions…
est un coup d'épée contre un monstre. Tes muscles montent de niveau, tes dégâts augmentent, et le repos est récompensé.

- **Gratuite, sans pub, sans compte, sans serveur** : tout reste sur le téléphone, l'app n'utilise jamais internet.
- **Comptage par la caméra** (détection de posture sur le téléphone, rien n'est enregistré) ou à la main.
- Fonctionne dans **Expo Go** (iPhone et Android) et en APK Android.
- Interface en anglais. Politique de confidentialité : [`PRIVACY.md`](PRIVACY.md).

## Fonctionnalités

- **Combat** : 10 monstres puis un boss par niveau, zones qui changent tous les 10 niveaux, combos (coups rapides =
  plus de dégâts), **faiblesses** (chaque monstre craint un style : Push, Pull, Legs ou Core → +50 % de dégâts ;
  les exercices qui la touchent sont marqués ⚡).
- **Titan de la semaine** : une énorme barre de vie que tous tes coups de la semaine entament, grosse récompense en or.
- **Muscles** : 10 muscles avec niveaux et XP ; bonus de repos, malus de fatigue.
- **Quête du jour** : un exercice et un objectif basé sur ta dernière séance, série de jours (streak) protégeable
  par des **Streak Freezes**.
- **Records personnels** : battre ta meilleure série d'un exercice rapporte de l'or.
- **Boutique** : épées (dégâts), armures (plus d'or), anneaux (combos, faiblesses), cosmétiques (halo de l'épée,
  couleur des dégâts), Streak Freezes.
- **Succès** (20), **récap de la semaine**, **graphiques de progression** par exercice, **cartes à partager** (image).
- Minuteur de repos, rappel quotidien local, favoris, calibration de la caméra, sauvegarde dans un fichier,
  grands boutons.

## Lancer l'app sur un iPhone depuis un PC Windows

### 1. Prérequis (une seule fois)

- **Node.js LTS** (22 ou plus récent) : <https://nodejs.org> → installer, puis vérifier dans PowerShell :
  ```powershell
  node -v
  npm -v
  ```
- **Git** : <https://git-scm.com/download/win>
- Sur l'iPhone : l'app **Expo Go** depuis l'App Store (version récente, compatible SDK 57).
- Un **compte Expo gratuit** : <https://expo.dev/signup>. Depuis le SDK 57, Expo Go sur iPhone exige d'être
  connecté **avec le même compte** dans le terminal et dans l'app.

### 2. Récupérer le projet

```powershell
git clone https://github.com/Chorkbambi/Cali-Incr.git
cd Cali-Incr
npm install
```

### 3. Se connecter à Expo

Dans le terminal :

```powershell
npx expo login
```

Sur l'iPhone : ouvrir Expo Go → icône de profil en haut à droite → se connecter avec le même compte.

### 4. Démarrer le serveur de développement

```powershell
npx expo start
```

Un QR code s'affiche dans le terminal.

### 5. Ouvrir l'app sur l'iPhone

- Le PC et l'iPhone doivent être sur **le même réseau Wi-Fi**.
- Ouvrir l'app **Appareil photo** de l'iPhone, viser le QR code, puis toucher la bannière « Ouvrir dans Expo Go ».
- Le premier chargement prend quelques secondes.

### Si ça ne se connecte pas : mode tunnel

Réseau d'entreprise / d'école, Wi-Fi invité, pare-feu Windows, VPN… Si l'iPhone n'arrive pas à charger l'app :

```powershell
npx expo start --tunnel
```

Le tunnel passe par Internet (plus lent, mais contourne les problèmes de réseau local). La première fois,
Expo peut proposer d'installer `@expo/ngrok` : répondre oui.

Autres pistes : autoriser Node.js dans le pare-feu Windows (réseau privé), désactiver le VPN,
et appuyer sur `r` dans le terminal pour recharger l'app.

## Développement

```powershell
npm test            # tests unitaires Jest (logique de jeu)
npx tsc --noEmit    # vérification TypeScript
```

Ces deux vérifications tournent aussi automatiquement sur GitHub à chaque push (GitHub Actions,
[`.github/workflows/ci.yml`](.github/workflows/ci.yml)) : une croix rouge sur le commit = quelque chose est cassé,
à corriger avant de compiler un APK.

- Les chiffres d'équilibrage (XP, courbes, multiplicateurs de repos, PV des boss, exercices) sont tous dans
  [`src/game/config.ts`](src/game/config.ts).
- Pour ajouter une dépendance : `npx expo install <paquet>` (et vérifier qu'elle est incluse dans Expo Go).
- Architecture, règles du jeu et conventions : voir [`CLAUDE.md`](CLAUDE.md).

## Installer l'app Android sur ton téléphone (gratuit, sans Play Store)

1. Crée un compte gratuit sur <https://expo.dev> (le même que pour Expo Go) et connecte-toi : `npx expo login`.
2. Lance la compilation dans le cloud d'Expo (gratuit dans la limite du plan gratuit) :
   ```powershell
   npx eas-cli@latest build --platform android --profile preview
   ```
   La première fois, accepte de créer le projet EAS et de générer la clé de signature Android (laisse EAS la gérer).
3. À la fin (10 à 20 min), la commande affiche un lien et un QR code : ouvre-le sur le téléphone Android,
   télécharge l'APK et installe-le (Android demandera d'autoriser l'installation depuis le navigateur).
4. **Mettre à jour** : refais `git pull`, `npm install`, puis la même commande de build, et installe le nouvel APK
   par-dessus l'ancien. La progression est conservée. Le numéro de version augmente automatiquement.
5. Pour des testeurs : envoie-leur le même lien. Google limite progressivement l'installation d'apps de développeurs
   non vérifiés ; le compte gratuit « limited distribution » de Google permet jusqu'à 20 appareils.

Identifiant de l'app : `com.chorkbambi.calincr` (Android et iOS). Il ne pourra plus changer après la première
publication sur un store.

L'iPhone nécessite un compte Apple Developer payant (99 $/an) pour installer une vraie app ; en attendant, utilise Expo Go.

## Écrans (l'app est en anglais)

1. **Fight** — zone, monstre ou boss avec sa barre de PV et sa **faiblesse**, or, dégâts par coup, **quête du jour**
   (un exercice + un objectif de reps basé sur ta dernière séance, bonus d'XP et d'or, série de jours), Titan de la
   semaine, ton record sur l'exercice, choix de l'exercice
   (bouton « How to » pour l'explication, ☆ pour épingler un exercice en tête, « Last time » = ta dernière séance),
   comptage des répétitions par la caméra ou à la main, combo (coups rapides = plus de dégâts), minuteur de repos.
2. **Hero** — épée, silhouette avec chaque muscle coloré selon son niveau (toucher un muscle affiche les exercices
   recommandés), niveaux / XP / état de repos, **succès** (qui rapportent de l'or ; toucher un succès obtenu pour
   le partager en image), boss vaincus.
3. **Shop** — onglets Swords, Gear (armures et anneaux), Style (cosmétiques) et Items (Streak Freeze).
4. **Calendar** — vue mensuelle colorée selon le volume, détail d'un jour, **graphiques de progression** par exercice
   (total et meilleure série par semaine, toucher une semaine pour voir sa valeur), totaux par semaine et par mois.
5. **Settings** — mode caméra ou manuel, difficulté (Beginner / Normal / Advanced), minuteur de repos, rappel quotidien,
   grands boutons, **sauvegarde** (exporter / importer un fichier), vie privée, réinitialisation.

Chaque lundi (à la première ouverture), un **récap de la semaine** passée s'affiche (avec un bouton pour le partager
en image : seulement des chiffres du jeu, jamais la caméra).

## Sauvegarder sa progression

Settings → **Export backup** : crée un fichier `calincr-backup-AAAA-MM-JJ.json` que tu ranges où tu veux (Drive,
e-mail, fichiers…). Sur un nouveau téléphone : Settings → **Import backup** et choisis ce fichier (il remplace tout).

## Mode caméra et vie privée

- La caméra frontale filme pendant que tu fais l'exercice ; la détection de posture (Google MediaPipe) tourne
  **sur le téléphone**. La vidéo n'est jamais enregistrée ni envoyée : seules les répétitions comptées sont gardées.
- **Fonctionne hors ligne** : le moteur de détection de posture (Google MediaPipe, environ 18 Mo) est intégré à
  l'app. Aucun téléchargement, aucune connexion internet.
- Si la caméra rate des répétitions, les boutons « +1 rep » / « +5 reps » (ou « +5 s » pour les gainages) permettent
  de corriger à la main. Comme en mode manuel, « Undo » n'annule rien.
- Le bouton « How to » de chaque exercice montre une petite animation et les étapes.
- Choisis d'abord l'exercice, puis appuie sur **Start camera** : l'écran de préparation indique quelles parties du
  corps doivent être visibles. La caméra s'ouvre en plein écran ; le bouton **Rotate** passe en paysage (pratique
  pour les pompes ou le gainage). Elle s'arrête avec **Stop camera**, en changeant d'exercice ou en quittant l'onglet.
- Place le téléphone de profil, à environ 2 m (chaque exercice indique où le placer).
- Au premier lancement, un petit tutoriel (3 écrans) puis le choix caméra / mode manuel et du minuteur de repos.
- **Calibrate** : fais 3 reps lentes et complètes, l'app adapte ses seuils à ton amplitude (pour cet exercice).
- Sur l'écran caméra, le bouton **Image: on/off** cache ton image (seul un bonhomme est affiché).
- Politique de confidentialité : dans Settings, et dans [`PRIVACY.md`](PRIVACY.md).
- Tu préfères ne pas te filmer ? **Settings → Manual (no camera)** : tu tapes toi-même sur le bouton Rep
  (et tu peux choisir combien de reps chaque appui ajoute).

## Dépôt public

Le code est public : chacun peut le lire et vérifier que l'app n'envoie rien. Aucun secret n'est dans le dépôt
(la clé de signature Android est gardée par EAS, pas ici). Pour le Play Store, l'adresse de la politique de
confidentialité peut être celle de [`PRIVACY.md`](https://github.com/Chorkbambi/Cali-Incr/blob/main/PRIVACY.md).
