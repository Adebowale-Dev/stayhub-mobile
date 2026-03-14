// User & Auth
export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEscalationEnabled: boolean;
  invitationCreated: boolean;
  invitationUpdates: boolean;
  invitationExpired: boolean;
  paymentUpdates: boolean;
  reservationUpdates: boolean;
}

export interface NotificationDeviceSummary {
  tokenPreview: string;
  platform: 'android' | 'ios' | 'web' | 'unknown';
  enabled: boolean;
  deviceName?: string | null;
  appOwnership?: string | null;
  lastRegisteredAt?: string | null;
  lastSeenAt?: string | null;
}

export interface NotificationSettings {
  preferences: NotificationPreferences;
  devices: NotificationDeviceSummary[];
  registeredDevicesCount: number;
  hasActiveDevice: boolean;
  lastRegisteredAt?: string | null;
  theme?: 'light' | 'dark';
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  matricNumber: string;
  matricNo?: string;
  email: string;
  role: string;
  gender?: string;
  department?: string | { _id: string; name: string; code: string };
  level?: string;
  phone?: string;
  phoneNumber?: string;
  theme?: 'light' | 'dark';
  profilePicture?: string | null;
  notificationPreferences?: NotificationPreferences;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

// Hostel
export interface Hostel {
  _id: string;
  name: string;
  gender: 'male' | 'female';
  description?: string;
  image?: string;
  totalRooms: number;
  availableRooms: number;
  amenities?: string[];
}

// Room
export interface Room {
  _id: string;
  hostelId: string;
  roomNumber: string;
  capacity: number;
  currentOccupancy: number;
  currentOccupants?: number;
  availableSpaces: number;
  status: 'available' | 'full' | 'maintenance' | 'partially_occupied';
  gender: 'male' | 'female';
  price?: number;
}

// Reservation
export interface Reservation {
  _id: string;
  student: User;
  room: Room;
  hostel: Hostel;
  status: 'pending' | 'temporary' | 'confirmed' | 'cancelled' | 'checked_in' | 'expired';
  groupMembers?: GroupMember[];
  reservedBy?: Partial<User> | null;
  approvalRequired?: boolean;
  createdAt: string;
  updatedAt: string;
  reservedAt?: string;
  expiresAt?: string;
  invitationHistory?: InvitationHistoryEntry[];
}

export interface GroupMember {
  matricNumber: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

export interface ReservationRequest {
  roomId: string;
  hostelId?: string;
  groupMembers?: string[]; // matric numbers
}

export interface InvitationHistoryEntry {
  _id?: string;
  action: 'invited' | 'approved' | 'rejected' | 'expired';
  role: 'inviter' | 'invitee';
  notes?: string | null;
  createdAt?: string;
  hostelName?: string | null;
  roomNumber?: string | null;
  bunkNumber?: string | null;
  actor?: Partial<User> | null;
  relatedStudent?: Partial<User> | null;
}

// Payment
export interface PaymentStatus {
  status: 'pending' | 'paid' | 'failed';
  amount?: number;
  reference?: string;
  paidAt?: string;
}

export interface PaymentInitResponse {
  amount: number;
  reference: string;
  accessCode?: string;
  authorizationUrl?: string;
}

// Dashboard
export interface DashboardData {
  student: User;
  profile?: User;
  paymentStatus: 'pending' | 'paid' | 'failed';
  hasReservation: boolean;
  reservation?: Reservation;
  currentSession?: string;
  reservationStatus?: string;
}

// Alert / Reminder
export interface Alert {
  _id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  icon: string; // MaterialCommunityIcons name
  message: string;
  createdAt?: string;
}

export interface StudentNotification {
  _id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  icon?: string;
  title?: string;
  message: string;
  createdAt?: string;
  destination?: string;
  read?: boolean;
}

// API Generic
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}
