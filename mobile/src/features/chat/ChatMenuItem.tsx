import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useResource } from "@/hooks/use-resource";
import { ListRow } from "@/ui/ListRow";
import { colors } from "@/ui/theme";
import { teacherChatService, studentChatService, type ChatRole } from "./chatService";
import { ChatUnreadBadge, unreadLabel } from "./ChatUnreadBadge";

export function ChatMenuItem({ role }: { role: ChatRole }) {
  const router = useRouter();
  const service = role === "teacher" ? teacherChatService : studentChatService;
  const unread = useResource(() => service.unreadCount().catch(() => ({ count: 0 })), role);
  const count = unread.data?.count ?? 0;
  return (
    <ListRow variant="plain" title="Chat" accessibilityLabel={count > 0 ? `Chat, ${unreadLabel(count)}` : "Chat"}
      leading={<Ionicons name="chatbubbles-outline" size={26} color={colors.text} accessible={false} />}
      trailing={count > 0 ? <ChatUnreadBadge count={count} /> : undefined}
      onPress={() => router.push(role === "teacher" ? "/teacher/chats" : "/(student)/chats")} />
  );
}
