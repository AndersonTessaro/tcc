import { fireEvent, render, screen, waitFor, cleanup, within } from "@testing-library/react-native";
import { createApiClient } from "@/lib/http/apiClient";
import { studentService } from "@/features/student/studentService";
import { teacherService } from "@/features/teacher/teacherService";
import Goals from "@/features/student/GoalsOverview";
import Materials from "@/app/(student)/materials";
import Schedule from "@/app/(teacher)/schedule";
import NewLesson from "@/app/(teacher)/new-lesson";
import Makeup from "@/app/(teacher)/makeup/[lessonId]";
import LessonDetail from "@/app/(student)/lesson/[id]";
import StudentDashboard from "@/app/(student)/dashboard";
import RegisterPractice from "@/app/(student)/practice/register";
import PracticeOverview from "@/features/student/PracticeOverview";
import ProgressOverview from "@/features/student/ProgressOverview";
import TeacherReports from "@/features/teacher/TeacherReports";
import TeacherDashboard from "@/features/teacher/TeacherDashboard";
import TeacherStudents from "@/features/teacher/TeacherStudents";
import TeacherStudentDetail from "@/features/teacher/TeacherStudentDetail";
import Schedules from "@/app/(teacher)/schedules";
import History from "@/app/(teacher)/history";
import { localIsoDate } from "@/features/teacher/lessonForm";
import { jest, it, expect, afterEach } from "@jest/globals";
import { Buffer } from "node:buffer";

declare const mockNativeFetch: typeof fetch;
declare const __nativeFormData: typeof FormData;
declare const __nativeBlob: typeof Blob;
declare const __liveFixtures: Record<string, { login: string; password: string; accessToken: string }>;
let mockAccess: string | null;
let mockParams: Record<string, string> = {};
let mockUser: { username: string; displayName: string } | null = null;
const mockPush = jest.fn();
const mockSavedFile = jest.fn();
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: mockUser, logout: () => {} }) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush, back: () => {} }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));
jest.mock("@/lib/files/saveDownload", () => ({ saveDownload: (...args: unknown[]) => mockSavedFile(...args) }));
jest.mock("@/lib/http", () => ({
  api: require("@/lib/http/apiClient").createApiClient({
    baseUrl: process.env.HARMONIA_AUDIT_URL || "http://localhost:18080",
    getAccessToken: async () => mockAccess,
    setAccessToken: async (token: string) => { mockAccess = token; },
    clearAccessToken: async () => { mockAccess = null; },
    onAuthFailure: () => {}, fetchFn: (...args: Parameters<typeof fetch>) => mockNativeFetch(...args),
  }),
}));

