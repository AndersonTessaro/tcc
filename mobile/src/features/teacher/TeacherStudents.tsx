import { useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useResource } from "@/hooks/use-resource";
import { normalizeSearch } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { IconButton } from "@/ui/IconButton";
import { ListRow } from "@/ui/ListRow";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { TextField } from "@/ui/TextField";
import { colors, radius, space } from "@/ui/theme";
import { teacherService, type StudentSummary, type TeacherEnrollment } from "./teacherService";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";

const loadStudents = async () => {
  const [students, enrollments] = await Promise.all([teacherService.students(), teacherService.enrollments()]);
  return { students, enrollments };
};

function instrumentsByStudent(enrollments: TeacherEnrollment[]) {
  const map = new Map<string, string[]>();
  enrollments.forEach((item) => {
    const names = map.get(item.studentId) ?? [];
    map.set(item.studentId, names.includes(item.instrument) ? names : [...names, item.instrument]);
  });
  return map;
}

export default function TeacherStudents() {
  const router = useRouter();
  const listRef = useRef<FlatList<StudentSummary>>(null);
  useTabScrollToTop(listRef);
  const resource = useResource(loadStudents);
  const [query, setQuery] = useState("");

  const instruments = useMemo(() => instrumentsByStudent(resource.data?.enrollments ?? []), [resource.data]);
  const filtered = useMemo(() => {
    const term = normalizeSearch(query);
    const students = resource.data?.students ?? [];
    return term ? students.filter((student) => normalizeSearch(student.name).includes(term)) : students;
  }, [resource.data, query]);

  const empty = resource.loading ? (
    <ScreenState loading skeleton />
  ) : resource.error ? (
    <ScreenState message={apiErrorMessage(resource.error, "Não foi possível carregar os alunos.")} retry={() => void resource.reload()} />
  ) : query.trim() ? (
    <ScreenState icon="search-outline" title="Nenhum aluno encontrado" message="Confira a grafia ou limpe a busca." action={{ label: "Limpar busca", onPress: () => setQuery("") }} />
  ) : (
    <ScreenState icon="people-outline" title="Nenhum aluno vinculado" message="Os alunos aparecem aqui quando a administração cria uma matrícula com você." />
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Alunos" />
      <View style={styles.search}>
        <TextField
          accessibilityLabel="Buscar aluno"
          placeholder="Buscar aluno..."
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          leading={<Ionicons name="search" size={18} color={colors.muted} />}
          trailing={query ? <IconButton icon="close-circle" label="Limpar busca" size={20} color={colors.muted} onPress={() => setQuery("")} /> : null}
        />
      </View>
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(student) => student.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <View style={styles.rowCard}>
            <ListRow
              title={item.name}
              subtitle={instruments.get(item.id)?.join(", ") || "Instrumento não informado"}
              leading={<Ionicons name="person-circle" size={32} color={colors.primary} />}
              accessibilityLabel={`${item.name}, ${instruments.get(item.id)?.join(", ") || "instrumento não informado"}`}
              onPress={() => router.push(`/(teacher)/student/${item.id}`)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  search: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.sm, flexGrow: 1 },
  rowCard: { borderRadius: radius.lg, overflow: "hidden" },
});
