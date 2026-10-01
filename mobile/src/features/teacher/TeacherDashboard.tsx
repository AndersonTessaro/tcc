import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { teacherService, type TeacherDashboardData } from "./teacherService";
import { colors } from "@/ui/theme";

const icons = {
  wave: require("@/assets/images/figma-teacher/wave.png"),
  notification: require("@/assets/images/figma-teacher/notification.png"),
  down: require("@/assets/images/figma-teacher/down-arrow.png"),
  calendar: require("@/assets/images/figma-teacher/calendar.png"),
  document: require("@/assets/images/figma-teacher/document.png"),
  clock: require("@/assets/images/figma-teacher/clock.png"),
  arrow: require("@/assets/images/figma-teacher/arrow.png"),
};

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    teacherService.dashboard(selectedClass || undefined).then((result) => {
      setData(result);
      setSelectedClass(result.selectedClass);
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [selectedClass]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#2A1454" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#2A1454", "#3B1E78", "#3B1E78", "#2A1454"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 31 }]}>
        <View style={styles.helloRow}>
          <Text style={styles.hello}>Olá, Professor!</Text>
          <Image source={icons.wave} style={styles.wave} />
          <Image source={icons.notification} style={styles.notification} />
        </View>
        <Text style={styles.subtitle}>Aqui está o resumo das suas atividades</Text>
      </LinearGradient>

      {loading ? <ActivityIndicator color={colors.accent} style={styles.center} /> : error || !data ? (
        <View style={styles.center}>
          <Text style={styles.message}>Não foi possível carregar seu painel.</Text>
          <Pressable accessibilityRole="button" onPress={load} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <Pressable accessibilityRole="button" accessibilityLabel="Escolher turma" onPress={() => setClassPickerVisible(true)} style={styles.classCard}>
            <View style={styles.classText}>
              <Text style={styles.classLabel}>Turma Atual</Text>
              <Text numberOfLines={1} style={styles.classValue}>{selectedClass || "Nenhuma turma"}</Text>
            </View>
            <Image source={icons.down} style={styles.downIcon} />
          </Pressable>

          <Modal visible={classPickerVisible} transparent animationType="fade" onRequestClose={() => setClassPickerVisible(false)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Escolher turma</Text>
                {data.classes.map((name) => <Pressable key={name} accessibilityRole="button" onPress={() => { setClassPickerVisible(false); setSelectedClass(name); }} style={styles.modalOption}><Text style={styles.modalOptionText}>{name}</Text></Pressable>)}
                <Pressable accessibilityRole="button" onPress={() => setClassPickerVisible(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>Cancelar</Text></Pressable>
              </View>
            </View>
          </Modal>

          <View style={styles.metrics}>
            <MetricCard title="Alunos" value={String(data.totalStudents)} action="Ver todos" icon={icons.arrow} iconSize={10} onPress={() => router.push("/(teacher)/students")} />
            <MetricCard title="Aulas hoje" value={String(data.todayLessons.length)} action="Ver agenda" icon={icons.calendar} iconSize={20} onPress={() => router.push("/(teacher)/schedule")} />
            <MetricCard title="Frequência média" value={`${data.attendancePercent}%`} action="Ver relatório" icon={icons.document} iconSize={17} onPress={() => router.push("/(teacher)/reports")} />
            <MetricCard title="Prática (semana)" value={formatMinutes(data.weeklyPracticeMin)} action="Ver todos" icon={icons.clock} iconSize={17} onPress={() => router.push("/(teacher)/reports")} />
          </View>

          <Text style={styles.sectionTitle}>Próximas aulas</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/(teacher)/schedule")} style={styles.upcomingCard}>
            {data.upcomingLessons.length ? data.upcomingLessons.map((lesson) => (
              <View key={lesson.id} style={styles.lessonRow}>
                <Text style={styles.lessonTime}>{lesson.startTime.slice(0, 5)}</Text>
                <Text numberOfLines={1} style={styles.lessonStudent}>{lesson.studentName}</Text>
                <Text numberOfLines={1} style={styles.lessonInstrument}>{lesson.instrument}</Text>
              </View>
            )) : <Text style={styles.emptyLessons}>Nenhuma aula agendada.</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push("/(teacher)/schedule")} style={styles.fullSchedule}>
            <Text style={styles.fullScheduleText}>Ver agenda completa</Text>
          </Pressable>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

function MetricCard({ title, value, action, icon, iconSize, onPress }: {
  title: string; value: string; action: string; icon: number; iconSize: number; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
      <View style={styles.metricActionRow}>
        <Text style={styles.metricAction}>{action}</Text>
        <Image source={icon} style={{ width: iconSize, height: iconSize }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  scrollContent: { flexGrow: 1, paddingBottom: 28 },
  header: { height: 195, paddingHorizontal: 24 },
  helloRow: { flexDirection: "row", alignItems: "center" },
  hello: { color: "#FFFFFF", fontSize: 27, fontWeight: "500" },
  wave: { width: 27, height: 27, marginLeft: 8 },
  notification: { width: 25, height: 25, marginLeft: "auto" },
  subtitle: { color: "#FFFFFF", fontSize: 15, marginTop: 3 },
  content: { marginTop: -44, paddingHorizontal: 29, zIndex: 1 },
  classCard: { minHeight: 85, backgroundColor: "#FFFFFF", borderRadius: 15, marginHorizontal: 2, paddingHorizontal: 24, flexDirection: "row", alignItems: "center" },
  classText: { flex: 1 },
  classLabel: { color: "#000000", fontSize: 14 },
  classValue: { color: "#000000", fontSize: 20, fontWeight: "700", marginTop: 13 },
  downIcon: { width: 30, height: 30 },
  metrics: { marginTop: 23, marginRight: 4, flexDirection: "row", flexWrap: "wrap", gap: 20, justifyContent: "space-between" },
  metricCard: { width: "46.5%", height: 116, borderRadius: 15, backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 15 },
  metricTitle: { color: "#000000", fontSize: 12 },
  metricValue: { color: "#000000", fontSize: 18, fontWeight: "700", marginTop: 18 },
  metricActionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 15 },
  metricAction: { color: "#572AA8", fontSize: 14 },
  sectionTitle: { color: "#000000", fontSize: 14, fontWeight: "500", marginTop: 27, marginBottom: 15 },
  upcomingCard: { minHeight: 117, borderRadius: 15, backgroundColor: "#FFFFFF", paddingHorizontal: 17, paddingVertical: 12, justifyContent: "space-around" },
  lessonRow: { height: 29, flexDirection: "row", alignItems: "center" },
  lessonTime: { width: 74, color: "#000000", fontSize: 14 },
  lessonStudent: { flex: 1, color: "#000000", fontSize: 14, fontWeight: "700" },
  lessonInstrument: { width: 70, color: "#000000", fontSize: 14, fontWeight: "300", textAlign: "right" },
  emptyLessons: { color: colors.muted, fontSize: 14 },
  fullSchedule: { alignSelf: "flex-end", marginTop: 16 },
  fullScheduleText: { color: "#572AA8", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  message: { color: colors.muted, fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: "#FFFFFF", fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "#00000080", justifyContent: "center", padding: 28 },
  modalCard: { backgroundColor: "#FFFFFF", borderRadius: 15, padding: 20 },
  modalTitle: { color: "#111111", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalOption: { paddingVertical: 12, borderBottomColor: "#E0E0E0", borderBottomWidth: 1 },
  modalOptionText: { color: "#111111", fontSize: 15 },
  modalClose: { alignItems: "flex-end", paddingTop: 16 },
  modalCloseText: { color: "#6C45BE", fontSize: 14, fontWeight: "600" },
});
