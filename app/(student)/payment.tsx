import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  Divider,
  ActivityIndicator,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { Paystack, paystackProps } from 'react-native-paystack-webview';
import { paymentAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { PAYSTACK_CONFIG } from '../../constants/config';
import type { PaymentStatus } from '../../types';

export default function PaymentScreen() {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [paystackOpen, setPaystackOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const paystackWebViewRef = useRef<paystackProps.PayStackRef>(null);
  const theme = useTheme();

  const loadStatus = async () => {
    try {
      const res = await paymentAPI.getStatus();
      const data = (res.data as any).data ?? res.data;
      setStatus(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const onRefresh = () => { setRefreshing(true); loadStatus(); };

  const handleInitializePayment = async () => {
    setInitializing(true);
    try {
      const amountRes = await paymentAPI.getAmount();
      const amountVal: number = (amountRes.data as any).data?.amount ?? (amountRes.data as any).amount ?? 0;

      const initRes = await paymentAPI.initialize(amountVal);
      const initData = (initRes.data as any).data ?? initRes.data;

      setAmount(amountVal);
      setReference(initData.reference ?? '');
      setPaystackOpen(true);
      paystackWebViewRef.current?.startTransaction();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message ?? 'Failed to initialize payment.');
    } finally {
      setInitializing(false);
    }
  };

  const handlePaystackSuccess = async (res: any) => {
    setPaystackOpen(false);
    const ref = res?.transactionRef?.reference ?? reference;
    try {
      await paymentAPI.verifyReference(ref);
      Alert.alert('Payment Successful', 'Your payment has been verified!');
      loadStatus();
    } catch {
      Alert.alert(
        'Verification Pending',
        'Payment received. Verification is being processed. Please refresh shortly.'
      );
      loadStatus();
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
      loadStatus();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message ?? 'Invalid or expired payment code.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isPaid = status?.status === 'paid';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Payment Status Card */}
      <Card style={[styles.statusCard, { borderLeftColor: isPaid ? '#4caf50' : '#ff9800' }]}>
        <Card.Content style={styles.statusContent}>
          <View>
            <Text variant="labelSmall" style={{ color: '#888' }}>Payment Status</Text>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: 'bold', color: isPaid ? '#2e7d32' : '#e65100' }}
            >
              {isPaid ? 'Paid' : status?.status === 'failed' ? 'Failed' : 'Pending'}
            </Text>
            {status?.paidAt && (
              <Text variant="bodySmall" style={{ color: '#888', marginTop: 4 }}>
                Paid on {new Date(status.paidAt).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            )}
          </View>
          <Chip
            icon={isPaid ? 'check-circle' : 'clock-outline'}
            style={{ backgroundColor: isPaid ? '#e8f5e9' : '#fff3e0' }}
            textStyle={{ color: isPaid ? '#2e7d32' : '#e65100' }}
          >
            {isPaid ? 'Completed' : 'Pending'}
          </Chip>
        </Card.Content>
      </Card>

      {/* Amount */}
      {status?.amount != null && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelMedium" style={{ color: '#888' }}>Amount Due</Text>
            <Text variant="headlineMedium" style={styles.amountText}>
              ₦{(status.amount / 100).toLocaleString()}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Pay with Paystack */}
      {!isPaid && (
        <Card style={styles.card}>
          <Card.Title title="Online Payment" titleVariant="titleMedium" />
          <Divider />
          <Card.Content style={{ paddingTop: 12 }}>
            <Text variant="bodySmall" style={styles.hint}>
              Pay securely using your card or bank transfer via Paystack.
            </Text>
            <Button
              mode="contained"
              icon="credit-card"
              onPress={handleInitializePayment}
              loading={initializing}
              disabled={initializing}
              style={styles.payBtn}
              contentStyle={styles.payBtnContent}
            >
              Pay with Paystack
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Verify with Code */}
      {!isPaid && (
        <Card style={styles.card}>
          <Card.Title title="Verify with Payment Code" titleVariant="titleMedium" />
          <Divider />
          <Card.Content style={{ paddingTop: 12 }}>
            <Text variant="bodySmall" style={styles.hint}>
              If you paid offline or received a payment code, enter it below to verify.
            </Text>
            <TextInput
              mode="outlined"
              label="Payment Code"
              value={verifyCode}
              onChangeText={setVerifyCode}
              autoCapitalize="characters"
              style={styles.codeInput}
              disabled={verifying}
              left={<TextInput.Icon icon="key" />}
            />
            <Button
              mode="contained-tonal"
              onPress={handleVerifyCode}
              loading={verifying}
              disabled={verifying}
              style={styles.verifyBtn}
            >
              Verify Code
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Reference */}
      {status?.reference && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: '#888' }}>Transaction Reference</Text>
            <Text variant="bodyMedium" selectable style={{ fontFamily: 'monospace', marginTop: 4 }}>
              {status.reference}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Hidden Paystack Component */}
      {user && (
        <Paystack
          paystackKey={PAYSTACK_CONFIG.PUBLIC_KEY}
          amount={amount}
          billingEmail={user.email ?? `${user.matricNumber}@stayhub.app`}
          billingName={`${user.firstName} ${user.lastName}`}
          refNumber={reference}
          activityIndicatorColor="#1565C0"
          onCancel={() => {
            setPaystackOpen(false);
            Alert.alert('Cancelled', 'Payment was cancelled.');
          }}
          onSuccess={handlePaystackSuccess}
          autoStart={false}
          ref={paystackWebViewRef}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  statusCard: { marginBottom: 16, borderRadius: 12, borderLeftWidth: 6 },
  statusContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { marginBottom: 16, borderRadius: 12 },
  amountText: { fontWeight: 'bold', color: '#1565C0', marginTop: 4 },
  hint: { color: '#666', marginBottom: 12, lineHeight: 20 },
  payBtn: { borderRadius: 10 },
  payBtnContent: { paddingVertical: 4 },
  codeInput: { marginBottom: 12 },
  verifyBtn: { borderRadius: 10 },
});
