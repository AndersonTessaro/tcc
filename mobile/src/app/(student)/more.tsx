import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/useAuth";
import { authService } from "@/features/auth/authService";
import { colors } from "@/ui/theme";

type MenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
};

const menuItems: MenuItem[] = [
  { label: "Materiais", icon: "folder-open-outline", href: "/(student)/materials" },
  { label: "Metas", icon: "flag-outline", href: "/(student)/goals" },
];

export default function More() {
  const { user, logout } = useAuth();

  const signOut = async () => {
    await authService.logout().catch(() => {});
    logout();
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Text style={styles.title}>Mais</Text>
      <Text style={styles.username}>{user?.username}</Text>

      <View style={styles.menu}>
        {menuItems.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            onPress={() => router.push(item.href)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Ionicons name={item.icon} size={22} color={colors.brand} />
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sair</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen, paddingHorizontal: 24 },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", marginTop: 24 },
  username: { color: colors.muted, fontSize: 14, marginTop: 4 },
  menu: { backgroundColor: colors.surface, borderRadius: 16, marginTop: 24, overflow: "hidden" },
  row: { alignItems: "center", flexDirection: "row", gap: 14, minHeight: 56, paddingHorizontal: 18 },
  rowPressed: { backgroundColor: colors.field },
  rowLabel: { color: colors.text, flex: 1, fontSize: 16 },
  signOut: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginTop: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  signOutText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
});
