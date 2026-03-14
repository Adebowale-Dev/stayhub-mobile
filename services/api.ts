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
  InvitationHistoryEntry,
  StudentNotification,
  NotificationPreferences,
  NotificationSettings,
} from '../types';

const looksLikeMongoId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

const unwrapData = <T>(payload: any): T => payload?.data ?? payload;

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEscalationEnabled: true,
  invitationCreated: true,
  invitationUpdates: true,
  invitationExpired: true,
  paymentUpdates: true,
  reservationUpdates: true,
};

const normalizeNotificationPreferences = (preferences: any): NotificationPreferences =>
  Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).reduce((result, key) => {
    const typedKey = key as keyof NotificationPreferences;
    result[typedKey] =
      typeof preferences?.[typedKey] === 'boolean'
        ? preferences[typedKey]
        : DEFAULT_NOTIFICATION_PREFERENCES[typedKey];
    return result;
  }, { ...DEFAULT_NOTIFICATION_PREFERENCES });

const normalizeUser = (user: any) => {
  if (!user) return user;

  return {
    ...user,
    _id: user._id ?? user.id,
    matricNo: user.matricNo ?? user.matricNumber,
    matricNumber: user.matricNumber ?? user.matricNo,
    phone: user.phone ?? user.phoneNumber,
    phoneNumber: user.phoneNumber ?? user.phone,
    level: user.level != null ? String(user.level) : user.level,
    theme: user.theme === 'dark' ? 'dark' : user.theme === 'light' ? 'light' : undefined,
    notificationPreferences: normalizeNotificationPreferences(user.notificationPreferences),
  };
};

const normalizeRoom = (room: any): Room => {
  const currentOccupancy = room?.currentOccupancy ?? room?.currentOccupants ?? 0;
  const rawStatus = room?.status === 'partially_occupied' ? 'available' : room?.status;

  return {
    ...room,
    hostelId: room?.hostelId ?? room?.hostel?._id ?? room?.hostel ?? '',
    roomNumber: room?.roomNumber ?? room?.number ?? '',
    currentOccupancy,
    currentOccupants: room?.currentOccupants ?? currentOccupancy,
    availableSpaces:
      room?.availableSpaces ?? Math.max(0, (room?.capacity ?? 0) - currentOccupancy),
    status: rawStatus ?? 'available',
  };
};

const normalizeReservation = (reservation: any): Reservation => {
  const groupMembers = (reservation?.groupMembers ?? reservation?.roommates ?? []).map((member: any) => ({
    ...member,
    matricNumber: member?.matricNumber ?? member?.matricNo,
  }));

  const status = reservation?.status ?? reservation?.reservationStatus ?? 'pending';
  const createdAt = reservation?.createdAt ?? reservation?.reservedAt ?? reservation?.updatedAt;

  return {
    ...reservation,
    _id: reservation?._id ?? reservation?.student?._id,
    status,
    createdAt,
    updatedAt: reservation?.updatedAt ?? createdAt,
    student: normalizeUser(reservation?.student),
    room: normalizeRoom(reservation?.room ?? {}),
    groupMembers,
    reservedBy: normalizeUser(reservation?.reservedBy),
    approvalRequired: reservation?.approvalRequired ?? status === 'temporary',
  };
};

const normalizeInvitationHistoryEntry = (entry: any): InvitationHistoryEntry => ({
  ...entry,
  actor: normalizeUser(entry?.actor),
  relatedStudent: normalizeUser(entry?.relatedStudent),
  hostelName: entry?.hostelName ?? entry?.hostel?.name ?? null,
  roomNumber: entry?.roomNumber ?? entry?.room?.roomNumber ?? null,
  bunkNumber:
    entry?.bunkNumber != null
      ? String(entry.bunkNumber)
      : entry?.bunk?.bunkNumber != null
      ? String(entry.bunk.bunkNumber)
      : null,
});

const normalizeNotification = (notification: any): StudentNotification => ({
  ...notification,
  _id: String(notification?._id ?? ''),
  type: notification?.type ?? 'info',
  title: notification?.title,
  message: notification?.message ?? '',
  createdAt: notification?.createdAt,
  destination: notification?.destination,
  read: Boolean(notification?.read),
});

