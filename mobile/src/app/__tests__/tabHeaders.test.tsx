import { FlatList, ScrollView, SectionList } from "react-native";
import { render, screen } from "@testing-library/react-native";
import StudentDashboard from "@/app/(student)/(tabs)/dashboard";
import StudentLessons from "@/app/(student)/(tabs)/lessons";
import StudentPractice from "@/app/(student)/(tabs)/practice";
import StudentProgress from "@/app/(student)/(tabs)/progress";
import StudentMore from "@/app/(student)/(tabs)/more";
import TeacherDashboard from "@/app/teacher/(tabs)/dashboard";
import TeacherStudents from "@/app/teacher/(tabs)/students";
import TeacherSchedule from "@/app/teacher/(tabs)/schedule";
import TeacherReports from "@/app/teacher/(tabs)/reports";
import TeacherMore from "@/app/teacher/(tabs)/more";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }), useLocalSearchParams: () => ({}), useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]) }));
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: { username: "ana", authorities: [] } }) }));
jest.mock("@/features/account/accountService", () => ({ accountService: { get: jest.fn().mockResolvedValue({ displayName: "Ana", hasAvatar: false }) } }));
jest.mock("@/features/student/studentService", () => ({ studentService: {
  dashboard: jest.fn().mockResolvedValue({ xp: 0, level: 1, streakDays: 0, weeklyPracticeMin: 0, nextLesson: null }),
  lessons: jest.fn().mockResolvedValue([]), practices: jest.fn().mockResolvedValue([]), attendance: jest.fn().mockResolvedValue([]),
  progress: jest.fn().mockResolvedValue({ xpTotal: 0, level: 1, streakDays: 0, totalPracticeMin: 0 }),
} }));
jest.mock("@/features/teacher/teacherService", () => ({ teacherService: {
  dashboard: jest.fn().mockResolvedValue({ totalStudents: 0, attendancePercent: 0, weeklyPracticeMin: 0, todayLessons: [], upcomingLessons: [], classes: [], selectedClass: "" }),
  students: jest.fn().mockResolvedValue([]), enrollments: jest.fn().mockResolvedValue([]), schedule: jest.fn().mockResolvedValue([]),
} }));
jest.mock("@/features/notifications/notificationService", () => ({ notificationService: { unreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }) } }));

it.each([
  [StudentDashboard, "Olá, Ana!"], [StudentLessons, "Minhas aulas"], [StudentPractice, "Práticas em casa"],
  [StudentProgress, "Meu progresso"], [StudentMore, "Mais"], [TeacherDashboard, "Olá, Ana!"],
  [TeacherStudents, "Alunos"], [TeacherSchedule, "Agenda"], [TeacherReports, "Relatórios"], [TeacherMore, "Mais"],
])("keeps the %s header outside scrolling content", async (Component, title) => {
  await render(<Component />);
  const header = screen.getByRole("header", { name: title });
  expect(header).toBeVisible();
  let parent = header.parent;
  while (parent) {
    expect([ScrollView, FlatList, SectionList, "RCTScrollView"]).not.toContain(parent.type);
    parent = parent.parent;
  }
});
