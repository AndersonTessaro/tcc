import { useCallback, type ReactNode } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { formatLessonDateLong, formatTimeRange, lessonBadge } from "@/features/student/lessonStatus";
import { studentService, type LessonAttachment } from "@/features/student/studentService";
import { useResource } from "@/hooks/use-resource";
import { formatFileSize } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { StatusChip } from "@/ui/StatusChip";
import { colors, radius, space, type } from "@/ui/theme";

const fileIcon = require("@/assets/images/figma-student/file.png");

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
          <Card style={styles.summary}>
            <StatusChip {...lessonBadge(lesson)} />
            <Text style={styles.instrument}>{lesson.instrument}</Text>
            <Text style={styles.body}>{formatLessonDateLong(lesson.date)}</Text>
            <Text style={styles.body}>{formatTimeRange(lesson.startTime, lesson.endTime)}</Text>
            <Text style={styles.caption}>Professor: {lesson.teacherName}</Text>
          </Card>

          <Section title="Conteúdo trabalhado">
            <ContentLines text={lesson.content} empty="Nenhum conteúdo informado." />
          </Section>

          <Section title="Tarefa para casa">
            <Text style={styles.body}>{lesson.homework?.trim() || "Nenhuma tarefa informada."}</Text>
          </Section>

          <Section title="Anexos">
            {detail.data.attachments.length ? (
              <>
                {detail.data.attachments.map((attachment) => <AttachmentRow key={attachment.id} attachment={attachment} />)}
                <Text style={styles.caption}>Disponível com o professor</Text>
              </>
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
    <Card style={styles.section}>
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

function AttachmentRow({ attachment }: { attachment: LessonAttachment }) {
  const size = formatFileSize(attachment.sizeBytes);
  return (
    <View accessible accessibilityLabel={`Anexo ${attachment.fileName}${size ? `, ${size}` : ""}`} style={styles.attachment}>
      <Image source={fileIcon} style={styles.fileIcon} accessible={false} />
      <Text numberOfLines={2} style={styles.fileName}>{attachment.fileName}</Text>
      {size ? <Text style={styles.caption}>{size}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.lg },
  summary: { gap: space.xs },
  instrument: { ...type.title, marginTop: space.xs },
  section: { gap: space.sm },
  sectionTitle: { ...type.heading },
  body: { ...type.body, lineHeight: 21 },
  bullet: { ...type.body, lineHeight: 22 },
  caption: { ...type.caption },
  attachment: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field },
  fileIcon: { width: 20, height: 20 },
  fileName: { ...type.body, flex: 1 },
});
