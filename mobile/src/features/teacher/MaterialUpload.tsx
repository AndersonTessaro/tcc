import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { TextField } from "@/ui/TextField";
import { useToast } from "@/ui/Toast";
import { colors, space, type } from "@/ui/theme";
import { teacherService, type MaterialFile, type TeacherStudentMaterial } from "./teacherService";

type MaterialUploadProps = { studentId: string; onUploaded: (material: TeacherStudentMaterial) => void };

export function MaterialUpload({ studentId, onUploaded }: MaterialUploadProps) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<MaterialFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      const chosen = result.canceled ? null : result.assets[0];
      if (chosen) {
        setFile({ uri: chosen.uri, name: chosen.name, mimeType: chosen.mimeType, file: chosen.file });
        setError("");
      }
    } catch {
      toast.show("Não foi possível abrir o seletor de arquivos.", "error");
    }
  };

  const upload = async () => {
    if (!title.trim() || !file) {
      setError("Informe o título e escolha um arquivo.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const created = await teacherService.uploadMaterial(studentId, file, title.trim(), description.trim() || undefined);
      onUploaded(created);
      setTitle("");
      setDescription("");
      setFile(null);
      toast.show("Material enviado", "success");
    } catch (cause) {
      toast.show(apiErrorMessage(cause, "Não foi possível enviar o material."), "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>Enviar material</Text>
      <TextField label="Título" accessibilityLabel="Título do material" value={title} onChangeText={setTitle} maxLength={255} editable={!uploading} />
      <TextField label="Descrição (opcional)" accessibilityLabel="Descrição do material" value={description} onChangeText={setDescription} maxLength={255} editable={!uploading} multiline />
      <Button
        label={file?.name ?? "Escolher arquivo"}
        accessibilityLabel={file ? `Arquivo escolhido: ${file.name}. Trocar arquivo` : "Escolher arquivo"}
        variant="secondary"
        icon="attach"
        onPress={pickFile}
        disabled={uploading}
      />
      <Text style={styles.hint}>PDF, imagem, áudio ou partitura, até 1 MB.</Text>
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <Button label="Enviar material" icon="cloud-upload-outline" onPress={upload} loading={uploading} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  title: { ...type.heading },
  hint: { ...type.caption },
  error: { color: colors.danger, fontSize: 13 },
});
