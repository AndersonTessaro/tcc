import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/features/auth/useAuth";
import { studentService } from "@/features/student/studentService";
import { colors } from "@/ui/theme";

const fireIcon = require("@/assets/images/figma-student/dashboard-fire.png");
const agendaIcon = require("@/assets/images/figma-student/dashboard-agenda.png");
const notificationIcon = require("@/assets/images/figma-student/dashboard-notification.png");
const waveIcon = require("@/assets/images/figma-student/dashboard-wave.png");

type NextLesson = {
  id?: string;
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
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(() => {
    setHasError(false);
    setDashboard(null);
    studentService
      .dashboard()
      .then(setDashboard)
      .catch((cause) => {
        console.warn("dashboard failed", cause);
        setHasError(true);
      });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
        colors={["#2A1454", "#3B1E78", "#3B1E78", "#2A1454"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 31 }]}
      >
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <View style={styles.helloRow}>
              <Text style={styles.greeting}>Olá, {displayName(user?.displayName || user?.username)}!</Text>
              <Image source={waveIcon} style={styles.waveIcon} />
            </View>
            <Text style={styles.greetingSubtitle}>Continue praticando e evoluindo!</Text>
          </View>
          <Image accessibilityLabel="Notificações" source={notificationIcon} style={styles.notificationIcon} />
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
          <Image source={fireIcon} style={styles.cardIcon} />
          <View>
            <Text style={styles.cardTitle}>Sequência</Text>
            <Text style={styles.cardValue}>
              {dashboard.streakDays} {dashboard.streakDays === 1 ? "dia" : "dias"}
            </Text>
            <Text style={styles.detail}>Sequência atual</Text>
          </View>
        </View>

        <View style={[styles.card, styles.weeklyCard]}>
          <View style={styles.fullWidth}>
            <Text style={styles.cardTitle}>Prática semanal</Text>
            <Text style={styles.practiceValue}>
              {formatMinutes(dashboard.weeklyPracticeMin)}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(student)/goals")}><Text style={styles.detail}>Ver minhas metas</Text></Pressable>
          </View>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Ver próxima aula" disabled={!nextLesson?.id} onPress={() => router.push(`/(student)/lesson/${nextLesson?.id}`)} style={styles.card}>
          <Image source={agendaIcon} style={styles.cardIcon} />
          <View>
            <Text style={styles.cardTitle}>Próxima aula</Text>
            <Text style={styles.cardValue}>
              {nextLesson ? formatLessonSchedule(nextLesson) : "Nenhuma aula agendada"}
            </Text>
            {nextLesson?.instrument ? <Text style={styles.detail}>{nextLesson.instrument}</Text> : null}
          </View>
        </Pressable>
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
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  centered: { alignItems: "center", backgroundColor: colors.brand, flex: 1, gap: 16, justifyContent: "center", padding: 24 },
  errorText: { color: colors.surface, fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: colors.brand, fontSize: 15, fontWeight: "600" },
  header: { height: 195, paddingHorizontal: 24 },
  greetingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  greetingText: { flex: 1 },
  helloRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  greeting: { color: colors.surface, fontSize: 27, fontWeight: "500" },
  waveIcon: { width: 27, height: 27 },
  greetingSubtitle: { color: colors.surface, fontSize: 15, marginTop: 3 },
  notificationIcon: { width: 25, height: 25, marginTop: 4 },
  content: { paddingBottom: 18, paddingHorizontal: 31, marginTop: -44 },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 21,
    minHeight: 116,
    paddingHorizontal: 19,
    paddingVertical: 18,
  },
  xpCard: { alignItems: "stretch", flexDirection: "column", minHeight: 207, paddingHorizontal: 35, paddingTop: 21 },
  cardEyebrow: { color: "#000000", fontSize: 14, textAlign: "center" },
  xpValue: { color: "#000000", fontSize: 25, fontWeight: "700", marginTop: 14, textAlign: "center" },
  label: { color: "#000000", fontSize: 14, marginBottom: 8, marginTop: 26 },
  helpText: { color: "#000000", fontSize: 14, marginTop: 16, textAlign: "center" },
  cardIcon: { width: 30, height: 30, marginRight: 18 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  cardValue: { color: "#000000", fontSize: 18, fontWeight: "700", marginTop: 10 },
  detail: { color: "#000000", fontSize: 14, marginTop: 11 },
  fullWidth: { flex: 1 },
  weeklyCard: { minHeight: 112, paddingHorizontal: 24 },
  practiceValue: { color: "#6C45BE", fontSize: 16, fontWeight: "700", marginBottom: 15, marginTop: 13 },
  progressTrack: { backgroundColor: "#CCCCCC", borderRadius: 10, height: 12, overflow: "hidden", width: "100%" },
  progressFill: { backgroundColor: "#6C45BE", borderRadius: 10, height: "100%" },
});
