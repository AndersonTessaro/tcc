import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { saveDownload } from "@/lib/files/saveDownload";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { useToast } from "@/ui/Toast";
import { colors, MIN_TOUCH, space, type } from "@/ui/theme";

type Props = {
  label: string;
  accessibilityLabel: string;
  fileName: string;
  contentType?: string | null;
  download: () => Promise<ArrayBuffer>;
  failureMessage: string;
  variant?: "button" | "row";
  sizeLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function DownloadButton({ label, accessibilityLabel, fileName, contentType, download, failureMessage, variant = "button", sizeLabel, style }: Props) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const downloadingRef = useRef(false);

  const handleDownload = async () => {
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloading(true);
    try {
      await saveDownload(await download(), fileName, contentType);
      toast.show(`${fileName} pronto para salvar`, "success");
    } catch (cause) {
      toast.show(apiErrorMessage(cause, failureMessage), "error");
    } finally {
      downloadingRef.current = false;
      setDownloading(false);
    }
  };

  if (variant === "row") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy: downloading }}
        onPress={handleDownload}
        style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
      >
        <Ionicons name="document-text-outline" size={20} color={colors.muted} accessible={false} />
        <Text numberOfLines={2} style={styles.name}>{fileName}</Text>
        {sizeLabel ? <Text style={styles.size}>{sizeLabel}</Text> : null}
        {downloading
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Ionicons name="download-outline" size={18} color={colors.primary} accessible={false} />}
      </Pressable>
    );
  }

  return (
    <Button
      label={label}
      accessibilityLabel={accessibilityLabel}
      variant="ghost"
      icon="download-outline"
      compact
      loading={downloading}
      onPress={handleDownload}
      style={[styles.download, style]}
    />
  );
}

const styles = StyleSheet.create({
  download: { alignSelf: "flex-start" },
  row: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: space.sm },
  pressed: { opacity: 0.6 },
  name: { ...type.body, flex: 1 },
  size: { ...type.caption },
});
