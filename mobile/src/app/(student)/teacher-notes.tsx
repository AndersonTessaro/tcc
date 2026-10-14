import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { studentService } from "@/features/student/studentService";
import { useResource } from "@/hooks/use-resource";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { colors, space, type } from "@/ui/theme";

export default function TeacherNotes() {
  const resource = useResource(() => studentService.teacherNotes());
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Observações do professor" back />
      {resource.loading ? <ScreenState loading skeleton /> : resource.error ? (
        <ScreenState message={apiErrorMessage(resource.error, "Não foi possível carregar as observações.")} retry={resource.reload} />
      ) : (
        <FlatList
          data={resource.data ?? []}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={<ScreenState icon="chatbox-ellipses-outline" message="Seus professores ainda não deixaram observações." />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text accessibilityRole="header" style={styles.teacher}>{item.teacherName}</Text>
              <Text style={styles.date}>{new Date(item.updatedAt).toLocaleDateString("pt-BR")}</Text>
              <Text style={styles.notes}>{item.notes}</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  list: { flexGrow: 1, paddingHorizontal: space.screenGutter, paddingBottom: space.xxl, gap: space.md },
  card: { gap: space.sm },
  teacher: { ...type.bodyStrong },
  date: { ...type.caption },
  notes: { ...type.body },
});
