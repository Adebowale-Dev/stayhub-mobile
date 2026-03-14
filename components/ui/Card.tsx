import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';

type Props = React.PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  [key: string]: any;
}>;

export function Card({ style, children, ...props }: Props) {
  return (
    <PaperCard style={[styles.card, style]} {...props}>
      {children}
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 14,
    elevation: 2,
  },
});
