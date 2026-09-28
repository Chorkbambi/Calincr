import { Platform } from 'react-native';

/**
 * Daily local reminder. Scheduled on the phone by the operating system: no server, no push token, nothing sent.
 * The module is loaded lazily so that a missing or limited notifications module never breaks the app.
 */
type NotificationsModule = typeof import('expo-notifications');

const CHANNEL_ID = 'daily-reminder';

function load(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

export type ReminderResult = 'scheduled' | 'denied' | 'unavailable';

/** Asks permission if needed, then replaces any previous reminder by a daily one at hour:minute. */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<ReminderResult> {
  const N = load();
  if (!N) return 'unavailable';
  try {
    let { status } = await N.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await N.requestPermissionsAsync());
    if (status !== 'granted') return 'denied';
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Daily reminder',
        importance: N.AndroidImportance.DEFAULT,
      });
    }
    await N.cancelAllScheduledNotificationsAsync();
    await N.scheduleNotificationAsync({
      content: { title: 'Calincr ⚔️', body: 'A monster is waiting for you. Your daily quest is ready!' },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
    });
    return 'scheduled';
  } catch {
    return 'unavailable';
  }
}

export async function cancelDailyReminder(): Promise<void> {
  const N = load();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing scheduled or module unavailable: nothing to cancel.
  }
}
