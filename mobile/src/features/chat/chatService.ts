import { api } from "@/lib/http";
import { ApiError } from "@/lib/http/apiError";

export type ChatRole = "teacher" | "student";
export type ChatSummary = {
  peerId: string;
  peerName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
};
export type ChatMessage = { id: string; body: string; sentAt: string; mine: boolean };
type ChatRow = Omit<ChatSummary, "peerId" | "peerName"> & (
  { studentId: string; studentName: string } | { teacherId: string; teacherName: string }
);

export function createChatService(role: ChatRole) {
  const base = role === "teacher" ? "/teacher/chats" : "/me/chats";
  const messagesPath = (peerId: string) => `${base}/${encodeURIComponent(peerId)}/messages`;
  return {
    async list(): Promise<ChatSummary[]> {
      const rows = await api.get<ChatRow[]>(base);
      return rows.map((row) => ({
        peerId: "studentId" in row ? row.studentId : row.teacherId,
        peerName: "studentName" in row ? row.studentName : row.teacherName,
        lastMessage: row.lastMessage, lastMessageAt: row.lastMessageAt, unread: row.unread,
      }));
    },
    messages: (peerId: string) => api.get<ChatMessage[]>(messagesPath(peerId)),
    async send(peerId: string, body: string) {
      const trimmed = body.trim();
      if (!trimmed || trimmed.length > 2000) throw new ApiError(422, "VALIDATION");
      return api.post<ChatMessage>(messagesPath(peerId), { body: trimmed });
    },
    unreadCount: () => api.get<{ count: number }>(base + "/unread-count"),
  };
}

export const teacherChatService = createChatService("teacher");
export const studentChatService = createChatService("student");
