import { Alert, Platform } from "react-native";

type ConfirmOptions = { title: string; message?: string; confirmLabel: string; destructive?: boolean };

export function confirm({ title, message, confirmLabel, destructive }: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(globalThis.confirm?.(message ? `${title}\n\n${message}` : title) ?? true);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Voltar", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
