import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useResource } from "@/hooks/use-resource";
import { addDays, formatFullDate, formatMinutes, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ChipGroup } from "@/ui/Chip";
import { ListRow } from "@/ui/ListRow";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { colors, radius, space, type } from "@/ui/theme";
import { AttendanceCalendar, attendanceSummary } from "./AttendanceCalendar";
import { hhmm, lessonStatusLabel, scheduleHref } from "./agenda";
import { MaterialUpload } from "./MaterialUpload";
import { teacherService, type TeacherStudentMaterial } from "./teacherService";
import { TeacherStudentMetrics } from "./TeacherStudentMetrics";

type Tab = "summary" | "lessons" | "attendance" | "practice" | "materials";

const TABS: { value: Tab; label: string }[] = [
  { value: "summary", label: "Resumo" },
  { value: "lessons", label: "Aulas" },
  { value: "attendance", label: "Frequência" },
  { value: "practice", label: "Prática" },
  { value: "materials", label: "Materiais" },
];

const RECENT_DAYS = 29;

async function loadStudent(id: string) {
  const [detail, students, enrollments, lessons, materials] = await Promise.all([
    teacherService.student(id),
    teacherService.students(),
    teacherService.enrollments(),
    teacherService.studentLessons(id),
    teacherService.studentMaterials(id),
  ]);
  return {
    detail,
    name: students.find((item) => item.id === id)?.name ?? null,
    instruments: [...new Set(enrollments.filter((item) => item.studentId === id).map((item) => item.instrument))],
    lessons,
    materials,
  };
}

export default function TeacherStudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("summary");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const resource = useResource(() => loadStudent(id), id ?? "");
  const { data, setData } = resource;

  const recentRate = useMemo(() => {
    const cutoff = addDays(todayIso(), -RECENT_DAYS);
    const recent = data?.detail.attendanceHistory.filter((item) => item.date >= cutoff) ?? [];
    return recent.length ? Math.round((100 * recent.filter((item) => item.status === "PRESENT").length) / recent.length) : 0;
  }, [data]);
  const monthly = useMemo(() => attendanceSummary(data?.detail.attendanceHistory ?? [], month), [data, month]);

  const addMaterial = (material: TeacherStudentMaterial) =>
    setData((current) => current && { ...current, materials: [material, ...current.materials.filter((item) => item.id !== material.id)] });
  const newLesson = () => router.push({ pathname: "/(teacher)/new-lesson", params: { studentId: id } });

  const renderTab = () => {
    if (!data) return null;
    const { detail, lessons, materials } = data;
    switch (tab) {
      case "summary":
        return (
          <>
            <TeacherStudentMetrics attendanceRate={recentRate} weeklyPracticeMin={detail.weeklyPracticeMin} xp={detail.progress?.xpTotal ?? 0} level={detail.progress?.level ?? 1} />
            <Card style={styles.info}>
              <Text style={styles.infoLabel}>Próxima meta</Text>
              <Text style={styles.infoText}>{detail.nextGoal || "Nenhuma meta ativa"}</Text>
            </Card>
            <Card style={styles.info}>
              <Text style={styles.infoLabel}>Data da matrícula</Text>
              <Text style={styles.infoText}>{formatFullDate(detail.enrollmentDate.slice(0, 10))}</Text>
            </Card>
            <Button label="Nova aula" icon="add" onPress={newLesson} />
          </>
        );
      case "lessons":
        return (
          <>
            <Button label="Nova aula" icon="add" onPress={newLesson} />
            {lessons.length ? (
              <Card style={styles.listCard}>
                {lessons.map((lesson) => (
                  <ListRow
                    key={lesson.id}
                    title={`${formatFullDate(lesson.date)} · ${hhmm(lesson.startTime)}`}
                    subtitle={[lesson.content || lesson.instrument, lesson.homework ? `Tarefa: ${lesson.homework}` : null, lessonStatusLabel(lesson.status)].filter(Boolean).join(" · ")}
                    accessibilityLabel={`Aula de ${formatFullDate(lesson.date)} às ${hhmm(lesson.startTime)}, ${lessonStatusLabel(lesson.status)}. Abrir na agenda`}
                    onPress={() => router.push(scheduleHref(lesson.date))}
                  />
                ))}
              </Card>
            ) : (
              <ScreenState icon="musical-notes-outline" title="Nenhuma aula registrada" />
            )}
          </>
        );
      case "attendance":
        return (
          <>
            <AttendanceCalendar month={month} onChangeMonth={setMonth} history={detail.attendanceHistory} />
            <Card style={styles.monthSummary}>
              <Text accessibilityRole="header" style={styles.infoLabel}>Resumo do mês</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{monthly.rate}%</Text><Text style={styles.caption}>Frequência</Text></View>
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{monthly.present}/{monthly.total}</Text><Text style={styles.caption}>Aulas com presença</Text></View>
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
            {detail.recentPractices.length ? (
              <Card style={styles.listCard}>
                {detail.recentPractices.map((item, index) => (
                  <ListRow key={`${item.date}-${index}`} title={`${formatFullDate(item.date)} · ${formatMinutes(item.durationMin)}`} subtitle={item.notes || "Sem observações"} />
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
      <ScreenHeader title="Aluno" back />
      {resource.loading ? (
        <ScreenState loading skeleton />
      ) : resource.error || !data ? (
        <ScreenState message={apiErrorMessage(resource.error, "Não foi possível carregar o aluno.")} retry={() => void resource.reload()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          <View style={styles.profile}>
            <Ionicons name="person-circle" size={64} color={colors.primary} accessible={false} />
            <View style={styles.profileText}>
              <Text accessibilityRole="header" style={styles.name}>{data.name ?? "Aluno"}</Text>
              <Text style={styles.caption}>{data.instruments.join(", ") || "Instrumento não informado"}</Text>
            </View>
          </View>
          <ChipGroup label="Seções do aluno" role="tab" options={TABS} value={tab} onChange={setTab} scroll />
          {renderTab()}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md, flexGrow: 1 },
  profile: { flexDirection: "row", alignItems: "center", gap: space.lg },
  profileText: { flex: 1, gap: space.xs },
  name: { ...type.title },
  caption: { ...type.caption },
  info: { gap: space.xs },
  infoLabel: { ...type.label },
  infoText: { ...type.body },
  sectionTitle: { ...type.heading, marginTop: space.sm },
  listCard: { padding: 0, overflow: "hidden", borderRadius: radius.lg },
  monthSummary: { gap: space.sm },
  summaryRow: { flexDirection: "row", gap: space.lg },
  summaryItem: { flex: 1, gap: 2 },
  summaryValue: { ...type.title },
});
