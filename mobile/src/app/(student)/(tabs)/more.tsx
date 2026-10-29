import { useRef } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/features/auth/useAuth";
import { accountService } from "@/features/account/accountService";
import { useResource } from "@/hooks/use-resource";
import { useTabScrollToTop } from "@/hooks/use-tab-scroll-to-top";
import { Avatar } from "@/ui/Avatar";
import { authService } from "@/features/auth/authService";
import { fullName } from "@/features/student/dashboard";
import { alert, confirm } from "@/lib/confirm";
import { Card } from "@/ui/Card";
import { ListRow } from "@/ui/ListRow";
import { TabHeader } from "@/ui/TabHeader";
import { colors, space, type } from "@/ui/theme";

const icons = {
  help: require("@/assets/images/figma-student/menu-help.png"),
  exit: require("@/assets/images/figma-student/menu-exit.png"),
};

function MenuIcon({ source }: { source: number }) {
  return <Image source={source} style={styles.rowIcon} accessible={false} />;
}

export default function More() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const account = useResource(accountService.get);
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollToTop(scrollRef);
  const name = account.data?.displayName || user?.displayName || fullName(user?.username);

  const signOut = async () => {
    const confirmed = await confirm({ title: "Sair da conta?", message: "Você precisará entrar novamente.", confirmLabel: "Sair", destructive: true });
    if (!confirmed) return;
    await authService.logout().catch(() => undefined);
    logout();
  };

  return (
    <View style={styles.screen}>
      <TabHeader title="Mais" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={account.refreshing} onRefresh={account.refresh} tintColor={colors.primary} />}>
        <Card onPress={() => router.push("/(student)/profile")} accessibilityLabel="Ver perfil">
          <View style={styles.profile}>
            <Avatar size={56} hasAvatar={account.data?.hasAvatar} />
            <View style={styles.profileText}>
              <Text numberOfLines={2} style={styles.name}>{name}</Text>
              {user?.username ? <Text numberOfLines={1} style={styles.username}>{user.username}</Text> : null}
              <Text style={styles.profileLink}>Ver perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.muted} accessible={false} />
          </View>
        </Card>

        <View>
          <ListRow variant="plain" title="Materiais" subtitle="Arquivos enviados pelo professor" leading={<Ionicons name="document-text-outline" size={26} color={colors.text} accessible={false} />} onPress={() => router.push("/(student)/materials")} />
          <ListRow variant="plain" title="Observações do professor" leading={<Ionicons name="chatbox-ellipses-outline" size={26} color={colors.text} accessible={false} />} onPress={() => router.push("/(student)/teacher-notes")} />
          <ListRow variant="plain" title="Minhas metas" subtitle="Acompanhe e crie metas" leading={<Ionicons name="flag-outline" size={26} color={colors.text} accessible={false} />} onPress={() => router.push("/(student)/goals?from=more")} />
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
  profileLink: { ...type.label, color: colors.link },
  profileText: { flex: 1, gap: 2 },
  name: { ...type.heading },
  username: { ...type.caption },
  rowIcon: { width: 26, height: 26 },
});
