import { useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { confirm } from "@/lib/confirm";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { TextField } from "@/ui/TextField";
import { colors, radius, space, type } from "@/ui/theme";

type StudentNoteEditorProps = {
  title: string;
  hint: string;
  initialValue: string;
  onSubmit: (value: string) => Promise<unknown>;
  onClose: () => void;
  onSaved: (value: string) => void;
};

export function StudentNoteEditor({ title, hint, initialValue, onSubmit, onClose, onSaved }: StudentNoteEditorProps) {
  const reducedMotion = useReducedMotion();
  const pending = useRef(false);
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const close = async () => {
    if (pending.current) return;
    if (value === initialValue || await confirm({ title: "Descartar alterações?", message: "O texto digitado será perdido.", confirmLabel: "Descartar", destructive: true })) onClose();
  };

  const save = async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      await onSubmit(value.trim());
      onSaved(value.trim());
    } catch (cause) {
      setError(apiErrorMessage(cause, "Não foi possível salvar. Tente novamente."));
      setSaving(false);
    } finally {
      pending.current = false;
    }
  };

  return (
    <Modal visible transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={close}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={close} />
        <View accessibilityViewIsModal style={styles.editor}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <TextField label={title} value={value} onChangeText={setValue} multiline maxLength={1000} hint={hint} editable={!saving} autoFocus />
            {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
            <Button label="Salvar" onPress={save} loading={saving} />
            <Button label="Cancelar" variant="ghost" onPress={close} disabled={saving} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: "center", padding: space.xxl },
  editor: { backgroundColor: colors.surface, borderRadius: radius.lg, maxHeight: "90%" },
  content: { padding: space.xl, gap: space.md },
  title: { ...type.title },
  error: { color: colors.danger, fontSize: 13 },
});
