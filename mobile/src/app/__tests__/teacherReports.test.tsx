import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Reports from "@/app/teacher/(tabs)/reports";
import { rangeDates } from "@/features/teacher/reports/ReportScreen";
import { teacherService, type AttendanceCounts, type AttendanceReport, type PracticeReport } from "@/features/teacher/teacherService";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: { students: jest.fn(), reports: jest.fn(), attendanceReport: jest.fn(), practiceReport: jest.fn(), classReport: jest.fn() },
}));

const teacher = teacherService as jest.Mocked<typeof teacherService>;

const counts = (overrides: Partial<AttendanceCounts> = {}): AttendanceCounts => ({
  due: 3, present: 2, absent: 0, excused: 0, unrecorded: 1, rate: 67, ...overrides,
});

const attendance: AttendanceReport = {
  from: "2026-09-16",
  to: "2026-10-15",
  totals: counts(),
  students: [
    { studentId: "student-1", studentName: "Ana Souza", active: true, attendance: counts() },
    { studentId: "student-2", studentName: "Bia Lima", active: false, attendance: counts({ due: 0, present: 0, unrecorded: 0, rate: null }) },
  ],
};

const practice: PracticeReport = {
  from: "2026-09-16",
  to: "2026-10-15",
  totals: { totalMinutes: 90, sessions: 3, practicingStudents: 1, linkedStudents: 2, avgRating: 4.5 },
  weeks: [{ weekStart: "2026-10-12", minutes: 90 }],
  students: [
    { studentId: "student-2", studentName: "Bia Lima", minutes: 0, sessions: 0, practiceDays: 0, avgRating: null, lastPractice: null },
    { studentId: "student-1", studentName: "Ana Souza", minutes: 90, sessions: 3, practiceDays: 2, avgRating: 4.5, lastPractice: "2026-10-14" },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  teacher.attendanceReport.mockResolvedValue(attendance);
  teacher.practiceReport.mockResolvedValue(practice);
  teacher.classReport.mockResolvedValue({ from: "2026-09-16", to: "2026-10-15", groups: [] });
});

it("shows attendance with RN09 absences, flags low rates and reloads for a new period", async () => {
  await render(<Reports />);
  await fireEvent.press(screen.getByRole("button", { name: "Frequência dos alunos" }));

  expect(await screen.findByText("de presença em 3 aulas")).toBeVisible();
  expect(screen.getByText("2 presenças · 1 falta (1 sem registro)")).toBeVisible();
  expect(screen.getByText("67% · atenção")).toBeVisible();
  expect(screen.getByText("Bia Lima (inativo)")).toBeVisible();
  expect(screen.getByText("—")).toBeVisible();
  const last30 = rangeDates("30");
  expect(teacher.attendanceReport).toHaveBeenCalledWith(last30.from, last30.to);

  await fireEvent.press(screen.getByRole("radio", { name: "Últimos 90 dias" }));
  const last90 = rangeDates("90");
  await waitFor(() => expect(teacher.attendanceReport).toHaveBeenLastCalledWith(last90.from, last90.to));

  await fireEvent.press(await screen.findByRole("button", { name: "Frequência de Ana Souza: 67%" }));
  expect(mockPush).toHaveBeenCalledWith("/teacher/student/student-1");
});

it("shows practice totals, weekly bars and students without practice", async () => {
  await render(<Reports />);
  await fireEvent.press(screen.getByRole("button", { name: "Prática em casa" }));

  expect(await screen.findByText("1 de 2 alunos praticou")).toBeVisible();
  expect(screen.getByText("Avaliação média: 4,5")).toBeVisible();
  expect(screen.getByText("Semana de 12/10")).toBeVisible();
  expect(screen.getByText("Sem prática no período")).toBeVisible();
});

it("shows an empty state for classes and returns to the menu", async () => {
  await render(<Reports />);
  await fireEvent.press(screen.getByRole("button", { name: "Desempenho de turmas" }));

  expect(await screen.findByText("Nenhuma turma ativa")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
  expect(screen.getByRole("button", { name: "Evolução por aluno" })).toBeVisible();
});

it("offers a retry when the report fails to load", async () => {
  teacher.attendanceReport.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await render(<Reports />);
  await fireEvent.press(screen.getByRole("button", { name: "Frequência dos alunos" }));

  await fireEvent.press(await screen.findByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("de presença em 3 aulas")).toBeVisible();
  expect(teacher.attendanceReport).toHaveBeenCalledTimes(2);
});
