import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { KeyboardScreen } from "@/ui/KeyboardScreen";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { LessonAttachment } from "@/features/student/studentService";
import { teacherService, type TeacherLessonDetail } from "@/features/teacher/teacherService";
import { EnrollmentPicker, type EnrollmentPickerHandle } from "@/features/teacher/EnrollmentPicker";
import { LessonAttachmentList } from "@/features/teacher/LessonAttachmentList";
import { SlotPlanner } from "@/features/teacher/SlotPlanner";
import { TeacherStudentIdentity } from "@/features/teacher/TeacherStudentIdentity";
import { hhmm, lessonStatusLabel, lessonStatusTone, type LessonSection } from "@/features/teacher/agenda";
import { addMonths, DEFAULT_REPEAT_MONTHS, RECURRENCE_OPTIONS, validateDate, validateRepeatUntil, validateTimeRange, type LessonRecurrence } from "@/features/teacher/lessonForm";
import { addMinutes, DURATION_OPTIONS, durationBetween } from "@/features/teacher/scheduling";
import { slotKey, useSlotAvailability } from "@/features/teacher/useSlotAvailability";
import { useResource } from "@/hooks/use-resource";
import { confirm } from "@/lib/confirm";
import { formatFullDate, nowHhmm, relativeDayLabel, shortTime, todayIso } from "@/lib/format";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { ApiError } from "@/lib/http/apiError";
import { apiErrorKey, apiErrorMessage } from "@/lib/http/errorMessage";
import type { PickedFile } from "@/lib/http/formFile";
import { Button } from "@/ui/Button";
import { ChipGroup } from "@/ui/Chip";
import { DateTimeField, type DateTimeFieldHandle } from "@/ui/DateTimeField";
import { TeacherStackHeader } from "@/features/teacher/TeacherStackHeader";
import { ScreenState } from "@/ui/ScreenState";
import { StatusChip } from "@/ui/StatusChip";
import { TextField } from "@/ui/TextField";
import { useToast } from "@/ui/Toast";
import { colors, space, type } from "@/ui/theme";
import { goBack } from "@/lib/navigation";

const DEFAULT_START = "10:00";
const DEFAULT_DURATION = "60";
const CUSTOM = "custom";
const TEXT_LIMIT = 1000;

type FieldErrors = { enrollment?: string; date?: string; time?: string; repeatUntil?: string; form?: string };

const SECTION_TITLE: Record<LessonSection, string> = { schedule: "Remarcar aula", content: "Conteúdo da aula", practice: "Prática do aluno" };

const shortDate = (iso: string) => iso.split("-").reverse().join("/");

const durationLabel = (minutes: number) => (minutes === 60 ? "1h" : minutes === 90 ? "1h30" : `${minutes} min`);
const durationOptions = [
  ...DURATION_OPTIONS.map((minutes) => ({ value: `${minutes}`, label: durationLabel(minutes) })),
  { value: CUSTOM, label: "Outro" },
];

// Mirrors lesson-core LessonLifecyclePolicy.initialStatus until the server answers.
const localInitialStatus = (date: string, startTime: string) => {
  const now = new Date();
  const today = todayIso(now);
  const [hours, minutes] = startTime.split(":").map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  return date > today || (date === today && start > now) ? "SCHEDULED" : "DONE";
};

function initialSchedule(lesson?: TeacherLessonDetail["lesson"]) {
  if (!lesson) return { start: DEFAULT_START, duration: DEFAULT_DURATION, customEnd: addMinutes(DEFAULT_START, 60) };
  const start = hhmm(lesson.startTime);
  const end = hhmm(lesson.endTime);
  const minutes = durationBetween(start, end);
  const preset = (DURATION_OPTIONS as readonly number[]).includes(minutes);
  return { start, duration: preset ? `${minutes}` : CUSTOM, customEnd: end };
}

export function LessonForm({ id, section }: { id?: string; section?: LessonSection }) {
  return id ? <LessonEditLoader id={id} section={section} /> : <LessonEditor />;
}

function LessonEditLoader({ id, section }: { id: string; section?: LessonSection }) {
  const fetchLesson = useCallback(() => teacherService.lesson(id), [id]);
  const detail = useResource(fetchLesson, id, { refetchOnFocus: false });
  if (detail.data) return <LessonEditor existing={detail.data} section={section} reloadAttachments={detail.reload} />;
  return (
    <View style={styles.screen}>
      <TeacherStackHeader title={section ? SECTION_TITLE[section] : "Editar aula"} />
      {detail.error ? (
        <ScreenState message={apiErrorMessage(detail.error, "Não foi possível carregar a aula.")} retry={() => void detail.reload()} />
      ) : (
        <ScreenState loading />
      )}
    </View>
  );
}

