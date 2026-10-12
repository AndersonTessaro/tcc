import { Alert, Platform } from "react-native";

export function alert(title: string, message?: string): void {
  if (Platform.OS === "web") {
    globalThis.alert?.(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

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
