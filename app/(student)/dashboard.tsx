import React, { useEffect, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { paymentAPI, studentAPI } from '../../services/api';
import AlertsCard from '../../components/AlertsCard';
import { Reveal } from '../../components/ui/Reveal';
import { useAuthStore } from '../../store/authStore';
import type { DashboardData } from '../../types';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ACTIONS: {
    icon: IconName;
    label: string;
    sub: string;
    route: '/(student)/hostels' | '/(student)/notifications' | '/(student)/payment' | '/(student)/reservation' | '/(student)/profile';
    color: string;
    backgroundColor: string;
}[] = [
    { icon: 'home-city', label: 'Hostels', sub: 'Browse spaces', route: '/(student)/hostels', color: '#1565C0', backgroundColor: '#E3F2FD' },
    { icon: 'bell-ring-outline', label: 'Alerts', sub: 'Unread updates', route: '/(student)/notifications', color: '#EF6C00', backgroundColor: '#FFF3E0' },
    { icon: 'credit-card-outline', label: 'Payment', sub: 'Settle fees', route: '/(student)/payment', color: '#7B1FA2', backgroundColor: '#F3E5F5' },
    { icon: 'calendar-check-outline', label: 'Reserve', sub: 'View reservation', route: '/(student)/reservation', color: '#00796B', backgroundColor: '#E0F2F1' },
    { icon: 'account-circle-outline', label: 'Profile', sub: 'Manage account', route: '/(student)/profile', color: '#C62828', backgroundColor: '#FFEBEE' },
];

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return 'Good morning';
    }
    if (hour < 17) {
        return 'Good afternoon';
    }
    return 'Good evening';
}

