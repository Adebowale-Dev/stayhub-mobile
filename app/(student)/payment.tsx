import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, RefreshControl, TouchableOpacity, StatusBar, } from 'react-native';
import { Text, TextInput, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paystack, paystackProps } from 'react-native-paystack-webview';
import { paymentAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { PAYSTACK_CONFIG } from '../../constants/config';
import { Reveal } from '../../components/ui/Reveal';
import type { PaymentStatus } from '../../types';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export default function PaymentScreen() {
    const [status, setStatus] = useState<PaymentStatus | null>(null);
    const [amountDue, setAmountDue] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [paystackRef, setPaystackRef] = useState('');
    const [paystackAmt, setPaystackAmt] = useState(0);
    const [verifyCode, setVerifyCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const user = useAuthStore((s) => s.user);
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const paystackWebViewRef = useRef<paystackProps.PayStackRef>(null);
    const loadData = async () => {
        setError(false);
        try {
            const [statusRes, amountRes] = await Promise.allSettled([
                paymentAPI.getStatus(),
                paymentAPI.getAmount(),
            ]);
            if (statusRes.status === 'fulfilled') {
                const data = (statusRes.value.data as any).data ?? statusRes.value.data;
                setStatus(data);
            }
            if (amountRes.status === 'fulfilled') {
                const amt = (amountRes.value.data as any).data?.amount
                    ?? (amountRes.value.data as any).amount
                    ?? null;
                setAmountDue(typeof amt === 'number' ? amt : null);
            }
        }
        catch {
            setError(true);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    useEffect(() => { loadData(); }, []);
    const onRefresh = () => { setRefreshing(true); loadData(); };
    const handleInitializePayment = async () => {
        setInitializing(true);
        try {
            const amt = amountDue ?? 0;
            const initRes = await paymentAPI.initialize(amt);
            const initData = (initRes.data as any).data ?? initRes.data;
            setPaystackAmt(amt);
            setPaystackRef(initData.reference ?? '');
            paystackWebViewRef.current?.startTransaction();
        }
        catch (e: any) {
            Alert.alert('Error', e.response?.data?.message ?? 'Failed to initialize payment.');
        }
        finally {
            setInitializing(false);
        }
    };
    const handlePaystackSuccess = async (res: any) => {
        const ref = res?.transactionRef?.reference ?? paystackRef;
        try {
            await paymentAPI.verifyReference(ref);
            Alert.alert('Payment Successful', 'Your payment has been verified!');
            loadData();
        }
        catch {
            Alert.alert('Verification Pending', 'Payment received. Verification is being processed. Please refresh shortly.');
            loadData();
        }
    };
    const handleVerifyCode = async () => {
        if (!verifyCode.trim()) {
            Alert.alert('Error', 'Please enter a payment code.');
            return;
        }
        setVerifying(true);
        try {
            await paymentAPI.verifyWithCode(verifyCode.trim());
            Alert.alert('Success', 'Payment code verified successfully!');
            setVerifyCode('');
            loadData();
        }
        catch (e: any) {
            Alert.alert('Error', e.response?.data?.message ?? 'Invalid or expired payment code.');
        }
        finally {
            setVerifying(false);
        }
    };
    const isPaid = status?.status === 'paid';
    const isFailed = status?.status === 'failed';
    const displayAmount = status?.amount ?? amountDue;
    const formattedAmount = displayAmount != null
        ? `NGN ${displayAmount.toLocaleString()}`
        : '-';
    const heroStatusColor = isPaid ? '#43A047' : isFailed ? '#E53935' : '#FF9800';
    const heroStatusBg = isPaid
        ? 'rgba(76,175,80,0.20)'
        : isFailed
            ? 'rgba(229,57,53,0.20)'
            : 'rgba(255,152,0,0.20)';
    const heroStatusIcon: IconName = isPaid
        ? 'check-circle-outline'
        : isFailed
            ? 'close-circle-outline'
            : 'clock-outline';
    const heroStatusLabel = isPaid ? 'Paid' : isFailed ? 'Failed' : 'Pending';
    if (loading) {
        return (<View style={[styles.loadingScreen, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#1565C0"/>
        <View style={[styles.hero, { paddingTop: insets.top + 22 }]}>
          <View style={styles.bubble1}/>
          <View style={styles.bubble2}/>
        </View>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color="#1565C0"/>
        </View>
      </View>);
    }
    return (<View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" translucent={false}/>
      <View style={{ height: insets.top, backgroundColor: '#1565C0' }}/>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" colors={['#1565C0']}/>}>
        
        <View style={styles.hero}>
          <View style={styles.bubble1}/>
          <View style={styles.bubble2}/>
          <View style={styles.bubble3}/>

          <Text style={styles.heroEyebrow}>Hostel Fee Payment</Text>

          <Text style={styles.heroAmount}>{formattedAmount}</Text>

          <View style={[styles.statusChip, { backgroundColor: heroStatusBg }]}>
            <MaterialCommunityIcons name={heroStatusIcon} size={14} color={heroStatusColor}/>
            <Text style={[styles.statusChipText, { color: heroStatusColor }]}>
              {heroStatusLabel}
            </Text>
          </View>

          {status?.paidAt && (<Text style={styles.heroPaidDate}>
              Paid {new Date(status.paidAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
            })}
            </Text>)}
        </View>

        
        {error && (<View style={styles.section}>
            <Reveal delay={60}>
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.centeredCard}>
                  <MaterialCommunityIcons name="wifi-off" size={36} color="#BDBDBD"/>
                  <Text style={[styles.centeredTitle, { color: theme.colors.onSurface }]}>
                    Could not load payment info
                  </Text>
                  <Text style={[styles.centeredSub, { color: theme.colors.onSurfaceVariant }]}>
                    Check your connection and try again.
                  </Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => { setLoading(true); loadData(); }} activeOpacity={0.82}>
                    <MaterialCommunityIcons name="refresh" size={15} color="#fff"/>
                    <Text style={styles.primaryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Reveal>
          </View>)}

        
        {!error && isPaid && (<View style={styles.section}>
            <Reveal delay={110}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Receipt
              </Text>
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>

                
                <View style={styles.receiptBanner}>
                  <View style={styles.receiptIconCircle}>
                    <MaterialCommunityIcons name="check" size={28} color="#fff"/>
                  </View>
                  <Text style={styles.receiptBannerTitle}>Payment Confirmed</Text>
                  <Text style={styles.receiptBannerSub}>
                    Your hostel fee has been received and verified.
                  </Text>
                </View>

                <View style={[styles.receiptDivider, { backgroundColor: theme.colors.surfaceVariant }]}/>

                
                {[
                {
                    icon: 'cash' as IconName,
                    label: 'Amount Paid',
                    value: formattedAmount,
                    bold: true,
                },
                ...(status?.reference ? [{
                        icon: 'identifier' as IconName,
                        label: 'Reference',
                        value: status.reference,
                        mono: true,
                    }] : []),
                ...(status?.paidAt ? [{
                        icon: 'calendar-check' as IconName,
                        label: 'Date',
                        value: new Date(status.paidAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'long', year: 'numeric',
                        }),
                    }] : []),
              ].map((row, i, arr) => (<View key={row.label}>
                    <View style={styles.receiptRow}>
                      <View style={styles.receiptIconBox}>
                        <MaterialCommunityIcons name={row.icon} size={16} color="#1565C0"/>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.receiptLabel, { color: theme.colors.onSurfaceVariant }]}>
                          {row.label}
                        </Text>
                        <Text style={[
                      styles.receiptValue,
                      { color: theme.colors.onSurface },
                      row.bold && { fontWeight: '700', color: '#1565C0' },
                      row.mono && { fontFamily: 'monospace', fontSize: 12 },
                  ]}>
                          {row.value}
                        </Text>
                      </View>
                    </View>
                    {i < arr.length - 1 && (<View style={[styles.rowSep, { backgroundColor: theme.colors.surfaceVariant }]}/>)}
                  </View>))}
              </View>
            </Reveal>
          </View>)}

        
        {!error && isFailed && (<View style={styles.section}>
            <Reveal delay={160}>
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.centeredCard}>
                  <View style={[styles.failedIconCircle]}>
                    <MaterialCommunityIcons name="close" size={26} color="#fff"/>
                  </View>
                  <Text style={[styles.centeredTitle, { color: theme.colors.onSurface }]}>
                    Payment Failed
                  </Text>
                  <Text style={[styles.centeredSub, { color: theme.colors.onSurfaceVariant }]}>
                    Your last payment was unsuccessful. Please try again or use a payment code.
                  </Text>
                </View>
              </View>
            </Reveal>
          </View>)}

        
        {!error && !isPaid && (<View style={styles.section}>
            <Reveal delay={220}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                {isFailed ? 'Try Again' : 'Online Payment'}
              </Text>
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconBox, { backgroundColor: '#E3F2FD' }]}>
                    <MaterialCommunityIcons name="credit-card-outline" size={20} color="#1565C0"/>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                      Pay with Paystack
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.onSurfaceVariant }]}>
                      Card, bank transfer, or USSD
                    </Text>
                  </View>
                </View>

                <View style={[styles.rowSep, { backgroundColor: theme.colors.surfaceVariant }]}/>

                <Text style={[styles.cardHint, { color: theme.colors.onSurfaceVariant }]}>
                  You'll be redirected to Paystack's secure payment page to complete your payment.
                </Text>

                <TouchableOpacity style={[styles.primaryBtn, styles.fullBtn, initializing && { opacity: 0.7 }]} onPress={handleInitializePayment} disabled={initializing} activeOpacity={0.82}>
                  {initializing ? (<ActivityIndicator size={16} color="#fff"/>) : (<>
                      <MaterialCommunityIcons name="lock-outline" size={16} color="#fff"/>
                      <Text style={styles.primaryBtnText}>Pay {formattedAmount} Securely</Text>
                    </>)}
                </TouchableOpacity>
              </View>
            </Reveal>
          </View>)}

        
        {!error && !isPaid && (<View style={styles.section}>
            <Reveal delay={280}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Payment Code
              </Text>
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconBox, { backgroundColor: '#E8F5E9' }]}>
                    <MaterialCommunityIcons name="key-outline" size={20} color="#2E7D32"/>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                      Verify with Code
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.onSurfaceVariant }]}>
                      Paid offline or via bursary?
                    </Text>
                  </View>
                </View>

                <View style={[styles.rowSep, { backgroundColor: theme.colors.surfaceVariant }]}/>

                <Text style={[styles.cardHint, { color: theme.colors.onSurfaceVariant }]}>
                  Enter the payment code issued by the bursary or finance office to verify your payment.
                </Text>

                <TextInput mode="outlined" label="Payment Code" value={verifyCode} onChangeText={setVerifyCode} autoCapitalize="characters" disabled={verifying} style={styles.codeInput} outlineColor={theme.colors.surfaceVariant} activeOutlineColor="#1565C0" left={<TextInput.Icon icon="key"/>}/>

                <TouchableOpacity style={[
                  styles.secondaryBtn,
                  styles.fullBtn,
                  verifying && { opacity: 0.7 },
              ]} onPress={handleVerifyCode} disabled={verifying} activeOpacity={0.82}>
                  {verifying ? (<ActivityIndicator size={16} color="#1565C0"/>) : (<>
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color="#1565C0"/>
                      <Text style={styles.secondaryBtnText}>Verify Code</Text>
                    </>)}
                </TouchableOpacity>
              </View>
            </Reveal>
          </View>)}

        
        <View style={{ height: 24 }}/>
      </ScrollView>

      
      {user && (<Paystack paystackKey={PAYSTACK_CONFIG.PUBLIC_KEY} amount={paystackAmt} billingEmail={user.email ?? `${user.matricNumber}@stayhub.app`} billingName={`${user.firstName} ${user.lastName}`} refNumber={paystackRef} activityIndicatorColor="#1565C0" onCancel={() => Alert.alert('Cancelled', 'Payment was cancelled.')} onSuccess={handlePaystackSuccess} autoStart={false} ref={paystackWebViewRef as any}/>)}
    </View>);
}
const styles = StyleSheet.create({
    screen: { flex: 1 },
    loadingScreen: { flex: 1 },
    loadingBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingBottom: 16 },
    hero: {
        backgroundColor: '#1565C0',
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 36,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
        alignItems: 'center',
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
        backgroundColor: 'rgba(255,255,255,0.07)', top: 20, left: 80,
    },
    heroEyebrow: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
    heroAmount: { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -0.5, marginBottom: 14 },
    statusChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    },
    statusChipText: { fontSize: 13, fontWeight: '700' },
    heroPaidDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 10 },
    section: { paddingHorizontal: 18, paddingTop: 22 },
    sectionLabel: {
        fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: 1.1, marginBottom: 12,
    },
    card: {
        borderRadius: 18, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
        paddingHorizontal: 16, paddingBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center',
        gap: 12, paddingTop: 16, paddingBottom: 14,
    },
    cardIconBox: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { fontSize: 14, fontWeight: '700' },
    cardSub: { fontSize: 12, marginTop: 1 },
    cardHint: { fontSize: 13, lineHeight: 19, marginBottom: 14, marginTop: 12 },
    rowSep: { height: 1 },
    receiptBanner: {
        alignItems: 'center',
        paddingVertical: 22,
        gap: 6,
    },
    receiptIconCircle: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#43A047',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    receiptBannerTitle: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
    receiptBannerSub: { fontSize: 13, color: '#757575', textAlign: 'center', lineHeight: 18 },
    receiptDivider: { height: 1, marginBottom: 4 },
    receiptRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: 12, paddingVertical: 12,
    },
    receiptIconBox: {
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
    },
    receiptLabel: { fontSize: 11, marginBottom: 2 },
    receiptValue: { fontSize: 14, fontWeight: '600' },
    centeredCard: { alignItems: 'center', paddingTop: 28, paddingBottom: 12, gap: 8 },
    centeredTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 4 },
    centeredSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
    failedIconCircle: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#E53935',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    fullBtn: { marginTop: 4 },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#1565C0', paddingVertical: 13,
        borderRadius: 12,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#E3F2FD', paddingVertical: 13,
        borderRadius: 12,
    },
    secondaryBtnText: { color: '#1565C0', fontWeight: '700', fontSize: 14 },
    codeInput: { marginBottom: 12, backgroundColor: 'transparent' },
});
