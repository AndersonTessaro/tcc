import { act, fireEvent, render, screen } from "@testing-library/react-native";
import TeacherChats from "@/app/teacher/chats";
import StudentChats from "@/app/(student)/chats";
import TeacherConversation from "@/app/teacher/chat/[studentId]";
import StudentConversation from "@/app/(student)/chat/[teacherId]";
import TeacherMore from "@/app/teacher/(tabs)/more";
import StudentMore from "@/app/(student)/(tabs)/more";
import { teacherChatService, studentChatService, type ChatMessage } from "@/features/chat/chatService";
import { ApiError } from "@/lib/http/apiError";
import { chatTime } from "@/features/chat/chatTime";

const mockPush = jest.fn();
const mockToast = jest.fn();
let mockFocused = true;
let mockParams: Record<string, string> = {};
const mockFocusCallbacks = new Set<() => void | (() => void)>();
jest.mock("expo-router", () => ({
  useRouter: () => ({ canGoBack: () => true, push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void | (() => void)) => require("react").useEffect(() => {
    if (!mockFocused) return;
    mockFocusCallbacks.add(callback);
    const cleanup = callback();
    return () => { mockFocusCallbacks.delete(callback); cleanup?.(); };
  }, [callback, mockFocused]),
}));
jest.mock("@/features/chat/chatService", () => ({
  teacherChatService: { list: jest.fn(), messages: jest.fn(), send: jest.fn(), unreadCount: jest.fn() },
  studentChatService: { list: jest.fn(), messages: jest.fn(), send: jest.fn(), unreadCount: jest.fn() },
}));
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock("@/hooks/use-tab-scroll-to-top", () => ({ useTabScrollToTop: jest.fn() }));
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: { displayName: "Ana" }, logout: jest.fn() }) }));
jest.mock("@/features/account/accountService", () => ({ accountService: { get: jest.fn(async () => ({ displayName: "Ana" })) } }));

const teacher = jest.mocked(teacherChatService);
const student = jest.mocked(studentChatService);
const incoming: ChatMessage = { id: "m1", body: "Vamos estudar piano?", sentAt: "2026-11-13T10:00:00Z", mine: false };
const outgoing: ChatMessage = { id: "m2", body: "Sim!", sentAt: "2026-11-14T10:00:00Z", mine: true };
const row = { peerId: "peer-1", peerName: "João", lastMessage: "Vamos estudar piano?", lastMessageAt: incoming.sentAt, unread: 3 };

beforeEach(() => {
  jest.clearAllMocks();
  mockFocused = true;
  mockParams = { studentId: "peer-1", teacherId: "peer-1", peerName: "João" };
  mockFocusCallbacks.clear();
  for (const service of [teacher, student]) {
    Object.values(service).forEach((method) => method.mockReset());
    service.list.mockResolvedValue([row]);
    service.messages.mockResolvedValue([incoming, outgoing]);
    service.send.mockResolvedValue({ id: "m3", body: "Olá, João!", sentAt: "2026-11-14T11:00:00Z", mine: true });
    service.unreadCount.mockResolvedValue({ count: 3 });
  }
});

// React's act caches the first `timers.setImmediate` it sees; a faked one hangs every later act (Node 22 / CI).
const useFakeTimers = () => jest.useFakeTimers({ doNotFake: ["setImmediate"] });

afterEach(() => jest.useRealTimers());

it.each([
  ["teacher", TeacherChats, { pathname: "/teacher/chat/[studentId]", params: { studentId: "peer-1", peerName: "João" } }],
  ["student", StudentChats, { pathname: "/(student)/chat/[teacherId]", params: { teacherId: "peer-1", peerName: "João" } }],
] as const)("renders the %s list and unread badge and opens the conversation", async (_role, Component, route) => {
  await render(<Component />);
  const conversation = await screen.findByRole("button", { name: /João.*Vamos estudar piano.*3 mensagens não lidas/ });
  expect(screen.getByText("3", { includeHiddenElements: true })).toBeVisible();
  expect(screen.getByText(row.lastMessage)).toHaveProp("numberOfLines", 1);
  await fireEvent.press(conversation);
  expect(mockPush).toHaveBeenCalledWith(route);
});

it("shows an empty list with an active enrollment hint and allows pull to refresh", async () => {
  teacher.list.mockResolvedValueOnce([]);
  await render(<TeacherChats />);
  expect(await screen.findByText("Nenhuma conversa ainda.")).toBeVisible();
  expect(screen.getByText(/alunos com matrícula ativa/)).toBeVisible();
  await act(() => screen.getByLabelText("Conversas").props.refreshControl.props.onRefresh());
  expect(await screen.findByText("João")).toBeVisible();
});

