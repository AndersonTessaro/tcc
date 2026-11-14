import { Platform } from "react-native";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { api } from "@/lib/http";
import { ApiError } from "@/lib/http/apiError";
import { appendFile, type PickedFile } from "@/lib/http/formFile";

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const listeners = new Set<() => void>();
let version = 0;

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
  async upload(image: { uri: string; width: number; height: number }) {
    const context = ImageManipulator.manipulate(image.uri);
    let { width, height } = image;
    if (width <= 0 || height <= 0) {
      const original = await context.renderAsync();
      width = original.width;
      height = original.height;
    }
    const scale = Math.min(1, 512 / Math.max(width, height));
    context.resize({ width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    const file: PickedFile = { uri: result.uri, name: "avatar.jpg", mimeType: "image/jpeg" };
    if (Platform.OS === "web") {
      const response = await fetch(result.uri);
      if (!response.ok) throw new Error("Unable to read compressed profile photo");
      file.file = await response.blob();
    }
    const form = new FormData();
    appendFile(form, "file", file);
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
