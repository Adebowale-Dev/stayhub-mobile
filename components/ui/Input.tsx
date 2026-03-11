import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, TextInputProps } from 'react-native-paper';

interface Props extends React.ComponentProps<typeof TextInput> {
  containerStyle?: object;
}

export function Input({ containerStyle, style, ...props }: Props) {
  return (
    <TextInput
      mode="outlined"
      style={[styles.input, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    marginBottom: 14,
  },
});
