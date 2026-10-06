import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/features/auth/useAuth";
import { authService } from "@/features/auth/authService";
import { fullName } from "@/features/student/dashboard";
import { confirm } from "@/lib/confirm";
import { ListRow } from "@/ui/ListRow";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { colors, radius, shadow, space, type } from "@/ui/theme";

const icons = {
  user: require("@/assets/images/figma-student/menu-user.png"),
  instrument: require("@/assets/images/figma-student/menu-instrument.png"),
  goals: require("@/assets/images/figma-student/menu-settings.png"),
  help: require("@/assets/images/figma-student/menu-help.png"),
  exit: require("@/assets/images/figma-student/menu-exit.png"),
};

function MenuIcon({ source }: { source: number }) {
  return <Image source={source} style={styles.rowIcon} accessible={false} />;
}

export default function More() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const name = user?.displayName || fullName(user?.username);

  const signOut = async () => {
    const confirmed = await confirm({ title: "Sair da conta?", message: "Você precisará entrar novamente.", confirmLabel: "Sair", destructive: true });
    if (!confirmed) return;
    await authService.logout().catch(() => undefined);
    logout();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Mais" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View accessible accessibilityLabel={`Perfil: ${name}${user?.username ? `, usuário ${user.username}` : ""}`} style={styles.profile}>
          <Image source={icons.user} style={styles.avatar} accessible={false} />
          <View style={styles.profileText}>
            <Text numberOfLines={2} style={styles.name}>{name}</Text>
            {user?.username ? <Text numberOfLines={1} style={styles.username}>{user.username}</Text> : null}
          </View>
        </View>

        <View style={styles.menu}>
          <ListRow title="Materiais" subtitle="Arquivos enviados pelo professor" leading={<MenuIcon source={icons.instrument} />} onPress={() => router.push("/(student)/materials")} />
          <ListRow title="Minhas metas" subtitle="Acompanhe e crie metas" leading={<MenuIcon source={icons.goals} />} onPress={() => router.push("/(student)/goals")} />
          <ListRow title="Ajuda" leading={<MenuIcon source={icons.help} />} onPress={() => Alert.alert("Ajuda", "Para dúvidas sobre aulas ou acesso, procure a secretaria da escola.")} />
        </View>

        <View style={styles.menu}>
          <ListRow title="Sair" tone="danger" leading={<MenuIcon source={icons.exit} />} onPress={signOut} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  profile: { flexDirection: "row", alignItems: "center", gap: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  avatar: { width: 56, height: 56 },
  profileText: { flex: 1, gap: 2 },
  name: { ...type.heading },
  username: { ...type.caption },
  menu: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surface, gap: 1 },
  rowIcon: { width: 26, height: 26 },
});
