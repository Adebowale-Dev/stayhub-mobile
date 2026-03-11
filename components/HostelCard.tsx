import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Badge } from './ui/Badge';
import type { Hostel } from '../types';

interface Props {
  hostel: Hostel;
  onPress: () => void;
}

export function HostelCard({ hostel, onPress }: Props) {
  const noRooms = hostel.availableRooms === 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
              {hostel.name}
            </Text>
            <Badge
              label={hostel.gender === 'female' ? 'Female' : 'Male'}
              variant={hostel.gender === 'female' ? 'error' : 'info'}
            />
          </View>

          {hostel.description ? (
            <Text variant="bodySmall" style={styles.desc} numberOfLines={2}>
              {hostel.description}
            </Text>
          ) : null}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text variant="labelSmall" style={styles.statLabel}>Total</Text>
              <Text variant="titleSmall">{hostel.totalRooms}</Text>
            </View>
            <View style={styles.stat}>
              <Text variant="labelSmall" style={styles.statLabel}>Available</Text>
              <Text variant="titleSmall" style={{ color: noRooms ? '#e53935' : '#2e7d32' }}>
                {hostel.availableRooms}
              </Text>
            </View>
          </View>
        </Card.Content>
        <Card.Actions>
          <Text variant="labelMedium" style={{ color: '#1565C0' }}>View Rooms →</Text>
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontWeight: 'bold', flex: 1 },
  desc: { color: '#666', marginBottom: 8 },
  stats: { flexDirection: 'row', gap: 24 },
  stat: {},
  statLabel: { color: '#888' },
});
