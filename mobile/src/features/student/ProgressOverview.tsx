import { useRef } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Svg, { Line, Path } from "react-native-svg";
import { useResource } from "@/hooks/use-resource";
import { addDays, formatMinutes, parseIsoDate, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ProgressBar } from "@/ui/ProgressBar";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { colors, radius, space, type } from "@/ui/theme";
import { fetchDashboard } from "./dashboard";
import { levelProgress, remainingXpLabel, type LevelBounds } from "./level";
import { studentService, type StudentAttendance, type StudentPractice, type StudentProgress } from "./studentService";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";

const WINDOW_DAYS = 30;
const ATTENDANCE_WEEKS = 7;
const ATTENDANCE_BAR_HEIGHT = 72;
const EMPTY_BAR_HEIGHT = 4;

type ProgressData = {
  progress: StudentProgress;
  practices: StudentPractice[];
  attendance: StudentAttendance[];
  bounds: LevelBounds | undefined;
};

async function optionalBounds(level: Promise<StudentProgress>): Promise<LevelBounds | undefined> {
  try {
    const [dashboard, progress] = await Promise.all([fetchDashboard(), level]);
    return dashboard.level === progress.level ? dashboard : undefined;
  } catch {
    return undefined;
  }
}

async function fetchProgress(): Promise<ProgressData> {
  const progressRequest = studentService.progress();
  const [progress, practices, attendance, bounds] = await Promise.all([
    progressRequest,
    studentService.practices(),
    studentService.attendance(),
    optionalBounds(progressRequest),
  ]);
  return { progress, practices, attendance, bounds };
}

function dailySeries(practices: StudentPractice[], today = todayIso()): number[] {
  const byDate = new Map<string, number>();
  practices.forEach((item) => byDate.set(item.date, (byDate.get(item.date) ?? 0) + item.durationMin));
  return Array.from({ length: WINDOW_DAYS }, (_, index) => byDate.get(addDays(today, index - (WINDOW_DAYS - 1))) ?? 0);
}

type WeekAttendance = { label: string; rate: number | null };

function attendanceWeeks(attendance: StudentAttendance[], today = todayIso()): WeekAttendance[] {
  const monday = addDays(today, -((parseIsoDate(today).getDay() + 6) % 7));
  return Array.from({ length: ATTENDANCE_WEEKS }, (_, index) => {
    const start = addDays(monday, -(ATTENDANCE_WEEKS - 1 - index) * 7);
    const end = addDays(start, 7);
    const records = attendance.filter((item) => item.date >= start && item.date < end);
    const [, month, day] = start.split("-");
    return {
      label: `${day}/${month}`,
      rate: records.length ? records.filter((item) => item.status === "PRESENT").length / records.length : null,
    };
  });
}

function PracticeChart({ series }: { series: number[] }) {
  const maximum = Math.max(...series, 1);
  const step = 286 / (series.length - 1);
  const points = series.map((value, index) => ({ x: 18 + index * step, y: 130 - (value / maximum) * 112 }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const fill = `${line} L${points.at(-1)?.x ?? 18} 130 L18 130 Z`;
  return (
    <Svg width="100%" height={144} viewBox="0 0 310 144" aria-hidden>
      <Path d={fill} fill={colors.primarySoft} />
      <Path d={line} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Line x1={18} y1={137} x2={304} y2={137} stroke={colors.borderStrong} strokeWidth={1} />
    </Svg>
  );
}

export default function ProgressOverview() {
  const listRef = useRef<ScrollView>(null);
  useTabScrollToTop(listRef);
  const router = useRouter();
  const resource = useResource(fetchProgress);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Meu progresso" />
      {resource.data ? (
        <ScrollView ref={listRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.refresh} tintColor={colors.primary} />}
        >
          <ProgressCards data={resource.data} />
          <Button label="Ver minhas metas" icon="flag-outline" variant="secondary" onPress={() => router.push("/(student)/goals")} />
        </ScrollView>
      ) : resource.error ? (
        <ScreenState message={apiErrorMessage(resource.error, "Não foi possível carregar seu progresso.")} retry={resource.reload} />
      ) : (
        <ScreenState loading skeleton />
      )}
    </View>
  );
}

