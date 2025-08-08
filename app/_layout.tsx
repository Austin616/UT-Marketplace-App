import '../global.css';
import 'expo-dev-client';
import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Icon } from '@roninoss/icons';

import { ActionSheetProvider } from '@expo/react-native-action-sheet';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { Link, Stack, Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, View } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { cn } from '~/lib/cn';
import { useColorScheme, useInitialAndroidBarSync } from '~/lib/useColorScheme';
import { NAV_THEME } from '~/theme';
import Header from "~/components/Header";
import TabBar from "~/components/TabBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { NotificationSyncProvider } from '../contexts/NotificationSyncContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { Slot } from 'expo-router';
import { useEffect } from 'react';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

function InitialLayout() {
  const router = useRouter();

  useEffect(() => {
    // Start with the auth flow
    router.replace('/(auth)/login');
  }, []);

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1" edges={['top']}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="create" />
        </Stack>
      </SafeAreaView>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationSyncProvider>
        <NotificationProvider>
          <SettingsProvider>
            <View className="flex-1">
              <SafeAreaView className="flex-1" edges={['top']}>
                <Stack 
                  screenOptions={{ 
                    headerShown: false,
                  }}
                >
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen 
                    name="(tabs)" 
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen 
                    name="(modals)" 
                    options={{ 
                      headerShown: false,
                      presentation: 'modal',
                    }} 
                  />
                </Stack>
              </SafeAreaView>
            </View>
          </SettingsProvider>
        </NotificationProvider>
      </NotificationSyncProvider>
    </AuthProvider>
  );
}

const SCREEN_OPTIONS = {
  animation: 'ios_from_right', // for android
} as const;

const INDEX_OPTIONS = {
  headerLargeTitle: true,
  title: 'NativeWindUI',
  headerRight: () => <SettingsIcon />,
} as const;

function SettingsIcon() {
  const { colors } = useColorScheme();
  return (
    <Link href="/(modals)/settings" asChild>
      <Pressable className="opacity-80">
        {({ pressed }) => (
          <View className={cn(pressed ? 'opacity-50' : 'opacity-90')}>
            <Icon name="cog-outline" color={colors.foreground} />
          </View>
        )}
      </Pressable>
    </Link>
  );
}
