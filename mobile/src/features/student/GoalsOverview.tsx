import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { studentService, type StudentGoal } from "./studentService";
import { colors } from "@/ui/theme";

const backIcon = require("@/assets/images/figma-student/back.png");

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours}h${remaining ? ` ${remaining}m` : ""}` : `${remaining}m`;
}

function progressLabel(goal: StudentGoal) {
  const current = Math.min(goal.target, goal.currentProgress);
  if (goal.type === "PRACTICE_TIME") return `${formatDuration(current)} / ${formatDuration(goal.target)}`;
  if (goal.type === "STREAK") return `${current} / ${goal.target} dias`;
  return `${current} / ${goal.target}`;
}

export default function GoalsOverview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    studentService.goals(tab).then(setGoals).catch(() => setError(true)).finally(() => setLoading(false));
  }, [tab]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <View style={[styles.header, { paddingTop: insets.top + 34 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.backButton}>
          <Image source={backIcon} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.title}>Minhas metas</Text>
      </View>
      <View style={styles.tabs}>
        {(["ACTIVE", "COMPLETED"] as const).map((value) => (
          <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.activeTab]}>
            <Text style={[styles.tabLabel, tab === value && styles.activeTabLabel]}>{value === "ACTIVE" ? "Ativas" : "Concluídas"}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator color={colors.accent} style={styles.center} /> : error ? (
        <View style={styles.center}>
          <Text style={styles.message}>Não foi possível carregar suas metas.</Text>
          <Pressable accessibilityRole="button" onPress={load} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(goal) => goal.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.message}>Nenhuma meta {tab === "ACTIVE" ? "ativa" : "concluída"}.</Text>}
          renderItem={({ item }) => {
            const ratio = item.target ? Math.min(100, Math.max(0, item.currentProgress / item.target * 100)) : 0;
            return (
              <View style={styles.card}>
                <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.track}><View style={[styles.fill, { width: `${ratio}%` }]} /></View>
                <Text style={styles.progressText}>{progressLabel(item)}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  header: { height: 120, paddingHorizontal: 29, position: "relative" },
  backButton: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  backIcon: { width: 26, height: 26 },
  title: { position: "absolute", top: 79, left: 0, right: 0, textAlign: "center", color: "#000000", fontSize: 18, fontWeight: "700" },
  tabs: { flexDirection: "row", marginHorizontal: 24, marginTop: 19, height: 35 },
  tab: { flex: 1, borderBottomWidth: 4, borderBottomColor: "#D9D9D9", alignItems: "center", justifyContent: "flex-start" },
  activeTab: { borderBottomColor: "#572AA8" },
  tabLabel: { color: "#000000", fontSize: 16, fontWeight: "300" },
  activeTabLabel: { color: "#572AA8", fontWeight: "500" },
  list: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 18, paddingBottom: 28, gap: 18 },
  card: { height: 107, borderColor: "#D3D3D3", borderWidth: 1, borderRadius: 15, backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingTop: 15 },
  cardTitle: { color: "#000000", fontSize: 14, fontWeight: "600", minHeight: 34 },
  track: { height: 8, width: "100%", backgroundColor: "#CCCCCC", borderRadius: 6, overflow: "hidden", marginTop: 8 },
  fill: { height: 8, backgroundColor: "#6C45BE", borderRadius: 6 },
  progressText: { color: "#000000", fontSize: 14, marginTop: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  message: { color: colors.muted, fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: "#FFFFFF", fontWeight: "600" },
});
