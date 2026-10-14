import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/ui/IconButton";
import { space } from "@/ui/theme";

export function TeacherStackHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <IconButton icon="arrow-back" label="Voltar" size={26} onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 64, paddingHorizontal: space.lg, paddingBottom: space.sm },
});
