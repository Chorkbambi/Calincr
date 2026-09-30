# CLAUDE.md — Calincr

Gamified mobile fitness app (Ring Fit × incremental game) for iPhone and Android.
Every real rep of a bodyweight exercise = one sword strike against the current monster.
Reps are counted by the camera (pose detection on the phone) or by hand.

## Rule #1 — Expo Go compatible only

- The app must run **entirely in Expo Go** (App Store / Play Store). No development build.
- Install **no native library missing from Expo Go**. Always `npx expo install <package>`, never `npm install <package>` for a runtime dependency.
- No `ios/` or `android/` folders.
- No backend, no account: local persistence only (expo-sqlite).
- Pose detection runs in a WebView (MediaPipe Tasks JS/WASM) precisely to stay Expo Go compatible.

## Rule #2 — privacy and security

- **Nothing the camera films is recorded or sent.** The video stays in the WebView's `<video>` element;
  only 33 body points (numbers) are passed to the app, processed, then discarded. Only rep counts are saved.
- Everything stays on the phone and **the app never uses the internet**. MediaPipe (JS code, WebAssembly SIMD engine and
  model, tasks-vision 1.0.1, ~18 MB) is **bundled** in `assets/mediapipe/` and handed to the camera page by the app
  (`src/input/camera/mediapipeAssets.ts`, base64 chunks via injectJavaScript → local `blob:` URLs).
- The camera page has a strict Content-Security-Policy (see `src/input/camera/poseCameraPage.ts`): no network
  destination allowed (only `blob:`/`data:`); the app blocks any WebView navigation.
- Updating MediaPipe = replace the files in `assets/mediapipe/` (see NOTICE.txt) and retest the camera page.
- Every WebView message is strictly validated (`src/pose/messages.ts`); every save read back is validated
  (`restoreState`, `restoreSettings`). SQL queries are always parameterized.
- The camera is switched off as soon as the Fight tab is left (the WebView is unmounted).
- First launch: welcome screen (`WelcomeModal`, tutorial then camera or manual choice), `onboardingVersion` setting.
- "Image on/off" button on the full-screen camera: shows only the skeleton on black (`hideCameraImage` setting,
  `window.__setHideVideo` in the page). Permanent "🔒 Not recorded" badge.
- Privacy policy: `src/ui/content/privacyPolicy.ts` (shown in Settings and on the welcome screen),
  copied in `PRIVACY.md` — keep both identical. The repository is **public**: never put secrets in it
  (keys, tokens, keystore); the GitHub URL of `PRIVACY.md` serves as the public page for the stores.
- Never add analytics, ads, third-party SDKs that send data, or logs containing pose data.
- Open-source notices: Settings → Open-source licenses (`src/ui/content/licenses.generated.ts`). Regenerate with
  `node scripts/generate-licenses.cjs` after any dependency change.
- Daily reminder: **local** notification scheduled by the phone (expo-notifications, never push or tokens).
- Backup: JSON file exported through the phone's share sheet; import is strictly validated
  (`src/game/backup.ts`, max size, version) and replaces everything in one transaction.
- Camera calibration keeps only two angle thresholds per exercise (kv `calibrations`), never body points.
- Share cards (`ShareCardModal`, react-native-view-shot + expo-sharing): game numbers only,
  never a camera image; nothing is sent unless the player picks an app.

## Name and publishing

- Display name: **Calincr**. Identifier: `com.chorkbambi.calincr` (Android `package` and iOS `bundleIdentifier`
  in `app.json`) — never change it after a first release.
- `eas.json`: `preview` profile = directly installable Android APK (free testing), `production` = app bundle
  for Google Play. Version number (`versionCode`) managed by EAS (`appVersionSource: remote`, `autoIncrement`):
  don't put it back in `app.json`. Updates = new build installed on top (no EAS Update: the app must not use the
  internet). Android permissions limited to the camera (microphone blocked).
- The database is always called `cali-incr.db` (renaming it would erase saves).

## Stack

- Expo SDK 57 (React Native 0.86, React 19.2), TypeScript `strict`, Expo Router (routes in `src/app/`).
- expo-sqlite, react-native-reanimated 4 (+ react-native-worklets), react-native-svg, @expo-google-fonts/cinzel,
  expo-haptics, expo-camera (permission only), react-native-webview, expo-screen-orientation,
  expo-asset + expo-file-system (reading the bundled MediaPipe files), expo-sharing + expo-document-picker
  (backup), expo-notifications (local reminder), react-native-view-shot (share cards), expo-keep-awake, expo-speech (voice count). `metro.config.js` adds the
  wasm/task/bin extensions.
