import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Hostel } from '../types';
interface Props {
    hostel: Hostel;
    onPress: () => void;
}
export function HostelCard({ hostel, onPress }: Props) {
    const theme = useTheme();
    const isMale = hostel.gender === 'male';
    const isFull = hostel.availableRooms === 0;
    const ratio = hostel.totalRooms > 0 ? hostel.availableRooms / hostel.totalRooms : 0;
    const accentColor = isMale ? '#1565C0' : '#C2185B';
    const genderBg = isMale ? '#E3F2FD' : '#FCE4EC';
    const genderText = isMale ? '#1565C0' : '#C2185B';
    const barColor = ratio > 0.5 ? '#43A047' : ratio > 0 ? '#FF9800' : '#E53935';
    return (<TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>

        
        <View style={[styles.accent, { backgroundColor: accentColor }]}/>

        <View style={styles.body}>

          
          <View style={styles.headerRow}>
            <Text style={[styles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {hostel.name}
            </Text>
            <View style={styles.badges}>
              {isFull && (<View style={styles.fullBadge}>
                  <Text style={styles.fullBadgeText}>Full</Text>
                </View>)}
              <View style={[styles.genderChip, { backgroundColor: genderBg }]}>
                <MaterialCommunityIcons name={isMale ? 'human-male' : 'human-female'} size={11} color={genderText}/>
                <Text style={[styles.genderChipText, { color: genderText }]}>
                  {isMale ? 'Male' : 'Female'}
                </Text>
              </View>
            </View>
          </View>

          
          {hostel.description ? (<Text style={[styles.desc, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
              {hostel.description}
            </Text>) : null}

          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="bed-outline" size={14} color={theme.colors.onSurfaceVariant}/>
              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                {hostel.totalRooms} rooms total
              </Text>
            </View>
            <View style={styles.statDot}/>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name={isFull ? 'close-circle-outline' : 'check-circle-outline'} size={14} color={barColor}/>
              <Text style={[styles.statText, { color: barColor, fontWeight: '600' }]}>
                {hostel.availableRooms} available
              </Text>
            </View>
          </View>

          
          <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={[
            styles.barFill,
            { width: `${Math.max(ratio * 100, 0)}%`, backgroundColor: barColor },
        ]}/>
          </View>

          
          {hostel.amenities && hostel.amenities.length > 0 && (<View style={styles.amenities}>
              {hostel.amenities.slice(0, 4).map((a) => (<View key={a} style={[styles.amenityTag, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Text style={[styles.amenityText, { color: theme.colors.onSurfaceVariant }]}>
                    {a}
                  </Text>
                </View>))}
              {hostel.amenities.length > 4 && (<View style={[styles.amenityTag, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Text style={[styles.amenityText, { color: theme.colors.onSurfaceVariant }]}>
                    +{hostel.amenities.length - 4}
                  </Text>
                </View>)}
            </View>)}

          
          <View style={[styles.footer, { borderTopColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.footerText, { color: accentColor }]}>
              View Rooms
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={15} color={accentColor}/>
          </View>
        </View>
      </View>
    </TouchableOpacity>);
}
const styles = StyleSheet.create({
    wrap: { marginBottom: 14 },
    card: {
        flexDirection: 'row',
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
    },
    accent: { width: 5 },
    body: { flex: 1, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 0 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    name: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
    badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
    fullBadge: {
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    fullBadgeText: { fontSize: 10, fontWeight: '700', color: '#C62828' },
    genderChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
    },
    genderChipText: { fontSize: 11, fontWeight: '600' },
    desc: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 12 },
    statDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#BDBDBD' },
    barTrack: { height: 5, borderRadius: 3, marginBottom: 10, overflow: 'hidden' },
    barFill: { height: 5, borderRadius: 3 },
    amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
    amenityTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    amenityText: { fontSize: 10, fontWeight: '500' },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        borderTopWidth: 1,
        paddingVertical: 10,
        marginTop: 2,
    },
    footerText: { fontSize: 13, fontWeight: '600' },
});
