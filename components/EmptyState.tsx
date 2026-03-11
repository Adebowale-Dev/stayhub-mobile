import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'inbox-outline', title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={64} color="#ccc" />
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      {description && (
        <Text variant="bodyMedium" style={styles.desc}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.btn}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  desc: {
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    marginTop: 8,
    borderRadius: 10,
  },
});
