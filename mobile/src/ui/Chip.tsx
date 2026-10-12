import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { haptics } from "@/lib/haptics";
import { colors, MIN_TOUCH, radius, space } from "./theme";

type ChipRole = "radio" | "tab" | "button";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  role?: ChipRole;
  accessibilityLabel?: string;
  disabled?: boolean;
};

export function Chip({ label, selected = false, onPress, role = "radio", accessibilityLabel, disabled }: ChipProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      aria-selected={role === "tab" ? selected : undefined}
      aria-checked={role === "radio" ? selected : undefined}
      aria-disabled={!!disabled}
      disabled={disabled}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

export type ChipOption<T extends string> = { value: T; label: string; accessibilityLabel?: string };

type ChipGroupProps<T extends string> = {
  options: ChipOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  label?: string;
  scroll?: boolean;
  role?: "radio" | "tab";
  disabled?: boolean;
};

export function ChipGroup<T extends string>({ options, value, onChange, label, scroll, role = "radio", disabled }: ChipGroupProps<T>) {
  const chips = options.map((option) => (
    <Chip disabled={disabled} key={option.value} label={option.label} accessibilityLabel={option.accessibilityLabel} role={role} selected={option.value === value} onPress={() => onChange(option.value)} />
  ));
  const groupRole = role === "tab" ? "tablist" : "radiogroup";
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole={groupRole} accessibilityLabel={label} style={styles.scroll} contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }
  return <View accessibilityRole={groupRole} accessibilityLabel={label} style={[styles.row, styles.wrap]}>{chips}</View>;
}

const styles = StyleSheet.create({
  // react-native-web gives ScrollView flexGrow 1, so a horizontal row would fill the parent's height.
  scroll: { flexGrow: 0 },
  row: { flexDirection: "row", gap: space.sm },
  wrap: { flexWrap: "wrap" },
  chip: { minHeight: MIN_TOUCH, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center" },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.45 },
  label: { color: colors.text, fontSize: 14, fontWeight: "500" },
  selectedLabel: { color: colors.onBrand, fontWeight: "600" },
});
