import * as Speech from 'expo-speech';

/**
 * Says a short phrase with the phone's own text-to-speech (works offline, nothing is sent).
 * A new phrase cuts the previous one, so fast reps never queue up behind the count.
 */
export function say(text: string): void {
  try {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: 1.05 });
  } catch {
    // No voice available on this phone: stay silent.
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // Ignore.
  }
}
