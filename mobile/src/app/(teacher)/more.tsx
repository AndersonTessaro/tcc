import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/features/auth/useAuth";
import { authService } from "@/features/auth/authService";

export default function More() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await authService.logout().catch(() => {});
    logout();
  };

  return (
    <View className="flex-1 bg-bg p-6">
      <Text className="text-2xl font-bold text-white mb-2">Professor</Text>
      <Text className="text-white/60 mb-8">{user?.username}</Text>
      <Pressable
        accessibilityRole="button"
        className="bg-white/10 rounded-xl p-4 mb-3"
        onPress={() => router.push("/(teacher)/schedules")}
      >
        <Text className="text-white font-semibold">Horários fixos</Text>
      </Pressable>
      <Pressable className="bg-white/10 rounded-xl p-4 items-center" onPress={signOut}>
        <Text className="text-red-400 font-semibold">Sair</Text>
      </Pressable>
    </View>
  );
}
