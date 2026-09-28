# CLAUDE.md — Cali-Incr

Application mobile de fitness gamifiée (Ring Fit × jeu incrémental) pour iPhone et Android.
Chaque répétition réelle d'un exercice au poids du corps = un coup d'épée contre le monstre en cours.
Les répétitions sont comptées par la caméra (détection de posture sur le téléphone) ou à la main.

## Règle n°1 — compatible Expo Go uniquement

- L'app doit tourner **entièrement dans Expo Go** (App Store / Play Store). Pas de development build.
- N'installer **aucune bibliothèque native absente d'Expo Go**. Toujours `npx expo install <paquet>`, jamais `npm install <paquet>` pour une dépendance runtime.
- Pas de dossiers `ios/` ni `android/`.
- Pas de backend, pas de compte : persistance locale uniquement (expo-sqlite).
- La détection de posture tourne dans une WebView (MediaPipe Tasks JS/WASM) justement pour rester compatible Expo Go.

## Règle n°2 — vie privée et sécurité

- **Rien de ce que filme la caméra n'est enregistré ni envoyé.** La vidéo reste dans l'élément `<video>` de la WebView ;
  seuls 33 points du corps (nombres) sont transmis à l'app, traités puis jetés. Seuls les compteurs de reps sont sauvegardés.
- Tout reste sur le téléphone et **l'app n'utilise jamais internet**. MediaPipe (code JS, moteur WebAssembly SIMD et
  modèle, tasks-vision 1.0.1, ~18 Mo) est **embarqué** dans `assets/mediapipe/` et transmis à la page caméra par l'app
  (`src/input/camera/mediapipeAssets.ts`, base64 en morceaux via injectJavaScript → URLs `blob:` locales).
- La page caméra a une Content-Security-Policy stricte (voir `src/input/camera/poseCameraPage.ts`) : aucune destination
  réseau autorisée (seulement `blob:`/`data:`) ; l'app bloque toute navigation de la WebView.
- Mettre à jour MediaPipe = remplacer les fichiers de `assets/mediapipe/` (voir NOTICE.txt) et retester la page caméra.
- Tout message de la WebView est validé strictement (`src/pose/messages.ts`) ; toute sauvegarde relue est validée
  (`restoreState`, `restoreSettings`). Requêtes SQL toujours paramétrées.
- La caméra est coupée dès qu'on quitte l'onglet Fight (la WebView est démontée).
- Ne jamais ajouter d'analytics, de pub, de SDK tiers qui envoie des données, ni de logs contenant des données de posture.

## Stack

- Expo SDK 57 (React Native 0.86, React 19.2), TypeScript `strict`, Expo Router (routes dans `src/app/`).
- expo-sqlite, react-native-reanimated 4 (+ react-native-worklets), react-native-svg, @expo-google-fonts/cinzel,
  expo-haptics, expo-camera (permission uniquement), react-native-webview, expo-screen-orientation,
  expo-asset + expo-file-system (lecture des fichiers MediaPipe embarqués). `metro.config.js` ajoute les extensions wasm/task/bin.
- Tests : Jest 29 via `jest-expo` (fichiers `__tests__/*.test.ts`).

## Commandes

```bash
npm start              # npx expo start
npx expo start --tunnel
npm test               # jest
npx tsc --noEmit       # typecheck (doit passer avant tout commit)
```

## Architecture

```
src/
  game/        Logique de jeu en TypeScript PUR (aucun import React / Expo). Testée avec Jest.
    config.ts        ← TOUS les chiffres d'équilibrage (XP, courbes, multiplicateurs, PV, or, épées, exercices)
    guides.ts        explications des exercices (étapes, conseil, placement de la caméra)
    dates.ts         jours calendaires locaux (clé YYYY-MM-DD), écarts en jours, semaines ISO
    progression.ts   courbe d'XP, montée de niveau
    exercises.ts     catalogue, niveaux de difficulté, exercices par muscle, répartition de l'XP
    recovery.ts      multiplicateurs de repos / fatigue par muscle
    zones.ts         zones (nom, décor, monstres, boss), changent tous les 10 niveaux
    enemy.ts         PV des monstres/boss, enchaînement des niveaux, or gagné
    engine.ts        GameState, dégâts, applyWork() (reps/secondes → coups + XP + or)
    shop.ts          achat / équipement des épées
    settings.ts      réglages (mode caméra/manuel, difficulté, reps par appui) + validation
    sets.ts          agrégation des séries enregistrées
    stats.ts         calendrier : volume, intensité, totaux semaine/mois
    recommend.ts     exercices classés selon le bonus de repos
    quest.ts         quête du jour : exercice, objectif selon l'historique, récompense, streak
    serialization.ts restauration robuste d'un état sauvegardé
  pose/        Comptage des reps à partir des points du corps (TypeScript pur, testé)
    landmarks.ts, metrics.ts   angles des articulations
    trackers.ts                seuils de détection par exercice (pas de l'équilibrage)
    repCounter.ts              machine à états : reps (hystérésis) ou secondes tenues (gainage)
    messages.ts                validation stricte des messages de la WebView
  input/       Saisie des répétitions
    RepSource.ts         interface RepSource (événements 'reps' et 'seconds')
    CameraRepSource.ts   mode caméra (par défaut) ; camera/ = page WebView + composant
    ManualRepSource.ts   mode manuel : bouton Rep (× reps par appui), chronomètre, faux "Undo"
                         (le mode caméra a aussi des boutons de correction : CameraRepSource.addManually)
    useRepInput.tsx      choisit l'implémentation selon les réglages
  storage/     expo-sqlite : migrations (database.ts) et GameRepository (seul endroit qui connaît le schéma)
  state/       GameProvider (contexte React) : applique la logique, sauvegarde, expose l'état aux écrans
  ui/          thème, formatage, composants (BattleArena, ZoneBackdrop, EnemyFigure, SwordFigure, BodyMap…)
  app/         écrans Expo Router : index (Fight), character (Hero), shop, calendar, settings
```

