import type { PickedFile } from "@/lib/http/formFile";
import { recordingMimeType } from "@/features/student/recording";

export const ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;
export const ATTACHMENT_MAX_COUNT = 10;
export const ATTACHMENT_PICKER_TYPES = ["application/pdf", "image/*", "audio/*", "video/*"];

const DOCUMENT_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", heic: "image/heic", heif: "image/heif",
};

// Mirrors the server allowlist (LessonAttachmentRule).
export function attachmentMimeType(name: string, mimeType?: string): string | null {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const document = DOCUMENT_MIME_BY_EXTENSION[extension];
  if (document) return mimeType && (mimeType === "application/pdf" || mimeType.startsWith("image/")) ? mimeType : document;
  return recordingMimeType(name, mimeType);
}

export function attachmentError(file: PickedFile, currentCount: number): string | null {
  if (currentCount >= ATTACHMENT_MAX_COUNT) return `A aula já tem ${ATTACHMENT_MAX_COUNT} anexos.`;
  if (!attachmentMimeType(file.name, file.mimeType)) return "Escolha um PDF, imagem, áudio ou vídeo.";
  const size = file.size ?? file.file?.size;
  if (size != null && size > ATTACHMENT_MAX_BYTES) return "O arquivo passa de 50 MB.";
  if (size != null && size <= 0) return "O arquivo está vazio.";
  return null;
}
