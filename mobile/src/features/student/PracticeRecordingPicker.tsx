import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
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
  const pick = async (source: "video" | "audio") => {
    if (disabled || pickingRef.current) return;
    pickingRef.current = true;
    setPicking(true);
    onPickingChange(true);
    try {
      let chosen: PickedFile | null = null;
      if (source === "video") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          toast.show("Permita o acesso à galeria para escolher um vídeo.", "error");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], allowsEditing: false, quality: 1 });
        const asset = result.canceled ? null : result.assets[0];
        if (asset) {
          let name = asset.fileName || asset.uri.split("/").pop() || "practice";
          if (!recordingMimeType(name)) name += asset.mimeType === "video/quicktime" ? ".mov" : ".mp4";
          chosen = { uri: asset.uri, name, mimeType: asset.mimeType ?? "video/mp4", size: asset.fileSize, file: asset.file };
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
        chosen = result.canceled ? null : result.assets[0];
      }
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
  const video = !!file && !!recordingMimeType(file.name, file.mimeType)?.startsWith("video/");

  return (
    <View style={styles.block}>
      <Text style={styles.label}>Anexe sua prática (opcional)</Text>
      {file ? (
        <>
          <Card variant="outlined" style={styles.file}>
            <Ionicons name={video ? "videocam-outline" : "musical-note-outline"} size={22} color={colors.muted} accessible={false} />
            <Text style={styles.fileName}>{file.name}{size ? ` · ${size}` : ""}</Text>
          </Card>
          <View style={styles.actions}>
            <Button label="Trocar" accessibilityLabel={`Trocar gravação ${file.name}`} variant="secondary" compact onPress={() => pick(video ? "video" : "audio")} disabled={disabled || picking} style={styles.action} />
            <Button label="Remover" accessibilityLabel={`Remover gravação ${file.name}`} variant="ghost" compact disabled={disabled || picking} onPress={() => { onChange(null); onError(null); }} style={styles.action} />
          </View>
        </>
      ) : (
        <>
          <Button label="Vídeo da galeria" variant="secondary" icon="videocam-outline" onPress={() => pick("video")} disabled={disabled || picking} />
          <Button label="Arquivo de áudio" variant="secondary" icon="musical-note-outline" onPress={() => pick("audio")} disabled={disabled || picking} />
        </>
      )}
      <Text style={styles.hint}>Vídeo até 150 MB · áudio até 50 MB.</Text>
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
