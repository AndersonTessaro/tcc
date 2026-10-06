import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { StatusChip } from "@/ui/StatusChip";
import { colors, space, type } from "@/ui/theme";
import { AttendanceControl } from "./AttendanceControl";
import { canRecordAttendance, hhmm, lessonActions, lessonStatusLabel, lessonStatusTone } from "./agenda";
import type { AttendanceStatus, LessonStatus, TeacherLesson } from "./teacherService";

type AgendaLessonCardProps = {
  lesson: TeacherLesson;
  today: string;
  busy: boolean;
  error?: string;
  onMark: (lesson: TeacherLesson, status: AttendanceStatus, justification?: string) => Promise<boolean>;
  onChangeStatus: (lesson: TeacherLesson, status: Exclude<LessonStatus, "SCHEDULED">) => Promise<boolean>;
  onReplace: (lesson: TeacherLesson) => void;
};

export function AgendaLessonCard({ lesson, today, busy, error, onMark, onChangeStatus, onReplace }: AgendaLessonCardProps) {
  const actions = lessonActions(lesson, today);
  const attendanceOpen = canRecordAttendance(lesson, today);

  return (
    <Card style={styles.card}>
      <View testID={`lesson-${lesson.id}`} style={styles.top}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{hhmm(lesson.startTime)}–{hhmm(lesson.endTime)} · {lesson.studentName}</Text>
          <Text style={styles.subtitle}>{lesson.instrument}</Text>
        </View>
        <StatusChip label={lessonStatusLabel(lesson.status)} tone={lessonStatusTone(lesson.status)} />
      </View>
      {lesson.content ? <Text style={styles.detail}>Conteúdo: {lesson.content}</Text> : null}
      {lesson.homework ? <Text style={styles.detail}>Tarefa: {lesson.homework}</Text> : null}
      {attendanceOpen ? (
        <AttendanceControl lesson={lesson} busy={busy} onMark={(status, justification) => onMark(lesson, status, justification)} />
      ) : (
        <Text style={styles.detail}>{lesson.status === "CANCELED" ? "Aula cancelada" : "Frequência disponível no dia da aula"}</Text>
      )}
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {actions.canComplete || actions.canCancel || actions.canReplace ? (
        <View style={styles.actions}>
          {actions.canComplete ? <Button label="Concluir" icon="checkmark" variant="secondary" compact disabled={busy} onPress={() => onChangeStatus(lesson, "DONE")} /> : null}
          {actions.canCancel ? <Button label="Cancelar aula" variant="danger" compact disabled={busy} onPress={() => onChangeStatus(lesson, "CANCELED")} /> : null}
          {actions.canReplace ? <Button label="Repor" icon="repeat" variant="secondary" compact disabled={busy} onPress={() => onReplace(lesson)} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  top: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  titleBlock: { flex: 1, gap: 2 },
  title: { ...type.bodyStrong },
  subtitle: { ...type.caption },
  detail: { ...type.body, color: colors.muted },
  error: { color: colors.danger, fontSize: 14 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
