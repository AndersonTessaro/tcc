import { useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/features/auth/useAuth";
import { authService } from "@/features/auth/authService";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";
import { confirm } from "@/lib/confirm";
import { Card } from "@/ui/Card";
import { ListRow } from "@/ui/ListRow";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { colors, radius, space, type } from "@/ui/theme";

type MenuIcon = keyof typeof Ionicons.glyphMap;

export default function More() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollToTop(scrollRef);

  const signOut = async () => {
    if (!(await confirm({ title: "Sair da conta?", message: "Você precisará entrar novamente.", confirmLabel: "Sair", destructive: true }))) return;
    await authService.logout().catch(() => undefined);
    logout();
  };

  const icon = (name: MenuIcon, color: string = colors.primary) => <Ionicons name={name} size={22} color={color} />;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Mais" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.profile}>
          <Ionicons name="person-circle" size={56} color={colors.primary} />
          <View style={styles.profileText}>
            <Text style={styles.name}>{user?.displayName || user?.username || "Professor"}</Text>
            <Text style={styles.role}>Professor</Text>
          </View>
        </Card>

        <Text accessibilityRole="header" style={styles.section}>Aulas</Text>
        <Card style={styles.menu}>
          <ListRow title="Horários fixos" subtitle="Aulas semanais recorrentes" leading={icon("repeat")} onPress={() => router.push("/(teacher)/schedules")} />
          <ListRow title="Histórico de aulas" subtitle="Aulas por período" leading={icon("time-outline")} onPress={() => router.push("/(teacher)/history")} />
          <ListRow title="Nova aula" subtitle="Registrar aula avulsa" leading={icon("add-circle-outline")} onPress={() => router.push("/(teacher)/new-lesson")} />
        </Card>

        <Card style={styles.menu}>
          <ListRow title="Sair" tone="danger" leading={icon("log-out-outline", colors.danger)} onPress={signOut} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md },
  profile: { flexDirection: "row", alignItems: "center", gap: space.lg },
  profileText: { flex: 1, gap: space.xs },
  name: { ...type.heading },
  role: { ...type.label, color: colors.link },
  section: { ...type.label, color: colors.muted, marginTop: space.sm },
  menu: { padding: 0, overflow: "hidden", borderRadius: radius.lg },
});
