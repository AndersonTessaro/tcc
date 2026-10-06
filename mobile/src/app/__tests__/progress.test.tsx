import { act, render, screen } from "@testing-library/react-native";
import Progress from "@/app/(student)/(tabs)/progress";
import { studentService } from "@/features/student/studentService";

let mockFocus: (() => void) | undefined;
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void) => {
    mockFocus = callback;
    require("react").useEffect(callback, [callback]);
  },
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34 }) }));
jest.mock("@/features/student/studentService", () => ({
  studentService: { progress: jest.fn(), practices: jest.fn(), attendance: jest.fn() },
}));

const service = studentService as jest.Mocked<typeof studentService>;

beforeEach(() => {
  jest.clearAllMocks();
  service.practices.mockResolvedValue([]);
  service.attendance.mockResolvedValue([]);
});

it("shows XP and practice values from the API", async () => {
  service.progress.mockResolvedValue({ xpTotal: 20, level: 1, streakDays: 2, totalPracticeMin: 45 });
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  service.practices.mockResolvedValue([{ id: "practice-1", date, durationMin: 45, notes: null }]);

  await render(<Progress />);

  expect(await screen.findByText("20 XP")).toBeVisible();
  expect(screen.getByText("Nível 1")).toBeVisible();
  expect(screen.getByText("45m")).toBeVisible();
});

it("reloads XP when the student returns to the screen", async () => {
  service.progress
    .mockResolvedValueOnce({ xpTotal: 0, level: 1, streakDays: 0, totalPracticeMin: 0 })
    .mockResolvedValueOnce({ xpTotal: 20, level: 1, streakDays: 0, totalPracticeMin: 0 });

  await render(<Progress />);
  await screen.findByText("0 XP");
  await act(async () => { mockFocus?.(); });

  expect(service.progress).toHaveBeenCalledTimes(2);
  expect(screen.getByText("20 XP")).toBeVisible();
});
