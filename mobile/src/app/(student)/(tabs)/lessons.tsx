import { useRef } from "react";
import { RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { byDateTime, lessonBadge } from "@/features/student/lessonStatus";
import { studentService, type StudentLesson } from "@/features/student/studentService";
import { useResource } from "@/hooks/use-resource";
import { formatLessonWhen } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";
import { TabHeader } from "@/ui/TabHeader";
import { ScreenState } from "@/ui/ScreenState";
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
      <TabHeader title="Minhas aulas" />
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
  const statusIcon = badge.label === "Sem registro" ? "help-circle"
    : lesson.status === "DONE" ? "checkmark-circle"
    : lesson.status === "CANCELED" ? "close-circle" : "hourglass";
  const statusColor = badge.label === "Sem registro" ? colors.muted
    : lesson.status === "DONE" ? colors.success
    : lesson.status === "CANCELED" ? colors.danger : colors.primary;
  return (
    <Card onPress={onPress} accessibilityLabel={`${lesson.instrument}, ${when}, ${lesson.teacherName}, ${badge.label}`} accessibilityHint="Abre os detalhes da aula" style={styles.card}>
      <View style={styles.cardText}>
        <Text style={styles.when}>{when}</Text>
        <Text style={styles.instrument}>{lesson.instrument}</Text>
        <Text style={styles.teacher}>{lesson.teacherName}</Text>
      </View>
      <Ionicons name={statusIcon} size={24} color={statusColor} accessibilityLabel={badge.label} />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  list: { flexGrow: 1, paddingHorizontal: space.screenGutter, paddingBottom: space.xxl, gap: space.xxl },
  sectionTitle: { ...type.heading, marginTop: space.md },
  card: { minHeight: 116, flexDirection: "row", alignItems: "center", gap: space.md, padding: space.xl },
  cardText: { flex: 1, gap: space.xs },
  when: { ...type.body },
  instrument: { ...type.body, fontWeight: "700" },
  teacher: { ...type.caption, marginBottom: space.xs },
});
