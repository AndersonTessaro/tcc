import { StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, space, type } from "@/ui/theme";

type TeacherStudentMetricsProps = { attendanceRate: number; weeklyPracticeMin: number; xp: number; level: number };

export function TeacherStudentMetrics({ attendanceRate, weeklyPracticeMin, xp, level }: TeacherStudentMetricsProps) {
  const practiceTime = `${Math.floor(weeklyPracticeMin / 60)}h ${String(weeklyPracticeMin % 60).padStart(2, "0")}m`;
  return (
    <View style={styles.row}>
      <Metric label="Frequência" value={`${attendanceRate}%`} foot="Últimos 30 dias" />
      <Metric label="Prática (semana)" value={practiceTime} foot="Tempo total" />
      <Metric label="XP" value={String(xp)} foot={`Nível ${level}`} />
    </View>
  );
}

function Metric({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}, ${foot}`} style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{foot}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md },
  metric: { flex: 1, minHeight: 104, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, justifyContent: "space-between", gap: space.sm, ...shadow },
  label: { ...type.caption, fontSize: 12 },
  value: { ...type.title, fontSize: 19 },
});
