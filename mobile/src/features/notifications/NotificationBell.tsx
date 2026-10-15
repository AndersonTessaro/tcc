import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { IconButton } from "@/ui/IconButton";
import { colors, radius, type } from "@/ui/theme";

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  return (
    <View>
      <IconButton icon="notifications-outline" color={colors.onBrand}
        label={unreadCount === 0 ? "Notificações" : `Notificações, ${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`}
        onPress={() => router.push("/teacher/notifications")} />
      {unreadCount > 0 ? (
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.badge}>
          <Text style={styles.count}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { position: "absolute", top: 0, right: 0, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: radius.pill, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
  count: { ...type.caption, color: colors.onBrand, fontWeight: "700", fontSize: 11 },
});
