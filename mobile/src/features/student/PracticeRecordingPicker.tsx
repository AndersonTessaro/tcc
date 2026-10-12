import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { formatFileSize } from "@/lib/format";
import type { PickedFile } from "@/lib/http/formFile";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { useToast } from "@/ui/Toast";
import { colors, MIN_TOUCH, space, type } from "@/ui/theme";
import { recordingError, recordingMimeType } from "./recording";

type Props = {
  file: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
  error: string | null;
  onError: (error: string | null) => void;
  disabled: boolean;
  onPickingChange: (picking: boolean) => void;
};

export function PracticeRecordingPicker({ file, onChange, error, onError, disabled, onPickingChange }: Props) {
  const toast = useToast();
  const pickingRef = useRef(false);
  const [picking, setPicking] = useState(false);
  const pick = async () => {
    if (disabled || pickingRef.current) return;
    pickingRef.current = true;
    setPicking(true);
    onPickingChange(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["audio/*", "video/*"], copyToCacheDirectory: true });
      const chosen = result.canceled ? null : result.assets[0];
      if (chosen) {
        const nextError = recordingError(chosen);
        onError(nextError);
        onChange(nextError ? null : chosen);
      }
    } catch {
      toast.show("Não foi possível abrir o seletor de arquivos.", "error");
    } finally {
      pickingRef.current = false;
      setPicking(false);
      onPickingChange(false);
    }
  };
  const size = formatFileSize(file?.size ?? file?.file?.size);

  return (
    <View style={styles.block}>
      <Text style={styles.label}>Anexe sua prática (opcional)</Text>
      {file ? (
        <>
          <Card variant="outlined" style={styles.file}>
            <Ionicons name={recordingMimeType(file.name, file.mimeType)?.startsWith("video/") ? "videocam-outline" : "musical-note-outline"} size={22} color={colors.muted} accessible={false} />
            <Text style={styles.fileName}>{file.name}{size ? ` · ${size}` : ""}</Text>
          </Card>
          <View style={styles.actions}>
            <Button label="Trocar" accessibilityLabel={`Trocar gravação ${file.name}`} variant="secondary" compact onPress={pick} disabled={disabled || picking} style={styles.action} />
            <Button label="Remover" accessibilityLabel={`Remover gravação ${file.name}`} variant="ghost" compact disabled={disabled || picking} onPress={() => { onChange(null); onError(null); }} style={styles.action} />
          </View>
        </>
      ) : (
        <Button label="Escolher áudio ou vídeo" variant="secondary" icon="attach" onPress={pick} disabled={disabled} loading={picking} />
      )}
      <Text style={styles.hint}>Áudio ou vídeo, até 50 MB.</Text>
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  label: { ...type.formLabel },
  file: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm },
  fileName: { ...type.body, color: colors.muted, flex: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  action: { flexGrow: 1 },
  hint: { ...type.caption },
  error: { ...type.caption, color: colors.danger },
});
