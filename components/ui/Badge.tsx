import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';

type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const COLORS: Record<Variant, { bg: string; text: string }> = {
  success: { bg: '#e8f5e9', text: '#2e7d32' },
  warning: { bg: '#fff3e0', text: '#e65100' },
  error:   { bg: '#ffebee', text: '#c62828' },
  info:    { bg: '#e3f2fd', text: '#1565C0' },
  neutral: { bg: '#f5f5f5', text: '#616161' },
};

interface Props {
  label: string;
  variant?: Variant;
}

export function Badge({ label, variant = 'neutral' }: Props) {
  const { bg, text } = COLORS[variant];
  return (
    <Chip
      compact
      style={[styles.chip, { backgroundColor: bg }]}
      textStyle={[styles.text, { color: text }]}
    >
      {label}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {},
  text: { fontSize: 11 },
});
