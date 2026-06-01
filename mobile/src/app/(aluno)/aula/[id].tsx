import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { alunoService } from "@/features/aluno/alunoService";
import { Card } from "@/ui/Card";

export default function AulaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    if (id) alunoService.aula(id).then(setD).catch(() => {});
  }, [id]);

  if (!d) return <Text className="text-white p-6">Carregando...</Text>;
  const aula = d.aula;

  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-4">Detalhes da aula</Text>
      <Card>
        <Text className="text-white">Data: {aula.data} {aula.horaInicio}</Text>
      </Card>
      <Card>
        <Text className="text-white/70">Conteúdo</Text>
        <Text className="text-white">{aula.conteudo ?? "—"}</Text>
      </Card>
      <Card>
        <Text className="text-white/70">Tarefa</Text>
        <Text className="text-white">{aula.tarefaCasa ?? "—"}</Text>
      </Card>
      <Text className="text-white font-semibold mt-2 mb-2">Anexos ({d.anexos?.length ?? 0})</Text>
      {(d.anexos ?? []).map((a: any) => (
        <Card key={a.id}>
          <Text className="text-accent">{a.nomeArquivo}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}
