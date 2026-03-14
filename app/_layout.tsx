import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { studentAPI } from '../services/api';
import {
  addNotificationResponseListener,
  configureForegroundNotifications,
  getLastNotificationResponseAsync,
  registerForPushNotificationsAsync,
} from '../services/pushNotifications';
import { toMobileNotificationRoute } from '../utils/notificationRoutes';

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(student)/dashboard');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

function PushNotificationBridge() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const handledNotificationId = useRef<string | null>(null);
  const pushEnabled = user?.notificationPreferences?.pushEnabled ?? true;

  useEffect(() => {
    configureForegroundNotifications();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    let cancelled = false;

    const syncPushRegistration = async () => {
      const result = await registerForPushNotificationsAsync(user.notificationPreferences);

      if (cancelled || result.status !== 'registered' || !result.token) {
        return;
      }

      try {
        await studentAPI.registerPushDevice({
          token: result.token,
          platform: result.platform || 'unknown',
          appOwnership: result.appOwnership ?? null,
          deviceName: result.deviceName ?? null,
          projectId: result.projectId ?? null,
        });
      } catch {
        // Keep auth flow resilient even if device registration fails.
      }
    };

    syncPushRegistration();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?._id, pushEnabled]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const navigateFromResponse = (response: any) => {
      const notificationId = String(response?.notification?.request?.identifier ?? '');
      if (notificationId && handledNotificationId.current === notificationId) {
        return;
      }

      handledNotificationId.current = notificationId || handledNotificationId.current;

      const destination = response?.notification?.request?.content?.data?.destination;
      if (typeof destination === 'string' && destination) {
        router.push(toMobileNotificationRoute(destination));
      }
    };

    const subscription = addNotificationResponseListener(navigateFromResponse);
    getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          navigateFromResponse(response);
        }
      })
      .catch(() => {
        // Ignore stale notification state errors on startup.
      });

    return () => {
      subscription?.remove?.();
    };
  }, [isAuthenticated, router]);

  return null;
}

export default function RootLayout() {
  const loadAuth = useAuthStore((state) => state.loadAuth);
  const isDark = useThemeStore((state) => state.isDark);
  const loadTheme = useThemeStore((state) => state.loadTheme);

  useEffect(() => {
    loadAuth();
    loadTheme();
  }, []);

  const paperTheme = isDark
    ? {
        ...MD3DarkTheme,
        colors: { ...MD3DarkTheme.colors, primary: '#42A5F5', secondary: '#0288D1' },
      }
    : {
        ...MD3LightTheme,
        colors: { ...MD3LightTheme.colors, primary: '#1565C0', secondary: '#0288D1' },
      };

  return (
    <PaperProvider theme={paperTheme}>
      <AuthGate />
      <PushNotificationBridge />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(student)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
