import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "@/lib/haptics";
import { colors, MIN_TOUCH, radius, space } from "./theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = {
  label: string;
  onPress: () => unknown;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const palette: Record<Variant, { bg: string; pressed: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, text: colors.onBrand },
  secondary: { bg: colors.surface, pressed: colors.primarySoft, text: colors.primary, border: colors.primary },
  ghost: { bg: "transparent", pressed: colors.primarySoft, text: colors.primary },
  danger: { bg: colors.surface, pressed: colors.dangerSoft, text: colors.danger, border: colors.danger },
};

// Promise-returning handlers lock the button until they settle, preventing double submits.
export function Button({ label, onPress, variant = "primary", icon, loading, disabled, compact, accessibilityLabel, accessibilityHint, style }: ButtonProps) {
  const [running, setRunning] = useState(false);
  const busy = !!loading || running;
  const inactive = !!disabled || busy;
  const tone = palette[variant];

  const handlePress = async () => {
    if (inactive) return;
    haptics.tap();
    const result = onPress();
    if (result instanceof Promise) {
      setRunning(true);
      try {
        await result;
      } finally {
        setRunning(false);
      }
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={handlePress}
      android_ripple={{ color: tone.pressed }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: pressed ? tone.pressed : tone.bg, borderColor: tone.border ?? "transparent" },
        pressed && styles.pressed,
        disabled && !busy && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {busy ? <ActivityIndicator size="small" color={tone.text} /> : icon ? <Ionicons name={icon} size={18} color={tone.text} /> : null}
        <Text style={[styles.label, { color: tone.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.xl, justifyContent: "center", overflow: "hidden" },
  compact: { minHeight: MIN_TOUCH, paddingHorizontal: space.lg },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, paddingVertical: space.sm },
  label: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  pressed: { transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
