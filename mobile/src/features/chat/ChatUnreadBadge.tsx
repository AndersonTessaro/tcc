import { StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type } from "@/ui/theme";

export function unreadLabel(count: number) {
  return `${count} ${count === 1 ? "mensagem não lida" : "mensagens não lidas"}`;
}

export function ChatUnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge} accessible accessibilityLabel={unreadLabel(count)}>
      <Text style={styles.text}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { minWidth: 24, minHeight: 24, paddingHorizontal: space.sm, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  text: { ...type.label, color: colors.onBrand },
});
