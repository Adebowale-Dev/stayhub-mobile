import Constants from 'expo-constants';

type ExpoExtraConfig = {
  apiBaseUrl?: string;
  paystackPublicKey?: string;
  eas?: {
    projectId?: string | null;
  };
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtraConfig;
const fallbackApiBaseUrl = 'http://172.20.10.3:5000/api';
const fallbackPaystackKey = 'pk_test_f5ab1691491857e39c3ca1221d7e8d5680317b13';

export const API_CONFIG = {
  BASE_URL: extra.apiBaseUrl || fallbackApiBaseUrl,
  TIMEOUT: 120000,
};

export const PAYSTACK_CONFIG = {
  PUBLIC_KEY: extra.paystackPublicKey || fallbackPaystackKey,
};

export const APP_CONFIG = {
  APP_NAME: Constants.expoConfig?.name || 'StayHub',
  VERSION: Constants.expoConfig?.version || '1.0.0',
  EAS_PROJECT_ID: extra.eas?.projectId || '',
};
