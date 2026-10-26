import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brandGradient, colors, space, type } from "./theme";

type TabHeaderProps = { title: string; subtitle?: string; right?: ReactNode; children?: ReactNode };

export function TabHeader({ title, subtitle, right, children }: TabHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + space.lg }]}>
      <StatusBar style="light" />
      <View style={styles.row}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {children}
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexShrink: 0, paddingHorizontal: space.screenGutter, paddingBottom: space.lg, marginBottom: space.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44 },
  title: { ...type.display, color: colors.onBrand, fontWeight: "600", flexShrink: 1 },
  right: { marginLeft: "auto", flexShrink: 0 },
  subtitle: { ...type.body, color: colors.onBrandMuted, marginTop: space.xs },
});