- Tests: Jest 29 via `jest-expo` (`__tests__/*.test.ts` files). GitHub Actions (`.github/workflows/ci.yml`)
  runs `npm ci`, `tsc --noEmit` and `npm test` on every push to main.

## Commands

```bash
npm start              # npx expo start
npx expo start --tunnel
npm test               # jest
npx tsc --noEmit       # typecheck (must pass before any commit)
```

## Architecture

```
src/
  game/        PURE TypeScript game logic (no React / Expo import). Tested with Jest.
    config.ts        ← ALL balancing numbers (XP, curves, multipliers, HP, gold, swords, exercises)
    guides.ts        exercise instructions (steps, tip, camera placement)
    dates.ts         local calendar days (YYYY-MM-DD key), day gaps, ISO weeks
    progression.ts   XP curve, level-ups
    exercises.ts     catalog, difficulty tiers, exercises per muscle, XP split
    recovery.ts      rest / fatigue multipliers per muscle
    zones.ts         zones (name, scenery, monsters, bosses), change every 10 levels
    enemy.ts         monster/boss HP, level progression, gold earned
    engine.ts        GameState, damage, applyWork() (reps/seconds → hits + XP + gold), weekly boss
    shop.ts          buying / equipping swords, armor, rings, cosmetics, Streak Freeze
    styles.ts        exercise style (push/pull/legs/core), enemy weaknesses, gear effects
    records.ts       personal records (best set per exercise)
    settings.ts      settings (camera/manual mode, difficulty, reps per press…) + validation
    sets.ts          aggregation of recorded sets
    stats.ts         calendar: volume, intensity, weekly/monthly totals, weekly progress of an exercise
    recommend.ts     exercises ranked by rest bonus
    quest.ts         daily quest: exercise, history-based target, reward, streak, streak freezes
    achievements.ts  achievements (progress, gold reward per tier)
    recap.ts         last week's recap
    backup.ts        creation / strict validation of a backup file
    serialization.ts robust restoration of a saved state
  pose/        Rep counting from body points (pure TypeScript, tested)
    landmarks.ts, metrics.ts   joint angles
    trackers.ts                detection thresholds per exercise (not balancing)
    repCounter.ts              state machine: reps (hysteresis) or seconds held (holds)
    messages.ts                strict validation of WebView messages
    calibration.ts             personal thresholds from a few slow reps ("Calibrate")
  input/       Rep input
    RepSource.ts         RepSource interface ('reps' and 'seconds' events)
    CameraRepSource.ts   camera mode (default); camera/ = WebView page + component
    ManualRepSource.ts   manual mode: Rep button (× reps per press), timer, fake "Undo"
                         (camera mode also has correction buttons: CameraRepSource.addManually)
    useRepInput.tsx      picks the implementation from the settings
  notifications/ local daily reminder (loaded lazily, errors ignored)
  storage/     expo-sqlite: migrations (database.ts) and GameRepository (the only place that knows the schema)
  state/       GameProvider (React context): applies the logic, saves, exposes the state to the screens
  ui/          theme, formatting, components (BattleArena, ZoneBackdrop, EnemyFigure, SwordFigure, BodyMap, WelcomeModal,
               WeeklyRecapModal, RestTimer, ComboBadge, AchievementsPanel, BackupPanel, WeeklyBossBar,
               ProgressChart, ExerciseProgressPanel, ShareCardModal…)
  app/         Expo Router screens: index (Fight), character (Hero), shop, calendar, settings
```

Flow of a rep: `RepSource` emits an event → the Fight screen calls the `GameProvider`'s `work()`
→ `applyWork()` (pure) returns the new state + the hits → queued SQLite save
→ `useHitQueue` replays the hits as animations (sped up for several reps at once).

**The Fight screen depends only on the `RepSource` interface**, never on an implementation.

## Game rules (values in `src/game/config.ts`)

- 10 muscles, all level 1 at the start. Starting sword: Rusty Sword ×1.
- **Damage of a hit** = sum of all muscle levels × sword multiplier.
- Each exercise gives base XP per rep (per second for holds), split between muscles by weights that total 1.0.
- **Difficulty** (setting): Beginner = simplified exercises; Normal = classic exercises; Advanced = Normal + hard ones.
  Each mode covers all 10 muscles.
- **XP curve**: `xpForNextLevel(level) = round(50 × level^1.6)`. Extra XP carries over to the next level.
- **Rest (per muscle)**, computed at the first session of the day then frozen for the day:
  - first session ever for this muscle: ×1.0
  - trained yesterday: 2nd day in a row ×0.7, 3rd ×0.5, 4th and more ×0.35
  - last trained 2 days ago ×1.0, 3 days ×1.25, 4 days or more ×1.5 (cap)
  - displayed status: < 1 "Tired", = 1 "Ready", > 1 "Rested".
