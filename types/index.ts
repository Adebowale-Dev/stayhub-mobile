// User & Auth
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  matricNumber: string;
  email: string;
  role: string;
  gender?: string;
  department?: string | { _id: string; name: string; code: string };
  level?: string;
  phone?: string;
  theme?: 'light' | 'dark';
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
  availableSpaces: number;
  status: 'available' | 'full' | 'maintenance';
  gender: 'male' | 'female';
  price?: number;
}

// Reservation
export interface Reservation {
  _id: string;
  student: User;
  room: Room;
  hostel: Hostel;
  status: 'pending' | 'confirmed' | 'cancelled';
  groupMembers?: GroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  matricNumber: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

export interface ReservationRequest {
  roomId: string;
  groupMembers?: string[]; // matric numbers
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
  paymentStatus: 'pending' | 'paid' | 'failed';
  hasReservation: boolean;
  reservation?: Reservation;
  currentSession?: string;
}

// Alert / Reminder
export interface Alert {
  _id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  icon: string; // MaterialCommunityIcons name
  message: string;
}

// API Generic
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}