it("shows the student enrollment hint and a null preview", async () => {
  student.list.mockResolvedValueOnce([]);
  const view = await render(<StudentChats />);
  expect(await screen.findByText(/professores com matrícula ativa/)).toBeVisible();
  student.list.mockResolvedValue([{ ...row, lastMessage: null, lastMessageAt: null, unread: 0 }]);
  await act(async () => { mockFocusCallbacks.forEach((callback) => callback()); });
  expect(await screen.findByText("Envie a primeira mensagem.")).toBeVisible();
  expect(screen.queryByText("3")).toBeNull();
  await view.unmount();
});

it("shows loading and a translated error with a working retry", async () => {
  let reject!: (error: Error) => void;
  teacher.list.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
  await render(<TeacherChats />);
  expect(screen.getByLabelText("Carregando")).toBeVisible();
  await act(async () => reject(new TypeError("Failed to fetch")));
  expect(await screen.findByText("Sem conexão com o servidor")).toBeVisible();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("João")).toBeVisible();
});

it("reloads conversations on focus", async () => {
  await render(<TeacherChats />);
  await screen.findByText("João");
  teacher.list.mockResolvedValue([{ ...row, peerName: "Maria" }]);
  await act(async () => { mockFocusCallbacks.forEach((callback) => callback()); });
  expect(await screen.findByText("Maria")).toBeVisible();
  expect(teacher.list).toHaveBeenCalledTimes(2);
});

