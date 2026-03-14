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
    department?: string | {
        _id: string;
        name: string;
        code: string;
    };
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
    inviteTracker?: ReservationInviteTrackerItem[];
}
export interface GroupMember {
    matricNumber: string;
    firstName?: string;
    lastName?: string;
    status?: string;
}
export interface ReservationInviteTrackerItem {
    student: Partial<User> | null;
    status: 'sent' | 'seen' | 'approved' | 'rejected' | 'expired';
    label: string;
    action?: 'invited' | 'viewed' | 'approved' | 'rejected' | 'expired';
    lastUpdatedAt?: string | null;
    message?: string;
    requiresPaymentBeforeApproval?: boolean;
    emailMasked?: string | null;
}
export interface InviteChannelSummary {
    available: boolean;
    willSend: boolean;
    addressMasked?: string | null;
    deviceCount?: number;
}
export interface ReservationInvitePreview {
    friend: {
        _id: string;
        firstName: string;
        lastName: string;
        matricNo: string;
        matricNumber?: string;
        email?: string;
        emailMasked?: string | null;
        gender?: string | null;
        level?: number | string | null;
        paymentStatus?: string;
        department?: string | {
            _id?: string;
            name?: string;
            code?: string;
        } | null;
    };
    room?: {
        _id: string;
        roomNumber: string;
        floor?: number;
        capacity: number;
        currentOccupants?: number;
        availableSpaces?: number;
    } | null;
    hostel?: {
        _id: string;
        name: string;
        code?: string;
        gender?: string;
        level?: number;
    } | null;
    eligibility: {
        canInvite: boolean;
        reason?: string | null;
        code?: string;
    };
    invitation: {
        approvalWindowHours: number;
        requiresPaymentBeforeApproval: boolean;
        notificationChannels: {
            email: InviteChannelSummary;
            inApp: InviteChannelSummary;
            push: InviteChannelSummary;
        };
    };
}
export interface ReservationRequest {
    roomId: string;
    hostelId?: string;
    groupMembers?: string[];
}
export interface InvitationHistoryEntry {
    _id?: string;
    action: 'invited' | 'viewed' | 'approved' | 'rejected' | 'expired';
    role: 'inviter' | 'invitee';
    notes?: string | null;
    createdAt?: string;
    hostelName?: string | null;
    roomNumber?: string | null;
    bunkNumber?: string | null;
    actor?: Partial<User> | null;
    relatedStudent?: Partial<User> | null;
}
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
export interface DashboardData {
    student: User;
    profile?: User;
    paymentStatus: 'pending' | 'paid' | 'failed';
    hasReservation: boolean;
    availableHostels?: number;
    reservation?: Reservation;
    currentSession?: string;
    reservationStatus?: string;
}
export interface Alert {
    _id: string;
    type: 'warning' | 'info' | 'error' | 'success';
    icon: string;
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
export interface ApiResponse<T> {
    data: T;
    message?: string;
    success?: boolean;
}
