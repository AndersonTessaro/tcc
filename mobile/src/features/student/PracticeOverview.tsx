import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { studentService, type StudentPractice } from "./studentService";
import { colors } from "@/ui/theme";

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function weekDates() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return WEEKDAYS.map((_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  });
}

function musicTitles(practices: StudentPractice[]) {
  const titles = practices.flatMap((practice) =>
    [...(practice.notes ?? "").matchAll(/m[uú]sica\s+([^,;\n]+)/gi)].map((match) => match[1].trim()),
  );
  return [...new Set(titles)].slice(0, 3);
}

export default function PracticeOverview() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [practices, setPractices] = useState<StudentPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    studentService.practices().then(setPractices).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const last = practices[0];
  const dailyMinutes = weekDates().map((date) =>
    practices.filter((practice) => practice.date === date).reduce((sum, practice) => sum + practice.durationMin, 0),
  );
  const practicedDays = dailyMinutes.filter((minutes) => minutes > 0).length;
  const maxMinutes = Math.max(...dailyMinutes, 1);
  const songs = musicTitles(practices);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <View style={[styles.header, { paddingTop: insets.top + 34 }]}>
        <Text style={styles.title}>Práticas em casa</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.accent} style={styles.center} /> : error ? (
        <View style={styles.center}>
          <Text style={styles.message}>Não foi possível carregar suas práticas.</Text>
          <Pressable accessibilityRole="button" onPress={load} style={styles.retry}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, styles.lastCard]}>
            <Text style={styles.cardTitle}>Minha última prática</Text>
            <Text style={styles.lastValue}>
              {last ? `${formatDate(last.date)} - ${last.durationMin} min` : "Nenhuma prática registrada"}
            </Text>
          </View>

          <View style={[styles.card, styles.weekCard]}>
            <Text style={styles.cardTitle}>Frequência semanal</Text>
            <Text style={styles.daysValue}>{practicedDays} {practicedDays === 1 ? "dia" : "dias"}</Text>
            <View style={styles.weekBars}>
              {dailyMinutes.map((minutes, index) => (
                <View key={index} style={styles.dayColumn}>
                  <View style={styles.barArea}>
                    <View style={[styles.bar, {
                      height: minutes ? Math.max(20, Math.round((minutes / maxMinutes) * 49)) : 35,
                      backgroundColor: minutes ? "#3A1D77" : "#CCCCCC",
                    }]} />
                  </View>
                  <Text style={styles.dayLabel}>{WEEKDAYS[index]}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.card, styles.songsCard]}>
            <Text style={styles.cardTitle}>Músicas praticadas</Text>
            {songs.length ? songs.map((song) => <Text key={song} style={styles.song}>•  {song}</Text>) : (
              <Text style={styles.emptySongs}>Nenhuma música informada.</Text>
            )}
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push("/(student)/practice/register")} style={styles.registerButton}>
            <Text style={styles.registerLabel}>Registrar prática</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  header: { height: 135, paddingHorizontal: 29 },
  title: { color: "#000000", fontSize: 18, fontWeight: "700", textAlign: "center" },
  content: { flexGrow: 1, paddingHorizontal: 29, paddingTop: 24, paddingBottom: 26 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#D3D3D3", borderWidth: 1, borderRadius: 15, paddingHorizontal: 20 },
  cardTitle: { color: "#000000", fontSize: 14, fontWeight: "700" },
  lastCard: { minHeight: 89, paddingTop: 19 },
  lastValue: { color: "#000000", fontSize: 14, marginTop: 12 },
  weekCard: { minHeight: 163, marginTop: 30, paddingTop: 14 },
  daysValue: { color: "#000000", fontSize: 16, fontWeight: "700", marginTop: 12 },
  weekBars: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  dayColumn: { alignItems: "center", width: 23 },
  barArea: { height: 50, justifyContent: "flex-end" },
  bar: { width: 16, borderRadius: 5 },
  dayLabel: { color: "#000000", fontSize: 16, fontWeight: "300", marginTop: 6 },
  songsCard: { minHeight: 172, marginTop: 30, paddingTop: 22 },
  song: { color: "#000000", fontSize: 14, marginTop: 14 },
  emptySongs: { color: colors.muted, fontSize: 14, marginTop: 14 },
  registerButton: { minHeight: 44, marginHorizontal: 2, marginTop: "auto", backgroundColor: "#3A1D77", borderRadius: 15, alignItems: "center", justifyContent: "center" },
  registerLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  message: { color: colors.muted, fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: "#FFFFFF", fontWeight: "600" },
});
