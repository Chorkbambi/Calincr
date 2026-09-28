import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Tabs } from 'expo-router/js-tabs';
import { ActivityIndicator, View } from 'react-native';

import { GameProvider } from '../state/GameProvider';
import { DATABASE_NAME, migrateDatabase } from '../storage/database';
import { colors, fonts } from '../ui/theme';

const Loading = (
  <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator color={colors.gold} />
  </View>
);

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
      <GameProvider fallback={Loading}>
        <StatusBar style="light" />
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colors.background },
            tabBarStyle: { backgroundColor: colors.stone, borderTopColor: colors.border },
            tabBarActiveTintColor: colors.goldLight,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: { fontFamily: fonts.title, fontSize: 11 },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Combat' }} />
          <Tabs.Screen name="character" options={{ title: 'Personnage' }} />
          <Tabs.Screen name="calendar" options={{ title: 'Calendrier' }} />
          <Tabs.Screen name="settings" options={{ title: 'Réglages' }} />
        </Tabs>
      </GameProvider>
    </SQLiteProvider>
  );
}
