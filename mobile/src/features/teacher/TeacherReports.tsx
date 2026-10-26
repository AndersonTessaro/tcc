import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useResource } from "@/hooks/use-resource";
import { addDays, normalizeSearch, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { IconButton } from "@/ui/IconButton";
import { ListRow } from "@/ui/ListRow";
import { TabHeader } from "@/ui/TabHeader";
import { ScreenState } from "@/ui/ScreenState";
import { TextField } from "@/ui/TextField";
import { colors, radius, space, type } from "@/ui/theme";
import { teacherService, type StudentSummary, type TeacherStudentDetailData } from "./teacherService";
import { TeacherStudentMetrics } from "./TeacherStudentMetrics";
import { AttendanceReportView, ClassReportView, PracticeReportView } from "./reports/AggregateReports";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";

const RECENT_DAYS = 29;

function recentAttendanceRate(report: TeacherStudentDetailData | null | undefined): number {
  const cutoff = addDays(todayIso(), -RECENT_DAYS);
  const history = report?.attendanceHistory.filter((item) => item.date >= cutoff) ?? [];
  return history.length ? Math.round((100 * history.filter((item) => item.status === "PRESENT").length) / history.length) : 0;
}

type ReportKind = "attendance" | "practice" | "evolution" | "classes";

const REPORT_CATEGORIES: { kind: ReportKind; title: string; description: string; hint: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: "attendance", title: "Frequência dos alunos", description: "Acompanhe a frequência geral", hint: "Abre a frequência de todos os alunos no período", icon: "pulse" },
  { kind: "practice", title: "Prática em casa", description: "Veja o tempo de prática dos alunos", hint: "Abre o tempo de prática dos alunos no período", icon: "home" },
  { kind: "evolution", title: "Evolução por aluno", description: "Acompanhe o progresso individual", hint: "Escolha um aluno para ver seu relatório individual", icon: "trending-up" },
  { kind: "classes", title: "Desempenho de turmas", description: "Relatório geral das turmas", hint: "Abre frequência e prática agrupadas por turma", icon: "speedometer" },
];

