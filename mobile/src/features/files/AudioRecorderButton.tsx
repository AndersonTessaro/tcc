import { useState } from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import type { PickedFile } from "@/lib/http/formFile";
import { Button } from "@/ui/Button";
import { useToast } from "@/ui/Toast";

type Props = {
  onRecorded: (file: PickedFile) => void;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const elapsed = (millis: number) => {
  const seconds = Math.floor(millis / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

// Browsers record webm (Chrome/Firefox) or mp4 (Safari); native presets record AAC in an m4a container.
async function recordedFile(uri: string): Promise<PickedFile> {
  const stamp = recordingStamp(new Date());
  if (Platform.OS !== "web") return { uri, name: `gravacao-${stamp}.m4a`, mimeType: "audio/mp4" };
  const blob = await (await fetch(uri)).blob();
  const mimeType = blob.type.split(";")[0] || "audio/webm";
  const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
  return { uri, name: `gravacao-${stamp}.${extension}`, mimeType, size: blob.size, file: blob };
}

// ASCII only: OkHttp on Android rejects non-ASCII file names in multipart headers.
function recordingStamp(date: Date) {
  const two = (value: number) => String(value).padStart(2, "0");
  return `${two(date.getDate())}-${two(date.getMonth() + 1)}-${date.getFullYear()}-${two(date.getHours())}h${two(date.getMinutes())}m${two(date.getSeconds())}`;
}

export function AudioRecorderButton({ onRecorded, disabled, compact, style }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { durationMillis } = useAudioRecorderState(recorder);
  const [recording, setRecording] = useState(false);
  const toast = useToast();

  const start = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        toast.show("Permita o acesso ao microfone para gravar.", "error");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch {
      toast.show("Não foi possível iniciar a gravação.", "error");
    }
  };

  const stop = async () => {
    try {
      await recorder.stop();
      setRecording(false);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!recorder.uri) throw new Error("NO_RECORDING");
      onRecorded(await recordedFile(recorder.uri));
    } catch {
      setRecording(false);
      toast.show("Não foi possível salvar a gravação.", "error");
    }
  };

  return recording ? (
    <Button label={`Parar · ${elapsed(durationMillis)}`} accessibilityLabel={`Parar gravação, ${elapsed(durationMillis)}`}
      icon="stop-circle-outline" variant="danger" compact={compact} style={style} onPress={stop} />
  ) : (
    <Button label="Gravar áudio" icon="mic-outline" variant="secondary" compact={compact} style={style}
      disabled={disabled} onPress={start} />
  );
}