- **Monsters and levels**: each level = 10 monsters then 1 boss, then the next level, forever.
  Monster HP = `round(20 × 1.6^(level-1) × (1 + stage × 0.08))`, boss = ×4. Overkill damage is not carried over.
- **Zones**: name, scenery and monsters change every 10 levels (8 zones, then they loop as II, III…).
- **Gold**: each defeated enemy gives `max(1, round(max HP × 0.25))`, ×2 for a boss. Spent in the Shop.
- Each rep = 1 hit then XP gain (a level gained mid-set boosts the following hits).
- Holds: 1 hit every `COMBAT.secondsPerHit` seconds (5 by default), the remainder carries over.
- **Suggestions by muscle group** (`recommend.ts`): players usually train one group per day (push / pull / legs / core,
  like a split), so suggestions never mix a bit of everything. The group already trained today (`todayFocus`, most XP
  today) stays suggested all day; otherwise the least recently trained group comes first (`groupRestScore` = mean rest
  multiplier of its muscles, a never-trained muscle counts as fully rested). Inside a group: rest bonus, then XP per rep.
- **Exercise list order** (Fight screen, `sortForBattle`): pinned favourites, then the exercises hitting the current
  enemy's weakness (⚡, the only per-exercise damage difference), then the suggestion order. Chips of the suggested
  group have a green border, with a "💡 Suggested today" line above the list.
- **Daily quest** (Fight screen, `src/game/quest.ts`): ONE exercise suggested per day (the app motivates, it doesn't
  coach): the first suggestion (least recently trained group, then the most rested muscles of that group).
  Target = total of the last session of that exercise + 10% (at least +1 rep / +5 s), a starting value per tier
  if never done, × 0.8 after 10 days without, × 0.7 if the muscles are tired; split into sets (e.g. 3 × 8).
  Reward on completion: bonus XP (target × base XP × 0.5, no multiplier) + gold (1.5 × HP of the level's first
  monster). Day streak. Generated once a day, saved (kv `daily_quest`).
- **Manual mode**: the Rep button adds "reps per press" (1 to 50). The Undo button undoes nothing: it shows
  "Made a mistake? Too bad — you'll have to make up for it!" (on purpose).
- **Camera mode**: manual correction possible (+1 / +5 reps, +5 / +15 s for holds) if the camera misses reps;
  same fake Undo. Camera mode works offline (bundled MediaPipe).
- **Camera**: starts only after "Start camera" for the chosen exercise (preparation screen saying which body parts
  must be visible, `src/pose/visibility.ts`). It opens full screen, whole image (not cropped), with a Rotate
  button (landscape); it stops when the exercise changes, the tab is left or Stop is pressed.
  The app is locked in portrait (expo-screen-orientation) except the full-screen camera.
- **Combo**: hits less than 10 s apart chain; +5% damage every 5 hits, capped at +50% (`COMBO`).
- **Weaknesses**: an exercise's style = the group (push/pull/legs/core) receiving the most XP weight; each enemy
  fears one style (`enemyWeakness`) → +50% damage (`WEAKNESS`). Every difficulty covers the 4 styles (tested).
- **Weekly Titan** (`WEEKLY_BOSS`): created at the first hit of the week, HP = damage per hit × 300 (min. 300),
  every hit damages it; reward = HP of the level's first monster × 10 (min. 100).
- **Records**: best set per exercise; beating it (not the first time) pays gold once per set (`RECORDS`).
  Records are seeded from the history on load (`seedRecords`).
- **Streak Freeze** (`STREAK_FREEZE`): 2 max, price = HP of the first monster × 3; used automatically (one per
  missed day) if the quest streak is > 0 (`createDailyQuest` → `freezesUsed`, `spendStreakFreezes`).
- **Gear** (`GEAR`): one armor (+gold) and one ring (combo window, combo cap, weakness bonus).
  **Cosmetics** (`COSMETICS`): sword glow and damage number colour, purely visual.
- **Achievements** (`achievements.ts`): 20 achievements, gold reward = HP of the level's first monster × 2 / 5 / 12
  by tier (min. 20). Lifetime stats in `GameState.lifetime`.
- **Rest timer**: after "Finish set", countdown (off / 30 / 60 / 90 / 120 s), asked at first launch.
- **Favourites**: pinned exercises first in the list; "Last time" shows the last session of each exercise.
- **Weekly recap**: shown once at the first launch of a new week (if there was any training).
- **First launch**: 3 tutorial screens then camera/manual choice and rest timer. `ONBOARDING_VERSION` (settings.ts):
  bump it to show the tutorial to everyone again.
