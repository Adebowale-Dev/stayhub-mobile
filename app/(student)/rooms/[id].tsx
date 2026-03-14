import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  ActivityIndicator,
  TextInput,
  Divider,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { studentAPI } from '../../../services/api';
import type { Room } from '../../../types';

export default function RoomsScreen() {
  const { id: hostelId } = useLocalSearchParams<{ id: string }>();
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [loading, setLoading]     = useState(true);
  const [reserving, setReserving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [groupMatrics, setGroupMatrics] = useState<string[]>([]);

  const router     = useRouter();
  const navigation = useNavigation();
  const theme      = useTheme();

  useEffect(() => {
    navigation.setOptions({
      title: 'Available Rooms',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.navigate('/(student)/hostels')} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
      ),
    });
    loadRooms();
  }, [hostelId]);

  const loadRooms = async () => {
    if (!hostelId) return;
    try {
      const res  = await studentAPI.getRooms(hostelId);
      const data: Room[] = (res.data as any).data ?? res.data ?? [];
      setRooms(data);
    } catch {
      Alert.alert('Error', 'Failed to load rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openReservation = (room: Room) => {
    setSelectedRoom(room);
    setGroupMatrics([]);
    setModalVisible(true);
  };

  const maxFriends = (selectedRoom?.availableSpaces ?? 1) - 1;
  const filledMatrics = groupMatrics.map((m) => m.trim()).filter(Boolean);
  const totalReserving = 1 + filledMatrics.length; // you + filled friends

  const addFriend = () => {
    if (groupMatrics.length < maxFriends) {
      setGroupMatrics([...groupMatrics, '']);
    }
  };

  const updateFriend = (index: number, value: string) => {
    const updated = [...groupMatrics];
    updated[index] = value.toUpperCase();
    setGroupMatrics(updated);
  };

  const removeFriend = (index: number) => {
    setGroupMatrics(groupMatrics.filter((_, i) => i !== index));
  };

  const handleReserve = async () => {
    if (!selectedRoom) return;

    // Validate duplicates
    const uniqueCheck = new Set(filledMatrics);
    if (uniqueCheck.size !== filledMatrics.length) {
      Alert.alert('Duplicate Entry', 'Each friend must have a unique matric number.');
      return;
    }

    const payload: any = { roomId: selectedRoom._id, hostelId };
    if (filledMatrics.length > 0) {
      payload.groupMembers = filledMatrics;
    }

    setReserving(true);
    try {
      await studentAPI.reserveRoom(payload);
      setModalVisible(false);
      Alert.alert('Success', 'Room reserved successfully!', [
        { text: 'View Reservation', onPress: () => router.push('/(student)/reservation') },
        { text: 'OK' },
      ]);
      loadRooms();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message ?? 'Reservation failed. Please try again.');
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text variant="bodyLarge" style={{ color: '#888' }}>No rooms found.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const available = item.status === 'available' && item.availableSpaces > 0;
          return (
            <Card style={[styles.card, !available && styles.cardDimmed]}>
              <Card.Content>
                <View style={styles.roomHeader}>
                  <Text variant="titleMedium" style={styles.roomNum}>
                    Room {item.roomNumber}
                  </Text>
                  <Chip
                    style={{
                      backgroundColor: available
                        ? '#e8f5e9'
                        : item.status === 'maintenance' ? '#fff8e1' : '#ffebee',
                    }}
                    textStyle={{
                      color: available
                        ? '#2e7d32'
                        : item.status === 'maintenance' ? '#f57f17' : '#c62828',
                      fontSize: 11,
                    }}
                  >
                    {available ? 'Available' : item.status === 'maintenance' ? 'Maintenance' : 'Full'}
                  </Chip>
                </View>

                <View style={styles.occupancyRow}>
                  <Text variant="bodySmall" style={{ color: '#666' }}>
                    Occupancy: {item.currentOccupancy}/{item.capacity}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#1565C0' }}>
                    {item.availableSpaces} space{item.availableSpaces !== 1 ? 's' : ''} left
                  </Text>
                </View>

                <View style={styles.beds}>
                  {Array.from({ length: item.capacity }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.bed,
                        { backgroundColor: i < item.currentOccupancy ? '#ef9a9a' : '#a5d6a7' },
                      ]}
                    />
                  ))}
                </View>
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  onPress={() => openReservation(item)}
                  disabled={!available}
                  compact
                >
                  Reserve
                </Button>
              </Card.Actions>
            </Card>
          );
        }}
      />

      {/* ─── Reservation Modal ─── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.kavContainer}
          >
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                {/* Header */}
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Reserve Room {selectedRoom?.roomNumber}
                </Text>
                <Text variant="bodySmall" style={styles.modalSubtitle}>
                  {selectedRoom?.capacity}-person room · {selectedRoom?.availableSpaces} bed{selectedRoom?.availableSpaces !== 1 ? 's' : ''} available
                </Text>
                <Divider style={{ marginBottom: 16 }} />

                {/* ── Bed slot visualizer ── */}
                <Text variant="labelMedium" style={styles.label}>Bed Layout</Text>
                <View style={styles.bedSlots}>
                  {Array.from({ length: selectedRoom?.capacity ?? 0 }).map((_, i) => {
                    const occupied  = selectedRoom?.currentOccupancy ?? 0;
                    const reserving = totalReserving;
                    let bg = '#e0e0e0'; // empty/available
                    if (i < occupied)              bg = '#ef9a9a'; // already occupied
                    else if (i < occupied + 1)     bg = '#1565C0'; // your bed (you)
                    else if (i < occupied + reserving) bg = '#42A5F5'; // friend's bed
                    return (
                      <View key={i} style={[styles.bedSlot, { backgroundColor: bg }]}>
                        {i < occupied && (
                          <MaterialCommunityIcons name="account" size={12} color="#fff" />
                        )}
                        {i >= occupied && i < occupied + 1 && (
                          <MaterialCommunityIcons name="account-star" size={12} color="#fff" />
                        )}
                        {i >= occupied + 1 && i < occupied + reserving && (
                          <MaterialCommunityIcons name="account-plus" size={12} color="#fff" />
                        )}
                      </View>
                    );
                  })}
                </View>
                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ef9a9a' }]} />
                    <Text variant="bodySmall" style={styles.legendText}>Occupied</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#1565C0' }]} />
                    <Text variant="bodySmall" style={styles.legendText}>You</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#42A5F5' }]} />
                    <Text variant="bodySmall" style={styles.legendText}>Friend(s)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#e0e0e0' }]} />
                    <Text variant="bodySmall" style={styles.legendText}>Empty</Text>
                  </View>
                </View>

                <Divider style={{ marginVertical: 16 }} />

                {/* ── Friends section ── */}
                <View style={styles.friendsHeader}>
                  <Text variant="labelLarge" style={styles.label}>
                    Friends sharing this room
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>
                    Optional · up to {maxFriends}
                  </Text>
                </View>

                {maxFriends === 0 ? (
                  <Text variant="bodySmall" style={styles.noSpaceHint}>
                    Only 1 space left — no room for friends.
                  </Text>
                ) : (
                  <>
                    <Text variant="bodySmall" style={styles.groupHint}>
                      All friends will be assigned to the same room as you. Enter their matric numbers below.
                    </Text>

                    {groupMatrics.map((m, i) => (
                      <View key={i} style={styles.groupRow}>
                        <TextInput
                          mode="outlined"
                          value={m}
                          onChangeText={(v) => updateFriend(i, v)}
                          placeholder={`Friend ${i + 1} matric number`}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          style={styles.groupInput}
                          dense
                          left={<TextInput.Icon icon="account" />}
                        />
                        <IconButton
                          icon="close-circle"
                          iconColor="#e53935"
                          size={20}
                          onPress={() => removeFriend(i)}
                        />
                      </View>
                    ))}

                    {groupMatrics.length < maxFriends && (
                      <Button
                        icon="account-plus"
                        onPress={addFriend}
                        compact
                        mode="outlined"
                        style={styles.addFriendBtn}
                      >
                        Add a Friend
                      </Button>
                    )}
                  </>
                )}

                {/* ── Summary ── */}
                <View style={[styles.summaryBox, { backgroundColor: '#EEF2FF' }]}>
                  <MaterialCommunityIcons name="information-outline" size={16} color="#1565C0" />
                  <Text variant="bodySmall" style={styles.summaryText}>
                    {filledMatrics.length === 0
                      ? 'Reserving 1 bed for yourself.'
                      : `Reserving ${totalReserving} beds — you + ${filledMatrics.length} friend${filledMatrics.length > 1 ? 's' : ''} in the same room.`}
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1 }}
                  disabled={reserving}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleReserve}
                  loading={reserving}
                  disabled={reserving}
                  style={{ flex: 1 }}
                >
                  Confirm
                </Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f0f4ff' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  list:        { padding: 16, paddingBottom: 32 },
  card:        { marginBottom: 14, borderRadius: 12 },
  cardDimmed:  { opacity: 0.65 },
  roomHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roomNum:     { fontWeight: 'bold' },
  occupancyRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  beds:        { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  bed:         { width: 24, height: 24, borderRadius: 4 },
  backBtn:     { paddingHorizontal: 8, paddingVertical: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  kavContainer: { width: '100%' },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '88%',
  },
  modalTitle:    { fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { color: '#888', marginBottom: 4 },
  label:         { color: '#444', marginBottom: 8 },

  // Bed visualizer
  bedSlots: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  bedSlot:  {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  legend:     { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#666', fontSize: 11 },

  // Friends
  friendsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  groupHint:     { color: '#888', marginBottom: 12, lineHeight: 18, fontSize: 12 },
  noSpaceHint:   { color: '#e57373', marginBottom: 12, fontSize: 12 },
  groupRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  groupInput:    { flex: 1 },
  addFriendBtn:  { marginTop: 4, borderStyle: 'dashed' },

  // Summary
  summaryBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 10, marginTop: 16,
  },
  summaryText: { flex: 1, color: '#1565C0', lineHeight: 18 },

  // Actions
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
