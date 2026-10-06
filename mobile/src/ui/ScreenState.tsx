import { useEffect } from "react";
import { AccessibilityInfo, ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";
import { SkeletonList } from "./Skeleton";
import { colors, space, type } from "./theme";

type ScreenStateProps = {
  loading?: boolean;
  skeleton?: boolean;
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  retry?: () => void;
  action?: { label: string; onPress: () => void };
};

export function ScreenState({ loading, skeleton, title, message, icon, retry, action }: ScreenStateProps) {
  const isError = !!retry;

  useEffect(() => {
    if (isError && message) AccessibilityInfo.announceForAccessibility(message);
  }, [isError, message]);

  if (loading) {
    return skeleton ? <SkeletonList /> : (
      <View style={styles.container}>
        <ActivityIndicator accessibilityLabel="Carregando" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name={icon ?? (isError ? "cloud-offline-outline" : "file-tray-outline")} size={40} color={isError ? colors.danger : colors.borderStrong} />
      {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
      {message ? <Text accessibilityRole={isError ? "alert" : undefined} accessibilityLiveRegion={isError ? "polite" : undefined} style={styles.message}>{message}</Text> : null}
      {retry ? <Button label="Tentar novamente" icon="refresh" onPress={retry} variant="secondary" compact /> : null}
      {action ? <Button label={action.label} onPress={action.onPress} compact /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: space.xxl, alignItems: "center", justifyContent: "center", gap: space.md },
  title: { ...type.heading, textAlign: "center" },
  message: { ...type.body, color: colors.muted, textAlign: "center", maxWidth: 320 },
});
