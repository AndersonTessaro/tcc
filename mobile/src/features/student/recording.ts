import type { PickedFile } from "@/lib/http/formFile";

export const RECORDING_MAX_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", "3gp": "video/3gpp",
  m4a: "audio/mp4", mp3: "audio/mpeg", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg",
  opus: "audio/ogg", flac: "audio/flac", amr: "audio/amr",
};

// Mirrors the server allowlist (PracticeRecordingRule): an unknown extension is rejected even with an audio/video type.
export function recordingMimeType(name: string, mimeType?: string): string | null {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const byExtension = MIME_BY_EXTENSION[extension];
  if (!byExtension) return null;
  return mimeType?.startsWith("audio/") || mimeType?.startsWith("video/") ? mimeType : byExtension;
}

export function recordingError(file: PickedFile): string | null {
  if (!recordingMimeType(file.name, file.mimeType)) return "Escolha um arquivo de áudio ou vídeo.";
  const size = file.size ?? file.file?.size;
  if (size != null && size > RECORDING_MAX_BYTES) return "O arquivo passa de 50 MB. Grave um vídeo mais curto ou envie só o áudio.";
  if (size != null && size <= 0) return "O arquivo está vazio.";
  return null;
}
