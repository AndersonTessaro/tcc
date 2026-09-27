import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "@/features/auth/useAuth";
import { authService } from "@/features/auth/authService";

export default function More() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await authService.logout().catch(() => {});
    logout();
  };

  const row = (label: string, icon: keyof typeof Ionicons.glyphMap, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" onPress={onPress} className="min-h-[67px] flex-row items-center border-b border-[#D5D5D5] px-3">
      <Ionicons name={icon} size={25} color="#17131A" />
      <Text className="flex-1 text-[#17131A] text-[15px] ml-4">{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#17131A" />
    </Pressable>
  );

  return (
    <ScrollView className="flex-1 bg-[#F4F4F4]" contentContainerStyle={{ paddingHorizontal: 29, paddingBottom: 32 }}>
      <Text className="text-center text-[20px] font-bold text-[#17131A] mt-10 mb-14">Mais</Text>
      <View className="bg-white border border-[#D5D5D5] rounded-2xl flex-row items-center px-4 py-5 mb-6">
        <View className="w-[60px] h-[60px] rounded-full bg-[#586582] items-center justify-center">
          <Ionicons name="person" size={38} color="#FFFFFF" />
        </View>
        <View className="ml-4">
          <Text className="text-[#17131A] font-bold text-[15px]">{user?.username || "Professor"}</Text>
          <Text className="text-[#7040C5] mt-1">Professor</Text>
        </View>
      </View>
      {row("Alunos", "people-outline", () => router.push("/(teacher)/students"))}
      {row("Horários fixos", "calendar-outline", () => router.push("/(teacher)/schedules"))}
      {row("Histórico de aulas", "time-outline", () => router.push("/(teacher)/history"))}
      {row("Sair", "log-out-outline", signOut)}
    </ScrollView>
  );
}
