import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Schedule from "@/app/(teacher)/schedule";
import { teacherService, type TeacherLesson } from "@/features/teacher/teacherService";
import { localIsoDate } from "@/features/teacher/lessonForm";
import { ApiError } from "@/lib/http/apiError";

jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: { schedule: jest.fn(), attendance: jest.fn() },
}));

const service = teacherService as jest.Mocked<typeof teacherService>;
const today = localIsoDate();

const lesson = (overrides: Partial<TeacherLesson>): TeacherLesson => ({
  id: "l1",
  enrollmentId: "e1",
  studentId: "s1",
  studentName: "Ana Souza",
  teacherName: "Carlos",
  instrument: "Piano",
  date: today,
  startTime: "09:00:00",
  endTime: "10:00:00",
  status: "DONE",
  content: null,
  homework: null,
  attendance: null,
  ...overrides,
});

describe("Schedule screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.attendance.mockResolvedValue({});
  });

  it("shows lessons with student, time and the recorded attendance", async () => {
    service.schedule.mockResolvedValue([lesson({ attendance: "PRESENT" })]);
    await render(<Schedule />);

    expect(await screen.findByText("09:00–10:00 · Ana Souza")).toBeVisible();
    expect(screen.getByRole("radio", { name: "Presente" })).toBeSelected();
  });

  it("hides attendance buttons for a canceled lesson", async () => {
    service.schedule.mockResolvedValue([lesson({ status: "CANCELED" })]);
    await render(<Schedule />);

    expect(await screen.findByText("Aula cancelada")).toBeVisible();
    expect(screen.queryByText("Presente")).toBeNull();
  });

  it("records attendance and reloads the day", async () => {
    service.schedule.mockResolvedValue([lesson({})]);
    await render(<Schedule />);
    await fireEvent.press(await screen.findByText("Falta"));

    await waitFor(() => expect(service.attendance).toHaveBeenCalledWith("l1", "ABSENT"));
    await waitFor(() => expect(service.schedule).toHaveBeenCalledTimes(2));
  });

  it("explains a rejected attendance", async () => {
    service.schedule.mockResolvedValue([lesson({})]);
    service.attendance.mockRejectedValue(
      new ApiError(422, "DOMAIN_VALIDATION", "Attendance cannot be recorded for a canceled lesson"),
    );
    await render(<Schedule />);
    await fireEvent.press(await screen.findByText("Presente"));

    expect(await screen.findByText("Aula cancelada não recebe frequência")).toBeVisible();
  });
});
