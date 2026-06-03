import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { studentService } from "@/features/student/studentService";
import { Card } from "@/ui/Card";

const LABELS: Record<"upcoming" | "past", string> = { upcoming: "Próximas", past: "Passadas" };

export default function Lessons() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [lessons, setLessons] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    studentService.lessons(tab).then(setLessons).catch(() => setLessons([]));
  }, [tab]);

  return (
    <View className="flex-1 bg-bg p-6">
      <View className="flex-row mb-4 gap-2">
        {(["upcoming", "past"] as const).map((t) => (
          <Pressable
            key={t}
            className={`px-4 py-2 rounded-full ${tab === t ? "bg-primary" : "bg-white/10"}`}
            onPress={() => setTab(t)}
          >
            <Text className="text-white">{LABELS[t]}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={lessons}
        keyExtractor={(l) => l.id}
        ListEmptyComponent={<Text className="text-white/50">Nenhuma aula.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(student)/lesson/${item.id}`)}>
            <Card>
              <Text className="text-white font-semibold">
                {item.date} · {item.startTime}
              </Text>
              <Text className="text-white/60">{item.content ?? "—"}</Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