const normalizeNotificationSettings = (settings: any): NotificationSettings => {
  const devices = Array.isArray(settings?.devices)
    ? settings.devices.map((device: any) => ({
        tokenPreview: String(device?.tokenPreview ?? ''),
        platform: device?.platform ?? 'unknown',
        enabled: Boolean(device?.enabled),
        deviceName: device?.deviceName ?? null,
        appOwnership: device?.appOwnership ?? null,
        lastRegisteredAt: device?.lastRegisteredAt ?? null,
        lastSeenAt: device?.lastSeenAt ?? null,
      }))
    : [];

  return {
    preferences: normalizeNotificationPreferences(settings?.preferences ?? settings?.notificationPreferences),
    devices,
    registeredDevicesCount: Number(settings?.registeredDevicesCount ?? devices.length ?? 0),
    hasActiveDevice: Boolean(
      settings?.hasActiveDevice ?? devices.some((device: { enabled: boolean }) => device.enabled)
    ),
    lastRegisteredAt: settings?.lastRegisteredAt ?? devices[0]?.lastRegisteredAt ?? null,
    theme: settings?.theme === 'dark' ? 'dark' : settings?.theme === 'light' ? 'light' : undefined,
  };
};

const normalizeDashboard = (dashboard: any): DashboardData => ({
  ...dashboard,
  student: normalizeUser(dashboard?.student ?? dashboard?.profile),
  profile: normalizeUser(dashboard?.profile ?? dashboard?.student),
  paymentStatus: dashboard?.paymentStatus ?? 'pending',
  hasReservation:
    dashboard?.hasReservation ??
    ['temporary', 'confirmed', 'checked_in'].includes(dashboard?.reservationStatus),
  reservation: dashboard?.reservation ? normalizeReservation(dashboard.reservation) : undefined,
});

const normalizePaymentStatus = (status: any): PaymentStatus => {
  const normalizedStatus = String(status?.status ?? status?.paymentStatus ?? 'pending').toLowerCase();
  const mappedStatus =
    normalizedStatus === 'completed' || normalizedStatus === 'success'
      ? 'paid'
      : normalizedStatus;

  return {
    ...status,
    status: mappedStatus as PaymentStatus['status'],
    reference: status?.reference ?? status?.paymentReference,
    paidAt: status?.paidAt ?? status?.datePaid,
  };
};

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

  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword?: string }) =>
    api.post('/auth/change-password', {
      oldPassword: data.currentPassword,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      confirmPassword: data.confirmPassword ?? data.newPassword,
    }),
};

// ─── Student ─────────────────────────────────────────────────────────────────

