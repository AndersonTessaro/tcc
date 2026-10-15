import { useRef } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/features/auth/useAuth";
import { accountService } from "@/features/account/accountService";
import { useResource } from "@/hooks/use-resource";
import { authService } from "@/features/auth/authService";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";
import { confirm } from "@/lib/confirm";
import { Card } from "@/ui/Card";
import { ListRow } from "@/ui/ListRow";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { colors, space, type } from "@/ui/theme";

const avatarImage = require("@/assets/images/figma-student/menu-user.png");

type MenuIcon = keyof typeof Ionicons.glyphMap;

export default function More() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const account = useResource(accountService.get);
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollToTop(scrollRef);

  const signOut = async () => {
    if (!(await confirm({ title: "Sair da conta?", message: "Você precisará entrar novamente.", confirmLabel: "Sair", destructive: true }))) return;
    await authService.logout().catch(() => undefined);
    logout();
  };

  const icon = (name: MenuIcon, color: string = colors.text) => <Ionicons name={name} size={26} color={color} accessible={false} />;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Mais" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver perfil" onPress={() => router.push("/teacher/profile")}>
          <Card variant="outlined" style={styles.profile}>
            <Image source={avatarImage} style={styles.avatar} accessible={false} />
            <View style={styles.profileText}>
              <Text style={styles.name}>{account.data?.displayName || user?.displayName || user?.username || "Professor"}</Text>
              <Text style={styles.role}>Ver perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.muted} accessible={false} />
          </Card>
        </Pressable>

        <View>
          <ListRow variant="plain" title="Turmas" accessibilityLabel="Turmas" leading={icon("people-outline")} onPress={() => router.push("/teacher/classes")} />
          <ListRow variant="plain" title="Horários" accessibilityLabel="Horários" leading={icon("time-outline")} onPress={() => router.push("/teacher/schedules")} />
          <ListRow variant="plain" title="Reposições" accessibilityLabel="Reposições" leading={icon("repeat")} onPress={() => router.push("/teacher/makeups")} />
          <ListRow variant="plain" title="Histórico de aulas" accessibilityLabel="Histórico de aulas" leading={icon("document-text-outline")} onPress={() => router.push("/teacher/history")} />
          <ListRow variant="plain" title="Financeiro" accessibilityLabel="Financeiro" leading={icon("wallet-outline")} onPress={() => router.push("/teacher/finance")} />
          <ListRow variant="plain" title="Configurações" accessibilityLabel="Configurações" leading={icon("settings-outline")} onPress={() => router.push("/teacher/settings")} />
          <ListRow variant="plain" title="Ajuda" accessibilityLabel="Ajuda" leading={icon("help-circle-outline")} onPress={() => router.push("/teacher/help")} />
          <ListRow variant="plain" title="Sair" accessibilityLabel="Sair" leading={icon("log-out-outline")} onPress={signOut} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.screenGutter, paddingBottom: space.xxxl, gap: space.screenGutter },
  profile: { minHeight: 98, flexDirection: "row", alignItems: "center", gap: space.xl },
  profileText: { flex: 1, gap: space.xs },
  name: { ...type.heading },
  role: { ...type.label, color: colors.link },
  avatar: { width: 60, height: 60 },
});
