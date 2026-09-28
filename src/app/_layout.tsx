import { Tabs } from 'expo-router/js-tabs';

export default function RootLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Combat' }} />
      <Tabs.Screen name="character" options={{ title: 'Personnage' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendrier' }} />
      <Tabs.Screen name="settings" options={{ title: 'Réglages' }} />
    </Tabs>
  );
}
