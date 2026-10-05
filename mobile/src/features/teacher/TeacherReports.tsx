import { useCallback, useMemo, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { teacherService, type StudentSummary, type TeacherStudentDetailData } from "./teacherService";
import { TeacherStudentMetrics } from "./TeacherStudentMetrics";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { apiErrorMessage } from "@/lib/http/errorMessage";

const userIcon = require("@/assets/images/figma-teacher/user.png");
const searchIcon = require("@/assets/images/figma-teacher/search.png");

export default function TeacherReports() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selected, setSelected] = useState<StudentSummary | null>(null);
  const [report, setReport] = useState<TeacherStudentDetailData | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError("");
    setReport(null);
    const request = selected
      ? teacherService.reports(selected.id).then((value) => { if (active) setReport(value); })
      : teacherService.students().then((value) => { if (active) setStudents(value); });
    request.catch((cause) => { if (active) setError(apiErrorMessage(cause, "Não foi possível carregar os relatórios.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected, retry]));

  const filtered = students.filter((student) => student.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  const attendanceRate = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 29);
    const cutoff = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;
    const history = report?.attendanceHistory.filter((item) => item.date >= cutoff) ?? [];
    return history.length ? Math.round(100 * history.filter((item) => item.status === "PRESENT").length / history.length) : 0;
  }, [report]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <ScreenHeader title="Relatórios" />
      {selected ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Escolher outro aluno" onPress={() => setSelected(null)} style={styles.selected}>
          <Image source={userIcon} style={styles.avatar} />
          <View style={styles.studentText}><Text style={styles.name}>{selected.name}</Text><Text style={styles.link}>Escolher outro aluno</Text></View>
        </Pressable>
      ) : <View style={styles.searchField}><Image source={searchIcon} style={styles.searchIcon} /><TextInput accessibilityLabel="Buscar aluno nos relatórios" placeholder="Buscar aluno..." placeholderTextColor="#9A969B" value={query} onChangeText={setQuery} style={styles.searchInput} /></View>}
      {loading || error ? <ScreenState loading={loading} message={error} retry={() => setRetry((value) => value + 1)} /> : selected && report ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TeacherStudentMetrics attendanceRate={attendanceRate} weeklyPracticeMin={report.weeklyPracticeMin} xp={report.progress?.xpTotal ?? 0} level={report.progress?.level ?? 1} />
          <Text style={styles.sectionTitle}>Resumo de frequência</Text>
          <View style={styles.infoBox}><Text style={styles.infoText}>Presentes: {report.attendance.present} · Faltas: {report.attendance.absent} · Justificadas: {report.attendance.excused}</Text></View>
          <Text style={styles.sectionTitle}>Aulas e metas</Text>
          <View style={styles.infoBox}><Text style={styles.infoText}>{report.lessonsCount} aulas registradas</Text><Text style={styles.infoText}>{report.goals.active} metas ativas · {report.goals.completed} concluídas</Text></View>
          <View style={styles.infoBox}><Text style={styles.infoLabel}>Próxima meta</Text><Text style={styles.infoText}>{report.nextGoal || "Nenhuma meta ativa"}</Text></View>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/(teacher)/student/${selected.id}`)} style={styles.primaryButton}><Text style={styles.primaryText}>Ver detalhes do aluno</Text></Pressable>
        </ScrollView>
      ) : (
        <FlatList data={filtered} keyExtractor={(student) => student.id} contentContainerStyle={styles.list} ListEmptyComponent={<ScreenState message={query.trim() ? "Nenhum aluno encontrado." : "Nenhum aluno vinculado."} />} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Relatório de ${item.name}`} onPress={() => setSelected(item)} style={styles.card}>
          <Image source={userIcon} style={styles.avatar} /><View style={styles.studentText}><Text style={styles.name}>{item.name}</Text><Text style={styles.link}>Ver relatório</Text></View><Text style={styles.chevron}>&gt;</Text>
        </Pressable>} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  searchField: { height: 46, borderWidth: 1, borderColor: "#CCCCCC", backgroundColor: "#FFFFFF", borderRadius: 15, marginHorizontal: 29, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24 },
  searchIcon: { width: 15, height: 15 },
  searchInput: { flex: 1, height: "100%", color: "#000000", fontSize: 14, padding: 0 },
  list: { paddingHorizontal: 29, paddingTop: 19, paddingBottom: 30, gap: 7, flexGrow: 1 },
  card: { minHeight: 99, borderWidth: 1, borderColor: "#D3D3D3", borderRadius: 15, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", padding: 13 },
  selected: { marginHorizontal: 29, marginTop: 24, minHeight: 99, borderWidth: 1, borderColor: "#D3D3D3", borderRadius: 15, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", padding: 13 },
  avatar: { width: 60, height: 60 },
  studentText: { flex: 1, marginLeft: 19, gap: 7 },
  name: { color: "#000000", fontSize: 14, fontWeight: "700" },
  link: { color: "#572AA8", fontSize: 14 },
  chevron: { color: "#5C5C5C", fontSize: 18, marginRight: 9 },
  content: { paddingHorizontal: 16, paddingTop: 34, paddingBottom: 38 },
  sectionTitle: { color: "#111111", fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 14 },
  infoBox: { minHeight: 55, borderColor: "#C8C8C8", borderWidth: 1, borderRadius: 8, backgroundColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 10, justifyContent: "center", gap: 5, marginBottom: 5 },
  infoLabel: { color: "#111111", fontSize: 14, fontWeight: "600" },
  infoText: { color: "#333333", fontSize: 14 },
  primaryButton: { minHeight: 48, borderRadius: 8, backgroundColor: "#6C45BE", alignItems: "center", justifyContent: "center", marginTop: 19, padding: 12 },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
