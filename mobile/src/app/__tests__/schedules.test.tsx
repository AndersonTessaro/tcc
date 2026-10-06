import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Schedules from "@/app/(teacher)/schedules";
import { teacherService, type TeacherSchedule } from "@/features/teacher/teacherService";
import { confirm } from "@/lib/confirm";
import { ApiError } from "@/lib/http/apiError";

const mockShow = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: {
    schedules: jest.fn(),
    enrollments: jest.fn(),
    createSchedule: jest.fn(),
    setScheduleActive: jest.fn(),
  },
}));
jest.mock("@/ui/DateTimeField", () => require("@/features/teacher/__tests__/dateTimeFieldStub"));
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockShow }) }));
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn().mockResolvedValue(true) }));

const service = teacherService as jest.Mocked<typeof teacherService>;
const confirmMock = confirm as jest.MockedFunction<typeof confirm>;

const existing: TeacherSchedule = {
  id: "s1",
  enrollmentId: "e1",
  studentName: "Ana Souza",
  instrument: "Piano",
  weekday: "MONDAY",
  startTime: "10:00:00",
  endTime: "11:00:00",
  active: true,
};

const created: TeacherSchedule = { ...existing, id: "s2", weekday: "WEDNESDAY", startTime: "14:00:00", endTime: "15:00:00" };

describe("Schedules screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    confirmMock.mockResolvedValue(true);
    service.schedules.mockResolvedValue([existing]);
    service.enrollments.mockResolvedValue([
      { id: "e1", studentId: "st1", studentName: "Ana Souza", instrument: "Piano" },
    ]);
    service.createSchedule.mockResolvedValue(created);
    service.setScheduleActive.mockResolvedValue({ ...existing, active: false });
  });

  it("lists recurring schedules", async () => {
    await render(<Schedules />);
    expect(await screen.findByText("Seg 10:00–11:00 · Ana Souza")).toBeVisible();
  });

  it("creates a schedule, confirms with a toast and resets the form", async () => {
    service.schedules.mockResolvedValueOnce([existing]).mockResolvedValue([existing, created]);
    await render(<Schedules />);
    await fireEvent.press(await screen.findByRole("radio", { name: "Ana Souza · Piano" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Qua" }));
    await fireEvent.press(screen.getByRole("button", { name: "Criar horário" }));

    await waitFor(() =>
      expect(service.createSchedule).toHaveBeenCalledWith({
        enrollmentId: "e1",
        weekday: "WEDNESDAY",
        startTime: "14:00",
        endTime: "15:00",
      }),
    );
    expect(mockShow).toHaveBeenCalledWith("Horário criado", "success");
    expect(await screen.findByText("Qua 14:00–15:00 · Ana Souza")).toBeVisible();
    expect(screen.getByRole("radio", { name: "Ana Souza · Piano" })).not.toBeSelected();
    expect(screen.getByRole("radio", { name: "Seg" })).toBeSelected();
  });

  it("requires a student before creating", async () => {
    await render(<Schedules />);
    await screen.findByText("Seg 10:00–11:00 · Ana Souza");
    await fireEvent.press(screen.getByRole("button", { name: "Criar horário" }));

    expect(screen.getByText("Selecione o aluno")).toBeVisible();
    expect(service.createSchedule).not.toHaveBeenCalled();
  });

  it("confirms before deactivating and updates the row", async () => {
    await render(<Schedules />);
    await fireEvent.press(await screen.findByRole("button", { name: "Desativar" }));

    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    await waitFor(() => expect(service.setScheduleActive).toHaveBeenCalledWith("s1", false));
    expect(await screen.findByText("Inativo")).toBeVisible();
  });

  it("reports conflicts on reactivation inline on the row", async () => {
    service.schedules.mockResolvedValue([{ ...existing, active: false }]);
    service.setScheduleActive.mockRejectedValue(new ApiError(409, "SCHEDULE_CONFLICT"));
    await render(<Schedules />);
    await fireEvent.press(await screen.findByRole("button", { name: "Reativar" }));

    expect(confirmMock).not.toHaveBeenCalled();
    expect(service.setScheduleActive).toHaveBeenCalledWith("s1", true);
    expect(await screen.findByText("Conflito de horário com outra aula ou horário fixo")).toBeVisible();
  });
});
