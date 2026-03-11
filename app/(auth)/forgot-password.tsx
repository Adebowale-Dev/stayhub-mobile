import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { authAPI } from '../../services/api';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message ?? 'Failed to send reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.successBox}>
          <Text variant="headlineSmall" style={styles.successTitle}>
            Check Your Email
          </Text>
          <Text variant="bodyMedium" style={styles.successText}>
            A password reset link has been sent to {email}. Please check your inbox.
          </Text>
          <Button mode="contained" onPress={() => router.back()} style={styles.button}>
            Back to Login
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text variant="bodyMedium" style={styles.description}>
          Enter your registered email address. We'll send you a link to reset your password.
        </Text>

        <TextInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          disabled={loading}
          left={<TextInput.Icon icon="email" />}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Send Reset Link
        </Button>

        <Button mode="text" onPress={() => router.back()} disabled={loading}>
          Back to Login
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    padding: 24,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
  },
  description: {
    color: '#555',
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  successBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    alignItems: 'center',
  },
  successTitle: {
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 12,
  },
  successText: {
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
});
