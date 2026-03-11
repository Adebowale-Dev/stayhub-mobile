import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Divider, ActivityIndicator, List, useTheme } from 'react-native-paper';
import { studentAPI } from '../../services/api';
import type { Reservation } from '../../types';

export default function ReservationScreen() {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const theme = useTheme();

  const load = async () => {
    try {
      const res = await studentAPI.getReservation();
      setReservation((res.data as any).data ?? res.data ?? null);
    } catch {
      setReservation(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleCancel = () => {
    if (!reservation) return;
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this reservation? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await studentAPI.cancelReservation(reservation._id);
              Alert.alert('Cancelled', 'Your reservation has been cancelled.');
              setReservation(null);
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message ?? 'Failed to cancel reservation.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="headlineSmall" style={{ color: '#888', marginBottom: 8 }}>
          No Reservation
        </Text>
        <Text variant="bodyMedium" style={{ color: '#aaa', textAlign: 'center', paddingHorizontal: 32 }}>
          You have not reserved a room yet. Browse hostels to make a reservation.
        </Text>
      </View>
    );
  }

  const statusColor = {
    confirmed: '#4caf50',
    pending: '#ff9800',
    cancelled: '#e53935',
  }[reservation.status] ?? '#9e9e9e';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Status Banner */}
      <Card style={[styles.bannerCard, { borderLeftColor: statusColor, borderLeftWidth: 6 }]}>
        <Card.Content style={styles.bannerContent}>
          <View>
            <Text variant="labelSmall" style={{ color: '#888' }}>Reservation Status</Text>
            <Text variant="titleLarge" style={{ color: statusColor, fontWeight: 'bold', textTransform: 'capitalize' }}>
              {reservation.status}
            </Text>
          </View>
          <Chip style={{ backgroundColor: `${statusColor}22` }} textStyle={{ color: statusColor }}>
            {reservation.status?.toUpperCase() ?? 'UNKNOWN'}
          </Chip>
        </Card.Content>
      </Card>

      {/* Hostel & Room */}
      <Card style={styles.card}>
        <Card.Title title="Accommodation Details" titleVariant="titleMedium" />
        <Divider />
        <Card.Content style={styles.detailsContent}>
          <List.Item
            title="Hostel"
            description={reservation.hostel?.name ?? '-'}
            left={(p) => <List.Icon {...p} icon="home-city" />}
          />
          <List.Item
            title="Room Number"
            description={reservation.room?.roomNumber ?? '-'}
            left={(p) => <List.Icon {...p} icon="bed" />}
          />
          <List.Item
            title="Capacity"
            description={`${reservation.room?.capacity ?? '-'} persons`}
            left={(p) => <List.Icon {...p} icon="account-group" />}
          />
          <List.Item
            title="Reserved On"
            description={new Date(reservation.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
            left={(p) => <List.Icon {...p} icon="calendar" />}
          />
        </Card.Content>
      </Card>

      {/* Group Members */}
      {reservation.groupMembers && reservation.groupMembers.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Group Members" titleVariant="titleMedium" />
          <Divider />
          <Card.Content style={styles.detailsContent}>
            {reservation.groupMembers.map((m, i) => (
              <List.Item
                key={i}
                title={m.matricNumber}
                description={
                  m.firstName
                    ? `${m.firstName} ${m.lastName ?? ''}`
                    : undefined
                }
                left={(p) => <List.Icon {...p} icon="account" />}
                right={() =>
                  m.status ? (
                    <Chip compact textStyle={{ fontSize: 10 }}>
                      {m.status}
                    </Chip>
                  ) : null
                }
              />
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      {reservation.status !== 'cancelled' && (
        <Button
          mode="outlined"
          icon="cancel"
          onPress={handleCancel}
          loading={cancelling}
          disabled={cancelling}
          textColor="#e53935"
          style={styles.cancelBtn}
        >
          Cancel Reservation
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  bannerCard: { marginBottom: 16, borderRadius: 12 },
  bannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { marginBottom: 16, borderRadius: 12 },
  detailsContent: { paddingTop: 4, paddingBottom: 8 },
  cancelBtn: { borderColor: '#e53935', borderRadius: 10 },
});
