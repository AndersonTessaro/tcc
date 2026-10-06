import { useRef } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/features/auth/useAuth";
import { fetchDashboard, firstName, type StudentDashboard } from "@/features/student/dashboard";
import { levelProgress, remainingXpLabel } from "@/features/student/level";
import { dayCount } from "@/features/student/reward";
import { useResource } from "@/hooks/use-resource";
import { formatLessonWhen, formatMinutes } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ProgressBar } from "@/ui/ProgressBar";
import { ScreenState } from "@/ui/ScreenState";
import { Skeleton } from "@/ui/Skeleton";
import { brandGradient, colors, radius, space, type } from "@/ui/theme";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";

const fireIcon = require("@/assets/images/figma-student/dashboard-fire.png");
const agendaIcon = require("@/assets/images/figma-student/dashboard-agenda.png");
const waveIcon = require("@/assets/images/figma-student/dashboard-wave.png");

export default function Dashboard() {
  const listRef = useRef<ScrollView>(null);
  useTabScrollToTop(listRef);
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const dashboard = useResource(fetchDashboard);

  const content = dashboard.data ? (
    <DashboardCards data={dashboard.data} onNavigate={(href) => router.push(href)} />
  ) : dashboard.error ? (
    <ScreenState message={apiErrorMessage(dashboard.error, "Não foi possível carregar seu painel.")} retry={dashboard.reload} />
  ) : (
    <DashboardSkeleton />
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.hero, { paddingTop: insets.top + space.xxl }]}>
        <View style={styles.helloRow}>
          <Text accessibilityRole="header" style={styles.greeting}>Olá, {firstName(user?.displayName || user?.username)}!</Text>
          <Image source={waveIcon} style={styles.waveIcon} accessible={false} />
        </View>
        <Text style={styles.greetingSubtitle}>Continue praticando e evoluindo!</Text>
      </LinearGradient>
      <ScrollView ref={listRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={dashboard.refreshing} onRefresh={dashboard.refresh} tintColor={colors.primary} />}
      >
        {content}
      </ScrollView>
    </View>
  );
}

type Href = "/(student)/practice/register" | "/(student)/goals" | `/(student)/lesson/${string}`;

function DashboardCards({ data, onNavigate }: { data: StudentDashboard; onNavigate: (href: Href) => void }) {
  const progress = levelProgress(data.xp, data.level, data);
  const nextLesson = data.nextLesson;
  const nextLessonWhen = nextLesson?.date ? formatLessonWhen(nextLesson.date, nextLesson.startTime) : null;
  const weekly = formatMinutes(data.weeklyPracticeMin);

  return (
    <>
      <Card style={styles.xpCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.eyebrow}>XP atual</Text>
          <Text style={styles.levelBadge}>Nível {data.level}</Text>
        </View>
        <Text style={styles.xpValue}>{data.xp} XP</Text>
        <ProgressBar value={progress.earned} max={progress.span} label={`Progresso para o nível ${progress.nextLevel}`} />
        <Text style={styles.caption}>{remainingXpLabel(progress)}</Text>
      </Card>

      <Button label="Registrar prática" icon="add-circle-outline" onPress={() => onNavigate("/(student)/practice/register")} />

      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Image source={fireIcon} style={styles.cardIcon} accessible={false} />
          <Text style={styles.cardTitle}>Sequência</Text>
          <Text style={styles.statValue}>{dayCount(data.streakDays)}</Text>
        </Card>
        <Card
          style={styles.statCard}
          onPress={() => onNavigate("/(student)/goals")}
          accessibilityLabel={`Prática semanal: ${weekly}. Ver minhas metas`}
        >
          <Ionicons name="musical-notes-outline" size={28} color={colors.primary} />
          <Text style={styles.cardTitle}>Prática semanal</Text>
          <Text style={styles.statValue}>{weekly}</Text>
          <Text style={styles.link}>Ver minhas metas</Text>
        </Card>
      </View>

      {nextLesson?.id && nextLessonWhen ? (
        <Card
          style={styles.lessonCard}
          onPress={() => onNavigate(`/(student)/lesson/${nextLesson.id}`)}
          accessibilityLabel={`Próxima aula: ${nextLesson.instrument ?? ""}, ${nextLessonWhen}`}
          accessibilityHint="Abre os detalhes da aula"
        >
          <Image source={agendaIcon} style={styles.cardIcon} accessible={false} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Próxima aula</Text>
            <Text style={styles.lessonWhen}>{nextLessonWhen}</Text>
            {nextLesson.instrument ? <Text style={styles.caption}>{nextLesson.instrument}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
        </Card>
      ) : (
        <Card style={styles.lessonCard}>
          <Image source={agendaIcon} style={styles.cardIcon} accessible={false} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Próxima aula</Text>
            <Text style={styles.caption}>Nenhuma aula agendada</Text>
          </View>
        </Card>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <View accessible accessibilityLabel="Carregando" style={styles.skeleton}>
      <Card style={styles.xpCard}><Skeleton width="40%" /><Skeleton width="60%" height={28} /><Skeleton height={10} /></Card>
      <Skeleton height={48} rounded={radius.md} />
      <View style={styles.statRow}>
        <Card style={styles.statCard}><Skeleton width="70%" /><Skeleton width="50%" height={22} /></Card>
        <Card style={styles.statCard}><Skeleton width="70%" /><Skeleton width="50%" height={22} /></Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  hero: { paddingHorizontal: space.xxl, paddingBottom: 64 },
  helloRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  greeting: { color: colors.onBrand, fontSize: 26, fontWeight: "600", flexShrink: 1 },
  waveIcon: { width: 26, height: 26 },
  greetingSubtitle: { color: colors.onBrandMuted, fontSize: 15, marginTop: space.xs },
  content: { flexGrow: 1, gap: space.lg, paddingHorizontal: space.xl, paddingBottom: space.xxl, marginTop: -44 },
  skeleton: { gap: space.lg },
  xpCard: { gap: space.sm },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { ...type.label, color: colors.muted },
  levelBadge: { ...type.label, color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs, overflow: "hidden" },
  xpValue: { ...type.display },
  caption: { ...type.caption },
  statRow: { flexDirection: "row", gap: space.lg },
  statCard: { flex: 1, gap: space.xs },
  cardIcon: { width: 28, height: 28 },
  cardTitle: { ...type.label },
  statValue: { ...type.title },
  link: { color: colors.link, fontSize: 13, fontWeight: "600", marginTop: space.xs },
  lessonCard: { flexDirection: "row", alignItems: "center", gap: space.lg },
  lessonWhen: { ...type.heading, marginTop: 2 },
  flex: { flex: 1, gap: 2 },
});
