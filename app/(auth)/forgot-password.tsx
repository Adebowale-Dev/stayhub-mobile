import React, { useState } from 'react';
import { View, StyleSheet, Alert, Keyboard, KeyboardAvoidingView, TouchableWithoutFeedback, Platform, ScrollView, TouchableOpacity, StatusBar, } from 'react-native';
import { TextInput, ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authAPI } from '../../services/api';
import { useRouter } from 'expo-router';
export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const handleSubmit = async () => {
        if (!email.trim()) {
            Alert.alert('Missing Field', 'Please enter your email address.');
            return;
        }
        setLoading(true);
        try {
            await authAPI.forgotPassword(email.trim().toLowerCase());
            setSent(true);
        }
        catch (e: any) {
            Alert.alert('Error', e.response?.data?.message ?? 'Failed to send reset email. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    if (sent) {
        return (<View style={[styles.flex, { backgroundColor: '#1565C0' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#1565C0" translucent={false}/>
        <View style={{ height: insets.top, backgroundColor: '#1565C0' }}/>

        
        <View style={styles.successTop}>
          <View style={styles.bubble1}/>
          <View style={styles.bubble2}/>
        </View>

        
        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.successIconWrap}>
            <View style={styles.successIconCircle}>
              <MaterialCommunityIcons name="email-check-outline" size={32} color="#fff"/>
            </View>
          </View>

          <Text style={styles.cardTitle}>Check Your Email</Text>
          <Text style={styles.successBody}>
            We sent a password reset link to:
          </Text>
          <View style={styles.emailChip}>
            <MaterialCommunityIcons name="email-outline" size={14} color="#1565C0"/>
            <Text style={styles.emailChipText} numberOfLines={1}>{email}</Text>
          </View>
          <Text style={[styles.successBody, { marginTop: 12 }]}>
            Didn't receive it? Check your spam folder or try again with a different email.
          </Text>

          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 28 }]} onPress={() => router.back()} activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={16} color="#fff"/>
            <Text style={styles.primaryBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>);
    }
    return (<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle="light-content" backgroundColor="#1565C0" translucent={false}/>

        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} bounces={false}>
        
        <View style={styles.branding}>
          <View style={styles.bubble1}/>
          <View style={styles.bubble2}/>

          
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={loading} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff"/>
          </TouchableOpacity>

          
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="lock-reset" size={30} color="#fff"/>
          </View>

          <Text style={styles.appName}>Reset Password</Text>
          <Text style={styles.appTagline}>We'll send a reset link to your email</Text>
        </View>

        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Forgot your password?</Text>
          <Text style={styles.cardSub}>
            Enter the email address linked to your account and we'll send you a reset link.
          </Text>

          <TextInput mode="outlined" label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} disabled={loading} style={styles.input} outlineColor="#E0E0E0" activeOutlineColor="#1565C0" left={<TextInput.Icon icon="email-outline"/>}/>

          <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            {loading ? (<ActivityIndicator size={20} color="#fff"/>) : (<>
                <MaterialCommunityIcons name="send-outline" size={16} color="#fff"/>
                <Text style={styles.primaryBtnText}>Send Reset Link</Text>
              </>)}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLinkWrap} onPress={() => router.back()} disabled={loading} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={14} color="#1565C0"/>
            <Text style={styles.backLinkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>);
}
const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#1565C0' },
    scroll: { flex: 1, backgroundColor: '#1565C0' },
    scrollContent: { flexGrow: 1 },
    branding: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 32,
        paddingTop: 8,
        overflow: 'hidden',
    },
    successTop: { height: 60, overflow: 'hidden' },
    bubble1: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -50,
    },
    bubble2: {
        position: 'absolute', width: 130, height: 130, borderRadius: 65,
        backgroundColor: 'rgba(255,255,255,0.05)', bottom: -40, left: -30,
    },
    backBtn: {
        alignSelf: 'flex-start',
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    appName: { color: '#fff', fontSize: 22, fontWeight: '800' },
    appTagline: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 5, textAlign: 'center' },
    card: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 26,
        paddingTop: 30,
        paddingBottom: 32,
        minHeight: 400,
    },
    cardTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 },
    cardSub: { fontSize: 13, color: '#9E9E9E', lineHeight: 19, marginBottom: 24 },
    input: { marginBottom: 18, backgroundColor: '#fff' },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#1565C0', paddingVertical: 15, borderRadius: 14,
        shadowColor: '#1565C0', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
    },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    backLinkWrap: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 5, marginTop: 20,
    },
    backLinkText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
    successIconWrap: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
    successIconCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#1565C0',
        alignItems: 'center', justifyContent: 'center',
    },
    successBody: { fontSize: 13, color: '#757575', textAlign: 'center', lineHeight: 20 },
    emailChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'center',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, marginTop: 8,
    },
    emailChipText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
});