function formatReservationStatus(value?: string | null) {
    if (!value) {
        return 'No reservation';
    }

    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAmountLabel(amount: number | null) {
    return amount != null ? `NGN ${amount.toLocaleString()}` : 'Pending';
}

export default function DashboardScreen() {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useTheme();

    const loadDashboard = async () => {
        setError(false);
        try {
            const response = await studentAPI.getDashboard();
            const data: DashboardData = response.data.data ?? (response.data as any);
            setDashboard(data);

            if (data?.paymentStatus !== 'paid') {
                try {
                    const amountResponse = await paymentAPI.getAmount();
                    const amount = amountResponse.data.data?.amount ?? (amountResponse.data as any)?.amount ?? null;
                    setPaymentAmount(typeof amount === 'number' ? amount : null);
                }
                catch {
                    setPaymentAmount(null);
                }
            }
            else {
                setPaymentAmount(null);
            }
        }
        catch {
            setError(true);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboard();
    };

    const initials = useMemo(
        () => `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'SH',
        [user?.firstName, user?.lastName],
    );

    const department = user?.department
        ? typeof user.department === 'object'
            ? (user.department as any).name
            : user.department
        : null;

    const paymentPaid = dashboard?.paymentStatus === 'paid';
    const reservationStatus = dashboard?.reservationStatus ?? dashboard?.reservation?.status ?? null;
    const hasReservation = dashboard?.hasReservation ?? false;
    const reservationLabel = reservationStatus === 'temporary'
        ? 'Invite pending'
        : hasReservation
            ? 'Room reserved'
            : 'No reservation';

    if (loading) {
        return (
            <View style={[styles.loadingScreen, { backgroundColor: theme.colors.background }]}>
                <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
                <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
                    <View style={styles.heroBubbleLarge} />
                    <View style={styles.heroBubbleSmall} />
                    <View style={styles.heroBubbleMid} />
                </View>
                <View style={styles.loadingBody}>
                    <ActivityIndicator size="large" color="#1565C0" />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
            <View style={{ height: insets.top, backgroundColor: '#1565C0' }} />

            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" colors={['#1565C0']} />}
            >
                <View style={styles.hero}>
                    <View style={styles.heroBubbleLarge} />
                    <View style={styles.heroBubbleSmall} />
                    <View style={styles.heroBubbleMid} />

                    <View style={styles.heroTopRow}>
                        <View style={styles.heroCopyWrap}>
                            <Text style={styles.greetingText}>{getGreeting()}</Text>
                            <Text style={styles.heroName}>{user?.firstName} {user?.lastName}</Text>
                            <Text style={styles.heroSubtitle}>
                                {department || 'Student account'}{user?.level ? ` | ${user.level} Level` : ''}
                            </Text>
                            {user?.matricNumber ? <Text style={styles.heroMeta}>{user.matricNumber}</Text> : null}
                        </View>

                        <View style={styles.avatarColumn}>
                            <View style={styles.avatarRing}>
                                {user?.profilePicture ? (
                                    <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
                                ) : (
                                    <View style={styles.avatarInner}>
                                        <Text style={styles.avatarText}>{initials}</Text>
                                    </View>
                                )}
                            </View>

                            {dashboard?.currentSession ? (
                                <View style={styles.sessionPill}>
                                    <Text style={styles.sessionText}>{dashboard.currentSession}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    <View style={styles.heroStatusRow}>
                        <View style={[styles.heroStatusCard, { backgroundColor: paymentPaid ? 'rgba(76, 175, 80, 0.20)' : 'rgba(255, 152, 0, 0.20)' }]}>
                            <MaterialCommunityIcons
                                name={paymentPaid ? 'check-circle-outline' : 'clock-outline'}
                                size={18}
                                color={paymentPaid ? '#B8E0C0' : '#FFD08A'}
                            />
                            <View>
                                <Text style={[styles.heroStatusLabel, { color: paymentPaid ? '#B8E0C0' : '#FFD08A' }]}>Payment</Text>
                                <Text style={styles.heroStatusValue}>{paymentPaid ? 'Cleared' : 'Pending'}</Text>
                            </View>
                        </View>

                        <View style={[styles.heroStatusCard, { backgroundColor: hasReservation ? 'rgba(33,150,243,0.20)' : 'rgba(255,255,255,0.12)' }]}>
                            <MaterialCommunityIcons
                                name={hasReservation ? 'bed-outline' : 'bed-empty'}
                                size={18}
                                color={hasReservation ? '#B4D7FF' : 'rgba(255,255,255,0.72)'}
                            />
                            <View>
                                <Text style={[styles.heroStatusLabel, { color: hasReservation ? '#B4D7FF' : 'rgba(255,255,255,0.72)' }]}>Reservation</Text>
                                <Text style={styles.heroStatusValue}>{reservationLabel}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {error ? (
                    <View style={styles.section}>
                        <View style={[styles.stateCard, { backgroundColor: theme.colors.surface }]}>
                            <MaterialCommunityIcons name="wifi-off" size={38} color="#BDBDBD" />
                            <Text style={[styles.stateTitle, { color: theme.colors.onSurface }]}>Could not load dashboard</Text>
                            <Text style={[styles.stateCopy, { color: theme.colors.onSurfaceVariant }]}>
                                Check your connection and try again.
                            </Text>
                            <TouchableOpacity style={styles.primaryButton} onPress={() => { setLoading(true); loadDashboard(); }} activeOpacity={0.85}>
                                <MaterialCommunityIcons name="refresh" size={16} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.section}>
                            <Reveal delay={40}>
                                <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>At a glance</Text>
                                <View style={styles.overviewGrid}>
                                    <View style={[styles.overviewCard, { backgroundColor: theme.colors.surface }]}>
                                        <Text style={[styles.overviewEyebrow, { color: theme.colors.onSurfaceVariant }]}>Outstanding fee</Text>
                                        <Text style={[styles.overviewValue, { color: theme.colors.onSurface }]}>
                                            {paymentPaid ? 'Paid in full' : formatAmountLabel(paymentAmount)}
                                        </Text>
                                    </View>
                                    <View style={[styles.overviewCard, { backgroundColor: theme.colors.surface }]}>
                                        <Text style={[styles.overviewEyebrow, { color: theme.colors.onSurfaceVariant }]}>Room status</Text>
                                        <Text style={[styles.overviewValue, { color: theme.colors.onSurface }]}>
                                            {formatReservationStatus(reservationStatus)}
                                        </Text>
                                    </View>
                                </View>
                            </Reveal>
                        </View>

                        {!paymentPaid ? (
                            <View style={styles.section}>
                                <Reveal delay={120}>
                                    <TouchableOpacity
                                        style={styles.paymentBanner}
                                        activeOpacity={0.85}
                                        onPress={() => router.push('/(student)/payment')}
                                    >
                                        <View style={styles.paymentBannerLeft}>
                                            <View style={styles.paymentBannerIcon}>
                                                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#E65100" />
                                            </View>
                                            <View style={styles.paymentBannerCopy}>
                                                <Text style={styles.paymentBannerTitle}>Payment outstanding</Text>
                                                <Text style={styles.paymentBannerSubtitle}>
                                                    {paymentAmount != null ? `Amount due: ${formatAmountLabel(paymentAmount)}` : 'Tap to review your payment status'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.paymentBannerCta}>
                                            <Text style={styles.paymentBannerCtaText}>Pay now</Text>
                                        </View>
                                    </TouchableOpacity>
                                </Reveal>
                            </View>
                        ) : null}

                        <View style={styles.section}>
                            <Reveal delay={180}>
                                <AlertsCard />
                            </Reveal>
                        </View>

                        <View style={styles.section}>
                            <Reveal delay={240}>
                                <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Reservation snapshot</Text>

                                {hasReservation && dashboard?.reservation ? (
                                    <TouchableOpacity
                                        style={[styles.reservationCard, { backgroundColor: theme.colors.surface }]}
                                        activeOpacity={0.85}
                                        onPress={() => router.push('/(student)/reservation')}
                                    >
                                        <View style={styles.reservationCardHeader}>
                                            <View>
                                                <Text style={[styles.reservationEyebrow, { color: theme.colors.onSurfaceVariant }]}>Current stay</Text>
                                                <Text style={[styles.reservationTitle, { color: theme.colors.onSurface }]}>
                                                    {dashboard.reservation.hostel?.name ?? 'Assigned hostel'}
                                                </Text>
                                            </View>

                                            <View
                                                style={[
                                                    styles.reservationStatusPill,
                                                    {
                                                        backgroundColor:
                                                            dashboard.reservation.status === 'confirmed'
                                                                ? '#E8F5E9'
                                                                : dashboard.reservation.status === 'cancelled'
                                                                    ? '#FFEBEE'
                                                                    : '#FFF3E0',
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.reservationStatusText,
                                                        {
                                                            color:
                                                                dashboard.reservation.status === 'confirmed'
                                                                    ? '#2E7D32'
                                                                    : dashboard.reservation.status === 'cancelled'
                                                                        ? '#C62828'
                                                                        : '#E65100',
                                                        },
                                                    ]}
                                                >
                                                    {formatReservationStatus(dashboard.reservation.status)}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.reservationDetailsRow}>
                                            <View style={[styles.reservationMetricCard, { backgroundColor: theme.colors.background }]}>
                                                <Text style={[styles.reservationMetricLabel, { color: theme.colors.onSurfaceVariant }]}>Room</Text>
                                                <Text style={[styles.reservationMetricValue, { color: theme.colors.onSurface }]}>
                                                    {dashboard.reservation.room?.roomNumber ?? '-'}
                                                </Text>
                                            </View>

                                            <View style={[styles.reservationMetricCard, { backgroundColor: theme.colors.background }]}>
                                                <Text style={[styles.reservationMetricLabel, { color: theme.colors.onSurfaceVariant }]}>Occupancy</Text>
                                                <Text style={[styles.reservationMetricValue, { color: theme.colors.onSurface }]}>
                                                    {dashboard.reservation.room?.currentOccupancy ?? 0}/{dashboard.reservation.room?.capacity ?? 0}
                                                </Text>
                                            </View>
                                        </View>

                                        {(dashboard.reservation.groupMembers?.length ?? 0) > 0 ? (
                                            <Text style={[styles.groupSummary, { color: theme.colors.onSurfaceVariant }]}>
                                                Group reservation with {dashboard.reservation.groupMembers!.length + 1} members
                                            </Text>
                                        ) : null}

                                        <View style={styles.reservationActionRow}>
                                            <Text style={styles.reservationActionText}>View details</Text>
                                            <MaterialCommunityIcons name="arrow-right" size={18} color="#1565C0" />
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={[styles.stateCard, { backgroundColor: theme.colors.surface }]}>
                                        <MaterialCommunityIcons name="bed-empty" size={38} color="#BDBDBD" />
                                        <Text style={[styles.stateTitle, { color: theme.colors.onSurface }]}>No room reserved yet</Text>
                                        <Text style={[styles.stateCopy, { color: theme.colors.onSurfaceVariant }]}>
                                            Browse available hostels and reserve your room for this session.
                                        </Text>
                                        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(student)/hostels')} activeOpacity={0.85}>
                                            <MaterialCommunityIcons name="home-search-outline" size={16} color="#FFFFFF" />
                                            <Text style={styles.primaryButtonText}>Browse hostels</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Reveal>
                        </View>

                        <View style={styles.section}>
                            <Reveal delay={320}>
                                <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Quick actions</Text>
                                <View style={styles.actionGrid}>
                                    {ACTIONS.map((action) => (
                                        <TouchableOpacity
                                            key={action.label}
                                            style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
                                            onPress={() => router.push(action.route)}
                                            activeOpacity={0.82}
                                        >
                                            <View style={[styles.actionIconWrap, { backgroundColor: action.backgroundColor }]}>
                                                <MaterialCommunityIcons name={action.icon} size={24} color={action.color} />
                                            </View>
                                            <Text style={[styles.actionLabel, { color: theme.colors.onSurface }]}>{action.label}</Text>
                                            <Text style={[styles.actionSub, { color: theme.colors.onSurfaceVariant }]}>{action.sub}</Text>
                                            <View style={styles.actionArrowRow}>
                                                <Text style={styles.actionArrowText}>Open</Text>
                                                <MaterialCommunityIcons name="arrow-right" size={16} color="#1565C0" />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </Reveal>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
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
        paddingBottom: 40,
    },
    hero: {
        backgroundColor: '#1565C0',
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
    },
    heroBubbleLarge: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.06)',
        top: -80,
        right: -60,
    },
    heroBubbleSmall: {
        position: 'absolute',
        width: 132,
        height: 132,
        borderRadius: 66,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -44,
        left: -24,
    },
    heroBubbleMid: {
        position: 'absolute',
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: 34,
        right: 108,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 22,
    },
    heroCopyWrap: {
        flex: 1,
    },
    greetingText: {
        color: 'rgba(255,255,255,0.74)',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
    },
    heroName: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.4,
        marginBottom: 6,
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.78)',
        fontSize: 13,
        lineHeight: 18,
    },
    heroMeta: {
        color: 'rgba(255,255,255,0.58)',
        fontSize: 12,
        marginTop: 4,
    },
    avatarColumn: {
        alignItems: 'center',
        gap: 8,
    },
    avatarRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.35)',
        padding: 3,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 32,
        backgroundColor: '#42A5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
    },
    sessionPill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    sessionText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    heroStatusRow: {
        flexDirection: 'row',
        gap: 10,
    },
    heroStatusCard: {
        flex: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    heroStatusLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 3,
    },
    heroStatusValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    section: {
        paddingHorizontal: 18,
        paddingTop: 22,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.1,
        marginBottom: 12,
    },
    overviewGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    overviewCard: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    overviewEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    overviewValue: {
        fontSize: 17,
        fontWeight: '800',
        lineHeight: 23,
    },
    paymentBanner: {
        backgroundColor: '#FFF3E0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    paymentBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    paymentBannerIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentBannerCopy: {
        flex: 1,
        gap: 4,
    },
    paymentBannerTitle: {
        color: '#E65100',
        fontSize: 14,
        fontWeight: '800',
    },
    paymentBannerSubtitle: {
        color: '#A74A00',
        fontSize: 12,
        lineHeight: 18,
    },
    paymentBannerCta: {
        borderRadius: 14,
        backgroundColor: '#E65100',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    paymentBannerCtaText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    stateCard: {
        borderRadius: 22,
        paddingHorizontal: 24,
        paddingVertical: 28,
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    stateTitle: {
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 8,
    },
    stateCopy: {
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        marginBottom: 16,
    },
    primaryButton: {
        minHeight: 46,
        borderRadius: 16,
        backgroundColor: '#1565C0',
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    reservationCard: {
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    reservationCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
    },
    reservationEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    reservationTitle: {
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 26,
    },
    reservationStatusPill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    reservationStatusText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reservationDetailsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    reservationMetricCard: {
        flex: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    reservationMetricLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    reservationMetricValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    groupSummary: {
        fontSize: 13,
        lineHeight: 19,
        marginTop: 14,
    },
    reservationActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#EEF2F6',
    },
    reservationActionText: {
        color: '#1565C0',
        fontSize: 13,
        fontWeight: '800',
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionCard: {
        width: '47%',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    actionIconWrap: {
        width: 50,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4,
    },
    actionSub: {
        fontSize: 12,
        lineHeight: 18,
        minHeight: 36,
    },
    actionArrowRow: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionArrowText: {
        color: '#1565C0',
        fontSize: 12,
        fontWeight: '800',
    },
});
