# Cali-Incr

Application de fitness gamifiée : chaque répétition de pompes, squats, tractions… est un coup d'épée
contre un boss. Tes muscles montent de niveau, tes dégâts augmentent, et le repos est récompensé.

Fonctionne entièrement dans **Expo Go** (iPhone et Android), sans compte ni serveur : tout est stocké sur le téléphone.

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

- Les chiffres d'équilibrage (XP, courbes, multiplicateurs de repos, PV des boss, exercices) sont tous dans
  [`src/game/config.ts`](src/game/config.ts).
- Pour ajouter une dépendance : `npx expo install <paquet>` (et vérifier qu'elle est incluse dans Expo Go).
- Architecture, règles du jeu et conventions : voir [`CLAUDE.md`](CLAUDE.md).

## Écrans (l'app est en anglais)

1. **Fight** — zone, monstre ou boss avec sa barre de PV, or, dégâts par coup, conseil du jour, choix de l'exercice
   (bouton « How to » pour l'explication), comptage des répétitions par la caméra ou à la main.
2. **Hero** — épée, silhouette avec chaque muscle coloré selon son niveau (toucher un muscle affiche les exercices
   recommandés), niveaux / XP / état de repos, boss vaincus.
3. **Shop** — acheter et équiper de meilleures épées avec l'or gagné sur les monstres.
4. **Calendar** — vue mensuelle colorée selon le volume, détail d'un jour, totaux par semaine et par mois.
5. **Settings** — mode caméra ou manuel, difficulté (Beginner / Normal / Advanced), vie privée, réinitialisation.

## Mode caméra et vie privée

- La caméra frontale filme pendant que tu fais l'exercice ; la détection de posture (Google MediaPipe) tourne
  **sur le téléphone**. La vidéo n'est jamais enregistrée ni envoyée : seules les répétitions comptées sont gardées.
- **Internet requis au lancement du mode caméra** : l'app télécharge le moteur de détection de posture de Google
  (MediaPipe, environ 18 Mo) pour que l'analyse tourne sur le téléphone. C'est un téléchargement uniquement :
  rien n'est envoyé. Le téléphone peut en garder une copie pour démarrer plus vite ensuite.
- Si la caméra rate des répétitions, les boutons « +1 rep » / « +5 reps » (ou « +5 s » pour les gainages) permettent
  de corriger à la main. Comme en mode manuel, « Undo » n'annule rien.
- Le bouton « How to » de chaque exercice montre une petite animation et les étapes.
- Place le téléphone de profil, à environ 2 m, tout le corps visible (chaque exercice indique où le placer).
- Tu préfères ne pas te filmer ? **Settings → Manual (no camera)** : tu tapes toi-même sur le bouton Rep
  (et tu peux choisir combien de reps chaque appui ajoute).
