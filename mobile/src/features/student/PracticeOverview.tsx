import { useRef } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useResource } from "@/hooks/use-resource";
import { addDays, formatMinutes, parseIsoDate, relativeDayLabel, todayIso } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { colors, radius, space, type } from "@/ui/theme";
import { dayCount } from "./reward";
import { studentService, type StudentPractice } from "./studentService";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const BAR_AREA_HEIGHT = 64;
const EMPTY_BAR_HEIGHT = 4;
const RECENT_LIMIT = 10;

type DayTotal = { date: string; label: string; minutes: number; isToday: boolean };

export function currentWeek(practices: StudentPractice[], today = todayIso()): DayTotal[] {
  const offsetFromMonday = (parseIsoDate(today).getDay() + 6) % 7;
  const monday = addDays(today, -offsetFromMonday);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const minutes = practices.filter((practice) => practice.date === date).reduce((sum, practice) => sum + practice.durationMin, 0);
    return { date, label: WEEKDAY_SHORT[parseIsoDate(date).getDay()], minutes, isToday: date === today };
  });
}

export default function PracticeOverview() {
  const listRef = useRef<FlatList>(null);
  useTabScrollToTop(listRef);
  const router = useRouter();
  const practices = useResource(studentService.practices);
  const items = practices.data ?? [];
  const openRegister = () => router.push("/(student)/practice/register");

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Práticas em casa" />
      {practices.data ? (
        <FlatList ref={listRef}
          data={items.slice(0, RECENT_LIMIT)}
          keyExtractor={(practice) => practice.id}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={practices.refreshing} onRefresh={practices.refresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Button label="Registrar prática" icon="add-circle-outline" onPress={openRegister} />
              <WeekCard week={currentWeek(items)} />
              <Text accessibilityRole="header" style={styles.sectionTitle}>Registros recentes</Text>
            </View>
          }
          renderItem={({ item }) => <PracticeRow practice={item} />}
          ListEmptyComponent={
            <ScreenState icon="musical-notes-outline" title="Nenhuma prática registrada" message="Registre seu estudo em casa para ganhar XP e manter a sequência." />
          }
        />
      ) : practices.error ? (
        <ScreenState message={apiErrorMessage(practices.error, "Não foi possível carregar suas práticas.")} retry={practices.reload} />
      ) : (
        <ScreenState loading skeleton />
      )}
    </View>
  );
}

function WeekCard({ week }: { week: DayTotal[] }) {
  const practicedDays = week.filter((day) => day.minutes > 0).length;
  const total = week.reduce((sum, day) => sum + day.minutes, 0);
  const maxMinutes = Math.max(...week.map((day) => day.minutes), 1);
  return (
    <Card style={styles.weekCard}>
      <Text accessibilityRole="header" style={styles.cardTitle}>Esta semana</Text>
      <Text style={styles.weekValue}>{dayCount(practicedDays)} · {formatMinutes(total)}</Text>
      <View style={styles.bars}>
        {week.map((day) => {
          const height = day.minutes ? Math.max(8, Math.round((day.minutes / maxMinutes) * BAR_AREA_HEIGHT)) : EMPTY_BAR_HEIGHT;
          return (
            <View key={day.date} accessible accessibilityLabel={`${day.label}: ${day.minutes ? formatMinutes(day.minutes) : "sem prática"}${day.isToday ? ", hoje" : ""}`} style={styles.dayColumn}>
              <View style={styles.barArea}>
                <View style={[styles.bar, { height }, day.minutes ? styles.barFilled : styles.barEmpty, day.isToday && styles.barToday]} />
              </View>
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{day.label}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function PracticeRow({ practice }: { practice: StudentPractice }) {
  return (
    <Card style={styles.row}>
      <Text style={styles.rowTitle}>{relativeDayLabel(practice.date)} · {formatMinutes(practice.durationMin)}</Text>
      {practice.notes ? <Text style={styles.notes}>{practice.notes}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { flexGrow: 1, paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.md },
  header: { gap: space.lg },
  sectionTitle: { ...type.heading, marginTop: space.sm },
  weekCard: { gap: space.sm },
  cardTitle: { ...type.label, color: colors.muted },
  weekValue: { ...type.title },
  bars: { flexDirection: "row", justifyContent: "space-between", marginTop: space.sm },
  dayColumn: { alignItems: "center", flex: 1 },
  barArea: { height: BAR_AREA_HEIGHT, justifyContent: "flex-end" },
  bar: { width: 18, borderRadius: radius.sm },
  barFilled: { backgroundColor: colors.primary },
  barEmpty: { backgroundColor: colors.track },
  barToday: { borderWidth: 2, borderColor: colors.brand },
  dayLabel: { ...type.caption, marginTop: space.xs },
  dayLabelToday: { color: colors.primary, fontWeight: "700" },
  row: { gap: space.xs },
  rowTitle: { ...type.bodyStrong },
  notes: { ...type.body, color: colors.muted, lineHeight: 21 },
});
