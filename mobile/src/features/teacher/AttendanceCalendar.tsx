import { StyleSheet, Text, View } from "react-native";
import { formatFullDate, formatMonthYear, toIsoDate } from "@/lib/format";
import { Card } from "@/ui/Card";
import { IconButton } from "@/ui/IconButton";
import { colors, radius, space, type } from "@/ui/theme";
import type { AttendanceStatus } from "./teacherService";

type AttendanceRecord = { date: string; status: AttendanceStatus };

const WEEKDAY_INITIALS = ["S", "T", "Q", "Q", "S", "S", "D"];

const STATUS_STYLE: Record<AttendanceStatus, { bg: string; fg: string; label: string }> = {
  PRESENT: { bg: colors.success, fg: colors.onBrand, label: "Presente" },
  ABSENT: { bg: colors.danger, fg: colors.onBrand, label: "Falta" },
  EXCUSED: { bg: colors.warning, fg: colors.onBrand, label: "Falta justificada" },
};

const monthPrefix = (month: Date) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

export function attendanceSummary(history: AttendanceRecord[], month: Date) {
  const prefix = monthPrefix(month);
  const inMonth = history.filter((item) => item.date.startsWith(prefix));
  const present = inMonth.filter((item) => item.status === "PRESENT").length;
  return { present, total: inMonth.length, rate: inMonth.length ? Math.round((100 * present) / inMonth.length) : 0 };
}

type AttendanceCalendarProps = { month: Date; onChangeMonth: (month: Date) => void; history: AttendanceRecord[] };

export function AttendanceCalendar({ month, onChangeMonth, history }: AttendanceCalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const statuses = new Map(history.map((item) => [item.date, item.status]));
  const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, index) => index - leading + 1);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Mês anterior" color={colors.primary} onPress={() => onChangeMonth(new Date(year, monthIndex - 1, 1))} />
        <Text accessibilityRole="header" style={styles.title}>{formatMonthYear(month)}</Text>
        <IconButton icon="chevron-forward" label="Próximo mês" color={colors.primary} onPress={() => onChangeMonth(new Date(year, monthIndex + 1, 1))} />
      </View>
      <View style={styles.grid}>
        {WEEKDAY_INITIALS.map((label, index) => (
          <Text key={`weekday-${index}`} accessible={false} style={styles.weekday}>{label}</Text>
        ))}
        {cells.map((day, index) => {
          if (day < 1 || day > count) return <View key={`blank-${index}`} style={styles.cell} />;
          const iso = toIsoDate(new Date(year, monthIndex, day));
          const status = statuses.get(iso);
          const tone = status ? STATUS_STYLE[status] : null;
          return (
            <View key={iso} style={styles.cell}>
              <View
                accessible
                accessibilityLabel={formatFullDate(iso) + (tone ? `, ${tone.label}` : "")}
                style={[styles.day, tone && { backgroundColor: tone.bg }]}
              >
                <Text style={[styles.dayText, tone && { color: tone.fg, fontWeight: "700" }]}>{day}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {Object.values(STATUS_STYLE).map((tone) => (
          <View key={tone.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: tone.bg }]} />
            <Text style={styles.legendText}>{tone.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm, paddingHorizontal: space.sm },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { ...type.bodyStrong },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.285%", textAlign: "center", ...type.caption, fontSize: 12, paddingVertical: space.xs },
  cell: { width: "14.285%", minHeight: 40, alignItems: "center", justifyContent: "center" },
  day: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  dayText: { ...type.body, fontSize: 14 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: space.md, paddingHorizontal: space.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.xs },
  legendDot: { width: 14, height: 14, borderRadius: radius.sm / 2 },
  legendText: { ...type.caption },
});
