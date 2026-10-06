import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { teacherService, type TeacherLesson } from "@/features/teacher/teacherService";
import { AgendaLessonCard } from "@/features/teacher/AgendaLessonCard";
import { WeekStrip } from "@/features/teacher/WeekStrip";
import { useLessonActions } from "@/features/teacher/useLessonActions";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";
import { validateDate } from "@/features/teacher/lessonForm";
import { useResource } from "@/hooks/use-resource";
import { formatFullDate, relativeDayLabel, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { IconButton } from "@/ui/IconButton";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { colors, space, type } from "@/ui/theme";

export default function Schedule() {
  const router = useRouter();
  const today = todayIso();
  const params = useLocalSearchParams<{ date?: string; at?: string }>();
  const paramDate = params.date && !validateDate(params.date) ? params.date : null;
  const [date, setDate] = useState(paramDate ?? today);
  const listRef = useRef<FlatList<TeacherLesson>>(null);
  useTabScrollToTop(listRef);

  useEffect(() => {
    if (paramDate) setDate(paramDate);
  }, [paramDate, params.at]);

  const lessons = useResource(() => teacherService.schedule(date), date);
  const { setData, reload } = lessons;

  const applyLesson = useCallback((lessonId: string, patch: Partial<TeacherLesson>) => {
    setData((current) => current?.map((lesson) => (lesson.id === lessonId ? { ...lesson, ...patch } : lesson)));
  }, [setData]);
  const onSuccess = useCallback(() => void reload(), [reload]);
  const { busy, errors, markAttendance, changeStatus } = useLessonActions({ applyLesson, onSuccess });

  const newLesson = () => router.push({ pathname: "/(teacher)/new-lesson", params: { date } });
  const replace = (lesson: TeacherLesson) =>
    router.push({ pathname: "/(teacher)/makeup/[lessonId]", params: { lessonId: lesson.id, studentName: lesson.studentName, instrument: lesson.instrument, originalDate: lesson.date } });

  const header = (
    <View style={styles.headerBlock}>
      <WeekStrip value={date} today={today} onChange={setDate} />
      <Text accessibilityRole="header" style={styles.dayTitle}>
        {relativeDayLabel(date)} · {formatFullDate(date)}
      </Text>
    </View>
  );

  const empty = lessons.loading ? (
    <ScreenState loading skeleton />
  ) : lessons.error ? (
    <ScreenState message={apiErrorMessage(lessons.error, "Erro ao carregar agenda")} retry={() => void reload()} />
  ) : (
    <ScreenState icon="calendar-clear-outline" title="Sem aulas neste dia" message="Escolha outro dia ou registre uma nova aula." action={{ label: "Nova aula", onPress: newLesson }} />
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Agenda" action={<IconButton icon="add" label="Nova aula" filled onPress={newLesson} />} />
      <FlatList
        ref={listRef}
        data={lessons.data ?? []}
        keyExtractor={(lesson) => lesson.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={lessons.refreshing} onRefresh={lessons.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <AgendaLessonCard
            lesson={item}
            today={today}
            busy={!!busy[item.id]}
            error={errors[item.id]}
            onMark={markAttendance}
            onChangeStatus={changeStatus}
            onReplace={replace}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md, flexGrow: 1 },
  headerBlock: { gap: space.md, marginBottom: space.xs },
  dayTitle: { ...type.heading },
});
