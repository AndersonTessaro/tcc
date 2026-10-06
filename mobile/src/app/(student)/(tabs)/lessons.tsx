import { useRef } from "react";
import { RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { byDateTime, lessonBadge } from "@/features/student/lessonStatus";
import { studentService, type StudentLesson } from "@/features/student/studentService";
import { useResource } from "@/hooks/use-resource";
import { formatLessonWhen } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { StatusChip } from "@/ui/StatusChip";
import { colors, space, type } from "@/ui/theme";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";

type LessonSection = { title: string; data: StudentLesson[] };

async function fetchLessonSections(): Promise<LessonSection[]> {
  const [upcoming, past] = await Promise.all([studentService.lessons("upcoming"), studentService.lessons("past")]);
  return [
    { title: "Próximas", data: [...upcoming].sort(byDateTime) },
    { title: "Anteriores", data: [...past].sort((a, b) => byDateTime(b, a)) },
  ].filter((section) => section.data.length > 0);
}

export default function Lessons() {
  const listRef = useRef<SectionList>(null);
  useTabScrollToTop(listRef);
  const router = useRouter();
  const lessons = useResource(fetchLessonSections);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Minhas aulas" />
      {lessons.data ? (
        <SectionList ref={listRef}
          sections={lessons.data}
          keyExtractor={(lesson) => lesson.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={lessons.refreshing} onRefresh={lessons.refresh} tintColor={colors.primary} />}
          renderSectionHeader={({ section }) => <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>}
          renderItem={({ item }) => <LessonRow lesson={item} onPress={() => router.push(`/(student)/lesson/${item.id}`)} />}
          ListEmptyComponent={
            <ScreenState
              icon="calendar-outline"
              title="Nenhuma aula por aqui"
              message="Quando seu professor agendar uma aula, ela aparece nesta lista."
            />
          }
        />
      ) : lessons.error ? (
        <ScreenState message={apiErrorMessage(lessons.error, "Não foi possível carregar suas aulas.")} retry={lessons.reload} />
      ) : (
        <ScreenState loading skeleton />
      )}
    </View>
  );
}

function LessonRow({ lesson, onPress }: { lesson: StudentLesson; onPress: () => void }) {
  const when = formatLessonWhen(lesson.date, lesson.startTime);
  const badge = lessonBadge(lesson);
  return (
    <Card onPress={onPress} accessibilityLabel={`${lesson.instrument}, ${when}, ${lesson.teacherName}, ${badge.label}`} accessibilityHint="Abre os detalhes da aula" style={styles.card}>
      <View style={styles.cardText}>
        <Text style={styles.when}>{when}</Text>
        <Text style={styles.instrument}>{lesson.instrument}</Text>
        <Text style={styles.teacher}>{lesson.teacherName}</Text>
        <StatusChip label={badge.label} tone={badge.tone} />
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  list: { flexGrow: 1, paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.md },
  sectionTitle: { ...type.heading, marginTop: space.md },
  card: { flexDirection: "row", alignItems: "center", gap: space.md },
  cardText: { flex: 1, gap: space.xs },
  when: { ...type.bodyStrong },
  instrument: { ...type.body },
  teacher: { ...type.caption, marginBottom: space.xs },
});
