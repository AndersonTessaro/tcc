import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PracticeRecordingPicker } from "@/features/student/PracticeRecordingPicker";
import type { PickedFile } from "@/lib/http/formFile";
import { PracticeRewardView } from "@/features/student/PracticeReward";
import { practiceMoods } from "@/features/student/practiceMood";
import { practiceReward, type PracticeReward } from "@/features/student/reward";
import { studentService, type StudentProgress, type PracticeRegistration } from "@/features/student/studentService";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { addDays, isValidIsoDate, parseIsoDate, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { ChipGroup, type ChipOption } from "@/ui/Chip";
import { DateTimeField, type DateTimeFieldHandle } from "@/ui/DateTimeField";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { TextField } from "@/ui/TextField";
import { colors, MIN_TOUCH, radius, space, type } from "@/ui/theme";

type DateChoice = "today" | "yesterday" | "other";
type DurationChoice = "15" | "30" | "45" | "60" | "custom";

const DATE_OPTIONS: ChipOption<DateChoice>[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "other", label: "Outra data" },
];

const DURATION_OPTIONS: ChipOption<DurationChoice>[] = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1h" },
  { value: "custom", label: "Outro" },
];

const MAX_NOTES_LENGTH = 255;
const MAX_MINUTES = 24 * 60;
const MAX_BACKDATE_DAYS = 30;

function practiceDate(choice: DateChoice, otherDate: string): string {
  if (choice === "today") return todayIso();
  if (choice === "yesterday") return addDays(todayIso(), -1);
  return otherDate;
}

function practiceMinutes(value: string): number {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : 0;
}

