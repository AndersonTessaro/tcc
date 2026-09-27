import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { studentService, type StudentLesson } from "@/features/student/studentService";
import { colors } from "@/ui/theme";

const checkIcon = require("@/assets/images/figma-student/check.png");
const hourglassIcon = require("@/assets/images/figma-student/hourglass.png");
const backIcon = require("@/assets/images/figma-student/back.png");

function lessonDate(lesson: StudentLesson) {
  const [year, month, day] = lesson.date.split("-");
  const date = day && month && year ? `${day}/${month}` : lesson.date;
  return `${date} - ${lesson.startTime.slice(0, 5)}`;
}

export default function Lessons() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([studentService.lessons("upcoming"), studentService.lessons("past")])
      .then(([upcoming, past]) => {
        setLessons([...past, ...upcoming].sort((a, b) =>
          `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
        ));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <View style={[styles.header, { paddingTop: insets.top + 34 }]}>
        <Pressable accessibilityLabel="Voltar" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Image source={backIcon} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.title}>MINHAS AULAS</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.center} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.message}>Não foi possível carregar suas aulas.</Text>
          <Pressable accessibilityRole="button" onPress={load} style={styles.retry}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={lessons}
          keyExtractor={(lesson) => lesson.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.message}>Nenhuma aula encontrada.</Text>}
          renderItem={({ item }) => {
            const completed = item.status === "DONE";
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.instrument}, ${lessonDate(item)}`}
                onPress={() => router.push(`/(student)/lesson/${item.id}`)}
                style={styles.card}
              >
                <View style={styles.cardText}>
                  <Text style={styles.date}>{lessonDate(item)}</Text>
                  <Text style={styles.instrument}>{item.instrument}</Text>
                  {item.status === "CANCELED" ? <Text style={styles.canceled}>Cancelada</Text> : null}
                </View>
                {item.status !== "CANCELED" ? (
                  <Image source={completed ? checkIcon : hourglassIcon} style={completed ? styles.checkIcon : styles.hourglassIcon} />
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  header: { height: 135, paddingHorizontal: 29, position: "relative", justifyContent: "flex-start" },
  backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  backIcon: { width: 26, height: 26 },
  title: { position: "absolute", top: 79, left: 0, right: 0, textAlign: "center", color: colors.text, fontSize: 18, fontWeight: "700" },
  list: { paddingHorizontal: 29, paddingTop: 24, paddingBottom: 36, gap: 31, flexGrow: 1 },
  card: { minHeight: 116, backgroundColor: colors.surface, borderColor: "#D3D3D3", borderWidth: 1, borderRadius: 15, paddingHorizontal: 21, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardText: { gap: 8, flexShrink: 1 },
  date: { color: colors.text, fontSize: 14 },
  instrument: { color: colors.text, fontSize: 14, fontWeight: "700" },
  canceled: { color: colors.muted, fontSize: 12 },
  checkIcon: { width: 25, height: 25 },
  hourglassIcon: { width: 36, height: 36 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  message: { color: colors.muted, fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: colors.surface, fontWeight: "600" },
});
