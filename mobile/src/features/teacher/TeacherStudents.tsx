import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { teacherService, type StudentSummary, type TeacherEnrollment } from "./teacherService";
import { colors } from "@/ui/theme";

const userIcon = require("@/assets/images/figma-teacher/user.png");
const searchIcon = require("@/assets/images/figma-teacher/search.png");
const plusIcon = require("@/assets/images/figma-teacher/plus.png");

export default function TeacherStudents() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [enrollments, setEnrollments] = useState<TeacherEnrollment[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([teacherService.students(), teacherService.enrollments()])
      .then(([nextStudents, nextEnrollments]) => { setStudents(nextStudents); setEnrollments(nextEnrollments); })
      .catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const instrumentByStudent = useMemo(() => {
    const map = new Map<string, string[]>();
    enrollments.forEach((item) => {
      const names = map.get(item.studentId) ?? [];
      if (!names.includes(item.instrument)) names.push(item.instrument);
      map.set(item.studentId, names);
    });
    return map;
  }, [enrollments]);
  const filtered = students.filter((student) => student.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <View style={[styles.header, { paddingTop: insets.top + 34 }]}>
        <Text style={styles.title}>Alunos</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Adicionar aluno" onPress={() => Alert.alert("Adicionar aluno", "O cadastro de alunos é feito pela administração.")} style={styles.addButton}>
          <Image source={plusIcon} style={styles.plusIcon} />
        </Pressable>
      </View>
      <View style={styles.searchField}>
        <Image source={searchIcon} style={styles.searchIcon} />
        <TextInput accessibilityLabel="Buscar aluno" value={query} onChangeText={setQuery} placeholder="Buscar aluno..." placeholderTextColor="#CCCCCC" style={styles.searchInput} />
      </View>
      {loading ? <ActivityIndicator color={colors.accent} style={styles.center} /> : error ? (
        <View style={styles.center}>
          <Text style={styles.message}>Não foi possível carregar os alunos.</Text>
          <Pressable accessibilityRole="button" onPress={load} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(student) => student.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.message}>{query ? "Nenhum aluno encontrado." : "Nenhum aluno vinculado."}</Text>}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/(teacher)/student/${item.id}`)} style={styles.card}>
              <Image source={userIcon} style={styles.avatar} />
              <View style={styles.studentText}>
                <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
                <Text numberOfLines={1} style={styles.instrument}>{instrumentByStudent.get(item.id)?.join(", ") || "Instrumento não informado"}</Text>
              </View>
              <Text style={styles.chevron}>&gt;</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  header: { height: 135, paddingHorizontal: 29, position: "relative" },
  title: { color: "#000000", fontSize: 18, fontWeight: "700", textAlign: "center" },
  addButton: { position: "absolute", right: 34, top: 75, width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  plusIcon: { width: 20, height: 20 },
  searchField: { height: 46, borderWidth: 1, borderColor: "#CCCCCC", backgroundColor: "#FFFFFF", borderRadius: 15, marginHorizontal: 29, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24 },
  searchIcon: { width: 15, height: 15 },
  searchInput: { flex: 1, height: "100%", color: "#000000", fontSize: 14, padding: 0 },
  list: { paddingHorizontal: 29, paddingTop: 19, paddingBottom: 24, gap: 7, flexGrow: 1 },
  card: { height: 99, borderWidth: 1, borderColor: "#D3D3D3", borderRadius: 15, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 13 },
  avatar: { width: 60, height: 60 },
  studentText: { flex: 1, marginLeft: 19, gap: 7 },
  name: { color: "#000000", fontSize: 14, fontWeight: "700" },
  instrument: { color: "#000000", fontSize: 14 },
  chevron: { color: "#5C5C5C", fontSize: 18, marginRight: 9 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  message: { color: colors.muted, fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: "#FFFFFF", fontWeight: "600" },
});
