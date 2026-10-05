import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Materials from "@/app/(student)/materials";
import Reports from "@/app/(teacher)/reports";
import Forgot from "@/app/(auth)/forgot-password";
import { studentService, type StudentMaterial } from "@/features/student/studentService";
import { teacherService, type TeacherStudentDetailData } from "@/features/teacher/teacherService";
import { authService } from "@/features/auth/authService";

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/student/studentService", () => ({ studentService: { materials: jest.fn() } }));
jest.mock("@/features/teacher/teacherService", () => ({ teacherService: { students: jest.fn(), reports: jest.fn() } }));
jest.mock("@/features/auth/authService", () => ({ authService: { forgot: jest.fn() } }));

const student = studentService as jest.Mocked<typeof studentService>;
const teacher = teacherService as jest.Mocked<typeof teacherService>;
const auth = authService as jest.Mocked<typeof authService>;
const material: StudentMaterial = { id: "material-1", studentId: "student-1", teacherName: "Maria Santos", title: "Escalas maiores", description: "Exercícios para a semana", fileName: "escalas.pdf", contentType: "application/pdf", sizeBytes: 2048, createdAt: "2026-10-03T10:00:00" };

beforeEach(() => {
  jest.clearAllMocks();
  student.materials.mockResolvedValue([material]);
  teacher.students.mockResolvedValue([{ id: "student-1", name: "João Silva", username: "joao" }]);
});

it("shows materials from the API and searches by title", async () => {
  await render(<Materials />);
  expect(await screen.findByText("Escalas maiores")).toBeVisible();
  expect(screen.getByText("Maria Santos · 03/10/2026")).toBeVisible();
  student.materials.mockResolvedValue([]);
  await fireEvent.changeText(screen.getByLabelText("Buscar material"), "  acordes  ");
  expect(await screen.findByText("Nenhum material encontrado.")).toBeVisible();
  expect(student.materials).toHaveBeenLastCalledWith("acordes");
});

it("ignores a materials response that arrives after the search changes", async () => {
  let resolveOld: (value: StudentMaterial[]) => void = () => {};
  student.materials.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce([]);
  await render(<Materials />);
  await waitFor(() => expect(student.materials).toHaveBeenCalledWith(""));
  await fireEvent.changeText(screen.getByLabelText("Buscar material"), "acordes");
  await screen.findByText("Nenhum material encontrado.");
  await act(async () => resolveOld([material]));
  expect(screen.queryByText("Escalas maiores")).toBeNull();
});

it("shows a materials error and retries instead of reporting an empty list", async () => {
  student.materials.mockRejectedValueOnce(new Error("HTTP_500"));
  await render(<Materials />);
  expect(await screen.findByText("Não foi possível carregar os materiais.")).toBeVisible();
  expect(screen.queryByText("Nenhum material enviado pelo professor.")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("Escalas maiores")).toBeVisible();
});

it("loads the selected student's report and opens their details", async () => {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const report: TeacherStudentDetailData = { studentId: "student-1", progress: { xpTotal: 540, level: 4, streakDays: 3 }, lessonsCount: 12, attendance: { present: 3, absent: 1, excused: 0, rate: 75 }, attendanceHistory: ["PRESENT", "PRESENT", "PRESENT", "ABSENT"].map((status) => ({ date, status: status as "PRESENT" | "ABSENT" })), goals: { active: 2, completed: 5 }, nextGoal: "Praticar acordes", weeklyPracticeMin: 125, recentPractices: [], enrollmentDate: date };
  teacher.reports.mockResolvedValue(report);
  await render(<Reports />);
  await fireEvent.press(await screen.findByRole("button", { name: "Relatório de João Silva" }));
  expect(await screen.findByText("540")).toBeVisible();
  expect(screen.getByText("75%")).toBeVisible();
  expect(screen.getByText("2h 05m")).toBeVisible();
  expect(screen.getByText("12 aulas registradas")).toBeVisible();
  expect(screen.getByText("2 metas ativas · 5 concluídas")).toBeVisible();
  expect(teacher.reports).toHaveBeenCalledWith("student-1");
  await fireEvent.press(screen.getByRole("button", { name: "Ver detalhes do aluno" }));
  expect(mockPush).toHaveBeenCalledWith("/(teacher)/student/student-1");
});

it("keeps the selected student when a report request fails and is retried", async () => {
  teacher.reports.mockRejectedValue(new TypeError("Failed to fetch"));
  await render(<Reports />);
  await fireEvent.press(await screen.findByRole("button", { name: "Relatório de João Silva" }));
  expect(await screen.findByText("Sem conexão com o servidor")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() => expect(teacher.reports).toHaveBeenCalledTimes(2));
  expect(teacher.reports).toHaveBeenLastCalledWith("student-1");
});

it("validates recovery email and keeps failures separate from success", async () => {
  auth.forgot.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(undefined);
  await render(<Forgot />);
  await fireEvent.press(screen.getByRole("button", { name: "Enviar instruções" }));
  expect(screen.getByText("Informe um e-mail válido.")).toBeVisible();
  expect(auth.forgot).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("E-mail"), " aluno@escola.com ");
  await fireEvent.press(screen.getByRole("button", { name: "Enviar instruções" }));
  expect(await screen.findByText("Sem conexão com o servidor")).toBeVisible();
  expect(screen.queryByText("Confira sua caixa de entrada")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Enviar instruções" }));
  expect(await screen.findByText("Confira sua caixa de entrada")).toBeVisible();
  expect(auth.forgot).toHaveBeenLastCalledWith("aluno@escola.com");
  await fireEvent.press(screen.getByRole("button", { name: "Voltar ao login" }));
  expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
});

it("sends only one recovery request while submission is pending", async () => {
  let finish: (value: unknown) => void = () => {};
  auth.forgot.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  await render(<Forgot />);
  await fireEvent.changeText(screen.getByLabelText("E-mail"), "aluno@escola.com");
  const submit = screen.getByLabelText("E-mail").props.onSubmitEditing;
  await act(async () => { void submit(); void submit(); });
  expect(auth.forgot).toHaveBeenCalledTimes(1);
  await act(async () => finish(undefined));
  expect(screen.getByText("Confira sua caixa de entrada")).toBeVisible();
});