- **Completely free**: no purchase, no donation button, no ads.
- **Accessibility**: "Large buttons" setting; text follows the phone's font size.
- **Screen kept awake** on the Fight tab only (expo-keep-awake, tag `fight`), released when the tab is left.
- **Voice count** (`voiceCount` setting, off by default; 🔊 toggle on the Fight screen, in the camera HUD and in Settings):
  expo-speech says the set's rep total after each rep (holds: every `VOICE.holdStepSeconds`) and "Rest over" at the end
  of the rest timer. Nothing else is spoken. Phrases in `src/game/voice.ts`.
- **Level-up banner** (`LevelUpBanner`): "LEVEL UP!" over the arena with the muscles gained and the new damage per hit.
- **Fight screen order**: enemy (HP + damage per hit on one line), arena, exercise list, controls, current set, voice
  toggle, daily quest (one line once completed), Weekly Titan.
- **How to**: each exercise has an animation (SVG stick figure, `src/ui/exerciseAnimations.ts`: 2 interpolated poses).

## Conventions

- **Everything is in English**: the interface, code, identifiers, comments and docs (README, CLAUDE.md, PRIVACY.md).
- No balancing number hard-coded anywhere but `config.ts`.
- `src/game/` and `src/pose/` must never import React, React Native or Expo. Every new rule is tested there.
- `src/game/` functions are pure: they receive `now: Date` instead of reading the clock.
- Dates: the phone's **local** calendar day (`toDayKey`), gaps computed without being affected by daylight saving time.
- Assets: original SVG shapes only, no protected content. Icon and splash generated from
  `assets/branding/` (emblem.svg, render-icons.cjs).
- Clear commits, one per step. `npx tsc --noEmit` and `npm test` must pass.
- **Merging**: the owner does not review code. Once CI is green, merge the pull request into `main` yourself,
  without waiting for a confirmation.

## Decisions to validate

Choices made where the request was ambiguous (the simplest ones):

1. **SDK**: Expo SDK 57. Since SDK 57, Expo Go on iPhone requires being **signed in to the same Expo account** (free) in the CLI (`npx expo login`) and in the Expo Go app.
2. **Base XP per exercise**: invented values (4 to 18 XP/rep depending on difficulty, 1.5 to 3 XP/s for holds). To be tested.
3. **Holds**: 1 sword hit every 5 s held. Remaining seconds carry over to the next hold.
4. **Lunges, single-leg exercises**: one rep = one side.
5. **Set**: stays open while the same exercise is kept on the same day; closed by "Finish set", an exercise change or an app restart.
6. **Overkill damage**: not carried over to the next enemy.
7. **Set crossing midnight**: starts a new set (the multiplier is recomputed each day).
8. **Clock moved back**: the already frozen multiplier is kept, no penalty.
9. **Calendar intensity**: volume = reps + hold seconds / 5; thresholds 1 / 40 / 100 / 200.
10. **Weeks**: Monday to Sunday.
11. **Daily quest**: exercise chosen by group rest then rest bonus, not raw XP (otherwise the hardest exercise would always be suggested). Tie → more XP per rep; groups tied on a fresh game → push first.
12. **Difficulty**: Advanced also shows Normal exercises (squats, push-ups…), Beginner only the simplified ones. Default: Normal.
13. **Camera mode by default**; manual mode is a setting. Changing exercise closes the set.
14. **Camera detection**: WebView + MediaPipe Pose Landmarker "lite" (tasks-vision 1.0.1, float16/1 model), bundled in the app (no download: avoids App Store rule 2.5.2 on downloaded code). Only the WebAssembly SIMD build is included (iOS 16.4+ / recent Android WebView); otherwise the app offers manual mode. Detection thresholds per exercise in `src/pose/trackers.ts`; some exercises (calf raises, supermans, nordic curls) are hard to detect and need testing.
15. **No quality bonus**: a rep counts only if the full range of motion is reached (thresholds), otherwise nothing. No partial XP.
16. **Swords**: fixed list of 9 swords (×1 to ×25). No new weapon beyond that for now.
17. **Old saves**: muscle levels are kept, enemies restart at level 1.
18. **npm vulnerabilities**: `npm audit` reports "moderate" issues in Expo dependencies (build tools, and `decode-uri-component` via expo-router, only exploitable through a malformed deep link). Fixed on Expo's side; don't run `npm audit fix --force` (it would break the SDK 57 versions).
