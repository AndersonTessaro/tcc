import type { PickedFile } from "@/lib/http/formFile";
import { VIDEO_RECORDING_MAX_BYTES, recordingMimeType } from "@/features/student/recording";

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
  const video = !!attachmentMimeType(file.name, file.mimeType)?.startsWith("video/");
  if (size != null && size > (video ? VIDEO_RECORDING_MAX_BYTES : ATTACHMENT_MAX_BYTES))
    return video ? "O vídeo passa de 150 MB. Envie um vídeo mais curto." : "O arquivo passa de 50 MB.";
  if (size != null && size <= 0) return "O arquivo está vazio.";
  return null;
}

type GalleryAsset = { uri: string; fileName?: string | null; mimeType?: string; fileSize?: number; file?: Blob; type?: string | null };

const GALLERY_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/3gpp": "3gp", "video/x-matroska": "mkv",
};

// Android gallery providers may return a name without extension; the server allowlist goes by extension.
export function galleryAttachment(asset: GalleryAsset): PickedFile {
  const video = asset.type === "video" || !!asset.mimeType?.startsWith("video/");
  const mimeType = asset.mimeType ?? (video ? "video/mp4" : "image/jpeg");
  const base = asset.fileName || asset.uri.split("/").pop()?.split("?")[0] || (video ? "video" : "foto");
  const name = attachmentMimeType(base) ? base : `${base}.${GALLERY_EXTENSION_BY_MIME[mimeType] ?? (video ? "mp4" : "jpg")}`;
  return { uri: asset.uri, name, mimeType, size: asset.fileSize, file: asset.file };
}
