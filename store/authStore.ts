import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';
interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setAuth: (user: User, token: string) => Promise<void>;
    logout: () => Promise<void>;
    loadAuth: () => Promise<void>;
    updateUser: (user: Partial<User>) => void;
}
export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    setAuth: async (user, token) => {
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
    },
    logout: async () => {
        await AsyncStorage.multiRemove(['token', 'user']);
        set({ user: null, token: null, isAuthenticated: false });
    },
    loadAuth: async () => {
        try {
            const [token, userString] = await AsyncStorage.multiGet(['token', 'user']);
            const tokenValue = token[1];
            const userValue = userString[1];
            if (tokenValue && userValue) {
                set({ user: JSON.parse(userValue), token: tokenValue, isAuthenticated: true });
            }
        }
        catch {
        }
        finally {
            set({ isLoading: false });
        }
    },
    updateUser: (partial) => {
        const current = get().user;
        if (!current)
            return;
        const updated = { ...current, ...partial };
        set({ user: updated });
        AsyncStorage.setItem('user', JSON.stringify(updated));
    },
}));
