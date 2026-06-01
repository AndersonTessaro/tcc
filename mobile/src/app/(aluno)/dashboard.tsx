import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { alunoService } from "@/features/aluno/alunoService";
import { Card } from "@/ui/Card";
import { XpBar } from "@/ui/XpBar";

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    alunoService.dashboard().then(setD).catch(() => {});
  }, []);

  if (!d) return <Text className="text-white p-6">Carregando...</Text>;

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Card>
        <XpBar xp={d.xp} nivel={d.nivel} />
      </Card>
      <Card>
        <Text className="text-white">🔥 Sequência: {d.sequenciaDias} dias</Text>
      </Card>
      <Card>
        <Text className="text-white">Prática na semana: {d.praticaSemanalMin} min</Text>
      </Card>
      <Card>
        <Text className="text-white">
          Próxima aula:{" "}
          {d.proximaAula ? `${d.proximaAula.data} ${d.proximaAula.horaInicio}` : "—"}
        </Text>
      </Card>
    </ScrollView>
  );
}
