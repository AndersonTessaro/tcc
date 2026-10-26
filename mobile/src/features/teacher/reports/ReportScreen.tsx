import { useRef, useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";
import { useResource } from "@/hooks/use-resource";
import { addDays, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";
import { ChipGroup, type ChipOption } from "@/ui/Chip";
import { ProgressBar } from "@/ui/ProgressBar";
import { TabHeader } from "@/ui/TabHeader";
import { IconButton } from "@/ui/IconButton";
import { ScreenState } from "@/ui/ScreenState";
import { colors, space, type } from "@/ui/theme";

type ReportRange = "30" | "90";

const RANGE_OPTIONS: ChipOption<ReportRange>[] = [
  { value: "30", label: "30 dias", accessibilityLabel: "Últimos 30 dias" },
  { value: "90", label: "90 dias", accessibilityLabel: "Últimos 90 dias" },
];

export const LOW_ATTENDANCE = 75;

export function rangeDates(range: ReportRange, today = todayIso()) {
  return { from: addDays(today, -(Number(range) - 1)), to: today };
}

export function percentLabel(rate: number | null): string {
  return rate == null ? "—" : `${rate}%`;
}

export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function ratingLabel(rating: number | null): string {
  return rating == null ? "—" : rating.toFixed(1).replace(".", ",");
}

type ReportScreenProps<T> = {
  title: string;
  onBack: () => void;
  load: (from: string, to: string) => Promise<T>;
  isEmpty: (data: T) => boolean;
  emptyTitle: string;
  render: (data: T) => ReactNode;
};

export function ReportScreen<T>({ title, onBack, load, isEmpty, emptyTitle, render }: ReportScreenProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollToTop(scrollRef);
  const [range, setRange] = useState<ReportRange>("30");
  const report = useResource(() => {
    const { from, to } = rangeDates(range);
    return load(from, to);
  }, range);

  let body: ReactNode;
  if (report.loading) body = <ScreenState loading skeleton />;
  else if (report.error || !report.data)
    body = <ScreenState message={apiErrorMessage(report.error, "Não foi possível carregar o relatório.")} retry={() => void report.reload()} />;
  else if (isEmpty(report.data)) body = <ScreenState icon="bar-chart-outline" title={emptyTitle} />;
  else body = render(report.data);

  return (
    <View style={styles.screen}>
      <TabHeader title={title} right={<IconButton icon="arrow-back" label="Voltar" color={colors.onBrand} onPress={onBack} />} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={report.refreshing} onRefresh={report.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <ChipGroup label="Período" options={RANGE_OPTIONS} value={range} onChange={setRange} />
        {body}
      </ScrollView>
    </View>
  );
}

export function ReportSummary({ headline, caption, lines }: { headline: string; caption: string; lines: string[] }) {
  return (
    <Card style={styles.summary}>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.caption}>{caption}</Text>
      {lines.map((line) => <Text key={line} style={styles.line}>{line}</Text>)}
    </Card>
  );
}

export function ReportSection({ title }: { title: string }) {
  return <Text accessibilityRole="header" style={styles.section}>{title}</Text>;
}

type ReportBarRowProps = {
  title: string;
  valueLabel: string;
  value: number;
  max: number;
  label: string;
  detail?: string;
  alert?: boolean;
  onPress?: () => void;
};

export function ReportBarRow({ title, valueLabel, value, max, label, detail, alert, onPress }: ReportBarRowProps) {
  const content = (
    <Card style={styles.row}>
      <View style={styles.rowHead}>
        <Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>
        <Text style={[styles.rowValue, alert && styles.alert]}>{alert ? `${valueLabel} · atenção` : valueLabel}</Text>
      </View>
      <ProgressBar value={value} max={max} label={label} color={alert ? colors.warning : colors.primary} height={8} />
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </Card>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md, flexGrow: 1 },
  summary: { gap: space.xs },
  headline: { ...type.display },
  caption: { ...type.caption },
  line: { ...type.body },
  section: { ...type.heading, marginTop: space.sm },
  row: { gap: space.sm },
  rowHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  rowTitle: { ...type.cardTitle, flex: 1 },
  rowValue: { ...type.label },
  alert: { color: colors.warning },
  detail: { ...type.caption },
  pressed: { opacity: 0.85 },
});
