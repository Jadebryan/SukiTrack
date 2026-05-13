import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/**
 * @param {object} props
 * @param {string} props.icon MaterialCommunityIcons name
 * @param {string} props.bg fill color
 * @param {number} props.rotate degrees
 * @param {number} [props.size]
 */
export function InventoryCategorySticker({ icon, bg, rotate, size = 56 }) {
  const iconSize = Math.round(size * 0.48);
  return (
    <View style={[styles.tilt, { transform: [{ rotate: `${rotate}deg` }] }]}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
          },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={iconSize} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tilt: {
    alignSelf: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
      default: {},
    }),
  },
});
