import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useResource } from "@/hooks/use-resource";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Card } from "@/ui/Card";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { colors, space, type } from "@/ui/theme";
import { teacherChatService, studentChatService, type ChatRole, type ChatSummary } from "./chatService";
import { ChatUnreadBadge, unreadLabel } from "./ChatUnreadBadge";
import { chatTime } from "./chatTime";

export function ChatListScreen({ role }: { role: ChatRole }) {
  const router = useRouter();
  const chats = useResource((role === "teacher" ? teacherChatService : studentChatService).list, role);
  const open = (chat: ChatSummary) => {
    if (role === "teacher") router.push({ pathname: "/teacher/chat/[studentId]", params: { studentId: chat.peerId, peerName: chat.peerName } });
    else router.push({ pathname: "/(student)/chat/[teacherId]", params: { teacherId: chat.peerId, peerName: chat.peerName } });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Chat" back />
      {chats.loading ? <ScreenState loading /> : chats.error ? (
        <ScreenState message={apiErrorMessage(chats.error, "Não foi possível carregar as conversas.")} retry={chats.reload} />
      ) : (
        <FlatList accessibilityLabel="Conversas" data={chats.data ?? []} keyExtractor={(item) => item.peerId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={chats.refreshing} onRefresh={chats.refresh} tintColor={colors.primary} />}
          ListEmptyComponent={<ScreenState icon="chatbubbles-outline" title="Nenhuma conversa ainda."
            message={role === "teacher" ? "As conversas aparecem para alunos com matrícula ativa." : "As conversas aparecem para professores com matrícula ativa."} />}
          renderItem={({ item }) => (
            <Card onPress={() => open(item)} accessibilityLabel={[item.peerName, item.lastMessage || "Envie a primeira mensagem.", item.lastMessageAt ? chatTime(item.lastMessageAt) : "", item.unread > 0 ? unreadLabel(item.unread) : ""].filter(Boolean).join(". ")}>
              <View style={styles.row}>
                <View style={styles.preview}>
                  <Text numberOfLines={1} style={styles.name}>{item.peerName}</Text>
                  <Text numberOfLines={1} style={styles.message}>{item.lastMessage || "Envie a primeira mensagem."}</Text>
                </View>
                <View style={styles.metadata}>
                  {item.lastMessageAt ? <Text style={styles.time}>{chatTime(item.lastMessageAt)}</Text> : null}
                  <ChatUnreadBadge count={item.unread} />
                </View>
              </View>
            </Card>
          )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  list: { flexGrow: 1, paddingHorizontal: space.screenGutter, paddingBottom: space.xxl, gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  preview: { flex: 1, gap: space.xs },
  name: { ...type.bodyStrong },
  message: { ...type.caption },
  metadata: { alignItems: "flex-end", gap: space.sm },
  time: { ...type.caption },
});
