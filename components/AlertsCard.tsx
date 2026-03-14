import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { studentAPI } from '../services/api';
import type { StudentNotification } from '../types';
import { toMobileNotificationRoute } from '../utils/notificationRoutes';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_STYLES: Record<StudentNotification['type'], {
    iconBackground: string;
    iconColor: string;
    accentColor: string;
}> = {
    warning: { iconBackground: '#FFF3E0', iconColor: '#E65100', accentColor: '#FF9800' },
    info: { iconBackground: '#E3F2FD', iconColor: '#1565C0', accentColor: '#2196F3' },
    error: { iconBackground: '#FFEBEE', iconColor: '#C62828', accentColor: '#F44336' },
    success: { iconBackground: '#E8F5E9', iconColor: '#2E7D32', accentColor: '#4CAF50' },
};

function formatTimestamp(value?: string) {
    if (!value) {
        return 'Now';
    }

    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AlertsCard() {
    const theme = useTheme();
    const router = useRouter();
    const [notifications, setNotifications] = useState<StudentNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

    const loadNotifications = useCallback(async () => {
        setLoading(true);
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
        }
    }, []);

    useFocusEffect(useCallback(() => {
        loadNotifications();
    }, [loadNotifications]));

    const markRead = async (notification: StudentNotification, navigate = false) => {
        setUpdatingIds((current) => new Set(current).add(notification._id));
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
            setUpdatingIds((current) => {
                const next = new Set(current);
                next.delete(notification._id);
                return next;
            });
            if (navigate) {
                router.push(toMobileNotificationRoute(notification.destination));
            }
        }
    };

    const unread = notifications.filter((notification) => !notification.read);

    if (loading) {
        return (
            <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#1565C0" />
            </View>
        );
    }

    if (unread.length === 0) {
        return null;
    }

    return (
        <View>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Notifications
            </Text>

            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.headerEyebrow, { color: theme.colors.onSurfaceVariant }]}>Unread</Text>
                        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Fresh updates waiting</Text>
                    </View>

                    <TouchableOpacity style={styles.viewAllButton} activeOpacity={0.85} onPress={() => router.push('/(student)/notifications')}>
                        <Text style={styles.viewAllText}>View all</Text>
                        <MaterialCommunityIcons name="arrow-right" size={16} color="#1565C0" />
                    </TouchableOpacity>
                </View>

                <View style={styles.countStrip}>
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{unread.length}</Text>
                    </View>
                    <Text style={[styles.countText, { color: theme.colors.onSurfaceVariant }]}>
                        {unread.length === 1 ? 'New update needs your attention' : 'New updates need your attention'}
                    </Text>
                </View>

                {unread.slice(0, 3).map((notification, index) => {
                    const tone = TYPE_STYLES[notification.type] ?? TYPE_STYLES.info;
                    const isUpdating = updatingIds.has(notification._id);
                    const isLast = index === Math.min(unread.length, 3) - 1;

                    return (
                        <View key={notification._id}>
                            <TouchableOpacity
                                style={[styles.notificationCard, { backgroundColor: theme.colors.background }]}
                                activeOpacity={0.85}
                                onPress={() => markRead(notification, true)}
                            >
                                <View style={[styles.notificationAccent, { backgroundColor: tone.accentColor }]} />

                                <View style={styles.notificationBody}>
                                    <View style={[styles.iconBox, { backgroundColor: tone.iconBackground }]}>
                                        <MaterialCommunityIcons
                                            name={(notification.icon as IconName) || 'information-outline'}
                                            size={18}
                                            color={tone.iconColor}
                                        />
                                    </View>

                                    <View style={styles.copyWrap}>
                                        <Text style={[styles.message, { color: theme.colors.onSurface }]} numberOfLines={2}>
                                            {notification.message}
                                        </Text>
                                        <Text style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                                            {formatTimestamp(notification.createdAt)}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => markRead(notification)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={styles.dismissButton}
                                        accessibilityLabel="Mark notification as read"
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? (
                                            <ActivityIndicator size="small" color={theme.colors.onSurfaceVariant} />
                                        ) : (
                                            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#1565C0" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>

                            {!isLast ? <View style={[styles.rowDivider, { backgroundColor: theme.colors.surfaceVariant }]} /> : null}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.1,
        marginBottom: 12,
    },
    loadingRow: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    card: {
        borderRadius: 22,
        overflow: 'hidden',
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    headerEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#EEF5FF',
    },
    viewAllText: {
        color: '#1565C0',
        fontSize: 13,
        fontWeight: '800',
    },
    countStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    countBadge: {
        minWidth: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1565C0',
        paddingHorizontal: 8,
    },
    countBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
    },
    notificationCard: {
        borderRadius: 18,
        overflow: 'hidden',
        flexDirection: 'row',
    },
    notificationAccent: {
        width: 4,
    },
    notificationBody: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyWrap: {
        flex: 1,
        gap: 4,
    },
    message: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '700',
    },
    timestamp: {
        fontSize: 11,
        fontWeight: '600',
    },
    dismissButton: {
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowDivider: {
        height: 1,
        marginVertical: 8,
    },
});
