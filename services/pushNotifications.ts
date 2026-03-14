import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { NotificationPreferences } from '../types';

const PUSH_TOKEN_STORAGE_KEY = 'stayhub_push_token';
type NotificationsModule = typeof import('expo-notifications');

let handlerConfigured = false;

export interface PushRegistrationResult {
  status: 'registered' | 'disabled' | 'unsupported' | 'denied' | 'error';
  token?: string;
  platform?: string;
  appOwnership?: string | null;
  deviceName?: string | null;
  projectId?: string | null;
  message?: string;
}

const isNativePushPlatform = Platform.OS === 'android' || Platform.OS === 'ios';
const isExpoGo = Constants.appOwnership === 'expo';

export const getPushNotificationsUnavailableReason = () => {
  if (!isNativePushPlatform) {
    return 'Push notifications are not supported on this platform.';
  }

  if (isExpoGo) {
    return 'Push notifications are not available in Expo Go. Use a development build instead.';
  }

  return null;
};

export const isPushNotificationsSupported = () =>
  isNativePushPlatform && !isExpoGo;

const getNotificationsModule = (): NotificationsModule | null => {
  if (!isPushNotificationsSupported()) {
    return null;
  }

  try {
    // Metro supports static require strings here, and this keeps Expo Go from
    // evaluating expo-notifications at app startup.
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
};

export const configureForegroundNotifications = () => {
  const Notifications = getNotificationsModule();
  if (!Notifications || handlerConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  handlerConfigured = true;
};

export const getStoredPushToken = async () => AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);

export const clearStoredPushToken = async () => {
  await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
};

export const registerForPushNotificationsAsync = async (
  preferences?: Partial<NotificationPreferences>
): Promise<PushRegistrationResult> => {
  const Notifications = getNotificationsModule();

  if (!Notifications) {
    return {
      status: 'unsupported',
      message:
        getPushNotificationsUnavailableReason() ??
        'Push notifications are not available in this build.',
    };
  }

  if (preferences?.pushEnabled === false) {
    return {
      status: 'disabled',
      message: 'Push notifications are turned off in your settings.',
    };
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('stayhub-alerts', {
        name: 'StayHub Alerts',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1565C0',
      });
    }

    const permissions = await Notifications.getPermissionsAsync();
    let finalStatus = permissions.status;

    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      return {
        status: 'denied',
        message: 'Notification permission was not granted on this device.',
      };
    }

    const projectId =
      Constants?.easConfig?.projectId ??
      Constants?.expoConfig?.extra?.eas?.projectId ??
      null;
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse?.data;

    if (!token) {
      return {
        status: 'error',
        message: 'Unable to generate an Expo push token for this device.',
      };
    }

    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

    return {
      status: 'registered',
      token,
      platform: Platform.OS,
      appOwnership: Constants.appOwnership ?? null,
      deviceName: Constants.deviceName ?? null,
      projectId,
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error?.message ?? 'Failed to register for push notifications.',
    };
  }
};

export const unregisterStoredPushTokenAsync = async (
  unregisterer?: (token: string) => Promise<unknown>
) => {
  const token = await getStoredPushToken();
  if (!token) return false;

  try {
    if (unregisterer) {
      await unregisterer(token);
    }
  } finally {
    await clearStoredPushToken();
  }

  return true;
};

export const addNotificationResponseListener = (
  listener: (response: any) => void
) => {
  const Notifications = getNotificationsModule();
  return Notifications?.addNotificationResponseReceivedListener?.(listener) ?? null;
};

export const getLastNotificationResponseAsync = async () => {
  const Notifications = getNotificationsModule();
  if (!Notifications?.getLastNotificationResponseAsync) return null;
  return Notifications.getLastNotificationResponseAsync();
};
