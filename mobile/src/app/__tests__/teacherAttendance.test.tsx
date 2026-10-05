import { fireEvent, render, screen } from "@testing-library/react-native";
import TeacherStudentDetail from "@/features/teacher/TeacherStudentDetail";
import { teacherService, type TeacherStudentDetailData } from "@/features/teacher/teacherService";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "student-1" }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: { student: jest.fn(), students: jest.fn(), enrollments: jest.fn(), studentLessons: jest.fn(), studentMaterials: jest.fn() },
}));

it("uses attendance records from the selected calendar month for the summary", async () => {
  const current = new Date();
  const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  const iso = (month: Date, day: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const report: TeacherStudentDetailData = {
    studentId: "student-1", progress: null, lessonsCount: 5,
    attendance: { present: 3, absent: 1, excused: 1, rate: 60 },
    attendanceHistory: [
      { date: iso(current, 1), status: "PRESENT" },
      { date: iso(current, 2), status: "ABSENT" },
      { date: iso(previous, 1), status: "PRESENT" },
      { date: iso(previous, 2), status: "PRESENT" },
      { date: iso(previous, 3), status: "EXCUSED" },
    ],
    goals: { active: 0, completed: 0 }, nextGoal: "", weeklyPracticeMin: 0, recentPractices: [], enrollmentDate: iso(previous, 1),
  };
  const service = teacherService as jest.Mocked<typeof teacherService>;
  service.student.mockResolvedValue(report);
  service.students.mockResolvedValue([{ id: "student-1", name: "João Silva", username: "joao" }]);
  service.enrollments.mockResolvedValue([]);
  service.studentLessons.mockResolvedValue([]);
  service.studentMaterials.mockResolvedValue([]);

  await render(<TeacherStudentDetail />);
  await screen.findByText("Nenhuma meta ativa");
  await fireEvent.press(screen.getByRole("tab", { name: "Frequência" }));
  expect(screen.getByText("50%")).toBeVisible();
  expect(screen.getByText("1/2")).toBeVisible();
  expect(screen.getByLabelText(`01/${String(current.getMonth() + 1).padStart(2, "0")}/${current.getFullYear()}, Presente`)).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
  expect(screen.getByText("67%")).toBeVisible();
  expect(screen.getByText("2/3")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));
  expect(screen.getByText("1/2")).toBeVisible();
});
