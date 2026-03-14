import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Divider, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { studentAPI } from '../../services/api';
import type { GroupMember, InvitationHistoryEntry, Reservation, ReservationInviteTrackerItem } from '../../types';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Tone = {
    label: string;
    color: string;
    backgroundColor: string;
    icon: IconName;
};

const RESERVATION_STATUS_META: Record<Reservation['status'], Tone> = {
    temporary: {
        label: 'Invite pending',
        color: '#F57C00',
        backgroundColor: '#FFF3E0',
        icon: 'clock-outline',
    },
    confirmed: {
        label: 'Confirmed',
        color: '#2E7D32',
        backgroundColor: '#E8F5E9',
        icon: 'check-circle-outline',
    },
    pending: {
        label: 'Pending',
        color: '#EF6C00',
        backgroundColor: '#FFF3E0',
        icon: 'progress-clock',
    },
    cancelled: {
        label: 'Cancelled',
        color: '#C62828',
        backgroundColor: '#FFEBEE',
        icon: 'close-circle-outline',
    },
    checked_in: {
        label: 'Checked in',
        color: '#1565C0',
        backgroundColor: '#E3F2FD',
        icon: 'home-city-outline',
    },
    expired: {
        label: 'Expired',
        color: '#6D4C41',
        backgroundColor: '#EFEBE9',
        icon: 'timer-off-outline',
    },
};

const MEMBER_STATUS_META: Record<string, Tone> = {
    approved: {
        label: 'Approved',
        color: '#2E7D32',
        backgroundColor: '#E8F5E9',
        icon: 'check-circle-outline',
    },
    confirmed: {
        label: 'Confirmed',
        color: '#2E7D32',
        backgroundColor: '#E8F5E9',
        icon: 'check-circle-outline',
    },
    invited: {
        label: 'Invited',
        color: '#EF6C00',
        backgroundColor: '#FFF3E0',
        icon: 'email-fast-outline',
    },
    temporary: {
        label: 'Awaiting approval',
        color: '#F57C00',
        backgroundColor: '#FFF3E0',
        icon: 'clock-outline',
    },
    pending: {
        label: 'Pending',
        color: '#EF6C00',
        backgroundColor: '#FFF3E0',
        icon: 'progress-clock',
    },
    rejected: {
        label: 'Rejected',
        color: '#C62828',
        backgroundColor: '#FFEBEE',
        icon: 'close-circle-outline',
    },
    expired: {
        label: 'Expired',
        color: '#6D4C41',
        backgroundColor: '#EFEBE9',
        icon: 'timer-off-outline',
    },
};

function formatDateLabel(value?: string | null) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatDateTimeLabel(value?: string | null) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getInitials(firstName?: string, lastName?: string, fallback = 'SH') {
    const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim();
    return initials || fallback;
}

