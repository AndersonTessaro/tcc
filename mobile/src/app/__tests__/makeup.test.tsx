import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Makeup from "@/app/(teacher)/makeup/[lessonId]";
import { teacherService } from "@/features/teacher/teacherService";
import { ApiError } from "@/lib/http/apiError";

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => ({ lessonId: "l1" }),
}));
jest.mock("@/features/teacher/teacherService", () => ({ teacherService: { makeup: jest.fn(), makeupLink: jest.fn() } }));

const service = teacherService as jest.Mocked<typeof teacherService>;

describe("Makeup screen", () => {
  beforeEach(() => { jest.clearAllMocks(); service.makeupLink.mockResolvedValue(undefined); });

  it("opens the actual date of an already linked makeup", async () => {
    service.makeupLink.mockResolvedValue({ newLesson: { date: "2026-10-20", startTime: "14:00:00", endTime: "15:00:00" }, reason: "Falta" } as any);
    await render(<Makeup />);
    expect(await screen.findByText(/Esta aula já tem uma reposição em 2026-10-20/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Agendar reposição" })).toBeDisabled();
    await fireEvent.press(screen.getByText("Voltar à agenda"));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: "/(teacher)/schedule", params: { date: "2026-10-20" } });
    expect(service.makeup).not.toHaveBeenCalled();
  });

  it("schedules the makeup for the original lesson and goes back", async () => {
    service.makeup.mockResolvedValue({ newLesson: { date: "2026-09-30", startTime: "15:00:00" } } as any);
    await render(<Makeup />);
    await fireEvent.changeText(screen.getByPlaceholderText("Data (AAAA-MM-DD)"), "2026-09-30");
    await fireEvent.changeText(screen.getByPlaceholderText("Início (HH:MM)"), "15:00");
    await fireEvent.changeText(screen.getByPlaceholderText("Motivo"), "Aluno faltou");
    await fireEvent.press(screen.getByText("Agendar reposição"));

    await waitFor(() =>
      expect(service.makeup).toHaveBeenCalledWith("l1", {
        date: "2026-09-30",
        startTime: "15:00",
        endTime: "16:00",
        reason: "Aluno faltou",
      }),
    );
    expect(await screen.findByText(/Reposição agendada para/)).toBeVisible();
    await fireEvent.press(screen.getByText("Voltar à agenda"));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: "/(teacher)/schedule", params: { date: "2026-09-30" } });
  });

  it("explains why the lesson cannot be replaced", async () => {
    service.makeup.mockRejectedValue(new ApiError(409, "INVALID_MAKEUP_LINK"));
    await render(<Makeup />);
    await screen.findByText("Agendar reposição");
    await fireEvent.press(screen.getByText("Agendar reposição"));

    expect(await screen.findByText("Esta aula não pode receber reposição")).toBeVisible();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("explains when the lesson already has a makeup", async () => {
    service.makeup.mockRejectedValue(new ApiError(409, "INVALID_MAKEUP_LINK", "Lesson already has a makeup linked"));
    await render(<Makeup />);
    await screen.findByText("Agendar reposição");
    await fireEvent.press(screen.getByText("Agendar reposição"));

    expect(await screen.findByText("Esta aula já tem uma reposição")).toBeVisible();
  });
});
