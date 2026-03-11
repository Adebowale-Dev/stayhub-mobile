import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { studentAPI, paymentAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import AlertsCard from '../../components/AlertsCard';
import type { DashboardData } from '../../types';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({
  width,
  height,
  radius = 8,
  color = '#E0E0E0',
  style,
}: {
  width?: number | string;
  height: number;
  radius?: number;
  color?: string;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: color, borderRadius: radius, height, opacity },
        width != null ? { width } : { flex: 1 },
        style,
      ]}
    />
  );
}

function DashboardSkeleton() {
  const WH = 'rgba(255,255,255,0.22)';
  return (
    <>
      {/* Hero skeleton */}
      <View style={skeletonStyles.hero}>
        <View style={skeletonStyles.heroRow}>
          <View style={{ flex: 1, gap: 10 }}>
            <SkeletonBox width={90}  height={10} color={WH} />
            <SkeletonBox width={170} height={20} color={WH} />
            <SkeletonBox width={120} height={10} color={WH} />
          </View>
          <SkeletonBox width={54} height={54} radius={27} color={WH} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          <SkeletonBox width={115} height={30} radius={20} color={WH} />
          <SkeletonBox width={115} height={30} radius={20} color={WH} />
        </View>
      </View>

      {/* Card skeletons */}
      <View style={{ paddingHorizontal: 18, paddingTop: 22, gap: 14 }}>
        <SkeletonBox height={66} radius={16} />
        <SkeletonBox height={100} radius={18} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SkeletonBox height={110} radius={18} />
          <SkeletonBox height={110} radius={18} />
        </View>
      </View>
    </>
  );
}

// ─── Actions ──────────────────────────────────────────────────────────────────

