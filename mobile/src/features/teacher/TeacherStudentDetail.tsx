import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DownloadButton } from "@/features/files/DownloadButton";
import { GoalCard } from "@/features/goals/GoalCard";
import { GoalForm } from "@/features/goals/GoalForm";
import { useToast } from "@/ui/Toast";
import { PracticeRecordingDownload } from "@/features/student/PracticeRecordingDownload";
import { useAuth } from "@/features/auth/useAuth";
import { useResource } from "@/hooks/use-resource";
import { addDays, formatFullDate, formatMinutes, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ListRow } from "@/ui/ListRow";
import { ScreenState } from "@/ui/ScreenState";
import { colors, radius, space, type } from "@/ui/theme";
import { AttendanceCalendar, attendanceSummary } from "./AttendanceCalendar";
import { hhmm, lessonStatusLabel } from "./agenda";
import { MaterialUpload } from "./MaterialUpload";
import { teacherService, type TeacherStudentMaterial } from "./teacherService";
import { TeacherStudentMetrics } from "./TeacherStudentMetrics";
import { TeacherStackHeader } from "./TeacherStackHeader";
import { TeacherStudentIdentity } from "./TeacherStudentIdentity";
import { StudentNoteEditor } from "./StudentNoteEditor";
import { TeacherStudentSections, type StudentSection } from "./TeacherStudentSections";

const RECENT_DAYS = 29;

type NoteKind = "sharedNotes" | "privateNotes";
const NOTES: Record<NoteKind, { title: string; hint: string }> = {
  sharedNotes: { title: "Observação para o aluno", hint: "O aluno vê esta observação." },
  privateNotes: { title: "Anotações do professor", hint: "Visível só para você." },
};

async function loadStudent(id: string) {
  const [detail, profile, enrollments, lessons, materials, practices] = await Promise.all([
    teacherService.student(id),
    teacherService.studentProfile(id),
    teacherService.enrollments(),
    teacherService.studentLessons(id),
    teacherService.studentMaterials(id),
    teacherService.studentPractices(id),
  ]);
  return {
    detail,
    name: profile.name,
    phone: profile.phone,
    sharedNotes: profile.sharedNotes,
    privateNotes: profile.privateNotes,
    instruments: [...new Set(enrollments.filter((item) => item.studentId === id).map((item) => item.instrument))],
    lessons,
    materials,
    practices,
  };
}

