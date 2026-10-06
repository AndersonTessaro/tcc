import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { teacherService, type AttendanceStatus } from "@/features/teacher/teacherService";
import { EnrollmentPicker } from "@/features/teacher/EnrollmentPicker";
import { SlotPlanner } from "@/features/teacher/SlotPlanner";
import { ATTENDANCE_OPTIONS } from "@/features/teacher/agenda";
import { validateDate, validateTimeRange } from "@/features/teacher/lessonForm";
import { addMinutes, DURATION_OPTIONS, durationBetween } from "@/features/teacher/scheduling";
import { slotKey, useSlotAvailability } from "@/features/teacher/useSlotAvailability";
import { useResource } from "@/hooks/use-resource";
import { formatFullDate, relativeDayLabel, shortTime, todayIso } from "@/lib/format";
import { confirm } from "@/lib/confirm";
import { apiErrorKey, apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ChipGroup } from "@/ui/Chip";
import { DateTimeField } from "@/ui/DateTimeField";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { StatusChip } from "@/ui/StatusChip";
import { TextField } from "@/ui/TextField";
import { useToast } from "@/ui/Toast";
import { colors, space, type } from "@/ui/theme";

const DEFAULT_START = "10:00";
const DEFAULT_DURATION = "60";
const CUSTOM = "custom";

type DurationChoice = string;
type FieldErrors = { enrollment?: string; date?: string; time?: string; form?: string };

const durationLabel = (minutes: number) => (minutes === 60 ? "1h" : minutes === 90 ? "1h30" : `${minutes} min`);
const durationOptions = [
  ...DURATION_OPTIONS.map((minutes) => ({ value: `${minutes}`, label: durationLabel(minutes) })),
  { value: CUSTOM, label: "Outro" },
];

// Mirrors lesson-core LessonLifecyclePolicy.initialStatus until the server answers.
const localInitialStatus = (date: string) => (date > todayIso() ? "SCHEDULED" : "DONE");

