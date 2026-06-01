import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { professorService } from "@/features/professor/professorService";
import { Card } from "@/ui/Card";

export default function AlunoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    if (id) professorService.aluno(id).then(setD).catch(() => {});
  }, [id]);

  if (!d) return <Text className="text-white p-6">Carregando...</Text>;
  const prog = d.progresso;

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-4">Aluno</Text>
      <Card>
        <Text className="text-white">
          {prog ? `Nível ${prog.nivel} · ${prog.xpTotal} XP · ${prog.sequenciaDias} dias` : "Sem progresso ainda"}
        </Text>
      </Card>
    </ScrollView>
  );
}
