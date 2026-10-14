import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { PracticeRecordingDownload } from "@/features/student/PracticeRecordingDownload";
import { practiceMoods } from "@/features/student/practiceMood";
import { studentService, type StudentPractice } from "@/features/student/studentService";
import { useResource } from "@/hooks/use-resource";
import { formatMinutes, relativeDayLabel } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { colors, space, type } from "@/ui/theme";

export default function PracticeHistory() {
  const practices = useResource(studentService.practices);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Práticas" back />
      {practices.data ? (
        <FlatList
          accessibilityRole="list"
          accessibilityLabel="Histórico de práticas"
          data={practices.data}
          keyExtractor={(practice) => practice.id}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={practices.refreshing} onRefresh={practices.refresh} tintColor={colors.primary} />}
          renderItem={({ item }) => <PracticeRow practice={item} />}
          ListEmptyComponent={<ScreenState icon="musical-notes-outline" title="Nenhuma prática registrada." />}
        />
      ) : practices.error ? (
        <ScreenState message={apiErrorMessage(practices.error, "Não foi possível carregar suas práticas.")} retry={practices.reload} />
      ) : (
        <ScreenState loading skeleton />
      )}
    </View>
  );
}

function PracticeRow({ practice }: { practice: StudentPractice }) {
  const rating = practice.rating;
  return (
    <Card variant="outlined" style={styles.row}>
      <View style={styles.details}>
        <Text style={styles.date}>{relativeDayLabel(practice.date)} · {formatMinutes(practice.durationMin)}</Text>
        {practice.notes ? <Text numberOfLines={2} style={styles.notes}>{practice.notes}</Text> : null}
        <PracticeRecordingDownload practice={practice} download={studentService.downloadPracticeRecording} />
      </View>
      {rating ? <Image accessible source={practiceMoods[rating - 1]} accessibilityRole="image" accessibilityLabel={`Avaliação ${rating} de 5`} style={styles.mood} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { flexGrow: 1, paddingHorizontal: space.screenGutter, paddingBottom: space.xxl, gap: space.xxxl },
  row: { minHeight: 116, flexDirection: "row", alignItems: "center", gap: space.lg, padding: space.xl },
  details: { flex: 1, gap: space.sm },
  date: { ...type.bodyStrong },
  notes: { ...type.body, color: colors.muted, lineHeight: 21 },
  mood: { width: 28, height: 28 },
});
