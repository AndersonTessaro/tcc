import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import NewLesson from "@/app/(teacher)/new-lesson";
import { teacherService } from "@/features/teacher/teacherService";
import { ApiError } from "@/lib/http/apiError";

jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: { enrollments: jest.fn(), newLesson: jest.fn() },
}));

const service = teacherService as jest.Mocked<typeof teacherService>;

describe("NewLesson screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.enrollments.mockResolvedValue([
      { id: "enr-1", studentId: "st-1", studentName: "Ana Souza", instrument: "Piano" },
    ]);
    service.newLesson.mockResolvedValue({});
  });

  it("sends the selected enrollment with start and end time", async () => {
    await render(<NewLesson />);
    await fireEvent.press(await screen.findByText("Ana Souza"));
    await fireEvent.changeText(screen.getByPlaceholderText("Data (AAAA-MM-DD)"), "2026-09-21");
    await fireEvent.changeText(screen.getByPlaceholderText("Início (HH:MM)"), "14:00");
    await fireEvent.press(screen.getByText("Salvar"));

    await waitFor(() =>
      expect(service.newLesson).toHaveBeenCalledWith({
        enrollmentId: "enr-1",
        date: "2026-09-21",
        startTime: "14:00",
        endTime: "15:00",
        content: undefined,
        homework: undefined,
      }),
    );
    expect(await screen.findByText("Aula registrada!")).toBeVisible();
  });

  it("does not call the API without a selected student", async () => {
    await render(<NewLesson />);
    await screen.findByText("Ana Souza");
    await fireEvent.press(screen.getByText("Salvar"));

    expect(await screen.findByText("Selecione o aluno")).toBeVisible();
    expect(service.newLesson).not.toHaveBeenCalled();
  });

  it("shows a schedule conflict returned by the backend", async () => {
    service.newLesson.mockRejectedValue(new ApiError(409, "SCHEDULE_CONFLICT"));
    await render(<NewLesson />);
    await fireEvent.press(await screen.findByText("Ana Souza"));
    await fireEvent.press(screen.getByText("Salvar"));

    expect(await screen.findByText(/Conflito de horário/)).toBeVisible();
  });
});
