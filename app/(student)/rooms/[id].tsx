import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Divider, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { studentAPI } from '../../../services/api';
import type { Room } from '../../../types';

type RoomTone = {
    label: string;
    color: string;
    backgroundColor: string;
    accentColor: string;
};

const ROOM_STATUS_META: Record<string, RoomTone> = {
    available: {
        label: 'Available',
        color: '#2E7D32',
        backgroundColor: '#E8F5E9',
        accentColor: '#43A047',
    },
    partially_occupied: {
        label: 'Available',
        color: '#2E7D32',
        backgroundColor: '#E8F5E9',
        accentColor: '#43A047',
    },
    full: {
        label: 'Full',
        color: '#C62828',
        backgroundColor: '#FFEBEE',
        accentColor: '#E53935',
    },
    maintenance: {
        label: 'Maintenance',
        color: '#EF6C00',
        backgroundColor: '#FFF3E0',
        accentColor: '#FB8C00',
    },
};

export default function RoomsScreen() {
    const { id: hostelId } = useLocalSearchParams<{ id: string }>();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [reserving, setReserving] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [groupMatrics, setGroupMatrics] = useState<string[]>([]);
    const router = useRouter();
    const navigation = useNavigation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        navigation.setOptions({
            title: 'Available Rooms',
            headerLeft: () => (
                <TouchableOpacity onPress={() => router.navigate('/(student)/hostels')} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A2E" />
                </TouchableOpacity>
            ),
        });
    }, [navigation, router]);

    const loadRooms = async () => {
        if (!hostelId) {
            return;
        }

        setError(false);
        try {
            const response = await studentAPI.getRooms(hostelId);
            const data: Room[] = (response.data as any).data ?? response.data ?? [];
            setRooms(data);
        }
        catch {
            setError(true);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadRooms();
    }, [hostelId]);

    const onRefresh = () => {
        setRefreshing(true);
        loadRooms();
    };

    const openReservation = (room: Room) => {
        setSelectedRoom(room);
        setGroupMatrics([]);
        setModalVisible(true);
    };

    const availableRoomCount = useMemo(
        () => rooms.filter((room) => room.availableSpaces > 0 && room.status !== 'maintenance').length,
        [rooms],
    );

    const totalAvailableBeds = useMemo(
        () => rooms.reduce((sum, room) => sum + Math.max(room.availableSpaces, 0), 0),
        [rooms],
    );

    const fullRoomCount = useMemo(
        () => rooms.filter((room) => room.availableSpaces === 0 || room.status === 'full').length,
        [rooms],
    );

    const maxFriends = Math.max((selectedRoom?.availableSpaces ?? 1) - 1, 0);
    const filledMatrics = groupMatrics.map((matric) => matric.trim()).filter(Boolean);
    const totalReserving = 1 + filledMatrics.length;

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
        setGroupMatrics(groupMatrics.filter((_, currentIndex) => currentIndex !== index));
    };

    const handleReserve = async () => {
        if (!selectedRoom) {
            return;
        }

        const uniqueCheck = new Set(filledMatrics);
        if (uniqueCheck.size !== filledMatrics.length) {
            Alert.alert('Duplicate entry', 'Each friend must have a unique matric number.');
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
            Alert.alert('Success', 'Room reserved successfully.', [
                { text: 'View reservation', onPress: () => router.push('/(student)/reservation') },
                { text: 'Done' },
            ]);
            loadRooms();
        }
        catch (errorResponse: any) {
            Alert.alert('Error', errorResponse.response?.data?.message ?? 'Reservation failed. Please try again.');
        }
        finally {
            setReserving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingScreen, { backgroundColor: theme.colors.background }]}>
                <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
                <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
                    <View style={styles.heroBubbleLarge} />
                    <View style={styles.heroBubbleSmall} />
                    <View style={styles.heroBubbleMid} />
                </View>
                <View style={styles.loadingBody}>
                    <ActivityIndicator size="large" color="#1565C0" />
                </View>
            </View>
        );
    }

    const listHeader = (
        <>
            <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
                <View style={styles.heroBubbleLarge} />
                <View style={styles.heroBubbleSmall} />
                <View style={styles.heroBubbleMid} />

                <Text style={styles.heroEyebrow}>Room selection</Text>
                <Text style={styles.heroTitle}>Choose the right room</Text>
                <Text style={styles.heroCopy}>
                    Review capacity, open beds, and current occupancy before locking in a space for yourself or your friends.
                </Text>

                <View style={styles.heroStats}>
                    <View style={styles.heroStatCard}>
                        <Text style={styles.heroStatNumber}>{availableRoomCount}</Text>
                        <Text style={styles.heroStatLabel}>Open rooms</Text>
                    </View>
                    <View style={styles.heroStatCard}>
                        <Text style={styles.heroStatNumber}>{totalAvailableBeds}</Text>
                        <Text style={styles.heroStatLabel}>Beds left</Text>
                    </View>
                    <View style={styles.heroStatCard}>
                        <Text style={styles.heroStatNumber}>{fullRoomCount}</Text>
                        <Text style={styles.heroStatLabel}>Full rooms</Text>
                    </View>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Available options</Text>
                <Text style={[styles.sectionCount, { color: theme.colors.onSurfaceVariant }]}>
                    {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
                </Text>
            </View>
        </>
    );

    if (error) {
        return (
            <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
                <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
                {listHeader}
                <View style={styles.section}>
                    <View style={[styles.errorPanel, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.errorIconWrap}>
                            <MaterialCommunityIcons name="wifi-off" size={32} color="#1565C0" />
                        </View>
                        <Text style={[styles.errorTitle, { color: theme.colors.onSurface }]}>Could not load rooms</Text>
                        <Text style={[styles.errorCopy, { color: theme.colors.onSurfaceVariant }]}>
                            Check your connection and try again.
                        </Text>
                        <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => { setLoading(true); loadRooms(); }}>
                            <MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" />
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor="#1565C0" />

            <FlatList
                data={rooms}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" colors={['#1565C0']} />}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={
                    <View style={[styles.emptyPanel, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.emptyIconWrap}>
                            <MaterialCommunityIcons name="bed-empty" size={34} color="#1565C0" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No rooms available</Text>
                        <Text style={[styles.emptyCopy, { color: theme.colors.onSurfaceVariant }]}>
                            There are no room options for this hostel right now.
                        </Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const available = item.availableSpaces > 0 && item.status !== 'maintenance' && item.status !== 'full';
                    const tone = ROOM_STATUS_META[item.status] ?? (available ? ROOM_STATUS_META.available : ROOM_STATUS_META.full);
                    const occupancyRatio = item.capacity > 0 ? item.currentOccupancy / item.capacity : 0;

                    return (
                        <View style={[styles.roomCard, { backgroundColor: theme.colors.surface }]}>
                            <View style={[styles.roomAccent, { backgroundColor: tone.accentColor }]} />

                            <View style={styles.roomBody}>
                                <View style={styles.roomHeader}>
                                    <View style={styles.roomHeaderCopy}>
                                        <Text style={[styles.roomTitle, { color: theme.colors.onSurface }]}>Room {item.roomNumber}</Text>
                                        <Text style={[styles.roomSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                            {item.currentOccupancy} of {item.capacity} beds occupied
                                        </Text>
                                    </View>

                                    <View style={[styles.statusPill, { backgroundColor: tone.backgroundColor }]}>
                                        <Text style={[styles.statusPillText, { color: tone.color }]}>{tone.label}</Text>
                                    </View>
                                </View>

                                <View style={styles.metricGrid}>
                                    <View style={[styles.metricCard, { backgroundColor: theme.colors.background }]}>
                                        <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Open beds</Text>
                                        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{item.availableSpaces}</Text>
                                    </View>

                                    <View style={[styles.metricCard, { backgroundColor: theme.colors.background }]}>
                                        <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Capacity</Text>
                                        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{item.capacity}</Text>
                                    </View>

                                    <View style={[styles.metricCardWide, { backgroundColor: theme.colors.background }]}>
                                        <View style={styles.progressHeader}>
                                            <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Occupancy</Text>
                                            <Text style={[styles.progressValue, { color: tone.color }]}>
                                                {Math.round(occupancyRatio * 100)}%
                                            </Text>
                                        </View>
                                        <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        width: `${Math.min(Math.max(occupancyRatio * 100, 0), 100)}%`,
                                                        backgroundColor: tone.accentColor,
                                                    },
                                                ]}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.bedLegendRow}>
                                    {Array.from({ length: item.capacity }).map((_, index) => {
                                        let backgroundColor = '#DDE3EA';
                                        if (index < item.currentOccupancy) {
                                            backgroundColor = '#F08C8C';
                                        }
                                        else if (index < item.currentOccupancy + item.availableSpaces) {
                                            backgroundColor = '#8BC5A1';
                                        }

                                        return <View key={index} style={[styles.bedDot, { backgroundColor }]} />;
                                    })}
                                </View>

                                <TouchableOpacity
                                    style={[styles.reserveButton, !available && styles.reserveButtonDisabled]}
                                    activeOpacity={0.85}
                                    onPress={() => openReservation(item)}
                                    disabled={!available}
                                >
                                    <Text style={[styles.reserveButtonText, !available && styles.reserveButtonTextDisabled]}>
                                        {available ? 'Reserve this room' : tone.label}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={available ? 'arrow-right' : 'lock-outline'}
                                        size={18}
                                        color={available ? '#1565C0' : '#90A4AE'}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />

            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
                        <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.modalHandle} />

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <View style={styles.modalHero}>
                                    <View style={styles.modalHeroIcon}>
                                        <MaterialCommunityIcons name="bed-outline" size={22} color="#1565C0" />
                                    </View>
                                    <View style={styles.modalHeroCopy}>
                                        <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                                            Reserve Room {selectedRoom?.roomNumber}
                                        </Text>
                                        <Text style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                                            {selectedRoom?.capacity}-person room | {selectedRoom?.availableSpaces} bed{selectedRoom?.availableSpaces !== 1 ? 's' : ''} available
                                        </Text>
                                    </View>
                                </View>

                                <Divider style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: 18 }} />

                                <Text style={[styles.modalLabel, { color: theme.colors.onSurfaceVariant }]}>Bed layout</Text>

                                <View style={styles.bedSlots}>
                                    {Array.from({ length: selectedRoom?.capacity ?? 0 }).map((_, index) => {
                                        const occupied = selectedRoom?.currentOccupancy ?? 0;
                                        let backgroundColor = '#E0E6EE';
                                        let iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'] | null = null;

                                        if (index < occupied) {
                                            backgroundColor = '#F08C8C';
                                            iconName = 'account';
                                        }
                                        else if (index === occupied) {
                                            backgroundColor = '#1565C0';
                                            iconName = 'account-star';
                                        }
                                        else if (index < occupied + totalReserving) {
                                            backgroundColor = '#42A5F5';
                                            iconName = 'account-plus';
                                        }

                                        return (
                                            <View key={index} style={[styles.bedSlot, { backgroundColor }]}>
                                                {iconName ? <MaterialCommunityIcons name={iconName} size={12} color="#FFFFFF" /> : null}
                                            </View>
                                        );
                                    })}
                                </View>

                                <View style={styles.legend}>
                                    {[
                                        { label: 'Occupied', color: '#F08C8C' },
                                        { label: 'You', color: '#1565C0' },
                                        { label: 'Friends', color: '#42A5F5' },
                                        { label: 'Empty', color: '#E0E6EE' },
                                    ].map((item) => (
                                        <View key={item.label} style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                            <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>{item.label}</Text>
                                        </View>
                                    ))}
                                </View>

                                <Divider style={{ backgroundColor: theme.colors.surfaceVariant, marginVertical: 18 }} />

                                <View style={styles.modalSectionHeader}>
                                    <Text style={[styles.modalLabel, { color: theme.colors.onSurfaceVariant }]}>Friends sharing this room</Text>
                                    <Text style={[styles.modalMetaText, { color: theme.colors.onSurfaceVariant }]}>
                                        Optional | up to {maxFriends}
                                    </Text>
                                </View>

                                {maxFriends === 0 ? (
                                    <Text style={styles.noSpaceHint}>Only 1 space left - no room for friends.</Text>
                                ) : (
                                    <>
                                        <Text style={[styles.groupHint, { color: theme.colors.onSurfaceVariant }]}>
                                            Add matric numbers for friends who should share the same room with you.
                                        </Text>

                                        {groupMatrics.map((matric, index) => (
                                            <View key={index} style={styles.groupRow}>
                                                <TextInput
                                                    mode="outlined"
                                                    value={matric}
                                                    onChangeText={(value) => updateFriend(index, value)}
                                                    placeholder={`Friend ${index + 1} matric number`}
                                                    autoCapitalize="characters"
                                                    autoCorrect={false}
                                                    style={styles.groupInput}
                                                    outlineColor={theme.colors.surfaceVariant}
                                                    activeOutlineColor="#1565C0"
                                                    left={<TextInput.Icon icon="account-outline" />}
                                                />
                                                <IconButton icon="close-circle" iconColor="#E53935" size={22} onPress={() => removeFriend(index)} />
                                            </View>
                                        ))}

                                        {groupMatrics.length < maxFriends ? (
                                            <TouchableOpacity style={styles.addFriendButton} activeOpacity={0.85} onPress={addFriend}>
                                                <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#1565C0" />
                                                <Text style={styles.addFriendButtonText}>Add a friend</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </>
                                )}

                                <View style={styles.summaryBanner}>
                                    <View style={styles.summaryIcon}>
                                        <MaterialCommunityIcons name="information-outline" size={16} color="#1565C0" />
                                    </View>
                                    <Text style={styles.summaryText}>
                                        {filledMatrics.length === 0
                                            ? 'You are reserving 1 bed for yourself.'
                                            : `You are reserving ${totalReserving} beds - you plus ${filledMatrics.length} friend${
                                                  filledMatrics.length > 1 ? 's' : ''
                                              } in the same room.`}
                                    </Text>
                                </View>
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalCancelButton, reserving && styles.disabledButton]}
                                    activeOpacity={0.85}
                                    onPress={() => setModalVisible(false)}
                                    disabled={reserving}
                                >
                                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalPrimaryButton, reserving && styles.disabledButton]}
                                    activeOpacity={0.85}
                                    onPress={handleReserve}
                                    disabled={reserving}
                                >
                                    {reserving ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
                                            <Text style={styles.modalPrimaryButtonText}>Confirm reservation</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    loadingScreen: {
        flex: 1,
    },
    loadingBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hero: {
        backgroundColor: '#1565C0',
        paddingHorizontal: 22,
        paddingBottom: 30,
        overflow: 'hidden',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    heroBubbleLarge: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.06)',
        top: -84,
        right: -72,
    },
    heroBubbleSmall: {
        position: 'absolute',
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: 'rgba(255,255,255,0.07)',
        bottom: -24,
        left: -18,
    },
    heroBubbleMid: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: 42,
        left: 150,
    },
    heroEyebrow: {
        color: 'rgba(255,255,255,0.72)',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 10,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 29,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 10,
        maxWidth: 300,
    },
    heroCopy: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        lineHeight: 21,
        maxWidth: 336,
    },
    heroStats: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 22,
    },
    heroStatCard: {
        flex: 1,
        borderRadius: 18,
        paddingVertical: 14,
        backgroundColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroStatNumber: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    heroStatLabel: {
        color: 'rgba(255,255,255,0.76)',
        fontSize: 11,
        fontWeight: '700',
    },
    sectionHeader: {
        paddingHorizontal: 18,
        paddingTop: 22,
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.1,
    },
    sectionCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    section: {
        paddingHorizontal: 18,
        paddingTop: 22,
    },
    listContent: {
        paddingBottom: 32,
    },
    roomCard: {
        marginHorizontal: 18,
        marginBottom: 16,
        borderRadius: 22,
        overflow: 'hidden',
        flexDirection: 'row',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    roomAccent: {
        width: 5,
    },
    roomBody: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    roomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 14,
    },
    roomHeaderCopy: {
        flex: 1,
    },
    roomTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    roomSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    statusPill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metricGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    metricCard: {
        width: '48%',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    metricCardWide: {
        width: '100%',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressValue: {
        fontSize: 12,
        fontWeight: '800',
    },
    progressTrack: {
        height: 8,
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressFill: {
        height: 8,
        borderRadius: 999,
    },
    bedLegendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 16,
        marginBottom: 16,
    },
    bedDot: {
        width: 18,
        height: 18,
        borderRadius: 6,
    },
    reserveButton: {
        minHeight: 46,
        borderRadius: 16,
        backgroundColor: '#EEF5FF',
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reserveButtonDisabled: {
        backgroundColor: '#F3F5F7',
    },
    reserveButtonText: {
        color: '#1565C0',
        fontSize: 14,
        fontWeight: '800',
    },
    reserveButtonTextDisabled: {
        color: '#90A4AE',
    },
    emptyPanel: {
        marginHorizontal: 18,
        marginTop: 12,
        borderRadius: 22,
        paddingHorizontal: 24,
        paddingVertical: 28,
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    emptyIconWrap: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#EAF3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    emptyCopy: {
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
    },
    errorPanel: {
        borderRadius: 22,
        paddingHorizontal: 24,
        paddingVertical: 28,
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 4,
    },
    errorIconWrap: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#EAF3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    errorCopy: {
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        marginBottom: 18,
    },
    retryButton: {
        minHeight: 46,
        borderRadius: 16,
        backgroundColor: '#1565C0',
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    backBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(9, 21, 38, 0.48)',
        justifyContent: 'flex-end',
    },
    modalWrap: {
        width: '100%',
    },
    modalSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: 28,
        maxHeight: '88%',
    },
    modalHandle: {
        alignSelf: 'center',
        width: 46,
        height: 5,
        borderRadius: 999,
        backgroundColor: '#D7DCE5',
        marginBottom: 18,
    },
    modalHero: {
        flexDirection: 'row',
        gap: 14,
        marginBottom: 16,
    },
    modalHeroIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#EAF3FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalHeroCopy: {
        flex: 1,
        gap: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 26,
    },
    modalSubtitle: {
        fontSize: 13,
        lineHeight: 19,
    },
    modalLabel: {
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 10,
    },
    bedSlots: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    bedSlot: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 11,
        fontWeight: '600',
    },
    modalSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    modalMetaText: {
        fontSize: 12,
        fontWeight: '600',
    },
    noSpaceHint: {
        color: '#E57373',
        fontSize: 13,
        lineHeight: 19,
    },
    groupHint: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 12,
    },
    groupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    groupInput: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    addFriendButton: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: '#EAF3FF',
    },
    addFriendButtonText: {
        color: '#1565C0',
        fontSize: 13,
        fontWeight: '700',
    },
    summaryBanner: {
        marginTop: 18,
        borderRadius: 18,
        backgroundColor: '#EEF4FF',
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    summaryIcon: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        color: '#355F90',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    modalCancelButton: {
        flex: 1,
        minHeight: 50,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#D6DCE5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelButtonText: {
        color: '#546274',
        fontSize: 14,
        fontWeight: '800',
    },
    modalPrimaryButton: {
        flex: 1,
        minHeight: 50,
        borderRadius: 16,
        backgroundColor: '#1565C0',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    modalPrimaryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    disabledButton: {
        opacity: 0.7,
    },
});
