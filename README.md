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

## Écrans

1. **Combat** — boss, barre de PV, dégâts par coup, choix de l'exercice, bouton « Répétition »,
   « Ajouter un nombre », chronomètre pour le gainage.
2. **Personnage** — épée, niveau / XP / état de repos de chaque muscle, dégâts totaux, boss vaincus.
3. **Calendrier** — vue mensuelle colorée selon le volume, détail d'un jour, totaux par semaine et par mois.
4. **Réglages** — réinitialiser la progression, à propos.
