import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PracticeRewardView } from "@/features/student/PracticeReward";
import { practiceReward, type PracticeReward } from "@/features/student/reward";
import { studentService, type StudentProgress } from "@/features/student/studentService";
import { addDays, parseIsoDate, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { ChipGroup, type ChipOption } from "@/ui/Chip";
import { DateTimeField } from "@/ui/DateTimeField";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { TextField } from "@/ui/TextField";
import { colors, MIN_TOUCH, radius, space, type } from "@/ui/theme";

const moods = [
  require("@/assets/images/figma-student/mood-1.png"),
  require("@/assets/images/figma-student/mood-2.png"),
  require("@/assets/images/figma-student/mood-3.png"),
  require("@/assets/images/figma-student/mood-4.png"),
  require("@/assets/images/figma-student/mood-5.png"),
];

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

function practiceDate(choice: DateChoice, otherDate: string): string {
  if (choice === "today") return todayIso();
  if (choice === "yesterday") return addDays(todayIso(), -1);
  return otherDate;
}

function practiceMinutes(choice: DurationChoice, custom: string): number {
  if (choice !== "custom") return Number(choice);
  return /^\d+$/.test(custom.trim()) ? Number(custom.trim()) : 0;
}

function buildNotes(what: string, difficulty: string, mood: number | null): string {
  return [what.trim(), difficulty.trim() && `Dificuldade: ${difficulty.trim()}`, mood != null && `Avaliação: ${mood + 1}/5`]
    .filter(Boolean).join("; ");
}

export default function RegisterPractice() {
  const router = useRouter();
  const [dateChoice, setDateChoice] = useState<DateChoice>("today");
  const [otherDate, setOtherDate] = useState(() => addDays(todayIso(), -2));
  const [durationChoice, setDurationChoice] = useState<DurationChoice>("30");
  const [customMinutes, setCustomMinutes] = useState("");
  const [what, setWhat] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ date?: string; minutes?: string; notes?: string }>({});
  const [requestError, setRequestError] = useState("");
  const [reward, setReward] = useState<PracticeReward | null>(null);
  const progressBefore = useRef<StudentProgress | null>(null);

  useEffect(() => {
    let active = true;
    studentService.progress()
      .then((progress) => { if (active) progressBefore.current = progress; })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const save = async () => {
    const date = practiceDate(dateChoice, otherDate);
    const minutes = practiceMinutes(durationChoice, customMinutes);
    const notes = buildNotes(what, difficulty, mood);
    const nextErrors = {
      date: !date || date > todayIso() ? "Escolha uma data até hoje." : undefined,
      minutes: minutes < 1 || minutes > MAX_MINUTES ? "Informe os minutos praticados (1 a 1440)." : undefined,
      notes: notes.length > MAX_NOTES_LENGTH ? `Resuma a descrição para até ${MAX_NOTES_LENGTH} caracteres.` : undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.date || nextErrors.minutes || nextErrors.notes) return;
    setRequestError("");
    try {
      const before = progressBefore.current ?? await studentService.progress().catch(() => null);
      const progress = await studentService.registerPractice(minutes, notes || undefined, date);
      setReward(practiceReward(before, progress));
    } catch (cause) {
      setRequestError(apiErrorMessage(cause, "Não foi possível salvar a prática. Tente novamente."));
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
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.block}>
          <Text style={styles.label}>Quando?</Text>
          <ChipGroup label="Data da prática" options={DATE_OPTIONS} value={dateChoice} onChange={setDateChoice} />
          {dateChoice === "other" ? (
            <DateTimeField mode="date" label="Data" value={otherDate} onChange={setOtherDate} maximumDate={parseIsoDate(todayIso())} />
          ) : null}
          {errors.date ? <Text accessibilityRole="alert" style={styles.error}>{errors.date}</Text> : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Quanto tempo?</Text>
          <ChipGroup label="Tempo de prática" options={DURATION_OPTIONS} value={durationChoice} onChange={setDurationChoice} />
          {durationChoice === "custom" ? (
            <TextField
              label="Minutos praticados"
              keyboardType="number-pad"
              returnKeyType="done"
              placeholder="Ex.: 90"
              value={customMinutes}
              onChangeText={setCustomMinutes}
              maxLength={4}
              error={errors.minutes}
            />
          ) : null}
        </View>

        <TextField label="O que praticou? (opcional)" placeholder="Ex.: escalas, música nova..." value={what} onChangeText={setWhat} multiline maxLength={MAX_NOTES_LENGTH} error={errors.notes} />
        <TextField label="Dificuldade encontrada (opcional)" value={difficulty} onChangeText={setDifficulty} maxLength={120} returnKeyType="done" />

        <View style={styles.block}>
          <Text style={styles.label}>Como foi a prática?</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Avaliação da prática" style={styles.moods}>
            {moods.map((source, index) => (
              <Pressable
                key={index}
                accessibilityRole="radio"
                accessibilityLabel={`Avaliação ${index + 1} de 5`}
                accessibilityState={{ selected: mood === index, checked: mood === index }}
                onPress={() => setMood((current) => (current === index ? null : index))}
                style={({ pressed }) => [styles.mood, mood === index && styles.selectedMood, pressed && styles.pressed]}
              >
                <Image source={source} style={styles.moodIcon} accessible={false} />
              </Pressable>
            ))}
          </View>
        </View>

        {requestError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{requestError}</Text> : null}
        <Button label="Salvar registro" icon="checkmark" onPress={save} style={styles.save} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  form: { flexGrow: 1, gap: space.xl, paddingHorizontal: space.xl, paddingBottom: space.xxl },
  block: { gap: space.sm },
  label: { ...type.label },
  moods: { flexDirection: "row", justifyContent: "space-between" },
  mood: { width: MIN_TOUCH + 8, height: MIN_TOUCH + 8, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, borderWidth: 2, borderColor: "transparent" },
  selectedMood: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
  moodIcon: { width: 32, height: 32 },
  error: { color: colors.danger, fontSize: 13 },
  save: { marginTop: "auto" },
});
