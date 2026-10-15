import { Text } from "react-native";
import { useRouter } from "expo-router";
import { teacherService } from "@/features/teacher/teacherService";
import { MoreScreen, moreStyles as styles } from "@/features/teacher/more/MoreScreen";
import { useResource } from "@/hooks/use-resource";
import { Card } from "@/ui/Card";
import { ListRow } from "@/ui/ListRow";
import { ScreenState } from "@/ui/ScreenState";

export default function Classes() {
  const router = useRouter();
  const enrollments = useResource(teacherService.enrollments);
  const groups = new Map<string, Map<string, string>>();
  for (const enrollment of enrollments.data ?? []) {
    const name = enrollment.classLabel;
    if (!groups.has(name)) groups.set(name, new Map());
    groups.get(name)!.set(enrollment.studentId, enrollment.studentName);
  }
  return (
    <MoreScreen title="Turmas" resource={enrollments}>
      {[...groups].sort(([a], [b]) => a.localeCompare(b, "pt-BR")).map(([name, students]) => (
        <Card key={name} style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>{name}</Text>
          <Text style={styles.caption}>{students.size} {students.size === 1 ? "aluno" : "alunos"}</Text>
          {[...students].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([id, studentName]) => (
            <ListRow key={id} title={studentName} accessibilityLabel={studentName} onPress={() => router.push(`/(teacher)/student/${id}`)} />
          ))}
        </Card>
      ))}
      {enrollments.data?.length === 0 ? <ScreenState icon="people-outline" title="Nenhuma turma ativa" /> : null}
    </MoreScreen>
  );
}
