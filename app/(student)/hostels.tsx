import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Card, Text, Chip, Searchbar, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { studentAPI } from '../../services/api';
import type { Hostel } from '../../types';

export default function HostelsScreen() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [filtered, setFiltered] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const theme = useTheme();

  const loadHostels = async () => {
    try {
      const res = await studentAPI.getHostels();
      const data: Hostel[] = (res.data as any).data ?? res.data ?? [];
      setHostels(data);
      setFiltered(data);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadHostels(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? hostels.filter((h) => h.name.toLowerCase().includes(q)) : hostels
    );
  }, [search, hostels]);

  const onRefresh = () => { setRefreshing(true); loadHostels(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search hostels..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text variant="bodyLarge" style={{ color: '#888' }}>No hostels found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(student)/rooms/${item._id}`)}
            activeOpacity={0.85}
          >
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={styles.hostelName}>{item.name}</Text>
                  <Chip
                    style={[
                      styles.genderChip,
                      { backgroundColor: item.gender === 'female' ? '#fce4ec' : '#e3f2fd' },
                    ]}
                    textStyle={{
                      color: item.gender === 'female' ? '#c2185b' : '#1565C0',
                      fontSize: 11,
                    }}
                  >
                    {item.gender === 'female' ? 'Female' : 'Male'}
                  </Chip>
                </View>

                {item.description && (
                  <Text variant="bodySmall" style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text variant="labelSmall" style={styles.statLabel}>Total Rooms</Text>
                    <Text variant="titleSmall">{item.totalRooms}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text variant="labelSmall" style={styles.statLabel}>Available</Text>
                    <Text
                      variant="titleSmall"
                      style={{ color: item.availableRooms > 0 ? '#2e7d32' : '#e53935' }}
                    >
                      {item.availableRooms}
                    </Text>
                  </View>
                </View>

                {item.amenities && item.amenities.length > 0 && (
                  <View style={styles.amenities}>
                    {item.amenities.slice(0, 4).map((a) => (
                      <Chip key={a} compact style={styles.amenityChip} textStyle={{ fontSize: 10 }}>
                        {a}
                      </Chip>
                    ))}
                  </View>
                )}
              </Card.Content>
              <Card.Actions>
                <Text variant="labelMedium" style={{ color: '#1565C0' }}>
                  View Rooms →
                </Text>
              </Card.Actions>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  search: { margin: 16, borderRadius: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { marginBottom: 14, borderRadius: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  hostelName: { fontWeight: 'bold', flex: 1 },
  genderChip: { marginLeft: 8 },
  desc: { color: '#666', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 24, marginBottom: 8 },
  stat: {},
  statLabel: { color: '#888' },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  amenityChip: { backgroundColor: '#e8eaf6' },
});
