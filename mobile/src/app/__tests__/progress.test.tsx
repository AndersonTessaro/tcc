import { act, render, screen } from "@testing-library/react-native";
import Progress from "@/app/(student)/progress";
import { studentService } from "@/features/student/studentService";

let mockFocus: (() => void) | undefined;
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    mockFocus = callback;
    require("react").useEffect(callback, [callback]);
  },
}));
jest.mock("@/features/student/studentService", () => ({
  studentService: { progress: jest.fn() },
}));

const service = studentService as jest.Mocked<typeof studentService>;

beforeEach(() => jest.clearAllMocks());

it("shows XP and practice values from the API", async () => {
  service.progress.mockResolvedValue({ xpTotal: 20, level: 1, streakDays: 2, totalPracticeMin: 45 });

  await render(<Progress />);

  expect(await screen.findByText("Sequência: 2 dias")).toBeVisible();
  expect(screen.getByText("Tempo total: 45 min")).toBeVisible();
});

it("reloads XP when the student returns to the screen", async () => {
  service.progress
    .mockResolvedValueOnce({ xpTotal: 0, level: 1, streakDays: 0, totalPracticeMin: 0 })
    .mockResolvedValueOnce({ xpTotal: 20, level: 1, streakDays: 0, totalPracticeMin: 0 });

  await render(<Progress />);
  await screen.findByText("Sequência: 0 dias");
  await act(async () => { mockFocus?.(); });

  expect(service.progress).toHaveBeenCalledTimes(2);
  expect(screen.getByText("Nível 1 · 20 XP")).toBeVisible();
});
