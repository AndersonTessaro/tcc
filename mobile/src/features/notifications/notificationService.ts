import { api } from "@/lib/http";

export type NotificationType = "PRACTICE_RECORDED" | "GOAL_COMPLETED" | "ATTENDANCE_MISSING" | "LESSONS_TODAY";
export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  studentId: string | null;
  lessonId: string | null;
  practiceId: string | null;
  read: boolean;
  createdAt: string;
};
export type NotificationList = { unreadCount: number; items: Notification[] };

export const notificationService = {
  list: (limit = 50) => api.get<NotificationList>("/notifications?limit=" + limit),
  unreadCount: () => api.get<{ unreadCount: number }>("/notifications/unread-count"),
  markRead: (id: string) => api.patch<void>("/notifications/" + encodeURIComponent(id) + "/read"),
  markAllRead: () => api.post<void>("/notifications/read-all"),
};
