import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton, ButtonProps } from 'react-native-paper';

interface Props extends ButtonProps {
  fullWidth?: boolean;
}

export function Button({ fullWidth, style, ...props }: Props) {
  return (
    <PaperButton
      style={[fullWidth && styles.fullWidth, style]}
      contentStyle={styles.content}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%', borderRadius: 10 },
  content: { paddingVertical: 4 },
});
