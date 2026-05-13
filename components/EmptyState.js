import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { font } from '@/constants/theme';
import { Button, Text, useTheme } from 'react-native-paper';

export function EmptyState({
  icon = 'account-group-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons
        name={icon}
        size={56}
        color={theme.colors.outline}
        style={styles.icon}
      />
      <Text variant="titleLarge" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodyLarge" style={styles.sub}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          mode="contained"
          onPress={onAction}
          style={styles.action}
          contentStyle={styles.actionContent}
        >
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  icon: { marginBottom: 12 },
  title: { textAlign: 'center', fontFamily: font.bold },
  sub: { textAlign: 'center', marginTop: 8, opacity: 0.75 },
  action: { marginTop: 20, borderRadius: 12 },
  actionContent: { paddingHorizontal: 8 },
});
