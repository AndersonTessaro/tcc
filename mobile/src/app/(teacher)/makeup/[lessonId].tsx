import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { teacherService, type MakeupLink } from "@/features/teacher/teacherService";
import { hhmm, scheduleHref } from "@/features/teacher/agenda";
import { oneHourAfter, validateDate, validateTimeRange } from "@/features/teacher/lessonForm";
import { useResource } from "@/hooks/use-resource";
import { formatFullDate, todayIso } from "@/lib/format";
import { apiErrorKey, apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { DateTimeField } from "@/ui/DateTimeField";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { TextField } from "@/ui/TextField";
import { useToast } from "@/ui/Toast";
import { colors, space, type } from "@/ui/theme";

const DEFAULT_START = "10:00";

type Params = { lessonId?: string; studentName?: string; instrument?: string; originalDate?: string };
type FieldErrors = { date?: string; time?: string; form?: string };

const linkMessage = (link: MakeupLink) =>
  `Esta aula já tem uma reposição em ${formatFullDate(link.newLesson.date)} às ${hhmm(link.newLesson.startTime)}.`;

export default function Makeup() {
  const { lessonId, studentName, instrument, originalDate } = useLocalSearchParams<Params>();
  const router = useRouter();
  const toast = useToast();
  const existing = useResource(() => (lessonId ? teacherService.makeupLink(lessonId) : Promise.resolve(undefined)), lessonId ?? "", { refetchOnFocus: false });
  const [date, setDate] = useState(todayIso());
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(oneHourAfter(DEFAULT_START));
  const [endEdited, setEndEdited] = useState(false);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [created, setCreated] = useState<MakeupLink | null>(null);

  const link = created ?? existing.data;
  const original = link?.originalLesson;
  const contextStudent = original?.studentName ?? studentName;
  const contextInstrument = original?.instrument ?? instrument;
  const contextDate = original?.date ?? originalDate;
  const locked = !!link || existing.loading || !!existing.error;

  const changeStart = (value: string) => {
    setStartTime(value);
    setErrors(({ time: _time, ...rest }) => rest);
    const suggested = oneHourAfter(value);
    if (!endEdited && suggested) setEndTime(suggested);
  };

  const save = async () => {
    if (locked) return;
    if (!lessonId) {
      setErrors({ form: "Aula não informada" });
      return;
    }
    const found: FieldErrors = { date: validateDate(date) ?? undefined, time: validateTimeRange(startTime, endTime) ?? undefined };
    if (found.date || found.time) {
      setErrors(found);
      return;
    }
    setErrors({});
    try {
      const result = await teacherService.makeup(lessonId, { date, startTime, endTime, reason: reason.trim() || undefined });
      setCreated(result);
      toast.show("Reposição agendada", "success");
    } catch (error) {
      setErrors({ [apiErrorKey(error, ["date", "time"])]: apiErrorMessage(error, "Erro ao agendar reposição") });
    }
  };

  const backToSchedule = () => router.replace(scheduleHref(link?.newLesson.date ?? date));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenHeader title="Reposição" back />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {contextStudent || contextDate ? (
          <Card style={styles.context}>
            <Text style={styles.contextLabel}>Aula original</Text>
            {contextStudent ? <Text style={styles.contextTitle}>{[contextStudent, contextInstrument].filter(Boolean).join(" · ")}</Text> : null}
            {contextDate ? <Text style={styles.contextText}>{formatFullDate(contextDate)}</Text> : null}
            {link?.reason ? <Text style={styles.contextText}>Motivo: {link.reason}</Text> : null}
          </Card>
        ) : null}

        {existing.error ? (
          <ScreenState message={apiErrorMessage(existing.error, "Não foi possível consultar a reposição.")} retry={() => void existing.reload()} />
        ) : null}

        {link ? (
          <Card style={styles.done}>
            <Text accessibilityLiveRegion="polite" style={styles.doneText}>
              {created
                ? `Reposição agendada para ${formatFullDate(created.newLesson.date)} às ${hhmm(created.newLesson.startTime)}.`
                : linkMessage(link)}
            </Text>
            <Button label="Voltar à agenda" variant="secondary" icon="calendar-outline" onPress={backToSchedule} />
          </Card>
        ) : null}

        {link ? null : (
          <>
            <Text accessibilityRole="header" style={styles.section}>Nova data</Text>
            <DateTimeField mode="date" label="Data" value={date} onChange={(value) => { setDate(value); setErrors(({ date: _date, ...rest }) => rest); }} error={errors.date} />
            <View style={styles.row}>
              <DateTimeField mode="time" label="Início" value={startTime} onChange={changeStart} />
              <DateTimeField mode="time" label="Fim" value={endTime} onChange={(value) => { setEndEdited(true); setEndTime(value); setErrors(({ time: _time, ...rest }) => rest); }} />
            </View>
            {errors.time ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.time}</Text> : null}
            <TextField label="Motivo" placeholder="Ex.: aluno faltou por doença (opcional)" value={reason} onChangeText={setReason} editable={!locked} maxLength={255} />

            {errors.form ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors.form}</Text> : null}
            <Button label="Agendar reposição" icon="repeat" onPress={save} loading={existing.loading} disabled={locked} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md },
  context: { gap: space.xs },
  contextLabel: { ...type.caption },
  contextTitle: { ...type.bodyStrong },
  contextText: { ...type.body, color: colors.muted },
  done: { gap: space.md, backgroundColor: colors.successSoft },
  doneText: { ...type.bodyStrong, color: colors.success },
  section: { ...type.heading, marginTop: space.sm },
  row: { flexDirection: "row", gap: space.md },
  error: { color: colors.danger, fontSize: 13 },
});
