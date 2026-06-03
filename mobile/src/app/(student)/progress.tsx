import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { studentService } from "@/features/student/studentService";
import { Card } from "@/ui/Card";
import { XpBar } from "@/ui/XpBar";

export default function Progress() {
  const [p, setP] = useState<any>(null);
  useEffect(() => {
    studentService.progress().then(setP).catch(() => {});
  }, []);

  if (!p) return <Text className="text-white p-6">Carregando...</Text>;

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Card>
        <XpBar xp={p.xpTotal} level={p.level} />
      </Card>
      <Card>
        <Text className="text-white">Sequência: {p.streakDays} dias</Text>
      </Card>
      <Card>
        <Text className="text-white">Tempo total: {p.totalPracticeMin} min</Text>
      </Card>
    </ScrollView>
  );
}
