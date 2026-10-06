import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Schedule from "@/app/(teacher)/(tabs)/schedule";
import { teacherService, type TeacherLesson } from "@/features/teacher/teacherService";
import { localIsoDate } from "@/features/teacher/lessonForm";
import { ApiError } from "@/lib/http/apiError";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: { schedule: jest.fn(), attendance: jest.fn(), changeLessonStatus: jest.fn() },
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
    service.changeLessonStatus.mockResolvedValue(lesson({}));
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

  it("queries another day only after a valid date is submitted", async () => {
    service.schedule.mockResolvedValue([]);
    await render(<Schedule />);
    await screen.findByText("Sem aulas neste dia.");
    const initialCalls = service.schedule.mock.calls.length;
    await fireEvent.changeText(screen.getByPlaceholderText("Data (AAAA-MM-DD)"), "2026-02-30");
    expect(service.schedule).toHaveBeenCalledTimes(initialCalls);
    await fireEvent.press(screen.getByText("Buscar dia"));
    expect(screen.getByText("Data inválida (AAAA-MM-DD)")).toBeVisible();
    await fireEvent.changeText(screen.getByPlaceholderText("Data (AAAA-MM-DD)"), "2026-09-22");
    await fireEvent.press(screen.getByText("Buscar dia"));
    await waitFor(() => expect(service.schedule).toHaveBeenCalledWith("2026-09-22"));
  });

  it("sends a justification when correcting attendance", async () => {
    service.schedule.mockResolvedValue([lesson({ attendance: "PRESENT" })]);
    await render(<Schedule />);
    await screen.findByText("09:00–10:00 · Ana Souza");
    await fireEvent.changeText(screen.getByLabelText("Justificativa para Ana Souza"), "Correção do lançamento");
    await fireEvent.press(screen.getByText("Falta"));

    await waitFor(() => expect(service.attendance).toHaveBeenCalledWith("l1", "ABSENT", "Correção do lançamento"));
  });

  it("cancels a scheduled lesson", async () => {
    service.schedule.mockResolvedValue([lesson({ status: "SCHEDULED" })]);
    await render(<Schedule />);
    await fireEvent.press(await screen.findByText("Cancelar aula"));

    await waitFor(() => expect(service.changeLessonStatus).toHaveBeenCalledWith("l1", "CANCELED"));
  });

  it("opens the makeup screen for a canceled lesson", async () => {
    service.schedule.mockResolvedValue([lesson({ status: "CANCELED" })]);
    await render(<Schedule />);
    await fireEvent.press(await screen.findByText("Repor"));

    expect(mockPush).toHaveBeenCalledWith("/(teacher)/makeup/l1");
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
