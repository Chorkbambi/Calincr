# CLAUDE.md — Cali-Incr

Application mobile de fitness gamifiée (Ring Fit × jeu incrémental) pour iPhone et Android.
Chaque répétition réelle d'un exercice au poids du corps = un coup d'épée contre le boss en cours.

## Règle n°1 — Phase 1 = compatible Expo Go uniquement

- L'app doit tourner **entièrement dans Expo Go** (App Store / Play Store). Pas de development build.
- N'installer **aucune bibliothèque native absente d'Expo Go**. Toujours `npx expo install <paquet>`, jamais `npm install <paquet>` pour une dépendance runtime.
- Pas de dossiers `ios/` ni `android/`, pas de config plugin qui exige un build natif.
- Pas de backend, pas de compte : persistance locale uniquement (expo-sqlite).

## Stack

- Expo SDK 57 (React Native 0.86, React 19.2), TypeScript `strict`, Expo Router (routes dans `src/app/`).
- expo-sqlite, react-native-reanimated 4 (+ react-native-worklets), react-native-svg, @expo-google-fonts/cinzel, expo-haptics.
- Tests : Jest 29 via `jest-expo`.

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
    config.ts        ← TOUS les chiffres d'équilibrage (XP, courbes, multiplicateurs, PV, exercices)
    dates.ts         jours calendaires locaux (clé YYYY-MM-DD), écarts en jours, semaines ISO
    progression.ts   courbe d'XP, montée de niveau
    exercises.ts     catalogue, répartition de l'XP par muscle
    recovery.ts      multiplicateurs de repos / fatigue par muscle
    boss.ts          PV et noms des boss
    engine.ts        GameState, dégâts, applyWork() (reps/secondes → coups + XP)
    sets.ts          agrégation des séries enregistrées
    stats.ts         calendrier : volume, intensité, totaux semaine/mois
    recommend.ts     conseil du jour : exercices classés selon le bonus de repos
    serialization.ts restauration robuste d'un état sauvegardé
    __tests__/
  input/       Saisie des répétitions
    RepSource.ts         interface RepSource (événements 'reps' et 'seconds')
    ManualRepSource.ts   phase 1 : bouton, saisie d'un nombre, chronomètre
    ManualRepControls.tsx, useRepInput.tsx  (le hook choisit l'implémentation)
  storage/     expo-sqlite : migrations (database.ts) et GameRepository (seul endroit qui connaît le schéma)
  state/       GameProvider (contexte React) : applique la logique, sauvegarde, expose l'état aux écrans
  ui/          thème, formatage FR, composants (BattleArena, BossFigure, SwordFigure, HpBar…)
  app/         écrans Expo Router : index (Combat), character, calendar, settings
```

Flux d'une répétition : `RepSource` émet un événement → l'écran Combat appelle `work()` du `GameProvider`
→ `applyWork()` (pur) renvoie le nouvel état + les coups → sauvegarde SQLite en file d'attente
→ `useHitQueue` rejoue les coups en animation (accélérée pour une série saisie d'un coup).

**L'écran Combat ne dépend que de l'interface `RepSource`**, jamais de `ManualRepSource`. Une future
`CameraRepSource` (MediaPipe, phase 2, nécessitera un development build) se branchera dans `useRepInput`.

## Règles du jeu (valeurs dans `src/game/config.ts`)

- 10 muscles, tous niveau 1 au départ. Arme de départ : épée ×1.
- **Dégâts d'un coup** = somme des niveaux de tous les muscles × multiplicateur de l'arme.
- Chaque exercice donne un XP de base par rép. (par seconde pour le gainage), réparti entre les muscles selon des poids qui totalisent 1.0.
- **Courbe d'XP** : `xpPourNiveauSuivant(niveau) = round(50 × niveau^1.6)`. L'XP en trop passe au niveau suivant.
- **Repos (par muscle)**, calculé à la première séance du jour puis figé toute la journée :
  - 1re séance de ce muscle : ×1.0
  - entraîné hier : 2e jour d'affilée ×0.7, 3e ×0.5, 4e et plus ×0.35
  - dernier entraînement il y a 2 jours ×1.0, 3 jours ×1.25, 4 jours ou plus ×1.5 (plafond)
  - statut affiché : < 1 « Fatigué », = 1 « Prêt », > 1 « Reposé ».
- **Boss** : PV = `round(20 × 1.35^index)` (index à partir de 0). Boss vaincu → suivant. Historique conservé.
- Chaque rép. = 1 coup puis gain d'XP (un niveau gagné en cours de série augmente les coups suivants).
- Gainage : 1 coup toutes les `COMBAT.secondsPerHit` secondes (5 par défaut), le reste est reporté.
- **Conseil du jour** (écran Combat) : chaque exercice reçoit un multiplicateur effectif = Σ (poids du muscle × multiplicateur de repos actuel).
  Le plus élevé est proposé (ex. fessiers et ischios reposés → pont fessier), avec deux alternatives. Stable toute la journée.

## Conventions

- Interface en **français**, code / identifiants / commentaires en **anglais**.
- Aucun chiffre d'équilibrage en dur ailleurs que dans `config.ts`.
- `src/game/` ne doit jamais importer React, React Native ou Expo. Toute nouvelle règle y est testée.
- Les fonctions de `src/game/` sont pures : elles reçoivent `now: Date` au lieu de lire l'horloge.
- Dates : jour calendaire **local** du téléphone (`toDayKey`), écarts calculés sans être affectés par l'heure d'été.
- Assets : uniquement des formes SVG originales, aucun contenu protégé.
- Commits clairs et séparés par étape. `npx tsc --noEmit` et `npm test` doivent passer.

## Décisions à valider

Choix faits là où le cahier des charges était ambigu (les plus simples) :

1. **SDK** : Expo SDK 57 (dernier stable, supporté par Expo Go iOS). Depuis le SDK 57, Expo Go sur iPhone exige d'être **connecté au même compte Expo** (gratuit) dans la CLI (`npx expo login`) et dans l'app Expo Go.
2. **XP de base par exercice** (non fournis) : pompes 10, pompes piquées 11, dips 12, tractions 16, rowing inversé 10, squats 8, fentes 9, pont fessier 7, mollets 5, crunchs 6, relevés de jambes 9, gainage 2/s.
3. **Gainage** : 1 coup d'épée toutes les 5 s tenues (sinon 60 s de planche = 60 coups, bien plus que 60 pompes en effort). Les secondes restantes sont reportées au prochain gainage.
4. **Fentes** : une répétition = une fente (une jambe), pas une paire.
5. **Série** : une série reste ouverte tant qu'on garde le même exercice le même jour ; elle se ferme avec « Terminer la série », un changement d'exercice ou le redémarrage de l'app. « Ajouter un nombre » s'ajoute à la série en cours.
6. **Dégâts excédentaires** : non reportés sur le boss suivant.
7. **Multiplicateur d'une séance fractionnée sur plusieurs jours** : chaque jour recalcule (une série qui passe minuit démarre une nouvelle série).
8. **Horloge reculée** (jour antérieur au dernier entraînement) : on garde le multiplicateur déjà figé, sans pénalité.
9. **Intensité du calendrier** : volume = reps + secondes de gainage / 5 ; seuils 1 / 40 / 100 / 200 (4 teintes), dans `config.ts`.
10. **Semaines** : du lundi au dimanche. Les totaux hebdomadaires affichés couvrent les semaines visibles du mois.
11. **Noms des boss** : liste fixe qui boucle avec un chiffre romain (II, III…). Apparence SVG qui varie selon l'index.
12. **Une seule arme** en phase 1 (`WEAPONS` dans config.ts, prêt pour en ajouter).
13. **Saisie d'un nombre** plafonnée à 999 rép. par envoi.
14. **Conseil du jour** : classement par bonus de repos (multiplicateur effectif), pas par XP brute par rép. L'XP de base reflète déjà la difficulté (une traction rapporte plus qu'un crunch) : sans ça, les tractions seraient toujours proposées. En cas d'égalité, l'exercice qui donne le plus d'XP par rép. passe devant. À tester en conditions réelles, comme les valeurs d'XP.
