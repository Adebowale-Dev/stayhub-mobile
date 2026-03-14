import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { studentAPI } from '../services/api';
import type { StudentNotification } from '../types';
import { toMobileNotificationRoute } from '../utils/notificationRoutes';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_STYLES: Record<
  StudentNotification['type'],
  { iconBg: string; iconColor: string; accentColor: string }
> = {
  warning: { iconBg: '#FFF3E0', iconColor: '#E65100', accentColor: '#FF9800' },
  info:    { iconBg: '#E3F2FD', iconColor: '#1565C0', accentColor: '#2196F3' },
  error:   { iconBg: '#FFEBEE', iconColor: '#C62828', accentColor: '#F44336' },
  success: { iconBg: '#E8F5E9', iconColor: '#2E7D32', accentColor: '#4CAF50' },
};

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
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const markRead = async (notification: StudentNotification, navigate = false) => {
    setUpdatingIds((current) => new Set(current).add(notification._id));

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
      // keep the card functional even if marking read fails
    } finally {
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

  if (unread.length === 0) return null;

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
        Notifications
      </Text>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="bell-ring-outline" size={16} color="#1565C0" />
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              Unread Updates
            </Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread.length}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(student)/notifications')}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.surfaceVariant }]} />

        {unread.slice(0, 4).map((notification, index) => {
          const ts = TYPE_STYLES[notification.type] ?? TYPE_STYLES.info;
          const isLast = index === Math.min(unread.length, 4) - 1;
          const isUpdating = updatingIds.has(notification._id);

          return (
            <View key={notification._id}>
              <View style={styles.alertRow}>
                <View style={[styles.accentBar, { backgroundColor: ts.accentColor }]} />

                <TouchableOpacity
                  style={styles.notificationBody}
                  activeOpacity={0.82}
                  onPress={() => markRead(notification, true)}
                >
                  <View style={[styles.iconBox, { backgroundColor: ts.iconBg }]}>
                    <MaterialCommunityIcons
                      name={(notification.icon as IconName) || 'information-outline'}
                      size={18}
                      color={ts.iconColor}
                    />
                  </View>

                  <View style={styles.textStack}>
                    <Text
                      style={[styles.message, { color: theme.colors.onSurface }]}
                      numberOfLines={2}
                    >
                      {notification.message}
                    </Text>
                    <Text style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                      {notification.createdAt
                        ? new Date(notification.createdAt).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Now'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => markRead(notification)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.dismissBtn}
                  accessibilityLabel="Mark notification as read"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={theme.colors.onSurfaceVariant} />
                  ) : (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {!isLast && (
                <View style={[styles.rowDivider, { backgroundColor: theme.colors.surfaceVariant }]} />
              )}
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
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#1565C0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  viewAllText: {
    color: '#1565C0',
    fontSize: 12,
    fontWeight: '700',
  },

  divider: {
    height: 1,
  },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    paddingVertical: 12,
    gap: 10,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginLeft: 0,
  },
  notificationBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textStack: {
    flex: 1,
    gap: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
  },
  dismissBtn: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowDivider: {
    height: 1,
    marginLeft: 13,
  },
});
