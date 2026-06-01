import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { professorService } from "@/features/professor/professorService";
import { Card } from "@/ui/Card";

export default function Alunos() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    professorService.alunos().then(setAlunos).catch(() => setAlunos([]));
  }, []);

  return (
    <View className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-4">Meus alunos</Text>
      <FlatList
        data={alunos}
        keyExtractor={(a) => a.id}
        ListEmptyComponent={<Text className="text-white/50">Nenhum aluno.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(professor)/aluno/${item.id}`)}>
            <Card>
              <Text className="text-white font-semibold">
                {item.usuario?.displayName ?? item.usuario?.username ?? item.id}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
