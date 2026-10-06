import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { teacherService, type TeacherLesson } from "@/features/teacher/teacherService";
import { hhmm, lessonStatusLabel, lessonStatusTone, scheduleHref } from "@/features/teacher/agenda";
import { validateDate } from "@/features/teacher/lessonForm";
import { useResource } from "@/hooks/use-resource";
import { addDays, formatFullDate, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ChipGroup } from "@/ui/Chip";
import { DateTimeField } from "@/ui/DateTimeField";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { StatusChip } from "@/ui/StatusChip";
import { colors, space, type } from "@/ui/theme";

type Preset = "week" | "month30" | "thisMonth" | "custom";
type Range = { start: string; end: string };

const PRESETS: { value: Preset; label: string }[] = [
  { value: "week", label: "7 dias" },
  { value: "month30", label: "30 dias" },
  { value: "thisMonth", label: "Este mês" },
  { value: "custom", label: "Personalizado" },
];

function presetRange(preset: Exclude<Preset, "custom">, today: string): Range {
  if (preset === "week") return { start: addDays(today, -6), end: today };
  if (preset === "thisMonth") return { start: `${today.slice(0, 8)}01`, end: today };
  return { start: addDays(today, -30), end: today };
}

export default function History() {
  const router = useRouter();
  const today = todayIso();
  const [preset, setPreset] = useState<Preset>("month30");
  const [range, setRange] = useState<Range>(() => presetRange("month30", today));
  const [draft, setDraft] = useState<Range>(range);
  const [rangeError, setRangeError] = useState("");
  const lessons = useResource(() => teacherService.history(range.start, range.end), `${range.start}|${range.end}`);

  const choosePreset = (value: Preset) => {
    setPreset(value);
    setRangeError("");
    if (value === "custom") {
      setDraft(range);
      return;
    }
    setRange(presetRange(value, today));
  };

  const applyCustom = () => {
    if (validateDate(draft.start) || validateDate(draft.end) || draft.start > draft.end) {
      setRangeError("Informe um período válido, com início até o fim");
      return;
    }
    setRangeError("");
    if (draft.start === range.start && draft.end === range.end) void lessons.reload();
    else setRange(draft);
  };

  const header = (
    <View style={styles.filters}>
      <ChipGroup label="Período" options={PRESETS} value={preset} onChange={choosePreset} scroll />
      {preset === "custom" ? (
        <View style={styles.custom}>
          <View style={styles.row}>
            <DateTimeField mode="date" label="Data inicial" value={draft.start} onChange={(start) => setDraft((current) => ({ ...current, start }))} />
            <DateTimeField mode="date" label="Data final" value={draft.end} onChange={(end) => setDraft((current) => ({ ...current, end }))} />
          </View>
          {rangeError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{rangeError}</Text> : null}
          <Button label="Buscar aulas" icon="search" onPress={applyCustom} />
        </View>
      ) : null}
      <Text style={styles.rangeLabel}>{formatFullDate(range.start)} a {formatFullDate(range.end)}</Text>
    </View>
  );

  const empty = lessons.loading ? (
    <ScreenState loading skeleton />
  ) : lessons.error ? (
    <ScreenState message={apiErrorMessage(lessons.error, "Erro ao carregar histórico")} retry={() => void lessons.reload()} />
  ) : (
    <ScreenState icon="time-outline" title="Nenhuma aula neste período" message="Escolha outro período para ver mais aulas." />
  );

  const renderLesson = ({ item }: { item: TeacherLesson }) => (
    <Card
      onPress={() => router.push(scheduleHref(item.date))}
      accessibilityLabel={`${formatFullDate(item.date)}, ${hhmm(item.startTime)}, ${item.studentName}, ${lessonStatusLabel(item.status)}`}
      accessibilityHint="Abre o dia na agenda"
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{formatFullDate(item.date)} · {hhmm(item.startTime)}–{hhmm(item.endTime)}</Text>
        <StatusChip label={lessonStatusLabel(item.status)} tone={lessonStatusTone(item.status)} />
      </View>
      <Text style={styles.cardText}>{item.studentName} · {item.instrument}</Text>
    </Card>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Histórico de aulas" back />
      <FlatList
        data={lessons.data ?? []}
        keyExtractor={(lesson) => lesson.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={lessons.refreshing} onRefresh={lessons.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        renderItem={renderLesson}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md, flexGrow: 1 },
  filters: { gap: space.md },
  custom: { gap: space.md },
  row: { flexDirection: "row", gap: space.md },
  error: { color: colors.danger, fontSize: 13 },
  rangeLabel: { ...type.caption },
  card: { gap: space.xs },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  cardTitle: { ...type.bodyStrong, flex: 1 },
  cardText: { ...type.body, color: colors.muted },
});
