import { act, fireEvent, render, screen } from "@testing-library/react-native";
import PracticeHistory from "@/app/(student)/practice/history";
import { saveDownload } from "@/lib/files/saveDownload";
import PracticeOverview from "@/features/student/PracticeOverview";
import { studentService } from "@/features/student/studentService";
import { addDays, formatFullDate, formatMinutes, parseIsoDate, todayIso } from "@/lib/format";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/features/student/studentService", () => ({ studentService: { practices: jest.fn(), downloadPracticeRecording: jest.fn() } }));
const mockToast = jest.fn();
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock("@/lib/files/saveDownload", () => ({ saveDownload: jest.fn() }));
const service = studentService as jest.Mocked<typeof studentService>;

beforeEach(() => jest.clearAllMocks());

it("selects the latest practice by date and preserves the weekly total, recent notes and registration", async () => {
  const today = todayIso();
  const monday = addDays(today, -((parseIsoDate(today).getDay() + 6) % 7));
  const practices = [
    { id: "old", date: addDays(monday, -1), durationMin: 15, notes: "Escalas anteriores", recording: null },
    { id: "latest", date: today, durationMin: 45, notes: "Arpejos de hoje", recording: null },
    { id: "same-day", date: today, durationMin: 30, notes: "Acordes de hoje", recording: null },
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

const recording = { fileName: "Prática.mp4", contentType: "video/mp4", sizeBytes: 50 * 1024 * 1024, uploadedAt: "2026-10-12T10:00:00" };

it.each([["overview", PracticeOverview], ["history", PracticeHistory]])("downloads recordings from %s", async (_name, Component) => {
  service.practices.mockResolvedValue([{ id: "recorded", date: todayIso(), durationMin: 30, notes: null, recording }]);
  const bytes = new ArrayBuffer(4);
  service.downloadPracticeRecording.mockResolvedValue(bytes);
  await render(<Component />);
  expect(await screen.findByText("Prática.mp4 · 50,0 MB")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Baixar gravação Prática.mp4" }));
  expect(service.downloadPracticeRecording).toHaveBeenCalledWith("recorded");
  expect(saveDownload).toHaveBeenCalledWith(bytes, "Prática.mp4", "video/mp4");
  expect(mockToast).toHaveBeenCalledWith("Prática.mp4 pronto para salvar", "success");
});

it("locks only the active recording and allows retry after a download error", async () => {
  service.practices.mockResolvedValue([{ id: "recorded", date: todayIso(), durationMin: 30, notes: null, recording }]);
  let failDownload!: (error: Error) => void;
  service.downloadPracticeRecording.mockImplementationOnce(() => new Promise((_resolve, reject) => { failDownload = reject; }));
  await render(<PracticeOverview />);
  const button = await screen.findByRole("button", { name: "Baixar gravação Prática.mp4" });
  await act(() => { void fireEvent.press(button); });
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(service.downloadPracticeRecording).toHaveBeenCalledTimes(1);
  await act(() => failDownload(new Error("offline")));
  expect(mockToast).toHaveBeenCalledWith("Não foi possível baixar a gravação. Tente novamente.", "error");
  expect(saveDownload).not.toHaveBeenCalled();
  service.downloadPracticeRecording.mockResolvedValue(new ArrayBuffer(4));
  await fireEvent.press(button);
  expect(service.downloadPracticeRecording).toHaveBeenCalledTimes(2);
  expect(saveDownload).toHaveBeenCalledTimes(1);
});
