import { fireEvent, render, screen } from "@testing-library/react-native";
import Dashboard from "@/app/(student)/(tabs)/dashboard";
import { studentService } from "@/features/student/studentService";
import { addDays, formatLessonWhen, todayIso } from "@/lib/format";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: { username: "joao.silva" } }) }));
jest.mock("@/features/student/studentService", () => ({ studentService: { dashboard: jest.fn() } }));

const service = studentService as jest.Mocked<typeof studentService>;
const base = { xp: 150, level: 2, levelStartXp: 100, nextLevelXp: 400, streakDays: 3, weeklyPracticeMin: 95, nextLesson: null };

beforeEach(() => jest.clearAllMocks());

it("shows XP progress from server bounds and opens the practice register from the primary CTA", async () => {
  service.dashboard.mockResolvedValue(base);

  await render(<Dashboard />);

  expect(await screen.findByText("150 XP")).toBeVisible();
  expect(screen.getByText("Olá, Joao!")).toBeVisible();
  expect(screen.getByText("Faltam 250 XP para o nível 3")).toBeVisible();
  expect(screen.getByText("3 dias")).toBeVisible();
  expect(screen.getByText("Nenhuma aula agendada")).toBeVisible();
  expect(screen.queryByLabelText("Notificações")).toBeNull();

  await fireEvent.press(screen.getByRole("button", { name: "Registrar prática" }));
  expect(mockPush).toHaveBeenCalledWith("/(student)/practice/register");

  await fireEvent.press(screen.getByRole("button", { name: "Prática semanal: 1h 35min. Ver minhas metas" }));
  expect(mockPush).toHaveBeenCalledWith("/(student)/goals");
});

it("opens the next lesson when the dashboard has one", async () => {
  const date = addDays(todayIso(), 1);
  service.dashboard.mockResolvedValue({ ...base, nextLesson: { id: "lesson-9", date, startTime: "14:00:00", instrument: "Piano" } });

  await render(<Dashboard />);

  await fireEvent.press(await screen.findByRole("button", { name: `Próxima aula: Piano, ${formatLessonWhen(date, "14:00")}` }));
  expect(mockPush).toHaveBeenCalledWith("/(student)/lesson/lesson-9");
});

it("offers a retry when the dashboard fails to load", async () => {
  service.dashboard.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(base);

  await render(<Dashboard />);

  await fireEvent.press(await screen.findByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("150 XP")).toBeVisible();
});
