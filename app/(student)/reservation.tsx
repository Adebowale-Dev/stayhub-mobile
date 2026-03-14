import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  Divider,
  ActivityIndicator,
  List,
  useTheme,
  TextInput,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { studentAPI } from '../../services/api';
import type { InvitationHistoryEntry, Reservation } from '../../types';

export default function ReservationScreen() {
  const [reservation, setReservation]   = useState<Reservation | null>(null);
  const [invitationHistory, setInvitationHistory] = useState<InvitationHistoryEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [cancelling, setCancelling]     = useState(false);
  const [responding, setResponding]     = useState<'approve' | 'reject' | null>(null);

  // Add-friends modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newMatrics, setNewMatrics]           = useState<string[]>(['']);
  const [addingMembers, setAddingMembers]     = useState(false);

  const theme = useTheme();

  const load = async () => {
    try {
      const [reservationRes, historyRes] = await Promise.allSettled([
        studentAPI.getReservation(),
        studentAPI.getInvitationHistory(),
      ]);

      if (reservationRes.status === 'fulfilled') {
        setReservation((reservationRes.value.data as any).data ?? reservationRes.value.data ?? null);
      } else {
        setReservation(null);
      }

      if (historyRes.status === 'fulfilled') {
        const historyData = (historyRes.value.data as any).data ?? historyRes.value.data ?? [];
        setInvitationHistory(Array.isArray(historyData) ? historyData : []);
      } else {
        setInvitationHistory([]);
      }
    } catch {
      setReservation(null);
      setInvitationHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  // ── Cancel reservation ──────────────────────────────────────────────────────
  const handleCancel = () => {
    if (!reservation) return;
    if (reservation.status === 'temporary') {
      handleInvitationResponse('reject');
      return;
    }
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

  const handleInvitationResponse = (action: 'approve' | 'reject') => {
    const title = action === 'approve' ? 'Approve Room Invitation' : 'Reject Room Invitation';
    const message =
      action === 'approve'
        ? 'Approve this room after your payment is sorted out. If payment is still pending, the system will ask you to complete it first.'
        : 'Rejecting this invitation will release the room space for someone else. Continue?';

    Alert.alert(title, message, [
      { text: 'No', style: 'cancel' },
      {
        text: action === 'approve' ? 'Approve' : 'Reject',
        style: action === 'approve' ? 'default' : 'destructive',
        onPress: async () => {
          setResponding(action);
          try {
            await studentAPI.respondToInvitation(action);
            Alert.alert(
              action === 'approve' ? 'Approved' : 'Rejected',
              action === 'approve'
                ? 'Your room invitation has been approved successfully.'
                : 'The room invitation has been rejected and released.'
            );
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message ?? 'Failed to update the room invitation.');
          } finally {
            setResponding(null);
          }
        },
      },
    ]);
  };

  // ── Add friends modal helpers ───────────────────────────────────────────────
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
    } else {
      setNewMatrics(newMatrics.filter((_, i) => i !== index));
    }
  };

  const handleAddMembers = async () => {
    if (!reservation) return;

    const filled = newMatrics.map((m) => m.trim()).filter(Boolean);

    if (filled.length === 0) {
      Alert.alert('Empty', 'Enter at least one matric number.');
      return;
    }

    // Check duplicates within the new entries
    if (new Set(filled).size !== filled.length) {
      Alert.alert('Duplicate Entry', 'Each matric number must be unique.');
      return;
    }

    // Check against already-existing members + the student themselves
    const existingMatrics = [
      reservation.student?.matricNumber,
      ...(reservation.groupMembers?.map((m) => m.matricNumber) ?? []),
    ].filter(Boolean);

    const alreadyIn = filled.find((m) => existingMatrics.includes(m));
    if (alreadyIn) {
      Alert.alert('Already Added', `${alreadyIn} is already part of this reservation.`);
      return;
    }

    setAddingMembers(true);
    try {
      await studentAPI.addGroupMembers(reservation._id, filled);
      setAddModalVisible(false);
      Alert.alert('Success', `${filled.length} friend${filled.length > 1 ? 's' : ''} added to your room.`);
      load(); // refresh reservation data
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message ?? 'Failed to add friends. Please try again.');
    } finally {
      setAddingMembers(false);
    }
  };

  // ── Loading / empty states ──────────────────────────────────────────────────
  const getHistoryParticipantName = (
    person?: InvitationHistoryEntry['relatedStudent'] | InvitationHistoryEntry['actor'],
    fallback = 'A student'
  ) => {
    if (!person) return fallback;

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

  const getHistoryMeta = (entry: InvitationHistoryEntry) => {
    if (entry.action === 'approved') {
      return {
        label: 'Approved',
        color: '#2E7D32',
        backgroundColor: '#E8F5E9',
        icon: 'check-circle-outline' as const,
      };
    }

    if (entry.action === 'rejected') {
      return {
        label: 'Rejected',
        color: '#C62828',
        backgroundColor: '#FFEBEE',
        icon: 'close-circle-outline' as const,
      };
    }

    if (entry.action === 'expired') {
      return {
        label: 'Expired',
        color: '#6D4C41',
        backgroundColor: '#EFEBE9',
        icon: 'timer-off-outline' as const,
      };
    }

    return {
      label: 'Pending',
      color: '#EF6C00',
      backgroundColor: '#FFF3E0',
      icon: 'clock-outline' as const,
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

    return parts.filter(Boolean).join(' • ');
  };

  const renderInvitationHistoryCard = () => {
    if (invitationHistory.length === 0) {
      return null;
    }

    return (
      <Card style={styles.card}>
        <Card.Title title="Invitation History" titleVariant="titleMedium" />
        <Divider />
        <Card.Content style={styles.historyList}>
          {invitationHistory.slice(0, 8).map((entry, index) => {
            const meta = getHistoryMeta(entry);

            return (
              <View key={entry._id ?? `${entry.action}-${entry.role}-${index}`} style={styles.historyItem}>
                <View style={[styles.historyIconBox, { backgroundColor: meta.backgroundColor }]}>
                  <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={styles.historyBody}>
                  <Text variant="titleSmall" style={styles.historyTitle}>
                    {getHistoryTitle(entry)}
                  </Text>
                  <Text variant="bodySmall" style={styles.historyDescription}>
                    {getHistoryDescription(entry)}
                  </Text>
                  {entry.createdAt && (
                    <Text variant="labelSmall" style={styles.historyTimestamp}>
                      {new Date(entry.createdAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>
                <Chip
                  compact
                  textStyle={{ fontSize: 10, color: meta.color }}
                  style={{ alignSelf: 'center', backgroundColor: meta.backgroundColor }}
                >
                  {meta.label}
                </Chip>
              </View>
            );
          })}
        </Card.Content>
      </Card>
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
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.emptyStateCard}>
            <MaterialCommunityIcons name="bed-empty" size={42} color="#BDBDBD" />
            <Text variant="headlineSmall" style={{ color: '#888', marginBottom: 8 }}>
              No Reservation
            </Text>
            <Text variant="bodyMedium" style={{ color: '#666', textAlign: 'center' }}>
              You have not reserved a room yet. Browse hostels to make a reservation.
            </Text>
          </Card.Content>
        </Card>

        {renderInvitationHistoryCard()}
      </ScrollView>
    );
  }

  const statusColor = {
    temporary: '#ef6c00',
    confirmed: '#4caf50',
    pending:   '#ff9800',
    cancelled: '#e53935',
    checked_in: '#1565c0',
    expired: '#9e9e9e',
  }[reservation.status] ?? '#9e9e9e';

  const availableSpaces  = reservation.room?.availableSpaces ?? 0;
  const isTemporaryInvite = reservation.status === 'temporary';
  const reservedByName = reservation.reservedBy
    ? `${reservation.reservedBy.firstName ?? ''} ${reservation.reservedBy.lastName ?? ''}`.trim()
    : 'A friend';
  const isReservationOwner =
    !reservation.reservedBy ||
    reservation.reservedBy._id === reservation.student?._id ||
    !isTemporaryInvite;
  const canAddFriends    =
    reservation.status === 'confirmed' &&
    availableSpaces > 0;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Status Banner ── */}
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

        {/* ── Accommodation Details ── */}
        {isTemporaryInvite && (
          <Card style={styles.card}>
            <Card.Content style={styles.inviteBox}>
              <Text variant="titleMedium" style={styles.inviteTitle}>
                Room waiting for your approval
              </Text>
              <Text variant="bodyMedium" style={styles.inviteText}>
                {reservedByName} reserved this room for you. Approve it within 24 hours after sorting your payment or network issue.
              </Text>
              <View style={styles.inviteActions}>
                <Button
                  mode="contained"
                  icon="check-circle-outline"
                  onPress={() => handleInvitationResponse('approve')}
                  loading={responding === 'approve'}
                  disabled={responding !== null}
                  style={{ flex: 1 }}
                >
                  Approve Room
                </Button>
                <Button
                  mode="outlined"
                  icon="close-circle-outline"
                  onPress={() => handleInvitationResponse('reject')}
                  loading={responding === 'reject'}
                  disabled={responding !== null}
                  textColor="#e53935"
                  style={{ flex: 1, borderColor: '#e53935' }}
                >
                  Reject
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

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

        {/* ── Group Members ── */}
        <Card style={styles.card}>
          <Card.Title
            title="Room Members"
            titleVariant="titleMedium"
            subtitle={
              canAddFriends
                ? `${availableSpaces} spot${availableSpaces !== 1 ? 's' : ''} still available`
                : undefined
            }
            subtitleStyle={{ color: '#1565C0', fontSize: 12 }}
          />
          <Divider />
          <Card.Content style={styles.detailsContent}>
            {/* The student themselves */}
            <List.Item
              title={reservation.student?.matricNumber ?? 'You'}
              description={
                reservation.student
                  ? `${reservation.student.firstName} ${reservation.student.lastName} (You)`
                  : 'You'
              }
              left={(p) => <List.Icon {...p} icon="account-star" />}
              right={() => (
                <Chip compact textStyle={{ fontSize: 10, color: '#2e7d32' }}
                  style={{ backgroundColor: '#e8f5e9', alignSelf: 'center' }}>
                  {isReservationOwner ? 'Host' : 'You'}
                </Chip>
              )}
            />

            {/* Existing group members */}
            {(reservation.groupMembers ?? []).map((m, i) => (
              <List.Item
                key={i}
                title={m.matricNumber}
                description={m.firstName ? `${m.firstName} ${m.lastName ?? ''}` : undefined}
                left={(p) => <List.Icon {...p} icon="account" />}
                right={() =>
                  m.status ? (
                    <Chip compact textStyle={{ fontSize: 10 }} style={{ alignSelf: 'center' }}>
                      {m.status}
                    </Chip>
                  ) : null
                }
              />
            ))}

            {/* Available slots placeholder */}
            {canAddFriends && (
              <View style={styles.emptySlots}>
                {Array.from({ length: availableSpaces }).map((_, i) => (
                  <View key={i} style={styles.emptySlot}>
                    <MaterialCommunityIcons name="account-plus-outline" size={18} color="#bdbdbd" />
                    <Text variant="bodySmall" style={{ color: '#bdbdbd' }}>Empty bed</Text>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>

          {/* Add friends button */}
          {canAddFriends && (
            <Card.Actions>
              <Button
                mode="contained-tonal"
                icon="account-plus"
                onPress={openAddModal}
              >
                Add Friends to This Room
              </Button>
            </Card.Actions>
          )}
        </Card>

        {/* ── Cancel button ── */}
        {reservation.status !== 'temporary' && reservation.status !== 'cancelled' && reservation.status !== 'checked_in' && (
          <Button
            mode="outlined"
            icon="cancel"
            onPress={handleCancel}
            loading={cancelling}
            disabled={cancelling || responding !== null}
            textColor="#e53935"
            style={styles.cancelBtn}
          >
            Cancel Reservation
          </Button>
        )}

        {renderInvitationHistoryCard()}
      </ScrollView>

      {/* ── Add Friends Modal ── */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                {/* Header */}
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Add Friends to Room {reservation.room?.roomNumber}
                </Text>
                <Text variant="bodySmall" style={styles.modalSubtitle}>
                  {availableSpaces} bed{availableSpaces !== 1 ? 's' : ''} still available and each friend gets a 24-hour approval email
                </Text>
                <Divider style={{ marginBottom: 16 }} />

                {/* Matric inputs */}
                <Text variant="labelMedium" style={styles.label}>Friends' matric numbers</Text>
                {newMatrics.map((m, i) => (
                  <View key={i} style={styles.matricRow}>
                    <TextInput
                      mode="outlined"
                      value={m}
                      onChangeText={(v) => updateMatric(i, v)}
                      placeholder={`Friend ${i + 1} matric number`}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      style={styles.matricInput}
                      dense
                      left={<TextInput.Icon icon="account" />}
                    />
                    <IconButton
                      icon="close-circle"
                      iconColor="#e53935"
                      size={20}
                      onPress={() => removeMatricField(i)}
                    />
                  </View>
                ))}

                {newMatrics.length < availableSpaces && (
                  <Button
                    icon="account-plus"
                    mode="outlined"
                    onPress={addMatricField}
                    compact
                    style={styles.addMoreBtn}
                  >
                    Add Another Friend
                  </Button>
                )}

                {/* Summary */}
                <View style={[styles.summaryBox, { backgroundColor: '#EEF2FF' }]}>
                  <MaterialCommunityIcons name="information-outline" size={16} color="#1565C0" />
                  <Text variant="bodySmall" style={styles.summaryText}>
                    {newMatrics.filter(m => m.trim()).length === 0
                      ? 'Enter a matric number above to add a friend.'
                      : `${newMatrics.filter(m => m.trim()).length} friend${newMatrics.filter(m => m.trim()).length > 1 ? 's' : ''} will receive an email invitation for room ${reservation.room?.roomNumber}.`}
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setAddModalVisible(false)}
                  style={{ flex: 1 }}
                  disabled={addingMembers}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAddMembers}
                  loading={addingMembers}
                  disabled={addingMembers}
                  style={{ flex: 1 }}
                >
                  Add Friends
                </Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:      { padding: 16, paddingBottom: 32 },
  bannerCard:   { marginBottom: 16, borderRadius: 12 },
  bannerContent:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card:         { marginBottom: 16, borderRadius: 12 },
  detailsContent:{ paddingTop: 4, paddingBottom: 8 },
  emptyStateCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  cancelBtn:    { borderColor: '#e53935', borderRadius: 10 },
  inviteBox:    { gap: 12 },
  inviteTitle:  { fontWeight: '700' },
  inviteText:   { color: '#455a64', lineHeight: 20 },
  inviteActions:{ flexDirection: 'row', gap: 12 },
  historyList:  { paddingTop: 12, gap: 12 },
  historyItem:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: { flex: 1, gap: 4 },
  historyTitle: { fontWeight: '700' },
  historyDescription: { color: '#546E7A', lineHeight: 18 },
  historyTimestamp: { color: '#90A4AE', marginTop: 2 },

  emptySlots: { paddingHorizontal: 16, gap: 6, marginTop: 4, marginBottom: 8 },
  emptySlot:  {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#e0e0e0', borderStyle: 'dashed',
    borderRadius: 8,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle:    { fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { color: '#888', marginBottom: 4 },
  label:         { color: '#444', marginBottom: 10 },
  matricRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  matricInput:   { flex: 1 },
  addMoreBtn:    { marginTop: 4, borderStyle: 'dashed' },
  summaryBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 10, marginTop: 16,
  },
  summaryText:   { flex: 1, color: '#1565C0', lineHeight: 18 },
  modalActions:  { flexDirection: 'row', gap: 12, marginTop: 16 },
});
