import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { font } from '@/constants/theme';
import { useLocale } from '@/contexts/LocaleContext';

export default function NotFoundScreen() {
  const { t } = useLocale();
  return (
    <>
      <Stack.Screen options={{ title: t('nf_title') }} />
      <View style={styles.wrap}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('nf_message')}
        </Text>
        <Link href="/" style={styles.link}>
          <Text variant="titleLarge">{t('nf_back')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { marginBottom: 16, fontFamily: font.extraBold, textAlign: 'center' },
  link: { marginTop: 16 },
});
