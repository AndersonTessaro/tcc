import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatFullDate, formatMonthYear, parseIsoDate, toIsoDate } from "@/lib/format";
import { monthGrid, shiftMonth } from "@/lib/format/calendar";
import { haptics } from "@/lib/haptics";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { IconButton } from "@/ui/IconButton";
import { colors, MIN_TOUCH, radius, space, type } from "@/ui/theme";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type MonthCalendarProps = { value: string; today: string; onChange: (date: string) => void };

export function MonthCalendar({ value, today, onChange }: MonthCalendarProps) {
  const month = parseIsoDate(value);
  const cells = monthGrid(month);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  const select = (date: string) => {
    haptics.select();
    onChange(date);
  };

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Mês anterior" color={colors.primary} onPress={() => select(toIsoDate(shiftMonth(month, -1)))} />
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.month}>{formatMonthYear(month)}</Text>
        <IconButton icon="chevron-forward" label="Próximo mês" color={colors.primary} onPress={() => select(toIsoDate(shiftMonth(month, 1)))} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grid}>
        <View style={styles.weeks}>
          <View style={styles.week}>
            {WEEKDAYS.map((label) => <Text key={label} accessible={false} style={styles.weekday}>{label}</Text>)}
          </View>
          {weeks.map((week, index) => (
            <View key={index} style={styles.week}>
              {week.map((day, dayIndex) => {
                if (!day) return <View key={dayIndex} style={styles.cell} />;
                const iso = toIsoDate(day);
                const selected = iso === value;
                const isToday = iso === today;
                return (
                  <Pressable
                    key={iso}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatFullDate(iso)}${isToday ? ", hoje" : ""}`}
                    aria-selected={selected}
                    aria-current={isToday ? "date" : undefined}
                    onPress={() => select(iso)}
                    style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
                  >
                    <View style={[styles.day, isToday && styles.today, selected && styles.selected]}>
                      <Text style={[styles.dayText, isToday && styles.todayText, selected && styles.selectedText]}>{day.getDate()}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      {value !== today ? <Button label="Hoje" accessibilityLabel="Ir para hoje" variant="ghost" compact onPress={() => select(today)} style={styles.todayButton} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 0, padding: space.xs, gap: space.xs },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  month: { ...type.caption, fontSize: 12, color: colors.onBrand, backgroundColor: colors.text, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.sm },
  grid: { flexGrow: 1, minWidth: MIN_TOUCH * 7 },
  weeks: { flex: 1 },
  week: { flexDirection: "row" },
  weekday: { ...type.caption, flex: 1, minWidth: MIN_TOUCH, textAlign: "center", fontSize: 12, paddingVertical: space.sm },
  cell: { flex: 1, minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  day: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent" },
  today: { borderColor: colors.primary },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { ...type.caption, fontVariant: ["tabular-nums"] },
  todayText: { color: colors.primary, fontWeight: "700" },
  selectedText: { color: colors.onBrand, fontWeight: "700" },
  pressed: { opacity: 0.8 },
  todayButton: { alignSelf: "center" },
});
