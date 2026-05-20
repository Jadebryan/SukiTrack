import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';
import { font } from '@/constants/theme';

export function AppConfirmDialog({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  destructive = false,
  icon,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  useNativeModal = false,
}) {
  const theme = useTheme();
  const confirmColor = destructive ? '#ef4444' : '#2d8a4e';
  const iconName =
    icon || (destructive ? 'alert-octagon-outline' : 'shield-check-outline');
  const iconFg = destructive ? '#ef4444' : '#2d8a4e';
  const iconBg = destructive ? '#fee2e2' : '#e8f5ed';
  const border =
    theme.colors.outlineVariant || theme.colors.outline || '#dde8df';

if (useNativeModal) {
    return (
      <RNModal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onCancel}
      >
        <View style={styles.nativeModalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onCancel}
          />
          <View style={styles.nativeModalContainer}>
            <Dialog
              visible={visible}
              onDismiss={onCancel}
              style={[
                styles.dialog,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: border,
                },
              ]}
            >
              <View style={styles.head}>
                <View style={[styles.iconBubble, { backgroundColor: iconBg }]}> 
                  <MaterialCommunityIcons name={iconName} size={20} color={iconFg} />
                </View>
                <Text
                  variant="headlineSmall"
                  accessibilityRole="header"
                  style={[styles.title, { color: theme.colors.onSurface }]}
                  numberOfLines={3}
                >
                  {title}
                </Text>
              </View>
              <Dialog.Content style={styles.content}>
                <Text style={[styles.msg, { color: theme.colors.onSurfaceVariant }]}> 
                  {message}
                </Text>
              </Dialog.Content>
              <Dialog.Actions style={styles.actions}>
                <View style={styles.btnRow}>
                  <Button
                    mode="outlined"
                    onPress={onCancel}
                    style={[styles.cancelBtn, { borderColor: border }]}
                    textColor={confirmColor}
                    disabled={confirmDisabled}
                  >
                    {cancelText}
                  </Button>
                  <Button
                    mode="contained"
                    onPress={onConfirm}
                    style={[styles.confirmBtn, { backgroundColor: confirmColor }]}
                    disabled={confirmDisabled}
                  >
                    {confirmText}
                  </Button>
                </View>
              </Dialog.Actions>
            </Dialog>
          </View>
        </View>
      </RNModal>
    );
  }

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onCancel}
        style={[
          styles.dialog,
          {
            backgroundColor: theme.colors.surface,
            borderColor: border,
          },
        ]}
      >
        <View style={styles.head}>
          <View style={[styles.iconBubble, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={iconFg} />
          </View>
          <Text
            variant="headlineSmall"
            accessibilityRole="header"
            style={[styles.title, { color: theme.colors.onSurface }]}
            numberOfLines={3}
          >
            {title}
          </Text>
        </View>
        <Dialog.Content style={styles.content}>
          <Text style={[styles.msg, { color: theme.colors.onSurfaceVariant }]}>
            {message}
          </Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <View style={styles.btnRow}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={[styles.cancelBtn, { borderColor: border }]}
              textColor={confirmColor}
              disabled={confirmDisabled}
            >
              {cancelText}
            </Button>
            <Button
              mode="contained"
              onPress={onConfirm}
              style={[styles.confirmBtn, { backgroundColor: confirmColor }]}
              disabled={confirmDisabled}
            >
              {confirmText}
            </Button>
          </View>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    alignSelf: 'center',
    width: '92%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
  },
  head: {
    /** Cancel RN Paper Dialog MD3 `marginTop: 24` injected on first child */
    marginTop: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    minWidth: 0,
    margin: 0,
    padding: 0,
    fontFamily: font.extraBold,
  },
  content: { paddingTop: 8 },
  msg: { lineHeight: 20, opacity: 0.95, marginTop: 0 },
  actions: { paddingHorizontal: 16, paddingBottom: 14 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: { flex: 1, borderRadius: 14 },
  confirmBtn: { flex: 1, borderRadius: 14 },
  nativeModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  nativeModalContainer: {
    width: '100%',
    maxWidth: 420,
  },
});

