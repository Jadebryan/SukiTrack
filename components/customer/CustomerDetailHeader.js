import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { CustomerDetailActionsMenu } from '@/components/customer/CustomerDetailActionsMenu';
import { homeAvatarColor } from '@/constants/homePalette';
import { font } from '@/constants/theme';

const SIDE_WIDTH = 72;

export function CustomerDetailHeader({
  colors,
  t,
  customerName,
  menuOpen,
  onMenuOpen,
  onMenuClose,
  onBack,
  onEdit,
  onDelete,
  onClearRecords,
  showMenu,
}) {
  const menuBtnRef = useRef(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const av = homeAvatarColor(customerName);
  const initial =
    String(customerName || '?').trim().charAt(0).toUpperCase() || '?';
  const displayName = customerName?.trim() || t('nav_customer');

  const openMenu = useCallback(() => {
    const node = menuBtnRef.current;
    if (!node?.measureInWindow) {
      onMenuOpen();
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      setMenuAnchor({
        x,
        y,
        width,
        height,
        screenWidth: Dimensions.get('window').width,
      });
      onMenuOpen();
    });
  }, [onMenuOpen]);

  const closeMenu = useCallback(() => {
    onMenuClose();
    setMenuAnchor(null);
  }, [onMenuClose]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.bar}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.sideLeft, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('nav_back')}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.green600} />
          <Text style={[styles.backText, { color: colors.green600 }]}>{t('nav_back')}</Text>
        </Pressable>

        <View style={styles.center} pointerEvents="box-none">
          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: av.bg }]}>
              <Text style={[styles.avatarText, { color: av.text }]}>{initial}</Text>
            </View>
            <View style={styles.titleBlock}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.crumb, { color: colors.textFaint }]} numberOfLines={1}>
                {t('tab_customers')} · {displayName}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sideRight}>
          {showMenu ? (
            <Pressable
              ref={menuBtnRef}
              onPress={openMenu}
              style={({ pressed }) => [
                styles.menuBtn,
                {
                  backgroundColor: menuOpen ? colors.green50 : colors.iconBtnBg,
                  borderColor: menuOpen ? colors.green100 : colors.border,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('cd_headerMenuA11y')}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={22}
                color={menuOpen ? colors.green700 : colors.textSecondary}
              />
            </Pressable>
          ) : (
            <View style={styles.sidePlaceholder} />
          )}
        </View>
      </View>

      <CustomerDetailActionsMenu
        visible={menuOpen}
        colors={colors}
        t={t}
        anchor={menuAnchor}
        onClose={closeMenu}
        onEdit={onEdit}
        onDelete={onDelete}
        onClearRecords={onClearRecords}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  sideLeft: {
    width: SIDE_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
  },
  sideRight: {
    width: SIDE_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sidePlaceholder: {
    width: 40,
    height: 40,
  },
  backText: {
    fontFamily: font.medium,
    fontSize: 14,
    marginLeft: -4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: font.semiBold,
    fontSize: 17,
  },
  titleBlock: {
    alignItems: 'center',
    minWidth: 0,
    flexShrink: 1,
  },
  name: {
    fontFamily: font.semiBold,
    fontSize: 16,
    textAlign: 'center',
  },
  crumb: {
    fontFamily: font.medium,
    fontSize: 11,
    marginTop: 1,
    textAlign: 'center',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
