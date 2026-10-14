import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Schedule from "@/app/(teacher)/(tabs)/schedule";
import { teacherService, type TeacherLesson } from "@/features/teacher/teacherService";
import { formatFullDate, parseIsoDate, toIsoDate, todayIso } from "@/lib/format";
import { shiftMonth } from "@/lib/format/calendar";
import { confirm } from "@/lib/confirm";
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
jest.mock("@/lib/confirm", () => ({ confirm: jest.fn().mockResolvedValue(true) }));

const service = teacherService as jest.Mocked<typeof teacherService>;
const confirmMock = confirm as jest.MockedFunction<typeof confirm>;
const today = todayIso();

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
    confirmMock.mockResolvedValue(true);
    service.attendance.mockResolvedValue({});
    service.changeLessonStatus.mockResolvedValue(lesson({}));
  });

  it("shows lessons with student, time and the recorded attendance", async () => {
    service.schedule.mockResolvedValue([lesson({ attendance: "PRESENT" })]);
    await render(<Schedule />);

    expect(await screen.findByText("Ana Souza")).toBeVisible();
    expect(screen.getByText("09:00")).toBeVisible();
    expect(screen.getByLabelText("Até 10:00")).toBeVisible();
    expect(screen.getByRole("radio", { name: "Presente" })).toBeChecked();
  });

  it("hides attendance buttons for a canceled lesson", async () => {
    service.schedule.mockResolvedValue([lesson({ status: "CANCELED" })]);
    await render(<Schedule />);

    expect(await screen.findByText("Aula cancelada")).toBeVisible();
    expect(screen.queryByText("Presente")).toBeNull();
  });

  it("marks attendance optimistically without blanking the list, then refetches silently", async () => {
    let finish: (value: unknown) => void = () => {};
    service.schedule.mockResolvedValueOnce([lesson({})]).mockResolvedValue([lesson({ attendance: "ABSENT" })]);
    service.attendance.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await render(<Schedule />);
    await fireEvent.press(await screen.findByRole("radio", { name: "Falta" }));

    expect(screen.getByText("Ana Souza")).toBeVisible();
    expect(screen.getByRole("radio", { name: "Falta" })).toBeChecked();
    expect(service.attendance).toHaveBeenCalledWith("l1", "ABSENT");
    expect(screen.queryByLabelText("Carregando")).toBeNull();

    await act(async () => finish({}));
    await waitFor(() => expect(service.schedule).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Ana Souza")).toBeVisible();
    expect(screen.getByRole("radio", { name: "Falta" })).toBeChecked();
  });

  it("asks for a justification only after choosing Justificada and sends it with EXCUSED", async () => {
    service.schedule.mockResolvedValue([lesson({ attendance: "PRESENT" })]);
    await render(<Schedule />);
    await screen.findByText("Ana Souza");
    expect(screen.queryByLabelText("Justificativa para Ana Souza")).toBeNull();

    await fireEvent.press(screen.getByRole("radio", { name: "Justificada" }));
    expect(service.attendance).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText("Justificativa para Ana Souza"), "Atestado médico");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar justificativa" }));

    await waitFor(() => expect(service.attendance).toHaveBeenCalledWith("l1", "EXCUSED", "Atestado médico"));
    await waitFor(() => expect(screen.queryByLabelText("Justificativa para Ana Souza")).toBeNull());
  });

  it("confirms before canceling a scheduled lesson and applies the response", async () => {
    service.schedule.mockResolvedValueOnce([lesson({ status: "SCHEDULED" })]).mockResolvedValue([lesson({ status: "CANCELED" })]);
    service.changeLessonStatus.mockResolvedValue(lesson({ status: "CANCELED" }));
    await render(<Schedule />);
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar aula" }));

    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    await waitFor(() => expect(service.changeLessonStatus).toHaveBeenCalledWith("l1", "CANCELED"));
    expect(await screen.findByText("Cancelada")).toBeVisible();
  });

  it("does not cancel when the confirmation is dismissed", async () => {
    confirmMock.mockResolvedValue(false);
    service.schedule.mockResolvedValue([lesson({ status: "SCHEDULED" })]);
    await render(<Schedule />);
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar aula" }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(service.changeLessonStatus).not.toHaveBeenCalled();
  });

  it("opens the makeup screen for a canceled lesson", async () => {
    service.schedule.mockResolvedValue([lesson({ status: "CANCELED" })]);
    await render(<Schedule />);
    await fireEvent.press(await screen.findByRole("button", { name: "Repor" }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(teacher)/makeup/[lessonId]",
      params: { lessonId: "l1", studentName: "Ana Souza", instrument: "Piano", originalDate: today },
    });
  });

  it("explains a rejected attendance on the card and rolls back the selection", async () => {
    service.schedule.mockResolvedValue([lesson({})]);
    service.attendance.mockRejectedValue(
      new ApiError(422, "DOMAIN_VALIDATION", "Attendance cannot be recorded for a canceled lesson"),
    );
    await render(<Schedule />);
    await fireEvent.press(await screen.findByRole("radio", { name: "Presente" }));

    expect(await screen.findByText("Aula cancelada não recebe frequência")).toBeVisible();
    expect(screen.getByRole("radio", { name: "Presente" })).not.toBeChecked();
    expect(screen.getByText("Ana Souza")).toBeVisible();
  });

  it("selects days in the full month, navigates months and returns to today", async () => {
    service.schedule.mockResolvedValue([]);
    await render(<Schedule />);
    expect(await screen.findByText("Sem aulas neste dia")).toBeVisible();
    expect(service.schedule).toHaveBeenLastCalledWith(today);

    const nextMonth = toIsoDate(shiftMonth(parseIsoDate(today), 1));
    await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));
    await waitFor(() => expect(service.schedule).toHaveBeenLastCalledWith(nextMonth));
    const lastDay = toIsoDate(new Date(parseIsoDate(nextMonth).getFullYear(), parseIsoDate(nextMonth).getMonth() + 1, 0));
    await fireEvent.press(screen.getByRole("button", { name: formatFullDate(lastDay) }));
    await waitFor(() => expect(service.schedule).toHaveBeenLastCalledWith(lastDay));
    expect(screen.getByRole("button", { name: formatFullDate(lastDay) })).toBeSelected();

    await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
    const startOfMonth = toIsoDate(new Date(parseIsoDate(today).getFullYear(), parseIsoDate(today).getMonth(), 1));
    await waitFor(() => expect(service.schedule).toHaveBeenLastCalledWith(startOfMonth));
    await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));
    await waitFor(() => expect(service.schedule).toHaveBeenLastCalledWith(nextMonth));

    await fireEvent.press(screen.getByRole("button", { name: "Ir para hoje" }));
    await waitFor(() => expect(service.schedule).toHaveBeenLastCalledWith(today));
  });

  it("offers a new lesson for the selected day", async () => {
    service.schedule.mockResolvedValue([]);
    await render(<Schedule />);
    await screen.findByText("Sem aulas neste dia");
    await fireEvent.press(screen.getAllByRole("button", { name: "Nova aula" })[0]);

    expect(mockPush).toHaveBeenCalledWith({ pathname: "/(teacher)/new-lesson", params: { date: today } });
  });
});
