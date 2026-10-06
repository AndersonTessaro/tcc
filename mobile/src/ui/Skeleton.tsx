import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue } from "react-native";
import { colors, radius, space } from "./theme";

export function Skeleton({ width = "100%", height = 16, rounded = radius.sm }: { width?: DimensionValue; height?: number; rounded?: number }) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || !active) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 650, useNativeDriver: true }),
      ]));
      loop.start();
    }).catch(() => undefined);
    return () => {
      active = false;
      loop?.stop();
    };
  }, [opacity]);

  return <Animated.View style={{ width, height, borderRadius: rounded, backgroundColor: colors.track, opacity }} />;
}

export function SkeletonList({ rows = 4, rowHeight = 76 }: { rows?: number; rowHeight?: number }) {
  return (
    <View accessible accessibilityLabel="Carregando" style={styles.list}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.row, { minHeight: rowHeight }]}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="75%" height={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md, padding: space.lg },
  row: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm, justifyContent: "center" },
});
