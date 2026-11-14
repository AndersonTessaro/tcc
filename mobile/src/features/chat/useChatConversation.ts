import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useResource } from "@/hooks/use-resource";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { useToast } from "@/ui/Toast";
import { teacherChatService, studentChatService, type ChatMessage, type ChatRole } from "./chatService";

export type ConversationMessage = ChatMessage & { pending?: boolean };

export function useChatConversation(role: ChatRole, peerId: string) {
  const service = role === "teacher" ? teacherChatService : studentChatService;
  const inFlight = useRef<Promise<ChatMessage[]> | null>(null);
  const sendingRef = useRef(false);
  const mounted = useRef(true);
  const firstFocus = useRef(true);
  const sequence = useRef(0);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const fetchMessages = useCallback(() => {
    if (!peerId) return Promise.reject(new Error("Missing peer"));
    if (!inFlight.current) {
      inFlight.current = service.messages(peerId).finally(() => { inFlight.current = null; });
    }
    return inFlight.current;
  }, [peerId, service]);
  const messages = useResource<ConversationMessage[]>(fetchMessages, `${role}:${peerId}`, { refetchOnFocus: false });
  const { reload, setData } = messages;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useFocusEffect(useCallback(() => {
    if (!firstFocus.current && !sendingRef.current && !inFlight.current) void reload();
    firstFocus.current = false;
    const interval = setInterval(() => {
      if (!inFlight.current && !sendingRef.current) void reload();
    }, 5000);
    return () => clearInterval(interval);
  }, [reload]));

  const ready = !!peerId && messages.data !== undefined && !messages.error;
  const send = async () => {
    const trimmed = body.trim();
    if (!ready || sendingRef.current || !trimmed || trimmed.length > 2000) return;
    sendingRef.current = true;
    setSending(true);
    setBody("");
    const optimistic: ConversationMessage = {
      id: `pending-${++sequence.current}`, body: trimmed, sentAt: new Date().toISOString(), mine: true, pending: true,
    };
    setData((current) => [...(current ?? []), optimistic]);
    try {
      const created = await service.send(peerId, trimmed);
      if (mounted.current) setData((current) => current?.map((item) => item.id === optimistic.id ? created : item));
    } catch (error) {
      if (mounted.current) {
        setData((current) => current?.filter((item) => item.id !== optimistic.id));
        setBody((current) => current || trimmed);
        toast.show(apiErrorMessage(error, "Não foi possível enviar a mensagem."), "error");
      }
    } finally {
      sendingRef.current = false;
      if (mounted.current) setSending(false);
    }
  };

  return { messages, body, setBody, sending, send, ready };
}
