import type { ExerciseId } from './config';

export interface ExerciseGuide {
  /** How to perform one rep (or the hold). */
  steps: string[];
  /** Most common mistake to avoid. */
  tip: string;
  /** Where to place the phone for camera tracking. */
  camera: string;
}

const SIDE = 'Put the phone on the floor about 2 m away, filming you from the side, whole body in frame.';
const SIDE_STANDING = 'Stand side-on to the phone, about 2–3 m away, whole body in frame.';
const SIDE_BAR = 'Film from the side, far enough to see you from hands to feet.';

export const EXERCISE_GUIDES: Record<ExerciseId, ExerciseGuide> = {
  wall_pushup: {
    steps: [
      'Stand an arm’s length from a wall, hands on it at shoulder height, a bit wider than your shoulders.',
      'Keep your body straight and bend your elbows until your nose almost touches the wall.',
      'Push back until your arms are straight.',
    ],
    tip: 'Step further from the wall to make it harder.',
    camera: SIDE_STANDING,
  },
  knee_pushup: {
    steps: [
      'Start on hands and knees, hands slightly wider than shoulders, then walk your hands forward so your body is straight from knees to head.',
      'Lower your chest towards the floor, elbows at about 45° from your body.',
      'Push back up until your arms are straight.',
    ],
    tip: 'Don’t let your hips stick up: squeeze glutes and abs.',
    camera: SIDE,
  },
  chair_dip: {
    steps: [
      'Sit on the edge of a stable chair, hands next to your hips, fingers forward.',
      'Slide your hips off the seat, knees bent at 90°, feet flat.',
      'Bend your elbows to lower yourself until they reach about 90°, then push back up.',
    ],
    tip: 'Keep your back close to the chair and your shoulders down, away from your ears.',
    camera: SIDE,
  },
  door_row: {
    steps: [
      'Stand in an open doorway and grab both sides of the frame at chest height.',
      'Walk your feet forward and lean back with straight arms, body straight.',
      'Pull your chest towards the frame by squeezing your shoulder blades, then lower slowly.',
    ],
    tip: 'The more you lean back, the harder it gets. Check the door frame is solid.',
    camera: SIDE_STANDING,
  },
  superman: {
    steps: [
      'Lie face down, arms stretched in front of you.',
      'Lift your arms, chest and legs a few centimetres off the floor at the same time.',
      'Hold one second, then lower back down.',
    ],
    tip: 'Look at the floor to keep your neck neutral.',
    camera: SIDE,
  },
  chair_squat: {
    steps: [
      'Stand in front of a chair, feet shoulder-width apart.',
      'Push your hips back and bend your knees until you lightly touch the seat.',
      'Stand back up by pushing through your heels.',
    ],
    tip: 'Keep your knees pointing the same way as your toes.',
    camera: SIDE_STANDING,
  },
  glute_bridge: {
    steps: [
      'Lie on your back, knees bent, feet flat close to your hips.',
      'Squeeze your glutes and lift your hips until your body is straight from knees to shoulders.',
      'Lower slowly back down.',
    ],
    tip: 'Push through your heels, not your toes.',
    camera: SIDE,
  },
  calf_raise: {
    steps: [
      'Stand tall, feet hip-width apart, a hand on a wall for balance.',
      'Rise onto the balls of your feet as high as you can.',
      'Lower your heels slowly back to the floor.',
    ],
    tip: 'Go slow on the way down: it’s where calves work most.',
    camera: 'Stand side-on to the phone, 2 m away, feet clearly visible.',
  },
  crunch: {
    steps: [
      'Lie on your back, knees bent, hands on your chest or lightly behind your head.',
      'Curl your shoulders off the floor by squeezing your abs.',
      'Lower back down with control.',
    ],
    tip: 'Don’t pull on your neck: the movement comes from the abs.',
    camera: SIDE,
  },
  knee_plank: {
    steps: [
      'Rest on your forearms and knees, elbows under your shoulders.',
      'Walk your knees back until your body is a straight line from knees to head.',
      'Hold the position while breathing normally.',
    ],
    tip: 'Squeeze your abs and glutes so your lower back doesn’t sag.',
    camera: SIDE,
  },

  pushup: {
    steps: [
      'Hands slightly wider than your shoulders, body straight from head to heels.',
      'Lower your chest to a fist’s height from the floor, elbows at about 45°.',
      'Push back up until your arms are straight.',
    ],
    tip: 'Keep your hips in line: no sagging, no pike.',
    camera: SIDE,
  },
  pike_pushup: {
    steps: [
      'Start in a push-up position, then walk your feet in and lift your hips high (upside-down V).',
      'Bend your elbows to bring the top of your head towards the floor between your hands.',
      'Push back up.',
    ],
    tip: 'The closer your feet are to your hands, the more it works the shoulders.',
    camera: SIDE,
  },
  bench_dip: {
    steps: [
      'Hands on the edge of a bench or chair behind you, legs straight in front.',
      'Bend your elbows to lower your hips until your elbows reach about 90°.',
      'Push back up until your arms are straight.',
    ],
    tip: 'Don’t go lower than 90° if your shoulders hurt.',
    camera: SIDE,
  },
  inverted_row: {
    steps: [
      'Lie under a sturdy table (or a low bar) and grab its edge, arms straight.',
      'Keep your body straight, heels on the floor.',
      'Pull your chest up to the edge, then lower slowly.',
    ],
    tip: 'Test the table’s stability first. Bend your knees to make it easier.',
    camera: SIDE,
  },
  squat: {
    steps: [
      'Feet shoulder-width apart, toes slightly out.',
      'Push your hips back and down until your thighs are at least parallel to the floor.',
      'Stand back up by pushing through your whole foot.',
    ],
    tip: 'Keep your chest up and heels on the floor.',
    camera: SIDE_STANDING,
  },
  lunge: {
    steps: [
      'Stand tall, then take a big step forward.',
      'Lower until both knees are bent at about 90°, back knee close to the floor.',
      'Push through the front foot to come back. Alternate legs: each lunge is one rep.',
    ],
    tip: 'Keep your front knee above your ankle, not past your toes.',
    camera: SIDE_STANDING,
  },
  single_leg_bridge: {
    steps: [
      'Lie on your back, one knee bent with the foot flat, the other leg straight in the air.',
      'Lift your hips with the bent leg until your body is straight.',
      'Lower slowly. Do both sides.',
    ],
    tip: 'Keep your hips level: don’t let one side drop.',
    camera: SIDE,
  },
  single_leg_calf_raise: {
    steps: [
      'Stand on one foot, a hand on a wall for balance.',
      'Rise as high as possible on the ball of your foot.',
      'Lower slowly. Do both sides.',
    ],
    tip: 'Stand on a step and let the heel go below the step for a bigger range.',
    camera: 'Stand side-on to the phone, 2 m away, feet clearly visible.',
  },
  leg_raise: {
    steps: [
      'Lie on your back, legs straight, hands under your lower back or by your sides.',
      'Lift your straight legs until they point to the ceiling.',
      'Lower them slowly without touching the floor.',
    ],
    tip: 'Press your lower back into the floor the whole time.',
    camera: SIDE,
  },
  plank: {
    steps: [
      'Forearms on the floor, elbows under your shoulders, legs straight on your toes.',
      'Make a straight line from head to heels.',
      'Hold while breathing normally.',
    ],
    tip: 'Squeeze abs and glutes: no sagging hips, no raised hips.',
    camera: SIDE,
  },

  pullup: {
    steps: [
      'Hang from a bar, hands slightly wider than your shoulders, palms facing away.',
      'Pull until your chin passes the bar, leading with your chest.',
      'Lower all the way until your arms are straight.',
    ],
    tip: 'No swinging: every rep starts from a dead hang.',
    camera: SIDE_BAR,
  },
  chinup: {
    steps: [
      'Hang from a bar, hands shoulder-width apart, palms facing you.',
      'Pull until your chin passes the bar.',
      'Lower all the way down with control.',
    ],
    tip: 'Keep your elbows in front of you to use your biceps.',
    camera: SIDE_BAR,
  },
  dip: {
    steps: [
      'Support yourself on parallel bars, arms straight.',
      'Lean slightly forward and bend your elbows until they reach 90°.',
      'Push back up until your arms are straight.',
    ],
    tip: 'Keep your shoulders down, away from your ears.',
    camera: SIDE_BAR,
  },
  diamond_pushup: {
    steps: [
      'Push-up position with your hands together under your chest, thumbs and index fingers forming a diamond.',
      'Lower your chest to your hands, elbows close to your body.',
      'Push back up.',
    ],
    tip: 'Keep your body straight; widen your hands a little if your wrists hurt.',
    camera: SIDE,
  },
  elevated_pike_pushup: {
    steps: [
      'Feet on a chair or bench, hands on the floor, hips high so your torso is nearly vertical.',
      'Lower the top of your head towards the floor.',
      'Push back up.',
    ],
    tip: 'Keep your elbows at about 45°, not flared out.',
    camera: SIDE,
  },
  pistol_squat: {
    steps: [
      'Stand on one leg, the other leg straight in front of you.',
      'Squat down on the standing leg as low as you can, arms forward for balance.',
      'Stand back up without the other foot touching the floor. Do both sides.',
    ],
    tip: 'Hold a door frame or sit onto a chair at first.',
    camera: SIDE_STANDING,
  },
  bulgarian_split_squat: {
    steps: [
      'Stand a big step in front of a chair, the top of your back foot resting on the seat.',
      'Lower until your front thigh is parallel to the floor.',
      'Push through your front heel to stand up. Do both sides.',
    ],
    tip: 'Keep your torso upright and your front knee in line with your toes.',
    camera: SIDE_STANDING,
  },
  jump_squat: {
    steps: [
      'Squat down until your thighs are parallel to the floor.',
      'Explode up into a jump.',
      'Land softly on the balls of your feet and go straight into the next squat.',
    ],
    tip: 'Land with bent knees, quietly.',
    camera: SIDE_STANDING,
  },
  nordic_curl: {
    steps: [
      'Kneel on a cushion with your heels hooked under a sofa or held by a partner.',
      'Keep your body straight from knees to head and lower yourself forward as slowly as possible.',
      'Catch yourself with your hands and push back up to the start.',
    ],
    tip: 'Very hard: go only as low as you can control.',
    camera: SIDE,
  },
  hanging_leg_raise: {
    steps: [
      'Hang from a bar with straight arms.',
      'Raise your legs (straight, or knees bent to start) up to hip height or higher.',
      'Lower slowly without swinging.',
    ],
    tip: 'Tilt your pelvis up at the top to really use your abs.',
    camera: SIDE_BAR,
  },
  hollow_hold: {
    steps: [
      'Lie on your back, arms stretched overhead.',
      'Press your lower back into the floor and lift your shoulders and straight legs off the floor.',
      'Hold the banana shape while breathing.',
    ],
    tip: 'If your lower back lifts, raise your legs higher or bend your knees.',
    camera: SIDE,
  },
};
