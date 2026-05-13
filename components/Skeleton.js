import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Card, useTheme } from 'react-native-paper';

function usePulse() {
  const opacity = useRef(new Animated.Value(0.38)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.62,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.38,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

/** Generic rounded pulse block (pass width as number or '100%'). */
export function SkeletonBox({
  width = '100%',
  height = 14,
  borderRadius = 8,
  style,
}) {
  const theme = useTheme();
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.surfaceVariant,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function CustomerRowSkeleton() {
  const theme = useTheme();
  const opacity = usePulse();
  return (
    <View style={styles.customerPress}>
      <Card
        mode="outlined"
        style={[
          styles.customerCard,
          {
            borderColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <View style={styles.customerRow}>
          <Animated.View
            style={[
              styles.customerAvatar,
              { backgroundColor: theme.colors.surfaceVariant, opacity },
            ]}
          />
          <View style={styles.customerMain}>
            <SkeletonBox width="72%" height={16} borderRadius={6} />
            <View style={{ height: 8 }} />
            <SkeletonBox width="88%" height={12} borderRadius={5} />
          </View>
          <View style={styles.customerRight}>
            <SkeletonBox width={72} height={16} borderRadius={6} />
            <View style={{ height: 6 }} />
            <SkeletonBox width={44} height={10} borderRadius={4} />
          </View>
        </View>
      </Card>
    </View>
  );
}

export function CustomerListSkeleton({ rows = 7 }) {
  return (
    <View style={styles.listSkWrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <CustomerRowSkeleton key={`sk-row-${i}`} />
      ))}
    </View>
  );
}

export function InventoryProductRowSkeleton() {
  const theme = useTheme();
  const opacity = usePulse();
  return (
    <View style={styles.invPress}>
      <Card
        mode="elevated"
        style={[
          styles.invCard,
          {
            borderColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <View style={styles.invRow}>
          <View style={styles.invTextCol}>
            <SkeletonBox width="55%" height={17} borderRadius={6} />
            <View style={{ height: 8 }} />
            <SkeletonBox width="40%" height={13} borderRadius={5} />
          </View>
          <Animated.View
            style={[
              styles.invSticker,
              { backgroundColor: theme.colors.surfaceVariant, opacity },
            ]}
          />
        </View>
      </Card>
    </View>
  );
}

export function InventoryProductListSkeleton({ rows = 6 }) {
  return (
    <View style={styles.invListWrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <InventoryProductRowSkeleton key={`sk-inv-${i}`} />
      ))}
    </View>
  );
}

export function InventoryHubGridSkeleton({ colW, gap = 12 }) {
  const rows = 4;
  return (
    <View style={styles.hubGrid}>
      {Array.from({ length: rows }).map((_, row) => (
        <View key={`hub-r-${row}`} style={[styles.hubRow, { gap }]}>
          <SkeletonBox width={colW} height={118} borderRadius={16} />
          <SkeletonBox width={colW} height={118} borderRadius={16} />
        </View>
      ))}
    </View>
  );
}

export function ReportsScreenSkeleton() {
  const theme = useTheme();
  return (
    <View style={styles.repWrap}>
      <Card mode="outlined" style={[styles.repCard, { borderColor: theme.colors.outlineVariant }]}>
        <View style={styles.repCardPad}>
          <SkeletonBox width="45%" height={18} borderRadius={6} style={{ marginBottom: 16 }} />
          <View style={styles.repRow}>
            <SkeletonBox style={{ flex: 1 }} height={56} borderRadius={12} />
            <View style={{ width: 10 }} />
            <SkeletonBox style={{ flex: 1 }} height={56} borderRadius={12} />
          </View>
          <View style={{ height: 12 }} />
          <SkeletonBox width="100%" height={48} borderRadius={12} />
        </View>
      </Card>
      <Card mode="outlined" style={[styles.repCard, { borderColor: theme.colors.outlineVariant }]}>
        <View style={styles.repCardPad}>
          <SkeletonBox width="38%" height={16} borderRadius={6} style={{ marginBottom: 12 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={`rep-l-${i}`} style={{ marginBottom: 10 }}>
              <SkeletonBox width="100%" height={12} borderRadius={4} />
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

export function CustomerDetailSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.cdRoot, { backgroundColor: theme.colors.background }]}>
      <Card mode="elevated" style={styles.cdHero}>
        <View style={styles.cdHeroPad}>
          <SkeletonBox width={100} height={14} borderRadius={6} style={{ marginBottom: 10 }} />
          <SkeletonBox width="70%" height={40} borderRadius={8} style={{ marginBottom: 12 }} />
          <SkeletonBox width="85%" height={12} borderRadius={5} />
          <View style={{ height: 8 }} />
          <SkeletonBox width="60%" height={12} borderRadius={5} />
        </View>
      </Card>
      <View style={styles.cdActions}>
        <SkeletonBox height={48} borderRadius={12} style={{ flex: 1 }} />
        <View style={{ width: 10 }} />
        <SkeletonBox height={48} borderRadius={12} style={{ flex: 1 }} />
      </View>
      <View style={styles.cdSection}>
        <SkeletonBox width={140} height={22} borderRadius={6} style={{ marginBottom: 8 }} />
        <SkeletonBox width="92%" height={13} borderRadius={5} style={{ marginBottom: 16 }} />
        <Card mode="outlined" style={{ borderColor: theme.colors.outlineVariant }}>
          <View style={styles.cdCardPad}>
            <SkeletonBox width="40%" height={16} borderRadius={6} style={{ marginBottom: 14 }} />
            <SkeletonBox width="55%" height={12} borderRadius={5} style={{ marginBottom: 20 }} />
            <SkeletonBox width="100%" height={44} borderRadius={10} />
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listSkWrap: { paddingTop: 4, paddingBottom: 24 },
  customerPress: { marginHorizontal: 16, marginBottom: 12 },
  customerCard: { borderRadius: 16 },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    flexShrink: 0,
  },
  customerMain: { flex: 1, minWidth: 0 },
  customerRight: { alignItems: 'flex-end', flexShrink: 0, paddingLeft: 8 },
  invPress: { paddingHorizontal: 16, marginBottom: 10 },
  invCard: { borderRadius: 14 },
  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  invTextCol: { flex: 1, minWidth: 0 },
  invSticker: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginLeft: 12,
  },
  invListWrap: { paddingVertical: 8 },
  hubGrid: { marginTop: 8 },
  hubRow: { flexDirection: 'row', marginBottom: 12 },
  repWrap: { gap: 14, marginTop: 8 },
  repCard: { borderRadius: 14 },
  repCardPad: { padding: 16 },
  repRow: { flexDirection: 'row' },
  cdRoot: { flex: 1, padding: 16 },
  cdHero: { borderRadius: 16, marginBottom: 12 },
  cdHeroPad: { padding: 20 },
  cdActions: { flexDirection: 'row', marginBottom: 16 },
  cdSection: { flex: 1 },
  cdCardPad: { padding: 16 },
});
