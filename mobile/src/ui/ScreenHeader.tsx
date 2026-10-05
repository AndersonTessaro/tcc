import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const backIcon = require("@/assets/images/figma-student/back.png");

export function ScreenHeader({ title, back = false, compact = false, action }: { title: string; back?: boolean; compact?: boolean; action?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { minHeight: (compact ? 120 : 135) + Math.max(0, insets.top - 44), paddingTop: insets.top + 34, paddingBottom: compact ? 13 : 28 }]}>
      {back ? <Pressable accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={10} onPress={() => router.back()} style={[styles.back, { top: insets.top + 28 }]}><Image source={backIcon} style={styles.backIcon} /></Pressable> : null}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {action ? <View style={[styles.action, { top: insets.top + 28 }]}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 60, paddingBottom: 28 },
  title: { color: "#000000", fontSize: 18, fontWeight: "700", textAlign: "center" },
  back: { position: "absolute", left: 29, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  backIcon: { width: 26, height: 26 },
  action: { position: "absolute", right: 29, minHeight: 32, justifyContent: "center" },
});
