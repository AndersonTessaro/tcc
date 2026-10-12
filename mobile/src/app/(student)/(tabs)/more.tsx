import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/features/auth/useAuth";
import { authService } from "@/features/auth/authService";
import { fullName } from "@/features/student/dashboard";
import { alert, confirm } from "@/lib/confirm";
import { Card } from "@/ui/Card";
import { ListRow } from "@/ui/ListRow";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { colors, space, type } from "@/ui/theme";

const icons = {
  user: require("@/assets/images/figma-student/menu-user.png"),
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
        <Card>
          <View accessible accessibilityLabel={`Perfil: ${name}${user?.username ? `, usuário ${user.username}` : ""}`} style={styles.profile}>
            <Image source={icons.user} style={styles.avatar} accessible={false} />
            <View style={styles.profileText}>
              <Text numberOfLines={2} style={styles.name}>{name}</Text>
              {user?.username ? <Text numberOfLines={1} style={styles.username}>{user.username}</Text> : null}
            </View>
          </View>
        </Card>

        <View>
          <ListRow variant="plain" title="Materiais" subtitle="Arquivos enviados pelo professor" leading={<Ionicons name="document-text-outline" size={26} color={colors.text} accessible={false} />} onPress={() => router.push("/(student)/materials")} />
          <ListRow variant="plain" title="Minhas metas" subtitle="Acompanhe e crie metas" leading={<Ionicons name="flag-outline" size={26} color={colors.text} accessible={false} />} onPress={() => router.push("/(student)/goals")} />
          <ListRow variant="plain" title="Ajuda" leading={<MenuIcon source={icons.help} />} onPress={() => alert("Ajuda", "Para dúvidas sobre aulas ou acesso, procure a secretaria da escola.")} />
          <ListRow variant="plain" title="Sair" tone="danger" leading={<MenuIcon source={icons.exit} />} onPress={signOut} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: space.screenGutter, paddingBottom: space.xxl, gap: space.screenGutter },
  profile: { flexDirection: "row", alignItems: "center", gap: space.lg },
  avatar: { width: 56, height: 56 },
  profileText: { flex: 1, gap: 2 },
  name: { ...type.heading },
  username: { ...type.caption },
  rowIcon: { width: 26, height: 26 },
});
