import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { DragContextProvider } from '@/context/DragContext';
import { LocalMatchStorage } from '@/services/LocalMatchStorage';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    // Initialiser la BD une seule fois au démarrage
    LocalMatchStorage.initializeDatabase().catch(error => {
      console.error('[ROOT-LAYOUT] Failed to initialize database:', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DragContextProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </DragContextProvider>
    </GestureHandlerRootView>
  );
}
