import { fireEvent, render, screen } from "@testing-library/react-native";
import TeacherStudentDetail from "@/features/teacher/TeacherStudentDetail";
import { teacherService } from "@/features/teacher/teacherService";
import { saveDownload } from "@/lib/files/saveDownload";
import { ApiError } from "@/lib/http/apiError";

const mockToast = jest.fn();
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock("@/lib/files/saveDownload", () => ({ saveDownload: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "student-1" }),
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
    id: "practice-" + index, date: "2026-10-12", durationMin: 30, notes: "Estudo " + index,
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
