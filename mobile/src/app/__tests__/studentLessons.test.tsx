import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Lessons from "@/app/(student)/(tabs)/lessons";
import LessonDetail from "@/app/(student)/lesson/[id]";
import { studentService, type StudentLesson } from "@/features/student/studentService";
import { saveDownload } from "@/lib/files/saveDownload";
import { addDays, formatLessonWhen, todayIso } from "@/lib/format";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "lesson-1" }),
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("@/features/student/studentService", () => ({
  studentService: { lessons: jest.fn(), lesson: jest.fn(), downloadLessonAttachment: jest.fn() },
}));
const mockShow = jest.fn();
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockShow }) }));
jest.mock("@/lib/files/saveDownload", () => ({ saveDownload: jest.fn() }));

const service = studentService as jest.Mocked<typeof studentService>;
const lesson: StudentLesson = {
  id: "lesson-1",
  date: "2026-07-01",
  startTime: "08:00:00",
  endTime: "09:00:00",
  instrument: "Violão",
  teacherName: "Maria Santos",
  status: "DONE",
  content: "Escalas maiores\nCampo harmônico",
  homework: "Praticar 15 minutos",
};

const lessonNames = () =>
  screen.getAllByRole("button").map((button) => button.props.accessibilityLabel as string).filter(Boolean);

beforeEach(() => {
  jest.clearAllMocks();
});

it("splits lessons into upcoming (ascending) and past (descending) sections and opens the selected lesson", async () => {
  const soon = { ...lesson, id: "upcoming-soon", date: addDays(todayIso(), 2), status: "SCHEDULED" as const };
  const later = { ...lesson, id: "upcoming-later", date: addDays(todayIso(), 9), status: "SCHEDULED" as const };
  const unrecorded = { ...lesson, id: "past-unrecorded", date: "2026-07-10", status: "SCHEDULED" as const };
  service.lessons.mockImplementation((status) => Promise.resolve(status === "past" ? [lesson, unrecorded] : [later, soon]));

  await render(<Lessons />);

  expect(await screen.findByText("Próximas")).toBeVisible();
  expect(screen.getByText("Anteriores")).toBeVisible();
  expect(service.lessons).toHaveBeenCalledWith("past");
  expect(service.lessons).toHaveBeenCalledWith("upcoming");
  expect(lessonNames()).toEqual([
    `Violão, ${formatLessonWhen(soon.date, "08:00")}, Maria Santos, Agendada`,
    `Violão, ${formatLessonWhen(later.date, "08:00")}, Maria Santos, Agendada`,
    `Violão, ${formatLessonWhen("2026-07-10", "08:00")}, Maria Santos, Sem registro`,
    `Violão, ${formatLessonWhen("2026-07-01", "08:00")}, Maria Santos, Concluída`,
  ]);

  await fireEvent.press(screen.getByRole("button", { name: `Violão, ${formatLessonWhen("2026-07-01", "08:00")}, Maria Santos, Concluída` }));
  expect(mockPush).toHaveBeenCalledWith("/(student)/lesson/lesson-1");
});

it("explains the empty state when the student has no lessons", async () => {
  service.lessons.mockResolvedValue([]);

  await render(<Lessons />);

  expect(await screen.findByText("Nenhuma aula por aqui")).toBeVisible();
  expect(screen.queryByText("Próximas")).toBeNull();
});

it("shows lesson date and time together with attachment metadata from the detail endpoint", async () => {
  service.lesson.mockResolvedValue({
    lesson,
    attachments: [{ id: "attachment-1", fileName: "Exercícios.pdf", contentType: "application/pdf", sizeBytes: 1258291 }],
  });

  await render(<LessonDetail />);

  expect(await screen.findByText("Professor: Maria Santos")).toBeVisible();
  expect(screen.getByText("01/07/2026 · 08:00 – 09:00")).toBeVisible();
  expect(screen.getByText("Concluída")).toBeVisible();
  expect(screen.getByText("•  Campo harmônico")).toBeVisible();
  expect(screen.getByText("Praticar 15 minutos")).toBeVisible();
  expect(screen.getByText("Exercícios.pdf")).toBeVisible();
  expect(screen.getByText("1,2 MB")).toBeVisible();
  expect(screen.queryByText("Disponível com o professor")).toBeNull();
  await waitFor(() => expect(service.lesson).toHaveBeenCalledWith("lesson-1"));
});

it("downloads a lesson attachment through the student endpoint", async () => {
  const bytes = new ArrayBuffer(4);
  service.lesson.mockResolvedValue({
    lesson,
    attachments: [{ id: "attachment-1", fileName: "Exercícios.pdf", contentType: "application/pdf", sizeBytes: 1258291 }],
  });
  service.downloadLessonAttachment.mockResolvedValue(bytes);

  await render(<LessonDetail />);
  await fireEvent.press(await screen.findByRole("button", { name: "Baixar anexo Exercícios.pdf, 1,2 MB" }));

  await waitFor(() => expect(saveDownload).toHaveBeenCalledWith(bytes, "Exercícios.pdf", "application/pdf"));
  expect(service.downloadLessonAttachment).toHaveBeenCalledWith("lesson-1", "attachment-1");
});
