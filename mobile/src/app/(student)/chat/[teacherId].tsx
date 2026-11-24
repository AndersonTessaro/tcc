import { useLocalSearchParams } from "expo-router";
import { ChatConversationScreen } from "@/features/chat/ChatConversationScreen";

export default function Chat() {
  const { teacherId, peerName } = useLocalSearchParams<{ teacherId?: string; peerName?: string }>();
  return <ChatConversationScreen role="student" peerId={typeof teacherId === "string" ? teacherId : ""}
    peerName={typeof peerName === "string" ? peerName : undefined} />;
}
