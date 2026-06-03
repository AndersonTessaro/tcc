import { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { teacherService } from "@/features/teacher/teacherService";
import { Card } from "@/ui/Card";

export default function Schedule() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lessons, setLessons] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    teacherService.schedule(date).then(setLessons).catch(() => setLessons([]));
  }, [date]);
  useEffect(() => {
    load();
  }, [load]);

  const mark = async (lessonId: string, status: string) => {
    setMsg("");
    try {
      await teacherService.attendance(lessonId, status);
      setMsg(`Frequência: ${status}`);
    } catch {
      setMsg("Erro ao marcar");
    }
  };

  return (
    <View className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-3">Agenda</Text>
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-4"
        value={date}
        onChangeText={setDate}
        autoCapitalize="none"
      />
      {msg ? <Text className="text-accent mb-2">{msg}</Text> : null}
      <FlatList
        data={lessons}
        keyExtractor={(a) => a.id}
        ListEmptyComponent={<Text className="text-white/50">Sem aulas neste dia.</Text>}
        renderItem={({ item }) => (
          <Card>
            <Text className="text-white font-semibold mb-2">
              {item.startTime} · {item.content ?? "—"}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                className="bg-accent rounded-lg px-3 py-2"
                onPress={() => mark(item.id, "PRESENT")}
              >
                <Text className="text-white">Presente</Text>
              </Pressable>
              <Pressable
                className="bg-white/10 rounded-lg px-3 py-2"
                onPress={() => mark(item.id, "ABSENT")}
              >
                <Text className="text-white">Falta</Text>
              </Pressable>
              <Pressable
                className="bg-white/10 rounded-lg px-3 py-2"
                onPress={() => mark(item.id, "EXCUSED")}
              >
                <Text className="text-white">Justificada</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