const ACTIONS: {
  icon: IconName;
  label: string;
  sub: string;
  route: any;
  color: string;
  bg: string;
}[] = [
  { icon: 'home-city',      label: 'Hostels',  sub: 'Browse available', route: '/(student)/hostels',     color: '#1565C0', bg: '#E3F2FD' },
  { icon: 'credit-card',    label: 'Payment',  sub: 'Manage payments',  route: '/(student)/payment',     color: '#6A1B9A', bg: '#F3E5F5' },
  { icon: 'calendar-check', label: 'Reserve',  sub: 'My reservations',  route: '/(student)/reservation', color: '#00796B', bg: '#E0F2F1' },
  { icon: 'account-circle', label: 'Profile',  sub: 'View & edit info', route: '/(student)/profile',     color: '#C62828', bg: '#FFEBEE' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [dashboard, setDashboard]         = useState<DashboardData | null>(null);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);

  const user    = useAuthStore((state) => state.user);
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const theme   = useTheme();

  const loadDashboard = async () => {
    setError(false);
    try {
      const res  = await studentAPI.getDashboard();
      const data: DashboardData = res.data.data ?? (res.data as any);
      setDashboard(data);

      if (data?.paymentStatus !== 'paid') {
        try {
          const amtRes = await paymentAPI.getAmount();
          const amt    = amtRes.data.data?.amount ?? (amtRes.data as any)?.amount ?? null;
          setPaymentAmount(typeof amt === 'number' ? amt : null);
        } catch {
          // non-critical — banner still shows without the amount
        }
      } else {
        setPaymentAmount(null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);
  const onRefresh = () => { setRefreshing(true); loadDashboard(); };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`
    : 'SH';

  const dept = user?.department
    ? typeof user.department === 'object'
      ? (user.department as any).name
      : user.department
    : null;

  const paymentPaid    = dashboard?.paymentStatus === 'paid';
  const hasReservation = dashboard?.hasReservation ?? false;

  // ── Hero (shared between normal and error states) ──
  const HeroBanner = () => (
    <View style={styles.hero}>
      <View style={styles.bubble1} />
      <View style={styles.bubble2} />
      <View style={styles.bubble3} />

      <View style={styles.heroRow}>
        <View style={styles.heroLeft}>
          <Text style={styles.greetText}>{getGreeting()} 👋</Text>
          <Text style={styles.heroName}>{user?.firstName} {user?.lastName}</Text>
          {dept         ? <Text style={styles.heroDept}>{dept}</Text>               : null}
          {user?.matricNumber ? <Text style={styles.heroMatric}>{user.matricNumber}</Text> : null}
          {user?.level  ? <Text style={styles.heroLevel}>{user.level} Level</Text>  : null}
        </View>

        <View style={styles.heroRight}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          {dashboard?.currentSession ? (
            <View style={styles.sessionChip}>
              <Text style={styles.sessionText}>{dashboard.currentSession}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {!loading && !error && (
        <View style={styles.chipRow}>
          <View style={[
            styles.chip,
            { backgroundColor: paymentPaid ? 'rgba(76,175,80,0.22)' : 'rgba(255,152,0,0.22)' },
          ]}>
            <MaterialCommunityIcons
              name={paymentPaid ? 'check-circle-outline' : 'clock-outline'}
              size={13}
              color={paymentPaid ? '#A5D6A7' : '#FFCC80'}
            />
            <Text style={[styles.chipText, { color: paymentPaid ? '#A5D6A7' : '#FFCC80' }]}>
              {paymentPaid ? 'Payment Paid' : 'Payment Pending'}
            </Text>
          </View>

          <View style={[
            styles.chip,
            { backgroundColor: hasReservation ? 'rgba(33,150,243,0.22)' : 'rgba(255,255,255,0.12)' },
          ]}>
            <MaterialCommunityIcons
              name={hasReservation ? 'bed' : 'bed-empty'}
              size={13}
              color={hasReservation ? '#90CAF9' : 'rgba(255,255,255,0.55)'}
            />
            <Text style={[styles.chipText, { color: hasReservation ? '#90CAF9' : 'rgba(255,255,255,0.55)' }]}>
              {hasReservation ? 'Room Reserved' : 'No Reservation'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" translucent={false} />
      <View style={{ height: insets.top, backgroundColor: '#1565C0' }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1565C0"
            colors={['#1565C0']}
          />
        }
      >
        {/* ─── Loading skeleton ─── */}
        {loading && <DashboardSkeleton />}

        {/* ─── Error state ─── */}
        {!loading && error && (
          <>
            <HeroBanner />
            <View style={styles.section}>
              <View style={[styles.centeredCard, { backgroundColor: theme.colors.surface }]}>
                <MaterialCommunityIcons name="wifi-off" size={38} color="#BDBDBD" />
                <Text style={[styles.centeredCardTitle, { color: theme.colors.onSurface }]}>
                  Could not load dashboard
                </Text>
                <Text style={[styles.centeredCardSub, { color: theme.colors.onSurfaceVariant }]}>
                  Check your connection and try again.
                </Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => { setLoading(true); loadDashboard(); }}
                  activeOpacity={0.82}
                >
                  <MaterialCommunityIcons name="refresh" size={15} color="#fff" />
                  <Text style={styles.primaryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* ─── Main content ─── */}
        {!loading && !error && (
          <>
            {/* Hero */}
            <HeroBanner />

            {/* Payment CTA — only shown when payment is not paid */}
            {!paymentPaid && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.payBanner}
                  onPress={() => router.push('/(student)/payment')}
                  activeOpacity={0.85}
                >
                  <View style={styles.payBannerLeft}>
                    <MaterialCommunityIcons name="alert-circle" size={22} color="#E65100" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payBannerTitle}>Payment Outstanding</Text>
                      {paymentAmount != null
                        ? <Text style={styles.payBannerAmt}>₦{paymentAmount.toLocaleString()}</Text>
                        : <Text style={styles.payBannerSub}>Tap to view and complete payment</Text>
                      }
                    </View>
                  </View>
                  <View style={styles.payNowBtn}>
                    <Text style={styles.payNowText}>Pay Now</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Alerts */}
            <View style={styles.section}>
              <AlertsCard />
            </View>

            {/* Reservation summary or empty state */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Current Reservation
              </Text>

              {hasReservation && dashboard?.reservation ? (
                <TouchableOpacity
                  style={[styles.reservCard, { backgroundColor: theme.colors.surface }]}
                  activeOpacity={0.82}
                  onPress={() => router.push('/(student)/reservation')}
                >
                  <View style={styles.reservAccent} />
                  <View style={styles.reservBody}>

                    {/* Hostel row */}
                    <View style={styles.reservRow}>
                      <View style={styles.reservIconBox}>
                        <MaterialCommunityIcons name="home-city" size={17} color="#1565C0" />
                      </View>
                      <View>
                        <Text style={[styles.reservLabel, { color: theme.colors.onSurfaceVariant }]}>Hostel</Text>
                        <Text style={[styles.reservValue, { color: theme.colors.onSurface }]}>
                          {dashboard.reservation.hostel?.name ?? '—'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.reservSep, { backgroundColor: theme.colors.surfaceVariant }]} />

                    {/* Room row + occupancy */}
                    <View style={styles.reservRow}>
                      <View style={styles.reservIconBox}>
                        <MaterialCommunityIcons name="bed" size={17} color="#1565C0" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reservLabel, { color: theme.colors.onSurfaceVariant }]}>Room</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.reservValue, { color: theme.colors.onSurface }]}>
                            {dashboard.reservation.room?.roomNumber ?? '—'}
                          </Text>
                          {dashboard.reservation.room?.capacity != null && (
                            <Text style={[styles.occupancyText, { color: theme.colors.onSurfaceVariant }]}>
                              {dashboard.reservation.room.currentOccupancy ?? 0}
                              /{dashboard.reservation.room.capacity} occupants
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Group members row (only when group booking) */}
                    {(dashboard.reservation.groupMembers?.length ?? 0) > 0 && (
                      <>
                        <View style={[styles.reservSep, { backgroundColor: theme.colors.surfaceVariant }]} />
                        <View style={styles.reservRow}>
                          <View style={styles.reservIconBox}>
                            <MaterialCommunityIcons name="account-group" size={17} color="#1565C0" />
                          </View>
                          <View>
                            <Text style={[styles.reservLabel, { color: theme.colors.onSurfaceVariant }]}>Group</Text>
                            <Text style={[styles.reservValue, { color: theme.colors.onSurface }]}>
                              {dashboard.reservation.groupMembers!.length + 1} members
                            </Text>
                          </View>
                        </View>
                      </>
                    )}

                    <View style={[styles.reservSep, { backgroundColor: theme.colors.surfaceVariant }]} />

                    {/* Footer: status + view link */}
                    <View style={styles.reservFooter}>
                      {(() => {
                        const st    = dashboard.reservation.status ?? 'pending';
                        const color = st === 'confirmed' ? '#2E7D32' : st === 'cancelled' ? '#C62828' : '#E65100';
                        const bg    = st === 'confirmed' ? '#E8F5E9' : st === 'cancelled' ? '#FFEBEE' : '#FFF3E0';
                        return (
                          <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: color }]} />
                            <Text style={[styles.statusText, { color }]}>{st.toUpperCase()}</Text>
                          </View>
                        );
                      })()}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={[styles.viewText, { color: theme.colors.primary }]}>View Details</Text>
                        <MaterialCommunityIcons name="arrow-right" size={14} color={theme.colors.primary} />
                      </View>
                    </View>

                  </View>
                </TouchableOpacity>
              ) : (
                /* No reservation empty state */
                <View style={[styles.centeredCard, { backgroundColor: theme.colors.surface }]}>
                  <MaterialCommunityIcons name="bed-empty" size={36} color="#BDBDBD" />
                  <Text style={[styles.centeredCardTitle, { color: theme.colors.onSurface }]}>
                    No room reserved yet
                  </Text>
                  <Text style={[styles.centeredCardSub, { color: theme.colors.onSurfaceVariant }]}>
                    Browse available hostels and reserve your room for this session.
                  </Text>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => router.push('/(student)/hostels')}
                    activeOpacity={0.82}
                  >
                    <MaterialCommunityIcons name="home-search" size={15} color="#fff" />
                    <Text style={styles.primaryBtnText}>Browse Hostels</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Quick actions */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Quick Actions
              </Text>
              <View style={styles.grid}>
                {ACTIONS.map((action) => (
                  <TouchableOpacity
                    key={action.label}
                    style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
                    onPress={() => router.push(action.route)}
                    activeOpacity={0.76}
                  >
                    <View style={[styles.actionIconBox, { backgroundColor: action.bg }]}>
                      <MaterialCommunityIcons name={action.icon} size={26} color={action.color} />
                    </View>
                    <Text style={[styles.actionLabel, { color: theme.colors.onSurface }]}>{action.label}</Text>
                    <Text style={[styles.actionSub, { color: theme.colors.onSurfaceVariant }]}>{action.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Skeleton styles ──────────────────────────────────────────────────────────

const skeletonStyles = StyleSheet.create({
  hero: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
});

// ─── Main styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  content: { paddingBottom: 40 },

  // ── Hero ──────────────────────────────────────────
  hero: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.07)', top: 30, right: 110,
  },
  heroRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroLeft:  { flex: 1, paddingRight: 12 },
  heroRight: { alignItems: 'center', gap: 8 },

  greetText:  { color: 'rgba(255,255,255,0.72)', fontSize: 13, marginBottom: 4 },
  heroName:   { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 0.2 },
  heroDept:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },
  heroMatric: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 3 },
  heroLevel:  { color: 'rgba(255,255,255,0.40)', fontSize: 11, marginTop: 2 },

  avatarRing: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', padding: 2,
  },
  avatar:     { flex: 1, borderRadius: 26, backgroundColor: '#42A5F5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },

  sessionChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  sessionText: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600' },

  chipRow:  { flexDirection: 'row', gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: '500' },

  // ── Section ───────────────────────────────────────
  section:      { paddingHorizontal: 18, paddingTop: 22 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 12 },

  // ── Shared centered card (error + empty reservation) ──
  centeredCard: {
    borderRadius: 18, padding: 28, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  centeredCardTitle: { fontSize: 15, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  centeredCardSub:   { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1565C0', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, marginTop: 6,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Payment banner ────────────────────────────────
  payBanner: {
    backgroundColor: '#FFF3E0', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#FFE0B2',
  },
  payBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  payBannerTitle: { fontSize: 13, fontWeight: '700', color: '#E65100' },
  payBannerAmt:   { fontSize: 16, fontWeight: '800', color: '#BF360C', marginTop: 1 },
  payBannerSub:   { fontSize: 12, color: '#BF360C', marginTop: 1 },
  payNowBtn:      { backgroundColor: '#E65100', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  payNowText:     { color: '#fff', fontWeight: '700', fontSize: 12 },

  // ── Reservation card ──────────────────────────────
  reservCard: {
    borderRadius: 18, flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#1565C0', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 12, elevation: 3,
  },
  reservAccent:  { width: 5, backgroundColor: '#1565C0' },
  reservBody:    { flex: 1, paddingHorizontal: 16, paddingVertical: 14 },
  reservRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reservIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
  },
  reservLabel:   { fontSize: 11, marginBottom: 2 },
  reservValue:   { fontSize: 14, fontWeight: '600' },
  occupancyText: { fontSize: 11 },
  reservSep:     { height: 1, marginVertical: 10 },
  reservFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot:     { width: 6, height: 6, borderRadius: 3 },
  statusText:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  viewText:      { fontSize: 13, fontWeight: '600' },

  // ── Quick actions grid ────────────────────────────
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%', borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  actionIconBox: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionLabel:   { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  actionSub:     { fontSize: 11 },
});
