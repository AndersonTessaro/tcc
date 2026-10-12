import { Platform } from "react-native";

export type PickedFile = { uri: string; name: string; mimeType?: string; size?: number; file?: Blob };

export function appendFile(form: FormData, field: string, file: PickedFile) {
  if (Platform.OS === "web") {
    if (!file.file) throw new Error("Escolha novamente o arquivo para enviar.");
    form.append(field, file.file, file.name);
  } else {
    form.append(field, {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream",
    } as unknown as Blob);
  }
}