export default function TeacherStudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteKind | null>(null);
  const { user } = useAuth();
  const canManageGoals = user?.authorities.includes("goal.manage") || user?.authorities.includes("ROLE_ADMIN");
  const canUpdate = user?.authorities.includes("student.update");
  const [tab, setTab] = useState<StudentSection>("summary");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const resource = useResource(() => loadStudent(id), id ?? "");
  const { data, setData } = resource;
  const goals = useResource(() => canManageGoals ? teacherService.studentGoals(id) : Promise.resolve([]), id + ":" + !!canManageGoals);
  const refresh = async () => { await Promise.all([resource.refresh(), goals.refresh()]); };

  const recentRate = useMemo(() => {
    const cutoff = addDays(todayIso(), -RECENT_DAYS);
    const recent = data?.detail.attendanceHistory.filter((item) => item.date >= cutoff) ?? [];
    return recent.length ? Math.round((100 * recent.filter((item) => item.status === "PRESENT").length) / recent.length) : 0;
  }, [data]);
  const monthly = useMemo(() => attendanceSummary(data?.detail.attendanceHistory ?? [], month), [data, month]);

  const addMaterial = (material: TeacherStudentMaterial) =>
    setData((current) => current && { ...current, materials: [material, ...current.materials.filter((item) => item.id !== material.id)] });
  const saveNote = (kind: NoteKind, value: string) => {
    if (!data) return Promise.resolve();
    const notes = { sharedNotes: data.sharedNotes ?? "", privateNotes: data.privateNotes ?? "", [kind]: value };
    return teacherService.updateStudentProfile(id, { name: data.name, phone: data.phone, ...notes });
  };
  const noteSaved = (kind: NoteKind, value: string) => {
    setEditingNote(null);
    setData((current) => current && { ...current, [kind]: value });
    toast.show("Anotação salva", "success");
  };
  const newLesson = () => router.push({ pathname: "/teacher/new-lesson", params: { studentId: id } });

  const renderTab = () => {
    if (!data) return null;
    const { detail, lessons, materials, practices } = data;
    switch (tab) {
      case "summary":
        return (
          <>
            <TeacherStudentMetrics attendanceRate={recentRate} weeklyPracticeMin={detail.weeklyPracticeMin} xp={detail.progress?.xpTotal ?? 0} level={detail.progress?.level ?? 1} />
            <View style={styles.information}>
              {(Object.keys(NOTES) as NoteKind[]).map((kind) => (
                <Card key={kind} style={styles.info}>
                  <Text style={styles.infoLabel}>{NOTES[kind].title}</Text>
                  <Text style={styles.caption}>{NOTES[kind].hint}</Text>
                  <Text style={styles.infoText}>{data[kind] || "Nenhuma anotação"}</Text>
                  {canUpdate ? (
                    <Button label={data[kind] ? "Editar" : "Escrever"} variant="ghost" compact icon="create-outline" accessibilityLabel={`${data[kind] ? "Editar" : "Escrever"} ${NOTES[kind].title.toLowerCase()}`} onPress={() => setEditingNote(kind)} style={styles.noteAction} />
                  ) : null}
                </Card>
              ))}
              <Card style={styles.info}>
                <Text style={styles.infoLabel}>Data da matrícula</Text>
                <Text style={styles.infoText}>{formatFullDate(detail.enrollmentDate.slice(0, 10))}</Text>
              </Card>
            </View>
            {canManageGoals ? (
              <>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Metas</Text>
                {goals.data ? goals.data.length ? goals.data.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onEnd={(goalId) => teacherService.endGoal(id, goalId)} onEnded={() => void goals.reload()} />
                )) : <ScreenState icon="flag-outline" title="Nenhuma meta ativa" /> : goals.error ? (
                  <ScreenState message={apiErrorMessage(goals.error, "Não foi possível carregar as metas.")} retry={goals.reload} />
                ) : <ScreenState loading skeleton />}
                <Button label="Nova meta" variant="secondary" onPress={() => setCreatingGoal(true)} />
              </>
            ) : null}
          </>
        );
      case "lessons":
        return lessons.length ? (
          <View style={styles.lessons}>
            {lessons.map((lesson) => (
              <Card
                key={lesson.id}
                style={styles.lessonCard}
                accessibilityLabel={"Aula de " + formatFullDate(lesson.date) + " às " + hhmm(lesson.startTime) + ", " + lessonStatusLabel(lesson.status) + ". Abrir aula"}
                onPress={() => router.push({ pathname: "/teacher/lesson/[id]", params: { id: lesson.id } })}
              >
                <View style={styles.lessonDateRow}>
                  <Text style={styles.infoText}>{formatFullDate(lesson.date)} · {hhmm(lesson.startTime)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} accessible={false} />
                </View>
                <Text numberOfLines={1} style={styles.lessonTitle}>{lesson.content?.split("\n")[0] || lesson.instrument}</Text>
                <Text numberOfLines={1} style={styles.infoText}>{lesson.homework || "Sem tarefa para casa"}</Text>
                <Text style={styles.caption}>{lessonStatusLabel(lesson.status)}</Text>
              </Card>
            ))}
          </View>
        ) : <ScreenState icon="musical-notes-outline" title="Nenhuma aula registrada" />;
      case "attendance":
        return (
          <>
            <AttendanceCalendar month={month} onChangeMonth={setMonth} history={detail.attendanceHistory} />
            <Card style={styles.monthSummary}>
              <Text accessibilityRole="header" style={styles.infoLabel}>Resumo do mês</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{monthly.rate}%</Text><Text style={styles.caption}>Frequência</Text></View>
                <View style={styles.summaryCount}><Text style={styles.summaryValue}>{monthly.present}/{monthly.total}</Text><Text style={styles.caption}>Aulas com presença</Text></View>
              </View>
            </Card>
          </>
        );
      case "practice":
        return (
          <>
            <Card style={styles.info}>
              <Text style={styles.caption}>Prática nesta semana</Text>
              <Text style={styles.summaryValue}>{formatMinutes(detail.weeklyPracticeMin)}</Text>
            </Card>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Registros recentes</Text>
            {practices.length ? (
              <Card style={styles.listCard}>
                {practices.slice(0, 10).map((item) => (
                  <View key={item.id}>
                    <ListRow title={`${formatFullDate(item.date)} · ${formatMinutes(item.durationMin)}`} subtitle={item.notes || "Sem observações"} onPress={() => router.push({ pathname: "/teacher/practice/[id]", params: { id: item.id, practiceId: item.id, studentId: id } })} />
                    <PracticeRecordingDownload practice={item} download={teacherService.downloadPracticeRecording} prefix="Gravação: " />
                  </View>
                ))}
              </Card>
            ) : (
              <ScreenState icon="timer-outline" title="Nenhuma prática registrada" />
            )}
          </>
        );
      case "materials":
        return (
          <>
            {materials.length ? (
              <Card style={styles.listCard}>
                {materials.map((item) => (
                  <ListRow
                    key={item.id}
                    title={item.title}
                    subtitle={[item.description, `${item.fileName} · ${formatFullDate(item.createdAt.slice(0, 10))}`].filter(Boolean).join("\n")}
                    leading={<Ionicons name="document-text-outline" size={22} color={colors.primary} />}
                    trailing={
                      <DownloadButton
                        label="Baixar"
                        accessibilityLabel={`Baixar material ${item.title}`}
                        fileName={item.fileName}
                        contentType={item.contentType}
                        download={() => teacherService.downloadMaterial(item.id)}
                        failureMessage="Não foi possível baixar o material. Tente novamente."
                      />
                    }
                  />
                ))}
              </Card>
            ) : (
              <ScreenState icon="folder-open-outline" title="Nenhum material enviado" />
            )}
            <MaterialUpload studentId={id} onUploaded={addMaterial} />
          </>
        );
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <TeacherStackHeader />
      {resource.loading ? (
        <ScreenState loading skeleton />
      ) : resource.error || !data ? (
        <ScreenState message={apiErrorMessage(resource.error, "Não foi possível carregar o aluno.")} retry={() => void resource.reload()} />
      ) : (
        <>
          <View style={styles.profile}>
            <TeacherStudentIdentity name={data.name ?? "Aluno"} instrument={data.instruments.join(", ") || "Instrumento não informado"} />
          </View>
          <TeacherStudentSections value={tab} onChange={setTab} />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            refreshControl={<RefreshControl refreshing={resource.refreshing || goals.refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
          >
            {renderTab()}
          </ScrollView>
          {tab === "lessons" || (tab === "summary" && canUpdate) ? (
            <View style={styles.footer}>
              <Button label={tab === "summary" ? "Editar aluno" : "Nova aula"} onPress={tab === "summary" ? () => router.push({ pathname: "/teacher/student-form", params: { id } }) : newLesson} style={styles.newLesson} />
            </View>
          ) : null}
        </>
      )}
      {editingNote && data ? (
        <StudentNoteEditor
          title={NOTES[editingNote].title}
          hint={NOTES[editingNote].hint}
          initialValue={data[editingNote] ?? ""}
          onSubmit={(value) => saveNote(editingNote, value)}
          onClose={() => setEditingNote(null)}
          onSaved={(value) => noteSaved(editingNote, value)}
        />
      ) : null}
      {creatingGoal ? <GoalForm onSubmit={(body) => teacherService.createGoal(id, body)} onClose={() => setCreatingGoal(false)} onSaved={() => { setCreatingGoal(false); toast.show("Meta criada", "success"); void goals.reload(); }} /> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xl, gap: space.md, flexGrow: 1 },
  profile: { paddingHorizontal: space.xxxl + space.lg, paddingVertical: space.xxl },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl },
  newLesson: { minHeight: 48, borderRadius: radius.sm },
  information: { gap: space.xs, marginTop: space.xxl },
  lessons: { gap: 18 },
  lessonCard: { borderRadius: radius.sm, minHeight: 95, padding: 10, gap: space.sm },
  lessonDateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lessonTitle: { ...type.body, fontWeight: "700" },
  caption: { ...type.caption },
  info: { gap: space.xs, borderRadius: radius.sm, padding: 10, minHeight: 56 },
  noteAction: { alignSelf: "flex-start", paddingHorizontal: 0 },
  infoLabel: { ...type.label },
  infoText: { ...type.body },
  sectionTitle: { ...type.heading, marginTop: space.sm },
  listCard: { padding: 0, overflow: "hidden", borderRadius: radius.lg },
  monthSummary: { gap: space.sm, borderRadius: 0, padding: space.md },
  summaryRow: { flexDirection: "row", gap: space.lg, justifyContent: "space-between" },
  summaryItem: { gap: 2 },
  summaryCount: { gap: 2, alignItems: "flex-end" },
  summaryValue: { ...type.title },
});
