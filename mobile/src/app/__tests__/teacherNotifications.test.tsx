import { act, fireEvent, render, screen } from "@testing-library/react-native";
import TeacherDashboard from "@/features/teacher/TeacherDashboard";
import Notifications from "@/app/(teacher)/notifications";
import { notificationService, type Notification, type NotificationType } from "@/features/notifications/notificationService";
import { notificationTime } from "@/features/notifications/NotificationsScreen";
import { teacherService, type TeacherDashboardData } from "@/features/teacher/teacherService";

const mockPush = jest.fn();
const mockToast = jest.fn();
const mockFocusCallbacks = new Set<() => void>();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(() => {
    mockFocusCallbacks.add(callback);
    callback();
    return () => { mockFocusCallbacks.delete(callback); };
  }, [callback]),
}));
jest.mock("@/hooks/use-tab-scroll-to-top", () => ({ useTabScrollToTop: jest.fn() }));
jest.mock("@/features/teacher/teacherService", () => ({ teacherService: { dashboard: jest.fn() } }));
jest.mock("@/features/notifications/notificationService", () => ({ notificationService: {
  list: jest.fn(), unreadCount: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn(),
} }));
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));

const service = jest.mocked(notificationService);
const teacher = jest.mocked(teacherService);
const dashboard: TeacherDashboardData = {
  totalStudents: 4, attendancePercent: 80, weeklyPracticeMin: 90, classes: ["Piano"], selectedClass: "Piano",
  todayLessons: [], upcomingLessons: [],
};
const titles: Record<NotificationType, string> = {
  PRACTICE_RECORDED: "Nova prática registrada", GOAL_COMPLETED: "Meta concluída",
  ATTENDANCE_MISSING: "Presença pendente", LESSONS_TODAY: "Aulas de hoje",
};
function item(type: NotificationType = "PRACTICE_RECORDED", read = false): Notification {
  return { id: type, type, title: titles[type], body: "Mensagem para o professor", studentId: "student-1",
    practiceId: type === "PRACTICE_RECORDED" ? "practice-1" : null,
    lessonId: type === "ATTENDANCE_MISSING" ? "lesson-1" : null, read, createdAt: new Date().toISOString() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFocusCallbacks.clear();
  teacher.dashboard.mockResolvedValue(dashboard);
  service.unreadCount.mockResolvedValue({ unreadCount: 3 });
  service.list.mockResolvedValue({ unreadCount: 1, items: [item()] });
  service.markRead.mockResolvedValue(undefined);
  service.markAllRead.mockResolvedValue(undefined);
});

it.each([[1, "1", "1 não lida"], [3, "3", "3 não lidas"], [10, "9+", "10 não lidas"]])("shows a badge for %s unread with the full accessible count", async (count, badge, unread) => {
  service.unreadCount.mockResolvedValue({ unreadCount: count });
  await render(<TeacherDashboard />);
  const bell = await screen.findByRole("button", { name: `Notificações, ${unread}` });
  expect(screen.getByText(badge, { includeHiddenElements: true })).toHaveTextContent(badge);
  await fireEvent.press(bell);
  expect(mockPush).toHaveBeenCalledWith("/(teacher)/notifications");
});

