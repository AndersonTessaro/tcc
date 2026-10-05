import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function saveDownload(bytes: ArrayBuffer, fileName: string, contentType?: string | null) {
  if (!await Sharing.isAvailableAsync()) throw new Error("FILE_SHARING_UNAVAILABLE");
  const name = fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_") || "material";
  const file = new File(Paths.cache, `${Date.now()}-${name}`);
  try {
    file.create();
    file.write(new Uint8Array(bytes));
    await Sharing.shareAsync(file.uri, { mimeType: contentType || "application/octet-stream", dialogTitle: "Salvar ou abrir material" });
  } finally {
    if (file.exists) file.delete();
  }
}
