import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import type {
  AuthResponse,
  DashboardData,
  Hostel,
  Room,
  Reservation,
  ReservationRequest,
  PaymentStatus,
  PaymentInitResponse,
  ApiResponse,
  Alert,
} from '../types';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user']);
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (data: { matricNumber: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

// ─── Student ─────────────────────────────────────────────────────────────────

export const studentAPI = {
  getDashboard: () =>
    api.get<ApiResponse<DashboardData>>('/student/dashboard'),

  getProfile: () =>
    api.get<ApiResponse<{ student: import('../types').User }>>('/student/profile'),

  updateProfile: (data: Partial<import('../types').User>) =>
    api.put<ApiResponse<{ student: import('../types').User }>>('/student/profile', data),

  getHostels: () =>
    api.get<ApiResponse<Hostel[]>>('/student/hostels'),

  getRooms: (hostelId: string) =>
    api.get<ApiResponse<Room[]>>(`/student/hostels/${hostelId}/rooms`),

  reserveRoom: (data: ReservationRequest) =>
    api.post<ApiResponse<Reservation>>('/student/reservations', data),

  getReservation: () =>
    api.get<ApiResponse<Reservation>>('/student/reservation'),

  cancelReservation: (reservationId: string) =>
    api.delete(`/student/reservations/${reservationId}`),

  getAlerts: () =>
    api.get<ApiResponse<Alert[]>>('/student/alerts'),
};

// ─── Payment ──────────────────────────────────────────────────────────────────

export const paymentAPI = {
  getAmount: () =>
    api.get<ApiResponse<{ amount: number }>>('/student/payment/amount'),

  getStatus: () =>
    api.get<ApiResponse<PaymentStatus>>('/student/payment/status'),

  initialize: (amount: number) =>
    api.post<ApiResponse<PaymentInitResponse>>('/student/payment/initialize', { amount }),

  verifyWithCode: (paymentCode: string) =>
    api.post<ApiResponse<PaymentStatus>>('/student/payment/verify-code', { paymentCode }),

  verifyReference: (reference: string) =>
    api.post<ApiResponse<PaymentStatus>>('/student/payment/verify', { reference }),
};

export default api;