export default function ReservationScreen() {
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [invitationHistory, setInvitationHistory] = useState<InvitationHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [responding, setResponding] = useState<'approve' | 'reject' | null>(null);
    const [actionFeedback, setActionFeedback] = useState<{
        tone: 'success' | 'info';
        message: string;
    } | null>(null);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newMatrics, setNewMatrics] = useState<string[]>(['']);
    const [addingMembers, setAddingMembers] = useState(false);
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const load = async () => {
        try {
            const [reservationRes, historyRes] = await Promise.allSettled([
                studentAPI.getReservation(),
                studentAPI.getInvitationHistory(),
            ]);

            if (reservationRes.status === 'fulfilled') {
                setReservation((reservationRes.value.data as any).data ?? reservationRes.value.data ?? null);
            }
            else {
                setReservation(null);
            }

            if (historyRes.status === 'fulfilled') {
                const historyData = (historyRes.value.data as any).data ?? historyRes.value.data ?? [];
                setInvitationHistory(Array.isArray(historyData) ? historyData : []);
            }
            else {
                setInvitationHistory([]);
            }
        }
        catch {
            setReservation(null);
            setInvitationHistory([]);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    const handleCancel = () => {
        if (!reservation) {
            return;
        }

        if (reservation.status === 'temporary') {
            handleInvitationResponse('reject');
            return;
        }

        Alert.alert('Cancel Reservation', 'Are you sure you want to cancel this reservation? This cannot be undone.', [
            { text: 'Keep it', style: 'cancel' },
            {
                text: 'Cancel room',
                style: 'destructive',
                onPress: async () => {
                    setCancelling(true);
                    try {
                        await studentAPI.cancelReservation(reservation._id);
                        Alert.alert('Cancelled', 'Your reservation has been cancelled.');
                        setReservation(null);
                    }
                    catch (error: any) {
                        Alert.alert('Error', error.response?.data?.message ?? 'Failed to cancel reservation.');
                    }
                    finally {
                        setCancelling(false);
                    }
                },
            },
        ]);
    };

    const handleInvitationResponse = (action: 'approve' | 'reject') => {
        const title = action === 'approve' ? 'Approve Room Invitation' : 'Reject Room Invitation';
        const message = action === 'approve'
            ? 'Approve this room once your payment or network issue has been resolved.'
            : 'Rejecting this invite will release the space for another student. Continue?';

        Alert.alert(title, message, [
            { text: 'Not now', style: 'cancel' },
            {
                text: action === 'approve' ? 'Approve room' : 'Reject invite',
                style: action === 'approve' ? 'default' : 'destructive',
                onPress: async () => {
                    setResponding(action);
                    try {
                        await studentAPI.respondToInvitation(action);
                        Alert.alert(
                            action === 'approve' ? 'Approved' : 'Rejected',
                            action === 'approve'
                                ? 'Your room invitation has been approved successfully. Your bed space is now confirmed. Proceed to porter check-in when the check-in window opens.'
                                : 'The room invitation has been rejected and the space released.',
                        );
                        setActionFeedback({
                            tone: action === 'approve' ? 'success' : 'info',
                            message: action === 'approve'
                                ? 'Your bed space is now confirmed. Go to your hostel porter desk when check-in opens so the porter can complete your check-in.'
                                : 'Invitation rejected. The room space has been released for another student.',
                        });
                        await load();
                    }
                    catch (error: any) {
                        Alert.alert('Error', error.response?.data?.message ?? 'Failed to update the room invitation.');
                    }
                    finally {
                        setResponding(null);
                    }
                },
            },
        ]);
    };

    const openAddModal = () => {
        setNewMatrics(['']);
        setAddModalVisible(true);
    };

    const updateMatric = (index: number, value: string) => {
        const updated = [...newMatrics];
        updated[index] = value.toUpperCase();
        setNewMatrics(updated);
    };

    const addMatricField = () => {
        const maxNew = reservation?.room?.availableSpaces ?? 0;
        if (newMatrics.length < maxNew) {
            setNewMatrics([...newMatrics, '']);
        }
    };

    const removeMatricField = (index: number) => {
        if (newMatrics.length === 1) {
            setNewMatrics(['']);
            return;
        }

        setNewMatrics(newMatrics.filter((_, currentIndex) => currentIndex !== index));
    };

    const handleAddMembers = async () => {
        if (!reservation) {
            return;
        }

        const filled = newMatrics.map((matric) => matric.trim()).filter(Boolean);

        if (filled.length === 0) {
            Alert.alert('Empty', 'Enter at least one matric number.');
            return;
        }

        if (new Set(filled).size !== filled.length) {
            Alert.alert('Duplicate entry', 'Each matric number must be unique.');
            return;
        }

        const existingMatrics = [
            reservation.student?.matricNumber,
            ...(reservation.groupMembers?.map((member) => member.matricNumber) ?? []),
        ].filter(Boolean);
        const alreadyInRoom = filled.find((matric) => existingMatrics.includes(matric));

        if (alreadyInRoom) {
            Alert.alert('Already added', `${alreadyInRoom} is already part of this reservation.`);
            return;
        }

        setAddingMembers(true);
        try {
            await studentAPI.addGroupMembers(reservation._id, filled);
            setAddModalVisible(false);
            Alert.alert('Success', `${filled.length} friend${filled.length > 1 ? 's' : ''} added to your room.`);
            await load();
        }
        catch (error: any) {
            Alert.alert('Error', error.response?.data?.message ?? 'Failed to add friends. Please try again.');
        }
        finally {
            setAddingMembers(false);
        }
    };

    const getHistoryParticipantName = (
        person?: InvitationHistoryEntry['relatedStudent'] | InvitationHistoryEntry['actor'],
        fallback = 'A student',
    ) => {
        if (!person) {
            return fallback;
        }

        const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
        return fullName || person.matricNo || person.matricNumber || fallback;
    };

    const getHistoryLocation = (entry: InvitationHistoryEntry) => {
        if (entry.roomNumber && entry.hostelName) {
            return `Room ${entry.roomNumber}, ${entry.hostelName}`;
        }

        if (entry.roomNumber) {
            return `Room ${entry.roomNumber}`;
        }

        return entry.hostelName || 'Reserved room';
    };

    const getHistoryMeta = (entry: InvitationHistoryEntry): Tone => {
        if (entry.action === 'viewed') {
            return {
                label: 'Seen',
                color: '#1565C0',
                backgroundColor: '#E3F2FD',
                icon: 'eye-outline',
            };
        }
        if (entry.action === 'approved') {
            return {
                label: 'Approved',
                color: '#2E7D32',
                backgroundColor: '#E8F5E9',
                icon: 'check-circle-outline',
            };
        }

        if (entry.action === 'rejected') {
            return {
                label: 'Rejected',
                color: '#C62828',
                backgroundColor: '#FFEBEE',
                icon: 'close-circle-outline',
            };
        }

        if (entry.action === 'expired') {
            return {
                label: 'Expired',
                color: '#6D4C41',
                backgroundColor: '#EFEBE9',
                icon: 'timer-off-outline',
            };
        }

        return {
            label: 'Pending',
            color: '#EF6C00',
            backgroundColor: '#FFF3E0',
            icon: 'clock-outline',
        };
    };

    const getHistoryTitle = (entry: InvitationHistoryEntry) => {
        const otherPerson = getHistoryParticipantName(entry.relatedStudent || entry.actor);

        if (entry.action === 'invited' && entry.role === 'inviter') {
            return `You invited ${otherPerson}`;
        }

        if (entry.action === 'invited' && entry.role === 'invitee') {
            return `${otherPerson} reserved a room for you`;
        }

        if (entry.action === 'viewed' && entry.role === 'inviter') {
            return `${otherPerson} opened your invitation`;
        }

        if (entry.action === 'viewed' && entry.role === 'invitee') {
            return 'You opened the reserved room invitation';
        }

        if (entry.action === 'approved' && entry.role === 'inviter') {
            return `${otherPerson} approved your invitation`;
        }

        if (entry.action === 'approved' && entry.role === 'invitee') {
            return 'You approved the reserved room';
        }

        if (entry.action === 'rejected' && entry.role === 'inviter') {
            return `${otherPerson} rejected your invitation`;
        }

        if (entry.action === 'rejected' && entry.role === 'invitee') {
            return 'You rejected the reserved room';
        }

        if (entry.action === 'expired' && entry.role === 'inviter') {
            return `${otherPerson}'s invitation expired`;
        }

        return 'Your room invitation expired';
    };

    const getHistoryDescription = (entry: InvitationHistoryEntry) => {
        const parts = [getHistoryLocation(entry)];

        if (entry.bunkNumber) {
            parts.push(`Bunk ${entry.bunkNumber}`);
        }

        if (entry.notes) {
            parts.push(entry.notes);
        }

        return parts.filter(Boolean).join(' | ');
    };

    const renderHistoryCard = () => {
        if (invitationHistory.length === 0) {
            return null;
        }

        return (
            <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.panelHeader}>
                    <View>
                        <Text style={[styles.panelEyebrow, { color: theme.colors.onSurfaceVariant }]}>Timeline</Text>
                        <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Invitation history</Text>
                    </View>
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerBadgeText}>{invitationHistory.length}</Text>
                    </View>
                </View>

                <Divider style={{ backgroundColor: theme.colors.surfaceVariant }} />

                <View style={styles.timelineList}>
                    {invitationHistory.slice(0, 8).map((entry, index) => {
                        const meta = getHistoryMeta(entry);
                        const isLast = index === Math.min(invitationHistory.length, 8) - 1;

                        return (
                            <View key={entry._id ?? `${entry.action}-${entry.role}-${index}`} style={styles.timelineItem}>
                                <View style={styles.timelineRail}>
                                    <View style={[styles.timelineIconBox, { backgroundColor: meta.backgroundColor }]}>
                                        <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
                                    </View>
                                    {!isLast ? <View style={[styles.timelineLine, { backgroundColor: theme.colors.surfaceVariant }]} /> : null}
                                </View>

                                <View style={styles.timelineBody}>
                                    <View style={styles.timelineHeader}>
                                        <Text style={[styles.timelineTitle, { color: theme.colors.onSurface }]}>
                                            {getHistoryTitle(entry)}
                                        </Text>
                                        <View style={[styles.statusPill, { backgroundColor: meta.backgroundColor }]}>
                                            <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.timelineDescription, { color: theme.colors.onSurfaceVariant }]}>
                                        {getHistoryDescription(entry)}
                                    </Text>
                                    <Text style={[styles.timelineTimestamp, { color: theme.colors.onSurfaceVariant }]}>
                                        {formatDateTimeLabel(entry.createdAt)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };
    const getTrackerTone = (status?: ReservationInviteTrackerItem['status']): Tone => {
        if (status === 'seen') {
            return {
                label: 'Seen',
                color: '#1565C0',
                backgroundColor: '#E3F2FD',
                icon: 'eye-outline',
            };
        }
        if (status === 'approved') {
            return {
                label: 'Approved',
                color: '#2E7D32',
                backgroundColor: '#E8F5E9',
                icon: 'check-circle-outline',
            };
        }
        if (status === 'rejected') {
            return {
                label: 'Rejected',
                color: '#C62828',
                backgroundColor: '#FFEBEE',
                icon: 'close-circle-outline',
            };
        }
        if (status === 'expired') {
            return {
                label: 'Expired',
                color: '#6D4C41',
                backgroundColor: '#EFEBE9',
                icon: 'timer-off-outline',
            };
        }
        return {
            label: 'Sent',
            color: '#EF6C00',
            backgroundColor: '#FFF3E0',
            icon: 'email-fast-outline',
        };
    };
    const renderInviteTrackerCard = () => {
        const tracker = reservation?.inviteTracker ?? [];
        if (tracker.length === 0) {
            return null;
        }
        return (
            <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.panelHeader}>
                    <View>
                        <Text style={[styles.panelEyebrow, { color: theme.colors.onSurfaceVariant }]}>Tracker</Text>
                        <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Friend invite tracker</Text>
                    </View>
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerBadgeText}>{tracker.length}</Text>
                    </View>
                </View>

                <Divider style={{ backgroundColor: theme.colors.surfaceVariant }} />

                <View style={styles.trackerList}>
                    {tracker.map((item, index) => {
                        const tone = getTrackerTone(item.status);
                        const studentName = getHistoryParticipantName(item.student, 'Invited friend');
                        const subtitle = [
                            item.student?.matricNo || item.student?.matricNumber || 'Matric unavailable',
                            item.emailMasked || null,
                            item.lastUpdatedAt ? `Updated ${formatDateTimeLabel(item.lastUpdatedAt)}` : null,
                        ]
                            .filter(Boolean)
                            .join(' | ');

                        return (
                            <View key={item.student?._id ?? `${item.status}-${index}`} style={styles.memberSpacer}>
                                {renderMemberCard(
                                    studentName,
                                    subtitle,
                                    tone,
                                    getInitials(item.student?.firstName, item.student?.lastName, 'FR'),
                                    tone.color,
                                )}
                                <Text style={[styles.trackerMessage, { color: theme.colors.onSurfaceVariant }]}>
                                    {item.message || 'Invite created and waiting for a response.'}
                                </Text>
                                {item.requiresPaymentBeforeApproval &&
                                item.status !== 'approved' &&
                                item.status !== 'rejected' &&
                                item.status !== 'expired' ? (
                                    <View style={styles.previewWarningRow}>
                                        <MaterialCommunityIcons name="credit-card-clock-outline" size={16} color="#EF6C00" />
                                        <Text style={styles.previewWarningText}>Payment is still pending for this friend, so approval can only happen after payment.</Text>
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderMemberCard = (
        name: string,
        subtitle: string,
        tone: Tone,
        initials: string,
        highlightColor: string,
    ) => (
        <View style={[styles.memberCard, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.memberAvatar, { backgroundColor: highlightColor }]}>
                <Text style={styles.memberAvatarText}>{initials}</Text>
            </View>
            <View style={styles.memberCopy}>
                <Text style={[styles.memberName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {name}
                </Text>
                <Text style={[styles.memberSubtitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                    {subtitle}
                </Text>
            </View>
            <View style={[styles.memberChip, { backgroundColor: tone.backgroundColor }]}>
                <Text style={[styles.memberChipText, { color: tone.color }]}>{tone.label}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.loadingScreen, { backgroundColor: theme.colors.background }]}>
                <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
                <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
                    <View style={styles.bubbleLarge} />
                    <View style={styles.bubbleSmall} />
                    <View style={styles.bubbleMid} />
                </View>
                <View style={styles.loadingBody}>
                    <ActivityIndicator size="large" color="#1565C0" />
                </View>
            </View>
        );
    }

    if (!reservation) {
        return (
            <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
                <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" colors={['#1565C0']} />}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
                        <View style={styles.bubbleLarge} />
                        <View style={styles.bubbleSmall} />
                        <View style={styles.bubbleMid} />
                        <Text style={styles.heroEyebrow}>My reservation</Text>
                        <Text style={styles.heroTitle}>No room reserved yet</Text>
                        <Text style={styles.heroCopy}>
                            Browse hostels, compare available rooms, and reserve the best space before it fills up.
                        </Text>
                        <TouchableOpacity style={styles.heroButton} activeOpacity={0.85} onPress={() => router.push('/(student)/hostels')}>
                            <MaterialCommunityIcons name="home-search-outline" size={18} color="#1565C0" />
                            <Text style={styles.heroButtonText}>Browse hostels</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <View style={[styles.emptyPanel, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.emptyIconWrap}>
                                <MaterialCommunityIcons name="bed-empty" size={34} color="#1565C0" />
                            </View>
                            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Nothing reserved yet</Text>
                            <Text style={[styles.emptyCopy, { color: theme.colors.onSurfaceVariant }]}>
                                When you reserve a room or receive an invite from a friend, it will show up here.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.section}>{renderHistoryCard()}</View>
                </ScrollView>
            </View>
        );
    }

    const statusMeta = RESERVATION_STATUS_META[reservation.status] ?? RESERVATION_STATUS_META.pending;
    const availableSpaces = reservation.room?.availableSpaces ?? 0;
    const isTemporaryInvite = reservation.status === 'temporary';
    const reservedByName = reservation.reservedBy
        ? `${reservation.reservedBy.firstName ?? ''} ${reservation.reservedBy.lastName ?? ''}`.trim()
        : 'A friend';
    const isReservationOwner =
        !reservation.reservedBy ||
        reservation.reservedBy._id === reservation.student?._id ||
        !isTemporaryInvite;
    const isFriendReservedRoom =
        Boolean(reservation.reservedBy?._id && reservation.reservedBy._id !== reservation.student?._id);
    const canAddFriends = reservation.status === 'confirmed' && availableSpaces > 0;
    const roomMembers: GroupMember[] = reservation.groupMembers ?? [];
    const approvalDeadline = reservation.expiresAt ? formatDateTimeLabel(reservation.expiresAt) : null;
    const ownerSubtitle = [
        reservation.student?.matricNumber ?? 'Your bed',
        isReservationOwner ? 'Primary reservation holder' : 'You are part of this room',
    ].join(' | ');

    return (
        <>
            <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
                <StatusBar barStyle="light-content" backgroundColor="#1565C0" />

                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" colors={['#1565C0']} />}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
                        <View style={styles.bubbleLarge} />
                        <View style={styles.bubbleSmall} />
                        <View style={styles.bubbleMid} />

                        <Text style={styles.heroEyebrow}>My reservation</Text>
                        <Text style={styles.heroTitle}>
                            {reservation.room?.roomNumber ? `Room ${reservation.room.roomNumber}` : 'Reserved room'}
                        </Text>
                        <Text style={styles.heroCopy}>
                            {isTemporaryInvite
                                ? `${reservedByName} reserved this room for you. Review it before the approval window closes.`
                                : `${reservation.hostel?.name ?? 'Your hostel'} is currently assigned to you.`}
                        </Text>

                        <View style={styles.heroMetaRow}>
                            <View style={[styles.heroMetaChip, { backgroundColor: statusMeta.backgroundColor }]}>
                                <MaterialCommunityIcons name={statusMeta.icon} size={14} color={statusMeta.color} />
                                <Text style={[styles.heroMetaText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                            </View>
                            <View style={styles.heroGhostChip}>
                                <MaterialCommunityIcons name="home-city-outline" size={14} color="#CFE3FF" />
                                <Text style={styles.heroGhostChipText}>{reservation.hostel?.name ?? 'Hostel'}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        {isTemporaryInvite ? (
                            <View style={styles.inviteBanner}>
                                <View style={styles.inviteBannerTop}>
                                    <View style={styles.inviteBannerIcon}>
                                        <MaterialCommunityIcons name="email-fast-outline" size={20} color="#1565C0" />
                                    </View>
                                    <View style={styles.inviteBannerCopy}>
                                        <Text style={styles.inviteBannerTitle}>Waiting for your approval</Text>
                                        <Text style={styles.inviteBannerText}>
                                            Accept this room once your payment or network issue is sorted out.
                                        </Text>
                                        {approvalDeadline ? (
                                            <Text style={styles.inviteBannerDeadline}>Approval ends {approvalDeadline}</Text>
                                        ) : null}
                                    </View>
                                </View>

                                <View style={styles.inviteActionRow}>
                                    <TouchableOpacity
                                        style={[styles.primaryAction, responding !== null && styles.disabledAction]}
                                        activeOpacity={0.85}
                                        onPress={() => handleInvitationResponse('approve')}
                                        disabled={responding !== null}
                                    >
                                        {responding === 'approve' ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
                                                <Text style={styles.primaryActionText}>Approve room</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.secondaryAction, responding !== null && styles.disabledAction]}
                                        activeOpacity={0.85}
                                        onPress={() => handleInvitationResponse('reject')}
                                        disabled={responding !== null}
                                    >
                                        {responding === 'reject' ? (
                                            <ActivityIndicator size="small" color="#C62828" />
                                        ) : (
                                            <>
                                                <MaterialCommunityIcons name="close-circle-outline" size={18} color="#C62828" />
                                                <Text style={styles.secondaryActionText}>Reject</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : null}

                        {actionFeedback ? (
                            <View style={[
                                styles.feedbackBanner,
                                actionFeedback.tone === 'success' ? styles.feedbackBannerSuccess : styles.feedbackBannerInfo,
                            ]}>
                                <View style={styles.feedbackBannerIcon}>
                                    <MaterialCommunityIcons
                                        name={actionFeedback.tone === 'success' ? 'check-circle-outline' : 'information-outline'}
                                        size={18}
                                        color={actionFeedback.tone === 'success' ? '#2E7D32' : '#1565C0'}
                                    />
                                </View>
                                <Text style={actionFeedback.tone === 'success' ? styles.feedbackBannerTextSuccess : styles.feedbackBannerTextInfo}>
                                    {actionFeedback.message}
                                </Text>
                            </View>
                        ) : null}

                        <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.panelHeader}>
                                <View>
                                    <Text style={[styles.panelEyebrow, { color: theme.colors.onSurfaceVariant }]}>Overview</Text>
                                    <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Accommodation details</Text>
                                </View>
                                <View style={[styles.statusPill, { backgroundColor: statusMeta.backgroundColor }]}>
                                    <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                                </View>
                            </View>

                            <View style={styles.statGrid}>
                                <View style={[styles.statCard, { backgroundColor: theme.colors.background }]}>
                                    <View style={[styles.statIconBox, { backgroundColor: '#E3F2FD' }]}>
                                        <MaterialCommunityIcons name="home-city-outline" size={18} color="#1565C0" />
                                    </View>
                                    <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Hostel</Text>
                                    <Text style={[styles.statValue, { color: theme.colors.onSurface }]} numberOfLines={2}>
                                        {reservation.hostel?.name ?? '-'}
                                    </Text>
                                </View>

                                <View style={[styles.statCard, { backgroundColor: theme.colors.background }]}>
                                    <View style={[styles.statIconBox, { backgroundColor: '#E0F2F1' }]}>
                                        <MaterialCommunityIcons name="bed-outline" size={18} color="#00796B" />
                                    </View>
                                    <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Room</Text>
                                    <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                                        {reservation.room?.roomNumber ?? '-'}
                                    </Text>
                                </View>

                                <View style={[styles.statCard, { backgroundColor: theme.colors.background }]}>
                                    <View style={[styles.statIconBox, { backgroundColor: '#FFF3E0' }]}>
                                        <MaterialCommunityIcons name="account-group-outline" size={18} color="#EF6C00" />
                                    </View>
                                    <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Capacity</Text>
                                    <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                                        {reservation.room?.capacity ?? '-'} students
                                    </Text>
                                </View>

                                <View style={[styles.statCard, { backgroundColor: theme.colors.background }]}>
                                    <View style={[styles.statIconBox, { backgroundColor: '#F3E5F5' }]}>
                                        <MaterialCommunityIcons name="calendar-check-outline" size={18} color="#7B1FA2" />
                                    </View>
                                    <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Reserved on</Text>
                                    <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                                        {formatDateLabel(reservation.createdAt)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {reservation.status === 'confirmed' && isFriendReservedRoom ? (
                        <View style={styles.section}>
                            <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
                                <View style={styles.panelHeader}>
                                    <View>
                                        <Text style={[styles.panelEyebrow, { color: theme.colors.onSurfaceVariant }]}>Next step</Text>
                                        <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Porter check-in guidance</Text>
                                    </View>
                                </View>

                                <View style={styles.nextStepsList}>
                                    <View style={[styles.nextStepCard, { backgroundColor: theme.colors.background }]}>
                                        <Text style={[styles.nextStepTitle, { color: theme.colors.onSurface }]}>1. Wait for check-in to open</Text>
                                        <Text style={[styles.nextStepCopy, { color: theme.colors.onSurfaceVariant }]}>
                                            Your bed space is confirmed in StayHub already, so you do not need to reserve again.
                                        </Text>
                                    </View>
                                    <View style={[styles.nextStepCard, { backgroundColor: theme.colors.background }]}>
                                        <Text style={[styles.nextStepTitle, { color: theme.colors.onSurface }]}>2. Go to your hostel porter desk</Text>
                                        <Text style={[styles.nextStepCopy, { color: theme.colors.onSurfaceVariant }]}>
                                            Tell the porter your matric number and that your room approval is already recorded in StayHub.
                                        </Text>
                                    </View>
                                    <View style={[styles.nextStepCard, { backgroundColor: theme.colors.background }]}>
                                        <Text style={[styles.nextStepTitle, { color: theme.colors.onSurface }]}>3. Complete physical check-in</Text>
                                        <Text style={[styles.nextStepCopy, { color: theme.colors.onSurfaceVariant }]}>
                                            Once the porter verifies you, your reservation moves from confirmed to checked in.
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : null}

                    <View style={styles.section}>
                        <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.panelHeader}>
                                <View>
                                    <Text style={[styles.panelEyebrow, { color: theme.colors.onSurfaceVariant }]}>Occupants</Text>
                                    <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>Room members</Text>
                                </View>
                                <Text style={[styles.panelSummary, { color: theme.colors.onSurfaceVariant }]}>
                                    {canAddFriends
                                        ? `${availableSpaces} bed${availableSpaces === 1 ? '' : 's'} available`
                                        : `${1 + roomMembers.length} assigned`}
                                </Text>
                            </View>

                            {renderMemberCard(
                                `${reservation.student?.firstName ?? ''} ${reservation.student?.lastName ?? ''}`.trim() || 'You',
                                ownerSubtitle,
                                {
                                    label: isReservationOwner ? 'Host' : 'You',
                                    color: '#1565C0',
                                    backgroundColor: '#E3F2FD',
                                    icon: 'account-star-outline',
                                },
                                getInitials(reservation.student?.firstName, reservation.student?.lastName, 'YO'),
                                '#1565C0',
                            )}

                            {roomMembers.map((member, index) => {
                                const memberTone = MEMBER_STATUS_META[member.status ?? 'pending'] ?? MEMBER_STATUS_META.pending;
                                const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
                                const subtitle = [
                                    member.matricNumber,
                                    fullName || 'Invitation sent to this student',
                                ].join(' | ');

                                return (
                                    <View key={`${member.matricNumber}-${index}`} style={styles.memberSpacer}>
                                        {renderMemberCard(
                                            fullName || member.matricNumber,
                                            subtitle,
                                            memberTone,
                                            getInitials(member.firstName, member.lastName, 'FR'),
                                            memberTone.color,
                                        )}
                                    </View>
                                );
                            })}

                            {canAddFriends ? (
                                <View style={styles.openSlotsWrap}>
                                    {Array.from({ length: availableSpaces }).map((_, index) => (
                                        <View key={index} style={[styles.openSlotCard, { borderColor: theme.colors.surfaceVariant }]}>
                                            <View style={styles.openSlotIcon}>
                                                <MaterialCommunityIcons name="account-plus-outline" size={18} color="#90A4AE" />
                                            </View>
                                            <Text style={[styles.openSlotTitle, { color: theme.colors.onSurface }]}>Open bed</Text>
                                            <Text style={[styles.openSlotCopy, { color: theme.colors.onSurfaceVariant }]}>
                                                Invite a friend into this room.
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            {canAddFriends ? (
                                <TouchableOpacity style={styles.addFriendsButton} activeOpacity={0.85} onPress={openAddModal}>
                                    <MaterialCommunityIcons name="account-multiple-plus-outline" size={18} color="#1565C0" />
                                    <Text style={styles.addFriendsButtonText}>Add friends to this room</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>

                    {(reservation?.inviteTracker?.length ?? 0) > 0 ? <View style={styles.section}>{renderInviteTrackerCard()}</View> : null}

                    <View style={styles.section}>{renderHistoryCard()}</View>

                    {reservation.status !== 'temporary' &&
                    reservation.status !== 'cancelled' &&
                    reservation.status !== 'checked_in' ? (
                        <View style={styles.section}>
                            <View style={styles.dangerPanel}>
                                <View style={styles.dangerCopy}>
                                    <Text style={styles.dangerTitle}>Need to release this room?</Text>
                                    <Text style={styles.dangerText}>
                                        Cancelling will remove your reservation and reopen the space for someone else.
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.dangerButton, cancelling && styles.disabledAction]}
                                    activeOpacity={0.85}
                                    onPress={handleCancel}
                                    disabled={cancelling || responding !== null}
                                >
                                    {cancelling ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="cancel" size={18} color="#FFFFFF" />
                                            <Text style={styles.dangerButtonText}>Cancel reservation</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : null}
                </ScrollView>
            </View>

            <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
                        <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.modalHandle} />

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <View style={styles.modalHero}>
                                    <View style={styles.modalHeroIcon}>
                                        <MaterialCommunityIcons name="account-multiple-plus-outline" size={22} color="#1565C0" />
                                    </View>
                                    <View style={styles.modalHeroCopy}>
                                        <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                                            Add friends to room {reservation.room?.roomNumber}
                                        </Text>
                                        <Text style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                            {availableSpaces} bed{availableSpaces === 1 ? '' : 's'} still open. Each friend gets a 24-hour approval invite.
                                        </Text>
                                    </View>
                                </View>

                                <Divider style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: 18 }} />

                                <Text style={[styles.modalLabel, { color: theme.colors.onSurfaceVariant }]}>Matric numbers</Text>

                                {newMatrics.map((matric, index) => (
                                    <View key={index} style={styles.matricRow}>
                                        <TextInput
                                            mode="outlined"
                                            value={matric}
                                            onChangeText={(value) => updateMatric(index, value)}
                                            placeholder={`Friend ${index + 1} matric number`}
                                            autoCapitalize="characters"
                                            autoCorrect={false}
                                            style={styles.matricInput}
                                            outlineColor={theme.colors.surfaceVariant}
                                            activeOutlineColor="#1565C0"
                                            left={<TextInput.Icon icon="account-outline" />}
                                        />
                                        <IconButton icon="close-circle" iconColor="#E53935" size={22} onPress={() => removeMatricField(index)} />
                                    </View>
                                ))}

                                {newMatrics.length < availableSpaces ? (
                                    <TouchableOpacity style={styles.addAnotherRow} activeOpacity={0.85} onPress={addMatricField}>
                                        <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#1565C0" />
                                        <Text style={styles.addAnotherText}>Add another friend</Text>
                                    </TouchableOpacity>
                                ) : null}

                                <View style={styles.summaryBanner}>
                                    <View style={styles.summaryBannerIcon}>
                                        <MaterialCommunityIcons name="information-outline" size={16} color="#1565C0" />
                                    </View>
                                    <Text style={styles.summaryBannerText}>
                                        {newMatrics.filter((matric) => matric.trim()).length === 0
                                            ? 'Enter a matric number above to invite a friend into this room.'
                                            : `${newMatrics.filter((matric) => matric.trim()).length} friend${
                                                  newMatrics.filter((matric) => matric.trim()).length > 1 ? 's' : ''
                                              } will receive an email and in-app room invitation.`}
                                    </Text>
                                </View>
                            </ScrollView>

                            <View style={styles.modalActionRow}>
                                <TouchableOpacity
                                    style={[styles.modalCancelButton, addingMembers && styles.disabledAction]}
                                    activeOpacity={0.85}
                                    onPress={() => setAddModalVisible(false)}
                                    disabled={addingMembers}
                                >
                                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalPrimaryButton, addingMembers && styles.disabledAction]}
                                    activeOpacity={0.85}
                                    onPress={handleAddMembers}
                                    disabled={addingMembers}
                                >
                                    {addingMembers ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="send-outline" size={18} color="#FFFFFF" />
                                            <Text style={styles.modalPrimaryButtonText}>Send invites</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    screen: {
        flex: 1,
    },
    loadingScreen: {
        flex: 1,
    },
    loadingBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingBottom: 28,
    },
    hero: {
        backgroundColor: '#1565C0',
        paddingHorizontal: 22,
        paddingBottom: 34,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
    },
    bubbleLarge: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.06)',
        top: -86,
        right: -72,
    },
    bubbleSmall: {
        position: 'absolute',
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: 'rgba(255,255,255,0.07)',
        bottom: -28,
        left: -18,
    },
    bubbleMid: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: 42,
        left: 148,
    },
    heroEyebrow: {
        color: 'rgba(255,255,255,0.72)',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 10,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.6,
        marginBottom: 10,
    },
    heroCopy: {
        color: 'rgba(255,255,255,0.78)',
        fontSize: 14,
        lineHeight: 21,
        maxWidth: 330,
    },
    heroMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 18,
    },
    heroMetaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    heroMetaText: {
        fontSize: 12,
        fontWeight: '700',
    },
    heroGhostChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroGhostChipText: {
        color: '#D8E7FF',
        fontSize: 12,
        fontWeight: '700',
    },
    heroButton: {
        marginTop: 22,
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    heroButtonText: {
        color: '#1565C0',
        fontWeight: '700',
        fontSize: 14,
    },
    section: {
        paddingHorizontal: 18,
        paddingTop: 22,
    },
    panel: {
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 18,
    },
    panelEyebrow: {
        textTransform: 'uppercase',
        letterSpacing: 1.1,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
    },
    panelTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    panelSummary: {
        fontSize: 12,
        fontWeight: '700',
    },
    headerBadge: {
        minWidth: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#1565C0',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    headerBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    emptyPanel: {
        borderRadius: 22,
        paddingHorizontal: 24,
        paddingVertical: 28,
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    emptyIconWrap: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    emptyCopy: {
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
    },
    inviteBanner: {
        backgroundColor: '#EAF3FF',
        borderRadius: 22,
        padding: 18,
        marginBottom: 22,
    },
    inviteBannerTop: {
        flexDirection: 'row',
        gap: 14,
    },
    inviteBannerIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inviteBannerCopy: {
        flex: 1,
        gap: 4,
    },
    inviteBannerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0D47A1',
    },
    inviteBannerText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#305A84',
    },
    inviteBannerDeadline: {
        fontSize: 12,
        color: '#1565C0',
        fontWeight: '700',
        marginTop: 2,
    },
    inviteActionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    primaryAction: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        backgroundColor: '#1565C0',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    primaryActionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    secondaryAction: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#F2C0C0',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    secondaryActionText: {
        color: '#C62828',
        fontSize: 14,
        fontWeight: '800',
    },
    feedbackBanner: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 18,
    },
    feedbackBannerSuccess: {
        backgroundColor: '#E8F5E9',
    },
    feedbackBannerInfo: {
        backgroundColor: '#E3F2FD',
    },
    feedbackBannerIcon: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedbackBannerTextSuccess: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        color: '#256029',
    },
    feedbackBannerTextInfo: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        color: '#245D8B',
    },
    disabledAction: {
        opacity: 0.7,
    },
    statusPill: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        width: '48%',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 14,
        minHeight: 118,
    },
    statIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.9,
        fontWeight: '700',
        marginBottom: 6,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 21,
    },
    memberCard: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    memberSpacer: {
        marginTop: 10,
    },
    trackerList: {
        paddingTop: 16,
        gap: 4,
    },
    trackerMessage: {
        fontSize: 12,
        lineHeight: 18,
        marginTop: 8,
        paddingHorizontal: 4,
    },
    memberAvatar: {
        width: 46,
        height: 46,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberAvatarText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    memberCopy: {
        flex: 1,
        gap: 3,
    },
    memberName: {
        fontSize: 15,
        fontWeight: '800',
    },
    memberSubtitle: {
        fontSize: 12,
        lineHeight: 18,
    },
    memberChip: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    memberChipText: {
        fontSize: 11,
        fontWeight: '800',
    },
    openSlotsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
    },
    openSlotCard: {
        width: '48%',
        borderRadius: 18,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        paddingHorizontal: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    openSlotIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#F5F7FA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    openSlotTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
    },
    openSlotCopy: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
    },
    addFriendsButton: {
        marginTop: 16,
        borderRadius: 16,
        backgroundColor: '#EAF3FF',
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    addFriendsButtonText: {
        color: '#1565C0',
        fontSize: 14,
        fontWeight: '800',
    },
    nextStepsList: {
        gap: 12,
        marginTop: 8,
    },
    nextStepCard: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    nextStepTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 6,
    },
    nextStepCopy: {
        fontSize: 13,
        lineHeight: 19,
    },
    previewWarningRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderRadius: 14,
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 8,
    },
    previewWarningText: {
        flex: 1,
        color: '#9A3412',
        fontSize: 12,
        lineHeight: 18,
    },
    timelineList: {
        paddingTop: 16,
        gap: 14,
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 14,
    },
    timelineRail: {
        width: 38,
        alignItems: 'center',
    },
    timelineIconBox: {
        width: 38,
        height: 38,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginTop: 8,
        borderRadius: 999,
    },
    timelineBody: {
        flex: 1,
        paddingTop: 2,
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 6,
    },
    timelineTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '800',
        lineHeight: 21,
    },
    timelineDescription: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 6,
    },
    timelineTimestamp: {
        fontSize: 11,
        fontWeight: '600',
    },
    dangerPanel: {
        borderRadius: 22,
        backgroundColor: '#FFF4F4',
        paddingHorizontal: 18,
        paddingVertical: 18,
        gap: 16,
    },
    dangerCopy: {
        gap: 6,
    },
    dangerTitle: {
        color: '#B71C1C',
        fontSize: 17,
        fontWeight: '800',
    },
    dangerText: {
        color: '#8A3A3A',
        fontSize: 13,
        lineHeight: 19,
    },
    dangerButton: {
        minHeight: 48,
        borderRadius: 14,
        backgroundColor: '#D32F2F',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    dangerButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(9, 21, 38, 0.48)',
        justifyContent: 'flex-end',
    },
    modalWrap: {
        width: '100%',
    },
    modalSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: 28,
        maxHeight: '84%',
    },
    modalHandle: {
        alignSelf: 'center',
        width: 46,
        height: 5,
        borderRadius: 999,
        backgroundColor: '#D7DCE5',
        marginBottom: 18,
    },
    modalHero: {
        flexDirection: 'row',
        gap: 14,
        marginBottom: 16,
    },
    modalHeroIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#EAF3FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalHeroCopy: {
        flex: 1,
        gap: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 26,
    },
    modalSubtitle: {
        fontSize: 13,
        lineHeight: 19,
    },
    modalLabel: {
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 10,
    },
    matricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    matricInput: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    addAnotherRow: {
        marginTop: 2,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: '#EAF3FF',
    },
    addAnotherText: {
        color: '#1565C0',
        fontWeight: '700',
        fontSize: 13,
    },
    summaryBanner: {
        marginTop: 18,
        borderRadius: 18,
        backgroundColor: '#EEF4FF',
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    summaryBannerIcon: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryBannerText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        color: '#355F90',
    },
    modalActionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    modalCancelButton: {
        flex: 1,
        minHeight: 50,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#D6DCE5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelButtonText: {
        color: '#546274',
        fontSize: 14,
        fontWeight: '800',
    },
    modalPrimaryButton: {
        flex: 1,
        minHeight: 50,
        borderRadius: 16,
        backgroundColor: '#1565C0',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    modalPrimaryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
});

