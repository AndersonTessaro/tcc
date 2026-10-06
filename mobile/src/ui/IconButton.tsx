import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, MIN_TOUCH, radius } from "./theme";

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  filled?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, label, onPress, color = colors.text, size = 24, filled, disabled, style }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.base, filled && styles.filled, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <Ionicons name={icon} size={size} color={filled ? colors.onBrand : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  filled: { backgroundColor: colors.primary },
  pressed: { opacity: 0.6, transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.4 },
});
