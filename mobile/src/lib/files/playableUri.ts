import { File, Paths } from "expo-file-system";

const EXTENSION: Record<string, string> = { "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/webm": "webm", "audio/mpeg": "mp3" };

export async function playableUri(bytes: ArrayBuffer, contentType: string): Promise<string> {
  const extension = EXTENSION[contentType.split(";")[0]] ?? "audio";
  const file = new File(Paths.cache, `voice-${Date.now()}.${extension}`);
  file.create();
  file.write(new Uint8Array(bytes));
  return file.uri;
}
