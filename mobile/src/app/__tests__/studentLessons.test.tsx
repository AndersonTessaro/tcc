import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Lessons from "@/app/(student)/lessons";
import LessonDetail from "@/app/(student)/lesson/[id]";
import { studentService, type StudentLesson } from "@/features/student/studentService";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "lesson-1" }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("@/features/student/studentService", () => ({
  studentService: { lessons: jest.fn(), lesson: jest.fn() },
}));

const service = studentService as jest.Mocked<typeof studentService>;
const lesson: StudentLesson = {
  id: "lesson-1",
  date: "2026-07-01",
  startTime: "08:00:00",
  instrument: "Violão",
  teacherName: "Maria Santos",
  status: "DONE",
  content: "Escalas maiores\nCampo harmônico",
  homework: "Praticar 15 minutos",
};

beforeEach(() => {
  jest.clearAllMocks();
});

it("combines past and upcoming lessons and opens the selected lesson", async () => {
  service.lessons.mockImplementation((status) => Promise.resolve(status === "past" ? [lesson] : [{ ...lesson, id: "lesson-2", date: "2026-07-19", status: "SCHEDULED" }]));

  await render(<Lessons />);

  expect(await screen.findByText("01/07 - 08:00")).toBeVisible();
  expect(screen.getByText("19/07 - 08:00")).toBeVisible();
  expect(service.lessons).toHaveBeenCalledWith("past");
  expect(service.lessons).toHaveBeenCalledWith("upcoming");
  fireEvent.press(screen.getByRole("button", { name: "Violão, 01/07 - 08:00" }));
  expect(mockPush).toHaveBeenCalledWith("/(student)/lesson/lesson-1");
});

it("shows lesson fields and attachment metadata from the detail endpoint", async () => {
  service.lesson.mockResolvedValue({
    lesson,
    attachments: [{ id: "attachment-1", fileName: "Exercícios.pdf", sizeBytes: 1258291 }],
  });

  await render(<LessonDetail />);

  expect(await screen.findByText("Professor: Maria Santos")).toBeVisible();
  expect(screen.getByText("01/07/2026 - 08:00")).toBeVisible();
  expect(screen.getByText("•  Campo harmônico")).toBeVisible();
  expect(screen.getByText("Praticar 15 minutos")).toBeVisible();
  expect(screen.getByText("Exercícios.pdf")).toBeVisible();
  expect(screen.getByText("1,2 MB")).toBeVisible();
  await waitFor(() => expect(service.lesson).toHaveBeenCalledWith("lesson-1"));
});
