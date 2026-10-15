import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import type { LessonAttachment } from "@/features/student/studentService";
import { DownloadButton } from "@/features/files/DownloadButton";
import { formatFileSize } from "@/lib/format";
import type { PickedFile } from "@/lib/http/formFile";
import { Button } from "@/ui/Button";
import { IconButton } from "@/ui/IconButton";
import { useToast } from "@/ui/Toast";
import { colors, radius, space, type } from "@/ui/theme";
import { ATTACHMENT_MAX_COUNT, ATTACHMENT_PICKER_TYPES, attachmentError } from "./lessonAttachments";

type Props = {
  saved: LessonAttachment[];
  pending: PickedFile[];
  onAdd: (file: PickedFile) => void;
  onRemovePending: (index: number) => void;
  onRemoveSaved: (attachment: LessonAttachment) => void;
  downloadSaved: (attachment: LessonAttachment) => Promise<ArrayBuffer>;
  readOnly: boolean;
  disabled: boolean;
};

export function LessonAttachmentList({ saved, pending, onAdd, onRemovePending, onRemoveSaved, downloadSaved, readOnly, disabled }: Props) {
  const toast = useToast();
  const pickingRef = useRef(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = saved.length + pending.length;

  const pick = async () => {
    if (disabled || pickingRef.current) return;
    pickingRef.current = true;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ATTACHMENT_PICKER_TYPES, copyToCacheDirectory: true });
      const chosen = result.canceled ? null : result.assets[0];
      if (chosen) {
        const nextError = attachmentError(chosen, count);
        setError(nextError);
        if (!nextError) onAdd(chosen);
      }
    } catch {
      toast.show("Não foi possível abrir o seletor de arquivos.", "error");
    } finally {
      pickingRef.current = false;
      setPicking(false);
    }
  };

  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={styles.section}>Anexos</Text>
      {saved.map((attachment) => (
        <View key={attachment.id} style={styles.row}>
          <DownloadButton
            variant="row"
            label={attachment.fileName}
            sizeLabel={formatFileSize(attachment.sizeBytes)}
            accessibilityLabel={`Baixar anexo ${attachment.fileName}`}
            fileName={attachment.fileName}
            contentType={attachment.contentType}
            download={() => downloadSaved(attachment)}
            failureMessage="Não foi possível baixar o anexo. Tente novamente."
            style={styles.download}
          />
          {readOnly ? null : (
            <IconButton icon="trash-outline" label={`Remover anexo ${attachment.fileName}`} onPress={() => onRemoveSaved(attachment)} disabled={disabled} />
          )}
        </View>
      ))}
      {pending.map((file, index) => {
        const size = formatFileSize(file.size ?? file.file?.size);
        return (
          <View key={`${file.uri}-${index}`} style={styles.row}>
            <Ionicons name="document-text-outline" size={20} color={colors.muted} accessible={false} />
            <Text numberOfLines={2} style={styles.fileName}>{file.name}{size ? ` · ${size}` : ""}</Text>
            <IconButton icon="close" label={`Remover ${file.name}`} onPress={() => onRemovePending(index)} disabled={disabled} />
          </View>
        );
      })}
      {!count ? <Text style={styles.caption}>Nenhum anexo.</Text> : null}
      {readOnly ? null : (
        <>
          <Button
            label="Adicionar anexo"
            icon="add"
            variant="secondary"
            onPress={pick}
            loading={picking}
            disabled={disabled || count >= ATTACHMENT_MAX_COUNT}
          />
          <Text style={styles.caption}>PDF, imagem, áudio ou vídeo, até 50 MB · máx. {ATTACHMENT_MAX_COUNT}</Text>
        </>
      )}
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  section: { ...type.heading, marginTop: space.md },
  row: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field },
  download: { flex: 1 },
  fileName: { ...type.body, flex: 1 },
  caption: { ...type.caption },
  error: { ...type.caption, color: colors.danger },
});
