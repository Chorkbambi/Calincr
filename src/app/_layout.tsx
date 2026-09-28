import { Cinzel_500Medium, Cinzel_700Bold, useFonts } from '@expo-google-fonts/cinzel';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { ActivityIndicator, View, type ColorValue } from 'react-native';

import { GameProvider } from '../state/GameProvider';
import { DATABASE_NAME, migrateDatabase } from '../storage/database';
import { TabIcon, type TabIconName } from '../ui/components/TabIcon';
import { colors, fonts } from '../ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
// The app is portrait; only the full-screen camera may rotate to landscape.
ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

const Loading = (
  <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator color={colors.gold} />
  </View>
);

const icon =
  (name: TabIconName) =>
  ({ color }: { color: ColorValue }) => <TabIcon name={name} color={color} />;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Cinzel_500Medium, Cinzel_700Bold });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
      <GameProvider fallback={Loading}>
        <StatusBar style="light" />
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colors.background },
            tabBarStyle: { backgroundColor: colors.stone, borderTopColor: colors.goldDark },
            tabBarActiveTintColor: colors.goldLight,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: { fontFamily: fonts.title, fontSize: 10 },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Fight', tabBarIcon: icon('combat') }} />
          <Tabs.Screen name="character" options={{ title: 'Hero', tabBarIcon: icon('character') }} />
          <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: icon('shop') }} />
          <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: icon('calendar') }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
        </Tabs>
      </GameProvider>
    </SQLiteProvider>
  );
}
