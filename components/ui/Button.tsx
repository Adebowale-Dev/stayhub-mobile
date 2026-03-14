import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton, ButtonProps } from 'react-native-paper';
interface Props extends ButtonProps {
    fullWidth?: boolean;
}
export function Button({ fullWidth, style, ...props }: Props) {
    return (<PaperButton style={[styles.button, fullWidth && styles.fullWidth, style]} contentStyle={styles.content} labelStyle={styles.label} {...props}/>);
}
const styles = StyleSheet.create({
    button: { borderRadius: 14 },
    fullWidth: { width: '100%' },
    content: { minHeight: 48, paddingHorizontal: 8 },
    label: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
});
