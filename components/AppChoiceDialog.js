import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';
import { font } from '@/constants/theme';

function ChoiceRow({ item, active, onPress, borderColor, accent }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceRow,
        { borderColor: active ? accent : borderColor },
        pressed && { opacity: 0.92 },
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.choiceIcon, { backgroundColor: item.iconBg }]}>
        <MaterialCommunityIcons name={item.icon} size={18} color={item.iconColor} />
      </View>
      <View style={styles.choiceText}>
        <Text style={styles.choiceTitle}>{item.title}</Text>
        {item.subtitle ? <Text style={styles.choiceSub}>{item.subtitle}</Text> : null}
      </View>
      {active ? (
        <View style={[styles.checkBubble, { backgroundColor: item.checkBg || '#e8f5ed' }]}>
          <MaterialCommunityIcons name="check" size={16} color={accent} />
        </View>
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={18} color="#9ab09e" />
      )}
    </Pressable>
  );
}

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {string} props.title
 * @param {string} [props.message]
 * @param {{id: string, title: string, subtitle?: string, icon: string, iconBg: string, iconColor: string, checkBg?: string}[]} props.choices
 * @param {string} props.value
 * @param {(id: string) => void} props.onChange
 * @param {() => void} props.onCancel
 * @param {() => void | Promise<void>} props.onConfirm
 * @param {string} props.confirmText
 * @param {string} props.cancelText
 */
export function AppChoiceDialog({
  visible,
  title,
  message,
  choices,
  value,
  onChange,
  onCancel,
  onConfirm,
  confirmText,
  cancelText,
}) {
  const theme = useTheme();
  const border =
    theme.colors.outlineVariant || theme.colors.outline || '#dde8df';
  const accent = '#2d8a4e';

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onCancel}
        style={[
          styles.dialog,
          { backgroundColor: theme.colors.surface, borderColor: border },
        ]}
      >
        <View style={styles.head}>
          <View style={styles.headIcon}>
            <MaterialCommunityIcons name="tune-variant" size={20} color={accent} />
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
          {message ? (
            <Text style={[styles.msg, { color: theme.colors.onSurfaceVariant }]}>
              {message}
            </Text>
          ) : null}
          <View style={styles.choices}>
            {choices.map((c) => (
              <ChoiceRow
                key={c.id}
                item={c}
                active={c.id === value}
                borderColor={border}
                accent={accent}
                onPress={() => onChange(c.id)}
              />
            ))}
          </View>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button onPress={onCancel}>{cancelText}</Button>
          <Button mode="contained" buttonColor={accent} onPress={onConfirm}>
            {confirmText}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    alignSelf: 'center',
    width: '92%',
    maxWidth: 440,
    borderRadius: 18,
    borderWidth: 1,
  },
  head: {
    marginTop: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#e8f5ed',
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
  msg: { lineHeight: 20, opacity: 0.95, marginTop: 0, marginBottom: 12 },
  choices: { gap: 10, paddingTop: 4 },
  choiceRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choiceIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: { flex: 1, minWidth: 0 },
  choiceTitle: { fontFamily: font.semiBold, fontSize: 14 },
  choiceSub: { fontFamily: font.medium, fontSize: 11, color: '#9ab09e', marginTop: 2 },
  checkBubble: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { paddingHorizontal: 14, paddingBottom: 12, gap: 8, flexWrap: 'wrap' },
});

