import { fireEvent, render, screen } from "@testing-library/react-native";
import TeacherStudentDetail from "@/features/teacher/TeacherStudentDetail";
import { teacherService } from "@/features/teacher/teacherService";
import type { Goal } from "@/features/goals/goalService";
import { confirm } from "@/lib/confirm";

const mockToast = jest.fn();
let mockAuthorities = ["goal.manage"];
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: { authorities: mockAuthorities } }) }));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn().mockResolvedValue(true) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "student-1" }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: {
    student: jest.fn(), studentProfile: jest.fn(), enrollments: jest.fn(), studentLessons: jest.fn(),
    studentMaterials: jest.fn(), studentPractices: jest.fn(), studentGoals: jest.fn(), createGoal: jest.fn(), endGoal: jest.fn(),
  },
}));
const service = jest.mocked(teacherService);
const goal: Goal = {
  id: "g1", title: "Praticar escalas", description: null, type: "PRACTICE_DAYS", period: "WEEKLY", target: 5,
  currentProgress: 3, status: "ACTIVE", legacy: false, createdByTeacher: "Carlos", canEnd: true,
  periodStart: "2026-10-19", periodEnd: "2026-10-25", achieved: false, streak: 1, completed: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthorities = ["goal.manage"];
  service.studentProfile.mockResolvedValue({ id: "student-1", name: "João", username: "joao", email: "joao@example.com", phone: null, sharedNotes: null, privateNotes: null });
  service.student.mockResolvedValue({
    studentId: "student-1", progress: null, lessonsCount: 0, attendance: { present: 0, absent: 0, excused: 0, rate: 0 },
    attendanceHistory: [], goals: { active: 1, completed: 0 }, nextGoal: "Old summary", weeklyPracticeMin: 0, recentPractices: [], enrollmentDate: "2026-10-01",
  });
  service.enrollments.mockResolvedValue([]);
  service.studentLessons.mockResolvedValue([]);
  service.studentMaterials.mockResolvedValue([]);
  service.studentPractices.mockResolvedValue([]);
  service.studentGoals.mockResolvedValue([goal]);
  service.createGoal.mockResolvedValue(goal);
  service.endGoal.mockResolvedValue({ ...goal, status: "ENDED", canEnd: false });
});

it("distinguishes completed and manually ended goals in the teacher summary", async () => {
  service.studentGoals.mockResolvedValue([
    { ...goal, status: "ENDED", completed: true, canEnd: false },
    { ...goal, id: "manual", title: "Meta manual", status: "ENDED", completed: false, canEnd: false },
  ]);
  await render(<TeacherStudentDetail />);
  expect(await screen.findByText("Cumprida")).toBeVisible();
  expect(screen.getByText("Encerrada")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Encerrar meta/ })).toBeNull();
});

it("lists real goals in summary and creates a goal for the selected student", async () => {
  await render(<TeacherStudentDetail />);
  expect(await screen.findByText("Praticar escalas")).toBeVisible();
  expect(screen.getByText("Definida por Carlos")).toBeVisible();
  expect(screen.getByText("3 de 5 dias")).toBeVisible();
  expect(screen.queryByText("Old summary")).toBeNull();
  expect(service.studentGoals).toHaveBeenCalledWith("student-1");
  await fireEvent.press(screen.getByRole("button", { name: "Nova meta" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Presença nas aulas" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Mensal" }));
  for (let index = 0; index < 3; index++) await fireEvent.press(screen.getByRole("button", { name: "Aumentar" }));
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  expect(service.createGoal).toHaveBeenCalledWith("student-1", {
    title: "4 presenças por mês", type: "ATTENDANCE", period: "MONTHLY", target: 4, description: undefined,
  });
  expect(service.studentGoals).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("button", { name: "Salvar meta" })).toBeNull();
  expect(mockToast).toHaveBeenCalledWith("Meta criada", "success");
});

it("ends permitted goals using the selected student", async () => {
  await render(<TeacherStudentDetail />);
  await fireEvent.press(await screen.findByRole("button", { name: "Encerrar meta Praticar escalas" }));
  expect(confirm).toHaveBeenCalled();
  expect(service.endGoal).toHaveBeenCalledWith("student-1", "g1");
  expect(service.studentGoals).toHaveBeenCalledTimes(2);
});

it("does not offer ending for goals created by someone else or for legacy goals", async () => {
  service.studentGoals.mockResolvedValue([
    { ...goal, canEnd: false },
    { ...goal, id: "old", title: "Antiga", period: null, legacy: true },
  ]);
  await render(<TeacherStudentDetail />);
  await screen.findByText("Praticar escalas");
  expect(screen.getByText("Meta antiga")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Encerrar meta/ })).toBeNull();
});

it("hides creation without goal management authority", async () => {
  mockAuthorities = [];
  service.studentGoals.mockRejectedValue(new Error("403"));
  await render(<TeacherStudentDetail />);
  expect(await screen.findByText("João")).toBeVisible();
  expect(service.studentGoals).not.toHaveBeenCalled();
  expect(screen.queryByRole("header", { name: "Metas" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Nova meta" })).toBeNull();
});

it("keeps student details usable when only the goals endpoint fails", async () => {
  service.studentGoals.mockRejectedValueOnce(new Error("offline"));
  await render(<TeacherStudentDetail />);
  expect(await screen.findByText("João")).toBeVisible();
  expect(await screen.findByText("Não foi possível carregar as metas.")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("Praticar escalas")).toBeVisible();
});

it("allows administrators to manage goals with the role bypass", async () => {
  mockAuthorities = ["ROLE_ADMIN"];
  await render(<TeacherStudentDetail />);
  expect(await screen.findByText("Praticar escalas")).toBeVisible();
  expect(service.studentGoals).toHaveBeenCalledWith("student-1");
  expect(screen.getByRole("button", { name: "Nova meta" })).toBeVisible();
});
