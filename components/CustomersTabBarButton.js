import { useRouter } from 'expo-router';
import React, { forwardRef, useCallback } from 'react';
import { Alert, Pressable } from 'react-native';
import { useLocale } from '@/contexts/LocaleContext';
import * as preferencesService from '@/services/preferencesService';

/**
 * Customers tab: default press + long-press quick jump (inventory, reports, new customer).
 */
export const CustomersTabBarButton = forwardRef(function CustomersTabBarButton(
  props,
  ref
) {
  const router = useRouter();
  const { t } = useLocale();
  const { children, style, onPress, onLongPress, ...rest } = props;

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      onLongPress();
      return;
    }
    Alert.alert(
      t('home_tabLongTitle'),
      undefined,
      [
        {
          text: t('home_tabLongAddCustomer'),
          onPress: () => {
            void preferencesService.setPendingOpenAddCustomer();
            router.push('/');
          },
        },
        {
          text: t('home_tabLongInventory'),
          onPress: () => router.push('/inventory'),
        },
        {
          text: t('home_tabLongReports'),
          onPress: () => router.push('/reports'),
        },
        { text: t('common_cancel'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [onLongPress, router, t]);

  return (
    <Pressable
      ref={ref}
      {...rest}
      accessibilityRole="button"
      style={style}
      onPress={onPress}
      onLongPress={handleLongPress}
    >
      {children}
    </Pressable>
  );
});
