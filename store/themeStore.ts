import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
interface ThemeState {
    isDark: boolean;
    setTheme: (isDark: boolean) => Promise<void>;
    loadTheme: () => Promise<void>;
}
export const useThemeStore = create<ThemeState>((set) => ({
    isDark: false,
    setTheme: async (isDark) => {
        set({ isDark });
        await AsyncStorage.setItem('app_theme', isDark ? 'dark' : 'light');
    },
    loadTheme: async () => {
        try {
            const saved = await AsyncStorage.getItem('app_theme');
            if (saved)
                set({ isDark: saved === 'dark' });
        }
        catch { }
    },
}));
