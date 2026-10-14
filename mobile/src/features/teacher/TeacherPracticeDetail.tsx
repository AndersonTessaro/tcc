import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { PracticeRecordingDownload } from "@/features/student/PracticeRecordingDownload";
import { practiceMoods } from "@/features/student/practiceMood";
import { useResource } from "@/hooks/use-resource";
import { formatFullDate, formatMinutes } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";
import { ScreenState } from "@/ui/ScreenState";
import { colors, MIN_TOUCH, radius, space, type } from "@/ui/theme";
import { practiceDetails } from "./practiceNotes";
import { teacherService } from "./teacherService";
import { TeacherStackHeader } from "./TeacherStackHeader";
import { TeacherStudentIdentity } from "./TeacherStudentIdentity";

export default function TeacherPracticeDetail() {
  const { id, practiceId, studentId } = useLocalSearchParams<{ id: string; practiceId?: string; studentId?: string }>();
  const practices = useResource(async () => {
    if (!studentId || !(practiceId || id)) throw new Error("Prática inválida");
    return teacherService.studentPractices(studentId);
  }, studentId ?? "");
  const identity = useResource(async () => {
    if (!studentId) return null;
    const [students, enrollments] = await Promise.all([teacherService.students(), teacherService.enrollments()]);
    const studentEnrollments = enrollments.filter((item) => item.studentId === studentId);
    return {
      name: students.find((item) => item.id === studentId)?.name ?? studentEnrollments[0]?.studentName ?? "Aluno",
      instrument: [...new Set(studentEnrollments.map((item) => item.instrument))].join(", ") || "Instrumento não informado",
    };
  }, studentId ?? "");
  const practice = practices.data?.find((item) => item.id === (practiceId || id));
  const notes = practiceDetails(practice?.notes ?? null);

  return (
    <View style={styles.screen}>
      <TeacherStackHeader />
      {practices.loading ? <ScreenState loading skeleton /> : practices.error ? (
        <ScreenState message={apiErrorMessage(practices.error, "Não foi possível carregar a prática.")} retry={practices.reload} />
      ) : !practice ? <ScreenState title="Prática não encontrada" /> : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={practices.refreshing} onRefresh={() => { practices.refresh(); identity.refresh(); }} tintColor={colors.primary} />}
        >
          <View style={styles.identity}>
            {identity.loading ? <ScreenState loading /> : identity.error ? (
              <ScreenState message={apiErrorMessage(identity.error, "Não foi possível carregar os dados do aluno.")} retry={identity.reload} />
            ) : identity.data ? <TeacherStudentIdentity name={identity.data.name} instrument={identity.data.instrument} /> : null}
          </View>
          <ReadOnlyField label="Data" value={formatFullDate(practice.date)} />
          <ReadOnlyField label="Tempo de prática" value={formatMinutes(practice.durationMin)} />
          <ReadOnlyField label="O que praticou" value={notes.activity} />
          <ReadOnlyField label="Dificuldade encontrada" value={notes.difficulty} />
          <View style={styles.field}>
            <Text style={styles.label}>Anexos do aluno</Text>
            <Card style={styles.value}>
              {practice.recording ? <PracticeRecordingDownload practice={practice} download={teacherService.downloadPracticeRecording} /> : <Text style={styles.text}>Não informado</Text>}
            </Card>
          </View>
          <View style={styles.moodSection}>
            <Text accessibilityRole="header" style={styles.moodLabel}>Como foi a prática?</Text>
            <View style={styles.moods}>
              {practiceMoods.map((source, index) => (
                <View key={index} style={[styles.mood, notes.rating === index + 1 && styles.selectedMood]}>
                  <Image source={source} accessible accessibilityRole="image" accessibilityLabel={"Avaliação " + (index + 1) + " de 5" + (notes.rating === index + 1 ? ", selecionada" : "")} style={styles.moodIcon} />
                </View>
              ))}
            </View>
            {notes.rating === null ? <Text style={styles.text}>Não informado</Text> : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Card style={styles.value}><Text style={styles.text}>{value}</Text></Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.xl },
  identity: { paddingHorizontal: space.xxxl, paddingVertical: space.lg },
  field: { gap: space.sm },
  label: { ...type.label, fontWeight: "700" },
  value: { borderRadius: radius.sm, padding: 10, minHeight: 48, justifyContent: "center" },
  text: { ...type.body, fontSize: 14 },
  moodSection: { gap: space.sm, padding: space.lg },
  moodLabel: { ...type.heading, fontWeight: "500" },
  moods: { flexDirection: "row", justifyContent: "space-between" },
  mood: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  selectedMood: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  moodIcon: { width: 28, height: 28 },
});
