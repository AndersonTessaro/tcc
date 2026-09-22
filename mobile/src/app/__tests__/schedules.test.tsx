import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Schedules from "@/app/(teacher)/schedules";
import { teacherService, type TeacherSchedule } from "@/features/teacher/teacherService";
import { ApiError } from "@/lib/http/apiError";

jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: {
    schedules: jest.fn(),
    enrollments: jest.fn(),
    createSchedule: jest.fn(),
    setScheduleActive: jest.fn(),
  },
}));

const service = teacherService as jest.Mocked<typeof teacherService>;

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

describe("Schedules screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.schedules.mockResolvedValue([existing]);
    service.enrollments.mockResolvedValue([
      { id: "e1", studentId: "st1", studentName: "Ana Souza", instrument: "Piano" },
    ]);
    service.createSchedule.mockResolvedValue(existing);
    service.setScheduleActive.mockResolvedValue({ ...existing, active: false });
  });

  it("lists recurring schedules", async () => {
    await render(<Schedules />);
    expect(await screen.findByText("Seg 10:00–11:00 · Ana Souza")).toBeVisible();
  });

  it("creates a schedule for the selected student and weekday", async () => {
    await render(<Schedules />);
    await fireEvent.press(await screen.findByText("Ana Souza · Piano"));
    await fireEvent.press(screen.getByText("Qua"));
    await fireEvent.press(screen.getByText("Criar horário"));

    await waitFor(() =>
      expect(service.createSchedule).toHaveBeenCalledWith({
        enrollmentId: "e1",
        weekday: "WEDNESDAY",
        startTime: "14:00",
        endTime: "15:00",
      }),
    );
  });

  it("toggles a schedule and reports conflicts on reactivation", async () => {
    service.schedules.mockResolvedValue([{ ...existing, active: false }]);
    service.setScheduleActive.mockRejectedValue(new ApiError(409, "SCHEDULE_CONFLICT"));
    await render(<Schedules />);
    await fireEvent.press(await screen.findByText("Reativar"));

    expect(service.setScheduleActive).toHaveBeenCalledWith("s1", true);
    expect(await screen.findByText("Conflito de horário com outra aula ou horário fixo")).toBeVisible();
  });
});
