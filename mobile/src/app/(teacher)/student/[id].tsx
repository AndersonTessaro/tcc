import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { teacherService } from "@/features/teacher/teacherService";
import { Card } from "@/ui/Card";

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) teacherService.student(id).then(setD).catch(() => {});
  }, [id]);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType });
    }
  };

  const upload = async () => {
    if (!id || !file || !title.trim()) {
      setMsg("Escolha um arquivo e informe o título");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await teacherService.uploadMaterial(id, file, title.trim());
      setMsg("Material enviado!");
      setTitle("");
      setFile(null);
    } catch {
      setMsg("Erro ao enviar material");
    } finally {
      setBusy(false);
    }
  };

  if (!d) return <Text className="text-white p-6">Carregando...</Text>;
  const prog = d.progress;

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-4">Aluno</Text>
      <Card>
        <Text className="text-white">
          {prog ? `Nível ${prog.level} · ${prog.xpTotal} XP · ${prog.streakDays} dias` : "Sem progresso ainda"}
        </Text>
      </Card>

      <Text className="text-white font-semibold mt-4 mb-2">Enviar material</Text>
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-3"
        placeholder="Título"
        placeholderTextColor="#9ca3af"
        value={title}
        onChangeText={setTitle}
      />
      <Pressable className="bg-white/10 rounded-xl p-4 items-center mb-3" onPress={pick}>
        <Text className="text-white">{file ? file.name : "Escolher arquivo"}</Text>
      </Pressable>
      <Pressable className="bg-primary rounded-xl p-4 items-center" onPress={upload} disabled={busy}>
        <Text className="text-white font-semibold">{busy ? "Enviando..." : "Enviar"}</Text>
      </Pressable>
      {msg ? <Text className="text-accent mt-4">{msg}</Text> : null}
    </ScrollView>
  );
}
