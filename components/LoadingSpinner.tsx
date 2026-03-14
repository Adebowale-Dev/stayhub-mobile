import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
interface Props {
    message?: string;
}
export function LoadingSpinner({ message }: Props) {
    return (<View style={styles.container}>
      <ActivityIndicator size="large" color="#1565C0"/>
      {message && (<Text variant="bodyMedium" style={styles.text}>
          {message}
        </Text>)}
    </View>);
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    text: {
        color: '#666',
    },
});
