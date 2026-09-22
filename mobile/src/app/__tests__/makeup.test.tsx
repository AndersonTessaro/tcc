import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Makeup from "@/app/(teacher)/makeup/[lessonId]";
import { teacherService } from "@/features/teacher/teacherService";
import { ApiError } from "@/lib/http/apiError";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ lessonId: "l1" }),
}));
jest.mock("@/features/teacher/teacherService", () => ({ teacherService: { makeup: jest.fn() } }));

const service = teacherService as jest.Mocked<typeof teacherService>;

describe("Makeup screen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("schedules the makeup for the original lesson and goes back", async () => {
    service.makeup.mockResolvedValue({});
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
    expect(mockBack).toHaveBeenCalled();
  });

  it("explains why the lesson cannot be replaced", async () => {
    service.makeup.mockRejectedValue(new ApiError(409, "INVALID_MAKEUP_LINK"));
    await render(<Makeup />);
    await fireEvent.press(screen.getByText("Agendar reposição"));

    expect(await screen.findByText("Esta aula não pode receber reposição")).toBeVisible();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
