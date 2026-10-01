import { Alert, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/useAuth";
import { authService } from "@/features/auth/authService";

const icons = {
  user: require("@/assets/images/figma-student/menu-user.png"),
  instrument: require("@/assets/images/figma-student/menu-instrument.png"),
  settings: require("@/assets/images/figma-student/menu-settings.png"),
  notifications: require("@/assets/images/figma-student/menu-notifications.png"),
  help: require("@/assets/images/figma-student/menu-help.png"),
  exit: require("@/assets/images/figma-student/menu-exit.png"),
};

function displayName(username?: string) {
  const name = username?.split("@")[0].replace(/[._-]+/g, " ").trim();
  return name ? name.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase()) : "Aluno";
}

export default function More() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const signOut = async () => {
    await authService.logout().catch(() => {});
    logout();
  };

  const openProfile = () => Alert.alert("Perfil", user?.displayName || user?.username || "Aluno", [
    { text: "Materiais", onPress: () => router.push("/(student)/materials") },
    { text: "Metas", onPress: () => router.push("/(student)/goals") },
    { text: "Fechar", style: "cancel" },
  ]);

  const menuItems = [
    { label: "Instrumento", icon: icons.instrument, action: () => router.push("/(student)/lessons") },
    { label: "Configurações", icon: icons.settings, action: () => Alert.alert("Configurações", "Configurações pessoais ainda não disponíveis.") },
    { label: "Notificações", icon: icons.notifications, action: () => Alert.alert("Notificações", "Nenhuma notificação no momento.") },
    { label: "Ajuda", icon: icons.help, action: () => Alert.alert("Ajuda", "Consulte a escola para obter suporte.") },
    { label: "Sair", icon: icons.exit, action: signOut },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <View style={[styles.header, { paddingTop: insets.top + 34 }]}><Text style={styles.title}>Mais</Text></View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver perfil" onPress={openProfile} style={styles.profile}>
          <Image source={icons.user} style={styles.avatar} />
          <View style={styles.profileText}>
            <Text numberOfLines={1} style={styles.name}>{user?.displayName || displayName(user?.username)}</Text>
            <Text style={styles.profileLink}>Ver perfil</Text>
          </View>
          <Text style={styles.chevron}>&gt;</Text>
        </Pressable>
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <Pressable key={item.label} accessibilityRole="button" onPress={item.action} style={styles.row}>
              <Image source={item.icon} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.chevron}>&gt;</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  header: { height: 135, paddingHorizontal: 29 },
  title: { color: "#000000", fontSize: 18, fontWeight: "700", textAlign: "center" },
  content: { paddingHorizontal: 29, paddingTop: 24, paddingBottom: 30 },
  profile: { height: 98, borderWidth: 1, borderColor: "#D3D3D3", borderRadius: 15, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 15 },
  avatar: { width: 60, height: 60 },
  profileText: { flex: 1, marginLeft: 18, gap: 8 },
  name: { color: "#000000", fontSize: 14, fontWeight: "700" },
  profileLink: { color: "#572AA8", fontSize: 14 },
  chevron: { color: "#000000", fontSize: 14, fontWeight: "300", marginRight: 13 },
  menu: { marginTop: 42, gap: 21 },
  row: { minHeight: 46, borderBottomWidth: 2, borderBottomColor: "#D9D9D9", flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 10, paddingBottom: 14 },
  rowIcon: { width: 30, height: 30 },
  rowLabel: { color: "#000000", fontSize: 14, fontWeight: "500", flex: 1, marginLeft: 13, marginTop: 6 },
  });
