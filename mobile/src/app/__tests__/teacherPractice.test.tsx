import { fireEvent, render, screen } from "@testing-library/react-native";
import TeacherPracticeDetail from "@/features/teacher/TeacherPracticeDetail";
import TeacherStudentDetail from "@/features/teacher/TeacherStudentDetail";
import { teacherService } from "@/features/teacher/teacherService";
import { saveDownload } from "@/lib/files/saveDownload";
import { ApiError } from "@/lib/http/apiError";

const mockToast = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = { id: "student-1" };
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock("@/lib/files/saveDownload", () => ({ saveDownload: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: {
    student: jest.fn(), students: jest.fn(), enrollments: jest.fn(),
    studentLessons: jest.fn(), studentMaterials: jest.fn(), studentPractices: jest.fn(),
    downloadPracticeRecording: jest.fn(),
  },
}));
const service = jest.mocked(teacherService);
const recording = { fileName: "Prática.mp4", contentType: "video/mp4", sizeBytes: 2048, uploadedAt: "2026-10-12T10:00:00" };

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: "student-1" };
  service.student.mockResolvedValue({
    studentId: "student-1", progress: null, lessonsCount: 0,
    attendance: { present: 0, absent: 0, excused: 0, rate: 0 }, attendanceHistory: [],
    goals: { active: 0, completed: 0 }, nextGoal: "", weeklyPracticeMin: 30,
    recentPractices: [{ date: "2026-10-01", durationMin: 1, notes: "Legacy report note" }],
    enrollmentDate: "2026-10-01",
  });
  service.students.mockResolvedValue([{ id: "student-1", name: "João", username: "joao" }]);
  service.enrollments.mockResolvedValue([]);
  service.studentLessons.mockResolvedValue([]);
  service.studentMaterials.mockResolvedValue([]);
  service.studentPractices.mockResolvedValue(Array.from({ length: 11 }, (_, index) => ({
    id: "practice-" + index, date: "2026-10-12", durationMin: 30, notes: "Estudo " + index, difficulty: null, rating: null,
    recording: index === 0 ? recording : null,
  })));
});

