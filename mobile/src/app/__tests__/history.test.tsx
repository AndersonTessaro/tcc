import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import History from "@/app/(teacher)/history";
import { teacherService, type TeacherLesson } from "@/features/teacher/teacherService";
import { addDays, todayIso } from "@/lib/format";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: { history: jest.fn() },
}));
jest.mock("@/ui/DateTimeField", () => require("@/features/teacher/__tests__/dateTimeFieldStub"));

const service = teacherService as jest.Mocked<typeof teacherService>;
const today = todayIso();
const lesson: TeacherLesson = {
  id: "l1",
  enrollmentId: "e1",
  studentId: "s1",
  studentName: "Ana Souza",
  teacherName: "Carlos",
  instrument: "Piano",
  date: "2026-09-22",
  startTime: "09:00:00",
  endTime: "10:00:00",
  status: "DONE",
  content: null,
  homework: null,
  attendance: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  service.history.mockResolvedValue([lesson]);
});

it("shows lessons from the last 30 days and opens one in the agenda", async () => {
  await render(<History />);

  expect(await screen.findByText("22/09/2026 · 09:00–10:00")).toBeVisible();
  expect(screen.getByText("Ana Souza · Piano")).toBeVisible();
  expect(screen.getByText("Realizada")).toBeVisible();
  expect(service.history).toHaveBeenCalledWith(addDays(today, -30), today);

  await fireEvent.press(screen.getByText("Ana Souza · Piano"));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/(teacher)/schedule", params: expect.objectContaining({ date: "2026-09-22" }) });
});

it("switches period with presets", async () => {
  await render(<History />);
  await screen.findByText("Ana Souza · Piano");
  await fireEvent.press(screen.getByRole("radio", { name: "7 dias" }));
  await waitFor(() => expect(service.history).toHaveBeenLastCalledWith(addDays(today, -6), today));
  await fireEvent.press(screen.getByRole("radio", { name: "Este mês" }));
  await waitFor(() => expect(service.history).toHaveBeenLastCalledWith(`${today.slice(0, 8)}01`, today));
});

it("filters by a valid custom range and rejects an inverted range", async () => {
  await render(<History />);
  await screen.findByText("Ana Souza · Piano");
  await fireEvent.press(screen.getByRole("radio", { name: "Personalizado" }));
  await fireEvent.changeText(screen.getByLabelText("Data inicial"), "2026-09-01");
  await fireEvent.changeText(screen.getByLabelText("Data final"), "2026-09-30");
  await fireEvent.press(screen.getByRole("button", { name: "Buscar aulas" }));
  await waitFor(() => expect(service.history).toHaveBeenCalledWith("2026-09-01", "2026-09-30"));

  const calls = service.history.mock.calls.length;
  await fireEvent.changeText(screen.getByLabelText("Data inicial"), "2026-10-01");
  await fireEvent.press(screen.getByRole("button", { name: "Buscar aulas" }));
  expect(screen.getByText("Informe um período válido, com início até o fim")).toBeVisible();
  expect(service.history).toHaveBeenCalledTimes(calls);
});

it("shows an empty state", async () => {
  service.history.mockResolvedValue([]);
  await render(<History />);
  expect(await screen.findByText("Nenhuma aula neste período")).toBeVisible();
});
