import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Card as PaperCard, CardProps } from 'react-native-paper';

interface Props extends React.ComponentProps<typeof PaperCard> {
  style?: ViewStyle;
}

export function Card({ style, ...props }: Props) {
  return <PaperCard style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 14,
    elevation: 2,
  },
});
