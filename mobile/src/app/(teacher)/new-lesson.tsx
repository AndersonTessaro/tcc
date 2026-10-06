import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { teacherService } from "@/features/teacher/teacherService";
import { EnrollmentPicker } from "@/features/teacher/EnrollmentPicker";
import { oneHourAfter, validateDate, validateTimeRange } from "@/features/teacher/lessonForm";
import { useResource } from "@/hooks/use-resource";
import { todayIso } from "@/lib/format";
import { confirm } from "@/lib/confirm";
import { apiErrorKey, apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { DateTimeField } from "@/ui/DateTimeField";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { TextField } from "@/ui/TextField";
import { useToast } from "@/ui/Toast";
import { colors, space, type } from "@/ui/theme";

const DEFAULT_START = "10:00";

type FieldErrors = { enrollment?: string; date?: string; time?: string; form?: string };

export default function NewLesson() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ studentId?: string; date?: string }>();
  const initialDate = params.date && !validateDate(params.date) ? params.date : todayIso();
  const enrollments = useResource(() => teacherService.enrollments(), "", { refetchOnFocus: false });
  const [enrollmentId, setEnrollmentId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(oneHourAfter(DEFAULT_START));
  const [endEdited, setEndEdited] = useState(false);
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const studentEnrollments = enrollments.data?.filter((item) => item.studentId === params.studentId) ?? [];
  const preselectedId = studentEnrollments.length === 1 ? studentEnrollments[0].id : "";
  const initialQuery = studentEnrollments.length > 1 ? studentEnrollments[0].studentName : "";

  useEffect(() => {
    if (preselectedId) setEnrollmentId(preselectedId);
  }, [preselectedId]);

  const dirty = enrollmentId !== preselectedId || date !== initialDate || startTime !== DEFAULT_START || endEdited || !!content.trim() || !!homework.trim();

  const goBack = async () => {
    if (dirty && !(await confirm({ title: "Descartar aula?", message: "Os dados preenchidos serão perdidos.", confirmLabel: "Descartar", destructive: true }))) return;
    router.back();
  };

  const changeStart = (value: string) => {
    setStartTime(value);
    setErrors(({ time: _time, ...rest }) => rest);
    const suggested = oneHourAfter(value);
    if (!endEdited && suggested) setEndTime(suggested);
  };

  const changeEnd = (value: string) => {
    setEndEdited(true);
    setEndTime(value);
    setErrors(({ time: _time, ...rest }) => rest);
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
    try {
      await teacherService.newLesson({
        enrollmentId,
        date,
        startTime,
        endTime,
        content: content.trim() || undefined,
        homework: homework.trim() || undefined,
      });
      toast.show("Aula registrada", "success");
      router.back();
    } catch (error) {
      const message = apiErrorMessage(error, "Erro ao registrar aula");
      setErrors({ [apiErrorKey(error, ["enrollment", "date", "time"])]: message });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenHeader title="Nova aula" back onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text accessibilityRole="header" style={styles.section}>Aluno e instrumento</Text>
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
              setErrors(({ enrollment: _enrollment, ...rest }) => rest);
            }}
            error={errors.enrollment}
          />
        )}
        {errors.enrollment && enrollmentId ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.enrollment}</Text> : null}

        <Text accessibilityRole="header" style={styles.section}>Quando</Text>
        <DateTimeField mode="date" label="Data" value={date} onChange={(value) => { setDate(value); setErrors(({ date: _date, ...rest }) => rest); }} error={errors.date} />
        <View style={styles.row}>
          <DateTimeField mode="time" label="Início" value={startTime} onChange={changeStart} />
          <DateTimeField mode="time" label="Fim" value={endTime} onChange={changeEnd} />
        </View>
        {errors.time ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.time}</Text> : null}

        <Text accessibilityRole="header" style={styles.section}>Registro</Text>
        <TextField label="Conteúdo trabalhado" placeholder="Ex.: escalas maiores, música X" value={content} onChangeText={setContent} multiline maxLength={2000} />
        <TextField label="Tarefa para casa" placeholder="O que o aluno deve praticar" value={homework} onChangeText={setHomework} multiline maxLength={2000} />

        {errors.form ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.form}</Text> : null}
        <Button label="Salvar aula" icon="checkmark" onPress={save} disabled={enrollments.loading || !!enrollments.error} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md },
  section: { ...type.heading, marginTop: space.sm },
  row: { flexDirection: "row", gap: space.md },
  error: { color: colors.danger, fontSize: 13 },
});
