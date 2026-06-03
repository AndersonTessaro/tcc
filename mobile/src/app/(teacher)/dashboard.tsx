import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { teacherService } from "@/features/teacher/teacherService";
import { Card } from "@/ui/Card";

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    teacherService.dashboard().then(setD).catch(() => {});
  }, []);

  if (!d) return <Text className="text-white p-6">Carregando...</Text>;

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Card>
        <Text className="text-white text-2xl font-bold">{d.totalStudents}</Text>
        <Text className="text-white/60">alunos vinculados</Text>
      </Card>
    </ScrollView>
  );
}
