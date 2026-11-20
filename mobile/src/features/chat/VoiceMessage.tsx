import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { playableUri } from "@/lib/files/playableUri";
import { useToast } from "@/ui/Toast";
import { colors, MIN_TOUCH, space, type } from "@/ui/theme";
import type { ChatAudio } from "./chatService";

type Props = { audio: ChatAudio; mine: boolean; download: () => Promise<ArrayBuffer> };

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function VoiceMessage({ audio, mine, download }: Props) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const tint = mine ? colors.onBrand : colors.primary;

  const toggle = async () => {
    if (status.playing) return player.pause();
    try {
      if (!loaded) {
        setLoading(true);
        player.replace({ uri: await playableUri(await download(), audio.contentType) });
        setLoaded(true);
      } else if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
        await player.seekTo(0);
      }
      player.play();
    } catch {
      toast.show("Não foi possível tocar o áudio.", "error");
    } finally {
      setLoading(false);
    }
  };

  const label = status.playing ? "Pausar mensagem de voz" : "Ouvir mensagem de voz";
  const progress = status.duration > 0 ? `${clock(status.currentTime)} / ${clock(status.duration)}` : "Mensagem de voz";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ busy: loading }}
      onPress={() => void toggle()} disabled={loading} style={styles.row} hitSlop={4}>
      <Ionicons name={status.playing ? "pause-circle" : "play-circle"} size={32} color={tint} />
      <Text style={[styles.text, { color: tint }]}>{loading ? "Carregando…" : progress}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: space.sm },
  text: { ...type.body },
});
