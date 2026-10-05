import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

export function ScreenState({ loading, message, retry }: { loading?: boolean; message?: string; retry?: () => void }) {
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator accessibilityLabel="Carregando" color={colors.accent} /> : <>
        <Text accessibilityRole={retry ? "alert" : undefined} style={styles.message}>{message}</Text>
        {retry ? <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></Pressable> : null}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 16 },
  message: { color: colors.muted, fontSize: 14, textAlign: "center" },
  retry: { backgroundColor: "#6C45BE", borderRadius: 8, minHeight: 48, paddingHorizontal: 20, justifyContent: "center" },
  retryText: { color: colors.surface, fontSize: 14, fontWeight: "600" },
});
