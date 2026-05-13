import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LoginScreen } from '@/screens/LoginScreen';

export default function LoginRoute() {
  return (
    <View style={styles.flex}>
      <LoginScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
