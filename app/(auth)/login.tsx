import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { TextInput, ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Background photo ────────────────────────────────────────────────────────
// To use your own photo: save it as  assets/login-bg.jpg  then swap the require
const BG_IMAGE = require('../../assets/splash.png');
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [matricNumber, setMatricNumber] = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!matricNumber.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your matric number and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login({
        matricNumber: matricNumber.trim().toUpperCase(),
        password,
      });
      await setAuth(res.data.user, res.data.token);
      router.replace('/(student)/dashboard');
    } catch (e: any) {
      Alert.alert(
        'Login Failed',
        e.response?.data?.message ?? 'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
          {/* ── Dark overlay ── */}
          <View style={styles.overlay} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ── Hero branding ── */}
            <View style={styles.hero}>
              <View style={styles.logoRing}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>SH</Text>
                </View>
              </View>
              <Text style={styles.appName}>StayHub</Text>
              <Text style={styles.appTagline}>Student Hostel Portal</Text>
            </View>

            {/* ── Form card ── */}
            <View style={[styles.card, { paddingBottom: insets.bottom + 28 }]}>
              <Text style={styles.cardTitle}>Welcome back 👋</Text>
              <Text style={styles.cardSub}>Sign in to access your hostel account</Text>

              <TextInput
                mode="outlined"
                label="Matric Number"
                value={matricNumber}
                onChangeText={setMatricNumber}
                autoCapitalize="characters"
                autoCorrect={false}
                disabled={loading}
                placeholder="e.g. CSC/2020/001"
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#1565C0"
                left={<TextInput.Icon icon="card-account-details-outline" />}
              />

              <TextInput
                mode="outlined"
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                disabled={loading}
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#1565C0"
                left={<TextInput.Icon icon="lock-outline" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowPassword((v) => !v)}
                  />
                }
              />

              <TouchableOpacity
                style={styles.forgotWrap}
                onPress={() => router.push('/(auth)/forgot-password')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.signInBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size={20} color="#fff" />
                ) : (
                  <>
                    <Text style={styles.signInBtnText}>Sign In</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <MaterialCommunityIcons name="shield-check-outline" size={13} color="#BDBDBD" />
                <Text style={styles.footerText}>Your connection is secured</Text>
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  flex:  { flex: 1 },
  bg:    { flex: 1 },

  // ── Semi-transparent dark layer over the photo ──────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },

  scroll:        { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },

  // ── Hero area ────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    minHeight: SCREEN_HEIGHT * 0.38,
    justifyContent: 'center',
  },
  logoRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.40)',
    padding: 4, marginBottom: 18,
  },
  logo: {
    flex: 1, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText:   { color: '#fff', fontSize: 27, fontWeight: '800', letterSpacing: 1 },
  appName:    { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: 0.3 },
  appTagline: { color: 'rgba(255,255,255,0.70)', fontSize: 14, marginTop: 6, letterSpacing: 0.2 },

  // ── Form card ────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 26,
    paddingTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', marginBottom: 5 },
  cardSub:   { fontSize: 13, color: '#9E9E9E', marginBottom: 26 },
  input:     { marginBottom: 14, backgroundColor: '#fff', fontSize: 14 },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 22, marginTop: -4 },
  forgotText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },

  signInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1565C0', paddingVertical: 15, borderRadius: 14,
    shadowColor: '#1565C0', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, marginTop: 28,
  },
  footerText: { fontSize: 12, color: '#BDBDBD' },
});
