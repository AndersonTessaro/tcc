import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import History from "@/app/(teacher)/history";
import { teacherService, type TeacherLesson } from "@/features/teacher/teacherService";

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/teacher/teacherService", () => ({
  teacherService: { history: jest.fn() },
}));

const service = teacherService as jest.Mocked<typeof teacherService>;
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

it("shows lessons returned by the history endpoint", async () => {
  await render(<History />);

  expect(await screen.findByText("22/09/2026 · 09:00–10:00")).toBeVisible();
  expect(screen.getByText("Ana Souza · Piano")).toBeVisible();
  expect(screen.getByText("Realizada")).toBeVisible();
});

it("filters by a valid date range and rejects an inverted range", async () => {
  await render(<History />);
  await screen.findByText("Ana Souza · Piano");
  await fireEvent.changeText(screen.getByLabelText("Data inicial"), "2026-09-01");
  await fireEvent.changeText(screen.getByLabelText("Data final"), "2026-09-30");
  await fireEvent.press(screen.getByText("Buscar aulas"));
  await waitFor(() => expect(service.history).toHaveBeenCalledWith("2026-09-01", "2026-09-30"));

  const calls = service.history.mock.calls.length;
  await fireEvent.changeText(screen.getByLabelText("Data inicial"), "2026-10-01");
  await fireEvent.press(screen.getByText("Buscar aulas"));
  expect(screen.getByText("Informe um período válido, com início até o fim")).toBeVisible();
  expect(service.history).toHaveBeenCalledTimes(calls);
});
