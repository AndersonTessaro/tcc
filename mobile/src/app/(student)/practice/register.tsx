import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { studentService } from "@/features/student/studentService";

const backIcon = require("@/assets/images/figma-student/back.png");
const clockIcon = require("@/assets/images/figma-student/clock.png");
const moods = [
  require("@/assets/images/figma-student/mood-1.png"),
  require("@/assets/images/figma-student/mood-2.png"),
  require("@/assets/images/figma-student/mood-3.png"),
  require("@/assets/images/figma-student/mood-4.png"),
  require("@/assets/images/figma-student/mood-5.png"),
];

function todayLabel() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

function parseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseMinutes(value: string) {
  const input = value.trim().toLowerCase();
  if (/^\d+$/.test(input)) return Number(input);
  const match = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/.exec(input);
  return match && (match[1] || match[2]) ? Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) : 0;
}

export default function RegisterPractice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(todayLabel);
  const [duration, setDuration] = useState("30 min");
  const [what, setWhat] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const isoDate = parseDate(date);
    const minutes = parseMinutes(duration);
    if (!isoDate || minutes < 1 || !what.trim()) {
      setError("Informe uma data válida, o tempo e o que praticou.");
      return;
    }
    const notes = [what.trim(), difficulty.trim() && `Dificuldade: ${difficulty.trim()}`, mood != null && `Avaliação: ${mood + 1}/5`]
      .filter(Boolean).join("; ");
    if (notes.length > 255) {
      setError("Resuma a descrição para até 255 caracteres.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await studentService.registerPractice(minutes, notes, isoDate);
      router.back();
    } catch {
      setError("Não foi possível salvar a prática. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <View style={[styles.header, { paddingTop: insets.top + 34 }]}>
        <Pressable accessibilityLabel="Voltar" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Image source={backIcon} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.title}>Registrar prática</Text>
      </View>
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Data</Text>
          <TextInput accessibilityLabel="Data" value={date} onChangeText={setDate} style={styles.field} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" />
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Tempo de prática</Text>
          <View style={styles.fieldWithIcon}>
            <TextInput accessibilityLabel="Tempo de prática" value={duration} onChangeText={setDuration} style={styles.inlineInput} placeholder="Ex.: 1h 30m" />
            <Image source={clockIcon} style={styles.clockIcon} />
          </View>
        </View>
        <View style={[styles.fieldBlock, styles.whatBlock]}>
          <Text style={styles.label}>O que praticou?</Text>
          <TextInput accessibilityLabel="O que praticou?" value={what} onChangeText={setWhat} style={[styles.field, styles.multiline]} multiline placeholder="Descreva sua prática" textAlignVertical="top" />
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Dificuldade encontrada</Text>
          <TextInput accessibilityLabel="Dificuldade encontrada" value={difficulty} onChangeText={setDifficulty} style={styles.field} placeholder="Opcional" />
        </View>
        <View style={[styles.fieldBlock, styles.attachmentBlock]}>
          <Text style={styles.label}>Anexe sua prática</Text>
          <Pressable accessibilityRole="button" onPress={() => Alert.alert("Anexos", "A API ainda não aceita anexos em registros de prática.")} style={styles.field}>
            <Text style={styles.attachmentPlaceholder}>Selecionar arquivo</Text>
          </Pressable>
        </View>
        <View style={styles.moodBlock}>
          <Text style={styles.label}>Como foi a prática?</Text>
          <View style={styles.moods}>
            {moods.map((source, index) => (
              <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Avaliação ${index + 1} de 5`} accessibilityState={{ selected: mood === index }} onPress={() => setMood(index)} style={[styles.mood, mood === index && styles.selectedMood]}>
                <Image source={source} style={styles.moodIcon} />
              </Pressable>
            ))}
          </View>
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={styles.saveButton}>
          <Text style={styles.saveLabel}>{saving ? "Salvando..." : "Salvar registro"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  header: { height: 120, paddingHorizontal: 29, position: "relative" },
  backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  backIcon: { width: 26, height: 26 },
  title: { position: "absolute", top: 79, left: 0, right: 0, textAlign: "center", color: "#000000", fontSize: 18, fontWeight: "700" },
  form: { flexGrow: 1, paddingHorizontal: 29, paddingBottom: 17 },
  fieldBlock: { minHeight: 70, marginBottom: 22 },
  label: { color: "#000000", fontSize: 16, fontWeight: "500", marginBottom: 7 },
  field: { height: 45, width: "100%", borderColor: "#D3D3D3", borderWidth: 1, borderRadius: 15, backgroundColor: "#FFFFFF", paddingHorizontal: 11, color: "#000000", fontSize: 14, justifyContent: "center" },
  fieldWithIcon: { height: 45, borderColor: "#D3D3D3", borderWidth: 1, borderRadius: 15, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 11 },
  inlineInput: { flex: 1, color: "#000000", fontSize: 14 },
  clockIcon: { width: 25, height: 25 },
  whatBlock: { minHeight: 91 },
  multiline: { height: 66, paddingTop: 15 },
  attachmentBlock: { marginBottom: 24 },
  attachmentPlaceholder: { color: "#676767", fontSize: 14 },
  moodBlock: { minHeight: 62, marginBottom: 18 },
  moods: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  mood: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  selectedMood: { borderWidth: 2, borderColor: "#6C45BE" },
  moodIcon: { width: 30, height: 30 },
  error: { color: "#B42318", fontSize: 13, marginBottom: 8 },
  saveButton: { height: 44, marginHorizontal: 2, marginTop: "auto", borderRadius: 15, backgroundColor: "#3A1D77", alignItems: "center", justifyContent: "center" },
  saveLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
