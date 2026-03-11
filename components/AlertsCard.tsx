import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { studentAPI } from '../services/api';
import type { Alert } from '../types';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const DISMISSED_KEY = 'dismissed_alert_ids';

const TYPE_STYLES: Record<
  Alert['type'],
  { iconBg: string; iconColor: string; accentColor: string }
> = {
  warning: { iconBg: '#FFF3E0', iconColor: '#E65100', accentColor: '#FF9800' },
  info:    { iconBg: '#E3F2FD', iconColor: '#1565C0', accentColor: '#2196F3' },
  error:   { iconBg: '#FFEBEE', iconColor: '#C62828', accentColor: '#F44336' },
  success: { iconBg: '#E8F5E9', iconColor: '#2E7D32', accentColor: '#4CAF50' },
};

export default function AlertsCard() {
  const theme = useTheme();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadDismissed = useCallback(async (): Promise<Set<string>> => {
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_KEY);
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const [dismissedSet, alertsRes] = await Promise.allSettled([
        loadDismissed(),
        studentAPI.getAlerts(),
      ]);

      if (!mounted) return;

      if (dismissedSet.status === 'fulfilled') {
        setDismissed(dismissedSet.value);
      }
      if (alertsRes.status === 'fulfilled') {
        const data = alertsRes.value.data.data ?? (alertsRes.value.data as any);
        setAlerts(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    };
    init();
    return () => { mounted = false; };
  }, [loadDismissed]);

  const dismiss = async (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
    } catch {
      // ignore storage errors
    }
  };

  const visible = alerts.filter((a) => !dismissed.has(a._id));

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color="#1565C0" />
      </View>
    );
  }

  if (visible.length === 0) return null;

  return (
    <View>
      {/* Section label */}
      <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
        Alerts
      </Text>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="bell-outline" size={16} color="#1565C0" />
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              Reminders
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{visible.length}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.surfaceVariant }]} />

        {/* Alert rows */}
        {visible.map((alert, index) => {
          const ts = TYPE_STYLES[alert.type] ?? TYPE_STYLES.info;
          const isLast = index === visible.length - 1;
          return (
            <View key={alert._id}>
              <View style={styles.alertRow}>
                {/* Left accent bar */}
                <View style={[styles.accentBar, { backgroundColor: ts.accentColor }]} />

                {/* Icon */}
                <View style={[styles.iconBox, { backgroundColor: ts.iconBg }]}>
                  <MaterialCommunityIcons
                    name={(alert.icon as IconName) || 'information-outline'}
                    size={18}
                    color={ts.iconColor}
                  />
                </View>

                {/* Message */}
                <Text
                  style={[styles.message, { color: theme.colors.onSurface }]}
                  numberOfLines={2}
                >
                  {alert.message}
                </Text>

                {/* Dismiss button */}
                <TouchableOpacity
                  onPress={() => dismiss(alert._id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.dismissBtn}
                  accessibilityLabel="Dismiss alert"
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={15}
                    color={theme.colors.onSurfaceVariant}
                  />
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
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  dismissBtn: {
    flexShrink: 0,
  },

  rowDivider: {
    height: 1,
    marginLeft: 13,
  },
});
