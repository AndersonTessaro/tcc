import { useState } from "react";
import { ScrollView, Text, TextInput, Pressable } from "react-native";
import { teacherService } from "@/features/teacher/teacherService";

export default function NewLesson() {
  const [enrollmentId, setEnrollmentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");
  const [msg, setMsg] = useState("");

  const save = async () => {
    setMsg("");
    try {
      await teacherService.newLesson({
        enrollmentId,
        date,
        startTime: time,
        content: content || undefined,
        homework: homework || undefined,
      });
      setMsg("Aula registrada!");
      setContent("");
      setHomework("");
    } catch {
      setMsg("Erro ao registrar aula");
    }
  };

  const field = (ph: string, v: string, set: (s: string) => void) => (
    <TextInput
      className="bg-white/10 text-white rounded-xl p-4 mb-3"
      placeholder={ph}
      placeholderTextColor="#9ca3af"
      autoCapitalize="none"
      value={v}
      onChangeText={set}
    />
  );

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-4">Nova aula</Text>
      {field("ID da matrícula", enrollmentId, setEnrollmentId)}
      {field("Data (AAAA-MM-DD)", date, setDate)}
      {field("Hora (HH:MM)", time, setTime)}
      {field("Conteúdo", content, setContent)}
      {field("Tarefa de casa", homework, setHomework)}
      <Pressable className="bg-primary rounded-xl p-4 items-center" onPress={save}>
        <Text className="text-white font-semibold">Salvar</Text>
      </Pressable>
      {msg ? <Text className="text-accent mt-4">{msg}</Text> : null}
    </ScrollView>
  );
}
