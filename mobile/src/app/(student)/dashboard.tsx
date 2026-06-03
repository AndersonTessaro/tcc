import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { studentService } from "@/features/student/studentService";
import { Card } from "@/ui/Card";
import { XpBar } from "@/ui/XpBar";

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    studentService.dashboard().then(setD).catch(() => {});
  }, []);

  if (!d) return <Text className="text-white p-6">Carregando...</Text>;

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Card>
        <XpBar xp={d.xp} level={d.level} />
      </Card>
      <Card>
        <Text className="text-white">🔥 Sequência: {d.streakDays} dias</Text>
      </Card>
      <Card>
        <Text className="text-white">Prática na semana: {d.weeklyPracticeMin} min</Text>
      </Card>
      <Card>
        <Text className="text-white">
          Próxima aula:{" "}
          {d.nextLesson ? `${d.nextLesson.date} ${d.nextLesson.startTime}` : "—"}
        </Text>
      </Card>
    </ScrollView>
  );
}
