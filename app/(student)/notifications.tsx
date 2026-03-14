import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Button, Card, Chip, Divider, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { studentAPI } from '../../services/api';
import type { StudentNotification } from '../../types';
import { toMobileNotificationRoute } from '../../utils/notificationRoutes';

const TYPE_META: Record<
  StudentNotification['type'],
  { color: string; bg: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }
> = {
  warning: { color: '#E65100', bg: '#FFF3E0', icon: 'alert-outline' },
  info: { color: '#1565C0', bg: '#E3F2FD', icon: 'information-outline' },
  error: { color: '#C62828', bg: '#FFEBEE', icon: 'close-circle-outline' },
  success: { color: '#2E7D32', bg: '#E8F5E9', icon: 'check-circle-outline' },
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await studentAPI.getNotifications();
      const payload = response.data as any;
      const data = payload?.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleOpen = async (notification: StudentNotification) => {
    try {
      if (!notification.read) {
        await studentAPI.markNotificationsRead({ ids: [notification._id] });
        setNotifications((current) =>
          current.map((item) =>
            item._id === notification._id ? { ...item, read: true } : item
          )
        );
      }
    } catch {
      // continue with navigation
    } finally {
      router.push(toMobileNotificationRoute(notification.destination, '/(student)/reservation'));
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await studentAPI.markNotificationsRead({ markAll: true });
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch {
      // keep UI usable even if request fails
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const visibleNotifications =
    filter === 'unread'
      ? notifications.filter((notification) => !notification.read)
      : notifications;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="bell-ring-outline" size={28} color={theme.colors.primary} />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card style={styles.heroCard}>
        <Card.Content style={styles.heroContent}>
          <View>
            <Text variant="labelMedium" style={styles.heroEyebrow}>Notification Center</Text>
            <Text variant="headlineSmall" style={styles.heroTitle}>Stay on top of your room updates</Text>
            <Text variant="bodyMedium" style={styles.heroSubtitle}>
              Invitation approvals, reservation reminders, and payment-related prompts all show up here.
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Text variant="titleLarge" style={styles.heroBadgeValue}>{unreadCount}</Text>
            <Text variant="labelSmall" style={styles.heroBadgeLabel}>Unread</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.toolbar}>
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as 'all' | 'unread')}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: `Unread (${unreadCount})` },
          ]}
          style={{ flex: 1 }}
        />
        <Button
          mode="outlined"
          onPress={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
          compact
        >
          {markingAll ? 'Marking...' : 'Mark all'}
        </Button>
      </View>

      <Card style={styles.card}>
        <Card.Title title="Activity Feed" titleVariant="titleMedium" />
        <Divider />
        <Card.Content style={styles.feed}>
          {visibleNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-sleep-outline" size={34} color="#BDBDBD" />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>
                New room invitations and important reminders will appear here.
              </Text>
            </View>
          ) : (
            visibleNotifications.map((notification, index) => {
              const meta = TYPE_META[notification.type] ?? TYPE_META.info;
              const isLast = index === visibleNotifications.length - 1;

              return (
                <View key={notification._id}>
                  <TouchableOpacity
                    onPress={() => handleOpen(notification)}
                    activeOpacity={0.82}
                    style={styles.notificationRow}
                  >
                    <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                      <MaterialCommunityIcons
                        name={(notification.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']) || meta.icon}
                        size={20}
                        color={meta.color}
                      />
                    </View>
                    <View style={styles.notificationBody}>
                      <View style={styles.notificationHeader}>
                        <Text variant="titleSmall" style={styles.notificationTitle}>
                          {notification.title || 'Notification'}
                        </Text>
                        {!notification.read ? (
                          <Chip compact style={{ backgroundColor: '#E3F2FD' }} textStyle={{ color: '#1565C0', fontSize: 10 }}>
                            Unread
                          </Chip>
                        ) : null}
                      </View>
                      <Text variant="bodySmall" style={styles.notificationMessage}>
                        {notification.message}
                      </Text>
                      <Text variant="labelSmall" style={styles.notificationTime}>
                        {notification.createdAt
                          ? new Date(notification.createdAt).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Now'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#9E9E9E" />
                  </TouchableOpacity>
                  {!isLast && <Divider style={{ marginVertical: 4 }} />}
                </View>
              );
            })
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: {
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#1565C0',
  },
  heroContent: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 20,
    maxWidth: 240,
  },
  heroBadge: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeValue: {
    color: '#fff',
    fontWeight: '800',
  },
  heroBadgeLabel: {
    color: 'rgba(255,255,255,0.82)',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
  },
  feed: {
    paddingTop: 12,
    gap: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyTitle: {
    color: '#607D8B',
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#90A4AE',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  notificationRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBody: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontWeight: '700',
    flex: 1,
  },
  notificationMessage: {
    color: '#546E7A',
    lineHeight: 18,
  },
  notificationTime: {
    color: '#90A4AE',
  },
});