Flux d'une répétition : `RepSource` émet un événement → l'écran Fight appelle `work()` du `GameProvider`
→ `applyWork()` (pur) renvoie le nouvel état + les coups → sauvegarde SQLite en file d'attente
→ `useHitQueue` rejoue les coups en animation (accélérée pour plusieurs reps d'un coup).

**L'écran Fight ne dépend que de l'interface `RepSource`**, jamais d'une implémentation.

## Règles du jeu (valeurs dans `src/game/config.ts`)

- 10 muscles, tous niveau 1 au départ. Épée de départ : Rusty Sword ×1.
- **Dégâts d'un coup** = somme des niveaux de tous les muscles × multiplicateur de l'épée.
- Chaque exercice donne un XP de base par rép. (par seconde pour les gainages), réparti entre les muscles selon des poids qui totalisent 1.0.
- **Difficulté** (réglage) : Beginner = exercices simplifiés ; Normal = exercices classiques ; Advanced = Normal + exercices durs.
  Chaque mode couvre les 10 muscles.
- **Courbe d'XP** : `xpForNextLevel(niveau) = round(50 × niveau^1.6)`. L'XP en trop passe au niveau suivant.
- **Repos (par muscle)**, calculé à la première séance du jour puis figé toute la journée :
  - 1re séance de ce muscle : ×1.0
  - entraîné hier : 2e jour d'affilée ×0.7, 3e ×0.5, 4e et plus ×0.35
  - dernier entraînement il y a 2 jours ×1.0, 3 jours ×1.25, 4 jours ou plus ×1.5 (plafond)
  - statut affiché : < 1 « Tired », = 1 « Ready », > 1 « Rested ».
- **Monstres et niveaux** : chaque niveau = 10 monstres puis 1 boss, puis niveau suivant, à l'infini.
  PV monstre = `round(20 × 1.6^(niveau-1) × (1 + étape × 0.08))`, boss = ×4. Dégâts en trop non reportés.
- **Zones** : nom, décor et monstres changent tous les 10 niveaux (8 zones, puis elles bouclent avec II, III…).
- **Or** : chaque ennemi vaincu rapporte `max(1, round(PV max × 0.25))`, ×2 pour un boss. Sert à acheter des épées (Shop).
- Chaque rép. = 1 coup puis gain d'XP (un niveau gagné en cours de série augmente les coups suivants).
- Gainages : 1 coup toutes les `COMBAT.secondsPerHit` secondes (5 par défaut), le reste est reporté.
- **Quête du jour** (écran Fight, `src/game/quest.ts`) : UN seul exercice proposé par jour (l'app motive, elle ne coache pas) :
  celui dont les muscles sont les plus reposés (multiplicateur effectif = Σ poids × multiplicateur de repos).
  Objectif = total de la dernière séance de cet exercice + 10 % (au moins +1 rép. / +5 s), valeur de départ par niveau
  si jamais fait, × 0,8 après 10 jours sans, × 0,7 si les muscles sont fatigués ; découpé en séries (ex. 3 × 8).
  Récompense à la complétion : XP bonus (objectif × XP de base × 0,5, sans multiplicateur) + or (1,5 × PV du 1er monstre
  du niveau). Série de jours consécutifs (streak). Générée une fois par jour, sauvegardée (kv `daily_quest`).
- **Mode manuel** : le bouton Rep ajoute « reps par appui » (1 à 50). Le bouton Undo n'annule rien : il affiche
  « Made a mistake? Too bad — you'll have to make up for it! » (volontaire).
- **Mode caméra** : correction manuelle possible (+1 / +5 reps, +5 / +15 s pour les gainages) si la caméra rate des reps ;
  même faux Undo. Le mode caméra fonctionne hors ligne (MediaPipe embarqué).
- **Caméra** : ne démarre qu'après « Start camera » pour l'exercice choisi (écran de préparation qui dit quelles parties
  du corps doivent être visibles, `src/pose/visibility.ts`). Elle s'ouvre en plein écran, image entière (non recadrée),
  avec un bouton Rotate (paysage) ; elle s'arrête si on change d'exercice, quitte l'onglet ou appuie sur Stop.
  L'app est verrouillée en portrait (expo-screen-orientation) sauf la caméra plein écran.
- **How to** : chaque exercice a une animation (bonhomme en SVG, `src/ui/exerciseAnimations.ts` : 2 poses interpolées).

## Conventions

- **Tout le jeu est en anglais** (interface). Code, identifiants et commentaires en anglais. Docs (README, CLAUDE.md) en français.
- Aucun chiffre d'équilibrage en dur ailleurs que dans `config.ts`.
- `src/game/` et `src/pose/` ne doivent jamais importer React, React Native ou Expo. Toute nouvelle règle y est testée.
- Les fonctions de `src/game/` sont pures : elles reçoivent `now: Date` au lieu de lire l'horloge.
- Dates : jour calendaire **local** du téléphone (`toDayKey`), écarts calculés sans être affectés par l'heure d'été.
- Assets : uniquement des formes SVG originales, aucun contenu protégé.
- Commits clairs et séparés par étape. `npx tsc --noEmit` et `npm test` doivent passer.

## Décisions à valider

Choix faits là où la demande était ambiguë (les plus simples) :

1. **SDK** : Expo SDK 57. Depuis le SDK 57, Expo Go sur iPhone exige d'être **connecté au même compte Expo** (gratuit) dans la CLI (`npx expo login`) et dans l'app Expo Go.
2. **XP de base par exercice** : valeurs inventées (4 à 18 XP/rép. selon la difficulté, 1,5 à 3 XP/s pour les gainages). À tester.
3. **Gainage** : 1 coup d'épée toutes les 5 s tenues. Les secondes restantes sont reportées au prochain gainage.
4. **Fentes, exercices sur une jambe** : une répétition = un côté.
5. **Série** : reste ouverte tant qu'on garde le même exercice le même jour ; se ferme avec « Finish set », un changement d'exercice ou le redémarrage de l'app.
6. **Dégâts excédentaires** : non reportés sur l'ennemi suivant.
7. **Série qui passe minuit** : démarre une nouvelle série (le multiplicateur est recalculé chaque jour).
8. **Horloge reculée** : on garde le multiplicateur déjà figé, sans pénalité.
9. **Intensité du calendrier** : volume = reps + secondes de gainage / 5 ; seuils 1 / 40 / 100 / 200.
10. **Semaines** : du lundi au dimanche.
11. **Quête du jour** : exercice choisi par bonus de repos, pas par XP brute (sinon l'exercice le plus dur serait toujours proposé). Égalité → plus d'XP par rép.
12. **Difficulté** : Advanced montre aussi les exercices Normal (squats, pompes…), Beginner uniquement les simplifiés. Par défaut : Normal.
13. **Mode caméra par défaut** ; le mode manuel est un réglage. Changer d'exercice ferme la série.
14. **Détection caméra** : WebView + MediaPipe Pose Landmarker « lite » (tasks-vision 1.0.1, modèle float16/1), embarqués dans l'app (pas de téléchargement : évite la règle App Store 2.5.2 sur le code téléchargé). Seule la version WebAssembly SIMD est incluse (iOS 16.4+ / WebView Android récente) ; sinon l'app propose le mode manuel. Seuils de détection par exercice dans `src/pose/trackers.ts` ; certains exercices (mollets, supermans, nordic curls) sont difficiles à détecter et sont à tester.
15. **Pas de bonus de qualité** : une répétition compte seulement si l'amplitude complète est atteinte (seuils), sinon rien. Pas d'XP partielle.
16. **Épées** : liste finie de 9 épées (×1 à ×25). Au-delà, pas de nouvelle arme pour l'instant.
17. **Anciennes sauvegardes** : les niveaux des muscles sont conservés, les ennemis repartent du niveau 1.
18. **Vulnérabilités npm** : `npm audit` signale des failles « moderate » dans des dépendances d'Expo (outils de build, et `decode-uri-component` via expo-router, seulement exploitable par un lien profond malformé). Corrigées côté Expo ; ne pas lancer `npm audit fix --force` (casserait les versions SDK 57).
