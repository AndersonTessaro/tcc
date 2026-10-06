import { StyleSheet, View } from "react-native";
import { colors, radius } from "./theme";

type ProgressBarProps = { value: number; max: number; label: string; color?: string; height?: number };

export function ProgressBar({ value, max, label, color = colors.primary, height = 10 }: ProgressBarProps) {
  const percent = max > 0 ? Math.round(Math.min(100, Math.max(0, (value / max) * 100))) : 0;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
      style={[styles.track, { height }]}
    >
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", backgroundColor: colors.track, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
