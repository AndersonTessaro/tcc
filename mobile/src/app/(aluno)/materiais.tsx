import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList } from "react-native";
import { alunoService } from "@/features/aluno/alunoService";
import { Card } from "@/ui/Card";

export default function Materiais() {
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      alunoService.materiais(busca).then(setItens).catch(() => setItens([]));
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  return (
    <View className="flex-1 bg-bg p-6">
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-4"
        placeholder="Buscar material"
        placeholderTextColor="#9ca3af"
        value={busca}
        onChangeText={setBusca}
      />
      <FlatList
        data={itens}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={<Text className="text-white/50">Nenhum material.</Text>}
        renderItem={({ item }) => (
          <Card>
            <Text className="text-white font-semibold">{item.titulo}</Text>
            <Text className="text-white/60">{item.descricao ?? item.nomeArquivo}</Text>
          </Card>
        )}
      />
    </View>
  );
}