function ProgressCards({ data }: { data: ProgressData }) {
  const { progress, practices, attendance, bounds } = data;
  const series = dailySeries(practices);
  const recentPractice = series.reduce((sum, minutes) => sum + minutes, 0);
  const practicedDays = series.filter((minutes) => minutes > 0).length;
  const level = levelProgress(progress.xpTotal, progress.level, bounds);
  const presences = attendance.filter((item) => item.status === "PRESENT").length;
  const attendancePercent = attendance.length ? `${Math.round((presences / attendance.length) * 100)}%` : "—";

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <Text accessibilityRole="header" style={styles.cardTitle}>Evolução de XP</Text>
          <Text style={styles.levelBadge}>Nível {progress.level}</Text>
        </View>
        <Text style={styles.value}>{progress.xpTotal} XP</Text>
        <ProgressBar value={level.earned} max={level.span} label={`Progresso para o nível ${level.nextLevel}`} />
        <Text style={styles.caption}>{remainingXpLabel(level)}</Text>
      </Card>

      <Card style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>Tempo de prática (30 dias)</Text>
        <Text style={styles.value}>{formatMinutes(recentPractice)}</Text>
        <View accessible accessibilityLabel={`Gráfico de prática: ${formatMinutes(recentPractice)} em ${practicedDays} dias nos últimos 30 dias`}>
          <PracticeChart series={series} />
          <View style={styles.axis}>
            <Text style={styles.caption}>30 dias atrás</Text>
            <Text style={styles.caption}>Hoje</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>Frequência nas aulas</Text>
        <Text style={styles.value}>{attendancePercent}</Text>
        {attendance.length ? (
          <Text style={styles.caption}>{presences} presenças em {attendance.length} aulas registradas</Text>
        ) : (
          <Text style={styles.caption}>Ainda não há presença registrada pelo professor.</Text>
        )}
        <AttendanceBars weeks={attendanceWeeks(attendance)} />
      </Card>
    </>
  );
}

function AttendanceBars({ weeks }: { weeks: WeekAttendance[] }) {
  return (
    <View style={styles.bars}>
      {weeks.map((week) => {
        const height = week.rate ? Math.max(8, Math.round(week.rate * ATTENDANCE_BAR_HEIGHT)) : EMPTY_BAR_HEIGHT;
        const description = week.rate == null ? "sem aulas" : `${Math.round(week.rate * 100)}% de presença`;
        return (
          <View key={week.label} accessible accessibilityLabel={`Semana de ${week.label}: ${description}`} style={styles.barColumn}>
            <View style={styles.barArea}>
              <View style={[styles.bar, { height }, week.rate ? styles.barFilled : styles.barEmpty]} />
            </View>
            <Text style={styles.barLabel}>{week.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { flexGrow: 1, gap: space.lg, paddingHorizontal: space.xl, paddingBottom: space.xxl },
  card: { gap: space.sm },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { ...type.label, color: colors.muted },
  levelBadge: { ...type.label, color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs, overflow: "hidden" },
  value: { ...type.display },
  caption: { ...type.caption },
  axis: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.sm },
  bars: { flexDirection: "row", justifyContent: "space-between", marginTop: space.sm },
  barColumn: { flex: 1, alignItems: "center" },
  barArea: { height: ATTENDANCE_BAR_HEIGHT, justifyContent: "flex-end" },
  bar: { width: 16, borderRadius: radius.sm },
  barFilled: { backgroundColor: colors.primary },
  barEmpty: { backgroundColor: colors.track },
  barLabel: { fontSize: 11, color: colors.muted, marginTop: space.xs },
});
