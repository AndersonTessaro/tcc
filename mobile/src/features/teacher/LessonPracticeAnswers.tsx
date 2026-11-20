import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useResource } from "@/hooks/use-resource";
import { formatFullDate, formatMinutes } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { ListRow } from "@/ui/ListRow";
import { space, type } from "@/ui/theme";
import { teacherService, type TeacherLesson } from "./teacherService";

export function LessonPracticeAnswers({ lesson }: { lesson: TeacherLesson }) {
  const router = useRouter();
  const fetchPractices = useCallback(() => teacherService.studentPractices(lesson.studentId), [lesson.studentId]);
  const practices = useResource(fetchPractices, lesson.studentId);
  const answers = (practices.data ?? []).filter((practice) => practice.lessonId === lesson.id);

  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={styles.title}>Respostas do aluno</Text>
      {practices.error ? (
        <Text style={styles.caption}>{apiErrorMessage(practices.error, "Não foi possível carregar as práticas.")}</Text>
      ) : practices.loading ? (
        <Text style={styles.caption}>Carregando…</Text>
      ) : answers.length ? (
        answers.map((practice) => (
          <ListRow key={practice.id} title={practice.notes || "Sem observações"}
            subtitle={`${formatFullDate(practice.date)} · ${formatMinutes(practice.durationMin)}${practice.recording ? " · com gravação" : ""}`}
            onPress={() => router.push({ pathname: "/teacher/practice/[id]",
              params: { id: practice.id, practiceId: practice.id, studentId: lesson.studentId } })} />
        ))
      ) : (
        <Text style={styles.caption}>O aluno ainda não respondeu a prática desta aula.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  title: { ...type.heading, marginTop: space.md },
  caption: { ...type.caption },
});
