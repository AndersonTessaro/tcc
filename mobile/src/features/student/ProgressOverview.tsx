import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";
import { studentService, type StudentAttendance, type StudentPractice, type StudentProgress } from "./studentService";
import { colors } from "@/ui/theme";

const BAR_COLORS = ["#8043FF", "#763DEE", "#6A37D7", "#6333CA", "#5A2CBA", "#4A2399", "#402083"];

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function dateAtNoon(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function practiceSeries(practices: StudentPractice[]) {
  const byDate = new Map<string, number>();
  practices.forEach((item) => byDate.set(item.date, (byDate.get(item.date) ?? 0) + item.durationMin));
  const dates = Array.from({ length: 30 }, (_, index) => daysAgo(29 - index));
  return dates.map((_, index) => dates.slice(Math.max(0, index - 6), index + 1)
    .reduce((sum, date) => sum + (byDate.get(date) ?? 0), 0));
}

function attendanceWeeks(attendance: StudentAttendance[]) {
  const thisMonday = new Date();
  thisMonday.setHours(12, 0, 0, 0);
  thisMonday.setDate(thisMonday.getDate() - ((thisMonday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(thisMonday);
    start.setDate(thisMonday.getDate() - (6 - index) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const records = attendance.filter((item) => {
      const date = dateAtNoon(item.date);
      return date >= start && date < end;
    });
    return records.length ? records.filter((item) => item.status === "PRESENT").length / records.length : 0;
  });
}

function PracticeChart({ practices }: { practices: StudentPractice[] }) {
  const series = practiceSeries(practices);
  const maximum = Math.max(...series, 1);
  const points = series.map((value, index) => ({ x: 18 + index * 9.2, y: 130 - (value / maximum) * 112 }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const fill = `${line} L${points.at(-1)?.x ?? 18} 130 L18 130 Z`;
  return (
    <Svg width="100%" height={144} viewBox="0 0 310 144" accessibilityLabel="Gráfico de prática dos últimos 30 dias">
      <Path d={fill} fill="#F0F0F0" />
      <Path d={line} fill="none" stroke="#3A1D77" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Line x1={18} y1={5} x2={18} y2={137} stroke="#333333" strokeWidth={1} />
      <Line x1={18} y1={137} x2={304} y2={137} stroke="#333333" strokeWidth={1} />
      <SvgText x={0} y={8} fontSize={7} fill="#000000">Dias</SvgText>
      <SvgText x={280} y={143} fontSize={7} fill="#000000">Prática</SvgText>
    </Svg>
  );
}

export default function ProgressOverview() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [practices, setPractices] = useState<StudentPractice[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([studentService.progress(), studentService.practices(), studentService.attendance()])
      .then(([nextProgress, nextPractices, nextAttendance]) => {
        setProgress(nextProgress);
        setPractices(nextPractices);
        setAttendance(nextAttendance);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const recentPractice = practices.filter((item) => item.date >= daysAgo(29))
    .reduce((sum, item) => sum + item.durationMin, 0);
  const attendancePercent = attendance.length
    ? Math.round((attendance.filter((item) => item.status === "PRESENT").length / attendance.length) * 100) : 0;
  const xp = progress?.xpTotal ?? 0;
  const level = progress?.level ?? 1;
  const levelStart = (level - 1) ** 2 * 100;
  const levelEnd = level ** 2 * 100;
  const xpWidth = `${Math.min(100, Math.max(0, (100 * (xp - levelStart)) / Math.max(1, levelEnd - levelStart)))}%` as const;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <View style={[styles.header, { paddingTop: insets.top + 34 }]}>
        <Text style={styles.title}>Meu progresso</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.accent} style={styles.center} /> : error || !progress ? (
        <View style={styles.center}>
          <Text style={styles.message}>Não foi possível carregar seu progresso.</Text>
          <Pressable accessibilityRole="button" onPress={load} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, styles.practiceCard]}>
            <Text style={styles.cardTitle}>Tempo de prática (30 dias)</Text>
            <Text style={styles.practiceValue}>{formatMinutes(recentPractice)}</Text>
            <View style={styles.chart}><PracticeChart practices={practices} /></View>
          </View>

          <View style={[styles.card, styles.attendanceCard]}>
            <Text style={styles.cardTitle}>Frequência</Text>
            <Text style={styles.attendanceValue}>{attendancePercent}%</Text>
            <View style={styles.attendanceBars}>
              {attendanceWeeks(attendance).map((value, index) => (
                <View key={index} style={[styles.attendanceBar, {
                  height: value ? Math.max(18, Math.round(value * 81)) : 18,
                  backgroundColor: value ? BAR_COLORS[index] : "#CECED0",
                }]} />
              ))}
            </View>
          </View>

          <View style={[styles.card, styles.xpCard]}>
            <View style={styles.xpHeading}>
              <Text style={styles.cardTitle}>Evolução de XP</Text>
              <Text style={styles.level}>Nível {level}</Text>
            </View>
            <Text style={styles.xpValue}>{xp} XP</Text>
            <View style={styles.xpTrack}><View style={[styles.xpFill, { width: xpWidth }]} /></View>
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push("/(student)/goals")} style={styles.goalsButton}>
            <Text style={styles.goalsLabel}>Metas</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  header: { height: 131, paddingHorizontal: 29 },
  title: { color: "#000000", fontSize: 18, fontWeight: "700", textAlign: "center" },
  content: { flexGrow: 1, paddingHorizontal: 30, paddingBottom: 26 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#D3D3D3", borderWidth: 1, borderRadius: 15, paddingHorizontal: 18 },
  cardTitle: { color: "#000000", fontSize: 14, fontWeight: "700" },
  practiceCard: { minHeight: 209, paddingTop: 11 },
  practiceValue: { color: "#000000", fontSize: 20, fontWeight: "700", marginTop: 11 },
  chart: { marginTop: 3, marginHorizontal: -9 },
  attendanceCard: { minHeight: 163, marginTop: 26, paddingTop: 14 },
  attendanceValue: { color: "#000000", fontSize: 22, fontWeight: "700", marginTop: 11 },
  attendanceBars: { height: 81, marginTop: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 2 },
  attendanceBar: { width: 16, borderRadius: 5 },
  xpCard: { minHeight: 125, marginTop: 26, paddingTop: 18, paddingHorizontal: 16 },
  xpHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  level: { color: "#000000", fontSize: 14 },
  xpValue: { color: "#000000", fontSize: 18, fontWeight: "700", marginTop: 27 },
  xpTrack: { backgroundColor: "#CCCCCC", width: "90%", height: 12, borderRadius: 8, overflow: "hidden", marginTop: 8 },
  xpFill: { backgroundColor: "#6C45BE", height: 12, borderRadius: 8 },
  goalsButton: { height: 44, marginTop: "auto", marginHorizontal: 1, borderRadius: 15, backgroundColor: "#3A1D77", alignItems: "center", justifyContent: "center" },
  goalsLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  message: { color: colors.muted, fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: "#FFFFFF", fontWeight: "600" },
});
