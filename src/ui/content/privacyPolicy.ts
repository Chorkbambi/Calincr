/** Privacy policy shown in Settings (same text as PRIVACY.md at the root of the project). */
export const PRIVACY_POLICY_UPDATED = '2026-09-28';

export const PRIVACY_POLICY: { title: string; body: string[] }[] = [
  {
    title: 'In short',
    body: [
      'Calincr collects nothing. No account, no server, no ads, no analytics, no tracking. Everything you do in the app stays on your phone.',
    ],
  },
  {
    title: 'Camera',
    body: [
      'The camera is only used in camera mode, and only after you press “Start camera”. You can use the whole app without it (manual mode).',
      'The video is analysed live, on your phone, by a body-tracking engine built into the app (Google MediaPipe). It finds the position of 33 points of your body (shoulders, elbows, knees…) to count your reps.',
      'The video is never recorded, never saved and never sent anywhere. The body points are used immediately to count reps, then thrown away. Only the number of reps is kept, plus, if you use “Calibrate”, two threshold angles per exercise (for example “elbow bent below 95°”) so that counting fits your range of motion.',
      'The camera turns off when you stop it, change exercise or leave the Fight tab. You can hide your image and see only a stick figure at any time.',
      'The app never records sound: the microphone is not used.',
    ],
  },
  {
    title: 'Internet',
    body: ['The app does not use the internet. The body-tracking engine is inside the app, so camera mode works offline and nothing can be sent.'],
  },
  {
    title: 'Data stored on your phone',
    body: [
      'The app stores on your phone only: your muscle levels, gold, swords, defeated enemies, achievements, training history (exercise, reps, date), daily quest, camera calibration thresholds and settings.',
      'This data never leaves your phone unless you export a backup or share a picture yourself. The developer has no access to it.',
      'You can erase it at any time in Settings → Reset progress, or by uninstalling the app.',
    ],
  },
  {
    title: 'Daily reminder',
    body: [
      'If you turn on the daily reminder, the notification is scheduled by your phone itself. No server and no push service are involved, and nothing is sent. Turn it off in Settings at any time.',
    ],
  },
  {
    title: 'Backups',
    body: [
      '“Export backup” creates a file with your progress and lets you choose where to put it (files, e-mail, cloud drive…). Where it goes is your choice; the app itself sends nothing.',
      '“Import backup” reads a file you pick, checks it strictly and replaces your progress with it.',
    ],
  },
  {
    title: 'Sharing pictures',
    body: [
      '“Share” on the weekly recap or an achievement creates a picture with game numbers only (reps, levels, monsters) and opens your phone\'s share menu. It never contains anything from the camera. Nothing is sent unless you pick an app to share it with.',
    ],
  },
  {
    title: 'Children',
    body: ['The app collects no data from anyone, including children.'],
  },
  {
    title: 'Changes',
    body: ['If this policy ever changes, the new version will be shown in the app with its date.'],
  },
];
