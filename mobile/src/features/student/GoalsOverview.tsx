import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { studentService, type StudentGoal } from "./studentService";
import { colors } from "@/ui/theme";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { apiErrorMessage } from "@/lib/http/errorMessage";

const types: { type: StudentGoal["type"]; label: string; unit: string }[] = [
  { type: "PRACTICE_TIME", label: "Tempo de prática", unit: "minutos" },
  { type: "STREAK", label: "Sequência", unit: "dias" },
  { type: "LESSONS", label: "Aulas", unit: "aulas" },
  { type: "ATTENDANCE", label: "Presença", unit: "presenças" },
  { type: "OTHER", label: "Outra", unit: "unidades" },
];

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
  const [tab, setTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editor, setEditor] = useState<StudentGoal | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<StudentGoal["type"]>("PRACTICE_TIME");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const request = useRef(0);

  const load = useCallback(() => {
    const current = ++request.current;
    setLoading(true);
    setError(false);
    studentService.goals(tab).then((values) => { if (current === request.current) setGoals(values); })
      .catch(() => { if (current === request.current) setError(true); })
      .finally(() => { if (current === request.current) setLoading(false); });
  }, [tab]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = (goal: StudentGoal | "new") => {
    setEditor(goal);
    setTitle(goal === "new" ? "" : goal.title);
    setDescription(goal === "new" ? "" : goal.description ?? "");
    setType(goal === "new" ? "PRACTICE_TIME" : goal.type);
    setAmount(goal === "new" ? "" : String(goal.currentProgress));
    setMessage("");
  };

  const save = async () => {
    if (pending.current || !editor) return;
    const value = Number(amount);
    if (!/^\d+$/.test(amount.trim()) || !Number.isSafeInteger(value) || value > 2147483647 || (editor === "new" ? value < 1 || !title.trim() : value < 0)) {
      setMessage(editor === "new" ? "Informe um título e um objetivo inteiro maior que zero." : "Informe um progresso inteiro a partir de zero.");
      return;
    }
    pending.current = true;
    setSaving(true);
    setMessage("");
    try {
      if (editor === "new") await studentService.createGoal(title.trim(), type, value, description.trim() || undefined);
      else await studentService.updateGoal(editor.id, value);
      setEditor(null);
      load();
    } catch (cause) {
      setMessage(apiErrorMessage(cause, "Não foi possível salvar a meta. Tente novamente."));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <ScreenHeader title="Minhas metas" back compact action={<Pressable accessibilityRole="button" accessibilityLabel="Nova meta" onPress={() => open("new")}><Text style={styles.add}>+</Text></Pressable>} />
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
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
                <View style={styles.track}><View style={[styles.fill, { width: `${ratio}%` }]} /></View>
                <Text style={styles.progressText}>{progressLabel(item)}</Text>
                {item.status === "ACTIVE" ? <Pressable accessibilityRole="button" accessibilityLabel={`Atualizar ${item.title}`} onPress={() => open(item)} style={styles.update}><Text style={styles.link}>Atualizar progresso</Text></Pressable> : <Text style={styles.link}>Meta concluída</Text>}
              </View>
            );
          }}
        />
      )}
      <Modal visible={editor !== null} transparent animationType="fade" onRequestClose={() => { if (!pending.current) setEditor(null); }}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView style={styles.editor} contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.editorTitle}>{editor === "new" ? "Nova meta" : title}</Text>
            {editor === "new" ? <>
              <TextInput accessibilityLabel="Título da meta" placeholder="Título" value={title} onChangeText={setTitle} maxLength={255} editable={!saving} style={styles.input} />
              <TextInput accessibilityLabel="Descrição da meta" placeholder="Descrição (opcional)" value={description} onChangeText={setDescription} maxLength={255} editable={!saving} multiline style={styles.input} />
              <View style={styles.types}>{types.map((item) => <Pressable key={item.type} accessibilityRole="radio" accessibilityState={{ selected: type === item.type }} disabled={saving} onPress={() => setType(item.type)} style={[styles.type, type === item.type && styles.selectedType]}><Text style={[styles.typeText, type === item.type && styles.selectedTypeText]}>{item.label}</Text></Pressable>)}</View>
            </> : null}
            <Text style={styles.description}>{editor === "new" ? "Objetivo" : "Progresso atual"} em {types.find((item) => item.type === type)?.unit}</Text>
            <TextInput accessibilityLabel={editor === "new" ? "Objetivo da meta" : "Progresso da meta"} value={amount} onChangeText={setAmount} keyboardType="number-pad" editable={!saving} style={styles.input} />
            {editor !== "new" && editor ? <Text style={styles.description}>Objetivo: {editor.target}. Ao atingir o objetivo, a meta será concluída.</Text> : null}
            {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
            <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={styles.retry}><Text style={styles.retryText}>{saving ? "Salvando..." : "Salvar meta"}</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => setEditor(null)} style={styles.update}><Text style={styles.link}>Fechar</Text></Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  tabs: { flexDirection: "row", marginHorizontal: 24, marginTop: 19, height: 35 },
  tab: { flex: 1, borderBottomWidth: 4, borderBottomColor: "#D9D9D9", alignItems: "center", justifyContent: "flex-start" },
  activeTab: { borderBottomColor: "#572AA8" },
  tabLabel: { color: "#000000", fontSize: 16, fontWeight: "300" },
  activeTabLabel: { color: "#572AA8", fontWeight: "500" },
  list: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 18, paddingBottom: 28, gap: 18 },
  card: { minHeight: 107, borderColor: "#D3D3D3", borderWidth: 1, borderRadius: 15, backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 15 },
  cardTitle: { color: "#000000", fontSize: 14, fontWeight: "600", minHeight: 34 },
  track: { height: 8, width: "100%", backgroundColor: "#CCCCCC", borderRadius: 6, overflow: "hidden", marginTop: 8 },
  fill: { height: 8, backgroundColor: "#6C45BE", borderRadius: 6 },
  progressText: { color: "#000000", fontSize: 14, marginTop: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  message: { color: colors.muted, fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: "#FFFFFF", fontWeight: "600" },
  add: { color: "#572AA8", fontSize: 28 },
  description: { color: "#6A666B", fontSize: 14, lineHeight: 20, marginBottom: 8 },
  update: { paddingVertical: 12 },
  link: { color: "#572AA8", fontSize: 14, fontWeight: "500" },
  backdrop: { flex: 1, backgroundColor: "#00000080", justifyContent: "center", padding: 24 },
  editor: { flexGrow: 0, maxHeight: "90%", backgroundColor: "#FFFFFF", borderRadius: 15 },
  editorContent: { padding: 20 },
  editorTitle: { color: "#17131A", fontSize: 18, fontWeight: "700", marginBottom: 16 },
  input: { borderColor: "#D3D3D3", borderWidth: 1, borderRadius: 8, padding: 12, color: "#17131A", marginBottom: 12 },
  types: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  type: { borderWidth: 1, borderColor: "#D3D3D3", borderRadius: 8, padding: 10 },
  selectedType: { backgroundColor: "#572AA8" },
  typeText: { color: "#17131A" },
  selectedTypeText: { color: "#FFFFFF" },
  error: { color: "#B42318", marginBottom: 12 },
});
