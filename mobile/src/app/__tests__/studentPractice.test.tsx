import { fireEvent, render, screen } from "@testing-library/react-native";
import PracticeOverview from "@/features/student/PracticeOverview";
import { studentService } from "@/features/student/studentService";
import { addDays, formatFullDate, formatMinutes, parseIsoDate, todayIso } from "@/lib/format";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/student/studentService", () => ({ studentService: { practices: jest.fn() } }));
const service = studentService as jest.Mocked<typeof studentService>;

beforeEach(() => jest.clearAllMocks());

it("selects the latest practice by date and preserves the weekly total, recent notes and registration", async () => {
  const today = todayIso();
  const monday = addDays(today, -((parseIsoDate(today).getDay() + 6) % 7));
  const practices = [
    { id: "old", date: addDays(monday, -1), durationMin: 15, notes: "Escalas anteriores" },
    { id: "latest", date: today, durationMin: 45, notes: "Arpejos de hoje" },
    { id: "same-day", date: today, durationMin: 30, notes: "Acordes de hoje" },
  ];
  service.practices.mockResolvedValue(practices);

  await render(<PracticeOverview />);

  expect(await screen.findByText("Minha última prática")).toBeVisible();
  expect(screen.getByText(`${formatFullDate(today)} · ${formatMinutes(45)}`)).toBeVisible();
  expect(screen.getByText("Frequência semanal")).toBeVisible();
  expect(screen.getByText("1 dia")).toBeVisible();
  expect(screen.getByText(`Total: ${formatMinutes(75)}`)).toBeVisible();
  expect(screen.getByText("Escalas anteriores")).toBeVisible();
  expect(screen.getByText("Arpejos de hoje")).toBeVisible();
  expect(screen.getByText("Acordes de hoje")).toBeVisible();
  expect(practices.map((practice) => practice.id)).toEqual(["old", "latest", "same-day"]);

  await fireEvent.press(screen.getByRole("button", { name: "Registrar prática" }));
  expect(mockPush).toHaveBeenCalledWith("/(student)/practice/register");
});

it("hides the last-practice summary when empty while keeping registration available", async () => {
  service.practices.mockResolvedValue([]);

  await render(<PracticeOverview />);

  expect(await screen.findByText("Nenhuma prática registrada")).toBeVisible();
  expect(screen.queryByText("Minha última prática")).toBeNull();
  expect(screen.getByText("0 dias")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Registrar prática" }));
  expect(mockPush).toHaveBeenCalledWith("/(student)/practice/register");
});
