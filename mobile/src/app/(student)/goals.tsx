import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { studentService } from "@/features/student/studentService";
import { Card } from "@/ui/Card";

export default function Goals() {
  const [tab, setTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [goals, setGoals] = useState<any[]>([]);

  const load = () => studentService.goals(tab).then(setGoals).catch(() => setGoals([]));
  useEffect(() => {
    load();
  }, [tab]);

  return (
    <View className="flex-1 bg-bg p-6">
      <View className="flex-row mb-4 gap-2">
        {(["ACTIVE", "COMPLETED"] as const).map((t) => (
          <Pressable
            key={t}
            className={`px-4 py-2 rounded-full ${tab === t ? "bg-primary" : "bg-white/10"}`}
            onPress={() => setTab(t)}
          >
            <Text className="text-white">{t === "ACTIVE" ? "Ativas" : "Concluídas"}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={goals}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={<Text className="text-white/50">Nenhuma meta.</Text>}
        renderItem={({ item }) => (
          <Card>
            <Text className="text-white font-semibold">{item.title}</Text>
            <Text className="text-white/60">
              {item.currentProgress}/{item.target} · {item.status}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}
