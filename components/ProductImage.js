import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ProductImage({ uri, size = 48, style, containerStyle, icon = 'cube-outline' }) {
  const theme = useTheme();
  const bg = theme.colors.surfaceVariant || '#e6efe6';

  if (uri) {
    return (
      <View style={[{ width: size, height: size, borderRadius: 8, overflow: 'hidden' }, containerStyle]}>
        <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: 8, backgroundColor: bg }, containerStyle]}>
      <MaterialCommunityIcons name={icon} size={Math.round(size * 0.5)} color={theme.colors.onSurfaceVariant || '#7c8b7c'} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