export default function RegisterPractice() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const dateRef = useRef<DateTimeFieldHandle>(null);
  const minutesRef = useRef<TextInput>(null);
  const whatRef = useRef<TextInput>(null);
  const fieldPositions = useRef({ date: 0, minutes: 0, what: 0 });
  const [dateChoice, setDateChoice] = useState<DateChoice>("today");
  const [otherDate, setOtherDate] = useState(() => addDays(todayIso(), -2));
  const [durationChoice, setDurationChoice] = useState<DurationChoice>("30");
  const [customMinutes, setCustomMinutes] = useState("30");
  const [what, setWhat] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ date?: string; minutes?: string; notes?: string }>({});
  const [requestError, setRequestError] = useState("");
  const [reward, setReward] = useState<PracticeReward | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [recordingSelectionError, setRecordingSelectionError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedRegistration, setSavedRegistration] = useState<PracticeRegistration | null>(null);
  const savedRef = useRef<PracticeRegistration | null>(null);
  const savingRef = useRef(false);
  const fieldsDisabled = saving || !!savedRegistration;
  const markSaved = useUnsavedChangesGuard(dateChoice !== "today" || durationChoice !== "30" || customMinutes !== "30" || !!what || !!difficulty || mood !== null || !!file);
  const progressBefore = useRef<StudentProgress | null>(null);

  useEffect(() => {
    let active = true;
    studentService.progress()
      .then((progress) => { if (active) progressBefore.current = progress; })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const showReward = () => {
    if (savedRef.current) setReward(practiceReward(progressBefore.current, savedRef.current));
  };

  const save = async () => {
    if (savingRef.current || picking || recordingSelectionError) return;
    const date = practiceDate(dateChoice, otherDate);
    const minutes = practiceMinutes(customMinutes);
    const notes = what.trim();
    const nextErrors = {
      date: !isValidIsoDate(date) || date > todayIso() ? "Escolha uma data até hoje."
        : date < addDays(todayIso(), -MAX_BACKDATE_DAYS) ? "Só dá para registrar práticas dos últimos 30 dias." : undefined,
      minutes: minutes < 1 || minutes > MAX_MINUTES ? "Informe os minutos praticados (1 a 1440)." : undefined,
      notes: notes.length > MAX_NOTES_LENGTH ? `Resuma a descrição para até ${MAX_NOTES_LENGTH} caracteres.` : undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.date || nextErrors.minutes || nextErrors.notes) {
      const field = nextErrors.date ? "date" : nextErrors.minutes ? "minutes" : "what";
      const fieldRef = field === "date" ? dateRef : field === "minutes" ? minutesRef : whatRef;
      fieldRef.current?.focus();
      scrollRef.current?.scrollTo({ y: Math.max(0, fieldPositions.current[field] - space.sm), animated: true });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setRequestError("");
    try {
      if (!savedRef.current) {
        progressBefore.current ??= await studentService.progress().catch(() => null);
        const progress = await studentService.registerPractice({
          durationMin: minutes,
          date,
          notes: notes || undefined,
          difficulty: difficulty.trim() || undefined,
          rating: mood === null ? undefined : mood + 1,
        });
        savedRef.current = progress;
        setSavedRegistration(progress);
        markSaved();
      }
      if (file) {
        setUploading(true);
        await studentService.uploadPracticeRecording(savedRef.current.practiceId, file);
      }
      showReward();
    } catch (cause) {
      setRequestError(apiErrorMessage(cause, savedRef.current
        ? "A prática foi salva, mas o arquivo não foi enviado."
        : "Não foi possível salvar a prática. Tente novamente."));
    } finally {
      savingRef.current = false;
      setSaving(false);
      setUploading(false);
    }
  };

  if (reward) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <PracticeRewardView reward={reward} onDone={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Registrar prática" back />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.block} onLayout={(event) => { fieldPositions.current.date = event.nativeEvent.layout.y; }}>
          <DateTimeField
            ref={dateRef}
            disabled={fieldsDisabled}
            mode="date"
            label="Data"
            labelStyle={styles.label}
            fieldStyle={styles.field}
            value={practiceDate(dateChoice, otherDate)}
            onChange={(value) => { setOtherDate(value); setDateChoice("other"); }}
            minimumDate={parseIsoDate(addDays(todayIso(), -MAX_BACKDATE_DAYS))}
            maximumDate={parseIsoDate(todayIso())}
            error={errors.date}
          />
          <ChipGroup disabled={fieldsDisabled} label="Data da prática" options={DATE_OPTIONS} value={dateChoice} onChange={setDateChoice} />
        </View>

        <View style={styles.block} onLayout={(event) => { fieldPositions.current.minutes = event.nativeEvent.layout.y; }}>
          <TextField
            editable={!fieldsDisabled}
            ref={minutesRef}
            label="Tempo de prática"
            labelStyle={styles.label}
            fieldStyle={styles.field}
            accessibilityLabel="Tempo de prática em minutos"
            keyboardType="number-pad"
            returnKeyType="done"
            placeholder="Ex.: 90"
            hint="Em minutos"
            value={customMinutes}
            onChangeText={(value) => { setCustomMinutes(value); setDurationChoice("custom"); }}
            maxLength={4}
            error={errors.minutes}
          />
          <ChipGroup disabled={fieldsDisabled} label="Duração rápida" options={DURATION_OPTIONS} value={durationChoice} onChange={(value) => {
            setDurationChoice(value);
            if (value !== "custom") setCustomMinutes(value);
            else { setCustomMinutes(""); minutesRef.current?.focus(); }
          }} />
        </View>

        <View style={styles.block} onLayout={(event) => { fieldPositions.current.what = event.nativeEvent.layout.y; }}>
          <Text style={styles.label}>O que praticou? <Text style={styles.optional}>(opcional)</Text></Text>
          <TextField editable={!fieldsDisabled} ref={whatRef} accessibilityLabel="O que praticou? (opcional)" fieldStyle={styles.field} style={styles.notesInput} placeholder="Ex.: escalas, música nova…" autoComplete="off" value={what} onChangeText={setWhat} multiline maxLength={MAX_NOTES_LENGTH} error={errors.notes} />
        </View>
        <View style={styles.block}>
          <Text style={styles.label}>Dificuldade encontrada <Text style={styles.optional}>(opcional)</Text></Text>
          <TextField editable={!fieldsDisabled} accessibilityLabel="Dificuldade encontrada (opcional)" fieldStyle={styles.field} autoComplete="off" value={difficulty} onChangeText={setDifficulty} maxLength={120} returnKeyType="done" />
        </View>

        <PracticeRecordingPicker file={file} onChange={setFile} error={recordingSelectionError} onError={setRecordingSelectionError} disabled={saving} onPickingChange={setPicking} />

        <View style={styles.block}>
          <Text style={styles.label}>Como foi a prática?</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Avaliação da prática" style={styles.moods}>
            {practiceMoods.map((source, index) => (
              <Pressable
                key={index}
                disabled={fieldsDisabled}
                aria-disabled={fieldsDisabled}
                accessibilityRole="radio"
                accessibilityLabel={`Avaliação ${index + 1} de 5`}
                aria-checked={mood === index}
                onPress={() => setMood((current) => (current === index ? null : index))}
                style={({ pressed }) => [styles.mood, mood === index && styles.selectedMood, pressed && styles.pressed]}
              >
                <Image source={source} style={styles.moodIcon} accessible={false} />
              </Pressable>
            ))}
          </View>
        </View>

        {requestError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{requestError}</Text> : null}
        {savedRegistration && requestError ? (
          <View style={styles.block}>
            <Button label={uploading ? "Enviando arquivo…" : "Tentar enviar de novo"} onPress={save} loading={saving} disabled={picking} />
            <Button label="Continuar sem arquivo" variant="secondary" onPress={showReward} disabled={saving || picking} />
          </View>
        ) : (
          <Button label={uploading ? "Enviando arquivo…" : "Salvar registro"} icon="checkmark" onPress={save} loading={saving} disabled={picking} style={styles.save} />
        )}
        {file ? <Text style={styles.hint}>Arquivos grandes podem levar alguns minutos.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  form: { flexGrow: 1, gap: space.xxl, paddingHorizontal: space.screenGutter, paddingBottom: space.xxl },
  block: { gap: space.sm },
  label: { ...type.formLabel },
  optional: { ...type.caption },
  field: { borderRadius: radius.lg, borderWidth: 1, backgroundColor: colors.surface },
  notesInput: { minHeight: 48 },
  moods: { flexDirection: "row", justifyContent: "space-between" },
  mood: { width: MIN_TOUCH + 8, height: MIN_TOUCH + 8, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, borderWidth: 2, borderColor: "transparent" },
  selectedMood: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
  moodIcon: { width: 32, height: 32 },
  hint: { ...type.caption },
  error: { color: colors.danger, fontSize: 13 },
  save: { marginTop: -space.sm, borderRadius: radius.lg },
});