it.each([[TeacherConversation, teacher], [StudentConversation, student]] as const)("renders both sides and day separators with accessible bubbles", async (Component, service) => {
  await render(<Component />);
  expect(await screen.findByRole("text", { name: /João.*Vamos estudar piano/ })).toBeVisible();
  expect(screen.getByRole("text", { name: /Você.*Sim!/ })).toBeVisible();
  expect(screen.getAllByRole("header")).toHaveLength(3);
  expect(screen.getByRole("header", { name: "João" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Voltar" })).toBeVisible();
  expect(service.messages).toHaveBeenCalledWith("peer-1");
  expect(screen.getByLabelText("Mensagem")).toHaveProp("maxLength", 2000);
  expect(screen.getByLabelText("Mensagem")).toHaveProp("multiline", true);
});

it("uses the fallback header and refuses a missing peer without calling the API", async () => {
  mockParams = {};
  await render(<TeacherConversation />);
  expect(screen.getByRole("header", { name: "Conversa" })).toBeVisible();
  expect(screen.getByText("Conversa não encontrada.")).toBeVisible();
  expect(teacher.messages).not.toHaveBeenCalled();
});

it("sends a trimmed message optimistically, disables sends in flight and replaces it with the server message", async () => {
  let resolve!: (message: ChatMessage) => void;
  teacher.send.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  await render(<TeacherConversation />);
  await screen.findByText(incoming.body);
  await fireEvent.changeText(screen.getByLabelText("Mensagem"), "  Olá, João! \n");
  await fireEvent.press(screen.getByRole("button", { name: "Enviar mensagem" }));
  expect(teacher.send).toHaveBeenCalledWith("peer-1", "Olá, João!");
  expect(screen.getByText("Olá, João!")).toBeVisible();
  expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
  expect(screen.getByLabelText("Mensagem")).toHaveProp("value", "");
  await act(async () => resolve({ id: "m3", body: "Olá, João!", sentAt: "2026-11-14T11:00:00Z", mine: true }));
  expect(screen.getAllByText("Olá, João!")).toHaveLength(1);
  expect(mockToast).not.toHaveBeenCalled();
});

it("does not send blank text", async () => {
  await render(<TeacherConversation />);
  await screen.findByText(incoming.body);
  await fireEvent.changeText(screen.getByLabelText("Mensagem"), " \n ");
  const button = screen.getByRole("button", { name: "Enviar mensagem" });
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(teacher.send).not.toHaveBeenCalled();
});

it("rolls back a failed optimistic send, restores the draft and shows a translated toast", async () => {
  let reject!: (error: Error) => void;
  teacher.send.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
  await render(<TeacherConversation />);
  await screen.findByText(incoming.body);
  await fireEvent.changeText(screen.getByLabelText("Mensagem"), "Olá, João!");
  await fireEvent.press(screen.getByRole("button", { name: "Enviar mensagem" }));
  expect(screen.getByText("Olá, João!")).toBeVisible();
  await act(async () => reject(new TypeError("Failed to fetch")));
  expect(screen.queryByText("Olá, João!")).toBeNull();
  expect(screen.getByLabelText("Mensagem")).toHaveProp("value", "Olá, João!");
  expect(mockToast).toHaveBeenCalledWith("Sem conexão com o servidor", "error");
});

it("shows a translated conversation error and does not send without enrollment", async () => {
  teacher.messages.mockRejectedValueOnce(new ApiError(404));
  await render(<TeacherConversation />);
  expect(await screen.findByText("Não foi possível carregar a conversa.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText(incoming.body)).toBeVisible();
});

it("polls every five seconds without overlapping reads and stops on blur and unmount", async () => {
  useFakeTimers();
  const intervals = jest.spyOn(global, "setInterval");
  const clear = jest.spyOn(global, "clearInterval");
  const view = await render(<TeacherConversation />);
  await act(async () => {});
  expect(teacher.messages).toHaveBeenCalledTimes(1);
  let resolve!: (messages: ChatMessage[]) => void;
  teacher.messages.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  await act(async () => jest.advanceTimersByTime(5000));
  expect(teacher.messages).toHaveBeenCalledTimes(2);
  await act(async () => jest.advanceTimersByTime(15000));
  expect(teacher.messages).toHaveBeenCalledTimes(2);
  await act(async () => resolve([incoming, outgoing, { ...outgoing, id: "m3", body: "Recebida no polling" }]));
  expect(screen.getByText("Recebida no polling")).toBeVisible();
  mockFocused = false;
  await view.rerender(<TeacherConversation />);
  await act(async () => jest.advanceTimersByTime(10000));
  expect(teacher.messages).toHaveBeenCalledTimes(2);
  mockFocused = true;
  await view.rerender(<TeacherConversation />);
  expect(teacher.messages).toHaveBeenCalledTimes(3);
  await act(async () => jest.advanceTimersByTime(5000));
  expect(teacher.messages).toHaveBeenCalledTimes(4);
  await view.unmount();
  await act(async () => jest.advanceTimersByTime(15000));
  expect(teacher.messages).toHaveBeenCalledTimes(4);
  intervals.mock.calls.forEach((call, index) => {
    if (call[1] === 5000) expect(clear).toHaveBeenCalledWith(intervals.mock.results[index].value);
  });
  intervals.mockRestore();
  clear.mockRestore();
});

it("does not replace an optimistic message with a pending read and skips polling while sending", async () => {
  useFakeTimers();
  await render(<TeacherConversation />);
  await act(async () => {});
  let resolveRead!: (messages: ChatMessage[]) => void;
  let rejectSend!: (error: Error) => void;
  teacher.messages.mockReturnValueOnce(new Promise((done) => { resolveRead = done; }));
  teacher.send.mockReturnValueOnce(new Promise((_done, fail) => { rejectSend = fail; }));
  await act(async () => jest.advanceTimersByTime(5000));
  await fireEvent.changeText(screen.getByLabelText("Mensagem"), "Mensagem pendente");
  await fireEvent.press(screen.getByRole("button", { name: "Enviar mensagem" }));
  await act(async () => resolveRead([incoming, outgoing]));
  expect(screen.getByText("Mensagem pendente")).toBeVisible();
  await act(async () => jest.advanceTimersByTime(10000));
  expect(teacher.messages).toHaveBeenCalledTimes(2);
  await act(async () => rejectSend(new ApiError(422, "VALIDATION")));
  expect(screen.queryByText("Mensagem pendente")).toBeNull();
  expect(mockToast).toHaveBeenCalledWith("Dados inválidos. Revise os campos.", "error");
});

it.each([[TeacherMore, teacher, "/teacher/chats"], [StudentMore, student, "/(student)/chats"]] as const)("opens chat from Mais and reloads its unread badge on focus", async (Component, service, path) => {
  await render(<Component />);
  const chat = await screen.findByRole("button", { name: "Chat, 3 mensagens não lidas" });
  await fireEvent.press(chat);
  expect(mockPush).toHaveBeenCalledWith(path);
  service.unreadCount.mockResolvedValue({ count: 0 });
  await act(async () => { mockFocusCallbacks.forEach((callback) => callback()); });
  expect(await screen.findByRole("button", { name: "Chat" })).toBeVisible();
  expect(service.unreadCount).toHaveBeenCalledTimes(2);
});

it("does not let a stale read overwrite a send after focus returns", async () => {
  useFakeTimers();
  const view = await render(<TeacherConversation />);
  await act(async () => {});
  let resolveRead!: (messages: ChatMessage[]) => void;
  teacher.messages.mockReturnValueOnce(new Promise((done) => { resolveRead = done; }));
  await act(async () => jest.advanceTimersByTime(5000));
  await fireEvent.changeText(screen.getByLabelText("Mensagem"), "Olá, João!");
  await fireEvent.press(screen.getByRole("button", { name: "Enviar mensagem" }));
  expect(screen.getByText("Olá, João!")).toBeVisible();
  mockFocused = false;
  await view.rerender(<TeacherConversation />);
  mockFocused = true;
  await view.rerender(<TeacherConversation />);
  await act(async () => resolveRead([incoming, outgoing]));
  expect(screen.getByText("Olá, João!")).toBeVisible();
  expect(teacher.messages).toHaveBeenCalledTimes(2);
});

it("formats relative times using the timestamp offset", () => {
  const now = new Date("2026-11-14T15:00:00Z");
  expect(chatTime("2026-11-14T11:00:00-03:00", now)).toBe("há 1 h");
  expect(chatTime(null, now)).toBe("");
});
