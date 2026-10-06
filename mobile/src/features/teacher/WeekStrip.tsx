import { Pressable, StyleSheet, Text, View } from "react-native";
import { addDays, formatFullDate, formatMonthYear, parseIsoDate } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { Chip } from "@/ui/Chip";
import { IconButton } from "@/ui/IconButton";
import { colors, MIN_TOUCH, radius, space, type } from "@/ui/theme";
import { weekDates } from "./agenda";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type WeekStripProps = { value: string; today: string; onChange: (date: string) => void };

export function WeekStrip({ value, today, onChange }: WeekStripProps) {
  const days = weekDates(value);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Semana anterior" color={colors.primary} onPress={() => onChange(addDays(value, -7))} />
        <Text accessibilityRole="header" style={styles.month}>{formatMonthYear(parseIsoDate(value))}</Text>
        <IconButton icon="chevron-forward" label="Próxima semana" color={colors.primary} onPress={() => onChange(addDays(value, 7))} />
      </View>
      <View style={styles.days}>
        {days.map((day) => {
          const date = parseIsoDate(day);
          const selected = day === value;
          const isToday = day === today;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={`${WEEKDAY_SHORT[date.getDay()]}, ${formatFullDate(day)}${isToday ? ", hoje" : ""}`}
              accessibilityState={{ selected }}
              onPress={() => {
                haptics.select();
                onChange(day);
              }}
              style={({ pressed }) => [styles.day, selected && styles.daySelected, !selected && isToday && styles.dayToday, pressed && styles.pressed]}
            >
              <Text style={[styles.weekday, selected && styles.textSelected]}>{WEEKDAY_SHORT[date.getDay()]}</Text>
              <Text style={[styles.dayNumber, selected && styles.textSelected, !selected && isToday && styles.todayNumber]}>{date.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>
      {value !== today ? (
        <View style={styles.todayRow}>
          <Chip label="Hoje" role="button" onPress={() => onChange(today)} accessibilityLabel="Ir para hoje" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.sm, gap: space.sm },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  month: { ...type.bodyStrong },
  days: { flexDirection: "row", justifyContent: "space-between", gap: space.xs },
  day: { flex: 1, minHeight: MIN_TOUCH + 12, borderRadius: radius.md, alignItems: "center", justifyContent: "center", gap: 2, borderWidth: 1.5, borderColor: "transparent" },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayToday: { borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  weekday: { ...type.caption, fontSize: 12 },
  dayNumber: { ...type.bodyStrong, fontSize: 16 },
  todayNumber: { color: colors.primary },
  textSelected: { color: colors.onBrand },
  todayRow: { flexDirection: "row", justifyContent: "center" },
});