it("keeps the dashboard usable without a badge when fetching the count fails", async () => {
  service.unreadCount.mockRejectedValue(new TypeError("Failed to fetch"));
  await render(<TeacherDashboard />);
  expect(await screen.findByRole("button", { name: "Alunos: 4. Ver todos" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Notificações" })).toBeVisible();
  expect(screen.queryByText("9+")).toBeNull();
  expect(screen.queryByRole("button", { name: /Notificações, / })).toBeNull();
});

it("refreshes the badge on focus and together with the dashboard on pull to refresh", async () => {
  await render(<TeacherDashboard />);
  await screen.findByRole("button", { name: "Notificações, 3 não lidas" });
  service.unreadCount.mockResolvedValue({ unreadCount: 2 });
  await act(async () => { mockFocusCallbacks.forEach((callback) => callback()); });
  expect(await screen.findByRole("button", { name: "Notificações, 2 não lidas" })).toBeVisible();
  service.unreadCount.mockResolvedValue({ unreadCount: 0 });
  await act(() => screen.getByLabelText("Painel do professor").props.refreshControl.props.onRefresh());
  expect(screen.getByRole("button", { name: "Notificações" })).toBeVisible();
  expect(service.unreadCount).toHaveBeenCalledTimes(3);
  expect(teacher.dashboard).toHaveBeenCalledTimes(3);
});

it("clears an existing badge if a later count request fails", async () => {
  await render(<TeacherDashboard />);
  await screen.findByRole("button", { name: "Notificações, 3 não lidas" });
  service.unreadCount.mockRejectedValue(new TypeError("Failed to fetch"));
  await act(async () => { mockFocusCallbacks.forEach((callback) => callback()); });
  expect(await screen.findByRole("button", { name: "Notificações" })).toBeVisible();
});

it("distinguishes read and unread notifications with text as well as styling", async () => {
  service.list.mockResolvedValue({ unreadCount: 1, items: [item(), item("GOAL_COMPLETED", true)] });
  await render(<Notifications />);
  expect(await screen.findByRole("button", { name: /Nova prática registrada.*Não lida/ })).toBeVisible();
  expect(screen.getByRole("button", { name: /Meta concluída.*Lida/ })).toBeVisible();
  expect(screen.getAllByText("Não lida")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Marcar todas como lidas" })).toBeVisible();
});

it.each([
  ["PRACTICE_RECORDED", { pathname: "/(teacher)/practice/[id]", params: { id: "practice-1", practiceId: "practice-1", studentId: "student-1" } }],
  ["ATTENDANCE_MISSING", { pathname: "/(teacher)/lesson/[id]", params: { id: "lesson-1" } }],
  ["GOAL_COMPLETED", { pathname: "/(teacher)/student/[id]", params: { id: "student-1" } }],
  ["LESSONS_TODAY", "/(teacher)/(tabs)/schedule"],
] as const)("marks %s as read and navigates with its required parameters", async (type, route) => {
  service.list.mockResolvedValue({ unreadCount: 1, items: [item(type)] });
  await render(<Notifications />);
  await fireEvent.press(await screen.findByRole("button", { name: new RegExp(titles[type] + ".*Não lida") }));
  expect(service.markRead).toHaveBeenCalledWith(type);
  expect(mockPush).toHaveBeenCalledWith(route);
  expect(screen.queryByText("Não lida")).toBeNull();
});

it("opens an already read notification without another write", async () => {
  service.list.mockResolvedValue({ unreadCount: 0, items: [item("GOAL_COMPLETED", true)] });
  await render(<Notifications />);
  await fireEvent.press(await screen.findByRole("button", { name: /Meta concluída.*Lida/ }));
  expect(service.markRead).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/(teacher)/student/[id]", params: { id: "student-1" } });
});

it("marks optimistically, prevents overlapping writes, then restores the unread state and shows an error on failure", async () => {
  let reject!: (error: Error) => void;
  service.markRead.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
  await render(<Notifications />);
  await fireEvent.press(await screen.findByRole("button", { name: /Nova prática registrada.*Não lida/ }));
  expect(screen.queryByText("Não lida")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: /Nova prática registrada.*Lida/ }));
  expect(service.markRead).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new TypeError("Failed to fetch")); });
  expect(screen.getByText("Não lida")).toBeVisible();
  expect(mockToast).toHaveBeenCalledWith("Sem conexão com o servidor", "error");
  expect(mockPush).not.toHaveBeenCalled();
});

it("marks all notifications read and removes the header action", async () => {
  service.list.mockResolvedValue({ unreadCount: 8, items: [item(), item("GOAL_COMPLETED")] });
  await render(<Notifications />);
  await fireEvent.press(await screen.findByRole("button", { name: "Marcar todas como lidas" }));
  expect(service.markAllRead).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Não lida")).toBeNull();
  expect(screen.queryByRole("button", { name: "Marcar todas como lidas" })).toBeNull();
});

it("restores all unread items and the header action when marking all fails", async () => {
  service.markAllRead.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await render(<Notifications />);
  await fireEvent.press(await screen.findByRole("button", { name: "Marcar todas como lidas" }));
  expect(await screen.findByText("Não lida")).toBeVisible();
  expect(screen.getByRole("button", { name: "Marcar todas como lidas" })).toBeVisible();
  expect(mockToast).toHaveBeenCalledWith("Sem conexão com o servidor", "error");
});

it("shows the empty state and refreshes the list", async () => {
  service.list.mockResolvedValue({ unreadCount: 0, items: [] });
  await render(<Notifications />);
  expect(await screen.findByText("Nenhuma notificação")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Marcar todas como lidas" })).toBeNull();
  service.list.mockResolvedValue({ unreadCount: 1, items: [item()] });
  await act(() => screen.getByLabelText("Notificações").props.refreshControl.props.onRefresh());
  expect(await screen.findByText("Nova prática registrada")).toBeVisible();
});

it("offers a retry when the list fails", async () => {
  service.list.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await render(<Notifications />);
  expect(await screen.findByText("Sem conexão com o servidor")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("Nova prática registrada")).toBeVisible();
});

it("computes elapsed time from an absolute timestamp regardless of its offset", () => {
  const now = new Date(2026, 9, 15, 12);
  const earlier = now.getTime() - 2 * 60 * 60 * 1000;
  const utcTime = new Date(earlier).toISOString();
  const offsetTime = new Date(earlier - 3 * 60 * 60 * 1000).toISOString().replace("Z", "-03:00");
  expect(notificationTime(utcTime, now)).toBe("há 2 h");
  expect(notificationTime(offsetTime, now)).toBe("há 2 h");
});

it("formats recent times, yesterday and older dates", () => {
  const now = new Date(2026, 9, 15, 12);
  expect(notificationTime(new Date(2026, 9, 15, 10).toISOString(), now)).toBe("há 2 h");
  expect(notificationTime(new Date(2026, 9, 15, 11, 50).toISOString(), now)).toBe("há 10 min");
  expect(notificationTime(new Date(2026, 9, 14, 23).toISOString(), now)).toBe("ontem");
  expect(notificationTime(new Date(2026, 9, 12).toISOString(), now)).toBe("12/10");
});
