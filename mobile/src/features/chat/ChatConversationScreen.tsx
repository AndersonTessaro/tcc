import { useMemo, useRef } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { IconButton } from "@/ui/IconButton";
import { KeyboardScreen } from "@/ui/KeyboardScreen";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { TextField } from "@/ui/TextField";
import { colors, radius, space, type } from "@/ui/theme";
import type { ChatRole } from "./chatService";
import { useChatConversation, type ConversationMessage } from "./useChatConversation";

type Props = { role: ChatRole; peerId: string; peerName?: string };
type Row = { id: string; day: string } | { id: string; message: ConversationMessage };

export function ChatConversationScreen(props: Props) {
  if (!props.peerId) return (
    <KeyboardScreen style={styles.screen}>
      <ScreenHeader title={props.peerName?.trim() || "Conversa"} back />
      <ScreenState message="Conversa não encontrada." />
    </KeyboardScreen>
  );
  return <Conversation key={`${props.role}:${props.peerId}`} {...props} />;
}

function Conversation({ role, peerId, peerName }: Props) {
  const name = peerName?.trim() || "Conversa";
  const { messages, body, setBody, sending, send, ready } = useChatConversation(role, peerId);
  const list = useRef<FlatList<Row>>(null);
  const rows = useMemo(() => {
    const result: Row[] = [];
    let previous = "";
    for (const message of messages.data ?? []) {
      const day = new Date(message.sentAt).toLocaleDateString("pt-BR");
      if (day !== previous) result.push({ id: `day-${day}`, day });
      result.push({ id: message.id, message });
      previous = day;
    }
    return result.reverse();
  }, [messages.data]);

  return (
    <KeyboardScreen style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title={name} back />
      {messages.loading ? <ScreenState loading /> : messages.error ? (
        <ScreenState message={apiErrorMessage(messages.error, "Não foi possível carregar a conversa.")} retry={messages.reload} />
      ) : (
        <FlatList ref={list} style={styles.messages} data={rows} inverted keyExtractor={(item) => item.id}
          accessibilityLabel="Mensagens da conversa" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
          onContentSizeChange={() => list.current?.scrollToOffset({ offset: 0, animated: true })}
          ListEmptyComponent={<View style={styles.empty}><ScreenState icon="chatbubbles-outline" message="Envie a primeira mensagem." /></View>}
          renderItem={({ item }) => {
            if ("day" in item) return <Text accessibilityRole="header" style={styles.day}>{item.day}</Text>;
            const message = item.message;
            const time = new Date(message.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            return (
              <View accessible accessibilityRole="text"
                accessibilityLabel={`${message.mine ? "Você" : name}. ${message.body}. ${new Date(message.sentAt).toLocaleDateString("pt-BR")}, ${time}${message.pending ? ". Enviando" : ""}`}
                style={[styles.bubble, message.mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.body, message.mine && styles.mineText]}>{message.body}</Text>
                <Text style={[styles.time, message.mine && styles.mineText]}>{message.pending ? "Enviando…" : time}</Text>
              </View>
            );
          }} />
      )}
      <View style={styles.composer}>
        <View style={styles.input}>
          <TextField accessibilityLabel="Mensagem" placeholder="Digite uma mensagem" multiline maxLength={2000}
            value={body} onChangeText={setBody} editable={ready} style={styles.textInput} />
        </View>
        <IconButton icon="send" label="Enviar mensagem" filled disabled={!ready || !body.trim() || sending}
          onPress={() => void send()} />
      </View>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  messages: { flex: 1 },
  list: { flexGrow: 1, padding: space.lg, gap: space.sm },
  empty: { transform: [{ scaleY: -1 }] },
  day: { ...type.caption, textAlign: "center", marginVertical: space.md },
  bubble: { maxWidth: "85%", borderRadius: radius.lg, padding: space.md, gap: space.xs },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surface },
  body: { ...type.body },
  time: { ...type.caption, alignSelf: "flex-end" },
  mineText: { color: colors.onBrand },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, padding: space.md, backgroundColor: colors.surface },
  input: { flex: 1 },
  textInput: { minHeight: 44, maxHeight: 128 },
});
