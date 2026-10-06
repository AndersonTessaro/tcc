import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "./theme";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const tones: Record<StatusTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.track, fg: colors.muted },
  info: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export function StatusChip({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <View style={[styles.chip, { backgroundColor: tones[tone].bg }]}>
      <Text style={[styles.text, { color: tones[tone].fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: "700" },
});