const url = process.env.HARMONIA_AUDIT_URL || "http://localhost:18080";
async function login(role: string) {
  const response = await mockNativeFetch(`${url}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: __liveFixtures[role].login, password: __liveFixtures[role].password }),
  });
  expect(response.status).toBe(200);
  mockAccess = (await response.json()).accessToken;
  mockUser = await (await mockNativeFetch(`${url}/auth/me`, { headers: { Authorization: `Bearer ${mockAccess}` } })).json();
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}
afterEach(async () => { await cleanup(); mockParams = {}; });

it("registers a practice and displays its actual XP, history, dashboard and teacher report", async () => {
  await login("student");
  const before = await studentService.progress();
  const notes = `Escalas audit ${Date.now()}`;
  await render(<RegisterPractice />);
  await fireEvent.changeText(screen.getByLabelText("O que praticou?"), notes);
  await fireEvent.changeText(screen.getByLabelText("Tempo de prática"), "25 min");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar registro" }));
  await waitFor(async () => expect((await studentService.progress()).xpTotal).toBe(before.xpTotal + 25));
  expect((await studentService.practices())[0].notes).toBe(notes);
  await cleanup();
  await render(<PracticeOverview />);
  expect(await screen.findByText(`${localIsoDate().split("-").reverse().join("/")} - 25 min`)).toBeVisible();
  await cleanup();
  await render(<StudentDashboard />);
  expect(await screen.findByText(`${before.xpTotal + 25} XP`)).toBeVisible();
  expect(screen.queryByText(/\/ 8h/)).toBeNull();
  await cleanup();
  await render(<ProgressOverview />);
  expect(await screen.findByText(`${before.xpTotal + 25} XP`)).toBeVisible();
  await cleanup();
  await login("teacher");
  const student = (await teacherService.students()).find((value) => value.username === __liveFixtures.student.login)!;
  await render(<TeacherReports />);
  await fireEvent.press(await screen.findByRole("button", { name: `Relatório de ${student.name}` }));
  expect(await screen.findByText(String(before.xpTotal + 25))).toBeVisible();
  await cleanup();
  mockParams = { id: student.id };
  await render(<TeacherStudentDetail />);
  await screen.findByText(student.name);
  await fireEvent.press(screen.getByText("Prática"));
  expect(await screen.findByText(notes)).toBeVisible();
});

it("creates, shows, cancels and replaces a lesson using the screens and the framework", async () => {
  await login("teacher");
  const student = (await teacherService.students()).find((value) => value.username === __liveFixtures.student.login)!;
  const future = new Date(); future.setDate(future.getDate() + 1);
  const date = localIsoDate(future);
  const content = `Conteúdo audit ${Date.now()}`;
  mockParams = { studentId: student.id };
  await render(<NewLesson />);
  await screen.findByText(student.name);
  await fireEvent.changeText(screen.getByPlaceholderText("Data (AAAA-MM-DD)"), date);
  await fireEvent.changeText(screen.getByPlaceholderText("Início (HH:MM)"), "18:00");
  await fireEvent.changeText(screen.getByPlaceholderText("Conteúdo"), content);
  await fireEvent.changeText(screen.getByPlaceholderText("Tarefa de casa"), "Praticar o exercício enviado");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar aula" }));
  expect(await screen.findByText("Aula registrada! Agendada")).toBeVisible();
  const created = (await teacherService.schedule(date)).find((lesson) => lesson.content === content)!;
  expect(created).toBeDefined();
  await cleanup();
  await render(<TeacherDashboard />);
  await fireEvent.press(await screen.findByRole("button", { name: `Abrir aula de ${student.name} em ${date}` }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/(teacher)/schedule", params: { date } });
  await cleanup();
  await login("student");
  mockParams = { id: created.id };
  await render(<LessonDetail />);
  expect(await screen.findByText(`•  ${content}`)).toBeVisible();
  expect(screen.getByText("Praticar o exercício enviado")).toBeVisible();
  await cleanup();
  await login("teacher");
  mockParams = { date };
  await render(<Schedule />);
  const row = await screen.findByTestId(`lesson-${created.id}`);
  expect(within(row).queryByRole("radio")).toBeNull();
  await fireEvent.press(within(row).getByRole("button", { name: "Cancelar aula" }));
  await waitFor(() => expect(within(screen.getByTestId(`lesson-${created.id}`)).queryByRole("button", { name: "Cancelar aula" })).toBeNull());
  const canceled = screen.getByTestId(`lesson-${created.id}`);
  expect(within(canceled).queryByRole("button", { name: "Cancelar aula" })).toBeNull();
  await fireEvent.press(within(canceled).getByRole("button", { name: "Repor" }));
  expect(mockPush).toHaveBeenCalledWith(`/(teacher)/makeup/${created.id}`);
  await cleanup();
  mockParams = { lessonId: created.id };
  await render(<Makeup />);
  await screen.findByText("Agendar reposição");
  future.setDate(future.getDate() + 1);
  const makeupDate = localIsoDate(future);
  const weekday = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][future.getDay()];
  const blocked = [...(await teacherService.schedule(makeupDate)).filter((lesson) => lesson.status !== "CANCELED"), ...(await teacherService.schedules()).filter((schedule) => schedule.active && schedule.weekday === weekday)];
  const makeupHour = Array.from({ length: 15 }, (_, index) => index + 8).find((hour) => {
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = `${String(hour).padStart(2, "0")}:30`;
    return blocked.every((slot) => end <= slot.startTime.slice(0, 5) || start >= slot.endTime.slice(0, 5));
  })!;
  const makeupStart = `${String(makeupHour).padStart(2, "0")}:00`;
  const makeupEnd = `${String(makeupHour).padStart(2, "0")}:30`;
  await fireEvent.changeText(screen.getByPlaceholderText("Data (AAAA-MM-DD)"), makeupDate);
  await fireEvent.changeText(screen.getByPlaceholderText("Início (HH:MM)"), makeupStart);
  await fireEvent.changeText(screen.getByPlaceholderText("Fim (HH:MM)"), makeupEnd);
  await fireEvent.press(screen.getByRole("button", { name: "Agendar reposição" }));
  expect(await screen.findByText(`Reposição agendada para ${makeupDate} às ${makeupStart}`)).toBeVisible();
  expect((await teacherService.makeupLink(created.id))?.newLesson.date).toBe(makeupDate);
  await cleanup();
  await render(<Makeup />);
  expect(await screen.findByText(new RegExp(`Esta aula já tem uma reposição em ${makeupDate}`))).toBeVisible();
  expect(screen.getByRole("button", { name: "Agendar reposição" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Voltar à agenda" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/(teacher)/schedule", params: { date: makeupDate } });
  await login("student");
  expect((await studentService.dashboard()).nextLesson?.id).not.toBe(created.id);
});

it("renders the real students, recurring schedules and lesson history", async () => {
  await login("teacher");
  const students = await teacherService.students();
  await render(<TeacherStudents />);
  expect(await screen.findByText(students[0].name)).toBeVisible();
  await cleanup();
  await render(<Schedules />);
  await screen.findByText("Novo horário");
  const schedules = await teacherService.schedules();
  await waitFor(() => expect(screen.getByText(`${schedules[0].instrument} · ${schedules[0].active ? "Ativo" : "Inativo"}`)).toBeVisible());
  await cleanup();
  await render(<History />);
  expect(await screen.findAllByText("Realizada")).not.toHaveLength(0);
});

it("creates and completes a goal through the rendered screen and real services", async () => {
  await login("student");
  const title = `Meta audit ${Date.now()}`;
  await render(<Goals />);
  await screen.findByText("Ativas");
  await fireEvent.press(screen.getByRole("button", { name: "Nova meta" }));
  await fireEvent.changeText(screen.getByLabelText("Título da meta"), title);
  await fireEvent.changeText(screen.getByLabelText("Objetivo da meta"), "30");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  await fireEvent.press(await screen.findByRole("button", { name: `Atualizar ${title}` }));
  await fireEvent.changeText(screen.getByLabelText("Progresso da meta"), "30");
  await fireEvent.press(screen.getByRole("button", { name: "Salvar meta" }));
  await waitFor(() => expect(screen.queryByText(title)).toBeNull());
  await fireEvent.press(screen.getByRole("tab", { name: "Concluídas" }));
  expect(await screen.findByText(title)).toBeVisible();
  expect((await studentService.goals("COMPLETED")).find((goal) => goal.title === title)?.currentProgress).toBe(30);
});

it("uploads actual bytes as a teacher and downloads them through the student screen", async () => {
  await login("teacher");
  const studentId = (await teacherService.students()).find((student) => student.username === __liveFixtures.student.login)!.id;
  const title = `Material audit ${Date.now()}`;
  const bytes = "Exercício de revisão do framework.";
  const platform = require("react-native").Platform;
  const original = platform.OS;
  const form = globalThis.FormData;
  try {
    platform.OS = "web";
    globalThis.FormData = __nativeFormData;
    await teacherService.uploadMaterial(studentId, { uri: "blob:audit", name: "exercicio.txt", mimeType: "text/plain", file: new __nativeBlob([bytes], { type: "text/plain" }) }, title);
  } finally { platform.OS = original; globalThis.FormData = form; }
  await login("student");
  const ownMaterials = await studentService.materials(title);
  expect(ownMaterials).toHaveLength(1);
  await render(<Materials />);
  await fireEvent.changeText(screen.getByLabelText("Buscar material"), title);
  const downloadButton = await screen.findByRole("button", { name: `Baixar ${title}` });
  await fireEvent.press(downloadButton);
  await waitFor(() => expect(mockSavedFile).toHaveBeenCalled());
  const downloaded = mockSavedFile.mock.calls.at(-1)![0] as ArrayBuffer;
  expect(Buffer.from(downloaded).toString("utf8")).toBe(bytes);
});

it("corrects attendance through the agenda and verifies XP and idempotency in the real API", async () => {
  await login("student");
  const studentLessons = await studentService.lessons("upcoming");
  const selected = studentLessons.find((lesson) => lesson.date === localIsoDate() && lesson.status !== "CANCELED")!;
  expect(selected).toBeDefined();
  const studentToken = mockAccess;
  await login("teacher");
  const teacherToken = mockAccess;
  await teacherService.attendance(selected.id, "ABSENT");
  mockAccess = studentToken;
  const before = (await studentService.progress()).xpTotal;
  mockAccess = teacherToken;
  mockParams = { date: selected.date };
  await render(<Schedule />);
  const row = await screen.findByTestId(`lesson-${selected.id}`);
  await fireEvent.press(within(row).getByRole("radio", { name: "Presente" }));
  await waitFor(async () => expect((await teacherService.schedule(selected.date)).find((lesson) => lesson.id === selected.id)?.attendance).toBe("PRESENT"));
  mockAccess = studentToken;
  const awarded = (await studentService.progress()).xpTotal;
  expect(awarded).toBeGreaterThan(before);
  mockAccess = teacherToken;
  await teacherService.attendance(selected.id, "PRESENT");
  mockAccess = studentToken;
  expect((await studentService.progress()).xpTotal).toBe(awarded);
  mockAccess = teacherToken;
  await teacherService.attendance(selected.id, "ABSENT");
  mockAccess = studentToken;
  expect((await studentService.progress()).xpTotal).toBe(before);
});

it("shares one refresh across simultaneous expired requests using the real cookie endpoint", async () => {
  const cookie = await login("student");
  let access: string | null = "invalid-expired-token";
  let refreshCount = 0;
  const client = createApiClient({
    baseUrl: url, getAccessToken: async () => access, setAccessToken: async (token) => { access = token; }, clearAccessToken: async () => { access = null; }, onAuthFailure: jest.fn(),
    fetchFn: (input, init) => {
      if (String(input).endsWith("/auth/refresh")) { refreshCount++; return mockNativeFetch(input, { ...init, headers: { Cookie: cookie } }); }
      return mockNativeFetch(input, init);
    },
  });
  const result = await Promise.all([client.get("/me/progress"), client.get("/me/dashboard"), client.get("/me/goals")]);
  expect(result).toHaveLength(3);
  expect(refreshCount).toBe(1);
});
