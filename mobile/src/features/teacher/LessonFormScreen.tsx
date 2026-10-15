import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { LessonAttachment } from "@/features/student/studentService";
import { teacherService, type AttendanceStatus, type TeacherLessonDetail } from "@/features/teacher/teacherService";
import { EnrollmentPicker, type EnrollmentPickerHandle } from "@/features/teacher/EnrollmentPicker";
import { LessonAttachmentList } from "@/features/teacher/LessonAttachmentList";
import { SlotPlanner } from "@/features/teacher/SlotPlanner";
import { TeacherStudentIdentity } from "@/features/teacher/TeacherStudentIdentity";
import { ATTENDANCE_OPTIONS, hhmm, lessonStatusLabel, lessonStatusTone } from "@/features/teacher/agenda";
import { validateDate, validateTimeRange } from "@/features/teacher/lessonForm";
import { addMinutes, DURATION_OPTIONS, durationBetween } from "@/features/teacher/scheduling";
import { slotKey, useSlotAvailability } from "@/features/teacher/useSlotAvailability";
import { useResource } from "@/hooks/use-resource";
import { confirm } from "@/lib/confirm";
import { formatFullDate, relativeDayLabel, shortTime, todayIso } from "@/lib/format";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { apiErrorKey, apiErrorMessage } from "@/lib/http/errorMessage";
import type { PickedFile } from "@/lib/http/formFile";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ChipGroup } from "@/ui/Chip";
import { DateTimeField, type DateTimeFieldHandle } from "@/ui/DateTimeField";
import { TeacherStackHeader } from "@/features/teacher/TeacherStackHeader";
import { ScreenState } from "@/ui/ScreenState";
import { StatusChip } from "@/ui/StatusChip";
import { TextField } from "@/ui/TextField";
import { useToast } from "@/ui/Toast";
import { colors, space, type } from "@/ui/theme";

const DEFAULT_START = "10:00";
const DEFAULT_DURATION = "60";
const CUSTOM = "custom";
const TEXT_LIMIT = 1000;

type FieldErrors = { enrollment?: string; date?: string; time?: string; form?: string };

const durationLabel = (minutes: number) => (minutes === 60 ? "1h" : minutes === 90 ? "1h30" : `${minutes} min`);
const durationOptions = [
  ...DURATION_OPTIONS.map((minutes) => ({ value: `${minutes}`, label: durationLabel(minutes) })),
  { value: CUSTOM, label: "Outro" },
];

// Mirrors lesson-core LessonLifecyclePolicy.initialStatus until the server answers.
const localInitialStatus = (date: string) => (date > todayIso() ? "SCHEDULED" : "DONE");

function initialSchedule(lesson?: TeacherLessonDetail["lesson"]) {
  if (!lesson) return { start: DEFAULT_START, duration: DEFAULT_DURATION, customEnd: addMinutes(DEFAULT_START, 60) };
  const start = hhmm(lesson.startTime);
  const end = hhmm(lesson.endTime);
  const minutes = durationBetween(start, end);
  const preset = (DURATION_OPTIONS as readonly number[]).includes(minutes);
  return { start, duration: preset ? `${minutes}` : CUSTOM, customEnd: end };
}

export function LessonForm({ id }: { id?: string }) {
  return id ? <LessonEditLoader id={id} /> : <LessonEditor />;
}

function LessonEditLoader({ id }: { id: string }) {
  const fetchLesson = useCallback(() => teacherService.lesson(id), [id]);
  const detail = useResource(fetchLesson, id, { refetchOnFocus: false });
  if (detail.data) return <LessonEditor existing={detail.data} reloadAttachments={detail.reload} />;
  return (
    <View style={styles.screen}>
      <TeacherStackHeader />
      {detail.error ? (
        <ScreenState message={apiErrorMessage(detail.error, "Não foi possível carregar a aula.")} retry={() => void detail.reload()} />
      ) : (
        <ScreenState loading />
      )}
    </View>
  );
}

type EditorProps = { existing?: TeacherLessonDetail; reloadAttachments?: () => Promise<void> };

