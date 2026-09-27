import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { studentService, type StudentProgress } from "@/features/student/studentService";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { XpBar } from "@/ui/XpBar";

export default function Progress() {
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setMessage("");
    studentService.progress()
      .then(setProgress)
      .catch((error) => {
        setProgress(null);
        setMessage(apiErrorMessage(error, "Erro ao carregar progresso"));
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View className="flex-1 bg-[#F4F4F4] justify-center"><ActivityIndicator color="#7040C5" /></View>;

  if (!progress) {
    return (
      <View className="flex-1 bg-[#F4F4F4] justify-center items-center p-6">
        <Text className="text-[#17131A] mb-4">{message || "Progresso indisponível"}</Text>
        <Pressable accessibilityRole="button" className="bg-[#7040C5] rounded-lg p-3" onPress={load}>
          <Text className="text-white">Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F4F4F4]" contentContainerStyle={{ paddingHorizontal: 29, paddingBottom: 32 }}>
      <Text className="text-center text-[20px] font-bold text-[#17131A] mt-10 mb-8">Meu progresso</Text>
      <View className="bg-white border border-[#D5D5D5] rounded-2xl p-5 mb-6">
        <Text className="text-[#17131A] font-semibold mb-3">Tempo de prática</Text>
        <Text className="text-[#17131A] text-2xl font-bold">Tempo total: {progress.totalPracticeMin} min</Text>
      </View>
      <View className="bg-white border border-[#D5D5D5] rounded-2xl p-5 mb-6">
        <Text className="text-[#17131A] font-semibold mb-3">Sequência atual</Text>
        <Text className="text-[#17131A] text-2xl font-bold">Sequência: {progress.streakDays} dias</Text>
      </View>
      <View className="bg-white border border-[#D5D5D5] rounded-2xl p-5">
        <Text className="text-[#17131A] font-semibold mb-5">Evolução de XP</Text>
        <XpBar xp={progress.xpTotal} level={progress.level} />
      </View>
    </ScrollView>
  );
}
