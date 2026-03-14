import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { Badge } from './ui/Badge';
import type { Room } from '../types';
interface Props {
    room: Room;
    onReserve: (room: Room) => void;
}
export function RoomCard({ room, onReserve }: Props) {
    const available = room.status === 'available' && room.availableSpaces > 0;
    return (<Card style={[styles.card, !available && styles.dimmed]}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.roomNum}>
            Room {room.roomNumber}
          </Text>
          <Badge label={available ? 'Available' : room.status === 'maintenance' ? 'Maintenance' : 'Full'} variant={available ? 'success' : room.status === 'maintenance' ? 'warning' : 'error'}/>
        </View>

        <View style={styles.occupancy}>
          <Text variant="bodySmall" style={{ color: '#666' }}>
            {room.currentOccupancy}/{room.capacity} occupied
          </Text>
          <Text variant="bodySmall" style={{ color: '#1565C0' }}>
            {room.availableSpaces} space{room.availableSpaces !== 1 ? 's' : ''} left
          </Text>
        </View>

        
        <View style={styles.beds}>
          {Array.from({ length: room.capacity }).map((_, i) => (<View key={i} style={[
                styles.bed,
                { backgroundColor: i < room.currentOccupancy ? '#ef9a9a' : '#a5d6a7' },
            ]}/>))}
        </View>
      </Card.Content>
      <Card.Actions>
        <Button mode="contained" compact onPress={() => onReserve(room)} disabled={!available}>
          Reserve
        </Button>
      </Card.Actions>
    </Card>);
}
const styles = StyleSheet.create({
    card: { borderRadius: 12, marginBottom: 14 },
    dimmed: { opacity: 0.65 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    roomNum: { fontWeight: 'bold' },
    occupancy: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    beds: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    bed: { width: 24, height: 24, borderRadius: 4 },
});
