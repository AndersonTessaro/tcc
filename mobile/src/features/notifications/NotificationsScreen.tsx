import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MoreScreen } from "@/features/teacher/more/MoreScreen";
import { useResource } from "@/hooks/use-resource";
import { IconButton } from "@/ui/IconButton";
import { ScreenState } from "@/ui/ScreenState";
import { colors, MIN_TOUCH, radius, space, type } from "@/ui/theme";
import { notificationService, type NotificationType } from "./notificationService";
import { useNotificationActions } from "./useNotificationActions";

const icons: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  PRACTICE_RECORDED: "musical-notes-outline", GOAL_COMPLETED: "trophy-outline",
  ATTENDANCE_MISSING: "alert-circle-outline", LESSONS_TODAY: "calendar-outline",
};

export function notificationTime(createdAt: string, now = new Date()): string {
  const created = new Date(createdAt);
  const minutes = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 60_000));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (created >= today) return minutes < 60 ? (minutes < 1 ? "agora" : "há " + minutes + " min") : "há " + Math.floor(minutes / 60) + " h";
  if (created >= yesterday) return "ontem";
  return String(created.getDate()).padStart(2, "0") + "/" + String(created.getMonth() + 1).padStart(2, "0");
}

export default function NotificationsScreen() {
  const notifications = useResource(() => notificationService.list());
  const actions = useNotificationActions(notifications);
  return (
    <MoreScreen title="Notificações" resource={{ ...notifications, refresh: actions.refresh }}
      action={notifications.data?.unreadCount ? (
        <IconButton icon="checkmark-done-outline" label="Marcar todas como lidas" color={colors.primary}
          disabled={actions.busy} onPress={() => void actions.markAllRead()} />
      ) : undefined}>
      {notifications.data?.items.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" disabled={actions.busy}
          accessibilityLabel={[item.title, item.body, notificationTime(item.createdAt), item.read ? "Lida" : "Não lida"].join(". ")}
          onPress={() => void actions.open(item)}
          style={({ pressed }) => [styles.item, !item.read && styles.unread, pressed && styles.pressed]}>
          <Ionicons name={icons[item.type]} size={24} color={colors.primary} accessible={false} />
          <View style={styles.content}>
            <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.metadata}>
              <Text style={styles.time}>{notificationTime(item.createdAt)}</Text>
              {!item.read ? <Text style={styles.unreadLabel}>Não lida</Text> : null}
            </View>
          </View>
        </Pressable>
      ))}
      {notifications.data?.items.length === 0 ? <ScreenState icon="notifications-outline" title="Nenhuma notificação" /> : null}
    </MoreScreen>
  );
}

const styles = StyleSheet.create({
  item: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "flex-start", gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  unread: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
  content: { flex: 1, gap: space.sm },
  title: { ...type.body },
  unreadTitle: { fontWeight: "700" },
  body: { ...type.body },
  metadata: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.md },
  time: { ...type.caption },
  unreadLabel: { ...type.caption, color: colors.primary, fontWeight: "600" },
});
