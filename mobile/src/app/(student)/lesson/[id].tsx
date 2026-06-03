import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { studentService } from "@/features/student/studentService";
import { Card } from "@/ui/Card";

export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    if (id) studentService.lesson(id).then(setD).catch(() => {});
  }, [id]);

  if (!d) return <Text className="text-white p-6">Carregando...</Text>;
  const lesson = d.lesson;

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-4">Detalhes da aula</Text>
      <Card>
        <Text className="text-white">Data: {lesson.date} {lesson.startTime}</Text>
      </Card>
      <Card>
        <Text className="text-white/70">Conteúdo</Text>
        <Text className="text-white">{lesson.content ?? "—"}</Text>
      </Card>
      <Card>
        <Text className="text-white/70">Tarefa</Text>
        <Text className="text-white">{lesson.homework ?? "—"}</Text>
      </Card>
      <Text className="text-white font-semibold mt-2 mb-2">Anexos ({d.attachments?.length ?? 0})</Text>
      {(d.attachments ?? []).map((a: any) => (
        <Card key={a.id}>
          <Text className="text-accent">{a.fileName}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}
