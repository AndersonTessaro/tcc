import type { PickedFile } from "@/lib/http/formFile";

export const RECORDING_MAX_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", "3gp": "video/3gpp",
  m4a: "audio/mp4", mp3: "audio/mpeg", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg",
};

export function recordingMimeType(name: string, mimeType?: string): string | null {
  if (mimeType?.startsWith("audio/") || mimeType?.startsWith("video/")) return mimeType;
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? null;
}

export function recordingError(file: PickedFile): string | null {
  if (!recordingMimeType(file.name, file.mimeType)) return "Escolha um arquivo de áudio ou vídeo.";
  const size = file.size ?? file.file?.size;
  if (size != null && size > RECORDING_MAX_BYTES) return "O arquivo passa de 50 MB. Grave um vídeo mais curto ou envie só o áudio.";
  if (size != null && size <= 0) return "O arquivo está vazio.";
  return null;
}
