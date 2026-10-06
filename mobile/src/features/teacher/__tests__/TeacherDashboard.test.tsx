import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import TeacherDashboard from "../TeacherDashboard";
import { teacherService, type TeacherDashboardData, type TeacherLesson } from "../teacherService";
import { todayIso } from "@/lib/format";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("../teacherService", () => ({ teacherService: { dashboard: jest.fn(), attendance: jest.fn() } }));

const service = teacherService as jest.Mocked<typeof teacherService>;
const lesson: TeacherLesson = {
  id: "l1", enrollmentId: "e1", studentId: "s1", studentName: "Ana Souza", teacherName: "Carlos", instrument: "Piano",
  date: todayIso(), startTime: "09:00:00", endTime: "10:00:00", status: "SCHEDULED", content: null, homework: null, attendance: null,
};
const dashboard: TeacherDashboardData = {
  totalStudents: 4, attendancePercent: 80, weeklyPracticeMin: 90, classes: ["Piano", "Violão"], selectedClass: "Piano",
  todayLessons: [lesson], upcomingLessons: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  service.dashboard.mockResolvedValue(dashboard);
  service.attendance.mockResolvedValue({});
});

it("records attendance for today's lessons and keeps it after the silent refetch", async () => {
  await render(<TeacherDashboard />);
  await fireEvent.press(await screen.findByRole("radio", { name: "Presente" }));

  await waitFor(() => expect(service.attendance).toHaveBeenCalledWith("l1", "PRESENT"));
  await waitFor(() => expect(service.dashboard).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("radio", { name: "Presente" })).toBeSelected();
  expect(screen.getByText("09:00–10:00 · Ana Souza")).toBeVisible();
});

it("switches class from the picker", async () => {
  await render(<TeacherDashboard />);
  await fireEvent.press(await screen.findByRole("button", { name: "Turma atual: Piano. Trocar turma" }));
  expect(screen.getByRole("radio", { name: "Piano" })).toBeSelected();
  await fireEvent.press(screen.getByRole("radio", { name: "Violão" }));

  await waitFor(() => expect(service.dashboard).toHaveBeenLastCalledWith("Violão"));
});

it("offers a retry when the dashboard fails", async () => {
  service.dashboard.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await render(<TeacherDashboard />);
  await fireEvent.press(await screen.findByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("09:00–10:00 · Ana Souza")).toBeVisible();
});