function LessonEditor({ existing, reloadAttachments }: EditorProps) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const enrollmentRef = useRef<EnrollmentPickerHandle>(null);
  const dateRef = useRef<DateTimeFieldHandle>(null);
  const timeRef = useRef<DateTimeFieldHandle>(null);
  const fieldPositions = useRef({ enrollment: 0, date: 0, scheduling: 0, time: 0 });
  const toast = useToast();
  const params = useLocalSearchParams<{ studentId?: string; date?: string }>();
  const lesson = existing?.lesson;
  const editing = !!lesson;
  const readOnly = lesson?.status === "CANCELED";
  const canSchedule = !editing || lesson.status === "SCHEDULED";
  const initialDate = lesson?.date ?? (params.date && !validateDate(params.date) ? params.date : todayIso());
  const initial = initialSchedule(lesson);
  const enrollments = useResource(
    () => (editing ? Promise.resolve([]) : teacherService.enrollments()),
    editing ? "edit" : "",
    { refetchOnFocus: false },
  );
  const [enrollmentId, setEnrollmentId] = useState(lesson?.enrollmentId ?? "");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initial.start);
  const [duration, setDuration] = useState(initial.duration);
  const [customEnd, setCustomEnd] = useState(initial.customEnd);
  const [content, setContent] = useState(lesson?.content ?? "");
  const [homework, setHomework] = useState(lesson?.homework ?? "");
  const [homeworkHeight, setHomeworkHeight] = useState(32);
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [justification, setJustification] = useState("");
  const [pending, setPending] = useState<PickedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [baseline, setBaseline] = useState({ date: initialDate, start: initial.start, duration: initial.duration, customEnd: initial.customEnd, content: content, homework: homework });

  const endTime = duration === CUSTOM ? customEnd : addMinutes(startTime, Number(duration));
  const durationMin = duration === CUSTOM ? Math.max(15, durationBetween(startTime, customEnd)) : Number(duration);
  const slotQuery = { enrollmentId: canSchedule ? enrollmentId : "", date, startTime, endTime, lessonId: lesson?.id };
  const slot = useSlotAvailability(slotQuery);
  const verified = slot.checkedFor === slotKey(slotQuery);
  const rescheduled = !lesson || date !== lesson.date || startTime !== hhmm(lesson.startTime) || endTime !== hhmm(lesson.endTime);
  const hasConflict = canSchedule && rescheduled && verified && !!slot.data && !slot.data.available;
  const checking = canSchedule && slot.checking;
  const completed = editing ? lesson.status === "DONE" : (slot.data?.initialStatus ?? localInitialStatus(date)) === "DONE";

  const studentEnrollments = enrollments.data?.filter((item) => item.studentId === params.studentId) ?? [];
  const preselectedId = editing ? enrollmentId : studentEnrollments.length === 1 ? studentEnrollments[0].id : "";
  const initialQuery = studentEnrollments.length > 1 ? studentEnrollments[0].studentName : "";

  useEffect(() => {
    if (!editing && preselectedId) setEnrollmentId(preselectedId);
  }, [editing, preselectedId]);

  useEffect(() => {
    if (!completed) setAttendance(null);
  }, [completed]);

  const formDirty = date !== baseline.date || startTime !== baseline.start || duration !== baseline.duration
    || customEnd !== baseline.customEnd || content.trim() !== baseline.content.trim() || homework.trim() !== baseline.homework.trim();
  const dirty = formDirty || pending.length > 0 || enrollmentId !== preselectedId || attendance !== null || !!justification;
  const markSaved = useUnsavedChangesGuard(dirty);

  const clearError = (field: keyof FieldErrors) => setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));

  const changeStart = (value: string) => {
    if (duration === CUSTOM) setCustomEnd(addMinutes(value, durationBetween(startTime, customEnd)));
    setStartTime(value);
    clearError("time");
  };

  const changeDuration = (value: string) => {
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
    date: canSchedule ? validateDate(date) ?? undefined : undefined,
    time: canSchedule ? validateTimeRange(startTime, endTime) ?? undefined : undefined,
  });

  const focusInvalid = (found: FieldErrors) => {
    const field = found.enrollment ? "enrollment" : found.date ? "date" : found.time ? "time" : null;
    if (!field) return;
    const fieldRef = field === "enrollment" ? enrollmentRef : field === "date" ? dateRef : timeRef;
    fieldRef.current?.focus();
    const y = fieldPositions.current[field] + (field === "time" ? fieldPositions.current.scheduling : 0);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - space.sm), animated: true });
  };

  const showSaveError = (error: unknown, fallback: string) => {
    const found = { [apiErrorKey(error, ["enrollment", "date", "time"])]: apiErrorMessage(error, fallback) };
    setErrors(found);
    focusInvalid(found);
  };

  const uploadPending = async (lessonId: string) => {
    const failed: PickedFile[] = [];
    for (const file of pending) {
      try {
        await teacherService.uploadLessonAttachment(lessonId, file);
      } catch {
        failed.push(file);
      }
    }
    return failed;
  };

  const createLesson = async () => {
    let lessonId: string;
    try {
      const created = await teacherService.newLesson({
        enrollmentId,
        date,
        startTime,
        endTime,
        content: content.trim() || undefined,
        homework: homework.trim() || undefined,
      });
      lessonId = created.id;
      markSaved();
    } catch (error) {
      showSaveError(error, "Erro ao registrar aula");
      return;
    }
    let attendanceError: string | null = null;
    if (completed && attendance) {
      try {
        await teacherService.attendance(lessonId, attendance, attendance === "EXCUSED" ? justification.trim() || undefined : undefined);
      } catch (error) {
        attendanceError = apiErrorMessage(error, "marque pela agenda");
      }
    }
    const failed = await uploadPending(lessonId);
    if (failed.length) {
      toast.show(`Aula salva, mas ${failed.length} anexo(s) não foram enviados. Tente de novo na aula.`, "error");
      router.replace({ pathname: "/teacher/lesson/[id]", params: { id: lessonId } });
      return;
    }
    if (attendanceError) {
      toast.show(`Aula registrada, mas a frequência não foi salva: ${attendanceError}`, "error");
    } else {
      toast.show(completed ? "Aula registrada como concluída" : "Aula agendada", "success");
    }
    router.back();
  };

  const updateLesson = async (lessonId: string) => {
    try {
      await teacherService.updateLesson(lessonId, {
        date,
        startTime,
        endTime,
        content: content.trim() || undefined,
        homework: homework.trim() || undefined,
      });
    } catch (error) {
      showSaveError(error, "Erro ao salvar aula");
      return;
    }
    setBaseline({ date, start: startTime, duration, customEnd, content, homework });
    const failed = await uploadPending(lessonId);
    setPending(failed);
    if (pending.length) await reloadAttachments?.();
    if (failed.length) {
      toast.show(`Aula salva, mas ${failed.length} anexo(s) não foram enviados. Tente novamente.`, "error");
      return;
    }
    markSaved();
    toast.show("Aula atualizada", "success");
    router.back();
  };

  const save = async () => {
    if (saving || checking || hasConflict) return;
    const found = validate();
    if (found.enrollment || found.date || found.time) {
      setErrors(found);
      focusInvalid(found);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await (lesson ? updateLesson(lesson.id) : createLesson());
    } finally {
      setSaving(false);
    }
  };

  const removeSaved = async (attachment: LessonAttachment) => {
    if (!lesson) return;
    const accepted = await confirm({ title: "Remover anexo?", message: attachment.fileName, confirmLabel: "Remover", destructive: true });
    if (!accepted) return;
    try {
      await teacherService.deleteLessonAttachment(lesson.id, attachment.id);
      toast.show("Anexo removido", "success");
      await reloadAttachments?.();
    } catch (error) {
      toast.show(apiErrorMessage(error, "Não foi possível remover o anexo."), "error");
    }
  };

  const saveLabel = editing || completed ? "Salvar aula" : "Agendar aula";

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <TeacherStackHeader />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View onLayout={(event) => { fieldPositions.current.enrollment = event.nativeEvent.layout.y; }}>
          {lesson ? (
            <View style={styles.identity}>
              <TeacherStudentIdentity name={lesson.studentName} instrument={lesson.instrument} />
              <StatusChip label={lessonStatusLabel(lesson.status)} tone={lessonStatusTone(lesson.status)} />
            </View>
          ) : enrollments.loading ? (
            <ScreenState loading />
          ) : enrollments.error ? (
            <ScreenState message={apiErrorMessage(enrollments.error, "Erro ao carregar alunos")} retry={() => void enrollments.reload()} />
          ) : (
            <EnrollmentPicker
              ref={enrollmentRef}
              identity
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
        </View>
        <View onLayout={(event) => { fieldPositions.current.date = event.nativeEvent.layout.y; }}>
          {canSchedule ? (
            <>
              <DateTimeField ref={dateRef} mode="date" label="Data" value={date} onChange={(value) => { setDate(value); clearError("date"); }} error={errors.date} />
              {!validateDate(date) ? <Text style={styles.caption}>{relativeDayLabel(date)} · {formatFullDate(date)}</Text> : null}
            </>
          ) : lesson ? (
            <View style={styles.readOnlyField}>
              <Text style={styles.label}>Data</Text>
              <Text style={styles.statusText}>{formatFullDate(lesson.date)} · {hhmm(lesson.startTime)}–{hhmm(lesson.endTime)}</Text>
              {readOnly ? null : <Text style={styles.caption}>Aula concluída: a data não muda. Conteúdo, tarefa e anexos podem ser editados.</Text>}
            </View>
          ) : null}
        </View>
        <TextField label="Conteúdo trabalhado" placeholder="Ex.: escalas maiores, música X" value={content} onChangeText={setContent} multiline maxLength={TEXT_LIMIT} editable={!readOnly} />
        <TextField label="Tarefa para casa" placeholder="O que o aluno deve praticar" value={homework} onChangeText={setHomework} style={[styles.homeworkInput, { height: homeworkHeight }]} onContentSizeChange={(event) => setHomeworkHeight(Math.max(32, event.nativeEvent.contentSize.height))} multiline maxLength={TEXT_LIMIT} editable={!readOnly} />
        <LessonAttachmentList
          saved={existing?.attachments ?? []}
          pending={pending}
          onAdd={(file) => setPending((current) => [...current, file])}
          onRemovePending={(index) => setPending((current) => current.filter((_, position) => position !== index))}
          onRemoveSaved={(attachment) => void removeSaved(attachment)}
          downloadSaved={(attachment) => teacherService.downloadLessonAttachment(lesson?.id ?? "", attachment.id)}
          readOnly={readOnly}
          disabled={saving}
        />
        {canSchedule ? (
          <View style={styles.scheduling} onLayout={(event) => { fieldPositions.current.scheduling = event.nativeEvent.layout.y; }}>
            <Text accessibilityRole="header" style={styles.section}>Agendamento</Text>
            <View style={styles.row} onLayout={(event) => { fieldPositions.current.time = event.nativeEvent.layout.y; }}>
              <DateTimeField ref={timeRef} mode="time" label="Início" value={startTime} onChange={changeStart} />
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

            <Text accessibilityRole="header" style={styles.section}>Disponibilidade</Text>
            <SlotPlanner
              availability={slot.data ?? null}
              checking={slot.checking}
              error={slot.error}
              verified={verified}
              startTime={startTime}
              durationMin={durationMin}
              onPickStart={changeStart}
              onUseSchedule={(block) => applySchedule(shortTime(block.startTime), shortTime(block.endTime))}
            />

            {editing ? null : (
              <>
                <Text accessibilityRole="header" style={styles.section}>Situação da aula</Text>
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
              </>
            )}
          </View>
        ) : null}

        {errors.form ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.form}</Text> : null}
        {readOnly ? (
          <Text style={styles.caption}>Aula cancelada: somente leitura.</Text>
        ) : (
          <Button
            label={saveLabel}
            icon="checkmark"
            onPress={save}
            loading={saving}
            disabled={(!editing && (enrollments.loading || !!enrollments.error)) || hasConflict || checking}
            accessibilityHint={hasConflict ? "Escolha um horário sem conflito" : undefined}
          />
        )}
        {hasConflict ? <Text style={styles.caption}>Escolha um horário livre para liberar o agendamento.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md },
  section: { ...type.heading, marginTop: space.md },
  scheduling: { gap: space.md },
  identity: { gap: space.sm },
  readOnlyField: { gap: 6 },
  homeworkInput: { minHeight: 32 },
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
