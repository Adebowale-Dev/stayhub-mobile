import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, Divider } from 'react-native-paper';
import { Badge } from './ui/Badge';
import type { Reservation } from '../types';

interface Props {
  reservation: Reservation;
  onViewDetails?: () => void;
  onCancel?: () => void;
}

const statusVariant = (s: string) => {
  if (s === 'confirmed') return 'success' as const;
  if (s === 'pending') return 'warning' as const;
  if (s === 'cancelled') return 'error' as const;
  return 'neutral' as const;
};

export function ReservationCard({ reservation, onViewDetails, onCancel }: Props) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            {reservation.hostel?.name ?? 'Hostel'}
          </Text>
          <Badge label={reservation.status} variant={statusVariant(reservation.status)} />
        </View>

        <Divider style={styles.divider} />

        <View style={styles.row}>
          <Text variant="labelSmall" style={styles.label}>Room</Text>
          <Text variant="bodyMedium">{reservation.room?.roomNumber ?? '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="labelSmall" style={styles.label}>Capacity</Text>
          <Text variant="bodyMedium">{reservation.room?.capacity ?? '-'} persons</Text>
        </View>
        {reservation.groupMembers && reservation.groupMembers.length > 0 && (
          <View style={styles.row}>
            <Text variant="labelSmall" style={styles.label}>Group Size</Text>
            <Text variant="bodyMedium">{reservation.groupMembers.length + 1} students</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text variant="labelSmall" style={styles.label}>Date</Text>
          <Text variant="bodyMedium">
            {new Date(reservation.createdAt).toLocaleDateString('en-GB')}
          </Text>
        </View>
      </Card.Content>

      {(onViewDetails || onCancel) && (
        <Card.Actions>
          {onViewDetails && (
            <Button onPress={onViewDetails} compact>Details</Button>
          )}
          {onCancel && reservation.status !== 'cancelled' && (
            <Button onPress={onCancel} compact textColor="#e53935">Cancel</Button>
          )}
        </Card.Actions>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontWeight: 'bold', flex: 1 },
  divider: { marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#888' },
});
