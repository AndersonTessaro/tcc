import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import NewLesson from "@/app/(teacher)/new-lesson";
import { teacherService, type TeacherLesson } from "@/features/teacher/teacherService";
import { confirm } from "@/lib/confirm";
import { ApiError } from "@/lib/http/apiError";

const mockBack = jest.fn();
const mockShow = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: { enrollments: jest.fn(), newLesson: jest.fn() },
}));
jest.mock("@/ui/DateTimeField", () => require("@/features/teacher/__tests__/dateTimeFieldStub"));
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockShow }) }));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn().mockResolvedValue(true) }));

const service = teacherService as jest.Mocked<typeof teacherService>;
const confirmMock = confirm as jest.MockedFunction<typeof confirm>;

describe("NewLesson screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    service.enrollments.mockResolvedValue([
      { id: "enr-1", studentId: "st-1", studentName: "Ana Souza", instrument: "Piano" },
      { id: "enr-2", studentId: "st-2", studentName: "João Íris", instrument: "Violão" },
    ]);
    service.newLesson.mockResolvedValue({ status: "DONE" } as TeacherLesson);
  });

  it("sends the selected enrollment with an end time following the start, then goes back", async () => {
    await render(<NewLesson />);
    await fireEvent.press(await screen.findByText("Ana Souza · Piano"));
    await fireEvent.changeText(screen.getByLabelText("Data"), "2026-09-21");
    await fireEvent.changeText(screen.getByLabelText("Início"), "14:00");
    await fireEvent.changeText(screen.getByLabelText("Conteúdo trabalhado"), "  Escalas  ");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar aula" }));

    await waitFor(() =>
      expect(service.newLesson).toHaveBeenCalledWith({
        enrollmentId: "enr-1",
        date: "2026-09-21",
        startTime: "14:00",
        endTime: "15:00",
        content: "Escalas",
        homework: undefined,
      }),
    );
    expect(mockShow).toHaveBeenCalledWith("Aula registrada", "success");
    expect(mockBack).toHaveBeenCalled();
  });

  it("keeps a manually edited end time when the start changes", async () => {
    await render(<NewLesson />);
    await fireEvent.press(await screen.findByText("Ana Souza · Piano"));
    await fireEvent.changeText(screen.getByLabelText("Fim"), "12:30");
    await fireEvent.changeText(screen.getByLabelText("Início"), "11:00");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar aula" }));

    await waitFor(() => expect(service.newLesson).toHaveBeenCalledWith(expect.objectContaining({ startTime: "11:00", endTime: "12:30" })));
  });

  it("filters enrollments ignoring accents", async () => {
    await render(<NewLesson />);
    await screen.findByText("Ana Souza · Piano");
    await fireEvent.changeText(screen.getByLabelText("Buscar aluno ou instrumento"), "iris violao");
    expect(screen.queryByText("Ana Souza · Piano")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Buscar aluno ou instrumento"), "violao");
    expect(screen.getByText("João Íris · Violão")).toBeVisible();
    expect(screen.queryByText("Ana Souza · Piano")).toBeNull();
  });

  it("preselects the student's only enrollment from the route", async () => {
    mockParams = { studentId: "st-2" };
    await render(<NewLesson />);
    await waitFor(() => expect(screen.getByRole("radio", { name: "João Íris · Violão" })).toBeSelected());
    expect(screen.queryByText("Ana Souza · Piano")).toBeNull();
  });

  it("validates inline without calling the API", async () => {
    await render(<NewLesson />);
    await screen.findByText("Ana Souza · Piano");
    await fireEvent.changeText(screen.getByLabelText("Fim"), "09:00");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar aula" }));

    expect(await screen.findByText("Selecione o aluno")).toBeVisible();
    expect(screen.getByText("O fim deve ser depois do início")).toBeVisible();
    expect(service.newLesson).not.toHaveBeenCalled();
  });

  it("shows a schedule conflict under the time fields and stays on the screen", async () => {
    service.newLesson.mockRejectedValue(new ApiError(409, "SCHEDULE_CONFLICT"));
    await render(<NewLesson />);
    await fireEvent.press(await screen.findByText("Ana Souza · Piano"));
    await fireEvent.press(screen.getByRole("button", { name: "Salvar aula" }));

    const message = await screen.findByText("Conflito de horário com outra aula ou horário fixo");
    expect(message).toHaveProp("accessibilityRole", "alert");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("asks before discarding a filled form", async () => {
    confirmMock.mockResolvedValue(false);
    await render(<NewLesson />);
    await fireEvent.press(await screen.findByText("Ana Souza · Piano"));
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ destructive: true })));
    expect(mockBack).not.toHaveBeenCalled();
  });
});
