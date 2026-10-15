import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import EditLesson from "@/app/(teacher)/lesson/[id]";
import { teacherService, type LessonAvailability, type TeacherLesson, type TeacherLessonDetail } from "@/features/teacher/teacherService";
import { confirm } from "@/lib/confirm";
import { ApiError } from "@/lib/http/apiError";

const mockBack = jest.fn();
const mockShow = jest.fn();
jest.mock("expo-router", () => ({
  useNavigation: () => ({ addListener: jest.fn(() => () => undefined), setOptions: jest.fn(), dispatch: jest.fn() }),
  useRouter: () => ({ back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: "lesson-1" }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: {
    lesson: jest.fn(),
    updateLesson: jest.fn(),
    availability: jest.fn(),
    enrollments: jest.fn(),
    uploadLessonAttachment: jest.fn(),
    deleteLessonAttachment: jest.fn(),
    downloadLessonAttachment: jest.fn(),
  },
}));
jest.mock("@/ui/DateTimeField", () => require("@/features/teacher/__tests__/dateTimeFieldStub"));
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockShow }) }));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn().mockResolvedValue(true) }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));

const service = teacherService as jest.Mocked<typeof teacherService>;
const confirmMock = confirm as jest.MockedFunction<typeof confirm>;

const free: LessonAvailability = { initialStatus: "SCHEDULED", available: true, busy: [], conflicts: [], fulfilledSchedule: null };

const lesson = (overrides: Partial<TeacherLesson> = {}): TeacherLesson => ({
  id: "lesson-1",
  enrollmentId: "enr-1",
  studentId: "st-1",
  studentName: "Ana Souza",
  teacherName: "Carlos",
  instrument: "Piano",
  date: "2099-01-05",
  startTime: "09:00:00",
  endTime: "10:00:00",
  status: "SCHEDULED",
  content: "Escalas",
  homework: "Praticar",
  attendance: null,
  ...overrides,
});

const detail = (overrides: Partial<TeacherLesson> = {}, attachments: TeacherLessonDetail["attachments"] = []): TeacherLessonDetail => ({
  lesson: lesson(overrides),
  attachments,
});

describe("Edit lesson screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    confirmMock.mockResolvedValue(true);
    service.availability.mockResolvedValue(free);
    service.updateLesson.mockResolvedValue(lesson());
  });

  it("fills the form from the lesson and saves the edit, excluding itself from availability", async () => {
    service.lesson.mockResolvedValue(detail());
    await render(<EditLesson />);

    expect(await screen.findByText("Ana Souza")).toBeVisible();
    expect(screen.getByLabelText("Início")).toHaveProp("value", "09:00");
    await fireEvent.changeText(screen.getByLabelText("Conteúdo trabalhado"), "Arpejos");
    await waitFor(() => expect(service.availability).toHaveBeenCalledWith("enr-1", "2099-01-05", "09:00", "10:00", "lesson-1"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar aula" })).toBeEnabled());
    await fireEvent.press(screen.getByRole("button", { name: "Salvar aula" }));

    await waitFor(() => expect(service.updateLesson).toHaveBeenCalledWith("lesson-1", {
      date: "2099-01-05", startTime: "09:00", endTime: "10:00", content: "Arpejos", homework: "Praticar",
    }));
    expect(mockShow).toHaveBeenCalledWith("Aula atualizada", "success");
    expect(mockBack).toHaveBeenCalled();
  });

  it("keeps the date of a completed lesson and resends it unchanged", async () => {
    service.lesson.mockResolvedValue(detail({ status: "DONE", date: "2026-09-22" }));
    await render(<EditLesson />);

    expect(await screen.findByText(/Aula concluída: a data não muda/)).toBeVisible();
    expect(screen.queryByLabelText("Início")).toBeNull();
    expect(service.availability).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText("Tarefa para casa"), "Revisar");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar aula" }));

    await waitFor(() => expect(service.updateLesson).toHaveBeenCalledWith("lesson-1", {
      date: "2026-09-22", startTime: "09:00", endTime: "10:00", content: "Escalas", homework: "Revisar",
    }));
  });

  it("asks before removing a saved attachment and reloads the lesson", async () => {
    service.lesson.mockResolvedValue(detail({}, [{ id: "att-1", fileName: "partitura.pdf", contentType: "application/pdf", sizeBytes: 2048 }]));
    service.deleteLessonAttachment.mockResolvedValue(undefined);
    await render(<EditLesson />);

    await fireEvent.press(await screen.findByRole("button", { name: "Remover anexo partitura.pdf" }));

    await waitFor(() => expect(service.deleteLessonAttachment).toHaveBeenCalledWith("lesson-1", "att-1"));
    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    await waitFor(() => expect(service.lesson).toHaveBeenCalledTimes(2));
  });

  it("does not remove the attachment when the teacher cancels the confirmation", async () => {
    confirmMock.mockResolvedValue(false);
    service.lesson.mockResolvedValue(detail({}, [{ id: "att-1", fileName: "partitura.pdf", contentType: "application/pdf", sizeBytes: 2048 }]));
    await render(<EditLesson />);

    await fireEvent.press(await screen.findByRole("button", { name: "Remover anexo partitura.pdf" }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(service.deleteLessonAttachment).not.toHaveBeenCalled();
  });

  it("shows a canceled lesson as read-only but still downloadable", async () => {
    service.lesson.mockResolvedValue(detail({ status: "CANCELED" }, [{ id: "att-1", fileName: "partitura.pdf", contentType: "application/pdf", sizeBytes: 2048 }]));
    await render(<EditLesson />);

    expect(await screen.findByText("Aula cancelada: somente leitura.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Salvar aula" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Adicionar anexo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remover anexo partitura.pdf" })).toBeNull();
    expect(screen.getByRole("button", { name: "Baixar anexo partitura.pdf" })).toBeVisible();
  });

  it("shows a schedule conflict from the server on the time field", async () => {
    service.lesson.mockResolvedValue(detail());
    service.updateLesson.mockRejectedValue(new ApiError(409, "SCHEDULE_CONFLICT", "Teacher already has a lesson"));
    await render(<EditLesson />);

    await fireEvent.changeText(await screen.findByLabelText("Início"), "11:00");
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar aula" })).toBeEnabled());
    await fireEvent.press(screen.getByRole("button", { name: "Salvar aula" }));

    const message = await screen.findByText("Conflito de horário com outra aula ou horário fixo");
    expect(message).toHaveProp("accessibilityRole", "alert");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
