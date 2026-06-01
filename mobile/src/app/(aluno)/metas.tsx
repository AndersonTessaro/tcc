import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { alunoService } from "@/features/aluno/alunoService";
import { Card } from "@/ui/Card";

export default function Metas() {
  const [tab, setTab] = useState<"ATIVA" | "CONCLUIDA">("ATIVA");
  const [metas, setMetas] = useState<any[]>([]);

  const load = () => alunoService.metas(tab).then(setMetas).catch(() => setMetas([]));
  useEffect(() => {
    load();
  }, [tab]);

  return (
    <View className="flex-1 bg-bg p-6">
      <View className="flex-row mb-4 gap-2">
        {(["ATIVA", "CONCLUIDA"] as const).map((t) => (
          <Pressable
            key={t}
            className={`px-4 py-2 rounded-full ${tab === t ? "bg-primary" : "bg-white/10"}`}
            onPress={() => setTab(t)}
          >
            <Text className="text-white">{t === "ATIVA" ? "Ativas" : "Concluídas"}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={metas}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={<Text className="text-white/50">Nenhuma meta.</Text>}
        renderItem={({ item }) => (
          <Card>
            <Text className="text-white font-semibold">{item.titulo}</Text>
            <Text className="text-white/60">
              {item.progressoAtual}/{item.alvo} · {item.status}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}
