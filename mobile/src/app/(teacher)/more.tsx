import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/features/auth/useAuth";
import { authService } from "@/features/auth/authService";
import { ScreenHeader } from "@/ui/ScreenHeader";

const icons = {
  user: require("@/assets/images/figma-teacher/user.png"),
  students: require("@/assets/images/figma-teacher/students.png"),
  calendar: require("@/assets/images/figma-teacher/calendar.png"),
  history: require("@/assets/images/figma-teacher/clock.png"),
  exit: require("@/assets/images/figma-student/menu-exit.png"),
};

export default function More() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await authService.logout().catch(() => {});
    logout();
  };

  const row = (label: string, icon: number, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Image source={icon} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>&gt;</Text>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <ScreenHeader title="Mais" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <Image source={icons.user} style={styles.avatar} />
          <View style={styles.profileText}><Text style={styles.name}>{user?.displayName || user?.username || "Professor"}</Text><Text style={styles.role}>Professor</Text></View>
        </View>
        <View style={styles.menu}>
          {row("Alunos", icons.students, () => router.push("/(teacher)/students"))}
          {row("Horários fixos", icons.calendar, () => router.push("/(teacher)/schedules"))}
          {row("Histórico de aulas", icons.history, () => router.push("/(teacher)/history"))}
          {row("Sair", icons.exit, signOut)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  content: { paddingHorizontal: 29, paddingTop: 24, paddingBottom: 30 },
  profile: { minHeight: 98, borderWidth: 1, borderColor: "#D3D3D3", borderRadius: 15, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", padding: 15 },
  avatar: { width: 60, height: 60 },
  profileText: { flex: 1, marginLeft: 18, gap: 8 },
  name: { color: "#000000", fontSize: 14, fontWeight: "700" },
  role: { color: "#572AA8", fontSize: 14 },
  menu: { marginTop: 42, gap: 21 },
  row: { minHeight: 46, borderBottomWidth: 2, borderBottomColor: "#D9D9D9", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 14 },
  rowIcon: { width: 25, height: 25 },
  rowLabel: { color: "#000000", fontSize: 14, fontWeight: "500", flex: 1, marginLeft: 18 },
  chevron: { color: "#000000", fontSize: 14, fontWeight: "300", marginRight: 13 },
});
