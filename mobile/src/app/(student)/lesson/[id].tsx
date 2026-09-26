import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { studentService, type StudentLessonDetail } from "@/features/student/studentService";
import { colors } from "@/ui/theme";

const backIcon = require("@/assets/images/figma-student/back.png");
const fileIcon = require("@/assets/images/figma-student/file.png");

function formatSchedule(date: string, time: string) {
  const [year, month, day] = date.split("-");
  return `${day && month && year ? `${day}/${month}/${year}` : date} - ${time.slice(0, 5)}`;
}

function formatSize(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<StudentLessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    studentService.lesson(id)
      .then(setDetail)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const lesson = detail?.lesson;
  const contentLines = lesson?.content?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <View style={[styles.header, { paddingTop: insets.top + 34 }]}>
        <Pressable accessibilityLabel="Voltar" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Image source={backIcon} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.title}>Detalhes da Aula</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.center} />
      ) : error || !lesson ? (
        <View style={styles.center}>
          <Text style={styles.message}>Não foi possível carregar os detalhes da aula.</Text>
          <Pressable accessibilityRole="button" onPress={load} style={styles.retry}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, styles.lessonCard]}>
            <Text style={styles.body}>{formatSchedule(lesson.date, lesson.startTime)}</Text>
            <Text style={styles.instrument}>{lesson.instrument}</Text>
            <Text style={styles.teacher}>Professor: {lesson.teacherName}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Conteúdo trabalhado</Text>
            {contentLines.length ? contentLines.map((line, index) => (
              <Text key={`${index}-${line}`} style={styles.bullet}>•  {line}</Text>
            )) : <Text style={styles.body}>Nenhum conteúdo informado.</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tarefa para casa</Text>
            <Text style={styles.body}>{lesson.homework?.trim() || "Nenhuma tarefa informada."}</Text>
          </View>

          <View style={[styles.card, styles.attachmentsCard]}>
            <Text style={styles.cardTitle}>Anexos</Text>
            {detail.attachments.length ? detail.attachments.map((attachment) => (
              <View key={attachment.id} style={styles.attachment}>
                <Image source={fileIcon} style={styles.fileIcon} />
                <Text numberOfLines={1} style={styles.fileName}>{attachment.fileName}</Text>
                <Text style={styles.fileSize}>{formatSize(attachment.sizeBytes)}</Text>
              </View>
            )) : <Text style={styles.body}>Nenhum anexo.</Text>}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  header: { height: 135, paddingHorizontal: 29, position: "relative" },
  backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  backIcon: { width: 26, height: 26 },
  title: { position: "absolute", top: 79, left: 0, right: 0, textAlign: "center", color: colors.text, fontSize: 18, fontWeight: "700" },
  content: { paddingHorizontal: 29, paddingTop: 24, paddingBottom: 36, gap: 31 },
  card: { minHeight: 116, backgroundColor: colors.surface, borderColor: "#D3D3D3", borderWidth: 1, borderRadius: 15, paddingHorizontal: 19, paddingVertical: 15, justifyContent: "flex-start" },
  attachmentsCard: { minHeight: 97 },
  lessonCard: { gap: 8 },
  body: { color: colors.text, fontSize: 14, lineHeight: 19 },
  instrument: { color: colors.text, fontSize: 14, fontWeight: "700" },
  teacher: { color: colors.text, fontSize: 14 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: 10 },
  bullet: { color: colors.text, fontSize: 14, lineHeight: 21 },
  attachment: { minHeight: 40, maxWidth: "100%", width: 275, borderColor: "#CAC0C0", borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 },
  fileIcon: { width: 20, height: 20 },
  fileName: { color: colors.text, fontSize: 14, flex: 1 },
  fileSize: { color: colors.text, fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  message: { color: colors.muted, fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: colors.surface, fontWeight: "600" },
});
