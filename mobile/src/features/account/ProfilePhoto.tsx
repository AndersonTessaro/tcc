import { useState, type RefObject } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Avatar } from "@/ui/Avatar";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { colors, space, type } from "@/ui/theme";
import { avatarService, AvatarValidationError } from "./avatarService";

type ProfilePhotoProps = {
  hasAvatar: boolean;
  onChanged: (hasAvatar: boolean) => void;
  mutationLock: RefObject<boolean>;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
};

export function ProfilePhoto({ hasAvatar, onChanged, mutationLock, disabled, onBusyChange }: ProfilePhotoProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = async (remove: boolean) => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      if (remove) {
        await avatarService.remove();
        onChanged(false);
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: ["image/png", "image/jpeg"], copyToCacheDirectory: true });
        if (result.canceled || !result.assets[0]) return;
        await avatarService.upload(result.assets[0]);
        onChanged(true);
      }
    } catch (cause) {
      setError(cause instanceof AvatarValidationError ? cause.message : apiErrorMessage(cause, "Não foi possível atualizar a foto. Tente novamente."));
    } finally {
      mutationLock.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };
  return (
    <Card style={styles.card}>
      <Avatar hasAvatar={hasAvatar} size={80} label="Foto de perfil" />
      <Text style={styles.caption}>PNG ou JPEG, até 2 MB</Text>
      <View style={styles.actions}>
        <Button label="Escolher foto" variant="secondary" onPress={() => { void change(false); }} disabled={busy || disabled} />
        {hasAvatar ? <Button label="Remover foto" variant="ghost" onPress={() => { void change(true); }} disabled={busy || disabled} /> : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, alignItems: "center" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" },
  caption: { ...type.caption },
  error: { ...type.caption, color: colors.danger },
});
