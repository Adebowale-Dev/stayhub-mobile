import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [matricNumber, setMatricNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  const handleLogin = async () => {
    if (!matricNumber.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter your matric number and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({
        matricNumber: matricNumber.trim().toUpperCase(),
        password,
      });

      const { token, user } = response.data;
      await setAuth(user, token);
      router.replace('/(student)/dashboard');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.message ?? 'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>SH</Text>
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            StayHub
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Student Hostel Portal
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            label="Matric Number"
            value={matricNumber}
            onChangeText={setMatricNumber}
            mode="outlined"
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            disabled={loading}
            left={<TextInput.Icon icon="account" />}
            placeholder="e.g. CSC/2020/001"
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            disabled={loading}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
          >
            Login
          </Button>

          <Button
            mode="text"
            onPress={() => router.push('/(auth)/forgot-password')}
            disabled={loading}
          >
            Forgot Password?
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  logoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    fontWeight: 'bold',
    color: '#1565C0',
  },
  subtitle: {
    color: '#555',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
  },
  input: {
    marginBottom: 16,
  },
  loginButton: {
    marginBottom: 8,
    borderRadius: 8,
  },
  loginButtonContent: {
    paddingVertical: 6,
  },
});