it("uses the new practice endpoint, shows ten records and downloads using the teacher endpoint", async () => {
  const bytes = new ArrayBuffer(4);
  service.downloadPracticeRecording.mockResolvedValue(bytes);
  await render(<TeacherStudentDetail />);
  await screen.findByText("João");
  await fireEvent.press(screen.getByRole("tab", { name: "Prática" }));
  expect(service.studentPractices).toHaveBeenCalledWith("student-1");
  expect(screen.getByText("Estudo 9")).toBeVisible();
  expect(screen.queryByText("Estudo 10")).toBeNull();
  expect(screen.queryByText("Legacy report note")).toBeNull();
  expect(screen.getByText("Gravação: Prática.mp4 · 2 KB")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Baixar gravação Prática.mp4" }));
  expect(service.downloadPracticeRecording).toHaveBeenCalledWith("practice-0");
  expect(saveDownload).toHaveBeenCalledWith(bytes, "Prática.mp4", "video/mp4");
  expect(mockToast).toHaveBeenCalledWith("Prática.mp4 pronto para salvar", "success");
});

it("shows raw activity notes and uses the empty-note subtitle without parsing feedback", async () => {
  service.studentPractices.mockResolvedValue([
    { id: "practice-0", date: "2026-10-12", durationMin: 30, notes: "Escalas; Dificuldade: livre; Avaliação: 1/5", difficulty: "Acordes", rating: 4, recording: null },
    { id: "practice-1", date: "2026-10-12", durationMin: 15, notes: null, difficulty: "Ritmo", rating: 2, recording: null },
  ]);
  await render(<TeacherStudentDetail />);
  await screen.findByText("João");
  await fireEvent.press(screen.getByRole("tab", { name: "Prática" }));
  expect(screen.getByText("Escalas; Dificuldade: livre; Avaliação: 1/5")).toBeVisible();
  expect(screen.getByText("Sem observações")).toBeVisible();
});

it("reports a teacher download ownership error", async () => {
  service.downloadPracticeRecording.mockRejectedValue(new ApiError(403, "OWNERSHIP_DENIED"));
  await render(<TeacherStudentDetail />);
  await screen.findByText("João");
  await fireEvent.press(screen.getByRole("tab", { name: "Prática" }));
  await fireEvent.press(screen.getByRole("button", { name: "Baixar gravação Prática.mp4" }));
  expect(mockToast).toHaveBeenCalledWith("Sem permissão para acessar este registro", "error");
  expect(saveDownload).not.toHaveBeenCalled();
});

it("shows an empty state for practices without falling back to the report", async () => {
  service.studentPractices.mockResolvedValue([]);
  await render(<TeacherStudentDetail />);
  await screen.findByText("João");
  await fireEvent.press(screen.getByRole("tab", { name: "Prática" }));
  expect(screen.getByText("Nenhuma prática registrada")).toBeVisible();
  expect(screen.queryByText("Legacy report note")).toBeNull();
});

it("retries a failed practice list request", async () => {
  service.studentPractices.mockRejectedValueOnce(new Error("offline"));
  await render(<TeacherStudentDetail />);
  expect(await screen.findByText("Não foi possível carregar o aluno.")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("João")).toBeVisible();
  expect(service.studentPractices).toHaveBeenCalledTimes(2);
});


it("opens the selected practice with both student and practice identifiers", async () => {
  await render(<TeacherStudentDetail />);
  await screen.findByText("João");
  await fireEvent.press(screen.getByRole("tab", { name: "Prática" }));
  await fireEvent.press(screen.getByText("Estudo 0"));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/(teacher)/practice/[id]", params: { id: "practice-0", practiceId: "practice-0", studentId: "student-1" } });
});

it("shows read-only practice fields using separate difficulty and rating and downloads the recording", async () => {
  mockParams = { id: "practice-0", practiceId: "practice-0", studentId: "student-1" };
  service.enrollments.mockResolvedValue([{ id: "e1", studentId: "student-1", studentName: "João", instrument: "Violão" }]);
  service.studentPractices.mockResolvedValue([
    { id: "other", date: "2026-10-10", durationMin: 5, notes: "Outro registro", difficulty: null, rating: null, recording: null },
    { id: "practice-0", date: "2026-10-12", durationMin: 90, notes: "Escalas; arpejos", difficulty: "troca; ritmo", rating: 3, recording },
  ]);
  const bytes = new ArrayBuffer(4);
  service.downloadPracticeRecording.mockResolvedValue(bytes);
  await render(<TeacherPracticeDetail />);
  expect(await screen.findByText("Escalas; arpejos")).toBeVisible();
  expect(screen.getByText("troca; ritmo")).toBeVisible();
  expect(screen.getByText("12/10/2026")).toBeVisible();
  expect(screen.getByText("1h 30min")).toBeVisible();
  expect(screen.getByText("Violão")).toBeVisible();
  expect(screen.queryByText("Outro registro")).toBeNull();
  expect(screen.getByLabelText("Avaliação 3 de 5, selecionada")).toBeVisible();
  expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  expect(service.studentPractices).toHaveBeenCalledWith("student-1");
  await fireEvent.press(screen.getByRole("button", { name: "Baixar gravação Prática.mp4" }));
  expect(saveDownload).toHaveBeenCalledWith(bytes, "Prática.mp4", "video/mp4");
});

it("preserves activity notes and uses feedback fields even when notes contain legacy markers", async () => {
  mockParams = { id: "practice-0", studentId: "student-1" };
  service.studentPractices.mockResolvedValue([{ id: "practice-0", date: "2026-10-12", durationMin: 30, notes: "Escalas; Dificuldade: livre; Avaliação: 1/5", difficulty: "Acordes", rating: 4, recording: null }]);
  await render(<TeacherPracticeDetail />);
  expect(await screen.findByText("Escalas; Dificuldade: livre; Avaliação: 1/5")).toBeVisible();
  expect(screen.getByText("Acordes")).toBeVisible();
  expect(screen.getByLabelText("Avaliação 4 de 5, selecionada")).toBeVisible();
  expect(screen.queryByLabelText("Avaliação 1 de 5, selecionada")).toBeNull();
});

it("does not infer missing feedback from activity notes", async () => {
  mockParams = { id: "practice-0", studentId: "student-1" };
  service.studentPractices.mockResolvedValue([{ id: "practice-0", date: "2026-10-12", durationMin: 30, notes: "Escalas; Dificuldade: livre; Avaliação: 1/5", difficulty: null, rating: null, recording: null }]);
  await render(<TeacherPracticeDetail />);
  expect(await screen.findByText("Escalas; Dificuldade: livre; Avaliação: 1/5")).toBeVisible();
  expect(screen.getAllByText("Não informado")).toHaveLength(3);
  expect(screen.queryByLabelText(/selecionada/)).toBeNull();
});

it("shows missing fields explicitly without selecting a mood", async () => {
  mockParams = { id: "practice-0", studentId: "student-1" };
  service.studentPractices.mockResolvedValue([{ id: "practice-0", date: "2026-10-12", durationMin: 30, notes: null, difficulty: null, rating: null, recording: null }]);
  await render(<TeacherPracticeDetail />);
  await screen.findByText("12/10/2026");
  expect(screen.getAllByText("Não informado")).toHaveLength(4);
  expect(screen.queryByLabelText(/selecionada/)).toBeNull();
  expect(screen.queryByRole("button", { name: /Baixar gravação/ })).toBeNull();
});

it("retries failed practice details and handles a missing record", async () => {
  mockParams = { id: "missing", studentId: "student-1" };
  service.studentPractices.mockRejectedValueOnce(new Error("offline"));
  await render(<TeacherPracticeDetail />);
  expect(await screen.findByText("Não foi possível carregar a prática.")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("Prática não encontrada")).toBeVisible();
});


it("keeps the practice visible while student identity is retried", async () => {
  mockParams = { id: "practice-0", studentId: "student-1" };
  service.enrollments.mockRejectedValueOnce(new Error("offline"));
  await render(<TeacherPracticeDetail />);
  expect(await screen.findByText("Não foi possível carregar os dados do aluno.")).toBeVisible();
  expect(screen.getByText("Estudo 0")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("João")).toBeVisible();
  expect(service.enrollments).toHaveBeenCalledTimes(2);
});
