import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Makeup from "@/app/(teacher)/makeup/[lessonId]";
import { teacherService } from "@/features/teacher/teacherService";
import { ApiError } from "@/lib/http/apiError";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockShow = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => ({ lessonId: "l1", studentName: "Ana Souza", instrument: "Piano", originalDate: "2026-09-22" }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({ teacherService: { makeup: jest.fn(), makeupLink: jest.fn() } }));
jest.mock("@/ui/DateTimeField", () => require("@/features/teacher/__tests__/dateTimeFieldStub"));
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockShow }) }));

const service = teacherService as jest.Mocked<typeof teacherService>;

describe("Makeup screen", () => {
  beforeEach(() => { jest.clearAllMocks(); service.makeupLink.mockResolvedValue(undefined); });

  it("shows the original lesson context", async () => {
    await render(<Makeup />);
    expect(await screen.findByText("Ana Souza · Piano")).toBeVisible();
    expect(screen.getByText("22/09/2026")).toBeVisible();
  });

  it("opens the actual date of an already linked makeup", async () => {
    service.makeupLink.mockResolvedValue({ newLesson: { date: "2026-10-20", startTime: "14:00:00", endTime: "15:00:00" }, reason: "Falta" } as any);
    await render(<Makeup />);
    expect(await screen.findByText("Esta aula já tem uma reposição em 20/10/2026 às 14:00.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Agendar reposição" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar à agenda" }));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: "/(teacher)/schedule", params: expect.objectContaining({ date: "2026-10-20" }) });
    expect(service.makeup).not.toHaveBeenCalled();
  });

  it("schedules the makeup for the original lesson", async () => {
    service.makeup.mockResolvedValue({ newLesson: { date: "2026-09-30", startTime: "15:00:00" } } as any);
    await render(<Makeup />);
    await screen.findByText("Ana Souza · Piano");
    await fireEvent.changeText(screen.getByLabelText("Data"), "2026-09-30");
    await fireEvent.changeText(screen.getByLabelText("Início"), "15:00");
    await fireEvent.changeText(screen.getByLabelText("Motivo"), "Aluno faltou");
    await fireEvent.press(screen.getByRole("button", { name: "Agendar reposição" }));

    await waitFor(() =>
      expect(service.makeup).toHaveBeenCalledWith("l1", {
        date: "2026-09-30",
        startTime: "15:00",
        endTime: "16:00",
        reason: "Aluno faltou",
      }),
    );
    expect(await screen.findByText("Reposição agendada para 30/09/2026 às 15:00.")).toBeVisible();
    expect(mockShow).toHaveBeenCalledWith("Reposição agendada", "success");
    await fireEvent.press(screen.getByRole("button", { name: "Voltar à agenda" }));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: "/(teacher)/schedule", params: expect.objectContaining({ date: "2026-09-30" }) });
  });

  it("explains why the lesson cannot be replaced", async () => {
    service.makeup.mockRejectedValue(new ApiError(409, "INVALID_MAKEUP_LINK"));
    await render(<Makeup />);
    await screen.findByText("Ana Souza · Piano");
    await fireEvent.press(screen.getByRole("button", { name: "Agendar reposição" }));

    expect(await screen.findByText("Esta aula não pode receber reposição")).toBeVisible();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("places a schedule conflict under the time fields", async () => {
    service.makeup.mockRejectedValue(new ApiError(409, "SCHEDULE_CONFLICT"));
    await render(<Makeup />);
    await screen.findByText("Ana Souza · Piano");
    await fireEvent.press(screen.getByRole("button", { name: "Agendar reposição" }));

    expect(await screen.findByText("Conflito de horário com outra aula ou horário fixo")).toHaveProp("accessibilityRole", "alert");
  });

  it("retries the makeup lookup after a failure", async () => {
    service.makeupLink.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await render(<Makeup />);
    expect(await screen.findByText("Sem conexão com o servidor")).toBeVisible();
    expect(screen.getByRole("button", { name: "Agendar reposição" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Agendar reposição" })).toBeEnabled());
  });
});
