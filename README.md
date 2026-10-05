# Calincr

[![CI](https://github.com/Chorkbambi/Calincr/actions/workflows/ci.yml/badge.svg)](https://github.com/Chorkbambi/Calincr/actions/workflows/ci.yml)

A gamified fitness app (Ring Fit × incremental game): every push-up, squat or pull-up you do is a sword strike
against a monster. Your muscles level up, your damage grows, and rest is rewarded.

- **Free, no ads, no account, no server**: everything stays on your phone and the app never uses the internet.
- **Reps counted by the camera** (pose detection runs on the phone, nothing is recorded) or by hand.
- Runs in **Expo Go** (iPhone and Android) and as an Android APK.
- Privacy policy: [`PRIVACY.md`](PRIVACY.md).

## Features

- **Combat**: 10 monsters then a boss per level, a new zone every 10 levels, combos (fast hits = more damage),
  **weaknesses** (each monster fears one style: Push, Pull, Legs or Core → +50% damage; exercises that hit it
  are marked ⚡).
- **Weekly Titan**: a huge health bar that every hit of the week chips away at, for a big gold reward.
- **Muscles**: 10 muscles with levels and XP; bonus for rested muscles, penalty for tired ones.
- **Daily quest**: one exercise and a target based on your last session (never tiny sets like 3 × 2), with a
  weekly goal streak you can protect with **Streak Freezes**.
- **Workout plan**: before an exercise, pick its sets and reps (or seconds). Each set ends by itself at its
  target, the rest timer starts on its own and the next set follows: the phone can stay on the floor.
- **Personal records**: beating your best session of an exercise (all its sets in one day) earns gold, checked
  when the exercise is finished.
- **Shop**: swords (damage), armor (more gold), rings (combos, weaknesses), cosmetics (sword glow, damage number
  colour), Streak Freezes.
- **Achievements** (20), **weekly recap**, **progress charts** per exercise, **share cards** (pictures).
- Automatic rest timer, voice count (reps, rest start and end), local daily reminder, favourite exercises, camera
  calibration, backup to a file, large buttons.

## Run the app on an iPhone from a Windows PC

### 1. Requirements (once)

- **Node.js LTS** (22 or newer): <https://nodejs.org> → install, then check in PowerShell:
  ```powershell
  node -v
  npm -v
  ```
- **Git**: <https://git-scm.com/download/win>
- On the iPhone: the **Expo Go** app from the App Store (a recent version, compatible with SDK 57).
- A **free Expo account**: <https://expo.dev/signup>. Since SDK 57, Expo Go on iPhone requires you to be signed in
  **with the same account** in the terminal and in the app.

### 2. Get the project

```powershell
git clone https://github.com/Chorkbambi/Calincr.git
cd Calincr
npm install
```

### 3. Sign in to Expo

In the terminal:

```powershell
npx expo login
```

On the iPhone: open Expo Go → profile icon at the top right → sign in with the same account.

### 4. Start the development server

```powershell
npx expo start
```

A QR code appears in the terminal.

### 5. Open the app on the iPhone

- The PC and the iPhone must be on **the same Wi-Fi network**.
- Open the iPhone **Camera** app, point it at the QR code, then tap the "Open in Expo Go" banner.
- The first load takes a few seconds.

### If it doesn't connect: tunnel mode

Company or school network, guest Wi-Fi, Windows firewall, VPN… If the iPhone can't load the app:

```powershell
npx expo start --tunnel
```

The tunnel goes through the internet (slower, but it gets around local network problems). The first time,
Expo may offer to install `@expo/ngrok`: answer yes.

Other things to try: allow Node.js in the Windows firewall (private network), turn off the VPN,
and press `r` in the terminal to reload the app.

## Development

```powershell
npm test            # Jest unit tests (game logic)
npx tsc --noEmit    # TypeScript check
```

Both checks also run automatically on GitHub on every push (GitHub Actions,
[`.github/workflows/ci.yml`](.github/workflows/ci.yml)): a red cross on a commit means something is broken —
fix it before building an APK.

- All balancing numbers (XP, curves, rest multipliers, enemy HP, exercises) live in
  [`src/game/config.ts`](src/game/config.ts).
- To add a dependency: `npx expo install <package>` (and check that it is included in Expo Go).
- Architecture, game rules and conventions: see [`CLAUDE.md`](CLAUDE.md).

## Install the Android app on your phone (free, without the Play Store)

1. Create a free account at <https://expo.dev> (the same one as for Expo Go) and sign in: `npx expo login`.
2. Start the build in Expo's cloud (free within the free plan's limits):
   ```powershell
   npx eas-cli@latest build --platform android --profile preview
   ```
   The first time, accept creating the EAS project and generating the Android signing key (let EAS manage it).
3. When it finishes (10 to 20 min), the command shows a link and a QR code: open it on the Android phone,
   download the APK and install it (Android will ask you to allow installs from the browser).
4. **Updating**: run `git pull`, `npm install`, then the same build command, and install the new APK over the old
   one. Your progress is kept. The version number goes up automatically.
5. For testers: send them the same link. Google is gradually restricting installs of apps from unverified
   developers; Google's free "limited distribution" account allows up to 20 devices.

App identifier: `com.chorkbambi.calincr` (Android and iOS). It can't change after the first store release.

On iPhone, installing a real app requires a paid Apple Developer account ($99/year); until then, use Expo Go.

## Screens

1. **Fight** — zone, monster or boss with its HP bar and **weakness**, gold, damage per hit, **daily quest**
   (one exercise + a rep target based on your last session, bonus XP and gold, day streak), Weekly Titan, your
   record on the exercise, exercise picker ("How to" button for instructions, ☆ to pin an exercise to the front,
   "Last time" = your last session), **your plan** (sets × reps, rest between sets, voice count), rep counting by
   camera or by hand, combo (fast hits = more damage), automatic rest timer.
2. **Hero** — sword, body silhouette with each muscle coloured by level (tap a muscle to see recommended
   exercises), levels / XP / rest status, **achievements** (they pay gold; tap an unlocked one to share it as a
   picture), defeated bosses.
3. **Shop** — tabs Swords, Gear (armor and rings), Style (cosmetics) and Items (Streak Freeze).
4. **Calendar** — month view shaded by volume, day details, **progress charts** per exercise (total and best set
   per week; tap a week to see its value), weekly and monthly totals.
5. **Settings** — camera or manual mode, difficulty (Beginner / Intermediate / Expert), rest timer, daily reminder,
   large buttons, **backup** (export / import a file), privacy, reset.

Every Monday (on the first launch of the week), a **recap of last week** is shown, with a button to share it as a
picture (game numbers only, never anything from the camera).

## Back up your progress

Settings → **Export backup**: creates a `calincr-backup-YYYY-MM-DD.json` file that you keep wherever you like
(Drive, e-mail, files…). On a new phone: Settings → **Import backup** and pick that file (it replaces everything).

## Camera mode and privacy

- The front camera films you while you exercise; pose detection (Google MediaPipe) runs **on the phone**. The video
  is never recorded or sent: only the counted reps are kept.
- **Works offline**: the pose detection engine (Google MediaPipe, about 18 MB) is built into the app. No download,
  no internet connection.
- Each exercise's "How to" button shows a short animation and the steps.
- Pick the exercise and your plan (sets × reps), then tap **Start camera**: the preparation screen tells you which
  body parts must be visible. The camera opens full screen and shows only your image, the count and the rest
  countdown: nothing to tap until the end. Each set ends at its target (or 20 s after your last rep), the rest timer
  runs, then the next set starts. Turn the phone sideways for push-ups or planks: the camera turns with it (if your
  phone's rotation lock is off).
- After the last set (or **✕ Stop**, or leaving the tab) the camera closes and a **Check your sets** screen shows
  the count of each set: fix it up or down if the camera missed or added a rep, then confirm. Your sword strikes
  happen then.
- Place the phone side-on, about 2 m away (each exercise says where to put it).
- On first launch: a short tutorial (3 screens), then your level (Beginner / Intermediate / Expert), camera or
  manual mode, and the rest timer.
- **Calibrate** (on the preparation screen): the camera opens, you do 3 slow, full reps and the app adapts its
  thresholds to your range of motion (for that exercise).
- The **Image: on/off** button on the preparation screen hides your picture (only a stick figure is shown).
- Privacy policy: in Settings, and in [`PRIVACY.md`](PRIVACY.md).
- Rather not film yourself? **Settings → Manual (no camera)**: you tap the Rep button yourself
  (and choose how many reps each press adds). Sets end at their target and the rest timer starts by itself too;
  as before, "Undo" doesn't undo anything.

## Public repository

The code is public: anyone can read it and check that the app sends nothing. No secrets are stored in the
repository (the Android signing key is kept by EAS, not here). For the Play Store, the privacy policy URL can be
the one of [`PRIVACY.md`](https://github.com/Chorkbambi/Calincr/blob/main/PRIVACY.md).

## Licenses

Every runtime dependency uses a permissive license (MIT, ISC, BSD, Apache-2.0, BlueOak, 0BSD, CC0, Unlicense) that
allows commercial use. Bundled files: MediaPipe tasks-vision and the Pose Landmarker model (Apache-2.0, see
`assets/mediapipe/NOTICE.txt`), the Cinzel font (SIL Open Font License 1.1: can be embedded in an app, not sold
on its own).

MIT/BSD/Apache require shipping their copyright and license notices: Settings → About → **Open-source licenses**
lists every package of the app's JavaScript bundle, every direct dependency and the MediaPipe files, with their
license text. The list is generated; after adding, removing or updating a dependency run:

```bash
node scripts/generate-licenses.cjs   # rewrites src/ui/content/licenses.generated.ts
```
