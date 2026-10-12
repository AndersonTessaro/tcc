import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, space, type } from "./theme";

type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  tone?: "default" | "danger";
  variant?: "default" | "plain";
  accessibilityLabel?: string;
};

export function ListRow({ title, subtitle, leading, trailing, onPress, tone = "default", variant = "default", accessibilityLabel }: ListRowProps) {
  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        <Text style={[styles.title, tone === "danger" && styles.danger]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} /> : null)}
    </>
  );
  if (!onPress) return <View style={[styles.row, variant === "plain" && styles.plain]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      android_ripple={{ color: colors.primarySoft }}
      style={({ pressed }) => [styles.row, variant === "plain" && styles.plain, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: colors.surface },
  plain: { minHeight: 64, backgroundColor: "transparent", borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  pressed: { backgroundColor: colors.primarySoft },
  leading: { width: 32, alignItems: "center" },
  text: { flex: 1, gap: 2 },
  title: { ...type.bodyStrong },
  subtitle: { ...type.caption },
  danger: { color: colors.danger },
});
