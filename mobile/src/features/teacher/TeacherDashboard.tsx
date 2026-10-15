import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResource } from "@/hooks/use-resource";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { notificationService } from "@/features/notifications/notificationService";
import { formatLessonWhen, formatMinutes, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ScreenState } from "@/ui/ScreenState";
import { Skeleton, SkeletonList } from "@/ui/Skeleton";
import { brandGradient, colors, MIN_TOUCH, radius, shadow, space, type } from "@/ui/theme";
import { AttendanceControl } from "./AttendanceControl";
import { canRecordAttendance, hhmm, scheduleHref } from "./agenda";
import { teacherService, type AttendanceStatus, type TeacherLesson } from "./teacherService";
import { useLessonActions } from "./useLessonActions";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";

const waveIcon = require("@/assets/images/figma-teacher/wave.png");

export default function TeacherDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = todayIso();
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollToTop(scrollRef);
  const [selectedClass, setSelectedClass] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recorded, setRecorded] = useState<Record<string, AttendanceStatus | null>>({});
  const dashboard = useResource(() => teacherService.dashboard(selectedClass || undefined), selectedClass);
  const { reload } = dashboard;
  const unread = useResource(() => notificationService.unreadCount().catch(() => ({ unreadCount: 0 })));
  const refresh = () => Promise.all([dashboard.refresh(), unread.refresh()]);

  useEffect(() => { setRecorded({}); }, [dashboard.data]);

  const applyLesson = useCallback((lessonId: string, patch: Partial<TeacherLesson>) => {
    if (patch.attendance !== undefined) setRecorded((current) => ({ ...current, [lessonId]: patch.attendance ?? null }));
  }, []);
  const onSuccess = useCallback(() => void reload(), [reload]);
  const { busy, errors, markAttendance } = useLessonActions({ applyLesson, onSuccess });
  const withRecorded = (lesson: TeacherLesson): TeacherLesson => ({ ...lesson, attendance: recorded[lesson.id] ?? lesson.attendance });

  const data = dashboard.data;
  const openSchedule = (date?: string) => router.push(date ? scheduleHref(date) : "/teacher/schedule");

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        accessibilityLabel="Painel do professor"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={dashboard.refreshing || unread.refreshing} onRefresh={refresh} tintColor={colors.onBrand} colors={[colors.primary]} />}
      >
        <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + space.xxl }]}>
          <View style={styles.helloRow}>
            <Text accessibilityRole="header" style={styles.hello}>Olá, Professor!</Text>
            <Image source={waveIcon} accessible={false} style={styles.wave} />
            <View style={styles.bell}><NotificationBell unreadCount={unread.data?.unreadCount ?? 0} /></View>
          </View>
          <Text style={styles.subtitle}>Aqui está o resumo das suas atividades</Text>
        </LinearGradient>

        <View style={styles.content}>
          {dashboard.loading ? (
            <View style={styles.skeleton}>
              <Skeleton height={72} rounded={radius.lg} />
              <SkeletonList rows={3} />
            </View>
          ) : dashboard.error || !data ? (
            <Card>
              <ScreenState message={apiErrorMessage(dashboard.error, "Não foi possível carregar seu painel.")} retry={() => void reload()} />
            </Card>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Turma atual: ${data.selectedClass || "nenhuma"}. Trocar turma`}
                disabled={data.classes.length < 2}
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [styles.classCard, pressed && styles.pressed]}
              >
                <View style={styles.classText}>
                  <Text style={styles.caption}>Turma atual</Text>
                  <Text numberOfLines={1} style={styles.classValue}>{data.selectedClass || "Nenhuma turma"}</Text>
                </View>
                {data.classes.length > 1 ? <Ionicons name="chevron-down" size={24} color={colors.primary} /> : null}
              </Pressable>

              <View style={styles.metrics}>
                <MetricCard title="Alunos" value={String(data.totalStudents)} action="Ver todos" icon="people-outline" onPress={() => router.push("/teacher/students")} />
                <MetricCard title="Aulas hoje" value={String(data.todayLessons.length)} action="Ver agenda" icon="calendar-outline" onPress={() => openSchedule()} />
                <MetricCard title="Frequência média" value={`${data.attendancePercent}%`} action="Ver relatórios" icon="document-text-outline" onPress={() => router.push("/teacher/reports")} />
                <MetricCard title="Prática (semana)" value={formatMinutes(data.weeklyPracticeMin)} icon="time-outline" />
              </View>

              <Text accessibilityRole="header" style={styles.sectionTitle}>Aulas de hoje</Text>
              {data.todayLessons.length ? data.todayLessons.map((lesson) => {
                const current = withRecorded(lesson);
                return (
                  <Card key={lesson.id} style={styles.todayCard}>
                    <Text style={styles.lessonTitle}>{hhmm(lesson.startTime)}–{hhmm(lesson.endTime)} · {lesson.studentName}</Text>
                    <Text style={styles.caption}>{lesson.instrument}</Text>
                    {canRecordAttendance(lesson, today) ? (
                      <AttendanceControl lesson={current} busy={!!busy[lesson.id]} onMark={(status, justification) => markAttendance(current, status, justification)} />
                    ) : null}
                    {errors[lesson.id] ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors[lesson.id]}</Text> : null}
                  </Card>
                );
              }) : (
                <Card><Text style={styles.empty}>Nenhuma aula hoje.</Text></Card>
              )}

              <Text accessibilityRole="header" style={styles.sectionTitle}>Próximas aulas</Text>
              <Card variant="plain" style={styles.upcomingCard}>
                {data.upcomingLessons.length ? data.upcomingLessons.map((lesson) => (
                  <Pressable
                    key={lesson.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir aula de ${lesson.studentName}, ${formatLessonWhen(lesson.date, lesson.startTime)}, ${lesson.instrument}`}
                    onPress={() => openSchedule(lesson.date)}
                    style={({ pressed }) => [styles.upcomingRow, pressed && styles.pressed]}
                  >
                    <Text style={styles.upcomingTime}>{hhmm(lesson.startTime)}</Text>
                    <View style={styles.upcomingIdentity}>
                      <Text style={styles.upcomingName}>{lesson.studentName}</Text>
                      <Text style={styles.caption}>{formatLessonWhen(lesson.date)}</Text>
                    </View>
                    <Text style={styles.upcomingInstrument}>{lesson.instrument}</Text>
                  </Pressable>
                )) : <Text style={[styles.empty, styles.emptyPadded]}>Nenhuma aula agendada.</Text>}
              </Card>
              <Button label="Ver agenda completa" variant="ghost" onPress={() => openSchedule()} style={styles.agendaLink} />
            </>
          )}
        </View>
      </ScrollView>

      {data ? (
        <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={styles.backdrop} onPress={() => setPickerOpen(false)}>
            <Pressable accessibilityViewIsModal style={styles.modalCard} onPress={() => undefined}>
              <Text accessibilityRole="header" style={styles.modalTitle}>Escolher turma</Text>
              <View accessibilityRole="radiogroup">
                {data.classes.map((name) => {
                  const selected = name === data.selectedClass;
                  return (
                    <Pressable
                      key={name}
                      accessibilityRole="radio"
                      accessibilityLabel={name}
                      aria-checked={selected}
                      onPress={() => {
                        setPickerOpen(false);
                        setSelectedClass(name);
                      }}
                      style={({ pressed }) => [styles.modalOption, pressed && styles.pressed]}
                    >
                      <Text style={[styles.modalOptionText, selected && styles.modalOptionSelected]}>{name}</Text>
                      {selected ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </View>
              <Button label="Cancelar" variant="ghost" compact onPress={() => setPickerOpen(false)} style={styles.modalClose} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  action?: string;
  onPress?: () => void;
};

function MetricCard({ title, value, icon, action, onPress }: MetricCardProps) {
  const body = (
    <>
      <Text style={styles.caption}>{title}</Text>
      <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
      <View style={styles.metricBottom}>
        {action ? <Text style={styles.metricAction}>{action}</Text> : <View />}
        <Ionicons name={icon} size={18} color={colors.primary} accessible={false} />
      </View>
    </>
  );
  if (!onPress) return <View accessible accessibilityLabel={`${title}: ${value}`} style={styles.metricCard}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${value}. ${action}`} onPress={onPress} style={({ pressed }) => [styles.metricCard, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  scrollContent: { flexGrow: 1, paddingBottom: space.xxxl },
  header: { minHeight: 180, paddingHorizontal: space.xxl, paddingBottom: 64 },
  helloRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  hello: { ...type.display, color: colors.onBrand, fontWeight: "600", flexShrink: 1 },
  wave: { width: 27, height: 27 },
  bell: { marginLeft: "auto", flexShrink: 0 },
  subtitle: { ...type.body, color: colors.onBrandMuted, marginTop: space.xs },
  content: { marginTop: -44, paddingHorizontal: space.screenGutter, gap: space.md },
  skeleton: { gap: space.md },
  pressed: { opacity: 0.85 },
  classCard: { minHeight: 76, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.xl, paddingVertical: space.md, flexDirection: "row", alignItems: "center", ...shadow },
  classText: { flex: 1, gap: space.xs },
  caption: { ...type.caption },
  classValue: { ...type.title },
  metrics: { flexDirection: "row", flexWrap: "wrap", columnGap: space.xxl, rowGap: space.xl },
  metricCard: { flexBasis: "40%", flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 116, borderRadius: radius.lg, backgroundColor: colors.surface, padding: space.lg, gap: space.sm },
  metricBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: "auto", gap: space.xs },
  metricValue: { ...type.title, fontVariant: ["tabular-nums"] },
  metricAction: { ...type.label, color: colors.link },
  sectionTitle: { ...type.heading, marginTop: space.sm },
  todayCard: { gap: space.sm },
  lessonTitle: { ...type.bodyStrong },
  error: { color: colors.danger, fontSize: 13 },
  upcomingCard: { padding: 0, overflow: "hidden" },
  upcomingRow: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, paddingVertical: space.sm },
  upcomingTime: { ...type.body, width: 56, fontVariant: ["tabular-nums"] },
  upcomingIdentity: { flex: 1, gap: space.xs },
  upcomingName: { ...type.body, fontWeight: "700" },
  upcomingInstrument: { ...type.body, flexShrink: 1, maxWidth: "30%", textAlign: "right", marginLeft: space.sm },
  agendaLink: { alignSelf: "flex-end", minHeight: MIN_TOUCH, paddingHorizontal: 0 },
  empty: { ...type.body, color: colors.muted },
  emptyPadded: { padding: space.lg },
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: "center", padding: space.xxl },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  modalTitle: { ...type.title, marginBottom: space.xs },
  modalOption: { minHeight: MIN_TOUCH + 4, flexDirection: "row", alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  modalOptionText: { ...type.body, flex: 1 },
  modalOptionSelected: { ...type.bodyStrong, color: colors.primary },
  modalClose: { alignSelf: "flex-end" },
});
