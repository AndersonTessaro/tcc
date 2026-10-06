import { useState } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { teacherService, type TeacherSchedule, type Weekday } from "@/features/teacher/teacherService";
import { EnrollmentPicker } from "@/features/teacher/EnrollmentPicker";
import { hhmm } from "@/features/teacher/agenda";
import { oneHourAfter, validateTimeRange } from "@/features/teacher/lessonForm";
import { WEEKDAYS, weekdayLabel } from "@/features/teacher/weeklySchedule";
import { useResource } from "@/hooks/use-resource";
import { confirm } from "@/lib/confirm";
import { apiErrorKey, apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ChipGroup } from "@/ui/Chip";
import { DateTimeField } from "@/ui/DateTimeField";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { StatusChip } from "@/ui/StatusChip";
import { useToast } from "@/ui/Toast";
import { colors, space, type } from "@/ui/theme";

const DEFAULT_START = "14:00";
const DEFAULT_WEEKDAY: Weekday = "MONDAY";

type FormErrors = { enrollment?: string; time?: string; form?: string };

const loadAll = async () => {
  const [schedules, enrollments] = await Promise.all([teacherService.schedules(), teacherService.enrollments()]);
  return { schedules, enrollments };
};

export default function Schedules() {
  const toast = useToast();
  const resource = useResource(loadAll);
  const { data, setData, reload } = resource;
  const [enrollmentId, setEnrollmentId] = useState("");
  const [weekday, setWeekday] = useState<Weekday>(DEFAULT_WEEKDAY);
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(oneHourAfter(DEFAULT_START));
  const [endEdited, setEndEdited] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const replaceSchedule = (updated: TeacherSchedule) =>
    setData((current) => current && { ...current, schedules: current.schedules.map((item) => (item.id === updated.id ? updated : item)) });

  const resetForm = () => {
    setEnrollmentId("");
    setWeekday(DEFAULT_WEEKDAY);
    setStartTime(DEFAULT_START);
    setEndTime(oneHourAfter(DEFAULT_START));
    setEndEdited(false);
    setFormKey((value) => value + 1);
  };

  const changeStart = (value: string) => {
    setStartTime(value);
    setErrors(({ time: _time, ...rest }) => rest);
    const suggested = oneHourAfter(value);
    if (!endEdited && suggested) setEndTime(suggested);
  };

  const create = async () => {
    const found: FormErrors = {
      enrollment: enrollmentId ? undefined : "Selecione o aluno",
      time: validateTimeRange(startTime, endTime) ?? undefined,
    };
    if (found.enrollment || found.time) {
      setErrors(found);
      return;
    }
    setErrors({});
    try {
      const created = await teacherService.createSchedule({ enrollmentId, weekday, startTime, endTime });
      setData((current) => current && { ...current, schedules: [...current.schedules, created] });
      toast.show("Horário criado", "success");
      resetForm();
      void reload();
    } catch (error) {
      setErrors({ [apiErrorKey(error, ["enrollment", "time"])]: apiErrorMessage(error, "Erro ao criar horário") });
    }
  };

  const toggle = async (schedule: TeacherSchedule) => {
    if (busy[schedule.id]) return;
    if (schedule.active && !(await confirm({ title: "Desativar horário?", message: `${weekdayLabel(schedule.weekday)} ${hhmm(schedule.startTime)} · ${schedule.studentName}`, confirmLabel: "Desativar", destructive: true }))) return;
    setBusy((current) => ({ ...current, [schedule.id]: true }));
    setRowErrors(({ [schedule.id]: _cleared, ...rest }) => rest);
    try {
      replaceSchedule(await teacherService.setScheduleActive(schedule.id, !schedule.active));
      toast.show(schedule.active ? "Horário desativado" : "Horário reativado", "success");
    } catch (error) {
      setRowErrors((current) => ({ ...current, [schedule.id]: apiErrorMessage(error, "Erro ao alterar horário") }));
    } finally {
      setBusy(({ [schedule.id]: _done, ...rest }) => rest);
    }
  };

  const unavailable = resource.loading || !!resource.error;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenHeader title="Horários fixos" back />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {resource.loading ? (
          <ScreenState loading skeleton />
        ) : resource.error ? (
          <ScreenState message={apiErrorMessage(resource.error, "Erro ao carregar horários e alunos")} retry={() => void reload()} />
        ) : (
          <>
            <Card style={styles.form}>
              <Text accessibilityRole="header" style={styles.section}>Novo horário</Text>
              <Text style={styles.label}>Aluno</Text>
              <EnrollmentPicker key={formKey} enrollments={data?.enrollments ?? []} value={enrollmentId} onChange={(id) => { setEnrollmentId(id); setErrors(({ enrollment: _e, ...rest }) => rest); }} error={errors.enrollment} />
              {errors.enrollment && enrollmentId ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.enrollment}</Text> : null}
              <Text style={styles.label}>Dia da semana</Text>
              <ChipGroup label="Dia da semana" options={WEEKDAYS} value={weekday} onChange={setWeekday} scroll />
              <View style={styles.row}>
                <DateTimeField mode="time" label="Início" value={startTime} onChange={changeStart} />
                <DateTimeField mode="time" label="Fim" value={endTime} onChange={(value) => { setEndEdited(true); setEndTime(value); setErrors(({ time: _t, ...rest }) => rest); }} />
              </View>
              {errors.time ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.time}</Text> : null}
              {errors.form ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.form}</Text> : null}
              <Button label="Criar horário" icon="add" onPress={create} disabled={unavailable} />
            </Card>

            <Text accessibilityRole="header" style={styles.section}>Horários cadastrados</Text>
            {data?.schedules.length ? data.schedules.map((schedule) => (
              <Card key={schedule.id} style={styles.item}>
                <View style={styles.itemTop}>
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{weekdayLabel(schedule.weekday)} {hhmm(schedule.startTime)}–{hhmm(schedule.endTime)} · {schedule.studentName}</Text>
                    <Text style={styles.itemSubtitle}>{schedule.instrument}</Text>
                  </View>
                  <StatusChip label={schedule.active ? "Ativo" : "Inativo"} tone={schedule.active ? "success" : "neutral"} />
                </View>
                {rowErrors[schedule.id] ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{rowErrors[schedule.id]}</Text> : null}
                <Button
                  label={schedule.active ? "Desativar" : "Reativar"}
                  variant={schedule.active ? "danger" : "secondary"}
                  compact
                  loading={!!busy[schedule.id]}
                  onPress={() => toggle(schedule)}
                  style={styles.itemAction}
                />
              </Card>
            )) : <ScreenState icon="time-outline" title="Nenhum horário cadastrado" message="Crie um horário fixo semanal no formulário acima." />}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md, flexGrow: 1 },
  form: { gap: space.md },
  section: { ...type.heading },
  label: { ...type.label },
  row: { flexDirection: "row", gap: space.md },
  error: { color: colors.danger, fontSize: 13 },
  item: { gap: space.sm },
  itemTop: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  itemText: { flex: 1, gap: 2 },
  itemTitle: { ...type.bodyStrong },
  itemSubtitle: { ...type.caption },
  itemAction: { alignSelf: "flex-start" },
});
