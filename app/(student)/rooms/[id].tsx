import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  // Reservation modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [groupMatrics, setGroupMatrics] = useState<string[]>(['']);

  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();

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
      const res = await studentAPI.getRooms(hostelId);
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
    setIsGroup(false);
    setGroupMatrics(['']);
    setModalVisible(true);
  };

  const addGroupMember = () => {
    if (groupMatrics.length < (selectedRoom?.availableSpaces ?? 1) - 1) {
      setGroupMatrics([...groupMatrics, '']);
    }
  };

  const updateGroupMember = (index: number, value: string) => {
    const updated = [...groupMatrics];
    updated[index] = value.toUpperCase();
    setGroupMatrics(updated);
  };

  const removeGroupMember = (index: number) => {
    setGroupMatrics(groupMatrics.filter((_, i) => i !== index));
  };

  const handleReserve = async () => {
    if (!selectedRoom) return;

    const payload: any = { roomId: selectedRoom._id };

    if (isGroup) {
      const members = groupMatrics.map((m) => m.trim()).filter(Boolean);
      if (members.length === 0) {
        Alert.alert('Error', 'Add at least one group member matric number.');
        return;
      }
      payload.groupMembers = members;
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
                      backgroundColor: available ? '#e8f5e9' : item.status === 'maintenance' ? '#fff8e1' : '#ffebee',
                    }}
                    textStyle={{
                      color: available ? '#2e7d32' : item.status === 'maintenance' ? '#f57f17' : '#c62828',
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

                {/* Bed indicators */}
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

      {/* Reservation Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
            <ScrollView>
              <Text variant="titleLarge" style={styles.modalTitle}>
                Reserve Room {selectedRoom?.roomNumber}
              </Text>
              <Text variant="bodySmall" style={styles.modalSubtitle}>
                Capacity: {selectedRoom?.capacity} | Available: {selectedRoom?.availableSpaces}
              </Text>
              <Divider style={{ marginBottom: 16 }} />

              {/* Reservation type */}
              <Text variant="labelLarge" style={styles.label}>Reservation Type</Text>
              <View style={styles.typeRow}>
                <Button
                  mode={!isGroup ? 'contained' : 'outlined'}
                  onPress={() => setIsGroup(false)}
                  style={styles.typeBtn}
                  compact
                >
                  Individual
                </Button>
                <Button
                  mode={isGroup ? 'contained' : 'outlined'}
                  onPress={() => setIsGroup(true)}
                  style={styles.typeBtn}
                  compact
                  disabled={(selectedRoom?.availableSpaces ?? 0) < 2}
                >
                  Group
                </Button>
              </View>

              {/* Group members */}
              {isGroup && (
                <View style={{ marginTop: 12 }}>
                  <Text variant="labelMedium" style={styles.label}>
                    Group Members' Matric Numbers
                  </Text>
                  {groupMatrics.map((m, i) => (
                    <View key={i} style={styles.groupRow}>
                      <TextInput
                        mode="outlined"
                        value={m}
                        onChangeText={(v) => updateGroupMember(i, v)}
                        placeholder={`Member ${i + 1} matric`}
                        autoCapitalize="characters"
                        style={styles.groupInput}
                        dense
                      />
                      <IconButton
                        icon="close"
                        iconColor="#e53935"
                        size={18}
                        onPress={() => removeGroupMember(i)}
                      />
                    </View>
                  ))}
                  {groupMatrics.length < (selectedRoom?.availableSpaces ?? 1) - 1 && (
                    <Button icon="plus" onPress={addGroupMember} compact mode="text">
                      Add Member
                    </Button>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>
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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  list: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 14, borderRadius: 12 },
  cardDimmed: { opacity: 0.65 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roomNum: { fontWeight: 'bold' },
  occupancyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  beds: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  bed: { width: 24, height: 24, borderRadius: 4 },
  backBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: { fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { color: '#888', marginBottom: 4 },
  label: { color: '#444', marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1 },
  groupRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  groupInput: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