type EditorProps = { existing?: TeacherLessonDetail; section?: LessonSection; reloadAttachments?: () => Promise<void> };

function LessonEditor({ existing, section, reloadAttachments }: EditorProps) {
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
  const showSchedule = !section || section === "schedule";
  const showContent = editing && (!section || section === "content");
  const showPractice = editing && (!section || section === "practice");
  const canSchedule = !editing || (showSchedule && lesson.status === "SCHEDULED");
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
  const [recurrence, setRecurrence] = useState<LessonRecurrence>("NONE");
  const [repeatUntil, setRepeatUntil] = useState(addMonths(initialDate, DEFAULT_REPEAT_MONTHS));
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
  const completed = editing ? lesson.status === "DONE" : (slot.data?.initialStatus ?? localInitialStatus(date, startTime)) === "DONE";

  const studentEnrollments = enrollments.data?.filter((item) => item.studentId === params.studentId) ?? [];
  const preselectedId = editing ? enrollmentId : studentEnrollments.length === 1 ? studentEnrollments[0].id : "";
  const initialQuery = studentEnrollments.length > 1 ? studentEnrollments[0].studentName : "";

  useEffect(() => {
    if (!editing && preselectedId) setEnrollmentId(preselectedId);
  }, [editing, preselectedId]);

  const formDirty = date !== baseline.date || startTime !== baseline.start || duration !== baseline.duration
    || customEnd !== baseline.customEnd || content.trim() !== baseline.content.trim() || homework.trim() !== baseline.homework.trim();
  const dirty = formDirty || pending.length > 0 || enrollmentId !== preselectedId || recurrence !== "NONE";
  const markSaved = useUnsavedChangesGuard(dirty);

  const clearError = (field: keyof FieldErrors) => setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));

  const changeDate = (value: string) => {
    setDate(value);
    if (!validateDate(value)) setRepeatUntil(addMonths(value, DEFAULT_REPEAT_MONTHS));
    clearError("date");
  };

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
    repeatUntil: !editing && recurrence !== "NONE" ? validateRepeatUntil(date, repeatUntil) ?? undefined : undefined,
  });

  const focusInvalid = (found: FieldErrors) => {
    const field = found.enrollment ? "enrollment" : found.date ? "date" : found.time ? "time" : null;
    if (!field) return;
    const fieldRef = field === "enrollment" ? enrollmentRef : field === "date" ? dateRef : timeRef;
    fieldRef.current?.focus();
    const y = fieldPositions.current[field] + (field !== "enrollment" ? fieldPositions.current.scheduling : 0);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - space.sm), animated: true });
  };

  const showSaveError = (error: unknown, fallback: string) => {
    const conflictDates = error instanceof ApiError && error.code === "SCHEDULE_CONFLICT" ? error.fields : [];
    const message = conflictDates.length
      ? `Conflito de horário em ${conflictDates.map(shortDate).join(", ")}. Nenhuma aula foi criada.`
      : apiErrorMessage(error, fallback);
    const found = { [apiErrorKey(error, ["enrollment", "date", "time"])]: message };
    setErrors(found);
    focusInvalid(found);
  };

  const uploadPending = async (lessonId: string) => {
    const failed: PickedFile[] = [];
    let reason = "";
    for (const file of pending) {
      try {
        await teacherService.uploadLessonAttachment(lessonId, file);
      } catch (error) {
        failed.push(file);
        reason ||= apiErrorMessage(error, "falha no envio");
      }
    }
    return { failed, reason };
  };

  const createLesson = async () => {
    const repeats = recurrence !== "NONE";
    try {
      const created = await teacherService.newLesson({
        enrollmentId,
        date,
        startTime,
        endTime,
        ...(repeats ? { recurrence, repeatUntil } : {}),
      });
      markSaved();
      toast.show(
        created.occurrences > 1 ? `${created.occurrences} aulas agendadas até ${shortDate(repeatUntil)}`
          : completed ? "Aula registrada" : "Aula agendada",
        "success",
      );
    } catch (error) {
      showSaveError(error, "Erro ao registrar aula");
      return;
    }
    goBack(router);
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
    const { failed, reason } = await uploadPending(lessonId);
    setPending(failed);
    if (pending.length) await reloadAttachments?.();
    if (failed.length) {
      toast.show(`Aula salva, mas ${failed.length} anexo(s) não foram enviados: ${reason}`, "error");
      return;
    }
    markSaved();
    toast.show("Aula atualizada", "success");
    goBack(router);
  };

  const save = async () => {
    if (saving || checking || hasConflict) return;
    const found = validate();
    if (found.enrollment || found.date || found.time || found.repeatUntil) {
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

  const saveLabel = recurrence !== "NONE" ? "Agendar aulas" : editing || completed ? "Salvar aula" : "Agendar aula";
  const title = editing ? (section ? SECTION_TITLE[section] : "Editar aula") : "Nova aula";

  return (
    <KeyboardScreen style={styles.screen}>
      <TeacherStackHeader title={title} />
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
        <View style={styles.scheduling} onLayout={(event) => { fieldPositions.current.scheduling = event.nativeEvent.layout.y; }}>
          <Text accessibilityRole="header" style={styles.section}>Quando</Text>
          <View onLayout={(event) => { fieldPositions.current.date = event.nativeEvent.layout.y; }}>
            {canSchedule ? (
              <>
                <DateTimeField ref={dateRef} mode="date" label="Data" value={date} onChange={changeDate} error={errors.date} />
                {!validateDate(date) ? <Text style={styles.caption}>{relativeDayLabel(date)} · {formatFullDate(date)}</Text> : null}
              </>
            ) : lesson ? (
              <View style={styles.readOnlyField}>
                <Text style={styles.label}>Data</Text>
                <Text style={styles.statusText}>{formatFullDate(lesson.date)} · {hhmm(lesson.startTime)}–{hhmm(lesson.endTime)}</Text>
                {readOnly || section ? null : <Text style={styles.caption}>Aula concluída: a data não muda. Conteúdo, prática e anexos podem ser editados.</Text>}
              </View>
            ) : null}
          </View>
          {canSchedule ? (
            <>
              <View style={styles.row} onLayout={(event) => { fieldPositions.current.time = event.nativeEvent.layout.y; }}>
                <DateTimeField ref={timeRef} mode="time" label="Início" value={startTime} onChange={changeStart} />
              </View>
              <ChipGroup label="Duração" options={durationOptions} value={duration} onChange={changeDuration} />
              <View style={styles.row}>
                {duration === CUSTOM ? (
                  <DateTimeField mode="time" label="Fim" value={customEnd} onChange={(value) => { setCustomEnd(value); clearError("time"); }} />
                ) : (
                  <View style={styles.endPreview} accessible accessibilityLabel={`Fim às ${endTime}`}>
                    <Text style={styles.label}>Fim</Text>
                    <Text style={styles.endValue}>{endTime}</Text>
                  </View>
                )}
              </View>

              <Text accessibilityRole="header" style={styles.section}>Disponibilidade</Text>
              <SlotPlanner
                availability={slot.data ?? null}
                checking={slot.checking}
                error={slot.error}
                verified={verified}
                startTime={startTime}
                durationMin={durationMin}
                earliestStart={date === todayIso() ? nowHhmm() : null}
                onPickStart={changeStart}
                onUseSchedule={(block) => applySchedule(shortTime(block.startTime), shortTime(block.endTime))}
              />
              {errors.time ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.time}</Text> : null}
            </>
          ) : null}
        </View>
        {editing ? null : (
          <>
            <Text accessibilityRole="header" style={styles.section}>Repetição</Text>
            <ChipGroup label="Repetição" options={RECURRENCE_OPTIONS} value={recurrence} onChange={(value) => { setRecurrence(value as LessonRecurrence); clearError("repeatUntil"); }} />
            {recurrence === "NONE" ? null : (
              <>
                <DateTimeField mode="date" label="Repetir até" value={repeatUntil} onChange={(value) => { setRepeatUntil(value); clearError("repeatUntil"); }} error={errors.repeatUntil} />
                <Text style={styles.caption}>Cada aula é criada na agenda. Se alguma data tiver conflito, nenhuma é criada.</Text>
              </>
            )}
          </>
        )}
        {showContent ? (
          <>
            <TextField label="Conteúdo trabalhado" placeholder="Ex.: escalas maiores, música X" value={content} onChangeText={setContent} multiline maxLength={TEXT_LIMIT} editable={!readOnly} />
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
          </>
        ) : null}
        {showPractice ? (
          <TextField label="Prática para o aluno" placeholder="O que o aluno deve praticar até a próxima aula" value={homework} onChangeText={setHomework} style={[styles.homeworkInput, { height: homeworkHeight }]} onContentSizeChange={(event) => setHomeworkHeight(Math.max(32, event.nativeEvent.contentSize.height))} multiline maxLength={TEXT_LIMIT} editable={!readOnly} />
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
    </KeyboardScreen>
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
  statusText: { ...type.body },
  error: { color: colors.danger, fontSize: 13 },
});
