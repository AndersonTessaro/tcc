import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { alunoService } from "@/features/aluno/alunoService";
import { Card } from "@/ui/Card";
import { XpBar } from "@/ui/XpBar";

export default function Progresso() {
  const [p, setP] = useState<any>(null);
  useEffect(() => {
    alunoService.progresso().then(setP).catch(() => {});
  }, []);

  if (!p) return <Text className="text-white p-6">Carregando...</Text>;

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Card>
        <XpBar xp={p.xpTotal} nivel={p.nivel} />
      </Card>
      <Card>
        <Text className="text-white">Sequência: {p.sequenciaDias} dias</Text>
      </Card>
      <Card>
        <Text className="text-white">Tempo total: {p.tempoPraticaTotalMin} min</Text>
      </Card>
    </ScrollView>
  );
}
