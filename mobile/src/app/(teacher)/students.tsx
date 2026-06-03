import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { teacherService } from "@/features/teacher/teacherService";
import { Card } from "@/ui/Card";

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    teacherService.students().then(setStudents).catch(() => setStudents([]));
  }, []);

  return (
    <View className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-4">Meus alunos</Text>
      <FlatList
        data={students}
        keyExtractor={(a) => a.id}
        ListEmptyComponent={<Text className="text-white/50">Nenhum aluno.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(teacher)/student/${item.id}`)}>
            <Card>
              <Text className="text-white font-semibold">
                {item.user?.displayName ?? item.user?.username ?? item.id}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
