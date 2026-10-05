import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { teacherService, type StudentSummary, type TeacherEnrollment, type TeacherLesson, type TeacherStudentDetailData, type TeacherStudentMaterial } from "./teacherService";
import { TeacherStudentMetrics } from "./TeacherStudentMetrics";

type Tab = "Resumo" | "Aulas" | "Frequência" | "Prática" | "Materiais";
const tabs: Tab[] = ["Resumo", "Aulas", "Frequência", "Prática", "Materiais"];
const userIcon = require("@/assets/images/figma-teacher/user.png");
const backIcon = require("@/assets/images/figma-student/back.png");
const purple = "#6C45BE";

function shortDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function duration(value: number) {
  return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
}

export default function TeacherStudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("Resumo");
  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [enrollments, setEnrollments] = useState<TeacherEnrollment[]>([]);
  const [detail, setDetail] = useState<TeacherStudentDetailData | null>(null);
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [materials, setMaterials] = useState<TeacherStudentMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string; file?: Blob } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const uploadPending = useRef(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    Promise.all([
      teacherService.student(id), teacherService.students(), teacherService.enrollments(),
      teacherService.studentLessons(id), teacherService.studentMaterials(id),
    ]).then(([nextDetail, students, nextEnrollments, nextLessons, nextMaterials]) => {
      setDetail(nextDetail);
      setStudent(students.find((item) => item.id === id) ?? null);
      setEnrollments(nextEnrollments.filter((item) => item.studentId === id));
      setLessons(nextLessons);
      setMaterials(nextMaterials);
    }).catch((cause) => setError(apiErrorMessage(cause, "Não foi possível carregar o aluno.")))
      .finally(() => setLoading(false));
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const instrument = useMemo(() => [...new Set(enrollments.map((item) => item.instrument))].join(", "), [enrollments]);
  const attendanceByDate = useMemo(() => {
    const values = new Map<string, string>();
    detail?.attendanceHistory.forEach((item) => values.set(item.date, item.status));
    return values;
  }, [detail]);
  const recentAttendanceRate = useMemo(() => {
    if (!detail) return 0;
    const since = new Date();
    since.setDate(since.getDate() - 29);
    const cutoff = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;
    const recent = detail.attendanceHistory.filter((item) => item.date >= cutoff);
    return recent.length ? Math.round(100 * recent.filter((item) => item.status === "PRESENT").length / recent.length) : 0;
  }, [detail]);
  const monthlyAttendance = useMemo(() => {
    const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const history = detail?.attendanceHistory.filter((item) => item.date.startsWith(prefix)) ?? [];
    const present = history.filter((item) => item.status === "PRESENT").length;
    return { present, total: history.length, rate: history.length ? Math.round(100 * present / history.length) : 0 };
  }, [detail, month]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const chosen = result.assets[0];
        setFile({ uri: chosen.uri, name: chosen.name, mimeType: chosen.mimeType, file: chosen.file });
      }
    } catch { setUploadMessage("Não foi possível abrir o seletor de arquivos."); }
  };
  const upload = async () => {
    if (uploadPending.current) return;
    if (!id || !file || !title.trim()) { setUploadMessage("Informe o título e escolha um arquivo."); return; }
    setUploading(true);
    uploadPending.current = true;
    setUploadMessage("");
    try {
      await teacherService.uploadMaterial(id, file, title.trim(), description.trim() || undefined);
      setMaterials(await teacherService.studentMaterials(id));
      setTitle(""); setDescription(""); setFile(null);
      setUploadMessage("Material enviado.");
    } catch (cause) {
      setUploadMessage(apiErrorMessage(cause, "Não foi possível enviar o material."));
    } finally { uploadPending.current = false; setUploading(false); }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <View style={[styles.header, { height: 251 + Math.max(0, insets.top - 44), paddingTop: insets.top + 26 }]}>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={10} onPress={() => router.back()}><Image source={backIcon} style={styles.backIcon} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Mais opções" onPress={() => Alert.alert("Aluno", "O cadastro do aluno é gerenciado pela administração.")}><Ionicons name="ellipsis-horizontal" size={27} color="#111111" /></Pressable>
        </View>
        <View style={styles.profile}>
          <Image source={userIcon} style={styles.avatar} />
          <View style={styles.profileText}>
            <Text numberOfLines={1} style={styles.name}>{student?.name ?? "Aluno"}</Text>
            <Text numberOfLines={1} style={styles.instrument}>{instrument || "Instrumento não informado"}</Text>
          </View>
        </View>
      </View>
      <View style={styles.tabs}>
        {tabs.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}><Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item}</Text></Pressable>)}
      </View>
      {loading ? <ActivityIndicator style={styles.center} color={purple} /> : error || !detail ? (
        <View style={styles.center}><Text style={styles.error}>{error || "Aluno não encontrado."}</Text><Pressable accessibilityRole="button" onPress={load} style={styles.primaryButton}><Text style={styles.primaryText}>Tentar novamente</Text></Pressable></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, tab !== "Resumo" && styles.tabContent, tab === "Frequência" && styles.attendanceContent]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {tab === "Resumo" && <>
            <TeacherStudentMetrics attendanceRate={recentAttendanceRate} weeklyPracticeMin={detail.weeklyPracticeMin} xp={detail.progress?.xpTotal ?? 0} level={detail.progress?.level ?? 1} />
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.infoBox}><Text style={styles.infoText}>Observações pessoais ainda indisponíveis.</Text></View>
            <View style={styles.infoBox}><Text style={styles.infoLabel}>Próxima meta</Text><Text style={styles.infoText}>{detail.nextGoal || "Nenhuma meta ativa"}</Text></View>
            <View style={styles.infoBox}><Text style={styles.infoLabel}>Data da matrícula</Text><Text style={styles.infoText}>{shortDate(detail.enrollmentDate)}</Text></View>
            <Pressable accessibilityRole="button" onPress={() => Alert.alert("Editar aluno", "O cadastro do aluno é gerenciado pela administração.")} style={[styles.primaryButton, styles.summaryAction]}><Text style={styles.primaryText}>Editar aluno</Text></Pressable>
          </>}
          {tab === "Aulas" && <>
            {lessons.length ? lessons.map((lesson) => <Pressable key={lesson.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/(teacher)/schedule", params: { date: lesson.date } })} style={styles.lessonCard}>
              <View style={styles.lessonTop}><Text style={styles.lessonDate}>{shortDate(lesson.date)}</Text><Text style={styles.lessonTime}>{lesson.startTime.slice(0, 5)}</Text></View>
              <Text numberOfLines={1} style={styles.lessonContent}>{lesson.content || lesson.instrument}</Text>
              <Text numberOfLines={1} style={styles.lessonSub}>{lesson.homework ? `Tarefa: ${lesson.homework}` : lesson.status === "CANCELED" ? "Aula cancelada" : "Sem tarefa registrada"}</Text>
              <Text style={styles.lessonSub}>{lesson.status === "DONE" ? "Concluída" : lesson.status === "CANCELED" ? "Cancelada" : "Agendada"} · Abrir na agenda</Text>
            </Pressable>) : <Text style={styles.empty}>Nenhuma aula registrada para este aluno.</Text>}
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/(teacher)/new-lesson", params: { studentId: id } })} style={[styles.primaryButton, styles.bottomAction]}><Text style={styles.primaryText}>Nova aula</Text></Pressable>
          </>}
          {tab === "Frequência" && <>
            <AttendanceCalendar month={month} onChangeMonth={setMonth} statuses={attendanceByDate} />
            <View style={styles.legend}><Legend color="#238B19" label="Presente" /><Legend color="#FF1D25" label="Falta" /><Legend color="#FFE21D" label="Falta Justificada" /></View>
            <View style={styles.monthSummary}>
              <Text style={styles.monthSummaryLabel}>Resumo do mês</Text>
              <View style={styles.monthSummaryRow}>
                <View><Text style={styles.monthSummaryValue}>{monthlyAttendance.rate}%</Text><Text style={styles.monthSummaryLabel}>Frequência</Text></View>
                <View><Text style={styles.monthSummaryValue}>{monthlyAttendance.present}/{monthlyAttendance.total}</Text><Text style={styles.monthSummaryLabel}>Aulas</Text></View>
              </View>
            </View>
          </>}
          {tab === "Prática" && <>
            <View style={styles.practiceTotal}><Text style={styles.metricLabel}>Prática nesta semana</Text><Text style={styles.metricValue}>{duration(detail.weeklyPracticeMin)}</Text></View>
            <Text style={styles.sectionTitle}>Registros recentes</Text>
            {detail.recentPractices.length ? detail.recentPractices.map((item, index) => <View key={`${item.date}-${index}`} style={styles.lessonCard}><Text style={styles.lessonDate}>{shortDate(item.date)} · {duration(item.durationMin)}</Text><Text style={styles.lessonSub}>{item.notes || "Sem observações"}</Text></View>) : <Text style={styles.empty}>Nenhuma prática registrada.</Text>}
          </>}
          {tab === "Materiais" && <>
            {materials.length ? materials.map((item) => <View key={item.id} style={styles.lessonCard}><Text style={styles.lessonDate}>{item.title}</Text>{item.description ? <Text style={styles.lessonSub}>{item.description}</Text> : null}<Text style={styles.lessonSub}>{item.fileName} · {shortDate(item.createdAt)}</Text></View>) : <Text style={styles.empty}>Nenhum material enviado.</Text>}
            <Text style={styles.sectionTitle}>Enviar material</Text>
            <TextInput accessibilityLabel="Título do material" value={title} onChangeText={setTitle} maxLength={255} editable={!uploading} placeholder="Título" placeholderTextColor="#888888" style={styles.input} />
            <TextInput accessibilityLabel="Descrição do material" value={description} onChangeText={setDescription} maxLength={255} editable={!uploading} multiline placeholder="Descrição (opcional)" placeholderTextColor="#888888" style={styles.input} />
            <Pressable accessibilityRole="button" onPress={pickFile} style={styles.fileButton}><Text style={styles.infoText}>{file?.name ?? "Escolher arquivo"}</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={uploading} onPress={upload} style={styles.primaryButton}><Text style={styles.primaryText}>{uploading ? "Enviando..." : "Enviar material"}</Text></Pressable>
            {uploadMessage ? <Text style={styles.feedback}>{uploadMessage}</Text> : null}
          </>}
        </ScrollView>
      )}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

