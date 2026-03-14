import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { studentAPI } from '../../services/api';
import { Reveal } from '../../components/ui/Reveal';
import type { StudentNotification } from '../../types';
import { toMobileNotificationRoute } from '../../utils/notificationRoutes';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_META: Record<StudentNotification['type'], {
    color: string;
    backgroundColor: string;
    iconBackground: string;
    icon: IconName;
}> = {
    warning: {
        color: '#E65100',
        backgroundColor: '#FFF7ED',
        iconBackground: '#FFE4C7',
        icon: 'alert-outline',
    },
    info: {
        color: '#1565C0',
        backgroundColor: '#EEF5FF',
        iconBackground: '#DCEAFF',
        icon: 'information-outline',
    },
    error: {
        color: '#C62828',
        backgroundColor: '#FFF1F1',
        iconBackground: '#FFDADA',
        icon: 'close-circle-outline',
    },
    success: {
        color: '#2E7D32',
        backgroundColor: '#EEF8F0',
        iconBackground: '#DDF2E0',
        icon: 'check-circle-outline',
    },
};

function formatTimestamp(value?: string) {
    if (!value) {
        return 'Now';
    }

    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function NotificationsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<StudentNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [markingAll, setMarkingAll] = useState(false);
    const [openingId, setOpeningId] = useState<string | null>(null);

    const loadNotifications = useCallback(async () => {
        try {
            const response = await studentAPI.getNotifications();
            const payload = response.data as any;
            const data = payload?.data ?? [];
            setNotifications(Array.isArray(data) ? data : []);
        }
        catch {
            setNotifications([]);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        loadNotifications();
    }, [loadNotifications]));

    const onRefresh = () => {
        setRefreshing(true);
        loadNotifications();
    };

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification.read).length,
        [notifications],
    );

    const visibleNotifications = useMemo(
        () => filter === 'unread'
            ? notifications.filter((notification) => !notification.read)
            : notifications,
        [filter, notifications],
    );

    const handleOpen = async (notification: StudentNotification) => {
        setOpeningId(notification._id);
        try {
            if (!notification.read) {
                await studentAPI.markNotificationsRead({ ids: [notification._id] });
                setNotifications((current) =>
                    current.map((item) => item._id === notification._id ? { ...item, read: true } : item),
                );
            }
        }
        catch {
        }
        finally {
            setOpeningId(null);
            router.push(toMobileNotificationRoute(notification.destination, '/(student)/reservation'));
        }
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await studentAPI.markNotificationsRead({ markAll: true });
            setNotifications((current) => current.map((item) => ({ ...item, read: true })));
        }
        catch {
        }
        finally {
            setMarkingAll(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingScreen, { backgroundColor: theme.colors.background }]}>
                <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
                <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
                    <View style={styles.heroBubbleLarge} />
                    <View style={styles.heroBubbleSmall} />
                    <View style={styles.heroBubbleMid} />
                </View>
                <View style={styles.loadingBody}>
                    <ActivityIndicator size="large" color="#1565C0" />
                    <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading notifications...</Text>
                </View>
            </View>
        );
    }

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
                    <View style={styles.heroBubbleLarge} />
                    <View style={styles.heroBubbleSmall} />
                    <View style={styles.heroBubbleMid} />

                    <Text style={styles.heroEyebrow}>Notification center</Text>
                    <Text style={styles.heroTitle}>Every room update in one place</Text>
                    <Text style={styles.heroCopy}>
                        Track invitations, approvals, payment prompts, and reservation reminders without missing the next step.
                    </Text>

                    <View style={styles.heroStats}>
                        <View style={styles.heroStatCard}>
                            <Text style={styles.heroStatNumber}>{unreadCount}</Text>
                            <Text style={styles.heroStatLabel}>Unread</Text>
                        </View>
                        <View style={styles.heroStatCard}>
                            <Text style={styles.heroStatNumber}>{notifications.length}</Text>
                            <Text style={styles.heroStatLabel}>Total alerts</Text>
                        </View>
                        <View style={styles.heroStatCard}>
                            <Text style={styles.heroStatNumber}>{notifications.length - unreadCount}</Text>
                            <Text style={styles.heroStatLabel}>Reviewed</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Reveal delay={60}>
                        <View style={[styles.controlsPanel, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.controlsHeader}>
                                <View>
                                    <Text style={[styles.controlsEyebrow, { color: theme.colors.onSurfaceVariant }]}>Filter</Text>
                                    <Text style={[styles.controlsTitle, { color: theme.colors.onSurface }]}>Your activity feed</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.markAllButton, unreadCount === 0 && styles.disabledButton]}
                                    activeOpacity={0.85}
                                    onPress={handleMarkAllRead}
                                    disabled={markingAll || unreadCount === 0}
                                >
                                    {markingAll ? (
                                        <ActivityIndicator size="small" color="#1565C0" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="check-all" size={18} color="#1565C0" />
                                            <Text style={styles.markAllText}>Mark all read</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <SegmentedButtons
                                value={filter}
                                onValueChange={(value) => setFilter(value as 'all' | 'unread')}
                                buttons={[
                                    { value: 'all', label: `All (${notifications.length})` },
                                    { value: 'unread', label: `Unread (${unreadCount})` },
                                ]}
                            />
                        </View>
                    </Reveal>
                </View>

                <View style={styles.section}>
                    {visibleNotifications.length === 0 ? (
                        <Reveal delay={120}>
                            <View style={[styles.emptyPanel, { backgroundColor: theme.colors.surface }]}>
                                <View style={styles.emptyIconWrap}>
                                    <MaterialCommunityIcons name="bell-sleep-outline" size={34} color="#1565C0" />
                                </View>
                                <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
                                    {filter === 'unread' ? 'No unread notifications' : 'Nothing here yet'}
                                </Text>
                                <Text style={[styles.emptyCopy, { color: theme.colors.onSurfaceVariant }]}>
                                    {filter === 'unread'
                                        ? 'You are all caught up. New room activity will appear here as soon as it happens.'
                                        : 'When friends reserve beds, payments update, or room status changes, you will see it here.'}
                                </Text>
                            </View>
                        </Reveal>
                    ) : (
                        visibleNotifications.map((notification, index) => {
                            const meta = TYPE_META[notification.type] ?? TYPE_META.info;
                            const isOpening = openingId === notification._id;

                            return (
                                <Reveal key={notification._id} delay={120 + index * 55}>
                                    <TouchableOpacity
                                        style={[styles.notificationCard, { backgroundColor: theme.colors.surface }]}
                                        activeOpacity={0.85}
                                        onPress={() => handleOpen(notification)}
                                    >
                                        <View style={[styles.notificationAccent, { backgroundColor: meta.color }]} />

                                        <View style={styles.notificationContent}>
                                            <View style={styles.notificationTopRow}>
                                                <View style={[styles.notificationIconBox, { backgroundColor: meta.iconBackground }]}>
                                                    <MaterialCommunityIcons
                                                        name={(notification.icon as IconName) || meta.icon}
                                                        size={20}
                                                        color={meta.color}
                                                    />
                                                </View>

                                                <View style={styles.notificationCopy}>
                                                    <View style={styles.notificationHeader}>
                                                        <Text style={[styles.notificationTitle, { color: theme.colors.onSurface }]} numberOfLines={2}>
                                                            {notification.title || 'StayHub update'}
                                                        </Text>
                                                        {!notification.read ? <View style={styles.unreadDot} /> : null}
                                                    </View>
                                                    <Text style={[styles.notificationMessage, { color: theme.colors.onSurfaceVariant }]} numberOfLines={3}>
                                                        {notification.message}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.notificationFooter}>
                                                <View style={[styles.notificationTypePill, { backgroundColor: meta.backgroundColor }]}>
                                                    <Text style={[styles.notificationTypeText, { color: meta.color }]}>
                                                        {notification.read ? 'Reviewed' : 'Unread'}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.notificationTimestamp, { color: theme.colors.onSurfaceVariant }]}>
                                                    {formatTimestamp(notification.createdAt)}
                                                </Text>
                                            </View>

                                            <View style={styles.notificationActionRow}>
                                                <Text style={styles.notificationActionText}>
                                                    {isOpening ? 'Opening...' : 'Open update'}
                                                </Text>
                                                {isOpening ? (
                                                    <ActivityIndicator size="small" color="#1565C0" />
                                                ) : (
                                                    <MaterialCommunityIcons name="arrow-right" size={18} color="#1565C0" />
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </Reveal>
                            );
                        })
                    )}
                </View>
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
        gap: 10,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '600',
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
    heroBubbleLarge: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.06)',
        top: -84,
        right: -72,
    },
    heroBubbleSmall: {
        position: 'absolute',
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: 'rgba(255,255,255,0.07)',
        bottom: -24,
        left: -18,
    },
    heroBubbleMid: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: 42,
        left: 150,
    },
    heroEyebrow: {
        color: 'rgba(255,255,255,0.72)',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 10,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 29,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 10,
        maxWidth: 320,
    },
    heroCopy: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        lineHeight: 21,
        maxWidth: 336,
    },
    heroStats: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 22,
    },
    heroStatCard: {
        flex: 1,
        borderRadius: 18,
        paddingVertical: 14,
        backgroundColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroStatNumber: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    heroStatLabel: {
        color: 'rgba(255,255,255,0.76)',
        fontSize: 11,
        fontWeight: '700',
    },
    section: {
        paddingHorizontal: 18,
        paddingTop: 22,
    },
    controlsPanel: {
        borderRadius: 22,
        padding: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    controlsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    controlsEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    controlsTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    markAllButton: {
        minHeight: 42,
        borderRadius: 14,
        backgroundColor: '#EEF5FF',
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    markAllText: {
        color: '#1565C0',
        fontSize: 13,
        fontWeight: '800',
    },
    disabledButton: {
        opacity: 0.55,
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
        backgroundColor: '#EAF3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyCopy: {
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
    },
    notificationCard: {
        flexDirection: 'row',
        borderRadius: 22,
        overflow: 'hidden',
        marginBottom: 14,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    notificationAccent: {
        width: 5,
    },
    notificationContent: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    notificationTopRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    notificationIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    notificationCopy: {
        flex: 1,
        gap: 6,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    notificationTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
        lineHeight: 22,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#1565C0',
        marginTop: 5,
    },
    notificationMessage: {
        fontSize: 13,
        lineHeight: 20,
    },
    notificationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        marginTop: 14,
    },
    notificationTypePill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    notificationTypeText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    notificationTimestamp: {
        fontSize: 11,
        fontWeight: '600',
    },
    notificationActionRow: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#EEF2F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    notificationActionText: {
        color: '#1565C0',
        fontSize: 13,
        fontWeight: '800',
    },
});
