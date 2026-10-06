import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./IconButton";
import { colors, space, type } from "./theme";

type ScreenHeaderProps = {
  title: string;
  back?: boolean;
  onBack?: () => void;
  action?: ReactNode;
  subtitle?: string;
  compact?: boolean;
};

export function ScreenHeader({ title, back = false, onBack, action, subtitle }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.side}>
        {back ? <IconButton icon="chevron-back" label="Voltar" size={26} onPress={onBack ?? (() => router.back())} /> : null}
      </View>
      <View style={styles.center}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.side, styles.right]}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.sm, paddingBottom: space.sm, backgroundColor: colors.screen, minHeight: 56 },
  side: { width: 52, minHeight: 44, justifyContent: "center" },
  right: { alignItems: "flex-end" },
  center: { flex: 1, alignItems: "center" },
  title: { ...type.heading, fontSize: 18 },
  subtitle: { ...type.caption },
});
