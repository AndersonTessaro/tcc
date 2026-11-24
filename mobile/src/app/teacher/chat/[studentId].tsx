import { useLocalSearchParams } from "expo-router";
import { ChatConversationScreen } from "@/features/chat/ChatConversationScreen";

export default function Chat() {
  const { studentId, peerName } = useLocalSearchParams<{ studentId?: string; peerName?: string }>();
  return <ChatConversationScreen role="teacher" peerId={typeof studentId === "string" ? studentId : ""}
    peerName={typeof peerName === "string" ? peerName : undefined} />;
}
