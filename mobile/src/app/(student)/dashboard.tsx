import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/useAuth";
import { studentService } from "@/features/student/studentService";
import { brandGradient, colors } from "@/ui/theme";

type NextLesson = {
  date?: string;
  startTime?: string;
  instrument?: string;
};

type DashboardData = {
  xp: number;
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  streakDays: number;
  weeklyPracticeMin: number;
  nextLesson: NextLesson | null;
};

const WEEKLY_GOAL_MINUTES = 480;

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes}m`;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function displayName(username?: string) {
  const firstName = username?.split(/[.@ _-]/)[0];
  return firstName ? `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}` : "Aluno";
}

function progressWidth(value: number, maximum: number) {
  const ratio = maximum > 0 ? value / maximum : 0;
  return `${Math.min(100, Math.max(0, ratio * 100))}%` as const;
}

function formatLessonSchedule(lesson: NextLesson) {
  const date = lesson.date ? lesson.date.split("-").reverse().slice(0, 2).join("/") : "A definir";
  const start = lesson.startTime?.slice(0, 5);
  return start ? `${date} - ${start}` : date;
}

export default function Dashboard() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(() => {
    setHasError(false);
    studentService
      .dashboard()
      .then(setDashboard)
      .catch((cause) => {
        console.warn("dashboard failed", cause);
        setHasError(true);
      });
  }, []);

  useEffect(load, [load]);

  if (!dashboard) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brand} />
        {hasError ? (
          <>
            <Text style={styles.errorText}>Não foi possível carregar seu painel.</Text>
            <Pressable accessibilityRole="button" onPress={load} style={styles.retry}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={colors.surface} />
        )}
      </View>
    );
  }

  const { nextLesson } = dashboard;
  const levelProgress = progressWidth(
    dashboard.xp - dashboard.levelStartXp,
    dashboard.nextLevelXp - dashboard.levelStartXp,
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand} />
      <LinearGradient
        colors={brandGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.greeting}>Olá, {displayName(user?.username)}! 👋</Text>
            <Text style={styles.greetingSubtitle}>Continue praticando e evoluindo!</Text>
          </View>
          <View accessibilityLabel="Notificações">
            <Ionicons name="notifications" size={26} color={colors.notification} />
            <View style={styles.badge} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, styles.xpCard]}>
          <Text style={styles.cardEyebrow}>XP Atual</Text>
          <Text style={styles.xpValue}>{dashboard.xp} XP</Text>
          <Text style={styles.label}>Nível {dashboard.level}</Text>
          <ProgressBar width={levelProgress} />
          <Text style={styles.helpText}>Próximo nível: {dashboard.nextLevelXp} XP</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="flame" size={30} color={colors.streak} style={styles.cardIcon} />
          <View>
            <Text style={styles.cardTitle}>Sequência</Text>
            <Text style={styles.cardValue}>
              {dashboard.streakDays} {dashboard.streakDays === 1 ? "dia" : "dias"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.fullWidth}>
            <Text style={styles.cardTitle}>Prática semanal</Text>
            <Text style={styles.practiceValue}>
              {formatMinutes(dashboard.weeklyPracticeMin)} / {formatMinutes(WEEKLY_GOAL_MINUTES)}
            </Text>
            <ProgressBar width={progressWidth(dashboard.weeklyPracticeMin, WEEKLY_GOAL_MINUTES)} />
          </View>
        </View>

        <View style={styles.card}>
          <Ionicons name="calendar-outline" size={28} color={colors.text} style={styles.cardIcon} />
          <View>
            <Text style={styles.cardTitle}>Próxima aula</Text>
            <Text style={styles.cardValue}>
              {nextLesson ? formatLessonSchedule(nextLesson) : "Nenhuma aula agendada"}
            </Text>
            {nextLesson?.instrument ? <Text style={styles.detail}>{nextLesson.instrument}</Text> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ProgressBar({ width }: { width: `${number}%` }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  centered: { alignItems: "center", backgroundColor: colors.brand, flex: 1, gap: 16, justifyContent: "center", padding: 24 },
  errorText: { color: colors.surface, fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: colors.brand, fontSize: 15, fontWeight: "600" },
  header: { paddingBottom: 56, paddingHorizontal: 24 },
  greetingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  greetingText: { flex: 1 },
  greeting: { color: colors.surface, fontSize: 24, fontWeight: "600" },
  greetingSubtitle: { color: colors.surface, fontSize: 14, marginTop: 6 },
  badge: {
    backgroundColor: colors.badge,
    borderColor: colors.brand,
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    position: "absolute",
    right: 0,
    top: 0,
    width: 10,
  },
  content: { paddingBottom: 24, paddingHorizontal: 24 },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 16,
    minHeight: 96,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  xpCard: { alignItems: "stretch", flexDirection: "column", marginTop: -40 },
  cardEyebrow: { color: colors.text, fontSize: 13, textAlign: "center" },
  xpValue: { color: colors.text, fontSize: 26, fontWeight: "700", marginTop: 8, textAlign: "center" },
  label: { color: colors.text, fontSize: 13, marginBottom: 8, marginTop: 20 },
  helpText: { color: colors.text, fontSize: 13, marginTop: 12, textAlign: "center" },
  cardIcon: { marginRight: 16 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  cardValue: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 8 },
  detail: { color: colors.text, fontSize: 13, marginTop: 6 },
  fullWidth: { flex: 1 },
  practiceValue: { color: colors.accent, fontSize: 17, fontWeight: "700", marginBottom: 12, marginTop: 8 },
  progressTrack: { backgroundColor: colors.track, borderRadius: 10, height: 10, overflow: "hidden", width: "100%" },
  progressFill: { backgroundColor: colors.accent, borderRadius: 10, height: "100%" },
});
