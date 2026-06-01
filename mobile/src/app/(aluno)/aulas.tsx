import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { alunoService } from "@/features/aluno/alunoService";
import { Card } from "@/ui/Card";

export default function Aulas() {
  const [tab, setTab] = useState<"proximas" | "passadas">("proximas");
  const [aulas, setAulas] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    alunoService.aulas(tab).then(setAulas).catch(() => setAulas([]));
  }, [tab]);

  return (
    <View className="flex-1 bg-bg p-6">
      <View className="flex-row mb-4 gap-2">
        {(["proximas", "passadas"] as const).map((t) => (
          <Pressable
            key={t}
            className={`px-4 py-2 rounded-full ${tab === t ? "bg-primary" : "bg-white/10"}`}
            onPress={() => setTab(t)}
          >
            <Text className="text-white capitalize">{t}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={aulas}
        keyExtractor={(a) => a.id}
        ListEmptyComponent={<Text className="text-white/50">Nenhuma aula.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(aluno)/aula/${item.id}`)}>
            <Card>
              <Text className="text-white font-semibold">
                {item.data} · {item.horaInicio}
              </Text>
              <Text className="text-white/60">{item.conteudo ?? "—"}</Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
