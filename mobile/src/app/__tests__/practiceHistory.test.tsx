import { act, fireEvent, render, screen } from "@testing-library/react-native";
import PracticeHistory from "@/app/(student)/practice/history";
import PracticeOverview from "@/features/student/PracticeOverview";
import { studentService, type StudentPractice } from "@/features/student/studentService";
import { addDays, relativeDayLabel, todayIso } from "@/lib/format";

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/student/studentService", () => ({ studentService: { practices: jest.fn() } }));
const service = studentService as jest.Mocked<typeof studentService>;

beforeEach(() => jest.clearAllMocks());

it("loads the complete history with dates, duration, truncated notes, optional mood and back navigation", async () => {
  const today = todayIso();
  const practices: StudentPractice[] = Array.from({ length: 3 }, (_, index) => ({
    id: String(index), date: addDays(today, -index), durationMin: 30, recording: null,
    notes: index === 0 ? "Escalas" : index === 1 ? "Avaliação: 2/5" : `Arpejos ${index}`,
    difficulty: index === 0 ? "Acordes" : null, rating: index === 0 ? 5 : null,
  }));
  service.practices.mockResolvedValue(practices);
  await render(<PracticeHistory />);

  expect(await screen.findByText("Hoje · 30min")).toBeVisible();
  expect(screen.getByText("Ontem · 30min")).toBeVisible();
  expect(screen.getByText(relativeDayLabel(addDays(today, -2)) + " · 30min")).toBeVisible();
  expect(screen.getByText(practices[0].notes!)).toHaveProp("numberOfLines", 2);
  expect(screen.getAllByRole("image", { name: "Avaliação 5 de 5" })).toHaveLength(1);
  expect(screen.queryByRole("image", { name: "Avaliação 2 de 5" })).toBeNull();
  expect(service.practices).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it("shows the empty state", async () => {
  service.practices.mockResolvedValue([]);
  await render(<PracticeHistory />);
  expect(await screen.findByText("Nenhuma prática registrada.")).toBeVisible();
});

it("shows loading, retries an error and refreshes the history", async () => {
  let rejectRequest!: (error: Error) => void;
  service.practices.mockImplementationOnce(() => new Promise((_, reject) => { rejectRequest = reject; }));
  service.practices.mockResolvedValue([]);
  await render(<PracticeHistory />);
  expect(screen.queryByText("Nenhuma prática registrada.")).toBeNull();
  expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
  await act(() => rejectRequest(new Error("offline")));
  await fireEvent.press(await screen.findByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("Nenhuma prática registrada.")).toBeVisible();
  service.practices.mockResolvedValue([{ id: "new", date: todayIso(), durationMin: 90, notes: null, difficulty: null, rating: null, recording: null }]);
  await act(() => screen.getByLabelText("Histórico de práticas").props.refreshControl.props.onRefresh());
  expect(await screen.findByText("Hoje · 1h 30min")).toBeVisible();
  expect(service.practices).toHaveBeenCalledTimes(3);
});

it("opens the history from the recent records heading", async () => {
  service.practices.mockResolvedValue([{ id: "1", date: todayIso(), durationMin: 30, notes: null, difficulty: null, rating: null, recording: null }]);
  await render(<PracticeOverview />);
  await fireEvent.press(await screen.findByRole("link", { name: "Ver histórico de práticas" }));
  expect(mockPush).toHaveBeenCalledWith("/(student)/practice/history");
});

it("hides the history link when there are no practices", async () => {
  service.practices.mockResolvedValue([]);
  await render(<PracticeOverview />);
  await screen.findByText("Nenhuma prática registrada");
  expect(screen.queryByRole("link", { name: "Ver histórico de práticas" })).toBeNull();
});
