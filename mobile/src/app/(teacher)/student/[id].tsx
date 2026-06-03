import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { teacherService } from "@/features/teacher/teacherService";
import { Card } from "@/ui/Card";

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    if (id) teacherService.student(id).then(setD).catch(() => {});
  }, [id]);

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
    </ScrollView>
  );
}
