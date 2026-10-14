import { fireEvent, render, screen } from "@testing-library/react-native";
import TeacherNotes from "@/app/(student)/teacher-notes";
import More from "@/app/(student)/(tabs)/more";
import { studentService } from "@/features/student/studentService";
import { ApiError } from "@/lib/http/apiError";
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }), useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]) }));
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: { username: "ana" }, logout: jest.fn() }) }));
jest.mock("@/features/student/studentService", () => ({ studentService: { teacherNotes: jest.fn() } }));
const service = jest.mocked(studentService);
beforeEach(() => { jest.clearAllMocks(); service.teacherNotes.mockReset().mockResolvedValue([]); });
it("opens teacher notes from Mais", async () => {
  await render(<More />);
  await fireEvent.press(screen.getByText("Observações do professor"));
  expect(mockPush).toHaveBeenCalledWith("/(student)/teacher-notes");
});
it("shows shared notes with teacher names and Brazilian dates", async () => {
  service.teacherNotes.mockResolvedValue([{ teacherName: "Maria", notes: "Estude escalas", updatedAt: "2026-10-14T15:00:00Z" }, { teacherName: "João", notes: "Pratique o ritmo", updatedAt: "2026-10-13T15:00:00Z" }]);
  await render(<TeacherNotes />);
  expect(await screen.findByText("Maria")).toBeVisible();
  expect(screen.getByText("14/10/2026")).toBeVisible();
  expect(screen.getByText("Estude escalas")).toBeVisible();
  expect(screen.getByText("João")).toBeVisible();
  expect(screen.getByText("Pratique o ritmo")).toBeVisible();
  expect(service.teacherNotes).toHaveBeenCalledTimes(1);
});
it("shows the specified empty state", async () => {
  await render(<TeacherNotes />);
  expect(await screen.findByText("Seus professores ainda não deixaram observações.")).toBeVisible();
});
it("translates errors and retries", async () => {
  service.teacherNotes.mockRejectedValueOnce(new ApiError(403, "ACCESS_DENIED"));
  await render(<TeacherNotes />);
  expect(await screen.findByText("Sem permissão para esta ação")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("Seus professores ainda não deixaram observações.")).toBeVisible();
  expect(service.teacherNotes).toHaveBeenCalledTimes(2);
});
