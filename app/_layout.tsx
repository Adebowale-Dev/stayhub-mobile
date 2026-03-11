import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useRouter, useSegments } from 'expo-router';

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(student)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
