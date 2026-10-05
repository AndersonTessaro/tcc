import { StyleSheet, Text, View } from "react-native";

export function TeacherStudentMetrics({ attendanceRate, weeklyPracticeMin, xp, level }: { attendanceRate: number; weeklyPracticeMin: number; xp: number; level: number }) {
  const practiceTime = `${Math.floor(weeklyPracticeMin / 60)}h ${String(weeklyPracticeMin % 60).padStart(2, "0")}m`;
  return (
    <View style={styles.row}>
      <View style={styles.metric}><Text style={styles.label}>Frequência</Text><Text style={styles.value}>{attendanceRate}%</Text><Text style={styles.foot}>Últimos 30 dias</Text></View>
      <View style={styles.metric}><Text style={styles.label}>Prática (Semana)</Text><Text style={styles.value}>{practiceTime}</Text><Text style={styles.foot}>Tempo total</Text></View>
      <View style={styles.metric}><Text style={styles.label}>XP</Text><Text style={styles.value}>{xp}</Text><Text style={styles.foot}>Nível {level}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 14, marginBottom: 42 },
  metric: { flex: 1, minHeight: 115, backgroundColor: "#FFFFFF", borderRadius: 15, paddingHorizontal: 11, paddingVertical: 15, justifyContent: "space-between", gap: 8 },
  label: { color: "#111111", fontSize: 12 },
  value: { color: "#000000", fontSize: 19, fontWeight: "700" },
  foot: { color: "#222222", fontSize: 12 },
});