function AttendanceCalendar({ month, onChangeMonth, statuses }: { month: Date; onChangeMonth: (value: Date) => void; statuses: Map<string, string> }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + count) / 7) * 7 }, (_, index) => index - firstDay + 1);
  const rawMonthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month);
  const monthName = rawMonthName[0].toUpperCase() + rawMonthName.slice(1);
  return <View style={styles.calendar}>
    <View style={styles.calendarHeader}><Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={8} onPress={() => onChangeMonth(new Date(year, monthIndex - 1, 1))}><Ionicons name="chevron-back" size={18} color="#616161" /></Pressable><Text style={styles.calendarTitle}>{monthName}</Text><Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" hitSlop={8} onPress={() => onChangeMonth(new Date(year, monthIndex + 1, 1))}><Ionicons name="chevron-forward" size={18} color="#616161" /></Pressable></View>
    <View style={styles.calendarGrid}>{["S", "T", "Q", "Q", "S", "S", "D"].map((label, index) => <Text key={index} style={[styles.weekday, index >= 5 && styles.weekend]}>{label}</Text>)}
      {cells.map((day, index) => {
        const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const status = statuses.get(key);
        const inMonth = day > 0 && day <= count;
        const color = status === "PRESENT" ? "#238B19" : status === "ABSENT" ? "#FF1D25" : status === "EXCUSED" ? "#FFE21D" : "transparent";
        const date = new Date(year, monthIndex, day);
        const dateLabel = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
        const statusLabel = status === "PRESENT" ? "Presente" : status === "ABSENT" ? "Falta" : "Falta justificada";
        return (
          <View key={index} style={styles.dayCell}>
            <View accessibilityLabel={dateLabel + (inMonth && status ? `, ${statusLabel}` : "")} style={[styles.daySquare, { backgroundColor: inMonth ? color : "transparent" }]}>
              <Text style={[styles.dayText, !inMonth && styles.outsideMonth, inMonth && index % 7 >= 5 && styles.weekend, inMonth && status && (status === "EXCUSED" ? styles.excusedDay : styles.markedDay)]}>{date.getDate()}</Text>
            </View>
          </View>
        );
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  header: { height: 251, paddingHorizontal: 28 },
  headerActions: { flexDirection: "row", justifyContent: "space-between" },
  backIcon: { width: 26, height: 26 },
  profile: { flexDirection: "row", alignItems: "center", marginTop: 46, marginLeft: 20 },
  avatar: { width: 80, height: 80 },
  profileText: { marginLeft: 24, flex: 1, gap: 7 },
  name: { color: "#000000", fontSize: 17, fontWeight: "700" },
  instrument: { color: "#262626", fontSize: 14 },
  tabs: { height: 47, flexDirection: "row", borderBottomColor: "#C8C8C8", borderBottomWidth: 2 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  activeTab: { borderBottomColor: purple, borderBottomWidth: 3 },
  tabText: { color: "#333333", fontSize: 13 },
  activeTabText: { color: purple },
  content: { paddingHorizontal: 16, paddingTop: 34, paddingBottom: 38, flexGrow: 1 },
  tabContent: { paddingTop: 16 },
  attendanceContent: { paddingHorizontal: 14 },
  metricLabel: { color: "#111111", fontSize: 12 },
  metricValue: { color: "#000000", fontSize: 19, fontWeight: "700" },
  sectionTitle: { color: "#111111", fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 3 },
  infoBox: { minHeight: 55, borderColor: "#C8C8C8", borderWidth: 1, borderRadius: 8, backgroundColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 7, justifyContent: "center", marginBottom: 5 },
  infoLabel: { color: "#111111", fontSize: 14, fontWeight: "600" },
  infoText: { color: "#333333", fontSize: 14 },
  primaryButton: { height: 48, borderRadius: 6, backgroundColor: purple, alignItems: "center", justifyContent: "center", marginTop: 19, marginHorizontal: 3 },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  summaryAction: { marginTop: 18 },
  bottomAction: { marginTop: "auto" },
  lessonCard: { minHeight: 95, backgroundColor: "#FFFFFF", borderColor: "#C2C2C2", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 18 },
  lessonTop: { flexDirection: "row", justifyContent: "space-between" },
  lessonDate: { color: "#111111", fontSize: 14, fontWeight: "400" },
  lessonTime: { color: "#555555", fontSize: 13 },
  lessonContent: { color: "#111111", fontSize: 14, fontWeight: "700", marginTop: 9 },
  lessonSub: { color: "#555555", fontSize: 13, marginTop: 5 },
  empty: { color: "#666666", fontSize: 14, textAlign: "center", marginTop: 25, marginBottom: 30 },
  calendar: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#C8C8C8", paddingHorizontal: 4, paddingTop: 6, paddingBottom: 2 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, marginBottom: 10 },
  calendarTitle: { color: "#FFFFFF", backgroundColor: "#000000", borderRadius: 4, fontSize: 11, paddingHorizontal: 8, paddingVertical: 5 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.285%", textAlign: "center", color: "#B3B3B3", fontSize: 11, marginBottom: 10 },
  dayCell: { width: "14.285%", height: 35, alignItems: "center", justifyContent: "center" },
  daySquare: { width: 24, height: 24, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  dayText: { color: "#616161", fontSize: 11 },
  outsideMonth: { color: "#B3B3B3" },
  weekend: { color: "#17A1FA" },
  markedDay: { color: "#FFFFFF" },
  excusedDay: { color: "#111111" },
  legend: { gap: 9, marginTop: 22, marginBottom: 14, paddingHorizontal: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 14 },
  legendDot: { width: 24, height: 24, borderRadius: 4 },
  legendText: { color: "#111111", fontSize: 11 },
  monthSummary: { backgroundColor: "#FFFFFF", borderColor: "#C8C8C8", borderWidth: 1, paddingHorizontal: 11, paddingVertical: 10, marginHorizontal: 6 },
  monthSummaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingRight: 24 },
  monthSummaryLabel: { color: "#111111", fontSize: 11, marginTop: 3 },
  monthSummaryValue: { color: "#000000", fontSize: 16, fontWeight: "700", marginBottom: 3 },
  practiceTotal: { backgroundColor: "#FFFFFF", borderRadius: 15, padding: 18, gap: 16, marginBottom: 25 },
  input: { height: 48, backgroundColor: "#FFFFFF", borderColor: "#C8C8C8", borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, color: "#111111", marginBottom: 8 },
  fileButton: { minHeight: 48, backgroundColor: "#FFFFFF", borderColor: "#C8C8C8", borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, justifyContent: "center" },
  feedback: { color: purple, fontSize: 14, marginTop: 10, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 15, padding: 24 },
  error: { color: "#5C5C5C", fontSize: 14, textAlign: "center" },
});