export default function TeacherReports() {
  const [open, setOpen] = useState<ReportKind | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollToTop(scrollRef);

  const close = () => setOpen(null);
  if (open === "evolution") return <IndividualReports onBack={close} />;
  if (open === "attendance") return <AttendanceReportView onBack={close} />;
  if (open === "practice") return <PracticeReportView onBack={close} />;
  if (open === "classes") return <ClassReportView onBack={close} />;

  return (
    <View style={styles.screen}>
      <TabHeader title="Relatórios" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.categories}>
        {REPORT_CATEGORIES.map((category) => (
          <Pressable
            key={category.kind}
            accessibilityRole="button"
            accessibilityLabel={category.title}
            accessibilityHint={category.hint}
            onPress={() => setOpen(category.kind)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Card variant="outlined" style={styles.category}>
              <Ionicons name={category.icon} size={26} color={colors.text} accessible={false} />
              <View style={styles.categoryText}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function IndividualReports({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const listRef = useRef<FlatList<StudentSummary>>(null);
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollToTop(listRef);
  useTabScrollToTop(scrollRef);
  const [selected, setSelected] = useState<StudentSummary | null>(null);
  const [query, setQuery] = useState("");
  const students = useResource(() => teacherService.students());
  const report = useResource(() => (selected ? teacherService.reports(selected.id) : Promise.resolve(null)), selected?.id ?? "");
  const attendanceRate = useMemo(() => recentAttendanceRate(report.data), [report.data]);

  const filtered = useMemo(() => {
    const term = normalizeSearch(query);
    const all = students.data ?? [];
    return term ? all.filter((student) => normalizeSearch(student.name).includes(term)) : all;
  }, [students.data, query]);

  if (selected) {
    const data = report.data;
    return (
      <View style={styles.screen}>
        <TabHeader title="Relatórios" right={<IconButton icon="arrow-back" label="Voltar" color={colors.onBrand} onPress={() => setSelected(null)} />} />
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={report.refreshing} onRefresh={report.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          <Card style={styles.selectedCard}>
            <ListRow
              title={selected.name}
              subtitle="Escolher outro aluno"
              leading={<Ionicons name="person-circle" size={32} color={colors.primary} />}
              accessibilityLabel="Escolher outro aluno"
              onPress={() => setSelected(null)}
            />
          </Card>
          {report.loading ? (
            <ScreenState loading skeleton />
          ) : report.error || !data ? (
            <ScreenState message={apiErrorMessage(report.error, "Não foi possível carregar os relatórios.")} retry={() => void report.reload()} />
          ) : (
            <>
              <TeacherStudentMetrics attendanceRate={attendanceRate} weeklyPracticeMin={data.weeklyPracticeMin} xp={data.progress?.xpTotal ?? 0} level={data.progress?.level ?? 1} />
              <Text accessibilityRole="header" style={styles.sectionTitle}>Resumo de frequência</Text>
              <Card>
                <Text style={styles.infoText}>Presentes: {data.attendance.present} · Faltas: {data.attendance.absent} · Justificadas: {data.attendance.excused}</Text>
              </Card>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Aulas e metas</Text>
              <Card style={styles.info}>
                <Text style={styles.infoText}>{data.lessonsCount} aulas registradas</Text>
                <Text style={styles.infoText}>{data.goals.active} metas ativas · {data.goals.completed} concluídas</Text>
              </Card>
              <Card style={styles.info}>
                <Text style={styles.infoLabel}>Próxima meta</Text>
                <Text style={styles.infoText}>{data.nextGoal || "Nenhuma meta ativa"}</Text>
              </Card>
              <Button label="Ver detalhes do aluno" icon="person-outline" onPress={() => router.push(`/teacher/student/${selected.id}`)} />
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  const empty = students.loading ? (
    <ScreenState loading skeleton />
  ) : students.error ? (
    <ScreenState message={apiErrorMessage(students.error, "Não foi possível carregar os relatórios.")} retry={() => void students.reload()} />
  ) : (
    <ScreenState icon="people-outline" title={query.trim() ? "Nenhum aluno encontrado" : "Nenhum aluno vinculado"} />
  );

  return (
    <View style={styles.screen}>
      <TabHeader title="Relatórios" right={<IconButton icon="arrow-back" label="Voltar" color={colors.onBrand} onPress={onBack} />} />
      <View style={styles.search}>
        <TextField
          accessibilityLabel="Buscar aluno nos relatórios"
          placeholder="Buscar aluno…"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          leading={<Ionicons name="search" size={18} color={colors.muted} />}
          trailing={query ? <IconButton icon="close-circle" label="Limpar busca" size={20} color={colors.muted} onPress={() => setQuery("")} /> : null}
        />
      </View>
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(student) => student.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={students.refreshing} onRefresh={students.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <View style={styles.rowCard}>
            <ListRow
              title={item.name}
              subtitle="Ver relatório"
              leading={<Ionicons name="person-circle" size={32} color={colors.primary} />}
              accessibilityLabel={`Relatório de ${item.name}`}
              onPress={() => setSelected(item)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  categories: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: 22 },
  category: { minHeight: 72, borderRadius: radius.sm, backgroundColor: "transparent", flexDirection: "row", alignItems: "center", gap: space.xl },
  categoryText: { flex: 1, gap: space.xs },
  categoryTitle: { ...type.label, fontSize: 14, fontWeight: "700" },
  categoryDescription: { ...type.caption, fontSize: 12 },
  pressed: { opacity: 0.85 },
  search: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.sm, flexGrow: 1 },
  rowCard: { borderRadius: radius.lg, overflow: "hidden" },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md, flexGrow: 1 },
  selectedCard: { padding: 0, overflow: "hidden" },
  sectionTitle: { ...type.heading, marginTop: space.sm },
  info: { gap: space.xs },
  infoLabel: { ...type.label },
  infoText: { ...type.body },
});