export const studentAPI = {
  getDashboard: async () => {
    const response = await api.get<ApiResponse<DashboardData>>('/student/dashboard');
    const normalized = normalizeDashboard(unwrapData<any>(response.data));
    return {
      ...response,
      data: {
        ...response.data,
        data: normalized,
      },
    };
  },

  getProfile: async () => {
    const response = await api.get<ApiResponse<{ student: import('../types').User }>>('/auth/profile');
    const payload = response.data as any;
    const normalized = normalizeUser(payload?.user ?? payload?.data ?? payload);
    return {
      ...response,
      data: {
        ...payload,
        data: { student: normalized },
        student: normalized,
        user: normalized,
      },
    };
  },

  updateProfile: async (data: Partial<import('../types').User>) => {
    const payload: Record<string, unknown> = { ...data };

    if (payload.phone !== undefined && payload.phoneNumber === undefined) {
      payload.phoneNumber = payload.phone;
      delete payload.phone;
    }

    if (payload.department !== undefined && !looksLikeMongoId(payload.department)) {
      delete payload.department;
    }

    if (payload.level !== undefined && payload.level !== null && payload.level !== '') {
      payload.level = Number(payload.level);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'profilePicture') && payload.profilePicture === undefined) {
      payload.profilePicture = null;
    }

    const response = await api.put<ApiResponse<{ student: import('../types').User }>>('/auth/profile', payload);
    const body = response.data as any;
    const normalized = normalizeUser(body?.user ?? body?.data?.student ?? body?.data ?? body?.student);

    return {
      ...response,
      data: {
        ...body,
        data: { student: normalized },
        student: normalized,
        user: normalized,
      },
    };
  },

  getHostels: () =>
    api.get<ApiResponse<Hostel[]>>('/student/hostels'),

  getRooms: async (hostelId: string) => {
    const response = await api.get<ApiResponse<Room[]>>(`/student/hostels/${hostelId}/rooms`);
    const rooms = (unwrapData<any[]>(response.data) ?? []).map(normalizeRoom);
    return {
      ...response,
      data: {
        ...response.data,
        data: rooms,
      },
    };
  },

  reserveRoom: (data: ReservationRequest) =>
    api.post<ApiResponse<Reservation>>('/student/reservations', {
      roomId: data.roomId,
      hostelId: data.hostelId,
      friends: data.groupMembers,
      isGroupReservation: Boolean(data.groupMembers?.length),
    }),

  getReservation: async () => {
    const response = await api.get<ApiResponse<Reservation>>('/student/reservation');
    const normalized = normalizeReservation(unwrapData<any>(response.data));
    return {
      ...response,
      data: {
        ...response.data,
        data: normalized,
      },
    };
  },

  cancelReservation: (reservationId: string) =>
    api.delete(`/student/reservations/${reservationId}`),

  addGroupMembers: (_reservationId: string, matricNumbers: string[]) =>
    api.post<ApiResponse<Reservation>>('/student/reservation/members', { matrics: matricNumbers }),

  respondToInvitation: async (action: 'approve' | 'reject') => {
    const response = await api.post<ApiResponse<Reservation | null>>('/student/reservation/respond', { action });
    const payload = unwrapData<any>(response.data);

    return {
      ...response,
      data: {
        ...response.data,
        data: payload ? normalizeReservation(payload) : null,
      },
    };
  },

  getAlerts: () =>
    api.get<ApiResponse<Alert[]>>('/student/alerts'),

  getNotifications: async () => {
    const response = await api.get<ApiResponse<StudentNotification[]>>('/student/notifications');
    const payload = response.data as any;
    const notifications = (payload?.data ?? []).map(normalizeNotification);
    return {
      ...response,
      data: {
        ...payload,
        data: notifications,
        meta: payload?.meta ?? {
          unreadCount: notifications.filter((notification: StudentNotification) => !notification.read).length,
          total: notifications.length,
        },
      },
    };
  },

  markNotificationsRead: (payload: { ids?: string[]; markAll?: boolean }) =>
    api.post('/student/notifications/read', payload),

  getNotificationSettings: async () => {
    const response = await api.get<ApiResponse<NotificationSettings>>('/student/notifications/settings');
    const settings = normalizeNotificationSettings(unwrapData<any>(response.data));
    return {
      ...response,
      data: {
        ...response.data,
        data: settings,
      },
    };
  },

  updateNotificationPreferences: async (preferences: Partial<NotificationPreferences>) => {
    const response = await api.patch<ApiResponse<NotificationSettings>>(
      '/student/notifications/preferences',
      preferences
    );
    const settings = normalizeNotificationSettings(unwrapData<any>(response.data));
    return {
      ...response,
      data: {
        ...response.data,
        data: settings,
      },
    };
  },

  registerPushDevice: async (payload: {
    token: string;
    platform: string;
    appOwnership?: string | null;
    deviceName?: string | null;
    projectId?: string | null;
  }) => {
    const response = await api.post<ApiResponse<NotificationSettings>>('/student/notifications/devices', payload);
    const settings = normalizeNotificationSettings(unwrapData<any>(response.data));
    return {
      ...response,
      data: {
        ...response.data,
        data: settings,
      },
    };
  },

  unregisterPushDevice: (token: string) =>
    api.delete<ApiResponse<NotificationSettings>>('/student/notifications/devices', {
      data: { token },
    }),

  getInvitationHistory: async () => {
    const response = await api.get<ApiResponse<InvitationHistoryEntry[]>>('/student/invitations/history');
    const history = (unwrapData<any[]>(response.data) ?? []).map(normalizeInvitationHistoryEntry);
    return {
      ...response,
      data: {
        ...response.data,
        data: history,
      },
    };
  },

  uploadProfilePicture: async (formData: FormData) => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/student/profile/picture`,
      {
        method: 'POST',
        headers: {
          // Deliberately omit Content-Type — React Native's fetch sets
          // multipart/form-data with the correct boundary automatically.
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      }
    );
    let json: any;
    try {
      json = await response.json();
    } catch {
      // Server returned a non-JSON body (e.g. HTML error page)
      const err: any = new Error(`Server error ${response.status}`);
      err.response = { data: {}, status: response.status };
      throw err;
    }
    if (!response.ok) {
      const err: any = new Error(json?.message ?? `Server error ${response.status}`);
      err.response = { data: json, status: response.status };
      throw err;
    }
    const student = normalizeUser((json as any)?.data?.student ?? (json as any)?.student);
    return {
      data: {
        ...(json as any),
        data: { student },
        student,
      } as ApiResponse<{ student: import('../types').User }>,
    };
  },
};

// ─── Payment ──────────────────────────────────────────────────────────────────

export const paymentAPI = {
  getAmount: () =>
    api.get<ApiResponse<{ amount: number }>>('/student/payment/amount'),

  getStatus: async () => {
    const response = await api.get<ApiResponse<PaymentStatus>>('/student/payment/status');
    const normalized = normalizePaymentStatus(unwrapData<any>(response.data));
    return {
      ...response,
      data: {
        ...response.data,
        data: normalized,
      },
    };
  },

  initialize: (amount: number) =>
    api.post<ApiResponse<PaymentInitResponse>>('/student/payment/initialize', { amount }),

  verifyWithCode: (paymentCode: string) =>
    api.post<ApiResponse<PaymentStatus>>('/student/payment/verify-code', { paymentCode }),

  verifyReference: (reference: string) =>
    api.get<ApiResponse<PaymentStatus>>(`/student/payment/verify/${reference}`),
};

export default api;
