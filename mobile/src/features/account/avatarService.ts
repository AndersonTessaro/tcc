import { api } from "@/lib/http";
import { ApiError } from "@/lib/http/apiError";
import { appendFile, type PickedFile } from "@/lib/http/formFile";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const listeners = new Set<() => void>();
let version = 0;

export class AvatarValidationError extends Error {}

function invalidate() {
  version++;
  listeners.forEach((listener) => listener());
}

function imageDataUri(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0;
    parts.push(BASE64[a >> 2] + BASE64[((a & 3) << 4) | (b >> 4)]
      + (i + 1 < bytes.length ? BASE64[((b & 15) << 2) | (c >> 6)] : "=")
      + (i + 2 < bytes.length ? BASE64[c & 63] : "="));
  }
  return `data:image/${bytes[0] === 137 ? "png" : "jpeg"};base64,${parts.join("")}`;
}

export const avatarService = {
  async get(userId?: string): Promise<string | null> {
    try {
      return imageDataUri(await api.getBytes(userId ? `/users/${userId}/avatar` : "/account/avatar"));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
  async upload(file: PickedFile) {
    if ((file.size ?? file.file?.size ?? 0) > MAX_AVATAR_BYTES) throw new AvatarValidationError("Escolha uma foto de até 2 MB.");
    const mimeType = file.mimeType || (/\.png$/i.test(file.name) ? "image/png" : /\.jpe?g$/i.test(file.name) ? "image/jpeg" : "");
    if (!["image/png", "image/jpeg"].includes(mimeType)) throw new AvatarValidationError("Escolha uma foto PNG ou JPEG.");
    const form = new FormData();
    appendFile(form, "file", { ...file, mimeType });
    await api.putForm<void>("/account/avatar", form);
    invalidate();
  },
  async remove() {
    await api.del("/account/avatar");
    invalidate();
  },
  getVersion: () => version,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
