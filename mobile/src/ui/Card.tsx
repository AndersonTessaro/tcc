import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, space } from "./theme";

type CardProps = {
  children: ReactNode;
  variant?: "outlined" | "plain";
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, variant = "outlined", onPress, accessibilityLabel, accessibilityHint, style }: CardProps) {
  if (!onPress) return <View style={[styles.card, variant === "plain" && styles.plain, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      android_ripple={{ color: colors.primarySoft }}
      style={({ pressed }) => [styles.card, variant === "plain" && styles.plain, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.cardBorder },
  plain: { borderWidth: 0 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
