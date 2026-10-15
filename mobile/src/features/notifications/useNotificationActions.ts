import { useRef, useState } from "react";
import { useRouter, type Href } from "expo-router";
import type { Resource } from "@/hooks/use-resource";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { useToast } from "@/ui/Toast";
import { notificationService, type Notification, type NotificationList } from "./notificationService";

function notificationRoute(item: Notification): Href | undefined {
  switch (item.type) {
    case "PRACTICE_RECORDED":
      return item.practiceId && item.studentId ? {
        pathname: "/(teacher)/practice/[id]", params: { id: item.practiceId, practiceId: item.practiceId, studentId: item.studentId },
      } : undefined;
    case "ATTENDANCE_MISSING":
      return item.lessonId ? { pathname: "/(teacher)/lesson/[id]", params: { id: item.lessonId } } : undefined;
    case "GOAL_COMPLETED":
      return item.studentId ? { pathname: "/(teacher)/student/[id]", params: { id: item.studentId } } : undefined;
    case "LESSONS_TODAY":
      return "/(teacher)/(tabs)/schedule";
  }
}

export function useNotificationActions(resource: Resource<NotificationList>) {
  const router = useRouter();
  const toast = useToast();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);

  async function markRead(item?: Notification) {
    if (pending.current || !resource.data) return;
    const route = item ? notificationRoute(item) : undefined;
    if (item?.read) {
      if (route) router.push(route);
      return;
    }
    const previous = resource.data;
    pending.current = true;
    setBusy(true);
    resource.setData((data) => data && ({
      unreadCount: item ? Math.max(0, data.unreadCount - 1) : 0,
      items: data.items.map((notification) => !item || notification.id === item.id ? { ...notification, read: true } : notification),
    }));
    try {
      if (item) await notificationService.markRead(item.id);
      else await notificationService.markAllRead();
      if (route) router.push(route);
    } catch (error) {
      resource.setData(() => previous);
      toast.show(apiErrorMessage(error, "Não foi possível marcar a leitura."), "error");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return {
    busy,
    open: (item: Notification) => markRead(item),
    markAllRead: () => markRead(),
    refresh: () => pending.current ? Promise.resolve() : resource.refresh(),
  };
}
