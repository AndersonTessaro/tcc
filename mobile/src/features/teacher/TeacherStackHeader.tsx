import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/ui/IconButton";
import { space, type } from "@/ui/theme";

export function TeacherStackHeader({ title }: { title?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <IconButton icon="arrow-back" label="Voltar" size={26} onPress={() => router.back()} />
      {title ? <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 64, paddingHorizontal: space.lg, paddingBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { ...type.title, flex: 1 },
});
