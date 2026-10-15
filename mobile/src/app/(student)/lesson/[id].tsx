import { useCallback, type ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DownloadButton } from "@/features/files/DownloadButton";
import { formatTimeRange, lessonBadge } from "@/features/student/lessonStatus";
import { studentService, type LessonAttachment } from "@/features/student/studentService";
import { useResource } from "@/hooks/use-resource";
import { formatFileSize, formatFullDate } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { StatusChip } from "@/ui/StatusChip";
import { colors, radius, space, type } from "@/ui/theme";

export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetchLesson = useCallback(() => studentService.lesson(id), [id]);
  const detail = useResource(fetchLesson, id);
  const lesson = detail.data?.lesson;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Detalhes da aula" back />
      {detail.data && lesson ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={detail.refreshing} onRefresh={detail.refresh} tintColor={colors.primary} />}
        >
          <Card variant="outlined" style={styles.summary}>
            <Text style={styles.body}>{formatFullDate(lesson.date)} · {formatTimeRange(lesson.startTime, lesson.endTime)}</Text>
            <Text style={styles.instrument}>{lesson.instrument}</Text>
            <Text style={styles.body}>Professor: {lesson.teacherName}</Text>
            <StatusChip {...lessonBadge(lesson)} />
          </Card>

          <Section title="Conteúdo trabalhado">
            <ContentLines text={lesson.content} empty="Nenhum conteúdo informado." />
          </Section>

          <Section title="Tarefa para casa">
            <Text style={styles.body}>{lesson.homework?.trim() || "Nenhuma tarefa informada."}</Text>
          </Section>

          <Section title="Anexos">
            {detail.data.attachments.length ? (
              detail.data.attachments.map((attachment) => <AttachmentRow key={attachment.id} lessonId={lesson.id} attachment={attachment} />)
            ) : (
              <Text style={styles.body}>Nenhum anexo.</Text>
            )}
          </Section>
        </ScrollView>
      ) : detail.error ? (
        <ScreenState message={apiErrorMessage(detail.error, "Não foi possível carregar os detalhes da aula.")} retry={detail.reload} />
      ) : (
        <ScreenState loading skeleton />
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card variant="outlined" style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  );
}

function ContentLines({ text, empty }: { text: string | null; empty: string }) {
  const lines = text?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
  if (!lines.length) return <Text style={styles.body}>{empty}</Text>;
  return <>{lines.map((line, index) => <Text key={`${index}-${line}`} style={styles.bullet}>•  {line}</Text>)}</>;
}

function AttachmentRow({ lessonId, attachment }: { lessonId: string; attachment: LessonAttachment }) {
  const size = formatFileSize(attachment.sizeBytes);
  return (
    <View style={styles.attachment}>
      <DownloadButton
        variant="row"
        label={attachment.fileName}
        sizeLabel={size}
        accessibilityLabel={`Baixar anexo ${attachment.fileName}${size ? `, ${size}` : ""}`}
        fileName={attachment.fileName}
        contentType={attachment.contentType}
        download={() => studentService.downloadLessonAttachment(lessonId, attachment.id)}
        failureMessage="Não foi possível baixar o anexo. Tente novamente."
        style={styles.download}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.screenGutter, paddingBottom: space.xxl, gap: space.xxl },
  summary: { gap: space.xs },
  instrument: { ...type.cardTitle },
  section: { gap: space.sm },
  sectionTitle: { ...type.cardTitle },
  body: { ...type.body, lineHeight: 21 },
  bullet: { ...type.body, lineHeight: 22 },
  caption: { ...type.caption },
  attachment: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field },
  download: { flex: 1 },
});
