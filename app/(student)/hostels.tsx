import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, StatusBar, Platform, KeyboardAvoidingView, TextInput as RNTextInput, } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { studentAPI } from '../../services/api';
import { HostelCard } from '../../components/HostelCard';
import { useAuthStore } from '../../store/authStore';
import type { Hostel } from '../../types';
function SkeletonCard({ surface }: {
    surface: string;
}) {
    return (<View style={[skeletonStyles.card, { backgroundColor: surface }]}>
      <View style={skeletonStyles.accent}/>
      <View style={skeletonStyles.body}>
        <View style={skeletonStyles.row}>
          <View style={[skeletonStyles.box, { flex: 1, height: 16 }]}/>
          <View style={[skeletonStyles.box, { width: 52, height: 22, borderRadius: 12 }]}/>
        </View>
        <View style={[skeletonStyles.box, { height: 11, marginTop: 8, width: '85%' }]}/>
        <View style={[skeletonStyles.box, { height: 11, marginTop: 5, width: '60%' }]}/>
        <View style={[skeletonStyles.box, { height: 5, marginTop: 12, borderRadius: 3 }]}/>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          <View style={[skeletonStyles.box, { width: 44, height: 20, borderRadius: 6 }]}/>
          <View style={[skeletonStyles.box, { width: 36, height: 20, borderRadius: 6 }]}/>
          <View style={[skeletonStyles.box, { width: 52, height: 20, borderRadius: 6 }]}/>
        </View>
      </View>
    </View>);
}
export default function HostelsScreen() {
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const router = useRouter();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const searchRef = useRef<RNTextInput>(null);
    const user = useAuthStore((s) => s.user);
    const studentGender = (user?.gender ?? 'male') as 'male' | 'female';
    const loadHostels = async () => {
        setError(false);
        try {
            const res = await studentAPI.getHostels();
            const data: Hostel[] = (res.data as any).data ?? res.data ?? [];
            setHostels(data);
        }
        catch {
            setError(true);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    useEffect(() => { loadHostels(); }, []);
    const onRefresh = () => { setRefreshing(true); loadHostels(); };
    const filtered = hostels.filter((h) => {
        const matchGender = h.gender === studentGender;
        const matchSearch = !search.trim() || h.name.toLowerCase().includes(search.toLowerCase());
        return matchGender && matchSearch;
    });
    const totalAvailable = filtered.reduce((sum, h) => sum + h.availableRooms, 0);
    const ListHeader = () => (<>
      
      <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <View style={styles.bubble1}/>
        <View style={styles.bubble2}/>
        <View style={styles.bubble3}/>

        <Text style={styles.heroEyebrow}>Student Accommodation</Text>
        <Text style={styles.heroTitle}>Available Hostels</Text>

        {!loading && !error && (<View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{filtered.length}</Text>
              <Text style={styles.heroStatLabel}>Hostels</Text>
            </View>
            <View style={styles.heroStatDivider}/>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{totalAvailable}</Text>
              <Text style={styles.heroStatLabel}>Rooms Free</Text>
            </View>
            <View style={styles.heroStatDivider}/>
            <View style={styles.heroStat}>
              <MaterialCommunityIcons name={studentGender === 'male' ? 'human-male' : 'human-female'} size={18} color="#fff"/>
              <Text style={styles.heroStatLabel}>
                {studentGender === 'male' ? 'Male' : 'Female'} Only
              </Text>
            </View>
          </View>)}
      </View>

      
      <View style={[styles.controlsWrap, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.onSurfaceVariant}/>
          <RNTextInput ref={searchRef} value={search} onChangeText={setSearch} placeholder="Search hostels..." placeholderTextColor={theme.colors.onSurfaceVariant} style={[styles.searchInput, { color: theme.colors.onSurface }]} returnKeyType="search"/>
          {search.length > 0 && (<TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.onSurfaceVariant}/>
            </TouchableOpacity>)}
        </View>
      </View>

      
      {!loading && !error && (<View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            {studentGender === 'male' ? 'Male Hostels' : 'Female Hostels'}
          </Text>
          <Text style={[styles.sectionCount, { color: theme.colors.onSurfaceVariant }]}>
            {filtered.length} {filtered.length === 1 ? 'hostel' : 'hostels'}
          </Text>
        </View>)}
    </>);
    if (!loading && error) {
        return (<View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#1565C0" translucent={false}/>
        <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          <View style={styles.bubble1}/>
          <View style={styles.bubble2}/>
          <Text style={styles.heroEyebrow}>Student Accommodation</Text>
          <Text style={styles.heroTitle}>Available Hostels</Text>
        </View>
        <View style={styles.errorWrap}>
          <View style={[styles.errorCard, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name="wifi-off" size={38} color="#BDBDBD"/>
            <Text style={[styles.errorTitle, { color: theme.colors.onSurface }]}>
              Could not load hostels
            </Text>
            <Text style={[styles.errorSub, { color: theme.colors.onSurfaceVariant }]}>
              Check your connection and try again.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadHostels(); }} activeOpacity={0.82}>
              <MaterialCommunityIcons name="refresh" size={15} color="#fff"/>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>);
    }
    if (loading) {
        return (<View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#1565C0" translucent={false}/>
        <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          <View style={styles.bubble1}/>
          <View style={styles.bubble2}/>
          <Text style={styles.heroEyebrow}>Student Accommodation</Text>
          <Text style={styles.heroTitle}>Available Hostels</Text>
        </View>
        <View style={{ paddingHorizontal: 18, paddingTop: 18, gap: 14 }}>
          {[1, 2, 3].map((i) => (<SkeletonCard key={i} surface={theme.colors.surface}/>))}
        </View>
      </View>);
    }
    return (<View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" translucent={false}/>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList data={filtered} keyExtractor={(item) => item._id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" colors={['#1565C0']}/>} ListHeaderComponent={<ListHeader />} renderItem={({ item }) => (<HostelCard hostel={item} onPress={() => router.push(`/(student)/rooms/${item._id}`)}/>)} ListEmptyComponent={<View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="home-search" size={48} color="#BDBDBD"/>
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              No hostels found
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.onSurfaceVariant }]}>
              {search ? `No results for "${search}"` : 'No hostels available right now.'}
            </Text>
            {search.length > 0 && (<TouchableOpacity style={styles.clearBtn} onPress={() => setSearch('')} activeOpacity={0.8}>
                <Text style={styles.clearBtnText}>Clear Search</Text>
              </TouchableOpacity>)}
          </View>}/>
      </KeyboardAvoidingView>
    </View>);
}
const skeletonStyles = StyleSheet.create({
    card: {
        flexDirection: 'row', borderRadius: 18, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    accent: { width: 5, backgroundColor: '#E0E0E0' },
    body: { flex: 1, padding: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    box: { backgroundColor: '#EBEBEB', borderRadius: 6 },
});
const styles = StyleSheet.create({
    screen: { flex: 1 },
    flex: { flex: 1 },
    hero: {
        backgroundColor: '#1565C0',
        paddingHorizontal: 22,
        paddingBottom: 28,
        overflow: 'hidden',
    },
    bubble1: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60,
    },
    bubble2: {
        position: 'absolute', width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.05)', bottom: -50, left: -30,
    },
    bubble3: {
        position: 'absolute', width: 70, height: 70, borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.07)', top: 20, right: 120,
    },
    heroEyebrow: {
        color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600',
        letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
    },
    heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 18 },
    heroStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatNum: { color: '#fff', fontSize: 18, fontWeight: '800' },
    heroStatLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2, fontWeight: '500' },
    heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
    controlsWrap: { paddingHorizontal: 18, paddingTop: 16, gap: 10 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    searchInput: { flex: 1, fontSize: 14, padding: 0 },
    sectionRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10,
    },
    sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.1 },
    sectionCount: { fontSize: 12, fontWeight: '500' },
    listContent: { paddingHorizontal: 18, paddingBottom: 32 },
    emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 8 },
    emptySub: { fontSize: 13, textAlign: 'center' },
    clearBtn: {
        flexDirection: 'row', alignItems: 'center',
        marginTop: 10, backgroundColor: '#E3F2FD',
        paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    },
    clearBtnText: { color: '#1565C0', fontWeight: '700', fontSize: 13 },
    errorWrap: { paddingHorizontal: 18, paddingTop: 22 },
    errorCard: {
        borderRadius: 18, padding: 28, alignItems: 'center', gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    errorTitle: { fontSize: 15, fontWeight: '700', marginTop: 4 },
    errorSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
    retryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#1565C0', paddingHorizontal: 20,
        paddingVertical: 10, borderRadius: 20, marginTop: 6,
    },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