export default function NewLesson() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ studentId?: string; date?: string }>();
  const initialDate = params.date && !validateDate(params.date) ? params.date : todayIso();
  const enrollments = useResource(() => teacherService.enrollments(), "", { refetchOnFocus: false });
  const [enrollmentId, setEnrollmentId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [duration, setDuration] = useState<DurationChoice>(DEFAULT_DURATION);
  const [customEnd, setCustomEnd] = useState(addMinutes(DEFAULT_START, 60));
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [justification, setJustification] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const endTime = duration === CUSTOM ? customEnd : addMinutes(startTime, Number(duration));
  const durationMin = duration === CUSTOM ? Math.max(15, durationBetween(startTime, customEnd)) : Number(duration);
  const slot = useSlotAvailability({ enrollmentId, date, startTime, endTime });
  const verified = slot.checkedFor === slotKey({ enrollmentId, date, startTime, endTime });
  const hasConflict = verified && !!slot.data && !slot.data.available;
  const initialStatus = slot.data?.initialStatus ?? localInitialStatus(date);
  const completed = initialStatus === "DONE";

  const studentEnrollments = enrollments.data?.filter((item) => item.studentId === params.studentId) ?? [];
  const preselectedId = studentEnrollments.length === 1 ? studentEnrollments[0].id : "";
  const initialQuery = studentEnrollments.length > 1 ? studentEnrollments[0].studentName : "";

  useEffect(() => {
    if (preselectedId) setEnrollmentId(preselectedId);
  }, [preselectedId]);

  useEffect(() => {
    if (!completed) setAttendance(null);
  }, [completed]);

  const dirty = enrollmentId !== preselectedId || date !== initialDate || startTime !== DEFAULT_START || duration !== DEFAULT_DURATION || !!content.trim() || !!homework.trim();

  const clearError = (field: keyof FieldErrors) => setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));

  const goBack = async () => {
    if (dirty && !(await confirm({ title: "Descartar aula?", message: "Os dados preenchidos serão perdidos.", confirmLabel: "Descartar", destructive: true }))) return;
    router.back();
  };

  const changeStart = (value: string) => {
    if (duration === CUSTOM) setCustomEnd(addMinutes(value, durationBetween(startTime, customEnd)));
    setStartTime(value);
    clearError("time");
  };

  const changeDuration = (value: DurationChoice) => {
    if (value === CUSTOM) setCustomEnd(endTime);
    setDuration(value);
    clearError("time");
  };

  const applySchedule = (start: string, end: string) => {
    const minutes = durationBetween(start, end);
    setStartTime(start);
    if ((DURATION_OPTIONS as readonly number[]).includes(minutes)) {
      setDuration(`${minutes}`);
    } else {
      setDuration(CUSTOM);
      setCustomEnd(end);
    }
    clearError("time");
  };

  const validate = (): FieldErrors => ({
    enrollment: enrollmentId ? undefined : "Selecione o aluno",
    date: validateDate(date) ?? undefined,
    time: validateTimeRange(startTime, endTime) ?? undefined,
  });

  const save = async () => {
    const found = validate();
    if (found.enrollment || found.date || found.time) {
      setErrors(found);
      return;
    }
    setErrors({});
    let lessonId: string;
    try {
      const lesson = await teacherService.newLesson({
        enrollmentId,
        date,
        startTime,
        endTime,
        content: content.trim() || undefined,
        homework: homework.trim() || undefined,
      });
      lessonId = lesson.id;
    } catch (error) {
      setErrors({ [apiErrorKey(error, ["enrollment", "date", "time"])]: apiErrorMessage(error, "Erro ao registrar aula") });
      return;
    }
    if (completed && attendance) {
      try {
        await teacherService.attendance(lessonId, attendance, attendance === "EXCUSED" ? justification.trim() || undefined : undefined);
      } catch (error) {
        toast.show(`Aula registrada, mas a frequência não foi salva: ${apiErrorMessage(error, "marque pela agenda")}`, "error");
        router.back();
        return;
      }
    }
    toast.show(completed ? "Aula registrada como concluída" : "Aula agendada", "success");
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenHeader title="Nova aula" back onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text accessibilityRole="header" style={styles.section}>1. Aluno e instrumento</Text>
        {enrollments.loading ? (
          <ScreenState loading />
        ) : enrollments.error ? (
          <ScreenState message={apiErrorMessage(enrollments.error, "Erro ao carregar alunos")} retry={() => void enrollments.reload()} />
        ) : (
          <EnrollmentPicker
            key={initialQuery}
            enrollments={enrollments.data ?? []}
            value={enrollmentId}
            initialQuery={initialQuery}
            onChange={(id) => {
              setEnrollmentId(id);
              clearError("enrollment");
            }}
            error={errors.enrollment}
          />
        )}
        {errors.enrollment && enrollmentId ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.enrollment}</Text> : null}

        <Text accessibilityRole="header" style={styles.section}>2. Data e horário</Text>
        <DateTimeField mode="date" label="Data" value={date} onChange={(value) => { setDate(value); clearError("date"); }} error={errors.date} />
        {!validateDate(date) ? <Text style={styles.caption}>{relativeDayLabel(date)} · {formatFullDate(date)}</Text> : null}
        <View style={styles.row}>
          <DateTimeField mode="time" label="Início" value={startTime} onChange={changeStart} />
          {duration === CUSTOM ? (
            <DateTimeField mode="time" label="Fim" value={customEnd} onChange={(value) => { setCustomEnd(value); clearError("time"); }} />
          ) : (
            <View style={styles.endPreview} accessible accessibilityLabel={`Fim às ${endTime}`}>
              <Text style={styles.label}>Fim</Text>
              <Text style={styles.endValue}>{endTime}</Text>
            </View>
          )}
        </View>
        <ChipGroup label="Duração" options={durationOptions} value={duration} onChange={changeDuration} />
        {errors.time ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.time}</Text> : null}

        <Text accessibilityRole="header" style={styles.section}>3. Disponibilidade</Text>
        <SlotPlanner
          availability={slot.data}
          checking={slot.checking}
          error={slot.error}
          verified={verified}
          startTime={startTime}
          durationMin={durationMin}
          onPickStart={changeStart}
          onUseSchedule={(block) => applySchedule(shortTime(block.startTime), shortTime(block.endTime))}
        />

        <Text accessibilityRole="header" style={styles.section}>4. Situação da aula</Text>
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <StatusChip label={completed ? "Concluída" : "Agendada"} tone={completed ? "success" : "info"} />
            <Text style={styles.statusText}>
              {completed
                ? "Data de hoje ou passada: a aula já nasce concluída."
                : "Data futura: a aula nasce agendada. Depois você conclui ou cancela pela agenda."}
            </Text>
          </View>
          {completed ? (
            <>
              <Text style={styles.label}>Frequência (opcional)</Text>
              <ChipGroup
                label="Frequência"
                options={ATTENDANCE_OPTIONS.map((option) => ({ value: option.status, label: option.label }))}
                value={attendance}
                onChange={(value) => setAttendance((current) => (current === value ? null : value))}
              />
              <Text style={styles.caption}>Presente soma XP ao aluno. Falta ou justificada não soma; trocar depois de "Presente" retira o XP.</Text>
              {attendance === "EXCUSED" ? (
                <TextField label="Justificativa" placeholder="Motivo da ausência" value={justification} onChangeText={setJustification} maxLength={500} />
              ) : null}
            </>
          ) : (
            <Text style={styles.caption}>A frequência fica disponível a partir do dia da aula.</Text>
          )}
        </Card>

        <Text accessibilityRole="header" style={styles.section}>5. Registro</Text>
        <TextField label="Conteúdo trabalhado" placeholder="Ex.: escalas maiores, música X" value={content} onChangeText={setContent} multiline maxLength={2000} />
        <TextField label="Tarefa para casa" placeholder="O que o aluno deve praticar" value={homework} onChangeText={setHomework} multiline maxLength={2000} />

        {errors.form ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.form}</Text> : null}
        <Button
          label={completed ? "Registrar aula" : "Agendar aula"}
          icon="checkmark"
          onPress={save}
          disabled={enrollments.loading || !!enrollments.error || hasConflict}
          accessibilityHint={hasConflict ? "Escolha um horário sem conflito" : undefined}
        />
        {hasConflict ? <Text style={styles.caption}>Escolha um horário livre para liberar o agendamento.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md },
  section: { ...type.heading, marginTop: space.md },
  row: { flexDirection: "row", gap: space.md },
  label: { ...type.label },
  caption: { ...type.caption },
  endPreview: { flex: 1, gap: 6 },
  endValue: { minHeight: 48, paddingTop: 12, fontSize: 16, color: colors.muted },
  statusCard: { gap: space.md },
  statusRow: { gap: space.sm },
  statusText: { ...type.body },
  error: { color: colors.danger, fontSize: 13 },
});
